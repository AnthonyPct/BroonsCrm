"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteLicensee,
  saveLicenseNotes,
  toggleQualification,
} from "@/app/actions/licencies";
import { deletePayment } from "@/app/actions/paiements";
import { cn } from "@/lib/utils";

export function QualificationToggle({
  licenseId,
  qualified,
}: {
  licenseId: string;
  qualified: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await toggleQualification(licenseId, !qualified);
          toast.success(
            qualified ? "Qualification retirée" : "Qualification enregistrée"
          );
        })
      }
      className={cn(
        "h-[42px] w-full rounded-[10px] text-[13.5px] font-bold transition-colors disabled:opacity-60",
        qualified
          ? "border bg-card text-muted-foreground hover:border-[#9C958D]"
          : "border border-success bg-success text-white hover:bg-success-strong"
      )}
    >
      {qualified ? "Retirer la qualification" : "Marquer comme qualifiée"}
    </button>
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
    <button
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
      className="flex items-center gap-1.5 rounded-[9px] border border-[#f3ccd0] bg-accent px-3.5 py-2 text-[12.5px] font-bold text-destructive transition-colors hover:bg-[#f6d7da] disabled:opacity-60"
    >
      <Trash2 className="size-3.5" />
      Supprimer la fiche
    </button>
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
    <button
      title="Supprimer ce paiement"
      disabled={pending}
      onClick={() => {
        if (confirm("Supprimer ce paiement ?")) {
          startTransition(async () => {
            await deletePayment(paymentId, licenseId);
            toast.success("Paiement supprimé");
          });
        }
      }}
      className="flex size-7 items-center justify-center rounded-lg text-[#9C958D] transition-colors hover:bg-accent hover:text-destructive disabled:opacity-60"
    >
      <Trash2 className="size-4" />
    </button>
  );
}

export function NotesEditor({
  licenseId,
  initialNotes,
}: {
  licenseId: string;
  initialNotes: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [saved, setSaved] = useState(initialNotes);

  return (
    <textarea
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
      onBlur={async () => {
        if (notes !== saved) {
          await saveLicenseNotes(licenseId, notes);
          setSaved(notes);
          toast.success("Note enregistrée");
        }
      }}
      placeholder="Ajouter une note interne (chèque en attente, aide à confirmer…)"
      className="min-h-[88px] w-full rounded-[10px] border bg-card px-3 py-[11px] text-[13px] outline-none transition-colors placeholder:text-[#9C958D] focus:border-primary"
    />
  );
}
