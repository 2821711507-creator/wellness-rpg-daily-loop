import { toLocalDateKey } from './weeklyPlan'

export interface WeightEntry { id:string; date:string; weightKg:number; recordedAt:string }
export interface TrendPoint { date:string; weightKg:number|null; rollingAverageKg:number|null }
export type WeightMutationResult = { ok:true; entries:WeightEntry[] } | { ok:false; message:string }
export interface WeightTrendSummary { currentAverageKg:number|null; previousAverageKg:number|null; changeKg:number|null; recentRecordDays:number }

function parseDateKey(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return toLocalDateKey(date) === value ? date : null
}

function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount)
}

const roundOne = (value: number) => Math.round((value + Number.EPSILON) * 10) / 10
const average = (values: number[]) => values.length ? roundOne(values.reduce((sum, value) => sum + value, 0) / values.length) : null

export function upsertWeightEntry(entries: WeightEntry[], input: {date:string;weightKg:number;recordedAt:string}, today: string): WeightMutationResult {
  if (!Number.isFinite(input.weightKg) || input.weightKg < 20) return { ok:false, message:'체중은 20.0kg 이상 입력해 주세요.' }
  if (input.weightKg > 350) return { ok:false, message:'체중은 350.0kg 이하 입력해 주세요.' }
  if (!parseDateKey(input.date)) return { ok:false, message:'올바른 날짜를 입력해 주세요.' }
  if (input.date > today) return { ok:false, message:'미래 날짜의 체중은 기록할 수 없어요.' }
  const next: WeightEntry = { id:`weight-${input.date}`, date:input.date, weightKg:roundOne(input.weightKg), recordedAt:input.recordedAt }
  return { ok:true, entries:[...entries.filter(item => item.date !== input.date), next].sort((a, b) => a.date.localeCompare(b.date)) }
}

export function deleteWeightEntry(entries: WeightEntry[], date: string): WeightEntry[] {
  return entries.filter(item => item.date !== date)
}

export function calculateWeightTrend(entries: WeightEntry[], endDate: string, days = 28): TrendPoint[] {
  const end = parseDateKey(endDate)
  if (!end) return []
  const byDate = new Map(entries.map(item => [item.date, item.weightKg]))
  return Array.from({ length: days }, (_, index) => {
    const dateValue = addDays(end, index - days + 1)
    const date = toLocalDateKey(dateValue)
    const windowStart = toLocalDateKey(addDays(dateValue, -6))
    const windowWeights = entries.filter(item => item.date >= windowStart && item.date <= date).map(item => item.weightKg)
    return { date, weightKg:byDate.get(date) ?? null, rollingAverageKg:windowWeights.length >= 4 ? average(windowWeights) : null }
  })
}

export function summarizeWeightTrend(points: TrendPoint[]): WeightTrendSummary {
  if (!points.length) return { currentAverageKg:null, previousAverageKg:null, changeKg:null, recentRecordDays:0 }
  const current = points.slice(-7).flatMap(point => point.weightKg === null ? [] : [point.weightKg])
  const previous = points.slice(-14, -7).flatMap(point => point.weightKg === null ? [] : [point.weightKg])
  const currentAverageKg = current.length >= 4 ? average(current) : null
  const previousAverageKg = previous.length >= 4 ? average(previous) : null
  return {
    currentAverageKg,
    previousAverageKg,
    changeKg:currentAverageKg !== null && previousAverageKg !== null ? roundOne(currentAverageKg - previousAverageKg) : null,
    recentRecordDays:current.length,
  }
}
