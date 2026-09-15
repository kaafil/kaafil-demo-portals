'use server';

import type { Route } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getStore } from '@/lib/db';
import { cookieName, type Portal, portalForStaff } from '@/lib/session';

// Typed as `Route`, not `string`, so `typedRoutes` checks these against the
// routes that actually exist. A renamed page becomes a compile error here
// instead of a 404 somebody finds during a demo.
const HOME = { desk: '/admin/trips', manager: '/m' } as const satisfies Record<Portal, Route>;

/**
 * One sign-in for the whole demo.
 *
 * ── WHY ONE SCREEN BUT STILL TWO COOKIES ───────────────────────────────────
 *
 * The visitor picks a person and lands wherever that person works: a tour
 * leader in the field app, a desk executive at the office portal. Asking them
 * to choose a portal as well would be asking a question the roster already
 * answers.
 *
 * What does NOT change is the session itself. The two portals still keep
 * SEPARATE cookies, because that separation is the access control: it is what
 * decides which Kaafil persona a browser can obtain, and a shared session
 * would let somebody who signed in at the desk walk into `/m` and be handed a
 * manager token. Unifying the sign-in screen is a demo convenience; unifying
 * the session would be a security change, and they are not the same edit.
 */
export async function signIn(formData: FormData): Promise<void> {
  const staffId = String(formData.get('staffId') ?? '');

  // Checked server-side even though the form is a <select> over the roster. A
  // select is a suggestion, not a constraint — the request is just an HTTP
  // POST and anybody can send a different one.
  const match = getStore()
    .listStaff()
    .find((row) => row.staff.staffId === staffId && row.staff.active);

  if (match === undefined) {
    redirect('/login?error=unknown-staff');
  }

  const portal = portalForStaff(match.staff);

  (await cookies()).set(cookieName(portal), staffId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });

  redirect(HOME[portal]);
}

export async function signOut(portal: Portal): Promise<void> {
  (await cookies()).delete(cookieName(portal));
  redirect('/login');
}
