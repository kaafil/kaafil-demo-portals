'use server';

import type { Route } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getStore } from '@/lib/db';
import { cookieName, PORTAL_ROLE, type Portal } from '@/lib/session';

// Typed as `Route`, not `string`, so `typedRoutes` checks these against the
// routes that actually exist. A renamed page becomes a compile error here
// instead of a 404 somebody finds during a demo.
const HOME = { desk: '/admin/trips', manager: '/m' } as const satisfies Record<Portal, Route>;
const SIGN_IN = { desk: '/login', manager: '/m/login' } as const satisfies Record<Portal, Route>;

export async function signIn(portal: Portal, formData: FormData): Promise<void> {
  const staffId = String(formData.get('staffId') ?? '');

  // Checked server-side even though the form is a <select> over the roster.
  // A select is a suggestion, not a constraint — the request is just an HTTP
  // POST and anybody can send a different one.
  const match = getStore()
    .listStaff()
    .find((row) => row.staff.staffId === staffId && row.staff.role === PORTAL_ROLE[portal]);

  if (match === undefined) {
    redirect(`${SIGN_IN[portal]}?error=unknown-staff` as Route);
  }

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
  redirect(SIGN_IN[portal]);
}
