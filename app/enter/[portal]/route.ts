import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { BRAND } from '@/config/brand';
import { cookieName, type Portal, suggestedStaff } from '@/lib/session';

/**
 * Sign in as whoever has the most to show, and go straight there.
 *
 * ── WHAT THIS IS FOR ───────────────────────────────────────────────────────
 *
 * The landing page's two calls to action point here when `BRAND.landingEntry`
 * is `'direct'`. A stranger who followed a link does not recognise any of the
 * twenty names on the roster, so asking them to choose one is friction with no
 * payoff — see `suggestedStaff` for who they become and why.
 *
 * ── WHY A ROUTE HANDLER AND NOT A SERVER ACTION ────────────────────────────
 *
 * `app/page.tsx` renders with NO database read, deliberately, so that it is
 * the one screen that still works before `pnpm seed` has run. Choosing a
 * person needs the store, so the choice cannot happen on that page — it has to
 * happen after the click. A plain link to a handler keeps the landing page
 * static and keeps the store read on this side of it.
 *
 * ── IT GRANTS NOTHING THE ROSTER DOES NOT ──────────────────────────────────
 *
 * Worth saying plainly, because a GET that sets a session cookie deserves a
 * second look. `/login` is a passwordless picker: anybody can already become
 * any of these people in one click, by design, and this handler picks one of
 * them for you. It is a shortcut through a door that was never locked, not a
 * new door. A real CRM replaces the picker with its own login and deletes this
 * along with it — which is why the session shape below is exactly the one
 * `app/_actions/auth.ts` sets, rather than a second, subtly different one.
 */
const HOME = { desk: '/admin/trips', manager: '/m' } as const satisfies Record<Portal, string>;

/** The landing page says `desk` and `field`; the session layer says `manager`. */
const PORTALS: Record<string, Portal> = { desk: 'desk', field: 'manager' };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ portal: string }> },
): Promise<Response> {
  const { portal: raw } = await params;
  const portal = PORTALS[raw];

  // An unknown segment, or a brand that did not ask for this, falls back to the
  // picker rather than erroring. The picker is always a correct answer to "who
  // do you want to be", so there is nothing to report.
  if (portal === undefined || BRAND.landingEntry !== 'direct') {
    redirect('/login');
  }

  const staff = suggestedStaff(portal);
  if (staff === null) {
    // A roster with nobody in this portal. Genuinely possible on a fixture
    // somebody has trimmed, and the picker will say so better than we can.
    redirect('/login');
  }

  (await cookies()).set(cookieName(portal), staff.staffId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });

  redirect(HOME[portal]);
}
