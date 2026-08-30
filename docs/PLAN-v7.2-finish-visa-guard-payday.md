# Plan — v7.2 (Finish) Smart Visa Guard + Payday Forecast

> Status: **in progress** — engine + dialog component already written in the
> working tree; nothing wires them yet. This plan is the completion roadmap
> for v7.2 and the next phase after it.
> Updated: 2026-08-30 · Prior plan: `docs/PLAN-v7.2-smart-visa-guard.md`

---

## 0. Where v7.2 actually stands today (verified)

| Piece | State |
|---|---|
| `features/visa/visaEngine.ts` — `projectWeeksForShifts`, `pendingShiftHours`, `WeekProjection`, `wouldBreachLimit` | ✅ written |
| `components/modals/VisaGuardDialog.tsx` | ✅ file exists (untracked) |
| Wiring into `ShiftEntryModal` / `ApplyTemplateModal` / `DayModal` | ❌ **not done** — zero callers |
| Settings toggle `visaGuardEnabled` (schema + action + store + UI) | ❌ not built |
| Payday forecast | ❌ not started |

> ⚠️ Working tree has **124 modified/untracked files** and is mid-flight. Also
> note: many files show LF→CRLF churn (e.g. `VisaBar.tsx`) — avoid committing
> line-ending-only noise; commit real changes separately.

---

## Phase A — Finish the Smart Visa Guard

### A1. Wire VisaGuardDialog into the three entry points
All three funnel into `createShifts` (`app/actions/shifts.ts`). Add a local
`guardState` (dismissed / pending / empty) in each:

1. **`components/fab/modals/ShiftEntryModal.tsx`** (covers FAB custom + FAB
   from-template + preview)
   - In the existing `preview` memo, also compute
     `projectWeeksForShifts(inputs, jobs)`.
   - Footer chip when any week projects ≥ 24h: `⚠ 26h/28h week of Aug 24`
     (yellow ≥ 24, red > 28).
   - On Save: if any `'near'` / `'over'`, render `VisaGuardDialog`; "Add
     anyway" proceeds; Cancel aborts.

2. **`components/templates/ApplyTemplateModal.tsx`** — same projection over
   `selectedDates` × template hours before "Save N shifts".

3. **`components/modals/DayModal.tsx`** quick-fill — inline chip only (single
   shift; full dialog is overkill).

### A2. Settings toggle `visaGuardEnabled`
- Prisma: add `visaGuardEnabled Boolean @default(true)` to `User`; migration.
- Server action `setVisaGuardEnabled` in `app/actions/account.ts`, mirroring
  `setActualTimesEnabled` (~line 146).
- Hydrate into `useAppStore` like `perMinutePay`; AppShell loads it.
- Toggle UI in Account → Settings (next to Per-Minute Pay).
- When off: chip + dialog never render. VisaBar is **always** unchanged.

### A3. Acceptance checks (from the prior plan)
- `<24h` everywhere → zero warning UI.
- `≥24h` → yellow chip + dialog; `>28h` → red.
- Multi-week projection (template spans weeks) shows per-week breakdown.
- Cancel saves nothing; "Add anyway" persists exactly the pending shifts.
- Toggle off → no guard UI; VisaBar unchanged.
- `tsc --noEmit` clean; Docker rebuild; E2E against real DB.

---

## Phase B — Payday Forecast (remaining v7.2 item)

_Detailed spec to be written when Phase A ships and we know exactly which
hooks the guard introduced. High-level shape only for now._

- **Goal:** show upcoming payday amounts per job, projected from logged shifts
  (scheduled + actual) so students can see what lands in their account.
- **Inputs:** `UserJob.payday` (new field: day-of-month) + per-minute/night
  pay engine + scheduled shifts ahead.
- **Outputs (Summary tab):** next payday date + forecast earnings per job, and
  a small "this month so far" line.
- Needs a new plan doc when started (like this one).

---

## Phase C — Housekeeping before/around shipping

1. Commit Phase A in clean, logically-separated commits (engine/dialog wiring,
   then settings toggle) — **not** the CRLF churn.
2. Update `PROJECT_STATUS.md`: mark `projectWeeksForShifts`/guard as shipped,
   tick the plan, record payday forecast as next.
3. Regenerate Prisma client + push schema; verify `npm run lint` and
   `npm run build` pass.
4. Docker rebuild + smoke test via the GUI → confirm containers/images reflect
   the new build.

---

## Risks / notes

- **Hours-source consistency** — guard must read the same `lib/dayHours.ts`
  bridge the VisaBar reads, or chip/bar disagree.
- **Timezone** — week bucketing uses local `getWeekStart`; pending `date` keys
  are already local `YYYY-MM-DD`.
- **Mid-flight working tree** — 124 files dirty; commit incrementally and
  don't sweep unrelated changes into a v7.2 commit.
- **`prompt()` goal UX debt** (from `PROJECT_STATUS.md` §6) is still open —
  defer; not part of v7.2.