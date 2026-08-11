import { describe, expect, it } from 'vitest'
import { createApprovedTrainingWeek, reconcileApprovedTrainingWeek } from './weeklyTrainingGuidance'
import { generateWeeklyPlan } from './weeklyPlan'
import { activityTemplates } from '../data/activityTemplates'

describe('approved current training week', () => {
  it('preserves completed Tuesday and schedules recovery before two strength days', () => {
    const guide = createApprovedTrainingWeek('2026-08-10')
    expect(guide?.days.map(day => [day.date, day.state, day.kind])).toEqual([
      ['2026-08-10', 'skipped', 'rest'],
      ['2026-08-11', 'completed', 'mixed'],
      ['2026-08-12', 'planned', 'recovery'],
      ['2026-08-13', 'planned', 'strength-upper'],
      ['2026-08-14', 'planned', 'rest'],
      ['2026-08-15', 'planned', 'strength-lower-core'],
      ['2026-08-16', 'conditional', 'light-cardio'],
    ])
    expect(guide?.days.filter(day => day.kind.startsWith('strength-'))).toHaveLength(2)
  })

  it('allows only the completed Tuesday HIIT and includes no compensatory exercise', () => {
    const guide = createApprovedTrainingWeek('2026-08-10')!
    expect(guide.days.filter(day => day.includesHiit)).toEqual([expect.objectContaining({ date:'2026-08-11', state:'completed' })])
    expect(guide.rules).toContain('이번 주 HIIT는 화요일 1회로 충분해요.')
    expect(guide.rules).toContain('토요일 자유식을 위해 운동량을 미리 늘리지 않아요.')
    expect(guide.days[0].summary).toContain('보충하지')
  })

  it('preserves meals, replaces conflicting generic activities, and is idempotent', () => {
    const result = generateWeeklyPlan({
      weekStart:'2026-08-10',
      preferences:{ mealsPerDay:3, smoothieSlots:[], activitiesPerWeek:3, activityMix:{ gym:1, home:1, walk:1 } },
      smoothieItems:[], activityTemplates,
    })
    if (!result.ok) throw new Error(result.message)
    const reconciled = reconcileApprovedTrainingWeek(result.plan)
    expect(reconciled.meals).toBe(result.plan.meals)
    expect(reconciled.activities.map(activity => [activity.date, activity.templateId, activity.completed])).toEqual([
      ['2026-08-11', 'mixed-hiit-completed', true],
      ['2026-08-12', 'recovery-cardio', false],
      ['2026-08-13', 'gym-upper', false],
      ['2026-08-15', 'gym-lower-core', false],
      ['2026-08-16', 'light-cardio-conditional', false],
    ])
    expect(reconcileApprovedTrainingWeek(reconciled)).toEqual(reconciled)
  })

  it('does not attach this dated guide to another week', () => {
    expect(createApprovedTrainingWeek('2026-08-17')).toBeUndefined()
  })
})
