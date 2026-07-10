"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MemberAvatar } from "@/components/crm/avatar";
import {
  PaymentStatusBadge,
  QualificationBadge,
} from "@/components/crm/badges";
import { eur } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LicenseeRow } from "@/lib/queries";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const KANBAN_COLUMNS = [
  { status: "a_saisir", label: "À saisir", dot: "#9C958D" },
  { status: "attente_paiement", label: "En attente", dot: "#B87514" },
  { status: "payee", label: "Payée", dot: "#1F8A5B" },
  { status: "qualifiee", label: "Qualifiée", dot: "#166b46" },
] as const;

const VIEWS = ["Tableau", "Kanban", "Cartes"] as const;

function shortCategory(category: string | null | undefined): string {
  if (!category) return "Sans tarif";
  if (/école|ecole/i.test(category)) return "École";
  if (/12-16|jeune/i.test(category)) return "Jeunes";
  if (/\+16|senior/i.test(category)) return "Séniors";
  return category;
}

export function LicenseesView({
  licensees,
  categories,
}: {
  licensees: LicenseeRow[];
  categories: string[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [payment, setPayment] = useState("all");
  const [qualif, setQualif] = useState("all");
  const [view, setView] = useState<(typeof VIEWS)[number]>("Tableau");

  const filtered = useMemo(() => {
    const q = normalize(search);
    return licensees.filter((l) => {
      if (
        q &&
        !normalize(`${l.member.first_name} ${l.member.last_name}`).includes(q)
      )
        return false;
      if (category !== "all" && l.tariff?.category !== category) return false;
      if (payment !== "all" && l.financials?.payment_status !== payment)
        return false;
      if (qualif === "oui" && l.status !== "qualifiee") return false;
      if (qualif === "non" && l.status === "qualifiee") return false;
      return true;
    });
  }, [licensees, search, category, payment, qualif]);

  const selectClass =
    "h-10 rounded-[10px] border-input bg-card px-3 text-[13px] font-semibold text-[#3d3a35]";

  return (
    <div className="mx-auto max-w-[1180px] space-y-3">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-10 min-w-[220px] max-w-[320px] flex-1 items-center gap-2 rounded-[10px] border bg-card px-3">
          <Search className="size-4 shrink-0 text-[#9C958D]" />
          <input
            placeholder="Rechercher un licencié…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-[13.5px] outline-none placeholder:text-[#9C958D]"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className={cn(selectClass, "w-44")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={payment} onValueChange={setPayment}>
          <SelectTrigger className={cn(selectClass, "w-36")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tout paiement</SelectItem>
            <SelectItem value="payee">Réglée</SelectItem>
            <SelectItem value="partielle">Partielle</SelectItem>
            <SelectItem value="impayee">Impayée</SelectItem>
          </SelectContent>
        </Select>
        <Select value={qualif} onValueChange={setQualif}>
          <SelectTrigger className={cn(selectClass, "w-40")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Qualif. : toutes</SelectItem>
            <SelectItem value="oui">Qualifiée</SelectItem>
            <SelectItem value="non">Non qualifiée</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-3">
          <div className="flex rounded-[10px] bg-[#EDEAE3] p-[3px]">
            {VIEWS.map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded-lg px-3.5 py-[7px] text-[12.5px] font-bold transition-all",
                  view === v
                    ? "bg-white text-[#17130F] shadow-[0_1px_3px_rgba(0,0,0,.12)]"
                    : "text-muted-foreground"
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <Link
            href="/crm/licencies/nouveau"
            className="flex h-10 items-center gap-1.5 rounded-[10px] bg-primary px-4 text-[13px] font-bold text-white shadow-[0_2px_8px_rgba(216,30,52,.28)] transition-colors hover:bg-[#B0122A]"
          >
            <Plus className="size-4" strokeWidth={2.5} />
            Ajouter
          </Link>
        </div>
      </div>

      <div className="text-[12.5px] font-semibold text-[#9C958D]">
        {filtered.length} licencié(s) affiché(s)
      </div>

      {/* ------- TABLEAU ------- */}
      {view === "Tableau" && (
        <div className="overflow-x-auto rounded-[14px] border bg-card">
          <div className="grid min-w-[820px] grid-cols-[2.2fr_1.2fr_1fr_1fr_1.1fr_1.3fr] border-b bg-secondary px-5 py-3">
            {["Licencié", "Équipe", "Dû", "Reste", "Paiement", "Qualification"].map(
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
          {filtered.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Aucun licencié ne correspond aux filtres.
            </div>
          )}
          {filtered.map((l) => {
            const f = l.financials;
            const balance = Number(f?.balance ?? 0);
            const birthYear = l.member.birth_date
              ? new Date(l.member.birth_date).getFullYear()
              : null;
            return (
              <button
                key={l.id}
                onClick={() => router.push(`/crm/licencies/${l.id}`)}
                className="grid w-full min-w-[820px] grid-cols-[2.2fr_1.2fr_1fr_1fr_1.1fr_1.3fr] items-center border-b border-muted px-5 py-[13px] text-left text-[13.5px] transition-colors last:border-b-0 hover:bg-[#FBFAF7]"
              >
                <div className="flex items-center gap-3">
                  <MemberAvatar
                    firstName={l.member.first_name}
                    lastName={l.member.last_name}
                  />
                  <div className="min-w-0">
                    <div className="truncate font-bold">
                      {l.member.first_name} {l.member.last_name.toUpperCase()}
                    </div>
                    <div className="text-[11.5px] text-[#9C958D]">
                      {shortCategory(l.tariff?.category)}
                      {birthYear ? ` · ${birthYear}` : ""}
                    </div>
                  </div>
                </div>
                <div className="truncate text-muted-foreground">
                  {l.club_team?.name ?? "—"}
                </div>
                <div className="font-semibold tabular-nums">
                  {f?.total_due != null ? eur.format(Number(f.total_due)) : "—"}
                </div>
                <div
                  className={cn(
                    "tabular-nums",
                    balance > 10
                      ? "font-bold text-destructive"
                      : "font-semibold text-[#9C958D]"
                  )}
                >
                  {f?.balance != null && balance > 0
                    ? eur.format(balance)
                    : "—"}
                </div>
                <div>
                  <PaymentStatusBadge status={f?.payment_status ?? null} />
                </div>
                <div>
                  <QualificationBadge qualified={l.status === "qualifiee"} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ------- KANBAN ------- */}
      {view === "Kanban" && (
        <div className="grid items-start gap-3.5 md:grid-cols-2 xl:grid-cols-4">
          {KANBAN_COLUMNS.map((col) => {
            const cards = filtered.filter((l) => l.status === col.status);
            return (
              <div key={col.status} className="rounded-[14px] bg-muted p-2.5">
                <div className="flex items-center gap-2 px-1.5 py-2">
                  <span
                    className="size-[9px] rounded-full"
                    style={{ background: col.dot }}
                  />
                  <span className="text-[13px] font-bold">{col.label}</span>
                  <span className="ml-auto rounded-full bg-white px-2 py-px text-[11.5px] font-bold text-[#9C958D]">
                    {cards.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {cards.length === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      Aucune licence
                    </p>
                  )}
                  {cards.map((l) => (
                    <Link
                      key={l.id}
                      href={`/crm/licencies/${l.id}`}
                      className="block rounded-[11px] border bg-card px-[13px] py-3 transition-all hover:-translate-y-px hover:border-primary"
                    >
                      <div className="flex items-center gap-2.5">
                        <MemberAvatar
                          firstName={l.member.first_name}
                          lastName={l.member.last_name}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-bold">
                            {l.member.first_name}{" "}
                            {l.member.last_name.toUpperCase()}
                          </div>
                          <div className="text-[11px] text-[#9C958D]">
                            {l.club_team?.name ?? shortCategory(l.tariff?.category)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                          {l.financials?.total_due != null
                            ? eur.format(Number(l.financials.total_due))
                            : "—"}
                        </span>
                        <PaymentStatusBadge
                          status={l.financials?.payment_status ?? null}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------- CARTES ------- */}
      {view === "Cartes" && (
        <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
          {filtered.map((l) => {
            const f = l.financials;
            const balance = Number(f?.balance ?? 0);
            const birthYear = l.member.birth_date
              ? new Date(l.member.birth_date).getFullYear()
              : null;
            return (
              <Link
                key={l.id}
                href={`/crm/licencies/${l.id}`}
                className="rounded-[14px] border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_8px_22px_rgba(0,0,0,.07)]"
              >
                <div className="flex items-center gap-3">
                  <MemberAvatar
                    firstName={l.member.first_name}
                    lastName={l.member.last_name}
                    size={44}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-[14.5px] font-bold">
                      {l.member.first_name} {l.member.last_name.toUpperCase()}
                    </div>
                    <div className="text-xs text-[#9C958D]">
                      {l.club_team?.name ?? shortCategory(l.tariff?.category)}
                      {birthYear ? ` · ${birthYear}` : ""}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <PaymentStatusBadge status={f?.payment_status ?? null} />
                  <QualificationBadge qualified={l.status === "qualifiee"} />
                </div>
                <div className="mt-3 grid grid-cols-2 border-t border-muted pt-3">
                  <div>
                    <div className="text-[11px] font-semibold text-[#9C958D]">
                      Dû
                    </div>
                    <div className="text-[13.5px] font-bold tabular-nums">
                      {f?.total_due != null
                        ? eur.format(Number(f.total_due))
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-[#9C958D]">
                      Reste
                    </div>
                    <div
                      className={cn(
                        "text-[13.5px] font-bold tabular-nums",
                        balance > 10 ? "text-destructive" : "text-success"
                      )}
                    >
                      {f?.balance != null ? eur.format(balance) : "—"}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
              Aucun licencié ne correspond aux filtres.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
