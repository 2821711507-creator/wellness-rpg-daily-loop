import { AVATAR_DEFAULTS, AVATAR_PARTS } from '../data/avatarManifest'

export type AvatarGender = 'male'|'female'
export type AvatarSkin = 'light'|'medium'|'deep'
export type AvatarSlot = 'base'|'bottom'|'top'|'shoes'|'hairBack'|'hairFront'|'hat'|'accessory'
export type AvatarSelectionSlot = 'hair'|'top'|'bottom'|'shoes'|'hat'|'accessory'
export interface AvatarState { gender:AvatarGender; skin:AvatarSkin; unlockedIds:string[]; equipped:Partial<Record<AvatarSelectionSlot,string>> }
export interface AvatarPart { id:string; name:string; slot:AvatarSlot; selectionSlot:AvatarSelectionSlot|'base'; layerIds?:string[]; author:'project'; license:'project-owned' }

const REQUIRED: AvatarSelectionSlot[] = ['hair', 'top', 'bottom', 'shoes']
const LEGACY_IDS: Record<string,string> = { 'runner-top':'top-runner', 'starter-shoes':'shoes-trainers' }
const isRecord = (value:unknown): value is Record<string,unknown> => typeof value === 'object' && value !== null
const isGender = (value:unknown): value is AvatarGender => value === 'male' || value === 'female'
const isSkin = (value:unknown): value is AvatarSkin => value === 'light' || value === 'medium' || value === 'deep'
const partFor = (id:unknown) => typeof id === 'string' ? AVATAR_PARTS.find(part => part.id === (LEGACY_IDS[id] ?? id)) : undefined

export function normalizeAvatarState(value:unknown):AvatarState {
  if (!isRecord(value)) return { ...AVATAR_DEFAULTS, unlockedIds:[...AVATAR_DEFAULTS.unlockedIds], equipped:{ ...AVATAR_DEFAULTS.equipped } }
  const legacyGender = value.base === 'masculine' ? 'male' : value.base === 'feminine' ? 'female' : undefined
  const gender = isGender(value.gender) ? value.gender : legacyGender
  const skin = isSkin(value.skin) ? value.skin : value.skin === undefined && legacyGender ? AVATAR_DEFAULTS.skin : undefined
  if (!gender || !skin) return { ...AVATAR_DEFAULTS, unlockedIds:[...AVATAR_DEFAULTS.unlockedIds], equipped:{ ...AVATAR_DEFAULTS.equipped } }
  const rawEquipped = isRecord(value.equipped) ? value.equipped : {}
  const equipped: AvatarState['equipped'] = {}
  for (const slot of [...REQUIRED, 'hat', 'accessory'] as AvatarSelectionSlot[]) {
    const part = partFor(rawEquipped[slot])
    if (part?.selectionSlot === slot) equipped[slot] = part.id
    else if (REQUIRED.includes(slot)) equipped[slot] = AVATAR_DEFAULTS.equipped[slot]
  }
  const unlocked = Array.isArray(value.unlockedIds) ? value.unlockedIds.flatMap(id => partFor(id)?.id ?? []) : []
  return { gender, skin, unlockedIds:[...new Set([...AVATAR_DEFAULTS.unlockedIds, ...unlocked])], equipped }
}

export function selectGender(state:AvatarState, gender:AvatarGender):AvatarState { return { ...state, gender } }
export function selectSkin(state:AvatarState, skin:AvatarSkin):AvatarState { return { ...state, skin } }
export function equipItem(state:AvatarState, itemId:string):AvatarState {
  const part = AVATAR_PARTS.find(item => item.id === itemId)
  if (!part || part.selectionSlot === 'base' || !state.unlockedIds.includes(itemId)) throw new Error('아직 잠긴 아이템입니다.')
  return { ...state, equipped:{ ...state.equipped, [part.selectionSlot]:itemId } }
}

export function getAvatarLayerIds(state:AvatarState):string[] {
  const hair = partFor(state.equipped.hair)
  const layers: string[] = [...(hair?.layerIds?.slice(0, 1) ?? []), `base-${state.gender}`]
  for (const slot of ['bottom', 'top', 'shoes'] as AvatarSelectionSlot[]) {
    const part = partFor(state.equipped[slot])
    if (part) layers.push(...(part.layerIds ?? [part.id]))
  }
  if (hair) layers.push(...(hair.layerIds?.slice(1) ?? [hair.id]))
  for (const slot of ['hat', 'accessory'] as AvatarSelectionSlot[]) {
    const part = partFor(state.equipped[slot])
    if (part) layers.push(...(part.layerIds ?? [part.id]))
  }
  return layers
}
