import type { SmoothieItem } from '../domain/smoothie'
import type { PlanMutationResult, WeeklyPlan, WeeklyPlanPreferences } from '../domain/weeklyPlan'
import { PlanPreferencesForm } from './PlanPreferencesForm'
import { WeekBoard } from './WeekBoard'
import { WeeklySummary } from './WeeklySummary'

export function WeeklyPlanScreen({ plan, onGenerate, onMoveMeal, onMoveActivity, onReplaceActivity, onRegenerate }: { plan: WeeklyPlan | null; smoothieItems: SmoothieItem[]; onGenerate:(preferences:WeeklyPlanPreferences)=>void; onMoveMeal:(id:string,date:string)=>PlanMutationResult; onMoveActivity:(id:string,date:string)=>PlanMutationResult; onReplaceActivity:(id:string,templateId:string)=>PlanMutationResult; onRegenerate:()=>void }) {
  return <main className="weekly-plan-screen">{plan ? <><WeeklySummary plan={plan} onRegenerate={onRegenerate}/><WeekBoard plan={plan} onMoveMeal={onMoveMeal} onMoveActivity={onMoveActivity} onReplaceActivity={onReplaceActivity}/></> : <PlanPreferencesForm onGenerate={onGenerate}/>}</main>
}
