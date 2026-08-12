import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SyncStatus } from './SyncStatus'

describe('SyncStatus', () => {
  it('renders nothing while the initial state is still loading', () => {
    render(<SyncStatus state="loading"/>)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('announces 저장 중 while saving', () => {
    render(<SyncStatus state="saving"/>)
    expect(screen.getByRole('status')).toHaveTextContent('저장 중')
  })

  it('announces 저장됨 once saved', () => {
    render(<SyncStatus state="saved"/>)
    expect(screen.getByRole('status')).toHaveTextContent('저장됨')
  })

  it('announces 동기화 대기 중 while offline and waiting to retry', () => {
    render(<SyncStatus state="waiting"/>)
    expect(screen.getByRole('status')).toHaveTextContent('동기화 대기 중')
  })

  it('shows a reload action on conflict and never silently discards it', async () => {
    const user = userEvent.setup()
    const onReloadRemote = vi.fn()
    render(<SyncStatus state="conflict" onReloadRemote={onReloadRemote}/>)

    expect(screen.getByRole('status')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name:'새로고침' }))
    expect(onReloadRemote).toHaveBeenCalledOnce()
  })

  it('shows a retry action on error', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(<SyncStatus state="error" onRetry={onRetry}/>)

    await user.click(screen.getByRole('button', { name:'다시 시도' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('never overlaps the bottom navigation region', () => {
    render(<div className="app-shell"><SyncStatus state="saved"/><nav className="bottom-nav" aria-label="주요 메뉴"/></div>)
    const status = screen.getByRole('status')
    expect(status.className).not.toContain('bottom-nav')
    expect(getComputedStyle(status).position).not.toBe('fixed')
  })
})
