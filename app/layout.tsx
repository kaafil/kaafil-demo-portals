import type { Metadata, Viewport } from 'next';
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
 * reason to touch this file.
 */

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
    <html lang="en-IN">
      <body>{children}</body>
    </html>
  );
}
