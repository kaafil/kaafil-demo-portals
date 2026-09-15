import type { Cron } from 'croner';

/**
 * Next calls `register()` once per server process, before the first request.
 * It is the only hook that is neither a route handler nor a module side effect,
 * which makes it the right — and only — home for a scheduler.
 *
 * ── FOUR GUARDS, AND NONE OF THEM IS PARANOIA ──────────────────────────────
 *
 * `NEXT_RUNTIME === 'nodejs'` — `register()` is also called for the Edge
 * runtime, which has no filesystem, no `better-sqlite3` and no timer that
 * outlives a request. The dynamic `import()` below is part of the same guard: a
 * static import would pull the whole job into the Edge compilation of this file
 * and fail before the check could run.
 *
 * `phase-production-build` — `pnpm build` evaluates this file. A scheduler
 * started during a build would push into the live Kaafil tenant from CI, which
 * is both wrong and very hard to explain afterwards.
 *
 * `LIVE_SCHEDULER !== '0'` — an off switch that does not require a code change,
 * for a local checkout that should not be writing to a shared tenant.
 *
 * `globalThis` — module state does not survive Next's hot reload, so in dev
 * every edit would register another Cron and the job would fire N times a
 * night with N growing all day. The global object does survive. Same escape
 * hatch and same reasoning as `lib/db/index.ts`'s memoised store handle.
 *
 * ── ONE INSTANCE ONLY ──────────────────────────────────────────────────────
 *
 * Two replicas would mean two schedulers pushing the same departure at the same
 * moment. They would also already be serving two independently seeded copies of
 * `crm.sqlite`, since it lives inside the container — so scaling this app
 * horizontally is wrong well before the scheduler is considered. Keep it at one,
 * or set `LIVE_SCHEDULER=0` on all but one.
 */
const globalForLive = globalThis as unknown as { __liveCron?: Cron };

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  if (process.env.LIVE_SCHEDULER === '0') return;
  if (globalForLive.__liveCron !== undefined) return;

  const { startLiveScheduler, refreshOnBoot } = await import('@/lib/live/scheduler');
  globalForLive.__liveCron = startLiveScheduler();
  console.log('[live] scheduler armed — 03:10 Asia/Kolkata, daily');

  /*
   * CONVERGE NOW, NOT AT 03:10.
   *
   * A freshly deployed container is serving whatever departure was live on the
   * day the IMAGE was built, which may be weeks ago. Waiting for the next
   * scheduled tick would mean a deploy could leave the demo stale for most of a
   * day, and it is the deploy — not the passage of time — that most often puts
   * it out of date.
   *
   * Not awaited, deliberately: `register()` runs before the first request is
   * served, and the tenant push can take a while. Blocking here would hold the
   * whole server closed behind a network call to Kaafil, so a slow or unhappy
   * engine would look like a container that will not start. The refresh
   * finishes in the background and the next request sees the result.
   */
  void refreshOnBoot();
}
