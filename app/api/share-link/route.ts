import { kaafilErrorResponse, optionalString } from '@/app/api/_shared';
import type { ShareLinkResponse } from '@/config/contract';
import { HttpError } from '@/lib/api';
import { getKaafil } from '@/lib/kaafil-server';
import { readStaff } from '@/lib/session';

/**
 * POST /api/share-link  { tripRef, travellerRef? } -> a TRAVELLER share token.
 *
 * The third credential shape, and the odd one out: no access token, no refresh
 * token, no agencyRef. A bare share token can only ever produce the traveller
 * surface, which is exactly why it is safe to hand to somebody's mother over
 * WhatsApp.
 *
 * `sections` in the response is the SERVER's answer about what this link
 * exposes — a flag per section, not a list of enabled names. A host can narrow
 * that set and can never widen it, so a section missing from a share page is a
 * token configuration question rather than a UI one.
 *
 * Only desk staff may create one. A share link is a disclosure of a manifest —
 * names, phone numbers, who is rooming with whom — so minting one is an act
 * with consequences, not a read.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const { body: raw, value: travellerRef } = await optionalString(request, 'travellerRef');

    const tripRef = raw.tripRef;
    if (typeof tripRef !== 'string' || tripRef.trim() === '') {
      throw new HttpError(400, 'MISSING_FIELD', '`tripRef` is required and must be a string.');
    }

    if ((await readStaff('desk')) === null) {
      throw new HttpError(
        401,
        'NOT_SIGNED_IN',
        'Only the office can create a share link — it discloses a manifest.',
      );
    }

    const { kaafil, baseUrl } = getKaafil();
    const link = await kaafil.shareTokens.create(
      travellerRef === undefined
        ? { tripRef: tripRef.trim() }
        : { tripRef: tripRef.trim(), travellerRef },
    );

    const body: ShareLinkResponse = {
      id: link.id,
      token: link.token,
      tripId: link.tripId,
      travellerId: link.travellerId,
      status: link.status,
      expiresAt: link.expiresAt,
      sections: link.config.sections,
      version: link.version,
      baseUrl,
    };
    return Response.json(body, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return kaafilErrorResponse(error);
  }
}
