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

  it('tags every gym-basic movement with its matching movement guide', () => {
    const gymBasic = activityTemplates.find(item => item.id === 'gym-basic')!
    expect(gymBasic.movements).toEqual([
      { label:'레그 프레스 머신 2×8–12', guideId:'leg-press' },
      { label:'체스트 프레스 머신 2×8–12', guideId:'chest-press' },
      { label:'시티드 로우 머신 2×8–12', guideId:'seated-row' },
      { label:'레그 컬 머신 2×8–12', guideId:'leg-curl' },
      { label:'숄더 프레스 머신 2×8–12', guideId:'shoulder-press' },
    ])
  })

  it('leaves non-equipment movements without a guideId', () => {
    const walkBasic = activityTemplates.find(item => item.id === 'walk-basic')!
    expect(walkBasic.movements).toEqual([
      { label:'편하게 5분' }, { label:'빠르게 20분' }, { label:'천천히 5분' },
    ])
  })
})
