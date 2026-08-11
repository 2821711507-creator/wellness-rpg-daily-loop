import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ChevronRight, ScrollText } from 'lucide-react'
import { AvatarCustomizer } from './components/AvatarCustomizer'
import { Onboarding } from './components/Onboarding'
import { RecordsScreen } from './components/RecordsScreen'
import { TodayScreen } from './components/TodayScreen'
import { WeeklyPlanScreen } from './components/WeeklyPlanScreen'
import { toLocalDateKey } from './domain/weeklyPlan'
import { useWellnessGame } from './hooks/useWellnessGame'

type View = 'today'|'plan'|'records'|'avatar'

export function App({ now = () => new Date() }: { now?: () => Date }) {
  const game = useWellnessGame({ now })
  const [view, setView] = useState<View>('today')
  const customizeButtonRef = useRef<HTMLButtonElement>(null)
  const restoreCustomizeFocus = useRef(false)
  useEffect(() => {
    if (view === 'today' && restoreCustomizeFocus.current) {
      customizeButtonRef.current?.focus()
      restoreCustomizeFocus.current = false
    }
  }, [view])
  const closeAvatar = () => { restoreCustomizeFocus.current = true; setView('today') }

  if (!game.state.profile) return <Onboarding onComplete={game.onboard}/>
  if (view === 'today') return <><TodayScreen state={game.state} setSmoothie={game.setSmoothie} setActivity={game.setActivity} complete={game.complete} onOpenPlan={() => setView('plan')} onOpenRecords={() => setView('records')} onOpenAvatar={() => setView('avatar')} customizeButtonRef={customizeButtonRef} now={now}/>{game.warning && <p role="status">{game.warning}</p>}</>
  if (view === 'avatar') return <div className="app-shell"><header className="topbar"><div className="brand-mark">W</div><div><p className="eyebrow">나만의 모험가</p><h1>캐릭터 꾸미기</h1></div></header><AvatarCustomizer state={game.state.avatar} onGenderChange={game.setAvatarGender} onSkinChange={game.setAvatarSkin} onEquip={game.equipAvatarItem} onClose={closeAvatar}/></div>

  const records = view === 'records'
  return <div className="app-shell">
    <header className="topbar"><div className="brand-mark">W</div><div><p className="eyebrow">{records ? '나의 변화 기록' : '나의 7일 루틴'}</p><h1>{records ? '기록' : '계획'}</h1></div></header>
    {records
      ? <RecordsScreen today={toLocalDateKey(now())} entries={game.state.weightEntries ?? []} plan={game.state.weeklyPlan ?? null} events={game.state.completionEvents ?? []} onSaveWeight={game.saveWeight} onDeleteWeight={game.deleteWeight}/>
      : <WeeklyPlanScreen plan={game.state.weeklyPlan ?? null} smoothieItems={game.state.smoothie} onGenerate={game.generatePlan} onMoveMeal={game.moveMeal} onMoveActivity={game.moveActivity} onReplaceActivity={game.replaceActivity} onRegenerate={game.clearPlan}/>}
    {!records && game.mutationMessage && <p className="global-plan-message" role="status">{game.mutationMessage}</p>}{game.warning && <p role="status">{game.warning}</p>}
    <nav className="bottom-nav" aria-label="주요 메뉴"><button aria-label="오늘" onClick={() => setView('today')}><span>●</span>오늘</button><button className={!records ? 'active' : ''} aria-current={!records ? 'page' : undefined} onClick={() => setView('plan')}><CalendarDays/>계획</button><button className={records ? 'active' : ''} aria-current={records ? 'page' : undefined} onClick={() => setView('records')}><ScrollText/>기록</button><button><ChevronRight/>더보기</button></nav>
  </div>
}
