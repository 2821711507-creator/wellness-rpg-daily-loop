import { describe, expect, it } from 'vitest'
import { activityTemplates } from '../data/activityTemplates'
import { generateWeeklyPlan, type WeeklyPlan } from './weeklyPlan'
import { appendCompletionEvent, calculateWeeklyRecordSummary, getFourWeekCompletionDays, type CompletionEvent } from './records'
import type { WeightEntry } from './weight'

function plan(): WeeklyPlan {
  const result = generateWeeklyPlan({
    weekStart: '2026-08-10',
    preferences: { mealsPerDay: 2, smoothieSlots: ['breakfast'], activitiesPerWeek: 2, activityMix: { gym: 1, home: 1, walk: 0 } },
    smoothieItems: [], activityTemplates,
  })
  if (!result.ok) throw new Error(result.message)
  return result.plan
}

const event = (overrides: Partial<CompletionEvent> = {}): CompletionEvent => ({ id: 'event-1', date: '2026-08-10', kind: 'planned-meal', plannedItemId: 'meal-1', xpEarned: 20, ...overrides })
const weight = (date: string): WeightEntry => ({ id: `weight-${date}`, date, weightKg: 70, recordedAt: `${date}T07:00:00+09:00` })

describe('completion events', () => {
  it('appends a new event and ignores a duplicate id immutably', () => {
    const original = [event()]
    expect(appendCompletionEvent(original, event({ id: 'event-2', date: '2026-08-11' }))).toHaveLength(2)
    expect(appendCompletionEvent(original, event({ xpEarned: 999 }))).toBe(original)
    expect(original).toHaveLength(1)
  })
})

describe('weekly record summary', () => {
  it('summarizes planned completions, rounded rate, xp, and distinct weight days', () => {
    const weeklyPlan = plan()
    weeklyPlan.meals[0] = { ...weeklyPlan.meals[0], completed: true }
    weeklyPlan.activities[0] = { ...weeklyPlan.activities[0], completed: true }
    const events = [event(), event({ id: 'event-2', kind: 'planned-activity', plannedItemId: weeklyPlan.activities[0].id, xpEarned: 40 }), event({ id: 'outside', date: '2026-08-20', xpEarned: 100 })]
    const weights = [weight('2026-08-10'), weight('2026-08-10'), weight('2026-08-12')]
    expect(calculateWeeklyRecordSummary(weeklyPlan, events, weights, '2026-08-10')).toEqual({
      weekStart: '2026-08-10', plannedMeals: 14, completedMeals: 1,
      plannedActivities: 2, completedActivities: 1, completionRate: 13,
      xpEarned: 60, weightDays: 2,
    })
  })

  it('returns null completion rate when there was no plan', () => {
    expect(calculateWeeklyRecordSummary(null, [], [], '2026-08-10').completionRate).toBeNull()
  })
})

describe('four-week completion days', () => {
  it('distinguishes no plan, incomplete, and complete days', () => {
    const weeklyPlan = plan()
    weeklyPlan.meals = weeklyPlan.meals.map(item => item.date === '2026-08-10' ? { ...item, completed: true } : item)
    weeklyPlan.activities = weeklyPlan.activities.map(item => item.date === '2026-08-10' ? { ...item, completed: true } : item)
    const days = getFourWeekCompletionDays([weeklyPlan], [], '2026-08-16')
    expect(days).toHaveLength(28)
    expect(days.find(day => day.date === '2026-07-20')?.status).toBe('none')
    expect(days.find(day => day.date === '2026-08-11')).toMatchObject({ status: 'incomplete', mealsCompleted: 0, mealsPlanned: 2, activityStatus: 'none' })
    expect(days.find(day => day.date === '2026-08-10')).toMatchObject({ status: 'complete', mealsCompleted: 2, mealsPlanned: 2, activityStatus: 'complete' })
  })
})
