import type { ToursResponse } from '@/config/contract';
import { errorResponse } from '@/lib/api';
import { getStore } from '@/lib/db';

/**
 * The departures list, plus the agency the office belongs to.
 *
 * Note the URL says `trips` while everything it returns is called a `tour`.
 * That mismatch is inherited from the donor fixture and it is kept on purpose:
 * Sharma Travels says *tour*, Kaafil says *trip*, and a partner integrating
 * for real will have exactly this kind of seam somewhere in their own system.
 * A demo that quietly renamed one side would be hiding the interesting part.
 */
export async function GET(): Promise<Response> {
  try {
    const store = getStore();
    const body: ToursResponse = { agency: store.agency(), tours: store.listTours() };
    return Response.json(body);
  } catch (error) {
    return errorResponse(error);
  }
}
