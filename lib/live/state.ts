/*
 * NO `import 'server-only'` HERE, and it is the same split `lib/kaafil-client.ts`
 * makes against `lib/kaafil-server.ts`: `pnpm live:refresh` runs this code from
 * plain Node under `tsx`, where `server-only` throws on import. Nothing in this
 * module holds a credential — the Kaafil client is handed in by the caller — so
 * the guard would buy nothing and break the one caller that most needs to run.
 */
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * What the live-departure job has already done, so it can tell a second run in
 * the same day from a run that has real work to do.
 *
 * ── THIS IS A CACHE, NOT A SOURCE OF TRUTH ─────────────────────────────────
 *
 * Which departure should be live is a pure function of today's date
 * (`fixtures/live.ts`), and nothing here is consulted to decide it. This file
 * records only what has ALREADY been applied. Delete it and the next run
 * rebuilds the database and re-pushes the tenant — wasteful, never wrong.
 *
 * That property is load-bearing on a container with no persistent volume, where
 * this file is lost on every redeploy. The cost of losing it is one extra
 * tenant push; the cost of depending on it would be a demo that silently stops
 * refreshing because a file went missing.
 */
export interface LiveState {
  /** The departure `crm.sqlite` currently holds. */
  readonly localTourId: string | null;
  readonly localSeededOn: string | null;
  /** The departure Kaafil has been told about. Behind `localTourId` after a partial run. */
  readonly tenantTourId: string | null;
  readonly tenantPushedAt: string | null;
  readonly lastRunAt: string;
  readonly lastOutcome: 'ok' | 'noop' | 'partial' | 'failed';
  /** Grouped by Kaafil error code — "51 × TEST_TRIP_LIMIT" is one fact, not fifty-one. */
  readonly failuresByCode: Readonly<Record<string, number>>;
}

const STATE_PATH = join(process.cwd(), 'live-state.json');

export function readLiveState(): LiveState | null {
  if (!existsSync(STATE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf8')) as LiveState;
  } catch {
    // A truncated write from a container killed mid-save. Treating it as absent
    // costs one redundant refresh, which is exactly what this file's own
    // "cache, not truth" rule says to do.
    return null;
  }
}

export function writeLiveState(next: LiveState): void {
  // Write-then-rename for the same reason the database swap does it: a reader
  // must never see half a file.
  const staging = `${STATE_PATH}.next`;
  writeFileSync(staging, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  renameSync(staging, STATE_PATH);
}
