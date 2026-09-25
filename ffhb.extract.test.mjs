// Tests du module d'extraction FFHB, sur des fixtures capturées le 23/09/2026.
// Aucun appel réseau : ces tests doivent rester exécutables hors ligne, et
// surtout ils figent le comportement DÉFENSIF (rupture de contrat côté FFHB),
// qui est précisément ce qu'on ne peut pas tester en production.
//
//   node --no-warnings ffhb.extract.test.mjs

import fs from "node:fs";
import {
  FfhbContractError,
  buildPouleUrl,
  buildRencontreUrl,
  extractComponent,
  fdmPdfUrl,
  findEquipesForStructure,
  currentJournee,
  journeeForDate,
  journeesInWindow,
  matchOurEquipe,
  normalizeRencontre,
  parseClassement,
  parsePouleSelector,
  parsePouleUrl,
  parseRencontres,
  parseSalle,
  unescapeHtml,
} from "./supabase/functions/ffhb-sync/extract.ts";

const DIR = "./supabase/functions/ffhb-sync/__fixtures__";
const poulePage = fs.readFileSync(`${DIR}/poule-190087.html`, "utf8");
const journeePage = fs.readFileSync(`${DIR}/poule-190087-journee-3.html`, "utf8");
const rencontrePage = fs.readFileSync(`${DIR}/rencontre-2626735.html`, "utf8");

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? " — " + detail : ""}`);
}
function eq(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  check(name, ok, ok ? "" : `attendu ${JSON.stringify(expected)}, reçu ${JSON.stringify(actual)}`);
}
function throws(name, fn, type) {
  try {
    fn();
    check(name, false, "aucune erreur levée");
  } catch (error) {
    check(name, error instanceof type, `${error.constructor.name}: ${error.message}`);
  }
}

// ---------- URLS ----------

const ref = parsePouleUrl(
  "https://www.ffhandball.fr/competitions/saison-2026-2027-22/regional/16-ans-honneur-masculine-bretagne-30528/poule-190087/",
);
eq("URL complète découpée", ref, {
  extSaisonId: "22",
  competitionType: "regional",
  competitionSlug: "16-ans-honneur-masculine-bretagne-30528",
  extCompetitionId: "30528",
  extPouleId: "190087",
});

const refSansPoule = parsePouleUrl(
  "https://www.ffhandball.fr/competitions/saison-2026-2027-22/regional/16-ans-honneur-masculine-bretagne-30528/",
);
check("URL sans segment poule acceptée", refSansPoule?.extPouleId === null, "poule par défaut côté FFHB");

eq(
  "URL avec journée découpée (le suffixe est ignoré)",
  parsePouleUrl(
    "https://www.ffhandball.fr/competitions/saison-2026-2027-22/regional/16-ans-honneur-masculine-bretagne-30528/poule-190087/journee-4/",
  )?.extPouleId,
  "190087",
);

// Le slug peut contenir des « -chiffre » avant l'id (« 16-ans-1ere-… ») :
// seul le dernier segment numérique, juste avant le « / », est l'id.
eq(
  "slug contenant des chiffres (16-ans-1ere-…)",
  parsePouleUrl(
    "https://www.ffhandball.fr/competitions/saison-2026-2027-22/regional/16-ans-1ere-division-territoriale-feminine-p-12-33078/poule-195394/journee-2/",
  ),
  {
    extSaisonId: "22",
    competitionType: "regional",
    competitionSlug: "16-ans-1ere-division-territoriale-feminine-p-12-33078",
    extCompetitionId: "33078",
    extPouleId: "195394",
  },
);

check("URL hors compétitions rejetée", parsePouleUrl("https://www.ffhandball.fr/clubs/") === null);
check("texte quelconque rejeté", parsePouleUrl("bonjour") === null);

eq(
  "URL de poule reconstruite",
  buildPouleUrl(ref),
  "https://www.ffhandball.fr/competitions/saison-2026-2027-22/regional/16-ans-honneur-masculine-bretagne-30528/poule-190087/",
);
eq("URL de journée reconstruite", buildPouleUrl(ref, 3).endsWith("/poule-190087/journee-3/"), true);
eq("URL de rencontre reconstruite", buildRencontreUrl(ref, "2626735").endsWith("/rencontre-2626735/"), true);

// ---------- DÉSÉCHAPPEMENT ----------

eq("entités déséchappées en une passe", unescapeHtml("&quot;a&amp;quot;b&quot;"), '"a&quot;b"');
eq("entité numérique déséchappée", unescapeHtml("caf&#233;"), "café");

// ---------- POULE SELECTOR ----------

const { poules, equipeOptions } = parsePouleSelector(poulePage, "fixture");
eq("2 poules dans la compétition", poules.length, 2);
eq("poule EST identifiée", poules[0].extPouleId, "190087");
eq("22 journées avec leurs dates", poules[0].journees.length, 22);
eq("1re journée datée", poules[0].journees[0], {
  numero: 1,
  dateDebut: "2026-09-12",
  dateFin: "2026-09-13",
});
eq("12 équipes dans la poule", equipeOptions.length, 12);

const nous = findEquipesForStructure(equipeOptions, "503");
eq("le club trouvé par son id de structure", nous.length, 1);
eq("libellé FFHB du club", nous[0].libelle, "Pays de broons");
eq("une structure inconnue ne renvoie rien", findEquipesForStructure(equipeOptions, "999999").length, 0);

// Renumérotation FFHB du 24/09/2026 : l'id interne change, l'externe reste.
const apres = [
  { id: "1815469", extEquipeId: "2118882", structureId: "503", libelle: "Pays de broons" },
  { id: "1815474", extEquipeId: "2118890", structureId: "610", libelle: "Tinteniac Combourg HBC 1" },
];
eq("retrouvée par l'id externe", matchOurEquipe(apres, { extEquipeId: "2118882", equipeId: "1764976" }, null)?.id, "1815469");
eq("id externe inconnu : retrouvée par le club", matchOurEquipe(apres, { extEquipeId: null, equipeId: "1764976" }, "503")?.id, "1815469");
eq("pas encore renumérotée : retrouvée par l'id interne", matchOurEquipe(nous, { extEquipeId: null, equipeId: "1764976" }, null)?.extEquipeId, "2118882");
eq(
  "deux équipes du club dans la poule : on ne devine pas",
  matchOurEquipe([...apres, { id: "9", extEquipeId: "9", structureId: "503", libelle: "Pays de broons 2" }], { extEquipeId: null, equipeId: "1764976" }, "503"),
  null,
);

// ---------- CALENDRIER ----------

eq("journée couvrant un samedi", journeeForDate(poules[0].journees, "2026-09-26"), 3);
eq("journée couvrant le dimanche suivant", journeeForDate(poules[0].journees, "2026-09-27"), 3);
eq("date hors calendrier", journeeForDate(poules[0].journees, "2026-10-25"), null);

// Calendrier réel de la D1F poule 4 : la J1 est reportée après la J5.
const d1f = [
  { numero: 1, dateDebut: "2026-10-24", dateFin: "2026-10-25" },
  { numero: 2, dateDebut: "2026-09-19", dateFin: "2026-09-20" },
  { numero: 3, dateDebut: "2026-09-26", dateFin: "2026-09-27" },
  { numero: 4, dateDebut: "2026-10-03", dateFin: "2026-10-04" },
  { numero: 5, dateDebut: "2026-10-10", dateFin: "2026-10-11" },
];
eq("un mercredi → la prochaine journée par date", currentJournee(d1f, "2026-09-23"), 3);
eq("un samedi → la journée qui le couvre", currentJournee(d1f, "2026-10-24"), 1);
eq("après la saison → la dernière jouée", currentJournee(d1f, "2027-06-01"), 1);
eq("fenêtre choisie sur les dates, pas sur les numéros", journeesInWindow(d1f, "2026-09-23"), [2, 3, 4]);

// ---------- RENCONTRES ----------

const { rencontres, skipped } = parseRencontres(poulePage, "fixture");
eq("6 rencontres sur la journée servie par défaut", rencontres.length, 6);
eq("aucune rencontre écartée", skipped, 0);

const contreTinteniac = rencontres.find((r) => r.extRencontreId === "2626744");
eq("rencontre complètement mappée", contreTinteniac, {
  extRencontreId: "2626744",
  extPouleId: "190087",
  journeeNumero: 3,
  dateHeure: "2026-09-27T16:00:00+02:00",
  equipe1Id: "1764981",
  equipe2Id: "1764976",
  equipe1Libelle: "Tinteniac Combourg HBC 1",
  equipe2Libelle: "Pays de broons",
  score1: null,
  score2: null,
  score1Mt: null,
  score2Mt: null,
  equipementId: "5229",
  fdmCode: "WAGQVWS",
  arbitre1: "LE DISSEZ DESIRE",
  arbitre2: null,
  extUpdatedAt: "2023-05-31 19:00:00.000",
  raw: contreTinteniac?.raw,
});
check(
  "scores non joués à null, pas à 0",
  contreTinteniac.score1 === null && contreTinteniac.score2 === null,
  "0-0 et « pas encore joué » ne doivent pas se confondre",
);
check("objet brut conservé pour rejeu", typeof contreTinteniac.raw === "object" && contreTinteniac.raw !== null);

const parJournee = parseRencontres(journeePage, "fixture");
eq("page /journee-3/ lue pareil", parJournee.rencontres.length, 6);
eq("numéro de journée cohérent", parJournee.rencontres[0].journeeNumero, 3);

// ---------- CLASSEMENT ----------

const classement = parseClassement(poulePage, "fixture");
eq("12 lignes de classement", classement.length, 12);
eq("ligne du club", classement.find((c) => c.equipeId === "1764976"), {
  rang: 8,
  equipeId: "1764976",
  equipeLibelle: "Pays de broons",
  points: 4,
  joues: 2,
  gagnes: 0,
  nuls: 2,
  perdus: 0,
  butsPour: 51,
  butsContre: 51,
});

// ---------- SALLE ----------

const salle = parseSalle(rencontrePage, "fixture");
eq("salle lue avec ses coordonnées", salle, {
  equipementId: "1162",
  extEquipementId: "1328",
  libelle: "SALLE MULTIFONCTIONS",
  rue: "RUE DU PRESBYTERE",
  codePostal: "56150",
  ville: "GUENIN",
  latitude: 47.90878,
  longitude: -2.9801,
  raw: salle?.raw,
});
check(
  "la clé de jointure est l'id porté par la rencontre",
  salle.equipementId !== salle.extEquipementId,
  "equipementId (1162) ≠ ext_equipementId (1328) : c'est le premier qui relie rencontre et salle",
);

// ---------- FEUILLE DE MATCH ----------

eq("URL FDME dérivée du code", fdmPdfUrl("WAGQVWJ"), "https://fdm.fdme.ffhandball.fr/W/A/G/Q/WAGQVWJ.pdf");

// ---------- RUPTURES DE CONTRAT ----------
// Le cœur de ces tests : si la FFHB change sa page, on doit lever, pas écrire du vide.

throws(
  "composant renommé → FfhbContractError",
  () => extractComponent(poulePage, "competitions---rencontre-liste", "fixture"),
  FfhbContractError,
);
throws(
  "attribut illisible → FfhbContractError",
  () =>
    extractComponent(
      `<smartfire-component name='competitions---rencontre-list' attributes="{pas du json}">`,
      "competitions---rencontre-list",
      "fixture",
    ),
  FfhbContractError,
);
throws(
  "JSON valide mais pas un objet → FfhbContractError",
  () =>
    extractComponent(
      `<smartfire-component name='competitions---rencontre-list' attributes="[1,2]">`,
      "competitions---rencontre-list",
      "fixture",
    ),
  FfhbContractError,
);
throws(
  "clé `rencontres` disparue → FfhbContractError",
  () =>
    parseRencontres(
      `<smartfire-component name='competitions---rencontre-list' attributes="{&quot;matchs&quot;:[]}">`,
      "fixture",
    ),
  FfhbContractError,
);
throws(
  "plus aucune poule lisible → FfhbContractError",
  () =>
    parsePouleSelector(
      `<smartfire-component name='competitions---poule-selector' attributes="{&quot;poules&quot;:[]}">`,
      "fixture",
    ),
  FfhbContractError,
);

const vide = parseRencontres(
  `<smartfire-component name='competitions---rencontre-list' attributes="{&quot;rencontres&quot;:[]}">`,
  "fixture",
);
check(
  "liste vide : lue sans erreur, à l'appelant de la juger suspecte",
  vide.rencontres.length === 0 && vide.skipped === 0,
  "une poule sans calendrier publié est un cas légitime",
);

eq("rencontre sans identifiant écartée", normalizeRencontre({ journeeNumero: "1", equipe1Libelle: "a", equipe2Libelle: "b" }), null);
eq("rencontre sans journée écartée", normalizeRencontre({ ext_rencontreId: "1", equipe1Libelle: "a", equipe2Libelle: "b" }), null);
eq("rencontre sans adversaire écartée", normalizeRencontre({ ext_rencontreId: "1", journeeNumero: "1", equipe1Libelle: "a" }), null);
eq("valeur non objet écartée", normalizeRencontre("bonjour"), null);

const troue = parseRencontres(
  `<smartfire-component name='competitions---rencontre-list' attributes="{&quot;rencontres&quot;:[{&quot;ext_rencontreId&quot;:&quot;1&quot;},{&quot;ext_rencontreId&quot;:&quot;2&quot;,&quot;journeeNumero&quot;:&quot;1&quot;,&quot;equipe1Libelle&quot;:&quot;a&quot;,&quot;equipe2Libelle&quot;:&quot;b&quot;}]}">`,
  "fixture",
);
check(
  "lignes incomplètes comptées, pas ignorées en silence",
  troue.rencontres.length === 1 && troue.skipped === 1,
  "le taux d'écart permet de détecter un changement de format",
);

const nonProgrammee = normalizeRencontre({
  ext_rencontreId: "3",
  journeeNumero: "5",
  equipe1Libelle: "a",
  equipe2Libelle: "b",
  date: "",
});
check("rencontre non programmée acceptée avec dateHeure null", nonProgrammee?.dateHeure === null);

// ---------- BILAN ----------

const failed = results.filter((r) => !r.ok);
console.log(`\n=== EXTRACTION FFHB : ${results.length - failed.length}/${results.length} OK ===`);
if (failed.length) {
  for (const f of failed) console.log(`   ❌ ${f.name} — ${f.detail}`);
}
process.exit(failed.length ? 1 : 0);
