import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";

const HORAIRES = [
  {
    cat: "École",
    jours: "Mercredi",
    heure: "14h00 – 15h30",
    tag: "bg-warning-bg text-warning-icon",
  },
  {
    cat: "U11 · U13",
    jours: "Mercredi & vendredi",
    heure: "15h30 – 17h00",
    tag: "bg-accent text-primary",
  },
  {
    cat: "U15 · U18",
    jours: "Mardi & jeudi",
    heure: "18h30 – 20h00",
    tag: "bg-accent text-primary",
  },
  {
    cat: "Séniors",
    jours: "Mardi & jeudi",
    heure: "20h00 – 22h00",
    tag: "bg-[#17130F] text-white",
  },
];

const STATS = [
  { value: "140+", label: "licenciés", red: true },
  { value: "8", label: "équipes engagées" },
  { value: "dès 7", label: "ans (école de hand)" },
  { value: "1978", label: "année de création" },
];

export default function HomePage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-[#17130F] text-white">
        <div
          className="pointer-events-none absolute -right-40 -top-30 size-[620px] rounded-full border-[60px] border-[rgba(216,30,52,.16)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute right-10 top-14 size-[380px] rounded-full border-[34px] border-[rgba(216,30,52,.32)]"
          aria-hidden
        />
        <div className="relative mx-auto grid w-full max-w-[1160px] items-center gap-10 px-7 pb-[104px] pt-24 md:grid-cols-[1.15fr_.85fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-[7px] text-[12.5px] font-bold tracking-[.02em] text-[#f0b9c1]">
              <span className="size-[7px] rounded-full bg-primary" />
              Saison 2026 – 2027 · Inscriptions ouvertes
            </div>
            <h1 className="mt-[22px] font-display text-[42px] font-black leading-[1.02] tracking-[-.03em] sm:text-[60px]">
              Le hand,
              <br />
              <span className="text-[#ff4258]">on le vit ensemble.</span>
            </h1>
            <p className="mt-[22px] max-w-[480px] text-[17px] font-medium leading-relaxed text-[#d8d1c6]">
              Un club familial au cœur du Pays de Broons. De l&apos;école de
              hand aux séniors, on joue, on progresse et on partage — quel que
              soit ton niveau.
            </p>
            <div className="mt-[34px] flex flex-wrap gap-[13px]">
              <Link
                href="/licence"
                className="flex items-center gap-2 rounded-[11px] bg-primary px-[26px] py-[15px] text-[15px] font-bold text-white shadow-[0_6px_20px_rgba(216,30,52,.4)] transition-all hover:-translate-y-px hover:bg-[#e83049]"
              >
                Prendre sa licence
                <ArrowRight className="size-[18px]" strokeWidth={2.4} />
              </Link>
              <Link
                href="#equipes"
                className="flex items-center rounded-[11px] border border-white/20 bg-white/5 px-[26px] py-[15px] text-[15px] font-bold text-white transition-colors hover:bg-white/15"
              >
                Découvrir les équipes
              </Link>
            </div>
          </div>
          <div className="hidden items-center justify-center md:flex">
            <div className="relative size-[280px]">
              <div className="absolute inset-0 animate-[spin_40s_linear_infinite] rounded-full border-2 border-dashed border-white/15" />
              <div className="absolute inset-[26px] flex items-center justify-center rounded-full bg-gradient-to-br from-[#D81E34] to-[#8f0f20] shadow-[0_20px_50px_rgba(216,30,52,.45)]">
                <div className="flex size-[150px] items-center justify-center overflow-hidden rounded-[20px] bg-white">
                  <Image
                    src="/logo.png"
                    alt="HBC Pays de Broons"
                    width={132}
                    height={132}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* stat strip */}
        <div className="relative border-t border-white/10">
          <div className="mx-auto grid w-full max-w-[1160px] grid-cols-2 px-7 sm:grid-cols-4">
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className={`px-2 py-6 ${i < STATS.length - 1 ? "sm:border-r sm:border-white/10" : ""}`}
              >
                <div
                  className={`font-display text-[30px] font-extrabold ${s.red ? "text-[#ff4258]" : "text-white"}`}
                >
                  {s.value}
                </div>
                <div className="mt-[3px] text-[12.5px] font-semibold text-[#c9c1b6]">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ÉQUIPES */}
      <section
        id="equipes"
        className="mx-auto w-full max-w-[1160px] scroll-mt-20 px-7 pb-10 pt-[88px]"
      >
        <div className="mx-auto mb-11 max-w-[600px] text-center">
          <div className="text-[12.5px] font-extrabold uppercase tracking-[.1em] text-primary">
            Nos équipes
          </div>
          <h2 className="mt-3 font-display text-[38px] font-extrabold tracking-[-.02em]">
            Une place pour chacun
          </h2>
          <p className="mt-3.5 text-[15.5px] leading-relaxed text-muted-foreground">
            De la découverte à la compétition, trouve la catégorie qui te
            correspond.
          </p>
        </div>
        <div className="grid gap-[22px] md:grid-cols-3">
          <div className="rounded-[18px] border bg-card p-7 shadow-[0_1px_3px_rgba(0,0,0,.04)] transition-all hover:-translate-y-[3px] hover:shadow-[0_14px_30px_rgba(0,0,0,.08)]">
            <div className="flex size-[52px] items-center justify-center rounded-[14px] bg-warning-bg font-display text-xl font-extrabold text-warning-icon">
              EH
            </div>
            <h3 className="mt-[18px] font-display text-[21px] font-extrabold">
              École de hand
            </h3>
            <div className="mt-[5px] text-[12.5px] font-bold text-warning-icon">
              2016 – 2019 · dès 7 ans
            </div>
            <p className="mt-3.5 text-sm leading-relaxed text-muted-foreground">
              Le hand par le jeu : motricité, coordination et premiers gestes
              dans une ambiance douce et ludique. À partir de 7 ans.
            </p>
          </div>
          <div className="rounded-[18px] border bg-card p-7 shadow-[0_1px_3px_rgba(0,0,0,.04)] transition-all hover:-translate-y-[3px] hover:shadow-[0_14px_30px_rgba(0,0,0,.08)]">
            <div className="flex size-[52px] items-center justify-center rounded-[14px] bg-accent font-display text-lg font-extrabold text-primary">
              U13
            </div>
            <h3 className="mt-[18px] font-display text-[21px] font-extrabold">
              Jeunes
            </h3>
            <div className="mt-[5px] text-[12.5px] font-bold text-primary">
              U11 · U13 · U15 · U18
            </div>
            <p className="mt-3.5 text-sm leading-relaxed text-muted-foreground">
              On apprend les fondamentaux, on joue le championnat départemental
              et régional, filles et garçons.
            </p>
          </div>
          <div className="rounded-[18px] border bg-card p-7 shadow-[0_1px_3px_rgba(0,0,0,.04)] transition-all hover:-translate-y-[3px] hover:shadow-[0_14px_30px_rgba(0,0,0,.08)]">
            <div className="flex size-[52px] items-center justify-center rounded-[14px] bg-[#17130F] font-display text-base font-extrabold text-white">
              SM<span className="text-[#ff4258]">SF</span>
            </div>
            <h3 className="mt-[18px] font-display text-[21px] font-extrabold">
              Séniors &amp; loisir
            </h3>
            <div className="mt-[5px] text-[12.5px] font-bold text-[#17130F]">
              2010 et avant
            </div>
            <p className="mt-3.5 text-sm leading-relaxed text-muted-foreground">
              Équipes masculines et féminines en compétition, plus une section
              loisir pour jouer sans pression.
            </p>
          </div>
        </div>
      </section>

      {/* INFOS */}
      <section
        id="infos"
        className="mx-auto w-full max-w-[1160px] scroll-mt-20 px-7 pb-10 pt-[52px]"
      >
        <div className="grid items-stretch gap-[22px] md:grid-cols-[1.3fr_1fr]">
          <div className="rounded-[18px] border bg-card p-[30px] shadow-[0_1px_3px_rgba(0,0,0,.04)]">
            <div className="text-[12.5px] font-extrabold uppercase tracking-[.08em] text-primary">
              Entraînements
            </div>
            <h2 className="mt-2 font-display text-[26px] font-extrabold">
              Créneaux de la semaine
            </h2>
            <div className="mt-[22px] flex flex-col">
              {HORAIRES.map((h) => (
                <div
                  key={h.cat}
                  className="flex items-center gap-4 border-b border-muted py-3.5"
                >
                  <span
                    className={`min-w-[82px] flex-none rounded-lg px-2.5 py-1.5 text-center text-[11.5px] font-extrabold ${h.tag}`}
                  >
                    {h.cat}
                  </span>
                  <span className="flex-1 text-sm font-semibold text-[#3d3a35]">
                    {h.jours}
                  </span>
                  <span className="text-sm font-bold tabular-nums">
                    {h.heure}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 text-xs italic text-[#9C958D]">
              Créneaux indicatifs — à confirmer chaque saison.
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[18px] bg-gradient-to-br from-[#D81E34] to-[#8f0f20] p-[30px] text-white">
            <div
              className="absolute -bottom-[70px] -right-[70px] size-[220px] rounded-full border-[34px] border-white/10"
              aria-hidden
            />
            <div className="relative">
              <div className="flex size-12 items-center justify-center rounded-[13px] bg-white/15">
                <MapPin className="size-6" strokeWidth={2.2} />
              </div>
              <h2 className="mt-5 font-display text-2xl font-extrabold leading-tight">
                Salle du Chalet
                <br />à Broons
              </h2>
              <p className="mt-3 text-sm font-medium leading-relaxed text-[#ffd9de]">
                Rue du Stade
                <br />
                22250 Broons
              </p>
              <Link
                href="#contact"
                className="mt-[22px] inline-flex items-center gap-[7px] rounded-[10px] bg-white px-[18px] py-[11px] text-[13.5px] font-bold text-[#B0122A] transition-colors hover:bg-[#fff5f6]"
              >
                Nous trouver &amp; nous joindre
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PARTENAIRES */}
      <section className="mx-auto w-full max-w-[1160px] px-7 pb-10 pt-[52px]">
        <div className="mb-[30px] text-center">
          <div className="text-[12.5px] font-extrabold uppercase tracking-[.1em] text-primary">
            Ils nous soutiennent
          </div>
          <h2 className="mt-2.5 font-display text-[28px] font-extrabold tracking-[-.01em]">
            Nos partenaires
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { file: "caisse-epargne.png", name: "Caisse d'Épargne" },
            { file: "groupama.png", name: "Groupama" },
            { file: "intermarche.png", name: "Intermarché" },
            { file: "france-barnums.png", name: "FranceBarnums.com" },
            { file: "lechevestrier.png", name: "Lechevestrier" },
            { file: "icexpertise.png", name: "ICExpertise" },
            { file: "terre-et-vins.png", name: "Terre & Vins" },
          ].map((p) => (
            <div
              key={p.file}
              title={p.name}
              className="flex aspect-[8/3] items-center justify-center rounded-xl border bg-card p-3 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(0,0,0,.07)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/partenaires/${p.file}`}
                alt={p.name}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ))}
        </div>
        <div className="mt-[22px] text-center text-[13px] text-muted-foreground">
          Envie de soutenir le club ?{" "}
          <Link href="#contact" className="font-bold text-primary hover:text-[#B0122A]">
            Devenez partenaire →
          </Link>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="mt-12 scroll-mt-20 bg-[#17130F] text-white">
        <div className="mx-auto grid w-full max-w-[1160px] items-center gap-11 px-7 py-[72px] md:grid-cols-2">
          <div>
            <div className="text-[12.5px] font-extrabold uppercase tracking-[.1em] text-[#ff4258]">
              Contact
            </div>
            <h2 className="mt-3 font-display text-[34px] font-extrabold tracking-[-.02em]">
              Une question ? On est là.
            </h2>
            <p className="mt-4 max-w-[400px] text-[15px] leading-relaxed text-[#d8d1c6]">
              Le bureau répond aux familles pour les licences, les créneaux et
              la vie du club.
            </p>
          </div>
          <div className="flex flex-col gap-px overflow-hidden rounded-2xl bg-white/10">
            {[
              {
                icon: Mail,
                label: "Email",
                value: "5322002@handball-bretagne.fr",
              },
              { icon: Phone, label: "Téléphone", value: "06 83 36 94 25" },
              {
                icon: MapPin,
                label: "Adresse",
                value: "Salle du Chalet, rue du Stade, 22250 Broons",
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center gap-3.5 bg-[#1f1a15] px-[22px] py-5"
              >
                <row.icon className="size-5 text-[#ff4258]" strokeWidth={2} />
                <div>
                  <div className="text-[11.5px] font-semibold text-[#9C958D]">
                    {row.label}
                  </div>
                  <div className="mt-0.5 text-[14.5px] font-bold">
                    {row.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
