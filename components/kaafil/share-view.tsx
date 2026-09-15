'use client';

import { browserOnly } from './surface';

/** The browser-only boundary around the traveller surface. See `surface.tsx`. */
export const ShareView = browserOnly<{ token: string }>(
  () => import('./share-view-inner'),
  'your trip',
);
