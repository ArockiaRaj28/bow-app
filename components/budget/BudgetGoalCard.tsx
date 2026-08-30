'use client'

import { useState } from 'react'
import type { BudgetGoal } from '@/types'
import { useBudgetStore } from '@/store/useBudgetStore'
import { formatYen } from '@/lib/timeUtils'
import ProgressBar from '@/components/ui/ProgressBar'
import StatusBadge from '@/components/ui/StatusBadge'

interface Props {
  goal: BudgetGoal
  monthKey: string
  monthlyAllocated: number
  savings: number
  /** Opens the GoalFormModal for this goal (edit name/target/deadline/%). */
  onEdit: () => void
}

export default function BudgetGoalCard({ goal, monthKey, monthlyAllocated, onEdit }: Props) {
  const { deleteGoal } = useBudgetStore()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const daysLeft = Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000)
  const pctComplete = goal.target > 0 ? Math.min(100, (goal.cumulativeAmount / goal.target) * 100) : 0

  const barColor = goal.status === 'completed' ? 'var(--success)' : goal.status === 'urgent' ? 'var(--warning)' : 'var(--accent)'

  return (
    <div style={{ background: 'var(--card)', borderRadius: 10, padding: 12, marginBottom: 8, border: `1px solid ${barColor}30` }}>
      {/* Row 1 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{goal.name}</div>
          <div style={{ fontSize: 10, color: 'var(--muted)' }}>
            Target: {formatYen(goal.target)} · Due: {goal.deadline}
            {daysLeft > 0 && ` (${daysLeft} days left)`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <StatusBadge status={goal.status} />
          <button
            onClick={onEdit}
            aria-label={`Edit goal ${goal.name}`}
            title="Edit goal"
            style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 14, cursor: 'pointer' }}
          >
            ✏️
          </button>
          {confirmDelete ? (
            <button
              onClick={() => void deleteGoal(monthKey, goal.id)}
              style={{
                background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.35)',
                color: '#fca5a5', padding: '1px 7px', borderRadius: 6,
                fontSize: 10, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Sure?
            </button>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              aria-label={`Delete goal ${goal.name}`}
              title="Delete goal"
              style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 14, cursor: 'pointer' }}
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {/* This month allocation */}
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
        This month: <strong style={{ color: 'var(--accent)' }}>{goal.percentage}%</strong> of savings = <strong style={{ color: 'var(--green2)' }}>{formatYen(monthlyAllocated)}</strong>
      </div>

      {/* Cumulative progress */}
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
        Saved: <strong style={{ color: 'var(--green2)' }}>{formatYen(goal.cumulativeAmount)}</strong> / {formatYen(goal.target)} ({Math.round(pctComplete)}%)
      </div>
      <ProgressBar value={pctComplete} color={barColor} height={8} />
    </div>
  )
}
