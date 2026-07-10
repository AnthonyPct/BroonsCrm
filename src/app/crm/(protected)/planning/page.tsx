import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, ChevronRight } from "lucide-react";
import { createMatchday } from "@/app/actions/planning";
import { getCurrentSeason } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Journées à domicile",
};

function dayLabel(date: string): string {
  const label = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
  return label[0].toUpperCase() + label.slice(1);
}

export default async function PlanningPage() {
  const season = await getCurrentSeason();
  if (!season) return <p>Aucune saison active.</p>;

  const supabase = await createClient();
  const { data: matchdays } = await supabase
    .from("matchdays")
    .select(
      "id, date, hall_manager_id, matches:matchday_matches(id, team:teams(is_youth)), assignments:matchday_matches(match_assignments(role))"
    )
    .eq("season_id", season.id)
    .order("date", { ascending: true });

  const today = new Date().toISOString().slice(0, 10);
  const rows = (matchdays ?? []).map((md) => {
    const matches = md.matches ?? [];
    const expected =
      matches.reduce(
        (sum, m) => sum + 2 + (m.team?.is_youth ? 1 : 0),
        0
      ) + 1; // +1 responsable de salle
    const done =
      matches.length === 0
        ? 0
        : (md.assignments ?? []).reduce(
            (sum, m) => sum + (m.match_assignments?.length ?? 0),
            0
          ) + (md.hall_manager_id ? 1 : 0);
    return {
      id: md.id,
      date: md.date,
      matchCount: matches.length,
      missing: matches.length === 0 ? 0 : Math.max(0, expected - done),
      past: md.date < today,
    };
  });

  const upcoming = rows.filter((r) => !r.past);
  const past = rows.filter((r) => r.past).reverse();

  return (
    <div className="mx-auto max-w-[920px] space-y-[18px]">
      <form
        action={createMatchday}
        className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,.03)]"
      >
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[.05em] text-[#9C958D]">
            Date de la journée
          </div>
          <input
            type="date"
            name="date"
            required
            className="mt-1.5 h-[42px] rounded-[10px] border bg-secondary px-3 text-sm font-semibold outline-none transition-colors focus:border-primary"
          />
        </div>
        <button
          type="submit"
          className="flex h-[42px] items-center gap-1.5 rounded-[10px] bg-primary px-[18px] text-[13px] font-bold text-white shadow-[0_2px_8px_rgba(216,30,52,.28)] transition-colors hover:bg-[#B0122A]"
        >
          <CalendarPlus className="size-4" />
          Créer la journée
        </button>
        <p className="text-[12px] text-[#9C958D]">
          Les horaires se calculent automatiquement à l&apos;ajout des matchs.
        </p>
      </form>

      {[
        { title: "À venir", list: upcoming },
        { title: "Passées", list: past },
      ].map(
        (section) =>
          section.list.length > 0 && (
            <div key={section.title}>
              <h2 className="mb-2.5 font-display text-base font-bold text-muted-foreground">
                {section.title}
              </h2>
              <div className="space-y-2">
                {section.list.map((r) => (
                  <Link
                    key={r.id}
                    href={`/crm/planning/${r.id}`}
                    className={cn(
                      "flex items-center gap-3 rounded-[14px] border bg-card px-5 py-4 transition-all hover:-translate-y-px hover:border-primary",
                      r.past && "opacity-70"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-[15px] font-bold">
                        {dayLabel(r.date)}
                      </div>
                      <div className="text-[12.5px] text-muted-foreground">
                        {r.matchCount} match(s)
                      </div>
                    </div>
                    {r.matchCount > 0 &&
                      (r.missing > 0 ? (
                        <span className="rounded-full bg-warning-bg px-[11px] py-[3px] text-[11.5px] font-bold text-warning">
                          {r.missing} désignation(s) manquante(s)
                        </span>
                      ) : (
                        <span className="rounded-full bg-success-bg px-[11px] py-[3px] text-[11.5px] font-bold text-success">
                          Complet
                        </span>
                      ))}
                    <ChevronRight className="size-4 shrink-0 text-[#9C958D]" />
                  </Link>
                ))}
              </div>
            </div>
          )
      )}

      {rows.length === 0 && (
        <div className="rounded-2xl border bg-card py-12 text-center text-sm text-muted-foreground">
          Aucune journée planifiée — créez la première ci-dessus.
        </div>
      )}
    </div>
  );
}
