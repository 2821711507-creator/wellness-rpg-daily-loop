import { describe, expect, it } from 'vitest'
import { normalizeProfile, validateProfile } from './profile'

describe('validateProfile', () => {
  it('rejects unsupported ages and measurements', () => {
    expect(() => validateProfile({ age: 17, heightCm: 170, weightKg: 70, calculationSex: 'male', activityLevel: 'light', goal: 'cut', cutIntensity: 'mild', exerciseExperience: 'beginner' })).toThrow('성인 사용자만')
    expect(() => validateProfile({ age: 30, heightCm: 0, weightKg: 70, calculationSex: 'female', activityLevel: 'light', goal: 'cut', cutIntensity: 'mild', exerciseExperience: 'beginner' })).toThrow('키와 체중')
  })
})

describe('normalizeProfile', () => {
  it('defaults a legacy profile with no goal to cut/mild', () => {
    const result = normalizeProfile({ age: 30, heightCm: 175, weightKg: 80, calculationSex: 'male', activityLevel: 'light' })
    expect(result).toEqual({ age: 30, heightCm: 175, weightKg: 80, calculationSex: 'male', activityLevel: 'light', goal: 'cut', cutIntensity: 'mild', exerciseExperience: 'beginner' })
  })

  it('keeps an explicit non-cut goal without inventing a cutIntensity', () => {
    const result = normalizeProfile({ age: 30, heightCm: 175, weightKg: 80, calculationSex: 'male', activityLevel: 'light', goal: 'bulk' })
    expect(result).toEqual({ age: 30, heightCm: 175, weightKg: 80, calculationSex: 'male', activityLevel: 'light', goal: 'bulk', exerciseExperience: 'beginner' })
  })

  it('defaults a legacy profile with no exerciseExperience to beginner', () => {
    const result = normalizeProfile({ age: 30, heightCm: 175, weightKg: 80, calculationSex: 'male', activityLevel: 'light', goal: 'bulk' })
    expect(result).toEqual({ age: 30, heightCm: 175, weightKg: 80, calculationSex: 'male', activityLevel: 'light', goal: 'bulk', exerciseExperience: 'beginner' })
  })

  it('keeps an explicit exerciseExperience of experienced', () => {
    const result = normalizeProfile({ age: 30, heightCm: 175, weightKg: 80, calculationSex: 'male', activityLevel: 'light', goal: 'bulk', exerciseExperience: 'experienced' })
    expect(result).toEqual({ age: 30, heightCm: 175, weightKg: 80, calculationSex: 'male', activityLevel: 'light', goal: 'bulk', exerciseExperience: 'experienced' })
  })

  it('passes null through for profiles that were never onboarded', () => {
    expect(normalizeProfile(null)).toBeNull()
  })
})
