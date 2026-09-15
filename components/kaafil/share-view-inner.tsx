'use client';

import { KaafilUIKitProvider } from 'kaafil-react-uikit/core';
import { KaafilShareView } from 'kaafil-react-uikit/traveller';
import { shareBrand } from './brand';

/**
 * The traveller surface: a share link, opened by somebody with no account.
 *
 * ── THE CREDENTIAL IS THE WHOLE DIFFERENCE ─────────────────────────────────
 *
 * `shareToken` alone. No access token, no refresh token, no `agencyRef` — and
 * the provider's credential type is a discriminated union, so passing a
 * `shareToken` beside an `agencyRef` is a compile error rather than something
 * the shell has to defend against at runtime.
 *
 * That asymmetry is the persona model in one line. A bare share token can only
 * ever produce the traveller surface, which is exactly what makes it safe to
 * send to somebody's mother over WhatsApp.
 *
 * ── AND NO RESOLVER ────────────────────────────────────────────────────────
 *
 * The other two surfaces fetch a credential, because a staff session has to be
 * minted against a signed-in identity. Here the credential is already in the
 * URL: the token IS the authentication. So it is passed as a literal, there is
 * no `/api` round trip, and the page works for someone who has never heard of
 * Sharma Travels.
 *
 * ── headStrategy="own-page" ────────────────────────────────────────────────
 *
 * The opposite call from the staff surfaces. Those are embedded in pages the
 * CRM owns, so they must not touch the document head. This page IS the whole
 * document, so the kit is allowed to set the title and favicon from the share
 * token's own metadata — which is what makes the WhatsApp preview say
 * something useful instead of "Sharma Travels Admin".
 */
export default function ShareViewInner({ token }: { token: string }) {
  return (
    <KaafilUIKitProvider shareToken={token} locale="en-IN" brand={shareBrand()}>
      <KaafilShareView token={token} headStrategy="own-page" />
    </KaafilUIKitProvider>
  );
}
