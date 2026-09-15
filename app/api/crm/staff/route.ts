import type { StaffResponse } from '@/config/contract';
import { errorResponse } from '@/lib/api';
import { getStore } from '@/lib/db';

/** The roster, with each person's departure assignments. */
export async function GET(): Promise<Response> {
  try {
    const body: StaffResponse = { staff: getStore().listStaff() };
    return Response.json(body);
  } catch (error) {
    return errorResponse(error);
  }
}
