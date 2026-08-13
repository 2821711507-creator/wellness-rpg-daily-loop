import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ActivityTemplate } from '../domain/activity'
import { ActivityCard } from './ActivityCard'

const ACTIVITY: ActivityTemplate = { id:'test-activity', environment:'home', style:'cardio', goalFit:['cut'], metValue:5, title:'테스트 운동', minutes:30, intensity:'moderate', movements:['동작 1', '동작 2'], equipment:[], safetyNote:'안전 문구' }

describe('ActivityCard', () => {
  it('shows the duration and the estimated calorie burn for the given weight', () => {
    render(<ActivityCard activity={ACTIVITY} weightKg={70} onComplete={vi.fn()} onSwap={vi.fn()}/>)

    // 5 MET * 70kg * (30/60)h = 175 kcal
    expect(screen.getByText('30분 · 약 175 kcal')).toBeInTheDocument()
  })

  it('recomputes the estimate for a different weight', () => {
    render(<ActivityCard activity={ACTIVITY} weightKg={56} onComplete={vi.fn()} onSwap={vi.fn()}/>)

    // 5 MET * 56kg * (30/60)h = 140 kcal
    expect(screen.getByText('30분 · 약 140 kcal')).toBeInTheDocument()
  })

  it('offers the evidence disclosure', async () => {
    const user = userEvent.setup()
    render(<ActivityCard activity={ACTIVITY} weightKg={70} onComplete={vi.fn()} onSwap={vi.fn()}/>)

    await user.click(screen.getByText('계산 근거 보기'))

    expect(screen.getByText(/kcal = MET × 체중\(kg\) × \(분\/60\)/)).toBeInTheDocument()
  })

  it('still calls onComplete and onSwap', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    const onSwap = vi.fn()
    render(<ActivityCard activity={ACTIVITY} weightKg={70} onComplete={onComplete} onSwap={onSwap}/>)

    await user.click(screen.getByRole('button', { name:'운동 완료' }))
    await user.click(screen.getByRole('button', { name:'다른 운동 선택' }))

    expect(onComplete).toHaveBeenCalled()
    expect(onSwap).toHaveBeenCalled()
  })
})
