import { CheckCircle2, Circle, Dumbbell, GlassWater, Utensils } from 'lucide-react'
import { activityTemplates } from '../data/activityTemplates'
import { MEAL_SLOT_LABELS, type PlanMutationResult, type WeeklyPlan } from '../domain/weeklyPlan'
import { PlanItemActions } from './PlanItemActions'

export function DayPlanCard({ date, plan, onMoveMeal, onMoveActivity, onReplaceActivity }: { date: string; plan: WeeklyPlan; onMoveMeal:(id:string,date:string)=>PlanMutationResult; onMoveActivity:(id:string,date:string)=>PlanMutationResult; onReplaceActivity:(id:string,templateId:string)=>PlanMutationResult }) {
  const dateValue = new Date(...(date.split('-').map(Number) as [number, number, number]))
  dateValue.setMonth(dateValue.getMonth() - 1)
  const label = new Intl.DateTimeFormat('ko-KR', { weekday: 'short', month: 'numeric', day: 'numeric' }).format(dateValue)
  const meals = plan.meals.filter(item => item.date === date)
  const activities = plan.activities.filter(item => item.date === date)
  return <article className="day-plan" data-testid="day-plan"><header><p>{label}</p><span>{meals.length + activities.length}개</span></header><div className="day-items">{meals.map(meal => <section className={`plan-item ${meal.completed ? 'completed' : ''}`} key={meal.id}><div className="plan-item-title">{meal.completed ? <CheckCircle2/> : <Circle/>}<span><small>{MEAL_SLOT_LABELS[meal.slot]}</small><strong>{meal.kind === 'smoothie' ? <><GlassWater/>스무디</> : <><Utensils/>일반식</>}</strong></span></div><PlanItemActions kind="meal" itemId={meal.id} plan={plan} onMoveMeal={onMoveMeal} onMoveActivity={onMoveActivity} onReplaceActivity={onReplaceActivity}/></section>)}{activities.map(activity => { const template = activityTemplates.find(item => item.id === activity.templateId); return <section className={`plan-item activity ${activity.completed ? 'completed' : ''}`} key={activity.id}><div className="plan-item-title">{activity.completed ? <CheckCircle2/> : <Dumbbell/>}<span><small>운동</small><strong>{template ? `${template.title} · ${template.minutes}분` : '운동 정보 없음'}</strong></span></div><PlanItemActions kind="activity" itemId={activity.id} plan={plan} onMoveMeal={onMoveMeal} onMoveActivity={onMoveActivity} onReplaceActivity={onReplaceActivity}/></section>})}</div></article>
}
