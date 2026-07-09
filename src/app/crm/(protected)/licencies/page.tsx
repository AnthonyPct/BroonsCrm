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
    <LicenseesView
      licensees={licensees}
      categories={tariffs.map((t) => t.category)}
    />
  );
}
