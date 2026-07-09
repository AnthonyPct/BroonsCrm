"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  CalendarPlus,
  Euro,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/crm/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/crm/licencies", label: "Licenciés", icon: Users },
  {
    href: "/crm/reconciliation",
    label: "Réconciliation HelloAsso",
    icon: ArrowLeftRight,
  },
  { href: "/crm/saison", label: "Début de saison", icon: CalendarPlus },
  { href: "/crm/parametres/tarifs", label: "Grille tarifaire", icon: Euro },
  {
    href: "/crm/parametres/integrations",
    label: "Intégrations",
    icon: Settings,
  },
];

export function CrmNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3">
      {links.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <link.icon className="size-4 shrink-0" />
            <span className="truncate">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
