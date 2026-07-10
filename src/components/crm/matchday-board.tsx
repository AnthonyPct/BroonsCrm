"use client";

import { useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  ClipboardCopy,
  MessageCircle,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addMatch,
  assignRole,
  autoAssign,
  moveMatch,
  recalcSchedule,
  removeMatch,
  setHallManager,
  setMatchOpponent,
  setMatchTime,
} from "@/app/actions/planning";
import { cn } from "@/lib/utils";

export type Option = {
  id: string;
  label: string;
  count: number;
  adjacent?: boolean; // joue le match d'avant ou d'après
};

export type BoardMatch = {
  id: string;
  teamName: string;
  isYouth: boolean;
  opponent: string;
  scheduledAt: string | null; // HH:MM
  assignments: Record<string, { id: string; label: string } | null>;
  suggestions: Record<string, Option[]>;
};

export type BoardData = {
  matchdayId: string;
  dateLabel: string; // « Samedi 14/09 »
  hallManager: { current: { id: string; label: string } | null; options: Option[] };
  matches: BoardMatch[];
  teams: { id: string; name: string }[];
  overflow: boolean;
};

const ROLE_TITLES: Record<string, string> = {
  table_1: "Table 1",
  table_2: "Table 2",
  referee: "Arbitre",
};

function RoleSelect({
  matchdayId,
  matchId,
  role,
  current,
  options,
}: {
  matchdayId: string;
  matchId: string;
  role: string;
  current: { id: string; label: string } | null;
  options: Option[];
}) {
  const [pending, startTransition] = useTransition();
  const values = [...options];
  if (current && !values.some((o) => o.id === current.id)) {
    values.unshift({ id: current.id, label: current.label, count: -1 });
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="w-14 shrink-0 text-[11px] font-bold uppercase tracking-[.03em] text-[#9C958D]">
        {ROLE_TITLES[role]}
      </span>
      <Select
        value={current?.id ?? "none"}
        disabled={pending}
        onValueChange={(value) =>
          startTransition(async () => {
            await assignRole(matchId, matchdayId, role, value === "none" ? null : value);
          })
        }
      >
        <SelectTrigger
          className={cn(
            "h-8 w-full min-w-0 rounded-[8px] border-input bg-secondary px-2.5 text-[12.5px] font-semibold",
            !current && "text-[#9C958D]"
          )}
        >
          <SelectValue placeholder="À désigner…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">— Personne —</SelectItem>
          {values.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.label}
              {o.count >= 0 ? ` · ${o.count}` : ""}
              {o.adjacent ? " · joue avant/après" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function MatchdayBoard({ data }: { data: BoardData }) {
  const [pending, startTransition] = useTransition();
  // Overrides d'édition en cours : la valeur affichée retombe sur la donnée
  // serveur dès que l'édition est enregistrée (sinon les refresh seraient ignorés)
  const [opponentEdits, setOpponentEdits] = useState<Record<string, string>>({});
  const [timeEdits, setTimeEdits] = useState<Record<string, string>>({});

  function whatsappText(): string {
    const lines = [`🤾 ${data.dateLabel} — Salle du Chalet, Broons`];
    if (data.hallManager.current) {
      lines.push(`🧹 Responsable de salle : ${data.hallManager.current.label}`);
    }
    for (const m of data.matches) {
      const parts = [
        `${m.scheduledAt?.replace(":", "h") ?? "--h--"} ${m.teamName}${m.opponent ? ` vs ${m.opponent}` : ""}`,
      ];
      const t1 = m.assignments.table_1?.label;
      const t2 = m.assignments.table_2?.label;
      if (t1 || t2) {
        parts.push(`Table : ${[t1, t2].filter(Boolean).join(" & ")}`);
      }
      if (m.isYouth) {
        if (m.assignments.referee?.label)
          parts.push(`Arbitre : ${m.assignments.referee.label}`);
      } else {
        parts.push("Arbitre : comité");
      }
      lines.push(parts.join(" — "));
    }
    lines.push("", "Merci à tous ! 🔴⚫");
    return lines.join("\n");
  }

  function conclusionsText(): string {
    return data.matches
      .map((m) => `${m.teamName} — ${m.scheduledAt ?? "--:--"}`)
      .join("\n");
  }

  async function copy(text: string, message: string) {
    await navigator.clipboard.writeText(text);
    toast.success(message);
  }

  return (
    <div className="space-y-[18px]">
      {data.overflow && (
        <div className="rounded-[11px] border border-[#f3ccd0] bg-accent px-4 py-3 text-[13px] font-semibold text-destructive">
          ⚠️ Le programme dépasse 21h15 même en démarrant à 13h00 — envisagez de
          basculer un match sur une journée du dimanche.
        </div>
      )}

      {/* barre d'actions */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          disabled={pending || data.matches.length === 0}
          onClick={() =>
            startTransition(async () => {
              const overflow = await recalcSchedule(data.matchdayId);
              toast[overflow ? "warning" : "success"](
                overflow
                  ? "Horaires recalculés — le programme déborde après 21h15"
                  : "Horaires recalculés"
              );
            })
          }
          className="flex items-center gap-1.5 rounded-[9px] border bg-card px-3.5 py-2 text-[12.5px] font-bold transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
        >
          <Wand2 className="size-3.5" />
          Recalculer les horaires
        </button>
        <button
          disabled={pending || data.matches.length === 0}
          onClick={() =>
            startTransition(async () => {
              const n = await autoAssign(data.matchdayId);
              toast.success(
                n
                  ? `${n} désignation(s) proposée(s) — vérifiez et ajustez si besoin`
                  : "Rien à assigner : tous les créneaux sont déjà pourvus"
              );
            })
          }
          className="flex items-center gap-1.5 rounded-[9px] bg-primary px-3.5 py-2 text-[12.5px] font-bold text-white shadow-[0_2px_8px_rgba(216,30,52,.28)] transition-colors hover:bg-[#B0122A] disabled:opacity-50"
        >
          <Sparkles className="size-3.5" />
          Assigner automatiquement
        </button>
        <button
          disabled={data.matches.length === 0}
          onClick={() =>
            copy(conclusionsText(), "Conclusions copiées — à coller dans Gesthand")
          }
          className="flex items-center gap-1.5 rounded-[9px] border bg-card px-3.5 py-2 text-[12.5px] font-bold transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
        >
          <ClipboardCopy className="size-3.5" />
          Copier les conclusions Gesthand
        </button>
        <button
          disabled={data.matches.length === 0}
          onClick={() => copy(whatsappText(), "Message copié — à coller dans WhatsApp")}
          className="flex items-center gap-1.5 rounded-[9px] bg-success px-3.5 py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-success-strong disabled:opacity-50"
        >
          <MessageCircle className="size-3.5" />
          Copier pour WhatsApp
        </button>
      </div>

      {/* responsable de salle */}
      <div
        data-hall-select
        className="rounded-2xl border bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,.03)]"
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="micro-label">Responsable de salle (journée)</div>
          <div className="min-w-[240px]">
            <Select
              value={data.hallManager.current?.id ?? "none"}
              onValueChange={(value) =>
                startTransition(async () => {
                  await setHallManager(
                    data.matchdayId,
                    value === "none" ? null : value
                  );
                })
              }
            >
              <SelectTrigger className="h-9 rounded-[9px] border-input bg-secondary text-[13px] font-semibold">
                <SelectValue placeholder="À désigner…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Personne —</SelectItem>
                {(() => {
                  const opts = [...data.hallManager.options];
                  const cur = data.hallManager.current;
                  if (cur && !opts.some((o) => o.id === cur.id)) {
                    opts.unshift({ id: cur.id, label: cur.label, count: -1 });
                  }
                  return opts.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                      {o.count >= 0 ? ` · ${o.count} journée(s)` : ""}
                    </SelectItem>
                  ));
                })()}
              </SelectContent>
            </Select>
          </div>
          <span className="text-[11.5px] text-[#9C958D]">
            Majeur + compétence « Responsable de salle » — trié par équité.
          </span>
        </div>
      </div>

      {/* matchs */}
      <div className="space-y-3">
        {data.matches.map((m, i) => (
          <div
            key={m.id}
            data-match-team={m.teamName}
            className="rounded-2xl border bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,.03)]"
          >
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-col">
                <button
                  onClick={() =>
                    startTransition(() => moveMatch(m.id, data.matchdayId, -1))
                  }
                  disabled={i === 0 || pending}
                  className="text-[#9C958D] hover:text-foreground disabled:opacity-30"
                  title="Monter"
                >
                  <ArrowUp className="size-4" />
                </button>
                <button
                  onClick={() =>
                    startTransition(() => moveMatch(m.id, data.matchdayId, 1))
                  }
                  disabled={i === data.matches.length - 1 || pending}
                  className="text-[#9C958D] hover:text-foreground disabled:opacity-30"
                  title="Descendre"
                >
                  <ArrowDown className="size-4" />
                </button>
              </div>
              <input
                type="time"
                value={timeEdits[m.id] ?? m.scheduledAt ?? ""}
                onChange={(e) =>
                  setTimeEdits((t) => ({ ...t, [m.id]: e.target.value }))
                }
                onBlur={() => {
                  const value = timeEdits[m.id];
                  if (value !== undefined && value !== (m.scheduledAt ?? "")) {
                    startTransition(async () => {
                      await setMatchTime(m.id, data.matchdayId, value);
                      setTimeEdits((t) => {
                        const rest = Object.fromEntries(Object.entries(t).filter(([k]) => k !== m.id));                        return rest;
                      });
                    });
                  }
                }}
                className="h-9 rounded-[9px] border bg-secondary px-2 font-display text-[15px] font-bold outline-none transition-colors focus:border-primary"
              />
              <div className="font-display text-[16px] font-extrabold">
                {m.teamName}
              </div>
              <span className="text-[13px] text-muted-foreground">vs</span>
              <input
                value={opponentEdits[m.id] ?? m.opponent}
                placeholder="Adversaire…"
                onChange={(e) =>
                  setOpponentEdits((o) => ({ ...o, [m.id]: e.target.value }))
                }
                onBlur={() => {
                  const value = opponentEdits[m.id];
                  if (value !== undefined && value !== m.opponent) {
                    startTransition(async () => {
                      await setMatchOpponent(m.id, data.matchdayId, value);
                      setOpponentEdits((o) => {
                        const rest = Object.fromEntries(Object.entries(o).filter(([k]) => k !== m.id));                        return rest;
                      });
                    });
                  }
                }}
                className="h-9 min-w-[160px] flex-1 rounded-[9px] border bg-secondary px-3 text-[13.5px] font-semibold outline-none transition-colors focus:border-primary"
              />
              <button
                onClick={() => {
                  if (confirm("Supprimer ce match ?")) {
                    startTransition(() => removeMatch(m.id, data.matchdayId));
                  }
                }}
                className="flex size-8 items-center justify-center rounded-lg text-[#9C958D] transition-colors hover:bg-accent hover:text-destructive"
                title="Supprimer le match"
              >
                <Trash2 className="size-4" />
              </button>
            </div>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
              <RoleSelect
                matchdayId={data.matchdayId}
                matchId={m.id}
                role="table_1"
                current={m.assignments.table_1 ?? null}
                options={m.suggestions.table_1 ?? []}
              />
              <RoleSelect
                matchdayId={data.matchdayId}
                matchId={m.id}
                role="table_2"
                current={m.assignments.table_2 ?? null}
                options={m.suggestions.table_2 ?? []}
              />
              {m.isYouth ? (
                <RoleSelect
                  matchdayId={data.matchdayId}
                  matchId={m.id}
                  role="referee"
                  current={m.assignments.referee ?? null}
                  options={m.suggestions.referee ?? []}
                />
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="w-14 shrink-0 text-[11px] font-bold uppercase tracking-[.03em] text-[#9C958D]">
                    Arbitre
                  </span>
                  <span className="rounded-full bg-info-bg px-3 py-1 text-[11.5px] font-bold text-info">
                    Désigné par le comité
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
        {data.matches.length === 0 && (
          <div className="rounded-2xl border bg-card py-10 text-center text-sm text-muted-foreground">
            Aucun match — ajoutez le premier ci-dessous.
          </div>
        )}
      </div>

      {/* ajout de match */}
      <form
        action={async (formData) => {
          await addMatch(data.matchdayId, formData);
          toast.success("Match ajouté, horaires recalculés");
        }}
        className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-[#d8d1c6] p-4"
      >
        <Select name="team_id" required>
          <SelectTrigger className="h-10 w-44 rounded-[10px] border-input bg-card text-[13px] font-semibold">
            <SelectValue placeholder="Équipe…" />
          </SelectTrigger>
          <SelectContent>
            {data.teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input
          name="opponent"
          placeholder="Adversaire (ex. Lamballe)"
          className="h-10 min-w-[200px] flex-1 rounded-[10px] border bg-card px-3 text-[13.5px] outline-none transition-colors focus:border-primary"
        />
        <button
          type="submit"
          className="flex h-10 items-center gap-1.5 rounded-[10px] bg-primary px-4 text-[13px] font-bold text-white shadow-[0_2px_8px_rgba(216,30,52,.28)] transition-colors hover:bg-[#B0122A]"
        >
          <Plus className="size-4" strokeWidth={2.5} />
          Ajouter le match
        </button>
      </form>
    </div>
  );
}
