import type { CrmErrorBody } from '@/config/contract';

/**
 * How a route handler fails.
 *
 * `code` is stable and is what a caller branches on; `message` is prose for a
 * human and may change without notice. That split is copied deliberately from
 * the engine's own error contract — a client that string-matches a message is
 * a client that breaks on a typo fix.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    const body: CrmErrorBody = { error: { code: error.code, message: error.message } };
    return Response.json(body, { status: error.status });
  }

  // An unexpected throw is logged in full and reported as a generic 500. The
  // message could name a filesystem path or a query, and neither belongs in a
  // response body.
  console.error('[api] unhandled', error);
  const body: CrmErrorBody = {
    error: { code: 'INTERNAL', message: 'The CRM failed to answer that request.' },
  };
  return Response.json(body, { status: 500 });
}
