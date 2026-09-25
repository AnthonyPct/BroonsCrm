// Synchronisation des calendriers et classements FFHB.
// La fédération n'expose aucune API : on lit les pages de ffhandball.fr et on
// en extrait le JSON embarqué (voir extract.ts, seul fichier qui connaît ce
// HTML). Déclenchée par un cron 1-2×/jour et par un bouton du CRM.
//
// Deux règles gouvernent tout le fichier :
//   - on n'écrit JAMAIS dans matchday_matches : ce cache propose, l'humain dispose ;
//   - on ne remplace JAMAIS de la donnée par du vide : une page illisible ou
//     vide laisse la dernière version connue en place et sort en erreur.
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import {
  FfhbContractError,
  buildPouleUrl,
  buildRencontreUrl,
  currentJournee,
  journeesInRange,
  journeesInWindow,
  matchOurEquipe,
  parseClassement,
  parsePouleSelector,
  parseRencontres,
  parseSalle,
  parsePouleUrl,
  type FfhbEquipeOption,
  type FfhbRencontre,
  type PouleRef,
} from "./extract.ts";

const FFHB_SECRET =
  Deno.env.get("FFHB_SECRET") ?? "hbc_ffhb_3f1c8d47a25e4b90bd6c1f8a72e30d55";

// Cloudflare/CloudFront devant ffhandball.fr : un User-Agent identifiable
// évite d'être pris pour un robot anonyme, et nous rend joignables.
const HEADERS = {
  "User-Agent": "HBC-Pays-de-Broons-CRM/1.0 (+https://hbcpaysdebroons.fr)",
  Accept: "text/html",
};

const CHUNK = 500;
/** Politesse : ~1 requête/seconde. C'est de l'attente, pas du CPU. */
const DELAY_MS = 1000;
/** Plafond par invocation : les Edge Functions ont un mur à ~150 s. */
const MAX_REQUESTS = 60;
/**
 * Requêtes simultanées en mode `weekend`, où quelqu'un attend devant l'écran.
 * Assez peu pour ne pas ressembler à une aspiration du site depuis un
 * datacenter ; la synchro de nuit, elle, reste strictement séquentielle.
 */
const WEEKEND_CONCURRENCY = 4;
/** Les salles se résolvent au fil de l'eau — jamais de pic sur un run. */
const MAX_NEW_EQUIPEMENTS = 5;
/** Au-delà, ce ne sont plus des trous mais un changement de format. */
const SKIP_RATIO_ALERT = 0.3;

function admin(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// /////////////////////////////////////////////////////////////////////////
// RÉSEAU
// /////////////////////////////////////////////////////////////////////////

type Budget = { used: number };

async function fetchPage(url: string, budget: Budget, polite = true): Promise<string> {
  if (budget.used >= MAX_REQUESTS) {
    throw new Error(`budget de ${MAX_REQUESTS} requêtes épuisé`);
  }
  budget.used += 1;
  // `polite` : une requête par seconde. Désactivé en mode `weekend`, où la
  // retenue vient du nombre de requêtes simultanées.
  if (polite && budget.used > 1) await sleep(DELAY_MS);

  let res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    // Un unique retry : les 5xx derrière CloudFront sont souvent passagers.
    await sleep(2000);
    res = await fetch(url, { headers: HEADERS });
  }
  if (!res.ok) throw new Error(`ffhandball.fr ${res.status} sur ${url}`);
  return await res.text();
}

// /////////////////////////////////////////////////////////////////////////
// MODE RESOLVE — relier une équipe à sa poule
// /////////////////////////////////////////////////////////////////////////

/**
 * Lit une page de poule et renvoie de quoi remplir l'écran de configuration :
 * la poule, ses journées, et les équipes engagées. Une seule requête.
 *
 * Ce mode existe pour que Next.js n'ait jamais à parser du HTML FFHB : sans
 * lui, il faudrait dupliquer le découpage d'URL et l'extraction côté
 * application, et la règle « un seul fichier connaît ce HTML » tomberait.
 */
async function resolve(supabase: SupabaseClient, rawUrl: string) {
  const ref = parsePouleUrl(rawUrl);
  if (!ref) {
    return {
      ok: false as const,
      code: "url_invalide",
      error:
        "Cette adresse ne ressemble pas à une page de compétition ffhandball.fr.",
    };
  }

  const budget: Budget = { used: 0 };
  const html = await fetchPage(buildPouleUrl(ref), budget);
  const { poules, equipeOptions } = parsePouleSelector(html, rawUrl);

  // Sans segment `poule-…`, la FFHB sert la poule par défaut : c'est la
  // première de la liste, et c'est bien celle dont on vient de lire les équipes.
  const poule = ref.extPouleId
    ? poules.find((p) => p.extPouleId === ref.extPouleId) ?? poules[0]
    : poules[0];

  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single();

  const canonical: PouleRef = { ...ref, extPouleId: poule.extPouleId };
  const { data: saved, error } = await supabase
    .from("ffhb_poules")
    .upsert(
      {
        season_id: season!.id,
        ext_poule_id: poule.extPouleId,
        ext_saison_id: ref.extSaisonId,
        ext_competition_id: ref.extCompetitionId,
        competition_type: ref.competitionType,
        competition_slug: ref.competitionSlug,
        label: poule.libelle,
        source_url: buildPouleUrl(canonical),
        journees: poule.journees,
        journee_count: poule.journees.length,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "season_id,ext_poule_id" },
    )
    .select("id, label, journee_count")
    .single();
  if (error) throw new Error(`upsert poule : ${error.message}`);

  return {
    ok: true as const,
    poule: {
      id: saved.id,
      extPouleId: poule.extPouleId,
      label: saved.label,
      journeeCount: saved.journee_count,
      autresPoules: poules
        .filter((p) => p.extPouleId !== poule.extPouleId)
        .map((p) => ({ extPouleId: p.extPouleId, libelle: p.libelle })),
    },
    // Sans calendrier publié, la poule reste reliable : les rencontres
    // apparaîtront à leur saisie dans Gesthand.
    equipes: equipeOptions,
  };
}

// /////////////////////////////////////////////////////////////////////////
// MODE SYNC — rafraîchir le cache
// /////////////////////////////////////////////////////////////////////////

type PouleRow = {
  id: string;
  ext_poule_id: string;
  ext_saison_id: string;
  ext_competition_id: string;
  competition_type: string;
  competition_slug: string;
  source_url: string;
  journees: { numero: number; dateDebut: string; dateFin: string }[];
  current_journee: number | null;
};

function refOf(row: PouleRow): PouleRef {
  return {
    extSaisonId: row.ext_saison_id,
    competitionType: row.competition_type,
    competitionSlug: row.competition_slug,
    extCompetitionId: row.ext_competition_id,
    extPouleId: row.ext_poule_id,
  };
}

async function syncPoule(
  supabase: SupabaseClient,
  row: PouleRow,
  scope: "window" | "full",
  budget: Budget,
) {
  const ref = refOf(row);

  // 1. La page de la poule donne trois choses d'un coup : le calendrier, la
  //    journée courante et le classement. C'est le principal levier de budget.
  const html = await fetchPage(buildPouleUrl(ref), budget);
  const { poules, equipeOptions } = parsePouleSelector(html, row.source_url);
  const poule = poules.find((p) => p.extPouleId === row.ext_poule_id) ?? poules[0];

  // Avant tout : si la FFHB a renuméroté ses équipes, nos rencontres ne se
  // retrouveraient plus. On réaligne l'équipe et le cache d'abord.
  await reconcileTeams(supabase, row.id, equipeOptions);

  const today = new Date().toISOString().slice(0, 10);
  const current = currentJournee(poule.journees, today) ?? row.current_journee ?? 1;

  await supabase
    .from("ffhb_poules")
    .update({
      label: poule.libelle,
      journees: poule.journees,
      journee_count: poule.journees.length,
      current_journee: current,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  // 2. Rencontres. La page déjà chargée porte la journée courante ; on n'y
  //    ajoute que le strict nécessaire.
  const collected = new Map<string, FfhbRencontre>();
  let skipped = 0;
  let seen = 0;

  const first = parseRencontres(html, row.source_url);
  for (const r of first.rencontres) collected.set(r.extRencontreId, r);
  skipped += first.skipped;
  seen += first.rencontres.length + first.skipped;

  // Fenêtre choisie sur les dates, pas sur les numéros : une journée reportée
  // garde son numéro, et un mercredi ne tombe dans aucune journée.
  const journees =
    scope === "full"
      ? poule.journees.map((j) => j.numero)
      : journeesInWindow(poule.journees, today);

  for (const numero of journees) {
    if (first.rencontres.some((r) => r.journeeNumero === numero)) continue;
    if (budget.used >= MAX_REQUESTS) break;

    const page = await fetchPage(buildPouleUrl(ref, numero), budget);
    const parsed = parseRencontres(page, row.source_url);
    for (const r of parsed.rencontres) collected.set(r.extRencontreId, r);
    skipped += parsed.skipped;
    seen += parsed.rencontres.length + parsed.skipped;
  }

  if (seen > 0 && skipped / seen > SKIP_RATIO_ALERT) {
    throw new FfhbContractError(
      "competitions---rencontre-list",
      row.source_url,
      `${skipped}/${seen} rencontres illisibles — le format a probablement changé`,
    );
  }

  // Une poule qui se vide alors qu'elle avait des rencontres est suspecte :
  // on préfère garder le cache d'hier plutôt qu'afficher une page blanche.
  const { count: existing } = await supabase
    .from("ffhb_rencontres")
    .select("id", { count: "exact", head: true })
    .eq("poule_id", row.id);
  if (collected.size === 0 && (existing ?? 0) > 0) {
    return { status: "suspicious" as const, upserted: 0, equipements: 0, current };
  }

  const upserted = await upsertRencontres(supabase, row.id, [...collected.values()]);

  // 3. Classement — remplacé en bloc, et seulement s'il est non vide (le
  //    garde-fou est aussi dans la fonction SQL).
  const classement = parseClassement(html, row.source_url);
  if (classement.length > 0) {
    const { error } = await supabase.rpc("ffhb_replace_classement", {
      p_poule_id: row.id,
      p_rows: classement,
    });
    if (error) throw new Error(`classement : ${error.message}`);
  }

  // 4. Salles inconnues, au compte-gouttes.
  const equipements = await resolveEquipements(supabase, ref, [...collected.values()], budget);

  return {
    status: (skipped > 0 ? "partial" : "ok") as "ok" | "partial",
    upserted,
    equipements,
    current,
  };
}

/** Écrit des rencontres dans le cache ; renvoie le nombre de lignes. */
async function upsertRencontres(
  supabase: SupabaseClient,
  pouleId: string,
  rencontres: FfhbRencontre[],
): Promise<number> {
  const rows = rencontres.map((r) => ({
    poule_id: pouleId,
    ext_rencontre_id: r.extRencontreId,
    journee_numero: r.journeeNumero,
    date_heure: r.dateHeure,
    equipe1_id: r.equipe1Id,
    equipe2_id: r.equipe2Id,
    equipe1_libelle: r.equipe1Libelle,
    equipe2_libelle: r.equipe2Libelle,
    score1: r.score1,
    score2: r.score2,
    score1_mt: r.score1Mt,
    score2_mt: r.score2Mt,
    equipement_id: r.equipementId,
    fdm_code: r.fdmCode,
    arbitre1: r.arbitre1,
    arbitre2: r.arbitre2,
    ext_updated_at: r.extUpdatedAt,
    raw: r.raw,
    synced_at: new Date().toISOString(),
  }));

  for (let i = 0; i < rows.length; i += CHUNK) {
    // Pas d'ignoreDuplicates ici, contrairement au webhook HelloAsso : la
    // FFHB fait autorité sur son propre contenu, on veut que les scores
    // écrasent les nulls de la veille.
    const { error } = await supabase
      .from("ffhb_rencontres")
      .upsert(rows.slice(i, i + CHUNK), { onConflict: "ext_rencontre_id" });
    if (error) throw new Error(`upsert rencontres : ${error.message}`);
  }
  return rows.length;
}

/** `fn` sur chaque élément, au plus `limit` à la fois ; l'ordre est conservé. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// /////////////////////////////////////////////////////////////////////////
// MODE WEEKEND — rafraîchir un week-end précis, à la demande
// /////////////////////////////////////////////////////////////////////////

/**
 * Relit sur ffhandball.fr les journées qui couvrent [start, end], pour toutes
 * les poules reliées à une équipe. Déclenché à l'ouverture d'une journée du
 * planning : la synchro de nuit ne voit que 3 semaines devant, et on prépare
 * parfois une journée plus tôt que ça.
 *
 * Une requête par poule en général (la page d'une journée porte aussi le
 * calendrier et la liste des équipes), en parallèle. Les salles et le
 * classement restent à la synchro de nuit : ils ne servent pas à préparer
 * une journée à domicile.
 */
async function syncWeekend(supabase: SupabaseClient, start: string, end: string) {
  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single();
  const { data: linked } = await supabase
    .from("teams")
    .select("ffhb_poule_id")
    .eq("season_id", season!.id)
    .not("ffhb_poule_id", "is", null);
  const pouleIds = [...new Set((linked ?? []).map((t) => t.ffhb_poule_id as string))];
  if (pouleIds.length === 0) return { poules: 0, rencontres: 0, requetes: 0, erreurs: [] };

  const { data: poules } = await supabase
    .from("ffhb_poules")
    .select(
      "id, ext_poule_id, ext_saison_id, ext_competition_id, competition_type, competition_slug, source_url, journees, current_journee",
    )
    .in("id", pouleIds);

  const budget: Budget = { used: 0 };
  const erreurs: string[] = [];

  // Une tâche par (poule, journée) qui touche le week-end, d'après le
  // calendrier connu. Presque toujours une seule journée par poule.
  const tasks = ((poules ?? []) as PouleRow[]).flatMap((row) =>
    journeesInRange(row.journees ?? [], start, end).map((numero) => ({ row, numero })),
  );

  const pages = await mapLimit(tasks, WEEKEND_CONCURRENCY, async ({ row, numero }) => {
    try {
      const html = await fetchPage(buildPouleUrl(refOf(row), numero), budget, false);
      return { row, numero, html };
    } catch (error) {
      erreurs.push(`${row.ext_poule_id} J${numero} : ${error instanceof Error ? error.message : error}`);
      return null;
    }
  });

  let rencontres = 0;
  const seenPoules = new Set<string>();
  for (const page of pages) {
    if (!page) continue;
    const { row, html } = page;
    // Calendrier et équipes : une fois par poule, sur la première page lue.
    // Facultatif : si la page d'une journée ne portait pas le sélecteur, on
    // enregistre quand même les rencontres, la synchro de nuit réalignera.
    if (!seenPoules.has(row.id)) {
      seenPoules.add(row.id);
      try {
        const { poules: found, equipeOptions } = parsePouleSelector(html, row.source_url);
        const poule = found.find((p) => p.extPouleId === row.ext_poule_id) ?? found[0];
        await reconcileTeams(supabase, row.id, equipeOptions);
        if (poule.journees.length > 0) {
          await supabase
            .from("ffhb_poules")
            .update({
              journees: poule.journees,
              journee_count: poule.journees.length,
              updated_at: new Date().toISOString(),
            })
            .eq("id", row.id);
        }
      } catch (error) {
        console.error("ffhb-sync weekend : sélecteur illisible", row.ext_poule_id, error);
      }
    }
    try {
      const parsed = parseRencontres(html, row.source_url);
      rencontres += await upsertRencontres(supabase, row.id, parsed.rencontres);
    } catch (error) {
      erreurs.push(`${row.ext_poule_id} : ${error instanceof Error ? error.message : error}`);
    }
  }

  return { poules: pouleIds.length, rencontres, requetes: budget.used, erreurs };
}

/**
 * Réaligne l'id interne FFHB de nos équipes reliées à cette poule. La FFHB
 * peut regénérer ces ids en cours de saison (vu le 24/09/2026) ; seul
 * `ext_equipeId` reste stable. Quand l'id change, on met à jour l'équipe et on
 * réécrit les rencontres déjà en cache, pour que les journées non encore
 * resynchronisées restent rattachées.
 */
async function reconcileTeams(
  supabase: SupabaseClient,
  pouleId: string,
  options: FfhbEquipeOption[],
) {
  const { data: teams } = await supabase
    .from("teams")
    .select("id, ffhb_equipe_id, ffhb_ext_equipe_id")
    .eq("ffhb_poule_id", pouleId);
  if (!teams?.length) return;

  const { data: setting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "ffhb_structure_id")
    .maybeSingle();
  // Le repli par club n'est sûr que pour une seule équipe du club reliée à
  // cette poule : avec deux, il pourrait les confondre.
  const structureId = teams.length === 1 ? (setting?.value || null) : null;

  for (const team of teams) {
    const match = matchOurEquipe(
      options,
      { extEquipeId: team.ffhb_ext_equipe_id, equipeId: team.ffhb_equipe_id },
      structureId,
    );
    if (!match) {
      console.error("ffhb-sync : équipe introuvable dans la poule", team.id, pouleId);
      continue;
    }
    const old = team.ffhb_equipe_id;
    if (match.id === old && match.extEquipeId === team.ffhb_ext_equipe_id) continue;

    await supabase
      .from("teams")
      .update({
        ffhb_equipe_id: match.id,
        ffhb_ext_equipe_id: match.extEquipeId,
        ffhb_equipe_libelle: match.libelle,
      })
      .eq("id", team.id);

    if (old && old !== match.id) {
      console.log("ffhb-sync : équipe renumérotée", team.id, old, "→", match.id);
      await supabase
        .from("ffhb_rencontres")
        .update({ equipe1_id: match.id })
        .eq("poule_id", pouleId)
        .eq("equipe1_id", old);
      await supabase
        .from("ffhb_rencontres")
        .update({ equipe2_id: match.id })
        .eq("poule_id", pouleId)
        .eq("equipe2_id", old);
    }
  }
}

async function resolveEquipements(
  supabase: SupabaseClient,
  ref: PouleRef,
  rencontres: FfhbRencontre[],
  budget: Budget,
): Promise<number> {
  const ids = [...new Set(rencontres.map((r) => r.equipementId).filter(Boolean))] as string[];
  if (ids.length === 0) return 0;

  const { data: known } = await supabase
    .from("ffhb_equipements")
    .select("equipement_id")
    .in("equipement_id", ids);
  const seen = new Set((known ?? []).map((e) => e.equipement_id));
  const missing = ids.filter((id) => !seen.has(id)).slice(0, MAX_NEW_EQUIPEMENTS);

  let resolved = 0;
  for (const equipementId of missing) {
    if (budget.used >= MAX_REQUESTS) break;
    const rencontre = rencontres.find((r) => r.equipementId === equipementId);
    if (!rencontre) continue;
    try {
      const page = await fetchPage(buildRencontreUrl(ref, rencontre.extRencontreId), budget);
      const salle = parseSalle(page, "rencontre");
      if (!salle) continue;
      await supabase.from("ffhb_equipements").upsert(
        {
          equipement_id: salle.equipementId,
          ext_equipement_id: salle.extEquipementId,
          libelle: salle.libelle,
          rue: salle.rue,
          code_postal: salle.codePostal,
          ville: salle.ville,
          latitude: salle.latitude,
          longitude: salle.longitude,
          raw: salle.raw,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "equipement_id" },
      );
      resolved += 1;
    } catch (error) {
      // Une salle manquante n'invalide pas une synchro de calendrier.
      console.error("ffhb-sync équipement", equipementId, error);
    }
  }
  return resolved;
}

// /////////////////////////////////////////////////////////////////////////
// POINT D'ENTRÉE
// /////////////////////////////////////////////////////////////////////////

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const url = new URL(req.url);
  const secret = req.headers.get("x-ffhb-secret") ?? url.searchParams.get("secret");
  if (secret !== FFHB_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = admin();
  const body = await req.json().catch(() => ({}));
  const mode = body.mode === "resolve" ? "resolve" : "sync";

  if (mode === "resolve") {
    try {
      return json(await resolve(supabase, String(body.url ?? "")));
    } catch (error) {
      console.error("ffhb-sync resolve", error);
      return json(errorPayload(error), 200);
    }
  }

  if (body.mode === "weekend") {
    const start = String(body.start ?? "");
    const end = String(body.end ?? start);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
      return json({ ok: false, error: "start et end attendus au format AAAA-MM-JJ" }, 400);
    }
    const { data: run } = await supabase
      .from("ffhb_sync_runs")
      .insert({ mode: "weekend", scope: `${start}..${end}`, status: "running" })
      .select("id")
      .single();
    const result = await syncWeekend(supabase, start, end);
    const status = result.erreurs.length === 0 ? "ok" : result.rencontres > 0 ? "partial" : "error";
    if (run) {
      await supabase
        .from("ffhb_sync_runs")
        .update({
          finished_at: new Date().toISOString(),
          status,
          http_requests: result.requetes,
          rencontres_upserted: result.rencontres,
          error: result.erreurs.length ? result.erreurs.join(" | ") : null,
        })
        .eq("id", run.id);
    }
    return json({ ok: status !== "error", status, ...result });
  }

  const scope: "window" | "full" = body.scope === "full" ? "full" : "window";
  const { data: run } = await supabase
    .from("ffhb_sync_runs")
    .insert({ mode, scope, poule_id: body.poule_id ?? null, status: "running" })
    .select("id")
    .single();

  const budget: Budget = { used: 0 };
  let query = supabase
    .from("ffhb_poules")
    .select(
      "id, ext_poule_id, ext_saison_id, ext_competition_id, competition_type, competition_slug, source_url, journees, current_journee",
    );
  if (body.poule_id) {
    query = query.eq("id", body.poule_id);
  } else {
    const { data: season } = await supabase
      .from("seasons")
      .select("id")
      .eq("is_current", true)
      .single();
    query = query.eq("season_id", season!.id);
    // En `full`, une seule poule par invocation : 22 requêtes par poule
    // approcheraient le plafond d'exécution. C'est le CRM qui boucle.
    if (scope === "full") query = query.order("last_synced_at", { ascending: true, nullsFirst: true }).limit(1);
  }
  const { data: poules, error: poulesError } = await query;
  if (poulesError) {
    return json({ ok: false, error: poulesError.message }, 200);
  }

  let upserted = 0;
  let equipements = 0;
  const statuses: string[] = [];
  const errors: string[] = [];

  for (const row of (poules ?? []) as PouleRow[]) {
    try {
      const result = await syncPoule(supabase, row, scope, budget);
      upserted += result.upserted;
      equipements += result.equipements;
      statuses.push(result.status);
      await supabase
        .from("ffhb_poules")
        .update({
          last_synced_at: new Date().toISOString(),
          last_sync_status: result.status,
          last_sync_error: null,
        })
        .eq("id", row.id);
    } catch (error) {
      // try/catch PAR POULE : une poule en échec n'interrompt pas les autres.
      const message = error instanceof Error ? error.message : String(error);
      const status = error instanceof FfhbContractError ? "contract_error" : "error";
      statuses.push(status);
      errors.push(`${row.ext_poule_id}: ${message}`);
      console.error("ffhb-sync poule", row.ext_poule_id, error);
      await supabase
        .from("ffhb_poules")
        .update({ last_sync_status: status, last_sync_error: message })
        .eq("id", row.id);
    }
  }

  const globalStatus = errors.length === 0
    ? statuses.every((s) => s === "ok") ? "ok" : "partial"
    : statuses.some((s) => s === "ok" || s === "partial") ? "partial" : "error";

  if (run) {
    await supabase
      .from("ffhb_sync_runs")
      .update({
        finished_at: new Date().toISOString(),
        status: globalStatus,
        http_requests: budget.used,
        rencontres_upserted: upserted,
        equipements_resolved: equipements,
        error: errors.length ? errors.join(" | ") : null,
      })
      .eq("id", run.id);
  }

  // Lu par l'écran Intégrations, qui charge déjà app_settings d'un bloc.
  await supabase.from("app_settings").upsert({
    key: "ffhb_last_sync_at",
    value: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  await supabase.from("app_settings").upsert({
    key: "ffhb_last_sync_error",
    value: errors.length ? errors.join(" | ") : "",
    updated_at: new Date().toISOString(),
  });

  return json({
    ok: globalStatus !== "error",
    status: globalStatus,
    poules: poules?.length ?? 0,
    rencontres: upserted,
    equipements,
    requetes: budget.used,
    erreurs: errors,
  });
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorPayload(error: unknown) {
  if (error instanceof FfhbContractError) {
    return {
      ok: false,
      code: "contrat_ffhb",
      error: `La page ffhandball.fr n'a pas la forme attendue : ${error.message}`,
    };
  }
  const message = error instanceof Error ? error.message : String(error);
  return {
    ok: false,
    code: message.includes("ffhandball.fr") ? "ffhb_indisponible" : "erreur",
    error: message,
  };
}
