import { useEffect, useRef, useState } from 'react'
import { calculateNutritionTarget, type NutritionTarget } from '../domain/nutrition'
import { normalizeProfile, type UserProfile } from '../domain/profile'
import type { SmoothieItem } from '../domain/smoothie'
import { completeQuest, rolloverDailyQuests, type GameState } from '../domain/game'
import { equipItem, normalizeAvatarState, selectGender, selectSkin, unequipItem, type AvatarState, type AvatarGender, type AvatarSelectionSlot, type AvatarSkin } from '../domain/avatar'
import { grantAvatarUnlocks } from '../domain/avatarProgression'
import { AVATAR_DEFAULTS, AVATAR_PARTS } from '../data/avatarManifest'
import { LocalStorageWellnessRepository } from '../repositories/localStorageWellnessRepository'
import type { WellnessRepository } from '../repositories/wellnessRepository'
import { activityTemplates } from '../data/activityTemplates'
import { generateWeeklyPlan, getMonday, movePlannedActivity, movePlannedMeal, replacePlannedActivity, setPlannedItemCompleted, toLocalDateKey, type PlanMutationResult, type WeeklyPlan, type WeeklyPlanPreferences } from '../domain/weeklyPlan'
import { parseWeeklyPlan } from '../domain/weeklyPlanValidation'
import { appendCompletionEvent, type CompletionEvent } from '../domain/records'
import { parseCompletionEvents, parseWeightEntries } from '../domain/recordsValidation'
import { deleteWeightEntry, upsertWeightEntry, type WeightEntry } from '../domain/weight'
import { reconcileApprovedTrainingWeek } from '../domain/weeklyTrainingGuidance'

export interface WellnessState { version: 1; profile: UserProfile | null; nutritionTarget: NutritionTarget | null; smoothie: SmoothieItem[]; selectedActivityId: string; game: GameState; avatar: AvatarState; weeklyPlan?: WeeklyPlan; weightEntries?: WeightEntry[]; completionEvents?: CompletionEvent[] }
/** The state a brand-new profile starts from, whether persisted locally or freshly created for a cloud account with no remote row yet. */
export const defaultWellnessState: WellnessState = { version: 1, profile: null, nutritionTarget: null, smoothie: [{ ingredientId: 'oats', grams: 40 }, { ingredientId: 'yogurt', grams: 150 }, { ingredientId: 'soy', grams: 200 }, { ingredientId: 'banana', grams: 100 }, { ingredientId: 'spinach', grams: 60 }], selectedActivityId: 'walk-basic', game: { level: 1, xp: 32, coins: 80, quests: [{ id: 'meal', title: '스무디 기록하기', kind: 'meal-log', xp: 20, coins: 10, completed: false }, { id: 'activity', title: '오늘의 운동 완료', kind: 'activity', xp: 40, coins: 20, completed: false }, { id: 'recovery', title: '5분 스트레칭', kind: 'recovery', xp: 15, coins: 5, completed: false }], processedEventIds: [] }, avatar: { ...AVATAR_DEFAULTS, unlockedIds:[...AVATAR_DEFAULTS.unlockedIds], equipped:{ ...AVATAR_DEFAULTS.equipped } }, weightEntries:[], completionEvents:[] }
const repository = new LocalStorageWellnessRepository<WellnessState>()

/**
 * Runs a known version-1 `WellnessState` through the same normalization path used when
 * hydrating from local storage: array defaults, weight/event recovery, weekly plan
 * reconciliation, avatar unlock grants, daily quest rollover, and profile defaults.
 * Exported so `legacyStateMigrator` can validate and normalize a legacy state the same way
 * before uploading it to the cloud.
 */
export function normalizeWellnessState(rawState: WellnessState, today: string): { state: WellnessState; warning?: string } {
  const weights = rawState.weightEntries === undefined ? { entries:[] } : parseWeightEntries(rawState.weightEntries, today)
  const events = rawState.completionEvents === undefined ? { events:[] } : parseCompletionEvents(rawState.completionEvents, today)
  const parsedPlan: { plan:WeeklyPlan|null|undefined; warning?:string } = rawState.weeklyPlan === undefined ? { plan:undefined } : parseWeeklyPlan(rawState.weeklyPlan, activityTemplates)
  const warnings = [weights.warning, events.warning, parsedPlan.warning].filter(Boolean)
  const normalizedAvatar = normalizeAvatarState(rawState.avatar)
  const avatar = grantAvatarUnlocks(normalizedAvatar, 0, rawState.game.level).state
  const game = rolloverDailyQuests(rawState.game, today)
  const weeklyPlan = parsedPlan.plan ? reconcileApprovedTrainingWeek(parsedPlan.plan) : undefined
  const profile = normalizeProfile(rawState.profile)
  return { state:{ ...rawState, game, avatar, profile, weeklyPlan, weightEntries:weights.entries, completionEvents:events.events }, warning:warnings.join(' ') || undefined }
}

export function useWellnessGame(options: { repository?: WellnessRepository<WellnessState>; initialState?: WellnessState; onStateChange?: (state: WellnessState) => void; now?: () => Date } = {}) {
  const activeRepository = options.repository ?? repository
  const now = options.now ?? (() => new Date())
  const cloudManaged = options.initialState !== undefined
  const [loaded] = useState(() => {
    const today = toLocalDateKey(now())
    if (options.initialState !== undefined) return normalizeWellnessState(options.initialState, today)
    const result = activeRepository.load()
    if (result.state?.version !== 1) return { state:{ ...defaultWellnessState, game:rolloverDailyQuests(defaultWellnessState.game, today) }, warning:result.warning }
    const normalized = normalizeWellnessState(result.state, today)
    return { state:normalized.state, warning:[result.warning, normalized.warning].filter(Boolean).join(' ') || undefined }
  })
  const [hookState, setHookState] = useState(() => ({ state:loaded.state, avatarUnlockMessage:'' }))
  const { state, avatarUnlockMessage } = hookState
  const setState = (update: (current: WellnessState) => WellnessState) => setHookState(current => ({ ...current, state:update(current.state) }))
  const [mutationMessage, setMutationMessage] = useState('')
  // Guards the cloud-managed save effect against firing on the very first render after
  // hydration. Without this, every app open unconditionally wrote the freshly-hydrated
  // (but otherwise unchanged) state back to the cloud, bumping the remote revision purely
  // from loading -- which produced a spurious conflict on a second, already-open device
  // that made no conflicting edit at all. A genuine first-ever save for a brand-new account
  // still happens naturally: it is driven by the user's first real action (e.g. onboarding),
  // not by this mount effect.
  const hydratedRef = useRef(true)
  useEffect(() => {
    if (cloudManaged) {
      if (hydratedRef.current) { hydratedRef.current = false; return }
      options.onStateChange?.(state)
      return
    }
    try { activeRepository.save(state) } catch { /* keep memory state */ }
  }, [activeRepository, state, cloudManaged, options.onStateChange])
  const applyMutation = (result: PlanMutationResult) => {
    if (result.ok) { setState(current => ({ ...current, weeklyPlan: result.plan })); setMutationMessage('') }
    else setMutationMessage(result.message)
    return result
  }
  const generatePlan = (preferences: WeeklyPlanPreferences) => {
    const result = generateWeeklyPlan({ weekStart: toLocalDateKey(getMonday(now())), preferences, smoothieItems: state.smoothie, activityTemplates, profile: state.profile ?? undefined })
    return applyMutation(result.ok ? { ok:true, plan:reconcileApprovedTrainingWeek(result.plan) } : result)
  }
  const complete = (id: string) => setHookState(currentHookState => {
    const current = currentHookState.state
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
    const dailyGame = rolloverDailyQuests(current.game, date)
    const game = completeQuest(dailyGame, id, `${id}-${date}`)
    const unlocks = grantAvatarUnlocks(current.avatar, dailyGame.level, game.level)
    const unlockedNames = unlocks.newIds.flatMap(unlockedId => AVATAR_PARTS.find(part => part.id === unlockedId)?.name ?? [])
    let completionEvents = current.completionEvents ?? []
    const quest = dailyGame.quests.find(item => item.id === id)
    const rewarded = game !== dailyGame
    const kind = id === 'activity' && plannedId ? 'planned-activity' : id === 'meal' && plannedId ? 'planned-meal' : id === 'recovery' ? 'recovery' : null
    if (rewarded && quest && kind) completionEvents = appendCompletionEvent(completionEvents, { id:`record-${kind}-${plannedId ?? date}`, date, kind, ...(plannedId ? { plannedItemId:plannedId } : {}), xpEarned:quest.xp })
    return {
      state:{ ...current, weeklyPlan, game, avatar:unlocks.state, completionEvents },
      avatarUnlockMessage:unlockedNames.length > 0 ? `${unlockedNames.join(', ')} 아이템을 해금했어요.` : '',
    }
  })
  const saveWeight = (weightKg: number) => {
    const date = toLocalDateKey(now())
    const result = upsertWeightEntry(state.weightEntries ?? [], { date, weightKg, recordedAt:now().toISOString() }, date)
    if (result.ok) { setState(current => ({ ...current, weightEntries:result.entries })); setMutationMessage('오늘 체중을 저장했어요.') }
    else setMutationMessage(result.message)
    return result
  }
  return {
    state,
    warning: loaded.warning,
    mutationMessage,
    avatarUnlockMessage,
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
    deleteWeight: (date: string) => { setState(current => ({ ...current, weightEntries:deleteWeightEntry(current.weightEntries ?? [], date) })); setMutationMessage('오늘 체중 기록을 삭제했어요.') },
  }
}
