import { prisma } from '@/lib/auth/prisma'
import { requireAdmin } from '@/lib/auth/guards'

/**
 * Admin Analytics — v7.x deferred "analytics charts" scope.
 *
 * Server component, same conventions as the other admin pages:
 * requireAdmin() + fresh aggregates on every request. No chart
 * library — bars are plain flex divs scaled against each series'
 * max, which keeps the page dependency-free and hydration-free.
 *
 * Windows: last 6 calendar months (activity) + last 30 days (engagement).
 * Grouping happens in JS after a range-filtered findMany — Prisma has
 * no date_trunc, and these tables are small per-user aggregates.
 */

const MONTH_WINDOW = 6
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/** Last N month keys (oldest → newest), UTC, including the current one. */
function lastMonthKeys(n: number): string[] {
  const now = new Date()
  const keys: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    keys.push(monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))))
  }
  return keys
}

function labelFor(key: string): string {
  const [, m] = key.split('-')
  return MONTH_LABELS[Number(m) - 1] ?? key
}

/** Bucket rows into the month-key window; rows outside the window are ignored. */
function bucketByMonth<T>(rows: T[], keys: string[], getDate: (row: T) => Date): number[] {
  const index = new Map(keys.map((k, i) => [k, i]))
  const out = keys.map(() => 0)
  for (const row of rows) {
    const i = index.get(monthKey(getDate(row)))
    if (i !== undefined) out[i]++
  }
  return out
}

export default async function AdminAnalyticsPage() {
  await requireAdmin()

  const now = new Date()
  const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTH_WINDOW - 1), 1))
  const days30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [
    users,
    shifts,
    expenses,
    feedback,
    emailLogs,
    activeSessions,
    engagedShiftUsers,
  ] = await Promise.all([
    prisma.user.findMany({ where: { createdAt: { gte: windowStart } }, select: { createdAt: true } }),
    prisma.userShift.findMany({ where: { date: { gte: windowStart } }, select: { date: true, userId: true } }),
    prisma.expense.findMany({ where: { date: { gte: windowStart } }, select: { date: true, amount: true } }),
    prisma.userFeedback.findMany({ select: { type: true, status: true, rating: true, createdAt: true } }),
    prisma.emailLog.findMany({ where: { createdAt: { gte: windowStart } }, select: { type: true, status: true } }),
    prisma.session.findMany({ where: { expiresAt: { gt: now } }, select: { userId: true } }),
    prisma.userShift.findMany({ where: { date: { gte: days30 } }, select: { userId: true } }),
  ])

  const monthKeys = lastMonthKeys(MONTH_WINDOW)
  const signupSeries = bucketByMonth(users, monthKeys, r => r.createdAt)
  const shiftSeries = bucketByMonth(shifts, monthKeys, r => r.date)
  const expenseSeries = bucketByMonth(expenses, monthKeys, r => r.date)

  // Expense totals (¥) per month — separate pass summing amounts.
  const expenseTotals = monthKeys.map(() => 0)
  const idxOf = new Map(monthKeys.map((k, i) => [k, i]))
  for (const e of expenses) {
    const i = idxOf.get(monthKey(e.date))
    if (i !== undefined) expenseTotals[i] += e.amount
  }

  const distinctActiveUsers = new Set(activeSessions.map(s => s.userId)).size
  const distinctEngagedUsers = new Set(engagedShiftUsers.map(s => s.userId)).size

  const feedbackByStatus = tally(feedback.map(f => f.status))
  const feedbackByType = tally(feedback.map(f => f.type))
  const rated = feedback.filter(f => typeof f.rating === 'number')
  const avgRating = rated.length > 0
    ? (rated.reduce((s, f) => s + (f.rating ?? 0), 0) / rated.length).toFixed(1)
    : null

  const emailsSent = emailLogs.filter(e => e.status === 'sent').length
  const emailsFailed = emailLogs.filter(e => e.status === 'failed').length
  const emailsByType = tally(emailLogs.map(e => `${e.type}:${e.status}`))

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{
        fontSize: 22, fontWeight: 800, fontFamily: 'var(--display)',
        margin: '0 0 4px 0',
      }}>
        Analytics
      </h1>
      <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 20px 0' }}>
        Last {MONTH_WINDOW} months · {monthKeys[0]} → {monthKeys[monthKeys.length - 1]} (UTC)
      </p>

      <Section title="Engagement">
        <CardGrid>
          <Card label="Active sessions (unexpired)" value={distinctActiveUsers} accent="green" />
          <Card label="Users with shifts (30d)" value={distinctEngagedUsers} accent="indigo" />
          <Card label="Feedback items" value={feedback.length} />
          <Card label="Avg. rating" value={avgRating ?? '—'} accent={avgRating ? 'amber' : undefined} />
        </CardGrid>
      </Section>

      <Section title="Signups">
        <BarChart series={signupSeries} labels={monthKeys.map(labelFor)} />
      </Section>

      <Section title="Shifts logged (by work date)">
        <BarChart series={shiftSeries} labels={monthKeys.map(labelFor)} accent="#818cf8" />
      </Section>

      <Section title="Expenses logged (count)">
        <BarChart series={expenseSeries} labels={monthKeys.map(labelFor)} accent="#f472b6" />
      </Section>

      <Section title="Expense volume (¥)">
        <BarChart
          series={expenseTotals.map(v => Math.round(v))}
          labels={monthKeys.map(labelFor)}
          accent="#34d399"
          format={v => `¥${v.toLocaleString()}`}
        />
      </Section>

      <Section title="Feedback by status">
        <KVList entries={Object.entries(feedbackByStatus)} />
        {Object.keys(feedbackByType).length > 0 && (
          <>
            <div style={{ height: 10 }} />
            <KVList entries={Object.entries(feedbackByType)} muted />
          </>
        )}
      </Section>

      <Section title={`Emails (${MONTH_WINDOW}mo)`}>
        <CardGrid>
          <Card label="Sent" value={emailsSent} accent="green" />
          <Card label="Failed" value={emailsFailed} accent={emailsFailed > 0 ? 'amber' : undefined} />
        </CardGrid>
        {Object.keys(emailsByType).length > 0 && (
          <>
            <div style={{ height: 10 }} />
            <KVList entries={Object.entries(emailsByType)} muted />
          </>
        )}
      </Section>
    </div>
  )
}

// ── helpers ────────────────────────────────────────────────────────

function tally(values: string[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const v of values) out[v] = (out[v] ?? 0) + 1
  return out
}

// ── Local UI primitives (same style family as the overview page) ──

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ margin: '0 0 22px 0' }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: 'var(--muted)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        margin: '0 0 8px 0',
      }}>
        {title}
      </div>
      {children}
    </section>
  )
}

function CardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
      gap: 10,
    }}>
      {children}
    </div>
  )
}

type Accent = 'green' | 'amber' | 'indigo'
const ACCENT_COLORS: Record<Accent, string> = {
  green: '#34d399',
  amber: '#fbbf24',
  indigo: '#a5b4fc',
}

function Card({
  label, value, accent,
}: {
  label: string; value: number | string; accent?: Accent
}) {
  const color = accent && ACCENT_COLORS[accent]
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '14px 14px',
    }}>
      <div style={{
        fontSize: 24, fontWeight: 800, fontFamily: 'var(--display)',
        color: color ?? 'var(--text)',
        lineHeight: 1.1,
      }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, fontWeight: 600 }}>
        {label}
      </div>
    </div>
  )
}

/** Dependency-free vertical bar chart. Bars scale to the series max;
 *  an all-zero series renders flat stubs so the layout stays stable. */
function BarChart({
  series, labels, accent = '#818cf8', format,
}: {
  series: number[]
  labels: string[]
  accent?: string
  format?: (v: number) => string
}) {
  const max = Math.max(...series, 1)
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '16px 14px 12px 14px',
      display: 'flex',
      alignItems: 'flex-end',
      gap: 8,
      height: 150,
    }}>
      {series.map((v, i) => (
        <div key={i} style={{
          flex: 1,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'flex-end',
          height: '100%', minWidth: 0,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: 'var(--text)',
            marginBottom: 4, whiteSpace: 'nowrap',
          }}>
            {format ? format(v) : v > 0 ? v.toLocaleString() : ''}
          </div>
          <div style={{
            width: '100%', maxWidth: 42,
            height: `${Math.max((v / max) * 100, v > 0 ? 4 : 1.5)}%`,
            background: v > 0
              ? `linear-gradient(180deg, ${accent}, ${accent}66)`
              : 'rgba(255,255,255,0.06)',
            borderRadius: '6px 6px 2px 2px',
          }} />
          <div style={{
            fontSize: 10, color: 'var(--muted)', marginTop: 6,
            fontWeight: 600, whiteSpace: 'nowrap',
          }}>
            {labels[i]}
          </div>
        </div>
      ))}
    </div>
  )
}

function KVList({ entries, muted }: { entries: [string, number][]; muted?: boolean }) {
  if (entries.length === 0) {
    return <div style={{ fontSize: 12, color: 'var(--muted)' }}>No data yet.</div>
  }
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '10px 14px',
    }}>
      {entries.map(([k, v]) => (
        <div key={k} style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 12, padding: '4px 0',
          color: muted ? 'var(--muted)' : 'var(--text)',
        }}>
          <span style={{ fontWeight: 600 }}>{k}</span>
          <span>{v.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}
