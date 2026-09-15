'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

/**
 * Loads a Kaafil surface in the browser only.
 *
 * ── WHY `ssr: false` IS NOT OPTIONAL HERE ──────────────────────────────────
 *
 * Server-render one of these surfaces and it fails with:
 *
 *   useKaafilClient() was called outside a <SessionShell> — mount the provider
 *   tree above this component before calling this hook.
 *
 * The message misleads, because the provider IS above it. The real cause is
 * that the session opens through an async fetch to `/api/admin-session`, and
 * there is no such thing as an async same-origin fetch during a server render —
 * so on the server the provider has no client to hand down, and the first
 * component to ask for one throws.
 *
 * This is not a quirk to work around; it is what these surfaces are. Once the
 * browser holds a session it talks to the engine DIRECTLY, and the manager
 * surface additionally wants IndexedDB. None of that has a server-side
 * meaning, and server-rendering a shell of it would only produce markup that
 * is thrown away and replaced on hydration.
 *
 * So: one boundary, declared once, with the loading state the host controls.
 * `ssr: false` is only legal inside a client component, which is why this file
 * carries the directive and the pages do not.
 */
export function browserOnly<P extends object>(
  load: () => Promise<{ default: ComponentType<P> }>,
  label: string,
): ComponentType<P> {
  return dynamic(load, {
    ssr: false,
    // The host's own skeleton, not the kit's. This is the moment before the
    // kit has mounted at all, so there is nothing of Kaafil's to show — and a
    // blank panel for a second reads as broken.
    loading: () => (
      <div
        role="status"
        aria-live="polite"
        className="rounded-card border border-border bg-surface p-6 text-center text-base text-ink-faint shadow-card"
      >
        Loading {label}…
      </div>
    ),
  });
}
