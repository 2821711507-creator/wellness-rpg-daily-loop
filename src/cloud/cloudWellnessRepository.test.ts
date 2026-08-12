import { describe, expect, it, vi } from 'vitest'
import { createCloudWellnessRepository, type CloudWellnessClient } from './cloudWellnessRepository'

interface FixtureState { version: 1; label: string }

function createFakeClient({
  userId = 'u1',
  row = null as { state: unknown; revision: number } | null,
  loadError = null as unknown,
  rpcData = null as Array<{ revision: number }> | null,
  rpcError = null as unknown,
  activeUserId = userId,
}: {
  userId?: string
  row?: { state: unknown; revision: number } | null
  loadError?: unknown
  rpcData?: Array<{ revision: number }> | null
  rpcError?: unknown
  activeUserId?: string
} = {}) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: loadError })
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  const rpc = vi.fn().mockResolvedValue({ data: rpcData, error: rpcError })
  const getUser = vi.fn().mockResolvedValue({ data: { user: activeUserId ? { id: activeUserId } : null }, error: null })
  const client: CloudWellnessClient = { auth: { getUser }, from, rpc }
  return { client, maybeSingle, eq, select, from, rpc, getUser }
}

describe('createCloudWellnessRepository', () => {
  describe('load', () => {
    it('returns the saved state and revision for the active user', async () => {
      const saved: FixtureState = { version: 1, label: 'hello' }
      const { client, from, select, eq } = createFakeClient({ userId: 'u1', row: { state: saved, revision: 3 } })
      const repository = createCloudWellnessRepository<FixtureState>(client)

      expect(await repository.load('u1')).toEqual({ state: saved, revision: 3 })
      expect(from).toHaveBeenCalledWith('wellness_states')
      expect(select).toHaveBeenCalledWith('state,revision')
      expect(eq).toHaveBeenCalledWith('user_id', 'u1')
    })

    it('returns a null state and zero revision when no row exists yet', async () => {
      const { client } = createFakeClient({ userId: 'u1', row: null })
      const repository = createCloudWellnessRepository<FixtureState>(client)

      expect(await repository.load('u1')).toEqual({ state: null, revision: 0 })
    })

    it('throws rather than querying a user ID that differs from the active session user', async () => {
      const { client, from } = createFakeClient({ activeUserId: 'u1' })
      const repository = createCloudWellnessRepository<FixtureState>(client)

      await expect(repository.load('someone-else')).rejects.toThrow()
      expect(from).not.toHaveBeenCalled()
    })
  })

  describe('save', () => {
    it('saves and returns the new revision when the expected revision matches', async () => {
      const { client, rpc } = createFakeClient({ userId: 'u1', rpcData: [{ revision: 4 }] })
      const repository = createCloudWellnessRepository<FixtureState>(client)
      const next: FixtureState = { version: 1, label: 'next' }

      expect(await repository.save('u1', next, 3)).toEqual({ ok: true, revision: 4 })
      expect(rpc).toHaveBeenCalledWith('save_wellness_state', { next_state: next, expected_revision: 3 })
    })

    it('reports a conflict rather than throwing or silently succeeding when the revision has moved on', async () => {
      const { client } = createFakeClient({ userId: 'u1', rpcData: [] })
      const repository = createCloudWellnessRepository<FixtureState>(client)

      expect(await repository.save('u1', { version: 1, label: 'stale' }, 2)).toEqual({ ok: false, reason: 'conflict' })
    })

    it('reports an error result when the RPC itself fails', async () => {
      const { client } = createFakeClient({ userId: 'u1', rpcError: new Error('network down') })
      const repository = createCloudWellnessRepository<FixtureState>(client)

      expect(await repository.save('u1', { version: 1, label: 'x' }, 0)).toEqual({ ok: false, reason: 'error' })
    })

    it('throws rather than saving under a user ID that differs from the active session user', async () => {
      const { client, rpc } = createFakeClient({ activeUserId: 'u1' })
      const repository = createCloudWellnessRepository<FixtureState>(client)

      await expect(repository.save('someone-else', { version: 1, label: 'x' }, 0)).rejects.toThrow()
      expect(rpc).not.toHaveBeenCalled()
    })
  })
})
