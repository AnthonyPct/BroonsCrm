import type { Metadata } from "next";
import { LicenseeForm } from "@/components/crm/licensee-form";
import { getCurrentSeason, getSeasonTariffs } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Nouveau licencié",
};

export default async function NewLicenseePage() {
  const season = await getCurrentSeason();
  if (!season) {
    return <p>Aucune saison active.</p>;
  }
  const tariffs = await getSeasonTariffs(season.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nouveau licencié</h1>
        <p className="text-muted-foreground">
          Saison {season.label} — le tarif est calculé automatiquement.
        </p>
      </div>
      <LicenseeForm season={season} tariffs={tariffs} />
    </div>
  );
}
