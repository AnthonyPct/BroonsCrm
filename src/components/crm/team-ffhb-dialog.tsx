"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Check, Link2, Loader2, Unlink } from "lucide-react";
import { toast } from "sonner";
import {
  bindTeamPool,
  resolvePoule,
  unbindTeamPool,
  type PouleEquipe,
} from "@/app/actions/ffhb";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Resolved = {
  pouleId: string;
  label: string;
  journeeCount: number;
  equipes: PouleEquipe[];
};

export function TeamFfhbDialog({
  open,
  onOpenChange,
  teamId,
  teamName,
  currentLabel,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
  /** Libellé FFHB déjà rattaché, s'il y en a un. */
  currentLabel: string | null;
  onChanged: (libelle: string | null) => void;
}) {
  const [url, setUrl] = useState("");
  const [resolved, setResolved] = useState<Resolved | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setUrl("");
    setResolved(null);
    setChoice(null);
    setError(null);
  }

  function search() {
    setError(null);
    startTransition(async () => {
      const result = await resolvePoule(url);
      if (!result.ok) {
        setResolved(null);
        setError(messageFor(result.code, result.message));
        return;
      }
      setResolved({
        pouleId: result.pouleId,
        label: result.label,
        journeeCount: result.journeeCount,
        equipes: result.equipes,
      });
      setChoice(result.suggestedEquipeId);
    });
  }

  function bind() {
    if (!resolved || !choice) return;
    const equipe = resolved.equipes.find((e) => e.id === choice);
    if (!equipe) return;
    startTransition(async () => {
      try {
        await bindTeamPool(
          teamId,
          resolved.pouleId,
          equipe.id,
          equipe.extEquipeId,
          equipe.libelle,
          equipe.structureId,
        );
        onChanged(equipe.libelle);
        toast.success(`${teamName} reliée à ${resolved.label}`);
        onOpenChange(false);
        reset();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur d'enregistrement");
      }
    });
  }

  function unbind() {
    startTransition(async () => {
      try {
        await unbindTeamPool(teamId);
        onChanged(null);
        toast.success(`${teamName} détachée de sa poule`);
        onOpenChange(false);
        reset();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur d'enregistrement");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-w-[520px] rounded-[18px] p-[26px]">
        <DialogHeader>
          <DialogTitle className="font-display text-[19px] font-extrabold">
            Relier {teamName} à sa poule FFHB
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[#9C958D]">
            Sur ffhandball.fr, ouvrez la page de la poule de cette équipe et
            copiez l&apos;adresse depuis la barre du navigateur.
          </DialogDescription>
        </DialogHeader>

        {currentLabel && !resolved && (
          <div className="flex items-center justify-between gap-3 rounded-[11px] border bg-secondary px-3.5 py-2.5">
            <span className="text-[13px]">
              Actuellement reliée à{" "}
              <strong className="font-bold">{currentLabel}</strong>
            </span>
            <button
              onClick={unbind}
              disabled={pending}
              className="flex shrink-0 items-center gap-1.5 text-[12.5px] font-bold text-[#9C958D] transition-colors hover:text-destructive disabled:opacity-50"
            >
              <Unlink className="size-3.5" />
              Retirer
            </button>
          </div>
        )}

        <div className="space-y-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && url.trim() && !pending) search();
            }}
            placeholder="https://www.ffhandball.fr/competitions/saison-…"
            className="h-[42px] w-full rounded-[10px] border bg-card px-3 text-[13px] outline-none transition-colors focus:border-primary"
          />
          <button
            onClick={search}
            disabled={pending || url.trim().length === 0}
            className="flex h-[38px] items-center gap-1.5 rounded-[10px] border bg-card px-3.5 text-[12.5px] font-bold transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {pending && !resolved ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Lecture de la poule sur ffhandball.fr…
              </>
            ) : (
              <>
                <Link2 className="size-3.5" />
                Rechercher la poule
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-[10px] bg-accent px-3 py-2.5 text-[12.5px] font-semibold text-destructive">
            <AlertCircle className="mt-px size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {resolved && (
          <div className="space-y-3">
            <div className="rounded-[11px] border border-[#cfe8d8] bg-[#f0f8f3] px-3.5 py-2.5 text-[12.5px] font-semibold text-[#1f7a48]">
              <Check className="mr-1.5 inline size-3.5" />
              {resolved.label} · {resolved.equipes.length} équipes ·{" "}
              {resolved.journeeCount} journées
            </div>

            {resolved.equipes.length === 0 ? (
              <p className="text-[12.5px] text-[#9C958D]">
                Cette poule n&apos;a pas encore d&apos;équipes publiées. Vous
                pourrez la relier dès que la ligue les aura saisies.
              </p>
            ) : (
              <>
                <p className="text-[12.5px] font-bold">
                  Laquelle est notre équipe ?
                </p>
                <div className="max-h-[220px] space-y-1 overflow-y-auto pr-1">
                  {resolved.equipes.map((equipe) => (
                    <label
                      key={equipe.id}
                      className="flex cursor-pointer items-center gap-2.5 rounded-[9px] border border-transparent px-2.5 py-2 text-[13px] transition-colors hover:bg-secondary has-[:checked]:border-primary has-[:checked]:bg-accent"
                    >
                      <input
                        type="radio"
                        name="equipe"
                        value={equipe.id}
                        checked={choice === equipe.id}
                        onChange={() => setChoice(equipe.id)}
                        className="size-4 accent-[#D81E34]"
                      />
                      {equipe.libelle}
                    </label>
                  ))}
                </div>
              </>
            )}

            <button
              onClick={bind}
              disabled={pending || !choice}
              className="flex h-[42px] w-full items-center justify-center gap-1.5 rounded-[10px] bg-primary text-[13px] font-bold text-white shadow-[0_2px_8px_rgba(216,30,52,.28)] transition-colors hover:bg-[#B0122A] disabled:opacity-60"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Relier l&apos;équipe
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Message actionnable plutôt que le code d'erreur brut de la fédération. */
function messageFor(code: string, fallback: string): string {
  switch (code) {
    case "url_invalide":
      return "Cette adresse ne ressemble pas à une page de poule ffhandball.fr. Copiez l'adresse depuis la page de la poule, pas celle du club.";
    case "ffhb_indisponible":
      return "ffhandball.fr ne répond pas. Réessayez dans quelques minutes.";
    case "contrat_ffhb":
      return "La page de la fédération n'a plus la forme attendue — l'intégration doit être mise à jour.";
    case "reseau":
      return fallback;
    default:
      return fallback;
  }
}
