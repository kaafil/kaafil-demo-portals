import type { Metadata } from 'next';
import { PageHead, Panel } from '@/components/ui';

export const metadata: Metadata = { title: 'On the ground' };

/**
 * PHASE 3 — this is where `KaafilAgencyWorkspace` mounts.
 *
 * It is a placeholder today and deliberately a loud one: an empty route that
 * silently renders nothing is indistinguishable from a broken one.
 *
 * What lands here:
 *
 *   'use client'
 *   import { KaafilUIKitProvider } from 'kaafil-react-uikit/core';
 *   import { KaafilAgencyWorkspace } from 'kaafil-react-uikit/admin';
 *
 *   <KaafilUIKitProvider accessToken={...} refreshToken={...} agencyRef={...} density="compact">
 *     <KaafilAgencyWorkspace onSelectTrip={...} onOpenTraveller={...} />
 *   </KaafilUIKitProvider>
 *
 * The tokens come from `POST /api/admin-session`, which calls
 * `kaafil.auth.mintAgencyAdminToken({ agencyAdminRef })` on the server, where
 * the API key lives. The browser never sees the key.
 */
export default function OperationsPage() {
  return (
    <>
      <PageHead
        title="On the ground"
        subtitle="Rooming, seating, pickups, the cash float and the day-by-day as it really ran."
      />
      <Panel title="Not wired up yet">
        <div className="p-4 text-base text-ink-soft">
          <p className="mt-0">
            This section is rendered by the Kaafil UI Kit —{' '}
            <code className="tabular">KaafilAgencyWorkspace</code> from{' '}
            <code className="tabular">kaafil-react-uikit/admin</code>. It is not mounted yet.
          </p>
          <p className="mb-0">
            Everything above it in the nav is Sharma Travels&rsquo; own software reading Sharma
            Travels&rsquo; own database. This one section is Kaafil, in the same chrome and under
            the same brand — which is the entire point of the exercise.
          </p>
        </div>
      </Panel>
    </>
  );
}
