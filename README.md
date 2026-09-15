# kaafil-demo-portals

A working partner CRM with Kaafil integrated into it, three ways.

`main` holds the whole integration — every route, every API call, the real
data — in a deliberately plain skin. Each **client branch** changes only the
skin, so a prospect sees their own portal with Kaafil already inside it.

It is also the worked example we hand a partner on day one. Which is why `main`
is honest code rather than demo scaffolding: somebody is going to copy it.

---

## The three portals

Kaafil has three browser personas, and they are three separate products here —
not three tabs of one screen.

| | Who | Where | What mounts |
|---|---|---|---|
| **`/admin`** | Desk executive in the Pune office | Desktop, sidebar, dense | `TripWorkspace`, as one tab of the CRM's own departure page |
| **`/m`** | Tour leader travelling with the group | Phone, bottom tabs, installable, **offline-first** | `KaafilManagerApp` |
| **`/t/:token`** | A traveller or their family | Phone, no account, opened from WhatsApp | `KaafilShareView` |

### The rule everything else follows

There is **no `persona` prop** in the UI Kit. There is no `mode` prop. The
*shape of the credential* decides the persona and nothing else does:

```tsx
<KaafilUIKitProvider accessToken={…} refreshToken={…} agencyRef={…}>  // staff
<KaafilUIKitProvider shareToken={…}>                                  // traveller
```

Manager and agency-admin take the **identical** three fields — the difference
is inside the token. So which persona you get is decided by which server
endpoint minted it, which is decided by which portal the browser signed in to.
That is why the two staff portals keep separate cookies and separate sign-ins:
the separation *is* the access control.

---

## Setup

```sh
pnpm install
cp .env.example .env     # paste a key into KAAFIL_API_KEY
pnpm seed                # builds crm.sqlite — 56 departures, 728 travellers
pnpm seed:kaafil         # pushes them into your Kaafil tenant. Safe to re-run.
pnpm dev                 # http://localhost:3000
```

Sign in at `/login` — one page for the whole demo. Pick a **tour leader** and
you land in the field app; pick a **desk executive** and you land at the office
portal. Where you go follows from the job, because they are different products.

Node 20.11+ and pnpm. No Docker, no database server.

### About the key

`KAAFIL_API_KEY` is server-only and has **no `NEXT_PUBLIC_` prefix**, which is
the entire mechanism — Next inlines `NEXT_PUBLIC_*` into the browser bundle and
nothing else. `config/env.ts` carries `import 'server-only'`, so a client
component that reaches for it fails the build rather than shipping a credential
that can mint a session for any manager in the tenant.

A `kf_test_` key is capped at 5 trips, which is fine for wiring up and far too
thin to demo. This repo seeds 56 departures, so a demo tenant wants a
`kf_live_` key — and there is no undo on the live plane. Use a tenant that
holds nothing real.

## Commands

| | |
|---|---|
| `pnpm dev` | seed, then Next on :3000 |
| `pnpm dev:only` | Next without re-seeding |
| `pnpm seed` | rebuild `crm.sqlite`. Offline, no key, safe to repeat |
| `pnpm seed -- --core` | just the 6 hand-written departures |
| `pnpm seed:bulk` | regenerate `fixtures/bulk.generated.json`, then seed |
| `pnpm seed:kaafil` | push into your Kaafil tenant. Idempotent, rate-limited |
| `pnpm seed:kaafil -- --enrich-only` | skip the 7-step push, redo just the depth pass |
| `pnpm seed:kaafil -- --shallow` | push trips only; no itineraries, rooming or checklists |
| `pnpm build:sw` | bundle the service worker (runs inside `pnpm build`) |
| `pnpm typecheck` / `pnpm lint` | tsc / Biome |
| `pnpm format` | Biome, writing fixes |
| `pnpm audit:tokens` | fail if a token is declared and nothing reads it |

`seed:kaafil` is deliberately **not** part of `pnpm dev`: 56 departures means
56 `journey.waitUntilReady` waits and a rate limit you will hit. Run it because
fixtures changed, not because you restarted.

---

## Layout

```
app/
  (crm)/        the desk portal. Its own screens + one Kaafil section
  (manager)/    the field app. Own manifest, own shell, own cookie
  (share)/      the public traveller page. No gate, no chrome
  api/          3 routes hold the key; the rest read SQLite
components/
  kaafil/       every Kaafil touchpoint — providers, credentials, brand, SW
  crm/ ui/      the host's own tables and primitives
  layouts/      the two shells
config/         contract.ts (HTTP types) · brand.ts (names) · env.ts (the key)
fixtures/       the CRM's book of business — types, hand seed, generator
lib/            ingest.ts + enrich.ts (CRM → Kaafil) · db/ · session · format
scripts/        seed.ts · ingest.ts · build-sw.ts · audit-tokens.ts
styles/         tokens.css · kaafil-bridge.css    ← what a branch edits
sw/             the field app's service worker
```

**`lib/ingest.ts` is the file worth reading twice.** It is the CRM→Kaafil
vocabulary translation — the same job a partner does on day one, in the order
they have to do it. `scripts/ingest.ts` is only the command-line wrapper around
it, and `lib/enrich.ts` is the second pass that fills the boards a bare ingest
leaves empty.

---

## Making a client branch

```sh
git switch -c client/<slug> main
```

A branch is allowed to touch **five things**:

| File | What changes |
|---|---|
| `styles/tokens.css` | the `:root` block — colours, radius, font, density, chrome dimensions |
| `config/brand.ts` | product name, logo path, and the **vocabulary map** |
| `public/brand/` | logo, app icons |
| `app/layout.tsx` | a `next/font` import, if they use a specific typeface |
| `components/layouts/*-shell.tsx` | only if their nav structure genuinely differs |

Anything else means `main` is missing an abstraction. Fix it on `main` and
merge down — branches never merge back.

That loop is the one to expect, not the exception. Building `client/travyan`
hit it four times: the skin needed a logo image (`Wordmark`), nav icons
(`NavIcon`), a sidebar identity block, and five spacing tokens that did not
exist yet. Each was added to `main` rather than to the branch, so every branch
after the first gets them without asking.

### `styles/tokens.css` conflicts on every merge, and that is fine

Both sides edit the same `:root` block, so `git merge main` will stop there
most times. The resolution rule never changes:

> **`main` owns the shape and the comments. The branch owns the right-hand
> side.**

Take `main`'s structure wholesale, including any token it just added, and put
your values in it. A token you drop on the floor here is a token that silently
stops working later — which is what `pnpm audit:tokens` is for.

### Why that is enough

`styles/kaafil-bridge.css` maps the CRM's tokens onto Kaafil's twelve
brand-fit tokens as `var()` references, never literals. So a branch that
changes `--accent` re-skins the embedded Kaafil surfaces **in the same
commit, without touching a Kaafil file**. The embedded product cannot drift
from the host's brand, because it is not holding its own copy of it.

That is the demo: change one block, screenshot `/admin/trips` beside
`/admin/operations`, and there is no seam to find.

### Vocabulary is not cosmetic

Sharma Travels says *tour*, *tour leader*, `ON_TOUR`. Kaafil says *trip*,
*manager*, `IN_PROGRESS`. Every prospect has their own words — *departures*,
*batches*, *groups*. `config/brand.ts` holds that map so a branch adopts the
client's language in one object instead of one grep.

---

## What is actually wired up

Everything below runs against a live tenant — there is no mocked Kaafil call
anywhere in this repo.

| | |
|---|---|
| The CRM, standing alone | 56 departures, 728 travellers, 20 staff, in SQLite |
| The key boundary | `KAAFIL_API_KEY` server-side only, three routes mint sessions |
| All three surfaces | desk, field and traveller, each in its own route group |
| Depth beyond the ingest | itineraries, rooming, checklists, floats, pickups, balances |
| Offline | installable PWA, cached shell and credential, outbox that drains |
| The re-skin path | `client/travyan`, differing from `main` in four files |

### Branches

| | |
|---|---|
| `main` | the reference integration, deliberately plain |
| `client/travyan` | a worked client skin — tokens, logo and vocabulary only |

### Gotchas worth knowing before you hit them

**`list()` returns a lazy paginator, not an array.** `items` is `[]` and
`hasNext` is `true` until you call `next()`. Reading `.items` straight off the
return value reports zero records and looks exactly like a failed ingest.

**Travellers are not metered, and the console says so.** Plan & Usage reports
travellers as "Not metered" and per-agency storage as "Tenant-wide only" —
both are statements about what the plan bills, not about your data. Read a
manifest back if you want to confirm what landed.

**Declare all six CSS layers, with `base` before `kaafil-ui`.** Tailwind's
preflight resets every `button` to `padding: 0; background: transparent`.
Declare only `@layer kaafil-ui, kaafil-ui-overrides;` and Tailwind appends its
own layers after yours, so preflight beats the kit and every chip, tab and
segmented control renders as bare text — while the CSS is loaded, the tokens
resolve and the classes are on the elements. See `app/globals.css`.

**The staff surfaces cannot server-render.** The session opens via an async
fetch, so on the server the provider has nothing to hand down and the first
data hook throws `useKaafilClient() was called outside a <SessionShell>`. Load
them with `ssr: false` — `components/kaafil/surface.tsx`.

**The session opens asynchronously, and the kit gates on it for you.** There
is a first commit where the shell has mounted and no client exists yet. Every
exported composite waits for it from `kaafil-react-uikit@0.10.0` onward, so a
host does not need its own gate — on 0.9.x it did, and the failure was nasty:
the child throws, the boundary swallows it, the subtree unmounts, and the
effect that would have opened the session never runs, so the network tab shows
*no request at all*. If you see that, check your kit version first.

**Offline needs a production build.** `pnpm build && pnpm start`, not
`pnpm dev`. A dev build renames its chunks on every edit, so nothing cached
under one name is still valid under the next.

**The snapshot has to be warmed before it is worth anything.** The service
worker caches the SHELL; the trip data lives in the offline snapshot, which
fills on a sync pull. So the honest sequence for a demo is: open `/m` online,
tap into the departure you are going to show, and only then go offline. Skip
the warm-up and the app boots perfectly to an empty trip list, which looks far
worse than a boot failure. This is true of every offline-first app and is worth
saying out loud rather than discovering on a stage.

**Scope the worker to `/m`, not `/m/`.** Scope is a prefix match: `/m/` controls
`/m/login` and not `/m`, which is the route the whole offline story is about.
Ours registered, activated, precached the shell, reported a healthy scope and
did not control its own root.

**`installKaafilOfflineShell` answers almost every GET.** It declines exactly
three kinds — a non-`GET`, anything `isApiRequest` claims, and anything
`isHostOwned` declines (same-origin by default). Everything else is already
answered by the time a second `fetch` listener would see it, so exclude a route
with `isHostOwned` rather than adding a listener of your own. A miss is not
cached unless you set `runtimeCache`, which `sw/index.ts` does and explains.

**The depth pass is not made of upserts.** `itinerary.items.add` appends, room
codes are unique per stay window, checklist keys unique per section. `enrich.ts`
reads before it writes for exactly that reason; see its header.
