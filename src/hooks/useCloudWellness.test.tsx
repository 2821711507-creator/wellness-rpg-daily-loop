import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CloudLoadResult, CloudSaveResult, CloudWellnessRepository } from '../cloud/cloudWellnessRepository'
import { defaultWellnessState, type WellnessState } from './useWellnessGame'
import { useCloudWellness } from './useCloudWellness'

const LEGACY_KEY = 'wellness-rpg:v1'

const legacyFixture: WellnessState = {
  version: 1,
  profile: null,
  nutritionTarget: null,
  smoothie: [],
  selectedActivityId: 'walk-basic',
  game: { level: 1, xp: 0, coins: 0, quests: [], processedEventIds: [] },
  avatar: { base: 'masculine', unlockedIds: [], equipped: {} } as unknown as WellnessState['avatar'],
  weightEntries: [],
  completionEvents: [],
}

const remoteState: WellnessState = { ...defaultWellnessState, game: { ...defaultWellnessState.game, coins: 999 } }

function fakeRepository({ load, save }: { load?: CloudLoadResult<WellnessState>; save?: CloudSaveResult } = {}) {
  const loadResult: CloudLoadResult<WellnessState> = load ?? { state: null, revision: 0 }
  const saveResult: CloudSaveResult = save ?? { ok: true, revision: 1 }
  const repository: CloudWellnessRepository<WellnessState> & { load: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn> } = {
    load: vi.fn().mockResolvedValue(loadResult),
    save: vi.fn().mockResolvedValue(saveResult),
  }
  return repository
}

function fakeStorage(initial: Record<string, string> = {}) {
  const store: Record<string, string> = { ...initial }
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    dump: () => ({ ...store }),
  }
}

const wait = (ms: number) => act(() => new Promise(resolve => setTimeout(resolve, ms)))

describe('useCloudWellness', () => {
  it('loads the active user own remote state instead of a default one', async () => {
    const repository = fakeRepository({ load: { state: remoteState, revision: 5 } })
    const storage = fakeStorage()
    const { result } = renderHook(() => useCloudWellness({ userId: 'u1', repository, storage, now: () => new Date(2026, 7, 12) }))

    await waitFor(() => expect(result.current.initialState).toBeDefined())
    expect(result.current.initialState).toEqual(remoteState)
    expect(result.current.syncState).toBe('saved')
    expect(repository.load).toHaveBeenCalledWith('u1')
  })

  it('falls back to the default state when no remote row exists yet', async () => {
    const repository = fakeRepository({ load: { state: null, revision: 0 } })
    const storage = fakeStorage()
    const { result } = renderHook(() => useCloudWellness({ userId: 'u1', repository, storage }))

    await waitFor(() => expect(result.current.initialState).toBeDefined())
    expect(result.current.initialState).toEqual(defaultWellnessState)
  })

  it('imports legacy local data on first registration and clears the legacy key on success', async () => {
    const repository = fakeRepository({ load: { state: null, revision: 0 }, save: { ok: true, revision: 1 } })
    const storage = fakeStorage({ [LEGACY_KEY]: JSON.stringify(legacyFixture) })
    renderHook(() => useCloudWellness({ userId: 'u1', repository, storage, justRegistered: true, now: () => new Date(2026, 7, 12) }))

    await waitFor(() => expect(repository.save).toHaveBeenCalled())
    expect(repository.save).toHaveBeenCalledWith('u1', expect.objectContaining({ version: 1 }), 0)
    expect(storage.getItem(LEGACY_KEY)).toBeNull()
  })

  it('never imports legacy local data when logging into an existing account', async () => {
    const repository = fakeRepository({ load: { state: null, revision: 0 } })
    const storage = fakeStorage({ [LEGACY_KEY]: JSON.stringify(legacyFixture) })
    const { result } = renderHook(() => useCloudWellness({ userId: 'u1', repository, storage, justRegistered: false }))

    await waitFor(() => expect(result.current.initialState).toBeDefined())
    expect(repository.save).not.toHaveBeenCalled()
    expect(storage.getItem(LEGACY_KEY)).not.toBeNull()
  })

  it('debounces saves and only sends the latest state after 300ms of inactivity', async () => {
    const repository = fakeRepository({ load: { state: defaultWellnessState, revision: 1 } })
    const storage = fakeStorage()
    const { result } = renderHook(() => useCloudWellness({ userId: 'u1', repository, storage }))
    await waitFor(() => expect(result.current.initialState).toBeDefined())
    repository.save.mockClear()

    const first = { ...defaultWellnessState, game: { ...defaultWellnessState.game, coins: 1 } }
    const second = { ...defaultWellnessState, game: { ...defaultWellnessState.game, coins: 2 } }
    act(() => { result.current.onStateChange(first); result.current.onStateChange(second) })
    expect(repository.save).not.toHaveBeenCalled()

    await wait(350)

    expect(repository.save).toHaveBeenCalledTimes(1)
    expect(repository.save).toHaveBeenCalledWith('u1', second, 1)
    await waitFor(() => expect(result.current.syncState).toBe('saved'))
  })

  it('goes to waiting when offline, retains a pending save, and retries when back online', async () => {
    const repository = fakeRepository({ load: { state: defaultWellnessState, revision: 1 }, save: { ok: false, reason: 'error' } })
    const storage = fakeStorage()
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true })
    const { result } = renderHook(() => useCloudWellness({ userId: 'u1', repository, storage }))
    await waitFor(() => expect(result.current.initialState).toBeDefined())

    const changed = { ...defaultWellnessState, game: { ...defaultWellnessState.game, coins: 42 } }
    act(() => result.current.onStateChange(changed))
    await wait(350)

    await waitFor(() => expect(result.current.syncState).toBe('waiting'))
    expect(storage.getItem('wellness-rpg:pending:u1')).toEqual(JSON.stringify(changed))

    repository.save.mockResolvedValue({ ok: true, revision: 2 })
    Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true })
    await act(async () => { window.dispatchEvent(new Event('online')) })

    await waitFor(() => expect(result.current.syncState).toBe('saved'))
    expect(storage.getItem('wellness-rpg:pending:u1')).toBeNull()
  })

  it('sets conflict on a revision conflict and blocks further silent saves until reload', async () => {
    const repository = fakeRepository({ load: { state: defaultWellnessState, revision: 1 }, save: { ok: false, reason: 'conflict' } })
    const storage = fakeStorage()
    const { result } = renderHook(() => useCloudWellness({ userId: 'u1', repository, storage }))
    await waitFor(() => expect(result.current.initialState).toBeDefined())

    const changed = { ...defaultWellnessState, game: { ...defaultWellnessState.game, coins: 7 } }
    act(() => result.current.onStateChange(changed))
    await wait(350)

    await waitFor(() => expect(result.current.syncState).toBe('conflict'))
    repository.save.mockClear()

    const another = { ...defaultWellnessState, game: { ...defaultWellnessState.game, coins: 8 } }
    act(() => result.current.onStateChange(another))
    await wait(350)
    expect(repository.save).not.toHaveBeenCalled()

    repository.load.mockResolvedValue({ state: remoteState, revision: 2 })
    repository.save.mockResolvedValue({ ok: true, revision: 3 })
    await act(async () => { result.current.reloadRemote() })

    await waitFor(() => expect(result.current.initialState).toEqual(remoteState))
    expect(result.current.syncState).toBe('saved')
  })
})
