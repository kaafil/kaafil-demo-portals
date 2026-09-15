import type { TravellersResponse } from '@/config/contract';
import { errorResponse } from '@/lib/api';
import { getStore } from '@/lib/db';

/** Every person on every manifest, for the "someone rang up with half a name" desk workflow. */
export async function GET(): Promise<Response> {
  try {
    const body: TravellersResponse = { travellers: getStore().listTravellers() };
    return Response.json(body);
  } catch (error) {
    return errorResponse(error);
  }
}
