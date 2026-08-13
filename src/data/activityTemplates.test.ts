import { describe, expect, it } from 'vitest'
import { activityTemplates } from './activityTemplates'

describe('activityTemplates', () => {
  it('has 18 templates with unique ids', () => {
    expect(activityTemplates).toHaveLength(18)
    expect(new Set(activityTemplates.map(item => item.id)).size).toBe(18)
  })

  it('gives every template a positive MET value and at least one goal fit', () => {
    for (const template of activityTemplates) {
      expect(template.metValue).toBeGreaterThan(0)
      expect(template.goalFit.length).toBeGreaterThan(0)
    }
  })

  it('keeps the original 3 rotation templates first, unchanged, and load-bearing', () => {
    expect(activityTemplates[0]).toMatchObject({ id: 'gym-basic', environment: 'gym', title: '머신 전신 탐험', minutes: 35 })
    expect(activityTemplates[1]).toMatchObject({ id: 'home-basic', environment: 'home', title: '집에서 기본 루프', minutes: 20 })
    expect(activityTemplates[2]).toMatchObject({ id: 'walk-basic', environment: 'walk', title: '동네 산보 퀘스트', minutes: 30 })
  })

  it('covers all four exercise styles', () => {
    const styles = new Set(activityTemplates.map(item => item.style))
    expect(styles).toEqual(new Set(['cardio', 'strength', 'flexibility', 'hiit']))
  })
})
