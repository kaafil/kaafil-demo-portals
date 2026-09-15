/**
 * PHASE 3 — this is where `KaafilShareView` mounts.
 *
 *   'use client'
 *   import { KaafilUIKitProvider } from 'kaafil-react-uikit/core';
 *   import { KaafilShareView } from 'kaafil-react-uikit/traveller';
 *
 *   <KaafilUIKitProvider shareToken={token}>
 *     <KaafilShareView token={token} headStrategy="own-page" />
 *   </KaafilUIKitProvider>
 *
 * Note the provider takes `shareToken` ALONE — no access token, no refresh
 * token, no agencyRef. That asymmetry is the persona model: the shape of the
 * credential decides what the kit renders, and a bare share token can only
 * ever produce the traveller surface.
 *
 * Which sections the traveller may see is the SERVER's answer, returned as a
 * flag per section when the link is created. A host can narrow that set; it
 * can never widen it. So a section missing from a share page is a token
 * configuration question, not a UI one.
 */
export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="m-0 text-2xl leading-tight font-semibold text-ink">Your trip</h1>
      <p className="mt-2 text-md text-ink-soft">
        This page is not wired up yet. <code className="tabular">KaafilShareView</code> from{' '}
        <code className="tabular">kaafil-react-uikit/traveller</code> mounts here.
      </p>
      <p className="tabular mt-6 rounded-card border border-border bg-surface-alt px-3 py-2 text-sm break-all text-ink-faint">
        token: {token}
      </p>
    </main>
  );
}
