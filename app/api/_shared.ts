import 'server-only';

import { isKaafilError } from 'kaafil-js';
import type { CrmErrorBody } from '@/config/contract';
import { HttpError } from '@/lib/api';

/** Pull a required string out of a JSON body, or fail with a usable message. */
export async function requireString(request: Request, field: string): Promise<string> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, 'BAD_JSON', 'Body is not JSON.');
  }
  const value = (body as Record<string, unknown> | null)?.[field];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new HttpError(400, 'MISSING_FIELD', `\`${field}\` is required and must be a string.`);
  }
  return value.trim();
}

export async function optionalString(
  request: Request,
  field: string,
): Promise<{ body: Record<string, unknown>; value: string | undefined }> {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    throw new HttpError(400, 'BAD_JSON', 'Body is not JSON.');
  }
  const body = (parsed as Record<string, unknown> | null) ?? {};
  const value = body[field];
  return {
    body,
    value: typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined,
  };
}

/**
 * Turn anything a mint route can throw into a response.
 *
 * Engine errors are detected with `isKaafilError`, never `instanceof`. The two
 * are not equivalent once more than one copy of `kaafil-js` can end up in a
 * dependency graph — `instanceof` compares constructor identity and silently
 * answers false across copies, which turns a handled 409 into an unhandled 500.
 *
 * The engine's `code` is passed through because it is stable and a caller can
 * branch on it. The engine's `message` is not, and a status is capped at 502
 * for anything 5xx so a partner's outage does not read as ours.
 */
export function kaafilErrorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    const body: CrmErrorBody = { error: { code: error.code, message: error.message } };
    return Response.json(body, { status: error.status });
  }

  if (isKaafilError(error)) {
    const status = typeof error.status === 'number' ? error.status : 502;
    const body: CrmErrorBody = {
      error: {
        code: error.code ?? 'KAAFIL_ERROR',
        message: error.message,
        ...(error.requestId !== undefined ? { requestId: error.requestId } : {}),
      },
    };
    return Response.json(body, { status: status >= 500 ? 502 : status });
  }

  console.error('[kaafil] unhandled', error);
  const body: CrmErrorBody = {
    error: { code: 'INTERNAL', message: 'Could not reach Kaafil.' },
  };
  return Response.json(body, { status: 500 });
}
