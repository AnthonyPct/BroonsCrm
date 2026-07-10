import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";
import { deleteMatchday } from "@/app/actions/planning";
import {
  MatchdayBoard,
  type BoardData,
  type BoardMatch,
  type Option,
} from "@/components/crm/matchday-board";
import {
  isAdultAt,
  matchWindow,
  MAX_KICKOFF,
  shortName,
  timeToMinutes,
  windowsOverlap,
} from "@/lib/planning";
import { getCurrentSeason } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Journée à domicile",
};

type SeasonMember = {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  can_table: boolean;
  can_referee: boolean;
  can_hall_manager: boolean;
  team_id: string | null;
};

export default async function MatchdayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const season = await getCurrentSeason();
  if (!season) return <p>Aucune saison active.</p>;

  const [{ data: matchday }, { data: matches }, { data: licenses }] =
    await Promise.all([
      supabase
        .from("matchdays")
        .select("*, hall_manager:members(id, first_name, last_name)")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("matchday_matches")
        .select(
          "*, team:teams(*), match_assignments(role, member:members(id, first_name, last_name))"
        )
        .eq("matchday_id", id)
        .order("sort_order"),
      supabase
        .from("licenses")
        .select(
          "team_id, member:members(id, first_name, last_name, birth_date, can_table, can_referee, can_hall_manager)"
        )
        .eq("season_id", season.id),
    ]);

  if (!matchday) notFound();

  // Compteurs d'équité sur la saison (par rôle ; resp. salle par journée)
  const [{ data: seasonAssignments }, { data: seasonDays }] =
    await Promise.all([
      supabase
        .from("match_assignments")
        .select("role, member_id, match:matchday_matches!inner(matchday:matchdays!inner(season_id))"),
      supabase
        .from("matchdays")
        .select("hall_manager_id")
        .eq("season_id", season.id),
    ]);

  const tableCounts = new Map<string, number>();
  const refereeCounts = new Map<string, number>();
  for (const a of seasonAssignments ?? []) {
    if (a.match?.matchday?.season_id !== season.id) continue;
    const target = a.role === "referee" ? refereeCounts : tableCounts;
    target.set(a.member_id, (target.get(a.member_id) ?? 0) + 1);
  }
  const hallCounts = new Map<string, number>();
  for (const d of seasonDays ?? []) {
    if (d.hall_manager_id) {
      hallCounts.set(
        d.hall_manager_id,
        (hallCounts.get(d.hall_manager_id) ?? 0) + 1
      );
    }
  }

  const members: SeasonMember[] = (licenses ?? [])
    .filter((l) => l.member)
    .map((l) => ({ ...(l.member as Omit<SeasonMember, "team_id">), team_id: l.team_id }));

  // Fenêtres d'occupation de la journée (échauffement + match)
  const windows = (matches ?? [])
    .filter((m) => m.scheduled_at && m.team)
    .map((m) => ({
      matchId: m.id,
      teamId: m.team_id,
      window: matchWindow(m.scheduled_at!.slice(0, 5), m.team!),
      assigned: (m.match_assignments ?? []).map((a) => a.member!.id),
    }));

  function isBusy(member: SeasonMember, forMatchId: string): boolean {
    const current = windows.find((w) => w.matchId === forMatchId);
    if (!current) return false;
    return windows.some(
      (w) =>
        w.matchId !== forMatchId &&
        windowsOverlap(current.window, w.window) &&
        (w.teamId === member.team_id || w.assigned.includes(member.id))
    );
  }

  function suggest(
    match: NonNullable<typeof matches>[number],
    skill: "can_table" | "can_referee"
  ): Option[] {
    const counts = skill === "can_referee" ? refereeCounts : tableCounts;
    return members
      .filter((m) => m[skill])
      .filter((m) => m.team_id !== match.team_id) // pas un joueur de l'équipe qui joue
      .filter((m) => !isBusy(m, match.id))
      .map((m) => ({
        id: m.id,
        label: shortName(m.first_name, m.last_name),
        count: counts.get(m.id) ?? 0,
      }))
      .sort((a, b) => a.count - b.count || a.label.localeCompare(b.label, "fr"));
  }

  const boardMatches: BoardMatch[] = (matches ?? []).map((m) => {
    const assignments: BoardMatch["assignments"] = {};
    for (const a of m.match_assignments ?? []) {
      assignments[a.role] = a.member
        ? { id: a.member.id, label: shortName(a.member.first_name, a.member.last_name) }
        : null;
    }
    return {
      id: m.id,
      teamName: m.team?.name ?? "?",
      isYouth: m.team?.is_youth ?? true,
      opponent: m.opponent,
      scheduledAt: m.scheduled_at?.slice(0, 5) ?? null,
      assignments,
      suggestions: {
        table_1: suggest(m, "can_table"),
        table_2: suggest(m, "can_table"),
        ...(m.team?.is_youth ? { referee: suggest(m, "can_referee") } : {}),
      },
    };
  });

  const hallOptions: Option[] = members
    .filter((m) => m.can_hall_manager && isAdultAt(m.birth_date, matchday.date))
    .map((m) => ({
      id: m.id,
      label: shortName(m.first_name, m.last_name),
      count: hallCounts.get(m.id) ?? 0,
    }))
    .sort((a, b) => a.count - b.count || a.label.localeCompare(b.label, "fr"));

  const rawLabel = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(matchday.date));
  const dateLabel = rawLabel[0].toUpperCase() + rawLabel.slice(1);

  const lastKickoff = boardMatches
    .map((m) => (m.scheduledAt ? timeToMinutes(m.scheduledAt) : 0))
    .reduce((a, b) => Math.max(a, b), 0);

  const board: BoardData = {
    matchdayId: matchday.id,
    dateLabel,
    hallManager: {
      current: matchday.hall_manager
        ? {
            id: matchday.hall_manager.id,
            label: shortName(
              matchday.hall_manager.first_name,
              matchday.hall_manager.last_name
            ),
          }
        : null,
      options: hallOptions,
    },
    matches: boardMatches,
    teams: [], // rempli ci-dessous
    overflow: lastKickoff > MAX_KICKOFF,
  };

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name")
    .eq("season_id", season.id)
    .order("sort_order");
  board.teams = teams ?? [];

  async function removeDay() {
    "use server";
    await deleteMatchday(id);
  }

  return (
    <div className="mx-auto max-w-[920px] space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href="/crm/planning"
          className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-primary"
        >
          <ChevronLeft className="size-4" />
          Journées
        </Link>
        <form action={removeDay}>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-[9px] border border-[#f3ccd0] bg-accent px-3.5 py-2 text-[12.5px] font-bold text-destructive transition-colors hover:bg-[#f6d7da]"
          >
            <Trash2 className="size-3.5" />
            Supprimer la journée
          </button>
        </form>
      </div>

      <div>
        <h2 className="font-display text-[22px] font-extrabold tracking-[-.01em]">
          {dateLabel}
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Coup d&apos;envoi du premier match :{" "}
          {matchday.start_time?.slice(0, 5) ?? "—"} · dernier coup d&apos;envoi
          autorisé : 21h15 · séniors à partir de 18h00.
        </p>
      </div>

      <MatchdayBoard data={board} />
    </div>
  );
}
