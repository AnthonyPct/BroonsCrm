import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ExternalLink,
  Percent,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Prendre sa licence",
};

type Etape = {
  num: number;
  titre: string;
  texte: string;
  chips?: string[];
  link?: { href: string; label: string; external?: boolean };
  last?: boolean;
};

const ETAPES: Etape[] = [
  {
    num: 1,
    titre: "Vérifiez vos mails !",
    texte:
      "Vous avez normalement reçu un mail de la part de Gesthand pour refaire votre licence. Si ce n'est pas le cas, ou si le lien a expiré, contactez-nous !",
    link: { href: "/#contact", label: "Contactez-nous" },
  },
  {
    num: 2,
    titre: "Complétez le formulaire Gesthand",
    texte:
      "Cliquez sur le lien Gesthand reçu par mail, puis complétez le formulaire en étant attentif à chaque champ. Les pièces se déposent directement dans Gesthand, qui reste la référence pour la conformité du dossier. Prévoyez :",
    chips: [
      "Photo d'identité",
      "Certificat médical ou questionnaire de santé",
      "Pièce d'identité",
      "Autorisation parentale (mineurs)",
    ],
  },
  {
    num: 3,
    titre: "Mode de paiement & attestation d'honorabilité",
    texte:
      "Dans le formulaire, choisissez votre mode de paiement et indiquez vos réductions si vous y avez droit (Pass'Sport, CAF, ANCV…). Signez, et remplissez l'attestation d'honorabilité — elle est indispensable pour valider le dossier.",
    chips: [
      "Pass'Sport",
      "CAF Chèque Loisirs",
      "ANCV Coupon Sport",
      "Chèque",
      "Espèces",
    ],
  },
  {
    num: 4,
    titre: "Payez votre licence sur HelloAsso",
    texte:
      "Une fois la licence validée sur Gesthand, vous recevrez un mail pour la payer en ligne sur HelloAsso (règlement en plusieurs fois possible). Attention : la licence n'est valable qu'après le paiement.",
  },
  {
    num: 5,
    titre: "Validation & qualification",
    texte:
      "Une fois le dossier complet et le paiement effectué, la Fédération qualifie la licence : le licencié peut jouer et s'entraîner officiellement. Le club vous tient informé.",
    last: true,
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Combien coûte la licence ?",
    a: "Le tarif dépend de la catégorie (déterminée par l'année de naissance) : environ 157 € pour l'école de hand et les -11 ans, 175 € pour les 12-16 ans et 200 € pour les +16 ans. Et −5 % sur la part Ligue pour toute licence prise avant le 10 août !",
  },
  {
    q: "Peut-on payer en plusieurs fois ?",
    a: "Oui — le paiement en ligne sur HelloAsso propose le règlement en 3 fois sans frais, directement au moment de payer.",
  },
  {
    q: "Comment utiliser le Pass'Sport, les chèques CAF ou ANCV ?",
    a: "Indiquez votre réduction dans le formulaire Gesthand (étape 3) ou transmettez votre code Pass'Sport au bureau : la déduction est faite sur la cotisation. Les CAF Chèques Loisirs et les chèques vacances ANCV se remettent directement à un membre du bureau.",
  },
  {
    q: "Le certificat médical est-il obligatoire ?",
    a: "Pour un renouvellement, un simple questionnaire de santé suffit dans la plupart des cas. Pour une première licence (ou si le questionnaire l'exige), un certificat médical de moins de 6 mois est demandé — tout se dépose dans Gesthand.",
  },
  {
    q: "Peut-on essayer avant de s'inscrire ?",
    a: "Bien sûr ! La première séance d'essai est gratuite et sans engagement : venez avec vos baskets au créneau de votre catégorie (voir les horaires sur la page d'accueil).",
  },
  {
    q: "Je viens d'un autre club : comment se passe la mutation ?",
    a: "La mutation se fait via Gesthand entre les deux clubs. Contactez le bureau avant de lancer la démarche : on s'occupe du dossier avec vous (des frais de mutation fédéraux peuvent s'appliquer selon l'âge).",
  },
  {
    q: "Quand puis-je commencer à jouer ?",
    a: "Dès que la licence est qualifiée par la Fédération, c'est-à-dire une fois le dossier Gesthand complet et le paiement effectué. Le club vous tient informé — en attendant, l'entraînement d'essai reste possible.",
  },
];

export default function LicencePage() {
  return (
    <>
      {/* header band */}
      <section className="relative overflow-hidden bg-[#17130F] text-white">
        <div
          className="absolute -right-[120px] -top-[120px] size-[420px] rounded-full border-[48px] border-[rgba(216,30,52,.18)]"
          aria-hidden
        />
        <div className="relative mx-auto w-full max-w-[900px] px-7 pb-16 pt-[70px]">
          <Link
            href="/"
            className="mb-[22px] flex w-fit items-center gap-1.5 text-[13px] font-semibold text-[#c9c1b6] transition-colors hover:text-white"
          >
            <ChevronLeft className="size-4" strokeWidth={2.2} />
            Retour à l&apos;accueil
          </Link>
          <div className="text-[12.5px] font-extrabold uppercase tracking-[.1em] text-[#ff4258]">
            Saison 2026 – 2027
          </div>
          <h1 className="mt-3.5 font-display text-[36px] font-black leading-[1.05] tracking-[-.02em] sm:text-[46px]">
            Prendre sa licence,
            <br />
            en 5 étapes
          </h1>
          <p className="mt-[18px] max-w-[560px] text-base font-medium leading-relaxed text-[#d8d1c6]">
            Le processus passe par Gesthand (la plateforme fédérale) et
            HelloAsso pour le paiement. On t&apos;explique tout, pas à pas.
          </p>
        </div>
      </section>

      {/* early-bird banner */}
      <div className="mx-auto w-full max-w-[900px] -translate-y-7 px-7">
        <div className="flex items-center gap-4 rounded-2xl border border-[#cfe8d9] bg-gradient-to-br from-success-bg to-[#f0f8f2] px-6 py-5 shadow-[0_8px_24px_rgba(0,0,0,.06)]">
          <div className="flex size-[46px] flex-none items-center justify-center rounded-xl bg-success">
            <Percent className="size-6 text-white" strokeWidth={2.2} />
          </div>
          <div>
            <div className="font-display text-base font-bold text-success-strong">
              Réduction anticipée : −5 % sur la part Ligue
            </div>
            <div className="mt-[3px] text-[13.5px] text-success">
              Pour toute licence prise <strong>avant le 10 août</strong>. Ne
              traînez pas !
            </div>
          </div>
        </div>
      </div>

      {/* steps */}
      <section className="mx-auto w-full max-w-[900px] px-7 pb-10 pt-5">
        {ETAPES.map((e) => (
          <div
            key={e.num}
            className="grid grid-cols-[64px_1fr] gap-[22px] pb-7"
          >
            <div className="flex flex-col items-center">
              <div className="flex size-[52px] items-center justify-center rounded-[15px] bg-primary font-display text-[22px] font-extrabold text-white shadow-[0_4px_12px_rgba(216,30,52,.3)]">
                {e.num}
              </div>
              {!e.last && <div className="mt-1.5 min-h-6 w-0.5 flex-1 bg-border" />}
            </div>
            <div className="rounded-2xl border bg-card px-[26px] py-[22px] shadow-[0_1px_3px_rgba(0,0,0,.04)]">
              <h3 className="font-display text-[19px] font-extrabold">
                {e.titre}
              </h3>
              <p className="mt-2.5 text-[14.5px] leading-[1.65] text-muted-foreground">
                {e.texte}
              </p>
              {e.chips && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {e.chips.map((c) => (
                    <span
                      key={c}
                      className="rounded-[9px] border bg-secondary px-[13px] py-[7px] text-[12.5px] font-bold text-[#3d3a35]"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
              {e.link && (
                <Link
                  href={e.link.href}
                  {...(e.link.href.startsWith("http")
                    ? { target: "_blank", rel: "noreferrer" }
                    : {})}
                  className="mt-4 inline-flex items-center gap-[7px] rounded-[10px] bg-[#17130F] px-[17px] py-[11px] text-[13px] font-bold text-white transition-colors hover:bg-[#2a211a]"
                >
                  {e.link.label}
                  {e.link.href.startsWith("http") ? (
                    <ExternalLink className="size-[15px]" strokeWidth={2.3} />
                  ) : (
                    <ArrowRight className="size-[15px]" strokeWidth={2.3} />
                  )}
                </Link>
              )}
            </div>
          </div>
        ))}

        {/* FAQ */}
        <div className="pb-7 pt-4">
          <h2 className="font-display text-[26px] font-extrabold tracking-[-.01em]">
            Questions fréquentes
          </h2>
          <div className="mt-5 space-y-2.5">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border bg-card shadow-[0_1px_3px_rgba(0,0,0,.04)]"
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 px-[26px] py-[18px] font-display text-[15.5px] font-bold [&::-webkit-details-marker]:hidden">
                  <ChevronDown
                    className="size-[18px] shrink-0 text-primary transition-transform group-open:rotate-180"
                    strokeWidth={2.4}
                  />
                  {item.q}
                </summary>
                <div className="px-[26px] pb-5 pl-[57px] text-[14.5px] leading-[1.65] text-muted-foreground">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* closing CTA */}
        <div className="relative mt-2 overflow-hidden rounded-[18px] bg-[#17130F] px-[30px] py-[34px] text-center text-white">
          <div
            className="absolute -bottom-20 -left-[60px] size-[220px] rounded-full border-[34px] border-[rgba(216,30,52,.16)]"
            aria-hidden
          />
          <div className="relative">
            <h3 className="font-display text-2xl font-extrabold">
              Un doute sur une étape ?
            </h3>
            <p className="mb-[22px] mt-2.5 text-[14.5px] text-[#d8d1c6]">
              Le bureau accompagne chaque famille, y compris pour
              Pass&apos;Sport et les aides.
            </p>
            <Link
              href="/#contact"
              className="inline-block rounded-[11px] bg-primary px-[26px] py-3.5 text-[14.5px] font-bold text-white shadow-[0_6px_20px_rgba(216,30,52,.4)] transition-colors hover:bg-[#e83049]"
            >
              Contacter le club
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
