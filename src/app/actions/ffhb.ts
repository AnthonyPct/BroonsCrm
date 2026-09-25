"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { recalcSchedule } from "@/app/actions/planning";
import { weekendRange } from "@/lib/ffhb";

/**
 * Toutes les lectures de ffhandball.fr passent par l'Edge Function `ffhb-sync` :
 * Next.js ne doit jamais parser le HTML de la fédération, sinon la règle
 * « un seul fichier connaît ce format » tombe et le jour où Smartfire change,
 * c'est deux endroits qu'il faut reprendre.
 */
async function callEdge(body: Record<string, unknown>): Promise<
  { ok: true; data: Record<string, unknown> } | { ok: false; message: string }
> {
  const secret = process.env.FFHB_SECRET;
  if (!secret) {
    return {
      ok: false,
      message:
        "FFHB_SECRET non configuré côté application (variable d'environnement).",
    };
  }
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ffhb-sync`,
      {
        method: "POST",
        headers: {
          "x-ffhb-secret": secret,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    const text = await res.text();
    if (!res.ok) return { ok: false, message: `Erreur ${res.status} : ${text}` };
    return { ok: true, data: JSON.parse(text) };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Erreur réseau",
    };
  }
}

// /////////////////////////////////////////////////////////////////////////
// CONFIGURATION D'UNE ÉQUIPE
// /////////////////////////////////////////////////////////////////////////

export type PouleEquipe = {
  id: string;
  /** Id stable côté FFHB : l'id interne (`id`) peut être regénéré en cours de saison. */
  extEquipeId: string | null;
  libelle: string;
  structureId: string | null;
};

export type ResolveResult =
  | {
      ok: true;
      pouleId: string;
      label: string;
      journeeCount: number;
      equipes: PouleEquipe[];
      /** Notre équipe, devinée par l'id de structure du club. */
      suggestedEquipeId: string | null;
    }
  | { ok: false; code: string; message: string };

/**
 * Lit une page de poule ffhandball.fr et renvoie ses équipes, en pré-cochant
 * la nôtre quand l'id de structure du club est connu.
 *
 * Ce pré-cochage n'est qu'une commodité : c'est toujours le choix explicite de
 * l'utilisateur qui est enregistré. Les libellés FFHB (« Pays de broons »)
 * n'ont aucun rapport avec les noms d'équipe du CRM (« Séniors M »), et se
 * tromper d'équipe remplirait une journée avec les matchs d'une autre — une
 * erreur qui ne se verrait que le samedi.
 */
export async function resolvePoule(url: string): Promise<ResolveResult> {
  const called = await callEdge({ mode: "resolve", url });
  if (!called.ok) {
    return { ok: false, code: "reseau", message: called.message };
  }
  const data = called.data as {
    ok: boolean;
    code?: string;
    error?: string;
    poule?: { id: string; label: string; journeeCount: number };
    equipes?: PouleEquipe[];
  };
  if (!data.ok || !data.poule) {
    return {
      ok: false,
      code: data.code ?? "erreur",
      message: data.error ?? "Poule introuvable.",
    };
  }

  const supabase = await createClient();
  const { data: setting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "ffhb_structure_id")
    .maybeSingle();
  const structureId = setting?.value || null;

  const equipes = data.equipes ?? [];
  const mine = structureId
    ? equipes.filter((e) => e.structureId === structureId)
    : [];

  return {
    ok: true,
    pouleId: data.poule.id,
    label: data.poule.label,
    journeeCount: data.poule.journeeCount,
    equipes,
    // Deux équipes du club dans la même poule : on ne devine pas, on laisse choisir.
    suggestedEquipeId: mine.length === 1 ? mine[0].id : null,
  };
}

/**
 * Rattache une équipe du CRM à son équipe dans une poule FFHB.
 *
 * Mémorise au passage l'id de structure du club s'il n'est pas encore connu :
 * le premier rattachement se fait donc à la main, et tous les suivants
 * arrivent avec la bonne équipe déjà pré-cochée.
 */
export async function bindTeamPool(
  teamId: string,
  pouleId: string,
  equipeId: string,
  extEquipeId: string | null,
  equipeLibelle: string,
  structureId: string | null,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .update({
      ffhb_poule_id: pouleId,
      ffhb_equipe_id: equipeId,
      ffhb_ext_equipe_id: extEquipeId,
      ffhb_equipe_libelle: equipeLibelle,
    })
    .eq("id", teamId);
  if (error) throw new Error(error.message);

  if (structureId) {
    const { data: existing } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "ffhb_structure_id")
      .maybeSingle();
    if (!existing?.value) {
      await supabase.from("app_settings").upsert({
        key: "ffhb_structure_id",
        value: structureId,
        updated_at: new Date().toISOString(),
      });
    }
  }

  revalidateFfhb();
}

export async function unbindTeamPool(teamId: string) {
  const supabase = await createClient();
  // La contrainte `teams_ffhb_config_check` impose les trois ensemble ou aucun.
  const { error } = await supabase
    .from("teams")
    .update({
      ffhb_poule_id: null,
      ffhb_equipe_id: null,
      ffhb_ext_equipe_id: null,
      ffhb_equipe_libelle: null,
    })
    .eq("id", teamId);
  if (error) throw new Error(error.message);
  revalidateFfhb();
}

// /////////////////////////////////////////////////////////////////////////
// SYNCHRONISATION
// /////////////////////////////////////////////////////////////////////////

/**
 * Déclenche la synchro du cache. `full` ne traite qu'une poule par appel
 * (22 journées approcheraient le plafond d'exécution d'une Edge Function),
 * donc on boucle ici, côté application, sur le nombre de poules configurées.
 */
export async function triggerFfhbSync(
  scope: "window" | "full" = "window",
): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("ffhb_poules")
    .select("id", { count: "exact", head: true });
  const passes = scope === "full" ? Math.max(1, count ?? 1) : 1;

  let rencontres = 0;
  const erreurs: string[] = [];
  for (let i = 0; i < passes; i++) {
    const called = await callEdge({ mode: "sync", scope });
    if (!called.ok) return { ok: false, message: called.message };
    const data = called.data as {
      ok: boolean;
      rencontres?: number;
      erreurs?: string[];
    };
    rencontres += data.rencontres ?? 0;
    if (data.erreurs?.length) erreurs.push(...data.erreurs);
  }

  revalidateFfhb();
  if (erreurs.length) {
    return {
      ok: false,
      message: `Synchronisation partielle (${rencontres} rencontres) — ${erreurs.join(" | ")}`,
    };
  }
  return { ok: true, message: `${rencontres} rencontre(s) synchronisée(s)` };
}

/**
 * Relit sur ffhandball.fr le week-end d'une journée (le jour et son
 * lendemain, voir `weekendRange`), pour toutes les poules reliées. Appelé à
 * l'ouverture d'une journée du planning : ses propositions d'import sont
 * alors fraîches, quelle que soit la date, sans attendre la synchro de nuit.
 */
export async function refreshFfhbWeekend(
  matchdayId: string,
): Promise<{ ok: boolean; message: string; rencontres: number }> {
  const supabase = await createClient();
  const { data: matchday } = await supabase
    .from("matchdays")
    .select("date")
    .eq("id", matchdayId)
    .maybeSingle();
  if (!matchday) return { ok: false, message: "Journée introuvable", rencontres: 0 };

  const { start, end } = weekendRange(matchday.date);
  const called = await callEdge({ mode: "weekend", start, end });
  if (!called.ok) return { ok: false, message: called.message, rencontres: 0 };

  const data = called.data as { ok: boolean; rencontres?: number; erreurs?: string[] };
  // Le site public lit le même cache : il profite de la mise à jour.
  revalidatePath("/matchs");
  revalidatePath(`/crm/planning/${matchdayId}`);
  return {
    ok: data.ok,
    rencontres: data.rencontres ?? 0,
    message: data.erreurs?.length
      ? `Mise à jour FFHB incomplète : ${data.erreurs.join(" | ")}`
      : `${data.rencontres ?? 0} rencontre(s) à jour`,
  };
}

// /////////////////////////////////////////////////////////////////////////
// IMPORT DANS UNE JOURNÉE
// /////////////////////////////////////////////////////////////////////////

export type ImportPick = {
  extRencontreId: string;
  teamId: string;
  opponent: string;
  officialAt: string | null;
  /** Match saisi à la main à rattacher, plutôt que d'en créer un doublon. */
  existingMatchId?: string | null;
};

/**
 * Crée les matchs retenus, rattache ceux qui existaient déjà, puis recalcule
 * les horaires UNE SEULE FOIS.
 *
 * Ne pas boucler sur `addMatch()` : elle appelle `recalcSchedule()` à chaque
 * insertion, ce qui ferait n recalculs complets et autant de revalidations
 * pour un import de six matchs.
 */
export async function importFfhbMatches(
  matchdayId: string,
  picks: ImportPick[],
): Promise<{ created: number; attached: number; overflow: boolean }> {
  if (picks.length === 0) return { created: 0, attached: 0, overflow: false };
  const supabase = await createClient();

  const { count } = await supabase
    .from("matchday_matches")
    .select("id", { count: "exact", head: true })
    .eq("matchday_id", matchdayId);

  const toAttach = picks.filter((p) => p.existingMatchId);
  const toCreate = picks.filter((p) => !p.existingMatchId);

  if (toCreate.length > 0) {
    const { error } = await supabase.from("matchday_matches").insert(
      toCreate.map((pick, i) => ({
        matchday_id: matchdayId,
        team_id: pick.teamId,
        opponent: pick.opponent,
        ffhb_ext_rencontre_id: pick.extRencontreId,
        ffhb_official_at: pick.officialAt,
        sort_order: (count ?? 0) + i + 1,
      })),
    );
    if (error) {
      // L'index unique partiel sur ffhb_ext_rencontre_id : la rencontre est
      // déjà dans une autre journée, probablement importée dans le mauvais
      // samedi puis corrigée.
      if (error.code === "23505") {
        throw new Error(
          "Une de ces rencontres est déjà rattachée à une autre journée.",
        );
      }
      throw new Error(error.message);
    }
  }

  for (const pick of toAttach) {
    const { error } = await supabase
      .from("matchday_matches")
      .update({
        ffhb_ext_rencontre_id: pick.extRencontreId,
        ffhb_official_at: pick.officialAt,
        opponent: pick.opponent,
      })
      .eq("id", pick.existingMatchId!);
    if (error) throw new Error(error.message);
  }

  const overflow = await recalcSchedule(matchdayId);
  return { created: toCreate.length, attached: toAttach.length, overflow };
}

function revalidateFfhb() {
  revalidatePath("/crm/parametres/equipes");
  revalidatePath("/crm/parametres/integrations");
  revalidatePath("/crm/planning");
  revalidatePath("/matchs");
}
