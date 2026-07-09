// Rattrapage HelloAsso — parcourt l'API v5 (OAuth2 client_credentials) pour
// resynchroniser toutes les commandes/paiements, en secours du webhook.
// Déclenché depuis le CRM (bouton) ou par un cron.
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const BACKFILL_SECRET =
  Deno.env.get("BACKFILL_SECRET") ?? "hbc_bf_f89c7e170be942f74b23443c3358afec";
const HA_API = "https://api.helloasso.com";

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
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
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
    throw new Error(
      "Slug HelloAsso non renseigné (paramètres → intégrations)."
    );
  }
  return data.value;
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
    const [token, slug] = await Promise.all([
      getAccessToken(),
      getOrgSlug(supabase),
    ]);

    let continuationToken: string | null = null;
    let pages = 0;
    let paymentCount = 0;
    const orderIds = new Set<string>();

    do {
      const params = new URLSearchParams({ pageSize: "100" });
      if (continuationToken) params.set("continuationToken", continuationToken);
      const res = await fetch(
        `${HA_API}/v5/organizations/${slug}/payments?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        throw new Error(`API HelloAsso ${res.status}: ${await res.text()}`);
      }
      const json = await res.json();
      const payments = (json.data ?? []) as HaPayment[];

      for (const p of payments) {
        if (!p.order?.id) continue;
        const haOrderId = String(p.order.id);
        await supabase.from("helloasso_orders").upsert(
          {
            ha_order_id: haOrderId,
            form_slug: p.order.formSlug ?? null,
            payer_first_name: p.payer?.firstName ?? null,
            payer_last_name: p.payer?.lastName ?? null,
            payer_email: p.payer?.email ?? null,
            items: p.items ?? [],
            amount_total: (p.order.amount?.total ?? p.amount ?? 0) / 100,
            order_date: p.order.date ?? p.date ?? null,
            raw: p.order as Record<string, unknown>,
          },
          { onConflict: "ha_order_id" }
        );
        await supabase.from("helloasso_payments").upsert(
          {
            ha_payment_id: String(p.id),
            ha_order_id: haOrderId,
            amount: (p.amount ?? 0) / 100,
            status: p.state ?? null,
            payment_date: p.date ?? null,
            raw: p as Record<string, unknown>,
          },
          { onConflict: "ha_payment_id" }
        );
        orderIds.add(haOrderId);
        paymentCount++;
      }

      const next = json.pagination?.continuationToken ?? null;
      continuationToken =
        next && next !== continuationToken && payments.length > 0 ? next : null;
      pages++;
    } while (continuationToken && pages < 50);

    // Rapprochement de toutes les commandes touchées
    let matched = 0;
    for (const haOrderId of orderIds) {
      const { data: order } = await supabase
        .from("helloasso_orders")
        .select("id, match_status, matched_license_id")
        .eq("ha_order_id", haOrderId)
        .maybeSingle();
      if (!order) continue;
      if (order.match_status === "matched" && order.matched_license_id) {
        await supabase.rpc("apply_ha_match", {
          p_order_id: order.id,
          p_license_id: order.matched_license_id,
        });
      } else if (order.match_status === "pending") {
        const { data: ok } = await supabase.rpc("try_match_ha_order", {
          p_order_id: order.id,
        });
        if (ok) matched++;
      }
    }

    await supabase.from("app_settings").upsert({
      key: "helloasso_last_backfill_at",
      value: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        ok: true,
        payments: paymentCount,
        orders: orderIds.size,
        auto_matched: matched,
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
