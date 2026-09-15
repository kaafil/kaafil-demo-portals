'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavIcon, type NavIconKey } from './nav-icon';

/**
 * A nav row that knows whether it is the current one.
 *
 * This is the only client component in the desk shell. Active state needs the
 * current path, `usePathname` is a hook, and a hook needs a client boundary —
 * so the boundary is drawn around one row rather than around the whole shell,
 * which keeps the rest of the chrome server-rendered.
 *
 * Every dimension below reads a token. A branch sets `--nav-row-height`,
 * `--nav-padding-x` and `--nav-icon-size` and gets its own nav rhythm without
 * opening this file.
 */
export function DeskNavLink({
  href,
  label,
  icon,
  badge,
}: {
  href: Route;
  label: string;
  icon: NavIconKey;
  badge?: string;
}) {
  const pathname = usePathname();
  // `startsWith` so a detail route keeps its list item lit. Guarded by the
  // separator test, or `/admin/trip` would light up `/admin/trips`.
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      style={{
        minHeight: 'var(--nav-row-height)',
        paddingInline: 'var(--nav-padding-x)',
        marginBlockEnd: 'var(--nav-row-gap)',
      }}
      className={`flex items-center gap-2 border-l-2 text-md no-underline ${
        active
          ? 'border-l-nav-active-marker bg-nav-active-bg font-semibold text-nav-active-ink'
          : 'border-l-transparent text-sidebar-ink hover:bg-nav-hover-bg'
      }`}
    >
      <NavIcon name={icon} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge !== undefined && (
        <span
          className="shrink-0 rounded-pill border border-border px-1.5 text-xs font-normal text-ink-faint"
          title="This section is rendered by the Kaafil UI Kit."
        >
          {badge}
        </span>
      )}
    </Link>
  );
}
