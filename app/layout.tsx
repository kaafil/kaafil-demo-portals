import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { BRAND } from '@/config/brand';
import './globals.css';

/**
 * The root layout deliberately carries NO PWA manifest link.
 *
 * The manifest belongs to the manager app alone and is declared in
 * `app/(manager)/layout.tsx`, scoped to `/m`. Declaring it here would make the
 * whole CRM installable, which is wrong twice over: a desk executive has no
 * use for an installed app, and an install scoped to `/` would capture the
 * share links too — a traveller who opened a share URL would be prompted to
 * install the operator's back office.
 *
 * A client branch that needs a specific typeface adds its `next/font` import
 * here and points `--font-sans` at it in `styles/tokens.css`. That is the only
 * reason to touch this file, and this branch is that case.
 *
 * Geist, sans and mono, because it is the pair the Kaafil developer portal is
 * set in. Anything else would mean the demo and the documentation a prospect
 * opens next are in different typefaces, which is precisely the seam this repo
 * exists to close. It is also the right shape for the work: open counters at
 * the 12–15px this UI runs at, and true tabular figures in the mono, which
 * `.tabular` puts every id, date and money figure into.
 *
 * `variable` rather than `className`, so the decision still LIVES in
 * `styles/tokens.css` with every other one — this file only makes the faces
 * available.
 */
const geistSans = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-sans',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  title: { default: BRAND.productName, template: `%s · ${BRAND.shortName}` },
  description: BRAND.tagline,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
