import type { Metadata } from "next";
import { LicenseesView } from "@/components/crm/licensees-view";
import {
  getCurrentSeason,
  getSeasonLicensees,
  getSeasonTariffs,
} from "@/lib/queries";

export const metadata: Metadata = {
  title: "Licenciés",
};

export default async function LicenseesPage() {
  const season = await getCurrentSeason();
  if (!season) {
    return <p>Aucune saison active. Créez une saison dans les paramètres.</p>;
  }
  const [licensees, tariffs] = await Promise.all([
    getSeasonLicensees(season.id),
    getSeasonTariffs(season.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Licenciés</h1>
        <p className="text-muted-foreground">
          Saison {season.label} — {licensees.length} licence
          {licensees.length > 1 ? "s" : ""}
        </p>
      </div>
      <LicenseesView
        licensees={licensees}
        categories={tariffs.map((t) => t.category)}
      />
    </div>
  );
}
