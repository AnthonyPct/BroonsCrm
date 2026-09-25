"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertCircle, Download, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { importFfhbMatches } from "@/app/actions/ffhb";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Projection sérialisable d'une proposition d'import. Les libellés de date sont
 * calculés côté serveur : les formater ici provoquerait un écart d'hydratation
 * entre le rendu serveur et le navigateur.
 */
export type BoardProposal = {
  key: string;
  status: "importable" | "rattachable" | "deja_present" | "exterieur";
  teamId: string | null;
  teamName: string | null;
  opponent: string;
  officialAt: string | null;
  officialLabel: string | null;
  dateDiffers: boolean;
  dateUnconfirmed: boolean;
  existingMatchId: string | null;
};

export type BoardFfhb = {
  /** Au moins une équipe de la saison a une poule renseignée. */
  configured: boolean;
  unlinkedTeams: string[];
  lastSyncLabel: string | null;
  lastSyncError: string | null;
  proposals: BoardProposal[];
};

export function FfhbImportDialog({
  open,
  onOpenChange,
  matchdayId,
  dateLabel,
  ffhb,
  refreshing,
  refreshed,
  onRefresh,
}: {
  /** Relecture du week-end sur ffhandball.fr en cours (lancée à l'ouverture de la journée). */
  refreshing: boolean;
  /** Relecture terminée avec succès pendant cette visite. */
  refreshed: boolean;
  onRefresh: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchdayId: string;
  dateLabel: string;
  ffhb: BoardFfhb;
}) {
  const selectable = useMemo(
    () =>
      ffhb.proposals.filter(
        (p) => p.status === "importable" || p.status === "rattachable",
      ),
    [ffhb.proposals],
  );
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(selectable.map((p) => p.key)),
  );
  const [pending, startTransition] = useTransition();

  const already = ffhb.proposals.filter((p) => p.status === "deja_present");
  const away = ffhb.proposals.filter((p) => p.status === "exterieur");
  const count = checked.size;

  function toggle(key: string) {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function confirm() {
    const picks = selectable
      .filter((p) => checked.has(p.key) && p.teamId)
      .map((p) => ({
        extRencontreId: p.key,
        teamId: p.teamId!,
        opponent: p.opponent,
        officialAt: p.officialAt,
        existingMatchId: p.existingMatchId,
      }));
    startTransition(async () => {
      try {
        const result = await importFfhbMatches(matchdayId, picks);
        const parts = [
          result.created ? `${result.created} match(s) importé(s)` : null,
          result.attached ? `${result.attached} rattaché(s)` : null,
        ].filter(Boolean);
        toast[result.overflow ? "warning" : "success"](
          result.overflow
            ? `${parts.join(", ")} — le programme déborde après 21h15`
            : `${parts.join(", ")} — horaires recalculés`,
        );
        onOpenChange(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur d'import");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[620px] rounded-[18px] p-[26px]">
        <DialogHeader>
          <DialogTitle className="font-display text-[19px] font-extrabold">
            Matchs du week-end trouvés sur la FFHB
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[#9C958D]">
            {dateLabel} — cochez les matchs à ajouter à la journée. Les horaires
            restent calculés par le CRM, dans l&apos;ordre des équipes.
          </DialogDescription>
        </DialogHeader>

        {refreshing && (
          <p className="flex items-center gap-2 rounded-[10px] bg-secondary px-3 py-2 text-[12.5px] font-semibold text-[#9C958D]">
            <Loader2 className="size-3.5 animate-spin" />
            Mise à jour depuis ffhandball.fr… la liste va se compléter.
          </p>
        )}

        {!ffhb.configured ? (
          <Empty
            title="Aucune équipe n'est reliée à une poule FFHB."
            hint="Reliez vos équipes dans Paramètres → Équipes pour que leurs matchs remontent ici."
            href="/crm/parametres/equipes"
            cta="Configurer les équipes"
          />
        ) : ffhb.proposals.length === 0 ? (
          refreshing ? null : <Empty
            title={`Aucune rencontre trouvée pour ${dateLabel.toLowerCase()}.`}
            hint={
              ffhb.lastSyncError
                ? `Attention : la dernière synchronisation a échoué (${ffhb.lastSyncError}). La liste peut être incomplète.`
                : "Les matchs apparaissent sur ffhandball.fr dès leur saisie dans Gesthand."
            }
          />
        ) : (
          <div className="max-h-[360px] space-y-4 overflow-y-auto pr-1">
            {ffhb.unlinkedTeams.length > 0 && (
              <p className="rounded-[10px] bg-secondary px-3 py-2 text-[12px] text-[#9C958D]">
                {ffhb.unlinkedTeams.length} équipe(s) sans poule :{" "}
                {ffhb.unlinkedTeams.join(", ")}. Leurs matchs ne remonteront pas.
              </p>
            )}

            <Section title="À domicile">
              {selectable.map((p) => (
                <label
                  key={p.key}
                  className="flex cursor-pointer items-start gap-2.5 rounded-[9px] border border-transparent px-2.5 py-2 transition-colors hover:bg-secondary has-[:checked]:border-primary has-[:checked]:bg-accent"
                >
                  <input
                    type="checkbox"
                    checked={checked.has(p.key)}
                    onChange={() => toggle(p.key)}
                    className="mt-[3px] size-4 accent-[#D81E34]"
                  />
                  <span className="min-w-0 flex-1">
                    <Line proposal={p} />
                    {p.status === "rattachable" && (
                      <span className="mt-0.5 block text-[11.5px] font-semibold text-[#9C958D]">
                        Un match de cette équipe existe déjà dans la journée : il
                        sera rattaché, pas dupliqué.
                      </span>
                    )}
                  </span>
                </label>
              ))}
              {selectable.length === 0 && (
                <p className="px-2.5 text-[12.5px] text-[#9C958D]">
                  {already.length > 0
                    ? "Tout est déjà dans la journée."
                    : "Aucun match à domicile ce week-end — nos équipes se déplacent."}
                </p>
              )}
            </Section>

            {already.length > 0 && (
              <Section title="Déjà dans la journée">
                {already.map((p) => (
                  <div key={p.key} className="px-2.5 py-2 opacity-60">
                    <Line proposal={p} />
                  </div>
                ))}
              </Section>
            )}

            {away.length > 0 && (
              <details className="rounded-[10px] bg-secondary px-3 py-2">
                <summary className="cursor-pointer text-[12px] font-bold text-[#9C958D]">
                  Aussi ce week-end : {away.length} match(s) à l&apos;extérieur
                </summary>
                <div className="mt-1.5 space-y-1">
                  {away.map((p) => (
                    <div key={p.key} className="text-[12.5px] text-[#9C958D]">
                      {p.teamName} chez {p.opponent}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <button
            onClick={onRefresh}
            disabled={pending || refreshing}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-[#9C958D] transition-colors hover:text-foreground disabled:opacity-50"
            title="Relire ce week-end sur ffhandball.fr"
          >
            <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
            {refreshing
              ? "Mise à jour…"
              : refreshed
                ? "Données FFHB à jour"
                : ffhb.lastSyncLabel
                  ? `Données FFHB ${ffhb.lastSyncLabel}`
                  : "Jamais synchronisé"}
          </button>
          <button
            onClick={confirm}
            disabled={pending || count === 0}
            className="flex h-[40px] items-center gap-1.5 rounded-[10px] bg-primary px-4 text-[13px] font-bold text-white shadow-[0_2px_8px_rgba(216,30,52,.28)] transition-colors hover:bg-[#B0122A] disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Ajouter {count > 0 ? `les ${count} matchs sélectionnés` : "les matchs"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Line({ proposal }: { proposal: BoardProposal }) {
  return (
    <span className="block text-[13px]">
      <strong className="font-bold">{proposal.teamName}</strong> vs{" "}
      {proposal.opponent}
      <span
        className={cn(
          "ml-2 text-[11.5px]",
          proposal.dateDiffers ? "font-bold text-[#B77406]" : "text-[#9C958D]",
        )}
      >
        {proposal.dateUnconfirmed
          ? "FFHB · date non encore fixée"
          : `FFHB ${proposal.officialLabel}`}
      </span>
    </span>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <p className="px-2.5 text-[11px] font-bold uppercase tracking-[.05em] text-[#9C958D]">
        {title}
      </p>
      {children}
    </div>
  );
}

function Empty({
  title,
  hint,
  href,
  cta,
}: {
  title: string;
  hint: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="rounded-[12px] border border-dashed px-4 py-6 text-center">
      <AlertCircle className="mx-auto size-5 text-[#9C958D]" />
      <p className="mt-2 text-[13px] font-bold">{title}</p>
      <p className="mt-1 text-[12.5px] text-[#9C958D]">{hint}</p>
      {href && cta && (
        <a
          href={href}
          className="mt-3 inline-flex items-center rounded-[9px] border bg-card px-3.5 py-2 text-[12.5px] font-bold transition-colors hover:border-primary hover:text-primary"
        >
          {cta}
        </a>
      )}
    </div>
  );
}
