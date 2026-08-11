import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'

describe('daily loop', () => {
  beforeEach(() => localStorage.clear())
  it('onboards and rewards a completed activity quest once', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '시작하기' }))
    expect(screen.getByRole('heading', { name: '오늘' })).toBeInTheDocument()
    expect(screen.getByText(/목표 1697 kcal/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /오늘의 운동 완료/ }))
    expect(screen.getByText('1/3')).toBeInTheDocument()
    expect(screen.getByText(/72\/100 XP/)).toBeInTheDocument()
  })

  it('creates and opens a seven-day weekly plan', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '시작하기' }))
    await user.click(screen.getAllByRole('button', { name: '계획' })[0])
    await user.click(screen.getByRole('button', { name: '이번 주 계획 만들기' }))
    expect(screen.getAllByTestId('day-plan')).toHaveLength(7)
    expect(screen.getByText('식사 21')).toBeInTheDocument()
  })

  it('synchronizes today activity completion with the weekly summary', async () => {
    const user = userEvent.setup()
    render(<App now={() => new Date(2026, 7, 10, 12)} />)
    await user.click(screen.getByRole('button', { name: '시작하기' }))
    await user.click(screen.getAllByRole('button', { name: '계획' })[0])
    await user.click(screen.getByRole('button', { name: '이번 주 계획 만들기' }))
    await user.click(screen.getByRole('button', { name: '오늘' }))
    await user.click(screen.getByRole('button', { name: '운동 완료' }))
    await user.click(screen.getAllByRole('button', { name: '계획' })[0])
    expect(screen.getByText('완료 1/24')).toBeInTheDocument()
    expect(screen.getByText(/완료됨/)).toBeInTheDocument()
  })

  it('restores a generated weekly plan after remounting', async () => {
    const user = userEvent.setup()
    const first = render(<App />)
    await user.click(screen.getByRole('button', { name: '시작하기' }))
    await user.click(screen.getAllByRole('button', { name: '계획' })[0])
    await user.click(screen.getByRole('button', { name: '이번 주 계획 만들기' }))
    first.unmount()
    render(<App />)
    await user.click(screen.getAllByRole('button', { name: '계획' })[0])
    expect(screen.getAllByTestId('day-plan')).toHaveLength(7)
  })
})
