import 'server-only';

import { Environment, Kaafil, resolveBaseUrl } from 'kaafil-js';
import { type KaafilEnv, readKaafilEnv } from '@/config/env';

/**
 * The ONE place a `Kaafil` client is constructed, and the only module in the
 * repo that holds the API key.
 *
 * ── WHY `server-only` IS AT THE TOP ────────────────────────────────────────
 *
 * It is not decoration. `import 'server-only'` makes this module a build
 * error the moment anything in a client component's import graph reaches it.
 * The comment saying "don't import this from the browser" is advice; this is
 * enforcement, and enforcement is what you want protecting a credential that
 * can mint a session for any manager in the tenant, read every trip, and erase
 * a traveller.
 *
 * ── WHY ONE CLIENT AND NOT ONE PER REQUEST ─────────────────────────────────
 *
 * A `Kaafil` instance owns a connection pool, a retry ladder and an
 * idempotency-key generator. A second instance duplicates all three, which
 * means two independent backoff schedules racing each other into the same rate
 * limit. So: one per process, cached on `globalThis` so Next's hot reload does
 * not leak a new one on every edit.
 *
 * ── WHAT THE BROWSER GETS INSTEAD ──────────────────────────────────────────
 *
 * A short-lived, single-identity session token, minted by one of the three
 * routes under `app/api/`. Never this.
 */

export interface KaafilServer {
  readonly kaafil: Kaafil;
  readonly env: KaafilEnv;
  /**
   * The engine host this process resolved.
   *
   * Forwarded to the browser because once the browser holds a session it calls
   * the engine DIRECTLY — only the API-key lane proxies through this server.
   * It has to reach the same host this process did, and a hardcoded literal in
   * the client is how you end up with a staging browser talking to production.
   */
  readonly baseUrl: string;
}

const globalForKaafil = globalThis as unknown as { __kaafil?: KaafilServer };

export function getKaafil(): KaafilServer {
  if (globalForKaafil.__kaafil !== undefined) return globalForKaafil.__kaafil;

  const env = readKaafilEnv();
  const environment = env.plane === 'live' ? Environment.Live : Environment.Test;

  const kaafil = new Kaafil({
    apiKey: env.apiKey,
    environment,
    ...(env.baseUrlOverride !== undefined ? { baseUrl: env.baseUrlOverride } : {}),
  });

  globalForKaafil.__kaafil = {
    kaafil,
    env,
    baseUrl: env.baseUrlOverride ?? resolveBaseUrl(environment),
  };
  return globalForKaafil.__kaafil;
}
