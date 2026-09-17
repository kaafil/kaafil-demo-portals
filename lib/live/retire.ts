/*
 * NO `import 'server-only'` HERE — see `./swap.ts` for the reason.
 */
import { daysBetween } from '@/fixtures/calendar';
import { overtakenTours, statusOn } from '@/fixtures/status';
import type { CrmFixture, CrmTour } from '@/fixtures/types';
import type { IngestFailure } from '@/lib/ingest';
import { TRIP_STATUS, toFailure, zonedInstant } from '@/lib/ingest';
import type { KaafilClient } from '@/lib/kaafil-client';

/**
 * Tell Kaafil about the departures the calendar has moved on.
 *
 * ── THE BUG THIS CLOSES ────────────────────────────────────────────────────
 *
 * `fixtures/live.ts` adds a departure that is under way today. It never
 * retired the one it replaced, and the fixture's `status` is a stored literal,
 * so every September departure stayed `IN_PROGRESS` in the tenant for ever.
 * The result was two trips claiming to be under way at once and a field app
 * that opened on the finished one — with the previous trip's paperwork on it,
 * which is exactly how it looked like an API fault rather than stale data.
 *
 * ── THIS IS A FORWARD TRANSITION, WHICH IS WHY IT IS SAFE ──────────────────
 *
 * `IN_PROGRESS -> COMPLETED` is the direction the engine already wants to go.
 * Nothing here ever pulls a trip back into the present, so the close-out lock —
 * a `423` with no override at any tier — is never touched. That restriction is
 * the whole reason this design creates new departures rather than moving old
 * ones, and retiring is the one edit that does not violate it.
 *
 * ── AND WHY THE STAMP IS THE TRANSITION DATE ───────────────────────────────
 *
 * Kaafil resolves writes by last-writer-wins on `sourceUpdatedAt`, so a push
 * carrying the row's original stamp is answered `ignored_stale` and changes
 * nothing. `fixtures/status.ts` moves the stamp to the day the departure
 * actually ended — newer than the original, and the SAME value on every run, so
 * the correction lands once and every re-push after it is correctly ignored
 * instead of churning the row.
 */

/**
 * How far back to look. A departure that ended within this window transitioned
 * recently enough that the tenant may not have heard yet; anything older was
 * pushed on one of the daily runs since.
 *
 * It exists so this does not walk all fifty-six every night for ever: the
 * stored status never changes, so "overtaken by the calendar" is true of an
 * ever-growing share of the book, and without a bound this would re-push the
 * whole history daily against a rate limit.
 */
const RETIRE_WINDOW_DAYS = 45;

export interface RetireResult {
  readonly retired: number;
  readonly failures: readonly IngestFailure[];
}

function recentlyChanged(tour: CrmTour, today: string): boolean {
  const since = daysBetween(tour.endDate, today);
  return since >= 0 && since <= RETIRE_WINDOW_DAYS;
}

export async function retireFinishedTrips(
  client: KaafilClient,
  fixture: CrmFixture,
  today: string,
  log: (line: string) => void = () => {},
): Promise<RetireResult> {
  const { kaafil, env } = client;
  const due = overtakenTours(fixture, today).filter((tour) => recentlyChanged(tour, today));

  if (due.length === 0) return { retired: 0, failures: [] };

  log(`retiring ${due.length} departure(s) the calendar has moved on`);

  const failures: IngestFailure[] = [];
  let retired = 0;

  for (const tour of due) {
    const status = statusOn(tour, today);
    try {
      // The same upsert `lib/ingest.ts` step 4 makes, carrying the same fields,
      // so the two cannot disagree about how a CRM tour maps onto a Kaafil
      // trip. Only the status and the stamp differ from the original push.
      await kaafil.trips.upsert({
        externalTripId: tour.tourId,
        externalAgencyId: env.agencyRef,
        code: tour.tourId,
        name: tour.title,
        startDate: zonedInstant(tour.startDate, tour.timezone, '00:00:00'),
        endDate: zonedInstant(tour.endDate, tour.timezone, '23:59:59'),
        sourceUpdatedAt: tour.sourceUpdatedAt,
        eventType: tour.style === 'TREK' ? 'TREK' : 'TRIP',
        tripMode: tour.sellingMode === 'CUSTOMISED' ? 'PERSONALIZED' : 'GROUP',
        status: TRIP_STATUS[status],
        timezone: tour.timezone,
        currency: tour.currency,
      });
      retired += 1;
      log(`  ${tour.tourId}: ${tour.status} -> ${status}`);
    } catch (error) {
      failures.push(toFailure('retire', tour.tourId, error));
    }
  }

  return { retired, failures };
}
