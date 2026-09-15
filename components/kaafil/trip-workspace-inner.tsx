'use client';

import { TripWorkspace } from 'kaafil-react-uikit/admin';
import { KaafilUIKitProvider } from 'kaafil-react-uikit/core';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { buildShareUrl, hostBrand } from './brand';
import { agencyAdminCredential } from './credential';

/**
 * Kaafil's trip workspace, mounted as one tab of the CRM's own departure page.
 *
 * ── WHY THIS AND NOT `KaafilAgencyWorkspace` ───────────────────────────────
 *
 * `KaafilAgencyWorkspace` is the agency-wide Surface, and it is the wrong one
 * for an embed: it brings its own left nav. Trips, Travellers, Managers, Forms,
 * Checklists, Settings — a complete second navigation, inside a CRM that
 * already has one. Two sidebars on one page is the clearest tell that a product
 * was bolted on, and no amount of token matching fixes it.
 *
 * `TripWorkspace` is the trip-scoped Surface and has no nav of its own. So the
 * shape becomes the honest one: the desk executive finds a departure in Sharma
 * Travels' own list, opens Sharma Travels' own detail page, and the
 * on-the-ground operations are a tab there — beside Overview, Travellers,
 * Payments and Staff. Kaafil owns what happens inside that tab and nothing
 * about where it sits.
 *
 * The CRM keeps the navigation, the URL and the record. That is the
 * integration story rather than a styling exercise.
 *
 * ── tripRef IS THE CRM'S OWN ID ────────────────────────────────────────────
 *
 * `tripRef` takes Kaafil's id or the agency's external one, and we pass the
 * CRM's own `tourId` — `TR-2609-SPITI`. Nothing here has to look up or store a
 * Kaafil id, which is what keeps the CRM the system of record: the mapping
 * lives in `lib/ingest.ts` and nowhere else.
 *
 * Default-exported because `surface.tsx` loads it through `next/dynamic`,
 * which resolves a module's default.
 */
export default function TripOperationsInner({
  tripRef,
  agencyAdminRef,
}: {
  tripRef: string;
  agencyAdminRef: string;
}) {
  const router = useRouter();

  // Memoised on the ref alone: a resolver whose identity changed every render
  // would have the provider tear down and re-open the session each time.
  const credentialResolver = useMemo(() => agencyAdminCredential(agencyAdminRef), [agencyAdminRef]);

  return (
    <KaafilUIKitProvider
      credentialResolver={credentialResolver}
      density="compact"
      locale="en-IN"
      brand={hostBrand()}
      buildShareUrl={buildShareUrl}
      onSessionExpired={() => router.push('/login')}
    >
      <TripWorkspace
        tripRef={tripRef}
        // The kit ships no router — every navigation is a callback, and the
        // host decides what it means. "Open full profile" therefore lands on
        // the CRM's own traveller directory, at the CRM's own URL, which is
        // what stops the tab reading as an iframe.
        onOpenTravellerProfile={() => router.push('/admin/travellers' as never)}
        // Tier 4 of the customization ladder: replace a named component,
        // keep every bit of the data wiring behind it.
        //
        // The kit's own head repeats what the CRM's page header two inches
        // above already says — the trip name, its status, its dates. Two
        // <h1>s describing one record is the specific thing that makes an
        // embed look embedded, and it is also just wrong for a screen
        // reader. So the host suppresses it and keeps its own.
        //
        // Worth noting what this does NOT cost: the tabs, the panels, the
        // capability gating and every request underneath are untouched.
        // Descending a tier changes what renders, never how anything talks
        // to Kaafil.
        components={{ TripWorkspaceHead: () => null }}
      />
    </KaafilUIKitProvider>
  );
}
