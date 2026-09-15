import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // `better-sqlite3` is a native binding. Bundling it produces a module that
  // resolves at build time and throws at runtime, so it has to stay external
  // and be required from node_modules at the moment a route handler runs.
  serverExternalPackages: ['better-sqlite3'],

  typedRoutes: true,

  // Produces `.next/standalone/server.js` plus a traced `node_modules`, which
  // is what lets the runtime image carry no pnpm, no tsx and no devDependencies.
  output: 'standalone',

  // `app/manifest.ts` reads `styles/tokens.css` with `fs` to resolve the brand's
  // colours. Next traces IMPORTS; it has no reason to think a route depends on a
  // stylesheet it already compiled, so without this the file is absent from a
  // standalone build. The route is `force-static` so the read normally happens
  // during `next build` and this never matters — which is precisely why it is
  // worth stating: the day somebody makes the manifest dynamic, this line is
  // what stops the first home-screen install from 500ing.
  outputFileTracingIncludes: {
    '/manifest.webmanifest': ['./styles/tokens.css'],

    // `serverExternalPackages` keeps better-sqlite3 out of the bundle, which is
    // correct and is also exactly why it has to be named here: standalone copies
    // what the file tracer can SEE, and better-sqlite3 loads its binding through
    // `bindings('better_sqlite3.node')` — a runtime string, not a static
    // require. The tracer has a special case for `bindings`; naming the three
    // packages costs a megabyte and removes the failure mode where the image
    // builds, starts, serves `/`, and then 500s on the first desk page with
    // "Could not locate the bindings file".
    //
    // The fixtures are here because the live-departure job re-seeds at runtime
    // and reads `fixtures/bulk.generated.json` off disk. Without this the job
    // would silently fall back to the six hand-written departures.
    '/**': [
      './node_modules/better-sqlite3/**/*',
      './node_modules/bindings/**/*',
      './node_modules/file-uri-to-path/**/*',
      './fixtures/bulk.generated.json',
    ],
  },
};

/*
 * Server Actions behind a reverse proxy.
 *
 * Coolify fronts every app with Traefik, and Next 16 compares a Server Action's
 * `Origin` against the forwarded `Host`. A mismatch is rejected as "Invalid
 * Server Actions request" — and `signIn` in `app/_actions/auth.ts` is a Server
 * Action, so the symptom is that NOBODY CAN SIGN IN, in production only, on a
 * build that is green and a container that is healthy. It is the kind of thing
 * that costs an afternoon, so it is configured rather than discovered.
 *
 * Derived from the public origin that is already being passed in, rather than a
 * second hardcoded hostname that would drift out of agreement with the first.
 * Unset in local development, where the origins match and none of this applies.
 */
const publicOrigin = process.env.NEXT_PUBLIC_APP_URL;
if (publicOrigin !== undefined && publicOrigin !== '') {
  nextConfig.experimental = {
    ...nextConfig.experimental,
    serverActions: { allowedOrigins: [new URL(publicOrigin).host] },
  };
}

export default nextConfig;
