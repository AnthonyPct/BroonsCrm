import {
  isAdultAt,
  matchWindow,
  shortName,
  windowsOverlap,
  type Team,
} from "@/lib/planning";

export type PlanMember = {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  can_table: boolean;
  can_referee: boolean;
  can_hall_manager: boolean;
  team_id: string | null;
};

export type PlanMatch = {
  id: string;
  team_id: string;
  team: Team;
  scheduled_at: string | null; // HH:MM
  sort_order: number;
  assignments: Partial<Record<string, string>>; // role -> member_id
};

export type Candidate = {
  id: string;
  label: string;
  count: number;
  adjacent: boolean; // joue le match d'avant ou d'après
};

export type EquityCounts = {
  table: Map<string, number>;
  referee: Map<string, number>;
  hall: Map<string, number>;
};

const SKILL_FOR_ROLE: Record<string, keyof PlanMember> = {
  table_1: "can_table",
  table_2: "can_table",
  referee: "can_referee",
};

function windowOf(m: PlanMatch): [number, number] | null {
  return m.scheduled_at ? matchWindow(m.scheduled_at, m.team) : null;
}

/** Équipes des matchs adjacents (avant/après) dans le déroulé de la journée. */
function adjacentTeamIds(matches: PlanMatch[], match: PlanMatch): Set<string> {
  const sorted = [...matches].sort((a, b) => a.sort_order - b.sort_order);
  const i = sorted.findIndex((m) => m.id === match.id);
  const ids = new Set<string>();
  if (i > 0) ids.add(sorted[i - 1].team_id);
  if (i < sorted.length - 1) ids.add(sorted[i + 1].team_id);
  ids.delete(match.team_id);
  return ids;
}

function isBusy(
  member: PlanMember,
  match: PlanMatch,
  matches: PlanMatch[]
): boolean {
  // jamais sur son propre match, ni un autre rôle du même match
  if (member.team_id === match.team_id) return true;
  if (Object.values(match.assignments).includes(member.id)) return true;

  const current = windowOf(match);
  for (const other of matches) {
    if (other.id === match.id) continue;
    const w = windowOf(other);
    const overlaps = current && w ? windowsOverlap(current, w) : false;
    if (!overlaps) continue;
    if (other.team_id === member.team_id) return true;
    if (Object.values(other.assignments).includes(member.id)) return true;
  }
  return false;
}

/**
 * Candidats classés pour un rôle d'un match :
 * 1. ceux qui jouent le match d'avant ou d'après (déjà à la salle),
 * 2. compteur d'équité du rôle croissant,
 * 3. ordre alphabétique.
 */
export function rankCandidates(
  match: PlanMatch,
  role: string,
  members: PlanMember[],
  matches: PlanMatch[],
  counts: EquityCounts
): Candidate[] {
  const skill = SKILL_FOR_ROLE[role];
  const countMap = role === "referee" ? counts.referee : counts.table;
  const adjacent = adjacentTeamIds(matches, match);

  return members
    .filter((m) => m[skill])
    .filter((m) => !isBusy(m, match, matches))
    .map((m) => ({
      id: m.id,
      label: shortName(m.first_name, m.last_name),
      count: countMap.get(m.id) ?? 0,
      adjacent: m.team_id !== null && adjacent.has(m.team_id),
    }))
    .sort(
      (a, b) =>
        Number(b.adjacent) - Number(a.adjacent) ||
        a.count - b.count ||
        a.label.localeCompare(b.label, "fr")
    );
}

/** Candidats responsables de salle : majeurs + compétence, équité par journée. */
export function rankHallManagers(
  members: PlanMember[],
  matchdayDate: string,
  counts: EquityCounts
): Candidate[] {
  return members
    .filter((m) => m.can_hall_manager && isAdultAt(m.birth_date, matchdayDate))
    .map((m) => ({
      id: m.id,
      label: shortName(m.first_name, m.last_name),
      count: counts.hall.get(m.id) ?? 0,
      adjacent: false,
    }))
    .sort(
      (a, b) => a.count - b.count || a.label.localeCompare(b.label, "fr")
    );
}

export type AutoPlan = {
  assignments: { matchId: string; role: string; memberId: string }[];
  hallManagerId: string | null;
};

/**
 * Plan d'assignation automatique : remplit uniquement les créneaux vides,
 * dans l'ordre de la journée, en mettant à jour l'équité au fil des choix
 * (et en marquant chaque personne assignée comme occupée sur ce créneau).
 */
export function buildAutoPlan(
  matches: PlanMatch[],
  members: PlanMember[],
  matchdayDate: string,
  currentHallManagerId: string | null,
  counts: EquityCounts
): AutoPlan {
  // copies mutables pour simuler les affectations au fil de l'eau
  const workMatches: PlanMatch[] = matches
    .map((m) => ({ ...m, assignments: { ...m.assignments } }))
    .sort((a, b) => a.sort_order - b.sort_order);
  const workCounts: EquityCounts = {
    table: new Map(counts.table),
    referee: new Map(counts.referee),
    hall: new Map(counts.hall),
  };

  const plan: AutoPlan = { assignments: [], hallManagerId: null };

  for (const match of workMatches) {
    // arbitre d'abord : la compétence est plus rare que la table
    const roles = [...(match.team.is_youth ? ["referee"] : []), "table_1", "table_2"];
    for (const role of roles) {
      if (match.assignments[role]) continue; // déjà désigné à la main
      const [best] = rankCandidates(match, role, members, workMatches, workCounts);
      if (!best) continue;
      match.assignments[role] = best.id;
      plan.assignments.push({ matchId: match.id, role, memberId: best.id });
      const countMap = role === "referee" ? workCounts.referee : workCounts.table;
      countMap.set(best.id, (countMap.get(best.id) ?? 0) + 1);
    }
  }

  if (!currentHallManagerId) {
    const [best] = rankHallManagers(members, matchdayDate, workCounts);
    plan.hallManagerId = best?.id ?? null;
  }

  return plan;
}
