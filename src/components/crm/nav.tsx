"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  GitBranch,
  LayoutGrid,
  Settings,
  Shirt,
  SlidersHorizontal,
  Ticket,
  Upload,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  {
    label: "Pilotage",
    links: [
      { href: "/crm/dashboard", label: "Tableau de bord", icon: LayoutGrid },
      { href: "/crm/licencies", label: "Licenciés", icon: Users, counter: "licensees" },
      {
        href: "/crm/reconciliation",
        label: "Réconciliation",
        icon: GitBranch,
        counter: "pending",
      },
      { href: "/crm/planning", label: "Journées", icon: CalendarDays },
      { href: "/crm/passsport", label: "Pass'Sport", icon: Ticket },
      { href: "/crm/saison", label: "Début de saison", icon: Upload },
    ],
  },
  {
    label: "Configuration",
    links: [
      {
        href: "/crm/parametres/tarifs",
        label: "Grille tarifaire",
        icon: SlidersHorizontal,
      },
      { href: "/crm/parametres/equipes", label: "Équipes", icon: Shirt },
      {
        href: "/crm/parametres/integrations",
        label: "Intégrations",
        icon: Settings,
      },
    ],
  },
] as const;

export function CrmNav({
  licenseeCount,
  pendingCount,
}: {
  licenseeCount: number;
  pendingCount: number;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col">
      {SECTIONS.map((section) => (
        <div key={section.label} className="px-3.5 pb-1.5 pt-3">
          <div className="px-3 pb-1.5 pt-2 text-[10.5px] font-bold uppercase tracking-[.09em] text-[#6f685f]">
            {section.label}
          </div>
          <nav className="flex flex-col gap-[3px]">
            {section.links.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(link.href + "/");
              const counter =
                "counter" in link
                  ? link.counter === "licensees"
                    ? licenseeCount
                    : pendingCount
                  : null;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-[11px] rounded-[9px] px-3 py-2.5 text-[13.5px] font-semibold transition-colors",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <link.icon className="size-[18px] shrink-0" strokeWidth={2} />
                  <span className="truncate">{link.label}</span>
                  {counter !== null && counter > 0 && (
                    <span
                      className={cn(
                        "ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold",
                        "counter" in link && link.counter === "pending"
                          ? "bg-primary text-white"
                          : "bg-white/10 text-sidebar-accent-foreground"
                      )}
                    >
                      {counter}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      ))}
    </div>
  );
}

/** Barre de navigation mobile : pills horizontales scrollables. */
export function CrmMobileNav({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname();
  const links = SECTIONS.flatMap((s) => [...s.links]);

  return (
    <nav className="flex gap-1.5">
      {links.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(link.href + "/");
        const showBadge =
          "counter" in link && link.counter === "pending" && pendingCount > 0;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground"
            )}
          >
            <link.icon className="size-3.5 shrink-0" strokeWidth={2} />
            {link.label}
            {showBadge && (
              <span className="rounded-full bg-primary px-1.5 text-[10.5px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

const PAGE_TITLES: [string, string][] = [
  ["/crm/dashboard", "Tableau de bord"],
  ["/crm/licencies/nouveau", "Nouveau licencié"],
  ["/crm/licencies/", "Fiche licencié"],
  ["/crm/licencies", "Licenciés"],
  ["/crm/reconciliation", "Réconciliation HelloAsso"],
  ["/crm/passsport", "Suivi Pass'Sport"],
  ["/crm/planning/", "Journée à domicile"],
  ["/crm/planning", "Journées à domicile"],
  ["/crm/parametres/equipes", "Équipes"],
  ["/crm/parametres/tarifs", "Grille tarifaire"],
  ["/crm/parametres/integrations", "Intégrations"],
  ["/crm/saison", "Début de saison"],
];

export function PageTitle() {
  const pathname = usePathname();
  const entry = PAGE_TITLES.find(([prefix]) =>
    prefix.endsWith("/") ? pathname.startsWith(prefix) : pathname === prefix
  );
  return (
    <h1 className="font-display text-[19px] font-bold tracking-[-.01em] text-foreground">
      {entry?.[1] ?? "CRM"}
    </h1>
  );
}
