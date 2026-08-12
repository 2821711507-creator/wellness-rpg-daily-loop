import { useState, type FormEvent } from 'react'
import { MEAL_SLOT_LABELS, ORDERED_MEAL_SLOTS, type MealSlot, type WeeklyPlanPreferences } from '../domain/weeklyPlan'

export function PlanPreferencesForm({ onGenerate }: { onGenerate: (preferences: WeeklyPlanPreferences) => void }) {
  const [mealsPerDay, setMealsPerDay] = useState<2 | 3 | 4>(3)
  const [smoothieSlots, setSmoothieSlots] = useState<MealSlot[]>([])
  const [activitiesPerWeek, setActivitiesPerWeek] = useState<2 | 3 | 4 | 5>(3)
  const [activityMix, setActivityMix] = useState({ gym: 1, home: 1, walk: 1 })
  const toggleSmoothie = (slot: MealSlot) => setSmoothieSlots(current => current.includes(slot) ? current.filter(item => item !== slot) : [...current, slot])
  const submit = (event: FormEvent) => {
    event.preventDefault()
    onGenerate({ mealsPerDay, smoothieSlots: ORDERED_MEAL_SLOTS.filter(slot => smoothieSlots.includes(slot)), activitiesPerWeek, activityMix })
  }
  return <form className="plan-preferences panel" onSubmit={submit}>
    <header><div><p className="eyebrow">7일 계획 설정</p><h2>내 생활에 맞는 한 주를 만들어요</h2></div></header>
    <fieldset><legend>하루 식사 횟수</legend><div className="choice-row">{([2, 3, 4] as const).map(count => <label key={count}><input type="radio" name="meal-count" checked={mealsPerDay === count} onChange={() => setMealsPerDay(count)}/>하루 {count}끼</label>)}</div></fieldset>
    <fieldset><legend>스무디로 먹을 끼니</legend><div className="choice-row">{ORDERED_MEAL_SLOTS.map(slot => <label key={slot}><input type="checkbox" checked={smoothieSlots.includes(slot)} onChange={() => toggleSmoothie(slot)}/>{MEAL_SLOT_LABELS[slot]}을 스무디로</label>)}</div></fieldset>
    <fieldset><legend>주간 운동 횟수</legend><div className="choice-row">{([2, 3, 4, 5] as const).map(count => <label key={count}><input type="radio" name="activity-count" checked={activitiesPerWeek === count} onChange={() => setActivitiesPerWeek(count)}/>주 {count}회</label>)}</div></fieldset>
    <fieldset><legend>운동 방식 비율</legend><div className="ratio-grid">{([['gym', '헬스장'], ['home', '집'], ['walk', '산보']] as const).map(([key, label]) => <label key={key}>{label} 비율<input aria-label={`${label} 비율`} type="number" min="0" max="10" value={activityMix[key]} onChange={event => setActivityMix(current => ({ ...current, [key]: Number(event.target.value) }))}/></label>)}</div></fieldset>
    <p className="form-note">비율에 맞춰 운동 날짜를 띄엄띄엄 배치해요. 나중에 날짜와 운동을 바꿀 수 있어요.</p>
    <button className="primary-button" type="submit">이번 주 계획 만들기</button>
  </form>
}
