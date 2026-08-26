# Plan — v7.2 Smart Weekly Visa Guard

> Next task after the goal planner (shipped). This document is the
> implementation plan; work through the phases in order. Each phase ends
> with something verifiable in the running app.
> Created: 2026-08-25 · Status: not started

---

## 1. Goal

Today the 28h/week visa limit is **passive**: `VisaBar` shows the current
week's hours after shifts exist. Users find out they over-scheduled only
when the bar turns red.

The Smart Visa Guard makes the check **prospective**: at shift-entry time
the app computes what each affected week *would* total if the new shifts
are saved, and warns before the write — with a per-week breakdown and an
explicit "add anyway" choice.

**Non-goals (deliberate):**
- No hard blocking — some users legitimately track jobs the app can't see;
  the guard warns, the user decides.
- No changes to how hours are *calculated* (the night-pay engine and
  `getWeekHours` stay untouched).

## 2. Existing pieces we build on (verified locations)

| Piece | Where | Notes |
|---|---|---|
| Week hours calc | `features/visa/visaEngine.ts` — `getWeekHours(weekStart, jobs)`, `VisaStatus` ('safe'/'near'/'over'), `wouldBreachLimit()` (currently unused) | weeks are Mon–Sun via `getWeekStart` (`lib/dateUtils.ts:41`) |
| Day hours source | `lib/dayHours.ts` bridge over the shifts store | already used by VisaBar |
| Entry points to guard | `components/fab/modals/ShiftEntryModal.tsx` (custom + from-template), `components/templates/ApplyTemplateModal.tsx` (template apply), `DayModal` quick-fill | all funnel into `createShifts` (`app/actions/shifts.ts`) |
| Warning modal precedent | `components/modals/VisaWarningModal.tsx` + `openModal === 'visaWarning'` in AppShell | reuse its visual language |
| Thresholds (docs §SECTION 7) | < 24h green · ≥ 24h yellow "near" · > 28h red "over" | keep identical semantics |

## 3. Design

### 3.1 New engine helper — `projectWeekHours`

In `features/visa/visaEngine.ts`:

```ts
export interface WeekProjection {
  weekStart: Date            // Monday 00:00 local
  currentHours: number       // hours already logged that week
  addedHours: number         // hours the pending shifts add
  projectedHours: number     // current + added
  status: VisaStatus         // of the PROJECTED total
}

export function projectWeeksForShifts(
  pending: { date: string; jobId: string; start: string; end: string }[],
  jobs: Job[],
): WeekProjection[]
```

- Group pending shifts by their week (`getWeekStart(parseDate(date))`).
- `currentHours` from the existing shifts store (via `lib/dayHours.ts`,
  same numbers the VisaBar shows — no second source of truth).
- `addedHours` per pending shift via the same duration math used in
  `calcShiftHours` (breaks subtract; actual times not relevant at
  schedule time).
- One `WeekProjection` per affected week, sorted by weekStart.

### 3.2 Shared warning component — `VisaGuardDialog`

New `components/modals/VisaGuardDialog.tsx`:
- Lists each affected week: `Mon 24 – Sun 30 Aug · now 18h → 26h after saving (⚡ Near)`.
- Color per projected status (existing token colors).
- Body line: "Students on a part-time permit may work up to 28h/week."
- Buttons: **Cancel** (default) / **Add anyway**.
- Same dark styling family as `VisaWarningModal`; rendered from local
  state in each entry modal (no new app-store modal type needed).

### 3.3 Wiring into the three entry points

**ShiftEntryModal (covers FAB custom, FAB from-template, and its preview):**
- In the `preview` useMemo, also compute `projectWeeksForShifts(inputs, jobs)`.
- Footer chip when any week projects ≥ 24h:
  `⚠ 26h/28h week of Aug 24` (yellow ≥ 24, red > 28).
- On Save: if any projected status is 'near' or 'over', show
  `VisaGuardDialog` first; "Add anyway" proceeds to `addShiftsToDB`.

**ApplyTemplateModal:** same projection over `selectedDates` × template
hours before `Save N shifts`; dialog on threshold.

**DayModal quick-fill:** single shift; show the inline chip only (a full
dialog for one shift is heavy) — same rule as ShiftEntryModal footer.

### 3.4 Settings toggle

Add "Visa guard warnings" to the Settings section in Account
(next to Per-Minute Pay), stored on `User` via a new boolean column
`visaGuardEnabled` (default `true`) — schema + migration + server action
`setVisaGuardEnabled` mirroring `setActualTimesEnabled`
(`app/actions/account.ts:146`). The AppShell hydrates it into
`useAppStore` like `perMinutePay`. Guards respect the flag; the chip
and dialog simply don't render when off.

## 4. Phases

**Phase 1 — Engine (pure logic, no UI)**
1. Add `projectWeeksForShifts` + types to `visaEngine.ts`.
2. Node-level sanity script against a seeded store shape
   (0h→10h safe, 22h→26h near, 27h→30h over, cross-week template spans).

**Phase 2 — ShiftEntryModal guard**
3. Projection in preview; footer chip; VisaGuardDialog on save.
4. Browser E2E: seed a week to 20h, add a 6h shift → chip "26h/28h ⚡",
   dialog on save, Cancel aborts, Add anyway persists (DB row present),
   VisaBar then shows 26h.

**Phase 3 — ApplyTemplateModal + DayModal chip**
5. Same flow for template apply (multi-week case included).
6. DayModal quick-fill chip.
7. E2E for both.

**Phase 4 — Settings toggle + docs**
8. Schema/migration/action/store wiring; toggle UI in Account settings.
9. E2E: toggle off → no chip/dialog; toggle on → returns.
10. Update `PROJECT_STATUS.md` (feature shipped + how it works);
    check off this plan.

## 5. Acceptance criteria

- [ ] Adding shifts that keep every affected week < 24h → no warning of
      any kind (zero noise).
- [ ] ≥ 24h projected → yellow chip + dialog; > 28h → red.
- [ ] Dialog shows per-week breakdown when shifts span multiple weeks.
- [ ] Cancel saves nothing; Add anyway saves exactly the pending shifts.
- [ ] Works from FAB custom, FAB from-template, Templates-tab apply,
      DayModal quick-fill.
- [ ] Toggle disables all guard UI; VisaBar behavior unchanged always.
- [ ] `tsc --noEmit` clean; Docker rebuild; all flows E2E-verified
      against the real DB; committed and pushed.

## 6. Risks / notes

- **Hours source consistency**: must read the same store the VisaBar
  reads (`lib/dayHours.ts`), or the chip will disagree with the bar.
- **Timezone**: week bucketing uses local dates like the rest of the app
  (`getWeekStart`); pending `date` keys are already local `YYYY-MM-DD`.
- **Performance**: projection is in-memory over one week of shifts —
  trivial; recompute only when `selectedDates`/times change.
- After this: **payday forecast** is the remaining v7.2 item
  (plan it separately when this ships).
