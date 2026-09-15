import { todayInDeskZone } from '@/fixtures/calendar';
import { buildLiveDeparture } from '@/fixtures/live';
import { errorResponse } from '@/lib/api';
import { getStore } from '@/lib/db';
import { getKaafil } from '@/lib/kaafil-server';
import { readLiveState } from '@/lib/live/state';
import { frozenFixture } from '@/lib/live/swap';

/**
 * What this process is, what it is pointed at, and whether the demo is still
 * telling the truth about today.
 *
 * Reports the PLANE and the agency ref but never the key, not even a prefix
 * long enough to be useful. `baseUrl` is here deliberately: the browser needs
 * the same engine host this process resolved, because once it holds a session
 * it calls the engine directly.
 */

/**
 * How long the live departure may be out of date before `ok` goes false.
 *
 * The scheduler runs daily, so anything past about a day and a half means it is
 * not running at all — a crashed `register()`, a container that never reached
 * the Node runtime, `LIVE_SCHEDULER=0` left set by accident.
 */
const STALE_AFTER_HOURS = 36;

export async function GET(): Promise<Response> {
  try {
    const store = getStore();

    // Kaafil config is reported as unconfigured rather than as a 500. The CRM
    // half runs perfectly well without a key, and during setup "the database
    // is fine, the key is missing" is the answer you actually want.
    let kaafil: { configured: boolean; plane?: string; agencyRef?: string; baseUrl?: string };
    try {
      const server = getKaafil();
      kaafil = {
        configured: true,
        plane: server.env.plane,
        agencyRef: server.env.agencyRef,
        baseUrl: server.baseUrl,
      };
    } catch {
      kaafil = { configured: false };
    }

    /*
     * THE DRIFT IS MEASURED FROM THE DATA, NOT FROM THE JOB'S OWN REPORT.
     *
     * A job that runs, logs success and writes nothing looks healthy by its own
     * account, and "the demo has been subtly wrong for three weeks" is exactly
     * the failure nobody notices. So `expected` is recomputed here from today's
     * date and compared against what the store actually holds. That check
     * survives the state file being deleted, which matters on a container with
     * no persistent volume.
     */
    const today = todayInDeskZone();
    const expected = buildLiveDeparture(frozenFixture(), today);
    const state = readLiveState();
    const servedTourId = store.listTours().find((row) => row.tour.status === 'ON_TOUR')
      ?.tour.tourId;

    const staleHours =
      state === null ? null : Math.round((Date.now() - Date.parse(state.lastRunAt)) / 3_600_000);

    const live = {
      today,
      expectedTourId: expected.window.tourId,
      window: `${expected.window.startDate}..${expected.window.endDate}`,
      localTourId: state?.localTourId ?? null,
      tenantTourId: state?.tenantTourId ?? null,
      lastRunAt: state?.lastRunAt ?? null,
      lastOutcome: state?.lastOutcome ?? null,
      staleHours,
      failuresByCode: state?.failuresByCode ?? {},
      /** The store genuinely holds a departure that is under way today. */
      servedIsCurrent: servedTourId === expected.window.tourId,
    };

    /*
     * WHAT MAKES THIS UNHEALTHY, AND WHAT DELIBERATELY DOES NOT.
     *
     * The first condition is the one that matters and it needs no state file:
     * the database this process is serving must actually hold a departure that
     * is under way today. That catches a dead scheduler on the day it matters,
     * and it survives `live-state.json` being lost — which it is on every
     * redeploy of a container with no persistent volume.
     *
     * A MISSING STATE FILE IS NOT UNHEALTHY. A container that has just come up
     * with a correctly seeded image has nothing wrong with it, and failing the
     * probe would make every deploy fail its own health gate and roll back. The
     * boot refresh in `instrumentation.ts` fills the file in moments anyway.
     *
     * The other two only apply once there IS a state file: the job has run
     * recently, and it is not sitting on a push that never completed.
     */
    const healthy =
      live.servedIsCurrent &&
      (state === null ||
        (staleHours !== null &&
          staleHours <= STALE_AFTER_HOURS &&
          state.lastOutcome !== 'partial' &&
          state.lastOutcome !== 'failed'));

    return Response.json({ ok: healthy, crm: store.counts, kaafil, live });
  } catch (error) {
    return errorResponse(error);
  }
}
