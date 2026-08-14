export type ActivityEnvironment = 'gym' | 'home' | 'walk'
export type ActivityStyle = 'cardio' | 'strength' | 'flexibility' | 'hiit'
export interface ActivityMovement { label: string; guideId?: string }
export interface ActivityTemplate { id: string; environment: ActivityEnvironment; style: ActivityStyle; goalFit: ('cut'|'maintain'|'bulk')[]; metValue: number; title: string; minutes: number; intensity: 'easy'|'moderate'|'hard'; movements: ActivityMovement[]; equipment: string[]; safetyNote: string }

export function getAlternatives(activity: ActivityTemplate, all: ActivityTemplate[]) {
  return all.filter(item => item.id.endsWith('-basic') && item.id !== activity.id)
}

/** Filters `all` to one environment, preferring templates whose `goalFit`
 * includes `goal` (falls back to the full environment when nothing fits,
 * so this never throws away every candidate). Omitting `beginnerFriendly`
 * (or passing `true`) reproduces the exact previous behavior: the plain
 * goal-matched (or environment) pool, whose first array entry is always
 * `${environment}-basic` -- already equipment-light and non-`hard`, per
 * the append-only ordering guarantee from an earlier feature. Only when
 * `beginnerFriendly` is explicitly `false` (an experienced user) does this
 * narrow toward a *more* advanced option: templates that are `hard`
 * intensity or need more than 1 named equipment item -- unless that would
 * empty the list, in which case the plain pool is returned as-is. */
export function getRotationCandidates(environment: ActivityEnvironment, all: ActivityTemplate[], goal?: 'cut'|'maintain'|'bulk', beginnerFriendly?: boolean): ActivityTemplate[] {
  const inEnvironment = all.filter(item => item.environment === environment)
  const goalMatches = goal ? inEnvironment.filter(item => item.goalFit.includes(goal)) : inEnvironment
  const pool = goalMatches.length > 0 ? goalMatches : inEnvironment
  if (beginnerFriendly !== false) return pool
  const advanced = pool.filter(item => item.intensity === 'hard' || item.equipment.length > 1)
  return advanced.length > 0 ? advanced : pool
}

export function pickBestTemplate(environment: ActivityEnvironment, all: ActivityTemplate[], goal?: 'cut'|'maintain'|'bulk', beginnerFriendly?: boolean): ActivityTemplate {
  return getRotationCandidates(environment, all, goal, beginnerFriendly)[0]
}

/** Standard MET formula: kcal = MET × weight(kg) × duration(hours). See
 * `ActivityEvidenceSheet` for the cited source of `metValue`. */
export function estimateActivityCalories(activity: ActivityTemplate, weightKg: number): number {
  return Math.round(activity.metValue * weightKg * (activity.minutes / 60))
}
