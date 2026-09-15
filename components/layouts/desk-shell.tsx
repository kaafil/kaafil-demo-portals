import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { signOut } from '@/app/_actions/auth';
import { BRAND, titleCase } from '@/config/brand';
import type { CrmStaff } from '@/fixtures/types';
import { DeskNavLink } from './desk-nav-link';

/**
 * The desk portal's chrome: masthead plus a persistent left nav.
 *
 * ── WHY THIS IS A SEPARATE SHELL FROM THE MANAGER'S ────────────────────────
 *
 * A desk executive is at a desk, on a large screen, with a mouse, for a whole
 * shift. A tour leader is standing at a bus door on a phone. Those are not two
 * densities of the same layout, they are two products, and the fastest way to
 * make a demo feel wrong is to serve a responsive version of one as the other.
 * So: sidebar here, bottom tab bar there, and no shared shell component
 * between them.
 *
 * ── THE ONE NAV ITEM THAT IS NOT THE CRM'S ─────────────────────────────────
 *
 * "Operations" mounts Kaafil. Everything above it is Sharma Travels' own
 * software, reading Sharma Travels' own database. It sits in the same nav, in
 * the same chrome, under the same brand, because that is the entire claim
 * being made: the embedded surface is not a tab to somewhere else, it is one
 * more section of the product the user already had.
 */

const NAV: readonly {
  group: string;
  items: readonly { href: Route; label: string; kaafil?: boolean }[];
}[] = [
  {
    group: 'Operations',
    items: [
      { href: '/admin/trips', label: titleCase(BRAND.vocabulary.tourPlural) },
      { href: '/admin/travellers', label: 'Traveller records' },
      { href: '/admin/operations', label: 'On the ground', kaafil: true },
    ],
  },
  {
    group: 'Office',
    items: [{ href: '/admin/staff', label: 'Staff' }],
  },
];

export function DeskShell({ staff, children }: { staff: CrmStaff; children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header
        className="sticky top-0 flex items-center justify-between gap-4 bg-accent px-4 text-accent-ink"
        style={{ height: 'var(--topbar-height)', zIndex: 'var(--z-sticky)' }}
      >
        <Link
          href="/admin/trips"
          className="font-semibold tracking-wide text-accent-ink no-underline"
        >
          {BRAND.productName}
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="opacity-90">
            {staff.fullName} · {staff.staffCode}
          </span>
          <form action={signOut.bind(null, 'desk')}>
            <button
              type="submit"
              className="rounded-control border border-accent-ink/40 px-2 py-1 text-sm text-accent-ink hover:bg-accent-hover"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="flex items-stretch">
        <nav
          className="shrink-0 border-r border-border bg-surface py-3"
          style={{
            width: 'var(--sidebar-width)',
            minHeight: 'calc(100dvh - var(--topbar-height))',
          }}
        >
          {NAV.map((section) => (
            <div key={section.group} className="mb-4">
              <div className="px-4 pb-1 text-xs font-semibold tracking-wide text-ink-faint uppercase">
                {section.group}
              </div>
              {section.items.map((item) => (
                <DeskNavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  kaafil={item.kaafil}
                />
              ))}
            </div>
          ))}
        </nav>

        <main className="min-w-0 flex-1 p-4">{children}</main>
      </div>
    </div>
  );
}
