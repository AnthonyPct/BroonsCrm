"use client";

import { useRef, useState, useTransition } from "react";
import { Info, Upload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { importLicensees, type ImportRow } from "@/app/actions/import";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

function normHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/g, "");
}

function normName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
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
  const fr = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (fr) {
    return `${fr[3]}-${fr[2].padStart(2, "0")}-${fr[1].padStart(2, "0")}`;
  }
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

export function ImportTool({
  seasonId,
  existingMemberKeys,
}: {
  seasonId: string;
  existingMemberKeys: string[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<"gesthand" | "excel">("gesthand");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [pending, startTransition] = useTransition();

  const existing = new Set(existingMemberKeys);
  const isRenewal = (r: ImportRow) =>
    existing.has(`${normName(r.last_name)}|${normName(r.first_name)}`);

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
      toast.error("Colonnes « Nom » et « Prénom » introuvables dans le fichier.");
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

  const renewals = rows.filter(isRenewal).length;

  return (
    <div className="space-y-[18px]">
      {/* choix de la source */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setSource("gesthand")}
          className={cn(
            "flex flex-1 items-center gap-3.5 rounded-xl border-[1.5px] bg-card px-[18px] py-4 text-left transition-colors",
            source === "gesthand"
              ? "border-primary bg-accent"
              : "border-input hover:border-[#c9c1b6]"
          )}
        >
          <span className="flex size-[38px] flex-none items-center justify-center rounded-[10px] bg-info-bg font-display text-[13px] font-extrabold text-info">
            GH
          </span>
          <span>
            <span className="block text-[13.5px] font-bold">
              Extract Gesthand
            </span>
            <span className="block text-xs text-muted-foreground">
              Renouvellements de l&apos;an passé
            </span>
          </span>
        </button>
        <button
          onClick={() => setSource("excel")}
          className={cn(
            "flex flex-1 items-center gap-3.5 rounded-xl border-[1.5px] bg-card px-[18px] py-4 text-left transition-colors",
            source === "excel"
              ? "border-primary bg-accent"
              : "border-input hover:border-[#c9c1b6]"
          )}
        >
          <span className="flex size-[38px] flex-none items-center justify-center rounded-[10px] bg-success-bg font-display text-[13px] font-extrabold text-success">
            XL
          </span>
          <span>
            <span className="block text-[13.5px] font-bold">
              Fichier Excel du club
            </span>
            <span className="block text-xs text-muted-foreground">
              Ancien tableur de suivi
            </span>
          </span>
        </button>
      </div>

      {/* dropzone */}
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
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file) parseFile(file);
        }}
        className="cursor-pointer rounded-2xl border-2 border-dashed border-[#d8d1c6] bg-card px-6 py-12 text-center transition-colors hover:border-primary"
      >
        <span className="mx-auto flex size-[60px] items-center justify-center rounded-2xl bg-secondary">
          <Upload className="size-7 text-primary" strokeWidth={2} />
        </span>
        <div className="mt-4 font-display text-[17px] font-bold">
          {source === "gesthand"
            ? "Déposez l'extract Gesthand (.csv / .xlsx)"
            : "Déposez le fichier Excel du club (.xlsx)"}
        </div>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Colonnes attendues : nom, prénom, date de naissance. Glissez-déposez
          le fichier ou cliquez pour parcourir.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-[11px] bg-warning-bg px-3.5 py-3">
        <Info className="mt-0.5 size-4 shrink-0 text-warning" />
        <p className="text-[12.5px] leading-relaxed text-[#8a5a10]">
          Les paiements ne sont pas importés ici : ils remonteront
          automatiquement de HelloAsso. L&apos;import crée les fiches au statut
          « À saisir ».
        </p>
      </div>

      {/* preview */}
      {rows.length > 0 && (
        <>
          <div className="grid gap-3.5 sm:grid-cols-3">
            <div className="rounded-[14px] border bg-card px-5 py-4">
              <div className="text-[11.5px] font-bold uppercase tracking-[.05em] text-[#9C958D]">
                Lignes détectées
              </div>
              <div className="mt-1 font-display text-[26px] font-extrabold">
                {rows.length}
              </div>
            </div>
            <div className="rounded-[14px] border bg-card px-5 py-4">
              <div className="text-[11.5px] font-bold uppercase tracking-[.05em] text-[#9C958D]">
                Renouvellements
              </div>
              <div className="mt-1 font-display text-[26px] font-extrabold text-info">
                {renewals}
              </div>
            </div>
            <div className="rounded-[14px] border bg-card px-5 py-4">
              <div className="text-[11.5px] font-bold uppercase tracking-[.05em] text-[#9C958D]">
                Nouveaux
              </div>
              <div className="mt-1 font-display text-[26px] font-extrabold text-success">
                {rows.length - renewals}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-[14px] border bg-card">
            <div className="border-b bg-secondary px-5 py-3 text-[12.5px] font-semibold text-muted-foreground">
              {`${fileName} — ${rows.length} licencié(s) détecté(s). Vérifiez l'aperçu puis lancez l'import (les doublons déjà importés seront ignorés).`}
            </div>
            <div className="grid min-w-[620px] grid-cols-[1.8fr_1fr_1fr_.6fr_1.1fr] border-b bg-secondary px-5 py-2.5">
              {["Licencié", "Naissance", "Email", "Sexe", "Détection"].map(
                (h) => (
                  <div
                    key={h}
                    className="text-[11px] font-bold uppercase tracking-[.05em] text-[#9C958D]"
                  >
                    {h}
                  </div>
                )
              )}
            </div>
            <div className="max-h-80 overflow-auto">
              {rows.slice(0, 200).map((r, i) => (
                <div
                  key={i}
                  className="grid min-w-[620px] grid-cols-[1.8fr_1fr_1fr_.6fr_1.1fr] items-center border-b border-muted px-5 py-2.5 text-[13px] last:border-b-0"
                >
                  <div className="font-bold">
                    {r.first_name} {r.last_name.toUpperCase()}
                  </div>
                  <div>{formatDate(r.birth_date)}</div>
                  <div className="truncate text-muted-foreground">
                    {r.email ?? "—"}
                  </div>
                  <div>{r.sex ?? "—"}</div>
                  <div>
                    <span
                      className={cn(
                        "inline-block rounded-full px-[11px] py-[3px] text-[11.5px] font-bold",
                        isRenewal(r)
                          ? "bg-info-bg text-info"
                          : "bg-success-bg text-success"
                      )}
                    >
                      {isRenewal(r) ? "Renouvellement" : "Nouveau"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setRows([]);
                setFileName("");
              }}
              className="h-11 rounded-[10px] border bg-card px-[18px] text-[13.5px] font-bold transition-colors hover:border-[#9C958D]"
            >
              Annuler
            </button>
            <button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await importLicensees(seasonId, rows);
                  const msg = `${res.created} créé(s), ${res.skipped} ignoré(s)${
                    res.errors.length ? `, ${res.errors.length} erreur(s)` : ""
                  }`;
                  setResult(
                    res.errors.length
                      ? `${msg} — ${res.errors.join(" · ")}`
                      : msg
                  );
                  setRows([]);
                  if (res.errors.length) toast.warning(msg);
                  else
                    toast.success(
                      `${res.created} licenciés importés · statut « À saisir »`
                    );
                })
              }
              className="h-11 rounded-[10px] bg-primary px-6 text-[13.5px] font-bold text-white shadow-[0_2px_8px_rgba(216,30,52,.28)] transition-colors hover:bg-[#B0122A] disabled:opacity-60"
            >
              ✓ Importer {rows.length} licencié(s)
            </button>
          </div>
        </>
      )}

      {result && (
        <p className="rounded-[10px] bg-secondary px-3.5 py-3 text-sm">
          {result}
        </p>
      )}
    </div>
  );
}
