import {
  LICENSE_STATUS_LABELS,
  PAYMENT_SOURCE_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/format";
import { cn } from "@/lib/utils";

function Pill({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-full px-[11px] py-[3px] text-[11.5px] font-bold",
        className
      )}
    >
      {children}
    </span>
  );
}

export function LicenseStatusBadge({ status }: { status: string }) {
  return (
    <Pill
      className={cn(
        status === "a_saisir" && "bg-muted text-muted-foreground",
        status === "attente_paiement" && "bg-warning-bg text-warning",
        status === "payee" && "bg-success-bg text-success",
        status === "qualifiee" && "bg-success-bg text-success-strong"
      )}
    >
      {LICENSE_STATUS_LABELS[status] ?? status}
    </Pill>
  );
}

export function PaymentStatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  return (
    <Pill
      className={cn(
        status === "payee" && "bg-success-bg text-success",
        status === "partielle" && "bg-warning-bg text-warning",
        status === "impayee" && "bg-accent text-destructive",
        status === "inconnu" && "bg-muted text-muted-foreground"
      )}
    >
      {PAYMENT_STATUS_LABELS[status] ?? status}
    </Pill>
  );
}

export function QualificationBadge({ qualified }: { qualified: boolean }) {
  return (
    <Pill
      className={
        qualified
          ? "bg-success-bg text-success"
          : "bg-muted text-muted-foreground"
      }
    >
      {qualified ? "Qualifiée" : "Non qualif."}
    </Pill>
  );
}

export function MutationBadge() {
  return <Pill className="bg-violet-bg text-violet">Mutation</Pill>;
}

export function BoardBadge() {
  return <Pill className="bg-warning-bg text-[#9a6a10]">Membre du bureau</Pill>;
}

const SOURCE_STYLES: Record<string, string> = {
  helloasso: "bg-info-bg text-info",
  passsport: "bg-violet-bg text-violet",
  cheque: "bg-muted text-muted-foreground",
  espece: "bg-muted text-muted-foreground",
  ancv: "bg-success-bg text-success",
  caf: "bg-success-bg text-success",
  offert: "bg-warning-bg text-warning",
};

export function PaymentSourceTag({ source }: { source: string }) {
  return (
    <span
      className={cn(
        "flex-none rounded-lg px-[11px] py-[5px] text-[11px] font-bold",
        SOURCE_STYLES[source] ?? "bg-muted text-muted-foreground"
      )}
    >
      {PAYMENT_SOURCE_LABELS[source] ?? source}
    </span>
  );
}
