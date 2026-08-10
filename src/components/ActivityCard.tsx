import { Dumbbell, Footprints, House } from 'lucide-react'
import type { ActivityTemplate } from '../domain/activity'

const icons = { gym: Dumbbell, home: House, walk: Footprints }
export function ActivityCard({ activity, onComplete, onSwap }: { activity: ActivityTemplate; onComplete: () => void; onSwap: () => void }) {
  const Icon = icons[activity.environment]
  return <section className="panel activity-card"><header><div className="activity-icon"><Icon aria-hidden="true" /></div><div><p className="eyebrow">오늘의 운동</p><h2>{activity.title}</h2></div><strong>{activity.minutes}분</strong></header><ul>{activity.movements.map(item => <li key={item}>{item}</li>)}</ul><p className="safety-note">{activity.safetyNote}</p><div className="actions"><button onClick={onComplete}>운동 완료</button><button className="secondary" onClick={onSwap}>다른 운동 선택</button></div></section>
}
