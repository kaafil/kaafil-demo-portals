import 'server-only';

import { type CrmStore, openStore } from './store';

/**
 * One store per process, reused across requests.
 *
 * `openStore()` prepares around twenty statements and opens a file handle.
 * Doing that per request would be wasteful in production and actively wrong in
 * dev, where Next's hot reload re-evaluates a module on every edit and would
 * leak a SQLite handle each time.
 *
 * Hence `globalThis`: module-level state does not survive a hot reload, but the
 * global object does. This is the standard Next escape hatch for exactly this
 * problem (the one everybody reaches for with Prisma), and the cast is
 * contained to the two lines below.
 *
 * The store is opened read-only. The only writer in this repo is
 * `pnpm seed`, and nothing served over HTTP has any business changing the
 * CRM's book of business.
 */
const globalForStore = globalThis as unknown as { __crmStore?: CrmStore };

export function getStore(): CrmStore {
  globalForStore.__crmStore ??= openStore();
  return globalForStore.__crmStore;
}
