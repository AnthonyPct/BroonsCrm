import type { Metadata } from "next";
import { ImportTool } from "@/components/crm/import-tool";
import { getCurrentSeason } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Début de saison",
};

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

export default async function SeasonPage() {
  const season = await getCurrentSeason();
  if (!season) return <p>Aucune saison active.</p>;

  const supabase = await createClient();
  const { data: members } = await supabase
    .from("members")
    .select("first_name, last_name");
  const memberKeys = (members ?? []).map(
    (m) => `${norm(m.last_name)}|${norm(m.first_name)}`
  );

  return (
    <div className="mx-auto max-w-[960px] space-y-[18px]">
      <div>
        <h2 className="font-display text-[22px] font-extrabold tracking-[-.01em]">
          Ouvrir la saison {season.label}
        </h2>
        <p className="mt-1.5 max-w-[680px] text-[13.5px] leading-relaxed text-muted-foreground">
          Importez la liste des licenciés en une fois. La catégorie et le tarif
          sont déduits automatiquement de l&apos;année de naissance via la
          grille en vigueur.
        </p>
      </div>
      <ImportTool seasonId={season.id} existingMemberKeys={memberKeys} />
    </div>
  );
}
