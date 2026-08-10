import { describe, expect, it } from 'vitest'
import { activityTemplates } from '../data/activityTemplates'
import { generateWeeklyPlan, type WeeklyPlan } from './weeklyPlan'
import { parseWeeklyPlan } from './weeklyPlanValidation'

function validPlan() {
  const result = generateWeeklyPlan({
    weekStart: '2026-08-10',
    preferences: { mealsPerDay: 3, smoothieSlots: ['breakfast'], activitiesPerWeek: 3, activityMix: { gym: 1, home: 1, walk: 1 } },
    smoothieItems: [{ ingredientId: 'oats', grams: 40 }],
    activityTemplates,
  })
  if (!result.ok) throw new Error(result.message)
  return result.plan
}

describe('parseWeeklyPlan', () => {
  it('accepts a valid plan', () => {
    expect(parseWeeklyPlan(validPlan(), activityTemplates).plan).toEqual(validPlan())
  })

  it.each([
    ['nested preferences', (plan: WeeklyPlan) => ({ ...plan, preferences: { ...plan.preferences, mealsPerDay: 8 } })],
    ['date keys', (plan: WeeklyPlan) => ({ ...plan, meals: [{ ...plan.meals[0], date: 'not-a-date' }, ...plan.meals.slice(1)] })],
    ['duplicate slots', (plan: WeeklyPlan) => ({ ...plan, meals: [...plan.meals, { ...plan.meals[0], id: 'duplicate' }] })],
  ] as const)('rejects malformed %s', (_label, mutate) => {
    const result = parseWeeklyPlan(mutate(validPlan()), activityTemplates)
    expect(result.plan).toBeNull()
    expect(result.warning).toBe('주간 계획을 복구하지 못해 계획만 초기화했어요.')
  })

  it('replaces an unknown activity template with the basic walk', () => {
    const plan = validPlan()
    plan.activities[0] = { ...plan.activities[0], templateId: 'retired' }
    const result = parseWeeklyPlan(plan, activityTemplates)
    expect(result.plan?.activities[0].templateId).toBe('walk-basic')
    expect(result.warning).toBe('찾을 수 없는 운동을 기본 산보로 바꿨어요.')
  })
})
