import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PartyRoom",
  description: "Party games multiplayer para jogar entre amigos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
