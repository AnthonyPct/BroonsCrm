import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArbitrationCard } from "@/components/crm/arbitration-card";
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
    label: `${l.member.last_name.toUpperCase()} ${l.member.first_name}${
      l.tariff ? ` — ${l.tariff.category}` : ""
    }`,
  }));

  const licenseeById = new Map(
    licensees.map((l) => [
      l.id,
      `${l.member.last_name.toUpperCase()} ${l.member.first_name}`,
    ])
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Réconciliation HelloAsso
          </h1>
          <p className="text-muted-foreground">
            Les commandes remontent automatiquement via le webhook. Seuls les
            cas ambigus (parent qui paie, homonymes…) demandent un arbitrage.
          </p>
        </div>
        <ReconciliationToolbar />
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          File d&apos;arbitrage
          <Badge
            variant={pending.length ? "destructive" : "secondary"}
            className={pending.length ? "" : "bg-emerald-100 text-emerald-800"}
          >
            {pending.length}
          </Badge>
        </h2>
        {pending.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              🎉 Aucune commande en attente d&apos;arbitrage.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {pending.map((order) => (
              <ArbitrationCard
                key={order.id}
                order={order}
                licensees={licenseeOptions}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Commandes rapprochées ({matched.length})
        </h2>
        <Card className="py-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Date</TableHead>
                  <TableHead>Payeur</TableHead>
                  <TableHead>Licencié</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matched.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-6 text-center text-muted-foreground"
                    >
                      Aucune commande rapprochée pour le moment.
                    </TableCell>
                  </TableRow>
                )}
                {matched.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="pl-6">
                      {formatDate(o.order_date)}
                    </TableCell>
                    <TableCell>
                      {o.payer_first_name} {o.payer_last_name}
                    </TableCell>
                    <TableCell>
                      {o.matched_license_id ? (
                        <Link
                          href={`/crm/licencies/${o.matched_license_id}`}
                          className="font-medium hover:underline"
                        >
                          {licenseeById.get(o.matched_license_id) ??
                            "Voir la fiche"}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {eur.format(Number(o.amount_total))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      {ignored.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-muted-foreground">
            Commandes ignorées ({ignored.length})
          </h2>
          <Card>
            <CardHeader>
              <CardDescription>
                {ignored
                  .map(
                    (o) =>
                      `${o.payer_first_name} ${o.payer_last_name} (${eur.format(
                        Number(o.amount_total)
                      )})`
                  )
                  .join(" · ")}
              </CardDescription>
            </CardHeader>
          </Card>
        </section>
      )}
    </div>
  );
}
