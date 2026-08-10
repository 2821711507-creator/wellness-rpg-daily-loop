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

export type PlanGenerationResult =
  | { ok: true; plan: WeeklyPlan }
  | { ok: false; message: string }

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

const MEAL_SLOTS_BY_COUNT: Record<WeeklyPlanPreferences['mealsPerDay'], MealSlot[]> = {
  2: ['breakfast', 'dinner'],
  3: ['breakfast', 'lunch', 'dinner'],
  4: ['breakfast', 'lunch', 'dinner', 'snack'],
}
const ACTIVITY_DAY_PRIORITY = [0, 2, 4, 5, 1]
const ENVIRONMENT_ORDER: ActivityEnvironment[] = ['gym', 'home', 'walk']

function allocateActivityEnvironments(preferences: WeeklyPlanPreferences): ActivityEnvironment[] | null {
  const totalWeight = ENVIRONMENT_ORDER.reduce((sum, environment) => sum + preferences.activityMix[environment], 0)
  if (totalWeight <= 0) return null
  const allocations = ENVIRONMENT_ORDER.map((environment, order) => {
    const exact = preferences.activityMix[environment] / totalWeight * preferences.activitiesPerWeek
    return { environment, order, count: Math.floor(exact), remainder: exact - Math.floor(exact) }
  })
  let remaining = preferences.activitiesPerWeek - allocations.reduce((sum, item) => sum + item.count, 0)
  for (const item of [...allocations].sort((a, b) => b.remainder - a.remainder || a.order - b.order)) {
    if (remaining === 0) break
    item.count += 1
    remaining -= 1
  }
  return allocations.flatMap(item => Array.from({ length: item.count }, () => item.environment))
}

export function generateWeeklyPlan(input: GenerateWeeklyPlanInput): PlanGenerationResult {
  const environments = allocateActivityEnvironments(input.preferences)
  if (!environments) return { ok: false, message: '운동 방식 비율을 하나 이상 선택해 주세요.' }

  const dates = getWeekDateKeys(input.weekStart)
  const planId = `week-${input.weekStart}`
  const slots = MEAL_SLOTS_BY_COUNT[input.preferences.mealsPerDay]
  const meals = dates.flatMap(date => slots.map(slot => {
    const kind = input.preferences.smoothieSlots.includes(slot) ? 'smoothie' as const : 'regular' as const
    return {
      id: `${planId}-meal-${date}-${slot}`,
      date,
      slot,
      kind,
      ...(kind === 'smoothie' ? { smoothieItems: input.smoothieItems.map(item => ({ ...item })) } : {}),
      completed: false,
    }
  }))
  const activities = environments.map((environment, index) => {
    const template = input.activityTemplates.find(item => item.environment === environment)
    if (!template) throw new Error(`${environment} 운동 템플릿이 없습니다.`)
    const date = dates[ACTIVITY_DAY_PRIORITY[index]]
    return {
      id: `${planId}-activity-${date}-${index}`,
      date,
      templateId: template.id,
      completed: false,
    }
  })
  return {
    ok: true,
    plan: {
      id: planId,
      weekStart: input.weekStart,
      preferences: {
        ...input.preferences,
        smoothieSlots: [...input.preferences.smoothieSlots],
        activityMix: { ...input.preferences.activityMix },
      },
      meals,
      activities,
    },
  }
}
