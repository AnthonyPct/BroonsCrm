import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

export type Season = Tables<"seasons">;
export type Member = Tables<"members">;
export type License = Tables<"licenses">;
export type Payment = Tables<"payments">;
export type Financials = Tables<"license_financials">;

export type LicenseeRow = License & {
  member: Member;
  tariff: Tables<"tariff_grid"> | null;
  financials: Financials | null;
};

export async function getCurrentSeason(): Promise<Season | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_current", true)
    .maybeSingle();
  return data;
}

export async function getSeasonLicensees(
  seasonId: string
): Promise<LicenseeRow[]> {
  const supabase = await createClient();
  const [{ data: licenses }, { data: financials }] = await Promise.all([
    supabase
      .from("licenses")
      .select("*, member:members(*), tariff:tariff_grid(*)")
      .eq("season_id", seasonId),
    supabase.from("license_financials").select("*").eq("season_id", seasonId),
  ]);

  const finById = new Map(
    (financials ?? []).map((f) => [f.license_id, f])
  );

  return ((licenses ?? []) as unknown as LicenseeRow[])
    .map((l) => ({ ...l, financials: finById.get(l.id) ?? null }))
    .sort((a, b) =>
      (a.member.last_name + a.member.first_name).localeCompare(
        b.member.last_name + b.member.first_name,
        "fr"
      )
    );
}

export async function getSeasonTariffs(seasonId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tariff_grid")
    .select("*")
    .eq("season_id", seasonId)
    .order("sort_order");
  return data ?? [];
}
