import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Wordmark } from '@/components/layouts/wordmark';
import { BRAND, titleCase } from '@/config/brand';

/**
 * The first screen a stranger sees.
 *
 * ── WHY THIS IS NOT A REDIRECT ANY MORE ────────────────────────────────────
 *
 * It used to be `redirect('/admin/trips')`, which bounced off the desk gate
 * into `/login` — so the first thing a visitor met was a list of twenty Indian
 * names with no explanation of what the software was or which name to press.
 * That is a fine front door for a partner who was sent here to read the code.
 * It is a bad one for the link being handed to people who have never heard of
 * any of this.
 *
 * ── THIS PAGE READS NOTHING FROM THE STORE, DELIBERATELY ───────────────────
 *
 * The instinct is to put "56 departures, 728 travellers" on it. Three reasons
 * not to:
 *
 *   It has to render when nothing else can. `openStore()` throws if
 *   `crm.sqlite` is absent, and every other route in this app either reads the
 *   store or redirects to one that does — so before `pnpm seed` has run, the
 *   whole app is a 500. A landing page that dies with it means a stranger's
 *   first impression of the brand is a stack trace.
 *
 *   It keeps `/` fully static. No `cookies()`, no `fs`, no `better-sqlite3`,
 *   so Next prerenders it and serves it from the cache.
 *
 *   A number pulled from the fixture is a number that dates the copy the moment
 *   the fixture changes.
 *
 * ── AND IT IS `main`'s PAGE, NOT A BRANCH'S ────────────────────────────────
 *
 * Every proper noun comes from `config/brand.ts`. The only names written here
 * are Kaafil's — the product being demonstrated, constant across every skin —
 * and WhatsApp. A client branch re-skins this screen entirely through the files
 * it already owns and never opens this one.
 */

export const metadata: Metadata = {
  // The ONE indexable URL. `app/layout.tsx` sets `index: false` across the
  // whole tree and this overrides it here and nowhere else, so the desk, the
  // field app and — above all — the share links stay out of search results.
  robots: { index: true, follow: true },
  description: `A working ${BRAND.companyName} back office with Kaafil built into it, in three places.`,
};

export default function Root(): ReactNode {
  const { tour, tourPlural, leader, deskPlural } = BRAND.vocabulary;

  return (
    <main className="mx-auto max-w-5xl px-4 py-7 md:py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Wordmark />
        <a
          href="https://kaafil.in"
          target="_blank"
          rel="noreferrer"
          className="text-sm text-ink-faint hover:text-ink"
        >
          Built on Kaafil ↗
        </a>
      </header>

      <section className="mt-7 md:mt-8">
        <p className="text-sm tracking-wide text-ink-faint uppercase">
          A working integration, not a slide deck
        </p>
        <h1 className="mt-2 max-w-3xl text-2xl leading-tight font-semibold text-ink md:text-3xl">
          Kaafil, inside a travel CRM.
        </h1>
        <p className="mt-4 max-w-2xl text-md text-ink-soft md:text-lg">
          {BRAND.companyName} runs {tourPlural} — selling them, filling them, collecting for them.
          Kaafil is the part that runs a {tour} once people are actually on it. This site is both:
          the operator&rsquo;s own back office, with Kaafil built into it in three places.
        </p>
        <p className="mt-3 max-w-2xl text-base text-ink-faint">
          You are welcome to click on everything. There is no password — sign in as anyone on the
          roster and look wherever you like. The office records are read-only; anything you change
          on the Kaafil side lands in a demonstration tenant that holds nothing real.
        </p>
      </section>

      <section className="mt-7 grid gap-4 md:grid-cols-3 md:gap-5">
        <Surface
          kicker="Desk · office"
          title="The back office"
          href="/login#desk"
          action="Open the back office"
          footnote="Pick any name from the list. There is no password."
        >
          Where the {deskPlural} work: every {tour} on the books, traveller records, who is out on
          the ground right now. Kaafil lives inside a single {tour}, as a tab called &ldquo;On the
          ground&rdquo; — one more section of the software they already had, not a link to somewhere
          else.
        </Surface>

        <Surface
          kicker="Field · phone"
          title={`The ${leader}'s app`}
          href="/login#field"
          action="Open the field app"
          footnote="Best seen on a phone. Open it once online before you turn the signal off — the app caches what it has been shown, not what it has not."
        >
          A phone-shaped, installable app for the person travelling with the group — one-handed,
          every control inside thumb reach. It is offline-first: open it once with signal and it
          keeps working in a valley without any.
        </Surface>

        {/* No button, and the copy says why. A share link is a private document,
            so there is nothing honest to put here — and a dead-looking card with
            no explanation would read as a broken feature rather than as the
            access control it actually is. */}
        <Surface kicker="Traveller · a link you send" title="The page a family opens" recessed>
          No account and no app. A traveller — or their mother — opens one URL from WhatsApp and
          sees their own itinerary, their rooming and their balance, and nothing else on the tenant.
          <br />
          <br />
          <strong className="font-semibold text-ink">
            There is no button here, and that is the point.
          </strong>{' '}
          A traveller link is minted for one {tour} and one household, and only the office can mint
          one, because handing out a link discloses a manifest — names, phone numbers, who is
          rooming with whom. To see the page: open the back office, go into any {tour}, choose{' '}
          <strong className="font-semibold text-ink">On the ground</strong>, and use the share
          action there.
        </Surface>
      </section>

      <section className="mt-7 md:mt-8">
        <h2 className="text-sm tracking-wide text-ink-faint uppercase">What you are looking at</h2>
        <dl className="mt-3">
          <Point title="One product, one brand">
            The embedded Kaafil screens read the same colours, radii, spacing and typeface as the
            pages around them — as references, not as copies. Change the operator&rsquo;s accent
            colour and the embedded surfaces change in the same commit. Put the two side by side and
            there is no seam to find.
          </Point>
          <Point title="The key never reaches your browser">
            The partner API key is held on the server and nowhere else. What the browser gets is a
            short-lived session minted for one person, by one endpoint, for one job — which is also
            what decides whether you are looking at the office, the field, or a traveller&rsquo;s
            page.
          </Point>
          <Point title="Seeded, not staged">
            The book of business is generated from fixtures: real-shaped Indian names, GSTINs, E.164
            numbers and long place names, across enough {tourPlural} that a list, a filter and a
            paginator have to actually hold up. Six rows is a fixture. This is meant to look like a
            Tuesday.
          </Point>
        </dl>
      </section>

      <footer className="mt-7 border-t border-border-faint pt-4 text-sm text-ink-faint md:mt-8">
        <p>
          A demonstration build. Every traveller, {titleCase(tour).toLowerCase()}, booking and
          payment in it is fabricated — any resemblance to a real person is an accident of the
          generator.
        </p>
      </footer>
    </main>
  );
}

function Surface({
  kicker,
  title,
  href,
  action,
  footnote,
  recessed = false,
  children,
}: {
  kicker: string;
  title: string;
  href?: '/login#desk' | '/login#field';
  action?: string;
  footnote?: string;
  recessed?: boolean;
  children: ReactNode;
}): ReactNode {
  return (
    <section
      className={`flex flex-col rounded-card border border-border p-4 shadow-card ${
        recessed ? 'bg-surface-alt' : 'bg-surface'
      }`}
    >
      <p className="text-xs tracking-wide text-ink-faint uppercase">{kicker}</p>
      <h2 className="mt-1 text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-2 grow text-base text-ink-soft">{children}</p>

      {href === undefined || action === undefined ? null : (
        <Link
          href={href}
          className="mt-4 flex items-center justify-center rounded-control bg-accent px-3 text-base font-semibold text-accent-ink hover:bg-accent-hover"
          style={{ minHeight: 'var(--target-touch)' }}
        >
          {action}
        </Link>
      )}

      {footnote === undefined ? null : <p className="mt-2 text-xs text-ink-faint">{footnote}</p>}
    </section>
  );
}

function Point({ title, children }: { title: string; children: ReactNode }): ReactNode {
  return (
    <div className="border-t border-border-faint py-4">
      <dt className="text-md font-semibold text-ink">{title}</dt>
      <dd className="mt-1 max-w-3xl text-base text-ink-soft">{children}</dd>
    </div>
  );
}
