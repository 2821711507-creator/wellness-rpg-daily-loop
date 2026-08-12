import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AuthSession } from '../auth/authTypes'
import type { FeedbackService } from '../feedback/feedbackService'
import { AdminFeedbackScreen } from './AdminFeedbackScreen'

const adminSession: AuthSession = { accessToken: 'token', user: { id: 'admin-1', username: 'wellness_admin', role: 'admin', mustChangePassword: false } }
const userSession: AuthSession = { accessToken: 'token', user: { id: 'user-1', username: 'runner_one', role: 'user', mustChangePassword: false } }

const ENTRIES = [
  { id: 'fb-1', username: 'runner_one', message: '운동 종류를 늘려주세요', createdAt: '2026-08-10T01:00:00.000Z' },
  { id: 'fb-2', username: 'runner_two', message: '캐릭터 옷이 예뻐요', createdAt: '2026-08-10T02:00:00.000Z' },
]

function fakeService(overrides: Partial<FeedbackService> = {}): FeedbackService {
  return {
    submit: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    listAll: vi.fn().mockResolvedValue({ ok: true, value: ENTRIES }),
    ...overrides,
  }
}

describe('AdminFeedbackScreen', () => {
  it('denies access and never queries the service for a non-admin session', () => {
    const service = fakeService()
    render(<AdminFeedbackScreen session={userSession} service={service} onClose={vi.fn()}/>)

    expect(screen.getByRole('alert')).toHaveTextContent('관리자만')
    expect(service.listAll).not.toHaveBeenCalled()
  })

  it('loads and renders feedback entries for an admin session', async () => {
    const service = fakeService()
    render(<AdminFeedbackScreen session={adminSession} service={service} onClose={vi.fn()}/>)

    expect(service.listAll).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('운동 종류를 늘려주세요')).toBeInTheDocument()
    expect(screen.getByText('runner_two')).toBeInTheDocument()
  })

  it('shows an empty state when there is no feedback', async () => {
    const service = fakeService({ listAll: vi.fn().mockResolvedValue({ ok: true, value: [] }) })
    render(<AdminFeedbackScreen session={adminSession} service={service} onClose={vi.fn()}/>)

    expect(await screen.findByText('아직 피드백이 없어요.')).toBeInTheDocument()
  })

  it('shows an error when feedback cannot be loaded', async () => {
    const service = fakeService({ listAll: vi.fn().mockResolvedValue({ ok: false, code: 'unknown', message: '불러오지 못했어요.' }) })
    render(<AdminFeedbackScreen session={adminSession} service={service} onClose={vi.fn()}/>)

    expect(await screen.findByRole('alert')).toHaveTextContent('불러오지 못했어요.')
  })

  it('closes when the back button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<AdminFeedbackScreen session={adminSession} service={fakeService()} onClose={onClose}/>)

    await user.click(screen.getByRole('button', { name: '돌아가기' }))

    expect(onClose).toHaveBeenCalled()
  })
})
