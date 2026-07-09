import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  Clock,
  Pencil,
} from "lucide-react";
import {
  BoardBadge,
  MutationBadge,
  PaymentSourceTag,
  PaymentStatusBadge,
  QualificationBadge,
} from "@/components/crm/badges";
import { MemberAvatar } from "@/components/crm/avatar";
import {
  DeleteLicenseeButton,
  DeletePaymentButton,
  NotesEditor,
  QualificationToggle,
} from "@/components/crm/license-actions";
import { LicenseeForm } from "@/components/crm/licensee-form";
import { PaymentDialog } from "@/components/crm/payment-dialog";
import { eur, formatDate } from "@/lib/format";
import { getCurrentSeason, getSeasonTariffs } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Fiche licencié",
};

function Cell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-card px-3.5 py-3">
      <div className="text-[11px] font-semibold text-[#9C958D]">{label}</div>
      <div className="mt-0.5 text-[13px] font-semibold">{value}</div>
    </div>
  );
}

export default async function LicenseePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const [{ id }, { edit }] = await Promise.all([params, searchParams]);
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
  const discounted = Number(f?.discount_rate ?? 0) > 0;
  const qualified = license.status === "qualifiee";
  const birthYear = member.birth_date
    ? new Date(member.birth_date).getFullYear()
    : null;
  const memberName = `${member.first_name} ${member.last_name.toUpperCase()}`;

  if (edit) {
    return (
      <div className="mx-auto max-w-[1000px] space-y-5">
        <div className="flex items-center justify-between">
          <Link
            href={`/crm/licencies/${license.id}`}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            <ChevronLeft className="size-4" />
            Retour à la fiche
          </Link>
          <DeleteLicenseeButton licenseId={license.id} memberId={member.id} />
        </div>
        <LicenseeForm
          season={season}
          tariffs={tariffs}
          member={member}
          license={license}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1000px] space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href="/crm/licencies"
          className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-primary"
        >
          <ChevronLeft className="size-4" />
          Retour à la liste
        </Link>
        <Link
          href={`/crm/licencies/${license.id}?edit=1`}
          className="flex items-center gap-1.5 rounded-[9px] border bg-card px-[13px] py-[7px] text-[12.5px] font-bold transition-colors hover:border-primary hover:text-primary"
        >
          <Pencil className="size-3.5" />
          Modifier
        </Link>
      </div>

      <div className="grid items-start gap-[18px] lg:grid-cols-[1.55fr_1fr]">
        {/* -------- colonne gauche -------- */}
        <div className="space-y-[18px]">
          {/* identité */}
          <div className="rounded-2xl border bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,.03)]">
            <div className="flex items-start gap-4">
              <MemberAvatar
                firstName={member.first_name}
                lastName={member.last_name}
                size={60}
              />
              <div className="min-w-0">
                <h2 className="font-display text-2xl font-extrabold tracking-[-.01em]">
                  {memberName}
                </h2>
                <div className="mt-1 text-[13.5px] text-muted-foreground">
                  {f?.category ?? "Catégorie non définie"}
                  {license.team ? ` · ${license.team}` : ""}
                  {birthYear ? ` · né(e) en ${birthYear}` : ""}
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <PaymentStatusBadge status={f?.payment_status ?? null} />
                  <QualificationBadge qualified={qualified} />
                  {license.is_mutation && <MutationBadge />}
                  {member.is_board && <BoardBadge />}
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-[10px] bg-muted">
              <Cell label="Email" value={member.email ?? "—"} />
              <Cell
                label="Sexe"
                value={
                  member.sex === "F"
                    ? "Féminin"
                    : member.sex === "M"
                      ? "Masculin"
                      : "—"
                }
              />
              <Cell label="Téléphone" value={member.phone ?? "—"} />
              <Cell
                label="Prise de licence"
                value={formatDate(license.registered_at)}
              />
            </div>
          </div>

          {/* détail du tarif */}
          <div className="rounded-2xl border bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,.03)]">
            <div className="flex items-center justify-between">
              <div className="micro-label">Détail du tarif</div>
              {discounted && (
                <span className="rounded-full bg-success-bg px-[11px] py-[3px] text-[11px] font-bold text-success">
                  −5 % ligue · avant 10/08
                </span>
              )}
            </div>
            {f?.total_due != null ? (
              <div className="mt-3">
                <div className="flex items-center justify-between border-b border-muted py-2.5 text-[13.5px]">
                  <span className="font-semibold text-muted-foreground">
                    Part Fédérale
                  </span>
                  <span className="font-bold tabular-nums">
                    {eur.format(Number(f.part_ffhb))}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-muted py-2.5 text-[13.5px]">
                  <span className="font-semibold text-muted-foreground">
                    Part Ligue
                  </span>
                  <span className="font-bold tabular-nums">
                    {discounted && (
                      <span className="mr-2 font-semibold text-[#9C958D] line-through">
                        {eur.format(Number(f.part_lbhb))}
                      </span>
                    )}
                    {eur.format(Number(f.part_lbhb_effective))}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-muted py-2.5 text-[13.5px]">
                  <span className="font-semibold text-muted-foreground">
                    Part Club
                  </span>
                  <span className="font-bold tabular-nums">
                    {eur.format(Number(f.part_hbc))}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-3">
                  <span className="font-display text-[15px] font-bold">
                    Total dû
                  </span>
                  <span className="font-display text-xl font-extrabold tabular-nums">
                    {eur.format(Number(f.total_due))}
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Aucun tarif associé — choisissez la catégorie via « Modifier ».
              </p>
            )}
          </div>

          {/* paiements */}
          <div className="rounded-2xl border bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,.03)]">
            <div className="flex items-center justify-between">
              <div className="micro-label">Paiements &amp; échéances</div>
              <PaymentDialog
                licenseId={license.id}
                memberName={memberName}
                balance={balance}
              />
            </div>
            <div className="mt-4 space-y-2">
              {(payments ?? []).length === 0 && (
                <p className="py-3 text-center text-[13px] text-[#9C958D]">
                  Aucun paiement enregistré pour l&apos;instant.
                </p>
              )}
              {(payments ?? []).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-[10px] bg-secondary px-[13px] py-[11px]"
                >
                  <PaymentSourceTag source={p.source} />
                  <span className="text-xs text-muted-foreground">
                    {formatDate(p.paid_at)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-[#b5aea3]">
                    {p.reference ?? ""}
                  </span>
                  <span className="font-display text-[15px] font-bold tabular-nums">
                    {eur.format(Number(p.amount))}
                  </span>
                  {p.source !== "helloasso" && (
                    <DeletePaymentButton
                      paymentId={p.id}
                      licenseId={license.id}
                    />
                  )}
                </div>
              ))}
            </div>
            {f?.total_due != null && (
              <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-[10px] bg-muted">
                <div className="bg-card px-3.5 py-3">
                  <div className="text-[11px] font-semibold text-[#9C958D]">
                    Dû
                  </div>
                  <div className="mt-0.5 font-display text-base font-bold tabular-nums">
                    {eur.format(Number(f.total_due))}
                  </div>
                </div>
                <div className="bg-card px-3.5 py-3">
                  <div className="text-[11px] font-semibold text-[#9C958D]">
                    Encaissé
                  </div>
                  <div className="mt-0.5 font-display text-base font-bold tabular-nums text-success">
                    {eur.format(Number(f.total_paid))}
                  </div>
                </div>
                <div className="bg-card px-3.5 py-3">
                  <div className="text-[11px] font-semibold text-[#9C958D]">
                    Reste à charge
                  </div>
                  <div
                    className={cn(
                      "mt-0.5 font-display text-base font-bold tabular-nums",
                      balance > 10 ? "text-destructive" : "text-success"
                    )}
                  >
                    {eur.format(balance)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* -------- colonne droite (sticky) -------- */}
        <div className="space-y-[18px] lg:sticky lg:top-[92px]">
          <div className="rounded-2xl border bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,.03)]">
            <div className="micro-label">Qualification Gesthand</div>
            <div
              className={cn(
                "mt-3 flex items-start gap-3 rounded-[11px] px-3.5 py-3",
                qualified ? "bg-success-bg" : "bg-warning-bg"
              )}
            >
              {qualified ? (
                <CheckCircle2 className="mt-0.5 size-[18px] shrink-0 text-success" />
              ) : (
                <Clock className="mt-0.5 size-[18px] shrink-0 text-warning-icon" />
              )}
              <div>
                <div
                  className={cn(
                    "text-[13.5px] font-bold",
                    qualified ? "text-success-strong" : "text-[#8a5a10]"
                  )}
                >
                  {qualified ? "Licence qualifiée" : "En attente de qualification"}
                </div>
                <div
                  className={cn(
                    "text-xs",
                    qualified ? "text-success" : "text-warning-icon"
                  )}
                >
                  {qualified
                    ? `le ${formatDate(license.qualified_at)}`
                    : "à vérifier dans Gesthand"}
                </div>
              </div>
            </div>
            <div className="mt-3">
              <QualificationToggle
                licenseId={license.id}
                qualified={qualified}
              />
            </div>
            <p className="mt-2.5 text-[11px] text-[#9C958D]">
              Bascule manuelle (MVP). L&apos;automatisation par email Gesthand
              est prévue en V2.
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,.03)]">
            <div className="micro-label">Notes</div>
            <div className="mt-3">
              <NotesEditor
                licenseId={license.id}
                initialNotes={license.notes ?? ""}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
