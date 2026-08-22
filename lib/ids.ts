/**
 * USER-PREFIXED ROW IDs — replace UUID auto-generation for shift,
 * template, and job entities.
 *
 * Format:  `{userId}_{prefix}{seq}`   (e.g. `nithesh_s1`, `nithesh_j3`)
 *
 * Each user has an independent sequence per prefix, so `nithesh_s1`
 * and `arockia_s1` are different rows.
 *
 * Concurrency: the seq counter is derived from `SELECT MAX(...)` just
 * before insert, so concurrent creates for the same user+prefix may
 * race.  The call site handles P2002 (unique-constraint violation)
 * via retry — the helper exports `nextUserSeq` for that loop.
 *
 * Import resilience: an import may supply the id explicitly
 * (`nithesh_s5`).  The service layer upserts by that id (or by a
 * de-duped name for jobs).  The helper also exports `parseUserId`
 * so the import layer can verify the claimed userId matches the
 * authenticated user.
 */

import { prisma } from '@/lib/auth/prisma'
import type { Prisma } from '@prisma/client'

export type SeqPrefix = 's' | 'tpl' | 'j'

// Database table names (from Prisma @@map — raw SQL must use actual DB names)
const TABLE: Record<SeqPrefix, string> = {
  s: 'user_shifts',
  tpl: 'user_templates',
  j: 'user_jobs',
}

/**
 * Derive the next seq number for a user + prefix by reading the DB.
 *
 * Two different identifiers are involved and must not be confused:
 *   - `dbUserId`  — the internal User.id (cuid). This is what the
 *     `userId` FK column actually stores, so it drives the WHERE filter.
 *   - `owner`     — the string used as the ID prefix (the user's public
 *     handle, falling back to the internal id when no handle is set).
 *     It drives the LIKE pattern and the substring offset.
 *
 * The suffix is extracted relative to `LENGTH(owner + '_' + prefix)` —
 * NOT `POSITION('_' IN id)` — because handles may themselves contain
 * underscores (`nithesh_99_s1`), and POSITION would find the first one
 * inside the handle and produce a non-numeric substring.
 *
 * Returns 1 when no rows exist yet for that user+prefix.
 */
export async function nextUserSeq(
  dbUserId: string,
  owner: string,
  prefix: SeqPrefix,
  tx?: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>,
): Promise<number> {
  const db = tx ?? prisma
  const table = TABLE[prefix]
  const literal = `${owner}_${prefix}`
  const rows = await (db as any).$queryRawUnsafe(
    // $3 must be cast to int — bound parameters arrive as bigint and
    // Postgres has no substring(text, bigint) overload (error 42883).
    `SELECT MAX(CAST(SUBSTRING(id FROM $3::int + 1) AS INTEGER)) AS max_seq
     FROM ${table}
     WHERE "userId" = $1::uuid
       AND id LIKE $2`,
    dbUserId,
    `${literal}%`,
    literal.length,
  ) as Array<{ max_seq: bigint | null }>
  const max = rows?.[0]?.max_seq
  return max ? Number(max) + 1 : 1
}

/** Build a full row id: `{userId}_{prefix}{seq}`. */
export function formatUserRowId(userId: string, prefix: SeqPrefix, seq: number): string {
  return `${userId}_${prefix}${seq}`
}

/**
 * Parse a user-prefixed id.
 *
 * Examples:
 *   `nithesh_s3`         → { userId: 'nithesh', prefix: 's', seq: 3 }
 *   `99sam_j1`           → { userId: '99sam',   prefix: 'j', seq: 1 }
 *   `some_uuid_here'     → null  (uuid or non-prefixed format)
 *
 * Handle shape mirrors lib/userHandle.ts: 3–30 chars of [a-z0-9_],
 * starting and ending alphanumeric (digit-first handles are legal).
 */
export function parseUserPrefixedId(id: string): {
  userId: string
  prefix: SeqPrefix
  seq: number
} | null {
  const m = /^([a-z0-9][a-z0-9_]{1,28}[a-z0-9])_(s|tpl|j)(\d{1,10})$/.exec(id)
  if (!m) return null
  return { userId: m[1], prefix: m[2] as SeqPrefix, seq: Number(m[3]) }
}

/**
 * Convenience: generate a new id for the given user+prefix.
 *
 * Calls nextUserSeq + formatUserRowId.  Use inside a P2002-retry
 * block so concurrent inserts don't lose rows.
 */
export async function makeUserRowId(
  dbUserId: string,
  owner: string,
  prefix: SeqPrefix,
  tx?: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>,
): Promise<string> {
  const seq = await nextUserSeq(dbUserId, owner, prefix, tx)
  return formatUserRowId(owner, prefix, seq)
}

/** Retry an id-minting insert on unique-constraint violations (P2002).
 *
 *  `nextUserSeq` reads MAX(seq) just before insert, so two concurrent
 *  creates for the same user+prefix can mint the same id. Re-running
 *  the whole operation re-reads MAX (now including the winner's row)
 *  and picks the next slot. */
export async function withUniqueRetry<T>(op: () => Promise<T>, attempts = 5): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await op()
    } catch (err) {
      lastErr = err
      if ((err as { code?: string })?.code !== 'P2002') throw err
    }
  }
  throw lastErr
}