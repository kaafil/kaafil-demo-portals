import 'server-only';

import { createKaafilClient, type KaafilClient } from '@/lib/kaafil-client';

/**
 * The Kaafil client, as a route handler should reach it.
 *
 * ── WHY `server-only` IS AT THE TOP ────────────────────────────────────────
 *
 * It is not decoration. `import 'server-only'` makes this module a build error
 * the moment anything in a client component's import graph reaches it. A
 * comment saying "don't import this from the browser" is advice; this is
 * enforcement, and enforcement is what you want around a client holding a
 * credential that can mint a session for any manager in the tenant, read every
 * trip, and erase a traveller.
 *
 * The construction itself lives in `lib/kaafil-client.ts`, unguarded, because
 * `pnpm seed:kaafil` needs the same code from plain Node and `server-only`
 * throws outside a Next bundle. That split is deliberate and the guard is
 * still on the module a component could plausibly reach.
 *
 * ── WHY ONE CLIENT AND NOT ONE PER REQUEST ─────────────────────────────────
 *
 * A `Kaafil` instance owns a connection pool, a retry ladder and an
 * idempotency-key generator. A second instance duplicates all three, which
 * means two independent backoff schedules racing each other into the same rate
 * limit. So: one per process, cached on `globalThis` so Next's hot reload does
 * not leak a new one on every edit.
 */

export type { KaafilClient } from '@/lib/kaafil-client';

const globalForKaafil = globalThis as unknown as { __kaafil?: KaafilClient };

export function getKaafil(): KaafilClient {
  globalForKaafil.__kaafil ??= createKaafilClient();
  return globalForKaafil.__kaafil;
}
