import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { activityTemplates } from '../data/activityTemplates'
import { generateWeeklyPlan, type PlanMutationResult, type WeeklyPlan } from '../domain/weeklyPlan'
import { WeeklyPlanScreen } from './WeeklyPlanScreen'
import { reconcileApprovedTrainingWeek } from '../domain/weeklyTrainingGuidance'

function createPlan(): WeeklyPlan {
  const result = generateWeeklyPlan({
    weekStart: '2026-08-10',
    preferences: { mealsPerDay: 3, smoothieSlots: ['breakfast'], activitiesPerWeek: 3, activityMix: { gym: 1, home: 1, walk: 1 } },
    smoothieItems: [{ ingredientId: 'oats', grams: 40 }],
    activityTemplates,
  })
  if (!result.ok) throw new Error(result.message)
  return result.plan
}

const noChange = (plan: WeeklyPlan): PlanMutationResult => ({ ok: true, plan })

describe('WeeklyPlanScreen', () => {
  it('submits meal, smoothie, activity, and environment preferences', async () => {
    const user = userEvent.setup()
    const onGenerate = vi.fn()
    render(<WeeklyPlanScreen plan={null} smoothieItems={[]} onGenerate={onGenerate} onMoveMeal={vi.fn()} onMoveActivity={vi.fn()} onReplaceActivity={vi.fn()} onRegenerate={vi.fn()} />)

    await user.click(screen.getByRole('radio', { name: '하루 3끼' }))
    await user.click(screen.getByRole('checkbox', { name: '아침을 스무디로' }))
    await user.click(screen.getByRole('checkbox', { name: '저녁을 스무디로' }))
    await user.click(screen.getByRole('radio', { name: '주 3회' }))
    await user.clear(screen.getByRole('spinbutton', { name: '헬스장 비율' }))
    await user.type(screen.getByRole('spinbutton', { name: '헬스장 비율' }), '2')
    await user.click(screen.getByRole('button', { name: '이번 주 계획 만들기' }))

    expect(onGenerate).toHaveBeenCalledWith({
      mealsPerDay: 3,
      smoothieSlots: ['breakfast', 'dinner'],
      activitiesPerWeek: 3,
      activityMix: { gym: 2, home: 1, walk: 1 },
    })
  })

  it('renders a seven-day plan and its summary', () => {
    const plan = createPlan()
    render(<WeeklyPlanScreen plan={plan} smoothieItems={[]} onGenerate={vi.fn()} onMoveMeal={() => noChange(plan)} onMoveActivity={() => noChange(plan)} onReplaceActivity={() => noChange(plan)} onRegenerate={vi.fn()} />)

    expect(screen.getAllByTestId('day-plan')).toHaveLength(7)
    expect(screen.getByText('식사 21')).toBeInTheDocument()
    expect(screen.getByText('스무디 7')).toBeInTheDocument()
    expect(screen.getByText('운동 3')).toBeInTheDocument()
    expect(screen.getAllByText('스무디')).toHaveLength(7)
    expect(screen.getByText(/머신 전신 탐험 · 35분/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '계획 다시 만들기' })).toBeInTheDocument()
  })

  it('shows the approved recovery-aware training guide and exercise details', () => {
    const plan = reconcileApprovedTrainingWeek(createPlan())
    render(<WeeklyPlanScreen plan={plan} smoothieItems={[]} onGenerate={vi.fn()} onMoveMeal={() => noChange(plan)} onMoveActivity={() => noChange(plan)} onReplaceActivity={() => noChange(plan)} onRegenerate={vi.fn()} />)

    expect(screen.getByRole('heading', { name:'이번 주 회복 우선 감량 루틴' })).toBeInTheDocument()
    expect(screen.getAllByTestId('training-guide-day')).toHaveLength(7)
    expect(screen.getByText(/유산소 30분 \+ 가벼운 근력 \+ 저녁 식사 후 HIIT/)).toBeInTheDocument()
    expect(screen.getByText('머신 체스트 프레스')).toBeInTheDocument()
    expect(screen.getByText('레그 프레스')).toBeInTheDocument()
    expect(screen.getByText('이번 주 HIIT는 화요일 1회로 충분해요.')).toBeInTheDocument()
    expect(screen.getByText('토요일 자유식을 위해 운동량을 미리 늘리지 않아요.')).toBeInTheDocument()
    expect(screen.getByText(/다리가 많이 뻐근하거나 통증이 있으면 바로 쉬어요/)).toBeInTheDocument()
  })

  it('shows move collisions as alerts and restores focus after Escape', async () => {
    const user = userEvent.setup()
    const plan = createPlan()
    const collision = vi.fn(() => ({ ok: false, message: '선택한 날짜에 같은 끼니가 이미 있어요.' }) as PlanMutationResult)
    render(<WeeklyPlanScreen plan={plan} smoothieItems={[]} onGenerate={vi.fn()} onMoveMeal={collision} onMoveActivity={() => noChange(plan)} onReplaceActivity={() => noChange(plan)} onRegenerate={vi.fn()} />)
    const firstDay = screen.getAllByTestId('day-plan')[0]
    const trigger = within(firstDay).getAllByRole('button', { name: /다른 날로 이동/ })[0]

    await user.click(trigger)
    const dialog = screen.getByRole('dialog', { name: '계획 날짜 이동' })
    expect(within(dialog).getByRole('button', { name: '닫기' })).toHaveFocus()
    await user.selectOptions(within(dialog).getByRole('combobox', { name: '이동할 날짜' }), '2026-08-11')
    await user.click(within(dialog).getByRole('button', { name: '이동하기' }))
    expect(screen.getByRole('alert')).toHaveTextContent('같은 끼니가 이미 있어요')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('offers clear activity alternatives with duration and intensity', async () => {
    const user = userEvent.setup()
    const plan = createPlan()
    render(<WeeklyPlanScreen plan={plan} smoothieItems={[]} onGenerate={vi.fn()} onMoveMeal={() => noChange(plan)} onMoveActivity={() => noChange(plan)} onReplaceActivity={() => noChange(plan)} onRegenerate={vi.fn()} />)
    await user.click(screen.getAllByRole('button', { name: /운동 교체/ })[0])
    const dialog = screen.getByRole('dialog', { name: '운동 대안 선택' })
    expect(within(dialog).getByText(/집에서 기본 루프 · 20분 · 가볍게/)).toBeInTheDocument()
    expect(within(dialog).getByText(/동네 산보 퀘스트 · 30분 · 가볍게/)).toBeInTheDocument()
    expect(dialog).not.toHaveTextContent(/칼로리|동등/)
  })
})
