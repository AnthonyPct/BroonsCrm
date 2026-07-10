import type { Metadata } from "next";
import { TeamEditor } from "@/components/crm/team-editor";
import { getCurrentSeason } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Équipes",
};

export default async function TeamsPage() {
  const season = await getCurrentSeason();
  if (!season) return <p>Aucune saison active.</p>;

  const supabase = await createClient();
  const { data: teams } = await supabase
    .from("teams")
    .select("*")
    .eq("season_id", season.id)
    .order("sort_order");

  return (
    <div className="mx-auto max-w-[1080px] space-y-[18px]">
      <div>
        <h2 className="font-display text-[22px] font-extrabold tracking-[-.01em]">
          Équipes — saison {season.label}
        </h2>
        <p className="mt-1.5 max-w-[720px] text-[13.5px] leading-relaxed text-muted-foreground">
          Les équipes servent au planning des journées à domicile (ordre des
          matchs, durées, désignations) et à l&apos;affectation automatique des
          licenciés d&apos;après leur année de naissance et leur sexe.
        </p>
      </div>
      <TeamEditor seasonId={season.id} teams={teams ?? []} />
    </div>
  );
}
