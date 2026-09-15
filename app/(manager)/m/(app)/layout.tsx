import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { ManagerShell } from '@/components/layouts/manager-shell';
import { readStaff } from '@/lib/session';

/** The gate, at the shallowest layout under which every route is authenticated. */
export default async function ManagerAppLayout({ children }: { children: ReactNode }) {
  const staff = await readStaff('manager');
  if (staff === null) redirect('/m/login');

  return <ManagerShell staff={staff}>{children}</ManagerShell>;
}
