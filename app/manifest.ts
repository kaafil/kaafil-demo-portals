import { buildManifest } from '@/config/manifest';

/**
 * `/manifest.webmanifest`, generated from `config/brand.ts` and
 * `styles/tokens.css`. See `config/manifest.ts` for why it is derived rather
 * than checked in.
 *
 * Next serves an `app/manifest.ts` at `/manifest.webmanifest` specifically, so
 * nothing that references it has to change: `app/(manager)/layout.tsx` still
 * links that path and `scripts/build-sw.ts` still precaches it. A service
 * worker's install-time fetch does not care whether a URL comes from `public/`
 * or from a handler.
 *
 * FORCED STATIC, and that is load-bearing. `buildManifest()` reads
 * `styles/tokens.css` off the filesystem. Evaluated during `next build` that
 * read happens on the build host, where the repo is on disk and a renamed token
 * fails the build loudly. Left dynamic, the same read would be attempted inside
 * a standalone image that does not contain the stylesheet, and the first person
 * to install the app to their home screen would get a 500 for the one document
 * that decides what the installed app is called. `next.config.ts` also traces
 * the stylesheet in, so the two guards are independent.
 */
export const dynamic = 'force-static';

export default buildManifest;
