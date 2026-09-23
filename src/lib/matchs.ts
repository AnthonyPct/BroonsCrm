// Logique de la page publique « Matchs » : ce qui est « à venir », ce qui est
// un résultat, et le regroupement par week-end.
//
// Pur et sans import (comme `ffhb.ts`) : la page fait l'I/O via la RPC
// `get_public_matchs`, ce fichier décide. `matchs.lib.test.mjs` le charge
// directement, sans base ni serveur.

// /////////////////////////////////////////////////////////////////////////
// TYPES — forme renvoyée par la RPC `get_public_matchs`
// /////////////////////////////////////////////////////////////////////////

export type PublicVenue = {
  libelle: string | null;
  rue: string | null;
  code_postal: string | null;
  ville: string | null;
  lat: number | null;
  lng: number | null;
};

export type PublicPlanning = {
  hall_manager: string | null;
  assignments: Record<string, string>;
};

export type PublicMatch = {
  key: string;
  /** Jour civil à Paris, AAAA-MM-JJ. */
  day: string;
  /** « 18h30 », ou null si l'horaire n'est pas encore connu. */
  time: string | null;
  /** Rencontre pas encore datée par la FFHB : `day` est le début de sa journée. */
  date_tbc: boolean;
  team_id: string;
  team: string;
  is_youth: boolean;
  home: boolean;
  opponent: string;
  played: boolean;
  score_for: number | null;
  score_against: number | null;
  venue: PublicVenue | null;
  fdm_code: string | null;
  planning: PublicPlanning | null;
};

export type PublicTeam = { id: string; name: string };

export type PublicMatchs = { teams: PublicTeam[]; matches: PublicMatch[] };

export type WeekendGroup = {
  /** Samedi du week-end (ou le jour lui-même pour un match en semaine). */
  start: string;
  matches: PublicMatch[];
};

// /////////////////////////////////////////////////////////////////////////
// DATES
// /////////////////////////////////////////////////////////////////////////

const DAY_MS = 86_400_000;

function toDay(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`);
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  return toIso(new Date(toDay(iso).getTime() + days * DAY_MS));
}

/** Aujourd'hui à Paris — le serveur tourne en UTC. */
export function parisToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Samedi de rattachement d'un jour : le dimanche appartient au week-end de la
 * veille. Un match en semaine (rattrapage) forme son propre groupe.
 */
export function weekendStart(day: string): string {
  const weekday = toDay(day).getUTCDay(); // 0 = dimanche
  if (weekday === 0) return addDays(day, -1);
  return day;
}

/**
 * Dernier jour affiché dans « À venir » : le dimanche du 2e week-end à venir.
 * Un samedi ou un dimanche, le week-end en cours compte comme le premier.
 */
export function upcomingEnd(today: string): string {
  const weekday = toDay(today).getUTCDay();
  // Jours jusqu'au dimanche du week-end en cours ou à venir.
  const toSunday = weekday === 0 ? 0 : 7 - weekday;
  return addDays(today, toSunday + 7);
}

// /////////////////////////////////////////////////////////////////////////
// DÉCOUPAGE
// /////////////////////////////////////////////////////////////////////////

function byDayAndTime(a: PublicMatch, b: PublicMatch): number {
  if (a.day !== b.day) return a.day < b.day ? -1 : 1;
  // Horaire inconnu en dernier dans sa journée.
  if (a.time === b.time) return 0;
  if (a.time === null) return 1;
  if (b.time === null) return -1;
  return a.time < b.time ? -1 : 1;
}

/**
 * « À venir » : d'aujourd'hui à la fin du 2e week-end, pas encore joué.
 * « Résultats » : tout ce qui est passé, ou déjà joué. Un match passé sans
 * score reste dans les résultats (affiché « score à venir ») plutôt que de
 * disparaître le temps que la FFHB le saisisse.
 */
export function splitMatchs(
  matches: PublicMatch[],
  today: string,
): { upcoming: PublicMatch[]; results: PublicMatch[] } {
  const end = upcomingEnd(today);
  const upcoming: PublicMatch[] = [];
  const results: PublicMatch[] = [];
  for (const match of matches) {
    if (match.played || match.day < today) results.push(match);
    else if (match.day <= end) upcoming.push(match);
  }
  upcoming.sort(byDayAndTime);
  results.sort(byDayAndTime);
  return { upcoming, results };
}

/** Regroupe par week-end ; `order` s'applique aux groupes, pas aux matchs d'un groupe. */
export function groupByWeekend(
  matches: PublicMatch[],
  order: "asc" | "desc" = "asc",
): WeekendGroup[] {
  const groups = new Map<string, PublicMatch[]>();
  for (const match of [...matches].sort(byDayAndTime)) {
    const start = weekendStart(match.day);
    const list = groups.get(start) ?? [];
    list.push(match);
    groups.set(start, list);
  }
  const result = [...groups.entries()].map(([start, list]) => ({ start, matches: list }));
  result.sort((a, b) => (a.start < b.start ? -1 : 1) * (order === "asc" ? 1 : -1));
  return result;
}

// /////////////////////////////////////////////////////////////////////////
// AFFICHAGE
// /////////////////////////////////////////////////////////////////////////

export function outcome(match: PublicMatch): "V" | "N" | "D" | null {
  if (!match.played || match.score_for === null || match.score_against === null) return null;
  if (match.score_for > match.score_against) return "V";
  if (match.score_for < match.score_against) return "D";
  return "N";
}

/** « Samedi 26 septembre » ; pour un week-end, « Week-end du 26 septembre » si deux jours. */
export function dayLabel(day: string): string {
  const label = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(toDay(day));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function weekendLabel(group: WeekendGroup): string {
  const days = new Set(group.matches.map((m) => m.day));
  if (days.size <= 1) return dayLabel(group.start);
  const date = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(toDay(group.start));
  return `Week-end du ${date}`;
}

/** Jour court pour une ligne d'un week-end à deux jours : « sam. », « dim. ». */
export function shortWeekday(day: string): string {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "UTC" }).format(toDay(day));
}

/**
 * Les membres sont parfois saisis en capitales (« CHLOE M. ») : on normalise
 * pour l'affichage public.
 */
export function prettyName(name: string): string {
  return name
    .toLocaleLowerCase("fr")
    .replace(/(^|[\s'’-])(\p{L})/gu, (_, sep: string, letter: string) => sep + letter.toLocaleUpperCase("fr"));
}

/** Lien Google Maps vers la salle : coordonnées si connues, sinon l'adresse. */
export function mapsUrl(venue: PublicVenue): string | null {
  if (venue.lat !== null && venue.lng !== null) {
    return `https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}`;
  }
  const address = [venue.libelle, venue.rue, venue.code_postal, venue.ville].filter(Boolean).join(" ");
  if (!address) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
