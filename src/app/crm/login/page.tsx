import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { signIn } from "@/app/actions/auth";

export const metadata: Metadata = {
  title: "Connexion CRM",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#17130F] px-4">
      <div
        className="pointer-events-none absolute -right-40 -top-32 size-[560px] rounded-full border-[52px] border-[rgba(216,30,52,.16)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-32 size-[420px] rounded-full border-[40px] border-[rgba(216,30,52,.1)]"
        aria-hidden
      />
      <div className="relative w-full max-w-sm rounded-[18px] bg-white p-[26px] shadow-[0_24px_60px_rgba(0,0,0,.28)]">
        <div className="text-center">
          <span className="mx-auto flex size-14 items-center justify-center overflow-hidden rounded-2xl border bg-white">
            <Image src="/logo.png" alt="HBC Pays de Broons" width={50} height={50} />
          </span>
          <h1 className="mt-3 font-display text-[19px] font-extrabold">
            CRM Licences
          </h1>
          <p className="mt-1 text-[13px] text-[#9C958D]">
            Accès réservé au bureau du HBC Pays de Broons
          </p>
        </div>

        {error && (
          <div className="mt-5 flex items-center gap-2 rounded-[10px] bg-accent px-3 py-2.5 text-[13px] font-semibold text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            Email ou mot de passe incorrect.
          </div>
        )}

        <form action={signIn} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="text-xs font-bold text-muted-foreground"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              placeholder="admin@hbcpaysdebroons.fr"
              className="mt-1.5 h-[42px] w-full rounded-[10px] border bg-card px-3 text-sm outline-none transition-colors focus:border-primary"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="text-xs font-bold text-muted-foreground"
            >
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1.5 h-[42px] w-full rounded-[10px] border bg-card px-3 text-sm outline-none transition-colors focus:border-primary"
            />
          </div>
          <button
            type="submit"
            className="h-11 w-full rounded-[10px] bg-primary text-[13.5px] font-bold text-white shadow-[0_2px_8px_rgba(216,30,52,.28)] transition-colors hover:bg-[#B0122A]"
          >
            Se connecter
          </button>
        </form>
        <p className="mt-4 text-center text-[13px] text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-primary">
            ← Retour au site du club
          </Link>
        </p>
      </div>
    </div>
  );
}
