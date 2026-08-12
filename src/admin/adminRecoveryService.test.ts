import { describe, expect, it, vi } from 'vitest'
import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js'
import { createAdminRecoveryService, type AdminRecoveryClient } from './adminRecoveryService'

function jsonContext(body: unknown) {
  return { json: async () => body }
}

interface FakeClientOptions {
  requests?: Array<{ id: string; user_id: string; requested_at: string }>
  requestsError?: unknown
  profiles?: Array<{ user_id: string; username: string }>
  profilesError?: unknown
  invokeResult?: { data: unknown; error: unknown }
}

function createFakeClient({
  requests = [],
  requestsError = null,
  profiles = [],
  profilesError = null,
  invokeResult = { data: { ok: true, temporaryPassword: 'Temp1234Pass5678' }, error: null },
}: FakeClientOptions = {}) {
  const order = vi.fn().mockResolvedValue({ data: requests, error: requestsError })
  const eq = vi.fn(() => ({ order }))
  const in_ = vi.fn().mockResolvedValue({ data: profiles, error: profilesError })
  const invoke = vi.fn().mockResolvedValue(invokeResult)

  const from = vi.fn((table: string) => ({
    select: vi.fn(() => ({ eq, in: in_ })),
  }))

  const fake: AdminRecoveryClient = { from, functions: { invoke } }
  return { fake, order, eq, in_, invoke, from }
}

describe('createAdminRecoveryService', () => {
  describe('listPending', () => {
    it('joins pending requests with usernames, ordered by request time', async () => {
      const { fake, eq, order, in_ } = createFakeClient({
        requests: [
          { id: 'req-1', user_id: 'user-1', requested_at: '2026-08-10T01:00:00.000Z' },
          { id: 'req-2', user_id: 'user-2', requested_at: '2026-08-10T02:00:00.000Z' },
        ],
        profiles: [
          { user_id: 'user-1', username: 'runner_one' },
          { user_id: 'user-2', username: 'runner_two' },
        ],
      })
      const service = createAdminRecoveryService(fake)

      const result = await service.listPending()

      expect(result).toEqual({
        ok: true,
        value: [
          { id: 'req-1', username: 'runner_one', requestedAt: '2026-08-10T01:00:00.000Z' },
          { id: 'req-2', username: 'runner_two', requestedAt: '2026-08-10T02:00:00.000Z' },
        ],
      })
      expect(eq).toHaveBeenCalledWith('status', 'pending')
      expect(order).toHaveBeenCalledWith('requested_at', { ascending: true })
      expect(in_).toHaveBeenCalledWith('user_id', ['user-1', 'user-2'])
    })

    it('returns an empty list without querying profiles when there are no pending requests', async () => {
      const { fake, in_ } = createFakeClient({ requests: [] })
      const service = createAdminRecoveryService(fake)

      expect(await service.listPending()).toEqual({ ok: true, value: [] })
      expect(in_).not.toHaveBeenCalled()
    })

    it('never includes a password field in the pending list, even right after a reset', async () => {
      const { fake } = createFakeClient({
        requests: [{ id: 'req-1', user_id: 'user-1', requested_at: '2026-08-10T01:00:00.000Z' }],
        profiles: [{ user_id: 'user-1', username: 'runner_one' }],
      })
      const service = createAdminRecoveryService(fake)

      await service.reset('some-other-request')
      const result = await service.listPending()

      expect(result.ok).toBe(true)
      if (result.ok) {
        for (const row of result.value) {
          expect(row).not.toHaveProperty('temporaryPassword')
          expect(row).not.toHaveProperty('password')
          expect(Object.keys(row).sort()).toEqual(['id', 'requestedAt', 'username'])
        }
      }
    })

    it('returns a failure when the request query errors', async () => {
      const { fake } = createFakeClient({ requestsError: { message: 'boom' } })
      const service = createAdminRecoveryService(fake)

      const result = await service.listPending()
      expect(result.ok).toBe(false)
    })

    it('skips a request row when no matching profile is found', async () => {
      const { fake } = createFakeClient({
        requests: [{ id: 'req-1', user_id: 'user-1', requested_at: '2026-08-10T01:00:00.000Z' }],
        profiles: [],
      })
      const service = createAdminRecoveryService(fake)

      expect(await service.listPending()).toEqual({ ok: true, value: [] })
    })
  })

  describe('reset', () => {
    it('invokes the admin-reset-password function with the request id and returns the temporary password', async () => {
      const { fake, invoke } = createFakeClient({
        invokeResult: { data: { ok: true, temporaryPassword: 'Xy7pQ2mN9kLr4Tzw' }, error: null },
      })
      const service = createAdminRecoveryService(fake)

      const result = await service.reset('req-1')

      expect(invoke).toHaveBeenCalledWith('admin-reset-password', { body: { requestId: 'req-1' } })
      expect(result).toEqual({ ok: true, value: 'Xy7pQ2mN9kLr4Tzw' })
    })

    it('maps a 403 forbidden response (an ordinary caller) to a forbidden failure', async () => {
      const error = new FunctionsHttpError(jsonContext({ ok: false, code: 'forbidden', message: '관리자만 사용할 수 있어요.' }))
      const { fake } = createFakeClient({ invokeResult: { data: null, error } })
      const service = createAdminRecoveryService(fake)

      const result = await service.reset('req-1')

      expect(result).toEqual({ ok: false, code: 'forbidden', message: '관리자만 사용할 수 있어요.' })
    })

    it('maps a network failure to the network error code', async () => {
      const { fake } = createFakeClient({ invokeResult: { data: null, error: new FunctionsFetchError(new Error('offline')) } })
      const service = createAdminRecoveryService(fake)

      const result = await service.reset('req-1')
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.code).toBe('network')
    })

    it('fails when the response is missing a temporary password', async () => {
      const { fake } = createFakeClient({ invokeResult: { data: { ok: true }, error: null } })
      const service = createAdminRecoveryService(fake)

      const result = await service.reset('req-1')
      expect(result.ok).toBe(false)
    })
  })
})
