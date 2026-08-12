import { describe, expect, it, vi } from 'vitest'
import type { CloudSaveResult, CloudWellnessRepository } from './cloudWellnessRepository'
import { migrateLegacyState, type LegacyStorage } from './legacyStateMigrator'
import type { WellnessState } from '../hooks/useWellnessGame'

const LEGACY_KEY = 'wellness-rpg:v1'

const legacyFixture = {
  version: 1,
  profile: null,
  nutritionTarget: null,
  smoothie: [],
  selectedActivityId: 'walk-basic',
  game: { level: 1, xp: 0, coins: 0, quests: [], processedEventIds: [] },
  avatar: { base: 'masculine', unlockedIds: [], equipped: {} },
  weightEntries: [],
  completionEvents: [],
}

function fakeStorage(initial: Record<string, string> = {}): LegacyStorage & { dump(): Record<string, string> } {
  const store: Record<string, string> = { ...initial }
  return {
    getItem: key => (key in store ? store[key] : null),
    removeItem: key => { delete store[key] },
    dump: () => ({ ...store }),
  }
}

function fakeRepository(saveResult: CloudSaveResult): CloudWellnessRepository<WellnessState> & { save: ReturnType<typeof vi.fn> } {
  const save = vi.fn().mockResolvedValue(saveResult)
  const load = vi.fn()
  return { save, load } as unknown as CloudWellnessRepository<WellnessState> & { save: typeof save }
}

describe('migrateLegacyState', () => {
  it('does nothing when there is no legacy key to migrate', async () => {
    const storage = fakeStorage()
    const repository = fakeRepository({ ok: true, revision: 1 })

    const result = await migrateLegacyState({ userId: 'u1', repository, storage })

    expect(result).toEqual({ ok: true, migrated: false, reason: 'no-local-data' })
    expect(repository.save).not.toHaveBeenCalled()
  })

  it('retains invalid legacy JSON and never uploads it', async () => {
    const storage = fakeStorage({ [LEGACY_KEY]: 'not valid json' })
    const repository = fakeRepository({ ok: true, revision: 1 })

    const result = await migrateLegacyState({ userId: 'u1', repository, storage })

    expect(result).toEqual({ ok: false, reason: 'invalid-local-data' })
    expect(repository.save).not.toHaveBeenCalled()
    expect(storage.getItem(LEGACY_KEY)).toBe('not valid json')
  })

  it('retains a legacy record whose version is not 1', async () => {
    const storage = fakeStorage({ [LEGACY_KEY]: JSON.stringify({ ...legacyFixture, version: 2 }) })
    const repository = fakeRepository({ ok: true, revision: 1 })

    const result = await migrateLegacyState({ userId: 'u1', repository, storage })

    expect(result).toEqual({ ok: false, reason: 'invalid-local-data' })
    expect(repository.save).not.toHaveBeenCalled()
    expect(storage.getItem(LEGACY_KEY)).not.toBeNull()
  })

  it('normalizes and uploads a valid legacy state, then removes the local key only on success', async () => {
    const storage = fakeStorage({ [LEGACY_KEY]: JSON.stringify(legacyFixture) })
    const repository = fakeRepository({ ok: true, revision: 1 })

    const result = await migrateLegacyState({ userId: 'u1', repository, storage, now: () => new Date(2026, 7, 12, 9) })

    expect(result).toEqual({ ok: true, migrated: true, revision: 1 })
    expect(repository.save).toHaveBeenCalledTimes(1)
    const [userId, uploaded, expectedRevision] = repository.save.mock.calls[0]
    expect(userId).toBe('u1')
    expect(expectedRevision).toBe(0)
    expect(uploaded.avatar).toMatchObject({ gender: 'male' })
    expect(storage.getItem(LEGACY_KEY)).toBeNull()
  })

  it('never overwrites an existing remote row and keeps the local key when the upload conflicts', async () => {
    const storage = fakeStorage({ [LEGACY_KEY]: JSON.stringify(legacyFixture) })
    const repository = fakeRepository({ ok: false, reason: 'conflict' })

    const result = await migrateLegacyState({ userId: 'u1', repository, storage })

    expect(result).toEqual({ ok: true, migrated: false, reason: 'remote-exists' })
    expect(storage.getItem(LEGACY_KEY)).not.toBeNull()
  })

  it('performs no second write when retried after a successful migration', async () => {
    const storage = fakeStorage({ [LEGACY_KEY]: JSON.stringify(legacyFixture) })
    const repository = fakeRepository({ ok: true, revision: 1 })

    const first = await migrateLegacyState({ userId: 'u1', repository, storage })
    expect(first).toEqual({ ok: true, migrated: true, revision: 1 })
    expect(repository.save).toHaveBeenCalledTimes(1)

    const second = await migrateLegacyState({ userId: 'u1', repository, storage })
    expect(second).toEqual({ ok: true, migrated: false, reason: 'no-local-data' })
    expect(repository.save).toHaveBeenCalledTimes(1)
  })

  it('reports an error result without removing the local key when the save itself fails', async () => {
    const storage = fakeStorage({ [LEGACY_KEY]: JSON.stringify(legacyFixture) })
    const repository = fakeRepository({ ok: false, reason: 'error' })

    const result = await migrateLegacyState({ userId: 'u1', repository, storage })

    expect(result).toEqual({ ok: false, reason: 'error' })
    expect(storage.getItem(LEGACY_KEY)).not.toBeNull()
  })
})
