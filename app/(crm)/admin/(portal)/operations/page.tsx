import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AgencyWorkspace } from '@/components/kaafil/agency-workspace';
import { PageHead } from '@/components/ui';
import { readStaff } from '@/lib/session';

export const metadata: Metadata = { title: 'On the ground' };

/**
 * Kaafil's agency workspace, mounted as one more section of the CRM.
 *
 * Note what this page does NOT do: it does not fetch a token. It reads who is
 * signed in and hands that ref to a client component, which asks
 * `POST /api/admin-session` for a credential of its own. Minting here would
 * serialise a live access token into the RSC payload — see
 * `components/kaafil/credential.ts`.
 *
 * `readStaff` has already run in the portal layout, so the redirect below is
 * unreachable in practice. It stays because this file reads the staff id and
 * passing `undefined` into a session mint should be impossible by
 * construction, not by trusting a parent.
 */
export default async function OperationsPage() {
  const staff = await readStaff('desk');
  if (staff === null) redirect('/login');

  return (
    <>
      <PageHead
        title="On the ground"
        subtitle="Rooming, seating, pickups, the cash float and the day-by-day as it really ran."
      />
      <AgencyWorkspace agencyAdminRef={staff.staffId} />
    </>
  );
}
