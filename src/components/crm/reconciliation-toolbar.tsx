"use client";

import { useTransition } from "react";
import { RefreshCw, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { retryAutoMatch, triggerBackfill } from "@/app/actions/reconciliation";

export function ReconciliationToolbar() {
  const [pending, startTransition] = useTransition();

  const btn =
    "flex items-center gap-1.5 rounded-[9px] border bg-card px-3.5 py-2 text-[12.5px] font-bold transition-colors hover:border-primary hover:text-primary disabled:opacity-50";

  return (
    <div className="flex flex-wrap gap-2">
      <button
        className={btn}
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
        <Wand2 className="size-3.5" />
        Relancer le rapprochement auto
      </button>
      <button
        className={btn}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await triggerBackfill();
            if (result.ok) {
              toast.success("Rattrapage lancé · synchronisation en cours…");
            } else {
              toast.error(result.message);
            }
          })
        }
      >
        <RefreshCw className="size-3.5" />
        Lancer un rattrapage maintenant
      </button>
    </div>
  );
}
