import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { RegistrationsChart } from "@/components/crm/dashboard-charts";
import { eur } from "@/lib/format";
import { getCurrentSeason, getSeasonLicensees } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Tableau de bord",
};

const CATEGORY_COLORS: [RegExp, string][] = [
  [/école|ecole|-11/i, "#C8791A"],
  [/12-16|jeunes|u13/i, "#D81E34"],
  [/\+16|senior/i, "#17130F"],
  [/dirigeant/i, "#9C958D"],
];

function categoryColor(category: string, index: number): string {
  const found = CATEGORY_COLORS.find(([re]) => re.test(category));
  return found?.[1] ?? ["#C8791A", "#D81E34", "#17130F", "#9C958D"][index % 4];
}

export default async function DashboardPage() {
  const season = await getCurrentSeason();
  if (!season) return <p>Aucune saison active.</p>;

  const supabase = await createClient();
  const [licensees, { count: pendingCount }] = await Promise.all([
    getSeasonLicensees(season.id),
    supabase
      .from("helloasso_orders")
      .select("id", { count: "exact", head: true })
      .eq("match_status", "pending"),
  ]);

  const withTariff = licensees.filter((l) => l.financials?.total_due != null);
  const settled = withTariff.filter(
    (l) => l.financials!.payment_status === "payee"
  ).length;
  const partial = withTariff.filter(
    (l) => l.financials!.payment_status === "partielle"
  ).length;
  const notStarted = withTariff.length - settled - partial;
  const total = withTariff.length || 1;
  const pct = Math.round((settled / total) * 100);

  const totalPaid = withTariff.reduce(
    (sum, l) => sum + Number(l.financials!.total_paid ?? 0),
    0
  );
  const toCollect = withTariff.reduce((sum, l) => {
    const b = Number(l.financials!.balance ?? 0);
    return sum + (b > 0 ? b : 0);
  }, 0);
  const remainingCount = withTariff.filter(
    (l) => Number(l.financials!.balance ?? 0) > 0
  ).length;
  const dueLeague = withTariff.reduce(
    (sum, l) => sum + Number(l.financials!.due_league ?? 0),
    0
  );

  // Répartition par catégorie
  const byCategory = new Map<string, number>();
  for (const l of licensees) {
    const cat = l.tariff?.category ?? "Sans tarif";
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + 1);
  }
  const categoryData = [...byCategory.entries()];
  const maxCat = Math.max(1, ...categoryData.map(([, n]) => n));

  // Courbe cumulée des inscriptions par semaine
  const byWeek = new Map<string, number>();
  for (const l of licensees) {
    const date = new Date(l.registered_at);
    const monday = new Date(date);
    monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    const key = monday.toISOString().slice(0, 10);
    byWeek.set(key, (byWeek.get(key) ?? 0) + 1);
  }
  const sortedWeeks = [...byWeek.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  );
  const registrationData = sortedWeeks.map(([week], i) => ({
    week: new Date(week).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
    }),
    cumul: sortedWeeks
      .slice(0, i + 1)
      .reduce((sum, [, count]) => sum + count, 0),
  }));

  const segments = [
    { label: "Réglées", count: settled, color: "#1F8A5B" },
    { label: "En cours", count: partial, color: "#E0972B" },
    { label: "Pas commencé", count: notStarted, color: "#C6303B" },
  ];

  const moneyKpis = [
    {
      label: "Déjà encaissé",
      value: eur.format(totalPaid),
      hint: "tous moyens de paiement confondus",
    },
    {
      label: "Reste à récupérer",
      value: eur.format(toCollect),
      hint: `${remainingCount} licence(s) avec un reste à charge`,
      red: toCollect > 0,
    },
    {
      label: "Dû à la ligue / fédé",
      value: eur.format(dueLeague),
      hint: "part Fédé + part Ligue (−5 % avant le 10/08)",
    },
  ];

  return (
    <div className="mx-auto max-w-[1180px] space-y-[18px]">
      {/* rangée hero */}
      <div className="grid gap-[18px] lg:grid-cols-[1.55fr_1fr]">
        <div className="rounded-2xl border bg-card px-6 py-[22px] shadow-[0_1px_2px_rgba(0,0,0,.03)]">
          <div className="micro-label">Progression des paiements</div>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div className="font-display text-[30px] font-extrabold tracking-[-.02em]">
              {settled}{" "}
              <span className="text-base font-semibold text-[#9C958D]">
                / {withTariff.length} licences réglées
              </span>
            </div>
            <div className="font-display text-[30px] font-extrabold text-success">
              {pct}%
            </div>
          </div>
          <div className="mt-3 flex h-4 overflow-hidden rounded-full bg-muted">
            {segments.map((s) => (
              <div
                key={s.label}
                className="h-full transition-all duration-500"
                style={{
                  width: `${(s.count / total) * 100}%`,
                  background: s.color,
                }}
              />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {segments.map((s) => (
              <div key={s.label}>
                <div className="flex items-center gap-2 text-[12.5px] font-semibold text-muted-foreground">
                  <span
                    className="size-2.5 rounded-[3px]"
                    style={{ background: s.color }}
                  />
                  {s.label}
                </div>
                <div className="mt-1 font-display text-[22px] font-bold">
                  {s.count}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Link
          href="/crm/reconciliation"
          className="group rounded-2xl border border-[#17130F] bg-gradient-to-br from-[#17130F] to-[#2a211a] px-6 py-[22px] text-[#F5F3EF] shadow-[0_6px_20px_rgba(23,19,15,.18)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_26px_rgba(23,19,15,.26)]"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-[10px] bg-[rgba(216,30,52,.16)]">
              <AlertTriangle className="size-[18px] text-[#ff5a6e]" />
            </span>
            <span className="text-[11.5px] font-bold uppercase tracking-[.05em] text-[#c9c1b6]">
              File d&apos;arbitrage
            </span>
          </div>
          <div className="mt-2 font-display text-[52px] font-extrabold leading-none tracking-[-.03em]">
            {pendingCount ?? 0}
          </div>
          <div className="mt-2 text-[13.5px] text-[#c9c1b6]">
            commandes HelloAsso à rapprocher manuellement
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[13px] font-bold text-[#ff8a97]">
            Traiter la file
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>
      </div>

      {/* money KPIs */}
      <div className="grid gap-[18px] sm:grid-cols-3">
        {moneyKpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border bg-card px-[22px] py-5 shadow-[0_1px_2px_rgba(0,0,0,.03)]"
          >
            <div className="micro-label">{kpi.label}</div>
            <div
              className={`mt-1.5 font-display text-[28px] font-extrabold tabular-nums tracking-[-.02em] ${
                kpi.red ? "text-destructive" : ""
              }`}
            >
              {kpi.value}
            </div>
            <div className="mt-1 text-[12.5px] font-medium text-muted-foreground">
              {kpi.hint}
            </div>
          </div>
        ))}
      </div>

      {/* charts */}
      <div className="grid gap-[18px] lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl border bg-card px-6 py-[22px] shadow-[0_1px_2px_rgba(0,0,0,.03)]">
          <div className="micro-label">Inscriptions sur la saison</div>
          <div className="mt-3">
            {registrationData.length ? (
              <RegistrationsChart data={registrationData} />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Les inscriptions apparaîtront ici.
              </p>
            )}
          </div>
        </div>
        <div className="rounded-2xl border bg-card px-6 py-[22px] shadow-[0_1px_2px_rgba(0,0,0,.03)]">
          <div className="micro-label">Répartition par catégorie</div>
          <div className="mt-5 space-y-4">
            {categoryData.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aucune licence pour le moment.
              </p>
            )}
            {categoryData.map(([category, count], i) => (
              <div key={category}>
                <div className="mb-1.5 flex items-center justify-between text-[13px]">
                  <span className="font-semibold">{category}</span>
                  <span className="font-bold text-muted-foreground">
                    {count}
                  </span>
                </div>
                <div className="h-[9px] overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(count / maxCat) * 100}%`,
                      background: categoryColor(category, i),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
