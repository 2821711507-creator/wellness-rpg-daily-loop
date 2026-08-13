import { Dumbbell, Footprints, House } from 'lucide-react'
import { estimateActivityCalories, type ActivityTemplate } from '../domain/activity'
import { ActivityEvidenceSheet } from './ActivityEvidenceSheet'

const icons = { gym: Dumbbell, home: House, walk: Footprints }
export function ActivityCard({ activity, weightKg, onComplete, onSwap }: { activity: ActivityTemplate; weightKg: number; onComplete: () => void; onSwap: () => void }) {
  const Icon = icons[activity.environment]
  const kcal = estimateActivityCalories(activity, weightKg)
  return <section className="panel activity-card"><header><div className="activity-icon"><Icon aria-hidden="true" /></div><div><p className="eyebrow">오늘의 운동</p><h2>{activity.title}</h2></div><strong className="card-badge">{activity.minutes}분 · 약 {kcal} kcal</strong></header><ul>{activity.movements.map(item => <li key={item}>{item}</li>)}</ul><p className="safety-note">{activity.safetyNote}</p><ActivityEvidenceSheet/><div className="actions"><button onClick={onComplete}>운동 완료</button><button className="secondary" onClick={onSwap}>다른 운동 선택</button></div></section>
}
