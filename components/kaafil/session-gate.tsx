'use client';

import { useSession } from 'kaafil-react-uikit/core';
import type { ReactNode } from 'react';

/**
 * Renders children only once the session is actually open.
 *
 * ── WHY A HOST HAS TO DO THIS ──────────────────────────────────────────────
 *
 * With a `credentialResolver` the session opens asynchronously, so there is a
 * window — the first commit — where `SessionShell` has mounted but no client
 * exists yet. A component that calls a data hook in that window gets:
 *
 *   useKaafilClient() was called outside a <SessionShell>
 *
 * which is a misleading message for what is really a timing problem: the shell
 * is right there, it just has nothing to hand down yet.
 *
 * The big Surfaces (`KaafilAgencyWorkspace`) handle this themselves and render
 * their own boot state. `TripWorkspace` does not, because its intended home is
 * inside one of those — the kit's own types say the agency Surface "now mounts
 * TripWorkspace itself". Mounting it directly, which is what we want so the CRM
 * keeps its navigation, means taking on the one thing the parent Surface was
 * doing for it.
 *
 * Worth knowing the failure is silent-ish: the child throws on first render,
 * the error boundary swallows it, the subtree unmounts, and the effect that
 * would have opened the session never runs. So the network tab shows NO
 * request at all — which reads like a broken credential rather than a race.
 */
export function WhenSessionReady({ children, label }: { children: ReactNode; label: string }) {
  const session = useSession();

  if (session.status === 'opening') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-card border border-border bg-surface p-6 text-center text-base text-ink-faint shadow-card"
      >
        Opening {label}…
      </div>
    );
  }

  if (session.status === 'expired') {
    return (
      <div className="rounded-card border border-warning-border bg-warning-bg p-6 text-center text-base text-warning">
        This session has expired. Reload the page to sign in again.
      </div>
    );
  }

  return <>{children}</>;
}
