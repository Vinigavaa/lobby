import type { Metadata, Viewport } from "next";
import { Baloo_2, Inter } from "next/font/google";
import "./globals.css";

const baloo2 = Baloo_2({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-baloo-2",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "PartyRoom",
  description: "Party games multiplayer para jogar entre amigos.",
};

/**
 * `viewportFit: "cover"` faz a pagina ocupar a tela inteira, por baixo do
 * entalhe e da barra de gestos. E o que da valor a `env(safe-area-inset-*)`:
 * sem isso o sistema encaixa a pagina na area segura e os insets valem zero.
 *
 * Sem `maximumScale`, de proposito: limitar o zoom quebraria a acessibilidade.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`dark h-full ${baloo2.variable} ${inter.variable}`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
