'use client'

import dynamic from 'next/dynamic'
import BrandLoader from './BrandLoader'
import type { AuthUser } from '@/lib/auth/session'

const AppShell = dynamic(() => import('@/components/layout/AppShell'), {
  ssr: false,
  // Branded boot screen while the shell chunk + stores hydrate —
  // previously this window was a blank page.
  loading: () => <BrandLoader label="Loading your workspace" />,
})

export default function AppShellLoader({ user }: { user: AuthUser }) {
  return <AppShell user={user} />
}
