import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TariffEditor } from "@/components/crm/tariff-editor";
import { saveSeasonSettings } from "@/app/actions/parametres";
import { getCurrentSeason, getSeasonTariffs } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Grille tarifaire",
};

export default async function TariffsPage() {
  const season = await getCurrentSeason();
  if (!season) return <p>Aucune saison active.</p>;
  const tariffs = await getSeasonTariffs(season.id);

  const saveSeason = saveSeasonSettings.bind(null, season.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Grille tarifaire — {season.label}
        </h1>
        <p className="text-muted-foreground">
          Prix = part Fédé + part Ligue + part Club. La catégorie est
          déterminée par l&apos;année de naissance (bornes incluses). Une
          catégorie sans bornes (ex. Dirigeant) se choisit manuellement.
        </p>
      </div>

      <TariffEditor seasonId={season.id} tariffs={tariffs} />

      <Card>
        <CardHeader>
          <CardTitle>Réduction anticipée</CardTitle>
          <CardDescription>
            La réduction s&apos;applique automatiquement sur la part Ligue de
            toute licence prise au plus tard à la date limite.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={saveSeason}
            className="flex flex-wrap items-end gap-4"
          >
            <div className="space-y-2">
              <Label htmlFor="discount_deadline">Date limite</Label>
              <Input
                id="discount_deadline"
                name="discount_deadline"
                type="date"
                defaultValue={season.discount_deadline}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount_rate">Réduction (%)</Label>
              <Input
                id="discount_rate"
                name="discount_rate"
                type="number"
                step="0.1"
                min="0"
                max="100"
                className="w-28"
                defaultValue={Number(season.discount_rate) * 100}
                required
              />
            </div>
            <Button type="submit">Enregistrer</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
