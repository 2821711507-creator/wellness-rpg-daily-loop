export type ActivityEnvironment = 'gym' | 'home' | 'walk'
export type ActivityStyle = 'cardio' | 'strength' | 'flexibility' | 'hiit'
export interface ActivityMovement { label: string; guideId?: string }
export interface ActivityTemplate { id: string; environment: ActivityEnvironment; style: ActivityStyle; goalFit: ('cut'|'maintain'|'bulk')[]; metValue: number; title: string; minutes: number; intensity: 'easy'|'moderate'|'hard'; movements: ActivityMovement[]; equipment: string[]; safetyNote: string }

export function getAlternatives(activity: ActivityTemplate, all: ActivityTemplate[]) {
  return all.filter(item => item.id.endsWith('-basic') && item.id !== activity.id)
}

/** Standard MET formula: kcal = MET × weight(kg) × duration(hours). See
 * `ActivityEvidenceSheet` for the cited source of `metValue`. */
export function estimateActivityCalories(activity: ActivityTemplate, weightKg: number): number {
  return Math.round(activity.metValue * weightKg * (activity.minutes / 60))
}
