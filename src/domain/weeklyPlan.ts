import type { ActivityEnvironment, ActivityTemplate } from './activity'
import type { SmoothieItem } from './smoothie'

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface WeeklyPlanPreferences {
  mealsPerDay: 2 | 3 | 4
  smoothieSlots: MealSlot[]
  activitiesPerWeek: 2 | 3 | 4 | 5
  activityMix: Record<ActivityEnvironment, number>
}

export interface PlannedMeal {
  id: string
  date: string
  slot: MealSlot
  kind: 'smoothie' | 'regular'
  smoothieItems?: SmoothieItem[]
  completed: boolean
}

export interface PlannedActivity {
  id: string
  date: string
  templateId: string
  completed: boolean
}

export interface WeeklyPlan {
  id: string
  weekStart: string
  preferences: WeeklyPlanPreferences
  meals: PlannedMeal[]
  activities: PlannedActivity[]
}

export interface GenerateWeeklyPlanInput {
  weekStart: string
  preferences: WeeklyPlanPreferences
  smoothieItems: SmoothieItem[]
  activityTemplates: ActivityTemplate[]
}

export const ORDERED_MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack']
export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: '아침', lunch: '점심', dinner: '저녁', snack: '간식',
}

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getMonday(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const offset = (result.getDay() + 6) % 7
  result.setDate(result.getDate() - offset)
  return result
}

function parseLocalDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function getWeekDateKeys(weekStart: string): string[] {
  const start = parseLocalDateKey(weekStart)
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
    return toLocalDateKey(date)
  })
}
