'use client'

import { ChevronLeft, ChevronRight, Briefcase } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { MONTH_NAMES } from '@/lib/constants'

/**
 * Slim app header.
 *
 * One clean row, mobile-first: brand on the left, month stepper as a
 * segmented pill in the center, a single Jobs action on the right.
 * "Today" appears only when the viewed month isn't the current one, so
 * the default view stays decluttered. Logout lives in the Account tab,
 * not here.
 */
export default function Topbar() {
  const { curY, curM, changeMonth, goToday, setModal } = useAppStore()

  const now = new Date()
  const isCurrentMonth = curY === now.getFullYear() && curM === now.getMonth()

  return (
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
      <div style={{ minWidth: 0, marginRight: 'auto' }}>
        <div style={{
          fontSize: 15, fontWeight: 800, letterSpacing: -0.3,
          whiteSpace: 'nowrap',
          fontFamily: 'var(--display, inherit)',
        }}>
          🇯🇵 BOW
        </div>
        <div style={{ fontSize: 9.5, color: 'var(--muted)', letterSpacing: '0.04em', marginTop: 1 }}>
          WORK · CALENDAR
        </div>
      </div>

      {/* Month stepper — segmented pill */}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 999,
        padding: 3,
        gap: 2,
      }}>
        <button
          onClick={() => changeMonth(-1)}
          aria-label="Previous month"
          style={stepBtn}
        >
          <ChevronLeft size={15} strokeWidth={2.5} />
        </button>
        <span style={{
          fontSize: 12.5, fontWeight: 700,
          minWidth: 86, textAlign: 'center',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {MONTH_NAMES[curM]} {curY}
        </span>
        <button
          onClick={() => changeMonth(1)}
          aria-label="Next month"
          style={stepBtn}
        >
          <ChevronRight size={15} strokeWidth={2.5} />
        </button>
      </div>

      {/* Today — only when not already on the current month */}
      {!isCurrentMonth && (
        <button onClick={goToday} style={todayBtn}>
          Today
        </button>
      )}

      {/* Jobs */}
      <button
        onClick={() => setModal('jobManager')}
        aria-label="Manage jobs"
        title="Manage jobs"
        style={jobsBtn}
      >
        <Briefcase size={15} strokeWidth={2.2} />
      </button>
    </header>
  )
}

const stepBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 26, height: 26,
  background: 'transparent',
  border: 'none',
  borderRadius: 999,
  color: 'var(--text-secondary, var(--text))',
  cursor: 'pointer',
  transition: 'background 120ms ease',
}

const todayBtn: React.CSSProperties = {
  background: 'rgba(59,130,246,0.14)',
  border: '1px solid rgba(59,130,246,0.32)',
  color: 'var(--accent)',
  padding: '4px 10px',
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const jobsBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 32, height: 32,
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  color: 'var(--text-secondary, var(--text))',
  cursor: 'pointer',
  flexShrink: 0,
}
