import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { LicenseeForm } from "@/components/crm/licensee-form";
import {
  getCurrentSeason,
  getSeasonTariffs,
  getSeasonTeams,
} from "@/lib/queries";

export const metadata: Metadata = {
  title: "Nouveau licencié",
};

export default async function NewLicenseePage() {
  const season = await getCurrentSeason();
  if (!season) {
    return <p>Aucune saison active.</p>;
  }
  const [tariffs, teams] = await Promise.all([
    getSeasonTariffs(season.id),
    getSeasonTeams(season.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href="/crm/licencies"
        className="flex w-fit items-center gap-1.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-primary"
      >
        <ChevronLeft className="size-4" />
        Retour à la liste
      </Link>
      <LicenseeForm season={season} tariffs={tariffs} teams={teams} />
    </div>
  );
}
