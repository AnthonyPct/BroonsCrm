"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  deleteLicensee,
  toggleQualification,
} from "@/app/actions/licencies";
import { deletePayment } from "@/app/actions/paiements";

export function QualificationToggle({
  licenseId,
  qualified,
}: {
  licenseId: string;
  qualified: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <Switch
        id="qualification"
        checked={qualified}
        disabled={pending}
        onCheckedChange={(checked) =>
          startTransition(async () => {
            await toggleQualification(licenseId, checked);
            toast.success(
              checked
                ? "Licence marquée qualifiée"
                : "Qualification retirée"
            );
          })
        }
      />
      <Label htmlFor="qualification" className="cursor-pointer">
        Licence qualifiée dans Gesthand
      </Label>
    </div>
  );
}

export function DeleteLicenseeButton({
  licenseId,
  memberId,
}: {
  licenseId: string;
  memberId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (
          confirm(
            "Supprimer cette licence (et le licencié s'il n'a pas d'autre licence) ? Les paiements associés seront supprimés."
          )
        ) {
          startTransition(() => deleteLicensee(licenseId, memberId));
        }
      }}
    >
      <Trash2 className="size-4" />
      Supprimer
    </Button>
  );
}

export function DeletePaymentButton({
  paymentId,
  licenseId,
}: {
  paymentId: string;
  licenseId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground hover:text-destructive"
      disabled={pending}
      onClick={() => {
        if (confirm("Supprimer ce paiement ?")) {
          startTransition(async () => {
            await deletePayment(paymentId, licenseId);
            toast.success("Paiement supprimé");
          });
        }
      }}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
