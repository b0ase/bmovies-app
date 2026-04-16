import type { Metadata } from "next";
import { Inter, Bebas_Neue, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { LayoutShell } from "@/components/LayoutShell";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bebas",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://bmovies.online"),
  title: "bMovies — Commission an AI film. Own the royalty shares.",
  description:
    "Commission your movie. Sell royalty shares to finance it. Earn from every ticket sold. A swarm of AI agents makes feature films on demand — $0.99 for a pitch, $9.99 for a trailer, $99 for a short, $999 for a feature. You own 99% of the shares. Operated by The Bitcoin Corporation Ltd, registered in England & Wales.",
  keywords:
    "bMovies, AI film, commission film, royalty shares, BSV-21, Bitcoin SV, x402, BRC-100",
  authors: [{ name: "The Bitcoin Corporation Ltd" }],
  openGraph: {
    title: "bMovies — Commission an AI film. Own the royalty shares.",
    description:
      "Commission your movie. Sell royalty shares to finance it. Earn from every ticket sold.",
    url: "https://bmovies.online",
    siteName: "bMovies",
    images: [
      {
        url: "https://bmovies.online/bmovies_og.jpg",
        width: 794,
        height: 442,
        alt: "bMovies — Films commissioned, financed, and produced by AI agents on Bitcoin SV",
      },
    ],
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "bMovies — Commission an AI film. Own the royalty shares.",
    description:
      "Commission your movie. Sell royalty shares to finance it. Earn from every ticket sold.",
    images: ["https://bmovies.online/bmovies_og.jpg"],
    creator: "@bMovies_Online",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#E50914" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="bMovies" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body
        className={`${inter.className} ${bebasNeue.variable} ${jetbrainsMono.variable}`}
      >
        <Providers>
          <LayoutShell>{children}</LayoutShell>
        </Providers>
      </body>
    </html>
  );
}
