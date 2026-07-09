import type { Metadata } from "next";
import { Percent } from "lucide-react";
import { TariffEditor } from "@/components/crm/tariff-editor";
import { saveSeasonSettings } from "@/app/actions/parametres";
import { getCurrentSeason, getSeasonTariffs } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Grille tarifaire",
};

export default async function TariffsPage() {
  const season = await getCurrentSeason();
  if (!season) return <p>Aucune saison active.</p>;
  const tariffs = await getSeasonTariffs(season.id);

  const saveSeason = saveSeasonSettings.bind(null, season.id);
  const deadline = new Date(season.discount_deadline).toLocaleDateString(
    "fr-FR",
    { day: "2-digit", month: "2-digit" }
  );

  return (
    <div className="mx-auto max-w-[1080px] space-y-[18px]">
      <div>
        <h2 className="font-display text-[22px] font-extrabold tracking-[-.01em]">
          Barème saison {season.label}
        </h2>
        <p className="mt-1.5 max-w-[720px] text-[13.5px] leading-relaxed text-muted-foreground">
          Chaque licence se décompose en 3 parts : <strong>Fédé</strong>,{" "}
          <strong>Ligue</strong>, <strong>Club</strong>. La catégorie est
          déterminée automatiquement par l&apos;année de naissance. Toute
          modification recalcule aussitôt les dûs, les restes à charge et le
          tableau de bord.
        </p>
      </div>

      {/* réduction anticipée */}
      <div className="rounded-2xl border border-[#cfe8d9] bg-gradient-to-br from-success-bg to-[#f0f8f2] px-6 py-5">
        <form
          action={saveSeason}
          className="flex flex-wrap items-center gap-5"
        >
          <div className="flex size-11 flex-none items-center justify-center rounded-xl bg-success">
            <Percent className="size-[22px] text-white" strokeWidth={2.2} />
          </div>
          <div className="min-w-[260px] flex-1">
            <div className="font-display text-[15px] font-bold text-success-strong">
              Réduction anticipée (avant le {deadline})
            </div>
            <div className="mt-0.5 text-[13px] text-success">
              Appliquée automatiquement sur la <strong>part Ligue</strong> pour
              toute licence prise avant la date limite.
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[.05em] text-success-strong">
              Réduction
            </div>
            <div className="mt-1 flex h-10 items-center gap-1 rounded-[9px] border border-[#cfe8d9] bg-white px-3">
              <span className="text-[15px] font-bold text-success-strong">
                −
              </span>
              <input
                name="discount_rate"
                type="number"
                step="0.1"
                min="0"
                max="100"
                defaultValue={Number(season.discount_rate) * 100}
                className="w-11 bg-transparent text-[15px] font-bold text-success-strong outline-none"
              />
              <span className="text-[13px] font-semibold text-success">%</span>
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[.05em] text-success-strong">
              Avant le
            </div>
            <input
              name="discount_deadline"
              type="date"
              defaultValue={season.discount_deadline}
              className="mt-1 h-10 rounded-[9px] border border-[#cfe8d9] bg-white px-3 text-[13px] font-bold text-success-strong outline-none"
            />
          </div>
          <button
            type="submit"
            className="h-10 rounded-[9px] bg-success px-4 text-[12.5px] font-bold text-white transition-colors hover:bg-success-strong"
          >
            Enregistrer
          </button>
        </form>
      </div>

      <TariffEditor seasonId={season.id} tariffs={tariffs} />
    </div>
  );
}
