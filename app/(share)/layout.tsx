import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

/**
 * The traveller's share surface. No gate, no shell, no brand chrome.
 *
 * ── WHY THIS GROUP HAS ALMOST NOTHING IN IT ────────────────────────────────
 *
 * A share link is opened by somebody's mother, on her phone, from WhatsApp,
 * with no account and no idea what a CRM is. The token in the URL IS the
 * authentication — there is nothing to sign into — and the page should read as
 * a published document rather than as an app she is logged out of.
 *
 * So: no masthead, no nav, no sign-out, and a plain white ground via
 * `data-surface="share"` rather than the CRM's canvas grey.
 *
 * No PWA manifest either. This group is deliberately outside `/m`'s scope, and
 * that is the second reason the manifest is scoped rather than root-level —
 * prompting a traveller to install a tour operator's back office would be
 * absurd.
 */

export const metadata: Metadata = {
  title: 'Your trip',
  // A share link is a private document handed to one household. Indexing it
  // would put a manifest with names and phone numbers into a search engine.
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function ShareLayout({ children }: { children: ReactNode }) {
  return <div data-surface="share">{children}</div>;
}
