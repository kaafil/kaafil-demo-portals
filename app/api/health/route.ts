import { errorResponse } from '@/lib/api';
import { getStore } from '@/lib/db';
import { getKaafil } from '@/lib/kaafil-server';

/**
 * What this process is, and what it is pointed at.
 *
 * Reports the PLANE and the agency ref but never the key, not even a prefix
 * long enough to be useful. `baseUrl` is here deliberately: the browser needs
 * the same engine host this process resolved, because once it holds a session
 * it calls the engine directly.
 */
export async function GET(): Promise<Response> {
  try {
    const store = getStore();

    // Kaafil config is reported as unconfigured rather than as a 500. The CRM
    // half runs perfectly well without a key, and during setup "the database
    // is fine, the key is missing" is the answer you actually want.
    let kaafil: { configured: boolean; plane?: string; agencyRef?: string; baseUrl?: string };
    try {
      const server = getKaafil();
      kaafil = {
        configured: true,
        plane: server.env.plane,
        agencyRef: server.env.agencyRef,
        baseUrl: server.baseUrl,
      };
    } catch {
      kaafil = { configured: false };
    }

    return Response.json({ ok: true, crm: store.counts, kaafil });
  } catch (error) {
    return errorResponse(error);
  }
}
