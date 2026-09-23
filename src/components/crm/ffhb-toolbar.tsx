"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { triggerFfhbSync } from "@/app/actions/ffhb";

export function FfhbToolbar() {
  const [pending, startTransition] = useTransition();

  const btn =
    "flex items-center gap-1.5 rounded-[9px] border bg-card px-3.5 py-2 text-[12.5px] font-bold transition-colors hover:border-primary hover:text-primary disabled:opacity-50";

  function run(scope: "window" | "full", label: string) {
    startTransition(async () => {
      const result = await triggerFfhbSync(scope);
      if (result.ok) toast.success(`${label} — ${result.message}`);
      else toast.error(result.message);
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        className={btn}
        disabled={pending}
        onClick={() => run("window", "Synchronisation")}
        title="Relit les journées autour de la journée courante (rapide)"
      >
        <RefreshCw className="size-3.5" />
        Synchroniser maintenant
      </button>
      <button
        className={btn}
        disabled={pending}
        onClick={() => run("full", "Saison relue")}
        title="Relit toutes les journées de chaque poule — une minute environ"
      >
        Relire toute la saison
      </button>
    </div>
  );
}
