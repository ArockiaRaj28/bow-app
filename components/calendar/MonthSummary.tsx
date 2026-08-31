'use client'

import { useMemo } from 'react'
import type { Job } from '@/types'
import { dateKey } from '@/lib/dateUtils'
import { getDayHours, getNightHours, getDayEarnedScheduled, getDayEarnedActual, hasActualTimes } from '@/lib/dayHours'
import { formatHours, formatYen } from '@/lib/timeUtils'

interface Props { curY: number; curM: number; jobs: Job[] }

export default function MonthSummary({ curY, curM, jobs }: Props) {
  const stats = useMemo(() => {
      const daysInMonth = new Date(curY, curM + 1, 0).getDate()
      let hours = 0
      let scheduledEarned = 0
      let actualEarned = 0
      let hasActualsAnywhere = false
      let days = 0
      const jobSet = new Set<string>()

      for (let d = 1; d <= daysInMonth; d++) {
        const dk = dateKey(curY, curM, d)
        if (hasActualTimes(dk)) hasActualsAnywhere = true
        scheduledEarned += getDayEarnedScheduled(dk, jobs)
        actualEarned    += getDayEarnedActual(dk, jobs)
        let dayHours = 0
        for (const j of jobs) {
          const total = getDayHours(dk, j.id)
          hours += total
          dayHours += total
          if (total > 0) jobSet.add(j.id)
        }
        if (dayHours > 0) days++
      }

      const showActualLine = hasActualsAnywhere && Math.abs(actualEarned - scheduledEarned) > 0.5
      return {
        hours,
        scheduledEarned: Math.round(scheduledEarned),
        actualEarned: Math.round(actualEarned),
        showActualLine,
        days,
        jobCount: jobSet.size,
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [curY, curM, jobs])

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, marginBottom: 8 }}>
        <div style={{
          background: 'var(--card)', borderRadius: 8, padding: '8px 6px', textAlign: 'center',
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{formatHours(stats.hours)}</div>
          <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hours</div>
        </div>
        <div style={{
          background: 'var(--card)', borderRadius: 8, padding: '8px 6px', textAlign: 'center',
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#34d399' }}>{formatYen(stats.scheduledEarned)}</div>
          <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Earned</div>
          {stats.showActualLine && (
            <div
              title="Per-minute actual earnings"
              style={{ fontSize: 9, fontWeight: 700, color: 'var(--info)', marginTop: 2 }}
            >
              ⏱ {formatYen(stats.actualEarned)}
            </div>
          )}
        </div>
        <div style={{
          background: 'var(--card)', borderRadius: 8, padding: '8px 6px', textAlign: 'center',
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{String(stats.days)}</div>
          <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Days</div>
        </div>
        <div style={{
          background: 'var(--card)', borderRadius: 8, padding: '8px 6px', textAlign: 'center',
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{String(stats.jobCount)}</div>
          <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Jobs</div>
        </div>
      </div>
    )
  }
