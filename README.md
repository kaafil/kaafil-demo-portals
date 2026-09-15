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
| **`/admin`** | Desk executive in the Pune office | Desktop, sidebar, dense | `KaafilAgencyWorkspace` at `/admin/operations` |
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
pnpm seed:kaafil         # pushes them into your Kaafil tenant. Run once.
pnpm dev                 # http://localhost:3000
```

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
| `pnpm seed:kaafil` | push into your Kaafil tenant. Idempotent, rate-limited |
| `pnpm typecheck` / `pnpm lint` | tsc / Biome |
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
config/         contract.ts (HTTP types) · brand.ts (names) · env.ts (the key)
fixtures/       the CRM's book of business — types, hand seed, generator
lib/            db/ · format · session · api
scripts/        seed.ts (local) · ingest.ts (CRM → Kaafil)
styles/         tokens.css · kaafil-bridge.css    ← what a branch edits
```

`lib/db/store.ts`, `scripts/ingest.ts` and `fixtures/` are lifted from
[`kaafil-qa-handoff`](../kaafil-qa-handoff), where they were written for the QA
integration exercise. `ingest.ts` is the file worth reading twice — it is the
CRM→Kaafil vocabulary translation, and it is the same job a paying partner does
on day one.

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

That loop is not theoretical; the first branch triggered it four times in an
afternoon. Travyan needed a logo image (`Wordmark`), nav icons (`NavIcon`), a
sidebar identity block, and five spacing tokens that did not exist. All four
landed on `main`, so the second branch gets them free.

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

## Status

- [x] **Phase 1** — the CRM, standing alone, with zero Kaafil code
- [x] **Phase 2** — the key boundary, and the book of business in a live tenant
      (56 trips, 728 travellers, 16 managers, 4 agency admins, 0 failures)
- [ ] **Phase 3** — the three surfaces mounted
- [ ] **Phase 4** — the manager PWA and the offline outbox
- [x] **Phase 5 (early)** — `client/travyan`, proving the re-skin path

Phase 5 ran ahead of 3 and 4 on purpose: re-skinning is the claim the whole
repo exists to make, and finding out on the first branch that the chrome was
not themeable was worth far more than finding out on the fifth.

### Branches

| | |
|---|---|
| `main` | the reference integration, deliberately plain |
| `client/travyan` | Travyan — an AI travel CRM. Their real tokens, logo and vocabulary |

### Gotchas worth knowing before you hit them

**`list()` returns a lazy paginator, not an array.** `items` is `[]` and
`hasNext` is `true` until you call `next()`. Reading `.items` straight off the
return value reports zero records and looks exactly like a failed ingest.

**Travellers show as "Not tracked" in the console's Plan & Usage.** That is the
plan's metering, not your data — Storage says the same. Read a manifest back
if you want to confirm what landed.
