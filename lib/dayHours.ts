/**
 * Day-hours bridge: thin re-export of `useShiftsStore.dayTotals` accessors.
 *
 * Lives here so consumers don't have to manage the store import cycle,
 * and so the legacy `services/storage.ts` shim can be deleted entirely.
 * The `dayTotals` map is computed in-memory from the canonical `shifts`
 * map (which is hydrated from the `UserShift` table), so this is the DB
 * view, not a cache.
 */

import { useShiftsStore } from '@/store/useShiftsStore'
import { calcShiftEarned } from './nightPayEngine'
import type { Job } from '@/types'

/** Total hours for (dateKey, jobId). */
export function getDayHours(dk: string, jid: string): number {
  return useShiftsStore.getState().dayTotals[dk]?.[jid]?.total ?? 0
}

/** Night portion of hours for (dateKey, jobId). */
export function getNightHours(dk: string, jid: string): number {
  return useShiftsStore.getState().dayTotals[dk]?.[jid]?.night ?? 0
}

/** Raw shifts for a day (used by the per-day earnings helpers below). */
function getDayShifts(dk: string) {
  return useShiftsStore.getState().shifts[dk] ?? []
}

/** Scheduled (per-shift `start`/`end`) earnings for a day across all jobs.
 *  This is the amount the shift was *worth* — the value to use when no
 *  actualLogin/Logout has been logged yet. */
export function getDayEarnedScheduled(dk: string, jobs: Job[]): number {
  let total = 0
  for (const s of getDayShifts(dk)) {
    const job = jobs.find((j) => j.id === s.jobId)
    if (!job) continue
    // Pass an "actual-stripped" copy so calcShiftEarned falls back to
    // scheduled start/end/breaks.
    const scheduled = { ...s, actualLogin: undefined, actualLogout: undefined, actualBreaks: undefined }
    total += calcShiftEarned(scheduled, job)
  }
  return total
}

/** Per-minute actual earnings for a day across all jobs.
 *  Each shift with actualLogin/Logout is paid minute-by-minute (incl. any
 *  overrun past the scheduled clock-out). Shifts without actuals fall back
 *  to their scheduled value. When the day has no actuals at all this
 *  equals `getDayEarnedScheduled`. */
export function getDayEarnedActual(dk: string, jobs: Job[]): number {
  let total = 0
  for (const s of getDayShifts(dk)) {
    const job = jobs.find((j) => j.id === s.jobId)
    if (!job) continue
    total += calcShiftEarned(s, job)
  }
  return total
}

/** True iff any shift on this day has actualLogin + actualLogout set
 *  (i.e. per-minute mode produced a different number than scheduled). */
export function hasActualTimes(dk: string): boolean {
  return getDayShifts(dk).some((s) => !!(s.actualLogin && s.actualLogout))
}
