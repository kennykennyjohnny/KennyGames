import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { APP_NAME } from "@/lib/config";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: `${APP_NAME} — Parie sur tout. Sauf ton fric.`,
  description:
    "Le jeu de prédiction social français à monnaie fictive. Téléréalité, politique, musique, buzz... et paris entre potes. Zéro euro en jeu.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${bricolage.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
