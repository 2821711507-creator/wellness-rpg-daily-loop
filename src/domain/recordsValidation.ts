import type { CompletionEvent } from './records'
import type { WeightEntry } from './weight'

const weightWarning = '체중 기록을 복구하지 못해 체중 기록만 초기화했어요.'
const eventWarning = '완료 기록을 복구하지 못해 완료 기록만 초기화했어요.'
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const isDateKey = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)

export function parseWeightEntries(value: unknown, today: string): { entries:WeightEntry[]; warning?:string } {
  if (!Array.isArray(value)) return { entries:[], warning:weightWarning }
  const dates = new Set<string>()
  for (const item of value) {
    if (!isObject(item) || typeof item.id !== 'string' || !isDateKey(item.date) || item.date > today || typeof item.weightKg !== 'number' || item.weightKg < 20 || item.weightKg > 350 || typeof item.recordedAt !== 'string' || dates.has(item.date)) return { entries:[], warning:weightWarning }
    dates.add(item.date)
  }
  return { entries:(value as WeightEntry[]).slice().sort((a, b) => a.date.localeCompare(b.date)) }
}

export function parseCompletionEvents(value: unknown, today: string): { events:CompletionEvent[]; warning?:string } {
  if (!Array.isArray(value)) return { events:[], warning:eventWarning }
  const ids = new Set<string>()
  for (const item of value) {
    if (!isObject(item) || typeof item.id !== 'string' || ids.has(item.id) || !isDateKey(item.date) || item.date > today || !['planned-meal', 'planned-activity', 'recovery'].includes(String(item.kind)) || typeof item.xpEarned !== 'number' || item.xpEarned < 0 || (item.plannedItemId !== undefined && typeof item.plannedItemId !== 'string')) return { events:[], warning:eventWarning }
    ids.add(item.id)
  }
  return { events:(value as CompletionEvent[]).slice().sort((a, b) => a.date.localeCompare(b.date)) }
}
