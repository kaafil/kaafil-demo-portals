import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { signIn } from '@/app/_actions/auth';
import { BRAND } from '@/config/brand';
import { readStaff, rosterFor } from '@/lib/session';

export const metadata: Metadata = { title: 'Sign in' };

/**
 * The field app's sign-in. Only tour leaders appear here.
 *
 * This is a different portal from `/login`, with a different cookie and a
 * different roster, and that separation is what decides which Kaafil persona
 * the browser can obtain: signing in here leads to `POST /api/session`
 * (a MANAGER token); signing in at `/login` leads to `POST /api/admin-session`
 * (an AGENCY ADMIN token). The UI Kit has no persona prop — the credential is
 * the persona — so keeping the two sign-ins apart is the access control.
 */
export default async function ManagerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if ((await readStaff('manager')) !== null) redirect('/m');

  const { error } = await searchParams;
  const roster = rosterFor('manager');

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <h1 className="m-0 text-2xl leading-tight font-semibold text-ink">{BRAND.shortName} Field</h1>
      <p className="mt-1 mb-6 text-md text-ink-faint">
        For tour leaders. Works with no signal once you are signed in.
      </p>

      {error === 'unknown-staff' && (
        <p className="mb-4 rounded-control border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger">
          That person is not on the leader roster.
        </p>
      )}

      <form action={signIn.bind(null, 'manager')}>
        <label
          htmlFor="staffId"
          className="mb-1 block text-xs font-semibold tracking-wide text-ink-soft uppercase"
        >
          Who are you?
        </label>
        <select
          id="staffId"
          name="staffId"
          defaultValue={roster[0]?.staffId ?? ''}
          className="w-full rounded-control border border-border bg-surface px-2 text-md text-ink"
          style={{ minHeight: 'var(--target-touch)' }}
        >
          {roster.map((staff) => (
            <option key={staff.staffId} value={staff.staffId}>
              {staff.fullName} — {staff.basedIn}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="mt-4 w-full rounded-control bg-accent px-3 text-md font-semibold text-accent-ink"
          style={{ minHeight: 'var(--target-touch)' }}
        >
          Sign in
        </button>
      </form>

      <p className="mt-8 mb-0 text-sm text-ink-faint">
        Desk staff sign in at{' '}
        <a href="/login" className="text-accent underline">
          the office portal
        </a>
        .
      </p>
    </main>
  );
}
