'use client'

import type { Job, ShiftsStore } from '@/types'
import { useAppStore } from '@/store/useAppStore'
import { useShiftsStore } from '@/store/useShiftsStore'
import { dateKey, getWeekStart } from '@/lib/dateUtils'
import { getDayHours, getNightHours, getDayEarnedScheduled, getDayEarnedActual, hasActualTimes } from '@/lib/dayHours'
import { mutedBar, mutedChipBg, mutedText } from '@/lib/colorUtils'
import { formatHours, formatYen } from '@/lib/timeUtils'
import { CONFIG } from '@/lib/constants'

interface Props {
  day: Date | null
  isToday: boolean
  isOrientation: boolean
  jobs: Job[]
  shifts: ShiftsStore
  curM: number
}

export default function CalendarCell({ day, isToday, isOrientation, jobs, shifts, curM }: Props) {
  const { setModal, perMinutePay, theme } = useAppStore()

  if (!day) return <div />  // empty filler cell

  const dk = dateKey(day.getFullYear(), day.getMonth(), day.getDate())
  const isOtherMonth = day.getMonth() !== curM

  // Calculate hours per job
  const jobHours = jobs.map(j => ({
    job: j,
    total: getDayHours(dk, j.id),
    night: getNightHours(dk, j.id),
  })).filter(jh => jh.total > 0)

  const totalHours = jobHours.reduce((s, jh) => s + jh.total, 0)
  const scheduledEarned = getDayEarnedScheduled(dk, jobs)
  const actualEarned    = getDayEarnedActual(dk, jobs)
  const showActualLine  = hasActualTimes(dk) && Math.abs(actualEarned - scheduledEarned) > 0.5

  // Week hours for over-limit check
  const ws = getWeekStart(day)
  const weekTotal = (() => {
    let wt = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(ws); d.setDate(d.getDate() + i)
      const wdk = dateKey(d.getFullYear(), d.getMonth(), d.getDate())
      jobs.forEach(j => { wt += getDayHours(wdk, j.id) })
    }
    return wt
  })()
  const isOverLimit = weekTotal > CONFIG.WEEKLY_HOUR_LIMIT

  const hasShifts = (shifts[dk]?.length || 0) > 0
  const hasActuals = (shifts[dk] || []).some(s => s.actualLogin && s.actualLogout)

  const handleClick = () => {
    if (isOrientation) return
    setModal('day', dk)
  }

  return (
    <div
      onClick={handleClick}
      style={{
        minHeight: 64,
        border: `1px solid ${isToday ? 'var(--accent)' : isOverLimit && totalHours > 0 ? 'var(--red)' : 'var(--border)'}`,
        borderRadius: 8,
        background: isToday ? 'rgba(255,255,255,0.04)' : isOrientation ? 'rgba(245,158,11,0.07)' : 'var(--card)',
        boxShadow: isToday ? '0 0 0 1px var(--accent)' : 'none',
        padding: '5px 4px',
        cursor: isOrientation ? 'default' : 'pointer',
        opacity: isOtherMonth ? 0.35 : 1,
        fontSize: 10,
        display: 'flex', flexDirection: 'column', gap: 2,
        position: 'relative',
        transition: 'border-color 150ms ease, background-color 150ms ease',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Color bar */}
      {jobHours.length > 0 && (
        <div style={{ display: 'flex', height: 2, borderRadius: 1, overflow: 'hidden', gap: 1 }}>
          {jobHours.map(jh => (
            <div key={jh.job.id} style={{ flex: jh.total, background: mutedBar(jh.job.color, theme) }} />
          ))}
        </div>
      )}

      {/* Day number + badges */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: 11, fontWeight: isToday ? 800 : 600,
          color: isToday ? 'var(--accent)' : 'var(--text)',
        }}>
          {day.getDate()}
        </span>
        <div style={{ display: 'flex', gap: 2.5, alignItems: 'center' }}>
          {isToday && <span style={{ width: 4.5, height: 4.5, borderRadius: '50%', background: 'var(--accent)' }} />}
          {hasShifts && <span style={{ width: 4.5, height: 4.5, borderRadius: '50%', background: 'var(--success)' }} />}
          {hasActuals && (
            <span
              title="Per-minute actuals logged"
              style={{ width: 4.5, height: 4.5, borderRadius: '50%', background: 'var(--info)' }}
            />
          )}
        </div>
      </div>

      {/* Orientation label */}
      {isOrientation && (
        <div style={{ fontSize: 8, color: 'var(--yellow)', fontWeight: 700 }}>Orientation</div>
      )}

      {/* Job segments */}
      {jobHours.map(jh => (
        <div key={jh.job.id} style={{
          fontSize: 9, background: mutedChipBg(jh.job.color, theme),
          borderLeft: `2px solid ${mutedBar(jh.job.color, theme)}`,
          padding: '1px 3px', borderRadius: '0 3px 3px 0',
          color: mutedText(jh.job.color, theme), fontWeight: 700,
        }}>
          {jh.job.name.substring(0, 4)} {formatHours(jh.total)}
        </div>
      ))}

      {/* Earnings — scheduled (per-shift start/end) line + actual (per-minute) line when they differ */}
            {totalHours > 0 && (
              <div style={{ marginTop: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <div
                  title="Scheduled earnings (per-shift start/end × rate)"
                  style={{ fontSize: 9, color: 'var(--green2)', fontWeight: 700, opacity: 0.9 }}
                >
                  {formatYen(Math.round(scheduledEarned))}
                </div>
                {showActualLine && (
                  <div
                    title="Per-minute actual earnings (actualLogin/actualLogout × rate)"
                    style={{ fontSize: 8.5, color: 'var(--info)', fontWeight: 700, opacity: 0.95 }}
                  >
                    ⏱ {formatYen(Math.round(actualEarned))}
                  </div>
                )}
              </div>
            )}
    </div>
  )
}
