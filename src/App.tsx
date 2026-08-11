import { useState } from 'react'
import { CalendarDays, ChevronRight, ScrollText } from 'lucide-react'
import { Onboarding } from './components/Onboarding'
import { TodayScreen } from './components/TodayScreen'
import { WeeklyPlanScreen } from './components/WeeklyPlanScreen'
import { useWellnessGame } from './hooks/useWellnessGame'

export function App({ now = () => new Date() }: { now?: () => Date }) {
  const game = useWellnessGame({ now })
  const [view, setView] = useState<'today' | 'plan'>('today')
  if (!game.state.profile) return <Onboarding onComplete={game.onboard}/>
  if (view === 'today') return <><TodayScreen state={game.state} setSmoothie={game.setSmoothie} setActivity={game.setActivity} complete={game.complete} setBase={game.setBase} onOpenPlan={() => setView('plan')} now={now}/>{game.warning && <p role="status">{game.warning}</p>}</>
  return <div className="app-shell"><header className="topbar"><div className="brand-mark">W</div><div><p className="eyebrow">나의 7일 루틴</p><h1>계획</h1></div></header><WeeklyPlanScreen plan={game.state.weeklyPlan ?? null} smoothieItems={game.state.smoothie} onGenerate={game.generatePlan} onMoveMeal={game.moveMeal} onMoveActivity={game.moveActivity} onReplaceActivity={game.replaceActivity} onRegenerate={game.clearPlan}/>{game.mutationMessage && <p className="global-plan-message" role="status">{game.mutationMessage}</p>}{game.warning && <p role="status">{game.warning}</p>}<nav className="bottom-nav" aria-label="주요 메뉴"><button aria-label="오늘" onClick={() => setView('today')}><span>●</span>오늘</button><button className="active" aria-current="page"><CalendarDays/>계획</button><button disabled><ScrollText/>기록</button><button><ChevronRight/>더보기</button></nav></div>
}
