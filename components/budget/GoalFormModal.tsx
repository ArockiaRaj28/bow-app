'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { useBudgetStore } from '@/store/useBudgetStore'
import { useJobsStore } from '@/store/useJobsStore'
import type { BudgetGoal } from '@/types'
import { formatYen } from '@/lib/timeUtils'

interface Props {
  monthKey: string
  /** When set, the form edits this goal instead of creating one. */
  editing?: BudgetGoal | null
  onClose: () => void
}

/**
 * Create / edit a savings goal — replaces the old triple-window.prompt()
 * flow. Validates name, positive target, a real future deadline, and a
 * 0–100 allocation before anything reaches the store.
 */
export default function GoalFormModal({ monthKey, editing, onClose }: Props) {
  const { addGoal, updateGoal, recalculate } = useBudgetStore()
  const { jobs } = useJobsStore()

  const [name, setName] = useState(editing?.name ?? '')
  const [target, setTarget] = useState(editing && editing.target > 0 ? String(editing.target) : '')
  const [deadline, setDeadline] = useState(editing?.deadline ?? '')
  const [pct, setPct] = useState(String(editing?.percentage ?? 10))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const todayStr = new Date().toISOString().slice(0, 10)

  const validate = (): string | null => {
    if (!name.trim()) return 'Give the goal a name.'
    const t = parseInt(target, 10)
    if (!Number.isFinite(t) || t <= 0) return 'Target must be a positive amount.'
    if (t > 1_000_000_000) return 'Target looks too large.'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return 'Pick a deadline date.'
    if (deadline <= todayStr) return 'Deadline must be in the future.'
    const p = parseInt(pct, 10)
    if (!Number.isFinite(p) || p < 0 || p > 100) return 'Allocation must be 0–100%.'
    return null
  }

  const handleSave = async () => {
    const err = validate()
    if (err) { setError(err); return }
    setError(null)
    setSaving(true)
    try {
      const t = parseInt(target, 10)
      const p = parseInt(pct, 10)
      if (editing) {
        await updateGoal(monthKey, editing.id, {
          name: name.trim(), target: t, deadline, percentage: p,
        })
      } else {
        await addGoal(monthKey, {
          id: String(Date.now()),
          name: name.trim(),
          deadline,
          target: t,
          percentage: p,
          priority: 1,
          createdMonth: monthKey,
          monthlyProgress: {},
        } as BudgetGoal)
      }
      await recalculate(monthKey, jobs)
      onClose()
    } catch (e) {
      setError((e as Error)?.message || 'Failed to save goal. Try again.')
      setSaving(false)
    }
  }

  const monthsLeft = deadline
    ? Math.max(0, Math.round(
        (new Date(deadline).getTime() - Date.now()) / (30.44 * 86400000)
      ))
    : null
  const perMonth = monthsLeft && monthsLeft > 0 && parseInt(target, 10) > 0
    ? Math.ceil(parseInt(target, 10) / monthsLeft)
    : null

  return (
    <Modal
      title={editing ? `🎯 Edit Goal — ${editing.name}` : '🎯 New Savings Goal'}
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', gap: 10, width: '100%', alignItems: 'center' }}>
          <div style={{ flex: 1, fontSize: 11, color: 'var(--muted)' }}>
            {perMonth
              ? <>≈ <b style={{ color: 'var(--text)' }}>{formatYen(perMonth)}</b>/month for {monthsLeft} mo</>
              : 'Set a target and deadline to see a monthly plan.'}
          </div>
          <button onClick={onClose} style={btnSecondary}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={btnPrimary}>
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Goal'}
          </button>
        </div>
      }
    >
      <div style={{ display: 'grid', gap: 14 }}>
        <Field label="Goal name">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Japan Trip, New Laptop, Emergency Fund"
            style={inputStyle}
            autoFocus
          />
        </Field>

        <Field label="Target amount (¥)">
          <input
            value={target}
            onChange={e => setTarget(e.target.value.replace(/[^\d]/g, ''))}
            inputMode="numeric"
            placeholder="100000"
            style={inputStyle}
          />
        </Field>

        <Field label="Deadline">
          <input
            type="date"
            value={deadline}
            min={todayStr}
            onChange={e => setDeadline(e.target.value)}
            style={inputStyle}
          />
        </Field>

        <Field label={`Allocation — % of monthly savings (currently ${pct || 0}%)`}>
          <input
            type="range" min={0} max={100} step={5}
            value={pct}
            onChange={e => setPct(e.target.value)}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
        </Field>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.09)',
            border: '1px solid rgba(239,68,68,0.28)',
            borderRadius: 10,
            padding: '9px 12px',
            fontSize: 12, color: '#fca5a5',
          }}>
            {error}
          </div>
        )}
      </div>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{
        fontSize: 11, fontWeight: 700, color: 'var(--muted)',
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        {label}
      </span>
      {children}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px', borderRadius: 10,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid var(--border)',
  color: 'var(--text)', fontSize: 14,
  width: '100%', boxSizing: 'border-box',
  fontFamily: 'inherit', outline: 'none',
}

const btnPrimary: React.CSSProperties = {
  padding: '10px 16px', borderRadius: 10,
  background: 'var(--accent)', border: 'none',
  color: '#fff', fontSize: 13, fontWeight: 700,
  cursor: 'pointer', whiteSpace: 'nowrap',
}

const btnSecondary: React.CSSProperties = {
  padding: '10px 14px', borderRadius: 10,
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid var(--border)',
  color: 'var(--text)', fontSize: 13, fontWeight: 600,
  cursor: 'pointer',
}
