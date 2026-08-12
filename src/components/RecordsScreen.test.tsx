import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { activityTemplates } from '../data/activityTemplates'
import { generateWeeklyPlan } from '../domain/weeklyPlan'
import type { WeightEntry } from '../domain/weight'
import { RecordsScreen } from './RecordsScreen'

const entries: WeightEntry[] = [
  ['2026-08-04', 72.4], ['2026-08-05', 72.1], ['2026-08-06', 72.2], ['2026-08-07', 71.9],
  ['2026-08-08', 71.8], ['2026-08-09', 71.7], ['2026-08-10', 71.6], ['2026-08-11', 71.5],
].map(([date, weightKg]) => ({ id: `weight-${date}`, date: String(date), weightKg: Number(weightKg), recordedAt: `${date}T07:00:00.000Z` }))

function createPlan() {
  const result = generateWeeklyPlan({
    weekStart: '2026-08-10',
    preferences: { mealsPerDay: 2, smoothieSlots: ['breakfast'], activitiesPerWeek: 2, activityMix: { gym: 1, home: 0, walk: 1 } },
    smoothieItems: [], activityTemplates,
  })
  if (!result.ok) throw new Error(result.message)
  result.plan.meals[0].completed = true
  result.plan.activities[0].completed = true
  return result.plan
}

describe('RecordsScreen', () => {
  it('saves today weight and announces validation errors', async () => {
    const user = userEvent.setup()
    const onSaveWeight = vi.fn(() => ({ ok: false as const, message: '체중을 확인해 주세요.' }))
    render(<RecordsScreen today="2026-08-11" entries={[]} plan={null} events={[]} onSaveWeight={onSaveWeight} onDeleteWeight={vi.fn()} />)
    await user.type(screen.getByRole('spinbutton', { name: '오늘 체중' }), '71.5')
    await user.click(screen.getByRole('button', { name: '체중 저장' }))
    expect(onSaveWeight).toHaveBeenCalledWith(71.5)
    expect(screen.getByRole('alert')).toHaveTextContent('체중을 확인해 주세요.')
  })

  it('emphasizes the seven-day average and provides accessible chart data', () => {
    render(<RecordsScreen today="2026-08-11" entries={entries} plan={createPlan()} events={[]} onSaveWeight={vi.fn()} onDeleteWeight={vi.fn()} />)
    expect(screen.getByRole('img', { name: '최근 28일 체중과 7일 평균 추세' })).toBeInTheDocument()
    expect(screen.getByTestId('average-line')).toBeInTheDocument()
    expect(screen.getByText('최근 7일 평균')).toBeInTheDocument()
    expect(screen.getByText('71.8kg', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('차트 데이터 표로 보기', { selector: 'summary' })).toBeInTheDocument()
  })

  it('shows a four-week completion calendar and evidence-labelled insight', () => {
    render(<RecordsScreen today="2026-08-11" entries={entries} plan={createPlan()} events={[]} onSaveWeight={vi.fn()} onDeleteWeight={vi.fn()} />)
    expect(screen.getAllByTestId('completion-day')).toHaveLength(28)
    expect(screen.getByText('규칙 기반 분석')).toBeInTheDocument()
    expect(screen.getByText(/7일 평균 = 최근 7일 유효 체중 합/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /CDC/ })).toHaveAttribute('href', expect.stringContaining('cdc.gov'))
  })

  it('uses a two-step confirmation before deleting today weight', async () => {
    const user = userEvent.setup()
    const onDeleteWeight = vi.fn()
    render(<RecordsScreen today="2026-08-11" entries={entries} plan={null} events={[]} onSaveWeight={vi.fn()} onDeleteWeight={onDeleteWeight} />)
    await user.click(screen.getByRole('button', { name: '오늘 체중 삭제' }))
    expect(onDeleteWeight).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: '삭제 확인' }))
    expect(onDeleteWeight).toHaveBeenCalledWith('2026-08-11')
  })
})
