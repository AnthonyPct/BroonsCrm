import Image from "next/image";
import Link from "next/link";
import { Lock } from "lucide-react";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[rgba(23,19,15,.96)] backdrop-blur-md">
        <div className="mx-auto flex h-[72px] w-full max-w-[1160px] items-center gap-2 px-4 sm:gap-3.5 sm:px-7">
          <Link href="/" className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[11px] bg-white sm:size-11">
              <Image
                src="/logo.png"
                alt="HBC Pays de Broons"
                width={40}
                height={40}
              />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-display text-[14px] font-extrabold tracking-[-.01em] text-white sm:text-[15px]">
                HBC Pays de Broons
              </span>
              <span className="hidden text-[10.5px] font-semibold tracking-[.02em] text-[#c9c1b6] sm:block">
                Handball Club
              </span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/#equipes"
              className="hidden rounded-lg px-3.5 py-[9px] text-[13.5px] font-semibold text-[#e7e1d7] transition-colors hover:bg-white/10 hover:text-white sm:block"
            >
              Le club
            </Link>
            <Link
              href="/#infos"
              className="hidden rounded-lg px-3.5 py-[9px] text-[13.5px] font-semibold text-[#e7e1d7] transition-colors hover:bg-white/10 hover:text-white sm:block"
            >
              Horaires &amp; lieu
            </Link>
            <Link
              href="/#contact"
              className="hidden rounded-lg px-3.5 py-[9px] text-[13.5px] font-semibold text-[#e7e1d7] transition-colors hover:bg-white/10 hover:text-white sm:block"
            >
              Contact
            </Link>
            <Link
              href="/licence"
              className="ml-1 shrink-0 whitespace-nowrap rounded-[9px] bg-primary px-3 py-2.5 text-xs font-bold text-white shadow-[0_2px_10px_rgba(216,30,52,.35)] transition-colors hover:bg-[#e83049] sm:ml-2 sm:px-[18px] sm:py-[11px] sm:text-[13px]"
            >
              Prendre sa licence
            </Link>
            <Link
              href="/crm/login"
              title="Espace bureau"
              className="flex shrink-0 items-center gap-[5px] px-2 py-[9px] text-xs font-semibold text-[#9C958D] transition-colors hover:text-white sm:px-3"
            >
              <Lock className="size-3.5" />
              <span className="hidden md:inline">Espace bureau</span>
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-white/5 bg-[#100d0a] text-[#8a837a]">
        <div className="mx-auto flex w-full max-w-[1160px] flex-wrap items-center gap-4 px-7 py-[34px]">
          <span className="flex size-9 items-center justify-center overflow-hidden rounded-[9px] bg-white">
            <Image src="/logo.png" alt="" width={32} height={32} />
          </span>
          <span className="text-[13px] font-semibold text-[#c9c1b6]">
            Handball Club du Pays de Broons
          </span>
          <span className="ml-auto text-xs">
            © {new Date().getFullYear()} · Site du club ·{" "}
            <Link href="/crm/login" className="transition-colors hover:text-white">
              Espace bureau
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
