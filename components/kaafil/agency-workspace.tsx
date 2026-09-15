'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { KaafilAgencyWorkspace } from 'kaafil-react-uikit/admin';
import { KaafilUIKitProvider } from 'kaafil-react-uikit/core';
import { agencyAdminCredential } from './credential';
import { buildShareUrl, hostBrand } from './brand';

/**
 * The desk surface: Kaafil's agency workspace, inside the CRM's own page.
 *
 * ── WHAT MAKES THIS THE agencyAdmin PERSONA ────────────────────────────────
 *
 * Nothing on this component. There is no `persona` prop and no `mode` prop.
 * The resolver below calls `POST /api/admin-session`, that route calls
 * `mintAgencyAdminToken`, and the persona is a claim inside the token the
 * provider reads out. Point the same component at `managerCredential` and it
 * renders the manager surface instead — which is exactly why the two sign-ins
 * are kept apart, and why the mint routes check who is asking.
 *
 * ── WHY THE CALLBACKS GO TO THE CRM'S ROUTER ───────────────────────────────
 *
 * The kit ships no router. Every navigation is an `on*` callback, and the host
 * decides what a click means. So selecting a trip inside Kaafil pushes the
 * CRM's own `/admin/trips/:id` — the same URL the CRM's own list links to.
 *
 * That is the whole trick behind "it doesn't feel bolted on". A tab that
 * navigates only within itself reads as an iframe no matter how it is styled;
 * one whose links change the address bar to URLs the rest of the product
 * already uses reads as part of the product.
 *
 * `density="compact"` because this is a desk on a large screen with a mouse,
 * and the CRM's own tables next door are dense. Matching that matters more
 * than it sounds: two different row rhythms on one page is the tell.
 */
export function AgencyWorkspace({ agencyAdminRef }: { agencyAdminRef: string }) {
  const router = useRouter();

  // Memoised on the ref alone. A resolver identity that changes every render
  // would have the provider tear down and re-open the session on each one.
  const credentialResolver = useMemo(
    () => agencyAdminCredential(agencyAdminRef),
    [agencyAdminRef],
  );

  return (
    <KaafilUIKitProvider
      credentialResolver={credentialResolver}
      density="compact"
      locale="en-IN"
      brand={hostBrand()}
      buildShareUrl={buildShareUrl}
      onSessionExpired={() => router.push('/login')}
    >
      <KaafilAgencyWorkspace
        onSelectTrip={(tripRef) => router.push(`/admin/trips/${tripRef}` as never)}
        onOpenTraveller={() => router.push('/admin/travellers' as never)}
        onOpenManager={() => router.push('/admin/staff' as never)}
      />
    </KaafilUIKitProvider>
  );
}
