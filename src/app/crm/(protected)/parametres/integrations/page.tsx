import type { Metadata } from "next";
import { Lock, Mail, RefreshCw } from "lucide-react";
import { ReconciliationToolbar } from "@/components/crm/reconciliation-toolbar";
import { saveSetting } from "@/app/actions/parametres";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Intégrations",
};

function KeyValueCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between bg-card px-3.5 py-2.5">
      <span className="text-xs font-semibold text-[#9C958D]">{label}</span>
      <span className="text-[12.5px] font-bold">{value}</span>
    </div>
  );
}

export default async function IntegrationsPage() {
  const supabase = await createClient();
  const [{ data: settings }, { count: receivedCount }] = await Promise.all([
    supabase.from("app_settings").select("*"),
    supabase
      .from("helloasso_payments")
      .select("id", { count: "exact", head: true }),
  ]);
  const get = (key: string) =>
    settings?.find((s) => s.key === key)?.value ?? "";

  const orgSlug = get("helloasso_org_slug");
  const lastBackfill = get("helloasso_last_backfill_at");
  const webhookUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/helloasso-webhook`;

  async function saveSlug(formData: FormData) {
    "use server";
    await saveSetting(
      "helloasso_org_slug",
      String(formData.get("helloasso_org_slug") ?? "")
    );
  }

  return (
    <div className="mx-auto max-w-[920px] space-y-[18px]">
      <div>
        <h2 className="font-display text-[22px] font-extrabold tracking-[-.01em]">
          Connexions &amp; automatisations
        </h2>
        <p className="mt-1.5 max-w-[680px] text-[13.5px] leading-relaxed text-muted-foreground">
          Ces services alimentent le CRM automatiquement. Les identifiants sont
          chiffrés côté serveur (secrets Supabase) et ne sont jamais visibles
          en clair dans le code.
        </p>
      </div>

      {/* HelloAsso */}
      <div className="rounded-2xl border bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,.03)]">
        <div className="flex flex-wrap items-center gap-3.5">
          <span className="flex size-11 items-center justify-center rounded-xl bg-info-bg font-display text-base font-extrabold text-info">
            HA
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-display text-base font-bold">
                HelloAsso
              </span>
              {orgSlug ? (
                <span className="flex items-center gap-1.5 rounded-full bg-success-bg px-[11px] py-[3px] text-[11.5px] font-bold text-success">
                  <span className="size-[7px] rounded-full bg-success" />
                  Connecté
                </span>
              ) : (
                <span className="rounded-full bg-warning-bg px-[11px] py-[3px] text-[11.5px] font-bold text-warning">
                  À configurer
                </span>
              )}
            </div>
            <div className="mt-0.5 text-[12.5px] text-muted-foreground">
              API v5 · OAuth2
              {orgSlug ? (
                <>
                  {" "}
                  · organisation <strong>{orgSlug}</strong>
                </>
              ) : (
                " · slug de l'association à renseigner"
              )}
            </div>
          </div>
        </div>

        <form action={saveSlug} className="mt-5 flex flex-wrap items-end gap-3">
          <div className="min-w-[260px] flex-1">
            <div className="text-[11px] font-bold uppercase tracking-[.05em] text-[#9C958D]">
              Slug de l&apos;association
            </div>
            <input
              name="helloasso_org_slug"
              placeholder="ex : hbc-pays-de-broons"
              defaultValue={orgSlug}
              className="mt-1.5 h-[42px] w-full rounded-[9px] border bg-secondary px-3 font-mono text-[13px] text-[#3d3a35] outline-none transition-colors focus:border-primary focus:bg-card"
            />
          </div>
          <button
            type="submit"
            className="h-[42px] rounded-[10px] border bg-card px-4 text-[12.5px] font-bold transition-colors hover:border-primary hover:text-primary"
          >
            Enregistrer
          </button>
        </form>

        <div className="mt-4 flex items-start gap-3 rounded-[11px] bg-warning-bg px-3.5 py-3">
          <Lock className="mt-0.5 size-4 shrink-0 text-warning" />
          <p className="text-[12.5px] leading-relaxed text-[#8a5a10]">
            Client ID et Client Secret sont stockés dans les secrets Supabase
            (chiffrés, région UE). Les clés du script Excel actuel étant
            exposées en clair, elles doivent être <strong>régénérées</strong>{" "}
            lors de la reprise.
          </p>
        </div>
      </div>

      {/* webhook + rattrapage */}
      <div className="grid gap-[18px] md:grid-cols-2">
        <div className="rounded-2xl border bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,.03)]">
          <div className="flex items-center gap-2.5">
            <span className="size-[9px] rounded-full bg-success shadow-[0_0_0_3px_rgba(31,138,91,.15)]" />
            <span className="font-display text-[15px] font-bold">
              Webhook temps réel
            </span>
          </div>
          <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
            Chaque paiement (une notification par échéance) est poussé vers
            l&apos;Edge Function et rapproché immédiatement, sans saisie.
          </p>
          <div className="mt-4 flex flex-col gap-px overflow-hidden rounded-[10px] bg-muted">
            <KeyValueCell
              label="Statut"
              value={<span className="text-success">Actif</span>}
            />
            <KeyValueCell
              label="Échéances reçues"
              value={String(receivedCount ?? 0)}
            />
            <KeyValueCell
              label="URL de notification"
              value={
                <span className="max-w-[220px] truncate font-mono text-[11px] font-semibold text-[#3d3a35]">
                  {webhookUrl}
                </span>
              }
            />
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-[#9C958D]">
            À coller dans HelloAsso (Intégrations et API → Notifications) avec
            le paramètre <code>?secret=&lt;WEBHOOK_SECRET&gt;</code>.
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,.03)]">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="size-4 text-muted-foreground" />
            <span className="font-display text-[15px] font-bold">
              Rattrapage (backfill)
            </span>
            <span className="ml-auto rounded-full bg-success-bg px-[11px] py-[3px] text-[11.5px] font-bold text-success">
              Sécurité
            </span>
          </div>
          <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
            Backfill de sécurité qui relit les commandes et paiements HelloAsso
            (pagination) au cas où un événement webhook aurait été manqué.
          </p>
          <div className="mt-4 flex flex-col gap-px overflow-hidden rounded-[10px] bg-muted">
            <KeyValueCell
              label="Dernière synchro"
              value={lastBackfill ? formatDate(lastBackfill) : "jamais exécutée"}
            />
            <KeyValueCell label="Slug requis" value={orgSlug || "à renseigner"} />
          </div>
          <div className="mt-4">
            <ReconciliationToolbar />
          </div>
        </div>
      </div>

      {/* V2 */}
      <div className="rounded-2xl border border-dashed border-[#d8d1c6] p-6">
        <div className="flex flex-wrap items-center gap-3.5">
          <span className="flex size-11 items-center justify-center rounded-xl bg-muted">
            <Mail className="size-5 text-[#9C958D]" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-display text-[15px] font-bold">
                Qualification Gesthand par email
              </span>
              <span className="rounded-full bg-warning-bg px-[11px] py-[3px] text-[11.5px] font-bold text-[#8a5a10]">
                Prévu en V2
              </span>
            </div>
            <p className="mt-1 max-w-[560px] text-[12.5px] leading-relaxed text-muted-foreground">
              Lecture automatique des mails « [FFHandball] » (qualification,
              mutation) reçus sur la boîte @ffhandball.net — sous réserve de
              pouvoir créer une règle de transfert vers une boîte contrôlée par
              l&apos;outil. En attendant, la bascule reste manuelle sur la
              fiche licencié.
            </p>
          </div>
          <button
            disabled
            className="cursor-not-allowed rounded-[9px] border bg-card px-3.5 py-2 text-[12.5px] font-bold text-[#9C958D]"
          >
            À configurer
          </button>
        </div>
      </div>
    </div>
  );
}
