import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { signIn } from '@/app/_actions/auth';
import { BRAND } from '@/config/brand';
import { readStaff, rosterFor } from '@/lib/session';

export const metadata: Metadata = { title: 'Sign in' };

/**
 * The desk's sign-in: a picker over the seeded roster, no password store.
 *
 * Tour leaders are deliberately absent from this list. They sign in at
 * `/m/login`, which mints a different Kaafil persona from a different
 * endpoint — see `lib/session.ts` for why the two are kept apart.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if ((await readStaff('desk')) !== null) redirect('/admin/trips');

  const { error } = await searchParams;
  const roster = rosterFor('desk');

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <div className="rounded-card border border-border bg-surface p-6 shadow-card">
        <h1 className="text-2xl font-semibold text-ink">{BRAND.productName}</h1>
        <p className="mt-1 mb-5 text-md text-ink-faint">{BRAND.tagline}</p>

        {error === 'unknown-staff' && (
          <p className="mb-4 rounded-control border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger">
            That person is not on the desk roster.
          </p>
        )}

        <form action={signIn.bind(null, 'desk')}>
          <label
            htmlFor="staffId"
            className="mb-1 block text-xs font-semibold tracking-wide text-ink-soft uppercase"
          >
            Signed in as
          </label>
          <select
            id="staffId"
            name="staffId"
            defaultValue={roster[0]?.staffId ?? ''}
            className="w-full rounded-control border border-border bg-surface px-2 py-2 text-md text-ink"
          >
            {roster.map((staff) => (
              <option key={staff.staffId} value={staff.staffId}>
                {staff.fullName} — {staff.staffCode}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="mt-4 w-full rounded-control bg-accent px-3 py-2 text-md font-semibold text-accent-ink hover:bg-accent-hover"
            style={{ minHeight: 'var(--target-touch)' }}
          >
            Sign in
          </button>
        </form>

        <p className="mt-5 mb-0 border-t border-border-faint pt-4 text-sm text-ink-faint">
          Tour leaders sign in to the field app at{' '}
          <a href="/m/login" className="text-accent underline">
            /m
          </a>
          . It is a different portal with a different session, because it is issued a different
          Kaafil persona.
        </p>
      </div>
    </main>
  );
}
