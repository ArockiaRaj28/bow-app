import Link from 'next/link'
import { Shield, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/store/useAppStore'
import ToggleSwitch from '@/components/ui/ToggleSwitch'
import BackupPanel from './BackupPanel'
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
    <div style={{ padding: 16 }}>
      {/* Admin Panel Redirect (when logged in as ADMIN) */}
      {user?.role === 'ADMIN' && (
        <section style={{
          ...sectionStyle,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.14) 0%, rgba(59,130,246,0.12) 100%)',
          border: '1px solid rgba(99,102,241,0.36)',
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

      {/* Per-minute toggle */}
      <section style={sectionStyle}>
        <div style={sectionTitle}>Earnings Calculation</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Per-Minute Pay</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
              Track actual clock-in/out for precise earnings
            </div>
          </div>
          <ToggleSwitch
            checked={perMinutePay}
            onChange={(next) => { void handleToggle(next) }}
          />
        </div>
      </section>

      {/* Export / Import */}
      <BackupPanel />

      {/* About */}
      <section style={sectionStyle}>
        <div style={sectionTitle}>About BOW</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>
          <div><strong style={{ color: 'var(--text)' }}>Version:</strong> 7.0 (Next.js)</div>
          <div><strong style={{ color: 'var(--text)' }}>Developed by:</strong> Nitheshwar &amp; Arockia</div>
          <div><strong style={{ color: 'var(--text)' }}>Purpose:</strong> Japan student visa compliance &amp; budget tracking</div>
          <div><strong style={{ color: 'var(--text)' }}>Data:</strong> Cloud database (Neon PostgreSQL)</div>
          <div><strong style={{ color: 'var(--text)' }}>Features:</strong> Account system, email verification, expense tracking with categories</div>
          <div><strong style={{ color: 'var(--text)' }}>Date range:</strong> Apr 2026 – Sep 2027 (18 months)</div>
          <div><strong style={{ color: 'var(--text)' }}>Weekly limit:</strong> 28 hours (Japan visa rule)</div>
          <div><strong style={{ color: 'var(--text)' }}>School fee target:</strong> ¥840,000</div>
        </div>
      </section>
    </div>
  )
}

const sectionStyle: React.CSSProperties = {
  background: 'var(--card)',
  borderRadius: 12, padding: 14, marginBottom: 12,
}
const sectionTitle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--muted)',
  textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8,
}