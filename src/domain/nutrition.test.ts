import { describe, expect, it } from 'vitest'
import { calculateNutritionTarget } from './nutrition'

describe('calculateNutritionTarget', () => {
  it('calculates a deterministic evidence-labelled target', () => {
    const result = calculateNutritionTarget({ age: 30, heightCm: 175, weightKg: 80, calculationSex: 'male', activityLevel: 'light' })
    expect(result.bmrKcal).toBe(1749)
    expect(result.maintenanceKcal).toBe(2405)
    expect(result.targetKcal).toBe(2044)
    expect(result.proteinGrams).toBe(128)
    expect(result.evidence).toHaveLength(2)
  })
})
