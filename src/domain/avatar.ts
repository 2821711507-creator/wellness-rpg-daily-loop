export type AvatarBase = 'masculine'|'feminine'
export type AvatarSlot = 'base'|'bottom'|'top'|'shoes'|'hair'|'hat'|'accessory'
export interface AvatarState { base: AvatarBase; unlockedIds: string[]; equipped: Partial<Record<AvatarSlot, string>> }
const slots: Record<string, AvatarSlot> = { 'runner-top': 'top', 'starter-shoes': 'shoes' }
export function selectBase(state: AvatarState, base: AvatarBase): AvatarState { return { ...state, base } }
export function equipItem(state: AvatarState, itemId: string): AvatarState { if (!state.unlockedIds.includes(itemId)) throw new Error('아직 잠긴 아이템입니다.'); return { ...state, equipped: { ...state.equipped, [slots[itemId]]: itemId } } }
