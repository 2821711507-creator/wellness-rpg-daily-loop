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

export type PlanMutationResult = PlanGenerationResult

export interface WeeklySummary {
  plannedMeals: number
  smoothieMeals: number
  plannedActivities: number
  activityCounts: Record<ActivityEnvironment, number>
  completedItems: number
  totalItems: number
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

export function formatKoreanDate(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
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

function includesDate(plan: WeeklyPlan, date: string): boolean {
  return getWeekDateKeys(plan.weekStart).includes(date)
}

export function movePlannedMeal(plan: WeeklyPlan, mealId: string, targetDate: string): PlanMutationResult {
  const meal = plan.meals.find(item => item.id === mealId)
  if (!meal) return { ok: false, message: '이동할 식사를 찾지 못했어요.' }
  if (!includesDate(plan, targetDate)) return { ok: false, message: '이번 주 안의 날짜를 선택해 주세요.' }
  if (plan.meals.some(item => item.id !== mealId && item.date === targetDate && item.slot === meal.slot)) {
    return { ok: false, message: '선택한 날짜에 같은 끼니가 이미 있어요.' }
  }
  return { ok: true, plan: { ...plan, meals: plan.meals.map(item => item.id === mealId ? { ...item, date: targetDate } : item) } }
}

export function movePlannedActivity(plan: WeeklyPlan, activityId: string, targetDate: string): PlanMutationResult {
  if (!plan.activities.some(item => item.id === activityId)) return { ok: false, message: '이동할 운동을 찾지 못했어요.' }
  if (!includesDate(plan, targetDate)) return { ok: false, message: '이번 주 안의 날짜를 선택해 주세요.' }
  if (plan.activities.some(item => item.id !== activityId && item.date === targetDate)) {
    return { ok: false, message: '선택한 날짜에 운동이 이미 있어요.' }
  }
  return { ok: true, plan: { ...plan, activities: plan.activities.map(item => item.id === activityId ? { ...item, date: targetDate } : item) } }
}

export function replacePlannedActivity(plan: WeeklyPlan, activityId: string, replacementTemplateId: string, templates: ActivityTemplate[]): PlanMutationResult {
  if (!plan.activities.some(item => item.id === activityId)) return { ok: false, message: '교체할 운동을 찾지 못했어요.' }
  if (!templates.some(item => item.id === replacementTemplateId)) return { ok: false, message: '선택한 대안 운동을 찾지 못했어요.' }
  return { ok: true, plan: { ...plan, activities: plan.activities.map(item => item.id === activityId ? { ...item, templateId: replacementTemplateId } : item) } }
}

export function setPlannedItemCompleted(plan: WeeklyPlan, itemId: string, completed: boolean): WeeklyPlan {
  return {
    ...plan,
    meals: plan.meals.map(item => item.id === itemId ? { ...item, completed } : item),
    activities: plan.activities.map(item => item.id === itemId ? { ...item, completed } : item),
  }
}

export function normalizeWeeklyPlan(plan: WeeklyPlan, templates: ActivityTemplate[]): { plan: WeeklyPlan; warning?: string } {
  const knownIds = new Set(templates.map(item => item.id))
  const hasUnknown = plan.activities.some(item => !knownIds.has(item.templateId))
  if (!hasUnknown) return { plan }
  return {
    plan: { ...plan, activities: plan.activities.map(item => knownIds.has(item.templateId) ? item : { ...item, templateId: 'walk-basic' }) },
    warning: '찾을 수 없는 운동을 기본 산보로 바꿨어요.',
  }
}

export function calculateWeeklySummary(plan: WeeklyPlan, templates: ActivityTemplate[]): WeeklySummary {
  const activityCounts: Record<ActivityEnvironment, number> = { gym: 0, home: 0, walk: 0 }
  for (const activity of plan.activities) {
    const environment = templates.find(item => item.id === activity.templateId)?.environment
    if (environment) activityCounts[environment] += 1
  }
  return {
    plannedMeals: plan.meals.length,
    smoothieMeals: plan.meals.filter(item => item.kind === 'smoothie').length,
    plannedActivities: plan.activities.length,
    activityCounts,
    completedItems: [...plan.meals, ...plan.activities].filter(item => item.completed).length,
    totalItems: plan.meals.length + plan.activities.length,
  }
}
