/*
 * NO `import 'server-only'` HERE, and it is the same split `lib/kaafil-client.ts`
 * makes against `lib/kaafil-server.ts`: `pnpm live:refresh` runs this code from
 * plain Node under `tsx`, where `server-only` throws on import. Nothing in this
 * module holds a credential — the Kaafil client is handed in by the caller — so
 * the guard would buy nothing and break the one caller that most needs to run.
 */
import { todayInDeskZone } from '@/fixtures/calendar';
import { buildLiveDeparture } from '@/fixtures/live';
import type { CrmFixture } from '@/fixtures/types';
import { enrichTrips } from '@/lib/enrich';
import { runIngest } from '@/lib/ingest';
import { createKaafilClient, type KaafilClient } from '@/lib/kaafil-client';
import { retireFinishedTrips } from './retire';
import { type LiveState, readLiveState, writeLiveState } from './state';
import { frozenFixture, swapStoreForToday } from './swap';

/**
 * Keep one departure out on the ground, every day, for ever.
 *
 * ── WHAT THIS ACTUALLY DOES, AND WHAT IT REFUSES TO DO ─────────────────────
 *
 * `fixtures/live.ts` decides which departure is under way today — a pure
 * function of the date. This job's whole job is to make the two stores agree
 * with that answer: rebuild `crm.sqlite` so the desk shows it, and push it into
 * the Kaafil tenant so the field app has something to work on.
 *
 * It never edits a departure that has already run. When the live one ends, the
 * next one begins under a NEW id, and the finished one stays finished in both
 * stores. That is what keeps this job out of the two holes a date-shifting
 * design falls into: Kaafil resolves writes by last-writer-wins on
 * `sourceUpdatedAt` (so a shifted row silently answers `ignored_stale` unless
 * its stamp moves too), and close-out is a `423` with no override at any tier
 * (so a completed trip cannot be pulled back into the present at all). Neither
 * applies to a trip that is being created for the first time.
 *
 * ── IT IS SAFE TO RUN AS OFTEN AS YOU LIKE ─────────────────────────────────
 *
 * Six days out of seven — or nine out of ten, on a ten-day departure — there is
 * nothing to do and this returns `noop` after two string comparisons. When
 * there IS something to do, every write is an upsert keyed on an id derived
 * from the date, so running twice produces the same rows as running once.
 */

export type RefreshOutcome = LiveState['lastOutcome'];

export interface RefreshReport {
  readonly outcome: RefreshOutcome;
  readonly today: string;
  readonly tourId: string;
  readonly reseeded: boolean;
  readonly pushed: boolean;
  readonly failuresByCode: Readonly<Record<string, number>>;
  readonly lines: readonly string[];
}

export interface RefreshOptions {
  /** Override the clock. Tests and the CLI use it; the scheduler does not. */
  readonly today?: string;
  /** Do the local rebuild but leave the tenant alone. See `LIVE_SKIP_TENANT`. */
  readonly skipTenant?: boolean;
  /** Rebuild and re-push even when the state file says it is already done. */
  readonly force?: boolean;
  /**
   * The Kaafil client to push with.
   *
   * The scheduler passes the server's memoised one (`getKaafil()`), because a
   * second instance means a second connection pool and a second retry ladder
   * racing the first into the same rate limit — `lib/kaafil-server.ts` spells
   * that out. The CLI has no memoised one to pass and builds its own, which is
   * correct for a process that exits straight afterwards.
   */
  readonly client?: KaafilClient;
  readonly log?: (line: string) => void;
}

function tally(failures: readonly { code: string }[]): Record<string, number> {
  const byCode: Record<string, number> = {};
  for (const failure of failures) byCode[failure.code] = (byCode[failure.code] ?? 0) + 1;
  return byCode;
}

/**
 * A fixture holding ONLY the live departure, plus the agency and staff every
 * push needs to resolve its references.
 *
 * `runIngest` takes a whole fixture and walks it, so narrowing the input is how
 * you narrow the work — and narrowing matters a great deal here. The full seed
 * is 57 departures: 57 trip upserts, 57 manifests and 57 journey builds, which
 * the README already warns is several minutes and a rate limit you will hit.
 * One departure is a handful of calls.
 *
 * The staff roster is passed whole rather than filtered to this departure's
 * leader, because a manager must exist in the tenant before anyone can sign in
 * as them — and a visitor picking any of the twenty names is the first thing
 * that happens on this demo. Those upserts are idempotent and cheap.
 */
function liveOnlyFixture(base: CrmFixture, today: string): CrmFixture {
  const live = buildLiveDeparture(base, today);
  return {
    agency: base.agency,
    staff: base.staff,
    tours: [live.tour],
    tourStaff: [...live.tourStaff],
    bookings: [...live.bookings],
    payments: [...live.payments],
    travellers: [...live.travellers],
  };
}

export async function refreshLiveDeparture(options: RefreshOptions = {}): Promise<RefreshReport> {
  const lines: string[] = [];
  const say = options.log ?? ((line: string) => console.log(line));
  const log = (line: string) => {
    lines.push(line);
    say(`[live] ${line}`);
  };

  const today = options.today ?? todayInDeskZone();
  const base = frozenFixture();
  const { window } = buildLiveDeparture(base, today);
  const tourId = window.tourId;
  const state = readLiveState();

  const localCurrent = state?.localTourId === tourId;
  const tenantCurrent = state?.tenantTourId === tourId;
  const skipTenant = options.skipTenant ?? process.env.LIVE_SKIP_TENANT === '1';

  if (!options.force && localCurrent && (tenantCurrent || skipTenant)) {
    log(
      `${today}: ${tourId} is already live (day ${window.startDate}..${window.endDate}) — nothing to do`,
    );
    writeLiveState({
      ...(state as LiveState),
      lastRunAt: new Date().toISOString(),
      lastOutcome: 'noop',
    });
    return {
      outcome: 'noop',
      today,
      tourId,
      reseeded: false,
      pushed: false,
      failuresByCode: {},
      lines,
    };
  }

  // -- local ----------------------------------------------------------------
  let reseeded = false;
  if (options.force || !localCurrent) {
    log(
      `${today}: ${tourId} should be live and the store holds ${state?.localTourId ?? 'nothing'} — rebuilding`,
    );
    const swap = await swapStoreForToday(today);
    reseeded = true;
    log(
      `rebuilt crm.sqlite — ${swap.counts.tours} departures, ${swap.counts.travellers} travellers`,
    );
  }

  if (skipTenant) {
    log('LIVE_SKIP_TENANT is set — the Kaafil tenant was left alone');
    writeLiveState({
      localTourId: tourId,
      localSeededOn: today,
      tenantTourId: state?.tenantTourId ?? null,
      tenantPushedAt: state?.tenantPushedAt ?? null,
      lastRunAt: new Date().toISOString(),
      lastOutcome: 'ok',
      failuresByCode: {},
    });
    return { outcome: 'ok', today, tourId, reseeded, pushed: false, failuresByCode: {}, lines };
  }

  // -- tenant ---------------------------------------------------------------
  //
  // Everything below can fail without the local half being wrong, which is why
  // the two are recorded separately. A partial run leaves `tenantTourId`
  // behind, so tomorrow's tick retries only the half that did not land.
  // The wrapper carries the SDK instance AND the resolved environment, so the
  // agency ref comes from the same place the client did and the two cannot
  // disagree about which tenant this is.
  const client = options.client ?? createKaafilClient();
  const { kaafil, env } = client;
  const agencyRef = env.agencyRef;
  const slice = liveOnlyFixture(base, today);

  const ingest = await runIngest(kaafil, {
    fixture: slice,
    agencyRef,
    log: (line) => log(line),
  });

  let enrichFailures: readonly { code: string }[] = [];
  if (ingest.readyTripRefs.includes(tourId)) {
    const enriched = await enrichTrips(kaafil, {
      fixture: slice,
      tripRefs: [tourId],
      log: (line) => log(line),
    });
    enrichFailures = enriched.failures;
    log(
      `depth: ${enriched.itineraryItems} itinerary items, ${enriched.rooms} rooms, ` +
        `${enriched.checklistItems} checklist items, ${enriched.pickupStops} pickup stop(s), ` +
        `${enriched.balancesPushed} balances`,
    );
  } else {
    log(
      `${tourId} has no journey yet, so the depth pass was skipped — it will be retried tomorrow`,
    );
  }

  /*
   * Retire what the calendar has moved on, in the same run.
   *
   * Adding a live departure without this leaves every previous one permanently
   * IN_PROGRESS in the tenant — several trips claiming to be under way at once,
   * and a field app that opens on whichever it picks. See `./retire.ts`.
   */
  const retired = await retireFinishedTrips(client, base, today, log);

  const failuresByCode = tally([...ingest.failures, ...enrichFailures, ...retired.failures]);
  const clean = Object.keys(failuresByCode).length === 0 && ingest.readyTripRefs.includes(tourId);
  const outcome: RefreshOutcome = clean ? 'ok' : 'partial';

  writeLiveState({
    localTourId: tourId,
    localSeededOn: today,
    // Only a CLEAN run claims the tenant is current. Anything else leaves the
    // previous value so the next tick tries again — the alternative is a job
    // that records success it did not have and then never retries.
    tenantTourId: clean ? tourId : (state?.tenantTourId ?? null),
    tenantPushedAt: clean ? new Date().toISOString() : (state?.tenantPushedAt ?? null),
    lastRunAt: new Date().toISOString(),
    lastOutcome: outcome,
    failuresByCode,
  });

  log(
    outcome === 'ok'
      ? `${tourId} is live in both stores`
      : `${tourId} landed only partly — ${JSON.stringify(failuresByCode)}`,
  );

  return { outcome, today, tourId, reseeded, pushed: true, failuresByCode, lines };
}
