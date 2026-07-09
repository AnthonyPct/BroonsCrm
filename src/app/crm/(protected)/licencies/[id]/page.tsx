import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LicenseStatusBadge, PaymentStatusBadge } from "@/components/crm/badges";
import {
  DeleteLicenseeButton,
  DeletePaymentButton,
  QualificationToggle,
} from "@/components/crm/license-actions";
import { LicenseeForm } from "@/components/crm/licensee-form";
import { PaymentDialog } from "@/components/crm/payment-dialog";
import {
  eur,
  formatDate,
  PAYMENT_SOURCE_LABELS,
} from "@/lib/format";
import { getCurrentSeason, getSeasonTariffs } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Fiche licencié",
};

export default async function LicenseePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: license }, season] = await Promise.all([
    supabase
      .from("licenses")
      .select("*, member:members(*), tariff:tariff_grid(*)")
      .eq("id", id)
      .maybeSingle(),
    getCurrentSeason(),
  ]);

  if (!license || !season) notFound();

  const [{ data: financials }, { data: payments }, tariffs] =
    await Promise.all([
      supabase
        .from("license_financials")
        .select("*")
        .eq("license_id", id)
        .maybeSingle(),
      supabase
        .from("payments")
        .select("*")
        .eq("license_id", id)
        .order("paid_at", { ascending: false }),
      getSeasonTariffs(license.season_id),
    ]);

  const member = license.member;
  const f = financials;
  const balance = Number(f?.balance ?? 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-ml-2 mb-1 text-muted-foreground"
          >
            <Link href="/crm/licencies">
              <ArrowLeft className="size-4" />
              Licenciés
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            {member.last_name.toUpperCase()} {member.first_name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <LicenseStatusBadge status={license.status} />
            <PaymentStatusBadge status={f?.payment_status ?? null} />
            {license.is_mutation && (
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                Mutation
              </span>
            )}
            {member.is_board && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                Bureau
              </span>
            )}
          </div>
        </div>
        <DeleteLicenseeButton licenseId={license.id} memberId={member.id} />
      </div>

      <Tabs defaultValue="fiche">
        <TabsList>
          <TabsTrigger value="fiche">Fiche</TabsTrigger>
          <TabsTrigger value="modifier">Modifier</TabsTrigger>
        </TabsList>

        <TabsContent value="fiche" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Tarif — {f?.category ?? "non défini"}</CardTitle>
                <CardDescription>
                  Prise de licence le {formatDate(license.registered_at)}
                  {Number(f?.discount_rate ?? 0) > 0 &&
                    " — réduction −5 % sur la part Ligue appliquée"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {f?.total_due != null ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Part Fédé</span>
                      <span className="tabular-nums">
                        {eur.format(Number(f.part_ffhb))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Part Ligue
                        {Number(f.discount_rate) > 0 && (
                          <span className="ml-1 text-emerald-600">(−5 %)</span>
                        )}
                      </span>
                      <span className="tabular-nums">
                        {eur.format(Number(f.part_lbhb_effective))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Part Club</span>
                      <span className="tabular-nums">
                        {eur.format(Number(f.part_hbc))}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total dû</span>
                      <span className="tabular-nums">
                        {eur.format(Number(f.total_due))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Encaissé</span>
                      <span className="tabular-nums">
                        {eur.format(Number(f.total_paid))}
                      </span>
                    </div>
                    <div
                      className={`flex justify-between font-bold ${
                        balance > 10 ? "text-orange-600" : "text-emerald-600"
                      }`}
                    >
                      <span>Reste à charge</span>
                      <span className="tabular-nums">
                        {eur.format(balance)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aucun tarif associé — renseignez la catégorie dans
                    l&apos;onglet Modifier.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Coordonnées</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>Né·e le {formatDate(member.birth_date)}</p>
                <p>{member.email ?? "—"}</p>
                <p>{member.phone ?? "—"}</p>
                <p className="text-muted-foreground">
                  {[member.address, member.postal_code, member.city]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </p>
                {license.team && <p>Équipe : {license.team}</p>}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Qualification</CardTitle>
              <CardDescription>
                À cocher une fois la licence qualifiée par la ligue dans
                Gesthand.
                {license.qualified_at &&
                  ` Qualifiée le ${formatDate(license.qualified_at)}.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QualificationToggle
                licenseId={license.id}
                qualified={license.status === "qualifiee"}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Paiements</CardTitle>
                <CardDescription>
                  HelloAsso remonte automatiquement — saisissez ici les autres
                  moyens.
                </CardDescription>
              </div>
              <PaymentDialog licenseId={license.id} />
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Date</TableHead>
                    <TableHead>Moyen</TableHead>
                    <TableHead>Référence</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(payments ?? []).length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-6 text-center text-muted-foreground"
                      >
                        Aucun paiement enregistré.
                      </TableCell>
                    </TableRow>
                  )}
                  {(payments ?? []).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="pl-6">
                        {formatDate(p.paid_at)}
                      </TableCell>
                      <TableCell>
                        {PAYMENT_SOURCE_LABELS[p.source] ?? p.source}
                      </TableCell>
                      <TableCell className="max-w-48 truncate text-muted-foreground">
                        {p.reference ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {eur.format(Number(p.amount))}
                      </TableCell>
                      <TableCell>
                        {p.source !== "helloasso" && (
                          <DeletePaymentButton
                            paymentId={p.id}
                            licenseId={license.id}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {license.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm">
                {license.notes}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="modifier">
          <LicenseeForm
            season={season}
            tariffs={tariffs}
            member={member}
            license={license}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
