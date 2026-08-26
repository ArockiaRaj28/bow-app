'use client'

import type { Job } from '@/types'
import { formatYen } from '@/lib/timeUtils'
import { mutedBar, mutedChipBg, mutedText } from '@/lib/colorUtils'

export default function JobLegend({ jobs }: { jobs: Job[] }) {
  if (!jobs.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
      {jobs.map((j) => (
        <div key={j.id} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: mutedChipBg(j.color),
          borderRadius: 6, padding: '4px 8px',
          border: `1px solid ${mutedBar(j.color)}55`,
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: mutedBar(j.color),
            boxShadow: `0 0 4px ${mutedBar(j.color)}66`,
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: mutedText(j.color) }}>{j.name}</span>
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>
            {formatYen(j.rate)}/h · N:{formatYen(j.nightRate || Math.round(j.rate * 1.25))}/h
          </span>
        </div>
      ))}
    </div>
  )
}
