/**
 * `pnpm seed:kaafil` — push the CRM's book of business into your Kaafil tenant.
 *
 * ── WHY THIS IS NOT PART OF `pnpm dev` ─────────────────────────────────────
 *
 * The donor repo ran this on every server boot, and warned loudly against a
 * file watcher for exactly that reason. With 56 departures it is 56 trip
 * upserts, 56 manifests and 56 journeys to build — several minutes and a rate
 * limit you will hit. Wiring it to boot would lock out anyone who restarts
 * twice.
 *
 * It is safe to run again. Every call in `lib/ingest.ts` is an upsert carrying
 * the CRM row's own `sourceUpdatedAt`, so a second run answers `ignored_stale`
 * rather than rewriting anything. Run it because the fixtures changed.
 *
 * ── THIS SCRIPT HOLDS THE API KEY ──────────────────────────────────────────
 *
 * It is started with `tsx --env-file=.env`, which is why it can read
 * `KAAFIL_API_KEY`. Nothing it imports is reachable from a browser bundle.
 */

import { readGeneratedBulkFixture } from '@/fixtures/bulk';
import { CORE_FIXTURE } from '@/fixtures/core';
import { runIngest } from '@/lib/ingest';
import { getKaafil } from '@/lib/kaafil-server';

const { kaafil, env, baseUrl } = getKaafil();
const fixture = readGeneratedBulkFixture() ?? CORE_FIXTURE;

console.log(
  [
    '',
    `seed:kaafil — pushing ${fixture.tours.length} departures into ${baseUrl}`,
    `  agency        ${env.agencyRef}`,
    `  plane         ${env.plane}`,
    env.plane === 'live'
      ? '  ⚠  LIVE PLANE. No sandbox clock, no fixture rebuild, no undo. If this\n' +
        '     tenant holds anything real, stop now.'
      : '  ℹ  Sandbox. A partner sandbox holds FIVE trips, so most of these will be\n' +
        '     refused with TEST_TRIP_LIMIT. That is the product limit, not a bug —\n' +
        '     the push is ordered so the scenario-critical departures survive it.',
    '',
  ].join('\n'),
);

const result = await runIngest(kaafil, { fixture, agencyRef: env.agencyRef });

console.log(
  [
    '',
    'done',
    `  trips pushed      ${result.tripRefs.length}`,
    `  trips workable    ${result.readyTripRefs.length}`,
    `  travellers        ${result.travellersPushed}`,
    `  managers          ${result.managerRefs.length}`,
    `  agency admins     ${result.agencyAdminRefs.length}`,
    `  failures          ${result.failures.length}`,
    '',
  ].join('\n'),
);

if (result.failures.length > 0) {
  // Grouped by code rather than listed one per line: 51 identical
  // TEST_TRIP_LIMIT refusals is one fact, not fifty-one.
  const byCode = new Map<string, number>();
  for (const failure of result.failures) {
    byCode.set(failure.code, (byCode.get(failure.code) ?? 0) + 1);
  }
  for (const [code, count] of [...byCode].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(4)} × ${code}`);
  }
  console.log('');
}

kaafil.close();
