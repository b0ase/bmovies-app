import type { Metadata } from 'next'

/**
 * Server-component layout for /account so we can export real metadata.
 * The page itself is 'use client' and cannot export metadata directly.
 * We noindex the page because it's a user-authed dashboard with no
 * public value; we also override the inherited landing-page title +
 * OG tags so browser tabs, search previews, and social cards all say
 * "My studio · bMovies" instead of the generic landing copy.
 */
export const metadata: Metadata = {
  title: 'My studio · bMovies',
  description:
    "Your films, cap tables, agents, and dividends — the bMovies studio dashboard. Track every commission, every royalty share, every on-chain token mint, and every dividend payout from one place.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
  openGraph: {
    title: 'My studio · bMovies',
    description:
      'Your films, cap tables, agents, and dividends — the bMovies studio dashboard.',
    url: 'https://bmovies.online/account',
    siteName: 'bMovies',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'My studio · bMovies',
    description:
      'Your films, cap tables, agents, and dividends — the bMovies studio dashboard.',
  },
}

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
