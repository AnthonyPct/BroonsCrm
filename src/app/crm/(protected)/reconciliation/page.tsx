import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Info } from "lucide-react";
import { ArbitrationRow } from "@/components/crm/arbitration-card";
import { ReconciliationToolbar } from "@/components/crm/reconciliation-toolbar";
import { eur, formatDate } from "@/lib/format";
import { getCurrentSeason, getSeasonLicensees } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Réconciliation HelloAsso",
};

export default async function ReconciliationPage() {
  const season = await getCurrentSeason();
  if (!season) return <p>Aucune saison active.</p>;

  const supabase = await createClient();
  const [{ data: orders }, licensees] = await Promise.all([
    supabase
      .from("helloasso_orders")
      .select("*")
      .order("order_date", { ascending: false }),
    getSeasonLicensees(season.id),
  ]);

  const pending = (orders ?? []).filter((o) => o.match_status === "pending");
  const matched = (orders ?? []).filter((o) => o.match_status === "matched");
  const ignored = (orders ?? []).filter((o) => o.match_status === "ignored");

  const licenseeOptions = licensees.map((l) => ({
    id: l.id,
    label: `${l.member.first_name} ${l.member.last_name.toUpperCase()}${
      l.tariff ? ` — ${l.tariff.category}` : ""
    }`,
  }));

  const licenseeById = new Map(
    licensees.map((l) => [
      l.id,
      `${l.member.first_name} ${l.member.last_name.toUpperCase()}`,
    ])
  );

  return (
    <div className="mx-auto max-w-[1080px] space-y-[18px]">
      {/* rangée KPIs + info */}
      <div className="flex flex-wrap gap-3.5">
        <div className="min-w-[180px] rounded-[14px] border bg-card px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,.03)]">
          <div className="text-[11.5px] font-bold uppercase tracking-[.05em] text-[#9C958D]">
            Commandes rapprochées
          </div>
          <div className="mt-1 font-display text-[26px] font-extrabold text-success">
            {matched.length}
          </div>
        </div>
        <div className="min-w-[180px] rounded-[14px] border bg-card px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,.03)]">
          <div className="text-[11.5px] font-bold uppercase tracking-[.05em] text-[#9C958D]">
            À arbitrer
          </div>
          <div className="mt-1 font-display text-[26px] font-extrabold text-primary">
            {pending.length}
          </div>
        </div>
        <div className="flex min-w-[280px] flex-[2] items-center gap-3 rounded-[14px] border border-[#f0e2c4] bg-gradient-to-br from-warning-bg to-[#faf4e6] px-5 py-4">
          <Info className="size-5 shrink-0 text-warning-icon" />
          <p className="text-[12.5px] leading-relaxed text-[#8a5a10]">
            Le formulaire de licence est piloté par la ligue : ces paiements
            arrivent au nom du <strong>payeur</strong> (souvent un parent).
            Confirmez le rapprochement.
          </p>
        </div>
      </div>

      <ReconciliationToolbar />

      {/* file d'arbitrage */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgba(0,0,0,.03)]">
        <div className="flex items-center gap-3 border-b px-6 py-4">
          <h2 className="font-display text-base font-bold">
            File d&apos;arbitrage
          </h2>
          {pending.length > 0 && (
            <span className="rounded-full bg-accent px-[11px] py-[3px] text-[11.5px] font-bold text-primary">
              {pending.length} en attente
            </span>
          )}
        </div>
        {pending.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-success-bg">
              <CheckCircle2 className="size-7 text-success" />
            </span>
            <div className="font-display text-[17px] font-bold">
              File vide, tout est rapproché
            </div>
            <p className="text-[13px] text-muted-foreground">
              Les prochains paiements HelloAsso remonteront ici
              automatiquement.
            </p>
          </div>
        ) : (
          pending.map((order) => (
            <ArbitrationRow
              key={order.id}
              order={order}
              licensees={licenseeOptions}
            />
          ))
        )}
      </div>

      {/* commandes rapprochées */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgba(0,0,0,.03)]">
        <div className="border-b px-6 py-4">
          <h2 className="font-display text-base font-bold">
            Commandes rapprochées ({matched.length})
          </h2>
        </div>
        <div className="grid grid-cols-[1.2fr_1.4fr_1.4fr_1fr] border-b bg-secondary px-6 py-3">
          {["Date", "Payeur", "Licencié", "Montant"].map((h) => (
            <div
              key={h}
              className="text-[11px] font-bold uppercase tracking-[.05em] text-[#9C958D] last:text-right"
            >
              {h}
            </div>
          ))}
        </div>
        {matched.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucune commande rapprochée pour le moment.
          </p>
        )}
        {matched.map((o) => (
          <div
            key={o.id}
            className="grid grid-cols-[1.2fr_1.4fr_1.4fr_1fr] items-center border-b border-muted px-6 py-3 text-[13.5px] last:border-b-0"
          >
            <div className="text-muted-foreground">
              {formatDate(o.order_date)}
            </div>
            <div>
              {o.payer_first_name} {o.payer_last_name}
            </div>
            <div>
              {o.matched_license_id ? (
                <Link
                  href={`/crm/licencies/${o.matched_license_id}`}
                  className="font-bold hover:text-primary"
                >
                  {licenseeById.get(o.matched_license_id) ?? "Voir la fiche"}
                </Link>
              ) : (
                "—"
              )}
            </div>
            <div className="text-right font-bold tabular-nums">
              {eur.format(Number(o.amount_total))}
            </div>
          </div>
        ))}
      </div>

      {ignored.length > 0 && (
        <div className="rounded-2xl border bg-card px-6 py-4 shadow-[0_1px_2px_rgba(0,0,0,.03)]">
          <h2 className="font-display text-base font-bold text-muted-foreground">
            Commandes ignorées ({ignored.length})
          </h2>
          <p className="mt-2 text-[13px] text-muted-foreground">
            {ignored
              .map(
                (o) =>
                  `${o.payer_first_name} ${o.payer_last_name} (${eur.format(
                    Number(o.amount_total)
                  )})`
              )
              .join(" · ")}
          </p>
        </div>
      )}
    </div>
  );
}
