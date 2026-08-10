import { describe, expect, it } from 'vitest'
import { validateProfile } from './profile'

describe('validateProfile', () => {
  it('rejects unsupported ages and measurements', () => {
    expect(() => validateProfile({ age: 17, heightCm: 170, weightKg: 70, calculationSex: 'male', activityLevel: 'light' })).toThrow('성인 사용자만')
    expect(() => validateProfile({ age: 30, heightCm: 0, weightKg: 70, calculationSex: 'female', activityLevel: 'light' })).toThrow('키와 체중')
  })
})
