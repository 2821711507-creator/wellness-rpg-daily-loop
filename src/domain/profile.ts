export type CalculationSex = 'female' | 'male'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate'

export interface UserProfile { age: number; heightCm: number; weightKg: number; calculationSex: CalculationSex; activityLevel: ActivityLevel }

export function validateProfile(profile: UserProfile): UserProfile {
  if (profile.age < 18) throw new Error('성인 사용자만 자동 계산을 사용할 수 있습니다.')
  if (profile.heightCm <= 0 || profile.weightKg <= 0) throw new Error('키와 체중을 올바르게 입력해 주세요.')
  return profile
}
