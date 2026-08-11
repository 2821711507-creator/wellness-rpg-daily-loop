import type { CompletionDay } from '../domain/records'

export function CompletionCalendar({ days }: { days:CompletionDay[] }) {
  return <section className="record-card" aria-labelledby="calendar-title"><div className="record-section-head"><div><p className="record-kicker">작은 행동의 흔적</p><h2 id="calendar-title">최근 4주</h2></div><span className="calendar-legend">진하게 채울수록 완료</span></div><div className="completion-grid">{days.map(day => <div key={day.date} data-testid="completion-day" className={`completion-day ${day.status}`} title={`${day.date}: ${day.status === 'complete' ? '완료' : day.status === 'incomplete' ? '일부 완료' : '계획 없음'}`}><span>{Number(day.date.slice(-2))}</span><small>{day.status === 'complete' ? '완료' : day.status === 'incomplete' ? '일부' : '—'}</small></div>)}</div></section>
}
