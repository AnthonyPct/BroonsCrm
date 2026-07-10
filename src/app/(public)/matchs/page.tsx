import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Matchs de handball à Broons — programme à domicile",
  description:
    "Le programme des matchs de handball à domicile du HBC Pays de Broons, à la salle du Chalet (rue du Stade, 22250 Broons). Entrée libre, venez encourager les équipes du club !",
  alternates: { canonical: "/matchs" },
};

export const revalidate = 300; // programme rafraîchi toutes les 5 min

type PublicMatch = {
  time: string | null;
  team: string;
  is_youth: boolean;
  opponent: string;
  assignments: Record<string, string>;
};

type PublicDay = {
  date: string;
  hall_manager: string | null;
  matches: PublicMatch[];
};

function dayLabel(date: string): string {
  const label = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(date));
  return label[0].toUpperCase() + label.slice(1);
}

export default async function MatchesPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_matchdays");
  const days = ((data ?? []) as PublicDay[]).filter(
    (d) => d.matches.length > 0
  );

  return (
    <>
      <section className="relative overflow-hidden bg-[#17130F] text-white">
        <div
          className="absolute -right-[120px] -top-[120px] size-[420px] rounded-full border-[48px] border-[rgba(216,30,52,.18)]"
          aria-hidden
        />
        <div className="relative mx-auto w-full max-w-[900px] px-7 pb-16 pt-[70px]">
          <div className="text-[12.5px] font-extrabold uppercase tracking-[.1em] text-[#ff4258]">
            À la salle du Chalet
          </div>
          <h1 className="mt-3.5 font-display text-[36px] font-black leading-[1.05] tracking-[-.02em] sm:text-[46px]">
            Matchs à domicile
          </h1>
          <p className="mt-[18px] max-w-[560px] text-base font-medium leading-relaxed text-[#d8d1c6]">
            Le programme des prochaines journées à Broons. Entrée libre — venez
            encourager les rouges et noirs !
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[900px] space-y-6 px-7 py-12">
        {days.length === 0 && (
          <div className="rounded-[18px] border bg-card px-6 py-14 text-center">
            <CalendarDays className="mx-auto size-10 text-[#c3bcb0]" />
            <h2 className="mt-4 font-display text-xl font-extrabold">
              Programme bientôt disponible
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Les prochaines journées à domicile seront affichées ici dès
              qu&apos;elles seront planifiées.
            </p>
          </div>
        )}

        {days.map((day) => (
          <div
            key={day.date}
            className="overflow-hidden rounded-[18px] border bg-card shadow-[0_1px_3px_rgba(0,0,0,.04)]"
          >
            <div className="flex flex-wrap items-center gap-3 border-b bg-[#17130F] px-6 py-4 text-white">
              <h2 className="font-display text-lg font-extrabold">
                {dayLabel(day.date)}
              </h2>
              {day.hall_manager && (
                <span className="ml-auto text-[12.5px] font-semibold text-[#c9c1b6]">
                  Responsable de salle : {day.hall_manager}
                </span>
              )}
            </div>
            <div>
              {day.matches.map((m, i) => {
                const table = [m.assignments.table_1, m.assignments.table_2]
                  .filter(Boolean)
                  .join(" & ");
                const referee = m.is_youth
                  ? m.assignments.referee
                  : "désigné par le comité";
                return (
                  <div
                    key={i}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-muted px-6 py-4 last:border-b-0"
                  >
                    <span className="w-16 font-display text-lg font-extrabold text-primary">
                      {m.time ?? "--h--"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-display text-[15px] font-bold">
                        {m.team}
                      </span>
                      {m.opponent && (
                        <span className="text-[14px] text-muted-foreground">
                          {" "}
                          vs {m.opponent}
                        </span>
                      )}
                    </span>
                    <span className="text-[12px] text-[#9C958D]">
                      {table && <>Table : {table}</>}
                      {table && referee && " · "}
                      {referee && <>Arbitre : {referee}</>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
