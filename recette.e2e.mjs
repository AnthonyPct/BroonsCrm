import { chromium } from "playwright";
import fs from "node:fs";

const BASE = "http://localhost:3100";
const SHOTS =
  process.env.SHOTS_DIR ??
  "/private/tmp/claude-501/-Users-anthonypicquet-Documents-Hand-crm/29771a82-2461-4485-93c2-d07eea4f426e/scratchpad/shots";
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
    "Hero maquette présent",
    await page.getByText("on le vit ensemble.").isVisible()
  );
  check("Stat strip 140+ licenciés", await page.getByText("140+").isVisible());
  await page.screenshot({ path: SHOTS + "/01-accueil.png", fullPage: true });

  await page.goto(BASE + "/licence");
  check(
    "Tutoriel : étape 1 Gesthand",
    await page.getByText("Faire sa demande sur Gesthand").isVisible()
  );
  check(
    "Bandeau réduction −5 %",
    await page
      .getByText("Réduction anticipée : −5 % sur la part Ligue")
      .isVisible()
  );
  await page.screenshot({ path: SHOTS + "/02-licence.png", fullPage: true });

  // ---------- AUTH ----------
  await page.goto(BASE + "/crm/dashboard");
  await page.waitForURL("**/crm/login");
  check("Redirection login si non connecté", page.url().includes("/crm/login"));
  await page.screenshot({ path: SHOTS + "/10-login.png" });

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
  await page.waitForSelector("text=Progression des paiements");
  const dashboardText = await page.textContent("body");
  check("KPI dû ligue affiché", dashboardText.includes("Dû à la ligue / fédé"));
  check(
    "KPI encaissé = 432 €",
    dashboardText.includes("432,00"),
    "attendu 432,00 €"
  );
  check(
    "File d'arbitrage cliquable",
    await page.getByText("Traiter la file").isVisible()
  );
  check(
    "Répartition par catégorie",
    dashboardText.includes("Répartition par catégorie")
  );
  await page.waitForTimeout(600);
  await page.screenshot({ path: SHOTS + "/03-dashboard.png", fullPage: true });

  // ---------- LICENCIÉS : TABLEAU + FILTRES + KANBAN + CARTES ----------
  await page.goto(BASE + "/crm/licencies");
  await page.waitForSelector("text=DUPONT");
  check(
    "Tableau : 5 licenciés",
    await page.getByText("5 licencié(s) affiché(s)").isVisible()
  );

  await page.fill('input[placeholder*="Rechercher"]', "dupont");
  check(
    "Recherche 'dupont' → 1",
    await page.getByText("1 licencié(s) affiché(s)").isVisible()
  );
  await page.fill('input[placeholder*="Rechercher"]', "");
  await page.screenshot({ path: SHOTS + "/04-liste.png", fullPage: true });

  await page.click('button:has-text("Kanban")');
  await page.waitForSelector("text=Aucune licence");
  const kanbanText = await page.textContent("body");
  check(
    "Vue Kanban : 4 colonnes",
    kanbanText.includes("À saisir") && kanbanText.includes("En attente")
  );
  await page.screenshot({ path: SHOTS + "/04b-kanban.png", fullPage: true });

  await page.click('button:has-text("Cartes")');
  await page.waitForSelector("text=Reste");
  check("Vue Cartes visible", true);
  await page.screenshot({ path: SHOTS + "/04c-cartes.png", fullPage: true });

  // ---------- FICHE LÉA (réduction + tolérance) ----------
  await page.click('button:has-text("Tableau")');
  await page.click("text=Léa DUPONT");
  await page.waitForSelector("text=Détail du tarif");
  const ficheText = await page.textContent("body");
  check("Fiche Léa : total dû 173,45 €", ficheText.includes("173,45"));
  check("Fiche Léa : Réglée (tolérance 10 €)", ficheText.includes("Réglée"));
  check(
    "Fiche Léa : badge −5 % ligue",
    ficheText.includes("−5 % ligue · avant 10/08")
  );
  await page.screenshot({ path: SHOTS + "/05-fiche.png", fullPage: true });

  // ---------- NOUVEAU LICENCIÉ (catégorie auto) ----------
  await page.goto(BASE + "/crm/licencies/nouveau");
  await page.fill("#last_name", "Testeur");
  await page.fill("#first_name", "Zoé");
  await page.fill("#birth_date", "2014-05-10");
  const previewText = await page.textContent("body");
  check("Catégorie auto 12-16 ans proposée", previewText.includes("12-16 ans"));
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
  await page.waitForSelector("text=Détail du tarif");

  // ---------- AJOUT PAIEMENT ESPÈCES ----------
  await page.click('button:has-text("Saisir un paiement")');
  await page.waitForSelector("text=Moyen de paiement");
  await page.click('button:has-text("Espèces")');
  await page.fill('input[name="amount"]', "50");
  await page.click('button[type="submit"]:has-text("Enregistrer")');
  await page.waitForSelector("text=Espèces", { timeout: 20000 });
  await page.waitForTimeout(800);
  const afterPay = await page.textContent("body");
  check("Paiement espèces 50 € enregistré", afterPay.includes("50,00"));

  // ---------- QUALIFICATION ----------
  await page.click('button:has-text("Marquer comme qualifiée")');
  await page.waitForSelector("text=Qualification enregistrée");
  check("Bascule qualification OK", true);
  await page.reload();
  await page.waitForSelector("text=Licence qualifiée");
  check("Statut Qualifiée persisté", true);

  // ---------- RÉCONCILIATION / ARBITRAGE ----------
  await page.goto(BASE + "/crm/reconciliation");
  await page.waitForSelector("text=File d'arbitrage");
  check(
    "Commande Sophie Grandet en arbitrage",
    await page.getByText("Sophie Grandet").isVisible()
  );
  await page.screenshot({
    path: SHOTS + "/07-reconciliation.png",
    fullPage: true,
  });

  await page.click("text=Chercher le licencié concerné");
  await page.click('[role="option"]:has-text("Zoé TESTEUR")');
  await page.click('button:has-text("Rapprocher")');
  await page.waitForSelector("text=Commande rapprochée");
  check("Arbitrage manuel : commande assignée", true);
  await page.waitForTimeout(1200);
  await page.reload();
  await page.waitForSelector("text=File vide, tout est rapproché");
  check("File vide après arbitrage", true);

  // ---------- GRILLE TARIFAIRE ----------
  await page.goto(BASE + "/crm/parametres/tarifs");
  await page.waitForSelector("text=Part Fédé");
  const gridText = await page.textContent("body");
  check("Grille : colonne Dû ligue/fédé", gridText.includes("Dû ligue/fédé"));
  check(
    "Grille : réduction anticipée",
    gridText.includes("Réduction anticipée")
  );
  const gridInputs = await page.locator("input").count();
  check("Grille éditable chargée", gridInputs >= 20, `${gridInputs} champs`);
  await page.screenshot({ path: SHOTS + "/08-tarifs.png", fullPage: true });

  // ---------- INTÉGRATIONS ----------
  await page.goto(BASE + "/crm/parametres/integrations");
  await page.waitForSelector("text=Webhook temps réel");
  check(
    "Intégrations : URL webhook affichée",
    (await page.textContent("body")).includes("helloasso-webhook")
  );
  await page.screenshot({
    path: SHOTS + "/09-integrations.png",
    fullPage: true,
  });

  // ---------- IMPORT DÉBUT DE SAISON ----------
  const csv =
    "Nom;Prénom;Date de naissance;Sexe\nImporté;Marc;12/04/2009;M\nImporté;Julie;03/09/2016;F\n";
  const csvPath = SHOTS + "/../import-test.csv";
  fs.writeFileSync(csvPath, csv, "utf8");
  await page.goto(BASE + "/crm/saison");
  await page.setInputFiles('input[type="file"]', csvPath);
  await page.waitForSelector("text=Lignes détectées");
  const importText = await page.textContent("body");
  check(
    "Import : parsing CSV OK",
    importText.includes("2 licencié(s) détecté(s)")
  );
  check("Import : badge Nouveau", importText.includes("Nouveau"));
  await page.screenshot({ path: SHOTS + "/11-import.png", fullPage: true });
  await page.click('button:has-text("Importer 2 licencié(s)")');
  await page.waitForSelector("text=licenciés importés", { timeout: 20000 });
  check("Import : 2 licenciés créés", true);

  await page.goto(BASE + "/crm/licencies");
  await page.waitForSelector("text=IMPORTÉ");
  check(
    "Liste après import : 8 licenciés",
    await page.getByText("8 licencié(s) affiché(s)").isVisible()
  );

  // ---------- DÉCONNEXION ----------
  await page.click('[title="Se déconnecter"]');
  await page.waitForURL("**/crm/login");
  check("Déconnexion OK", true);
} catch (e) {
  check("EXCEPTION", false, String(e).slice(0, 300));
  await page.screenshot({ path: SHOTS + "/99-error.png", fullPage: true });
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(
  `\n=== RECETTE : ${results.length - failed.length}/${results.length} OK ===`
);
process.exit(failed.length ? 1 : 0);
