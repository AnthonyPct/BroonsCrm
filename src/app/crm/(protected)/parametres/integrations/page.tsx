import type { Metadata } from "next";
import { CheckCircle2, Circle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReconciliationToolbar } from "@/components/crm/reconciliation-toolbar";
import { saveSetting } from "@/app/actions/parametres";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Intégrations",
};

export default async function IntegrationsPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase.from("app_settings").select("*");
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
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Intégrations</h1>
        <p className="text-muted-foreground">
          Connexion HelloAsso : webhook temps réel + rattrapage quotidien.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>HelloAsso</CardTitle>
          <CardDescription>
            Les identifiants API (client ID / secret) sont stockés côté
            Supabase, jamais dans le navigateur.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form action={saveSlug} className="flex flex-wrap items-end gap-3">
            <div className="min-w-64 flex-1 space-y-2">
              <Label htmlFor="helloasso_org_slug">
                Slug de l&apos;association HelloAsso
              </Label>
              <Input
                id="helloasso_org_slug"
                name="helloasso_org_slug"
                placeholder="ex : hbc-pays-de-broons"
                defaultValue={orgSlug}
              />
            </div>
            <Button type="submit">Enregistrer</Button>
          </form>

          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              {orgSlug ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : (
                <Circle className="size-4 text-muted-foreground" />
              )}
              Slug de l&apos;association renseigné
            </div>
            <div className="flex items-center gap-2">
              {lastBackfill ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : (
                <Circle className="size-4 text-muted-foreground" />
              )}
              Dernier rattrapage :{" "}
              {lastBackfill ? formatDate(lastBackfill) : "jamais exécuté"}
            </div>
          </div>

          <ReconciliationToolbar />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuration du webhook</CardTitle>
          <CardDescription>
            À renseigner une seule fois dans HelloAsso (Mon compte →
            Intégrations et API → Notifications).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <div className="mb-1 font-medium">URL de notification :</div>
            <code className="block overflow-x-auto rounded-md bg-muted p-3 text-xs">
              {webhookUrl}?secret=&lt;WEBHOOK_SECRET&gt;
            </code>
          </div>
          <ol className="list-inside list-decimal space-y-2 text-muted-foreground">
            <li>
              Dans Supabase → Edge Functions → Secrets, renseigner{" "}
              <code>HELLOASSO_CLIENT_ID</code>,{" "}
              <code>HELLOASSO_CLIENT_SECRET</code>,{" "}
              <code>HELLOASSO_ORG_SLUG</code>, <code>WEBHOOK_SECRET</code> et{" "}
              <code>BACKFILL_SECRET</code>.
            </li>
            <li>
              Dans HelloAsso, coller l&apos;URL ci-dessus (en remplaçant{" "}
              <code>&lt;WEBHOOK_SECRET&gt;</code> par la valeur choisie).
            </li>
            <li>
              ⚠️ Régénérer les anciennes clés API HelloAsso qui étaient
              exposées dans le script AppScript.
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
