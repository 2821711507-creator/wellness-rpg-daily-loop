import { validateProfile, type UserProfile } from './profile'

export interface Evidence { title: string; publisher: string; version: string; url: string }
export interface NutritionTarget { bmrKcal: number; maintenanceKcal: number; targetKcal: number; proteinGrams: number; fatGrams: number; carbGrams: number; evidence: Evidence[]; warnings: string[] }

const activityFactors = { sedentary: 1.2, light: 1.375, moderate: 1.55, veryActive: 1.725 } as const
const goalFactors = { cut: { mild: 0.85, aggressive: 0.75 }, maintain: 1.0, bulk: 1.10 } as const
const proteinPerKg = { cut: 2.0, maintain: 1.6, bulk: 1.8 } as const
const FAT_SHARE = 0.25
const SAFETY_FLOOR_KCAL = { male: 1500, female: 1200 } as const

function goalFactor(profile: UserProfile): number {
  if (profile.goal === 'cut') return goalFactors.cut[profile.cutIntensity ?? 'mild']
  return goalFactors[profile.goal]
}

export function calculateNutritionTarget(input: UserProfile): NutritionTarget {
  const profile = validateProfile(input)
  const warnings = ['계산값은 시작점이며 질환·임신·섭식장애 위험이 있다면 전문가와 상의하세요.']
  const sexConstant = profile.calculationSex === 'male' ? 5 : -161
  const bmrKcal = Math.round(10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + sexConstant)
  const maintenanceKcal = Math.round(bmrKcal * activityFactors[profile.activityLevel])
  const computedKcal = Math.round(maintenanceKcal * goalFactor(profile))
  const floorKcal = SAFETY_FLOOR_KCAL[profile.calculationSex]
  const targetKcal = Math.max(computedKcal, floorKcal)
  if (targetKcal > computedKcal) warnings.push('계산된 목표가 너무 낮아 안전 최소값으로 조정했습니다. 전문가와 상의하세요.')
  const proteinGrams = Math.round(profile.weightKg * proteinPerKg[profile.goal])
  const fatGrams = Math.round((targetKcal * FAT_SHARE) / 9)
  const carbKcal = targetKcal - proteinGrams * 4 - fatGrams * 9
  if (carbKcal < 0) warnings.push('단백질과 지방 목표가 높아 탄수화물이 매우 낮게 계산되었습니다.')
  const carbGrams = Math.max(0, Math.round(carbKcal / 4))
  return {
    bmrKcal,
    maintenanceKcal,
    targetKcal,
    proteinGrams,
    fatGrams,
    carbGrams,
    warnings,
    evidence: [
      { title: 'Mifflin-St Jeor resting energy equation', publisher: 'American Journal of Clinical Nutrition', version: '1990', url: 'https://pubmed.ncbi.nlm.nih.gov/2305711/' },
      { title: 'Choosing a Safe and Successful Weight-loss Program', publisher: 'NIDDK', version: 'accessed 2026-08', url: 'https://www.niddk.nih.gov/health-information/weight-management/choosing-a-safe-successful-weight-loss-program' },
    ],
  }
}
