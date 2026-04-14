import type { Metadata } from "next";
import {
  Inter, Orbitron, Permanent_Marker,
  Bebas_Neue, Anton, Black_Ops_One, Russo_One, Teko, Staatliches,
  Bungee, Monoton, Press_Start_2P, Creepster, Special_Elite,
  Rubik_Mono_One, Bungee_Shade, Sedan_SC,
} from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { LayoutShell } from "@/components/LayoutShell";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-brand",
});

const permanentMarker = Permanent_Marker({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-graffiti",
});

// ── Display / Title fonts ──
const bebasNeue = Bebas_Neue({ subsets: ["latin"], weight: "400", variable: "--font-bebas" });
const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-anton" });
const blackOpsOne = Black_Ops_One({ subsets: ["latin"], weight: "400", variable: "--font-blackops" });
const russoOne = Russo_One({ subsets: ["latin"], weight: "400", variable: "--font-russo" });
const teko = Teko({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-teko" });
const staatliches = Staatliches({ subsets: ["latin"], weight: "400", variable: "--font-staatliches" });
const bungee = Bungee({ subsets: ["latin"], weight: "400", variable: "--font-bungee" });
const bungeeShade = Bungee_Shade({ subsets: ["latin"], weight: "400", variable: "--font-bungee-shade" });
const monoton = Monoton({ subsets: ["latin"], weight: "400", variable: "--font-monoton" });
const pressStart = Press_Start_2P({ subsets: ["latin"], weight: "400", variable: "--font-pixel" });
const creepster = Creepster({ subsets: ["latin"], weight: "400", variable: "--font-creepster" });
const specialElite = Special_Elite({ subsets: ["latin"], weight: "400", variable: "--font-typewriter" });
const rubikMonoOne = Rubik_Mono_One({ subsets: ["latin"], weight: "400", variable: "--font-rubik-mono" });
const sedanSC = Sedan_SC({ subsets: ["latin"], weight: "400", variable: "--font-sedan" });

export const metadata: Metadata = {
  metadataBase: new URL('https://www.npg-x.com'),
  title: "NPGX — 26 Girls. Your Fantasy. Your Film.",
  description: "Generative adult cinema on Bitcoin. 26 collectible characters. Direct movies, create music, trade on the exchange. $403 protocol. Powered by HandCash, OpenClaw, BSV.",
  keywords: "NPGX, ninja punk girls, generative video, AI cinema, Bitcoin SV, $403, adult content, blockchain tokens, content creation",
  authors: [{ name: "Ninja Punk Girls X" }],
  openGraph: {
    title: "NPGX — 26 Girls. Your Fantasy. Your Film.",
    description: "Generative adult cinema on Bitcoin. Direct movies, create music, trade content. 26 AI characters with their own tokens. $403 protocol.",
    url: "https://www.npg-x.com",
    siteName: "NPGX",
    images: [
      {
        url: "/NPGX-OG.jpg",
        width: 1200,
        height: 630,
        alt: "NPGX — Ninja Punk Girls X"
      }
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NPGX — 26 Girls. Your Fantasy. Your Film.",
    description: "Generative adult cinema on Bitcoin. 26 collectible characters. Direct movies, create music, trade on the exchange. $403 protocol.",
    images: ["/NPGX-OG.jpg"],
    creator: "@ninjapunkgirls",
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
        <script dangerouslySetInnerHTML={{ __html: `
          if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(r){r.forEach(function(w){w.unregister()})});caches.keys().then(function(k){k.forEach(function(n){caches.delete(n)})})}
        `}} />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#dc2626" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="OpenClaw" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${inter.className} ${orbitron.variable} ${permanentMarker.variable} ${bebasNeue.variable} ${anton.variable} ${blackOpsOne.variable} ${russoOne.variable} ${teko.variable} ${staatliches.variable} ${bungee.variable} ${bungeeShade.variable} ${monoton.variable} ${pressStart.variable} ${creepster.variable} ${specialElite.variable} ${rubikMonoOne.variable} ${sedanSC.variable}`}>
        <Providers>
          <LayoutShell>
            {children}
          </LayoutShell>
        </Providers>
      </body>
    </html>
  );
}
