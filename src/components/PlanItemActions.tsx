import { useEffect, useRef, useState } from 'react'
import { activityTemplates } from '../data/activityTemplates'
import { getWeekDateKeys, type PlanMutationResult, type WeeklyPlan } from '../domain/weeklyPlan'

type ActionState = { kind: 'move-meal' | 'move-activity' | 'replace'; itemId: string } | null

export function PlanItemActions({ kind, itemId, plan, onMoveMeal, onMoveActivity, onReplaceActivity }: {
  kind: 'meal' | 'activity'; itemId: string; plan: WeeklyPlan
  onMoveMeal: (id: string, date: string) => PlanMutationResult
  onMoveActivity: (id: string, date: string) => PlanMutationResult
  onReplaceActivity: (id: string, templateId: string) => PlanMutationResult
}) {
  const [action, setAction] = useState<ActionState>(null)
  const [target, setTarget] = useState(plan.weekStart)
  const [message, setMessage] = useState('')
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const close = () => { setAction(null); setMessage(''); queueMicrotask(() => triggerRef.current?.focus()) }
  useEffect(() => {
    if (!action) return
    closeButtonRef.current?.focus()
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [action])
  const open = (next: NonNullable<ActionState>, event: React.MouseEvent<HTMLButtonElement>) => {
    triggerRef.current = event.currentTarget
    setTarget(plan.weekStart)
    setMessage('')
    setAction(next)
  }
  const apply = () => {
    if (!action) return
    const result = action.kind === 'move-meal' ? onMoveMeal(itemId, target) : action.kind === 'move-activity' ? onMoveActivity(itemId, target) : onReplaceActivity(itemId, target)
    if (!result.ok) setMessage(result.message)
    else close()
  }
  return <div className="plan-item-actions"><button onClick={event => open({ kind: kind === 'meal' ? 'move-meal' : 'move-activity', itemId }, event)}>다른 날로 이동</button>{kind === 'activity' && <button onClick={event => open({ kind: 'replace', itemId }, event)}>운동 교체</button>}{action && <div className="dialog-backdrop"><section className="plan-dialog" role="dialog" aria-modal="true" aria-label={action.kind === 'replace' ? '운동 대안 선택' : '계획 날짜 이동'}><header><h2>{action.kind === 'replace' ? '다른 운동 고르기' : '다른 날짜로 옮기기'}</h2><button ref={closeButtonRef} aria-label="닫기" onClick={close}>×</button></header>{action.kind === 'replace' ? <fieldset><legend>가능한 운동</legend>{activityTemplates.filter(template => template.id.endsWith('-basic') && template.id !== plan.activities.find(item => item.id === itemId)?.templateId).map(template => <label className="alternative-option" key={template.id}><input type="radio" name={`replacement-${itemId}`} value={template.id} checked={target === template.id} onChange={() => setTarget(template.id)}/><span>{template.title} · {template.minutes}분 · {template.intensity === 'easy' ? '가볍게' : '보통 강도'}</span></label>)}</fieldset> : <label>이동할 날짜<select aria-label="이동할 날짜" value={target} onChange={event => setTarget(event.target.value)}>{getWeekDateKeys(plan.weekStart).map(date => <option value={date} key={date}>{date}</option>)}</select></label>}{message && <p role="alert" className="dialog-error">{message}</p>}<div className="dialog-actions"><button className="secondary-button" onClick={close}>취소</button><button className="primary-button" onClick={apply}>{action.kind === 'replace' ? '이 운동으로 교체' : '이동하기'}</button></div></section></div>}</div>
}
