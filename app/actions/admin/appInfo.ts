'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/auth/prisma'
import { requireAdmin } from '@/lib/auth/guards'
import { logAdminAction } from '@/lib/auth/audit'

/**
 * Admin-controlled "System & App Information" card values.
 *
 * The Account page renders the AppInfo row for every signed-in user.
 * Admins edit the row from /admin/settings. We use a singleton row
 * (id = 1) so reads are O(1) and there's nothing to join.
 *
 * Action keys are 64/128 chars max (db schema). Long inputs are trimmed
 * before save so we never silently truncate the user's text.
 */

export interface AppInfoValues {
  version: string
  weeklyHourLimit: string
  schoolTarget: string
  database: string
  activeWindow: string
  developers: string
  updatedAt: Date
  updatedBy: string | null
}

const DEFAULTS = {
  version: 'v7.2',
  weeklyHourLimit: '28 Hours (Visa)',
  schoolTarget: '¥840,000',
  database: 'Cloud PostgreSQL',
  activeWindow: 'Apr 2026 – Sep 2027',
  developers: 'Nitheshwar & Arockia',
}

function clamp(s: string, max: number): string {
  // Strip control chars + collapse whitespace, then truncate to fit the column.
  return s.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max)
}

function rowToValues(row: {
  version: string
  weeklyHourLimit: string
  schoolTarget: string
  database: string
  activeWindow: string
  developers: string
  updatedAt: Date
  updatedBy: string | null
}): AppInfoValues {
  return {
    version: row.version,
    weeklyHourLimit: row.weeklyHourLimit,
    schoolTarget: row.schoolTarget,
    database: row.database,
    activeWindow: row.activeWindow,
    developers: row.developers,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  }
}

/**
 * Read the singleton AppInfo row, creating defaults on first access.
 * Returns the values shaped for the Account page card.
 */
export async function getAppInfo(): Promise<AppInfoValues> {
  // upsert on the singleton id; cheap, no admin guard needed (public read).
  const row = await prisma.appInfo.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, ...DEFAULTS },
  })
  return rowToValues(row)
}

/**
 * Admin-only update of the AppInfo row. Returns the new values on success.
 */
export async function updateAppInfo(
  input: Partial<Omit<AppInfoValues, 'updatedAt' | 'updatedBy'>>
): Promise<{ success: boolean; error?: string; values?: AppInfoValues }> {
  const admin = await requireAdmin()

  // Validate input shape: only allow known keys with non-empty strings.
  const patch: Record<string, string> = {}
  const LENGTHS: Record<string, number> = {
    version: 64,
    weeklyHourLimit: 64,
    schoolTarget: 64,
    database: 64,
    activeWindow: 64,
    developers: 128,
  }
  for (const [key, max] of Object.entries(LENGTHS)) {
    if (key in input) {
      const raw = (input as Record<string, unknown>)[key]
      if (typeof raw !== 'string') {
        return { success: false, error: `${key} must be a string` }
      }
      const trimmed = clamp(raw, max)
      if (!trimmed) {
        return { success: false, error: `${key} cannot be empty` }
      }
      patch[key] = trimmed
    }
  }

  if (Object.keys(patch).length === 0) {
    return { success: false, error: 'Nothing to update' }
  }

  const row = await prisma.appInfo.upsert({
    where: { id: 1 },
    update: { ...patch, updatedBy: admin.id },
    create: { id: 1, ...DEFAULTS, ...patch, updatedBy: admin.id },
  })

  await logAdminAction({
    adminUserId: admin.id,
    action: 'admin.update_app_info',
    targetType: null,
    targetId: null,
    metadata: { fields: Object.keys(patch) },
  })

  // Account page shows the card; admin settings page shows the form.
  revalidatePath('/account')
  revalidatePath('/admin/settings')

  return { success: true, values: rowToValues(row) }
}
