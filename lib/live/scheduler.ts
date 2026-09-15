import 'server-only';

import { Cron } from 'croner';
import { DESK_TIMEZONE } from '@/fixtures/calendar';
import { getKaafil } from '@/lib/kaafil-server';
import { refreshLiveDeparture } from './refresh';

/**
 * The one thing this server does that is not a response to a request.
 *
 * ── WHY A CRON EXPRESSION AND NOT `setInterval` ────────────────────────────
 *
 * The sibling engine's own scheduler uses plain interval constants, and for its
 * sweeps that is right — a retention purge does not care what time it runs. This
 * one does. A 24-hour interval fires at whatever time the container happened to
 * boot, so after a redeploy at 14:00 the departure rolls over at 14:00, in the
 * middle of whoever is looking at the demo. A cron expression pins it to a quiet
 * hour and keeps it there across restarts.
 *
 * 03:10, and off the hour deliberately: everything in the world that runs
 * "daily" runs at :00, and there is no reason to queue behind it.
 *
 * ── WHY DAILY, WHEN A DEPARTURE LASTS TEN DAYS ─────────────────────────────
 *
 * Because the job is nearly free when there is nothing to do, and the failure
 * it is guarding against is not "the date changed" but "the last attempt did
 * not land". A run that finds the tenant already current returns after two
 * string comparisons. A run that finds yesterday's push half-finished retries
 * it. Scheduling this to match the departure length would mean a failed
 * rollover sat broken for ten days.
 */
export function startLiveScheduler(): Cron {
  return new Cron(
    '10 3 * * *',
    {
      name: 'live-departure',
      // The desk's midnight, not the container's. This is a Pune operator's
      // book of business and `fixtures/calendar.ts` resolves "today" in the
      // same zone for the same reason — a job whose idea of the date disagreed
      // with the data's would roll over a few hours early or late depending on
      // where it happened to be scheduled.
      timezone: DESK_TIMEZONE,
      // The tenant push can run for a while against a rate-limited API. Without
      // this, a slow run and the next night's tick would overlap, and two
      // concurrent pushes of the same departure is the one way this job could
      // create duplicates.
      protect: true,
      // A throw here must never take the server down with it. The demo serving
      // slightly stale data beats the demo not serving.
      catch: (error: unknown) => {
        console.error('[live] scheduled refresh threw', error);
      },
      // Do not hold the process open on this timer alone.
      unref: true,
    },
    async () => {
      // The server's own memoised client, not a fresh one — see
      // `RefreshOptions.client`.
      await refreshLiveDeparture({ client: getKaafil() });
    },
  );
}

/**
 * One refresh shortly after the process comes up.
 *
 * A container is serving whatever departure was live when its IMAGE was built,
 * and on a demo that is redeployed now and then that is the most likely reason
 * for it to be out of date — more likely than the calendar simply moving on.
 *
 * The small delay lets the server finish opening its port first, so the very
 * first request is never queued behind a rebuild of the database. Errors are
 * swallowed to a log line for the same reason the cron's `catch` exists: a
 * demo serving slightly stale data beats a demo that would not start.
 */
export function refreshOnBoot(delayMs = 5_000): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      refreshLiveDeparture({ client: getKaafil() })
        .catch((error: unknown) => {
          console.error('[live] boot refresh failed — the scheduled run will retry', error);
        })
        .finally(resolve);
    }, delayMs);
    // Never keep the process alive just for this.
    timer.unref?.();
  });
}
