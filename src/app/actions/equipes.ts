"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type TeamInput = {
  id?: string;
  name: string;
  birth_year_min: number | null;
  birth_year_max: number | null;
  gender: string | null;
  warmup_minutes: number;
  match_duration_minutes: number;
  is_youth: boolean;
  sort_order: number;
};

export async function saveTeams(seasonId: string, rows: TeamInput[]) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("teams")
    .select("id")
    .eq("season_id", seasonId);
  const keptIds = new Set(rows.filter((r) => r.id).map((r) => r.id));
  const toDelete = (existing ?? []).filter((t) => !keptIds.has(t.id));

  for (const t of toDelete) {
    const { error } = await supabase.from("teams").delete().eq("id", t.id);
    if (error)
      throw new Error(
        `Impossible de supprimer une équipe utilisée par des matchs (${error.message})`
      );
  }

  for (const r of rows) {
    const payload = {
      season_id: seasonId,
      name: r.name.trim(),
      birth_year_min: r.birth_year_min,
      birth_year_max: r.birth_year_max,
      gender: r.gender === "M" || r.gender === "F" ? r.gender : null,
      warmup_minutes: r.warmup_minutes,
      match_duration_minutes: r.match_duration_minutes,
      is_youth: r.is_youth,
      sort_order: r.sort_order,
    };
    if (!payload.name) continue;
    if (r.id) {
      const { error } = await supabase
        .from("teams")
        .update(payload)
        .eq("id", r.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("teams").insert(payload);
      if (error) throw new Error(error.message);
    }
  }

  revalidatePath("/crm/parametres/equipes");
  revalidatePath("/crm/planning");
  revalidatePath("/crm/licencies");
}
