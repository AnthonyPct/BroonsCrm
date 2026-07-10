import type { Tables } from "@/lib/database.types";

export type Team = Tables<"teams">;

export const DEFAULT_START = "14:00";
export const FALLBACK_START = "13:00";
export const SENIOR_MIN_KICKOFF = 18 * 60; // pas de match sénior avant 18h00
export const MAX_KICKOFF = 21 * 60 + 15; // dernier coup d'envoi 21h15

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function minutesToTime(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function roundUpQuarter(min: number): number {
  return Math.ceil(min / 15) * 15;
}

export type ScheduledMatch<T> = {
  match: T;
  kickoff: string; // HH:MM
};

export type ScheduleResult<T> = {
  scheduled: ScheduledMatch<T>[];
  startTime: string;
  overflow: boolean;
};

/**
 * Ordonnance les matchs d'une journée :
 * tri par ordre d'équipe (jeunes → séniors, SF après SM), puis
 * envoi[n] = envoi[n-1] + durée[n-1] + échauffement[n], arrondi au quart d'heure,
 * avec plancher 18h00 pour les équipes séniors.
 * Essaie 14h00 puis replie sur 13h00 si le dernier envoi dépasse 21h15.
 */
export function scheduleMatches<T extends { team: Team }>(
  matches: T[]
): ScheduleResult<T> {
  const sorted = [...matches].sort(
    (a, b) => a.team.sort_order - b.team.sort_order
  );

  function compute(start: string): ScheduleResult<T> {
    const scheduled: ScheduledMatch<T>[] = [];
    let cursor = timeToMinutes(start); // envoi du 1er match (échauffement avant ouverture)
    for (let i = 0; i < sorted.length; i++) {
      const m = sorted[i];
      if (i > 0) {
        const prev = sorted[i - 1];
        cursor = roundUpQuarter(
          cursor + prev.team.match_duration_minutes + m.team.warmup_minutes
        );
      }
      if (!m.team.is_youth) {
        cursor = Math.max(cursor, SENIOR_MIN_KICKOFF);
      }
      scheduled.push({ match: m, kickoff: minutesToTime(cursor) });
    }
    const last = scheduled.at(-1);
    return {
      scheduled,
      startTime: start,
      overflow: last ? timeToMinutes(last.kickoff) > MAX_KICKOFF : false,
    };
  }

  const at14 = compute(DEFAULT_START);
  if (!at14.overflow) return at14;
  return compute(FALLBACK_START);
}

/** Équipe proposée automatiquement d'après l'année de naissance et le sexe. */
export function findTeamFor(
  teams: Team[],
  birthYear: number | null,
  sex: string | null
): Team | null {
  if (!birthYear) return null;
  return (
    [...teams]
      .sort((a, b) => a.sort_order - b.sort_order)
      .find(
        (t) =>
          (t.birth_year_min !== null || t.birth_year_max !== null) &&
          (t.birth_year_min === null || birthYear >= t.birth_year_min) &&
          (t.birth_year_max === null || birthYear <= t.birth_year_max) &&
          (t.gender === null || t.gender === sex)
      ) ?? null
  );
}

/** Fenêtre d'occupation d'un match : échauffement + match. */
export function matchWindow(
  kickoff: string,
  team: Pick<Team, "warmup_minutes" | "match_duration_minutes">
): [number, number] {
  const start = timeToMinutes(kickoff);
  return [start - team.warmup_minutes, start + team.match_duration_minutes];
}

export function windowsOverlap(
  a: [number, number],
  b: [number, number]
): boolean {
  return a[0] < b[1] && b[0] < a[1];
}

export function isAdultAt(birthDate: string | null, onDate: string): boolean {
  if (!birthDate) return false;
  const birth = new Date(birthDate);
  const ref = new Date(onDate);
  const age =
    ref.getFullYear() -
    birth.getFullYear() -
    (ref.getMonth() < birth.getMonth() ||
    (ref.getMonth() === birth.getMonth() && ref.getDate() < birth.getDate())
      ? 1
      : 0);
  return age >= 18;
}

export const ROLE_LABELS: Record<string, string> = {
  table_1: "Table 1",
  table_2: "Table 2",
  referee: "Arbitre",
};

/** Format « Prénom I. » utilisé partout (WhatsApp, public, suggestions). */
export function shortName(firstName: string, lastName: string): string {
  return `${firstName} ${(lastName[0] ?? "").toUpperCase()}.`;
}
