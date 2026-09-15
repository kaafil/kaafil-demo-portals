/**
 * One departure that is always out on the ground right now.
 *
 * ── THE PROBLEM ────────────────────────────────────────────────────────────
 *
 * The rest of this fixture is a frozen book of business dated to a week in
 * September 2026. That is correct for a CRM — an operator's history does not
 * move — but it means that a month after it was written, every departure in it
 * is in the past and the field app has nothing live to show. A visitor who
 * signs in as a tour leader gets an empty Now tab, which is the one screen the
 * demo most needs to be full.
 *
 * ── WHY A NEW DEPARTURE RATHER THAN MOVING THE OLD ONES ────────────────────
 *
 * The obvious fix is to shift every date forward so the story keeps reading
 * correctly. It is also a trap, and the reasons are worth recording because it
 * is the design anybody reaching for this file will think of first:
 *
 *   Kaafil resolves writes by last-writer-wins on `sourceUpdatedAt`, so every
 *   shifted row needs a shifted stamp too — miss that and the tenant answers
 *   `200 ignored_stale` and silently keeps the old dates.
 *
 *   A trip that has been pushed as COMPLETED and closed out cannot be rewound.
 *   Close-out is a `423` with no override at any tier, so a shift that moves a
 *   finished departure back into the present is asking for the one thing the
 *   engine will not do.
 *
 *   `fixtures/bulk.ts` mints tour ids from the month a departure falls in, so
 *   regenerating it against a moved calendar produces a fresh set of fifty
 *   `externalTripId`s every time and orphans the previous fifty in the tenant.
 *
 * None of that is necessary. A finished departure staying finished is honest,
 * and an operator that has been running for fifteen years has a history full of
 * them. What the demo actually needs is that there is always ONE departure in
 * progress — so this file adds one, and when it ends, the next one begins.
 * Nothing is ever rewritten and nothing is ever rewound.
 *
 * ── HOW THE WINDOW IS CHOSEN ───────────────────────────────────────────────
 *
 * Departures tile the calendar end to end from {@link LIVE_EPOCH}, each running
 * for as long as its own template's itinerary. Today therefore always falls
 * inside exactly one of them, which is the property the whole design rests on,
 * and it is a pure function of the date — so two machines asked on the same day
 * build the same departure, and asking twice changes nothing.
 *
 * ── AND WHY THE TEMPLATES ARE THE HAND-WRITTEN ONES ────────────────────────
 *
 * A live departure is a re-stamp of one of `fixtures/core.ts`'s own tours: its
 * itinerary, its party, its money, its meeting point. That is not laziness —
 * those six were written by hand with real place names and real judgement in
 * them, and a generated substitute would be visibly thinner on the one screen
 * this exists to fill. It is also what a tour operator actually does: the same
 * package runs again on a new date with new people, which is exactly what
 * `TR-2610-KRL-03` already implies about the rest of the fixture.
 */

import { addDays, daysBetween, pad2 } from './calendar';
import type {
  CrmBooking,
  CrmFixture,
  CrmPayment,
  CrmTour,
  CrmTourStaff,
  CrmTraveller,
  IsoDate,
  IsoTimestamp,
} from './types';

/**
 * Where the tiling starts. Deliberately just after the frozen fixture's own
 * era (its newest row is stamped 2026-09-10), so a live departure can never
 * overlap the history and can never be confused with it.
 *
 * Moving this renumbers every window and therefore mints new tour ids for
 * departures the tenant may already hold. Do not move it.
 */
export const LIVE_EPOCH: IsoDate = '2026-09-14';

/**
 * Which hand-written departures the rotation draws on, in order.
 *
 * Four rather than all six, chosen for what their BOOKINGS say rather than for
 * variety of destination. `TR-2609-MEGHALAYA`'s parties are all `REFUND_DUE`
 * because it was called off, and `TR-2608-KERALA`'s are settled and closed —
 * re-stamping either as a departure currently under way would put a refund
 * queue or a closed ledger on a trip whose group is standing on a mountain.
 * These four are money-in-progress, which is what a live departure looks like.
 *
 * The four run 10, 9, 6 and 4 days and one of them is a trek, so the rotation
 * also exercises a different shape of trip each time round.
 */
export const LIVE_TEMPLATE_IDS: readonly string[] = [
  'TR-2609-SPITI',
  'TR-2610-LADAKH',
  'TR-2609-HAMPTA',
  'TR-2610-RISHIKESH',
];

/** Which departure is under way on a given day, and which template it is cut from. */
export interface LiveWindow {
  /** 0-based, counting from {@link LIVE_EPOCH}. Decides the template. */
  readonly index: number;
  readonly startDate: IsoDate;
  readonly endDate: IsoDate;
  readonly templateId: string;
  /** The id this departure will be minted under. Stable for the whole window. */
  readonly tourId: string;
}

/**
 * A generous ceiling on the tiling walk, so a bug cannot become a hung
 * container. At an average of seven days a window this is roughly forty years,
 * which is comfortably longer than this demo will be running and short enough
 * to fail fast if `LIVE_EPOCH` is ever set to something absurd.
 */
const MAX_WINDOWS = 2000;

function templateAt(index: number): string {
  const id = LIVE_TEMPLATE_IDS[index % LIVE_TEMPLATE_IDS.length];
  if (id === undefined) throw new Error('LIVE_TEMPLATE_IDS is empty');
  return id;
}

/** `TR-2609-SPITI` -> `SPITI`. The part a reader recognises. */
function slugOf(templateId: string): string {
  const parts = templateId.split('-');
  return parts[parts.length - 1] ?? templateId;
}

/**
 * `TR-2609-SPITI` starting on the 14th becomes `TR-2609-SPITI-14`.
 *
 * Keeps the fixture's own `TR-{yymm}-{SLUG}` convention and appends the day of
 * the month, which is what makes it unique: two windows never start on the same
 * date, so two live departures can never collide — with each other or with the
 * frozen fixture, whose ids carry no day segment.
 *
 * This id is the Kaafil `externalTripId` and is permanent once pushed. That is
 * the reason it is derived from the date rather than from a counter: a counter
 * would restart if the state file were ever lost, and the second departure
 * numbered 3 would silently overwrite the first one in the tenant.
 */
function tourIdFor(startDate: IsoDate, templateId: string): string {
  const [year, month, day] = startDate.split('-');
  return `TR-${year?.slice(2)}${month}-${slugOf(templateId)}-${day}`;
}

/**
 * The departure that is under way on `today`.
 *
 * Walks the tiling from {@link LIVE_EPOCH} rather than dividing, because the
 * windows are not a fixed width — each is as long as its own template's
 * itinerary, so the boundaries are not at regular multiples of anything.
 */
export function liveWindowFor(
  today: IsoDate,
  durationOf: (templateId: string) => number,
): LiveWindow {
  if (today < LIVE_EPOCH) {
    // Before the epoch there is nothing to be inside, so hand back the first
    // window. Only reachable by running the clock backwards, and answering with
    // window zero is better than throwing at boot.
    const templateId = templateAt(0);
    return {
      index: 0,
      startDate: LIVE_EPOCH,
      endDate: addDays(LIVE_EPOCH, durationOf(templateId) - 1),
      templateId,
      tourId: tourIdFor(LIVE_EPOCH, templateId),
    };
  }

  let startDate = LIVE_EPOCH;
  for (let index = 0; index < MAX_WINDOWS; index += 1) {
    const templateId = templateAt(index);
    const endDate = addDays(startDate, durationOf(templateId) - 1);
    if (endDate >= today) {
      return { index, startDate, endDate, templateId, tourId: tourIdFor(startDate, templateId) };
    }
    startDate = addDays(endDate, 1);
  }

  throw new Error(
    `Walking live departure windows from ${LIVE_EPOCH} passed ${MAX_WINDOWS} without reaching ` +
      `${today}. Either LIVE_EPOCH is wrong or a template has a zero-length itinerary.`,
  );
}

/**
 * A desk-hours instant on `date`, distinct per `seq`.
 *
 * Matches the convention the rest of the fixture holds to — nothing is edited
 * outside office hours and nothing is edited in the future — because these rows
 * sit in the same tables as the frozen ones and a 03:00 timestamp in among them
 * would read as a bug in the CRM rather than as a generated row.
 */
function stamp(date: IsoDate, seq: number): IsoTimestamp {
  const minute = 9 * 60 + ((seq * 37) % (11 * 60));
  return `${date}T${pad2(Math.floor(minute / 60))}:${pad2(minute % 60)}:00+05:30`;
}

/** Everything a live departure contributes to the seed. */
export interface LiveDeparture {
  readonly window: LiveWindow;
  readonly tour: CrmTour;
  readonly tourStaff: readonly CrmTourStaff[];
  readonly bookings: readonly CrmBooking[];
  readonly payments: readonly CrmPayment[];
  readonly travellers: readonly CrmTraveller[];
}

/**
 * Cut the live departure for `today` from `base`'s hand-written templates.
 *
 * Every id is derived from the window, so this is a pure function of the date
 * and the base fixture: called twice on the same day it produces identical
 * rows, which is what lets the job treat "already applied" as a cheap
 * comparison rather than as a diff.
 */
export function buildLiveDeparture(base: CrmFixture, today: IsoDate): LiveDeparture {
  const durationOf = (templateId: string): number => {
    const tour = base.tours.find((row) => row.tourId === templateId);
    if (tour === undefined) {
      throw new Error(
        `fixtures/live.ts names ${templateId} as a template, and the fixture has no such tour. ` +
          'LIVE_TEMPLATE_IDS and fixtures/core.ts have drifted apart.',
      );
    }
    return tour.itinerary.length;
  };

  const window = liveWindowFor(today, durationOf);
  const template = base.tours.find((row) => row.tourId === window.templateId);
  if (template === undefined) throw new Error(`No template tour ${window.templateId}`);

  const { tourId, startDate, endDate } = window;
  const dateKey = `${startDate.slice(2, 4)}${startDate.slice(5, 7)}${startDate.slice(8, 10)}`;

  // Sold a fortnight before it left, which is when the desk would have been
  // touching these rows. Comfortably in the past on every day of the window.
  const soldOn = addDays(startDate, -14);

  const templateBookings = base.bookings.filter((row) => row.tourId === window.templateId);
  const templateTravellers = base.travellers.filter((row) => row.tourId === window.templateId);

  // Old ref -> new ref, so travellers and payments can be re-pointed at the
  // bookings they belong to without a second pass.
  const bookingRefFor = new Map<string, string>();
  templateBookings.forEach((row, seq) => {
    bookingRefFor.set(
      row.bookingRef,
      `STPL/${startDate.slice(2, 4)}/L${dateKey.slice(2)}${pad2(seq + 1)}`,
    );
  });

  const travellerIdFor = new Map<string, string>();
  templateTravellers.forEach((row, seq) => {
    travellerIdFor.set(row.travellerId, `TV-${dateKey}${pad2(seq + 1)}`);
  });

  const requireMapped = (map: Map<string, string>, key: string, what: string): string => {
    const mapped = map.get(key);
    if (mapped === undefined) {
      throw new Error(`Live departure ${tourId}: no re-keyed ${what} for ${key}`);
    }
    return mapped;
  };

  const tour: CrmTour = {
    ...template,
    tourId,
    startDate,
    endDate,
    // Guaranteed by construction — `liveWindowFor` returns the window that
    // contains today — and stated rather than derived so that a reader of the
    // seeded row does not have to recompute it to trust it.
    status: 'ON_TOUR',
    itinerary: template.itinerary.map((day) => ({
      ...day,
      date: addDays(startDate, day.dayNumber - 1),
    })),
    seatsSold: template.seatsSold,
    notes: `Group is out now — day ${daysBetween(startDate, today) + 1} of ${template.itinerary.length}. Leader reporting daily.`,
    // A departure under way is neither settled nor called off, whatever the
    // template happened to be.
    settlementDueOn: undefined,
    calledOffOn: undefined,
    calledOffReason: undefined,
    sourceUpdatedAt: stamp(soldOn, 1),
  };

  const tourStaff: CrmTourStaff[] = base.tourStaff
    .filter((row) => row.tourId === window.templateId)
    .map((row, seq) => ({
      ...row,
      tourId,
      assignedOn: addDays(startDate, -21),
      sourceUpdatedAt: stamp(soldOn, 2 + seq),
    }));

  const bookings: CrmBooking[] = templateBookings.map((row, seq) => ({
    ...row,
    bookingRef: requireMapped(bookingRefFor, row.bookingRef, 'booking'),
    tourId,
    leadTravellerId: requireMapped(travellerIdFor, row.leadTravellerId, 'traveller'),
    bookedOn: addDays(soldOn, -(seq % 7)),
    // The group has left, so a balance due date in the future would be wrong
    // and one in the past would put every party in arrears on a screen that is
    // meant to look healthy. The template's own status is kept; the date goes.
    balanceDueOn: undefined,
    sourceUpdatedAt: stamp(soldOn, 10 + seq),
  }));

  const travellers: CrmTraveller[] = templateTravellers.map((row, seq) => ({
    ...row,
    travellerId: requireMapped(travellerIdFor, row.travellerId, 'traveller'),
    tourId,
    bookingRef: requireMapped(bookingRefFor, row.bookingRef, 'booking'),
    sourceUpdatedAt: stamp(soldOn, 30 + seq),
  }));

  const payments: CrmPayment[] = base.payments
    .filter((row) => bookingRefFor.has(row.bookingRef))
    .map((row, seq) => ({
      ...row,
      paymentId: `RC-${dateKey}${pad2(seq + 1)}`,
      bookingRef: requireMapped(bookingRefFor, row.bookingRef, 'booking'),
      paidOn: addDays(soldOn, -(seq % 5)),
      sourceUpdatedAt: stamp(soldOn, 60 + seq),
    }));

  return { window, tour, tourStaff, bookings, payments, travellers };
}

/**
 * `base` plus the departure that is under way today.
 *
 * The live rows go FIRST in `tours`, because `lib/db/store.ts` reads them back
 * ordered by `start_date DESC` anyway and the desk's own list is the one place
 * a reader would notice an odd ordering. Everything else is appended.
 */
export function withLiveDeparture(base: CrmFixture, today: IsoDate): CrmFixture {
  const live = buildLiveDeparture(base, today);

  if (base.tours.some((row) => row.tourId === live.tour.tourId)) {
    throw new Error(
      `Live departure ${live.tour.tourId} collides with a tour already in the fixture. ` +
        'That should be impossible — live ids carry a day segment and frozen ones do not.',
    );
  }

  return {
    agency: base.agency,
    staff: base.staff,
    tours: [live.tour, ...base.tours],
    tourStaff: [...base.tourStaff, ...live.tourStaff],
    bookings: [...base.bookings, ...live.bookings],
    payments: [...base.payments, ...live.payments],
    travellers: [...base.travellers, ...live.travellers],
  };
}
