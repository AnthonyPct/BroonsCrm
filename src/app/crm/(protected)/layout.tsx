import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { CrmNav, PageTitle } from "@/components/crm/nav";
import { createClient } from "@/lib/supabase/server";

export default async function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/crm/login");
  }

  const [{ data: season }, { count: licenseeCount }, { count: pendingCount }] =
    await Promise.all([
      supabase.from("seasons").select("id, label").eq("is_current", true).maybeSingle(),
      supabase.from("licenses").select("id", { count: "exact", head: true }),
      supabase
        .from("helloasso_orders")
        .select("id", { count: "exact", head: true })
        .eq("match_status", "pending"),
    ]);

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <Link
          href="/crm/dashboard"
          className="flex items-center gap-3 border-b border-sidebar-border px-5 pb-[18px] pt-[22px]"
        >
          <span className="flex size-[46px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
            <Image src="/logo.svg" alt="HBC Pays de Broons" width={42} height={42} />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-[15px] font-extrabold text-sidebar-accent-foreground">
              HBC Pays de Broons
            </span>
            <span className="block text-[11px] font-medium text-[#9C958D]">
              Gestion des licences
            </span>
          </span>
        </Link>

        <div className="flex-1 overflow-y-auto">
          <CrmNav
            licenseeCount={licenseeCount ?? 0}
            pendingCount={pendingCount ?? 0}
          />
        </div>

        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#D81E34] to-[#8f0f20] font-display text-[13px] font-bold text-white">
              BC
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[13px] font-bold text-sidebar-accent-foreground">
                Bureau du club
              </span>
              <span className="block text-[11px] text-[#9C958D]">
                Compte partagé
              </span>
            </span>
            <form action={signOut}>
              <button
                type="submit"
                title="Se déconnecter"
                className="flex size-8 items-center justify-center rounded-lg text-[#9C958D] transition-colors hover:bg-sidebar-accent hover:text-white"
              >
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-[rgba(245,243,239,.85)] px-7 backdrop-blur-md">
          <PageTitle />
          <div className="ml-auto hidden items-center gap-3 sm:flex">
            <span className="flex items-center gap-2 rounded-full border bg-card px-3.5 py-[7px] text-[12.5px] font-semibold text-muted-foreground">
              <span className="size-2 rounded-full bg-success shadow-[0_0_0_3px_rgba(31,138,91,.15)]" />
              Webhook HelloAsso actif
            </span>
            <span className="rounded-full border bg-card px-3.5 py-[7px] text-[12.5px] font-semibold text-muted-foreground">
              Saison {season?.label ?? "—"}
            </span>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b bg-sidebar px-2 py-2 text-sidebar-foreground md:hidden">
          <CrmNav
            licenseeCount={licenseeCount ?? 0}
            pendingCount={pendingCount ?? 0}
          />
        </nav>

        <main className="flex-1 bg-background p-7">{children}</main>
      </div>
    </div>
  );
}
