'use client';

import type {
  AgencyAdminSessionResponse,
  CrmErrorBody,
  ManagerSessionResponse,
} from '@/config/contract';
import { KAAFIL_API } from '@/config/contract';

/**
 * How the browser gets a Kaafil credential.
 *
 * ── WHY A RESOLVER AND NOT PROPS ───────────────────────────────────────────
 *
 * The provider accepts either literal tokens or a `credentialResolver` that
 * returns them. This repo uses the resolver everywhere, for three reasons:
 *
 * 1. The tokens never enter the HTML. Fetching them in a server component and
 *    passing them down would serialise a live access token into the RSC
 *    payload, where it sits in the page source and in any cache or proxy that
 *    saw the response. The resolver keeps them in a fetch response with
 *    `Cache-Control: no-store`.
 * 2. It is the seam the offline path wraps. `withCachedCredential` from
 *    `kaafil-react-uikit/offline` takes a resolver and returns a resolver, so
 *    a manager who opens the app with no signal gets the last good credential
 *    instead of a boot error. A literal prop has nowhere to put that.
 * 3. It fails where it can be seen. A resolver that rejects surfaces through
 *    the kit's own boot-error screen; a token fetched server-side fails during
 *    render, which is a worse place to find out the session expired.
 *
 * ── THE COOKIE IS THE AUTHORIZATION ────────────────────────────────────────
 *
 * These calls are same-origin and carry the portal's session cookie, which is
 * what lets the route handler check that the caller is who they say they are.
 * The routes refuse a ref that is not the signed-in person's own — see
 * `app/api/session/route.ts` for why that check is not optional.
 */

/** The shape both staff mints return, narrowed to what the provider wants. */
export interface StaffCredential {
  accessToken: string;
  refreshToken: string;
  agencyRef: string;
}

async function mint(path: string, body: Record<string, string>): Promise<StaffCredential> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    // Same-origin already sends the cookie, but saying so means a future move
    // to a different API origin fails loudly rather than silently unauthorised.
    credentials: 'same-origin',
    cache: 'no-store',
  });

  if (!response.ok) {
    // The route's own error body is far more useful than "HTTP 403", and its
    // `code` is stable enough to read in a bug report.
    const problem = (await response.json().catch(() => null)) as CrmErrorBody | null;
    throw new Error(
      problem === null
        ? `${path} failed with HTTP ${response.status}.`
        : `${path} failed: ${problem.error.code} — ${problem.error.message}`,
    );
  }

  const session = (await response.json()) as ManagerSessionResponse | AgencyAdminSessionResponse;
  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    // Kaafil's internal `agencyId` is also on this response and is NOT what the
    // provider wants. Handing it the internal id fails in a way that looks like
    // an auth problem, which is an afternoon nobody needs to lose twice.
    agencyRef: session.agencyRef,
  };
}

/** A tour leader's credential. Requires a `/m` session for the same person. */
export function managerCredential(managerRef: string): () => Promise<StaffCredential> {
  return () => mint(KAAFIL_API.session, { managerRef });
}

/** A desk executive's credential. Requires an `/admin` session for the same person. */
export function agencyAdminCredential(agencyAdminRef: string): () => Promise<StaffCredential> {
  return () => mint(KAAFIL_API.adminSession, { agencyAdminRef });
}
