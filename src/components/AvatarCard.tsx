import type { AvatarGender } from '../domain/avatar'

export function AvatarCard({ gender, level, xp, coins, onGenderChange }: { gender:AvatarGender; level:number; xp:number; coins:number; onGenderChange:(gender:AvatarGender)=>void }) {
  const legacyClass = gender === 'male' ? 'masculine' : 'feminine'
  return <section className="avatar-card"><div className={`pixel-hero ${legacyClass}`} aria-label={`${gender === 'male' ? '남성' : '여성'} 캐릭터`}><div className="hair"/><div className="head"/><div className="body"/><div className="legs"/></div><div className="avatar-copy"><p className="eyebrow">내 캐릭터</p><h2>레벨 {level}</h2><div className="xp-track"><i style={{ width:`${xp}%` }}/></div><p>{xp}/100 XP · {coins} 코인</p><div className="base-toggle"><button className={gender === 'male' ? 'active' : ''} onClick={() => onGenderChange('male')}>남성 캐릭터</button><button className={gender === 'female' ? 'active' : ''} onClick={() => onGenderChange('female')}>여성 캐릭터</button></div></div></section>
}
