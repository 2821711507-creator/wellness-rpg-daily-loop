import type { Ref } from 'react'
import type { AvatarState } from '../domain/avatar'
import { AvatarRenderer } from './AvatarRenderer'

export function AvatarCard({ state, level, xp, coins, onCustomize, customizeButtonRef }: { state:AvatarState; level:number; xp:number; coins:number; onCustomize:()=>void; customizeButtonRef?:Ref<HTMLButtonElement> }) {
  return <section className="avatar-card"><AvatarRenderer state={state}/><div className="avatar-copy"><p className="eyebrow">내 캐릭터</p><h2>레벨 {level}</h2><div className="xp-track" aria-label={`${xp}/100 XP`}><i style={{ width:`${xp}%` }}/></div><p>{xp}/100 XP · {coins} 코인</p><button ref={customizeButtonRef} className="avatar-customize-trigger" onClick={onCustomize}>캐릭터 꾸미기</button></div></section>
}
