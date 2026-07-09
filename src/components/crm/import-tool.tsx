"use client";

import { useRef, useState, useTransition } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { importLicensees, type ImportRow } from "@/app/actions/import";
import { formatDate } from "@/lib/format";

function normHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/g, "");
}

const HEADER_MAP: Record<string, keyof ImportRow> = {
  nom: "last_name",
  nomdusage: "last_name",
  lastname: "last_name",
  prenom: "first_name",
  prnom: "first_name", // en-tête « Prénom » d'un CSV mal encodé (ANSI/latin1)
  firstname: "first_name",
  datedenaissance: "birth_date",
  datenaissance: "birth_date",
  nele: "birth_date",
  birthdate: "birth_date",
  ddn: "birth_date",
  email: "email",
  mail: "email",
  courriel: "email",
  sexe: "sex",
  sex: "sex",
  genre: "sex",
};

function toIsoDate(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date && !isNaN(v.getTime())) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  // dd/mm/yyyy
  const fr = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (fr) {
    return `${fr[3]}-${fr[2].padStart(2, "0")}-${fr[1].padStart(2, "0")}`;
  }
  // yyyy-mm-dd
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return null;
}

function normSex(v: unknown): string | null {
  const s = String(v ?? "")
    .trim()
    .toUpperCase();
  if (s.startsWith("M") || s === "H") return "M";
  if (s.startsWith("F")) return "F";
  return null;
}

export function ImportTool({ seasonId }: { seasonId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [pending, startTransition] = useTransition();

  async function parseFile(file: File) {
    const buffer = await file.arrayBuffer();
    // CSV : lecture en texte brut (raw) pour garder les dates dd/mm/yyyy
    // telles quelles — SheetJS les interpréterait sinon au format US.
    const workbook = file.name.toLowerCase().endsWith(".csv")
      ? XLSX.read(new TextDecoder("utf-8").decode(buffer), {
          type: "string",
          raw: true,
        })
      : XLSX.read(buffer, { cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
    });
    if (!json.length) {
      toast.error("Fichier vide ou illisible");
      return;
    }

    const headers = Object.keys(json[0]);
    const mapping = new Map<string, keyof ImportRow>();
    for (const h of headers) {
      const target = HEADER_MAP[normHeader(h)];
      if (target && ![...mapping.values()].includes(target)) {
        mapping.set(h, target);
      }
    }
    if (
      ![...mapping.values()].includes("last_name") ||
      ![...mapping.values()].includes("first_name")
    ) {
      toast.error(
        "Colonnes « Nom » et « Prénom » introuvables dans le fichier."
      );
      return;
    }

    const parsed: ImportRow[] = json
      .map((r) => {
        const row: ImportRow = {
          first_name: "",
          last_name: "",
          birth_date: null,
          email: null,
          sex: null,
        };
        for (const [header, field] of mapping) {
          const value = r[header];
          if (field === "birth_date") row.birth_date = toIsoDate(value);
          else if (field === "sex") row.sex = normSex(value);
          else if (field === "email")
            row.email = String(value ?? "").trim() || null;
          else row[field] = String(value ?? "").trim();
        }
        return row;
      })
      .filter((r) => r.first_name && r.last_name);

    setRows(parsed);
    setFileName(file.name);
    setResult("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="size-5" />
          Import de licenciés
        </CardTitle>
        <CardDescription>
          Extract Gesthand de la saison passée ou fichier Excel du club
          (.xlsx, .csv). Colonnes reconnues : Nom, Prénom, Date de naissance,
          Email, Sexe. La catégorie et le tarif sont pré-remplis
          automatiquement.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) parseFile(file);
            e.target.value = "";
          }}
        />
        <Button variant="outline" onClick={() => inputRef.current?.click()}>
          <Upload className="size-4" />
          Choisir un fichier
        </Button>

        {rows.length > 0 && (
          <>
            <div className="text-sm text-muted-foreground">
              {`${fileName} — ${rows.length} licencié(s) détecté(s). Vérifiez l'aperçu puis lancez l'import (les doublons déjà présents seront ignorés).`}
            </div>
            <div className="max-h-80 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Prénom</TableHead>
                    <TableHead>Naissance</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Sexe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 100).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.last_name}</TableCell>
                      <TableCell>{r.first_name}</TableCell>
                      <TableCell>{formatDate(r.birth_date)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.email ?? "—"}
                      </TableCell>
                      <TableCell>{r.sex ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await importLicensees(seasonId, rows);
                  const msg = `${res.created} créé(s), ${res.skipped} ignoré(s)${
                    res.errors.length ? `, ${res.errors.length} erreur(s)` : ""
                  }`;
                  setResult(
                    res.errors.length ? `${msg} — ${res.errors.join(" · ")}` : msg
                  );
                  setRows([]);
                  if (res.errors.length) toast.warning(msg);
                  else toast.success(`Import terminé : ${msg}`);
                })
              }
            >
              Importer {rows.length} licencié(s)
            </Button>
          </>
        )}

        {result && (
          <p className="rounded-md bg-muted p-3 text-sm">{result}</p>
        )}
      </CardContent>
    </Card>
  );
}
