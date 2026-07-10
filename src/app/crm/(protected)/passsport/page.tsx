import type { Metadata } from "next";
import Link from "next/link";
import { Info } from "lucide-react";
import { MemberAvatar } from "@/components/crm/avatar";
import { AidStatusSelect } from "@/components/crm/aid-status-select";
import { eur, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Suivi Pass'Sport",
};

export default async function PassSportPage() {
  const supabase = await createClient();
  const { data: payments } = await supabase
    .from("payments")
    .select(
      "id, amount, paid_at, reference, aid_status, license_id, licenses!inner(id, member:members(first_name, last_name))"
    )
    .eq("source", "passsport")
    .order("paid_at", { ascending: false });

  const rows = (payments ?? []) as unknown as {
    id: string;
    amount: number;
    paid_at: string;
    reference: string | null;
    aid_status: string | null;
    license_id: string;
    licenses: { member: { first_name: string; last_name: string } };
  }[];

  const sum = (status: string) =>
    rows
      .filter((p) => (p.aid_status ?? "code_recu") === status)
      .reduce((s, p) => s + Number(p.amount), 0);
  const count = (status: string) =>
    rows.filter((p) => (p.aid_status ?? "code_recu") === status).length;
  const toRecover = sum("code_recu") + sum("deduit");

  const kpis = [
    {
      label: "Codes reçus",
      value: count("code_recu"),
      amount: sum("code_recu"),
      color: "text-warning",
    },
    {
      label: "Déduits (à déclarer)",
      value: count("deduit"),
      amount: sum("deduit"),
      color: "text-info",
    },
    {
      label: "Remboursés par l'État",
      value: count("rembourse"),
      amount: sum("rembourse"),
      color: "text-success",
    },
  ];

  return (
    <div className="mx-auto max-w-[920px] space-y-[18px]">
      <div className="flex flex-wrap gap-3.5">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="min-w-[170px] flex-1 rounded-[14px] border bg-card px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,.03)]"
          >
            <div className="text-[11.5px] font-bold uppercase tracking-[.05em] text-[#9C958D]">
              {kpi.label}
            </div>
            <div className={`mt-1 font-display text-[26px] font-extrabold ${kpi.color}`}>
              {kpi.value}
            </div>
            <div className="text-[12.5px] font-semibold text-muted-foreground tabular-nums">
              {eur.format(kpi.amount)}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 rounded-[14px] border border-[#f0e2c4] bg-gradient-to-br from-warning-bg to-[#faf4e6] px-5 py-4">
        <Info className="size-5 shrink-0 text-warning-icon" />
        <p className="text-[12.5px] leading-relaxed text-[#8a5a10]">
          Le club avance le montant des codes Pass&apos;Sport et se fait
          rembourser par l&apos;État (via Le Compte Asso).{" "}
          <strong>
            Reste à récupérer : {eur.format(toRecover)}
          </strong>
          . Passez chaque code en « Remboursé » quand le versement arrive.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card shadow-[0_1px_2px_rgba(0,0,0,.03)]">
        <div className="border-b px-6 py-4">
          <h2 className="font-display text-base font-bold">
            Codes Pass&apos;Sport ({rows.length})
          </h2>
        </div>
        <div className="grid min-w-[620px] grid-cols-[1.7fr_1.2fr_.8fr_.9fr_1.1fr] border-b bg-secondary px-6 py-3">
          {["Licencié", "Code", "Montant", "Date", "Statut"].map((h) => (
            <div
              key={h}
              className="text-[11px] font-bold uppercase tracking-[.05em] text-[#9C958D]"
            >
              {h}
            </div>
          ))}
        </div>
        {rows.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucun paiement Pass&apos;Sport pour le moment — ils apparaîtront
            ici dès la première saisie sur une fiche licencié.
          </p>
        )}
        {rows.map((p) => (
          <div
            key={p.id}
            className="grid min-w-[620px] grid-cols-[1.7fr_1.2fr_.8fr_.9fr_1.1fr] items-center border-b border-muted px-6 py-3 text-[13.5px] last:border-b-0"
          >
            <Link
              href={`/crm/licencies/${p.license_id}`}
              className="flex min-w-0 items-center gap-2.5 font-bold hover:text-primary"
            >
              <MemberAvatar
                firstName={p.licenses.member.first_name}
                lastName={p.licenses.member.last_name}
                size={30}
              />
              <span className="truncate">
                {p.licenses.member.first_name}{" "}
                {p.licenses.member.last_name.toUpperCase()}
              </span>
            </Link>
            <div className="truncate font-mono text-xs text-[#3d3a35]">
              {p.reference ?? "—"}
            </div>
            <div className="font-bold tabular-nums">
              {eur.format(Number(p.amount))}
            </div>
            <div className="text-muted-foreground">{formatDate(p.paid_at)}</div>
            <div>
              <AidStatusSelect
                paymentId={p.id}
                status={p.aid_status ?? "code_recu"}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
