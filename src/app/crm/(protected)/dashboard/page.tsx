import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  Landmark,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CategoryBarChart,
  PaymentSourceBarChart,
  RegistrationsLineChart,
} from "@/components/crm/dashboard-charts";
import { eur, PAYMENT_SOURCE_LABELS } from "@/lib/format";
import { getCurrentSeason, getSeasonLicensees } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const season = await getCurrentSeason();
  if (!season) {
    return <p>Aucune saison active.</p>;
  }

  const supabase = await createClient();
  const [licensees, { data: paymentsRaw }] = await Promise.all([
    getSeasonLicensees(season.id),
    supabase
      .from("payments")
      .select("source, amount, license_id, licenses!inner(season_id)")
      .eq("licenses.season_id", season.id),
  ]);

  const withTariff = licensees.filter((l) => l.financials?.total_due != null);
  const dueLeague = withTariff.reduce(
    (sum, l) => sum + Number(l.financials!.due_league ?? 0),
    0
  );
  const totalPaid = withTariff.reduce(
    (sum, l) => sum + Number(l.financials!.total_paid ?? 0),
    0
  );
  const toCollect = withTariff.reduce((sum, l) => {
    const b = Number(l.financials!.balance ?? 0);
    return sum + (b > 0 ? b : 0);
  }, 0);
  const unpaidCount = withTariff.filter(
    (l) => l.financials!.payment_status !== "payee"
  ).length;
  const qualifiedCount = licensees.filter(
    (l) => l.status === "qualifiee"
  ).length;

  // Répartition par catégorie
  const byCategory = new Map<string, number>();
  for (const l of licensees) {
    const cat = l.tariff?.category ?? "Sans tarif";
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + 1);
  }
  const categoryData = [...byCategory.entries()].map(([category, count]) => ({
    category,
    count,
  }));

  // Encaissé par moyen
  const bySource = new Map<string, number>();
  for (const p of paymentsRaw ?? []) {
    bySource.set(p.source, (bySource.get(p.source) ?? 0) + Number(p.amount));
  }
  const sourceData = [...bySource.entries()]
    .map(([source, total]) => ({
      source: PAYMENT_SOURCE_LABELS[source] ?? source,
      total: Math.round(total * 100) / 100,
    }))
    .sort((a, b) => b.total - a.total);

  // Courbe cumulée des inscriptions par semaine
  const dates = licensees
    .map((l) => l.registered_at)
    .sort((a, b) => a.localeCompare(b));
  const byWeek = new Map<string, number>();
  for (const d of dates) {
    const date = new Date(d);
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

  const kpis = [
    {
      label: "Dû à la ligue / fédé",
      value: eur.format(dueLeague),
      hint: "Parts Fédé + Ligue (réduction incluse)",
      icon: Landmark,
    },
    {
      label: "À récupérer",
      value: eur.format(toCollect),
      hint: `${unpaidCount} licence(s) non soldée(s)`,
      icon: AlertTriangle,
      alert: toCollect > 0,
    },
    {
      label: "Déjà encaissé",
      value: eur.format(totalPaid),
      hint: "Tous moyens de paiement",
      icon: Banknote,
    },
    {
      label: "Licences",
      value: String(licensees.length),
      hint: `${qualifiedCount} qualifiée(s)`,
      icon: Users,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Saison {season.label} — situation financière en temps réel
          </p>
        </div>
        <Link
          href="/crm/licencies?paiement=impaye"
          className="text-sm text-muted-foreground hover:underline"
        >
          Voir les impayés →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="gap-2">
            <CardHeader className="pb-0">
              <CardDescription className="flex items-center gap-2">
                <kpi.icon className="size-4" />
                {kpi.label}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`text-3xl font-bold tabular-nums ${
                  kpi.alert ? "text-orange-600" : ""
                }`}
              >
                {kpi.value}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{kpi.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Licences par catégorie
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length ? (
              <CategoryBarChart data={categoryData} />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Aucune licence pour le moment.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Encaissé par moyen de paiement
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sourceData.length ? (
              <PaymentSourceBarChart data={sourceData} />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Aucun paiement pour le moment.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Inscriptions cumulées sur la saison
          </CardTitle>
          <CardDescription>
            <BadgeCheck className="mr-1 inline size-4 align-text-bottom" />
            Réduction −5 % sur la part Ligue jusqu&apos;au{" "}
            {new Date(season.discount_deadline).toLocaleDateString("fr-FR")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {registrationData.length ? (
            <RegistrationsLineChart data={registrationData} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Les inscriptions apparaîtront ici.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
