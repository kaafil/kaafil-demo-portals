/**
 * `pnpm seed:kaafil` — push the CRM's book of business into your Kaafil tenant.
 *
 * ── WHY THIS IS NOT PART OF `pnpm dev` ─────────────────────────────────────
 *
 * With 56 departures this is 56 trip upserts, 56 manifests and 56 journeys to
 * build — several minutes, and a rate limit you will hit. Wiring it to server
 * boot, or to a file watcher, would lock out anyone who restarts twice.
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
import { enrichTrips } from '@/lib/enrich';
import { runIngest } from '@/lib/ingest';
import { createKaafilClient } from '@/lib/kaafil-client';

const { kaafil, env, baseUrl } = createKaafilClient();
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

/**
 * `--enrich-only` skips the seven-step push and goes straight to the depth
 * pass. The base push is idempotent, but it also waits on a journey for every
 * one of 51 workable trips, which is minutes of nothing when all you changed
 * was a checklist.
 */
const enrichOnly = process.argv.includes('--enrich-only');

const result = enrichOnly
  ? {
      tripRefs: fixture.tours.map((tour) => tour.tourId),
      readyTripRefs: fixture.tours
        .filter((tour) => tour.status !== 'CALLED_OFF')
        .map((tour) => tour.tourId),
      travellersPushed: 0,
      managerRefs: [],
      agencyAdminRefs: [],
      failures: [],
    }
  : await runIngest(kaafil, { fixture, agencyRef: env.agencyRef });

/**
 * Which departures get operational depth.
 *
 * The six hand-written ones plus anything currently on the road — the trips a
 * demo actually opens. Deepening all 56 is roughly 1,400 calls against a
 * rate-limited tenant for screens nobody reaches; the generated bulk exists to
 * make lists and paginators look real, and it does that while empty.
 *
 * `--shallow` skips the pass entirely, for when you only changed a manifest
 * and do not want to wait.
 */
const deepRefs = new Set<string>([
  ...CORE_FIXTURE.tours.map((tour) => tour.tourId),
  ...fixture.tours.filter((tour) => tour.status === 'ON_TOUR').map((tour) => tour.tourId),
]);

const enriched = process.argv.includes('--shallow')
  ? null
  : await enrichTrips(kaafil, {
      fixture,
      tripRefs: [...deepRefs].filter((ref) => result.readyTripRefs.includes(ref)),
      log: (line) => console.log(`[enrich] ${line}`),
    });

console.log(
  [
    '',
    'done',
    ...(enrichOnly ? ['  (--enrich-only: the seven-step push was skipped)'] : []),
    `  trips pushed      ${result.tripRefs.length}`,
    `  trips workable    ${result.readyTripRefs.length}`,
    `  travellers        ${result.travellersPushed}`,
    `  managers          ${result.managerRefs.length}`,
    `  agency admins     ${result.agencyAdminRefs.length}`,
    `  failures          ${result.failures.length}`,
    ...(enriched === null
      ? ['', '  --shallow: no itineraries, rooming or checklists were pushed.']
      : [
          '',
          `  itinerary items   ${enriched.itineraryItems}`,
          `  rooms created     ${enriched.rooms}`,
          `  travellers roomed ${enriched.roomingAssigned}`,
          `  checklist items   ${enriched.checklistItems}`,
          `  floats issued     ${enriched.floatsIssued}`,
          `  pickup stops      ${enriched.pickupStops}`,
          `  balances pushed   ${enriched.balancesPushed}`,
          `  enrich failures   ${enriched.failures.length}`,
        ]),
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
