import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AuthSession } from '../auth/authTypes'
import type { UseAuthResult } from '../hooks/useAuth'
import { ForcePasswordChangeScreen } from './ForcePasswordChangeScreen'

function fakeAuth(overrides: Partial<UseAuthResult> = {}): UseAuthResult {
  return {
    status:'authenticated',
    session:null,
    error:null,
    login: vi.fn().mockResolvedValue({ ok:true, value:null }),
    register: vi.fn().mockResolvedValue({ ok:true, value:null }),
    requestRecovery: vi.fn().mockResolvedValue({ ok:true, value:undefined }),
    changePassword: vi.fn().mockResolvedValue({ ok:true, value:undefined }),
    logout: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

const mustChangeSession: AuthSession = { accessToken:'token', user:{ id:'u1', username:'runner_01', role:'user', mustChangePassword:true } }
const clearedSession: AuthSession = { accessToken:'token', user:{ id:'u1', username:'runner_01', role:'user', mustChangePassword:false } }

/** Mirrors how the real `useAuth()` session updates after `changePassword` succeeds. */
function Harness({ initialSession, changePasswordResult }: { initialSession: AuthSession; changePasswordResult: Awaited<ReturnType<UseAuthResult['changePassword']>> }) {
  const [session, setSession] = useState<AuthSession | null>(initialSession)
  const [error, setError] = useState<string | null>(null)
  const changePassword = async (password: string) => {
    const result = await Promise.resolve(changePasswordResult)
    if (result.ok) { setSession(current => current ? { ...current, user:{ ...current.user, mustChangePassword:false } } : current); setError(null) }
    else setError(result.message)
    return result
  }
  const auth = fakeAuth({ session, error, changePassword })
  return <ForcePasswordChangeScreen auth={auth}><div data-testid="app-content">앱 화면</div></ForcePasswordChangeScreen>
}

describe('ForcePasswordChangeScreen', () => {
  it('renders its children when no password change is required', () => {
    render(<ForcePasswordChangeScreen auth={fakeAuth({ session:clearedSession })}><div data-testid="app-content">앱 화면</div></ForcePasswordChangeScreen>)
    expect(screen.getByTestId('app-content')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name:'비밀번호 변경' })).not.toBeInTheDocument()
  })

  it('blocks the app and shows the forced change form when mustChangePassword is true', () => {
    render(<ForcePasswordChangeScreen auth={fakeAuth({ session:mustChangeSession })}><div data-testid="app-content">앱 화면</div></ForcePasswordChangeScreen>)
    expect(screen.queryByTestId('app-content')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name:'비밀번호 변경' })).toBeInTheDocument()
  })

  it('reveals the app after successfully changing the password', async () => {
    const user = userEvent.setup()
    render(<Harness initialSession={mustChangeSession} changePasswordResult={{ ok:true, value:undefined }}/>)

    await user.type(screen.getByLabelText('새 비밀번호'), 'newpassword1')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'newpassword1')
    await user.click(screen.getByRole('button', { name:'비밀번호 변경' }))

    expect(await screen.findByTestId('app-content')).toBeInTheDocument()
  })

  it('blocks submission when the confirmation does not match and never calls changePassword', async () => {
    const user = userEvent.setup()
    const changePassword = vi.fn().mockResolvedValue({ ok:true, value:undefined })
    render(<ForcePasswordChangeScreen auth={fakeAuth({ session:mustChangeSession, changePassword })}><div data-testid="app-content"/></ForcePasswordChangeScreen>)

    await user.type(screen.getByLabelText('새 비밀번호'), 'newpassword1')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'different1')
    await user.click(screen.getByRole('button', { name:'비밀번호 변경' }))

    expect(screen.getByRole('alert')).toHaveTextContent('비밀번호가 일치하지 않아요.')
    expect(changePassword).not.toHaveBeenCalled()
  })

  it('shows a weak-password error from the auth hook', () => {
    render(<ForcePasswordChangeScreen auth={fakeAuth({ session:mustChangeSession, error:'비밀번호는 8자 이상이어야 해요.' })}><div data-testid="app-content"/></ForcePasswordChangeScreen>)
    expect(screen.getByRole('alert')).toHaveTextContent('비밀번호는 8자 이상이어야 해요.')
  })

  it('uses new-password autocomplete on both password fields', () => {
    render(<ForcePasswordChangeScreen auth={fakeAuth({ session:mustChangeSession })}><div data-testid="app-content"/></ForcePasswordChangeScreen>)
    expect(screen.getByLabelText('새 비밀번호')).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByLabelText('새 비밀번호 확인')).toHaveAttribute('autocomplete', 'new-password')
  })

  it('disables submission while the change request is pending', async () => {
    const user = userEvent.setup()
    let resolveChange: (value: { ok:true; value:undefined }) => void = () => {}
    const changePassword = vi.fn(() => new Promise<{ ok:true; value:undefined }>(resolve => { resolveChange = resolve }))
    render(<ForcePasswordChangeScreen auth={fakeAuth({ session:mustChangeSession, changePassword })}><div data-testid="app-content"/></ForcePasswordChangeScreen>)

    await user.type(screen.getByLabelText('새 비밀번호'), 'newpassword1')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'newpassword1')
    const submit = screen.getByRole('button', { name:'비밀번호 변경' })
    await user.click(submit)

    expect(submit).toBeDisabled()
    resolveChange({ ok:true, value:undefined })
    await waitFor(() => expect(submit).not.toBeDisabled())
  })
})
