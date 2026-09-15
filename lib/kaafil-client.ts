import { Environment, Kaafil, resolveBaseUrl } from 'kaafil-js';
import { type KaafilEnv, readKaafilEnv } from '@/config/env';

/**
 * Builds a `Kaafil` client from the environment.
 *
 * Deliberately has NO `import 'server-only'`, so that both halves of the repo
 * can share one construction path: the Next route handlers reach it through
 * `lib/kaafil-server.ts` (which does carry the guard), and `pnpm seed:kaafil`
 * calls it directly from plain Node, where `server-only` would throw.
 *
 * Do not import this from a component. Import `lib/kaafil-server.ts` instead
 * and let the guard there do its job.
 */

export interface KaafilClient {
  readonly kaafil: Kaafil;
  readonly env: KaafilEnv;
  /**
   * The engine host this process resolved.
   *
   * Forwarded to the browser because once the browser holds a session it calls
   * the engine DIRECTLY — only the API-key lane proxies through this server. It
   * has to reach the same host this process did, and a hardcoded literal in the
   * client is how a staging browser ends up talking to production.
   */
  readonly baseUrl: string;
}

export function createKaafilClient(): KaafilClient {
  const env = readKaafilEnv();
  const environment = env.plane === 'live' ? Environment.Live : Environment.Test;

  const kaafil = new Kaafil({
    apiKey: env.apiKey,
    environment,
    ...(env.baseUrlOverride !== undefined ? { baseUrl: env.baseUrlOverride } : {}),
  });

  return { kaafil, env, baseUrl: env.baseUrlOverride ?? resolveBaseUrl(environment) };
}
