"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { scheduleMatches } from "@/lib/planning";

function revalidate(matchdayId?: string) {
  revalidatePath("/crm/planning");
  if (matchdayId) revalidatePath(`/crm/planning/${matchdayId}`);
  revalidatePath("/matchs");
}

export async function createMatchday(formData: FormData) {
  const supabase = await createClient();
  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single();

  const { data, error } = await supabase
    .from("matchdays")
    .insert({
      season_id: season!.id,
      date: String(formData.get("date")),
      start_time: "14:00",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidate();
  redirect(`/crm/planning/${data.id}`);
}

export async function deleteMatchday(matchdayId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("matchdays")
    .delete()
    .eq("id", matchdayId);
  if (error) throw new Error(error.message);
  revalidate();
  redirect("/crm/planning");
}

export async function addMatch(matchdayId: string, formData: FormData) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("matchday_matches")
    .select("id", { count: "exact", head: true })
    .eq("matchday_id", matchdayId);

  const { error } = await supabase.from("matchday_matches").insert({
    matchday_id: matchdayId,
    team_id: String(formData.get("team_id")),
    opponent: String(formData.get("opponent") ?? "").trim(),
    sort_order: (count ?? 0) + 1,
  });
  if (error) throw new Error(error.message);

  // Recalcule les horaires avec le nouveau match inclus
  await recalcSchedule(matchdayId);
}

export async function removeMatch(matchId: string, matchdayId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("matchday_matches")
    .delete()
    .eq("id", matchId);
  if (error) throw new Error(error.message);
  revalidate(matchdayId);
}

export async function setMatchTime(
  matchId: string,
  matchdayId: string,
  time: string
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("matchday_matches")
    .update({ scheduled_at: time || null })
    .eq("id", matchId);
  if (error) throw new Error(error.message);
  revalidate(matchdayId);
}

export async function setMatchOpponent(
  matchId: string,
  matchdayId: string,
  opponent: string
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("matchday_matches")
    .update({ opponent: opponent.trim() })
    .eq("id", matchId);
  if (error) throw new Error(error.message);
  revalidate(matchdayId);
}

export async function moveMatch(
  matchId: string,
  matchdayId: string,
  delta: number
) {
  const supabase = await createClient();
  const { data: matches } = await supabase
    .from("matchday_matches")
    .select("id, sort_order")
    .eq("matchday_id", matchdayId)
    .order("sort_order");
  if (!matches) return;

  const index = matches.findIndex((m) => m.id === matchId);
  const j = index + delta;
  if (index < 0 || j < 0 || j >= matches.length) return;

  await supabase
    .from("matchday_matches")
    .update({ sort_order: matches[j].sort_order })
    .eq("id", matches[index].id);
  await supabase
    .from("matchday_matches")
    .update({ sort_order: matches[index].sort_order })
    .eq("id", matches[j].id);
  revalidate(matchdayId);
}

/**
 * Recalcule les horaires : essaie 14h00, replie sur 13h00 si le dernier
 * coup d'envoi dépasse 21h15 (règle : pas de match sénior avant 18h00).
 * Retourne true si le programme déborde malgré tout.
 */
export async function recalcSchedule(matchdayId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: matches } = await supabase
    .from("matchday_matches")
    .select("id, sort_order, team:teams(*)")
    .eq("matchday_id", matchdayId);

  if (!matches?.length) {
    revalidate(matchdayId);
    return false;
  }

  const result = scheduleMatches(
    matches.map((m) => ({ id: m.id, team: m.team! }))
  );

  await supabase
    .from("matchdays")
    .update({ start_time: result.startTime })
    .eq("id", matchdayId);

  for (let i = 0; i < result.scheduled.length; i++) {
    const s = result.scheduled[i];
    await supabase
      .from("matchday_matches")
      .update({ scheduled_at: s.kickoff, sort_order: i + 1 })
      .eq("id", s.match.id);
  }

  revalidate(matchdayId);
  return result.overflow;
}

export async function assignRole(
  matchId: string,
  matchdayId: string,
  role: string,
  memberId: string | null
) {
  const supabase = await createClient();
  if (!memberId) {
    const { error } = await supabase
      .from("match_assignments")
      .delete()
      .eq("match_id", matchId)
      .eq("role", role);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("match_assignments")
      .upsert(
        { match_id: matchId, role, member_id: memberId },
        { onConflict: "match_id,role" }
      );
    if (error) throw new Error(error.message);
  }
  revalidate(matchdayId);
}

export async function setHallManager(
  matchdayId: string,
  memberId: string | null
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("matchdays")
    .update({ hall_manager_id: memberId })
    .eq("id", matchdayId);
  if (error) throw new Error(error.message);
  revalidate(matchdayId);
}
