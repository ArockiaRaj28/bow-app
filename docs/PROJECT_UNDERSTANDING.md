# PROJECT_UNDERSTANDING — BOW (v6.4)

> Written by an agent after a repo walk-through. Sources: `README.md`, `project-context.md`, `PROJECT_MAP.md`, `package.json`.

## What this project is

**BOW (Budget + Overtime + Work tracker)** is a mobile-first, dark-mode web app for **Japan-based international students / part-time workers**. It tracks:

- Work shifts (scheduled vs. actual hours) on a monthly calendar
- **Japan student-visa compliance** — the 28 hours/week work limit, with a colour-coded VisaBar
- **Night-pay premiums** for hours worked 22:00–05:00
- Monthly budgets with waterfall/bucket allocation across categories
- Expenses, savings goals (with cross-month carry-forward), and monthly notes
- Reusable shift templates for recurring work patterns

Business rules: week starts Monday; night-pay window 22:00–05:00; school-fee target ¥840,000; app date range Apr 2026 – Sep 2027.

## Tech stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| DB | PostgreSQL on Neon (serverless) via Prisma 6 |
| State | Zustand stores (DB-backed caches); only `wh_shifts` is mirrored to localStorage for instant calendar paint |
| Auth | Custom session-based auth (bcrypt, 30-day HTTP-only cookie `bow_session`), email verification + password reset via Resend |
| UI | Vanilla CSS + CSS variables, Sonner toasts, lucide icons |
| Deploy | Vercel-ready (`vercel.json`, region sin1) |

## Architecture in one paragraph

All durable user data lives in **Neon Postgres** (11 Prisma models: `User`, `Session`, `VerificationToken`, `PasswordResetToken`, `UserJob`, `UserShift`, `UserTemplate`, `UserExpenseCategory`, `UserExpense`, `UserBudgetMonthMeta`, `UserBudgetGoal`). The client reads/writes exclusively through **server actions** in `app/actions/*` and `app/auth/actions.ts`; Zustand stores in `store/` act as client-side caches hydrated from the DB. `localStorage` persistence was fully removed in v6.4 except the `wh_shifts` calendar mirror.

## Key locations

- `app/` — routes: landing, login/register/verify/forgot/reset-password, protected `dashboard/`
- `app/actions/` — server actions: `account`, `shifts`, `jobs`, `templates`, `expenses`, `budget`
- `components/` — grouped by feature: `layout`, `auth`, `account`, `calendar`, `budget`, `summary`, `transactions`, `templates`, `settings`, `modals`, `fab`, `ui`
- `store/` — Zustand stores (one per domain)
- `features/` — business logic hooks/engines (`budgetEngine`, `visaEngine`, `shiftCalculations`, …)
- `lib/` — `nightPayEngine.ts`, `dayHours.ts`, `dateUtils.ts`, `auth/` (session, prisma, emails)
- `services/` — JSON export/import that round-trips through the same server actions
- `prisma/schema.prisma` — source of truth for data model

## History / migration context

Started as a ~2500-line single HTML file with vanilla JS + localStorage, refactored into modules, then migrated to Next.js (branch history `arockia/V7-nextjs-migration`, current `main` tracks `arockia/main`). Phases 0–5 moved every localStorage key (`wh_jobs3`, `wh_budgets`, `wh_categories`, `wh_perMinute`, `wh2_*`, `wh_templates`) into Postgres; full log in `BOW_NEXTJS_MIGRATION.md`.

## How to run / verify

```bash
npm install
cp .env.example .env      # DATABASE_URL, RESEND_API_KEY, APP_URL, EMAIL_FROM
npm run prisma:push && npm run prisma:generate
npm run dev               # http://localhost:3000
```

Checks: `npm run lint`, `npm run build` (build runs `prisma generate` first).

## Conventions worth knowing

- Mobile-first design; FAB quick-entry (expense / shift / actual time / template) must not cover bottom nav.
- Top tabs: Calendar, Budget, Summary, Transactions, Account. Bottom nav: Home, Templates, FAB, More.
- Docs already in repo: `README.md`, `PROJECT_MAP.md`, `project-context.md`, `PROJECT_STATUS.md`, `BOW_NEXTJS_MIGRATION.md`, `VERCEL.md`, `IMPORT_EXPORT_SPEC.md`, `implementation-plans/`.
