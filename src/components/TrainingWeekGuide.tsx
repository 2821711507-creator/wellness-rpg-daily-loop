import { CheckCircle2, CirclePause, HeartPulse, ShieldCheck } from 'lucide-react'
import type { TrainingDayGuidance, WeeklyTrainingGuidance } from '../domain/weeklyTrainingGuidance'

const STATE_LABELS = { skipped:'보충 없음', completed:'완료', planned:'계획', conditional:'컨디션 확인' } as const

function dateLabel(date:string) {
  const [year, month, day] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('ko-KR', { weekday:'short', month:'numeric', day:'numeric' }).format(new Date(year, month - 1, day))
}

function DayIcon({ day }:{ day:TrainingDayGuidance }) {
  if (day.state === 'completed') return <CheckCircle2 aria-hidden="true"/>
  if (day.kind === 'rest') return <CirclePause aria-hidden="true"/>
  return <HeartPulse aria-hidden="true"/>
}

export function TrainingWeekGuide({ guide }:{ guide:WeeklyTrainingGuidance }) {
  return <section className="training-guide" aria-labelledby="training-guide-title">
    <header className="training-guide-heading"><div><p className="eyebrow">이번 주 운동 가이드</p><h2 id="training-guide-title">{guide.title}</h2><p>{guide.focus}</p></div><span><ShieldCheck aria-hidden="true"/>회복 우선</span></header>
    <div className="training-guide-rules" aria-label="이번 주 원칙">{guide.rules.map(rule => <p key={rule}>{rule}</p>)}</div>
    <div className="training-guide-days">{guide.days.map(day => <article className={`training-guide-day ${day.state} ${day.kind}`} data-testid="training-guide-day" key={day.date}>
      <header><DayIcon day={day}/><div><small>{dateLabel(day.date)} · {STATE_LABELS[day.state]}</small><h3>{day.title}</h3></div></header>
      <p>{day.summary}</p>
      {day.duration && <strong>{day.duration}</strong>}
      {day.exercises.length > 0 && <ul>{day.exercises.map(exercise => <li key={exercise}>{exercise}</li>)}</ul>}
      {day.fallback && <p className="training-fallback">{day.fallback}</p>}
    </article>)}</div>
    <p className="training-safety"><ShieldCheck aria-hidden="true"/>{guide.safetyNote}</p>
  </section>
}
