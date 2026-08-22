'use client'

import {
  CalendarDays, Repeat, Wallet, ReceiptText, BarChart3, User,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { TopTab } from '@/types'

const TABS: { id: TopTab; label: string; Icon: typeof CalendarDays }[] = [
  { id: 'calendar',  label: 'Calendar',  Icon: CalendarDays },
  { id: 'templates', label: 'Templates', Icon: Repeat },
  { id: 'budget',    label: 'Budget',    Icon: Wallet },
  { id: 'expenses',  label: 'Expenses',  Icon: ReceiptText },
  { id: 'summary',   label: 'Insights',  Icon: BarChart3 },
  { id: 'account',   label: 'Account',   Icon: User },
]

/**
 * Pill-style tab bar.
 *
 * Icon + short label, active tab highlighted as a rounded pill —
 * no uppercase cramming, no underlines. Horizontally scrollable on
 * narrow screens with the scrollbar hidden; sticky under the header.
 */
export default function TopTabs() {
  const { activeTab, setTab } = useAppStore()

  return (
    <nav
      aria-label="Main tabs"
      className="hide-scrollbar"
      style={{
        display: 'flex',
        gap: 6,
        padding: '8px 14px 10px 14px',
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        position: 'sticky',
        top: 53,
        zIndex: 99,
      }}
    >
      {TABS.map(({ id, label, Icon }) => {
        const active = activeTab === id
        return (
          <button
            key={id}
            onClick={() => setTab(id)}
            aria-current={active ? 'page' : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              flex: '1 0 auto',
              justifyContent: 'center',
              padding: '7px 14px',
              background: active ? 'rgba(59,130,246,0.13)' : 'transparent',
              border: `1px solid ${active ? 'rgba(59,130,246,0.32)' : 'var(--border)'}`,
              borderRadius: 999,
              color: active ? 'var(--accent)' : 'var(--muted)',
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              transition: 'color 140ms ease, background 140ms ease, border-color 140ms ease',
            }}
          >
            <Icon size={13.5} strokeWidth={2.2} />
            {label}
          </button>
        )
      })}
    </nav>
  )
}
