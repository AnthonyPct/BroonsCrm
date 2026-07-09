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
        <div className="mx-auto flex h-[72px] w-full max-w-[1160px] items-center gap-3.5 px-7">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center overflow-hidden rounded-[11px] bg-white">
              <Image
                src="/logo.svg"
                alt="HBC Pays de Broons"
                width={40}
                height={40}
              />
            </span>
            <span className="leading-tight">
              <span className="block font-display text-[15px] font-extrabold tracking-[-.01em] text-white">
                HBC Pays de Broons
              </span>
              <span className="block text-[10.5px] font-semibold tracking-[.02em] text-[#c9c1b6]">
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
              className="ml-2 rounded-[9px] bg-primary px-[18px] py-[11px] text-[13px] font-bold text-white shadow-[0_2px_10px_rgba(216,30,52,.35)] transition-colors hover:bg-[#e83049]"
            >
              Prendre sa licence
            </Link>
            <Link
              href="/crm/login"
              className="flex items-center gap-[5px] px-3 py-[9px] text-xs font-semibold text-[#9C958D] transition-colors hover:text-white"
            >
              <Lock className="size-3.5" />
              Espace bureau
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-white/5 bg-[#100d0a] text-[#8a837a]">
        <div className="mx-auto flex w-full max-w-[1160px] flex-wrap items-center gap-4 px-7 py-[34px]">
          <span className="flex size-9 items-center justify-center overflow-hidden rounded-[9px] bg-white">
            <Image src="/logo.svg" alt="" width={32} height={32} />
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
