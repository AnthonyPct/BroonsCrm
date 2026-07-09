"use client";

import { useState, useTransition } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { saveTariffs, type TariffInput } from "@/app/actions/parametres";
import { eur } from "@/lib/format";
import type { Tariff } from "@/lib/tariffs";

type Row = TariffInput & { key: string };

const euroInput =
  "flex h-10 max-w-[106px] items-center gap-1 rounded-[9px] border bg-secondary px-2.5 transition-colors focus-within:border-primary focus-within:bg-card";

export function TariffEditor({
  seasonId,
  tariffs,
}: {
  seasonId: string;
  tariffs: Tariff[];
}) {
  const [rows, setRows] = useState<Row[]>(
    tariffs.map((t) => ({
      key: t.id,
      id: t.id,
      category: t.category,
      birth_year_min: t.birth_year_min,
      birth_year_max: t.birth_year_max,
      part_ffhb: Number(t.part_ffhb),
      part_lbhb: Number(t.part_lbhb),
      part_hbc: Number(t.part_hbc),
      sort_order: t.sort_order,
    }))
  );
  const [pending, startTransition] = useTransition();

  function update(key: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function num(v: string): number {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  function intOrNull(v: string): number | null {
    if (v.trim() === "") return null;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }

  function yearsLabel(r: Row): string {
    if (r.birth_year_min !== null && r.birth_year_max !== null)
      return `${r.birth_year_min} – ${r.birth_year_max}`;
    if (r.birth_year_min !== null) return `${r.birth_year_min} et après`;
    if (r.birth_year_max !== null) return `${r.birth_year_max} et avant`;
    return "sur désignation";
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-2xl border bg-card shadow-[0_1px_2px_rgba(0,0,0,.03)]">
        <div className="grid min-w-[860px] grid-cols-[1.9fr_1fr_1fr_1fr_.9fr_1.05fr_44px] border-b bg-secondary px-[22px] py-[13px]">
          {[
            "Catégorie · année de naissance",
            "Part Fédé",
            "Part Ligue",
            "Part Club",
            "Total",
            "Dû ligue/fédé",
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
        {rows.map((r) => (
          <div
            key={r.key}
            className="grid min-w-[860px] grid-cols-[1.9fr_1fr_1fr_1fr_.9fr_1.05fr_44px] items-center border-b border-muted px-[22px] py-3 last:border-b-0"
          >
            <div className="pr-3">
              <input
                value={r.category}
                onChange={(e) => update(r.key, { category: e.target.value })}
                placeholder="Nom de la catégorie"
                className="w-full rounded-[7px] border border-transparent bg-transparent px-1 py-0.5 text-sm font-bold outline-none transition-colors focus:border-primary focus:bg-card"
              />
              <div className="mt-1 flex items-center gap-1.5">
                <input
                  className="w-[72px] rounded-[7px] border bg-secondary px-2 py-[3px] text-[11.5px] outline-none transition-colors focus:border-primary focus:bg-card"
                  placeholder="min"
                  value={r.birth_year_min ?? ""}
                  onChange={(e) =>
                    update(r.key, { birth_year_min: intOrNull(e.target.value) })
                  }
                />
                <span className="text-[11px] text-[#9C958D]">→</span>
                <input
                  className="w-[72px] rounded-[7px] border bg-secondary px-2 py-[3px] text-[11.5px] outline-none transition-colors focus:border-primary focus:bg-card"
                  placeholder="max"
                  value={r.birth_year_max ?? ""}
                  onChange={(e) =>
                    update(r.key, { birth_year_max: intOrNull(e.target.value) })
                  }
                />
                <span className="text-[11px] text-[#9C958D]">
                  {yearsLabel(r)}
                </span>
              </div>
            </div>
            {(["part_ffhb", "part_lbhb", "part_hbc"] as const).map((field) => (
              <div key={field} className="pr-3">
                <div className={euroInput}>
                  <input
                    inputMode="decimal"
                    value={r[field]}
                    onChange={(e) =>
                      update(r.key, { [field]: num(e.target.value) })
                    }
                    className="w-full bg-transparent text-[13.5px] font-semibold outline-none"
                  />
                  <span className="text-xs text-[#9C958D]">€</span>
                </div>
              </div>
            ))}
            <div className="font-display text-base font-extrabold tabular-nums">
              {eur.format(r.part_ffhb + r.part_lbhb + r.part_hbc)}
            </div>
            <div className="text-[13.5px] font-bold tabular-nums text-muted-foreground">
              {eur.format(r.part_ffhb + r.part_lbhb)}
            </div>
            <button
              title="Supprimer la catégorie"
              onClick={() =>
                setRows((rs) => rs.filter((x) => x.key !== r.key))
              }
              className="flex size-7 items-center justify-center rounded-lg text-[#9C958D] transition-colors hover:bg-accent hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <div className="bg-secondary px-[22px] py-3.5 text-xs text-[#9C958D]">
          Le <strong>Dû à la ligue/fédé</strong> (part Fédé + part Ligue) est
          reversé ; le club conserve la part Club. Les montants ci-dessus sont
          hors réduction — la remise anticipée s&apos;applique automatiquement
          par licence.
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() =>
            setRows((rs) => [
              ...rs,
              {
                key: `new-${rs.length}-${rs.map((r) => r.key).join("").length}`,
                category: "",
                birth_year_min: null,
                birth_year_max: null,
                part_ffhb: 0,
                part_lbhb: 0,
                part_hbc: 0,
                sort_order: rs.length + 1,
              },
            ])
          }
          className="flex items-center gap-1.5 rounded-[9px] border bg-card px-3.5 py-2 text-[12.5px] font-bold transition-colors hover:border-primary hover:text-primary"
        >
          <Plus className="size-3.5" strokeWidth={2.5} />
          Ajouter une catégorie
        </button>
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              try {
                await saveTariffs(
                  seasonId,
                  rows.map((row, i) => ({
                    id: row.id,
                    category: row.category,
                    birth_year_min: row.birth_year_min,
                    birth_year_max: row.birth_year_max,
                    part_ffhb: row.part_ffhb,
                    part_lbhb: row.part_lbhb,
                    part_hbc: row.part_hbc,
                    sort_order: i + 1,
                  }))
                );
                toast.success("Grille tarifaire enregistrée");
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
