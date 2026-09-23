import type { Metadata } from "next";
import { MatchsBrowser } from "@/components/public/matchs-browser";
import { parisToday, splitMatchs, type PublicMatchs } from "@/lib/matchs";
import { createPublicClient } from "@/lib/supabase/public";

export const metadata: Metadata = {
  title: "Matchs et résultats de handball à Broons",
  description:
    "Les prochains matchs et les résultats des équipes du HBC Pays de Broons : à domicile à la salle du Chalet (rue du Stade, 22250 Broons) et à l'extérieur. Entrée libre, venez encourager les rouges et noirs !",
  alternates: { canonical: "/matchs" },
};

// Programme rafraîchi toutes les 5 min ; les actions du planning CRM
// revalident aussi la page à chaque modification.
export const revalidate = 300;

export default async function MatchesPage() {
  const supabase = createPublicClient();
  const { data } = await supabase.rpc("get_public_matchs");
  const { teams, matches } = (data ?? { teams: [], matches: [] }) as unknown as PublicMatchs;
  const { upcoming, results } = splitMatchs(matches, parisToday());

  return (
    <>
      <section className="relative overflow-hidden bg-[#17130F] text-white">
        <div
          className="absolute -right-[120px] -top-[120px] size-[420px] rounded-full border-[48px] border-[rgba(216,30,52,.18)]"
          aria-hidden
        />
        <div className="relative mx-auto w-full max-w-[900px] px-7 pb-16 pt-[70px]">
          <div className="text-[12.5px] font-extrabold uppercase tracking-[.1em] text-[#ff4258]">
            Saison en cours
          </div>
          <h1 className="mt-3.5 font-display text-[36px] font-black leading-[1.05] tracking-[-.02em] sm:text-[46px]">
            Matchs &amp; résultats
          </h1>
          <p className="mt-[18px] max-w-[560px] text-base font-medium leading-relaxed text-[#d8d1c6]">
            Les matchs des deux prochains week-ends, à la salle du Chalet comme à
            l&apos;extérieur, et tous les résultats de la saison. Entrée libre à
            domicile — venez encourager les rouges et noirs !
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[900px] px-4 py-10 sm:px-7 sm:py-12">
        <MatchsBrowser teams={teams} upcoming={upcoming} results={results} />
      </section>
    </>
  );
}
