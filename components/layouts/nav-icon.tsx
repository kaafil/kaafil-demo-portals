// `Map` is aliased: lucide exports one, and an unaliased import shadows the
// global `Map` for this whole module. Nothing here uses the global today,
// which is exactly the kind of thing that stops being true quietly.
import { CircleDot, Compass, type LucideIcon, Map as MapIcon, Users, Wallet } from 'lucide-react';

/**
 * The nav's icon vocabulary.
 *
 * ── WHY A KEY AND NOT A COMPONENT ──────────────────────────────────────────
 *
 * The nav table in `desk-shell.tsx` names an icon by a short string — `trips`,
 * `travellers` — rather than importing a component and passing it. Two
 * reasons, and the second is the one that matters here:
 *
 * 1. The nav table stays data. It can be read, reordered and diffed without
 *    anyone tracing an import.
 * 2. A client branch that wants a different icon set changes THIS FILE ONLY.
 *    Travyan draw their own outline set; a prospect on Material would want
 *    theirs. Swapping the mapping is one file; swapping components passed
 *    through a table is every call site.
 *
 * Sizing comes from `--nav-icon-size`, never a prop, so the icons scale with
 * whatever density a branch configured rather than against it.
 */

export type NavIconKey = 'trips' | 'travellers' | 'operations' | 'staff' | 'settings';

const ICONS: Record<NavIconKey, LucideIcon> = {
  trips: MapIcon,
  travellers: Users,
  operations: Compass,
  staff: Users,
  settings: CircleDot,
};

export function NavIcon({ name }: { name: NavIconKey }) {
  const Icon = ICONS[name] ?? CircleDot;
  return (
    <Icon
      aria-hidden
      strokeWidth={1.75}
      style={{ width: 'var(--nav-icon-size)', height: 'var(--nav-icon-size)' }}
      className="shrink-0"
    />
  );
}

/** Unused today, kept so the money nav item has an icon when it arrives. */
export const RESERVED_ICONS = { money: Wallet };
