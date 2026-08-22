import { redirect } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth/session'
import { logoutAction } from '@/app/auth/actions'
import { prisma } from '@/lib/auth/prisma'
import AdminNav from './AdminNav'

/**
 * Admin route group shell.
 *
 * Plan §17: server-side guard on every admin page. We don't expose an
 * /admin/login — the guard is inlined here and re-applied by each child
 * page, so even if Next.js misses this layout in some edge case (cache,
 * race) the page itself still rejects non-admins.
 *
 * Visual language mirrors the main app shell (slim blurred header +
 * pill nav); the admin accent is indigo to distinguish the area.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'ADMIN') redirect('/dashboard')

  // Lightweight count for the admin header. Cheap aggregate query; runs
  // on every /admin render but no client-side hydration.
  const auditCount = await prisma.adminAuditLog.count().catch(() => 0)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      color: 'var(--text)',
      display: 'flex', flexDirection: 'column',
    }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(10,12,20,0.94)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--border)',
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginRight: 'auto', minWidth: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="BOW logo"
            width={30}
            height={30}
            style={{ borderRadius: 8, flexShrink: 0, boxShadow: '0 2px 10px rgba(99,102,241,0.35)' }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 15, fontWeight: 800, letterSpacing: -0.3,
              whiteSpace: 'nowrap',
              fontFamily: 'var(--display, inherit)',
            }}>
              BOW Admin
            </div>
            <div style={{ fontSize: 9.5, color: 'var(--muted)', letterSpacing: '0.04em', marginTop: 1 }}>
              {auditCount} AUDIT {auditCount === 1 ? 'ENTRY' : 'ENTRIES'}
            </div>
          </div>
        </div>

        {/* Role badge */}
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
          padding: '3px 9px', borderRadius: 999,
          background: 'rgba(99,102,241,0.14)',
          color: '#a5b4fc',
          border: '1px solid rgba(99,102,241,0.32)',
        }}>
          ADMIN
        </span>

        {/* Sign out — icon button, title shows who is signed in */}
        <form action={logoutAction}>
          <button
            type="submit"
            title={`Sign out (${user.name})`}
            aria-label="Sign out"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32,
              background: 'rgba(239,68,68,0.09)',
              border: '1px solid rgba(239,68,68,0.28)',
              borderRadius: 10,
              color: '#fca5a5',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <LogOut size={15} strokeWidth={2.2} />
          </button>
        </form>
      </header>

      <AdminNav />

      <main style={{ flex: 1, padding: '20px 14px 120px 14px' }}>
        {children}
      </main>
    </div>
  )
}
