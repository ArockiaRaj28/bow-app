'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, LineChart, Users, Mail, MessageSquare, ScrollText,
} from 'lucide-react'

const LINKS = [
  { href: '/admin',           label: 'Overview',  Icon: LayoutDashboard, exact: true },
  { href: '/admin/analytics', label: 'Analytics', Icon: LineChart },
  { href: '/admin/users',     label: 'Users',     Icon: Users },
  { href: '/admin/emails',    label: 'Emails',    Icon: Mail },
  { href: '/admin/feedback',  label: 'Feedback',  Icon: MessageSquare },
  { href: '/admin/audit-log', label: 'Audit Log', Icon: ScrollText },
]

/** Pill-style admin nav — mirrors the main app's TopTabs look.
 *  Client component so `usePathname` can highlight the active pill. */
export default function AdminNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Admin sections"
      className="hide-scrollbar"
      style={{
        display: 'flex',
        gap: 6,
        padding: '8px 14px 10px 14px',
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        overflowX: 'auto',
        position: 'sticky',
        top: 53,
        zIndex: 99,
      }}
    >
      {LINKS.map(({ href, label, Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              flex: '1 0 auto',
              justifyContent: 'center',
              padding: '7px 14px',
              background: active ? 'rgba(99,102,241,0.14)' : 'transparent',
              border: `1px solid ${active ? 'rgba(99,102,241,0.34)' : 'var(--border)'}`,
              borderRadius: 999,
              color: active ? '#a5b4fc' : 'var(--muted)',
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              textDecoration: 'none',
              transition: 'color 140ms ease, background 140ms ease, border-color 140ms ease',
            }}
          >
            <Icon size={13.5} strokeWidth={2.2} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
