// Extraction des données de compétition depuis ffhandball.fr.
// La FFHB n'expose aucune API : le site est un WordPress dont les pages
// embarquent, côté serveur, un JSON complet HTML-échappé dans l'attribut
// `attributes` de balises <smartfire-component>. On extrait donc ce blob,
// qui est le contrat de données réel entre leur back et leur front, plutôt
// que de parcourir un DOM fragile.
//
// Ce module est VOLONTAIREMENT pur : aucune I/O, aucune API Deno, aucun
// import externe. Deux raisons — il reste testable hors ligne sur des
// fixtures (`ffhb.extract.test.mjs`), et il est le SEUL endroit du dépôt qui
// connaît le HTML de la FFHB. Le jour où Smartfire est refactoré, un seul
// fichier bouge.

// /////////////////////////////////////////////////////////////////////////
// TYPES
// /////////////////////////////////////////////////////////////////////////

/** Coordonnées d'une poule, telles qu'on les lit dans une URL ffhandball.fr. */
export type PouleRef = {
  extSaisonId: string;
  competitionType: string;
  competitionSlug: string;
  extCompetitionId: string;
  extPouleId: string | null;
};

export type FfhbJournee = {
  numero: number;
  dateDebut: string;
  dateFin: string;
};

export type FfhbPoule = {
  id: string;
  extPouleId: string;
  phaseId: string | null;
  libelle: string;
  journees: FfhbJournee[];
};

export type FfhbEquipeOption = {
  id: string;
  extEquipeId: string | null;
  structureId: string | null;
  libelle: string;
};

export type FfhbRencontre = {
  extRencontreId: string;
  extPouleId: string | null;
  journeeNumero: number;
  /** ISO 8601 avec fuseau, ou null si la rencontre n'est pas programmée. */
  dateHeure: string | null;
  equipe1Id: string | null;
  equipe2Id: string | null;
  equipe1Libelle: string;
  equipe2Libelle: string;
  score1: number | null;
  score2: number | null;
  score1Mt: number | null;
  score2Mt: number | null;
  equipementId: string | null;
  fdmCode: string | null;
  arbitre1: string | null;
  arbitre2: string | null;
  extUpdatedAt: string | null;
  raw: Record<string, unknown>;
};

export type FfhbClassementRow = {
  rang: number;
  equipeId: string | null;
  equipeLibelle: string;
  points: number | null;
  joues: number | null;
  gagnes: number | null;
  nuls: number | null;
  perdus: number | null;
  butsPour: number | null;
  butsContre: number | null;
};

export type FfhbEquipement = {
  /** Id interne, celui que porte `equipementId` sur une rencontre. */
  equipementId: string;
  extEquipementId: string | null;
  libelle: string | null;
  rue: string | null;
  codePostal: string | null;
  ville: string | null;
  latitude: number | null;
  longitude: number | null;
  raw: Record<string, unknown>;
};

/**
 * Le HTML n'a pas la forme attendue : composant introuvable, attribut illisible
 * ou JSON invalide. Signalée à part des erreurs réseau car elle signifie
 * « la FFHB a changé sa page » — l'appelant doit alors s'abstenir d'écrire
 * quoi que ce soit plutôt que d'enregistrer du vide.
 */
export class FfhbContractError extends Error {
  component: string;
  url: string;

  constructor(component: string, url: string, message: string) {
    super(`[${component}] ${message} (${url})`);
    this.name = "FfhbContractError";
    this.component = component;
    this.url = url;
  }
}

// /////////////////////////////////////////////////////////////////////////
// URLS
// /////////////////////////////////////////////////////////////////////////

const BASE_URL = "https://www.ffhandball.fr";

const POULE_URL_RE =
  /\/competitions\/saison-(?:[0-9]{4}-[0-9]{4})-([0-9]+)\/([a-z-]+)\/([a-z0-9-]*-([0-9]+))(?=[/?#]|$)(?:\/poule-([0-9]+))?/i;

/**
 * Découpe une URL de poule ffhandball.fr. Le segment `poule-…` est facultatif :
 * sans lui, la FFHB sert la poule par défaut de la compétition — c'est d'ailleurs
 * la forme qu'on obtient en copiant l'adresse depuis la page de la compétition.
 * Renvoie null si l'URL ne ressemble pas à une page de compétition.
 */
export function parsePouleUrl(url: string): PouleRef | null {
  const match = POULE_URL_RE.exec(String(url).trim());
  if (!match) return null;
  return {
    extSaisonId: match[1],
    competitionType: match[2].toLowerCase(),
    competitionSlug: match[3],
    extCompetitionId: match[4],
    extPouleId: match[5] ?? null,
  };
}

/** URL canonique d'une poule, éventuellement d'une de ses journées. */
export function buildPouleUrl(ref: PouleRef, journee?: number): string {
  let url = `${BASE_URL}/competitions/saison-${seasonSlug(ref.extSaisonId)}-${ref.extSaisonId}/${ref.competitionType}/${ref.competitionSlug}/`;
  if (ref.extPouleId) url += `poule-${ref.extPouleId}/`;
  if (journee != null) url += `journee-${journee}/`;
  return url;
}

/** URL de la page d'une rencontre (la seule à porter la salle). */
export function buildRencontreUrl(ref: PouleRef, extRencontreId: string): string {
  return `${buildPouleUrl(ref)}rencontre-${extRencontreId}/`;
}

/**
 * Le libellé de saison dans l'URL (« 2026-2027 ») est purement décoratif côté
 * FFHB — seul l'id numérique final compte — mais on le reconstruit pour rester
 * sur l'URL canonique et éviter une redirection à chaque requête.
 */
function seasonSlug(extSaisonId: string): string {
  // L'id de saison 22 correspond à 2026-2027 ; l'écart est stable d'une saison
  // à l'autre. Reconstruire plutôt que stocker évite une donnée de plus à tenir.
  const start = 2004 + Number(extSaisonId);
  return `${start}-${start + 1}`;
}

// /////////////////////////////////////////////////////////////////////////
// EXTRACTION DU BLOB JSON
// /////////////////////////////////////////////////////////////////////////

const ENTITIES: Record<string, string> = {
  quot: '"',
  apos: "'",
  amp: "&",
  lt: "<",
  gt: ">",
  nbsp: " ",
  "#39": "'",
  "#34": '"',
};

/**
 * Déséchappe les entités HTML en une seule passe. Enchaîner des `.replace()`
 * serait à la fois plus lent sur ces blobs de plusieurs dizaines de Ko et faux :
 * remplacer `&amp;` en premier ressusciterait les entités déjà échappées.
 */
export function unescapeHtml(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, entity: string) => {
    const key = entity.toLowerCase();
    if (ENTITIES[key] !== undefined) return ENTITIES[key];
    if (key.startsWith("#x")) {
      const code = Number.parseInt(key.slice(2), 16);
      return Number.isNaN(code) ? whole : String.fromCodePoint(code);
    }
    if (key.startsWith("#")) {
      const code = Number.parseInt(key.slice(1), 10);
      return Number.isNaN(code) ? whole : String.fromCodePoint(code);
    }
    return whole;
  });
}

/**
 * Récupère le JSON porté par <smartfire-component name='…' attributes="…">.
 * Lève FfhbContractError si le composant a disparu ou si son contenu n'est
 * plus du JSON : c'est le signal « la page a changé de forme ».
 */
export function extractComponent(html: string, name: string, url: string): Record<string, unknown> {
  const re = new RegExp(`<smartfire-component\\s+name='${name}'[^>]*?\\sattributes="([^"]*)"`, "s");
  const match = re.exec(html);
  if (!match) {
    throw new FfhbContractError(name, url, "composant introuvable dans la page");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(unescapeHtml(match[1]));
  } catch (error) {
    throw new FfhbContractError(name, url, `attribut illisible : ${(error as Error).message}`);
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new FfhbContractError(name, url, "attribut JSON inattendu (objet attendu)");
  }
  return parsed as Record<string, unknown>;
}

// /////////////////////////////////////////////////////////////////////////
// CONVERSIONS
// /////////////////////////////////////////////////////////////////////////

/** La FFHB renvoie tout en chaînes ; "" et null valent « pas de valeur ». */
function str(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function num(value: unknown): number | null {
  const text = str(value);
  if (text === null) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function obj(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

// /////////////////////////////////////////////////////////////////////////
// PARSEURS
// /////////////////////////////////////////////////////////////////////////

/**
 * Poules de la compétition (avec leur calendrier) et équipes de la poule
 * affichée. Une seule requête sur la page de la poule donne les deux.
 */
export function parsePouleSelector(
  html: string,
  url: string,
): { poules: FfhbPoule[]; equipeOptions: FfhbEquipeOption[] } {
  const data = extractComponent(html, "competitions---poule-selector", url);

  const poules: FfhbPoule[] = [];
  for (const entry of arr(data.poules)) {
    const row = obj(entry);
    const extPouleId = row && str(row.ext_pouleId);
    if (!row || !extPouleId) continue;
    poules.push({
      id: str(row.id) ?? extPouleId,
      extPouleId,
      phaseId: str(row.phaseId),
      libelle: str(row.libelle) ?? "",
      journees: parseJournees(row.journees),
    });
  }

  const equipeOptions: FfhbEquipeOption[] = [];
  for (const entry of arr(data.equipe_options)) {
    const row = obj(entry);
    const id = row && str(row.id);
    if (!row || !id) continue;
    equipeOptions.push({
      id,
      extEquipeId: str(row.ext_equipeId),
      structureId: str(row.structureId),
      libelle: str(row.libelle) ?? "",
    });
  }

  if (poules.length === 0) {
    throw new FfhbContractError("competitions---poule-selector", url, "aucune poule lisible");
  }
  return { poules, equipeOptions };
}

/** `poules[].journees` est une chaîne JSON à re-parser, pas un tableau. */
function parseJournees(value: unknown): FfhbJournee[] {
  let source: unknown = value;
  if (typeof value === "string") {
    try {
      source = JSON.parse(value);
    } catch {
      return [];
    }
  }
  const journees: FfhbJournee[] = [];
  for (const entry of arr(source)) {
    const row = obj(entry);
    const numero = row && num(row.journee_numero);
    const dateDebut = row && str(row.date_debut);
    const dateFin = row && str(row.date_fin);
    if (!row || numero === null || !dateDebut || !dateFin) continue;
    journees.push({ numero, dateDebut, dateFin });
  }
  return journees;
}

/**
 * Rencontres d'une journée. `skipped` compte les lignes écartées faute de
 * champ obligatoire : au-delà d'un certain taux, l'appelant doit considérer
 * que le format a changé plutôt que d'enregistrer des données trouées.
 */
export function parseRencontres(
  html: string,
  url: string,
): { rencontres: FfhbRencontre[]; skipped: number } {
  const data = extractComponent(html, "competitions---rencontre-list", url);
  if (!Array.isArray(data.rencontres)) {
    throw new FfhbContractError("competitions---rencontre-list", url, "`rencontres` absent ou non tabulaire");
  }

  const rencontres: FfhbRencontre[] = [];
  let skipped = 0;
  for (const entry of data.rencontres) {
    const rencontre = normalizeRencontre(entry);
    if (rencontre) rencontres.push(rencontre);
    else skipped += 1;
  }
  return { rencontres, skipped };
}

/** Renvoie null si un champ sans lequel la rencontre est inexploitable manque. */
export function normalizeRencontre(entry: unknown): FfhbRencontre | null {
  const row = obj(entry);
  if (!row) return null;

  const extRencontreId = str(row.ext_rencontreId);
  const journeeNumero = num(row.journeeNumero);
  const equipe1Libelle = str(row.equipe1Libelle);
  const equipe2Libelle = str(row.equipe2Libelle);
  if (!extRencontreId || journeeNumero === null || !equipe1Libelle || !equipe2Libelle) {
    return null;
  }

  return {
    extRencontreId,
    extPouleId: str(row.extPouleId),
    journeeNumero,
    dateHeure: str(row.date),
    equipe1Id: str(row.equipe1Id),
    equipe2Id: str(row.equipe2Id),
    equipe1Libelle,
    equipe2Libelle,
    score1: num(row.equipe1Score),
    score2: num(row.equipe2Score),
    score1Mt: num(row.equipe1ScoreMT),
    score2Mt: num(row.equipe2ScoreMT),
    equipementId: str(row.equipementId),
    fdmCode: str(row.fdmCode),
    arbitre1: str(row.arbitre1),
    arbitre2: str(row.arbitre2),
    extUpdatedAt: str(row.dateDernierUpdateEnfants),
    raw: row,
  };
}

/** Classement de la poule. Tableau vide = suspect, jamais « classement remis à zéro ». */
export function parseClassement(html: string, url: string): FfhbClassementRow[] {
  const data = extractComponent(html, "competitions---mini-classement-or-ads", url);
  const rows: FfhbClassementRow[] = [];
  for (const entry of arr(data.classements)) {
    const row = obj(entry);
    const rang = row && num(row.place);
    const equipeLibelle = row && str(row.equipe_libelle);
    if (!row || rang === null || !equipeLibelle) continue;
    rows.push({
      rang,
      equipeId: str(row.equipeId),
      equipeLibelle,
      points: num(row.point),
      joues: num(row.joue),
      gagnes: num(row.gagne),
      nuls: num(row.nul),
      perdus: num(row.perdu),
      butsPour: num(row.butPlus),
      butsContre: num(row.butMoins),
    });
  }
  return rows;
}

/** Salle d'une rencontre, lue sur la page de la rencontre. */
export function parseSalle(html: string, url: string): FfhbEquipement | null {
  const data = extractComponent(html, "competitions---rencontre-salle", url);
  const row = obj(data.equipement);
  const equipementId = row && str(row.id);
  if (!row || !equipementId) return null;
  return {
    equipementId,
    extEquipementId: str(row.ext_equipementId),
    libelle: str(row.libelle),
    rue: str(row.rue),
    codePostal: str(row.codePostal),
    ville: str(row.ville),
    latitude: num(row.latitude),
    longitude: num(row.longitude),
    raw: row,
  };
}

// /////////////////////////////////////////////////////////////////////////
// AIDES MÉTIER
// /////////////////////////////////////////////////////////////////////////

/**
 * Notre équipe dans une poule, repérée par l'id de structure du club.
 * Les libellés FFHB (« Pays de broons ») n'ont aucun rapport avec les noms
 * d'équipe du CRM (« U15 M ») : le rapprochement par le nom est à proscrire,
 * un faux positif remplirait une journée avec les matchs d'une autre équipe.
 * Plusieurs résultats = deux équipes du club dans la même poule, c'est alors
 * à l'utilisateur de trancher.
 */
export function findEquipesForStructure(
  options: FfhbEquipeOption[],
  structureId: string,
): FfhbEquipeOption[] {
  return options.filter((option) => option.structureId === String(structureId));
}

/**
 * Retrouve notre équipe dans la liste d'une poule, alors que la FFHB peut
 * regénérer ses ids INTERNES en cours de saison (constaté le 24/09/2026 :
 * 1764976 → 1815469, sur toutes les équipes de la poule). Seul `ext_equipeId`
 * est stable ; mais les rencontres ne portent que l'id interne, d'où ce
 * rapprochement à chaque synchro.
 *
 * Par ordre de confiance : l'id externe connu, puis l'ancien id interne
 * (équipes reliées avant qu'on stocke l'id externe), puis le club — seulement
 * s'il n'a qu'une équipe dans la poule, sinon on ne devine pas.
 */
export function matchOurEquipe(
  options: FfhbEquipeOption[],
  team: { extEquipeId: string | null; equipeId: string | null },
  structureId: string | null,
): FfhbEquipeOption | null {
  if (team.extEquipeId) {
    const byExt = options.find((o) => o.extEquipeId === team.extEquipeId);
    if (byExt) return byExt;
  }
  if (team.equipeId) {
    const byId = options.find((o) => o.id === team.equipeId);
    if (byId) return byId;
  }
  if (structureId) {
    const ours = findEquipesForStructure(options, structureId);
    if (ours.length === 1) return ours[0];
  }
  return null;
}

/**
 * Numéro de la journée couvrant une date (AAAA-MM-JJ). Évite de balayer les
 * 22 journées d'une poule pour pré-remplir un samedi : une seule requête suffit.
 */
export function journeeForDate(journees: FfhbJournee[], date: string): number | null {
  const day = date.slice(0, 10);
  for (const journee of journees) {
    if (day >= journee.dateDebut && day <= journee.dateFin) return journee.numero;
  }
  return null;
}

/**
 * Journée « courante » : celle qui couvre la date, sinon la prochaine à venir
 * (un mercredi tombe entre deux week-ends), sinon la dernière jouée. Choisie
 * sur les dates et non sur les numéros : une journée reportée garde son
 * numéro (la J1 d'une poule peut se jouer après la J5).
 */
export function currentJournee(journees: FfhbJournee[], date: string): number | null {
  const day = date.slice(0, 10);
  const covering = journeeForDate(journees, day);
  if (covering !== null) return covering;
  const sorted = [...journees].sort((a, b) => a.dateDebut.localeCompare(b.dateDebut));
  const next = sorted.find((j) => j.dateDebut > day);
  if (next) return next.numero;
  return sorted.length ? sorted[sorted.length - 1].numero : null;
}

/** Numéros des journées dont les dates recoupent [from, to] (AAAA-MM-JJ, bornes incluses). */
export function journeesInRange(journees: FfhbJournee[], from: string, to: string): number[] {
  return journees
    .filter((j) => j.dateFin >= from.slice(0, 10) && j.dateDebut <= to.slice(0, 10))
    .map((j) => j.numero);
}

/**
 * Numéros des journées dont les dates recoupent [date - pastDays, date + futureDays].
 * C'est la fenêtre de la synchro quotidienne : les scores du week-end passé et
 * les programmations à venir, quel que soit l'ordre des numéros. 21 jours
 * devant : la page publique montre les deux prochains week-ends, qu'une
 * fenêtre de 14 jours ne couvre pas toujours.
 */
export function journeesInWindow(
  journees: FfhbJournee[],
  date: string,
  pastDays = 7,
  futureDays = 21,
): number[] {
  const shift = (days: number) => {
    const d = new Date(`${date.slice(0, 10)}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };
  return journeesInRange(journees, shift(-pastDays), shift(futureDays));
}

/** URL du PDF de feuille de match : les 4 premières lettres du code font les dossiers. */
export function fdmPdfUrl(fdmCode: string): string {
  const code = fdmCode.trim().toUpperCase();
  return `https://fdm.fdme.ffhandball.fr/${code.slice(0, 4).split("").join("/")}/${code}.pdf`;
}
