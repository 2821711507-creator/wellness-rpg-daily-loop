import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AuthService, AuthSession } from '../auth/authTypes'
import { useAuth } from './useAuth'

function fakeService(overrides: Partial<AuthService> = {}): AuthService {
  return {
    currentSession: vi.fn().mockResolvedValue(null),
    onSessionChange: vi.fn(() => vi.fn()),
    login: vi.fn(),
    register: vi.fn(),
    requestRecovery: vi.fn(),
    changePassword: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

const session: AuthSession = { accessToken:'token', user:{ id:'u1', username:'runner_01', role:'user', mustChangePassword:false } }

describe('useAuth', () => {
  it('starts loading then resolves to anonymous when there is no active session', async () => {
    const service = fakeService()
    const { result } = renderHook(() => useAuth(service))

    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('anonymous'))
    expect(result.current.session).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('resolves to authenticated when a session already exists', async () => {
    const service = fakeService({ currentSession: vi.fn().mockResolvedValue(session) })
    const { result } = renderHook(() => useAuth(service))

    await waitFor(() => expect(result.current.status).toBe('authenticated'))
    expect(result.current.session).toEqual(session)
  })

  it('logs in and stores the returned session', async () => {
    const service = fakeService({ login: vi.fn().mockResolvedValue({ ok:true, value:session }) })
    const { result } = renderHook(() => useAuth(service))
    await waitFor(() => expect(result.current.status).toBe('anonymous'))

    await act(async () => { await result.current.login('runner_01', 'password1') })

    expect(service.login).toHaveBeenCalledWith('runner_01', 'password1')
    expect(result.current.status).toBe('authenticated')
    expect(result.current.session).toEqual(session)
  })

  it('surfaces a login failure message without authenticating', async () => {
    const service = fakeService({ login: vi.fn().mockResolvedValue({ ok:false, code:'invalid-credentials', message:'아이디 또는 비밀번호가 올바르지 않아요.' }) })
    const { result } = renderHook(() => useAuth(service))
    await waitFor(() => expect(result.current.status).toBe('anonymous'))

    await act(async () => { await result.current.login('runner_01', 'wrong') })

    expect(result.current.status).toBe('anonymous')
    expect(result.current.session).toBeNull()
    expect(result.current.error).toBe('아이디 또는 비밀번호가 올바르지 않아요.')
  })

  it('registers a new user and authenticates', async () => {
    const service = fakeService({ register: vi.fn().mockResolvedValue({ ok:true, value:session }) })
    const { result } = renderHook(() => useAuth(service))
    await waitFor(() => expect(result.current.status).toBe('anonymous'))

    await act(async () => { await result.current.register('runner_01', 'password1') })

    expect(service.register).toHaveBeenCalledWith('runner_01', 'password1')
    expect(result.current.status).toBe('authenticated')
  })

  it('surfaces a duplicate-username registration error', async () => {
    const service = fakeService({ register: vi.fn().mockResolvedValue({ ok:false, code:'duplicate-username', message:'이미 사용 중인 아이디예요.' }) })
    const { result } = renderHook(() => useAuth(service))
    await waitFor(() => expect(result.current.status).toBe('anonymous'))

    await act(async () => { await result.current.register('runner_01', 'password1') })

    expect(result.current.status).toBe('anonymous')
    expect(result.current.error).toBe('이미 사용 중인 아이디예요.')
  })

  it('requests recovery without exposing whether the account exists', async () => {
    const service = fakeService({ requestRecovery: vi.fn().mockResolvedValue({ ok:true, value:undefined }) })
    const { result } = renderHook(() => useAuth(service))
    await waitFor(() => expect(result.current.status).toBe('anonymous'))

    await act(async () => { await result.current.requestRecovery('runner_01') })

    expect(service.requestRecovery).toHaveBeenCalledWith('runner_01')
    expect(result.current.error).toBeNull()
  })

  it('changes the password and clears mustChangePassword on the current session', async () => {
    const mustChange: AuthSession = { accessToken:'token', user:{ id:'u1', username:'runner_01', role:'user', mustChangePassword:true } }
    const service = fakeService({
      currentSession: vi.fn().mockResolvedValue(mustChange),
      changePassword: vi.fn().mockResolvedValue({ ok:true, value:undefined }),
    })
    const { result } = renderHook(() => useAuth(service))
    await waitFor(() => expect(result.current.status).toBe('authenticated'))
    expect(result.current.session?.user.mustChangePassword).toBe(true)

    await act(async () => { await result.current.changePassword('newpassword1') })

    expect(service.changePassword).toHaveBeenCalledWith('newpassword1')
    expect(result.current.session?.user.mustChangePassword).toBe(false)
  })

  it('surfaces a weak-password error from changePassword', async () => {
    const service = fakeService({ currentSession: vi.fn().mockResolvedValue(session), changePassword: vi.fn().mockResolvedValue({ ok:false, code:'weak-password', message:'비밀번호는 8자 이상이어야 해요.' }) })
    const { result } = renderHook(() => useAuth(service))
    await waitFor(() => expect(result.current.status).toBe('authenticated'))

    await act(async () => { await result.current.changePassword('short') })

    expect(result.current.error).toBe('비밀번호는 8자 이상이어야 해요.')
  })

  it('logs out and clears the session', async () => {
    const service = fakeService({ currentSession: vi.fn().mockResolvedValue(session) })
    const { result } = renderHook(() => useAuth(service))
    await waitFor(() => expect(result.current.status).toBe('authenticated'))

    await act(async () => { await result.current.logout() })

    expect(service.logout).toHaveBeenCalledOnce()
    expect(result.current.status).toBe('anonymous')
    expect(result.current.session).toBeNull()
  })

  it('subscribes to session changes and unsubscribes on unmount', async () => {
    const unsubscribe = vi.fn()
    const service = fakeService({ onSessionChange: vi.fn(() => unsubscribe) })
    const { unmount } = renderHook(() => useAuth(service))

    expect(service.onSessionChange).toHaveBeenCalledOnce()
    expect(unsubscribe).not.toHaveBeenCalled()
    unmount()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })

  it('reflects an externally pushed session change (e.g. token refresh sign-out)', async () => {
    let pushSession: (next: AuthSession | null) => void = () => {}
    const service = fakeService({
      currentSession: vi.fn().mockResolvedValue(session),
      onSessionChange: vi.fn((listener: (next: AuthSession | null) => void) => { pushSession = listener; return vi.fn() }),
    })
    const { result } = renderHook(() => useAuth(service))
    await waitFor(() => expect(result.current.status).toBe('authenticated'))

    act(() => pushSession(null))

    expect(result.current.status).toBe('anonymous')
    expect(result.current.session).toBeNull()
  })
})
