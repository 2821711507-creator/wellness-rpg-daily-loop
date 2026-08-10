import { describe, expect, it } from 'vitest'
import type { SmoothieItem } from './smoothie'
import {
  generateWeeklyPlan,
  getMonday,
  getWeekDateKeys,
  MEAL_SLOT_LABELS,
  ORDERED_MEAL_SLOTS,
  toLocalDateKey,
  type PlannedActivity,
  type PlannedMeal,
  type WeeklyPlan,
  type WeeklyPlanPreferences,
} from './weeklyPlan'
import { activityTemplates } from '../data/activityTemplates'

describe('weekly plan dates', () => {
  it('resolves Sunday to the preceding Monday', () => {
    expect(toLocalDateKey(getMonday(new Date(2026, 7, 16, 23, 30)))).toBe('2026-08-10')
  })

  it('keeps Monday as the start of its week', () => {
    expect(toLocalDateKey(getMonday(new Date(2026, 7, 10, 1, 15)))).toBe('2026-08-10')
  })

  it('returns seven local dates across a month boundary', () => {
    expect(getWeekDateKeys('2026-08-31')).toEqual([
      '2026-08-31', '2026-09-01', '2026-09-02', '2026-09-03',
      '2026-09-04', '2026-09-05', '2026-09-06',
    ])
  })
})

describe('weekly plan model', () => {
  it('provides one shared meal-slot order and Korean labels', () => {
    expect(ORDERED_MEAL_SLOTS).toEqual(['breakfast', 'lunch', 'dinner', 'snack'])
    expect(MEAL_SLOT_LABELS).toEqual({ breakfast: '아침', lunch: '점심', dinner: '저녁', snack: '간식' })
  })

  it('supports a complete typed weekly plan without sharing smoothie item objects', () => {
    const source: SmoothieItem[] = [{ ingredientId: 'oats', grams: 40 }]
    const preferences: WeeklyPlanPreferences = {
      mealsPerDay: 2,
      smoothieSlots: ['breakfast'],
      activitiesPerWeek: 2,
      activityMix: { gym: 1, home: 0, walk: 1 },
    }
    const meal: PlannedMeal = {
      id: 'meal-1', date: '2026-08-10', slot: 'breakfast', kind: 'smoothie',
      smoothieItems: source.map(item => ({ ...item })), completed: false,
    }
    const activity: PlannedActivity = {
      id: 'activity-1', date: '2026-08-10', templateId: 'walk-basic', completed: false,
    }
    const plan: WeeklyPlan = {
      id: 'week-2026-08-10', weekStart: '2026-08-10', preferences,
      meals: [meal], activities: [activity],
    }

    expect(plan.meals[0].smoothieItems?.[0]).not.toBe(source[0])
    expect(plan.activities[0].templateId).toBe('walk-basic')
  })
})

describe('weekly plan generation', () => {
  const smoothieItems: SmoothieItem[] = [{ ingredientId: 'banana', grams: 100 }]
  const basePreferences: WeeklyPlanPreferences = {
    mealsPerDay: 3,
    smoothieSlots: ['breakfast'],
    activitiesPerWeek: 3,
    activityMix: { gym: 1, home: 1, walk: 1 },
  }

  const generate = (preferences: WeeklyPlanPreferences = basePreferences) =>
    generateWeeklyPlan({ weekStart: '2026-08-10', preferences, smoothieItems, activityTemplates })

  it.each([
    [2, ['breakfast', 'dinner']],
    [3, ['breakfast', 'lunch', 'dinner']],
    [4, ['breakfast', 'lunch', 'dinner', 'snack']],
  ] as const)('creates the expected slots for %i meals on every day', (mealsPerDay, slots) => {
    const result = generate({ ...basePreferences, mealsPerDay })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.plan.meals).toHaveLength(mealsPerDay * 7)
    for (const date of getWeekDateKeys(result.plan.weekStart)) {
      expect(result.plan.meals.filter(meal => meal.date === date).map(meal => meal.slot)).toEqual(slots)
    }
  })

  it('marks selected slots as smoothies and deep-copies their ingredients', () => {
    const result = generate({ ...basePreferences, smoothieSlots: ['breakfast', 'dinner'] })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const breakfast = result.plan.meals.find(meal => meal.slot === 'breakfast')!
    const lunch = result.plan.meals.find(meal => meal.slot === 'lunch')!
    expect(breakfast.kind).toBe('smoothie')
    expect(lunch.kind).toBe('regular')
    expect(breakfast.smoothieItems).not.toBe(smoothieItems)
    expect(breakfast.smoothieItems?.[0]).not.toBe(smoothieItems[0])
  })

  it.each([
    [2, ['2026-08-10', '2026-08-12']],
    [3, ['2026-08-10', '2026-08-12', '2026-08-14']],
    [4, ['2026-08-10', '2026-08-12', '2026-08-14', '2026-08-15']],
    [5, ['2026-08-10', '2026-08-12', '2026-08-14', '2026-08-15', '2026-08-11']],
  ] as const)('spreads %i activities in the fixed priority', (activitiesPerWeek, dates) => {
    const result = generate({ ...basePreferences, activitiesPerWeek })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.plan.activities.map(activity => activity.date)).toEqual(dates)
    expect(new Set(result.plan.activities.map(activity => activity.date)).size).toBe(activitiesPerWeek)
  })

  it('allocates activity ratios with deterministic largest remainders', () => {
    const result = generate({ ...basePreferences, activitiesPerWeek: 4, activityMix: { gym: 2, home: 1, walk: 1 } })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const environments = result.plan.activities.map(activity => activityTemplates.find(template => template.id === activity.templateId)?.environment)
    expect(environments.filter(value => value === 'gym')).toHaveLength(2)
    expect(environments.filter(value => value === 'home')).toHaveLength(1)
    expect(environments.filter(value => value === 'walk')).toHaveLength(1)
  })

  it('breaks equal remainder ties in gym, home, walk order', () => {
    const result = generate({ ...basePreferences, activitiesPerWeek: 2, activityMix: { gym: 1, home: 1, walk: 1 } })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.plan.activities.map(activity => activityTemplates.find(template => template.id === activity.templateId)?.environment)).toEqual(['gym', 'home'])
  })

  it('rejects a zero activity mix', () => {
    expect(generate({ ...basePreferences, activityMix: { gym: 0, home: 0, walk: 0 } })).toEqual({
      ok: false,
      message: '운동 방식 비율을 하나 이상 선택해 주세요.',
    })
  })

  it('generates stable identifiers for identical inputs', () => {
    const first = generate()
    const second = generate()
    expect(first).toEqual(second)
  })
})
