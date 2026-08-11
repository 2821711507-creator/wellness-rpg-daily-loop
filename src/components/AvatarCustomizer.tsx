import { useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { AVATAR_PARTS } from '../data/avatarManifest'
import type { AvatarGender, AvatarSelectionSlot, AvatarSkin, AvatarState } from '../domain/avatar'
import { AvatarRenderer } from './AvatarRenderer'

const GENDERS:{ id:AvatarGender; name:string }[] = [{ id:'male', name:'남성 캐릭터' }, { id:'female', name:'여성 캐릭터' }]
const SKINS:{ id:AvatarSkin; name:string }[] = [{ id:'light', name:'밝은 피부' }, { id:'medium', name:'중간 피부' }, { id:'deep', name:'짙은 피부' }]
const GROUPS:{ slot:AvatarSelectionSlot; name:string }[] = [{ slot:'hair', name:'머리' }, { slot:'top', name:'상의' }, { slot:'bottom', name:'하의' }, { slot:'shoes', name:'신발' }]

export function AvatarCustomizer({ state, onGenderChange, onSkinChange, onEquip, onClose }: { state:AvatarState; onGenderChange:(gender:AvatarGender)=>void; onSkinChange:(skin:AvatarSkin)=>void; onEquip:(itemId:string)=>void; onClose:()=>void }) {
  useEffect(() => {
    const closeOnEscape = (event:KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])
  return <main className="avatar-studio">
    <section className="avatar-preview-panel"><p className="record-kicker">현재 모습</p><h2>나만의 모험가</h2><div className="avatar-stage"><AvatarRenderer state={state}/></div><p className="avatar-preview-note">체중과 관계없이 원하는 모습을 자유롭게 선택할 수 있어요.</p></section>
    <section className="avatar-controls" aria-label="캐릭터 외형 선택">
      <button className="avatar-back" onClick={onClose}><ArrowLeft/>오늘로 돌아가기</button>
      <fieldset><legend>캐릭터 성별</legend><div className="avatar-choice-grid">{GENDERS.map(item => <button key={item.id} aria-pressed={state.gender === item.id} onClick={() => onGenderChange(item.id)}>{item.name}</button>)}</div></fieldset>
      <fieldset><legend>피부색</legend><div className="avatar-choice-grid avatar-skin-grid">{SKINS.map(item => <button key={item.id} aria-pressed={state.skin === item.id} onClick={() => onSkinChange(item.id)}><span className={`skin-swatch ${item.id}`}/>{item.name}</button>)}</div></fieldset>
      {GROUPS.map(group => {
        const choices = AVATAR_PARTS.filter(part => part.selectionSlot === group.slot && state.unlockedIds.includes(part.id))
        return <fieldset key={group.slot}><legend>{group.name}</legend><div className="avatar-choice-grid">{choices.map(item => <button key={item.id} aria-pressed={state.equipped[group.slot] === item.id} onClick={() => onEquip(item.id)}>{item.name}</button>)}</div></fieldset>
      })}
    </section>
  </main>
}
