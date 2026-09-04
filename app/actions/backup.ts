'use server'

import { getCurrentUser } from '@/lib/auth/session'
import { prisma } from '@/lib/auth/prisma'
import type { BackupData, Job, Template, BudgetCategory, Expense, BudgetGoal, Shift } from '@/types'
import { BACKUP_SCHEMA_VERSION } from '@/lib/backupSchema'
import { parseBackupToObject } from '@/services/importService'

/**
 * Backup server actions (v6.4).
 *
 * The DB is the source of truth. This module assembles a per-user
 * `BackupData` bundle directly from Prisma, including the v6.4 fields
 * that v6.3 backups lacked: categories, expenses, budget goals, and
 * per-month notes.
 *
 * Import is handled by the existing `services/importService.ts` (which
 * already routes to the per-domain CRUD server actions for shifts,
 * jobs, and templates) plus per-domain bulk helpers in
 * `app/actions/expenses.ts` and `app/actions/budget.ts` for the
 * v6.4 additions.
 */

export interface BackupBundle {
  /** Source-of-truth JSON shape (matches `BackupData`). */
  data: BackupData
  /** Pre-built single-file CSV (multi-table combined, `# section:` separators). */
  csvText: string
}

const CSV_HEADER_LINE = (section: string) => `# section: ${section}`

async function requireUserId(): Promise<string> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

export async function fetchBackupBundle(): Promise<BackupBundle> {
  const userId = await requireUserId()

  const [
    user,
    jobRows,
    templateRows,
    shiftRows,
    categoryRows,
    expenseRows,
    goalRows,
    noteRows,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        actualTimesEnabled: true,
        currency: true,
        location: true,
        schoolFee: true,
        // Name + email intentionally NOT exported: profiles are per-account on
        // the receiving device. Only portable prefs (currency / location /
        // schoolFee) make the round-trip.
      },
    }),
    prisma.userJob.findMany({ where: { userId }, orderBy: { sortOrder: 'asc' } }),
    prisma.userTemplate.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.userShift.findMany({ where: { userId }, orderBy: { date: 'asc' } }),
    prisma.expenseCategory.findMany({ where: { userId }, orderBy: { id: 'asc' } }),
    prisma.expense.findMany({ where: { userId }, orderBy: { date: 'asc' } }),
    prisma.userBudgetGoal.findMany({ where: { userId }, orderBy: { createdMonth: 'asc' } }),
    prisma.userBudgetMonthMeta.findMany({
      where: { userId, NOT: { notes: '' } },
    }),
  ])

  // Map rows to client types ───────────────────────────────────
  const jobs: Job[] = jobRows.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    rate: r.rate,
    nightRate: r.nightRate,
  }))

  const templates: Template[] = templateRows.map((r) => ({
    id: r.id,
    name: r.name,
    jobId: r.jobId,
    start: r.start,
    end: r.end,
    days: Array.isArray(r.days) ? (r.days as number[]) : [],
    breaks: [],
    workDetails: (r.workDetails as any) ?? null,
  }))

  // Group shifts into ShiftsStore (Record<dateKey, Shift[]>).
  // `r.date` is a Date object; convert to "YYYY-MM-DD".
  const shiftsMap: Record<string, Shift[]> = {}
  const toDateKey = (d: Date): string => {
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(d.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
  }
  for (const r of shiftRows) {
    const dk = toDateKey(r.date)
    if (!shiftsMap[dk]) shiftsMap[dk] = []
    shiftsMap[dk].push({
      jobId: r.jobId,
      start: r.start,
      end: r.end,
      breaks: [],
      actualLogin: r.actualLogin ?? undefined,
      actualLogout: r.actualLogout ?? undefined,
      actualBreaks: (r.actualBreaks as any) ?? undefined,
      // v6.4 backup now preserves the DB-only fields so the round-trip
      // doesn't silently drop per-shift notes, the template that produced
      // the shift, or its bookkeeping source.
      workDetails: (r.workDetails as any) ?? undefined,
      templateId: r.templateId ?? undefined,
      source: r.source ?? undefined,
    } as any)
  }

  // Categories: emit parent rows + child rows flat. Children carry
  // `parentName` so the CSV round-trip is human-readable.
  // The schema uses `sortOrder`; we surface that as the priority field.
  const categories: BudgetCategory[] = categoryRows.map((r) => {
    const parent = r.parentId
      ? categoryRows.find((p) => p.id === r.parentId) ?? null
      : null
    return {
      id: r.id,
      name: r.name,
      icon: r.icon ?? '',
      budget: r.budget ?? 0,
      priority: r.sortOrder ?? 0,
      ...(parent ? { parentName: parent.name } : {}),
    } as any as BudgetCategory
  })

  // Expenses grouped by monthKey for JSON. We carry `categoryName` along
  // with a deterministic numeric `categoryId` so an importer can rebind
  // by name when the receiving user has different id sequences.
  type BackupExpenseRow = Expense & { categoryName: string }
  const expensesByMonth: Record<string, BackupExpenseRow[]> = {}
  // Each unique category-name maps to a deterministic numeric id.
  const nameToNumericId = new Map<string, number>()
  let nId = 1
  for (const r of expenseRows) {
    const dk = toDateKey(r.date)
    const monthKey = dk.slice(0, 7)
    if (!expensesByMonth[monthKey]) expensesByMonth[monthKey] = []
    const cat = categoryRows.find((c) => c.id === r.categoryId)
    const catName = cat?.name ?? ''
    if (catName && !nameToNumericId.has(catName)) {
      nameToNumericId.set(catName, nId++)
    }
    const categoryId = nameToNumericId.get(catName) ?? 0
    expensesByMonth[monthKey].push({
      categoryId,
      categoryName: catName,
      amount: Math.round(r.amount),
      date: dk,
      note: r.note ?? '',
    })
  }

  const goals: BudgetGoal[] = goalRows.map((r) => ({
    id: r.id,
    name: r.name,
    deadline: r.deadline,
    target: r.target,
    percentage: r.percentage ?? 0,
    priority: r.priority ?? 0,
    createdMonth: r.createdMonth,
    monthlyProgress: (r.monthlyProgress as Record<string, number> | null) ?? {},
    cumulativeAmount: Object.values((r.monthlyProgress as Record<string, number>) ?? {}).reduce(
      (a, b) => a + (b ?? 0),
      0
    ),
    status: 'active',
  }))

  const monthNotes: Record<string, string> = {}
  for (const r of noteRows) monthNotes[r.monthKey] = r.notes

  const data: BackupData = {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    profile: {
      country: user?.location ?? 'Japan',
      weeklyLimit: 28,
      currency: user?.currency ?? 'JPY',
      // School-fee target is also user-local — keep it on the bundle so
      // the import flow can restore it on a freshly-provisioned device.
      schoolFee: user?.schoolFee ?? 840000,
    },
    jobs,
    templates,
    shifts: shiftsMap,
    expenses: expensesByMonth,
    categories,
    goals,
    monthNotes,
    entries: [],
  }

  const csvText = buildCsvText(data)
  return { data, csvText }
}

// ── CSV serializer ────────────────────────────────────────────────────
function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean'
    ? String(v)
    : JSON.stringify(v)
  const needsQuote = /[\",\r\n]/.test(s)
  if (!needsQuote) return s
  return '"' + s.replace(/"/g, '""') + '"'
}

function buildCsvText(data: BackupData): string {
  const parts: string[] = []

  // Profile ── single row
  parts.push(CSV_HEADER_LINE('profile'))
  parts.push('schemaVersion,exportedAt,country,weeklyLimit,currency')
  parts.push([
    data.schemaVersion ?? '',
    data.exportedAt,
    data.profile?.country ?? '',
    data.profile?.weeklyLimit ?? '',
    data.profile?.currency ?? '',
  ].map(csvEscape).join(','))
  parts.push('') // blank separator

  // Jobs
  parts.push(CSV_HEADER_LINE('jobs'))
  parts.push('id,name,color,rate,nightRate')
  for (const j of data.jobs ?? []) {
    parts.push([j.id, j.name, j.color, j.rate, j.nightRate].map(csvEscape).join(','))
  }
  parts.push('')

  // Templates
  parts.push(CSV_HEADER_LINE('templates'))
  parts.push('id,name,jobId,start,end,daysJson,workDetails')
  for (const t of data.templates ?? []) {
    parts.push(
      [t.id, t.name, t.jobId, t.start, t.end, JSON.stringify(t.days ?? []), JSON.stringify(t.workDetails ?? null)]
        .map(csvEscape)
        .join(',')
    )
  }
  parts.push('')

  // Shifts ── flattened, one row per shift. v6.4 backup retains the
  // per-shift DB metadata (workDetails/templateId/source) so re-import on
  // another device round-trips without silently losing that context.
  parts.push(CSV_HEADER_LINE('shifts'))
  parts.push(
    'date,jobId,start,end,actualLogin,actualLogout,actualBreaksJson,workDetailsJson,templateId,source'
  )
  const shifts = data.shifts ?? {}
  for (const dk of Object.keys(shifts)) {
    for (const s of shifts[dk] ?? []) {
      parts.push(
        [
          dk,
          s.jobId,
          s.start,
          s.end,
          s.actualLogin ?? '',
          s.actualLogout ?? '',
          JSON.stringify((s as any).actualBreaks ?? null),
          JSON.stringify((s as any).workDetails ?? null),
          (s as any).templateId ?? '',
          (s as any).source ?? '',
        ]
          .map(csvEscape)
          .join(',')
      )
    }
  }
  parts.push('')

  // Categories
  parts.push(CSV_HEADER_LINE('categories'))
  parts.push('id,name,icon,budget,priority,parentName')
  for (const c of data.categories ?? []) {
    parts.push([c.id, c.name, c.icon, c.budget, c.priority, (c as any).parentName ?? ''].map(csvEscape).join(','))
  }
  parts.push('')

  // Expenses ── subject to falling back to categoryName when id isn\'t durable
  parts.push(CSV_HEADER_LINE('expenses'))
  parts.push('monthKey,date,categoryId,categoryName,amount,note,id')
  const expenses = data.expenses ?? {}
  for (const monthKey of Object.keys(expenses)) {
    for (const e of expenses[monthKey] ?? []) {
      parts.push(
        [
          monthKey,
          e.date,
          e.categoryId,
          (e as any).categoryName ?? '',
          e.amount,
          e.note ?? '',
          (e as any).id ?? '',
        ]
          .map(csvEscape)
          .join(',')
      )
    }
  }
  parts.push('')

  // Goals
  parts.push(CSV_HEADER_LINE('goals'))
  parts.push('id,name,deadline,target,percentage,priority,createdMonth,monthlyProgressJson')
  for (const g of data.goals ?? []) {
    parts.push(
      [
        g.id,
        g.name,
        g.deadline,
        g.target,
        g.percentage,
        g.priority,
        g.createdMonth,
        JSON.stringify(g.monthlyProgress ?? {}),
      ]
        .map(csvEscape)
        .join(',')
    )
  }
  parts.push('')

  // Notes
  parts.push(CSV_HEADER_LINE('notes'))
  parts.push('monthKey,notes')
  const notes = data.monthNotes ?? {}
  for (const monthKey of Object.keys(notes)) {
    parts.push([monthKey, notes[monthKey] ?? ''].map(csvEscape).join(','))
  }
  parts.push('')

  return parts.join('\n')
  }

  // ── Import preview / dry-run ────────────────────────────────────────

  /** Per-domain row counts. Generic so it's reused for backup, current,
   *  and diff shapes. */
  export type DomainCounts = {
    jobs: number
    templates: number
    shifts: number
    categories: number
    expenses: number
    goals: number
    notes: number
    entries: number
  }

  export interface ImportPreview {
    mode: 'replace' | 'merge'
    format: 'json' | 'csv'
    backup: {
      fileName: string
      fileSizeBytes: number
      schemaVersion: string | null
      exportedAt: string | null
      counts: DomainCounts
    }
    current: DomainCounts
    diff: {
      /** Rows this import would remove from the user's current data. */
      willRemove: DomainCounts
      /** Rows this import would insert. */
      willInsert: DomainCounts
    }
    /** Rows in the backup whose jobId / categoryId can't be resolved. */
    danglingReferences: string[]
    /** Errors that prevent import — surfaced before the user can proceed. */
    blockers: string[]
    /** Non-fatal notices (e.g. v6.3 → v6.4 times approximation). */
    warnings: string[]
  }

  function countShifts(shifts: BackupData['shifts'] | undefined): number {
    if (!shifts) return 0
    if (Array.isArray(shifts)) return shifts.length
    if (typeof shifts === 'string') return 0
    const asMap = shifts as unknown as Record<string, unknown[]>
    return Object.values(asMap).reduce(
      (sum, day) => sum + (Array.isArray(day) ? day.length : 0),
      0,
    )
  }

  /**
   * Parse a backup file and diff it against the user's current data —
   * WITHOUT writing anything. Used by the BackupPanel's preview step so
   * the user sees exactly what "Replace" will remove before committing.
   */
  export async function previewImport(
    file: { name: string; size: number; text(): Promise<string> },
    mode: 'replace' | 'merge'
  ): Promise<ImportPreview> {
    const userId = await requireUserId()

    const emptyCounts = (): DomainCounts => ({
      jobs: 0, templates: 0, shifts: 0, categories: 0, expenses: 0, goals: 0, notes: 0, entries: 0,
    })

    if (file.size > 25_000_000) {
      return {
        mode,
        format: file.name.endsWith('.csv') ? 'csv' : 'json',
        backup: { fileName: file.name, fileSizeBytes: file.size, schemaVersion: null, exportedAt: null, counts: emptyCounts() },
        current: emptyCounts(),
        diff: { willRemove: emptyCounts(), willInsert: emptyCounts() },
        danglingReferences: [],
        blockers: [`Backup file too large (${Math.round(file.size / 1024 / 1024)} MB > 25 MB).`],
        warnings: [],
      }
    }

    const text = await file.text()
    let parsed
    try {
      parsed = parseBackupToObject(text, 'auto')
    } catch (err) {
      return {
        mode,
        format: file.name.endsWith('.csv') ? 'csv' : 'json',
        backup: { fileName: file.name, fileSizeBytes: file.size, schemaVersion: null, exportedAt: null, counts: emptyCounts() },
        current: emptyCounts(),
        diff: { willRemove: emptyCounts(), willInsert: emptyCounts() },
        danglingReferences: [],
        blockers: [(err as Error).message],
        warnings: [],
      }
    }

    const data = parsed.data

    // ── Collect dangling references (jobs missing from the backup) ──
    const dangling: string[] = []
    const backupJobIds = new Set<string>((data.jobs ?? []).map((j) => j.id))
      const backupCategoryIds = new Set<number>((data.categories ?? []).map((c) => c.id))

      const shiftRows = (data.shifts as unknown as Record<string, unknown[]> | undefined) ?? {}
      for (const dayRows of Object.values(shiftRows)) {
        if (!Array.isArray(dayRows)) continue
        for (const s of dayRows as Array<{ jobId?: string }>) {
          if (s?.jobId && !backupJobIds.has(s.jobId)) {
            dangling.push(`shift → unknown jobId "${s.jobId}"`)
          }
        }
      }
      for (const t of data.templates ?? []) {
        if (t.jobId && !backupJobIds.has(t.jobId)) {
                  dangling.push(`template "${t.name}" → unknown jobId "${t.jobId}"`)
                }
              }
              const expensesMap = ((data as any).expenses as Record<string, unknown[]> | undefined) ?? {}
              for (const monthRows of Object.values(expensesMap)) {
                if (!Array.isArray(monthRows)) continue
                for (const e of monthRows as Array<{ categoryId?: unknown }>) {
                  const catId = e?.categoryId
                  if (typeof catId === 'number' && !backupCategoryIds.has(catId)) {
                    dangling.push(`expense → unknown categoryId "${catId}"`)
                  }
                }
              }

            const backupCounts: DomainCounts = {
              jobs: (data.jobs ?? []).length,
              templates: (data.templates ?? []).length,
              shifts: countShifts(data.shifts),
              categories: (data.categories ?? []).length,
              expenses: Object.values(expensesMap).reduce(
                (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
                0,
              ),
              goals: (data.goals ?? []).length,
              notes: Object.keys(data.monthNotes ?? {}).length,
              entries: Array.isArray((data as any).entries) ? ((data as any).entries as unknown[]).length : 0,
            }

    // Current DB state for this user.
    const [jobs, templates, shifts, categories, expenses, goals, notes] = await Promise.all([
      prisma.userJob.count({ where: { userId } }),
      prisma.userTemplate.count({ where: { userId } }),
      prisma.userShift.count({ where: { userId } }),
      prisma.expenseCategory.count({ where: { userId } }),
      prisma.expense.count({ where: { userId } }),
      prisma.userBudgetGoal.count({ where: { userId } }),
      prisma.userBudgetMonthMeta.count({ where: { userId } }),
    ])

    const currentCounts: DomainCounts = {
      jobs, templates, shifts, categories, expenses, goals, notes, entries: 0,
    }

    const willRemove: DomainCounts =
      mode === 'replace' ? { ...currentCounts, entries: 0 } : emptyCounts()

    const willInsert: DomainCounts =
      mode === 'replace'
        ? { ...backupCounts }
        : {
            ...emptyCounts(),
            // Merge keeps existing; approximate with backup counts (exact
            // per-row dedupe is a later feature). Label as "up to" in UI.
            jobs: backupCounts.jobs,
            templates: backupCounts.templates,
            shifts: backupCounts.shifts,
            categories: backupCounts.categories,
            expenses: backupCounts.expenses,
            goals: backupCounts.goals,
            notes: backupCounts.notes,
          }

    return {
      mode,
      format: parsed.format,
      backup: {
        fileName: file.name,
        fileSizeBytes: file.size,
        schemaVersion: parsed.schemaVersion,
        exportedAt: parsed.exportedAt,
        counts: backupCounts,
      },
      current: currentCounts,
      diff: { willRemove, willInsert },
      danglingReferences: dangling,
      blockers: [],
      warnings: parsed.warnings,
    }
  }
