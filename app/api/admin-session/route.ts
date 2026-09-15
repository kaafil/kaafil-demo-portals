import { kaafilErrorResponse, requireString } from '@/app/api/_shared';
import type { AgencyAdminSessionResponse } from '@/config/contract';
import { HttpError } from '@/lib/api';
import { getKaafil } from '@/lib/kaafil-server';
import { readStaff } from '@/lib/session';

/**
 * POST /api/admin-session  { agencyAdminRef } -> an AGENCY ADMIN session.
 *
 * Note the response shape is IDENTICAL to the manager route's: accessToken,
 * refreshToken, agencyRef. The persona difference lives inside the token, and
 * the provider reads it out. That is why these are two routes rather than one
 * `/token` with a `type` field — if the browser could name the persona it
 * wanted, the capability system would be advisory rather than real.
 *
 * Same authorization rule as the manager route: signed in to THIS portal, and
 * only for yourself.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const agencyAdminRef = await requireString(request, 'agencyAdminRef');

    const staff = await readStaff('desk');
    if (staff === null) {
      throw new HttpError(401, 'NOT_SIGNED_IN', 'Sign in to the office portal first.');
    }
    if (staff.staffId !== agencyAdminRef) {
      throw new HttpError(403, 'NOT_YOURS', 'You can only open a session for yourself.');
    }

    const { kaafil, env, baseUrl } = getKaafil();
    const session = await kaafil.auth.mintAgencyAdminToken({ agencyAdminRef });

    const body: AgencyAdminSessionResponse = {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      tokenType: session.tokenType,
      expiresIn: session.expiresIn,
      expiresAt: session.expiresAt,
      agencyId: session.agencyId,
      agencyRef: env.agencyRef,
      baseUrl,
    };
    return Response.json(body, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return kaafilErrorResponse(error);
  }
}
