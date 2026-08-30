'use client'

import Link from 'next/link'
import { Shield, ArrowRight, Info } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/store/useAppStore'
import ToggleSwitch from '@/components/ui/ToggleSwitch'
import BackupPanel from './BackupPanel'
import { ThemeDropdown } from '@/components/theme/ThemeSelector'
import type { AuthUser } from '@/lib/auth/session'

export default function SettingsView({ user }: { user?: AuthUser }) {
  const { perMinutePay, setPerMinutePay } = useAppStore()

  const handleToggle = async (next: boolean) => {
    const res = await setPerMinutePay(next)
    if (!res.success) {
      toast.error(res.error || 'Failed to save preference')
    } else {
      toast.success(next ? 'Per-minute pay enabled' : 'Per-minute pay disabled')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Admin Panel Redirect (when logged in as ADMIN) */}
      {user?.role === 'ADMIN' && (
        <section style={{
          padding: '13px 18px',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.14) 0%, rgba(59,130,246,0.12) 100%)',
          border: '1px solid rgba(99,102,241,0.36)',
          borderRadius: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                <Shield size={16} color="#a5b4fc" />
                <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', fontFamily: 'var(--display)' }}>
                  Admin Dashboard
                </span>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999,
                  background: 'rgba(99,102,241,0.25)', color: '#a5b4fc',
                  border: '1px solid rgba(99,102,241,0.4)',
                }}>
                  ADMIN
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                Access user administration, analytics, audit logs, and system settings
              </div>
            </div>
            <Link
              href="/admin"
              style={{
                padding: '8px 14px', borderRadius: 8,
                background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                color: '#fff', fontWeight: 700, fontSize: 12,
                textDecoration: 'none', whiteSpace: 'nowrap',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                boxShadow: '0 2px 10px rgba(99,102,241,0.35)',
                flexShrink: 0,
              }}
            >
              Open Admin <ArrowRight size={13} />
            </Link>
          </div>
        </section>
      )}

      {/* Preferences & Appearance Card */}
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        overflow: 'hidden',
      }}>
        <div style={cardHeaderStyle}>
          <span>⚙️</span> Preferences &amp; Earnings
        </div>

        {/* Theme row */}
        <div style={horizontalRowStyle}>
          <div style={{ flex: '1 1 140px', minWidth: 120 }}>
            <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}>
              <span>🎨</span> Theme / Palette
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>
              Choose your favorite workspace color palette
            </div>
          </div>
          <div style={{ flex: '1 1 240px', maxWidth: 280, display: 'flex', justifyContent: 'flex-end' }}>
            <ThemeDropdown />
          </div>
        </div>

        {/* Per-minute pay row */}
        <div style={{ ...horizontalRowStyle, borderBottom: 'none' }}>
          <div style={{ flex: '1 1 140px', minWidth: 120 }}>
            <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}>
              <span>⏱️</span> Per-Minute Pay
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>
              Track actual clock-in/out for precise earnings
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <ToggleSwitch
              checked={perMinutePay}
              onChange={(next) => { void handleToggle(next) }}
            />
          </div>
        </div>
      </div>

      {/* Export / Import */}
      <BackupPanel />

      {/* About & System Specs */}
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '16px',
      }}>
        <div style={{ ...cardHeaderStyle, padding: '0 0 12px 0', borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
          <span><Info size={14} /></span> About BOW
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 10,
          fontSize: 12,
        }}>
          <div style={infoBoxStyle}>
            <span style={{ color: 'var(--muted)' }}>Version</span>
            <strong style={{ color: 'var(--text)' }}>7.0 (Next.js)</strong>
          </div>
          <div style={infoBoxStyle}>
            <span style={{ color: 'var(--muted)' }}>Weekly Hour Limit</span>
            <strong style={{ color: 'var(--accent)' }}>28 Hours (Visa)</strong>
          </div>
          <div style={infoBoxStyle}>
            <span style={{ color: 'var(--muted)' }}>School Target</span>
            <strong style={{ color: 'var(--success)' }}>¥840,000</strong>
          </div>
          <div style={infoBoxStyle}>
            <span style={{ color: 'var(--muted)' }}>Database</span>
            <strong style={{ color: 'var(--text)' }}>Cloud PostgreSQL</strong>
          </div>
          <div style={infoBoxStyle}>
            <span style={{ color: 'var(--muted)' }}>Active Window</span>
            <strong style={{ color: 'var(--text)' }}>Apr 2026 – Sep 2027</strong>
          </div>
          <div style={infoBoxStyle}>
            <span style={{ color: 'var(--muted)' }}>Developers</span>
            <strong style={{ color: 'var(--text)' }}>Nitheshwar &amp; Arockia</strong>
          </div>
        </div>
      </div>
    </div>
  )
}

const cardHeaderStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid var(--border)',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}

const horizontalRowStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  minHeight: 48,
}

const infoBoxStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.025)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '8px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
}