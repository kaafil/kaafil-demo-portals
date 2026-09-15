'use client';

import type { KaafilStorageAdapter } from 'kaafil-js/client';
import { createIndexedDbStorageAdapter } from 'kaafil-js/client';
import { KaafilUIKitProvider } from 'kaafil-react-uikit/core';
import { KaafilManagerApp } from 'kaafil-react-uikit/manager';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { signOut } from '@/app/_actions/auth';
import { BRAND } from '@/config/brand';
import { hostBrand } from './brand';
import { managerCredential } from './credential';
import { WhenSessionReady } from './session-gate';

/**
 * The field surface: Kaafil's manager app, filling the `/m` portal.
 *
 * ── THE FOUR REQUIRED CALLBACKS, AND WHY THEY SPLIT TWO WAYS ───────────────
 *
 * `onLogExpense`, `onCollectPayment`, `onCollectFromGroup` and
 * `onVendorSelect` are the only REQUIRED props on this Surface. Required
 * rather than optional is the right call: an optional one would let somebody
 * mount this, ship it, and find out in the field that four buttons do nothing.
 *
 * The first instinct was to route all four to a CRM screen. That was wrong,
 * and tapping them showed why: Kaafil has its OWN expense form — amount,
 * category, paid-from-float, vendor, receipt photo — because the float a
 * leader is carrying and what they spent it on is Kaafil's to track. Sending
 * that tap to a host stub would be throwing away the better screen.
 *
 * So they split on who owns the RECORD, which is the only line that holds:
 *
 * All four hand back to `/m/host/...`, and that route answers each one
 * differently, because the right answer depends on who keeps the record:
 *
 *   collect / collectFromGroup   Sharma Travels keeps receipts against
 *                                bookings, so a collection genuinely is its
 *                                screen. The group id Kaafil passes is the
 *                                CRM's own booking group.
 *
 *   vendor                       Vendor masters and their bills are a host
 *                                record type too — this fixture simply has no
 *                                vendor table, which the screen says.
 *
 *   expense                      The odd one out, and the honest answer is
 *                                "not ours". The float a leader carries and
 *                                what they spent it on is KAAFIL's, and Kaafil
 *                                has the better form for it — so that screen
 *                                points back into Trip → Money rather than
 *                                pretending Sharma Travels keeps expenses.
 *
 * A host that owned expenses would point it at their own screen instead. That
 * the choice exists per record type is the whole reason these are callbacks.
 *
 * (A controlled `activeTab` was tried first, so a quick action could jump
 * straight to Kaafil's Money tab. It works, but it makes the host responsible
 * for tab state the kit already manages well, and a desynced tab is a worse
 * bug than an extra tap.)
 *
 * ── STORAGE IS WHAT MAKES IT OFFLINE ───────────────────────────────────────
 *
 * `storage` is what `OfflineShell` opens the outbox on. Without it the surface
 * still renders and reads still work, but a write made with no signal has
 * nowhere to queue. It is awaited in an effect because the adapter opens an
 * IndexedDB database, and scoped to the manager's own ref — an unscoped store
 * is one where two credentials share an outbox, and the first symptom is one
 * leader's queued write draining under another's session.
 *
 * `density="comfortable"` because this is a thumb at a bus door, not a mouse
 * at a desk.
 */
export default function ManagerAppInner({ managerRef }: { managerRef: string }) {
  const router = useRouter();
  const [storage, setStorage] = useState<KaafilStorageAdapter | null>(null);
  const [storageFailed, setStorageFailed] = useState(false);

  const credentialResolver = useMemo(() => managerCredential(managerRef), [managerRef]);

  useEffect(() => {
    let cancelled = false;
    createIndexedDbStorageAdapter({ scope: managerRef, databasePrefix: 'sharma-field' })
      .then((adapter) => {
        if (!cancelled) setStorage(adapter);
      })
      .catch(() => {
        // A private window, or a browser with storage blocked. The surface is
        // still usable online, so this degrades rather than fails — but it
        // says so, because a leader who believes they are offline-safe and is
        // not has a much worse day than one who was told.
        if (!cancelled) setStorageFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [managerRef]);

  if (storage === null && !storageFailed) {
    return <p className="p-4 text-center text-base text-ink-faint">Opening offline store…</p>;
  }

  const host = (action: string, ref?: string) =>
    router.push(
      (ref === undefined
        ? `/m/host/${action}`
        : `/m/host/${action}?ref=${encodeURIComponent(ref)}`) as never,
    );

  return (
    <>
      {storageFailed && (
        <p className="m-2 rounded-control border border-warning-border bg-warning-bg px-3 py-2 text-sm text-warning">
          This browser would not open an offline store, so nothing will queue if you lose signal.
        </p>
      )}
      <KaafilUIKitProvider
        credentialResolver={credentialResolver}
        {...(storage === null ? {} : { storage })}
        offlineScope={managerRef}
        density="comfortable"
        locale="en-IN"
        brand={hostBrand(`${BRAND.shortName} Field`)}
        onSessionExpired={() => router.push('/m/login')}
      >
        <WhenSessionReady label="your trips">
          <KaafilManagerApp
            onLogExpense={() => host('expense')}
            onCollectPayment={() => host('collect')}
            onCollectFromGroup={(groupId) => host('collect', groupId)}
            onVendorSelect={(tripVendorId) => host('vendor', tripVendorId)}
            // The CRM's own sign-out, not a route of its own. The kit has no
            // session-teardown method to call first — supplying this prop is
            // what makes the affordance appear at all, and what it does is
            // entirely ours.
            onSignOut={() => void signOut('manager')}
          />
        </WhenSessionReady>
      </KaafilUIKitProvider>
    </>
  );
}
