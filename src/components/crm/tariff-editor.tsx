"use client";

import { useState, useTransition } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { saveTariffs, type TariffInput } from "@/app/actions/parametres";
import { eur } from "@/lib/format";
import type { Tariff } from "@/lib/tariffs";

type Row = TariffInput & { key: string };

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

  return (
    <div className="space-y-4">
      <Card className="py-0">
        <CardContent className="overflow-x-auto px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-52 pl-6">Catégorie</TableHead>
                <TableHead>Né·e entre</TableHead>
                <TableHead>et</TableHead>
                <TableHead>Part Fédé</TableHead>
                <TableHead>Part Ligue</TableHead>
                <TableHead>Part Club</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.key}>
                  <TableCell className="pl-6">
                    <Input
                      value={r.category}
                      onChange={(e) =>
                        update(r.key, { category: e.target.value })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="w-20"
                      placeholder="—"
                      value={r.birth_year_min ?? ""}
                      onChange={(e) =>
                        update(r.key, {
                          birth_year_min: intOrNull(e.target.value),
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="w-20"
                      placeholder="—"
                      value={r.birth_year_max ?? ""}
                      onChange={(e) =>
                        update(r.key, {
                          birth_year_max: intOrNull(e.target.value),
                        })
                      }
                    />
                  </TableCell>
                  {(["part_ffhb", "part_lbhb", "part_hbc"] as const).map(
                    (field) => (
                      <TableCell key={field}>
                        <Input
                          className="w-24"
                          inputMode="decimal"
                          value={r[field]}
                          onChange={(e) =>
                            update(r.key, { [field]: num(e.target.value) })
                          }
                        />
                      </TableCell>
                    )
                  )}
                  <TableCell className="text-right font-medium tabular-nums">
                    {eur.format(r.part_ffhb + r.part_lbhb + r.part_hbc)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        setRows((rs) => rs.filter((x) => x.key !== r.key))
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() =>
            setRows((rs) => [
              ...rs,
              {
                key: `new-${Date.now()}`,
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
        >
          <Plus className="size-4" />
          Ajouter une catégorie
        </Button>
        <Button
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
        >
          <Save className="size-4" />
          Enregistrer la grille
        </Button>
      </div>
    </div>
  );
}
