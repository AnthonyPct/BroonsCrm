import type { Metadata } from "next";
import { Archivo, Manrope } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://hbcpaysdebroons.fr"),
  title: {
    default:
      "HBC Pays de Broons — Club de handball à Broons (Côtes-d'Armor, 22)",
    template: "%s · HBC Pays de Broons",
  },
  description:
    "Site officiel du HBC Pays de Broons, club de handball à Broons dans les Côtes-d'Armor (22) : école de hand dès 7 ans, équipes jeunes et séniors, licences, horaires d'entraînement et matchs à domicile à la salle du Chalet.",
  keywords: [
    "handball Broons",
    "HBC Pays de Broons",
    "club handball Côtes-d'Armor",
    "handball 22",
    "hbcpaysdebroons",
    "école de hand Broons",
    "licence handball Broons",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "HBC Pays de Broons",
    url: "https://hbcpaysdebroons.fr",
    title: "HBC Pays de Broons — Club de handball à Broons (22)",
    description:
      "Le club de handball du Pays de Broons : école de hand dès 7 ans, équipes jeunes et séniors, licences et matchs à domicile.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HBC Pays de Broons — Club de handball à Broons (22)",
    description:
      "École de hand dès 7 ans, équipes jeunes et séniors, licences et matchs à domicile.",
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${archivo.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster richColors position="bottom-center" />
      </body>
    </html>
  );
}
