"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addPayment } from "@/app/actions/paiements";
import { eur, PAYMENT_SOURCE_LABELS, PAYMENT_SOURCES } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PaymentDialog({
  licenseId,
  memberName,
  balance,
}: {
  licenseId: string;
  memberName: string;
  balance: number;
}) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("cheque");
  const [amount, setAmount] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  async function onSubmit(formData: FormData) {
    formData.set("source", source);
    try {
      await addPayment(licenseId, formData);
      toast.success(`Paiement de ${memberName} enregistré`);
      setOpen(false);
      setAmount("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'ajout");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-[9px] border bg-card px-[13px] py-[7px] text-[12.5px] font-bold transition-colors hover:border-primary hover:text-primary">
          <Plus className="size-3.5" strokeWidth={2.5} />
          Saisir un paiement
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[430px] rounded-[18px] p-[26px]">
        <DialogHeader>
          <DialogTitle className="font-display text-[19px] font-extrabold">
            Saisir un paiement
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[#9C958D]">
            {memberName} · reste à charge {eur.format(Math.max(0, balance))}
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <div>
            <div className="mb-2 text-xs font-bold text-muted-foreground">
              Moyen de paiement
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_SOURCES.filter((s) => s !== "helloasso").map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setSource(s)}
                  className={cn(
                    "rounded-[10px] border-[1.5px] px-2 py-[11px] text-[12.5px] font-bold transition-colors",
                    source === s
                      ? "border-primary bg-accent text-accent-foreground"
                      : "border-input bg-card text-[#3d3a35] hover:border-[#c9c1b6]"
                  )}
                >
                  {PAYMENT_SOURCE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-2 text-xs font-bold text-muted-foreground">
                Montant (€)
              </div>
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="h-11 w-full rounded-[10px] border bg-card px-3 text-sm font-semibold outline-none transition-colors focus:border-primary"
              />
            </div>
            <div>
              <div className="mb-2 text-xs font-bold text-muted-foreground">
                Date
              </div>
              <input
                name="paid_at"
                type="date"
                defaultValue={today}
                className="h-11 w-full rounded-[10px] border bg-card px-3 text-sm font-semibold outline-none transition-colors focus:border-primary"
              />
            </div>
          </div>
          {balance > 0 && (
            <button
              type="button"
              onClick={() => setAmount(balance.toFixed(2))}
              className="text-[12.5px] font-bold text-primary hover:text-[#B0122A]"
            >
              Remplir avec le reste à charge ({eur.format(balance)})
            </button>
          )}
          <div>
            <div className="mb-2 text-xs font-bold text-muted-foreground">
              Référence (n° chèque, code Pass&apos;Sport…)
            </div>
            <input
              name="reference"
              className="h-11 w-full rounded-[10px] border bg-card px-3 text-sm outline-none transition-colors focus:border-primary"
            />
          </div>
          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-11 flex-1 rounded-[10px] border bg-card text-[13.5px] font-bold transition-colors hover:border-[#9C958D]"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="h-11 flex-[1.4] rounded-[10px] bg-primary text-[13.5px] font-bold text-white shadow-[0_2px_8px_rgba(216,30,52,.28)] transition-colors hover:bg-[#B0122A]"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
