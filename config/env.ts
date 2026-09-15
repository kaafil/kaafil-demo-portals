/**
 * The only module that reads `process.env`.
 *
 * ── THE API KEY BOUNDARY ───────────────────────────────────────────────────
 *
 * `KAAFIL_API_KEY` has NO `NEXT_PUBLIC_` prefix, and that is the whole
 * mechanism: Next inlines `NEXT_PUBLIC_*` into the browser bundle and nothing
 * else. Renaming this variable to `NEXT_PUBLIC_KAAFIL_API_KEY` would put a
 * partner credential into a JavaScript file served to the public, and a
 * partner key can mint a session for any manager in the tenant, read every
 * trip and erase a traveller. There is no amount of care elsewhere that
 * recovers from that.
 *
 * ── WHY THERE IS NO `server-only` HERE ─────────────────────────────────────
 *
 * There was, and it broke `pnpm seed:kaafil`: the `server-only` package
 * resolves to a module that THROWS anywhere outside a Next server bundle, and
 * the ingest CLI is plain Node under tsx. The guard belongs on the module that
 * holds a constructed client — `lib/kaafil-server.ts` — not on a pure function
 * that reads `process.env`, which the CLI legitimately needs too.
 *
 * Nothing is lost by moving it. The key exists only in `process.env`, and Next
 * inlines nothing but `NEXT_PUBLIC_*`, so `process.env.KAAFIL_API_KEY` in a
 * browser bundle is `undefined` — the value cannot reach a client bundle even
 * if this module somehow did.
 *
 * The browser never holds the key. It holds a short-lived, single-identity
 * session token that a route handler minted for it.
 */

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(
      `${name} is not set. Copy .env.example to .env and fill it in — there is no ` +
        'offline fallback, because a fallback would be a lie about what this app is doing.',
    );
  }
  return value.trim();
}

export interface KaafilEnv {
  apiKey: string;
  agencyRef: string;
  /** `test` for a `kf_test_` key, `live` for `kf_live_`. Derived, never configured. */
  plane: 'test' | 'live';
  /** Engine host override. Undocumented on purpose — engine-dev only. */
  baseUrlOverride: string | undefined;
}

export function readKaafilEnv(): KaafilEnv {
  const apiKey = required('KAAFIL_API_KEY');

  if (apiKey === 'kf_test_replace_me') {
    throw new Error('KAAFIL_API_KEY is still the placeholder from .env.example.');
  }

  // The plane is read off the key's own prefix rather than configured
  // separately. Two sources of truth for "am I on live?" is how somebody ends
  // up pointing a live key at a sandbox code path.
  let plane: 'test' | 'live';
  if (apiKey.startsWith('kf_test_')) {
    plane = 'test';
  } else if (apiKey.startsWith('kf_live_')) {
    plane = 'live';
  } else {
    throw new Error(
      `KAAFIL_API_KEY does not look like a Kaafil partner key — it starts "${apiKey.slice(0, 8)}". ` +
        'Keys begin kf_test_ or kf_live_.',
    );
  }

  return {
    apiKey,
    agencyRef: required('KAAFIL_AGENCY_REF'),
    plane,
    baseUrlOverride: process.env.KAAFIL_BASE_URL?.trim() || undefined,
  };
}
