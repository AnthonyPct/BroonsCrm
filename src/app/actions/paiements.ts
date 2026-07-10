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

  const source = String(formData.get("source")) as PaymentSource;
  const { error } = await supabase.from("payments").insert({
    license_id: licenseId,
    source,
    amount,
    paid_at:
      String(formData.get("paid_at") || "") ||
      new Date().toISOString().slice(0, 10),
    reference: String(formData.get("reference") ?? "") || null,
    notes: String(formData.get("notes") ?? "") || null,
    // Pass'Sport : entre dans le cycle de suivi ; sans code fourni,
    // le paiement démarre « en attente du code » (il arrive souvent après)
    aid_status:
      source === "passsport"
        ? String(formData.get("reference") ?? "").trim()
          ? "code_recu"
          : "attente_code"
        : null,
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

export async function updateAidStatus(paymentId: string, status: string) {
  if (!["attente_code", "code_recu", "deduit", "rembourse"].includes(status)) {
    throw new Error("Statut invalide");
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("payments")
    .update({ aid_status: status })
    .eq("id", paymentId);
  if (error) throw new Error(error.message);
  revalidatePath("/crm/passsport");
}

/** Saisie a posteriori du code Pass'Sport ; fait avancer le statut si besoin. */
export async function updateAidReference(paymentId: string, reference: string) {
  const supabase = await createClient();
  const { data: payment, error } = await supabase
    .from("payments")
    .update({ reference: reference || null })
    .eq("id", paymentId)
    .select("aid_status")
    .single();
  if (error) throw new Error(error.message);

  // Le code vient d'arriver → on sort de « en attente du code »
  if (reference && payment.aid_status === "attente_code") {
    await supabase
      .from("payments")
      .update({ aid_status: "code_recu" })
      .eq("id", paymentId);
  }
  revalidatePath("/crm/passsport");
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
