import { redirect } from 'next/navigation';
import { ManagerApp } from '@/components/kaafil/manager-app';
import { readStaff } from '@/lib/session';

/**
 * The field app. Kaafil fills this screen.
 *
 * Unlike the desk, where Kaafil is one tab of a page the CRM owns, here the
 * surface IS the product: a tour leader opens `/m` to run today's trip and
 * nothing else. That asymmetry is the point of keeping the two portals apart
 * — the same kit, mounted two completely different ways, because a desk
 * executive and somebody standing at a bus door are not two densities of one
 * user.
 */
export default async function ManagerHome() {
  const staff = await readStaff('manager');
  if (staff === null) redirect('/m/login');

  return <ManagerApp managerRef={staff.staffId} />;
}
