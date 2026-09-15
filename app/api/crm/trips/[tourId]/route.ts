import type { TourResponse } from '@/config/contract';
import { errorResponse, HttpError } from '@/lib/api';
import { getStore } from '@/lib/db';

/** One departure — crew, bookings, receipts and manifest — in a single read. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ tourId: string }> },
): Promise<Response> {
  try {
    const { tourId } = await context.params;
    const tour = getStore().getTour(tourId);
    if (tour === null) {
      throw new HttpError(404, 'TOUR_NOT_FOUND', `No departure with id ${tourId}.`);
    }
    const body: TourResponse = tour;
    return Response.json(body);
  } catch (error) {
    return errorResponse(error);
  }
}
