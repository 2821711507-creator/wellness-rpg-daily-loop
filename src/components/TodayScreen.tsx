import { CalendarDays, ChevronRight, LockKeyhole, Map, ScrollText, ShieldCheck, UserRound } from 'lucide-react'
import { useRef, useState, type FormEvent, type Ref } from 'react'
import { activityTemplates } from '../data/activityTemplates'
import type { WellnessState } from '../hooks/useWellnessGame'
import type { SmoothieItem } from '../domain/smoothie'
import type { AuthResult } from '../auth/authTypes'
import { ActivityCard } from './ActivityCard'
import { CharacterBadge } from './CharacterBadge'
import { EvidenceSheet } from './EvidenceSheet'
import { QuestBoard } from './QuestBoard'
import { SmoothieCard } from './SmoothieCard'
import { formatKoreanDate, getMonday, toLocalDateKey } from '../domain/weeklyPlan'

const PASSWORD_MISMATCH = '비밀번호가 일치하지 않아요.'
const NARRATIVE_ONLY_IDS = ['mixed-hiit-completed', 'recovery-cardio', 'gym-upper', 'gym-lower-core', 'light-cardio-conditional']

export interface TodayAccount {
  username:string
  onChangePassword:(password:string)=>Promise<AuthResult<void>>
  onLogout:()=>Promise<void>
  error?:string|null
  clearError?:()=>void
}

function AccountMenu({ account }: { account:TodayAccount }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'menu'|'password'>('menu')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState<string|null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)

  const close = () => {
    setOpen(false); setMode('menu'); setPassword(''); setConfirmPassword(''); setLocalError(null)
    account.clearError?.()
    toggleRef.current?.focus()
  }
  const toggle = () => { if (open) close(); else setOpen(true) }

  const submitPassword = async (event:FormEvent) => {
    event.preventDefault()
    if (password !== confirmPassword) { setLocalError(PASSWORD_MISMATCH); return }
    setLocalError(null)
    setIsSubmitting(true)
    const result = await account.onChangePassword(password)
    setIsSubmitting(false)
    if (result.ok) close()
  }

  const logout = async () => { await account.onLogout() }

  const error = localError ?? account.error

  return <div className="account-menu">
    <button ref={toggleRef} type="button" className="profile-button" aria-label="프로필" aria-haspopup="menu" aria-expanded={open} onClick={toggle}><UserRound/></button>
    {open && <div role="menu" className="account-menu-panel">
      {mode === 'menu' && <>
        <p className="account-menu-username">{account.username}</p>
        <button type="button" role="menuitem" onClick={() => setMode('password')}>비밀번호 변경</button>
        <button type="button" role="menuitem" onClick={logout}>로그아웃</button>
      </>}
      {mode === 'password' && <form onSubmit={submitPassword}>
        <label>새 비밀번호<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" required/></label>
        <label>새 비밀번호 확인<input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" required/></label>
        <button type="submit" disabled={isSubmitting}>비밀번호 변경</button>
      </form>}
      {error && <p className="auth-error" role="alert">{error}</p>}
    </div>}
  </div>
}

export function TodayScreen({ state, setSmoothie, setActivity, complete, onOpenPlan, onOpenRecords, onOpenAvatar, onOpenMore, customizeButtonRef, now = () => new Date(), account }: { state: WellnessState; setSmoothie:(v:SmoothieItem[])=>void; setActivity:(id:string)=>void; complete:(id:string)=>void; onOpenPlan:()=>void; onOpenRecords:()=>void; onOpenAvatar:()=>void; onOpenMore:()=>void; customizeButtonRef?:Ref<HTMLButtonElement>; now?:()=>Date; account?:TodayAccount }) {
  const today = now()
  const todayKey = toLocalDateKey(today)
  const currentWeekStart = toLocalDateKey(getMonday(today))
  const plannedActivity = state.weeklyPlan?.weekStart === currentWeekStart ? state.weeklyPlan.activities.find(item => item.date === todayKey) : undefined
  const activity = activityTemplates.find(item => item.id === (plannedActivity?.templateId ?? state.selectedActivityId))!
  // `mixed-hiit-completed`/`recovery-cardio`/`gym-upper`/`gym-lower-core`/`light-cardio-conditional`
  // were written as narrative steps in one specific hardcoded week's guidance (see
  // weeklyTrainingGuidance.ts) -- their movements/titles assume that surrounding context
  // ("회복 상태 확인" then "괜찮으면") and read as vague/confusing as a standalone swap option.
  const rotationCandidates = activityTemplates.filter(item => item.environment === activity.environment && !NARRATIVE_ONLY_IDS.includes(item.id))
  const next = () => setActivity(rotationCandidates[(rotationCandidates.indexOf(activity) + 1) % rotationCandidates.length].id)
  const done = state.game.quests.filter(q => q.completed).length
  return <div className="app-shell"><header className="topbar"><div className="brand-mark">W</div><div><p className="eyebrow">{formatKoreanDate(today)}</p><h1>오늘</h1></div>{account ? <AccountMenu account={account}/> : <button className="profile-button" aria-label="프로필"><UserRound /></button>}</header><main className="dashboard"><section className="hero"><CharacterBadge level={state.game.level} xp={state.game.xp} coins={state.game.coins} onCustomize={onOpenAvatar} customizeButtonRef={customizeButtonRef}/><div className="hero-message"><p>{done === state.game.quests.length ? '오늘 할 일을 모두 마쳤어요' : `${state.game.quests.length - done}개의 할 일이 남았어요`}</p><strong>완료할 때마다 캐릭터 보상이 쌓여요.</strong></div></section>{state.nutritionTarget && <section className="target-strip"><div><ShieldCheck/><span><b>오늘의 기준</b><small>유지 {state.nutritionTarget.maintenanceKcal} · 목표 {state.nutritionTarget.targetKcal} kcal · 단백질 {state.nutritionTarget.proteinGrams}g · 지방 {state.nutritionTarget.fatGrams}g · 탄수화물 {state.nutritionTarget.carbGrams}g</small></span></div><EvidenceSheet target={state.nutritionTarget}/></section>}<QuestBoard quests={state.game.quests} onComplete={complete}/><div className="content-grid"><SmoothieCard items={state.smoothie} onChange={setSmoothie}/><ActivityCard activity={activity} weightKg={state.profile!.weightKg} onComplete={() => complete('activity')} onSwap={next}/></div><section className="locked-preview"><h2>이어서 사용하기</h2><button onClick={onOpenPlan}><CalendarDays/> 주간 계획</button><button onClick={onOpenRecords}><ScrollText/> 기록</button><button disabled><Map/> 친구 <LockKeyhole/></button></section></main><nav className="bottom-nav" aria-label="주요 메뉴"><button className="active" aria-current="page"><span>●</span>오늘</button><button onClick={onOpenPlan}><CalendarDays/>계획</button><button onClick={onOpenRecords}><ScrollText/>기록</button><button disabled><Map/>친구</button><button onClick={onOpenMore}><ChevronRight/>더보기</button></nav></div>
}
