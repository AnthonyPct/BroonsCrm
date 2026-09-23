// Tests de la logique métier FFHB (fenêtre de week-end, libellés, propositions
// d'import). Pur, sans base ni serveur :
//
//   node --no-warnings ffhb.lib.test.mjs

import {
  buildImportProposals,
  cleanOpponentLabel,
  parisDay,
  selectableProposals,
  relativeFrom,
  teamSlug,
  weekendRange,
} from "./src/lib/ffhb.ts";

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? " — " + detail : ""}`);
}
function eq(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  check(name, ok, ok ? "" : `attendu ${JSON.stringify(expected)}, reçu ${JSON.stringify(actual)}`);
}

// ---------- FENÊTRE DE WEEK-END ----------

eq("samedi → samedi/dimanche", weekendRange("2026-10-03"), { start: "2026-10-03", end: "2026-10-04" });
eq("dimanche → le même week-end", weekendRange("2026-10-04"), { start: "2026-10-03", end: "2026-10-04" });
eq("mercredi → ±3 jours", weekendRange("2026-10-07"), { start: "2026-10-04", end: "2026-10-10" });

// ---------- FUSEAU HORAIRE ----------
// Le piège numéro un : un match du samedi soir lu en UTC tombe le dimanche.

eq("match du soir resté le bon jour", parisDay("2026-10-03T21:00:00+02:00"), "2026-10-03");
eq("horodatage UTC ramené à Paris", parisDay("2026-10-03T22:30:00Z"), "2026-10-04");
eq("heure d'hiver", parisDay("2026-12-12T20:00:00+01:00"), "2026-12-12");

// ---------- LIBELLÉS ----------

eq("tout en capitales normalisé", cleanOpponentLabel("CADETS DE BRETAGNE 2"), "Cadets de Bretagne 2");
eq("casse fantaisiste corrigée", cleanOpponentLabel("Pays de broons"), "Pays de Broons");
eq("sigle court préservé", cleanOpponentLabel("CS BETTON HANDBALL 2"), "CS Betton Handball 2");
eq("sigle de 3 lettres préservé", cleanOpponentLabel("ASC RENNAIS 1"), "ASC Rennais 1");
eq("mot long non pris pour un sigle", cleanOpponentLabel("HANDBALL CLUB"), "Handball Club");
eq("trait d'union géré", cleanOpponentLabel("TINTENIAC-COMBOURG HBC 1"), "Tinteniac-Combourg HBC 1");
eq("espaces multiples resserrés", cleanOpponentLabel("  US   BAIN  HB 1 "), "US Bain HB 1");
eq("libellé vide toléré", cleanOpponentLabel("   "), "");

eq("slug d'équipe", teamSlug("U15 M"), "u15-m");
eq("slug accentué", teamSlug("Séniors Féminines 1"), "seniors-feminines-1");

// ---------- FRAÎCHEUR ----------

const maintenant = new Date("2026-09-23T10:00:00Z");
eq("minutes", relativeFrom("2026-09-23T09:35:00Z", maintenant), "il y a 25 min");
eq("heures", relativeFrom("2026-09-23T08:00:00Z", maintenant), "il y a 2 h");
eq("jours", relativeFrom("2026-09-20T10:00:00Z", maintenant), "il y a 3 j");
eq("à l'instant", relativeFrom("2026-09-23T09:59:50Z", maintenant), "à l'instant");

// ---------- PROPOSITIONS D'IMPORT ----------

const teams = [
  { id: "t-u16", name: "U16 M", ffhbPouleId: "p1", ffhbEquipeId: "1764976" },
  { id: "t-sm", name: "Séniors M", ffhbPouleId: "p2", ffhbEquipeId: "2000001" },
  { id: "t-loisirs", name: "Loisirs", ffhbPouleId: null, ffhbEquipeId: null },
];

function rencontre(over) {
  return {
    extRencontreId: "r1",
    pouleId: "p1",
    journeeNumero: 4,
    dateHeure: "2026-10-03T18:30:00+02:00",
    equipe1Id: "1764976",
    equipe2Id: "1764979",
    equipe1Libelle: "Pays de broons",
    equipe2Libelle: "ASC RENNAIS 1",
    ...over,
  };
}

// À domicile, journée vide
{
  const p = buildImportProposals([rencontre()], teams, [], "2026-10-03");
  eq("un match à domicile est importable", p.map((x) => x.status), ["importable"]);
  eq("équipe du CRM identifiée", p[0].team.name, "U16 M");
  eq("adversaire nettoyé", p[0].opponent, "ASC Rennais 1");
  eq("horaire officiel conservé", p[0].officialAt, "2026-10-03T18:30:00+02:00");
  eq("même jour que la journée", p[0].dateDiffers, false);
}

// À l'extérieur
{
  const p = buildImportProposals(
    [rencontre({ equipe1Id: "1764979", equipe2Id: "1764976", equipe1Libelle: "ASC RENNAIS 1", equipe2Libelle: "Pays de broons" })],
    teams,
    [],
    "2026-10-03",
  );
  eq("un match à l'extérieur n'est pas importable", p.map((x) => x.status), ["exterieur"]);
  eq("l'adversaire reste le club d'en face", p[0].opponent, "ASC Rennais 1");
  eq("rien à sélectionner", selectableProposals(p).length, 0);
}

// Déjà importé
{
  const p = buildImportProposals(
    [rencontre()],
    teams,
    [{ id: "m1", teamId: "t-u16", ffhbExtRencontreId: "r1" }],
    "2026-10-03",
  );
  eq("rencontre déjà importée marquée présente", p.map((x) => x.status), ["deja_present"]);
  eq("le match existant est désigné", p[0].existingMatchId, "m1");
  eq("rien à re-créer", selectableProposals(p).length, 0);
}

// Saisi à la main sur la même équipe → rattachement, pas doublon
{
  const p = buildImportProposals(
    [rencontre()],
    teams,
    [{ id: "m9", teamId: "t-u16", ffhbExtRencontreId: null }],
    "2026-10-03",
  );
  eq("match manuel proposé au rattachement", p.map((x) => x.status), ["rattachable"]);
  eq("la ligne à rattacher est désignée", p[0].existingMatchId, "m9");
}

// Plateau jeunes : deux rencontres, un seul match manuel
{
  const p = buildImportProposals(
    [rencontre(), rencontre({ extRencontreId: "r2", dateHeure: "2026-10-03T20:00:00+02:00" })],
    teams,
    [{ id: "m9", teamId: "t-u16", ffhbExtRencontreId: null }],
    "2026-10-03",
  );
  eq("une seule rencontre se rattache au match manuel", p.map((x) => x.status), ["importable", "rattachable"]);
  const rattachee = p.find((x) => x.status === "rattachable");
  eq("le match manuel n'est consommé qu'une fois", rattachee.existingMatchId, "m9");
}

// Rencontre entre deux autres clubs de la poule : onze douzièmes des
// rencontres d'une poule ne nous concernent pas.
{
  const p = buildImportProposals(
    [rencontre({ equipe1Id: "9999", equipe2Id: "8888", equipe1Libelle: "HPV 2", equipe2Libelle: "US BAIN HB 1" })],
    teams,
    [],
    "2026-10-03",
  );
  eq("rencontre sans équipe à nous : écartée", p.length, 0);
}

// Report au dimanche
{
  const p = buildImportProposals(
    [rencontre({ dateHeure: "2026-10-04T16:00:00+02:00" })],
    teams,
    [],
    "2026-10-03",
  );
  eq("rencontre du dimanche toujours proposée", p[0].status, "importable");
  check("mais l'écart de date est signalé", p[0].dateDiffers === true);
  check("et la date est bien confirmée", p[0].dateUnconfirmed === false);
}

// Hors fenêtre
{
  const p = buildImportProposals(
    [rencontre({ dateHeure: "2026-10-10T18:30:00+02:00" })],
    teams,
    [],
    "2026-10-03",
  );
  eq("rencontre d'un autre week-end écartée", p.length, 0);
}

// Rencontre pas encore datée par la FFHB (le cas de toutes les journées
// lointaines : les dates sont posées dans Gesthand au fil de la saison).
{
  const p = buildImportProposals([rencontre({ dateHeure: null })], teams, [], "2026-10-03");
  eq("rencontre non datée conservée", p.map((x) => x.status), ["importable"]);
  check("et signalée comme telle", p[0].dateUnconfirmed === true && p[0].officialAt === null);
  check("sans écart de date trompeur", p[0].dateDiffers === false);
}

// Tri et mélange
{
  const p = buildImportProposals(
    [
      rencontre({ extRencontreId: "ext", equipe1Id: "1764979", equipe2Id: "1764976", equipe1Libelle: "ASC RENNAIS 1", equipe2Libelle: "Pays de broons" }),
      rencontre({ extRencontreId: "dom", dateHeure: "2026-10-03T16:00:00+02:00" }),
      rencontre({ extRencontreId: "inc", equipe1Id: "9999", equipe2Id: "8888" }),
    ],
    teams,
    [],
    "2026-10-03",
  );
  eq("importables en tête, extérieur en dernier", p.map((x) => x.status), [
    "importable",
    "exterieur",
  ]);
  eq("seules les importables sont sélectionnables", selectableProposals(p).map((x) => x.rencontre.extRencontreId), ["dom"]);
}

// ---------- BILAN ----------

const failed = results.filter((r) => !r.ok);
console.log(`\n=== LOGIQUE FFHB : ${results.length - failed.length}/${results.length} OK ===`);
if (failed.length) for (const f of failed) console.log(`   ❌ ${f.name} — ${f.detail}`);
process.exit(failed.length ? 1 : 0);
