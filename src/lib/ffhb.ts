// Logique métier de l'intégration FFHB : fenêtre de week-end, nettoyage des
// libellés, et surtout le classement des rencontres du cache en propositions
// d'import pour une journée à domicile.
//
// Pur et sans dépendance (types structurels plutôt que `Tables<…>`), dans
// l'esprit de `planning.ts` et `assignment.ts` : les server actions font l'I/O,
// ce fichier décide. Conséquence pratique : `ffhb.lib.test.mjs` le charge
// directement, sans base ni serveur.

// /////////////////////////////////////////////////////////////////////////
// TYPES
// /////////////////////////////////////////////////////////////////////////

/** Une rencontre du cache `ffhb_rencontres`. */
export type CachedRencontre = {
  extRencontreId: string;
  pouleId: string;
  journeeNumero: number;
  dateHeure: string | null;
  equipe1Id: string | null;
  equipe2Id: string | null;
  equipe1Libelle: string;
  equipe2Libelle: string;
};

/** Une équipe du club, avec sa configuration FFHB si elle en a une. */
export type ConfiguredTeam = {
  id: string;
  name: string;
  ffhbPouleId: string | null;
  /**
   * L'id d'équipe interne FFHB — celui que portent `equipe1Id`/`equipe2Id` sur
   * une rencontre, et `equipe_options[].id` dans le sélecteur de poule.
   * À ne pas confondre avec `ext_equipeId`, qui n'apparaît nulle part ailleurs.
   */
  ffhbEquipeId: string | null;
};

/** Un match déjà présent dans la journée. */
export type ExistingMatch = {
  id: string;
  teamId: string;
  ffhbExtRencontreId: string | null;
};

export type ProposalStatus =
  /** À domicile, absent de la journée : à créer. */
  | "importable"
  /** Déjà importé dans cette journée (même id de rencontre). */
  | "deja_present"
  /** Match saisi à la main sur la même équipe : à rattacher plutôt qu'à dupliquer. */
  | "rattachable"
  /** À l'extérieur ce week-end : affiché pour mémoire, jamais importé. */
  | "exterieur";

export type ImportProposal = {
  status: ProposalStatus;
  rencontre: CachedRencontre;
  /** Notre équipe, quand elle a pu être identifiée. */
  team: ConfiguredTeam | null;
  /** Libellé de l'adversaire, nettoyé pour l'affichage. */
  opponent: string;
  /** Horaire officiel FFHB — informatif, il n'entre jamais dans `scheduled_at`. */
  officialAt: string | null;
  /** Le match déjà en base, pour « deja_present » et « rattachable ». */
  existingMatchId: string | null;
  /** La rencontre tombe un autre jour que la journée (report au dimanche…). */
  dateDiffers: boolean;
  /**
   * La FFHB n'a pas encore daté cette rencontre : on ne la connaît que par son
   * numéro de journée. Cas courant dès qu'on prépare un samedi à plus de trois
   * ou quatre semaines — les dates sont posées dans Gesthand au fil de la saison.
   */
  dateUnconfirmed: boolean;
};

// /////////////////////////////////////////////////////////////////////////
// DATES
// /////////////////////////////////////////////////////////////////////////

const DAY_MS = 24 * 60 * 60 * 1000;

/** AAAA-MM-JJ → Date à midi UTC, pour que les décalages horaires ne changent pas le jour. */
function toDay(date: string): Date {
  return new Date(`${date.slice(0, 10)}T12:00:00Z`);
}

function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Fenêtre de recherche autour d'une journée à domicile : le week-end
 * (samedi → dimanche) qui contient la date. Une journée posée en semaine
 * (rattrapage, plateau du mercredi) élargit à ±3 jours, faute de week-end
 * évident à viser.
 */
export function weekendRange(date: string): { start: string; end: string } {
  const day = toDay(date);
  const weekday = day.getUTCDay(); // 0 = dimanche
  if (weekday === 6) {
    return { start: toIsoDay(day), end: toIsoDay(new Date(day.getTime() + DAY_MS)) };
  }
  if (weekday === 0) {
    return { start: toIsoDay(new Date(day.getTime() - DAY_MS)), end: toIsoDay(day) };
  }
  return {
    start: toIsoDay(new Date(day.getTime() - 3 * DAY_MS)),
    end: toIsoDay(new Date(day.getTime() + 3 * DAY_MS)),
  };
}

/**
 * Jour civil d'une rencontre, en heure de Paris.
 * Comparer l'horodatage brut à une date décalerait d'un jour tous les matchs
 * du soir — le piège numéro un de cette intégration.
 */
export function parisDay(isoWithOffset: string): string {
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(isoWithOffset));
}

// /////////////////////////////////////////////////////////////////////////
// LIBELLÉS
// /////////////////////////////////////////////////////////////////////////

const KEEP_LOWER = new Set(["de", "des", "du", "la", "le", "les", "et", "d", "l"]);

/**
 * Les libellés FFHB sont saisis dans Gesthand et n'ont aucune casse fiable :
 * « CADETS DE BRETAGNE 2 » côtoie « Pays de broons ». On normalise pour
 * l'affichage, sans jamais s'en servir pour identifier une équipe.
 */
export function cleanOpponentLabel(label: string): string {
  const trimmed = label.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  return trimmed
    .split(" ")
    .map((word, index) => capitalizeWord(word, index === 0))
    .join(" ");
}

/**
 * Un mot tout en capitales et assez court pour être un sigle : US, CS, HBC,
 * ASC, HPV, CPB. Trois lettres au plus — au-delà, le français a trop de mots
 * courts (BAIN, CLUB, PAYS) qu'on laisserait hurler en capitales.
 */
const ACRONYM_RE = /^[A-ZÀ-Þ0-9'’-]{1,3}$/;

function capitalizeWord(word: string, isFirst: boolean): string {
  const lower = word.toLocaleLowerCase("fr");
  if (!isFirst && KEEP_LOWER.has(lower.replace(/['’]/g, ""))) return lower;
  // Un mot contenant un chiffre est un numéro d'équipe ou une catégorie
  // (« 2 », « +16M ») : y toucher ne ferait que l'abîmer.
  if (/[0-9]/.test(word)) return word;
  // Une abréviation (« HBC », « ASC », « CS ») reste en capitales : la
  // minusculiser la rendrait méconnaissable.
  if (ACRONYM_RE.test(word)) return word;
  return lower
    .split(/([-'’])/)
    .map((part) =>
      /^[a-zà-ÿ]/.test(part)
        ? part.charAt(0).toLocaleUpperCase("fr") + part.slice(1)
        : part,
    )
    .join("");
}

/** Identifiant d'URL d'une équipe pour les pages publiques. */
export function teamSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// /////////////////////////////////////////////////////////////////////////
// PROPOSITIONS D'IMPORT
// /////////////////////////////////////////////////////////////////////////

/**
 * Classe les rencontres du cache en propositions pour une journée donnée.
 *
 * Deux règles structurantes :
 * - seules les rencontres où nous recevons (`equipe1Id`) sont importables —
 *   une journée à domicile ne contient que des matchs à domicile ;
 * - une rencontre déjà en base n'est jamais proposée deux fois, qu'elle ait
 *   été importée (même id de rencontre) ou saisie à la main sur la même
 *   équipe, auquel cas on propose de la rattacher plutôt que de la dupliquer.
 */
export function buildImportProposals(
  rencontres: CachedRencontre[],
  teams: ConfiguredTeam[],
  existing: ExistingMatch[],
  matchdayDate: string,
): ImportProposal[] {
  const { start, end } = weekendRange(matchdayDate);
  const byEquipeId = new Map<string, ConfiguredTeam>();
  for (const team of teams) {
    if (team.ffhbEquipeId) byEquipeId.set(team.ffhbEquipeId, team);
  }

  const importedIds = new Map<string, ExistingMatch>();
  for (const match of existing) {
    if (match.ffhbExtRencontreId) importedIds.set(match.ffhbExtRencontreId, match);
  }

  // Les matchs saisis à la main, consommés au fur et à mesure : deux rencontres
  // de la même équipe le même jour (plateau jeunes) ne doivent pas se rattacher
  // toutes les deux à la même ligne.
  const manualByTeam = new Map<string, ExistingMatch[]>();
  for (const match of existing) {
    if (match.ffhbExtRencontreId) continue;
    const list = manualByTeam.get(match.teamId) ?? [];
    list.push(match);
    manualByTeam.set(match.teamId, list);
  }

  const proposals: ImportProposal[] = [];
  for (const rencontre of rencontres) {
    const day = rencontre.dateHeure ? parisDay(rencontre.dateHeure) : null;
    // Une rencontre datée hors du week-end visé ne concerne pas cette journée.
    if (day && (day < start || day > end)) continue;
    // Une rencontre SANS date est conservée : la FFHB ne date les rencontres
    // qu'au fil de la saison, et c'est alors le numéro de journée qui les
    // rattache au week-end. Ce rapprochement-là est fait par la requête
    // (`ffhb_rencontres_for_matchday`), qui seule connaît le calendrier de
    // chaque poule — ici on fait confiance à l'ensemble reçu.

    const home = rencontre.equipe1Id ? byEquipeId.get(rencontre.equipe1Id) ?? null : null;
    const away = rencontre.equipe2Id ? byEquipeId.get(rencontre.equipe2Id) ?? null : null;
    const team = home ?? away;
    const base = {
      rencontre,
      team,
      officialAt: rencontre.dateHeure,
      dateDiffers: day !== null && day !== matchdayDate.slice(0, 10),
      dateUnconfirmed: day === null,
    };

    // Une poule contient douze équipes : onze douzièmes de ses rencontres ne
    // nous concernent pas. Les afficher comme « à rattacher » noierait les
    // nôtres et inviterait à les affecter par erreur à une de nos équipes.
    if (!team) continue;

    const opponent = cleanOpponentLabel(home ? rencontre.equipe2Libelle : rencontre.equipe1Libelle);

    if (!home) {
      proposals.push({ ...base, status: "exterieur", opponent, existingMatchId: null });
      continue;
    }

    const already = importedIds.get(rencontre.extRencontreId);
    if (already) {
      proposals.push({ ...base, status: "deja_present", opponent, existingMatchId: already.id });
      continue;
    }

    const manual = manualByTeam.get(team.id);
    const candidate = manual?.shift();
    proposals.push({
      ...base,
      status: candidate ? "rattachable" : "importable",
      opponent,
      existingMatchId: candidate?.id ?? null,
    });
  }

  return proposals.sort(compareProposals);
}

const STATUS_ORDER: ProposalStatus[] = [
  "importable",
  "rattachable",
  "deja_present",
  "exterieur",
];

function compareProposals(a: ImportProposal, b: ImportProposal): number {
  const byStatus = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
  if (byStatus !== 0) return byStatus;
  return (a.officialAt ?? "").localeCompare(b.officialAt ?? "");
}

/** Les propositions qu'un clic « Importer » doit effectivement créer. */
export function selectableProposals(proposals: ImportProposal[]): ImportProposal[] {
  return proposals.filter((p) => p.status === "importable" || p.status === "rattachable");
}

/**
 * « il y a 2 h », « il y a 3 j ». Calculé côté serveur et passé en chaîne aux
 * composants : un `new Date()` dans le rendu client provoquerait un écart
 * d'hydratation avec le rendu serveur.
 */
export function relativeFrom(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  return `il y a ${days} j`;
}
