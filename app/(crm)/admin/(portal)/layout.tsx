import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { DeskShell } from '@/components/layouts/desk-shell';
import { readStaff } from '@/lib/session';

/**
 * The gate, at the shallowest layout under which every route is gated.
 *
 * `readStaff('desk')` returns null for no cookie, an unknown staff id, or a
 * staff id belonging to somebody who is not a desk executive — so a tour
 * leader who somehow arrives here is sent to sign in rather than shown a desk
 * they have no business seeing.
 */
export default async function DeskPortalLayout({ children }: { children: ReactNode }) {
  const staff = await readStaff('desk');
  if (staff === null) redirect('/login');

  return <DeskShell staff={staff}>{children}</DeskShell>;
}
