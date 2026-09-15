'use client';

import { browserOnly } from './surface';

/** The browser-only boundary around the manager surface. See `surface.tsx`. */
export const ManagerApp = browserOnly<{ managerRef: string }>(
  () => import('./manager-app-inner'),
  'your trips',
);
