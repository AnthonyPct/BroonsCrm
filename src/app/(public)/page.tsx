import Link from "next/link";
import { ArrowRight, CalendarDays, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomePage() {
  return (
    <>
      <section className="bg-[oklch(0.24_0.05_258)] text-white">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-20 md:grid-cols-2 md:items-center">
          <div className="space-y-6">
            <p className="inline-block rounded-full bg-[oklch(0.78_0.14_75)]/15 px-4 py-1 text-sm font-semibold text-[oklch(0.85_0.12_80)]">
              Saison 2026-2027 — inscriptions ouvertes
            </p>
            <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl">
              Le handball pour tous,
              <br />
              au cœur du Pays de Broons
            </h1>
            <p className="max-w-prose text-lg text-white/75">
              De l&apos;école de hand aux seniors, le HBC Pays de Broons
              accueille tous les joueurs et joueuses dans une ambiance
              familiale et sportive.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="bg-[oklch(0.78_0.14_75)] font-semibold text-[oklch(0.22_0.05_258)] hover:bg-[oklch(0.72_0.14_75)]"
              >
                <Link href="/licence">
                  Prendre sa licence
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <a
                  href="https://www.ffhandball.fr/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Le club sur FFHandball
                </a>
              </Button>
            </div>
          </div>
          <div className="hidden justify-center md:flex">
            <div className="flex size-64 items-center justify-center rounded-full border-8 border-[oklch(0.78_0.14_75)] bg-white/5 text-center">
              <div>
                <div className="text-6xl font-black text-[oklch(0.78_0.14_75)]">
                  HBC
                </div>
                <div className="mt-1 text-sm font-semibold uppercase tracking-widest text-white/70">
                  Pays de Broons
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <h2 className="mb-8 text-2xl font-bold tracking-tight">
          Le club en bref
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <Users className="size-8 text-[oklch(0.55_0.12_258)]" />
              <CardTitle>Toutes les catégories</CardTitle>
              <CardDescription>
                École de hand, jeunes (U11 à U18), seniors masculins et
                féminines, dirigeants : il y a une place pour chacun.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Trophy className="size-8 text-[oklch(0.55_0.12_258)]" />
              <CardTitle>Compétition &amp; loisir</CardTitle>
              <CardDescription>
                Des équipes engagées en championnat départemental et régional,
                et une pratique loisir ouverte à tous les niveaux.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CalendarDays className="size-8 text-[oklch(0.55_0.12_258)]" />
              <CardTitle>Entraînements toute la saison</CardTitle>
              <CardDescription>
                Entraînements en semaine à la salle des sports de Broons,
                matchs le week-end. Planning communiqué en début de saison.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section className="border-y bg-muted/50">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 py-14 text-center">
          <h2 className="text-2xl font-bold tracking-tight">
            Prêt·e à rejoindre le club ?
          </h2>
          <p className="max-w-xl text-muted-foreground">
            La demande de licence se fait en ligne via Gesthand et le paiement
            via HelloAsso. Suivez notre tutoriel pas à pas — et profitez de la
            réduction si vous vous inscrivez avant le 10 août.
          </p>
          <Button asChild size="lg">
            <Link href="/licence">
              Voir le tutoriel licence
              <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <h2 className="mb-8 text-2xl font-bold tracking-tight">Contact</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Nous trouver</CardTitle>
              <CardDescription>
                Salle des sports — 22250 Broons, Côtes-d&apos;Armor
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Nous écrire</CardTitle>
              <CardDescription>
                Contactez le bureau via la page Facebook du club ou lors des
                permanences à la salle en début de saison.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>
    </>
  );
}
