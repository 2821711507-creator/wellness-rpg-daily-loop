import type { ActivityTemplate } from './activity'
import { getWeekDateKeys, normalizeWeeklyPlan, ORDERED_MEAL_SLOTS, type WeeklyPlan } from './weeklyPlan'

const invalidWarning = '주간 계획을 복구하지 못해 계획만 초기화했어요.'
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const isDateKey = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)

export function parseWeeklyPlan(value: unknown, templates: ActivityTemplate[]): { plan: WeeklyPlan | null; warning?: string } {
  if (!isObject(value) || typeof value.id !== 'string' || !isDateKey(value.weekStart) || !isObject(value.preferences)) return { plan: null, warning: invalidWarning }
  const preferences = value.preferences
  if (![2, 3, 4].includes(Number(preferences.mealsPerDay)) || ![2, 3, 4, 5].includes(Number(preferences.activitiesPerWeek))) return { plan: null, warning: invalidWarning }
  if (!Array.isArray(preferences.smoothieSlots) || !preferences.smoothieSlots.every(slot => ORDERED_MEAL_SLOTS.includes(slot))) return { plan: null, warning: invalidWarning }
  const activityMix = preferences.activityMix
  if (!isObject(activityMix) || !['gym', 'home', 'walk'].every(key => typeof activityMix[key] === 'number' && Number(activityMix[key]) >= 0)) return { plan: null, warning: invalidWarning }
  if (!Array.isArray(value.meals) || !Array.isArray(value.activities)) return { plan: null, warning: invalidWarning }
  const weekDates = getWeekDateKeys(value.weekStart)
  const mealKeys = new Set<string>()
  for (const meal of value.meals) {
    if (!isObject(meal) || typeof meal.id !== 'string' || !isDateKey(meal.date) || !weekDates.includes(meal.date) || typeof meal.slot !== 'string' || !ORDERED_MEAL_SLOTS.some(slot => slot === meal.slot) || !['smoothie', 'regular'].includes(String(meal.kind)) || typeof meal.completed !== 'boolean') return { plan: null, warning: invalidWarning }
    const key = `${meal.date}-${meal.slot}`
    if (mealKeys.has(key)) return { plan: null, warning: invalidWarning }
    mealKeys.add(key)
    if (meal.kind === 'smoothie' && (!Array.isArray(meal.smoothieItems) || !meal.smoothieItems.every(item => isObject(item) && typeof item.ingredientId === 'string' && typeof item.grams === 'number'))) return { plan: null, warning: invalidWarning }
  }
  const activityDates = new Set<string>()
  for (const activity of value.activities) {
    if (!isObject(activity) || typeof activity.id !== 'string' || !isDateKey(activity.date) || !weekDates.includes(activity.date) || typeof activity.templateId !== 'string' || typeof activity.completed !== 'boolean' || activityDates.has(activity.date)) return { plan: null, warning: invalidWarning }
    activityDates.add(activity.date)
  }
  return normalizeWeeklyPlan(value as unknown as WeeklyPlan, templates)
}
