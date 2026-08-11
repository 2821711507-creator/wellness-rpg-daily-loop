import { useEffect, useState } from 'react'
import { calculateNutritionTarget, type NutritionTarget } from '../domain/nutrition'
import type { UserProfile } from '../domain/profile'
import type { SmoothieItem } from '../domain/smoothie'
import { completeQuest, type GameState } from '../domain/game'
import { equipItem, normalizeAvatarState, selectGender, selectSkin, unequipItem, type AvatarState, type AvatarGender, type AvatarSelectionSlot, type AvatarSkin } from '../domain/avatar'
import { AVATAR_DEFAULTS } from '../data/avatarManifest'
import { LocalStorageWellnessRepository } from '../repositories/localStorageWellnessRepository'
import type { WellnessRepository } from '../repositories/wellnessRepository'
import { activityTemplates } from '../data/activityTemplates'
import { generateWeeklyPlan, getMonday, movePlannedActivity, movePlannedMeal, replacePlannedActivity, setPlannedItemCompleted, toLocalDateKey, type PlanMutationResult, type WeeklyPlan, type WeeklyPlanPreferences } from '../domain/weeklyPlan'
import { parseWeeklyPlan } from '../domain/weeklyPlanValidation'
import { appendCompletionEvent, type CompletionEvent } from '../domain/records'
import { parseCompletionEvents, parseWeightEntries } from '../domain/recordsValidation'
import { deleteWeightEntry, upsertWeightEntry, type WeightEntry } from '../domain/weight'

export interface WellnessState { version: 1; profile: UserProfile | null; nutritionTarget: NutritionTarget | null; smoothie: SmoothieItem[]; selectedActivityId: string; game: GameState; avatar: AvatarState; weeklyPlan?: WeeklyPlan; weightEntries?: WeightEntry[]; completionEvents?: CompletionEvent[] }
const initial: WellnessState = { version: 1, profile: null, nutritionTarget: null, smoothie: [{ ingredientId: 'oats', grams: 40 }, { ingredientId: 'yogurt', grams: 150 }, { ingredientId: 'soy', grams: 200 }, { ingredientId: 'banana', grams: 100 }, { ingredientId: 'spinach', grams: 60 }], selectedActivityId: 'walk-basic', game: { level: 1, xp: 32, coins: 80, quests: [{ id: 'meal', title: '스무디 기록하기', kind: 'meal-log', xp: 20, coins: 10, completed: false }, { id: 'activity', title: '오늘의 운동 완료', kind: 'activity', xp: 40, coins: 20, completed: false }, { id: 'recovery', title: '5분 스트레칭', kind: 'recovery', xp: 15, coins: 5, completed: false }], processedEventIds: [] }, avatar: { ...AVATAR_DEFAULTS, unlockedIds:[...AVATAR_DEFAULTS.unlockedIds], equipped:{ ...AVATAR_DEFAULTS.equipped } }, weightEntries:[], completionEvents:[] }
const repository = new LocalStorageWellnessRepository<WellnessState>()
export function useWellnessGame(options: { repository?: WellnessRepository<WellnessState>; now?: () => Date } = {}) {
  const activeRepository = options.repository ?? repository
  const now = options.now ?? (() => new Date())
  const [loaded] = useState(() => {
    const result = activeRepository.load()
    if (result.state?.version !== 1) return { state: initial, warning: result.warning }
    const today = toLocalDateKey(now())
    const weights = result.state.weightEntries === undefined ? { entries:[] } : parseWeightEntries(result.state.weightEntries, today)
    const events = result.state.completionEvents === undefined ? { events:[] } : parseCompletionEvents(result.state.completionEvents, today)
    const parsedPlan: { plan:WeeklyPlan|null|undefined; warning?:string } = result.state.weeklyPlan === undefined ? { plan:undefined } : parseWeeklyPlan(result.state.weeklyPlan, activityTemplates)
    const warnings = [result.warning, weights.warning, events.warning, parsedPlan.warning].filter(Boolean)
    return { state:{ ...result.state, avatar:normalizeAvatarState(result.state.avatar), weeklyPlan:parsedPlan.plan ?? undefined, weightEntries:weights.entries, completionEvents:events.events }, warning:warnings.join(' ') || undefined }
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
  const complete = (id: string) => setState(current => {
    const date = toLocalDateKey(now())
    const weekStart = toLocalDateKey(getMonday(now()))
    let weeklyPlan = current.weeklyPlan
    let plannedId: string | undefined
    if (weeklyPlan?.weekStart === weekStart) {
      plannedId = id === 'activity'
        ? weeklyPlan.activities.find(item => item.date === date)?.id
        : id === 'meal'
          ? weeklyPlan.meals.find(item => item.date === date && item.kind === 'smoothie' && !item.completed)?.id
          : undefined
      if (plannedId) weeklyPlan = setPlannedItemCompleted(weeklyPlan, plannedId, true)
    }
    const game = completeQuest(current.game, id, `${id}-${date}`)
    let completionEvents = current.completionEvents ?? []
    const quest = current.game.quests.find(item => item.id === id)
    const rewarded = game !== current.game
    const kind = id === 'activity' && plannedId ? 'planned-activity' : id === 'meal' && plannedId ? 'planned-meal' : id === 'recovery' ? 'recovery' : null
    if (rewarded && quest && kind) completionEvents = appendCompletionEvent(completionEvents, { id:`record-${kind}-${plannedId ?? date}`, date, kind, ...(plannedId ? { plannedItemId:plannedId } : {}), xpEarned:quest.xp })
    return { ...current, weeklyPlan, game, completionEvents }
  })
  const saveWeight = (weightKg: number) => {
    const date = toLocalDateKey(now())
    const result = upsertWeightEntry(state.weightEntries ?? [], { date, weightKg, recordedAt:now().toISOString() }, date)
    if (result.ok) { setState(current => ({ ...current, weightEntries:result.entries })); setMutationMessage('오늘 기록을 저장했어요.') }
    else setMutationMessage(result.message)
    return result
  }
  return {
    state,
    warning: loaded.warning,
    mutationMessage,
    onboard: (profile: UserProfile) => setState(current => ({ ...current, profile, nutritionTarget: calculateNutritionTarget(profile) })),
    setSmoothie: (smoothie: SmoothieItem[]) => setState(current => ({ ...current, smoothie })),
    setActivity: (selectedActivityId: string) => setState(current => ({ ...current, selectedActivityId })),
    complete,
    setAvatarGender: (gender: AvatarGender) => setState(current => ({ ...current, avatar:selectGender(current.avatar, gender) })),
    setAvatarSkin: (skin: AvatarSkin) => setState(current => ({ ...current, avatar:selectSkin(current.avatar, skin) })),
    equipAvatarItem: (itemId: string) => setState(current => ({ ...current, avatar:equipItem(current.avatar, itemId) })),
    unequipAvatarItem: (slot: AvatarSelectionSlot) => setState(current => ({ ...current, avatar:unequipItem(current.avatar, slot) })),
    generatePlan,
    clearPlan: () => setState(current => ({ ...current, weeklyPlan: undefined })),
    moveMeal: (id: string, date: string) => state.weeklyPlan ? applyMutation(movePlannedMeal(state.weeklyPlan, id, date)) : ({ ok: false, message: '주간 계획이 없어요.' } as PlanMutationResult),
    moveActivity: (id: string, date: string) => state.weeklyPlan ? applyMutation(movePlannedActivity(state.weeklyPlan, id, date)) : ({ ok: false, message: '주간 계획이 없어요.' } as PlanMutationResult),
    replaceActivity: (id: string, templateId: string) => state.weeklyPlan ? applyMutation(replacePlannedActivity(state.weeklyPlan, id, templateId, activityTemplates)) : ({ ok: false, message: '주간 계획이 없어요.' } as PlanMutationResult),
    completePlannedItem: (id: string) => setState(current => current.weeklyPlan ? { ...current, weeklyPlan: setPlannedItemCompleted(current.weeklyPlan, id, true) } : current),
    saveWeight,
    deleteWeight: (date: string) => { setState(current => ({ ...current, weightEntries:deleteWeightEntry(current.weightEntries ?? [], date) })); setMutationMessage('체중 기록을 삭제했어요.') },
  }
}
