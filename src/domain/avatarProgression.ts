import { AVATAR_PARTS } from '../data/avatarManifest'
import type { AvatarState } from './avatar'

export interface AvatarUnlockResult { state:AvatarState; newIds:string[] }

export function grantAvatarUnlocks(state:AvatarState, previousLevel:number, currentLevel:number):AvatarUnlockResult {
  const newIds = AVATAR_PARTS
    .filter(part => part.unlockLevel !== undefined && part.unlockLevel > previousLevel && part.unlockLevel <= currentLevel)
    .sort((a, b) => (a.unlockLevel! - b.unlockLevel!) || a.id.localeCompare(b.id))
    .map(part => part.id)
    .filter(id => !state.unlockedIds.includes(id))
  return {
    state:{ ...state, unlockedIds:[...state.unlockedIds, ...newIds] },
    newIds,
  }
}
