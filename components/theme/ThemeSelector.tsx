'use client'

import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/store/useAppStore'
import { THEMES, type ThemeId } from '@/lib/themes'

interface ThemeSelectorProps {
  variant?: 'cards' | 'dropdown' | 'both'
}

export function ThemeDropdown({ style }: { style?: React.CSSProperties }) {
  const { theme, setTheme } = useAppStore()
  const currentTheme = theme || 'midnight'

  return (
    <select
      value={currentTheme}
      onChange={(e) => {
        const next = e.target.value as ThemeId
        setTheme(next)
        const t = THEMES.find((item) => item.id === next)
        if (t) toast.success(`Theme set to ${t.name}`)
      }}
      style={{
        width: '100%',
        padding: '10px 12px',
        borderRadius: 8,
        background: 'var(--card)',
        border: '1px solid var(--border)',
        color: 'var(--text)',
        fontSize: 13.5,
        fontWeight: 600,
        boxSizing: 'border-box',
        cursor: 'pointer',
        ...style,
      }}
    >
      {THEMES.map((t) => (
        <option
          key={t.id}
          value={t.id}
          style={{ background: '#1a1d2e', color: '#ffffff', padding: '8px' }}
        >
          {t.icon} {t.name} ({t.subtitle})
        </option>
      ))}
    </select>
  )
}

export default function ThemeSelector({ variant = 'cards' }: ThemeSelectorProps) {
  const { theme, setTheme } = useAppStore()
  const currentTheme = theme || 'midnight'

  const handleSelect = (id: ThemeId, name: string) => {
    if (id === currentTheme) return
    setTheme(id)
    toast.success(`Theme set to ${name}`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {(variant === 'dropdown' || variant === 'both') && (
        <div>
          <ThemeDropdown />
        </div>
      )}

      {(variant === 'cards' || variant === 'both') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {THEMES.map((t) => {
            const isActive = t.id === currentTheme
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelect(t.id, t.name)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  padding: '12px 14px',
                  borderRadius: 14,
                  background: t.preview.card,
                  border: `1.5px solid ${isActive ? t.preview.accent : t.preview.border}`,
                  boxShadow: isActive ? `0 0 0 1px ${t.preview.accent}, 0 4px 16px ${t.preview.accent}33` : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Header: Icon + Name + Active check */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  marginBottom: 4,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{t.icon}</span>
                    <span style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: isActive ? '#fff' : 'var(--text)',
                      fontFamily: 'var(--display)',
                    }}>
                      {t.name}
                    </span>
                  </div>
                  {isActive && (
                    <div style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: t.preview.accent,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      boxShadow: `0 0 8px ${t.preview.accent}88`,
                    }}>
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </div>

                {/* Subtitle description */}
                <div style={{
                  fontSize: 10.5,
                  color: 'var(--muted)',
                  marginBottom: 10,
                  lineHeight: 1.35,
                }}>
                  {t.subtitle}
                </div>

                {/* Color Swatch Bar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  width: '100%',
                  padding: '5px 8px',
                  background: t.preview.bg,
                  borderRadius: 8,
                  border: `1px solid ${t.preview.border}`,
                }}>
                  <span style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 700, marginRight: 'auto' }}>
                    Preview
                  </span>
                  <div style={{ width: 14, height: 14, borderRadius: 4, background: t.preview.card, border: `1px solid ${t.preview.border}` }} title="Card" />
                  <div style={{ width: 14, height: 14, borderRadius: 4, background: t.preview.accent }} title="Primary Accent" />
                  <div style={{ width: 14, height: 14, borderRadius: 4, background: t.preview.accent2 }} title="Secondary Accent" />
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
