import { useState } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AuthResult, AuthSession } from '../auth/authTypes'
import type { UseAuthResult } from '../hooks/useAuth'
import { AuthScreen } from './AuthScreen'

const session: AuthSession = { accessToken:'token', user:{ id:'u1', username:'runner_01', role:'user', mustChangePassword:false } }

function fakeAuth(overrides: Partial<UseAuthResult> = {}): UseAuthResult {
  return {
    status:'anonymous',
    session:null,
    error:null,
    login: vi.fn().mockResolvedValue({ ok:true, value:session }),
    register: vi.fn().mockResolvedValue({ ok:true, value:session }),
    requestRecovery: vi.fn().mockResolvedValue({ ok:true, value:undefined }),
    changePassword: vi.fn().mockResolvedValue({ ok:true, value:undefined }),
    logout: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

/** Mirrors how a real `useAuth()` result changes after each call, so error/status updates are visible to the rendered screen. */
function Harness({ initial = {} }: { initial?: Partial<UseAuthResult> }) {
  const [error, setError] = useState<string|null>(null)
  const base = fakeAuth(initial)
  const captureError = (result:AuthResult<unknown>) => { if (!result.ok) setError(result.message) }
  const login:UseAuthResult['login'] = async (...args) => { const result = await base.login(...args); captureError(result); return result }
  const register:UseAuthResult['register'] = async (...args) => { const result = await base.register(...args); captureError(result); return result }
  const requestRecovery:UseAuthResult['requestRecovery'] = async (...args) => { const result = await base.requestRecovery(...args); captureError(result); return result }
  return <AuthScreen auth={{ ...base, error, login, register, requestRecovery }}/>
}

describe('AuthScreen', () => {
  it('submits login credentials', async () => {
    const user = userEvent.setup()
    const auth = fakeAuth()
    render(<AuthScreen auth={auth}/>)

    await user.type(screen.getByLabelText('아이디'), 'runner_01')
    await user.type(screen.getByLabelText('비밀번호'), 'password1')
    await user.click(screen.getByRole('button', { name:'로그인' }))

    expect(auth.login).toHaveBeenCalledWith('runner_01', 'password1')
  })

  it('shows only the login form by default and switches to register, then back', async () => {
    const user = userEvent.setup()
    render(<AuthScreen auth={fakeAuth()}/>)

    expect(screen.getByRole('heading', { name:'로그인' })).toBeInTheDocument()
    expect(screen.queryByLabelText('비밀번호 확인')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name:'회원가입' }))
    expect(screen.getByRole('heading', { name:'회원가입' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name:'로그인' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('비밀번호 확인')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name:'로그인으로 돌아가기' }))
    expect(screen.getByRole('heading', { name:'로그인' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name:'회원가입' })).not.toBeInTheDocument()
  })

  it('switches to the recovery form and back to login', async () => {
    const user = userEvent.setup()
    render(<AuthScreen auth={fakeAuth()}/>)

    await user.click(screen.getByRole('button', { name:'비밀번호 찾기' }))
    expect(screen.getByRole('heading', { name:'비밀번호 찾기' })).toBeInTheDocument()
    expect(screen.queryByLabelText('비밀번호')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name:'로그인으로 돌아가기' }))
    expect(screen.getByRole('heading', { name:'로그인' })).toBeInTheDocument()
  })

  it('blocks registration when the password confirmation does not match', async () => {
    const user = userEvent.setup()
    const auth = fakeAuth()
    render(<AuthScreen auth={auth}/>)
    await user.click(screen.getByRole('button', { name:'회원가입' }))

    await user.type(screen.getByLabelText('아이디'), 'runner_01')
    await user.type(screen.getByLabelText('비밀번호'), 'password1')
    await user.type(screen.getByLabelText('비밀번호 확인'), 'password2')
    await user.click(screen.getByRole('button', { name:'가입하기' }))

    expect(screen.getByRole('alert')).toHaveTextContent('비밀번호가 일치하지 않아요.')
    expect(auth.register).not.toHaveBeenCalled()
  })

  it('shows a duplicate-username error and focuses it', async () => {
    const user = userEvent.setup()
    render(<Harness initial={{ register: vi.fn().mockResolvedValue({ ok:false, code:'duplicate-username', message:'이미 사용 중인 아이디예요.' }) }}/>)
    await user.click(screen.getByRole('button', { name:'회원가입' }))

    await user.type(screen.getByLabelText('아이디'), 'runner_01')
    await user.type(screen.getByLabelText('비밀번호'), 'password1')
    await user.type(screen.getByLabelText('비밀번호 확인'), 'password1')
    await user.click(screen.getByRole('button', { name:'가입하기' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('이미 사용 중인 아이디예요.')
    await waitFor(() => expect(alert).toHaveFocus())
  })

  it('shows the generic recovery success message and hides the form', async () => {
    const user = userEvent.setup()
    render(<Harness/>)
    await user.click(screen.getByRole('button', { name:'비밀번호 찾기' }))
    await user.type(screen.getByLabelText('아이디'), 'runner_01')
    await user.click(screen.getByRole('button', { name:'복구 요청' }))

    expect(await screen.findByText('복구 요청을 접수했어요. 관리자에게 임시 비밀번호를 받아 주세요.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name:'복구 요청' })).not.toBeInTheDocument()
  })

  it('disables submission while a login request is pending', async () => {
    const user = userEvent.setup()
    let resolveLogin: (value: AuthResult<AuthSession>) => void = () => {}
    const login = vi.fn(() => new Promise<AuthResult<AuthSession>>(resolve => { resolveLogin = resolve }))
    render(<AuthScreen auth={fakeAuth({ login })}/>)

    await user.type(screen.getByLabelText('아이디'), 'runner_01')
    await user.type(screen.getByLabelText('비밀번호'), 'password1')
    const submit = screen.getByRole('button', { name:'로그인' })
    await user.click(submit)

    expect(submit).toBeDisabled()
    resolveLogin({ ok:true, value:session })
    await waitFor(() => expect(submit).not.toBeDisabled())
  })

  it('marks the username and password inputs with the correct autocomplete hints', async () => {
    const user = userEvent.setup()
    render(<AuthScreen auth={fakeAuth()}/>)
    expect(screen.getByLabelText('아이디')).toHaveAttribute('autocomplete', 'username')
    expect(screen.getByLabelText('비밀번호')).toHaveAttribute('autocomplete', 'current-password')

    await user.click(screen.getByRole('button', { name:'회원가입' }))
    expect(within(screen.getByLabelText('비밀번호').closest('form')!).getByLabelText('비밀번호')).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByLabelText('비밀번호 확인')).toHaveAttribute('autocomplete', 'new-password')
  })

  it('renders a visible error passed in from the auth hook', () => {
    render(<AuthScreen auth={fakeAuth({ error:'아이디 또는 비밀번호가 올바르지 않아요.' })}/>)
    expect(screen.getByRole('alert')).toHaveTextContent('아이디 또는 비밀번호가 올바르지 않아요.')
  })
})
