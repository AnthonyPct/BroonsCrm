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
  journeeForDate,
  parseClassement,
  parsePouleSelector,
  parseRencontres,
  parseSalle,
  parsePouleUrl,
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
const MAX_REQUESTS = 40;
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

async function fetchPage(url: string, budget: Budget): Promise<string> {
  if (budget.used >= MAX_REQUESTS) {
    throw new Error(`budget de ${MAX_REQUESTS} requêtes épuisé`);
  }
  budget.used += 1;
  if (budget.used > 1) await sleep(DELAY_MS);

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
  const { poules } = parsePouleSelector(html, row.source_url);
  const poule = poules.find((p) => p.extPouleId === row.ext_poule_id) ?? poules[0];

  const today = new Date().toISOString().slice(0, 10);
  const current = journeeForDate(poule.journees, today) ?? row.current_journee ?? 1;

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

  const journees =
    scope === "full"
      ? poule.journees.map((j) => j.numero)
      : [current - 1, current, current + 1];

  for (const numero of journees) {
    if (numero < 1 || numero > poule.journees.length) continue;
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

  const rows = [...collected.values()].map((r) => ({
    poule_id: row.id,
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
    upserted: rows.length,
    equipements,
    current,
  };
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
