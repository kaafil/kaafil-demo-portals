import { Panel } from '@/components/ui';

/**
 * PHASE 3/4 — this is where `KaafilManagerApp` mounts.
 *
 *   'use client'
 *   import { KaafilUIKitProvider } from 'kaafil-react-uikit/core';
 *   import { KaafilManagerApp } from 'kaafil-react-uikit/manager';
 *   import { createIndexedDbStorageAdapter } from 'kaafil-js/client';
 *
 * Four callbacks are REQUIRED and each must open a real CRM screen — that is
 * the whole point of them: `onCollectFromGroup`, `onVendorSelect`,
 * `onLogExpense`, `onCollectPayment`. Kaafil owns what happens on the ground;
 * the money and the vendor records stay the CRM's, so Kaafil hands control
 * back rather than growing its own copy.
 *
 * Tokens come from `POST /api/session` → `kaafil.auth.mintManagerToken`.
 */
export default function ManagerHome() {
  return (
    <Panel title="Not wired up yet">
      <div className="p-3 text-base text-ink-soft">
        <p className="mt-0">
          <code className="tabular">KaafilManagerApp</code> from{' '}
          <code className="tabular">kaafil-react-uikit/manager</code> mounts here.
        </p>
        <p className="mb-0">
          This surface is offline-first: everything a leader does is written locally and synced when
          the network returns. It is the least fakeable thing in the product and the reason the
          field half is a separate portal rather than a narrow column of the desk.
        </p>
      </div>
    </Panel>
  );
}
