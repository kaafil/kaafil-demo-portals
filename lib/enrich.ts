/**
 * The operational depth pass — what `lib/ingest.ts` deliberately does not push.
 *
 * ── WHY THIS IS A SECOND PASS AND NOT MORE STEPS ───────────────────────────
 *
 * `ingest.ts` is lifted from `kaafil-qa-handoff` and does the seven things a
 * partner MUST do to make a trip exist: agency, managers, admins, trips,
 * manifests, assignments, journeys. That is the integration contract, and it
 * is worth keeping recognisable.
 *
 * This file is the part that makes the product look like it has been in use.
 * Ingest alone gets you trips whose Day-by-day plan is empty, whose Rooming
 * board says "12 travellers unassigned", and whose Checklist has nothing in it
 * — every screen technically correct and visibly hollow. A prospect reads that
 * as a product with no content rather than a tenant with no history.
 *
 * ── WHAT IS REAL HERE AND WHAT IS INVENTED ─────────────────────────────────
 *
 * The itinerary is REAL: `fixtures/core.ts` already carries 7–10 hand-written
 * days per departure with actual place names and night halts (Khardung La,
 * Chandratal, Nohkalikai). It was simply never pushed. Nothing is invented —
 * the CRM's own brochure itinerary becomes Kaafil's day plan, which is exactly
 * the mapping a real operator would make.
 *
 * The rooming and the checklist are CONSTRUCTED, and honestly so: Sharma
 * Travels' fixture has no room list and no checklist, because plenty of
 * operators keep neither until the software gives them somewhere to. So this
 * builds what an operator would on day one — a stay window over the trip,
 * twin rooms enough for the manifest, and a checklist of the things that
 * actually have to happen before a bus leaves.
 *
 * ── RE-RUNNING THIS IS SAFE, AND THAT TOOK WORK ────────────────────────────
 *
 * None of these three calls is an upsert, which is the opposite of everything
 * in `ingest.ts`. `itinerary.items.add` APPENDS; a room code is unique within
 * its stay window; a checklist key is unique within its section. Running the
 * pass twice the naive way gave a Day 9 that read "Solang Valley / Night halt
 * — Manali / Solang Valley / Night halt — Manali", and then 187 validation
 * errors on the third run.
 *
 * So every step reads before it writes: skip what is already there, and for
 * the itinerary — the one that appends rather than refusing — delete the
 * surplus copies. That restores the property the rest of the ingest has and
 * the README promises.
 *
 * ── WHY ONLY SOME TRIPS ────────────────────────────────────────────────────
 *
 * Deepening all 56 departures is roughly 1,400 calls against a rate-limited
 * live tenant, for a demo where nobody opens the fifty-first. `scripts/ingest`
 * picks the trips that are actually looked at — the hand-written six plus
 * anything currently on the road — and leaves the generated bulk shallow. The
 * bulk exists to make lists, filters and paginators look real, and it does
 * that job while empty.
 */

import { isKaafilError, isTombstone, type Kaafil } from 'kaafil-js';
import type { CrmFixture, CrmTour } from '@/fixtures/types';
import { type IngestFailure, toFailure, zonedInstant } from '@/lib/ingest';

export interface EnrichOptions {
  readonly fixture: CrmFixture;
  /** Which trips to deepen, by the CRM's own `tourId`. */
  readonly tripRefs: readonly string[];
  readonly log?: (line: string) => void;
}

export interface EnrichResult {
  readonly itineraryItems: number;
  readonly rooms: number;
  readonly roomingAssigned: number;
  readonly checklistItems: number;
  readonly floatsIssued: number;
  readonly pickupStops: number;
  readonly balancesPushed: number;
  readonly failures: readonly IngestFailure[];
}

/**
 * What a lead manager is handed for a departure, in paise.
 *
 * Found the hard way. An expense logged from the field came back `422
 * BUSINESS_RULE_VIOLATION` and the outbox PARKED it — correctly, because the
 * form's default payment source is `FLOAT_CASH` and you cannot spend from a
 * float that was never issued. Every Money screen in the demo was therefore a
 * dead end, and the failure was invisible until somebody actually tried to log
 * something.
 *
 * The figure is a rule rather than a constant so it scales with the trip: a
 * per-head allowance for meals and entries, plus a per-day one for fuel,
 * parking and the things a leader pays cash for. Round numbers, because a real
 * desk hands over round numbers.
 */
function floatForTour(pax: number, days: number): number {
  const perTraveller = 1_000_00; // ₹1,000
  const perDay = 500_00; // ₹500
  return pax * perTraveller + days * perDay;
}

/**
 * The checklist a tour operator actually runs, in Kaafil's three phases.
 *
 * Chosen to be specific rather than generic: "permits carried for every
 * traveller" is a real Spiti/Ladakh problem and "float reconciled and handed
 * back" is a real close-out one. A checklist of "Prepare trip / Run trip /
 * Finish trip" would demo just as well and teach nothing.
 *
 * `mandatory` is not decoration — it feeds `hasOpenMandatoryByPhase`, which is
 * what blocks a close-out. So the ones marked mandatory are the ones an
 * operator genuinely should not be able to close a departure without.
 *
 * Keys are snake_case because the engine requires `^[a-z][a-z0-9_]{0,59}$`.
 * They were kebab-case first and every one of 126 pushes was refused with a
 * `VALIDATION_ERROR` whose message is only "Some fields did not pass
 * validation" — the pattern is in `details.fields`, which is the thing worth
 * reading before guessing.
 */
const CHECKLIST: readonly {
  sectionKey: string;
  sectionTitle: string;
  phase: 'PRE_DEPARTURE' | 'IN_TRIP' | 'POST_TRIP';
  items: readonly { key: string; title: string; mandatory?: boolean }[];
}[] = [
  {
    sectionKey: 'before_departure',
    sectionTitle: 'Before the bus leaves',
    phase: 'PRE_DEPARTURE',
    items: [
      { key: 'manifest_confirmed', title: 'Manifest confirmed against the desk', mandatory: true },
      {
        key: 'permits',
        title: 'Permits carried for every traveller who needs one',
        mandatory: true,
      },
      { key: 'medical_read', title: 'Medical notes read for the whole group', mandatory: true },
      { key: 'float_drawn', title: 'Cash float drawn and counted' },
      { key: 'rooming_shared', title: 'Rooming shared with the hotels' },
      { key: 'driver_briefed', title: 'Driver briefed on the route and halts' },
    ],
  },
  {
    sectionKey: 'on_the_road',
    sectionTitle: 'On the road',
    phase: 'IN_TRIP',
    items: [
      { key: 'headcount_daily', title: 'Headcount taken at every boarding', mandatory: true },
      { key: 'halt_confirmed', title: "Tonight's halt confirmed by phone" },
      { key: 'expenses_logged', title: "Yesterday's expenses logged" },
      { key: 'photos_posted', title: 'Photos shared to the group' },
    ],
  },
  {
    sectionKey: 'closing_out',
    sectionTitle: 'Closing out',
    phase: 'POST_TRIP',
    items: [
      { key: 'float_returned', title: 'Float reconciled and handed back', mandatory: true },
      { key: 'vendor_bills', title: 'Vendor bills collected', mandatory: true },
      { key: 'feedback_collected', title: 'Feedback collected from the group' },
      { key: 'handover', title: 'Handover note written for the desk' },
    ],
  },
];

/**
 * Drop delta tombstones from a list read, and narrow to what survived.
 *
 * Every list the engine returns is a union with `{ _tombstone: true }`, which
 * is deliberate: it makes the drop case impossible to forget. `isTombstone` is
 * the SDK's own check for it — hand-rolling `'_tombstone' in row` would work
 * today and rot the first time the marker changes shape — but it is not a type
 * predicate, so `.filter` needs telling which half of the union survived.
 *
 * One helper rather than that dance repeated at three call sites.
 */
type Live<T> = Exclude<T, { _tombstone: true }>;

function live<T>(rows: readonly T[]): Live<T>[] {
  return rows.filter((row): row is Live<T> => !isTombstone(row as never));
}

/**
 * Which day index a fixture day falls on — day 1 is index 0.
 *
 * The engine resolves `isoDate` to a day index in the TRIP's timezone and
 * hands that index back, so this is the only comparison between what we sent
 * and what came back that is stable. Comparing the instants themselves does
 * not work: a zoned `2026-09-07T00:00:00+05:30` returns as
 * `2026-09-06T18:30:00.000Z`.
 */
function dayIndexFor(tour: CrmTour, isoDate: string): number {
  const day = tour.itinerary.find(
    (d) => zonedInstant(d.date, tour.timezone, '00:00:00') === isoDate,
  );
  return day === undefined ? -1 : day.dayNumber - 1;
}

/** A day's brochure line becomes an itinerary item; a night halt becomes a second. */
function itemsForTour(tour: CrmTour) {
  return tour.itinerary.flatMap((day) => {
    const isoDate = zonedInstant(day.date, tour.timezone, '00:00:00');
    const rows: { isoDate: string; type: 'ACTIVITY' | 'ACCOMMODATION'; title: string }[] = [
      { isoDate, type: 'ACTIVITY', title: day.title },
    ];
    if (day.nightHalt !== null) {
      rows.push({ isoDate, type: 'ACCOMMODATION', title: `Night halt — ${day.nightHalt}` });
    }
    return rows;
  });
}

export async function enrichTrips(
  kaafil: Kaafil,
  { fixture, tripRefs, log = () => {} }: EnrichOptions,
): Promise<EnrichResult> {
  const failures: IngestFailure[] = [];
  const wanted = new Set(tripRefs);
  const tours = fixture.tours.filter(
    (tour) => wanted.has(tour.tourId) && tour.status !== 'CALLED_OFF',
  );

  let itineraryItems = 0;
  let rooms = 0;
  let roomingAssigned = 0;
  let checklistItems = 0;
  let floatsIssued = 0;
  let pickupStops = 0;
  let balancesPushed = 0;

  log(
    `8/13 Itineraries. Pushing the brochure day plan for ${tours.length} departures. This is ` +
      `the CRM's own itinerary, not invented — it was in the fixture all along and ingest ` +
      `simply never sent it.`,
  );
  for (const tour of tours) {
    let pushed = 0;
    let removed = 0;

    try {
      // RECONCILE, do not append.
      //
      // `itinerary.items.add` appends at the tail of its day — it is the one
      // call in this pass that is NOT an upsert. Running the enrichment twice
      // therefore produced a Day 9 reading "Solang Valley / Night halt —
      // Manali / Solang Valley / Night halt — Manali", which is exactly the
      // kind of thing a prospect notices and nobody else does.
      //
      // So: read what is there, skip titles already on their day, and delete
      // the surplus copies of any title that appears more than once. That
      // restores the property the rest of the ingest has and the README
      // promises — running it again is safe.
      const current = await kaafil.itinerary.read({ tripRef: tour.tourId });

      const liveItems = live(current.items);

      const byKey = new Map<string, typeof liveItems>();
      for (const row of liveItems) {
        const key = `${row.dayIndex}|${row.title}`;
        byKey.set(key, [...(byKey.get(key) ?? []), row]);
      }

      for (const [, rows] of byKey) {
        for (const surplus of rows.slice(1)) {
          try {
            await kaafil.itinerary.items.remove({
              tripRef: tour.tourId,
              itemId: surplus.id,
              version: surplus.version,
            });
            removed++;
          } catch (error) {
            failures.push(
              toFailure('itinerary.items.remove', `${tour.tourId}/${surplus.id}`, error),
            );
          }
        }
      }

      // The read says up front whether this trip will accept items, and why
      // not. A completed departure answers `canAddItems: false` with "This trip
      // is complete, so its plan can no longer be edited" — the close-out lock,
      // which has no override at any tier and is not supposed to.
      //
      // Asking first turns fifteen identical BUSINESS_RULE_VIOLATIONs into one
      // sentence that tells the truth. Kerala returned twelve days ago; its
      // plan is frozen, and a demo that showed an editable one would be
      // misrepresenting the product.
      if (!current.canAddItems) {
        log(
          `    ${tour.tourId}: plan locked — ${(current.canAddItemsReason ?? 'not editable').replace(/\.$/, '')}` +
            (removed > 0 ? ` (${removed} duplicate(s) still cleaned up).` : '.'),
        );
        continue;
      }

      const present = new Set(liveItems.map((row) => `${row.isoDate.slice(0, 10)}|${row.title}`));

      for (const item of itemsForTour(tour)) {
        // `isoDate` goes out as a zoned instant and comes back as UTC, so the
        // two never match as strings. Compare on the day the engine resolved
        // it to, which is what `dayIndex` and the returned `isoDate` agree on.
        const already = liveItems.some(
          (row) => row.dayIndex === dayIndexFor(tour, item.isoDate) && row.title === item.title,
        );
        if (already || present.has(`${item.isoDate.slice(0, 10)}|${item.title}`)) continue;

        try {
          await kaafil.itinerary.items.add({ tripRef: tour.tourId, ...item });
          pushed++;
          itineraryItems++;
        } catch (error) {
          failures.push(toFailure('itinerary.items.add', `${tour.tourId}/${item.title}`, error));
        }
      }
    } catch (error) {
      failures.push(toFailure('itinerary.read', tour.tourId, error));
    }

    log(
      `    ${tour.tourId}: ${pushed} new item(s) across ${tour.itinerary.length} days` +
        (removed > 0 ? `, ${removed} duplicate(s) cleaned up.` : '.'),
    );
  }

  log(
    `9/13 Rooming. One stay window per departure, twin rooms enough for the manifest, then ` +
      `Kaafil's own auto-assign. The solver is what decides who shares with whom — this only ` +
      `gives it rooms to work with.`,
  );
  for (const tour of tours) {
    const pax = fixture.travellers.filter((t) => t.tourId === tour.tourId).length;
    if (pax === 0) continue;

    try {
      // Kaafil's own trip ingest already creates a "Whole trip" stay window
      // spanning the departure, so creating another one is refused with
      // `STAY_WINDOW_OVERLAP` — which is the engine being right and this pass
      // being presumptuous. Reuse what is there; only create when a trip
      // genuinely has none.
      const existing = await kaafil.rooming.stayWindows.list({ tripRef: tour.tourId });
      const first = existing.find((row) => 'id' in row && typeof row.id === 'string');

      const window =
        first !== undefined && 'id' in first
          ? first
          : await kaafil.rooming.stayWindows.create({
              tripRef: tour.tourId,
              label: `${tour.boardingCity} → ${tour.destination.split(',')[0]?.trim() ?? 'the route'}`,
              startDate: zonedInstant(tour.startDate, tour.timezone, '00:00:00'),
              endDate: zonedInstant(tour.endDate, tour.timezone, '23:59:59'),
            });

      // Twins, because that is what the brochure price is quoted on
      // (`pricePerSeatMinor` says "twin sharing"). An odd headcount gets one
      // extra room rather than one person with nowhere to sleep.
      //
      // Read the board first: a room code is unique within its stay window, so
      // re-creating `R01` is refused. Skipping what exists is what makes a
      // second run a no-op instead of 61 validation errors.
      const board = await kaafil.rooming.read({ tripRef: tour.tourId });
      const existingCodes = new Set(live(board.rooms).map((room) => room.code));

      const roomCount = Math.ceil(pax / 2);
      for (let n = 1; n <= roomCount; n++) {
        const code = `R${String(n).padStart(2, '0')}`;
        if (existingCodes.has(code)) continue;
        try {
          await kaafil.rooming.rooms.create({
            tripRef: tour.tourId,
            stayWindowId: window.id,
            code,
            capacity: 2,
            roomType: 'TWIN',
          });
          rooms++;
        } catch (error) {
          failures.push(toFailure('rooming.rooms.create', `${tour.tourId}/${code}`, error));
        }
      }

      const plan = await kaafil.rooming.autoAssign({
        tripRef: tour.tourId,
        stayWindowId: window.id,
        dryRun: false,
      });
      // `plan` is what the solver did; `unassigned` is who it could not place
      // and why. Reporting both matters — a silent "auto-assign succeeded" that
      // left four people out is the kind of success nobody checks.
      const placed = plan.plan.length;
      const left = plan.unassigned.length;
      roomingAssigned += placed;
      log(
        `    ${tour.tourId}: ${roomCount} twins for ${pax} travellers, ${placed} placed` +
          (left > 0 ? `, ${left} the solver would not place.` : '.'),
      );
    } catch (error) {
      failures.push(toFailure('rooming', tour.tourId, error));
    }
  }

  log(
    `10/13 Checklists. The things that have to happen before a bus leaves, while it is out, ` +
      `and once it is back. Mandatory items are the ones that block a close-out, so they are ` +
      `the ones an operator genuinely should not be able to skip.`,
  );
  for (const tour of tours) {
    let pushed = 0;

    // Same reconcile as the rooms: an item key is unique within its section,
    // so re-adding it is refused. Read once per trip, then add only what is
    // missing.
    let existingKeys = new Set<string>();
    try {
      const current = await kaafil.checklists.read({ tripRef: tour.tourId });
      existingKeys = new Set(live(current.items).map((row) => row.key));
    } catch (error) {
      failures.push(toFailure('checklists.read', tour.tourId, error));
    }

    for (const section of CHECKLIST) {
      for (const item of section.items) {
        if (existingKeys.has(item.key)) continue;
        try {
          await kaafil.checklists.items.add({
            tripRef: tour.tourId,
            sectionKey: section.sectionKey,
            sectionTitle: section.sectionTitle,
            phase: section.phase,
            key: item.key,
            title: item.title,
            audience: 'INTERNAL',
            mandatory: item.mandatory ?? false,
          });
          pushed++;
          checklistItems++;
        } catch (error) {
          failures.push(toFailure('checklists.items.add', `${tour.tourId}/${item.key}`, error));
        }
      }
    }
    log(
      `    ${tour.tourId}: ${pushed} new checklist item(s)` +
        (existingKeys.size > 0 ? `, ${existingKeys.size} already there.` : '.'),
    );
  }

  log(
    `11/13 Float. The cash a lead manager is carrying. Without it the Money tab ` +
      `is a dead end: the expense form defaults to FLOAT_CASH, and spending from a float ` +
      `that was never issued is refused — which the outbox parks, correctly and invisibly.`,
  );
  for (const tour of tours) {
    try {
      // `readSummary` first: issuing is a MOVEMENT, not an upsert, so running
      // this twice would hand the same leader a second float rather than
      // refusing. The ledger is append-only by design and it is the caller's
      // job not to double-count.
      const summary = await kaafil.float.readSummary({ tripRef: tour.tourId });
      if (summary.data.length > 0) {
        log(`    ${tour.tourId}: float already issued.`);
        continue;
      }

      const managers = await kaafil.trips.managers.list({ tripRef: tour.tourId });
      const lead = managers.find((row) => row.isLead) ?? managers[0];
      if (lead === undefined) {
        log(`    ${tour.tourId}: nobody rostered, so nobody to hand a float to.`);
        continue;
      }

      const pax = fixture.travellers.filter((t) => t.tourId === tour.tourId).length;
      const amountMinor = floatForTour(pax, tour.itinerary.length);

      await kaafil.float.issue({
        tripRef: tour.tourId,
        // The engine's OWN manager id, not our `managerRef`. The list returns
        // both side by side, which is the only reason this is not a bug.
        managerId: lead.managerId,
        amountMinor,
        note: `Trip float for ${tour.title}`,
      });
      floatsIssued++;
      log(
        `    ${tour.tourId}: ₹${(amountMinor / 100).toLocaleString('en-IN')} to ${lead.fullName}.`,
      );
    } catch (error) {
      failures.push(toFailure('float.issue', tour.tourId, error));
    }
  }

  log(
    `12/13 Pickups. One stop per departure, from the CRM's own boarding city and meeting ` +
      `point — real data, not invented: "Leh / Kushok Bakula Rimpochee Airport, arrivals gate" ` +
      `is what the fixture has always said.`,
  );
  for (const tour of tours) {
    try {
      const existing = live(await kaafil.pickups.list({ tripRef: tour.tourId }));
      let stopId = existing[0]?.id;

      if (stopId === undefined) {
        const created = await kaafil.pickups.create({
          tripRef: tour.tourId,
          kind: 'PICKUP',
          name: tour.boardingCity,
          locationLabel: tour.meetingPoint,
          // 6 a.m. on day one, in the trip's own timezone. A departure assembles
          // early, and the hour is the single most-asked question on the morning
          // of day one — a stop with no time on it is a stop nobody trusts.
          scheduledTime: zonedInstant(tour.startDate, tour.timezone, '06:00:00'),
        });
        stopId = created.id;
        pickupStops++;
        log(`    ${tour.tourId}: ${tour.boardingCity} — ${tour.meetingPoint}.`);
      }

      // Assign everyone who is not already on a stop. `manifestByPickup` is the
      // read that names them, so this reconciles the same way every other step
      // does: a second run finds `unassignedTravellers` empty and writes nothing.
      const manifest = await kaafil.pickups.manifestByPickup({
        tripRef: tour.tourId,
        kind: 'PICKUP',
      });
      for (const traveller of manifest.unassignedTravellers) {
        try {
          await kaafil.pickups.assign({
            tripRef: tour.tourId,
            pointId: stopId,
            travellerId: traveller.travellerId,
          });
        } catch (error) {
          failures.push(toFailure('pickups.assign', traveller.travellerId, error));
        }
      }
      if (manifest.unassignedTravellers.length > 0) {
        log(`    ${tour.tourId}: ${manifest.unassignedTravellers.length} travellers on the stop.`);
      }
    } catch (error) {
      failures.push(toFailure('pickups', tour.tourId, error));
    }
  }

  log(
    `13/13 Balances. What each traveller still owes, straight from the CRM's bookings and ` +
      `receipts. This is the one number the desk and the field must agree on, and it is the ` +
      `CRM's to state — Kaafil never sells anything, so it can only be told.`,
  );
  // NOT `bookings.bulkUpsert`. Kaafil's "booking" is a SUPPLIER booking — a hotel
  // or flight with a confirmation ref and a voucher file. Sharma Travels' 342
  // bookings are SALES bookings, and the CRM holds no supplier record at all, so
  // pushing them there would mean inventing hotel names to fill a tab. Their real
  // home is the balance ledger below, which is what a sales booking actually is
  // once Kaafil has it: what was sold, and what is still owed.
  for (const tour of tours) {
    // A booking is billed as a party; Kaafil holds a balance per traveller. Split
    // the party's total evenly across its members, giving any rounding remainder
    // to the lead — somebody has to carry the odd paisa, and the lead is who the
    // desk rings about it.
    const rows: {
      travellerRef: string;
      totalMinor: number;
      dueMinor: number;
      currency: string;
      sourceUpdatedAt: string;
    }[] = [];

    for (const booking of fixture.bookings.filter((b) => b.tourId === tour.tourId)) {
      const party = fixture.travellers.filter((t) => t.bookingRef === booking.bookingRef);
      if (party.length === 0) continue;

      const due = booking.totalMinor - booking.receivedMinor;
      const share = Math.floor(booking.totalMinor / party.length);
      const dueShare = Math.floor(due / party.length);
      const leadIndex = Math.max(
        0,
        party.findIndex((t) => t.partyRole === 'LEAD'),
      );

      party.forEach((traveller, i) => {
        const isLead = i === leadIndex;
        rows.push({
          travellerRef: traveller.travellerId,
          totalMinor: share + (isLead ? booking.totalMinor - share * party.length : 0),
          dueMinor: dueShare + (isLead ? due - dueShare * party.length : 0),
          currency: tour.currency,
          sourceUpdatedAt: booking.sourceUpdatedAt,
        });
      });
    }

    if (rows.length === 0) {
      log(`    ${tour.tourId}: no bookings to price.`);
      continue;
    }

    try {
      await kaafil.trips.balance.push({ tripRef: tour.tourId, balances: rows });
      balancesPushed += rows.length;
      const owing = rows.filter((r) => r.dueMinor > 0).length;
      log(`    ${tour.tourId}: ${rows.length} balances, ${owing} still owing.`);
    } catch (error) {
      failures.push(toFailure('trips.balance.push', tour.tourId, error));
    }
  }

  if (failures.length > 0) {
    const codes = new Map<string, number>();
    for (const f of failures) codes.set(f.code, (codes.get(f.code) ?? 0) + 1);
    log(
      `    ${failures.length} enrichment push(es) did not land: ` +
        [...codes].map(([code, n]) => `${n}×${code}`).join(', ') +
        `. Collected rather than thrown — a trip whose rooming refused still has its itinerary.`,
    );
  }

  return {
    itineraryItems,
    rooms,
    roomingAssigned,
    checklistItems,
    floatsIssued,
    pickupStops,
    balancesPushed,
    failures,
  };
}

/** Re-exported so the CLI does not have to import from two places. */
export { isKaafilError };
