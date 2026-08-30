'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'

/**
 * Ensures the `data-theme` attribute on <html> matches the active
 * theme stored in Zustand / localStorage.
 */
export default function ThemeSync() {
  const { theme } = useAppStore()

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme || 'midnight')
    }
  }, [theme])

  return null
}
