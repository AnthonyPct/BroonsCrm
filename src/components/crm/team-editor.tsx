"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { saveTeams, type TeamInput } from "@/app/actions/equipes";
import type { Team } from "@/lib/planning";

type Row = TeamInput & { key: string };

const cellInput =
  "w-full rounded-[7px] border bg-secondary px-2 py-[5px] text-[12.5px] outline-none transition-colors focus:border-primary focus:bg-card";

export function TeamEditor({
  seasonId,
  teams,
}: {
  seasonId: string;
  teams: Team[];
}) {
  const [rows, setRows] = useState<Row[]>(
    teams.map((t) => ({
      key: t.id,
      id: t.id,
      name: t.name,
      birth_year_min: t.birth_year_min,
      birth_year_max: t.birth_year_max,
      gender: t.gender,
      warmup_minutes: t.warmup_minutes,
      match_duration_minutes: t.match_duration_minutes,
      is_youth: t.is_youth,
      sort_order: t.sort_order,
    }))
  );
  const [pending, startTransition] = useTransition();

  function update(key: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function move(index: number, delta: number) {
    setRows((rs) => {
      const next = [...rs];
      const j = index + delta;
      if (j < 0 || j >= next.length) return rs;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }

  function intOr(v: string, fallback: number): number {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  }

  function intOrNull(v: string): number | null {
    if (v.trim() === "") return null;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-2xl border bg-card shadow-[0_1px_2px_rgba(0,0,0,.03)]">
        <div className="grid min-w-[860px] grid-cols-[44px_1.5fr_1.1fr_.7fr_.8fr_.8fr_.7fr_44px] items-center border-b bg-secondary px-4 py-[13px]">
          {[
            "Ordre",
            "Équipe",
            "Né·e entre",
            "Genre",
            "Échauff. (min)",
            "Match (min)",
            "Jeunes",
            "",
          ].map((h, i) => (
            <div
              key={i}
              className="text-[11px] font-bold uppercase tracking-[.05em] text-[#9C958D]"
            >
              {h}
            </div>
          ))}
        </div>
        {rows.map((r, i) => (
          <div
            key={r.key}
            className="grid min-w-[860px] grid-cols-[44px_1.5fr_1.1fr_.7fr_.8fr_.8fr_.7fr_44px] items-center border-b border-muted px-4 py-2.5 last:border-b-0"
          >
            <div className="flex flex-col">
              <button
                onClick={() => move(i, -1)}
                className="text-[#9C958D] hover:text-foreground disabled:opacity-30"
                disabled={i === 0}
                title="Monter"
              >
                <ArrowUp className="size-3.5" />
              </button>
              <button
                onClick={() => move(i, 1)}
                className="text-[#9C958D] hover:text-foreground disabled:opacity-30"
                disabled={i === rows.length - 1}
                title="Descendre"
              >
                <ArrowDown className="size-3.5" />
              </button>
            </div>
            <div className="pr-3">
              <input
                value={r.name}
                onChange={(e) => update(r.key, { name: e.target.value })}
                placeholder="Nom (ex. U13 M)"
                className="w-full rounded-[7px] border border-transparent bg-transparent px-1 py-0.5 text-sm font-bold outline-none transition-colors focus:border-primary focus:bg-card"
              />
            </div>
            <div className="flex items-center gap-1 pr-3">
              <input
                className={cellInput}
                placeholder="min"
                value={r.birth_year_min ?? ""}
                onChange={(e) =>
                  update(r.key, { birth_year_min: intOrNull(e.target.value) })
                }
              />
              <span className="text-[11px] text-[#9C958D]">→</span>
              <input
                className={cellInput}
                placeholder="max"
                value={r.birth_year_max ?? ""}
                onChange={(e) =>
                  update(r.key, { birth_year_max: intOrNull(e.target.value) })
                }
              />
            </div>
            <div className="pr-3">
              <select
                value={r.gender ?? "mixte"}
                onChange={(e) =>
                  update(r.key, {
                    gender: e.target.value === "mixte" ? null : e.target.value,
                  })
                }
                className={cellInput}
              >
                <option value="mixte">Mixte</option>
                <option value="M">M</option>
                <option value="F">F</option>
              </select>
            </div>
            <div className="pr-3">
              <input
                inputMode="numeric"
                className={cellInput}
                value={r.warmup_minutes}
                onChange={(e) =>
                  update(r.key, { warmup_minutes: intOr(e.target.value, 30) })
                }
              />
            </div>
            <div className="pr-3">
              <input
                inputMode="numeric"
                className={cellInput}
                value={r.match_duration_minutes}
                onChange={(e) =>
                  update(r.key, {
                    match_duration_minutes: intOr(e.target.value, 60),
                  })
                }
              />
            </div>
            <div>
              <input
                type="checkbox"
                checked={r.is_youth}
                onChange={(e) => update(r.key, { is_youth: e.target.checked })}
                className="size-4 accent-[#D81E34]"
                title="Équipe jeunes (arbitre désigné par le club, pas de contrainte 18h)"
              />
            </div>
            <button
              title="Supprimer l'équipe"
              onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
              className="flex size-7 items-center justify-center rounded-lg text-[#9C958D] transition-colors hover:bg-accent hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <div className="bg-secondary px-4 py-3 text-xs text-[#9C958D]">
          L&apos;ordre = déroulé de la journée (jeunes en premier, Séniors F
          après Séniors M). « Jeunes » coché → arbitre désigné par le club ;
          décoché → équipe sénior (arbitre du comité, pas de match avant 18h00).
          Les années et le genre servent à proposer l&apos;équipe
          automatiquement sur les fiches.
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() =>
            setRows((rs) => [
              ...rs,
              {
                key: `new-${rs.length}-${rs.map((r) => r.key).join("").length}`,
                name: "",
                birth_year_min: null,
                birth_year_max: null,
                gender: null,
                warmup_minutes: 30,
                match_duration_minutes: 60,
                is_youth: true,
                sort_order: rs.length + 1,
              },
            ])
          }
          className="flex items-center gap-1.5 rounded-[9px] border bg-card px-3.5 py-2 text-[12.5px] font-bold transition-colors hover:border-primary hover:text-primary"
        >
          <Plus className="size-3.5" strokeWidth={2.5} />
          Ajouter une équipe
        </button>
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              try {
                await saveTeams(
                  seasonId,
                  rows.map((row, i) => ({
                    id: row.id,
                    name: row.name,
                    birth_year_min: row.birth_year_min,
                    birth_year_max: row.birth_year_max,
                    gender: row.gender,
                    warmup_minutes: row.warmup_minutes,
                    match_duration_minutes: row.match_duration_minutes,
                    is_youth: row.is_youth,
                    sort_order: i + 1,
                  }))
                );
                toast.success("Équipes enregistrées");
              } catch (e) {
                toast.error(
                  e instanceof Error ? e.message : "Erreur d'enregistrement"
                );
              }
            })
          }
          className="flex h-[42px] items-center gap-1.5 rounded-[10px] bg-primary px-[18px] text-[13px] font-bold text-white shadow-[0_2px_8px_rgba(216,30,52,.28)] transition-colors hover:bg-[#B0122A] disabled:opacity-60"
        >
          <Save className="size-4" />
          Enregistrer
        </button>
      </div>
    </div>
  );
}
