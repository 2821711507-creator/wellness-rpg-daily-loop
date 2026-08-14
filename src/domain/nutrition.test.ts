import { describe, expect, it } from 'vitest'
import { calculateNutritionTarget } from './nutrition'

describe('calculateNutritionTarget', () => {
  it('calculates a deterministic evidence-labelled target for a mild cut', () => {
    const result = calculateNutritionTarget({ age: 30, heightCm: 175, weightKg: 80, calculationSex: 'male', activityLevel: 'light', goal: 'cut', cutIntensity: 'mild', exerciseExperience: 'experienced' })
    expect(result.bmrKcal).toBe(1749)
    expect(result.maintenanceKcal).toBe(2405)
    expect(result.targetKcal).toBe(2044)
    expect(result.proteinGrams).toBe(160)
    expect(result.fatGrams).toBe(57)
    expect(result.carbGrams).toBe(223)
    expect(result.evidence).toHaveLength(2)
  })

  it('applies the veryActive multiplier for a maintain goal', () => {
    const result = calculateNutritionTarget({ age: 30, heightCm: 175, weightKg: 80, calculationSex: 'male', activityLevel: 'veryActive', goal: 'maintain', exerciseExperience: 'experienced' })
    expect(result.maintenanceKcal).toBe(3017)
    expect(result.targetKcal).toBe(3017)
    expect(result.proteinGrams).toBe(128)
    expect(result.fatGrams).toBe(84)
    expect(result.carbGrams).toBe(437)
  })

  it('applies a 10% surplus and higher protein for a bulk goal', () => {
    const result = calculateNutritionTarget({ age: 30, heightCm: 175, weightKg: 80, calculationSex: 'male', activityLevel: 'moderate', goal: 'bulk', exerciseExperience: 'experienced' })
    expect(result.maintenanceKcal).toBe(2711)
    expect(result.targetKcal).toBe(2982)
    expect(result.proteinGrams).toBe(144)
    expect(result.fatGrams).toBe(83)
    expect(result.carbGrams).toBe(415)
  })

  it('applies a deeper deficit for an aggressive cut', () => {
    const result = calculateNutritionTarget({ age: 30, heightCm: 175, weightKg: 80, calculationSex: 'male', activityLevel: 'light', goal: 'cut', cutIntensity: 'aggressive', exerciseExperience: 'experienced' })
    expect(result.targetKcal).toBe(1804)
    expect(result.proteinGrams).toBe(160)
    expect(result.fatGrams).toBe(50)
    expect(result.carbGrams).toBe(179)
  })

  it('clamps an aggressive cut to the sex-based safety floor and warns', () => {
    const result = calculateNutritionTarget({ age: 60, heightCm: 150, weightKg: 45, calculationSex: 'female', activityLevel: 'sedentary', goal: 'cut', cutIntensity: 'aggressive', exerciseExperience: 'experienced' })
    expect(result.targetKcal).toBe(1200)
    expect(result.warnings).toContain('계산된 목표가 너무 낮아 안전 최소값으로 조정했습니다. 전문가와 상의하세요.')
  })

  it('never returns negative carbs when protein and fat already exceed the target', () => {
    const result = calculateNutritionTarget({ age: 80, heightCm: 140, weightKg: 300, calculationSex: 'male', activityLevel: 'sedentary', goal: 'cut', cutIntensity: 'aggressive', exerciseExperience: 'experienced' })
    expect(result.carbGrams).toBe(0)
    expect(result.warnings).toContain('단백질과 지방 목표가 높아 탄수화물이 매우 낮게 계산되었습니다.')
  })
})
