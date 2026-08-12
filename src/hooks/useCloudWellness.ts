import { useCallback, useEffect, useRef, useState } from 'react'
import type { CloudSaveResult, CloudWellnessRepository } from '../cloud/cloudWellnessRepository'
import { migrateLegacyState, type LegacyStorage } from '../cloud/legacyStateMigrator'
import { defaultWellnessState, type WellnessState } from './useWellnessGame'

export type SyncState = 'loading'|'saved'|'saving'|'waiting'|'conflict'|'error'

const DEBOUNCE_MS = 300

/** The minimal storage surface this hook depends on for its per-user pending-save cache. Browser `localStorage` satisfies it. */
export type CloudWellnessStorage = LegacyStorage & { setItem(key: string, value: string): void }

const pendingKey = (userId: string) => `wellness-rpg:pending:${userId}`
/** Set alongside the pending blob whenever a save is blocked by a revision conflict, and
 * cleared only when the user explicitly resolves it (via `reloadRemote`). Its presence at
 * boot is what lets the hook re-enter `conflict` instead of silently resaving a stale local
 * edit over a remote revision that may have moved on even further in the meantime. */
const conflictKey = (userId: string) => `wellness-rpg:conflict:${userId}`

export interface UseCloudWellnessOptions {
  userId: string
  repository: CloudWellnessRepository<WellnessState>
  /** True only for the single session where this user just completed registration; drives the one-time legacy import. */
  justRegistered?: boolean
  now?: () => Date
  storage?: CloudWellnessStorage
  debounceMs?: number
}

export interface UseCloudWellnessResult {
  syncState: SyncState
  /** `undefined` until the initial remote load (and any first-registration migration) has resolved. */
  initialState: WellnessState | undefined
  onStateChange: (state: WellnessState) => void
  /** Discards any pending local edit and re-fetches the user's remote state, clearing a `conflict`. */
  reloadRemote: () => void
  /** Re-sends the latest local state after an `error`. */
  retry: () => void
}

/**
 * Bridges an authenticated user's `AuthSession.user.id` to their private `CloudWellnessRepository` row: loads
 * remote state (optionally preceded by a one-time legacy-local import on first registration), then accepts
 * `onStateChange` updates from `useWellnessGame`'s cloud-managed mode, debouncing revisioned saves. A save that
 * fails is retained under `wellness-rpg:pending:<userId>` and retried on the next `online` event; a revision
 * conflict stops all further saves until the caller calls `reloadRemote`.
 */
export function useCloudWellness({
  userId,
  repository,
  justRegistered = false,
  now = () => new Date(),
  storage = window.localStorage,
  debounceMs = DEBOUNCE_MS,
}: UseCloudWellnessOptions): UseCloudWellnessResult {
  const [syncState, setSyncState] = useState<SyncState>('loading')
  const [initialState, setInitialState] = useState<WellnessState | undefined>(undefined)
  const revisionRef = useRef(0)
  const latestStateRef = useRef<WellnessState | undefined>(undefined)
  const conflictRef = useRef(false)
  const savingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const persistPending = useCallback((state: WellnessState) => storage.setItem(pendingKey(userId), JSON.stringify(state)), [storage, userId])
  const clearPending = useCallback(() => storage.removeItem(pendingKey(userId)), [storage, userId])
  const persistConflictMarker = useCallback(() => storage.setItem(conflictKey(userId), '1'), [storage, userId])
  const clearConflictMarker = useCallback(() => storage.removeItem(conflictKey(userId)), [storage, userId])

  const runSave = useCallback(async () => {
    if (conflictRef.current || savingRef.current) return
    const state = latestStateRef.current
    if (state === undefined) return
    savingRef.current = true
    setSyncState('saving')
    let result: CloudSaveResult
    try {
      result = await repository.save(userId, state, revisionRef.current)
    } catch {
      // A thrown rejection (e.g. a transient `assertActiveUser` network blip) must be
      // treated exactly like a resolved `{ok:false, reason:'error'}`: reset `savingRef`
      // (otherwise every future save in this session is permanently wedged) and persist
      // the edit so it survives a refresh instead of being silently lost.
      savingRef.current = false
      persistPending(state)
      setSyncState(typeof navigator !== 'undefined' && navigator.onLine === false ? 'waiting' : 'error')
      return
    }
    savingRef.current = false
    if (result.ok) {
      revisionRef.current = result.revision
      clearPending()
      if (latestStateRef.current === state) setSyncState('saved')
      else void runSave()
    } else if (result.reason === 'conflict') {
      conflictRef.current = true
      persistPending(state)
      persistConflictMarker()
      setSyncState('conflict')
    } else {
      persistPending(state)
      setSyncState(typeof navigator !== 'undefined' && navigator.onLine === false ? 'waiting' : 'error')
    }
  }, [repository, userId, clearPending, persistPending, persistConflictMarker])

  useEffect(() => {
    let active = true
    setSyncState('loading')
    setInitialState(undefined)
    conflictRef.current = false
    ;(async () => {
      try {
        if (justRegistered) {
          try { await migrateLegacyState({ userId, repository, storage, now }) } catch { /* best-effort; remote load below still proceeds */ }
        }
        const pendingRaw = storage.getItem(pendingKey(userId))
        const hasConflictMarker = storage.getItem(conflictKey(userId)) !== null
        const loaded = await repository.load(userId)
        if (!active) return
        revisionRef.current = loaded.revision
        let effectiveState = loaded.state ?? defaultWellnessState
        let hadPending = false
        if (pendingRaw) {
          try { effectiveState = JSON.parse(pendingRaw) as WellnessState; hadPending = true }
          catch { /* corrupt pending cache: fall back to the remote state */ }
        }
        latestStateRef.current = effectiveState
        setInitialState(effectiveState)
        if (hadPending && hasConflictMarker) {
          // A conflict from a previous session was never explicitly resolved (the app was
          // just closed and reopened instead). Re-enter `conflict` rather than resaving the
          // stale pending edit, which would now match this session's freshly-loaded revision
          // and silently overwrite whatever a different device wrote in the meantime.
          conflictRef.current = true
          setSyncState('conflict')
          return
        }
        if (hasConflictMarker) clearConflictMarker() // stale marker with nothing pending to protect
        setSyncState('saved')
        if (hadPending) void runSave()
      } catch {
        if (!active) return
        setSyncState('error')
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })()
    return () => { active = false }
    // Intentionally keyed only on userId: repository/storage/now/justRegistered are expected stable for a session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  useEffect(() => {
    const retryOnline = () => { if (!conflictRef.current) void runSave() }
    window.addEventListener('online', retryOnline)
    return () => window.removeEventListener('online', retryOnline)
  }, [runSave])

  const onStateChange = useCallback((state: WellnessState) => {
    latestStateRef.current = state
    if (conflictRef.current) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { void runSave() }, debounceMs)
  }, [debounceMs, runSave])

  const reloadRemote = useCallback(() => {
    conflictRef.current = false
    clearPending()
    clearConflictMarker()
    setSyncState('loading')
    setInitialState(undefined)
    void (async () => {
      try {
        const loaded = await repository.load(userId)
        revisionRef.current = loaded.revision
        const state = loaded.state ?? defaultWellnessState
        latestStateRef.current = state
        setInitialState(state)
        setSyncState('saved')
      } catch {
        setSyncState('error')
      }
    })()
  }, [repository, userId, clearPending, clearConflictMarker])

  const retry = useCallback(() => { void runSave() }, [runSave])

  return { syncState, initialState, onStateChange, reloadRemote, retry }
}
