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
import { MAX_KICKOFF, shortName, timeToMinutes } from "@/lib/planning";
import {
  buildImportProposals,
  relativeFrom,
  type CachedRencontre,
} from "@/lib/ffhb";
import type { BoardProposal } from "@/components/crm/ffhb-import-dialog";
import {
  rankCandidates,
  rankHallManagers,
  type EquityCounts,
  type PlanMatch,
  type PlanMember,
} from "@/lib/assignment";
import { getCurrentSeason } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Journée à domicile",
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
          "team_id, member:members(id, first_name, last_name, birth_date, email, can_table, can_referee, can_hall_manager)"
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

  const counts: EquityCounts = {
    table: new Map(),
    referee: new Map(),
    hall: new Map(),
  };
  for (const a of seasonAssignments ?? []) {
    if (a.match?.matchday?.season_id !== season.id) continue;
    const target = a.role === "referee" ? counts.referee : counts.table;
    target.set(a.member_id, (target.get(a.member_id) ?? 0) + 1);
  }
  for (const d of seasonDays ?? []) {
    if (d.hall_manager_id) {
      counts.hall.set(
        d.hall_manager_id,
        (counts.hall.get(d.hall_manager_id) ?? 0) + 1
      );
    }
  }

  const members: PlanMember[] = (licenses ?? [])
    .filter((l) => l.member)
    .map((l) => ({
      ...(l.member as Omit<PlanMember, "team_id">),
      team_id: l.team_id,
    }));

  const planMatches: PlanMatch[] = (matches ?? [])
    .filter((m) => m.team)
    .map((m) => ({
      id: m.id,
      team_id: m.team_id,
      team: m.team!,
      scheduled_at: m.scheduled_at?.slice(0, 5) ?? null,
      sort_order: m.sort_order,
      assignments: Object.fromEntries(
        (m.match_assignments ?? [])
          .filter((a) => a.member)
          .map((a) => [a.role, a.member!.id])
      ),
    }));

  const boardMatches: BoardMatch[] = (matches ?? []).map((m) => {
    const planMatch = planMatches.find((pm) => pm.id === m.id)!;
    const assignments: BoardMatch["assignments"] = {};
    for (const a of m.match_assignments ?? []) {
      assignments[a.role] = a.member
        ? { id: a.member.id, label: shortName(a.member.first_name, a.member.last_name) }
        : null;
    }
    const rank = (role: string): Option[] =>
      rankCandidates(planMatch, role, members, planMatches, counts);
    return {
      id: m.id,
      teamName: m.team?.name ?? "?",
      isYouth: m.team?.is_youth ?? true,
      opponent: m.opponent,
      scheduledAt: m.scheduled_at?.slice(0, 5) ?? null,
      assignments,
      suggestions: {
        table_1: rank("table_1"),
        table_2: rank("table_2"),
        ...(m.team?.is_youth ? { referee: rank("referee") } : {}),
      },
    };
  });

  const hallOptions: Option[] = rankHallManagers(members, matchday.date, counts);

  // Convocation : emails de tous les désignés (Cci), et liste des sans-email
  const assignedIds = new Set<string>(
    planMatches.flatMap((m) => Object.values(m.assignments) as string[])
  );
  if (matchday.hall_manager_id) assignedIds.add(matchday.hall_manager_id);
  const convocation = { emails: [] as string[], missing: [] as string[] };
  for (const memberId of assignedIds) {
    const member = members.find((m) => m.id === memberId);
    if (!member) continue;
    if (member.email) convocation.emails.push(member.email);
    else convocation.missing.push(shortName(member.first_name, member.last_name));
  }

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
    dateIso: matchday.date,
    convocation,
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
    ffhb: {
      configured: false,
      unlinkedTeams: [],
      lastSyncLabel: null,
      lastSyncError: null,
      proposals: [],
    }, // rempli ci-dessous
    overflow: lastKickoff > MAX_KICKOFF,
  };

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, ffhb_poule_id, ffhb_equipe_id")
    .eq("season_id", season.id)
    .order("sort_order");
  board.teams = (teams ?? []).map((t) => ({ id: t.id, name: t.name }));

  // Propositions d'import FFHB, lues côté serveur pour que la modale s'ouvre
  // sans latence et que le compteur du bouton soit juste avant le clic.
  // Le cache fait foi : on ne contacte jamais ffhandball.fr depuis Next.js.
  const [{ data: rencontres }, { data: settings }] = await Promise.all([
    supabase.rpc("ffhb_rencontres_for_matchday", { p_matchday_id: id }),
    supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["ffhb_last_sync_at", "ffhb_last_sync_error"]),
  ]);

  const configuredTeams = (teams ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    ffhbPouleId: t.ffhb_poule_id,
    ffhbEquipeId: t.ffhb_equipe_id,
  }));
  const cached: CachedRencontre[] = (rencontres ?? []).map((r) => ({
    extRencontreId: r.ext_rencontre_id,
    pouleId: r.poule_id,
    journeeNumero: r.journee_numero,
    dateHeure: r.date_heure,
    equipe1Id: r.equipe1_id,
    equipe2Id: r.equipe2_id,
    equipe1Libelle: r.equipe1_libelle,
    equipe2Libelle: r.equipe2_libelle,
  }));

  const proposals: BoardProposal[] = buildImportProposals(
    cached,
    configuredTeams,
    (matches ?? []).map((m) => ({
      id: m.id,
      teamId: m.team_id,
      ffhbExtRencontreId: m.ffhb_ext_rencontre_id,
    })),
    matchday.date
  ).map((p) => ({
    key: p.rencontre.extRencontreId,
    status: p.status,
    teamId: p.team?.id ?? null,
    teamName: p.team?.name ?? null,
    opponent: p.opponent,
    officialAt: p.officialAt,
    officialLabel: p.officialAt ? officialLabel(p.officialAt) : null,
    dateDiffers: p.dateDiffers,
    dateUnconfirmed: p.dateUnconfirmed,
    existingMatchId: p.existingMatchId,
  }));

  const bySetting = new Map((settings ?? []).map((s) => [s.key, s.value]));
  const lastSync = bySetting.get("ffhb_last_sync_at");
  board.ffhb = {
    configured: configuredTeams.some((t) => t.ffhbPouleId),
    unlinkedTeams: configuredTeams.filter((t) => !t.ffhbPouleId).map((t) => t.name),
    lastSyncLabel: lastSync ? relativeFrom(lastSync) : null,
    lastSyncError: bySetting.get("ffhb_last_sync_error") || null,
    proposals,
  };

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

/** « sam. 03/10 · 18h30 », en heure de Paris. */
function officialLabel(iso: string): string {
  const date = new Date(iso);
  const jour = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
  const heure = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(date)
    .replace(":", "h");
  return `${jour} · ${heure}`;
}
