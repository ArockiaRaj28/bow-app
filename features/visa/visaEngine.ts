// ═══════════════════════════════════════════
// Visa Compliance Engine — BOW v6.3
// Japan student visa: 28h/week limit
// Week = Monday to Sunday
// ═══════════════════════════════════════════

import { getWeekStart, weekDays, dateKey } from '@/lib/dateUtils'
import { getDayHours } from '@/lib/dayHours'
import { CONFIG } from '@/lib/constants'
import type { Job } from '@/types'

export type VisaStatus = 'safe' | 'near' | 'over'

export interface WeekHoursResult {
  total: number
  status: VisaStatus
  remaining: number
  pct: number
}

/** Calculate total hours for a Mon–Sun week */
export function getWeekHours(weekStart: Date, jobs: Job[]): number {
  const days = weekDays(weekStart)
  let total = 0
  for (const d of days) {
    const dk = dateKey(d.getFullYear(), d.getMonth(), d.getDate())
    for (const j of jobs) total += getDayHours(dk, j.id)
  }
  return total
}

/** Get full visa status for current week */
export function getCurrentWeekStatus(jobs: Job[]): WeekHoursResult {
  const ws    = getWeekStart(new Date())
  const total = getWeekHours(ws, jobs)
  const remaining = Math.max(0, CONFIG.WEEKLY_HOUR_LIMIT - total)
  const pct   = Math.min(100, (total / CONFIG.WEEKLY_HOUR_LIMIT) * 100)

  let status: VisaStatus = 'safe'
  if (total > CONFIG.WEEKLY_HOUR_LIMIT) status = 'over'
  else if (total >= CONFIG.WEEK_NEAR_THRESHOLD) status = 'near'

  return { total, status, remaining, pct }
}

/** Check if adding N hours to current week would breach the limit */
export function wouldBreachLimit(addHours: number, jobs: Job[]): boolean {
  const ws    = getWeekStart(new Date())
  const total = getWeekHours(ws, jobs)
  return (total + addHours) > CONFIG.WEEKLY_HOUR_LIMIT
}

// ── Smart visa guard: prospective week projections ────────────────

export interface PendingShiftInput {
  date: string    // "YYYY-MM-DD" (local calendar date)
  jobId: string
  start: string   // "HH:MM"
  end: string     // "HH:MM"
}

export interface WeekProjection {
  weekStart: Date            // Monday 00:00 local
  currentHours: number       // hours already on the calendar that week
  addedHours: number         // hours the pending shifts would add
  projectedHours: number     // current + added
  status: VisaStatus         // status of the PROJECTED total
}

function hhmmToHours(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0
  let dur = h + m / 60
  if (dur <= 0) dur += 24 // overnight shift ending at/before 00:00
  return dur
}

/** Pending-shift duration in hours (scheduled times; breaks not known
 *  at guard time — consistent with how templates/quick-add schedule). */
export function pendingShiftHours(s: PendingShiftInput): number {
  return hhmmToHours(s.end) - hhmmToHours(s.start) || 0
}

/**
 * Project every week touched by the pending shifts: what it totals now,
 * what the pending shifts add, and the resulting visa status. Reads
 * existing hours through the same `getDayHours` bridge the VisaBar
 * uses, so the guard and the bar can never disagree.
 */
export function projectWeeksForShifts(
  pending: PendingShiftInput[],
  jobs: Job[],
): WeekProjection[] {
  const byWeek = new Map<string, { weekStart: Date; added: number }>()

  for (const s of pending) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.date)
    if (!m) continue
    const [, y, mo, d] = m
    const ws = getWeekStart(new Date(Number(y), Number(mo) - 1, Number(d)))
    const key = dateKey(ws.getFullYear(), ws.getMonth(), ws.getDate())
    const entry = byWeek.get(key) ?? { weekStart: ws, added: 0 }
    entry.added += pendingShiftHours(s)
    byWeek.set(key, entry)
  }

  const out: WeekProjection[] = []
  for (const { weekStart, added } of byWeek.values()) {
    const currentHours = getWeekHours(weekStart, jobs)
    const projectedHours = currentHours + added
    let status: VisaStatus = 'safe'
    if (projectedHours > CONFIG.WEEKLY_HOUR_LIMIT) status = 'over'
    else if (projectedHours >= CONFIG.WEEK_NEAR_THRESHOLD) status = 'near'
    out.push({ weekStart, currentHours, addedHours: added, projectedHours, status })
  }
  return out.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
}

/** Get visa status label and color */
export function getVisaStatusDisplay(status: VisaStatus) {
  return {
    safe: { label: '✓ Safe',    color: '#10b981' },
    near: { label: '⚡ Near',   color: '#f59e0b' },
    over: { label: '⚠ OVER!',  color: '#ef4444' },
  }[status]
}
