"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { findTariffForBirthYear } from "@/lib/tariffs";
import { findTeamFor } from "@/lib/planning";
import type { Database } from "@/lib/database.types";

type LicenseStatus = Database["public"]["Enums"]["license_status"];

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (v === null || v === "") return null;
  return String(v);
}

export async function saveLicensee(formData: FormData) {
  const supabase = await createClient();

  const memberId = str(formData, "member_id");
  const licenseId = str(formData, "license_id");
  const seasonId = str(formData, "season_id");
  if (!seasonId) throw new Error("Saison manquante");

  const member = {
    first_name: str(formData, "first_name") ?? "",
    last_name: str(formData, "last_name") ?? "",
    birth_date: str(formData, "birth_date"),
    sex: str(formData, "sex"),
    email: str(formData, "email"),
    phone: str(formData, "phone"),
    address: str(formData, "address"),
    postal_code: str(formData, "postal_code"),
    city: str(formData, "city"),
    is_board: formData.get("is_board") === "on",
    can_table: formData.get("can_table") === "on",
    can_referee: formData.get("can_referee") === "on",
    can_hall_manager: formData.get("can_hall_manager") === "on",
    notes: str(formData, "member_notes"),
  };
  if (!member.first_name || !member.last_name) {
    throw new Error("Nom et prénom obligatoires");
  }

  let finalMemberId = memberId;
  if (memberId) {
    const { error } = await supabase
      .from("members")
      .update(member)
      .eq("id", memberId);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase
      .from("members")
      .insert(member)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    finalMemberId = data.id;
  }

  const birthYear = member.birth_date
    ? new Date(member.birth_date).getFullYear()
    : null;

  // Tarif : override explicite ou catégorie auto par année de naissance
  let tariffId = str(formData, "tariff_id");
  if (tariffId === "auto" || !tariffId) {
    const { data: tariffs } = await supabase
      .from("tariff_grid")
      .select("*")
      .eq("season_id", seasonId);
    tariffId = findTariffForBirthYear(tariffs ?? [], birthYear)?.id ?? null;
  }

  // Équipe : override explicite ou affectation auto (année de naissance + sexe)
  let teamId = str(formData, "team_id");
  if (teamId === "auto" || !teamId) {
    const { data: teams } = await supabase
      .from("teams")
      .select("*")
      .eq("season_id", seasonId);
    teamId = findTeamFor(teams ?? [], birthYear, member.sex)?.id ?? null;
  }
  if (teamId === "none") teamId = null;

  const license = {
    member_id: finalMemberId!,
    season_id: seasonId,
    tariff_id: tariffId,
    team_id: teamId,
    status: (str(formData, "status") ?? "a_saisir") as LicenseStatus,
    is_mutation: formData.get("is_mutation") === "on",
    registered_at:
      str(formData, "registered_at") ?? new Date().toISOString().slice(0, 10),
    notes: str(formData, "license_notes"),
  };

  let finalLicenseId = licenseId;
  if (licenseId) {
    const { error } = await supabase
      .from("licenses")
      .update(license)
      .eq("id", licenseId);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase
      .from("licenses")
      .insert(license)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    finalLicenseId = data.id;
  }

  revalidatePath("/crm/licencies");
  revalidatePath("/crm/dashboard");
  redirect(`/crm/licencies/${finalLicenseId}`);
}

export async function updateLicenseStatus(
  licenseId: string,
  status: LicenseStatus
) {
  const supabase = await createClient();
  const patch: { status: LicenseStatus; qualified_at?: string | null } = {
    status,
  };
  if (status === "qualifiee") {
    patch.qualified_at = new Date().toISOString().slice(0, 10);
  } else {
    patch.qualified_at = null;
  }
  const { error } = await supabase
    .from("licenses")
    .update(patch)
    .eq("id", licenseId);
  if (error) throw new Error(error.message);
  revalidatePath("/crm/licencies");
  revalidatePath(`/crm/licencies/${licenseId}`);
  revalidatePath("/crm/dashboard");
}

export async function toggleQualification(licenseId: string, qualified: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("licenses")
    .update(
      qualified
        ? {
            status: "qualifiee",
            qualified_at: new Date().toISOString().slice(0, 10),
          }
        : { status: "attente_paiement", qualified_at: null }
    )
    .eq("id", licenseId);
  if (error) throw new Error(error.message);
  revalidatePath("/crm/licencies");
  revalidatePath(`/crm/licencies/${licenseId}`);
  revalidatePath("/crm/dashboard");
}

/** Qualification en masse depuis la liste (fallback du blocage email FFHB). */
export async function bulkQualify(licenseIds: string[], qualified: boolean) {
  if (!licenseIds.length) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("licenses")
    .update(
      qualified
        ? {
            status: "qualifiee",
            qualified_at: new Date().toISOString().slice(0, 10),
          }
        : { status: "attente_paiement", qualified_at: null }
    )
    .in("id", licenseIds);
  if (error) throw new Error(error.message);
  revalidatePath("/crm/licencies");
  revalidatePath("/crm/dashboard");
}

export async function saveLicenseNotes(licenseId: string, notes: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("licenses")
    .update({ notes: notes || null })
    .eq("id", licenseId);
  if (error) throw new Error(error.message);
  revalidatePath(`/crm/licencies/${licenseId}`);
}

export async function deleteLicensee(licenseId: string, memberId: string) {
  const supabase = await createClient();
  await supabase.from("licenses").delete().eq("id", licenseId);
  // Supprime le membre s'il n'a plus aucune licence (autre saison)
  const { count } = await supabase
    .from("licenses")
    .select("id", { count: "exact", head: true })
    .eq("member_id", memberId);
  if (!count) {
    await supabase.from("members").delete().eq("id", memberId);
  }
  revalidatePath("/crm/licencies");
  revalidatePath("/crm/dashboard");
  redirect("/crm/licencies");
}
