import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImportTool } from "@/components/crm/import-tool";
import { getCurrentSeason } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Début de saison",
};

export default async function SeasonPage() {
  const season = await getCurrentSeason();
  if (!season) return <p>Aucune saison active.</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Début de saison — {season.label}
        </h1>
        <p className="text-muted-foreground">
          Importez l&apos;extract Gesthand de la saison passée pour
          pré-remplir les renouvellements : catégorie et tarif sont calculés
          automatiquement depuis l&apos;année de naissance.
        </p>
      </div>

      <ImportTool seasonId={season.id} />

      <Card>
        <CardHeader>
          <CardTitle>Comment ça marche ?</CardTitle>
          <CardDescription>Le déroulé conseillé en 4 étapes.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
            <li>
              Exportez la liste des licenciés de la saison passée depuis
              Gesthand (nom, prénom, date de naissance).
            </li>
            <li>
              Importez le fichier ci-dessus : chaque licencié est créé avec le
              statut « À saisir » et son tarif pré-calculé.
            </li>
            <li>
              Au fil des paiements HelloAsso, les licences passent
              automatiquement en « Payée » (réconciliation).
            </li>
            <li>
              Cochez « Qualifiée » sur la fiche du licencié quand la ligue
              valide la licence dans Gesthand.
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
