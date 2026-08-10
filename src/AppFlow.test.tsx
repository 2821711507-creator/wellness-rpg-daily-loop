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
})
