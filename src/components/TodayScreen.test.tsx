import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { AuthResult } from '../auth/authTypes'
import type { UserProfile } from '../domain/profile'
import { defaultWellnessState } from '../hooks/useWellnessGame'
import { TodayScreen, type TodayAccount } from './TodayScreen'

function noop() {}

const PROFILE: UserProfile = { age:30, heightCm:170, weightKg:65, calculationSex:'female', activityLevel:'light', goal:'cut', cutIntensity:'mild' }

function renderTodayScreen(account: TodayAccount) {
  return render(
    <TodayScreen
      state={{...defaultWellnessState, profile: PROFILE}}
      setSmoothie={noop}
      setActivity={noop}
      complete={noop}
      onOpenPlan={noop}
      onOpenRecords={noop}
      onOpenAvatar={noop}
      onOpenMore={noop}
      account={account}
    />,
  )
}

function fakeAccount(overrides: Partial<TodayAccount> = {}): TodayAccount {
  return {
    username: 'runner_01',
    onChangePassword: vi.fn(async (): Promise<AuthResult<void>> => ({ ok: true, value: undefined })),
    onLogout: vi.fn(async () => {}),
    ...overrides,
  }
}

describe('TodayScreen AccountMenu', () => {
  it('shows the account username once the menu is opened', async () => {
    const account = fakeAccount({ username: 'runner_42' })
    const user = userEvent.setup()
    renderTodayScreen(account)

    await user.click(screen.getByRole('button', { name: '프로필' }))

    expect(screen.getByText('runner_42')).toBeInTheDocument()
    expect(screen.getByText('runner_42').className).toBe('account-menu-username')
  })

  it('shows a mismatch error and does not call onChangePassword when confirmation does not match', async () => {
    const account = fakeAccount()
    const user = userEvent.setup()
    renderTodayScreen(account)

    await user.click(screen.getByRole('button', { name: '프로필' }))
    await user.click(screen.getByRole('menuitem', { name: '비밀번호 변경' }))
    await user.type(screen.getByLabelText('새 비밀번호'), 'newpass1')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'newpass2')
    await user.click(screen.getByRole('button', { name: '비밀번호 변경' }))

    expect(await screen.findByText('비밀번호가 일치하지 않아요.')).toBeInTheDocument()
    expect(account.onChangePassword).not.toHaveBeenCalled()
    // The form should still be open (not closed/reset to the menu).
    expect(screen.getByLabelText('새 비밀번호')).toBeInTheDocument()
  })

  it('calls onChangePassword with the typed password and returns to the menu on success', async () => {
    const account = fakeAccount()
    const user = userEvent.setup()
    renderTodayScreen(account)

    await user.click(screen.getByRole('button', { name: '프로필' }))
    await user.click(screen.getByRole('menuitem', { name: '비밀번호 변경' }))
    await user.type(screen.getByLabelText('새 비밀번호'), 'newpass1')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'newpass1')
    await user.click(screen.getByRole('button', { name: '비밀번호 변경' }))

    expect(account.onChangePassword).toHaveBeenCalledWith('newpass1')
    // Success closes the whole panel (submitPassword's `close()`), returning to the toggle button.
    expect(await screen.findByRole('button', { name: '프로필' })).toBeInTheDocument()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('keeps the panel open and shows the service error when the password change fails', async () => {
    // Models how a real caller (AuthGate) wires `account.error`: it starts unset and is only
    // populated by the parent once the async onChangePassword call actually resolves with a failure.
    const onChangePassword = vi.fn(async (_password: string): Promise<AuthResult<void>> => ({ ok: false, code: 'unknown', message: '비밀번호를 변경하지 못했어요.' }))
    function Harness() {
      const [error, setError] = useState<string | null>(null)
      const account: TodayAccount = {
        username: 'runner_01',
        onLogout: vi.fn(async () => {}),
        clearError: () => setError(null),
        error,
        onChangePassword: async (password: string) => {
          const result = await onChangePassword(password)
          setError(result.ok ? null : result.message)
          return result
        },
      }
      return (
        <TodayScreen
          state={{...defaultWellnessState, profile: PROFILE}}
          setSmoothie={noop}
          setActivity={noop}
          complete={noop}
          onOpenPlan={noop}
          onOpenRecords={noop}
          onOpenAvatar={noop}
          onOpenMore={noop}
          account={account}
        />
      )
    }
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: '프로필' }))
    await user.click(screen.getByRole('menuitem', { name: '비밀번호 변경' }))
    await user.type(screen.getByLabelText('새 비밀번호'), 'newpass1')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'newpass1')
    await user.click(screen.getByRole('button', { name: '비밀번호 변경' }))

    expect(onChangePassword).toHaveBeenCalledWith('newpass1')
    expect(await screen.findByText('비밀번호를 변경하지 못했어요.')).toBeInTheDocument()
    // The form stays open on failure, unlike the success case.
    expect(screen.getByLabelText('새 비밀번호')).toBeInTheDocument()
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })
})

describe('더보기', () => {
  it('calls onOpenMore when the button is clicked', async () => {
    const user = userEvent.setup()
    const onOpenMore = vi.fn()
    render(
      <TodayScreen
        state={{...defaultWellnessState, profile: PROFILE}}
        setSmoothie={noop}
        setActivity={noop}
        complete={noop}
        onOpenPlan={noop}
        onOpenRecords={noop}
        onOpenAvatar={noop}
        onOpenMore={onOpenMore}
      />,
    )

    await user.click(screen.getByRole('button', { name: '더보기' }))

    expect(onOpenMore).toHaveBeenCalled()
  })
})
