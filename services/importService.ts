import type { BackupData } from '@/types'
import { csvSectionsToBackupData } from '@/lib/csv'
import { applyProfilePrefs } from '@/app/actions/account'
import {
  getJobs,
  createJob as serverCreateJob,
  deleteJob as serverDeleteJob,
} from '@/app/actions/jobs'
import {
  getTemplates,
  createTemplate as serverCreateTemplate,
  deleteTemplate as serverDeleteTemplate,
  type TemplateData,
} from '@/app/actions/templates'
import {
  createShifts as serverCreateShifts,
  deleteAllShifts as serverDeleteAllShifts,
  type NewShiftInput,
} from '@/app/actions/shifts'
import {
  getCategories,
  getExpenses,
  createCategory,
  updateCategory,
  createExpensesBulk,
  deleteAllExpensesAndCategories as serverDeleteAllExpensesAndCategories,
} from '@/app/actions/expenses'
import {
  createBudgetGoal,
  deleteBudgetGoal,
  setBudgetMonthNotes,
  getBudgetGoals,
} from '@/app/actions/budget'
import { useJobsStore } from '@/store/useJobsStore'
import { useShiftsStore } from '@/store/useShiftsStore'
import { useTemplatesStore } from '@/store/useTemplatesStore'

export interface ImportResult {
  jobs: number
  templates: number
  shifts: number
  categories: number
  expenses: number
  goals: number
  notes: number
  entries: number
  mode: 'replace' | 'merge'
  format: 'json' | 'csv'
  warnings: string[]
  failures: string[]
}

const MAX_FILE_BYTES = 25_000_000

// ── Format sniffing ────────────────────────────────────────

function looksLikeCsv(text: string): boolean {
  const first = text
    .split(/\r?\n/, 20)
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith('{') && !l.startsWith('"') && !l.startsWith('//'))
  if (!first) return false
  return first.startsWith('# section:') || first.split(',').length >= 3
}

/**
 * Shared parser used by both `importData` (writes to DB) and the
 * dry-run preview action. Returns the normalised BackupData shape
 * plus any parse-time warnings (v6.3 → v6.4 conversion notices).
 *
 * Throws a descriptive Error for unrecoverable parse failures —
 * the UI surfaces the message verbatim so the user can fix their
 * backup file.
 */
export interface ParseBackupResult {
  data: Partial<BackupData>
  warnings: string[]
  format: 'json' | 'csv'
  schemaVersion: string | null
  exportedAt: string | null
}

export function parseBackupToObject(
  text: string,
  detected: 'json' | 'csv' | 'auto' = 'auto'
): ParseBackupResult {
  const fmt: 'json' | 'csv' =
    detected === 'auto' ? (looksLikeCsv(text) ? 'csv' : 'json') : detected

  let data: Partial<BackupData>
  const warnings: string[] = []

  if (fmt === 'csv') {
    data = csvSectionsToBackupData(text)
  } else {
    try {
      data = JSON.parse(text) as Partial<BackupData>
    } catch (err) {
      throw new Error(`JSON parse failed: ${(err as Error).message}. Did you mean CSV?`)
    }
    if (!data || typeof data !== 'object' || (!data.jobs && !data.shifts)) {
      throw new Error('Invalid backup: missing jobs and shifts.')
    }
  }

  // Version tolerance — mirrors what importData does so preview +
  // import agree on what's acceptable.
  const version = (data.schemaVersion ?? '6.3.0') as string
  if (version !== '6.3.0' && version !== '6.4.0') {
    throw new Error(`Backup file version (${version}) is too new. Update the app.`)
  }
  if (version === '6.3.0' && !data.shifts && (data as any).entries) {
    warnings.push('v6.3 entries-only backup — shifts synthesised, times are lossy.')
  }

  // Normalise shifts so both v6.3 + v6.4 collapse to a single dict.
  if (data.shifts && typeof data.shifts !== 'string' && !Array.isArray(data.shifts)) {
    data.shifts = normalizeShiftsShape(data.shifts as unknown as Record<string, unknown>) as any
  }

  // v6.3 entries → synthesised shifts (only when no real shifts present).
  const rawEntries = (data as any).entries as unknown[] | undefined
  const hadShifts = !!(data.shifts && Object.keys(data.shifts).length > 0)
  if (!hadShifts && Array.isArray(rawEntries)) {
    ;(data as any).shifts = synthShiftsFromEntries(rawEntries)
  }

  return {
    data,
    warnings,
    format: fmt,
    schemaVersion: version,
    exportedAt: data.exportedAt ?? null,
  }
}

// ── Normalisers ────────────────────────────────────────────

function normalizeName(input: string): string {
  return (input ?? '').normalize('NFC').trim().toLowerCase()
}

function dedupSignature(input: {
  categoryId: string
  amount: number
  date: string
  note?: string
}): string {
  return [
    input.date ?? '',
    input.categoryId ?? '',
    Number.isFinite(input.amount) ? input.amount : 0,
    input.note ?? '',
  ].join('\u0001')
}

function looksLikeDayRow(x: unknown): x is { date: string; shifts: unknown[] } {
  if (!x || typeof x !== 'object') return false
  const r = x as Record<string, unknown>
  return typeof r.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
    Array.isArray(r.shifts)
}

function looksLikeShiftRow(x: unknown): x is { jobId: string; start: string; end: string; actualLogin?: string; actualLogout?: string } {
  if (!x || typeof x !== 'object') return false
  const r = x as Record<string, unknown>
  return typeof r.jobId === 'string' && r.jobId.length > 0 &&
    typeof r.start === 'string' && r.start.length > 0 && /^\d{2}:\d{2}$/.test(r.start) &&
    typeof r.end === 'string' && r.end.length > 0 && /^\d{2}:\d{2}$/.test(r.end)
}

function isValidShift(x: unknown): x is { jobId: string; start: string; end: string } {
  return looksLikeShiftRow(x)
}

/**
 * Canonicalise data.shifts into Record<dateKey, Shift[]>.
 * Handles v6.4 { "2026-04-25": [...] } and v6.3 { "0": { date, shifts } }.
 */
function normalizeShiftsShape(raw: Record<string, unknown>): Record<string, unknown[]> {
  const out: Record<string, unknown[]> = {}

  for (const k of Object.keys(raw ?? {})) {
    const v = raw[k]
    if (Array.isArray(v)) {
      // Direct date-keyed arrays: only trust keys that are real dates —
      // anything else (legacy index keys, typos) would flow into the DB
      // batch and fail the whole chunk.
      const keyOk = /^\d{4}-\d{2}-\d{2}$/.test(k)
      for (const row of v) {
        if (looksLikeShiftRow(row)) {
          if (keyOk) (out[k] ??= []).push(row)
          continue
        }
        if (looksLikeDayRow(row)) {
          (out[row.date] ??= [])
          for (const s of row.shifts ?? []) if (looksLikeShiftRow(s)) out[row.date].push(s)
        }
      }
      continue
    }
    if (looksLikeDayRow(v)) {
      (out[v.date] ??= [])
      for (const s of v.shifts ?? []) if (looksLikeShiftRow(s)) out[v.date].push(s)
      continue
    }
    if (v && typeof v === 'object' && Array.isArray((v as any).shifts)) {
      const dk = (v as any).date ?? k
      ;(out[dk] ??= [])
      for (const s of (v as any).shifts ?? []) if (looksLikeShiftRow(s)) out[dk].push(s)
    }
  }

  for (const dk of Object.keys(out)) {
    // Dedup by (jobId, start, end). When duplicates collide, keep the
    // RICHER row: legacy backups often list the same shift twice — once
    // from an index-shaped entry (no actuals) and once date-keyed with
    // actual clock times. First-wins would silently drop the actuals.
    const bySig = new Map<string, unknown>()
    for (const row of out[dk] ?? []) {
      if (!looksLikeShiftRow(row)) continue
      const sig = `${row.jobId}\u0001${row.start}\u0001${row.end}`
      const prev = bySig.get(sig) as { actualLogin?: string; actualLogout?: string } | undefined
      const richer =
        !prev || (!prev.actualLogin && !prev.actualLogout && (row.actualLogin || row.actualLogout))
      if (richer) bySig.set(sig, row)
    }
    out[dk] = [...bySig.values()]
  }

  return out
}

/**
 * Synthesise shifts from v6.3 entries[]: { date, jobs:[{jobId,dayHours,nightHours}] }.
 * Lossy — exact times and breaks are not preserved.
 */
function synthShiftsFromEntries(entries: unknown[]): Record<string, unknown[]> {
  const out: Record<string, unknown[]> = {}
  for (const e of entries) {
    if (!e || typeof (e as any).date !== 'string') continue
    const dk = (e as any).date as string
    ;(out[dk] ??= [])
    const jobs: unknown[] = (e as any).jobs ?? []
    for (const j of jobs) {
      if (!j || typeof (j as any).jobId !== 'string') continue
      const day = Number((j as any).dayHours) || 0
      const night = Number((j as any).nightHours) || 0
      if (day + night <= 0) continue
      if (day > 0) {
        const startH = 9
        const endH = Math.max(startH + 1, startH + Math.floor(day))
        out[dk].push({ jobId: (j as any).jobId, start: pad(startH) + ':00', end: pad(endH) + ':00', breaks: [] })
      }
      if (night > 0) {
        out[dk].push({ jobId: (j as any).jobId, start: '22:30', end: pad(22 + Math.ceil(night + 0.5)) + ':00', breaks: [] })
      }
    }
  }
  return out
}

function pad(n: number): string { return String(n).padStart(2, '0') }

// ── Top-level entry ────────────────────────────────────────

export async function importData(
  file: File,
  mode: 'replace' | 'merge',
  format: 'json' | 'csv' | 'auto' = 'auto'
): Promise<ImportResult> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`Backup file too large (${Math.round(file.size / 1024 / 1024)} MB > 25 MB).`)
  }

  const text = await file.text()
  const parsed = parseBackupToObject(text, format)
  const data = parsed.data
  const warnings = [...parsed.warnings]
  const failures: string[] = []

  function pushFailure(domain: string, ctx: string, err: unknown) {
    try {
      const msg = (err instanceof Error ? err.message : String(err)) || String(err)
      failures.push(`${domain}: ${ctx} => ${msg}`)
    } catch {
      failures.push(`${domain}: ${ctx} => <unavailable>`)
    }
  }

  // Reconstructed shifts from v6.3 entries are surfaced as a warning
  // so the user can verify on the calendar (times are lossy).
  const rawEntries = (data as any).entries as unknown[] | undefined
  const synthResult: Record<string, unknown[]> = (data.shifts as any) ?? {}
  if (Array.isArray(rawEntries) && rawEntries.length > 0 && Object.keys(synthResult).length > 0) {
    warnings.push(
      `Reconstructed ${Object.keys(synthResult).length} day(s) from v6.3 entries[] — times approximated, verify on calendar.`
    )
  } else if (Array.isArray(rawEntries) && rawEntries.length > 0 && Object.keys(synthResult).length === 0) {
    warnings.push(
      `Reconstructed 0 day(s) of work-hours from a v6.3 entries[] backup. Times are approximated — verify on the calendar.`
    )
  } else if (!data.shifts || Object.keys(data.shifts as any).length === 0) {
    warnings.push('Backup contains no shift data.')
  }

  // ── profile prefs ───────────────────────────────────────
  if (data.profile) {
    try {
      await applyProfilePrefs({
        currency: (data.profile as any).currency ?? null,
        location: (data.profile as any).country ?? null,
        schoolFee: (data.profile as any).schoolFee ?? null,
      })
    } catch (err) {
      console.warn('[importData] applyProfilePrefs failed', err)
    }
  }

  // ── replace mode – wipe ─────────────────────────────────
  // Wipe SEQUENTIALLY so each delete fully completes before the next begins.
  // Parallel deletes resolve before the DB actually removes rows, causing
  // P2002 constraint violations when imports start immediately after.
  if (mode === 'replace') {
    const existingJobs = await getJobs()
    for (const j of existingJobs) await serverDeleteJob(j.id).catch(() => null)

    const existingTemplates = await getTemplates()
    for (const t of existingTemplates) await serverDeleteTemplate(t.id).catch(() => null)

    // Wipe shifts at the DB level — the client store may not have synced
    // every month, so deleting by its date keys would leave rows behind.
    await serverDeleteAllShifts().catch(() => null)

    const existingGoals = await getBudgetGoals()
    for (const g of existingGoals) await deleteBudgetGoal(g.id).catch(() => null)

    // Full expenses+categories wipe — replace mode must recreate the
    // backup's exact category tree. Wiping only the backup's expense
    // months (old behaviour) left categories accumulating a duplicate
    // set on every replace import (33 → 66 → 99 …). Expenses go first:
    // they hold required FKs to categories.
    await serverDeleteAllExpensesAndCategories().catch(() => null)
  }

  // ── jobId remap: strip old IDs, let server mint fresh ones ──────
  // Strategy: don't pass id to createJob → server generates a fresh
  // user-prefixed ID (e.g. nithesh_j1) for the importing user.
  // Build a remap table { backupId → newDbId }, then update every
  // shift/template jobId reference before inserting.
  const jobIdMap = new Map<string, string>() // backup job.id → new DB job.id
  const dbJobsByName = new Map<string, string>() // name → DB job.id

  const jobsBefore = await getJobs()
  for (const row of jobsBefore) {
    const key = row.name?.trim().toLowerCase()
    if (key) dbJobsByName.set(key, row.id)
  }
  // Pre-link: if a backup job has the same name as an existing DB job,
  // the existing row is reused (safe for merge).
  for (const j of data.jobs ?? []) {
    const key = j.name?.trim().toLowerCase()
    if (!key) continue
    const existing = dbJobsByName.get(key)
    if (existing) jobIdMap.set(j.id, existing)
  }

  // Create new jobs — id is NOT passed; server mints a fresh user-prefixed ID.
  let jobsInserted = 0
  for (const j of data.jobs ?? []) {
    const key = j.name?.trim().toLowerCase()
    if (!key) continue
    if (jobIdMap.has(j.id)) continue // already linked to existing job
    try {
      const created = await serverCreateJob({
        name: j.name,
        color: j.color,
        rate: j.rate,
        nightRate: j.nightRate,
      })
      if (created?.id) jobIdMap.set(j.id, created.id)
      jobsInserted++
    } catch (err) {
      console.warn('[importData] serverCreateJob failed for', j.name, err)
    }
  }

  // Final sweep: pick up any inserts that may have had their ID re-minted
  // by re-querying the DB by name.
  const jobsAfter = await getJobs()
  for (const row of jobsAfter) {
    const key = row.name?.trim().toLowerCase()
    if (!key) continue
    dbJobsByName.set(key, row.id)
  }
  for (const j of data.jobs ?? []) {
    const key = j.name?.trim().toLowerCase()
    if (!key) continue
    const dbId = dbJobsByName.get(key)
    if (dbId) jobIdMap.set(j.id, dbId)
  }

  // ── templates ─────────────────────────────────────────────
  // templateIdMap remaps backup template ids → fresh DB ids so shift
  // rows never point at stale/foreign ids (spec: no raw-backup-id
  // fallback, no broken links).
  let templatesInserted = 0
  const templateIdMap = new Map<string, string>()
  if (Array.isArray(data.templates)) {
    // Same-user re-import: an existing DB template with the identical id
    // is still valid — record it so shifts can keep pointing at it.
    for (const t of await getTemplates()) {
      templateIdMap.set(t.id, t.id)
    }
    for (const t of data.templates) {
      const mappedJobId = jobIdMap.get(t.jobId)
      if (!mappedJobId) {
        warnings.push(`Template "${t.name}" references unknown jobId "${t.jobId}" — skipped`)
        continue
      }
      try {
        const created = await serverCreateTemplate({
          name: t.name,
          days: Array.isArray(t.days) ? t.days : [],
          jobId: mappedJobId,
          start: t.start,
          end: t.end,
          workDetails: (t as any).workDetails ?? null,
        })
        if (t.id && created?.id) templateIdMap.set(t.id, created.id)
        templatesInserted++
      } catch (err) {
        console.warn('[importData] serverCreateTemplate failed for', t.name, err)
      }
    }
  }

  // ── shifts ────────────────────────────────────────────────
  // Every shift's jobId MUST resolve via jobIdMap. If a shift references
  // an unknown jobId it is logged and SKIPPED — no broken links written.
  const existingShifts = useShiftsStore.getState().shifts
  const shiftsByDate = (data.shifts ?? {}) as Record<string, unknown[]>
  const shiftInputs: NewShiftInput[] = []
  const warnedTplIds = new Set<string>()

  for (const dk of Object.keys(shiftsByDate)) {
    const day = shiftsByDate[dk] ?? []
    const existingDay = existingShifts[dk] ?? []
    for (const s of day) {
      const rawJobId = (s as any).jobId as string
      const mappedJobId = jobIdMap.get(rawJobId)

      if (!mappedJobId) {
        warnings.push(
          `Shift on ${dk} references unknown jobId "${rawJobId}" — skipped. ` +
          `Ensure all jobs are imported before shifts.`
        )
        continue
      }

      if (mode === 'merge') {
        const dup = existingDay.find(
          (e) => e.jobId === mappedJobId && e.start === (s as any).start && e.end === (s as any).end
        )
        if (dup) continue
      }

      const rawTplId = (s as any).templateId as string | undefined
      if (rawTplId && !templateIdMap.has(rawTplId) && !warnedTplIds.has(rawTplId)) {
        warnedTplIds.add(rawTplId)
        warnings.push(
          `Shift on ${dk} references templateId "${rawTplId}" that was not imported — ` +
          `the link was dropped (shift kept).`
        )
      }

      shiftInputs.push({
        date: dk,
        jobId: mappedJobId,
        start: (s as any).start ?? '00:00',
        end: (s as any).end ?? '00:00',
        actualLogin: (s as any).actualLogin ?? null,
        actualLogout: (s as any).actualLogout ?? null,
        actualBreaks: (s as any).actualBreaks ?? null,
        workDetails: (s as any).workDetails ?? null,
        // Remap through templateIdMap; unmapped ids are dropped with a
        // warning rather than written raw (would be a broken link).
        templateId: rawTplId ? templateIdMap.get(rawTplId) : undefined,
        source: (s as any).source ?? undefined,
      })
    }
  }

  let shiftsInserted = 0
  if (shiftInputs.length > 0) {
    const chunkSize = 100
    for (let i = 0; i < shiftInputs.length; i += chunkSize) {
      const chunk = shiftInputs.slice(i, i + chunkSize)
      try {
        const created = await serverCreateShifts({ shifts: chunk })
        shiftsInserted += created?.length ?? chunk.length
      } catch (err) {
        // A failed chunk is user-visible: every shift in it was lost.
        const days = [...new Set(chunk.map((c) => c.date))].join(', ')
        failures.push(`shifts on ${days}: ${(err as Error)?.message ?? 'insert failed'}`)
        console.warn('[importData] serverCreateShifts chunk failed', err)
      }
    }
  }

  // ── categories ────────────────────────────────────────────
  let categoriesInserted = 0
  if (Array.isArray(data.categories) && data.categories.length > 0) {
    const isParent = (c: any) => !c?.parentName
    const parents = (data.categories as unknown[]).filter(isParent)
    const children = (data.categories as unknown[]).filter((c: any) => !isParent(c))
    for (let pass = 0; pass < 2; pass++) {
      const list = pass === 0 ? parents : children
      const existing = await getCategories()
      const byName = new Map(existing.map((c) => [normalizeName(c.name), c]))
      for (const row of list) {
        const c = row as any
        const hit = c.parentName ? byName.get(normalizeName(c.parentName)) : undefined
        const parentId = (hit as any)?.id
        try {
          const existingHit = byName.get(normalizeName(c.name)) as any
          if (existingHit && mode === 'merge') {
            await updateCategory(existingHit.id, c.name, c.icon, c.budget).catch(() => null)
          } else {
            await createCategory(c.name, c.icon, parentId)
          }
          categoriesInserted++
        } catch { /* skip */ }
      }
    }
  }

  // ── expenses ──────────────────────────────────────────────
  let expensesInserted = 0
  if (data.expenses && Object.keys(data.expenses).length > 0) {
    const liveCats = await getCategories()
    const lookupByName = new Map(liveCats.map((c) => [normalizeName(c.name), c.id]))

    const liveExpensesByMonth = new Map<string, Set<string>>()
    if (mode === 'merge') {
      for (const mk of Object.keys(data.expenses)) {
        try {
          const existing = await getExpenses(mk)
          const sigs = new Set<string>(
            (existing ?? []).map((e) =>
              dedupSignature({
                categoryId: e.categoryId,
                amount: Number(e.amount),
                date: typeof e.date === 'string' ? e.date : String(e.date),
                note: e.note ?? '',
              })
            )
          )
          liveExpensesByMonth.set(mk, sigs)
        } catch { /* fallback: no dedup for that month */ }
      }
    }

    interface BulkRow { categoryId: string; amount: number; date: string; note?: string }
    const bulkInputs: BulkRow[] = []

    for (const [monthKey, rows] of Object.entries(data.expenses)) {
      const monthSigs = liveExpensesByMonth.get(monthKey)
      for (const raw of (rows as any[] as any[]) ?? []) {
        const e = raw as any
        if (!e || Number(e.amount) <= 0) continue
        const catName = normalizeName(e.categoryName ?? '')
        const catId = lookupByName.get(catName) ?? ''
        if (!catId) continue
        const sig = dedupSignature({
          categoryId: catId,
          amount: Number(e.amount),
          date: typeof e.date === 'string' ? e.date : String(e.date),
          note: typeof e.note === 'string' ? e.note : '',
        })
        if (mode === 'merge' && monthSigs?.has(sig)) continue
        bulkInputs.push({
          categoryId: catId,
          amount: Number(e.amount),
          date: typeof e.date === 'string' ? e.date : String(e.date),
          note: typeof e.note === 'string' ? e.note : '',
        })
      }
    }

    expensesInserted = bulkInputs.length
    const chunkSize = 200
    for (let i = 0; i < bulkInputs.length; i += chunkSize) {
      try { await createExpensesBulk(bulkInputs.slice(i, i + chunkSize)) } catch { /* skip */ }
    }
  }

  // ── goals ──────────────────────────────────────────────────
  let goalsInserted = 0
  if (Array.isArray(data.goals)) {
    for (const g of data.goals) {
      try {
        await createBudgetGoal({
          // id deliberately NOT forwarded: goal ids are globally unique
          // Date.now() numerics — a foreign backup id would P2002 on the
          // real owner's row. The server mints a fresh one.
          name: (g as any).name,
          deadline: (g as any).deadline,
          target: (g as any).target,
          percentage: (g as any).percentage ?? 0,
          priority: (g as any).priority ?? 0,
          createdMonth: (g as any).createdMonth,
          monthlyProgress: (g as any).monthlyProgress ?? {},
        })
        goalsInserted++
      } catch { /* skip */ }
    }
  }

  // ── notes ──────────────────────────────────────────────────
  let notesInserted = 0
  if (typeof data.monthNotes === 'object' && data.monthNotes) {
    for (const [monthKey, notesText] of Object.entries(data.monthNotes)) {
      try {
        await setBudgetMonthNotes({ monthKey, notes: notesText as string })
        notesInserted++
      } catch { /* skip */ }
    }
  }

  // ── refresh stores ─────────────────────────────────────────
  await Promise.all([
    useJobsStore.getState().fetchJobsFromDB(),
    useTemplatesStore.getState().fetchTemplatesFromDB(),
    useShiftsStore.getState().syncShiftsFromDB(),
  ])

  return {
    jobs: jobsInserted,
    templates: templatesInserted,
    shifts: shiftsInserted,
    categories: categoriesInserted,
    expenses: expensesInserted,
    goals: goalsInserted,
    notes: notesInserted,
    entries: Array.isArray(rawEntries) ? rawEntries.length : 0,
    mode,
    format: parsed.format,
    warnings,
    failures,
  }
}