import type { Ref } from 'react'

/** Compact stand-in for the old `AvatarCard` hero on the Today screen -- no
 * avatar portrait, just level/XP/coins and the entry point into character
 * customization (still fully available, just not shown here). */
export function CharacterBadge({ level, xp, coins, onCustomize, customizeButtonRef }: { level:number; xp:number; coins:number; onCustomize:()=>void; customizeButtonRef?:Ref<HTMLButtonElement> }) {
  return <section className="character-badge">
    <div className="character-badge-copy">
      <p className="eyebrow">레벨 {level}</p>
      <div className="xp-track" aria-label={`${xp}/100 XP`}><i style={{ width:`${xp}%` }}/></div>
      <p>{xp}/100 XP · {coins} 코인</p>
    </div>
    <button ref={customizeButtonRef} className="avatar-customize-trigger" onClick={onCustomize}>캐릭터 꾸미기</button>
  </section>
}
