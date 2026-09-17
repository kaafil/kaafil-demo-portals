/**
 * A departure's status, as the calendar actually has it today.
 *
 * ── WHY A STORED STATUS GOES WRONG ─────────────────────────────────────────
 *
 * `status` is a column, written once at seed and read verbatim afterwards —
 * which is right for a CRM, where a human moves a departure along. It is wrong
 * for a fixture, because the fixture's dates are frozen and the calendar is
 * not. `TR-2609-SPITI` is stored `ON_TOUR` and ran 7–16 September; on the 17th
 * it is still stored `ON_TOUR`, and it will still be stored `ON_TOUR` next
 * year.
 *
 * That is not cosmetic. It put two trips in front of a manager as "on trip" at
 * once, and the field app defaulted to the one that had already finished — so
 * the demo opened on a dead departure with somebody else's paperwork on it.
 * `fixtures/live.ts` adds a live departure every window; without this, it only
 * ever adds, and the ones it replaces never leave.
 *
 * ── THE RULE IS NOT A NEW ONE ──────────────────────────────────────────────
 *
 * It is `fixtures/bulk.ts`'s own, lifted verbatim — that generator already
 * derives every status it emits from `startDate`/`endDate` against the
 * fixture's today, and the six hand-written departures were written to agree
 * with it. Applying the same rule at read time is what keeps them agreeing as
 * the calendar moves.
 *
 * `CALLED_OFF` is exempt and must stay exempt: an operator pulled that
 * departure, which no date can tell you and no date may undo.
 */

import { addDays, daysBetween, pad2 } from './calendar';
import type { CrmFixture, CrmTour, IsoDate, IsoTimestamp, TourStatus } from './types';

/** Past this many days after it ends, a departure is filed rather than merely back. */
const CLOSED_AFTER_DAYS = 100;

export function statusOn(tour: CrmTour, today: IsoDate): TourStatus {
  if (tour.status === 'CALLED_OFF') return 'CALLED_OFF';
  if (tour.startDate > today) return 'CONFIRMED';
  if (tour.endDate >= today) return 'ON_TOUR';
  return daysBetween(tour.endDate, today) > CLOSED_AFTER_DAYS ? 'CLOSED' : 'RETURNED';
}

/**
 * When a departure entered the status it is now in — used as its
 * `sourceUpdatedAt` when the status actually changed.
 *
 * This is the half that makes the correction REACH KAAFIL. The tenant resolves
 * writes by last-writer-wins on that stamp, so a push carrying the original
 * one is answered `200 ignored_stale` and the trip stays `IN_PROGRESS` for
 * ever. Bumping it to the transition date is both newer than the original and
 * STABLE — the same value on every run — so the correction lands once and every
 * re-push after that is correctly ignored rather than churning the row.
 */
function transitionedOn(tour: CrmTour, status: TourStatus): IsoDate {
  if (status === 'ON_TOUR') return tour.startDate;
  if (status === 'CONFIRMED') return tour.startDate;
  // RETURNED and CLOSED both begin the day after the group is back.
  return addDays(tour.endDate, 1);
}

/** A desk-hours instant, matching the convention every other fixture row holds to. */
function stampOn(date: IsoDate): IsoTimestamp {
  return `${date}T${pad2(11)}:${pad2(20)}:00+05:30`;
}

/**
 * The same book of business, with every departure's status brought up to date.
 *
 * Only the tours whose status actually moved are rewritten, and each of those
 * gets its `sourceUpdatedAt` moved with it. Everything else — ids, money,
 * manifests, prose — is untouched.
 */
export function withCurrentStatuses(fixture: CrmFixture, today: IsoDate): CrmFixture {
  return {
    ...fixture,
    tours: fixture.tours.map((tour) => {
      const status = statusOn(tour, today);
      if (status === tour.status) return tour;
      return { ...tour, status, sourceUpdatedAt: stampOn(transitionedOn(tour, status)) };
    }),
  };
}

/** The departures whose stored status the calendar has overtaken. */
export function overtakenTours(fixture: CrmFixture, today: IsoDate): CrmTour[] {
  return fixture.tours.filter((tour) => statusOn(tour, today) !== tour.status);
}
