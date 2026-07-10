// Rattrapage HelloAsso — parcourt l'API v5 (OAuth2 client_credentials) pour
// resynchroniser toutes les commandes/paiements, en secours du webhook.
// Déclenché depuis le CRM (bouton) ou par un cron.
// Upserts par lots + rapprochement en une seule fonction SQL pour tenir
// dans les limites CPU des Edge Functions.
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const BACKFILL_SECRET =
  Deno.env.get("BACKFILL_SECRET") ?? "hbc_bf_f89c7e170be942f74b23443c3358afec";
const HA_API = "https://api.helloasso.com";
// Cloudflare (devant api.helloasso.com) bloque les requêtes sans User-Agent identifiable
const HA_HEADERS = {
  "User-Agent": "HBC-Pays-de-Broons-CRM/1.0 (+https://hbcpaysdebroons.fr)",
  Accept: "application/json",
};
const CHUNK = 500;

type HaPayment = {
  id: number | string;
  amount?: number;
  date?: string;
  state?: string;
  order?: {
    id: number | string;
    date?: string;
    formSlug?: string;
    amount?: { total?: number };
  };
  payer?: { firstName?: string; lastName?: string; email?: string };
  items?: unknown[];
};

function admin(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get("HELLOASSO_CLIENT_ID");
  const clientSecret = Deno.env.get("HELLOASSO_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error(
      "Secrets HELLOASSO_CLIENT_ID / HELLOASSO_CLIENT_SECRET non configurés dans Supabase."
    );
  }
  const res = await fetch(`${HA_API}/oauth2/token`, {
    method: "POST",
    headers: {
      ...HA_HEADERS,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) {
    throw new Error(`OAuth HelloAsso ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return json.access_token as string;
}

async function getOrgSlug(supabase: SupabaseClient): Promise<string> {
  const fromEnv = Deno.env.get("HELLOASSO_ORG_SLUG");
  if (fromEnv) return fromEnv;
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "helloasso_org_slug")
    .maybeSingle();
  if (!data?.value) {
    throw new Error("Slug HelloAsso non renseigné (paramètres → intégrations).");
  }
  return data.value;
}

/** Début de la saison courante — le backfill ignore les paiements antérieurs. */
async function getSeasonStart(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase
    .from("seasons")
    .select("start_date")
    .eq("is_current", true)
    .maybeSingle();
  return data?.start_date ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  if (req.headers.get("x-backfill-secret") !== BACKFILL_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = admin();

  try {
    const [token, slug, seasonStart] = await Promise.all([
      getAccessToken(),
      getOrgSlug(supabase),
      getSeasonStart(supabase),
    ]);

    // 1. Collecte paginée (dédupliquée en mémoire)
    const orders = new Map<string, Record<string, unknown>>();
    const payments = new Map<string, Record<string, unknown>>();
    let continuationToken: string | null = null;
    let pages = 0;

    do {
      const params = new URLSearchParams({ pageSize: "100" });
      if (seasonStart) params.set("from", `${seasonStart}T00:00:00Z`);
      if (continuationToken) params.set("continuationToken", continuationToken);
      const res = await fetch(
        `${HA_API}/v5/organizations/${slug}/payments?${params}`,
        { headers: { ...HA_HEADERS, Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        throw new Error(`API HelloAsso ${res.status}: ${await res.text()}`);
      }
      const json = await res.json();
      const pagePayments = (json.data ?? []) as HaPayment[];

      for (const p of pagePayments) {
        if (!p.order?.id) continue;
        const haOrderId = String(p.order.id);
        orders.set(haOrderId, {
          ha_order_id: haOrderId,
          form_slug: p.order.formSlug ?? null,
          payer_first_name: p.payer?.firstName ?? null,
          payer_last_name: p.payer?.lastName ?? null,
          payer_email: p.payer?.email ?? null,
          items: p.items ?? [],
          amount_total: (p.order.amount?.total ?? p.amount ?? 0) / 100,
          order_date: p.order.date ?? p.date ?? null,
          raw: p.order,
        });
        payments.set(String(p.id), {
          ha_payment_id: String(p.id),
          ha_order_id: haOrderId,
          amount: (p.amount ?? 0) / 100,
          status: p.state ?? null,
          payment_date: p.date ?? null,
          raw: p,
        });
      }

      const next = json.pagination?.continuationToken ?? null;
      continuationToken =
        next && next !== continuationToken && pagePayments.length > 0
          ? next
          : null;
      pages++;
    } while (continuationToken && pages < 50);

    // 2. Upserts par lots
    const orderRows = [...orders.values()];
    for (let i = 0; i < orderRows.length; i += CHUNK) {
      const { error } = await supabase
        .from("helloasso_orders")
        .upsert(orderRows.slice(i, i + CHUNK), { onConflict: "ha_order_id" });
      if (error) throw new Error(`upsert orders: ${error.message}`);
    }
    const paymentRows = [...payments.values()];
    for (let i = 0; i < paymentRows.length; i += CHUNK) {
      const { error } = await supabase
        .from("helloasso_payments")
        .upsert(paymentRows.slice(i, i + CHUNK), {
          onConflict: "ha_payment_id",
        });
      if (error) throw new Error(`upsert payments: ${error.message}`);
    }

    // 3. Rapprochement global en un appel SQL
    const { data: reconcile, error: reconcileError } = await supabase.rpc(
      "reconcile_all_ha_orders"
    );
    if (reconcileError) {
      throw new Error(`reconcile: ${reconcileError.message}`);
    }

    await supabase.from("app_settings").upsert({
      key: "helloasso_last_backfill_at",
      value: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        ok: true,
        payments: paymentRows.length,
        orders: orderRows.length,
        auto_matched: reconcile?.auto_matched ?? 0,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("helloasso-backfill error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
