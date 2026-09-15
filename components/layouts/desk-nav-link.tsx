'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * A nav row that knows whether it is the current one.
 *
 * This is the only client component in the desk shell. Active state needs the
 * current path, `usePathname` is a hook, and a hook needs a client boundary —
 * so the boundary is drawn around one row rather than around the whole shell,
 * which keeps the rest of the chrome server-rendered.
 */
export function DeskNavLink({
  href,
  label,
  kaafil,
}: {
  href: Route;
  label: string;
  kaafil?: boolean;
}) {
  const pathname = usePathname();
  // `startsWith` so a detail route keeps its list item lit. Guarded by the
  // separator test, or `/admin/trip` would light up `/admin/trips`.
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center justify-between gap-2 border-l-2 px-4 py-1.5 text-md no-underline ${
        active
          ? 'border-l-nav-active-marker bg-nav-active-bg font-semibold text-nav-active-ink'
          : 'border-l-transparent text-sidebar-ink hover:bg-nav-hover-bg'
      }`}
      style={{ minHeight: 'var(--target-pointer)' }}
    >
      {label}
      {kaafil === true && (
        <span
          className="rounded-pill border border-border px-1.5 text-xs text-ink-faint"
          title="This section is rendered by the Kaafil UI Kit."
        >
          live
        </span>
      )}
    </Link>
  );
}
