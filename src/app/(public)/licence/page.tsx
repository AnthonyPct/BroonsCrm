import type { Metadata } from "next";
import {
  BadgeEuro,
  CalendarClock,
  CheckCircle2,
  FileText,
  Globe,
  HandCoins,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Prendre sa licence",
};

const steps = [
  {
    icon: Globe,
    title: "1. Recevez votre lien Gesthand",
    description:
      "La demande de licence se fait sur Gesthand, la plateforme officielle de la FFHandball. Le club vous envoie un lien personnalisé par email (renouvellement) ou le crée pour vous (nouvelle licence). Pas de lien reçu ? Contactez le bureau.",
  },
  {
    icon: FileText,
    title: "2. Complétez votre dossier en ligne",
    description:
      "Sur Gesthand, remplissez vos informations et déposez les documents demandés : photo d'identité, pièce d'identité, certificat médical (ou questionnaire de santé pour un renouvellement) et autorisation parentale pour les mineurs.",
  },
  {
    icon: HandCoins,
    title: "3. Réglez votre licence",
    description:
      "Le paiement s'effectue en ligne via HelloAsso (possibilité de payer en 3 fois). Le club accepte aussi : chèque, espèces, Pass'Sport, chèques ANCV et CAF Chèques Loisirs — remettez-les directement à un membre du bureau.",
  },
  {
    icon: CheckCircle2,
    title: "4. Votre licence est qualifiée",
    description:
      "Une fois le dossier complet et le paiement reçu, la ligue valide votre licence : vous êtes qualifié·e et pouvez jouer. Vous recevez une confirmation par email de la FFHandball.",
  },
];

export default function LicencePage() {
  return (
    <>
      <section className="bg-[oklch(0.24_0.05_258)] text-white">
        <div className="mx-auto w-full max-w-4xl px-4 py-14">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Prendre sa licence
          </h1>
          <p className="mt-3 max-w-prose text-white/75">
            Tout ce qu&apos;il faut savoir pour s&apos;inscrire ou se
            réinscrire au HBC Pays de Broons, étape par étape.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl space-y-10 px-4 py-12">
        <Card className="border-[oklch(0.78_0.14_75)] bg-[oklch(0.78_0.14_75)]/10">
          <CardHeader className="flex-row items-start gap-4">
            <CalendarClock className="mt-1 size-8 shrink-0 text-[oklch(0.55_0.12_75)]" />
            <div>
              <CardTitle className="text-lg">
                −5 % avant le 10 août !
              </CardTitle>
              <CardDescription className="text-foreground/80">
                Toute licence prise <strong>avant le 10 août</strong>{" "}
                bénéficie d&apos;une réduction de 5 % sur la part Ligue de la
                cotisation. Ne tardez pas : la réduction est appliquée
                automatiquement.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <div>
          <h2 className="mb-6 text-2xl font-bold tracking-tight">
            Les 4 étapes
          </h2>
          <div className="space-y-4">
            {steps.map((step) => (
              <Card key={step.title}>
                <CardHeader className="flex-row items-start gap-4">
                  <step.icon className="mt-1 size-7 shrink-0 text-[oklch(0.55_0.12_258)]" />
                  <div>
                    <CardTitle>{step.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {step.description}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold tracking-tight">
            <BadgeEuro className="size-6" />
            Tarifs saison 2026-2027
          </h2>
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Catégorie</th>
                      <th className="pb-2 text-right font-medium">
                        Tarif licence
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 pr-4">École de hand / −11 ans</td>
                      <td className="py-2 text-right font-semibold">157 €</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 pr-4">
                        12-16 ans (U13, U15, U18 hand à 7)
                      </td>
                      <td className="py-2 text-right font-semibold">175 €</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 pr-4">
                        +16 ans (seniors, U18 senior)
                      </td>
                      <td className="py-2 text-right font-semibold">200 €</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">Dirigeant</td>
                      <td className="py-2 text-right font-semibold">20 €</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Tarifs indicatifs, hors réduction −5 % avant le 10 août. La
                catégorie dépend de l&apos;année de naissance.
              </p>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="mb-6 text-2xl font-bold tracking-tight">
            Moyens de paiement &amp; aides
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">En ligne</CardTitle>
                <CardDescription>
                  Carte bancaire via HelloAsso, avec paiement en 1 ou 3 fois
                  sans frais.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Au club</CardTitle>
                <CardDescription>
                  Chèque (à l&apos;ordre du HBC Pays de Broons) ou espèces,
                  remis à un membre du bureau.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Pass&apos;Sport <Badge variant="secondary">−70 €</Badge>
                </CardTitle>
                <CardDescription>
                  Aide de l&apos;État pour les jeunes éligibles : transmettez
                  votre code Pass&apos;Sport au club, la déduction est faite
                  sur la cotisation.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">ANCV &amp; CAF</CardTitle>
                <CardDescription>
                  Les chèques vacances ANCV et les CAF Chèques Loisirs sont
                  acceptés — remettez-les au bureau avec votre dossier.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        <div>
          <h2 className="mb-6 text-2xl font-bold tracking-tight">
            Dates clés
          </h2>
          <Card>
            <CardContent className="pt-6">
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-3">
                  <Badge className="bg-[oklch(0.78_0.14_75)] text-[oklch(0.22_0.05_258)]">
                    Juin
                  </Badge>
                  Ouverture des inscriptions et renouvellements
                </li>
                <li className="flex items-center gap-3">
                  <Badge className="bg-[oklch(0.78_0.14_75)] text-[oklch(0.22_0.05_258)]">
                    10 août
                  </Badge>
                  Fin de la réduction −5 % sur la part Ligue
                </li>
                <li className="flex items-center gap-3">
                  <Badge className="bg-[oklch(0.78_0.14_75)] text-[oklch(0.22_0.05_258)]">
                    Septembre
                  </Badge>
                  Reprise des entraînements et premiers matchs
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
