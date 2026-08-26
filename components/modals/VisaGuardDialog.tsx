'use client'

import { AlertTriangle } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import type { WeekProjection } from '@/features/visa/visaEngine'
import { getVisaStatusDisplay } from '@/features/visa/visaEngine'
import { formatHours } from '@/lib/timeUtils'

interface Props {
  weeks: WeekProjection[]
  onConfirm: () => void   // "Add anyway"
  onCancel: () => void
}

function fmtRange(ws: Date): string {
  const end = new Date(ws)
  end.setDate(end.getDate() + 6)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const a = `${months[ws.getMonth()]} ${ws.getDate()}`
  const b = end.getMonth() === ws.getMonth() ? `${end.getDate()}` : `${months[end.getMonth()]} ${end.getDate()}`
  return `${a}–${b}`
}

/**
 * Pre-save warning shown when pending shifts would push any Mon–Sun week
 * to ≥ 24h ("near") or over the 28h visa limit. Warns — never blocks;
 * the user can always choose "Add anyway".
 */
export default function VisaGuardDialog({ weeks, onConfirm, onCancel }: Props) {
  const worst = weeks.some(w => w.status === 'over') ? 'over' : 'near'
  const c = worst === 'over' ? '#fca5a5' : '#fbbf24'
  const ring = worst === 'over' ? 'rgba(239,68,68,0.30)' : 'rgba(245,158,11,0.30)'
  const bg = worst === 'over' ? 'rgba(239,68,68,0.09)' : 'rgba(245,158,11,0.09)'

  return (
    <Modal
      title={worst === 'over' ? '⚠ Over the 28-hour limit' : '⚡ Close to the 28-hour limit'}
      onClose={onCancel}
      maxWidth={460}
      footer={
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <div style={{ flex: 1 }} />
          <button onClick={onCancel} style={btnSecondary}>Cancel</button>
          <button onClick={onConfirm} style={btnDanger}>Add anyway</button>
        </div>
      }
    >
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{
          display: 'flex', gap: 10, alignItems: 'flex-start',
          background: bg, border: `1px solid ${ring}`, borderRadius: 12,
          padding: '10px 12px',
        }}>
          <AlertTriangle size={18} color={c} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5 }}>
            {worst === 'over'
              ? 'These shifts put a week OVER the 28h limit on a student part-time permit.'
              : 'These shifts bring a week close to the 28h limit on a student part-time permit.'}
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
              Only you can see this — the shifts are still saved if you continue.
            </div>
          </div>
        </div>

        {weeks.map((w, i) => {
          const d = getVisaStatusDisplay(w.status)
          return (
            <div key={i} style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '10px 12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>Week of {fmtRange(w.weekStart)}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: d.color }}>{d.label}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                {formatHours(w.currentHours)} now
                <span style={{ color: 'var(--text)' }}> → {formatHours(w.projectedHours)}</span>
                {' '}after saving <span style={{ color: 'var(--accent)' }}>(+{formatHours(w.addedHours)})</span>
                {' '}· limit 28h
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

const btnDanger: React.CSSProperties = {
  padding: '10px 16px', borderRadius: 10,
  background: 'rgba(239,68,68,0.16)', border: '1px solid rgba(239,68,68,0.35)',
  color: '#fca5a5', fontSize: 13, fontWeight: 700, cursor: 'pointer',
}

const btnSecondary: React.CSSProperties = {
  padding: '10px 14px', borderRadius: 10,
  background: 'rgba(255,255,255,0.07)', border: '1px solid var(--border)',
  color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
