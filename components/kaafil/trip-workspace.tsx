'use client';

import { browserOnly } from './surface';

/**
 * The browser-only boundary around Kaafil's trip workspace.
 *
 * Kept as its own two-line module so the page can import a plain component and
 * stay a server component. See `surface.tsx` for why `ssr: false` is required
 * rather than preferred.
 */
export const TripOperations = browserOnly<{ tripRef: string; agencyAdminRef: string }>(
  () => import('./trip-workspace-inner'),
  'on-the-ground operations',
);
