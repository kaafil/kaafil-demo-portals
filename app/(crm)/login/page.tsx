import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { signIn } from '@/app/_actions/auth';
import { BRAND } from '@/config/brand';
import type { CrmStaff } from '@/fixtures/types';
import { initials } from '@/lib/format';
import { portalForStaff, readStaff, rosterAll } from '@/lib/session';

export const metadata: Metadata = { title: 'Sign in' };

/**
 * The demo's one sign-in: pick a person, land where that person works.
 *
 * ── WHY A LIST OF PEOPLE AND NOT A <select> ────────────────────────────────
 *
 * It was a native select with two optgroups, and on a real machine the OS drew
 * a twenty-row menu tall enough to overflow the window — the whole roster
 * covering the page, which is a poor first thing to happen in a demo. Native
 * selects are also the one control a design system cannot restyle, so the
 * token layer could not have rescued it either.
 *
 * A list of buttons in one form fixes both. Each person is a submit button
 * carrying their own `staffId`, so signing in is one tap rather than
 * open-scroll-pick-confirm, and every row is ordinary markup the tokens reach.
 * No JavaScript: it is a form with several submit buttons, which HTML has
 * always supported.
 *
 * ── WHY THE TWO GROUPS ARE VISIBLY DIFFERENT ───────────────────────────────
 *
 * Because the split is the point. A visitor who picks Rohit Bhandari and
 * arrives in a phone-shaped field app, then picks Meera Sharma and arrives at
 * a dense desk console, has understood the product's central claim before
 * anyone explains it.
 *
 * There is no password store and never will be — this is a picker over the
 * seeded roster. A real CRM replaces this screen with its own login and keeps
 * everything downstream; the one thing it must add is the check this file
 * cannot make, which lives in `app/api/session/route.ts`.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Already signed in somewhere? Go there rather than asking again.
  if ((await readStaff('desk')) !== null) redirect('/admin/trips');
  if ((await readStaff('manager')) !== null) redirect('/m');

  const { error } = await searchParams;
  const roster = rosterAll();
  const leaders = roster.filter((s) => portalForStaff(s) === 'manager');
  const deskStaff = roster.filter((s) => portalForStaff(s) === 'desk');

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-8">
      <h1 className="text-2xl font-semibold text-ink">{BRAND.productName}</h1>
      <p className="mt-1 mb-5 text-md text-ink-faint">{BRAND.tagline}</p>

      {error === 'unknown-staff' && (
        <p className="mb-4 rounded-control border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger">
          That person is not on the roster.
        </p>
      )}

      <form action={signIn} className="grid gap-4 md:grid-cols-2">
        <Group
          title="Tour leaders"
          blurb="The field app — a phone, offline-first."
          people={leaders}
        />
        <Group
          title="Desk executives"
          blurb="The office portal — departures and collections."
          people={deskStaff}
        />
      </form>

      <p className="mt-6 text-sm text-ink-faint">
        Where you land follows from the job, not from a second question. The two are different
        products and are issued different Kaafil personas — which is decided by the endpoint that
        mints the session, never by a prop.
      </p>
    </main>
  );
}

function Group({
  title,
  blurb,
  people,
}: {
  title: string;
  blurb: string;
  people: readonly CrmStaff[];
}) {
  return (
    <section className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
      <header className="border-b border-border-faint bg-surface-alt px-3 py-2">
        <h2 className="text-sm font-semibold tracking-wide text-ink-soft uppercase">{title}</h2>
        <p className="mt-0.5 text-xs text-ink-faint">{blurb}</p>
      </header>
      <ul className="m-0 max-h-80 list-none overflow-y-auto p-0">
        {people.map((staff) => (
          <li key={staff.staffId}>
            {/*
              One form, many submit buttons, each carrying its own value. Plain
              HTML, no client component, and one tap instead of four.
            */}
            <button
              type="submit"
              name="staffId"
              value={staff.staffId}
              className="flex w-full items-center gap-2 border-b border-border-faint px-3 py-2 text-left hover:bg-nav-hover-bg"
              style={{ minHeight: 'var(--target-touch)' }}
            >
              <span
                aria-hidden
                className="flex shrink-0 items-center justify-center rounded-pill bg-accent-soft text-xs font-semibold text-accent"
                style={{ width: 'var(--target-pointer)', height: 'var(--target-pointer)' }}
              >
                {initials(staff.fullName)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-base font-semibold text-ink">
                  {staff.fullName}
                </span>
                <span className="block truncate text-xs text-ink-faint">
                  {staff.role === 'TOUR_LEADER' ? staff.basedIn : staff.staffCode}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
