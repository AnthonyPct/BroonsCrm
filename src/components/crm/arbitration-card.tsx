"use client";

import { useState, useTransition } from "react";
import { Check, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignOrder, ignoreOrder } from "@/app/actions/reconciliation";
import { eur, formatDate } from "@/lib/format";
import type { Tables } from "@/lib/database.types";

type Order = Tables<"helloasso_orders">;

export function ArbitrationCard({
  order,
  licensees,
}: {
  order: Order;
  licensees: { id: string; label: string }[];
}) {
  const [licenseId, setLicenseId] = useState<string>("");
  const [pending, startTransition] = useTransition();

  const items = Array.isArray(order.items)
    ? (order.items as {
        name?: string;
        user?: { firstName?: string; lastName?: string };
      }[])
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span>
            {order.payer_first_name} {order.payer_last_name}
            <span className="ml-2 font-normal text-muted-foreground">
              (payeur)
            </span>
          </span>
          <span className="tabular-nums">
            {eur.format(Number(order.amount_total))}
          </span>
        </CardTitle>
        <CardDescription>
          Commande {order.ha_order_id} du {formatDate(order.order_date)}
          {order.payer_email && ` — ${order.payer_email}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length > 0 && (
          <div className="rounded-md bg-muted/60 p-3 text-sm">
            <div className="mb-1 font-medium">Contenu de la commande :</div>
            <ul className="list-inside list-disc text-muted-foreground">
              {items.map((it, i) => (
                <li key={i}>
                  {it.name ?? "Licence"}
                  {it.user?.firstName &&
                    ` — pour ${it.user.firstName} ${it.user.lastName ?? ""}`}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={licenseId} onValueChange={setLicenseId}>
            <SelectTrigger className="min-w-64 flex-1">
              <SelectValue placeholder="Choisir le licencié concerné…" />
            </SelectTrigger>
            <SelectContent>
              {licensees.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            disabled={!licenseId || pending}
            onClick={() =>
              startTransition(async () => {
                try {
                  await assignOrder(order.id, licenseId);
                  toast.success("Commande rapprochée, paiements créés");
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : "Erreur de rapprochement"
                  );
                }
              })
            }
          >
            <Check className="size-4" />
            Assigner
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await ignoreOrder(order.id);
                toast.success("Commande ignorée");
              })
            }
          >
            <EyeOff className="size-4" />
            Ignorer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
