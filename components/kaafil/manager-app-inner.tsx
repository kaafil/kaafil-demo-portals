'use client';

import type { KaafilStorageAdapter } from 'kaafil-js/client';
import { createIndexedDbStorageAdapter } from 'kaafil-js/client';
import { KaafilUIKitProvider } from 'kaafil-react-uikit/core';
import { KaafilManagerApp } from 'kaafil-react-uikit/manager';
import { localStorageCredentialStore, withCachedCredential } from 'kaafil-react-uikit/offline';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { signOut } from '@/app/_actions/auth';
import { BRAND } from '@/config/brand';
import { hostBrand } from './brand';
import { managerCredential } from './credential';

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
 * The tempting answer is to route all four to a CRM screen. That is wrong, and
 * the expense button is where it shows: Kaafil has its OWN expense form —
 * amount, category, paid-from-float, vendor, receipt photo — because the float
 * a leader carries and what they spent it on is Kaafil's to track. Sending
 * that tap to a host stub throws away the better screen.
 *
 * The line that does hold is who owns the RECORD. All four hand back to
 * `/m/host/...`, and that route answers each one differently on exactly that
 * basis:
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
 * A controlled `activeTab` is the other option here — a quick action could
 * drive the surface straight to Kaafil's Money tab. It works, and it is still
 * not worth it: it makes the host responsible for tab state the kit already
 * manages, and a desynced tab is a worse bug than an extra tap.
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

  /**
   * The resolver, wrapped so a reload with no signal still opens the app.
   *
   * ── WHY THE OUTBOX NEEDS THIS ──────────────────────────────────────────────
   *
   * Without it the offline story has a hole big enough to swallow the feature.
   * A leader logs three expenses in a valley — the outbox holds them, exactly
   * as designed. Then the phone dies, or the tab is killed, or they simply
   * reload. On the way back up the provider calls `/api/session`, which cannot
   * be reached, and the surface refuses to open. The writes are still on the
   * device and there is now no screen that can drain them.
   *
   * `withCachedCredential` stores the last credential that worked and returns
   * it when — and only when — the request never completed.
   *
   * ── WHAT IT DELIBERATELY DOES NOT DO ───────────────────────────────────────
   *
   * It never judges freshness. A cached access token still expires and cannot
   * be refreshed offline, so a leader who has been out of signal longer than
   * the token's life will not get in. That is a real limit to design around,
   * not a bug: "now" in this product is the SERVER's time, and a device that
   * has been offline for hours has no trustworthy clock to compare against. A
   * helper that checked expiry here would have to read the device clock — the
   * one thing the architecture forbids, for exactly the reason it would be
   * wrong.
   *
   * The default `isUnreachable` recognises precisely one thing: the `TypeError`
   * `fetch` throws when it cannot reach the network. That narrowness is the
   * point — a predicate that answered `true` too eagerly would turn a 401 into
   * a silent session extension, which is the bug this helper exists to
   * prevent. `credential.ts` throws a plain `Error` for any HTTP failure and
   * lets `fetch`'s own `TypeError` through untouched, so the default is
   * correct here and is left alone.
   *
   * The store is scoped per manager. Two leaders sharing a device must not
   * share a cached credential, and `scope` is an identifier, never the secret.
   */
  const credentialResolver = useMemo(
    () =>
      withCachedCredential(managerCredential(managerRef), {
        store: localStorageCredentialStore(`sharma-field:${managerRef}`),
      }),
    [managerRef],
  );

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
        // The host's scheme, never the viewer's OS — see `Brand.colorScheme`.
        theme={BRAND.colorScheme}
        density="comfortable"
        locale="en-IN"
        brand={hostBrand(`${BRAND.shortName} Field`)}
        onSessionExpired={() => router.push('/m/login')}
      >
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
      </KaafilUIKitProvider>
    </>
  );
}
