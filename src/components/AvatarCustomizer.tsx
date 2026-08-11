import { useEffect } from 'react'
import { ArrowLeft, LockKeyhole } from 'lucide-react'
import { AVATAR_PARTS } from '../data/avatarManifest'
import type { AvatarGender, AvatarSelectionSlot, AvatarSkin, AvatarState } from '../domain/avatar'
import { AvatarRenderer } from './AvatarRenderer'

const GENDERS:{ id:AvatarGender; name:string }[] = [{ id:'male', name:'남성 캐릭터' }, { id:'female', name:'여성 캐릭터' }]
const SKINS:{ id:AvatarSkin; name:string }[] = [{ id:'light', name:'밝은 피부' }, { id:'medium', name:'중간 피부' }, { id:'deep', name:'짙은 피부' }]
const GROUPS:{ slot:AvatarSelectionSlot; name:string }[] = [{ slot:'hair', name:'머리' }, { slot:'top', name:'상의' }, { slot:'bottom', name:'하의' }, { slot:'shoes', name:'신발' }, { slot:'hat', name:'모자' }, { slot:'accessory', name:'액세서리' }]
const OPTIONAL_SLOTS:AvatarSelectionSlot[] = ['top', 'bottom', 'shoes', 'hat', 'accessory']

export function AvatarCustomizer({ state, gameLevel:_gameLevel, onGenderChange, onSkinChange, onEquip, onUnequip, onClose }: { state:AvatarState; gameLevel:number; onGenderChange:(gender:AvatarGender)=>void; onSkinChange:(skin:AvatarSkin)=>void; onEquip:(itemId:string)=>void; onUnequip:(slot:AvatarSelectionSlot)=>void; onClose:()=>void }) {
  useEffect(() => {
    const closeOnEscape = (event:KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])
  const isLocked = (itemId:string) => !state.unlockedIds.includes(itemId)
  const upcomingRewards = AVATAR_PARTS
    .filter(part => part.selectionSlot !== 'base' && part.unlockLevel !== undefined && isLocked(part.id))
    .sort((left, right) => (left.unlockLevel ?? 1) - (right.unlockLevel ?? 1) || left.id.localeCompare(right.id))
    .filter((part, index, parts) => parts.findIndex(other => other.id === part.id && other.unlockLevel === part.unlockLevel) === index)
    .slice(0, 3)
  return <main className="avatar-studio">
    <section className="avatar-preview-panel"><p className="record-kicker">현재 모습</p><h2>나만의 모험가</h2><div className="avatar-stage"><AvatarRenderer state={state}/></div><p className="avatar-preview-note">체중과 관계없이 원하는 모습을 자유롭게 선택할 수 있어요.</p></section>
    <section className="avatar-controls" aria-label="캐릭터 외형 선택">
      <button className="avatar-back" onClick={onClose}><ArrowLeft/>오늘로 돌아가기</button>
      <fieldset><legend>캐릭터 성별</legend><div className="avatar-choice-grid">{GENDERS.map(item => <button key={item.id} aria-pressed={state.gender === item.id} onClick={() => onGenderChange(item.id)}>{item.name}</button>)}</div></fieldset>
      <fieldset><legend>피부색</legend><div className="avatar-choice-grid avatar-skin-grid">{SKINS.map(item => <button key={item.id} aria-pressed={state.skin === item.id} onClick={() => onSkinChange(item.id)}><span className={`skin-swatch ${item.id}`}/>{item.name}</button>)}</div></fieldset>
      {GROUPS.map(group => {
        const choices = AVATAR_PARTS.filter(part => part.selectionSlot === group.slot)
        const optional = OPTIONAL_SLOTS.includes(group.slot)
        return <fieldset key={group.slot}><legend>{group.name}</legend><div className="avatar-choice-grid">{optional && <button className="avatar-empty-choice" aria-pressed={!state.equipped[group.slot]} onClick={() => onUnequip(group.slot)}>{group.name} 없음</button>}{choices.map(item => isLocked(item.id)
          ? <button key={item.id} className="avatar-locked-choice" disabled><LockKeyhole aria-hidden="true"/><span>{item.name}</span><small>{item.unlockLevel === undefined ? '아직 해금되지 않음' : `레벨 ${item.unlockLevel}에 해금`}</small></button>
          : <button key={item.id} aria-pressed={state.equipped[group.slot] === item.id} onClick={() => onEquip(item.id)}>{item.name}</button>)}</div></fieldset>
      })}
      {upcomingRewards.length > 0 && <aside className="avatar-reward-preview" aria-labelledby="avatar-reward-heading"><h3 id="avatar-reward-heading"><LockKeyhole aria-hidden="true"/>다음 보상</h3><ol>{upcomingRewards.map(item => <li key={item.id}><span>{item.name}</span><small>레벨 {item.unlockLevel}</small></li>)}</ol></aside>}
    </section>
  </main>
}
