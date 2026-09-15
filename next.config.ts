import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // `better-sqlite3` is a native binding. Bundling it produces a module that
  // resolves at build time and throws at runtime, so it has to stay external
  // and be required from node_modules at the moment a route handler runs.
  serverExternalPackages: ['better-sqlite3'],

  typedRoutes: true,
};

export default nextConfig;
