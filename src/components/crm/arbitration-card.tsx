"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
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

export function ArbitrationRow({
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
  const itemUsers = items
    .filter((it) => it.user?.firstName)
    .map((it) => `${it.user!.firstName} ${it.user!.lastName ?? ""}`.trim());

  return (
    <div className="grid gap-4 border-b border-muted px-6 py-4 last:border-b-0 lg:grid-cols-[1.5fr_1.4fr_auto] lg:gap-[18px]">
      {/* commande */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[.05em] text-[#9C958D]">
          Commande HelloAsso
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-display text-lg font-extrabold tabular-nums">
            {eur.format(Number(order.amount_total))}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDate(order.order_date)}
          </span>
        </div>
        <div className="mt-1 text-[12.5px]">
          Payeur :{" "}
          <strong>
            {order.payer_first_name} {order.payer_last_name}
          </strong>
          {order.payer_email && (
            <span className="text-muted-foreground"> · {order.payer_email}</span>
          )}
        </div>
        {itemUsers.length > 0 && (
          <div className="mt-0.5 text-[12.5px] text-muted-foreground">
            Licence pour : <strong>{itemUsers.join(", ")}</strong>
          </div>
        )}
        <div className="mt-1 text-[11px] text-[#b5aea3]">
          Réf. {order.ha_order_id}
        </div>
      </div>

      {/* rapprochement */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[.05em] text-[#9C958D]">
          Rapprochement
        </div>
        <div className="mt-2">
          <Select value={licenseId} onValueChange={setLicenseId}>
            <SelectTrigger className="h-10 w-full rounded-[10px] border-input bg-secondary text-[13px] font-semibold">
              <SelectValue placeholder="Chercher le licencié concerné…" />
            </SelectTrigger>
            <SelectContent>
              {licensees.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* actions */}
      <div className="flex min-w-[150px] flex-row gap-2 lg:flex-col">
        <button
          disabled={!licenseId || pending}
          onClick={() =>
            startTransition(async () => {
              try {
                const chosen = licensees.find((l) => l.id === licenseId);
                await assignOrder(order.id, licenseId);
                toast.success(
                  `Commande rapprochée${chosen ? ` à ${chosen.label.split(" — ")[0]}` : ""}`
                );
              } catch (e) {
                toast.error(
                  e instanceof Error ? e.message : "Erreur de rapprochement"
                );
              }
            })
          }
          className="flex items-center justify-center gap-1.5 rounded-[9px] bg-success px-3.5 py-[9px] text-[12.5px] font-bold text-white transition-colors hover:bg-success-strong disabled:opacity-50"
        >
          <Check className="size-3.5" strokeWidth={3} />
          Rapprocher
        </button>
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await ignoreOrder(order.id);
              toast.success("Commande ignorée");
            })
          }
          className="rounded-[9px] border bg-card px-3.5 py-[9px] text-xs font-semibold text-muted-foreground transition-colors hover:border-[#9C958D] disabled:opacity-50"
        >
          Ignorer
        </button>
      </div>
    </div>
  );
}
