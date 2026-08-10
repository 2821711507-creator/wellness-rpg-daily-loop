import { describe, expect, it } from 'vitest'
import type { SmoothieItem } from './smoothie'
import {
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
