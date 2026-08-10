import { CalendarDays, ChevronRight, LockKeyhole, Map, ScrollText, ShieldCheck, UserRound } from 'lucide-react'
import { activityTemplates } from '../data/activityTemplates'
import type { WellnessState } from '../hooks/useWellnessGame'
import type { SmoothieItem } from '../domain/smoothie'
import type { AvatarBase } from '../domain/avatar'
import { ActivityCard } from './ActivityCard'
import { AvatarCard } from './AvatarCard'
import { EvidenceSheet } from './EvidenceSheet'
import { QuestBoard } from './QuestBoard'
import { SmoothieCard } from './SmoothieCard'

export function TodayScreen({ state, setSmoothie, setActivity, complete, setBase }: { state: WellnessState; setSmoothie:(v:SmoothieItem[])=>void; setActivity:(id:string)=>void; complete:(id:string)=>void; setBase:(b:AvatarBase)=>void }) {
  const activity = activityTemplates.find(item => item.id === state.selectedActivityId)!
  const next = () => setActivity(activityTemplates[(activityTemplates.indexOf(activity) + 1) % activityTemplates.length].id)
  const done = state.game.quests.filter(q => q.completed).length
  return <div className="app-shell"><header className="topbar"><div className="brand-mark">W</div><div><p className="eyebrow">2026년 8월 10일</p><h1>오늘</h1></div><button className="profile-button" aria-label="프로필"><UserRound /></button></header><main className="dashboard"><section className="hero"><AvatarCard base={state.avatar.base} level={state.game.level} xp={state.game.xp} coins={state.game.coins} onBaseChange={setBase}/><div className="hero-message"><p>{done === state.game.quests.length ? '오늘 할 일을 모두 마쳤어요' : `${state.game.quests.length - done}개의 할 일이 남았어요`}</p><strong>완료할 때마다 캐릭터 보상이 쌓여요.</strong></div></section><QuestBoard quests={state.game.quests} onComplete={complete}/><div className="content-grid"><SmoothieCard items={state.smoothie} onChange={setSmoothie}/><ActivityCard activity={activity} onComplete={() => complete('activity')} onSwap={next}/></div>{state.nutritionTarget && <section className="target-strip"><div><ShieldCheck/><span><b>오늘의 기준</b><small>유지 {state.nutritionTarget.maintenanceKcal} · 목표 {state.nutritionTarget.targetKcal} kcal · 단백질 {state.nutritionTarget.proteinGrams}g</small></span></div><EvidenceSheet target={state.nutritionTarget}/></section>}<section className="locked-preview"><h2>곧 추가될 기능</h2><button disabled><CalendarDays/> 주간 계획 <LockKeyhole/></button><button disabled><ScrollText/> 기록 <LockKeyhole/></button><button disabled><Map/> 친구 <LockKeyhole/></button></section></main><nav className="bottom-nav" aria-label="주요 메뉴"><button className="active"><span>●</span>오늘</button><button disabled><CalendarDays/>계획</button><button disabled><ScrollText/>기록</button><button disabled><Map/>친구</button><button><ChevronRight/>더보기</button></nav></div>
}
