import { describe, expect, it, vi } from 'vitest'
import { createFeedbackService, type FeedbackClient } from './feedbackService'

interface FakeClientOptions {
  insertError?: unknown
  rows?: Array<{ id: string; user_id: string; message: string; created_at: string }>
  rowsError?: unknown
  profiles?: Array<{ user_id: string; username: string }>
  profilesError?: unknown
}

function createFakeClient({ insertError = null, rows = [], rowsError = null, profiles = [], profilesError = null }: FakeClientOptions = {}) {
  const order = vi.fn().mockResolvedValue({ data: rows, error: rowsError })
  const in_ = vi.fn().mockResolvedValue({ data: profiles, error: profilesError })
  const insert = vi.fn().mockResolvedValue({ error: insertError })

  const from = vi.fn((_table: string) => ({
    insert,
    select: vi.fn(() => ({ order, in: in_ })),
  }))

  const fake: FeedbackClient = { from }
  return { fake, insert, order, in_, from }
}

describe('createFeedbackService', () => {
  describe('submit', () => {
    it('inserts a feedback row for the given user', async () => {
      const { fake, insert, from } = createFakeClient()
      const service = createFeedbackService(fake)

      const result = await service.submit('user-1', '운동 종류를 더 다양하게 해주세요')

      expect(result).toEqual({ ok: true, value: undefined })
      expect(from).toHaveBeenCalledWith('feedback')
      expect(insert).toHaveBeenCalledWith({ user_id: 'user-1', message: '운동 종류를 더 다양하게 해주세요' })
    })

    it('trims whitespace before inserting', async () => {
      const { fake, insert } = createFakeClient()
      const service = createFeedbackService(fake)

      await service.submit('user-1', '  좋아요  ')

      expect(insert).toHaveBeenCalledWith({ user_id: 'user-1', message: '좋아요' })
    })

    it('rejects an empty or whitespace-only message without inserting', async () => {
      const { fake, insert } = createFakeClient()
      const service = createFeedbackService(fake)

      const result = await service.submit('user-1', '   ')

      expect(result.ok).toBe(false)
      expect(insert).not.toHaveBeenCalled()
    })

    it('returns a failure when the insert errors', async () => {
      const { fake } = createFakeClient({ insertError: { message: 'boom' } })
      const service = createFeedbackService(fake)

      const result = await service.submit('user-1', '피드백입니다')

      expect(result.ok).toBe(false)
    })
  })

  describe('listAll', () => {
    it('joins feedback rows with usernames, newest first', async () => {
      const { fake, order, in_ } = createFakeClient({
        rows: [
          { id: 'fb-1', user_id: 'user-1', message: '좋아요', created_at: '2026-08-10T01:00:00.000Z' },
          { id: 'fb-2', user_id: 'user-2', message: '별로예요', created_at: '2026-08-10T02:00:00.000Z' },
        ],
        profiles: [
          { user_id: 'user-1', username: 'runner_one' },
          { user_id: 'user-2', username: 'runner_two' },
        ],
      })
      const service = createFeedbackService(fake)

      const result = await service.listAll()

      expect(result).toEqual({
        ok: true,
        value: [
          { id: 'fb-1', username: 'runner_one', message: '좋아요', createdAt: '2026-08-10T01:00:00.000Z' },
          { id: 'fb-2', username: 'runner_two', message: '별로예요', createdAt: '2026-08-10T02:00:00.000Z' },
        ],
      })
      expect(order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(in_).toHaveBeenCalledWith('user_id', ['user-1', 'user-2'])
    })

    it('returns an empty list without querying profiles when there is no feedback', async () => {
      const { fake, in_ } = createFakeClient({ rows: [] })
      const service = createFeedbackService(fake)

      expect(await service.listAll()).toEqual({ ok: true, value: [] })
      expect(in_).not.toHaveBeenCalled()
    })

    it('skips a row when no matching profile is found', async () => {
      const { fake } = createFakeClient({
        rows: [{ id: 'fb-1', user_id: 'user-1', message: '좋아요', created_at: '2026-08-10T01:00:00.000Z' }],
        profiles: [],
      })
      const service = createFeedbackService(fake)

      expect(await service.listAll()).toEqual({ ok: true, value: [] })
    })

    it('returns a failure when the row query errors', async () => {
      const { fake } = createFakeClient({ rowsError: { message: 'boom' } })
      const service = createFeedbackService(fake)

      const result = await service.listAll()
      expect(result.ok).toBe(false)
    })
  })
})
