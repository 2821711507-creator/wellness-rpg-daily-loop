import { describe, expect, it } from 'vitest'
import { calculateSmoothie } from './smoothie'
import { ingredients } from '../data/ingredients'

describe('calculateSmoothie', () => {
  it('calculates nutrients by ingredient weight', () => {
    const result = calculateSmoothie([{ ingredientId: 'oats', grams: 40 }, { ingredientId: 'yogurt', grams: 150 }, { ingredientId: 'soy', grams: 200 }, { ingredientId: 'banana', grams: 100 }, { ingredientId: 'spinach', grams: 60 }], ingredients)
    expect(result.kcal).toBe(416)
    expect(result.protein).toBeCloseTo(21.5, 1)
    expect(result.warnings).toEqual([])
  })
  it('warns when a meal is low in protein', () => {
    expect(calculateSmoothie([{ ingredientId: 'banana', grams: 100 }], ingredients).warnings).toContain('단백질이 낮은 식사입니다.')
  })
  it('rejects invalid quantities', () => {
    expect(() => calculateSmoothie([{ ingredientId: 'banana', grams: -1 }], ingredients)).toThrow('중량')
  })
})
