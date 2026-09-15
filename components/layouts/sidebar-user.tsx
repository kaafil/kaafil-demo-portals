import { signOut } from '@/app/_actions/auth';
import type { CrmStaff } from '@/fixtures/types';
import { initials } from '@/lib/format';
import type { Portal } from '@/lib/session';

/**
 * Who is signed in, pinned to the foot of the sidebar.
 *
 * ── WHY IT IS HERE AND NOT IN THE TOP BAR ──────────────────────────────────
 *
 * Because that is where a back-office CRM puts it, and the first prospect is
 * the evidence: Travyan's console keeps the whole identity block — avatar,
 * name, email — at the bottom of the nav, leaving the top bar for the page's
 * own title. Following that puts one more thing in the "already looks like
 * theirs" column before a branch changes anything.
 *
 * The avatar is initials on the accent, not a photo. There are no photos in
 * this fixture and there would be none in most partner CRMs either; initials
 * are what a real one falls back to, so they are what `main` ships.
 */
export function SidebarUser({ staff, portal }: { staff: CrmStaff; portal: Portal }) {
  return (
    <div
      className="mt-auto flex items-center gap-2 border-t border-sidebar-border"
      style={{
        paddingInline: 'var(--nav-padding-x)',
        paddingBlock: 'var(--space-3)',
      }}
    >
      <span
        aria-hidden
        className="flex shrink-0 items-center justify-center rounded-pill bg-accent text-xs font-semibold text-accent-ink"
        style={{ width: 'var(--target-pointer)', height: 'var(--target-pointer)' }}
      >
        {initials(staff.fullName)}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-sm font-semibold text-ink">{staff.fullName}</span>
        <span className="block truncate text-xs text-ink-faint">{staff.loginEmail}</span>
      </span>
      <form action={signOut.bind(null, portal)}>
        <button
          type="submit"
          title="Sign out"
          className="shrink-0 rounded-control px-1.5 py-1 text-xs text-ink-faint hover:bg-nav-hover-bg hover:text-ink"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
