export type ActivityEnvironment = 'gym' | 'home' | 'walk'
export type ActivityStyle = 'cardio' | 'strength' | 'flexibility' | 'hiit'
export interface ActivityMovement { label: string; guideId?: string }
export interface ActivityTemplate { id: string; environment: ActivityEnvironment; style: ActivityStyle; goalFit: ('cut'|'maintain'|'bulk')[]; metValue: number; title: string; minutes: number; intensity: 'easy'|'moderate'|'hard'; movements: ActivityMovement[]; equipment: string[]; safetyNote: string }

export function getAlternatives(activity: ActivityTemplate, all: ActivityTemplate[]) {
  return all.filter(item => item.id.endsWith('-basic') && item.id !== activity.id)
}

/** Filters `all` to one environment, preferring templates whose `goalFit`
 * includes `goal` (falls back to the full environment when nothing fits,
 * so this never throws away every candidate). When `beginnerFriendly` is
 * true, further narrows to templates needing at most 1 named equipment
 * item and not `hard` intensity -- unless that would empty the list, in
 * which case the goal-matched (or environment) pool is returned as-is.
 * Omitting `goal`/`beginnerFriendly` reproduces the exact previous
 * behavior: the first array entry for that environment (always
 * `${environment}-basic`, per the append-only ordering guarantee). */
export function getRotationCandidates(environment: ActivityEnvironment, all: ActivityTemplate[], goal?: 'cut'|'maintain'|'bulk', beginnerFriendly?: boolean): ActivityTemplate[] {
  const inEnvironment = all.filter(item => item.environment === environment)
  const goalMatches = goal ? inEnvironment.filter(item => item.goalFit.includes(goal)) : inEnvironment
  const pool = goalMatches.length > 0 ? goalMatches : inEnvironment
  if (!beginnerFriendly) return pool
  const simple = pool.filter(item => item.equipment.length <= 1 && item.intensity !== 'hard')
  return simple.length > 0 ? simple : pool
}

export function pickBestTemplate(environment: ActivityEnvironment, all: ActivityTemplate[], goal?: 'cut'|'maintain'|'bulk', beginnerFriendly?: boolean): ActivityTemplate {
  return getRotationCandidates(environment, all, goal, beginnerFriendly)[0]
}

/** Standard MET formula: kcal = MET × weight(kg) × duration(hours). See
 * `ActivityEvidenceSheet` for the cited source of `metValue`. */
export function estimateActivityCalories(activity: ActivityTemplate, weightKg: number): number {
  return Math.round(activity.metValue * weightKg * (activity.minutes / 60))
}
