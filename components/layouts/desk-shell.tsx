import type { Route } from 'next';
import type { ReactNode } from 'react';
import { BRAND, titleCase } from '@/config/brand';
import type { CrmStaff } from '@/fixtures/types';
import { DeskNavLink } from './desk-nav-link';
import type { NavIconKey } from './nav-icon';
import { SidebarUser } from './sidebar-user';
import { Wordmark } from './wordmark';

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
  items: readonly {
    href: Route;
    label: string;
    icon: NavIconKey;
    badge?: string;
  }[];
}[] = [
  {
    group: 'Operations',
    items: [
      { href: '/admin/trips', label: titleCase(BRAND.vocabulary.tourPlural), icon: 'trips' },
      { href: '/admin/travellers', label: 'Traveller records', icon: 'travellers' },
      { href: '/admin/operations', label: 'On the ground', icon: 'operations', badge: 'live' },
    ],
  },
  {
    group: 'Office',
    items: [{ href: '/admin/staff', label: 'Staff', icon: 'staff' }],
  },
];

export function DeskShell({ staff, children }: { staff: CrmStaff; children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header
        className="sticky top-0 flex items-center justify-between gap-4 border-b border-topbar-border bg-topbar-bg px-4 text-topbar-ink"
        style={{ height: 'var(--topbar-height)', zIndex: 'var(--z-sticky)' }}
      >
        <Wordmark href="/admin/trips" />
        <span className="text-sm text-ink-faint">{BRAND.companyName}</span>
      </header>

      <div className="flex items-stretch">
        <nav
          className="flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar-bg pt-3"
          style={{
            width: 'var(--sidebar-width)',
            minHeight: 'calc(100dvh - var(--topbar-height))',
          }}
        >
          {NAV.map((section) => (
            <div key={section.group} style={{ marginBlockEnd: 'var(--nav-group-gap)' }}>
              <div
                className="pb-1 text-xs font-semibold tracking-wide text-ink-faint uppercase"
                style={{ paddingInline: 'var(--nav-padding-x)' }}
              >
                {section.group}
              </div>
              {section.items.map((item) => (
                <DeskNavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  badge={item.badge}
                />
              ))}
            </div>
          ))}
          <SidebarUser staff={staff} portal="desk" />
        </nav>

        <main className="min-w-0 flex-1" style={{ padding: 'var(--content-padding)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
