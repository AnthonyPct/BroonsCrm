import { Badge } from "@/components/ui/badge";
import {
  LICENSE_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export function LicenseStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "whitespace-nowrap",
        status === "a_saisir" && "border-slate-300 bg-slate-100 text-slate-700",
        status === "attente_paiement" &&
          "border-amber-300 bg-amber-100 text-amber-800",
        status === "payee" &&
          "border-emerald-300 bg-emerald-100 text-emerald-800",
        status === "qualifiee" && "border-blue-300 bg-blue-100 text-blue-800"
      )}
    >
      {LICENSE_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  return (
    <Badge
      variant="outline"
      className={cn(
        "whitespace-nowrap",
        status === "payee" &&
          "border-emerald-300 bg-emerald-100 text-emerald-800",
        (status === "partielle" || status === "impayee") &&
          "border-orange-300 bg-orange-100 text-orange-800",
        status === "inconnu" && "border-slate-300 bg-slate-100 text-slate-600"
      )}
    >
      {PAYMENT_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
