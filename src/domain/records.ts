import { getWeekDateKeys, toLocalDateKey, type WeeklyPlan } from './weeklyPlan'
import type { WeightEntry } from './weight'

export interface CompletionEvent { id:string; date:string; kind:'planned-meal'|'planned-activity'|'recovery'; plannedItemId?:string; xpEarned:number }
export interface WeeklyRecordSummary { weekStart:string; plannedMeals:number; completedMeals:number; plannedActivities:number; completedActivities:number; completionRate:number|null; xpEarned:number; weightDays:number }
export interface CompletionDay { date:string; status:'none'|'incomplete'|'complete'; mealsCompleted:number; mealsPlanned:number; activityStatus:'none'|'incomplete'|'complete' }

export function appendCompletionEvent(events: CompletionEvent[], event: CompletionEvent): CompletionEvent[] {
  if (events.some(item => item.id === event.id)) return events
  return [...events, event].sort((a, b) => a.date.localeCompare(b.date))
}

export function calculateWeeklyRecordSummary(plan: WeeklyPlan | null, events: CompletionEvent[], weights: WeightEntry[], weekStart: string): WeeklyRecordSummary {
  const dates = new Set(getWeekDateKeys(weekStart))
  const meals = plan?.weekStart === weekStart ? plan.meals : []
  const activities = plan?.weekStart === weekStart ? plan.activities : []
  const total = meals.length + activities.length
  const completed = meals.filter(item => item.completed).length + activities.filter(item => item.completed).length
  return {
    weekStart,
    plannedMeals:meals.length,
    completedMeals:meals.filter(item => item.completed).length,
    plannedActivities:activities.length,
    completedActivities:activities.filter(item => item.completed).length,
    completionRate:total ? Math.round(completed / total * 100) : null,
    xpEarned:events.filter(item => dates.has(item.date)).reduce((sum, item) => sum + item.xpEarned, 0),
    weightDays:new Set(weights.filter(item => dates.has(item.date)).map(item => item.date)).size,
  }
}

function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount)
}

function parseDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function getFourWeekCompletionDays(plans: WeeklyPlan[], _events: CompletionEvent[], endDate: string): CompletionDay[] {
  const end = parseDate(endDate)
  return Array.from({ length:28 }, (_, index) => {
    const date = toLocalDateKey(addDays(end, index - 27))
    const plan = plans.find(item => getWeekDateKeys(item.weekStart).includes(date))
    if (!plan) return { date, status:'none' as const, mealsCompleted:0, mealsPlanned:0, activityStatus:'none' as const }
    const meals = plan.meals.filter(item => item.date === date)
    const activities = plan.activities.filter(item => item.date === date)
    const mealsCompleted = meals.filter(item => item.completed).length
    const activityStatus = activities.length === 0 ? 'none' as const : activities.every(item => item.completed) ? 'complete' as const : 'incomplete' as const
    const allCount = meals.length + activities.length
    const completeCount = mealsCompleted + activities.filter(item => item.completed).length
    return {
      date,
      status:allCount === 0 ? 'none' : completeCount === allCount ? 'complete' : 'incomplete',
      mealsCompleted,
      mealsPlanned:meals.length,
      activityStatus,
    }
  })
}
