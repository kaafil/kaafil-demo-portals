import type { ReactNode } from 'react';

/**
 * A PASS-THROUGH, on purpose.
 *
 * This group holds both public screens (`/login`) and authenticated ones
 * (`/admin/*`), so the gate is pushed DOWN into the `(portal)` leaf layout
 * rather than wrapped around everything here. `/admin/*` living under this
 * group does not by itself imply "must be signed in", and a gate at this level
 * would mean every public page had to fight its way back out.
 *
 * `(manager)` does the same thing one level deeper: `/m/login` has to stay
 * public, so its gate sits in `m/(app)/layout.tsx` while its group layout
 * carries the PWA declarations. The rule is the same in both: put the gate at
 * the shallowest layout under which EVERY route is gated, and put shared
 * chrome wherever it genuinely belongs, which is not always the same place.
 */
export default function CrmLayout({ children }: { children: ReactNode }) {
  return children;
}
