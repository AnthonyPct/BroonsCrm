"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { findTariffForBirthYear } from "@/lib/tariffs";

export type ImportRow = {
  first_name: string;
  last_name: string;
  birth_date: string | null; // yyyy-mm-dd
  email: string | null;
  sex: string | null;
};

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

export async function importLicensees(
  seasonId: string,
  rows: ImportRow[]
): Promise<{ created: number; skipped: number; errors: string[] }> {
  const supabase = await createClient();
  const errors: string[] = [];
  let created = 0;
  let skipped = 0;

  const [{ data: members }, { data: licenses }, { data: tariffs }] =
    await Promise.all([
      supabase.from("members").select("id, first_name, last_name, birth_date"),
      supabase.from("licenses").select("member_id").eq("season_id", seasonId),
      supabase.from("tariff_grid").select("*").eq("season_id", seasonId),
    ]);

  const memberByKey = new Map(
    (members ?? []).map((m) => [
      `${norm(m.last_name)}|${norm(m.first_name)}`,
      m,
    ])
  );
  const licensedMemberIds = new Set((licenses ?? []).map((l) => l.member_id));

  for (const row of rows) {
    if (!row.first_name?.trim() || !row.last_name?.trim()) {
      skipped++;
      continue;
    }
    try {
      const key = `${norm(row.last_name)}|${norm(row.first_name)}`;
      let member = memberByKey.get(key);

      if (!member) {
        const { data, error } = await supabase
          .from("members")
          .insert({
            first_name: row.first_name.trim(),
            last_name: row.last_name.trim(),
            birth_date: row.birth_date,
            email: row.email,
            sex: row.sex === "M" || row.sex === "F" ? row.sex : null,
          })
          .select("id, first_name, last_name, birth_date")
          .single();
        if (error) throw new Error(error.message);
        member = data;
        memberByKey.set(key, member);
      }

      if (licensedMemberIds.has(member.id)) {
        skipped++;
        continue;
      }

      const birthYear = member.birth_date
        ? new Date(member.birth_date).getFullYear()
        : row.birth_date
          ? new Date(row.birth_date).getFullYear()
          : null;
      const tariff = findTariffForBirthYear(tariffs ?? [], birthYear);

      const { error } = await supabase.from("licenses").insert({
        member_id: member.id,
        season_id: seasonId,
        tariff_id: tariff?.id ?? null,
        status: "a_saisir",
      });
      if (error) throw new Error(error.message);
      licensedMemberIds.add(member.id);
      created++;
    } catch (e) {
      errors.push(
        `${row.last_name} ${row.first_name} : ${
          e instanceof Error ? e.message : "erreur"
        }`
      );
    }
  }

  revalidatePath("/crm/licencies");
  revalidatePath("/crm/dashboard");
  return { created, skipped, errors };
}
