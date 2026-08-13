const EVIDENCE = [
  { title: 'Compendium of Physical Activities (2011 update)', publisher: 'Ainsworth et al., Medicine & Science in Sports & Exercise', url: 'https://pubmed.ncbi.nlm.nih.gov/21681120/' },
  { title: 'WHO 2020 Guidelines on Physical Activity and Sedentary Behaviour', publisher: 'World Health Organization', url: 'https://www.who.int/publications/i/item/9789240015128' },
]

export function ActivityEvidenceSheet() {
  return <details><summary>계산 근거 보기</summary><div className="equation">kcal = MET × 체중(kg) × (분/60)</div><p>MET(대사량 단위) 값은 운동 강도를 나타내는 국제 표준 지표예요.</p><ul>{EVIDENCE.map(item => <li key={item.url}><a href={item.url} target="_blank" rel="noreferrer">{item.title}</a> · {item.publisher}</li>)}</ul></details>
}
