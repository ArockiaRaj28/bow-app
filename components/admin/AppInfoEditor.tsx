'use client'

import { useState, useTransition } from 'react'
import { Save, RotateCcw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  updateAppInfo,
  type AppInfoValues,
} from '@/app/actions/admin/appInfo'

type Field = {
  key: keyof Omit<AppInfoValues, 'updatedAt' | 'updatedBy'>
  label: string
  hint: string
  defaultValue: string
}

const FIELDS: Field[] = [
  {
    key: 'version',
    label: 'Version',
    hint: 'Build / release label shown to users (e.g. "v7.2 — Smart Visa Guard").',
    defaultValue: 'v7.2',
  },
  {
    key: 'weeklyHourLimit',
    label: 'Weekly Hour Limit',
    hint: 'Visa hour cap copy shown to users (e.g. "28 Hours (Visa)").',
    defaultValue: '28 Hours (Visa)',
  },
  {
    key: 'schoolTarget',
    label: 'School Target',
    hint: 'School fee / savings target copy (e.g. "¥840,000").',
    defaultValue: '¥840,000',
  },
  {
    key: 'database',
    label: 'Database',
    hint: 'Storage / DB label shown in the info card.',
    defaultValue: 'Cloud PostgreSQL',
  },
  {
    key: 'activeWindow',
    label: 'Active Window',
    hint: 'Active coverage window label (e.g. "Apr 2026 – Sep 2027").',
    defaultValue: 'Apr 2026 – Sep 2027',
  },
  {
    key: 'developers',
    label: 'Developers',
    hint: 'Developers / maintainer names shown to users.',
    defaultValue: 'Nitheshwar & Arockia',
  },
]

/**
 * Admin-only form that edits the singleton AppInfo row. Shows each field
 * with a Reset-to-default chip. Saves invoke updateAppInfo(); on success
 * the parent server component re-renders with the new values.
 */
export default function AppInfoEditor({
  initial,
}: {
  initial: AppInfoValues
}) {
  // Draft state per field. We compare against `initial` for the dirty
  // hint so we don't submit identical rows.
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {}
    for (const f of FIELDS) out[f.key] = initial[f.key]
    return out
  })
  const [pending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  const isDirty = FIELDS.some((f) => drafts[f.key] !== initial[f.key])

  const handleChange = (key: string, value: string) => {
    setDrafts((prev) => ({ ...prev, [key]: value }))
  }

  const handleReset = (key: string, defaultValue: string) => {
    setDrafts((prev) => ({ ...prev, [key]: defaultValue }))
  }

  const handleSave = () => {
    startTransition(async () => {
      const res = await updateAppInfo({
        version: drafts.version,
        weeklyHourLimit: drafts.weeklyHourLimit,
        schoolTarget: drafts.schoolTarget,
        database: drafts.database,
        activeWindow: drafts.activeWindow,
        developers: drafts.developers,
      })
      if (!res.success) {
        toast.error(res.error || 'Failed to save App Info')
        return
      }
      // Replace drafts with the returned values so the dirty hint clears.
      if (res.values) {
        const next: Record<string, string> = {}
        for (const f of FIELDS) next[f.key] = res.values[f.key]
        setDrafts(next)
        setSavedAt(res.values.updatedAt)
      }
      toast.success('App Info saved — Account page updated')
    })
  }

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      overflow: 'hidden',
    }}>
      {FIELDS.map((f, idx) => {
        const isLast = idx === FIELDS.length - 1
        const draft = drafts[f.key]
        const dirty = draft !== initial[f.key]
        return (
          <div
            key={f.key}
            style={{
              padding: '12px 14px',
              borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}>
              <label
                htmlFor={`appinfo-${f.key}`}
                style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--text)' }}
              >
                {f.label}
              </label>
              <button
                type="button"
                onClick={() => handleReset(f.key, f.defaultValue)}
                disabled={pending || draft === f.defaultValue}
                title="Reset to default"
                style={{
                  padding: '3px 8px',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  fontSize: 10.5,
                  color: 'var(--muted)',
                  cursor: draft === f.defaultValue ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <RotateCcw size={11} />
                Default
              </button>
            </div>
            <input
              id={`appinfo-${f.key}`}
              type="text"
              value={draft}
              onChange={(e) => handleChange(f.key, e.target.value)}
              disabled={pending}
              placeholder={f.defaultValue}
              maxLength={f.key === 'developers' ? 128 : 64}
              style={{
                width: '100%',
                padding: '8px 10px',
                background: 'var(--surface)',
                border: `1px solid ${dirty ? 'rgba(99,102,241,0.55)' : 'var(--border)'}`,
                borderRadius: 8,
                color: 'var(--text)',
                fontSize: 12.5,
                fontFamily: 'ui-monospace, monospace',
                outline: 'none',
              }}
            />
            <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
              {f.hint}
            </div>
          </div>
        )
      })}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '12px 14px',
        background: 'rgba(255,255,255,0.02)',
        borderTop: '1px solid var(--border)',
      }}>
        <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
          {savedAt
            ? `Last saved ${savedAt.toLocaleString()}`
            : `Last saved ${new Date(initial.updatedAt).toLocaleString()}`}
          {initial.updatedBy && ' · by previous admin'}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || pending}
          style={{
            padding: '8px 14px',
            background: (!isDirty || pending)
              ? 'var(--surface)'
              : 'linear-gradient(135deg, var(--accent) 0%, #4f46e5 100%)',
            color: (!isDirty || pending) ? 'var(--muted2)' : '#fff',
            border: '1px solid transparent',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 12,
            cursor: (!isDirty || pending) ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {pending ? <Loader2 size={13} className="spin" /> : <Save size={13} />}
          {pending ? 'Saving…' : isDirty ? 'Save Changes' : 'Saved'}
        </button>
      </div>
    </div>
  )
}
