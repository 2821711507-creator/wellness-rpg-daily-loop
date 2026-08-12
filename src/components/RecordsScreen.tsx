import { calculateWeightTrend, summarizeWeightTrend, type WeightEntry, type WeightMutationResult } from '../domain/weight'
import { calculateWeeklyRecordSummary, getFourWeekCompletionDays, type CompletionEvent } from '../domain/records'
import { generateWeeklyInsight } from '../domain/insight'
import { getMonday, toLocalDateKey, type WeeklyPlan } from '../domain/weeklyPlan'
import { WeightEntryForm } from './WeightEntryForm'
import { WeightTrendChart } from './WeightTrendChart'
import { CompletionCalendar } from './CompletionCalendar'
import { WeeklyRecordSummaryCard } from './WeeklyRecordSummaryCard'
import { WeeklyInsightCard } from './WeeklyInsightCard'

function parseLocal(value:string) { const [y,m,d] = value.split('-').map(Number); return new Date(y,m-1,d) }

export function RecordsScreen({ today, entries, plan, events, onSaveWeight, onDeleteWeight }: { today:string; entries:WeightEntry[]; plan:WeeklyPlan|null; events:CompletionEvent[]; onSaveWeight:(weightKg:number)=>WeightMutationResult; onDeleteWeight:(date:string)=>void }) {
  const trend = calculateWeightTrend(entries, today)
  const trendSummary = summarizeWeightTrend(trend)
  const weekStart = toLocalDateKey(getMonday(parseLocal(today)))
  const weeklySummary = calculateWeeklyRecordSummary(plan, events, entries, weekStart)
  const currentWeight = entries.filter(item => item.date <= today).at(-1)?.weightKg ?? null
  const insight = generateWeeklyInsight({ current:weeklySummary, previous:null, trend:trendSummary, currentWeightKg:currentWeight, previousChangeKg:null })
  return <main className="records-dashboard"><div className="records-primary"><WeightEntryForm today={today} entry={entries.find(item => item.date === today)} onSave={onSaveWeight} onDelete={onDeleteWeight}/><WeightTrendChart points={trend} summary={trendSummary}/><CompletionCalendar days={getFourWeekCompletionDays(plan ? [plan] : [], events, today)}/></div><aside className="records-aside"><WeeklyRecordSummaryCard summary={weeklySummary}/><WeeklyInsightCard insight={insight}/></aside></main>
}
