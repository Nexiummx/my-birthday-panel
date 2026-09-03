import type { Metadata } from "next";
import { Caveat, Cormorant_Garamond, Jost, Pinyon_Script } from "next/font/google";
import { siteUrl } from "@/lib/utils";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const pinyon = Pinyon_Script({
  variable: "--font-pinyon",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

// Anotaciones a mano alzada sobre los enlaces de la invitación.
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  // Sin metadataBase las miniaturas de las invitaciones se anunciarían con una
  // ruta relativa, que WhatsApp y los demás clientes no saben resolver.
  metadataBase: new URL(siteUrl()),
  title: "Invitaciones · Bosque Encantado",
  description:
    "Invitaciones digitales con una experiencia de apertura cinematográfica inspirada en un bosque encantado.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${cormorant.variable} ${jost.variable} ${pinyon.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
