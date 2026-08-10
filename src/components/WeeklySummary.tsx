import { CheckCircle2, Dumbbell, GlassWater, Utensils } from 'lucide-react'
import { calculateWeeklySummary, type WeeklyPlan } from '../domain/weeklyPlan'
import { activityTemplates } from '../data/activityTemplates'

export function WeeklySummary({ plan, onRegenerate }: { plan: WeeklyPlan; onRegenerate: () => void }) {
  const summary = calculateWeeklySummary(plan, activityTemplates)
  return <section className="weekly-summary" aria-labelledby="weekly-summary-title"><div className="summary-heading"><div><p className="eyebrow">이번 주 한눈에</p><h2 id="weekly-summary-title">가볍게 이어가는 7일</h2></div><button className="secondary-button" onClick={onRegenerate}>계획 다시 만들기</button></div><div className="summary-stats"><span><Utensils/>식사 {summary.plannedMeals}</span><span><GlassWater/>스무디 {summary.smoothieMeals}</span><span><Dumbbell/>운동 {summary.plannedActivities}</span><span><CheckCircle2/>완료 {summary.completedItems}/{summary.totalItems}</span></div><p className="summary-mix">헬스장 {summary.activityCounts.gym} · 집 {summary.activityCounts.home} · 산보 {summary.activityCounts.walk}</p></section>
}
