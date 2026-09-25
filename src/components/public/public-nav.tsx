"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/#equipes", label: "Le club" },
  { href: "/matchs", label: "Matchs" },
  { href: "/#infos", label: "Horaires & lieu" },
  { href: "/#contact", label: "Contact" },
];

/** Seules les vraies pages peuvent être « en cours » : pas les ancres de l'accueil. */
function useIsActive() {
  const pathname = usePathname();
  return (href: string) => !href.includes("#") && pathname === href;
}

/** Liens en ligne dans l'en-tête, à partir de la tablette. */
export function PublicNavLinks() {
  const isActive = useIsActive();
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

/** Menu burger sur mobile : un panneau déroulant sous l'en-tête. */
export function PublicMobileMenu() {
  const pathname = usePathname();
  const isActive = useIsActive();
  // On retient la page où le menu a été ouvert : dès qu'on en change (lien,
  // bouton retour), il est fermé sans effet ni rendu supplémentaire.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const setOpen = (value: boolean) => setOpenedOn(value ? pathname : null);

  // Fermé à la touche Échap.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenedOn(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="menu-mobile"
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        className="flex size-10 items-center justify-center rounded-[9px] text-white transition-colors hover:bg-white/10"
      >
        {open ? <X className="size-[22px]" /> : <Menu className="size-[22px]" />}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-x-0 bottom-0 top-[72px] bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            id="menu-mobile"
            className="absolute inset-x-0 top-full border-b border-white/10 bg-[#17130F] px-4 pb-4 pt-2 shadow-[0_18px_40px_rgba(0,0,0,.35)]"
          >
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={cn(
                  "flex items-center justify-between rounded-[10px] px-3 py-3.5 text-[15px] font-semibold transition-colors active:bg-white/10",
                  isActive(link.href) ? "text-white" : "text-[#e7e1d7]",
                )}
              >
                {link.label}
                {isActive(link.href) && <span className="size-2 rounded-full bg-primary" />}
              </Link>
            ))}
            <Link
              href="/crm/login"
              onClick={() => setOpen(false)}
              className="mt-2 flex items-center gap-2 border-t border-white/10 px-3 pt-4 text-[13px] font-semibold text-[#9C958D]"
            >
              <Lock className="size-3.5" />
              Espace bureau
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
