# syntax=docker/dockerfile:1.7
#
# Next 16 + pnpm + one native module, for Coolify's Dockerfile build pack.
#
# EVERY STAGE SHARES ONE BASE TAG, for the same reason `kaafil-engine`'s does.
# `better-sqlite3` is a compiled addon whose prebuild is selected by (node ABI,
# libc, arch), so installing on Debian and running on Alpine gives you an image
# that builds, boots, serves the landing page, and then throws on the first desk
# screen — because `/` is the only route in this app that does not touch SQLite.
# Debian slim throughout costs tens of megabytes and removes the whole class.
ARG NODE_VERSION=22.23.2

# ---------- deps ----------
FROM node:${NODE_VERSION}-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
# python3/make/g++ are for `better-sqlite3`'s FALLBACK, not its happy path. Its
# install script is `prebuild-install`, which downloads a prebuilt `.node` for
# this ABI and shells out to node-gyp when there isn't one. Without a toolchain
# that fallback fails HERE, in a stage whose failure is a red build — which is
# strictly better than discovering it the first day a Node release lands before
# better-sqlite3 ships a prebuild for it.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*
# pnpm-workspace.yaml carries the `onlyBuiltDependencies` allowlist and pnpm 10
# reads it from nowhere else. Omit it and better-sqlite3 installs WITHOUT its
# native binding, silently, and every `require` of the driver throws at boot.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && pnpm install --frozen-lockfile

# ---------- builder ----------
FROM node:${NODE_VERSION}-bookworm-slim AS builder
WORKDIR /app
RUN corepack enable
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# The public origin, inlined by `next build` because `NEXT_PUBLIC_*` is a
# compile-time substitution — so it must arrive as a build arg and cannot be set
# at runtime. It is an origin, not a credential.
#
# KAAFIL_API_KEY must NEVER be given this treatment. A build arg is recorded in
# the image history and readable by anyone who can pull the image. The build does
# not need it and that is worth keeping true: no page or `generateMetadata` calls
# `getKaafil()`, the three minting routes are per-request handlers, and all four
# Kaafil surfaces load with `ssr: false`.
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}

# SEED BEFORE BUILD. `next build` prerenders what it can, and a build that
# depends on a route staying dynamic is a build that breaks on a refactor. The
# database this writes is also the one copied into the runtime stage, so the
# image ships ready to serve — the first health probe passes rather than racing
# a boot-time seed.
#
# It bakes in whichever departure was live on the day of the build. That is
# expected and handled: `instrumentation.ts` runs a refresh shortly after boot,
# so a container deployed weeks later converges within seconds of starting.
RUN pnpm run seed
# `next build && pnpm run build:sw` — the app, then the service worker, whose
# cache name hashes the brand-derived manifest.
RUN pnpm run build

# ---------- runtime ----------
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    # The standalone server reads HOSTNAME and otherwise binds localhost. Inside
    # a container that means the health probe and every real request hit a
    # closed port on a container that is, by its own logs, listening happily.
    HOSTNAME=0.0.0.0

# Node as PID 1 does not get the default signal dispositions, so an unhandled
# SIGTERM is ignored and every deploy waits out the SIGKILL timeout.
RUN apt-get update \
    && apt-get install -y --no-install-recommends dumb-init \
    && rm -rf /var/lib/apt/lists/*

# `.next/standalone` carries its own minimal node_modules and `server.js`.
# Static assets and `public/` are NOT inside it and have to be copied alongside.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static     ./.next/static
# `public/` holds `sw.js`, written by `build:sw` AFTER `next build`, and the
# brand assets. It no longer holds a web manifest — that is a route now.
COPY --from=builder --chown=node:node /app/public           ./public

# `lib/db/store.ts` resolves the store as `join(process.cwd(), 'crm.sqlite')`
# and the standalone server runs from /app, so this path is not arbitrary.
COPY --from=builder --chown=node:node /app/crm.sqlite       ./crm.sqlite

# The live-departure job REWRITES that file in place, so /app must stay
# writable — no read-only root filesystem here. It writes a sibling
# `crm.sqlite.next` and renames over the top, plus `live-state.json`, and
# nothing else. `node` owns the directory for exactly that reason.
RUN chown node:node /app

USER node
EXPOSE 3000

# `app/api/health/route.ts` opens the store, reports its counts, and says
# whether the live departure being served is the one that should be. It reports
# a missing Kaafil key as `configured: false` at HTTP 200 rather than failing —
# the right split for a probe, and not something to "fix" into a 503.
# No curl in a slim image; node's global fetch is the dependency-free probe.
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
