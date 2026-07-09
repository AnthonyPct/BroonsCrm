"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addPayment } from "@/app/actions/paiements";
import { PAYMENT_SOURCE_LABELS, PAYMENT_SOURCES } from "@/lib/format";

export function PaymentDialog({ licenseId }: { licenseId: string }) {
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  async function onSubmit(formData: FormData) {
    try {
      await addPayment(licenseId, formData);
      toast.success("Paiement enregistré");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'ajout");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Ajouter un paiement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau paiement</DialogTitle>
          <DialogDescription>
            Pass&apos;Sport, chèque, espèces, ANCV, CAF ou licence offerte.
            Les paiements HelloAsso remontent automatiquement.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="source">Moyen de paiement</Label>
            <Select name="source" defaultValue="cheque" required>
              <SelectTrigger id="source" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_SOURCES.filter((s) => s !== "helloasso").map((s) => (
                  <SelectItem key={s} value={s}>
                    {PAYMENT_SOURCE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Montant (€)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paid_at">Date</Label>
              <Input
                id="paid_at"
                name="paid_at"
                type="date"
                defaultValue={today}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reference">
              Référence (n° chèque, code Pass&apos;Sport…)
            </Label>
            <Input id="reference" name="reference" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" />
          </div>
          <div className="flex justify-end">
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
