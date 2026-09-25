"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/#equipes", label: "Le club" },
  { href: "/matchs", label: "Matchs" },
  { href: "/#infos", label: "Horaires & lieu" },
  { href: "/#contact", label: "Contact" },
];

/**
 * Liens de navigation du site public. Deux rendus d'une même liste : en
 * ligne dans l'en-tête sur desktop, en bandeau sous l'en-tête sur mobile —
 * un bandeau plutôt qu'un menu burger, pour que « Matchs » reste à un tap.
 */
export function PublicNavLinks({ variant }: { variant: "desktop" | "mobile" }) {
  const pathname = usePathname();
  // Seules les vraies pages peuvent être « en cours » : les ancres de
  // l'accueil (/#infos…) ne se distinguent pas côté serveur.
  const isActive = (href: string) => !href.includes("#") && pathname === href;

  if (variant === "desktop") {
    return (
      <>
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive(link.href) ? "page" : undefined}
            className={cn(
              "hidden rounded-lg px-3.5 py-[9px] text-[13.5px] font-semibold transition-colors hover:bg-white/10 hover:text-white sm:block",
              isActive(link.href) ? "bg-white/10 text-white" : "text-[#e7e1d7]",
            )}
          >
            {link.label}
          </Link>
        ))}
      </>
    );
  }

  return (
    <div className="border-t border-white/10 sm:hidden">
      <div className="flex h-11 items-stretch justify-between overflow-x-auto px-2 [scrollbar-width:none]">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive(link.href) ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center whitespace-nowrap border-b-2 px-3 text-[13px] font-semibold transition-colors",
              isActive(link.href)
                ? "border-primary text-white"
                : "border-transparent text-[#c9c1b6] active:text-white",
            )}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
