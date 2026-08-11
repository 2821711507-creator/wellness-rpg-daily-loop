import { useEffect, useState, type FormEvent } from 'react'
import type { WeightEntry, WeightMutationResult } from '../domain/weight'

export function WeightEntryForm({ today, entry, onSave, onDelete }: { today:string; entry?:WeightEntry; onSave:(weightKg:number)=>WeightMutationResult; onDelete:(date:string)=>void }) {
  const [value, setValue] = useState(entry ? String(entry.weightKg) : '')
  const [message, setMessage] = useState('')
  const [confirming, setConfirming] = useState(false)
  useEffect(() => setValue(entry ? String(entry.weightKg) : ''), [entry])
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const result = onSave(Number(value))
    setMessage(result.ok ? '오늘 체중을 저장했어요.' : result.message)
  }
  const remove = () => {
    onDelete(today)
    setConfirming(false)
    setMessage('오늘 체중 기록을 삭제했어요.')
  }
  return <section className="record-card weight-entry-card" aria-labelledby="weight-entry-title">
    <div><p className="record-kicker">오늘의 체크인</p><h2 id="weight-entry-title">체중 기록</h2><p className="record-muted">하루 숫자보다 같은 조건에서 쌓인 평균을 봐요.</p></div>
    <form onSubmit={submit} className="weight-entry-form">
      <label htmlFor="today-weight">오늘 체중</label>
      <div className="weight-input-wrap"><input id="today-weight" type="number" inputMode="decimal" min="20" max="350" step="0.1" required value={value} onChange={event => setValue(event.target.value)}/><span>kg</span></div>
      <button type="submit" className="record-primary">체중 저장</button>
    </form>
    {entry && <div className="delete-row">{confirming ? <><span>정말 지울까요?</span><button type="button" className="record-text-button danger-text" onClick={remove}>삭제 확인</button><button type="button" className="record-text-button" onClick={() => setConfirming(false)}>취소</button></> : <button type="button" className="record-text-button" onClick={() => setConfirming(true)}>오늘 체중 삭제</button>}</div>}
    {message && <p className="record-message" role={message.includes('저장했') || message.includes('삭제했') ? 'status' : 'alert'}>{message}</p>}
  </section>
}
