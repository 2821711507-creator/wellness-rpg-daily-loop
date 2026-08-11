import type { TrendPoint, WeightTrendSummary } from '../domain/weight'

const W = 680, H = 220, PAD = 24

function pathFor(points: TrendPoint[], key: 'weightKg'|'rollingAverageKg', min: number, range: number) {
  let started = false
  return points.flatMap((point, index) => {
    if (point[key] === null) return []
    const command = started ? 'L' : 'M'
    started = true
    return [`${command} ${PAD + index * (W - PAD * 2) / (points.length - 1)} ${PAD + (maxSafe(min + range - Number(point[key]), 0) / range) * (H - PAD * 2)}`]
  }).join(' ')
}
const maxSafe = (value:number, minimum:number) => Math.max(value, minimum)

export function WeightTrendChart({ points, summary }: { points:TrendPoint[]; summary:WeightTrendSummary }) {
  const values = points.flatMap(point => [point.weightKg, point.rollingAverageKg]).filter((value): value is number => value !== null)
  const min = values.length ? Math.min(...values) - .4 : 0
  const range = values.length ? Math.max(Math.max(...values) + .4 - min, 1) : 1
  const change = summary.changeKg
  return <section className="record-card trend-card" aria-labelledby="trend-title">
    <header className="record-section-head"><div><p className="record-kicker">가장 중요한 변화</p><h2 id="trend-title">체중 추세</h2></div><div className="average-stat"><span>최근 7일 평균</span><strong>{summary.currentAverageKg === null ? '—' : `${summary.currentAverageKg.toFixed(1)}kg`}</strong><small>{change === null ? '비교할 기록을 더 모으는 중' : `직전 7일보다 ${change > 0 ? '+' : ''}${change.toFixed(1)}kg`}</small></div></header>
    {values.length ? <svg className="weight-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="최근 28일 체중과 7일 평균 추세">
      <line x1={PAD} y1={H-PAD} x2={W-PAD} y2={H-PAD} className="chart-axis"/>
      <path d={pathFor(points, 'weightKg', min, range)} className="raw-line" data-testid="raw-line"/>
      <path d={pathFor(points, 'rollingAverageKg', min, range)} className="average-line" data-testid="average-line"/>
    </svg> : <div className="chart-empty" role="img" aria-label="최근 28일 체중과 7일 평균 추세">첫 기록을 저장하면 추세가 여기에 나타나요.</div>}
    <div className="chart-legend"><span className="raw-key">매일 체중</span><span className="average-key">7일 평균</span></div>
    <details className="chart-table"><summary>차트 데이터 표로 보기</summary><div className="table-scroll"><table><thead><tr><th>날짜</th><th>체중</th><th>7일 평균</th></tr></thead><tbody>{points.map(point => <tr key={point.date}><td>{point.date}</td><td>{point.weightKg === null ? '—' : `${point.weightKg.toFixed(1)}kg`}</td><td>{point.rollingAverageKg === null ? '—' : `${point.rollingAverageKg.toFixed(1)}kg`}</td></tr>)}</tbody></table></div></details>
  </section>
}
