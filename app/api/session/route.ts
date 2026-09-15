import type { ManagerSessionResponse } from '@/config/contract';
import { kaafilErrorResponse, requireString } from '@/app/api/_shared';
import { getKaafil } from '@/lib/kaafil-server';
import { HttpError } from '@/lib/api';
import { readStaff } from '@/lib/session';

/**
 * POST /api/session  { managerRef } -> a MANAGER session.
 *
 * One of the three routes that exist only to keep the API key on this side of
 * the network. The browser asks for a credential and gets back a short-lived,
 * single-identity one.
 *
 * ── THE AUTHORIZATION CHECK THE DONOR REPO DID NOT HAVE ────────────────────
 *
 * The donor's version minted a session for whatever `managerRef` the body
 * named, and said in a comment not to copy it into a real product without
 * adding the check. This is a demo partners will copy, so the check is here:
 * the caller must be signed in to the FIELD portal, and may only mint a
 * session for themselves.
 *
 * Without it, anybody who can reach this route can act as any tour leader in
 * the tenant — the API key's full reach, handed out one identity at a time.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const managerRef = await requireString(request, 'managerRef');

    const staff = await readStaff('manager');
    if (staff === null) {
      throw new HttpError(401, 'NOT_SIGNED_IN', 'Sign in to the field app first.');
    }
    if (staff.staffId !== managerRef) {
      throw new HttpError(
        403,
        'NOT_YOURS',
        'You can only open a session for yourself. The signed-in leader and the ' +
          'requested managerRef do not match.',
      );
    }

    const { kaafil, env, baseUrl } = getKaafil();
    const session = await kaafil.auth.mintManagerToken({ managerRef });

    // `KaafilResponse<T>` is `T & { meta }` — an intersection, not an
    // envelope. There is no `.data` to unwrap.
    //
    // `refreshToken` is shown exactly once, here and at each later rotation.
    // It is forwarded to the browser because the UI Kit's staff credential
    // needs it, and it is never logged.
    const body: ManagerSessionResponse = {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      tokenType: session.tokenType,
      expiresIn: session.expiresIn,
      expiresAt: session.expiresAt,
      agencyId: session.agencyId,
      managerId: session.managerId,
      // Your own ref for the agency, NOT Kaafil's `agencyId`. The provider
      // takes the external one, and handing it the internal id fails in a way
      // that looks like an auth problem.
      agencyRef: env.agencyRef,
      baseUrl,
    };
    return Response.json(body, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return kaafilErrorResponse(error);
  }
}
