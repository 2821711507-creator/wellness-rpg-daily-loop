import { useEffect, useState } from 'react'
import { calculateNutritionTarget, type NutritionTarget } from '../domain/nutrition'
import type { UserProfile } from '../domain/profile'
import type { SmoothieItem } from '../domain/smoothie'
import { completeQuest, type GameState } from '../domain/game'
import { selectBase, type AvatarState, type AvatarBase } from '../domain/avatar'
import { LocalStorageWellnessRepository } from '../repositories/localStorageWellnessRepository'

export interface WellnessState { version: 1; profile: UserProfile | null; nutritionTarget: NutritionTarget | null; smoothie: SmoothieItem[]; selectedActivityId: string; game: GameState; avatar: AvatarState }
const initial: WellnessState = { version: 1, profile: null, nutritionTarget: null, smoothie: [{ ingredientId: 'oats', grams: 40 }, { ingredientId: 'yogurt', grams: 150 }, { ingredientId: 'soy', grams: 200 }, { ingredientId: 'banana', grams: 100 }, { ingredientId: 'spinach', grams: 60 }], selectedActivityId: 'walk-basic', game: { level: 1, xp: 32, coins: 80, quests: [{ id: 'meal', title: '스무디 기록하기', kind: 'meal-log', xp: 20, coins: 10, completed: false }, { id: 'activity', title: '오늘의 운동 완료', kind: 'activity', xp: 40, coins: 20, completed: false }, { id: 'recovery', title: '5분 스트레칭', kind: 'recovery', xp: 15, coins: 5, completed: false }], processedEventIds: [] }, avatar: { base: 'masculine', unlockedIds: ['runner-top'], equipped: { top: 'runner-top' } } }
const repository = new LocalStorageWellnessRepository<WellnessState>()
export function useWellnessGame() {
  const loaded = repository.load()
  const [state, setState] = useState<WellnessState>(() => loaded.state?.version === 1 ? loaded.state : initial)
  const [warning] = useState(loaded.warning)
  useEffect(() => { try { repository.save(state) } catch { /* keep memory state */ } }, [state])
  return { state, warning, onboard: (profile: UserProfile) => setState(current => ({ ...current, profile, nutritionTarget: calculateNutritionTarget(profile) })), setSmoothie: (smoothie: SmoothieItem[]) => setState(current => ({ ...current, smoothie })), setActivity: (selectedActivityId: string) => setState(current => ({ ...current, selectedActivityId })), complete: (id: string) => setState(current => ({ ...current, game: completeQuest(current.game, id, `${id}-${new Date().toISOString().slice(0, 10)}`) })), setBase: (base: AvatarBase) => setState(current => ({ ...current, avatar: selectBase(current.avatar, base) })) }
}
