import { useEffect, useState } from 'react'
import { calculateNutritionTarget, type NutritionTarget } from '../domain/nutrition'
import type { UserProfile } from '../domain/profile'
import type { SmoothieItem } from '../domain/smoothie'
import { completeQuest, type GameState } from '../domain/game'
import { selectBase, type AvatarState, type AvatarBase } from '../domain/avatar'
import { LocalStorageWellnessRepository } from '../repositories/localStorageWellnessRepository'
import type { WellnessRepository } from '../repositories/wellnessRepository'
import { activityTemplates } from '../data/activityTemplates'
import { generateWeeklyPlan, getMonday, movePlannedActivity, movePlannedMeal, replacePlannedActivity, setPlannedItemCompleted, toLocalDateKey, type PlanMutationResult, type WeeklyPlan, type WeeklyPlanPreferences } from '../domain/weeklyPlan'
import { parseWeeklyPlan } from '../domain/weeklyPlanValidation'

export interface WellnessState { version: 1; profile: UserProfile | null; nutritionTarget: NutritionTarget | null; smoothie: SmoothieItem[]; selectedActivityId: string; game: GameState; avatar: AvatarState; weeklyPlan?: WeeklyPlan }
const initial: WellnessState = { version: 1, profile: null, nutritionTarget: null, smoothie: [{ ingredientId: 'oats', grams: 40 }, { ingredientId: 'yogurt', grams: 150 }, { ingredientId: 'soy', grams: 200 }, { ingredientId: 'banana', grams: 100 }, { ingredientId: 'spinach', grams: 60 }], selectedActivityId: 'walk-basic', game: { level: 1, xp: 32, coins: 80, quests: [{ id: 'meal', title: '스무디 기록하기', kind: 'meal-log', xp: 20, coins: 10, completed: false }, { id: 'activity', title: '오늘의 운동 완료', kind: 'activity', xp: 40, coins: 20, completed: false }, { id: 'recovery', title: '5분 스트레칭', kind: 'recovery', xp: 15, coins: 5, completed: false }], processedEventIds: [] }, avatar: { base: 'masculine', unlockedIds: ['runner-top'], equipped: { top: 'runner-top' } } }
const repository = new LocalStorageWellnessRepository<WellnessState>()
export function useWellnessGame(options: { repository?: WellnessRepository<WellnessState>; now?: () => Date } = {}) {
  const activeRepository = options.repository ?? repository
  const now = options.now ?? (() => new Date())
  const [loaded] = useState(() => {
    const result = activeRepository.load()
    if (result.state?.version !== 1) return { state: initial, warning: result.warning }
    if (result.state.weeklyPlan === undefined) return { state: result.state, warning: result.warning }
    const parsed = parseWeeklyPlan(result.state.weeklyPlan, activityTemplates)
    return { state: parsed.plan ? { ...result.state, weeklyPlan: parsed.plan } : { ...result.state, weeklyPlan: undefined }, warning: parsed.warning ?? result.warning }
  })
  const [state, setState] = useState<WellnessState>(loaded.state)
  const [mutationMessage, setMutationMessage] = useState('')
  useEffect(() => { try { activeRepository.save(state) } catch { /* keep memory state */ } }, [activeRepository, state])
  const applyMutation = (result: PlanMutationResult) => {
    if (result.ok) { setState(current => ({ ...current, weeklyPlan: result.plan })); setMutationMessage('') }
    else setMutationMessage(result.message)
    return result
  }
  const generatePlan = (preferences: WeeklyPlanPreferences) => {
    const result = generateWeeklyPlan({ weekStart: toLocalDateKey(getMonday(now())), preferences, smoothieItems: state.smoothie, activityTemplates })
    return applyMutation(result)
  }
  return {
    state,
    warning: loaded.warning,
    mutationMessage,
    onboard: (profile: UserProfile) => setState(current => ({ ...current, profile, nutritionTarget: calculateNutritionTarget(profile) })),
    setSmoothie: (smoothie: SmoothieItem[]) => setState(current => ({ ...current, smoothie })),
    setActivity: (selectedActivityId: string) => setState(current => ({ ...current, selectedActivityId })),
    complete: (id: string) => setState(current => ({ ...current, game: completeQuest(current.game, id, `${id}-${toLocalDateKey(now())}`) })),
    setBase: (base: AvatarBase) => setState(current => ({ ...current, avatar: selectBase(current.avatar, base) })),
    generatePlan,
    clearPlan: () => setState(current => ({ ...current, weeklyPlan: undefined })),
    moveMeal: (id: string, date: string) => state.weeklyPlan ? applyMutation(movePlannedMeal(state.weeklyPlan, id, date)) : ({ ok: false, message: '주간 계획이 없어요.' } as PlanMutationResult),
    moveActivity: (id: string, date: string) => state.weeklyPlan ? applyMutation(movePlannedActivity(state.weeklyPlan, id, date)) : ({ ok: false, message: '주간 계획이 없어요.' } as PlanMutationResult),
    replaceActivity: (id: string, templateId: string) => state.weeklyPlan ? applyMutation(replacePlannedActivity(state.weeklyPlan, id, templateId, activityTemplates)) : ({ ok: false, message: '주간 계획이 없어요.' } as PlanMutationResult),
    completePlannedItem: (id: string) => setState(current => current.weeklyPlan ? { ...current, weeklyPlan: setPlannedItemCompleted(current.weeklyPlan, id, true) } : current),
  }
}
