import type { ReactNode } from 'react';
import { signOut } from '@/app/_actions/auth';
import { BRAND } from '@/config/brand';
import type { CrmStaff } from '@/fixtures/types';

/**
 * The field app's chrome: a thin header and a bottom tab bar.
 *
 * ── NOT A RESPONSIVE VERSION OF THE DESK ───────────────────────────────────
 *
 * There is deliberately no shared shell component between this and
 * `desk-shell.tsx`. A sidebar that collapses into a hamburger below 768px is
 * how you get an app that is tolerable on a phone; a tour leader standing at a
 * bus door mid-boarding needs one that is *good* on a phone, one-handed, with
 * every primary action inside thumb reach. Those are two products.
 *
 * Every control here clears `--target-touch`. The bar sits above the home
 * indicator courtesy of `viewportFit: 'cover'` in the group layout plus the
 * safe-area inset below.
 */
export function ManagerShell({ staff, children }: { staff: CrmStaff; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header
        className="flex shrink-0 items-center justify-between gap-3 border-b border-topbar-border bg-topbar-bg px-3 text-topbar-ink"
        style={{ height: 'var(--topbar-height)' }}
      >
        <span className="font-semibold">{BRAND.shortName} Field</span>
        <div className="flex items-center gap-2 text-sm">
          <span className="opacity-90">{staff.fullName}</span>
          <form action={signOut.bind(null, 'manager')}>
            <button
              type="submit"
              className="rounded-control border border-current/30 px-2 py-1 text-sm text-topbar-ink"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto p-3">{children}</main>

      {/*
        A placeholder bar. Once `KaafilManagerApp` mounts it brings its OWN tab
        bar — Now / Trip / Money / Me — and this one goes away rather than
        sitting above it. Two tab bars is the single most common way an
        embedded mobile surface ends up looking bolted on.
      */}
      <nav
        className="flex shrink-0 items-center justify-around border-t border-sidebar-border bg-sidebar-bg"
        style={{
          height: 'var(--tabbar-height)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          zIndex: 'var(--z-sticky)',
        }}
      >
        <span className="text-sm text-ink-faint">Kaafil&rsquo;s own tab bar mounts here</span>
      </nav>
    </div>
  );
}
