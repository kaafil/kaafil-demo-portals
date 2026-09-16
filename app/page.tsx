import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Wordmark } from '@/components/layouts/wordmark';
import { BRAND } from '@/config/brand';

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
    <main className="mx-auto max-w-5xl px-4 py-6 md:py-8">
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

      <section className="mt-6 md:mt-8">
        <p className="text-xs tracking-wide text-ink-faint uppercase md:text-sm">
          A working integration, not a slide deck
        </p>
        <h1 className="mt-2 text-xl leading-tight font-semibold text-ink md:text-3xl">
          Kaafil, inside a travel CRM.
        </h1>
        <p className="mt-3 max-w-2xl text-base text-ink-soft md:text-lg">
          {BRAND.companyName} runs {tourPlural}. Kaafil runs a {tour} once people are actually on
          it. This site is both.
        </p>
        <p className="mt-2 max-w-2xl text-base text-ink-faint">
          Click on anything. There is no password — sign in as whoever you like. The office records
          are read-only; changes on the Kaafil side land in a demonstration tenant.
        </p>
      </section>

      <section className="mt-6 grid gap-3 md:mt-8 md:grid-cols-3 md:gap-5">
        <Surface
          kicker="Desk · office"
          title="The back office"
          href="/login#desk"
          action="Open the back office"
          footnote="Pick any name. No password."
        >
          Every {tour} on the books, traveller records, who is out on the ground right now. Kaafil
          sits inside a single {tour} as a tab — one more section of the software the {deskPlural}{' '}
          already had.
        </Surface>

        <Surface
          kicker="Field · phone"
          title={`The ${leader}'s app`}
          href="/login#field"
          action="Open the field app"
          footnote="Open it once online before you go offline — it caches what it has been shown."
        >
          A phone-shaped, installable app for whoever is travelling with the group. One-handed, and
          it keeps working in a valley with no signal.
        </Surface>

        {/* No button, and the copy says why. A dead-looking card with no
            explanation reads as a broken feature rather than as the access
            control it actually is. */}
        <Surface kicker="Traveller · a link you send" title="The page a family opens" recessed>
          One URL from WhatsApp — their itinerary, their rooming, their balance, and nothing else.
          <br />
          <br />
          <strong className="font-semibold text-ink">No button here, on purpose.</strong> A link is
          minted for one household and only the office can mint one, because it discloses a
          manifest. Open any {tour} →{' '}
          <strong className="font-semibold text-ink">On the ground</strong> → share.
        </Surface>
      </section>

      <section className="mt-6 md:mt-8">
        <h2 className="text-xs tracking-wide text-ink-faint uppercase md:text-sm">
          What you are looking at
        </h2>
        <dl className="mt-2">
          <Point title="One product, one brand">
            The embedded Kaafil screens read the host's own colours, radii and typeface — as
            references, not copies. Change the accent and they change in the same commit.
          </Point>
          <Point title="The key never reaches your browser">
            The partner API key stays on the server. The browser gets a short-lived session minted
            for one person — which is also what decides which of the three surfaces you see.
          </Point>
          <Point title="Seeded, not staged">
            Real-shaped Indian names, GSTINs and place names, across enough {tourPlural} that a
            list, a filter and a paginator have to actually hold up.
          </Point>
        </dl>
      </section>

      <footer className="mt-6 border-t border-border-faint pt-4 text-xs text-ink-faint md:mt-8">
        <p>A demonstration build. Every traveller, booking and payment in it is fabricated.</p>
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
      className={`flex flex-col rounded-card border border-border p-3 shadow-card md:p-4 ${
        recessed ? 'bg-surface-alt' : 'bg-surface'
      }`}
    >
      <p className="text-xs tracking-wide text-ink-faint uppercase">{kicker}</p>
      <h2 className="mt-1 text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-2 grow text-base text-ink-soft">{children}</p>

      {/* The footnote sits ABOVE the button so the button is the last element in
          every card, which is what makes the three of them line up: the cards
          are the same height, the footnotes are not, and anything after the
          button pushes it off the shared baseline by however many lines that
          card's caption happens to run to. */}
      {footnote === undefined ? null : <p className="mt-3 text-xs text-ink-faint">{footnote}</p>}

      {href === undefined || action === undefined ? null : (
        <Link
          href={href}
          className="mt-3 flex items-center justify-center rounded-control bg-accent px-3 text-base font-semibold text-accent-ink hover:bg-accent-hover"
          style={{ minHeight: 'var(--target-touch)' }}
        >
          {action}
        </Link>
      )}
    </section>
  );
}

function Point({ title, children }: { title: string; children: ReactNode }): ReactNode {
  return (
    <div className="border-t border-border-faint py-3">
      <dt className="text-md font-semibold text-ink">{title}</dt>
      <dd className="mt-1 max-w-3xl text-base text-ink-soft">{children}</dd>
    </div>
  );
}
