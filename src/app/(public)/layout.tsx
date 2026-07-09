import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-[oklch(0.24_0.05_258)] text-white">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-[oklch(0.78_0.14_75)] text-sm font-black text-[oklch(0.22_0.05_258)]">
              HBC
            </span>
            <span className="text-lg font-bold tracking-tight">
              HBC Pays de Broons
            </span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Button
              asChild
              variant="ghost"
              className="text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/">Accueil</Link>
            </Button>
            <Button
              asChild
              className="bg-[oklch(0.78_0.14_75)] font-semibold text-[oklch(0.22_0.05_258)] hover:bg-[oklch(0.72_0.14_75)]"
            >
              <Link href="/licence">Prendre sa licence</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-[oklch(0.24_0.05_258)] text-white">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          <div>
            <h3 className="mb-2 font-bold">HBC Pays de Broons</h3>
            <p className="text-sm text-white/70">
              Club de handball du Pays de Broons — Côtes-d&apos;Armor,
              Bretagne.
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-bold">Liens utiles</h3>
            <ul className="space-y-1 text-sm text-white/70">
              <li>
                <a
                  href="https://www.ffhandball.fr/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white"
                >
                  FFHandball
                </a>
              </li>
              <li>
                <a
                  href="https://gesthand.ffhandball.fr/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white"
                >
                  Gesthand (licences)
                </a>
              </li>
              <li>
                <a
                  href="https://www.helloasso.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white"
                >
                  HelloAsso (paiement)
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-2 font-bold">Contact</h3>
            <ul className="space-y-1 text-sm text-white/70">
              <li>Salle des sports de Broons</li>
              <li>22250 Broons</li>
              <li>
                <Link href="/crm/login" className="hover:text-white">
                  Accès bureau
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
          © {new Date().getFullYear()} HBC Pays de Broons
        </div>
      </footer>
    </div>
  );
}
