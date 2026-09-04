# Plan: Payday Forecast (v7.3.0)

> Surface upcoming payday earnings per job, based on `UserJob.payday`
> (day-of-month), logged shifts, and the existing per-minute/night-pay
> engine — directly on the Summary tab so users see "what's coming"
> before the month closes.

## 1. Goal & scope

**Goal.** Let every BOW user answer *"how much will I earn before my
next payday?"* without opening the calendar or counting shifts by
hand.

**In scope (v7.3.0, ships together).**
- New `payday` column on `UserJob` (1–31, nullable — see §3).
- "Pay day" field on `JobManagerModal` (mandatory for new jobs).
- `features/payday/paydayEngine.ts` — pure-function engine that takes
  the user's jobs + shifts + today's date and returns a forecast list.
- Summary tab "Upcoming Paydays" card — same UI style as the existing
  BudgetView/SummaryView cards.
- One new Prisma migration; no breaking changes to existing tables.

**Out of scope.**
- Multi-job compare (v7.5.0).
- Dashboard widget (v7.3.0 separate feature `Income summary widget`).
- Bill reminders (separate v7.3.0 feature).

## 2. User-facing behaviour

### Create/edit job

`JobManagerModal` adds a new row: **Pay day (1–31)** — number input,
required. Validation: 1 ≤ value ≤ 31, integer.

- **Existing jobs without a payday**: the engine treats `payday = null`
  as "skip in forecast" (so users see no number instead of a wrong one)
  AND the modal shows a yellow notice: *"Add a pay day to see this job
  in your payday forecast."* — with a one-click "Use 25" button.
- Once set, the value is saved on the next `updateJob` call.

### Summary tab — new card

A new card titled **Upcoming Paydays**, slotted above the existing
"This month" card. Contents:

```
┌─ Upcoming Paydays ─────────────────────────────────┐
│  Next payday: Wed Sep 25 (in 12 days)              │
│                                                    │
│  McDonald's (¥1,100/h)                              │
│   Scheduled shifts  ¥22,000                         │
│   + Night premium   ¥ 4,125                         │
│   = Expected total  ¥26,125                         │
│                                                    │
│  Tutorial (¥2,500/h)                                │
│   Scheduled shifts  ¥10,000                         │
│   = Expected total  ¥10,000                         │
│                                                    │
│  ── Combined expected: ¥36,125 ────────────────────│
└────────────────────────────────────────────────────┘
```

If a job has no `payday`, it shows in the list with a small *"Add pay
day"* chip instead of an amount.

If there are no future shifts before the next payday, the card shows
*"No upcoming shifts — next payday projection will update when you
log shifts."*

### Empty states

- **No jobs** → hide the card.
- **Jobs but no `payday` set** → card shows *"Add a pay day to your
  jobs to see the forecast."* with a button → opens `JobManagerModal`.
- **All jobs have paydays but no future shifts** → see above.

## 3. Data model change

### Prisma — `UserJob`

Add column:

```prisma
/// Day-of-month the user is paid (1-31). Nullable because existing
/// jobs were created before this field existed; the engine treats
/// null as "exclude from forecast" so the UI degrades gracefully.
payday  Int?  @map("payday")
```

Migration name: `20260901000000_user_job_payday`.

### Server actions — `app/actions/jobs.ts`

- Add `payday?: number | null` to `JobData`.
- `validateJobData` rejects `payday` outside 1–31.
- Update `mapJob` to include `payday` in the response.
- `fetchJobsFromDB` already calls `mapJob` — no extra work needed.

### Client store — `store/useJobsStore.ts`

Add `payday` to the `Job` type so the UI can read it.

## 4. Engine — `features/payday/paydayEngine.ts`

Pure functions, no DB access (data passed in). Reuses
`lib/nightPayEngine.calcShiftEarned`.

```ts
export interface PaydayForecast {
  jobId: string
  jobName: string
  jobColor: string
  rate: number         // base hourly rate
  nightRate: number    // night premium rate
  payday: number | null
  nextPaydayDate: Date | null
  shiftsInWindow: number
  scheduledEarned: number
  nightPremiumEarned: number
  totalExpected: number
  daysUntil: number | null
}

export interface PaydayForecastResult {
  today: Date
  jobs: PaydayForecast[]
  combinedExpected: number
  nextPaydayDate: Date | null
  daysUntilNext: number | null
}
```

### Pure helpers (export & test)

- `nextPaydayDate(today, dayOfMonth)` — returns the next instance of
  `dayOfMonth` ≥ `today`. Handles month rollover (e.g. today is Aug 31
  and payday is 15 → returns Sep 15). Handles edge cases: if
  `dayOfMonth` doesn't exist in a month (e.g. 31 → Feb) → use last day
  of that month.
- `daysBetween(a, b)` — calendar days, midnight-anchored.

### Main function

```ts
export function projectPaydays(input: {
  today: Date
  jobs: JobRow[]
  shifts: UserShiftRow[]
}): PaydayForecastResult
```

For each job:
1. If `payday == null` → emit a row with `totalExpected: 0` and
   `payday: null` (UI handles the "Add pay day" state).
2. Else compute `nextPaydayDate(today, job.payday)`.
3. Filter `shifts` where `date >= today && date <= nextPaydayDate`
   (and `jobId === job.id`).
4. For each shift: `calcShiftEarned(shift, job)` returns total yen.
   Night premium split = `(nightRate - rate) * nightHours`.
5. Sum `scheduledEarned`, `nightPremiumEarned`, `totalExpected`.

Edge cases:
- `shifts` may use `actualStart/actualEnd` — `calcShiftEarned` handles
  that (it's the same function the calendar uses).
- Shifts with no start time → excluded from forecast (no amount to
  project).
- Cross-month: if `today = Aug 30` and `payday = 5`, window is
  `[Aug 30, Sep 5]` — same logic, `nextPaydayDate` returns Sep 5.

### Unit-test sketch (we don't ship tests in v7.3 — verify with seed data)

`pnpm tsx -e '...'` against the production engine with a fixture of
3 jobs + 6 shifts across the next payday window.

## 5. UI — `components/summary/PaydayForecastCard.tsx`

Client component (matches existing SummaryView style). Reads from
`useJobsStore` + `useShiftsStore`. Calls `projectPaydays(...)` in a
`useMemo` on `[today, jobs, shifts]`.

Layout: matches `components/budget/BudgetView.tsx` card pattern —
`background: var(--card)`, `border: 1px solid var(--border)`,
`borderRadius: 16`, internal `cardHeaderStyle` for the title, then
per-job rows with the same `infoBoxStyle` for amounts.

Use existing icons (`Calendar`, `TrendingUp`, `Coins` from `lucide-react`)
to match the rest of the app.

## 6. JobManagerModal changes

Add a new field row after `Night rate`:

```tsx
<HorizontalRow label="Pay day" icon="📅" description="What day of the month are you paid?">
  <input
    type="number"
    min={1}
    max={31}
    value={j.payday ?? ''}
    onChange={(e) => {
      const v = e.target.value === '' ? null : Math.max(1, Math.min(31, Number(e.target.value)))
      updateRow(i, 'payday', v)
    }}
    placeholder="25"
    required
    style={inputStyle}
  />
</HorizontalRow>
```

Mark the input `required` for **new** jobs. For **existing** jobs with
`payday = null`, render the yellow notice instead of an error.

## 7. Implementation order (sequential)

1. **DB** — Prisma column + migration + push to Neon.
2. **Action** — extend `JobData`, validate, `mapJob`.
3. **Store** — add `payday` to `Job` type in `useJobsStore`.
4. **JobManagerModal** — add field + yellow notice for null.
5. **Engine** — `features/payday/paydayEngine.ts` (pure, no UI).
6. **UI card** — `PaydayForecastCard.tsx` + slot into `SummaryView`.
7. **Smoke test** — create job with payday, log a future shift,
   confirm card renders correct amount.
8. **Commit + push** (one commit, all parts).
9. **Tracker** — flip both Payday forecast features from `○` to `✓`.

## 8. Files touched (estimate)

| File | Action |
|---|---|
| `prisma/schema.prisma` | Add `payday Int?` to UserJob |
| `prisma/migrations/20260901000000_user_job_payday/` | New migration |
| `app/actions/jobs.ts` | Add `payday` to JobData, validate, mapJob |
| `store/useJobsStore.ts` | Add `payday` to Job type |
| `components/modals/JobManagerModal.tsx` | New "Pay day" field + null notice |
| `features/payday/paydayEngine.ts` | New — pure engine |
| `components/summary/PaydayForecastCard.tsx` | New — UI card |
| `components/summary/SummaryView.tsx` | Slot the new card |

## 9. Risks & mitigations

- **Existing rows have no payday.** Mitigation: column is nullable,
  engine emits zero-amount row, UI shows "Add pay day" notice — no
  data backfill needed.
- **Payday > days-in-month.** Mitigation: `nextPaydayDate` clamps to
  last day of that month (e.g. payday 31 in Feb → Feb 28/29).
- **Future-dated shifts** that get deleted before payday. Mitigation:
  forecast recomputes on every Summary render via `useMemo` — always
  reflects current store state.
- **Cross-timezone date math.** Mitigation: use `Date` with local
  server timezone (matches how shifts are dated today); document the
  assumption.

## 10. Acceptance criteria

- [ ] Creating a job requires `payday` (1–31). Empty input is rejected.
- [ ] Existing jobs with `payday = null` show the "Add pay day" notice.
- [ ] Summary tab shows the new card above the existing cards.
- [ ] Card hides entirely when the user has zero jobs.
- [ ] Forecast amount matches: sum of `calcShiftEarned(shift, job)`
      for every shift whose `date` is `[today, nextPaydayDate]`.
- [ ] Night premium row = `(nightRate - rate) * nightHours` summed
      across the same window.
- [ ] Combined total = sum of all jobs' `totalExpected`.
- [ ] Migration applies cleanly to Neon (no data loss).
- [ ] Build passes; container recreates healthy.

## 11. Out of scope (deferred)

- Recurring bills, bill reminders, monthly budget forecast (v7.3.0
  separate features — depend on this engine being stable first).
- Multi-job compare-mode (v7.5.0).
- Dashboard widget (separate feature `Income summary widget`).
