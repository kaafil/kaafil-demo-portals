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

/**
 * Drop the memoised handle so the next `getStore()` opens the file afresh.
 *
 * The one caller is the live-departure job (`lib/live/swap.ts`), which rewrites
 * `crm.sqlite` while this server is running. Without this the process would go
 * on reading the OLD file forever: a rename unlinks the previous inode but an
 * open descriptor keeps working on POSIX, so the server would serve last
 * week's departures with no error anywhere until somebody redeployed.
 *
 * That is also the reason the job has to live INSIDE this process. An external
 * cron could rewrite the file perfectly and this handle would never notice.
 *
 * Closing is safe at any moment because `better-sqlite3` is synchronous: no
 * query can be suspended half-way through, so there is no statement to tear.
 * A request that already called `getStore()` and then awaited keeps the old
 * handle for the rest of its work, which is a complete and self-consistent
 * database rather than a mixture — see `lib/live/swap.ts` for why that is
 * acceptable and what it costs.
 */
export function resetStore(): void {
  const open = globalForStore.__crmStore;
  globalForStore.__crmStore = undefined;
  open?.close();
}
