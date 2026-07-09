"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type PaymentSource = Database["public"]["Enums"]["payment_source"];

export async function addPayment(licenseId: string, formData: FormData) {
  const supabase = await createClient();

  const amount = Number(String(formData.get("amount") ?? "0").replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Montant invalide");
  }

  const { error } = await supabase.from("payments").insert({
    license_id: licenseId,
    source: String(formData.get("source")) as PaymentSource,
    amount,
    paid_at:
      String(formData.get("paid_at") || "") ||
      new Date().toISOString().slice(0, 10),
    reference: String(formData.get("reference") ?? "") || null,
    notes: String(formData.get("notes") ?? "") || null,
  });
  if (error) throw new Error(error.message);

  // Sort la licence de "à saisir" dès qu'un paiement arrive
  await supabase
    .from("licenses")
    .update({ status: "attente_paiement" })
    .eq("id", licenseId)
    .eq("status", "a_saisir");

  revalidatePath(`/crm/licencies/${licenseId}`);
  revalidatePath("/crm/licencies");
  revalidatePath("/crm/dashboard");
}

export async function deletePayment(paymentId: string, licenseId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("payments")
    .delete()
    .eq("id", paymentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/crm/licencies/${licenseId}`);
  revalidatePath("/crm/licencies");
  revalidatePath("/crm/dashboard");
}
