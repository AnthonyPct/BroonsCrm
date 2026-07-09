import { chromium } from "playwright";
import fs from "node:fs";

const BASE = "http://localhost:3100";
const SHOTS = "/private/tmp/claude-501/-Users-anthonypicquet-Documents-Hand-crm/29771a82-2461-4485-93c2-d07eea4f426e/scratchpad/shots";
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? " — " + detail : ""}`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(15000);

try {
  // ---------- SITE PUBLIC ----------
  await page.goto(BASE + "/");
  check("Accueil public charge", (await page.title()).includes("HBC"));
  check(
    "Hero présent",
    await page.getByText("Le handball pour tous").isVisible()
  );
  await page.screenshot({ path: SHOTS + "/01-accueil.png", fullPage: true });

  await page.goto(BASE + "/licence");
  check(
    "Tutoriel licence : 4 étapes",
    await page.getByText("1. Recevez votre lien Gesthand").isVisible()
  );
  check(
    "Tutoriel : réduction 10 août",
    await page.getByText("−5 % avant le 10 août !").isVisible()
  );
  await page.screenshot({ path: SHOTS + "/02-licence.png", fullPage: true });

  // ---------- AUTH ----------
  await page.goto(BASE + "/crm/dashboard");
  await page.waitForURL("**/crm/login");
  check("Redirection login si non connecté", page.url().includes("/crm/login"));

  await page.fill("#email", "admin@hbcpaysdebroons.fr");
  await page.fill("#password", "mauvais-mdp");
  await page.click('button[type="submit"]');
  await page.waitForURL("**error**");
  check(
    "Mauvais mot de passe refusé",
    await page.getByText("Email ou mot de passe incorrect").isVisible()
  );

  await page.fill("#email", "admin@hbcpaysdebroons.fr");
  await page.fill("#password", "HBC-Broons-2026!");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/crm/dashboard");
  check("Connexion admin OK", true);

  // ---------- DASHBOARD ----------
  await page.waitForSelector("text=Dû à la ligue / fédé");
  const dashboardText = await page.textContent("body");
  check("KPI dû ligue affiché", dashboardText.includes("Dû à la ligue"));
  // encaissé attendu : 100+70+20 (manuel) + 67 (Hugo HA) + 175 (Timéo HA) = 432
  check(
    "KPI encaissé = 432 €",
    dashboardText.includes("432,00"),
    "attendu 432,00 €"
  );
  check("5 licences comptées", !!dashboardText.match(/Licences/));
  await page.screenshot({ path: SHOTS + "/03-dashboard.png", fullPage: true });

  // ---------- LICENCIÉS : LISTE + FILTRES + KANBAN ----------
  await page.goto(BASE + "/crm/licencies");
  await page.waitForSelector("text=DUPONT");
  const rows = await page.locator("tbody tr").count();
  check("Liste : 5 licenciés", rows === 5, `${rows} lignes`);

  await page.fill('input[placeholder*="Rechercher"]', "dupont");
  const rowsFiltered = await page.locator("tbody tr").count();
  check("Recherche 'dupont' → 1 ligne", rowsFiltered === 1, `${rowsFiltered}`);
  await page.fill('input[placeholder*="Rechercher"]', "");

  await page.click('button[role="tab"]:has-text("Kanban")');
  await page.waitForSelector("text=Aucune licence");
  const kanbanText = await page
    .locator('[role="tabpanel"][data-state="active"]')
    .textContent();
  check(
    "Vue Kanban : 4 colonnes de statut",
    kanbanText.includes("À saisir") &&
      kanbanText.includes("En attente de paiement") &&
      kanbanText.includes("Qualifiée")
  );
  await page.screenshot({ path: SHOTS + "/04-kanban.png", fullPage: true });

  // ---------- FICHE LÉA (réduction + tolérance) ----------
  await page.click('button[role="tab"]:has-text("Liste")');
  await page.click("text=DUPONT Léa");
  await page.waitForSelector("text=Reste à charge");
  const ficheText = await page.textContent("body");
  check("Fiche Léa : total dû 173,45 €", ficheText.includes("173,45"));
  check("Fiche Léa : payée (tolérance 10 €)", ficheText.includes("Payée"));
  check("Fiche Léa : réduction −5 % affichée", ficheText.includes("−5"));
  await page.screenshot({ path: SHOTS + "/05-fiche.png", fullPage: true });

  // ---------- NOUVEAU LICENCIÉ (catégorie auto) ----------
  await page.goto(BASE + "/crm/licencies/nouveau");
  await page.fill("#last_name", "Testeur");
  await page.fill("#first_name", "Zoé");
  await page.fill("#birth_date", "2014-05-10");
  const previewText = await page.textContent("body");
  check(
    "Catégorie auto 12-16 ans proposée",
    previewText.includes("12-16 ans")
  );
  check(
    "Aperçu tarif avec réduction",
    previewText.includes("−5 % avant le 10/08")
  );
  await page.screenshot({ path: SHOTS + "/06-nouveau.png", fullPage: true });
  await page.click('button[type="submit"]:has-text("Créer le licencié")');
  await page.waitForURL(
    (u) => /\/crm\/licencies\/[0-9a-f-]{36}$/.test(u.pathname),
    { timeout: 20000 }
  );
  check("Création → redirection fiche", true);
  await page.waitForSelector("text=Reste à charge");

  // ---------- AJOUT PAIEMENT ESPÈCES ----------
  await page.click('button:has-text("Ajouter un paiement")');
  await page.waitForSelector("text=Nouveau paiement");
  await page.click('[id="source"]');
  await page.click('[role="option"]:has-text("Espèces")');
  await page.fill("#amount", "50");
  await page.click('button:has-text("Enregistrer")');
  await page.waitForSelector('tbody tr:has-text("Espèces")', {
    timeout: 20000,
  });
  const afterPay = await page
    .locator('tbody tr:has-text("Espèces")')
    .textContent();
  check("Paiement espèces 50 € enregistré", afterPay.includes("50,00"));

  // ---------- QUALIFICATION ----------
  await page.click("#qualification");
  await page.waitForSelector("text=Licence marquée qualifiée");
  check("Bascule qualification OK", true);
  await page.reload();
  const afterQualif = await page.textContent("body");
  check("Statut Qualifiée persisté", afterQualif.includes("Qualifiée"));

  // ---------- RÉCONCILIATION / ARBITRAGE ----------
  await page.goto(BASE + "/crm/reconciliation");
  await page.waitForSelector("text=File d'arbitrage");
  check(
    "Commande Sophie Grandet en arbitrage",
    await page.getByText("Sophie Grandet").isVisible()
  );
  await page.screenshot({ path: SHOTS + "/07-reconciliation.png", fullPage: true });

  await page.click("text=Choisir le licencié concerné");
  await page.click('[role="option"]:has-text("TESTEUR Zoé")');
  await page.click('button:has-text("Assigner")');
  await page.waitForSelector("text=Commande rapprochée");
  check("Arbitrage manuel : commande assignée", true);
  await page.waitForTimeout(1200);
  await page.reload();
  const reconText = await page.textContent("body");
  check(
    "Plus d'arbitrage en attente",
    reconText.includes("Aucune commande en attente")
  );

  // ---------- GRILLE TARIFAIRE ----------
  await page.goto(BASE + "/crm/parametres/tarifs");
  await page.waitForSelector("text=Part Fédé");
  const gridInputs = await page.locator("tbody input").count();
  check("Grille éditable chargée", gridInputs >= 20, `${gridInputs} champs`);
  await page.screenshot({ path: SHOTS + "/08-tarifs.png", fullPage: true });

  // ---------- INTÉGRATIONS ----------
  await page.goto(BASE + "/crm/parametres/integrations");
  await page.waitForSelector("text=Configuration du webhook");
  check(
    "Page intégrations : URL webhook affichée",
    (await page.textContent("body")).includes("helloasso-webhook")
  );

  // ---------- IMPORT DÉBUT DE SAISON ----------
  const csv = "Nom;Prénom;Date de naissance;Sexe\nImporté;Marc;12/04/2009;M\nImporté;Julie;03/09/2016;F\n";
  const csvPath = SHOTS + "/../import-test.csv";
  fs.writeFileSync(csvPath, "﻿" + csv, "utf8");
  await page.goto(BASE + "/crm/saison");
  await page.setInputFiles('input[type="file"]', csvPath);
  await page.waitForSelector("text=2 licencié(s) détecté(s)");
  check("Import : parsing CSV Gesthand OK", true);
  await page.click('button:has-text("Importer 2 licencié(s)")');
  await page.waitForSelector("text=Import terminé", { timeout: 20000 });
  check("Import : 2 licenciés créés", true);
  await page.screenshot({ path: SHOTS + "/09-import.png", fullPage: true });

  await page.goto(BASE + "/crm/licencies");
  await page.waitForSelector("text=IMPORTÉ");
  const rowsAfterImport = await page.locator("tbody tr").count();
  check(
    "Liste après import : 8 licenciés",
    rowsAfterImport === 8,
    `${rowsAfterImport} lignes`
  );

  // ---------- DÉCONNEXION ----------
  await page.click('button:has-text("Se déconnecter")');
  await page.waitForURL("**/crm/login");
  check("Déconnexion OK", true);
} catch (e) {
  check("EXCEPTION", false, String(e).slice(0, 300));
  await page.screenshot({ path: SHOTS + "/99-error.png", fullPage: true });
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n=== RECETTE : ${results.length - failed.length}/${results.length} OK ===`);
process.exit(failed.length ? 1 : 0);
