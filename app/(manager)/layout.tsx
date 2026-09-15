import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { RegisterServiceWorker } from '@/components/kaafil/register-sw';
import { BRAND } from '@/config/brand';

/**
 * The manager app's group layout. It carries the PWA declarations and NOT the
 * auth gate.
 *
 * ── WHY THE MANIFEST IS HERE AND NOWHERE ELSE ──────────────────────────────
 *
 * The manifest is scoped to `/m`, and it is linked from this
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
 *
 * ── THE MANIFEST IS GENERATED, NOT A FILE ──────────────────────────────────
 *
 * `app/manifest.ts` builds it from `config/brand.ts` and `styles/tokens.css`,
 * and Next serves it at the path below. There is deliberately no
 * `public/manifest.webmanifest` to edit: when there was, it named one operator
 * and every client branch inherited that name and colour without ever having a
 * reason to look at the file. A branch never touches this.
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
  return (
    <>
      {/*
        Here rather than in `m/(app)` so the worker is registered on the SIGN-IN
        screen too. A tour leader installs the app, signs in, and goes to a
        valley — if registration waited for the authenticated tree, the shell
        would be cached only after they were already past the one screen they
        cannot get past without signal.
      */}
      <RegisterServiceWorker />
      {children}
    </>
  );
}
