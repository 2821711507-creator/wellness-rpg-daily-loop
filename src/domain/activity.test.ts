import { describe, expect, it } from 'vitest'
import { estimateActivityCalories, getAlternatives, getRotationCandidates, pickBestTemplate } from './activity'
import { activityTemplates } from '../data/activityTemplates'

describe('activity templates', () => {
  it('keeps templates honest about their environment', () => {
    expect(activityTemplates.find(item => item.environment === 'gym')?.movements.every(item => item.label.includes('머신'))).toBe(true)
    expect(activityTemplates.find(item => item.environment === 'home')?.equipment).toEqual([])
  })
  it('offers home and walk alternatives', () => {
    const gym = activityTemplates.find(item => item.environment === 'gym')!
    expect(getAlternatives(gym, activityTemplates).map(item => item.environment)).toEqual(['home', 'walk'])
  })
})

describe('estimateActivityCalories', () => {
  const base = { id: 'x', environment: 'home' as const, style: 'cardio' as const, goalFit: ['cut' as const], intensity: 'moderate' as const, movements: [], equipment: [], safetyNote: '' }

  it('computes MET × weight(kg) × duration(hours), rounded', () => {
    expect(estimateActivityCalories({ ...base, title: 't', minutes: 30, metValue: 5 }, 70)).toBe(175)
  })

  it('rounds to the nearest whole calorie', () => {
    // 3.5 * 68 * (35/60) = 138.8333...
    expect(estimateActivityCalories({ ...base, title: 't', minutes: 35, metValue: 3.5 }, 68)).toBe(139)
  })

  it('scales linearly with duration', () => {
    const perMinute = estimateActivityCalories({ ...base, title: 't', minutes: 60, metValue: 4 }, 70)
    const half = estimateActivityCalories({ ...base, title: 't', minutes: 30, metValue: 4 }, 70)
    expect(half).toBe(Math.round(perMinute / 2))
  })
})

describe('pickBestTemplate / getRotationCandidates', () => {
  it('prefers a goal match over the environment default', () => {
    const bulkPick = pickBestTemplate('gym', activityTemplates, 'bulk')
    expect(bulkPick.goalFit).toContain('bulk')
  })

  it('falls back to the environment default when no template fits the goal', () => {
    // No 'walk' template's goalFit includes 'bulk', so this must fall back
    // to the first walk-environment entry (walk-basic) rather than throwing
    // or returning something from a different environment.
    const pick = pickBestTemplate('walk', activityTemplates, 'bulk')
    expect(pick.id).toBe('walk-basic')
  })

  it('keeps the exact old behavior when no goal is given', () => {
    expect(pickBestTemplate('gym', activityTemplates).id).toBe('gym-basic')
    expect(pickBestTemplate('home', activityTemplates).id).toBe('home-basic')
    expect(pickBestTemplate('walk', activityTemplates).id).toBe('walk-basic')
  })

  it('prefers an equipment-light, non-hard template for beginners', () => {
    const pick = pickBestTemplate('gym', activityTemplates, 'bulk', true)
    // gym-strength-fullbody fits 'bulk' but needs 2 pieces of equipment and is 'hard';
    // gym-basic fits 'bulk' via goalFit ['maintain','bulk'], needs 1 generic
    // equipment entry, and is 'moderate' -- the beginner-friendly pick.
    expect(pick.id).toBe('gym-basic')
  })

  it('experienced users see the unfiltered goal-matched pool (may include hard/multi-equipment templates)', () => {
    const pick = pickBestTemplate('gym', activityTemplates, 'bulk', false)
    expect(pick.goalFit).toContain('bulk')
  })

  it('getRotationCandidates never returns an empty list for a real environment', () => {
    for (const environment of ['gym', 'home', 'walk'] as const) {
      for (const goal of ['cut', 'maintain', 'bulk'] as const) {
        for (const beginnerFriendly of [true, false]) {
          expect(getRotationCandidates(environment, activityTemplates, goal, beginnerFriendly).length).toBeGreaterThan(0)
        }
      }
    }
  })
})
