import { describe, expect, it } from 'vitest'
import { getAlternatives } from './activity'
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
