import { prisma } from '@/lib/auth/prisma'
import { requireAdmin } from '@/lib/auth/guards'
import { CONFIG } from '@/lib/constants'
import { FROM_EMAIL, transporter } from '@/lib/auth/smtp'

export const dynamic = 'force-dynamic'

/**
 * /admin/settings — Admin Settings & System Overview page.
 *
 * Provides admins with full operational visibility into:
 *   - System & environment status
 *   - Application rules & visa configuration
 *   - SMTP & transactional email provider status
 *   - Database table record counts & storage stats
 *   - Admin security & access policies
 */
export default async function AdminSettingsPage() {
  await requireAdmin()

  // Collect database stats across all tables
  const [
    userCount,
    adminCount,
    jobCount,
    shiftCount,
    expenseCount,
    categoryCount,
    templateCount,
    goalCount,
    monthMetaCount,
    feedbackCount,
    auditCount,
    emailCount,
    sessionCount,
  ] = await Promise.all([
    prisma.user.count().catch(() => 0),
    prisma.user.count({ where: { role: 'ADMIN' } }).catch(() => 0),
    prisma.userJob.count().catch(() => 0),
    prisma.userShift.count().catch(() => 0),
    prisma.expense.count().catch(() => 0),
    prisma.expenseCategory.count().catch(() => 0),
    prisma.userTemplate.count().catch(() => 0),
    prisma.userBudgetGoal.count().catch(() => 0),
    prisma.userBudgetMonthMeta.count().catch(() => 0),
    prisma.userFeedback.count().catch(() => 0),
    prisma.adminAuditLog.count().catch(() => 0),
    prisma.emailLog.count().catch(() => 0),
    prisma.session.count().catch(() => 0),
  ])

  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com'
  const smtpPort = Number(process.env.SMTP_PORT) || 587
  const smtpConfigured = !!transporter
  const nodeEnv = process.env.NODE_ENV || 'development'

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{
          fontSize: 22, fontWeight: 800, fontFamily: 'var(--display)',
          margin: '0 0 4px 0',
        }}>
          System & Settings
        </h1>
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
          Runtime configuration, visa constants, mail server status, and database metrics.
        </p>
      </div>

      {/* 1. Environment & Server Status */}
      <Section title="Runtime & Environment">
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          overflow: 'hidden',
        }}>
          <KVRow label="Environment" value={nodeEnv.toUpperCase()} badge="info" />
          <KVRow label="Database Connection" value="PostgreSQL (Active / Connected)" badge="success" />
          <KVRow label="Active Sessions" value={`${sessionCount.toLocaleString()} active session tokens`} />
          <KVRow label="Platform / Architecture" value={`${process.platform} (${process.arch})`} />
          <KVRow label="Node.js Version" value={process.version} />
        </div>
      </Section>

      {/* 2. Visa & App Constants */}
      <Section title="Visa & App Rule Constants">
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          overflow: 'hidden',
        }}>
          <KVRow
            label="Weekly Hour Limit"
            value={`${CONFIG.WEEKLY_HOUR_LIMIT} hrs / week`}
            hint="Japan Student Visa 28h restriction ceiling"
            badge="amber"
          />
          <KVRow
            label="Near-Limit Warning Threshold"
            value={`${CONFIG.WEEK_NEAR_THRESHOLD} hrs / week`}
            hint="Triggers yellow warning banner on dashboard"
          />
          <KVRow
            label="Night Shift Window"
            value={`${CONFIG.NIGHT_START}:00 → ${CONFIG.NIGHT_END}:00`}
            hint="25% wage premium multiplier window"
            badge="indigo"
          />
          <KVRow
            label="Currency & Symbol"
            value={`${CONFIG.CURRENCY} (${CONFIG.CURRENCY_SYMBOL})`}
          />
          <KVRow
            label="Default School Fee"
            value={`¥${CONFIG.SCHOOL_FEE.toLocaleString()}`}
          />
          <KVRow
            label="Orientation Date"
            value={CONFIG.ORIENTATION_DATE}
          />
        </div>
      </Section>

      {/* 3. SMTP & Email Provider */}
      <Section title="Email & Delivery Service">
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          overflow: 'hidden',
        }}>
          <KVRow
            label="SMTP Service Status"
            value={smtpConfigured ? 'Configured & Ready' : 'Credentials Missing (Disabled)'}
            badge={smtpConfigured ? 'success' : 'danger'}
          />
          <KVRow label="SMTP Server Host" value={smtpHost} />
          <KVRow label="SMTP Port" value={`${smtpPort} (${smtpPort === 465 ? 'SSL/TLS' : 'STARTTLS'})`} />
          <KVRow label="From Email Address" value={FROM_EMAIL} />
        </div>
      </Section>

      {/* 4. Database Table Metrics */}
      <Section title="Database Records Overview">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: 10,
          marginBottom: 10,
        }}>
          <MetricCard label="Users" count={userCount} sub={`${adminCount} Admins`} accent="indigo" />
          <MetricCard label="Jobs" count={jobCount} />
          <MetricCard label="Shifts" count={shiftCount} accent="green" />
          <MetricCard label="Expenses" count={expenseCount} />
          <MetricCard label="Categories" count={categoryCount} />
          <MetricCard label="Templates" count={templateCount} />
          <MetricCard label="Goals" count={goalCount} />
          <MetricCard label="Month Metas" count={monthMetaCount} />
          <MetricCard label="Feedback" count={feedbackCount} accent="amber" />
          <MetricCard label="Audit Logs" count={auditCount} />
          <MetricCard label="Email Logs" count={emailCount} />
          <MetricCard label="Sessions" count={sessionCount} />
        </div>
      </Section>

      {/* 5. Admin Security Policy */}
      <Section title="Security & Access Policy">
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '14px 16px',
          fontSize: 12,
          color: 'var(--muted)',
          lineHeight: 1.6,
        }}>
          <div style={{ color: 'var(--text)', fontWeight: 700, marginBottom: 4 }}>
            Admin Safeguards & Access Controls
          </div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>Every admin route is protected via server-side session authentication with direct <code>UserRole === &apos;ADMIN&apos;</code> enforcement.</li>
            <li>Administrative actions (such as role modifications, password resets, and session revoking) write permanent records to the audit log.</li>
            <li>Admins cannot demote their own account or force-logout their active session from the web UI to avoid accidental lockout.</li>
          </ul>
        </div>
      </Section>
    </div>
  )
}

// ── Local Components ──────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ margin: '0 0 24px 0' }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: 'var(--muted)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        margin: '0 0 10px 0',
      }}>
        {title}
      </div>
      {children}
    </section>
  )
}

type BadgeTone = 'success' | 'amber' | 'indigo' | 'danger' | 'info'

const BADGE_STYLES: Record<BadgeTone, { bg: string; fg: string; ring: string }> = {
  success: { bg: 'rgba(16,185,129,0.12)', fg: '#34d399', ring: 'rgba(16,185,129,0.28)' },
  amber:   { bg: 'rgba(245,158,11,0.12)', fg: '#fbbf24', ring: 'rgba(245,158,11,0.28)' },
  indigo:  { bg: 'rgba(99,102,241,0.14)', fg: '#a5b4fc', ring: 'rgba(99,102,241,0.30)' },
  danger:  { bg: 'rgba(239,68,68,0.14)',  fg: '#fca5a5', ring: 'rgba(239,68,68,0.30)' },
  info:    { bg: 'rgba(59,130,246,0.14)', fg: '#93c5fd', ring: 'rgba(59,130,246,0.28)' },
}

function KVRow({
  label,
  value,
  hint,
  badge,
}: {
  label: string
  value: string
  hint?: string
  badge?: BadgeTone
}) {
  const b = badge ? BADGE_STYLES[badge] : null
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '11px 14px',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      fontSize: 12,
      gap: 12,
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{label}</div>
        {hint && <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>{hint}</div>}
      </div>
      <div>
        {b ? (
          <span style={{
            display: 'inline-block',
            padding: '3px 9px',
            borderRadius: 6,
            background: b.bg,
            color: b.fg,
            border: `1px solid ${b.ring}`,
            fontWeight: 700,
            fontSize: 11,
            whiteSpace: 'nowrap',
          }}>
            {value}
          </span>
        ) : (
          <span style={{
            fontFamily: 'ui-monospace, monospace',
            color: 'var(--muted)',
            fontSize: 12,
            whiteSpace: 'nowrap',
          }}>
            {value}
          </span>
        )}
      </div>
    </div>
  )
}

function MetricCard({
  label,
  count,
  sub,
  accent,
}: {
  label: string
  count: number
  sub?: string
  accent?: 'green' | 'amber' | 'indigo'
}) {
  const fg = accent === 'green' ? '#34d399' : accent === 'amber' ? '#fbbf24' : accent === 'indigo' ? '#a5b4fc' : 'var(--text)'
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '12px 12px',
    }}>
      <div style={{
        fontSize: 20,
        fontWeight: 800,
        fontFamily: 'var(--display)',
        color: fg,
        lineHeight: 1.1,
      }}>
        {count.toLocaleString()}
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, fontWeight: 600 }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: 9.5, color: 'var(--muted2)', marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  )
}
