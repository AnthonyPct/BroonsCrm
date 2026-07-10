"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateAidStatus } from "@/app/actions/paiements";
import { cn } from "@/lib/utils";

export const AID_STATUS_LABELS: Record<string, string> = {
  code_recu: "Code reçu",
  deduit: "Déduit",
  rembourse: "Remboursé",
};

const STYLES: Record<string, string> = {
  code_recu: "bg-warning-bg text-warning border-transparent",
  deduit: "bg-info-bg text-info border-transparent",
  rembourse: "bg-success-bg text-success border-transparent",
};

export function AidStatusSelect({
  paymentId,
  status,
}: {
  paymentId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={status}
      disabled={pending}
      onValueChange={(value) =>
        startTransition(async () => {
          await updateAidStatus(paymentId, value);
          toast.success(`Statut : ${AID_STATUS_LABELS[value]}`);
        })
      }
    >
      <SelectTrigger
        className={cn(
          "h-8 w-36 rounded-full px-3.5 text-[12px] font-bold",
          STYLES[status]
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(AID_STATUS_LABELS).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
