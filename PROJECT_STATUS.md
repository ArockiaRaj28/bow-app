# BOW — Project Status (v7.1)

> Single source of truth for the current state of BOW. This doc consolidates
> the older planning docs (v6.3/v6.4 migration notes, import/export spec,
> admin dashboard plan) into what the project **is** today and what comes next.
> Last updated: 2026-08-23, after a full stabilization pass.

---

## 1. What BOW is

**BOW (BaiWallet / Budget + Overtime + Work tracker)** is a mobile-first,
dark-mode web app for international students and part-time workers in Japan.
It combines:

- **Shift tracking** — scheduled shifts on a calendar, with actual
  clock-in/out times recorded separately
- **Earnings** — day rate + night premium (22:00–05:00), calculated
  per-minute from actual times when available
- **Visa compliance** — 28h/week cap with color-coded warnings
  (green < 24h, yellow ≥ 24h, red > 28h; Monday–Sunday weeks)
- **Zero-based budgeting** — category waterfall with budgets and priorities
- **Expenses** — hierarchical categories, monthly views, notes
- **Savings goals** — cross-month targets with per-month progress
- **Templates** — recurring shift patterns applied to any dates

## 2. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), TypeScript, React 18 |
| Database | PostgreSQL (Neon) via Prisma 6 |
| Auth | Custom: bcryptjs + HTTP-only cookie sessions (30 days), email verification + password reset |
| Login | **Handle-based** (Twitter-style `@username`) **or** email — normalized lowercase, reserved-word blocklist |
| State | Zustand (client caches; DB is the source of truth; only `wh_shifts` mirrors to localStorage) |
| Backend | Next.js Server Actions in `app/actions/*` (almost no REST routes) |
| Mail | SMTP (nodemailer) — verification, reset, welcome, admin emails |
| Deploy | Vercel (HTTPS) or Docker (`docker compose up -d --build`) |

## 3. Row ID scheme (important invariant)

All shift/job/template rows use **user-prefixed IDs** minted by `lib/ids.ts`:

```
{handle}_{prefix}{seq}   e.g.  nithesh_j1, nithesh_tpl2, nithesh_s59
```

- Two identifiers must never be confused:
  - `dbUserId` — internal User.id (uuid) — what FK columns store
  - `owner` — the public handle — what the ID prefix uses
    (falls back to the internal id if the user has no handle)
- The seq is derived from `MAX(seq)` per user+prefix inside a transaction;
  unique-violations (P2002) are retried via `withUniqueRetry`
- Handles may contain underscores (`nithesh_99_s1` is valid) — suffix math
  is relative to the full `{owner}_{prefix}` literal, never `POSITION('_')`
- Raw SQL notes: FK columns are camelCase `"userId"` (uuid) on
  `user_shifts` / `user_jobs` / `user_templates`; the users table's handle
  column is `user_id` (text). `UserShift.templateId` is TEXT (uuid values
  from before the migration remain valid).

## 4. Feature status — verified working (2026-08-23)

Everything below was tested end-to-end through the real UI against the
production database (login → action → DB row verified):

- Register / login by handle or email; sessions persist on localhost and
  LAN HTTP (cookie `Secure` flag is derived from `x-forwarded-proto`, so
  plain-HTTP local use works and HTTPS deployments stay secure)
- Job manager: create (update/delete actions share the verified path)
- Shifts: create (custom + from template), edit, delete — all persist
  across reloads; calendar, weekly visa bar, and earnings update live
- Actual times: login/logout/breaks saved; per-minute pay verified
  (4h10m @ ¥1,100/h → ¥4,583)
- Templates: create, apply from Templates tab and from the FAB
- Expenses: quick-entry, category tree (33 seeded defaults), monthly list,
  in-place refresh after save
- Budget: earned / spent / remaining, category waterfall with status
- Import: legacy v6.3 backups (including the mixed `shifts{}` shapes and
  `entries[]`-only files), current v6.4 exports; replace and merge modes;
  idempotent round-trips; duplicate shifts merge keeping the copy with
  actual times; category trees rebuild correctly (no duplication)
- Export: v6.4 JSON bundle + multi-table CSV

## 5. Stabilization pass — bugs fixed (2026-08-23)

1. **ID minting SQL** — wrong FK column name (`user_id` vs `"userId"`),
   missing `::uuid` / `::int` casts, underscore-handle crash. Job creation
   had been failing entirely.
2. **`UserShift.templateId`** was still a uuid column after prefixed IDs
   shipped — every template-applied shift failed (22P02). Migrated to TEXT.
3. **Session cookie** was always `Secure` under Docker (production build
   over plain HTTP) — Firefox rejected it, so nothing worked after login.
4. **Templates tab "Apply"** was an unwired stub — faked a save, persisted
   nothing. Now writes through `createShifts` with `templateId` + source.
5. **Shift edit/delete were local-only** — rows resurrected on sync.
   Added `updateShiftFields` / `deleteShiftById` server actions + wiring.
6. **Import failures were swallowed** — failed chunks logged to console
   and the summary reported source days as imported. Now reported as
   failures with real inserted counts.
7. **P2028 transaction timeout** — 100-shift import chunks exceeded
   Prisma's default 5s interactive-transaction timeout. Raised to 60s.
8. **Category duplication on replace-mode import** — categories were never
   wiped (33 → 66 → 99 …). Replace mode now wipes expenses+categories
   (expenses first: they hold the FKs).
9. **Budget view** — categories never loaded when landing on Budget first,
   and were read non-reactively; expenses showed ¥0 forever.
10. **Expense list staleness** — cache-bust invalidated but never
    refetched; list only updated on reload.
11. **UTC date default** — `todayISO()` used `toISOString()`, so entries
    made between midnight and 09:00 JST defaulted to yesterday.
12. **Import hardening** — template IDs remapped (no raw foreign IDs),
    goal IDs stripped (global PK collisions), non-date shift keys skipped.

## 6. Known limitations (accepted, not broken)

- **Goal creation UI** resolved — `prompt()` chain replaced with `GoalFormModal` (v7.2).
- CSV import and expenses/goals import with populated data are code-reviewed
  but not yet exercised with large real files.
- Admin pages (`/admin/*`) exist and are role-guarded but were not part of
  the latest UI regression.
- If the app auto-seeds default categories while a replace-import is
  mid-flight, a small duplicate set is possible (narrow race).
- Old migration-history docs (v6.3/v6.4) remain locally gitignored by design.

## 7. Roadmap (merged from the v7 plan)

**Shipped**
- v6.4 — localStorage → Neon Postgres migration (all data server-side)
- v7.0 — admin role, `/admin` area (users, audit log), server-side guards
- v7.1 — user feedback form, `/admin/feedback`, email logging (`/admin/emails`)
- 2026-08 — handle-based login, user-prefixed row IDs, full stabilization
  pass (this document)

**Next versions**
- **v7.2** — smart weekly visa guard (engine + dialog + settings toggle); payday forecast; improved goal planner; admin-editable App Info card
  - Visa guard: prospective week projection warns *before* saving shifts that would push a week over 24h (near) or 28h (over). Wired into ShiftEntryModal / ApplyTemplateModal / DayModal. `User.visaGuardEnabled` toggle in Account settings.
  - Goal planner: `GoalFormModal` replaces the old `window.prompt()` chain.
  - App Info card: admins edit the user-facing "System & App Information" card on the Account page directly from `/admin/settings` (Version, Weekly Hour Limit, School Target, Database, Active Window, Developers). Backed by the `AppInfo` singleton row; edits audited as `admin.update_app_info`.
- **v7.3** — recurring bills; bill reminders; monthly budget forecast
- **v7.4** — monthly report page; PDF export; full account export; account delete
- **v7.5** — job-specific paydays; transport reimbursement; break rules; multi-job forecast
- **v7.6** — in-app reminders; PWA install polish; offline read-only
- **v7.7** — rule-based + AI spending insights; receipt upload/OCR

Suggested v7.2 quick wins from the stabilization pass: replace the
`prompt()` goal form with a proper modal (add deadline validation), and
add an import-preview/dry-run before replace mode wipes data.

**2026-08-31 — App Info card made admin-editable.** `AppInfo` Prisma
model (singleton id=1) holds the 6 user-facing fields shown on every
Account page. Admins edit via `/admin/settings → User-Facing App Info
Card`. All edits audited. New helper: `node scripts/db-push.sh.js`
to push schema + regenerate client against the running container.

## 8. Dev quick reference

```bash
npm run dev                      # local dev
docker compose up -d --build     # production container (port 3000)
npm run prisma:generate          # Windows: uses the realpath patch
npx prisma migrate deploy        # apply migrations
```

- `.env` needs `DATABASE_URL`, `SMTP_*`, `EMAIL_FROM`, `APP_URL`
- First admin: `UPDATE users SET role='ADMIN' WHERE email='…'`
- Import/export spec details live in `IMPORT_EXPORT_SPEC.md`
  (older planning docs are gitignored, kept for history only)
