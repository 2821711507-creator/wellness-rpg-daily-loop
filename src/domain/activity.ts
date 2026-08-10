export type ActivityEnvironment = 'gym' | 'home' | 'walk'
export interface ActivityTemplate { id: string; environment: ActivityEnvironment; title: string; minutes: number; intensity: 'easy'|'moderate'; movements: string[]; equipment: string[]; safetyNote: string }
export function getAlternatives(activity: ActivityTemplate, all: ActivityTemplate[]) { return all.filter(item => item.id !== activity.id) }
