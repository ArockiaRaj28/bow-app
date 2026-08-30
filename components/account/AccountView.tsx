'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { Shield, ArrowRight, Save, Info, HelpCircle } from 'lucide-react'
import { AuthUser } from '@/lib/auth/session'
import { updateAccount, resendVerificationEmailAction } from '@/app/actions/account'
import { logoutAction } from '@/app/auth/actions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAppStore } from '@/store/useAppStore'
import { ThemeDropdown } from '@/components/theme/ThemeSelector'
import ToggleSwitch from '@/components/ui/ToggleSwitch'
import BackupPanel from '@/components/settings/BackupPanel'

const CURRENCIES = [
  { value: 'JPY', label: 'JPY', symbol: '¥', flag: '🇯🇵' },
  { value: 'USD', label: 'USD', symbol: '$', flag: '🇺🇸' },
  { value: 'EUR', label: 'EUR', symbol: '€', flag: '🇪🇺' },
  { value: 'GBP', label: 'GBP', symbol: '£', flag: '🇬🇧' },
  { value: 'INR', label: 'INR', symbol: '₹', flag: '🇮🇳' },
  { value: 'AUD', label: 'AUD', symbol: '$', flag: '🇦🇺' },
  { value: 'CAD', label: 'CAD', symbol: '$', flag: '🇨🇦' },
]

const LOCATIONS = [
  { value: 'Japan', flag: '🇯🇵' },
  { value: 'United States', flag: '🇺🇸' },
  { value: 'United Kingdom', flag: '🇬🇧' },
  { value: 'Europe', flag: '🇪🇺' },
  { value: 'India', flag: '🇮🇳' },
  { value: 'Australia', flag: '🇦🇺' },
  { value: 'Canada', flag: '🇨🇦' },
  { value: 'Other', flag: '🌍' },
]

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function AccountView({ user }: { user: AuthUser }) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [isResending, startResend] = useTransition()
  const isVerified = !!user.emailVerified

  const { perMinutePay, setPerMinutePay } = useAppStore()

  // ── Draft state (initialised from props) ──
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [currency, setCurrency] = useState(user.currency || 'JPY')
  const [location, setLocation] = useState(user.location || 'Japan')
  const [schoolFee, setSchoolFee] = useState<number | ''>(user.schoolFee ?? 840000)

  // Reset drafts if user prop changes
  useEffect(() => { setName(user.name) }, [user.name])
  useEffect(() => { setEmail(user.email) }, [user.email])
  useEffect(() => { setCurrency(user.currency || 'JPY') }, [user.currency])
  useEffect(() => { setLocation(user.location || 'Japan') }, [user.location])
  useEffect(() => { setSchoolFee(user.schoolFee ?? 840000) }, [user.schoolFee])

  // Dirty check: true when any field differs from the server value
  const isDirty =
    name !== user.name ||
    email !== user.email ||
    currency !== (user.currency || 'JPY') ||
    location !== (user.location || 'Japan') ||
    schoolFee !== (user.schoolFee ?? 840000)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsPending(true)
    const res = await updateAccount({ name, email, currency, location, schoolFee: Number(schoolFee) })
    if (res.success) {
      toast.success('Account updated successfully!')
      router.refresh()
    } else {
      toast.error(res.error || 'Failed to update account.')
    }
    setIsPending(false)
  }

  const handleTogglePerMinute = async (next: boolean) => {
    const res = await setPerMinutePay(next)
    if (!res.success) {
      toast.error(res.error || 'Failed to save preference')
    } else {
      toast.success(next ? 'Per-minute pay enabled' : 'Per-minute pay disabled')
    }
  }

  const handleResend = useCallback(() => {
    startResend(async () => {
      const res = await resendVerificationEmailAction(user.email)
      if (res.success) {
        toast.success(res.message || 'Verification email sent!')
      } else {
        toast.error(res.error || 'Failed to send verification email.')
      }
    })
  }, [user.email, startResend])

  return (
    <div style={{
      maxWidth: 1024,
      margin: '0 auto',
      padding: '16px 16px 120px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      animation: 'slideUp 0.3s ease',
    }}>

      {/* ── 1. Profile Header Card ───────────────── */}
      <div style={{
        padding: '16px 18px',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 50, height: 50, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: '#fff',
            boxShadow: '0 0 0 3px rgba(99,102,241,0.25)',
            fontFamily: 'var(--display)',
          }}>
            {getInitials(user.name)}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <h2 style={{
                fontSize: 16, fontWeight: 800, fontFamily: 'var(--display)',
                margin: 0, color: 'var(--text)',
              }}>
                {user.name}
              </h2>
              {user.role === 'ADMIN' && (
                <span style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '0.04em',
                  padding: '2px 7px', borderRadius: 999,
                  background: 'rgba(99,102,241,0.2)', color: '#a5b4fc',
                  border: '1px solid rgba(99,102,241,0.4)',
                }}>
                  ADMIN
                </span>
              )}
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '2px 0 0' }}>
              {user.email}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: isVerified ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
            color: isVerified ? '#34d399' : '#fbbf24',
            border: `1px solid ${isVerified ? 'rgba(16,185,129,0.28)' : 'rgba(245,158,11,0.28)'}`,
          }}>
            <span>{isVerified ? '✓' : '!'}</span>
            <span>{isVerified ? 'Verified' : 'Unverified'}</span>
          </div>

          <Link
            href={`/feedback?from=${encodeURIComponent('/account')}`}
            style={{
              padding: '6px 12px', borderRadius: 8,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border)',
              color: 'var(--text)', fontSize: 12, fontWeight: 700,
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5,
            }}
          >
            <span>💬</span> Feedback
          </Link>
        </div>
      </div>

      {/* ── 2. Admin Quick Banner (Admins only) ──── */}
      {user.role === 'ADMIN' && (
        <Link
          href="/admin"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '13px 18px',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.16) 0%, rgba(59,130,246,0.12) 100%)',
            border: '1px solid rgba(99,102,241,0.38)',
            borderRadius: 16,
            textDecoration: 'none',
            color: 'var(--text)',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(99,102,241,0.25)',
              border: '1px solid rgba(99,102,241,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#a5b4fc',
            }}>
              <Shield size={18} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#fff', fontFamily: 'var(--display)' }}>
                Admin Dashboard
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                Users, analytics, audit logs &amp; system settings
              </div>
            </div>
          </div>
          <ArrowRight size={16} color="#a5b4fc" />
        </Link>
      )}

      {/* ── 3. Unverified Email Banner ──────────── */}
      {!isVerified && (
        <div style={{
          padding: '14px 16px',
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 13, color: '#fbbf24', margin: 0 }}>
              ⚠️ Email not verified
            </p>
            <p style={{ fontSize: 11, color: 'var(--muted)', margin: '2px 0 0' }}>
              Please verify your email address to secure your account.
            </p>
          </div>
          <button
            onClick={handleResend}
            disabled={isResending}
            style={{
              padding: '8px 14px', borderRadius: 8,
              background: isResending ? 'var(--surface)' : 'rgba(245,158,11,0.18)',
              border: '1px solid rgba(245,158,11,0.45)',
              color: '#fbbf24', fontWeight: 700, fontSize: 12,
              cursor: isResending ? 'not-allowed' : 'pointer',
            }}
          >
            {isResending ? 'Sending…' : '✉️ Resend Verification'}
          </button>
        </div>
      )}

      {/* ── 4. Main Settings Form ── */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Two-column layout: Profile + Preferences sit side-by-side on wide screens */}
        <div style={twoColumnGridStyle}>
        
        {/* Profile Information Section */}
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          overflow: 'hidden',
        }}>
          <div style={cardHeaderStyle}>
            <span>👤</span> Profile Information
          </div>

          <HorizontalRow label="Full Name" icon="✏️">
            <input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Your full name"
              style={inputStyle}
            />
          </HorizontalRow>

          <HorizontalRow label="Email Address" icon="📧">
            <input
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              style={inputStyle}
            />
          </HorizontalRow>

          <HorizontalRow label="School Fee Target" icon="🎓" last>
            <input
              name="schoolFee"
              type="number"
              value={schoolFee}
              onChange={(e) => setSchoolFee(e.target.value === '' ? '' : Number(e.target.value))}
              required
              placeholder="840000"
              style={inputStyle}
            />
          </HorizontalRow>
        </div>

        {/* Preferences & Appearance Section */}
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          overflow: 'hidden',
        }}>
          <div style={cardHeaderStyle}>
            <span>⚙️</span> Preferences &amp; Appearance
          </div>

          <HorizontalRow label="Theme / Palette" icon="🎨" description="Application color scheme">
            <ThemeDropdown />
          </HorizontalRow>

          <HorizontalRow label="Currency" icon="💰">
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={inputStyle}>
              {CURRENCIES.map(c => (
                <option key={c.value} value={c.value}>
                  {c.flag} {c.label} ({c.symbol})
                </option>
              ))}
            </select>
          </HorizontalRow>

          <HorizontalRow label="Location" icon="📍">
            <select value={location} onChange={(e) => setLocation(e.target.value)} style={inputStyle}>
              {LOCATIONS.map(l => (
                <option key={l.value} value={l.value}>
                  {l.flag} {l.value}
                </option>
              ))}
            </select>
          </HorizontalRow>

          <HorizontalRow
            label="Per-Minute Pay"
            icon="⏱️"
            description="Use exact clock in/out times for precision"
            last
          >
            <ToggleSwitch
              checked={perMinutePay}
              onChange={(next) => { void handleTogglePerMinute(next) }}
            />
          </HorizontalRow>
        </div>
        </div>

        {/* Save Changes Button */}
        <button
          type="submit"
          disabled={!isDirty || isPending}
          style={{
            width: '100%', padding: '14px 20px', borderRadius: 14,
            background: (!isDirty || isPending) ? 'var(--surface)' : 'linear-gradient(135deg, var(--accent) 0%, #4f46e5 100%)',
            color: (!isDirty || isPending) ? 'var(--muted2)' : '#fff',
            border: `1px solid ${(!isDirty || isPending) ? 'var(--border)' : 'transparent'}`,
            fontWeight: 800, fontSize: 14,
            fontFamily: 'var(--display)', cursor: (!isDirty || isPending) ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: (!isDirty || isPending) ? 'none' : '0 4px 20px rgba(99,102,241,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Save size={16} />
          {isPending ? 'Saving Changes…' : isDirty ? 'Save Changes' : 'All Changes Saved'}
        </button>
      </form>

      {/* ── 5. Data Management (Export & Import) ─── */}
      <BackupPanel />

      {/* ── 6. System & App Information ─────────── */}
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '16px',
      }}>
        <div style={{ ...cardHeaderStyle, padding: '0 0 12px 0', borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
          <span><Info size={14} /></span> System &amp; App Information
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
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

      {/* ── 7. Sign Out ─────────────────────────── */}
      <div style={{ marginTop: 4 }}>
        <form action={logoutAction}>
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '13px 16px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 14,
              color: '#f87171',
              fontSize: 13, fontWeight: 700,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'background 0.15s ease',
            }}
          >
            <span>🚪</span> Sign Out{user?.name ? ` (${user.name})` : ''}
          </button>
        </form>
      </div>

    </div>
  )
}

/* ── Reusable Horizontal Form Row Component ──────────────────────── */
function HorizontalRow({
  label, icon, description, children, last,
}: {
  label: string
  icon: string
  description?: string
  children: React.ReactNode
  last?: boolean
}) {
  return (
    <div style={{
      padding: '12px 16px',
      borderBottom: last ? 'none' : '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      minHeight: 48,
    }}>
      <div style={{ flex: '1 1 140px', minWidth: 120 }}>
        <div style={{
          fontSize: 13, color: 'var(--text)', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 7,
        }}>
          <span style={{ fontSize: 14 }}>{icon}</span> {label}
        </div>
        {description && (
          <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>
            {description}
          </div>
        )}
      </div>
      <div style={{ flex: '1 1 240px', maxWidth: 280, display: 'flex', justifyContent: 'flex-end' }}>
        {children}
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

const inputStyle: React.CSSProperties = {
  padding: '9px 12px',
  borderRadius: 8,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  fontSize: 13.5,
  width: '100%',
  boxSizing: 'border-box',
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

const twoColumnGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: 14,
  alignItems: 'start',
}
