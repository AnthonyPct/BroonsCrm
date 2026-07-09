"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function assignOrder(orderId: string, licenseId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("apply_ha_match", {
    p_order_id: orderId,
    p_license_id: licenseId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/crm/reconciliation");
  revalidatePath("/crm/licencies");
  revalidatePath("/crm/dashboard");
}

export async function ignoreOrder(orderId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("helloasso_orders")
    .update({ match_status: "ignored" })
    .eq("id", orderId);
  if (error) throw new Error(error.message);
  revalidatePath("/crm/reconciliation");
}

export async function reopenOrder(orderId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("helloasso_orders")
    .update({ match_status: "pending", matched_license_id: null })
    .eq("id", orderId);
  if (error) throw new Error(error.message);
  revalidatePath("/crm/reconciliation");
}

/** Relance le rapprochement automatique sur toutes les commandes en attente. */
export async function retryAutoMatch() {
  const supabase = await createClient();
  const { data: pending } = await supabase
    .from("helloasso_orders")
    .select("id")
    .eq("match_status", "pending");

  let matched = 0;
  for (const order of pending ?? []) {
    const { data } = await supabase.rpc("try_match_ha_order", {
      p_order_id: order.id,
    });
    if (data) matched++;
  }
  revalidatePath("/crm/reconciliation");
  revalidatePath("/crm/licencies");
  revalidatePath("/crm/dashboard");
  return matched;
}

/** Déclenche la fonction Edge de rattrapage HelloAsso. */
export async function triggerBackfill(): Promise<{
  ok: boolean;
  message: string;
}> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/helloasso-backfill`;
  const secret = process.env.BACKFILL_SECRET;
  if (!secret) {
    return {
      ok: false,
      message:
        "BACKFILL_SECRET non configuré côté application (variable d'environnement).",
    };
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "x-backfill-secret": secret },
    });
    const body = await res.text();
    if (!res.ok) {
      return { ok: false, message: `Erreur ${res.status} : ${body}` };
    }
    revalidatePath("/crm/reconciliation");
    revalidatePath("/crm/parametres/integrations");
    return { ok: true, message: body };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Erreur réseau",
    };
  }
}
