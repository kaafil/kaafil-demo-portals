/**
 * `pnpm seed` — rebuild the CRM's own database from fixtures.
 *
 * This is the CRM half of seeding and it touches nothing outside this repo:
 * no network, no API key, no Kaafil. It is safe to run as often as you like
 * and it is wired into `pnpm dev`, because a wiped-and-rebuilt store costs
 * about fifteen milliseconds and buys a reproducible starting state.
 *
 * The Kaafil half is `pnpm seed:kaafil`, and the two are deliberately not the
 * same command. See `scripts/ingest.ts` for why.
 *
 *   pnpm seed          the full book of business — 56 departures.
 *                      Generates fixtures/bulk.generated.json if it is missing.
 *   pnpm seed -- --core  just the six hand-written departures.
 *   pnpm seed:bulk     regenerate the bulk file from scratch, then seed.
 *
 * Why rich by default: this repo exists to be shown to somebody who is
 * deciding whether to buy. Six rows is a fixture; fifty-six is a book of
 * business, and only one of those two makes a list, a filter or a paginator
 * look like it belongs to a real operator.
 */

import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BULK_FIXTURE_PATH, buildBulkFixture, readGeneratedBulkFixture } from '@/fixtures/bulk';
import { todayInDeskZone } from '@/fixtures/calendar';
import { CORE_FIXTURE } from '@/fixtures/core';
import { buildLiveDeparture, withLiveDeparture } from '@/fixtures/live';
import type { CrmFixture } from '@/fixtures/types';
import { seedStore } from '@/lib/db/store';

const args = new Set(process.argv.slice(2));
const wantCore = args.has('--core');
const wantRegenerate = args.has('--bulk');

function pad(label: string, value: string | number): string {
  return `  ${label.padEnd(14)}${String(value).padStart(7)}`;
}

function chooseFixture(): { fixture: CrmFixture; source: string } {
  if (wantCore) {
    return { fixture: CORE_FIXTURE, source: 'fixtures/core.ts — the six hand-written departures' };
  }

  if (wantRegenerate || !existsSync(BULK_FIXTURE_PATH)) {
    // Deterministic: the generator's seed is frozen, so this file is
    // byte-identical on every machine and regenerating it is free.
    const generated = buildBulkFixture();
    writeFileSync(BULK_FIXTURE_PATH, `${JSON.stringify(generated, null, 2)}\n`, 'utf8');
    return {
      fixture: generated,
      source: `fixtures/bulk.generated.json — just written to ${fileURLToPath(BULK_FIXTURE_PATH)}`,
    };
  }

  const existing = readGeneratedBulkFixture();
  if (existing === null) {
    // existsSync said yes a moment ago. Something else deleted it mid-run.
    return { fixture: CORE_FIXTURE, source: 'fixtures/core.ts — the bulk file vanished mid-run' };
  }
  return { fixture: existing, source: 'fixtures/bulk.generated.json' };
}

const { fixture: frozen, source } = chooseFixture();

/*
 * The frozen fixture plus one departure that is under way TODAY.
 *
 * Everything in `fixtures/core.ts` and `fixtures/bulk.generated.json` is dated
 * to a week in September 2026 and stays there, which is right — an operator's
 * history does not move. But it means that a month later nothing is in
 * progress, and the field app's Now tab, which is the screen this demo most
 * needs to be full, is empty.
 *
 * `fixtures/live.ts` adds exactly one. It is a pure function of today's date,
 * so seeding twice in a day is identical and seeding on two machines agrees.
 * See that file for why a new departure beats shifting the old ones.
 */
const today = todayInDeskZone();
const fixture = withLiveDeparture(frozen, today);
const live = buildLiveDeparture(frozen, today);
const counts = seedStore(fixture);

const onTour = fixture.tours.filter((tour) => tour.status === 'ON_TOUR').length;
const calledOff = fixture.tours.filter((tour) => tour.status === 'CALLED_OFF').length;

console.log(
  [
    '',
    'seed — crm.sqlite rebuilt',
    '',
    pad('departures', counts.tours),
    pad('travellers', counts.travellers),
    pad('bookings', counts.bookings),
    pad('receipts', counts.payments),
    pad('staff', counts.staff),
    '',
    `  from ${source}`,
    `  ${onTour} departure(s) are out on the ground right now; ${calledOff} were called off.`,
    `  Live today: ${live.tour.tourId} — ${live.tour.title}`,
    `             ${live.window.startDate} to ${live.window.endDate}, cut from ${live.window.templateId}`,
    '',
    '  This touched nothing outside this repo. To push these departures into',
    '  your Kaafil tenant, that is `pnpm seed:kaafil`, and it is a separate',
    '  command on purpose — it is rate limited and, on a live key, has no undo.',
    '',
  ].join('\n'),
);
