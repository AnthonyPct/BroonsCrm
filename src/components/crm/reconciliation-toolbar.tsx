"use client";

import { useTransition } from "react";
import { RefreshCw, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { retryAutoMatch, triggerBackfill } from "@/app/actions/reconciliation";

export function ReconciliationToolbar() {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const matched = await retryAutoMatch();
            toast.success(
              matched
                ? `${matched} commande(s) rapprochée(s) automatiquement`
                : "Aucun rapprochement automatique possible"
            );
          })
        }
      >
        <Wand2 className="size-4" />
        Relancer le rapprochement auto
      </Button>
      <Button
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await triggerBackfill();
            if (result.ok) {
              toast.success(`Rattrapage HelloAsso lancé : ${result.message}`);
            } else {
              toast.error(result.message);
            }
          })
        }
      >
        <RefreshCw className="size-4" />
        Rattrapage HelloAsso
      </Button>
    </div>
  );
}
