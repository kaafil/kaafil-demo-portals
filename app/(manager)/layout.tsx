import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { BRAND } from '@/config/brand';

/**
 * The manager app's group layout. It carries the PWA declarations and NOT the
 * auth gate.
 *
 * ── WHY THE MANIFEST IS HERE AND NOWHERE ELSE ──────────────────────────────
 *
 * `public/manifest.webmanifest` is scoped to `/m`, and it is linked from this
 * layout only. Putting it in the root layout would make the whole CRM
 * installable, which is wrong twice: a desk executive has no use for an
 * installed app, and a root-scoped install would capture the share links too —
 * a traveller who opened a share URL would be prompted to install the
 * operator's back office.
 *
 * ── WHY THE GATE IS ONE LEVEL DOWN ─────────────────────────────────────────
 *
 * `/m/login` lives under this group and must stay public, so the gate sits in
 * `m/(app)/layout.tsx` instead — the shallowest layout under which every route
 * really is authenticated. Same rule as the desk portal, different depth.
 *
 * The manifest, though, deliberately covers the sign-in screen as well: a tour
 * leader installs the app and then signs in, not the other way round.
 */

export const metadata: Metadata = {
  title: { default: `${BRAND.shortName} Field`, template: `%s · Field` },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // A tour leader is one-handed at a bus door. Pinch-zoom on a form field that
  // the browser decided to auto-zoom is how you lose the queue behind you.
  maximumScale: 1,
  userScalable: false,
  // Keeps content clear of a notch and, more importantly, of the home
  // indicator — which is exactly where a bottom tab bar wants to sit.
  viewportFit: 'cover',
};

export default function ManagerGroupLayout({ children }: { children: ReactNode }) {
  return children;
}
