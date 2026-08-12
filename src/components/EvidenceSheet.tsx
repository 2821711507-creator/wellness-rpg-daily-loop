import type { NutritionTarget } from '../domain/nutrition'

export function EvidenceSheet({ target }: { target: NutritionTarget }) {
  return <details><summary>계산 근거 보기</summary><div className="equation">BMR = 10W + 6.25H − 5A + S</div><p>W 체중(kg) · H 키(cm) · A 나이 · S 계산용 성별 상수</p><ul>{target.evidence.map(item => <li key={item.url}><a href={item.url} target="_blank" rel="noreferrer">{item.title}</a> · {item.publisher}</li>)}</ul></details>
}
