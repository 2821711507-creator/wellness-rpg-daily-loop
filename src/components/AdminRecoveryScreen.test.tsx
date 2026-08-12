import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AuthSession } from '../auth/authTypes'
import type { AdminRecoveryService, PendingRecoveryRequest } from '../admin/adminRecoveryService'
import { AdminRecoveryScreen } from './AdminRecoveryScreen'

const adminSession: AuthSession = { accessToken: 'token', user: { id: 'admin-1', username: 'wellness_admin', role: 'admin', mustChangePassword: false } }
const userSession: AuthSession = { accessToken: 'token', user: { id: 'user-1', username: 'runner_one', role: 'user', mustChangePassword: false } }

const PENDING: PendingRecoveryRequest[] = [
  { id: 'req-1', username: 'runner_one', requestedAt: '2026-08-10T01:00:00.000Z' },
  { id: 'req-2', username: 'runner_two', requestedAt: '2026-08-10T02:00:00.000Z' },
]

function fakeService(overrides: Partial<AdminRecoveryService> = {}): AdminRecoveryService {
  return {
    listPending: vi.fn().mockResolvedValue({ ok: true, value: PENDING }),
    reset: vi.fn().mockResolvedValue({ ok: true, value: 'Xy7pQ2mN9kLr4Tzw' }),
    ...overrides,
  }
}

async function rowFor(username: string) {
  const usernameNode = await screen.findByText(username)
  return within(usernameNode.closest('li')!)
}

describe('AdminRecoveryScreen', () => {
  it('denies access and never queries the service for a non-admin session', () => {
    const service = fakeService()
    render(<AdminRecoveryScreen session={userSession} service={service} onClose={vi.fn()}/>)

    expect(screen.getByRole('alert')).toHaveTextContent('관리자만')
    expect(service.listPending).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: '재설정' })).not.toBeInTheDocument()
  })

  it('loads and renders pending requests for an admin session', async () => {
    const service = fakeService()
    render(<AdminRecoveryScreen session={adminSession} service={service} onClose={vi.fn()}/>)

    expect(service.listPending).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('runner_one')).toBeInTheDocument()
    expect(screen.getByText('runner_two')).toBeInTheDocument()
  })

  it('shows an empty state when there are no pending requests', async () => {
    const service = fakeService({ listPending: vi.fn().mockResolvedValue({ ok: true, value: [] }) })
    render(<AdminRecoveryScreen session={adminSession} service={service} onClose={vi.fn()}/>)

    expect(await screen.findByText('대기 중인 요청이 없어요.')).toBeInTheDocument()
  })

  it('shows an error when the list cannot be loaded', async () => {
    const service = fakeService({ listPending: vi.fn().mockResolvedValue({ ok: false, code: 'unknown', message: '불러오지 못했어요.' }) })
    render(<AdminRecoveryScreen session={adminSession} service={service} onClose={vi.fn()}/>)

    expect(await screen.findByRole('alert')).toHaveTextContent('불러오지 못했어요.')
  })

  it('requires confirmation before invoking reset', async () => {
    const user = userEvent.setup()
    const service = fakeService()
    render(<AdminRecoveryScreen session={adminSession} service={service} onClose={vi.fn()}/>)

    const row = await rowFor('runner_one')
    await user.click(row.getByRole('button', { name: '재설정' }))

    expect(service.reset).not.toHaveBeenCalled()
    expect(row.getByText(/정말/)).toBeInTheDocument()

    await user.click(row.getByRole('button', { name: '확인' }))
    expect(service.reset).toHaveBeenCalledWith('req-1')
  })

  it('cancelling the confirmation never calls reset', async () => {
    const user = userEvent.setup()
    const service = fakeService()
    render(<AdminRecoveryScreen session={adminSession} service={service} onClose={vi.fn()}/>)

    const row = await rowFor('runner_one')
    await user.click(row.getByRole('button', { name: '재설정' }))
    await user.click(row.getByRole('button', { name: '취소' }))

    expect(service.reset).not.toHaveBeenCalled()
    expect(row.getByRole('button', { name: '재설정' })).toBeInTheDocument()
  })

  it('shows the temporary password exactly once in a status panel and removes the request from the list after a confirmed reset', async () => {
    const user = userEvent.setup()
    const service = fakeService()
    render(<AdminRecoveryScreen session={adminSession} service={service} onClose={vi.fn()}/>)

    const row = await rowFor('runner_one')
    await user.click(row.getByRole('button', { name: '재설정' }))
    await user.click(row.getByRole('button', { name: '확인' }))

    const panel = await screen.findByRole('status', { name: /임시 비밀번호/ })
    expect(within(panel).getAllByText('Xy7pQ2mN9kLr4Tzw')).toHaveLength(1)
    await waitFor(() => expect(screen.getAllByRole('button', { name: '재설정' })).toHaveLength(1))
    expect(screen.getByText('runner_two')).toBeInTheDocument()
  })

  it('copies the temporary password to the clipboard', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const service = fakeService()
    render(<AdminRecoveryScreen session={adminSession} service={service} onClose={vi.fn()}/>)

    const row = await rowFor('runner_one')
    await user.click(row.getByRole('button', { name: '재설정' }))
    await user.click(row.getByRole('button', { name: '확인' }))
    await screen.findByRole('status', { name: /임시 비밀번호/ })

    await user.click(screen.getByRole('button', { name: '복사' }))
    expect(writeText).toHaveBeenCalledWith('Xy7pQ2mN9kLr4Tzw')
  })

  it('clears the temporary password from the document on dismissal', async () => {
    const user = userEvent.setup()
    const service = fakeService()
    render(<AdminRecoveryScreen session={adminSession} service={service} onClose={vi.fn()}/>)

    const row = await rowFor('runner_one')
    await user.click(row.getByRole('button', { name: '재설정' }))
    await user.click(row.getByRole('button', { name: '확인' }))
    await screen.findByRole('status', { name: /임시 비밀번호/ })

    await user.click(screen.getByRole('button', { name: '닫기' }))

    expect(screen.queryByText('Xy7pQ2mN9kLr4Tzw')).not.toBeInTheDocument()
  })

  it('shows an error and keeps the request in the list when reset fails', async () => {
    const user = userEvent.setup()
    const service = fakeService({ reset: vi.fn().mockResolvedValue({ ok: false, code: 'unknown', message: '이미 처리된 요청이에요.' }) })
    render(<AdminRecoveryScreen session={adminSession} service={service} onClose={vi.fn()}/>)

    const row = await rowFor('runner_one')
    await user.click(row.getByRole('button', { name: '재설정' }))
    await user.click(row.getByRole('button', { name: '확인' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('이미 처리된 요청이에요.')
    expect(screen.getByText('runner_one')).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: /임시 비밀번호/ })).not.toBeInTheDocument()
  })

  it('calls onClose when the back button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const service = fakeService()
    render(<AdminRecoveryScreen session={adminSession} service={service} onClose={onClose}/>)

    await screen.findByText('runner_one')
    await user.click(screen.getByRole('button', { name: '돌아가기' }))
    expect(onClose).toHaveBeenCalled()
  })
})
