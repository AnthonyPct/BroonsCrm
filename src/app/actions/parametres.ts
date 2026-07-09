"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type TariffInput = {
  id?: string;
  category: string;
  birth_year_min: number | null;
  birth_year_max: number | null;
  part_ffhb: number;
  part_lbhb: number;
  part_hbc: number;
  sort_order: number;
};

export async function saveTariffs(seasonId: string, rows: TariffInput[]) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("tariff_grid")
    .select("id")
    .eq("season_id", seasonId);
  const keptIds = new Set(rows.filter((r) => r.id).map((r) => r.id));
  const toDelete = (existing ?? []).filter((t) => !keptIds.has(t.id));

  for (const t of toDelete) {
    const { error } = await supabase.from("tariff_grid").delete().eq("id", t.id);
    if (error)
      throw new Error(
        `Impossible de supprimer une catégorie utilisée par des licences (${error.message})`
      );
  }

  for (const r of rows) {
    const payload = {
      season_id: seasonId,
      category: r.category.trim(),
      birth_year_min: r.birth_year_min,
      birth_year_max: r.birth_year_max,
      part_ffhb: r.part_ffhb,
      part_lbhb: r.part_lbhb,
      part_hbc: r.part_hbc,
      sort_order: r.sort_order,
    };
    if (!payload.category) continue;
    if (r.id) {
      const { error } = await supabase
        .from("tariff_grid")
        .update(payload)
        .eq("id", r.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("tariff_grid").insert(payload);
      if (error) throw new Error(error.message);
    }
  }

  revalidatePath("/crm/parametres/tarifs");
  revalidatePath("/crm/licencies");
  revalidatePath("/crm/dashboard");
}

export async function saveSeasonSettings(
  seasonId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("seasons")
    .update({
      discount_deadline: String(formData.get("discount_deadline")),
      discount_rate: Number(formData.get("discount_rate")) / 100,
    })
    .eq("id", seasonId);
  if (error) throw new Error(error.message);
  revalidatePath("/crm/parametres/tarifs");
  revalidatePath("/crm/dashboard");
}

export async function saveSetting(key: string, value: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  revalidatePath("/crm/parametres/integrations");
}
