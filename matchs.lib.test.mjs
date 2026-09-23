// Tests de la page publique « Matchs » : fenêtre « à venir », résultats,
// regroupement par week-end. Pur, sans base ni serveur :
//
//   node --no-warnings matchs.lib.test.mjs

import {
  groupByWeekend,
  mapsUrl,
  outcome,
  parisToday,
  prettyName,
  splitMatchs,
  upcomingEnd,
  weekendLabel,
  weekendStart,
} from "./src/lib/matchs.ts";
import { fdmPdfUrl } from "./src/lib/ffhb.ts";

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? " — " + detail : ""}`);
}
function eq(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  check(name, ok, ok ? "" : `attendu ${JSON.stringify(expected)}, reçu ${JSON.stringify(actual)}`);
}

function match(over) {
  return {
    key: over.key ?? `${over.day}-${over.time}`,
    day: "2026-09-26",
    time: "18h30",
    date_tbc: false,
    team_id: "t1",
    team: "Séniors M",
    is_youth: false,
    home: true,
    opponent: "X",
    played: false,
    score_for: null,
    score_against: null,
    venue: null,
    fdm_code: null,
    planning: null,
    ...over,
  };
}

// ---------- FENÊTRE « À VENIR » ----------

eq("un mercredi → jusqu'au dimanche du 2e week-end", upcomingEnd("2026-09-23"), "2026-10-04");
eq("un samedi → le week-end en cours compte", upcomingEnd("2026-09-26"), "2026-10-04");
eq("un dimanche → le week-end en cours compte", upcomingEnd("2026-09-27"), "2026-10-04");
eq("un lundi → les deux week-ends suivants", upcomingEnd("2026-09-28"), "2026-10-11");

// ---------- FUSEAU ----------

eq("22h30 UTC un samedi = dimanche à Paris", parisToday(new Date("2026-09-26T22:30:00Z")), "2026-09-27");
eq("23h30 UTC en hiver = lendemain à Paris", parisToday(new Date("2026-12-12T23:30:00Z")), "2026-12-13");

// ---------- DÉCOUPAGE ----------

const today = "2026-09-23";
const joue = match({ day: "2026-09-19", played: true, score_for: 26, score_against: 26 });
const passeSansScore = match({ day: "2026-09-20", key: "p" });
const samedi = match({ day: "2026-09-26", key: "s" });
const dimanche = match({ day: "2026-09-27", time: "16h00", key: "d" });
const troisieme = match({ day: "2026-10-10", key: "loin" });
const nonDate = match({ day: "2026-10-03", time: null, date_tbc: true, key: "tbc" });
const { upcoming, results: res } = splitMatchs(
  [troisieme, samedi, joue, dimanche, passeSansScore, nonDate],
  today,
);
eq("à venir : 2 week-ends, non daté inclus, 3e week-end exclu", upcoming.map((m) => m.key), ["s", "d", "tbc"]);
eq("résultats : joués et passés sans score", res.map((m) => m.key).sort(), [joue.key, "p"].sort());
check(
  "match du jour déjà joué → résultats",
  splitMatchs([match({ day: today, played: true, score_for: 1, score_against: 0, key: "j" })], today).results.length === 1,
);

// ---------- WEEK-ENDS ----------

eq("le dimanche rattaché au samedi", weekendStart("2026-09-27"), "2026-09-26");
eq("un mercredi reste seul", weekendStart("2026-09-30"), "2026-09-30");
const groupes = groupByWeekend([dimanche, samedi, joue], "desc");
eq("groupes antichronologiques", groupes.map((g) => g.start), ["2026-09-26", "2026-09-19"]);
eq("matchs chronologiques dans un groupe", groupes[0].matches.map((m) => m.key), ["s", "d"]);
eq("libellé sur deux jours", weekendLabel(groupes[0]), "Week-end du 26 septembre");
eq("libellé sur un jour", weekendLabel(groupes[1]), "Samedi 19 septembre");

// ---------- AFFICHAGE ----------

eq("victoire", outcome(match({ played: true, score_for: 28, score_against: 24 })), "V");
eq("nul 0-0 ≠ pas joué", outcome(match({ played: true, score_for: 0, score_against: 0 })), "N");
eq("défaite", outcome(match({ played: true, score_for: 21, score_against: 28 })), "D");
eq("pas joué → pas d'issue", outcome(match({})), null);
eq("nom en capitales normalisé", prettyName("CHLOE M."), "Chloe M.");
eq("nom composé", prettyName("JEAN-LUC D."), "Jean-Luc D.");
eq("Maps par coordonnées", mapsUrl({ libelle: "X", rue: null, code_postal: null, ville: null, lat: 48.1, lng: -1.6 }), "https://www.google.com/maps/search/?api=1&query=48.1,-1.6");
eq("Maps par adresse", mapsUrl({ libelle: "COSEC", rue: null, code_postal: "35135", ville: "CHANTEPIE", lat: null, lng: null }), "https://www.google.com/maps/search/?api=1&query=COSEC%2035135%20CHANTEPIE");
eq("feuille de match", fdmPdfUrl("wagqvwl"), "https://fdm.fdme.ffhandball.fr/W/A/G/Q/WAGQVWL.pdf");

const failed = results.filter((r) => !r.ok);
console.log(`\n=== PAGE MATCHS : ${results.length - failed.length}/${results.length} OK ===`);
if (failed.length) process.exit(1);
