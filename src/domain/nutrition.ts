import { validateProfile, type UserProfile } from './profile'

export interface Evidence { title: string; publisher: string; version: string; url: string }
export interface NutritionTarget { bmrKcal: number; maintenanceKcal: number; targetKcal: number; proteinGrams: number; evidence: Evidence[]; warnings: string[] }

const factors = { sedentary: 1.2, light: 1.375, moderate: 1.55 } as const

export function calculateNutritionTarget(input: UserProfile): NutritionTarget {
  const profile = validateProfile(input)
  const sexConstant = profile.calculationSex === 'male' ? 5 : -161
  const bmrKcal = Math.round(10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + sexConstant)
  const maintenanceKcal = Math.round(bmrKcal * factors[profile.activityLevel])
  return {
    bmrKcal,
    maintenanceKcal,
    targetKcal: Math.round(maintenanceKcal * 0.85),
    proteinGrams: Math.round(profile.weightKg * 1.6),
    warnings: ['계산값은 시작점이며 질환·임신·섭식장애 위험이 있다면 전문가와 상의하세요.'],
    evidence: [
      { title: 'Mifflin-St Jeor resting energy equation', publisher: 'American Journal of Clinical Nutrition', version: '1990', url: 'https://pubmed.ncbi.nlm.nih.gov/2305711/' },
      { title: 'Choosing a Safe and Successful Weight-loss Program', publisher: 'NIDDK', version: 'accessed 2026-08', url: 'https://www.niddk.nih.gov/health-information/weight-management/choosing-a-safe-successful-weight-loss-program' },
    ],
  }
}
