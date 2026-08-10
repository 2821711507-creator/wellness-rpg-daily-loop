import { getWeekDateKeys, type PlanMutationResult, type WeeklyPlan } from '../domain/weeklyPlan'
import { DayPlanCard } from './DayPlanCard'

export function WeekBoard({ plan, onMoveMeal, onMoveActivity, onReplaceActivity }: { plan: WeeklyPlan; onMoveMeal:(id:string,date:string)=>PlanMutationResult; onMoveActivity:(id:string,date:string)=>PlanMutationResult; onReplaceActivity:(id:string,templateId:string)=>PlanMutationResult }) {
  return <section className="week-board" aria-label="월요일부터 일요일까지 주간 계획">{getWeekDateKeys(plan.weekStart).map(date => <DayPlanCard key={date} date={date} plan={plan} onMoveMeal={onMoveMeal} onMoveActivity={onMoveActivity} onReplaceActivity={onReplaceActivity}/>)}</section>
}
