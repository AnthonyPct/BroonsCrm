"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateAidReference, updateAidStatus } from "@/app/actions/paiements";
import { cn } from "@/lib/utils";

export const AID_STATUS_LABELS: Record<string, string> = {
  attente_code: "En attente du code",
  code_recu: "Code reçu",
  deduit: "Déclaré à l'État",
  rembourse: "Remboursé",
};

const STYLES: Record<string, string> = {
  attente_code: "bg-muted text-muted-foreground border-transparent",
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
          "h-8 w-40 rounded-full px-3.5 text-[12px] font-bold",
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

/** Saisie du code Pass'Sport a posteriori (le code arrive souvent des mois après). */
export function AidCodeInput({
  paymentId,
  reference,
}: {
  paymentId: string;
  reference: string | null;
}) {
  const [value, setValue] = useState(reference ?? "");
  const [saved, setSaved] = useState(reference ?? "");

  async function save() {
    if (value.trim() === saved) return;
    await updateAidReference(paymentId, value.trim());
    setSaved(value.trim());
    toast.success(value.trim() ? "Code enregistré" : "Code effacé");
  }

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      placeholder="Saisir le code…"
      className={cn(
        "w-full max-w-40 rounded-[7px] border px-2 py-1 font-mono text-xs outline-none transition-colors focus:border-primary focus:bg-card",
        value ? "border-transparent bg-transparent" : "border-input bg-secondary"
      )}
    />
  );
}
