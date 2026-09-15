import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

/**
 * Where Kaafil hands control back to the CRM.
 *
 * ── WHY THESE ARE STUBS AND SAY SO ─────────────────────────────────────────
 *
 * Two of `KaafilManagerApp`'s four required callbacks land here — the two that
 * carry a HOST record id. `onCollectFromGroup` names a booking group and
 * `onVendorSelect` names a vendor: the booking, the balance it leaves and the
 * vendor master all belong to whoever was already keeping them, which here is
 * Sharma Travels.
 *
 * The other two do not land here, and that correction is worth recording. They
 * were routed here first, and tapping one showed the mistake immediately:
 * Kaafil has its own expense form, because the float a leader carries and what
 * they spent it on is Kaafil's to track. Sending that tap to a host stub threw
 * away the better screen. They now jump to Kaafil's Money tab instead.
 *
 * These two screens are deliberately honest about being unfinished rather than
 * dressed up as working forms. Sharma Travels is a fixture: it has a payments
 * LEDGER but no write path, and no vendor table at all. A fake form that
 * pretended to save would make the demo look more complete and teach a partner
 * engineer the wrong thing — the interesting fact is WHERE the handoff
 * happens, not what the form looks like afterwards.
 *
 * In a real integration this route is the CRM's existing screen, and the only
 * work is routing to it.
 */

const ACTIONS = {
  expense: {
    title: 'Log an expense',
    crmOwns: null,
    note:
      'Sharma Travels does not keep on-trip expenses \u2014 Kaafil does, because it is ' +
      'tracking the float this would be drawn against. Its form is under Trip \u2192 Money, ' +
      'and it takes a category, a payment source and a receipt photo. A CRM that DID keep ' +
      'expenses would point this callback at its own screen instead.',
  },
  collect: {
    title: 'Collect a payment',
    crmOwns: 'the receipt, the booking it settles, and the balance it leaves' as string | null,
    note: 'The desk already shows these under a departure’s Payments tab.',
  },
  vendor: {
    title: 'Open a vendor',
    crmOwns: 'the vendor master, their rates, and the bills outstanding against them',
    note: 'Sharma Travels has no vendor table in this fixture, which is why this one is emptiest.',
  },
} as const;

type Action = keyof typeof ACTIONS;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ action: string }>;
}): Promise<Metadata> {
  const { action } = await params;
  return { title: ACTIONS[action as Action]?.title ?? 'Sharma Travels' };
}

export default async function HostHandoffPage({
  params,
  searchParams,
}: {
  params: Promise<{ action: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { action } = await params;
  const { ref } = await searchParams;

  const entry = ACTIONS[action as Action];
  if (entry === undefined) notFound();

  return (
    <div className="rounded-card border border-border bg-surface p-4 shadow-card">
      <p className="m-0 text-xs font-semibold tracking-wide text-ink-faint uppercase">
        Sharma Travels &middot; not Kaafil
      </p>
      <h1 className="mt-1 text-xl font-semibold text-ink">{entry.title}</h1>

      {entry.crmOwns === null ? (
        <p className="mt-3 text-base text-ink-soft">
          Kaafil handed control back here, and the honest answer is that this one is not ours.
        </p>
      ) : (
        <p className="mt-3 text-base text-ink-soft">
          Kaafil handed control back here. This screen is the CRM&rsquo;s, and so is {entry.crmOwns}
          .
        </p>
      )}
      <p className="mt-2 text-base text-ink-faint">{entry.note}</p>

      {ref !== undefined && (
        <p className="tabular mt-3 rounded-control border border-border-faint bg-surface-alt px-2 py-1.5 text-sm break-all text-ink-soft">
          Kaafil passed: <strong className="text-ink">{ref}</strong>
        </p>
      )}

      <Link
        href="/m"
        className="mt-5 block rounded-control bg-accent px-3 text-center text-md leading-[2.75rem] font-semibold text-accent-ink no-underline"
        style={{ minHeight: 'var(--target-touch)' }}
      >
        Back to the trip
      </Link>
    </div>
  );
}
