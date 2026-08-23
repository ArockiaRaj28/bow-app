'use client'

import { useAppStore } from '@/store/useAppStore'
import BrandLoader from '@/components/layout/BrandLoader'
import { useJobsStore } from '@/store/useJobsStore'
import { useShiftsStore } from '@/store/useShiftsStore'
import JobLegend from './JobLegend'
import VisaBar from './VisaBar'
import MonthSummary from './MonthSummary'
import CalendarGrid from './CalendarGrid'
import { DAY_NAMES_SHORT } from '@/lib/constants'

export default function CalendarView() {
  const { curY, curM } = useAppStore()
  const { jobs, jobsLoading } = useJobsStore()
  const { shifts } = useShiftsStore()

  // First boot: jobs still hydrating and nothing cached to paint yet —
  // show the branded loader instead of a bare, jobless calendar.
  if (jobsLoading && jobs.length === 0) {
    return <BrandLoader compact label="Loading calendar" />
  }

  return (
    <div style={{ padding: '12px 12px 0' }}>
      <JobLegend jobs={jobs} />
      <VisaBar curY={curY} curM={curM} jobs={jobs} />
      <MonthSummary curY={curY} curM={curM} jobs={jobs} />

      {/* Day-of-week header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {DAY_NAMES_SHORT.map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'var(--muted)', fontWeight: 700, padding: '4px 0' }}>
            {d}
          </div>
        ))}
      </div>

      <CalendarGrid curY={curY} curM={curM} jobs={jobs} shifts={shifts} />
    </div>
  )
}
