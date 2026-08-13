import { describe, expect, it } from 'vitest'
import { estimateActivityCalories, getAlternatives } from './activity'
import { activityTemplates } from '../data/activityTemplates'

describe('activity templates', () => {
  it('keeps templates honest about their environment', () => {
    expect(activityTemplates.find(item => item.environment === 'gym')?.movements.every(item => item.includes('머신'))).toBe(true)
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
