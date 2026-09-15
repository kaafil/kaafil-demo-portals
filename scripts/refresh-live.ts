/**
 * `pnpm live:refresh` — run the live-departure job once, by hand.
 *
 * The same function the scheduler calls (`lib/live/refresh.ts`), exposed as a
 * command for three cases the scheduler cannot serve:
 *
 *   the FIRST run, which should be watched rather than discovered;
 *   a deployment that has just come up and should not wait until 03:10;
 *   testing, with `--today` to ask what any date would produce.
 *
 *   pnpm live:refresh                     today, both halves
 *   pnpm live:refresh -- --today 2026-10-05   pretend it is that date
 *   pnpm live:refresh -- --local          rebuild crm.sqlite, leave the tenant
 *   pnpm live:refresh -- --force          redo it even if the state says done
 *   pnpm live:refresh -- --dry            say what would happen, change nothing
 */

import { todayInDeskZone } from '@/fixtures/calendar';
import { buildLiveDeparture } from '@/fixtures/live';
import { refreshLiveDeparture } from '@/lib/live/refresh';
import { frozenFixture } from '@/lib/live/swap';

const argv = process.argv.slice(2);
const args = new Set(argv);

function flagValue(name: string): string | undefined {
  const at = argv.indexOf(name);
  return at === -1 ? undefined : argv[at + 1];
}

const today = flagValue('--today') ?? todayInDeskZone();

if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
  console.error(`--today expects YYYY-MM-DD, got "${today}"`);
  process.exit(1);
}

if (args.has('--dry')) {
  const live = buildLiveDeparture(frozenFixture(), today);
  console.log(
    [
      '',
      `live departure for ${today} — nothing was written`,
      '',
      `  tour        ${live.tour.tourId}`,
      `  title       ${live.tour.title}`,
      `  window      ${live.window.startDate} .. ${live.window.endDate}`,
      `  day         ${live.tour.notes ?? ''}`,
      `  cut from    ${live.window.templateId}`,
      `  party       ${live.travellers.length} travellers across ${live.bookings.length} bookings`,
      `  leader      ${live.tourStaff.map((s) => s.staffId).join(', ')}`,
      '',
    ].join('\n'),
  );
  process.exit(0);
}

const report = await refreshLiveDeparture({
  today,
  skipTenant: args.has('--local'),
  force: args.has('--force'),
});

console.log(
  [
    '',
    `live:refresh — ${report.outcome}`,
    '',
    `  today       ${report.today}`,
    `  tour        ${report.tourId}`,
    `  reseeded    ${report.reseeded ? 'yes' : 'no'}`,
    `  pushed      ${report.pushed ? 'yes' : 'no'}`,
    Object.keys(report.failuresByCode).length === 0
      ? '  failures    none'
      : `  failures    ${JSON.stringify(report.failuresByCode)}`,
    '',
  ].join('\n'),
);

// `partial` is not a crash but it is not success either, and a deploy script
// that treats it as success is how a half-pushed departure goes unnoticed.
process.exit(report.outcome === 'failed' || report.outcome === 'partial' ? 1 : 0);
