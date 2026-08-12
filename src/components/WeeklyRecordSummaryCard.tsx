import type { WeeklyRecordSummary } from '../domain/records'

export function WeeklyRecordSummaryCard({ summary }: { summary:WeeklyRecordSummary }) {
  return <section className="record-card" aria-labelledby="summary-title"><p className="record-kicker">이번 주</p><h2 id="summary-title">루틴 요약</h2><div className="summary-grid"><div><strong>{summary.completionRate === null ? '—' : `${summary.completionRate}%`}</strong><span>계획 달성</span></div><div><strong>{summary.weightDays}/7</strong><span>체중 기록</span></div><div><strong>{summary.completedActivities}/{summary.plannedActivities}</strong><span>운동 완료</span></div><div><strong>{summary.xpEarned}</strong><span>획득 XP</span></div></div></section>
}
