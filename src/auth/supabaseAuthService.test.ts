import { describe, expect, it, vi } from 'vitest'
import { AuthApiError } from '@supabase/supabase-js'
import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js'
import { createSupabaseAuthService } from './supabaseAuthService'

function jsonContext(body: unknown) {
  return { json: async () => body }
}

function profileQuery(row: { role: 'user' | 'admin'; must_change_password: boolean } | null) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
      })),
    })),
  }
}

function createFakeClient({
  profile = { role: 'user', must_change_password: false },
}: {
  profile?: { role: 'user' | 'admin'; must_change_password: boolean } | null
} = {}) {
  const listeners: Array<(event: string, session: unknown) => void> = []
  const unsubscribe = vi.fn()

  const fake = {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'token', user: { id: 'u1', email: 'runner_01@users.internal' } } },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn((callback: (event: string, session: unknown) => void) => {
        listeners.push(callback)
        return { data: { subscription: { unsubscribe } } }
      }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { ok: true }, error: null }),
    },
    from: vi.fn(() => profileQuery(profile)),
  }

  return {
    fake,
    unsubscribe,
    emit: (event: string, session: unknown) => listeners.forEach(listener => listener(event, session)),
  }
}

describe('createSupabaseAuthService', () => {
  describe('login', () => {
    it('normalizes the username and logs in via the internal identifier', async () => {
      const { fake } = createFakeClient()
      const service = createSupabaseAuthService(fake)

      expect(await service.login(' Runner_01 ', 'password1')).toEqual({
        ok: true,
        value: { accessToken: 'token', user: { id: 'u1', username: 'runner_01', role: 'user', mustChangePassword: false } },
      })
      expect(fake.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'runner_01@users.internal', password: 'password1' })
    })

    it('rejects an invalid username before any network call', async () => {
      const { fake } = createFakeClient()
      const service = createSupabaseAuthService(fake)

      expect(await service.login('a', 'password1')).toEqual({
        ok: false,
        code: 'invalid-username',
        message: '아이디는 영문 소문자, 숫자, 밑줄로 4~24자여야 해요.',
      })
      expect(fake.auth.signInWithPassword).not.toHaveBeenCalled()
    })

    it('maps invalid credentials to a Korean error', async () => {
      const { fake } = createFakeClient()
      fake.auth.signInWithPassword.mockResolvedValue({
        data: { session: null },
        error: new AuthApiError('Invalid login credentials', 400, 'invalid_credentials'),
      })
      const service = createSupabaseAuthService(fake)

      expect(await service.login('runner_01', 'password1')).toEqual({
        ok: false,
        code: 'invalid-credentials',
        message: '아이디 또는 비밀번호가 올바르지 않아요.',
      })
    })

    it('maps a rate-limited auth response to a Korean error', async () => {
      const { fake } = createFakeClient()
      fake.auth.signInWithPassword.mockResolvedValue({
        data: { session: null },
        error: new AuthApiError('Too many requests', 429, 'over_request_rate_limit'),
      })
      const service = createSupabaseAuthService(fake)

      expect(await service.login('runner_01', 'password1')).toEqual({
        ok: false,
        code: 'rate-limited',
        message: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.',
      })
    })

    it('returns unknown when no profile row exists for the signed-in user', async () => {
      const { fake } = createFakeClient({ profile: null })
      const service = createSupabaseAuthService(fake)

      expect(await service.login('runner_01', 'password1')).toEqual({
        ok: false,
        code: 'unknown',
        message: '알 수 없는 오류가 발생했어요. 잠시 후 다시 시도해 주세요.',
      })
    })
  })

  describe('register', () => {
    it('registers through the register-username function then signs in', async () => {
      const { fake } = createFakeClient()
      const service = createSupabaseAuthService(fake)

      expect(await service.register(' Runner_01 ', 'password1')).toEqual({
        ok: true,
        value: { accessToken: 'token', user: { id: 'u1', username: 'runner_01', role: 'user', mustChangePassword: false } },
      })
      expect(fake.functions.invoke).toHaveBeenCalledWith('register-username', {
        body: { username: 'runner_01', password: 'password1' },
      })
      expect(fake.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'runner_01@users.internal', password: 'password1' })
    })

    it('rejects an invalid username before invoking the function', async () => {
      const { fake } = createFakeClient()
      const service = createSupabaseAuthService(fake)

      expect(await service.register('bad name', 'password1')).toEqual({
        ok: false,
        code: 'invalid-username',
        message: '아이디는 영문 소문자, 숫자, 밑줄로 4~24자여야 해요.',
      })
      expect(fake.functions.invoke).not.toHaveBeenCalled()
    })

    it('maps a duplicate-username function error to a Korean message', async () => {
      const { fake } = createFakeClient()
      fake.functions.invoke.mockResolvedValue({
        data: null,
        error: new FunctionsHttpError(jsonContext({ code: 'duplicate-username', message: '이미 사용 중인 아이디예요.' })),
      })
      const service = createSupabaseAuthService(fake)

      expect(await service.register('runner_01', 'password1')).toEqual({
        ok: false,
        code: 'duplicate-username',
        message: '이미 사용 중인 아이디예요.',
      })
      expect(fake.auth.signInWithPassword).not.toHaveBeenCalled()
    })

    it('maps a weak-password function error to a Korean message', async () => {
      const { fake } = createFakeClient()
      fake.functions.invoke.mockResolvedValue({
        data: null,
        error: new FunctionsHttpError(jsonContext({ code: 'weak-password' })),
      })
      const service = createSupabaseAuthService(fake)

      expect(await service.register('runner_01', 'short')).toEqual({
        ok: false,
        code: 'weak-password',
        message: '비밀번호는 8자 이상이어야 해요.',
      })
    })

    it('maps a function fetch failure to a network error', async () => {
      const { fake } = createFakeClient()
      fake.functions.invoke.mockResolvedValue({
        data: null,
        error: new FunctionsFetchError(new Error('offline')),
      })
      const service = createSupabaseAuthService(fake)

      expect(await service.register('runner_01', 'password1')).toEqual({
        ok: false,
        code: 'network',
        message: '네트워크 연결을 확인해 주세요.',
      })
    })
  })

  describe('requestRecovery', () => {
    it('normalizes the username and invokes the recovery function', async () => {
      const { fake } = createFakeClient()
      const service = createSupabaseAuthService(fake)

      expect(await service.requestRecovery(' Runner_01 ')).toEqual({ ok: true, value: undefined })
      expect(fake.functions.invoke).toHaveBeenCalledWith('request-password-recovery', {
        body: { username: 'runner_01' },
      })
    })

    it('rejects an invalid username before invoking the function', async () => {
      const { fake } = createFakeClient()
      const service = createSupabaseAuthService(fake)

      expect(await service.requestRecovery('a')).toEqual({
        ok: false,
        code: 'invalid-username',
        message: '아이디는 영문 소문자, 숫자, 밑줄로 4~24자여야 해요.',
      })
      expect(fake.functions.invoke).not.toHaveBeenCalled()
    })
  })

  describe('changePassword', () => {
    it('invokes the change-password function for the current session', async () => {
      const { fake } = createFakeClient()
      const service = createSupabaseAuthService(fake)

      expect(await service.changePassword('newpassword1')).toEqual({ ok: true, value: undefined })
      expect(fake.functions.invoke).toHaveBeenCalledWith('change-password', { body: { password: 'newpassword1' } })
    })

    it('maps a function error to a Korean message', async () => {
      const { fake } = createFakeClient()
      fake.functions.invoke.mockResolvedValue({
        data: null,
        error: new FunctionsHttpError(jsonContext({ code: 'weak-password', message: '비밀번호는 8자 이상이어야 해요.' })),
      })
      const service = createSupabaseAuthService(fake)

      expect(await service.changePassword('short')).toEqual({
        ok: false,
        code: 'weak-password',
        message: '비밀번호는 8자 이상이어야 해요.',
      })
    })
  })

  describe('logout', () => {
    it('signs the current session out', async () => {
      const { fake } = createFakeClient()
      const service = createSupabaseAuthService(fake)

      await service.logout()
      expect(fake.auth.signOut).toHaveBeenCalled()
    })
  })

  describe('currentSession', () => {
    it('returns null when there is no active session', async () => {
      const { fake } = createFakeClient()
      const service = createSupabaseAuthService(fake)

      expect(await service.currentSession()).toBeNull()
    })

    it('loads the profile for an active session', async () => {
      const { fake } = createFakeClient({ profile: { role: 'admin', must_change_password: true } })
      fake.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'token', user: { id: 'u1', email: 'runner_01@users.internal' } } },
        error: null,
      })
      const service = createSupabaseAuthService(fake)

      expect(await service.currentSession()).toEqual({
        accessToken: 'token',
        user: { id: 'u1', username: 'runner_01', role: 'admin', mustChangePassword: true },
      })
    })
  })

  describe('onSessionChange', () => {
    it('notifies the listener with a mapped session and unsubscribes on cleanup', async () => {
      const { fake, unsubscribe, emit } = createFakeClient()
      const service = createSupabaseAuthService(fake)
      const listener = vi.fn()

      const unsubscribeFromService = service.onSessionChange(listener)
      emit('SIGNED_IN', { access_token: 'token', user: { id: 'u1', email: 'runner_01@users.internal' } })
      await vi.waitFor(() => expect(listener).toHaveBeenCalledWith({
        accessToken: 'token',
        user: { id: 'u1', username: 'runner_01', role: 'user', mustChangePassword: false },
      }))

      emit('SIGNED_OUT', null)
      await vi.waitFor(() => expect(listener).toHaveBeenLastCalledWith(null))

      expect(unsubscribe).not.toHaveBeenCalled()
      unsubscribeFromService()
      expect(unsubscribe).toHaveBeenCalledTimes(1)
    })
  })
})
