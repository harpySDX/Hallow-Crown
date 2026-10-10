# Hollow Crown

A browser-based open-world action RPG. Five classes with four fixed abilities each, real-time click-to-move combat, seven sealed dungeons whose first clear grants a three-card enhancement choice, quests with branching dialogue, shops, equipment, carry weight and persistent saves — plus shared presence and temporary parties for playing alongside friends.

- **Stack:** Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 · Phaser 3 · PostgreSQL (Supabase, or PGlite in the browser) · Vitest · Playwright
- **Architecture notes:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · **Content guide:** [docs/CONTENT.md](docs/CONTENT.md)

## Drop it into a repository and deploy

Put the **contents** of this folder at the top level of a GitHub repository (so `README.md`, `index.html`, `play/` and `package.json` sit at the repository root, not inside a sub-folder) and push to `main`.

| Option                  | What you do                                                                                                                                    | What you get                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **GitHub Pages**        | _Settings → Pages → Build and deployment_: Source **Deploy from a branch**, Branch **main**, folder **/ (root)** → Save. Wait a minute or two. | `https://<you>.github.io/<repo>/` — the **static edition**                     |
| **Vercel, zero config** | _vercel.com → Add New → Project → Import_ the repository → **Deploy** (no environment variables).                                              | `https://<project>.vercel.app` — the **static edition**                        |
| **Vercel + Supabase**   | Same import, plus three environment variables (section 6).                                                                                     | The **online edition**: real accounts, server-authoritative saves, multiplayer |

GitHub Pages serves the prebuilt game in [`play/`](play/) (the root `index.html` forwards there); it works under any repository name. If you prefer GitHub to build it on every push instead, set the Pages source to **GitHub Actions** — the included workflow then builds and publishes a fresh copy.

**Static edition** (GitHub Pages / Vercel without a database): the whole game — the same rules, services and SQL as the server — runs inside your browser on PGlite (PostgreSQL compiled to WebAssembly). Progress is saved automatically in that browser (IndexedDB); _Menu → Save file_ exports a backup you can import on another device or browser. No account is needed. Multiplayer presence and parties work too if you add your Supabase project's public URL and anon key (section 6.3); otherwise the Party panel says multiplayer isn't configured. Because the player's own browser is the authority, this edition has no anti-cheat; it is meant for single-player progression.

**Online edition** (Vercel + Supabase): accounts with email/password, saves in Supabase Postgres behind Row Level Security, every change validated on the server, and realtime multiplayer.

The build picks the edition automatically: Vercel builds the online edition when `DATABASE_URL` is set and the static edition when it isn't. The static edition uses only relative URLs, so the same files work at any address.

---

## Contents

1. [Required software](#1-required-software)
2. [Quick start on your computer](#2-quick-start-local-mode)
3. [Supabase setup](#3-supabase-setup)
4. [Environment variables](#4-environment-variables)
5. [Running and testing](#5-running-and-testing)
6. [Deploying (GitHub Pages and Vercel)](#6-deploying-github-pages-and-vercel)
7. [GitHub workflow](#7-github-workflow)
8. [Troubleshooting](#8-troubleshooting)
9. [Known limitations](#9-known-limitations)

---

## 1. Required software

- **Node.js 20.9+** (22 LTS recommended) and npm 10+
- **Git**
- For production: a free **Supabase** project and a **Vercel** account
- Optional: the [Supabase CLI](https://supabase.com/docs/guides/cli) (`supabase db push`), PostgreSQL 16 locally for running integration tests against real Postgres

## 2. Quick start (local mode)

Local mode runs the whole game on your machine with an **embedded PostgreSQL (PGlite)** database and a **password-less dev sign-in**. It applies the same migrations and runs the same server-side rules as production — it just replaces Supabase Auth with a signed local cookie. It refuses to run on Vercel.

```bash
git clone https://github.com/<you>/hollow-crown.git
cd hollow-crown
npm install
cp .env.example .env.local      # leave the Supabase values empty
npm run dev                      # http://localhost:3000
```

Open http://localhost:3000, choose **Play now**, sign in with any account name, create a character and play. Data is stored in `.data/pglite` (delete the folder to reset).

To try the static edition locally instead: `npm run dev:static` (development), or `npm run build:static && npm run preview:static` to build `out/` and serve it exactly as GitHub Pages would.

## 3. Supabase setup

1. **Create a project** at https://supabase.com/dashboard. Note the project URL and the `anon` (publishable) key under _Project Settings → API_.
2. **Get the database connection string** under _Project Settings → Database → Connection string_.
   - For Vercel/serverless use the **Transaction pooler** URI (port `6543`).
   - Locally either pooler or direct URI works.
3. **Apply the database migration** (creates tables, constraints, Row Level Security policies and the atomic `game_apply` function). Pick **one** method:
   - Supabase CLI: `supabase link --project-ref <ref>` then `supabase db push`
   - This repo's runner: `DATABASE_URL="postgres://…" npm run db:migrate`
   - Dashboard: paste `supabase/migrations/20261008000001_core_schema.sql` into the SQL editor and run it.
4. **Seed the game world** (items, quests, dungeons, shops, cards — synced from `src/content`):
   - `DATABASE_URL="postgres://…" npm run db:seed:apply`, or paste `supabase/seed.sql` into the SQL editor. (The Supabase CLI also runs `supabase/seed.sql` on `supabase db reset`.)
   - Re-run after changing content. The seed is idempotent.
5. **Configure authentication** under _Authentication_:
   - _Providers → Email_: enabled (email + password). Keep "Confirm email" on for production.
   - _URL Configuration → Site URL_: your production URL, e.g. `https://hollow-crown.vercel.app`
   - _URL Configuration → Redirect URLs_: add
     - `http://localhost:3000/auth/callback`
     - `https://<your-domain>/auth/callback`
     - `https://*-<your-vercel-team>.vercel.app/auth/callback` (preview deployments, optional)
   - Password recovery and email confirmation links go to `/auth/callback`, which exchanges the one-time code for a session and continues to `/reset-password` or `/play`.
6. **Realtime** (multiplayer presence and parties) works with the default Supabase Realtime settings; no tables are needed.

Never put the database password, `DATABASE_URL` or a service-role key in a `NEXT_PUBLIC_` variable. This app does not need the service-role key at all: the server connects to Postgres with `DATABASE_URL`, and browsers only ever get the anon key.

## 4. Environment variables

See [`.env.example`](.env.example) for the full annotated list.

| Variable                        | Where            | Required      | Purpose                                                                                     |
| ------------------------------- | ---------------- | ------------- | ------------------------------------------------------------------------------------------- |
| `GAME_BACKEND`                  | server           | no            | `supabase` or `local`. Defaults to `supabase` when `NEXT_PUBLIC_SUPABASE_URL` is set.       |
| `NEXT_PUBLIC_SUPABASE_URL`      | browser + server | Supabase mode | Project URL                                                                                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | Supabase mode | Anon / publishable key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` also accepted)               |
| `DATABASE_URL`                  | server only      | Supabase mode | Postgres connection string used by the trusted game server                                  |
| `DATABASE_POOL_MAX`             | server           | no            | Pool size per instance (default 5)                                                          |
| `LOCAL_DATA_DIR`                | server           | no            | PGlite directory in local mode (default `.data/pglite`)                                     |
| `LOCAL_AUTH_SECRET`             | server           | no            | Signs local-mode session cookies                                                            |
| `NEXT_PUBLIC_GAME_DEBUG`        | browser          | no            | `1` enables hitboxes and the `hc_debug_power` localStorage damage multiplier (testing only) |
| `NEXT_PUBLIC_E2E_HOOKS`         | browser          | no            | `1` exposes `window.__hc` for Playwright. Never enable in production.                       |

The server validates its environment on first use and reports every missing variable by name (also visible on `/login` and `/api/health`).

## 5. Running and testing

```bash
npm run dev              # development server (http://localhost:3000)
npm run build            # production build
npm start                # serve the production build
npm run lint             # ESLint
npm run typecheck        # tsc --noEmit (strict)
npm run content:validate # cross-checks every content reference, map reachability and dungeon doors
npm test                 # unit tests (rules, cards, combat, all five classes, dungeons, pathfinding)
npm run test:integration # database tests on embedded PGlite (real Postgres in WASM)
TEST_DATABASE_URL=postgres://user:pass@localhost:5432/db npm run test:integration   # same tests on a real server (schema is reset!)
npx playwright install chromium && npm run test:e2e   # browser tests (builds and starts local mode automatically)
npm run db:seed          # regenerate supabase/seed.sql from src/content
npm run build:static     # static edition -> out/ (relative URLs: works at any path)
npm run build:pages      # same, then copied into play/ for GitHub Pages "Deploy from a branch"
npm run preview:static   # serve out/ (http://localhost:4173; SERVE_BASE=/repo mimics a project site)
npm run test:e2e:static  # builds the static edition, serves it under a sub-path and plays it in a browser
```

`npm run check` runs lint, typecheck, content validation and unit tests together.

**What the tests cover:** XP/levels, stat calculation, damage/healing/shields/reduction caps, cooldowns and resources, every class ability, card prerequisites/stacking/synergies/evolutions and offer generation, inventory weight and overflow, equipment rules, shop pricing; and against a real database: account↔character association, duplicate-creation races, idempotent retries, concurrent purchases that cannot overdraw gold, sells, capacity, equip/unequip, consumption, quest acceptance/turn-in/branching, exactly-once rewards, card choice double-submission, region kill validation and respawn timers, dungeon room order/timing, first-clear vs replay rewards, shrine boons expiring with the run, respawn penalty, and RLS (players can read only their own rows and cannot write anything directly). End-to-end tests play the game in a browser: register/login → create character → NPC dialogue → quest → card → shop → equip → combat reward → refresh and re-login persistence; a full dungeon with shrine and boss; the quest chain that unlocks Thornwatch; and rejected forged requests.

## 6. Deploying (GitHub Pages and Vercel)

### 6.1 GitHub Pages (static edition)

**Simplest — serve the prebuilt copy (no Actions needed):**

1. Push the repository (contents at the root) to `main`.
2. _Settings → Pages → Build and deployment → Source_: **Deploy from a branch**; Branch: **main**, folder **/ (root)** → **Save**.
3. After the "pages build and deployment" run finishes (Actions tab, ~1–2 minutes), open `https://<you>.github.io/<repo>/`. You'll be forwarded to `…/<repo>/play/` and the title screen appears.

The committed `play/` folder is a build of the current code. After changing game code, run `npm run build:pages` and commit `play/` again.

**Alternative — let GitHub build it:** set _Source_ to **GitHub Actions**. `.github/workflows/pages.yml` then runs `npm run build:static` on every push to `main` and publishes `out/` (the site root is the game directly). While the source is "Deploy from a branch", that workflow detects it and skips itself.

Either way the PGlite engine (`pglite/*`, ~17 MB) is downloaded once and cached by the browser.

### 6.2 Vercel

**Zero-config (static edition):** _Add New → Project → Import_ the repository, keep the defaults (Framework preset **Next.js**), **Deploy**. With no `DATABASE_URL`, `next.config.ts` switches to a static export automatically.

**Online edition (accounts + server saves + multiplayer):**

1. Complete [Supabase setup](#3-supabase-setup) (migration + seed + auth URLs).
2. In the Vercel project: _Settings → Environment Variables_, for Production (and Preview if you use it):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL` (transaction pooler URI). Optionally `GAME_BACKEND=supabase`.
3. Redeploy (_Deployments → … → Redeploy_). Add the deployment URL to Supabase _Site URL_ / _Redirect URLs_ (step 3.5).
4. Verify: `https://<your-domain>/api/health` → `{"ok":true,"backend":"supabase","items":88}`. Register an account and play.

Local mode (the embedded-database dev server) is blocked on Vercel by design; a database-less Vercel deployment always gets the static edition instead.

### 6.3 Multiplayer on the static edition (optional)

Presence and parties use Supabase Realtime, which only needs public values. Create a free Supabase project (no migration needed for this) and:

- **GitHub Pages:** add repository **variables** (_Settings → Secrets and variables → Actions → Variables_) `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, then re-run the Pages workflow.
- **Vercel (static):** add the same two variables in the project and redeploy. (Don't add `DATABASE_URL` unless you want the online edition.)

These two values are designed to be public; never put a database password or service-role key into a `NEXT_PUBLIC_` variable or a GitHub variable.

## 7. GitHub workflow

- `main` is deployable. Work on branches and open pull requests; Vercel creates preview deployments for PRs.
- `.github/workflows/ci.yml` runs on pushes to `main` and on PRs: lint, typecheck, content validation, checks that `supabase/seed.sql` and the generated SQL bundle are up to date, unit tests, integration tests on PGlite **and** PostgreSQL 16, server and static production builds, and both Playwright suites (server edition, and the static edition served as plain files under a sub-path).
- `.github/workflows/pages.yml` publishes a fresh static build on every push to `main` when the Pages source is "GitHub Actions" (and skips itself otherwise). With "Deploy from a branch", the committed `play/` folder is served — refresh it with `npm run build:pages` when you change game code.
- Database changes: add a new file in `supabase/migrations/` (never edit an applied one), run `npm run db:bundle` (regenerates `src/server/db/sqlBundle.generated.ts`, which the static edition applies in the browser), apply it with `supabase db push` or `npm run db:migrate`, and commit both with the code that needs it. Existing browser saves pick up new migrations automatically on next load.
- Content changes: edit `src/content`, run `npm run content:validate && npm run db:seed`, commit the regenerated `supabase/seed.sql`, and apply it to Supabase with `npm run db:seed:apply`.

## 8. Troubleshooting

| Symptom                                                                     | Fix                                                                                                                          |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `/login` shows "Setup needed"                                               | The listed environment variables are missing. Set them in `.env.local` (local) or Vercel settings, then restart/redeploy.    |
| `relation "public.characters" does not exist`                               | The migration hasn't been applied to that database (step 3.3).                                                               |
| `violates foreign key constraint … game_items` / creating a character fails | The seed hasn't been applied (step 3.4).                                                                                     |
| Email links land on `/login?error=link`                                     | The link expired or was used, or your domain isn't in Supabase Redirect URLs.                                                |
| Signed in but `/play` redirects to `/login`                                 | Cookies blocked, or Site URL/domain mismatch in Supabase.                                                                    |
| "Your character changed while this request was processed"                   | Two tabs acted at once. The client retries automatically; reload if it persists.                                             |
| `Another next build process is already running`                             | A previous build was interrupted; delete `.next/` and rebuild.                                                               |
| Local mode data looks wrong                                                 | Stop the server and delete `.data/` to start fresh.                                                                          |
| GitHub Pages workflow: "Get Pages site failed"                              | Pages isn't enabled yet: _Settings → Pages → Source: GitHub Actions_, then re-run the workflow.                              |
| GitHub Pages shows a blank page or 404s for `/_next/...`                    | Deploy through the included workflow (it sets the `/<repo>` base path); don't publish `out/` from a branch built without it. |
| Static edition: "already open in another tab"                               | Each browser keeps one save that one tab can use at a time. Close the other tab.                                             |
| Static edition: progress missing on another device/browser                  | Saves are per browser. Use _Menu → Save file → Export_ and import it on the other device. Clearing site data deletes it.     |
| Playwright can't find a browser                                             | `npx playwright install --with-deps chromium` (or set `PLAYWRIGHT_CHROMIUM_PATH`).                                           |
| Game feels slow on very old hardware                                        | Turn off damage numbers and screen shake in _Menu_. The simulation keeps real-time speed regardless of frame rate.           |

## 9. Known limitations

These are deliberate MVP boundaries, documented rather than hidden:

- **Multiplayer is social, not shared combat.** Players see each other moving in the same area, can form parties of up to 4 with live health/location and party chat. Enemies, loot and combat are simulated per player; a Priest's heals and Warden's totems don't affect other players. Each player's progression stays private and authoritative on the server, so parties can split at any time.
- **Client-side combat simulation.** Combat runs in the browser; the server cannot verify every hit. It instead validates everything persistent: kills must match real spawns in your current location (with respawn timers) or the current dungeon room's roster, rooms clear in order with minimum times, the boss must be reported before completion, dungeons have a minimum clear time, and all rewards, prices, item grants and card choices are computed server-side. A determined cheater could still automate combat on their own character; they cannot fabricate items, gold amounts, prices, or duplicate rewards.
- **Presence channels are public** within a Supabase project (anyone with the anon key can subscribe to `loc:*` channels and see names/positions). Moving to Realtime private channels with RLS policies is a recommended next step.
- **Rate limiting** is in-memory per server instance (bursts are limited; not a global quota on serverless).
- **Mobile:** account pages and menus are responsive; combat expects a mouse and keyboard (no touch controls yet).
- **Art** is procedural vector/shape art drawn by Phaser and SVG. Replaceable asset locations are listed in docs/ARCHITECTURE.md. No audio.
- **One character per account** (the schema supports four slots).
- **Static edition saves are local.** They live in one browser's IndexedDB (export/import moves them), and since the browser is the authority there is no anti-cheat. Use the online edition for accounts and protected progression.
- The Supabase-hosted auth flows (registration email, password reset email) were implemented against the documented Supabase APIs but could not be exercised end-to-end in the build environment without a Supabase project; local mode covers the same game paths.
