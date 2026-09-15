/*
 * NO `import 'server-only'` HERE, and it is the same split `lib/kaafil-client.ts`
 * makes against `lib/kaafil-server.ts`: `pnpm live:refresh` runs this code from
 * plain Node under `tsx`, where `server-only` throws on import. Nothing in this
 * module holds a credential — the Kaafil client is handed in by the caller — so
 * the guard would buy nothing and break the one caller that most needs to run.
 */
import { renameSync } from 'node:fs';
import { readGeneratedBulkFixture } from '@/fixtures/bulk';
import { CORE_FIXTURE } from '@/fixtures/core';
import { withLiveDeparture } from '@/fixtures/live';
import type { CrmFixture } from '@/fixtures/types';
import { STORE_PATH, type StoreCounts, seedStore } from '@/lib/db/store';

/**
 * Rewrite `crm.sqlite` under a running server, atomically.
 *
 * ── WHY NOT JUST CALL `seedStore()` ────────────────────────────────────────
 *
 * `seedStore()` deletes the file and then builds a new one in its place. That
 * is fine from a command line, where nothing is serving. Here it would open a
 * window — small, but real — in which `crm.sqlite` does not exist, and
 * `openStore()` is written to REFUSE rather than seed in that case: it throws
 * "crm.sqlite is not there … Run `pnpm seed`". A request landing in that window
 * gets a 500 with a developer's instruction on it, which is the worst text this
 * demo could show a stranger.
 *
 * So: build the whole thing somewhere else, then move it into place. `rename`
 * within one directory is atomic, so there is no instant at which the path is
 * missing or partial.
 *
 * ── WHAT AN IN-FLIGHT REQUEST SEES ─────────────────────────────────────────
 *
 * The complete pre-swap database, to the end of its work. A rename unlinks the
 * old inode but an open descriptor keeps reading it happily, so nothing tears.
 *
 * Being precise about the guarantee, because it is easy to overclaim:
 * `better-sqlite3` is synchronous, so no individual query can be interrupted —
 * per-statement consistency is free. Per-REQUEST consistency is not. A page
 * that calls `getStore()`, awaits something, and calls `getStore()` again can
 * straddle the swap and see two different databases. In practice that is
 * harmless here — the swap only ever ADDS a departure and retires the previous
 * one, so the two reads differ in a row the second one was not looking at — but
 * it is a real property of this code and not a thing to claim is impossible.
 *
 * ── WHY THE JOB IS IN THIS PROCESS AT ALL ──────────────────────────────────
 *
 * This is the reason. `lib/db/index.ts` memoises the handle on `globalThis`,
 * and an out-of-process job could rewrite the file perfectly while this server
 * went on serving the old inode indefinitely, with no error anywhere. Only a
 * job that shares the global can drop the handle, which is what `resetStore()`
 * is for and its only caller.
 */
export interface SwapResult {
  readonly counts: StoreCounts;
  readonly tourId: string;
}

/** The frozen book of business — the generated bulk file, or the six by hand. */
export function frozenFixture(): CrmFixture {
  return readGeneratedBulkFixture() ?? CORE_FIXTURE;
}

/**
 * Drop the server's memoised store handle, if there is a server.
 *
 * Imported lazily because `lib/db/index.ts` carries `import 'server-only'` and
 * `pnpm live:refresh` runs this file from plain Node, where that throws. The
 * CLI genuinely has no handle to drop — it exits moments later — so a failure
 * to load the module is the expected outcome there and not an error.
 *
 * `resetStore` stays the only code that touches that global. Reading
 * `globalThis.__crmStore` from here would work and would put the key in two
 * files, which is how the two of them eventually disagree.
 */
async function dropMemoisedHandle(): Promise<void> {
  try {
    const { resetStore } = await import('@/lib/db');
    resetStore();
  } catch {
    // No Next runtime: nothing is holding the old file open.
  }
}

export async function swapStoreForToday(today: string): Promise<SwapResult> {
  const fixture = withLiveDeparture(frozenFixture(), today);

  // `.next` rather than a system temp directory, deliberately: `rename` is only
  // atomic within a filesystem, and `/tmp` is very often a different one — on
  // which the call degrades to a copy that another process can observe halfway
  // through. A sibling path cannot have that problem.
  const staging = `${STORE_PATH}.next`;
  const counts = seedStore(fixture, staging);
  renameSync(staging, STORE_PATH);
  await dropMemoisedHandle();

  const tourId = fixture.tours[0]?.tourId ?? '';
  return { counts, tourId };
}
