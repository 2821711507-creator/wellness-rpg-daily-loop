import { normalizeWellnessState, type WellnessState } from '../hooks/useWellnessGame'
import { toLocalDateKey } from '../domain/weeklyPlan'
import type { CloudWellnessRepository } from './cloudWellnessRepository'

const LEGACY_KEY = 'wellness-rpg:v1'

/** The minimal storage surface this migrator depends on. Browser `localStorage` satisfies it. */
export interface LegacyStorage {
  getItem(key: string): string | null
  removeItem(key: string): void
}

export type MigrationResult =
  | { ok: true; migrated: true; revision: number }
  | { ok: true; migrated: false; reason: 'no-local-data' | 'remote-exists' }
  | { ok: false; reason: 'invalid-local-data' | 'error' }

function isVersionOneState(value: unknown): value is WellnessState {
  return typeof value === 'object' && value !== null && (value as { version?: unknown }).version === 1
}

/**
 * One-time upload of a user's pre-account local `WellnessState` (stored under `wellness-rpg:v1`)
 * to their new cloud row. Idempotent: only ever inserts (via `expectedRevision` 0), never
 * overwrites a remote row that already exists, and only clears the local key once the upload
 * has actually succeeded -- so a retry after success, or after a conflict/error, is always safe.
 */
export async function migrateLegacyState({
  userId,
  repository,
  storage,
  now = () => new Date(),
}: {
  userId: string
  repository: CloudWellnessRepository<WellnessState>
  storage: LegacyStorage
  now?: () => Date
}): Promise<MigrationResult> {
  const raw = storage.getItem(LEGACY_KEY)
  if (raw === null) return { ok: true, migrated: false, reason: 'no-local-data' }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, reason: 'invalid-local-data' }
  }

  if (!isVersionOneState(parsed)) return { ok: false, reason: 'invalid-local-data' }

  const today = toLocalDateKey(now())
  const normalized = normalizeWellnessState(parsed, today).state

  const result = await repository.save(userId, normalized, 0)
  if (!result.ok) return result.reason === 'conflict' ? { ok: true, migrated: false, reason: 'remote-exists' } : { ok: false, reason: 'error' }

  storage.removeItem(LEGACY_KEY)
  return { ok: true, migrated: true, revision: result.revision }
}
