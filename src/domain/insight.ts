import type { Evidence } from './nutrition'
import type { WeeklyRecordSummary } from './records'
import type { WeightTrendSummary } from './weight'

export interface WeeklyInsight { status:'insufficient-data'|'ready'; observations:string[]; interpretation:string|null; suggestions:string[]; evidenceIds:string[] }
export interface InsightInput { current:WeeklyRecordSummary; previous:WeeklyRecordSummary|null; trend:WeightTrendSummary; currentWeightKg:number|null; previousChangeKg:number|null }

export const INSIGHT_EVIDENCE: (Evidence & { id:string })[] = [
  { id:'cdc-gradual-loss', title:'Steps for Losing Weight', publisher:'CDC', version:'2025-01-17', url:'https://www.cdc.gov/healthy-weight-growth/losing-weight/index.html' },
  { id:'niddk-adult-safety', title:'About the Body Weight Planner', publisher:'NIDDK', version:'2017-05', url:'https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner' },
  { id:'daily-self-weighing', title:'Daily Self-Weighing and Adverse Psychological Outcomes', publisher:'American Journal of Preventive Medicine', version:'2014', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC4157390/' },
]

const formatAbsolute = (value: number) => Math.abs(value).toFixed(1)

export function generateWeeklyInsight(input: InsightInput): WeeklyInsight {
  const evidenceIds = INSIGHT_EVIDENCE.map(item => item.id)
  if (input.trend.recentRecordDays < 4 || input.trend.currentAverageKg === null) {
    return {
      status:'insufficient-data',
      observations:[`최근 7일 중 ${input.trend.recentRecordDays}일의 체중을 기록했어요. 분석하려면 최소 4일의 기록이 필요해요.`],
      interpretation:null,
      suggestions:['가능하면 비슷한 시간과 조건에서 체중을 기록해 보세요.'],
      evidenceIds,
    }
  }
  const observations = [`이번 주 체중 기록은 ${input.trend.recentRecordDays}일이에요.`, `계획 달성률은 ${input.current.completionRate === null ? '계획 없음' : `${input.current.completionRate}%`}이에요.`]
  const change = input.trend.changeKg
  let interpretation: string | null = null
  if (change !== null) {
    if (Math.abs(change) < 0.2) interpretation = '평균 체중이 비슷하게 유지됐어요.'
    else if (change < 0) interpretation = `7일 평균 체중이 지난 기간보다 ${formatAbsolute(change)}kg 낮아졌어요.`
    else interpretation = `7일 평균 체중이 지난 기간보다 ${formatAbsolute(change)}kg 높아졌어요.`
  }
  if (change !== null && input.previousChangeKg !== null && input.currentWeightKg !== null) {
    const fastThreshold = Math.max(input.currentWeightKg * 0.01, 0.907)
    if (change < -fastThreshold && input.previousChangeKg < -fastThreshold) observations.push('빠른 변화가 이어지면 의료 전문가와 상의해 주세요.')
  }
  const suggestions: string[] = []
  if (input.current.completionRate !== null && input.current.completionRate < 50) suggestions.push('다음 주 계획을 한 단계 가볍게 조정해 보세요.')
  else if (input.current.completionRate !== null && input.current.completionRate >= 80) suggestions.push('현재 루틴을 한 주 더 유지해 보세요.')
  else suggestions.push('이번 주에 가장 수월했던 행동을 다음 주에도 이어가 보세요.')
  if (input.trend.recentRecordDays < 7) suggestions.push('가능한 날에는 비슷한 조건으로 체중을 기록해 보세요.')
  return { status:'ready', observations, interpretation, suggestions:suggestions.slice(0, 2), evidenceIds }
}
