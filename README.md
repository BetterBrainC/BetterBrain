# TPM · Better Brain Rehab at Home

Back-office + employee PWA for an in-home swallowing/neuro rehab clinic.
**Authoritative docs:** [CLAUDE.md](CLAUDE.md) (rules/conventions) and
[`docs/`](docs/) (ARCHITECTURE · DATA-MODEL · DOMAIN-SPEC · DESIGN-SYSTEM · ROADMAP).

## Stack
Next.js 15 (App Router, RSC + Server Actions) · TypeScript · Supabase
(Postgres + Auth + RLS + Storage + Realtime + Edge Functions) · Tailwind v3 ·
TanStack Query · React Hook Form + Zod · Serwist (PWA) · Dexie (offline) ·
deploy on Vercel.

## Quickstart
```bash
pnpm install
cp .env.example .env.local      # fill in Supabase + VAPID keys
pnpm dev                        # http://localhost:3000
```
The UI shell runs WITHOUT Supabase configured (auth is no-op until env is set).

## Scripts
| command | purpose |
|---|---|
| `pnpm dev` | dev server |
| `pnpm build` / `pnpm start` | production build / serve |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint (next) |
| `pnpm test` / `pnpm test:coverage` | Vitest (≥80% gate) |
| `pnpm test:e2e` | Playwright |

## Database (Supabase)
SQL lives in [`supabase/migrations/`](supabase/migrations/) + `supabase/seed.sql`.
Apply via the Supabase SQL editor, the CLI (`supabase db push`), or the MCP
`apply_migration` tool. Order: `0001_init` → `0002_rls` → `0003_auth_hooks` →
`0004_hardening` → `0005_checkin_rpc` → `0006_registration_links`, then
`seed.sql`. Create the 2 **director** auth users (hard cap = 2), then promote
them (see `seed.sql`); promote one Admin the same way.

## Routes
| path | area |
|---|---|
| `/login` · `/forgot` · `/reset` | auth (email+password; self-service reset) |
| `/app/*` | employee PWA (bottom nav: home, schedule, check-in, การวัดผล, account) |
| `/staff/*` | Admin + Director shell (sidebar; `/staff/audit` + `/staff/measurement` are Director-only) |
| `/booking` | public booking form |
| `/register/[token]` | public relative-intake link (opaque token → HN) |
| `/r/[token]` | relatives portal (tokenized, phone last-4 verify) |

## Structure
```
app/        route groups: (auth) (employee) (staff) (public) (relatives)
components/ ui/ + shell/
lib/        supabase/ · date/ · i18n/ · db/ (dexie) · utils · env
supabase/   migrations/ + seed.sql
docs/       full specs
```

> Status: core flows implemented across all roles (public booking + intake,
> employee PWA check-in→follow-up→จบเคส, Admin/Director back-office, relatives
> portal, การวัดผล/KPI, audit log) — browser-tested end-to-end. See
> [docs/ROADMAP.md](docs/ROADMAP.md) and [docs/UI-REDESIGN-PLAN.md](docs/UI-REDESIGN-PLAN.md).
