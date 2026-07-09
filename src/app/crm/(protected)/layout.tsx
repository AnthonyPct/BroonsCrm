import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { CrmNav } from "@/components/crm/nav";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <Link href="/crm/dashboard" className="flex items-center gap-3 p-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sm font-black text-sidebar-primary-foreground">
            HBC
          </span>
          <div className="leading-tight">
            <div className="font-bold">CRM Licences</div>
            <div className="text-xs text-sidebar-foreground/60">
              HBC Pays de Broons
            </div>
          </div>
        </Link>
        <div className="flex-1 overflow-y-auto py-2">
          <CrmNav />
        </div>
        <div className="border-t border-sidebar-border p-3">
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              className="w-full justify-start gap-3 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <LogOut className="size-4" />
              Se déconnecter
            </Button>
          </form>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-sidebar px-4 text-sidebar-foreground md:hidden">
          <Link href="/crm/dashboard" className="font-bold">
            CRM Licences HBC
          </Link>
          <form action={signOut}>
            <Button
              type="submit"
              size="sm"
              variant="ghost"
              className="text-sidebar-foreground/80"
            >
              <LogOut className="size-4" />
            </Button>
          </form>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b bg-sidebar px-2 py-2 text-sidebar-foreground md:hidden">
          <CrmNav />
        </nav>
        <main className="flex-1 bg-background p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
