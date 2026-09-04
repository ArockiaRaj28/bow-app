# Plan: Import Preview / Dry-Run (v7.2.0)

> Show the user exactly what an import will do **before any data is
> written**, so the destructive "Replace" mode can't surprise anyone.

## 1. Goal & scope

**Goal.** Before clicking "Import", the user sees a precise diff:
*"This backup contains 4 jobs, 23 shifts, 6 expenses. In **Replace**
mode you will lose: 2 existing jobs, 41 existing shifts, 19 existing
expenses."*

**In scope.**
- New server action `previewImport(file, mode)` returning a structured
  diff against the user's current DB state — no writes.
- Replace current "Import mode → button" preview step with a real
  preview that shows: file summary, current DB totals, **what will be
  lost vs added**, and an explicit confirm for replace.
- Reject files that fail schema/format validation with the actual error
  (today these surface as a single toast line; we expand).

**Out of scope.**
- Resolving conflicts inside the backup (e.g. duplicate IDs) — current
  behaviour kept (first-write-wins for merge, full-wipe for replace).
- Selecting which rows to import — that's a v7.4+ feature.
- CSV path — JSON-first; CSV keeps today's behaviour (no preview).

## 2. Current state (what's already there)

`services/importService.ts` already has `importData(file, mode, format)`
which writes to DB and returns `ImportResult` with per-domain counts,
`warnings`, and `failures`. `components/settings/BackupPanel.tsx`
already has a 3-step UX (`format → preview → done`) where the
"preview" step only shows the **mode picker + Import button**.

**Gap:** the "preview" step does NOT show a diff. Clicking Import
fires the write immediately. If the user picks Replace by mistake, the
data is gone before they see what happened.

## 3. Data model

**No DB change.** Everything is computed on-the-fly from the user's
current rows + the parsed backup.

## 4. New server action — `app/actions/backup.ts`

```ts
export interface ImportPreview {
  mode: 'replace' | 'merge'
  format: 'json' | 'csv'
  backup: {
    fileName: string
    fileSizeBytes: number
    schemaVersion: string | null
    exportedAt: string | null
    counts: {
      jobs: number
      templates: number
      shifts: number
      categories: number
      expenses: number
      goals: number
      monthNotes: number
    }
  }
  current: {
    jobs: number
    templates: number
    shifts: number
    categories: number
    expenses: number
    goals: number
    monthNotes: number
  }
  diff: {
    /** How many of the user's CURRENT rows this import will remove (replace) or leave untouched (merge). */
    willRemove: {
      jobs: number
      templates: number
      shifts: number
      categories: number
      expenses: number
      goals: number
      monthNotes: number
    }
    /** How many NEW rows this import will insert. */
    willInsert: {
      jobs: number
      templates: number
      shifts: number
      categories: number
      expenses: number
      goals: number
      monthNotes: number
    }
    /** Rows in the backup whose jobId / categoryId can't be resolved. */
    danglingReferences: string[]
  }
  /** Errors that prevent import — surfaced before the user can click Import. */
  blockers: string[]
}
```

### Implementation sketch

1. Reuse `parseBackupData(text)` from `importService` (already
   handles JSON + CSV sniffing). Wrap it in a `try/catch` so malformed
   files return `{ blockers: ['File is not valid JSON: …'] }`.
2. For each domain (`jobs`, `templates`, `shifts`, `categories`,
   `expenses`, `goals`, `monthNotes`):
   - `backup.counts[X]` = length of the parsed array.
   - `current.X` = `prisma.userX.count({ where: { userId } })`.
   - `willRemove.X` =
     - `replace`: `current.X` (everything wiped).
     - `merge`: `0` (nothing removed).
   - `willInsert.X` =
     - `replace`: `backup.counts[X]` (everything inserted).
     - `merge`: `backup.counts[X] - intersect` (we don't ship the
       intersect calc in v7.2 — count = backup count and label as
       "up to"; document in UI).
3. `danglingReferences` — walk parsed `shifts` and `templates`; if
   `jobId` not in backup's `jobs` (or current user's jobs in merge
   mode), append to the array. Today this is collected as warnings
   *during* import — we move it to the preview so users see it before
   committing.

### Refactor `importData` to reuse the parser

`importData` and `previewImport` should share the parse step. Add
`parseBackupToObject(file: File): Promise<BackupData>` to
`services/importService.ts`; both call it.

## 5. UI — `components/settings/BackupPanel.tsx`

Replace the current `'preview'` step (lines 187–229) with:

```
┌─ Import Preview ──────────────────────────────────────┐
│  📄 backup-2026-08-30.json  (12.4 KB)                  │
│  📦 Schema v6.4.0 — exported 2026-08-30                │
│                                                       │
│  Domain       In backup    You have    Will remove     │
│  ─────────────────────────────────────────────────     │
│  Jobs              4            2            2  ⚠      │
│  Templates         1            3            3  ⚠      │
│  Shifts           23          120          120  ⚠      │
│  Categories        5            8            8  ⚠      │
│  Expenses         12           45           45  ⚠      │
│  Goals             2            1            1  ⚠      │
│                                                       │
│  Mode: [ Merge ] [ Replace ]                          │
│  (Replace is highlighted red; Merge is default)       │
│                                                       │
│  ⚠️ Replace will WIPE all of the above current rows   │
│     before inserting the backup.                      │
│                                                       │
│  Dangling refs: 2 (e.g. shift on 2026-08-12 → job    │
│  "old-convini" not in backup; will be skipped)        │
│                                                       │
│  [ Cancel ]                [ ✅ Import (Replace) ]    │
└───────────────────────────────────────────────────────┘
```

For **Merge** mode:
- "Will remove" column shows `—` for every row (greyed).
- The Import button reads `✅ Import (Merge)`.
- Dangling-refs still surface.

For **Replace** mode:
- The Import button is **red** and requires the user to type
  `REPLACE` (existing pattern in account-delete) — no, that's overkill
  for v7.2. Instead: a checkbox `[ ] I understand my current data
  will be wiped` must be checked before the button enables.

### Empty / error states

- **Blockers present** (e.g. file is malformed, schema version newer
  than app supports) → red banner with the errors; Import button
  disabled with tooltip.
- **Backup is empty** (all counts = 0) → yellow notice "Backup
  contains no data — nothing to import."; Import button disabled.
- **Current DB is empty + mode = Replace** → green notice "Nothing to
  wipe — this is effectively a fresh import."

### Cancel

The Cancel button closes the modal entirely (`close()` from existing
state).

## 6. Implementation order

1. **`services/importService.ts`** — extract `parseBackupToObject`,
   share between `previewImport` (new) and `importData` (refactor).
2. **`app/actions/backup.ts`** — add `previewImport` action; reuse
   `prisma.userX.count` for current state.
3. **`components/settings/BackupPanel.tsx`** — replace `'preview'`
   step render with the new diff UI; add `'preview-error'` step if
   blockers exist (keeps the existing 3-step model).
4. **Smoke test:** export current data, pick the same file, verify
   preview shows current = backup and remove/insert = same numbers;
   then mutate one job name, re-import, verify diff catches it.
5. **Commit + push.**
6. **Tracker** — flip `Import preview / dry-run [dce49d48]` to `✓`.

## 7. Files touched

| File | Action |
|---|---|
| `services/importService.ts` | Extract `parseBackupToObject`; refactor `importData` |
| `app/actions/backup.ts` | Add `previewImport` + `ImportPreview` type |
| `components/settings/BackupPanel.tsx` | Replace preview step render |
| (no DB migration) | — |

## 8. Risks & mitigations

- **Large backup files.** `previewImport` runs Prisma `count` calls;
  cheap, but a 25 MB CSV could take seconds. Mitigation: keep the
  existing 25 MB file cap; spinner on the preview button.
- **Schema drift between backup and app.** Today `importData` silently
  ignores unknown fields. Preview should show "Schema v6.5.0 (newer
  than app supports v6.4.0)" as a yellow warning, not a blocker.
- **Race between preview and import.** Preview → Import is two
  round-trips; user could shift a job in another tab. Acceptable: the
  Import button re-fetches fresh counts on click and shows a final
  confirmation toast if the diff has changed materially.

## 9. Acceptance criteria

- [ ] User can drop a JSON backup file and see a diff before clicking
      Import.
- [ ] Diff shows: backup counts, current counts, will-remove counts,
      and dangling references.
- [ ] Replace mode shows a checkbox confirmation before Import
      enables.
- [ ] Merge mode disables "will remove" column and uses a normal CTA.
- [ ] Malformed backup files show specific errors, not generic
      "Import failed".
- [ ] Importing still works the same way (refactor preserves
      behaviour, `ImportResult` shape unchanged).
- [ ] Build passes; container recreates healthy.

## 10. Out of scope (deferred)

- Per-row conflict resolution UI (v7.4+).
- Side-by-side row comparison (v7.4+).
- CSV preview (JSON-first; CSV keeps current "import directly" path).
- Backup integrity validation beyond what's already in `importData`.
