import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // `better-sqlite3` is a native binding. Bundling it produces a module that
  // resolves at build time and throws at runtime, so it has to stay external
  // and be required from node_modules at the moment a route handler runs.
  serverExternalPackages: ['better-sqlite3'],

  typedRoutes: true,

  // `app/manifest.ts` reads `styles/tokens.css` with `fs` to resolve the brand's
  // colours. Next traces IMPORTS; it has no reason to think a route depends on a
  // stylesheet it already compiled, so without this the file is absent from a
  // standalone build. The route is `force-static` so the read normally happens
  // during `next build` and this never matters — which is precisely why it is
  // worth stating: the day somebody makes the manifest dynamic, this line is
  // what stops the first home-screen install from 500ing.
  outputFileTracingIncludes: {
    '/manifest.webmanifest': ['./styles/tokens.css'],
  },
};

export default nextConfig;
