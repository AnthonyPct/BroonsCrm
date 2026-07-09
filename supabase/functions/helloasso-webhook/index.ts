// Webhook HelloAsso — reçoit les notifications Order / Payment en temps réel,
// alimente le cache helloasso_orders / helloasso_payments et tente le
// rapprochement automatique avec les licences de la saison courante.
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

// Secret d'URL (?secret=...) : valeur par défaut générée pour le club,
// surchargée par le secret d'Edge Function WEBHOOK_SECRET si défini.
const WEBHOOK_SECRET =
  Deno.env.get("WEBHOOK_SECRET") ?? "hbc_wh_f93b7b8928b88b16eb901aff45c65a06";

type HaOrder = {
  id: number | string;
  date?: string;
  formSlug?: string;
  payer?: { firstName?: string; lastName?: string; email?: string };
  items?: unknown[];
  amount?: { total?: number };
};

type HaPayment = {
  id: number | string;
  amount?: number;
  date?: string;
  state?: string;
  order?: HaOrder;
  payer?: { firstName?: string; lastName?: string; email?: string };
  items?: unknown[];
};

function admin(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

export async function upsertOrder(
  supabase: SupabaseClient,
  order: HaOrder,
  fallbackPayer?: HaPayment["payer"],
  fallbackItems?: unknown[]
) {
  const payer = order.payer ?? fallbackPayer ?? {};
  const { error } = await supabase.from("helloasso_orders").upsert(
    {
      ha_order_id: String(order.id),
      form_slug: order.formSlug ?? null,
      payer_first_name: payer.firstName ?? null,
      payer_last_name: payer.lastName ?? null,
      payer_email: payer.email ?? null,
      items: order.items ?? fallbackItems ?? [],
      amount_total: (order.amount?.total ?? 0) / 100,
      order_date: order.date ?? null,
      raw: order as Record<string, unknown>,
    },
    { onConflict: "ha_order_id" }
  );
  if (error) throw new Error(`upsert order: ${error.message}`);
}

export async function upsertPayment(
  supabase: SupabaseClient,
  payment: HaPayment
) {
  if (!payment.order?.id) return;
  const { error } = await supabase.from("helloasso_payments").upsert(
    {
      ha_payment_id: String(payment.id),
      ha_order_id: String(payment.order.id),
      amount: (payment.amount ?? 0) / 100,
      status: payment.state ?? null,
      payment_date: payment.date ?? null,
      raw: payment as Record<string, unknown>,
    },
    { onConflict: "ha_payment_id" }
  );
  if (error) throw new Error(`upsert payment: ${error.message}`);
}

/** Rapprochement : auto-match si en attente, resynchronisation des paiements si déjà matchée. */
export async function reconcileOrder(
  supabase: SupabaseClient,
  haOrderId: string
) {
  const { data: order } = await supabase
    .from("helloasso_orders")
    .select("id, match_status, matched_license_id")
    .eq("ha_order_id", haOrderId)
    .maybeSingle();
  if (!order) return;

  if (order.match_status === "matched" && order.matched_license_id) {
    // Nouvelle échéance sur une commande déjà rapprochée → recrée les paiements manquants
    await supabase.rpc("apply_ha_match", {
      p_order_id: order.id,
      p_license_id: order.matched_license_id,
    });
  } else if (order.match_status === "pending") {
    await supabase.rpc("try_match_ha_order", { p_order_id: order.id });
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const url = new URL(req.url);
  if (url.searchParams.get("secret") !== WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: { eventType?: string; data?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const supabase = admin();
  const eventType = (body.eventType ?? "").toLowerCase();

  try {
    if (eventType === "order") {
      const order = body.data as HaOrder;
      await upsertOrder(supabase, order);
      // Certaines notifications Order embarquent les paiements des items
      const items = (order.items ?? []) as { payments?: HaPayment[] }[];
      for (const item of items) {
        for (const p of item.payments ?? []) {
          await upsertPayment(supabase, { ...p, order });
        }
      }
      await reconcileOrder(supabase, String(order.id));
    } else if (eventType === "payment") {
      const payment = body.data as HaPayment;
      if (payment.order?.id) {
        await upsertOrder(
          supabase,
          payment.order,
          payment.payer,
          payment.items
        );
        await upsertPayment(supabase, payment);
        await reconcileOrder(supabase, String(payment.order.id));
      }
    }
    // Les autres types d'événements (Form…) sont ignorés silencieusement.
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("helloasso-webhook error", e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
