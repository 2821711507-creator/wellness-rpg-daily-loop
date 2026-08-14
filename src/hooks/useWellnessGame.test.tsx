import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WellnessRepository } from '../repositories/wellnessRepository'
import { useWellnessGame, type WellnessState } from './useWellnessGame'

function memoryRepository(initialState: WellnessState): WellnessRepository<WellnessState> {
  let state = structuredClone(initialState)
  return {
    load: () => ({ state:structuredClone(state) }),
    save: next => { state = structuredClone(next) },
  }
}

describe('useWellnessGame weekly plans', () => {
  beforeEach(() => localStorage.clear())

  it('starts with the normalized layered avatar defaults', () => {
    const { result } = renderHook(() => useWellnessGame())
    expect(result.current.state.avatar).toMatchObject({ gender:'male', skin:'medium', equipped:{ hair:'hair-short' } })
  })

  it('silently reconciles all level rewards while hydrating a direct legacy version-one fixture', () => {
    const legacyFixture = {
      version:1,
      profile:null,
      nutritionTarget:null,
      smoothie:[],
      selectedActivityId:'walk-basic',
      game:{
        level:2,
        xp:7,
        coins:115,
        quests:[
          { id:'meal', title:'스무디 기록하기', kind:'meal-log', xp:20, coins:10, completed:true },
          { id:'activity', title:'오늘의 운동 완료', kind:'activity', xp:40, coins:20, completed:false },
          { id:'recovery', title:'5분 스트레칭', kind:'recovery', xp:15, coins:5, completed:false },
        ],
        processedEventIds:['meal-2026-08-11'],
      },
      avatar:{ base:'feminine', unlockedIds:['top-runner'], equipped:{ top:'top-runner' } },
      weightEntries:[],
      completionEvents:[],
    } as unknown as WellnessState
    const repository = memoryRepository(legacyFixture)

    const { result } = renderHook(() => useWellnessGame({ repository, now:() => new Date(2026, 7, 11, 7) }))

    expect(result.current.state.avatar.unlockedIds).toEqual(expect.arrayContaining(['hair-wave', 'shoes-trainers', 'top-runner']))
    expect(result.current.state.avatar.equipped).toEqual({ hair:'hair-short', top:'top-runner' })
    expect(result.current.avatarUnlockMessage).toBe('')
    expect(result.current.state.game.quests[0].completed).toBe(true)
    expect(result.current.state.game.questDate).toBe('2026-08-11')
  })

  it('defaults a legacy profile with no goal to cut/mild on restore', () => {
    const legacyFixture = {
      version:1,
      profile:{ age:30, heightCm:175, weightKg:80, calculationSex:'male', activityLevel:'light' },
      nutritionTarget:null,
      smoothie:[],
      selectedActivityId:'walk-basic',
      game:{ level:1, xp:0, coins:0, quests:[], processedEventIds:[] },
      avatar:{ base:'masculine', unlockedIds:[], equipped:{} },
      weightEntries:[],
      completionEvents:[],
    } as unknown as WellnessState
    const repository = memoryRepository(legacyFixture)

    const { result } = renderHook(() => useWellnessGame({ repository, now:() => new Date(2026, 7, 11, 7) }))

    expect(result.current.state.profile).toEqual({ age:30, heightCm:175, weightKg:80, calculationSex:'male', activityLevel:'light', goal:'cut', cutIntensity:'mild', exerciseExperience:'beginner' })
  })

  it('grants crossed-level cosmetics once and never auto-equips them', () => {
    const seed = renderHook(() => useWellnessGame())
    const repository = memoryRepository({ ...seed.result.current.state, game:{ ...seed.result.current.state.game, xp:90 } })
    seed.unmount()
    localStorage.clear()

    const { result } = renderHook(() => useWellnessGame({ repository, now:() => new Date(2026, 7, 11, 7) }))
    act(() => result.current.complete('recovery'))

    expect(result.current.state.game.level).toBe(2)
    expect(result.current.state.avatar.unlockedIds).toEqual(expect.arrayContaining(['hair-wave', 'shoes-trainers']))
    expect(result.current.state.avatar.equipped).toEqual({ hair:'hair-short' })
    expect(result.current.avatarUnlockMessage).toContain('운동화')

    act(() => result.current.complete('recovery'))
    expect(result.current.state.avatar.unlockedIds.filter(id => id === 'shoes-trainers')).toHaveLength(1)
    expect(result.current.avatarUnlockMessage).toBe('')
  })

  it('announces only the rewards from the latest level transition', () => {
    const seed = renderHook(() => useWellnessGame())
    const repository = memoryRepository({
      ...seed.result.current.state,
      game:{
        ...seed.result.current.state.game,
        xp:90,
        quests:seed.result.current.state.game.quests.map(quest => quest.id === 'activity' ? { ...quest, xp:100 } : quest),
      },
    })
    seed.unmount()
    localStorage.clear()

    const { result } = renderHook(() => useWellnessGame({ repository, now:() => new Date(2026, 7, 11, 7) }))
    act(() => result.current.complete('recovery'))
    expect(result.current.avatarUnlockMessage).toContain('운동화')

    act(() => result.current.complete('activity'))
    expect(result.current.state.game.level).toBe(3)
    expect(result.current.avatarUnlockMessage).toContain('러닝복')
    expect(result.current.avatarUnlockMessage).not.toContain('운동화')
    expect(result.current.avatarUnlockMessage).not.toContain('웨이브 머리')
  })

  it('rolls quests forward by local date while keeping event IDs idempotent', () => {
    let day = 11
    const now = () => new Date(2026, 7, day, 7)
    const { result } = renderHook(() => useWellnessGame({ now }))

    act(() => {
      result.current.complete('meal')
      result.current.complete('activity')
      result.current.complete('recovery')
    })
    const firstDayIds = [...result.current.state.game.processedEventIds]
    expect(result.current.state.game.quests.every(quest => quest.completed)).toBe(true)

    day = 12
    act(() => result.current.complete('meal'))
    expect(result.current.state.game.questDate).toBe('2026-08-12')
    expect(result.current.state.game.quests.map(quest => quest.completed)).toEqual([true, false, false])
    expect(result.current.state.game.processedEventIds).toEqual([...firstDayIds, 'meal-2026-08-12'])
    const rewardedXp = result.current.state.game.xp
    act(() => result.current.complete('meal'))
    expect(result.current.state.game.xp).toBe(rewardedXp)
    expect(result.current.state.game.processedEventIds).toEqual([...firstDayIds, 'meal-2026-08-12'])
  })

  it('reaches level nine and grants the complete reward track across daily rollovers', () => {
    let day = 11
    const now = () => new Date(2026, 7, day, 7)
    const { result } = renderHook(() => useWellnessGame({ now }))

    for (let dailyLoop = 0; dailyLoop < 11; dailyLoop += 1) {
      act(() => {
        result.current.complete('meal')
        result.current.complete('activity')
        result.current.complete('recovery')
      })
      day += 1
    }

    expect(result.current.state.game.level).toBe(9)
    expect(result.current.state.avatar.unlockedIds).toEqual(expect.arrayContaining([
      'hair-wave', 'shoes-trainers', 'top-runner', 'bottom-pants', 'shoes-walk', 'hair-tied',
      'top-gym', 'bottom-shorts', 'top-walk', 'hat-wellness-cap', 'accessory-bottle-pouch',
    ]))
  })

  it('preserves legacy rewards below their level and does not repeat unlock announcements on remount', () => {
    const seed = renderHook(() => useWellnessGame())
    const repository = memoryRepository({
      ...seed.result.current.state,
      game:{ ...seed.result.current.state.game, xp:90 },
      avatar:{
        ...seed.result.current.state.avatar,
        unlockedIds:[...seed.result.current.state.avatar.unlockedIds, 'top-runner'],
        equipped:{ hair:'hair-short', top:'top-runner' },
      },
    })
    seed.unmount()
    localStorage.clear()

    const first = renderHook(() => useWellnessGame({ repository, now:() => new Date(2026, 7, 11, 7) }))
    expect(first.result.current.state.avatar.equipped.top).toBe('top-runner')
    act(() => first.result.current.complete('recovery'))
    expect(first.result.current.state.avatar.equipped.top).toBe('top-runner')
    expect(first.result.current.avatarUnlockMessage).toContain('웨이브 머리')
    first.unmount()

    const restored = renderHook(() => useWellnessGame({ repository, now:() => new Date(2026, 7, 11, 7) }))
    expect(restored.result.current.state.avatar.unlockedIds).toEqual(expect.arrayContaining(['top-runner', 'hair-wave', 'shoes-trainers']))
    expect(restored.result.current.state.avatar.equipped).toEqual({ hair:'hair-short', top:'top-runner' })
    expect(restored.result.current.avatarUnlockMessage).toBe('')
  })

  it('restores an existing version-one daily record without a weekly plan', () => {
    const first = renderHook(() => useWellnessGame())
    const saved = { ...first.result.current.state, game: { ...first.result.current.state.game, coins: 123 } }
    first.unmount()
    localStorage.setItem('wellness-rpg:v1', JSON.stringify(saved))
    const restored = renderHook(() => useWellnessGame())
    expect(restored.result.current.state.game.coins).toBe(123)
    expect(restored.result.current.state.weeklyPlan).toBeUndefined()
  })

  it('drops only a corrupt weekly plan and keeps daily progress', () => {
    const first = renderHook(() => useWellnessGame())
    const saved = { ...first.result.current.state, game: { ...first.result.current.state.game, coins: 456 }, weeklyPlan: { broken: true } }
    first.unmount()
    localStorage.setItem('wellness-rpg:v1', JSON.stringify(saved))
    const restored = renderHook(() => useWellnessGame())
    expect(restored.result.current.state.game.coins).toBe(456)
    expect(restored.result.current.state.weeklyPlan).toBeUndefined()
    expect(restored.result.current.warning).toBe('주간 계획을 복구하지 못해 계획만 초기화했어요.')
  })

  it('generates, moves, replaces, and completes weekly items', () => {
    const { result } = renderHook(() => useWellnessGame({ now: () => new Date(2026, 7, 10) }))
    act(() => result.current.generatePlan({ mealsPerDay: 2, smoothieSlots: ['breakfast'], activitiesPerWeek: 2, activityMix: { gym: 1, home: 1, walk: 0 } }))
    const plan = result.current.state.weeklyPlan!
    expect(plan.weekStart).toBe('2026-08-10')
    expect(plan.trainingGuidance?.days.find(day => day.date === '2026-08-11')).toMatchObject({ state:'completed', includesHiit:true })
    const meal = plan.meals.find(item => item.date === '2026-08-10' && item.slot === 'breakfast')!
    act(() => result.current.moveMeal(meal.id, '2026-08-11'))
    expect(result.current.mutationMessage).toBe('선택한 날짜에 같은 끼니가 이미 있어요.')
    const activity = result.current.state.weeklyPlan!.activities[0]
    act(() => result.current.replaceActivity(activity.id, 'walk-basic'))
    expect(result.current.state.weeklyPlan!.activities[0].templateId).toBe('walk-basic')
    act(() => result.current.completePlannedItem(activity.id))
    expect(result.current.state.weeklyPlan!.activities[0].completed).toBe(true)
  })

  it('retains the latest in-memory state when persistence throws', () => {
    const repository: WellnessRepository<WellnessState> = {
      load: () => ({ state: null }),
      save: () => { throw new Error('quota') },
    }
    const { result } = renderHook(() => useWellnessGame({ repository }))
    act(() => result.current.setSmoothie([{ ingredientId: 'banana', grams: 88 }]))
    expect(result.current.state.smoothie).toEqual([{ ingredientId: 'banana', grams: 88 }])
  })

  it('defaults missing record arrays without changing existing state', () => {
    const first = renderHook(() => useWellnessGame())
    const saved = { ...first.result.current.state, game:{ ...first.result.current.state.game, coins:222 } }
    first.unmount()
    localStorage.setItem('wellness-rpg:v1', JSON.stringify(saved))
    const restored = renderHook(() => useWellnessGame({ now:() => new Date(2026, 7, 11) }))
    expect(restored.result.current.state.game.coins).toBe(222)
    expect(restored.result.current.state.weightEntries).toEqual([])
    expect(restored.result.current.state.completionEvents).toEqual([])
  })

  it('recovers corrupt record arrays independently', () => {
    const first = renderHook(() => useWellnessGame())
    const event = { id:'record-recovery-2026-08-10', date:'2026-08-10', kind:'recovery', xpEarned:15 }
    const saved = { ...first.result.current.state, game:{ ...first.result.current.state.game, coins:333 }, weightEntries:[{ bad:true }], completionEvents:[event] }
    first.unmount()
    localStorage.setItem('wellness-rpg:v1', JSON.stringify(saved))
    const restored = renderHook(() => useWellnessGame({ now:() => new Date(2026, 7, 11) }))
    expect(restored.result.current.state.weightEntries).toEqual([])
    expect(restored.result.current.state.completionEvents).toEqual([event])
    expect(restored.result.current.state.game.coins).toBe(333)
    expect(restored.result.current.warning).toContain('체중 기록만 초기화')
  })

  it('keeps weight and existing state when only completion events are corrupt', () => {
    const first = renderHook(() => useWellnessGame())
    const weight = { id:'weight-2026-08-10', date:'2026-08-10', weightKg:70.2, recordedAt:'2026-08-10T07:00:00+09:00' }
    const saved = { ...first.result.current.state, game:{ ...first.result.current.state.game, coins:444 }, avatar:{ base:'feminine' as const, unlockedIds:['runner-top'], equipped:{ top:'runner-top' } }, weightEntries:[weight], completionEvents:[{ broken:true }] }
    first.unmount()
    localStorage.setItem('wellness-rpg:v1', JSON.stringify(saved))
    const restored = renderHook(() => useWellnessGame({ now:() => new Date(2026, 7, 11) }))
    expect(restored.result.current.state.weightEntries).toEqual([weight])
    expect(restored.result.current.state.completionEvents).toEqual([])
    expect(restored.result.current.state.game.coins).toBe(444)
    expect(restored.result.current.state.avatar.gender).toBe('female')
    expect(restored.result.current.warning).toContain('완료 기록만 초기화')
  })

  it('saves, replaces, and deletes today weight', () => {
    const { result } = renderHook(() => useWellnessGame({ now:() => new Date(2026, 7, 11, 7) }))
    act(() => result.current.saveWeight(72.46))
    expect(result.current.state.weightEntries?.[0]).toMatchObject({ date:'2026-08-11', weightKg:72.5 })
    expect(result.current.mutationMessage).toBe('오늘 체중을 저장했어요.')
    act(() => result.current.saveWeight(72.1))
    expect(result.current.state.weightEntries).toHaveLength(1)
    expect(result.current.state.weightEntries?.[0].weightKg).toBe(72.1)
    act(() => result.current.deleteWeight('2026-08-11'))
    expect(result.current.state.weightEntries).toEqual([])
  })

  it('records a planned completion event and xp exactly once', () => {
    const { result } = renderHook(() => useWellnessGame({ now:() => new Date(2026, 7, 12, 12) }))
    act(() => result.current.generatePlan({ mealsPerDay:2, smoothieSlots:['breakfast'], activitiesPerWeek:2, activityMix:{ gym:1, home:1, walk:0 } }))
    act(() => result.current.complete('activity'))
    expect(result.current.state.completionEvents).toEqual([expect.objectContaining({ date:'2026-08-12', kind:'planned-activity', xpEarned:40 })])
    act(() => result.current.complete('activity'))
    expect(result.current.state.completionEvents).toHaveLength(1)
  })

  it('persists avatar gender, skin, and unlocked equipped parts', () => {
    const first = renderHook(() => useWellnessGame())
    act(() => first.result.current.setAvatarGender('female'))
    act(() => first.result.current.setAvatarSkin('deep'))
    act(() => first.result.current.equipAvatarItem('hair-bob'))
    expect(first.result.current.state.avatar).toMatchObject({ gender:'female', skin:'deep', equipped:{ hair:'hair-bob' } })
    first.unmount()

    const restored = renderHook(() => useWellnessGame())
    expect(restored.result.current.state.avatar).toMatchObject({ gender:'female', skin:'deep', equipped:{ hair:'hair-bob' } })
  })

  it('recovers only invalid avatar selections', () => {
    const first = renderHook(() => useWellnessGame())
    const saved = { ...first.result.current.state, game:{ ...first.result.current.state.game, coins:555 }, avatar:{ gender:'robot', skin:'orange', unlockedIds:[], equipped:{ top:'missing' } } }
    first.unmount()
    localStorage.setItem('wellness-rpg:v1', JSON.stringify(saved))
    const restored = renderHook(() => useWellnessGame())
    expect(restored.result.current.state.avatar).toMatchObject({ gender:'male', skin:'medium', equipped:{ hair:'hair-short' } })
    expect(restored.result.current.state.game.coins).toBe(555)
    expect(restored.result.current.state.smoothie).toEqual(saved.smoothie)
  })

  describe('cloud-managed state injection', () => {
    it('hydrates a supplied initialState through the existing validators instead of the repository', () => {
      const legacyShapedInitialState = {
        version:1,
        profile:null,
        nutritionTarget:null,
        smoothie:[],
        selectedActivityId:'walk-basic',
        game:{ level:1, xp:0, coins:0, quests:[], processedEventIds:[] },
        avatar:{ base:'masculine', unlockedIds:[], equipped:{} },
        weightEntries:[],
        completionEvents:[],
      } as unknown as WellnessState
      const repository = memoryRepository({ ...legacyShapedInitialState, game:{ ...legacyShapedInitialState.game, coins:999 } })

      const { result } = renderHook(() => useWellnessGame({ initialState:legacyShapedInitialState, repository, now:() => new Date(2026, 7, 11, 7) }))

      expect(result.current.state.avatar).toMatchObject({ gender:'male', skin:'medium', equipped:{ hair:'hair-short' } })
      expect(result.current.state.game.questDate).toBe('2026-08-11')
      expect(result.current.state.game.coins).toBe(0)
    })

    it('does not call onStateChange merely from hydrating a supplied initialState, but does call it once after a real state-changing action, without touching the repository', () => {
      // Regression test for: every app open unconditionally wrote to the cloud (via the
      // save effect firing on the very first render after load), which bumped the remote
      // revision on mere hydration and produced a spurious conflict on a second device that
      // made no conflicting edit at all. The save effect must only fire in response to an
      // actual user-driven state change, never for the initial mount/hydration render.
      const initialState = {
        version:1,
        profile:null,
        nutritionTarget:null,
        smoothie:[],
        selectedActivityId:'walk-basic',
        game:{ level:1, xp:0, coins:0, quests:[], processedEventIds:[] },
        avatar:{ base:'masculine', unlockedIds:[], equipped:{} },
        weightEntries:[],
        completionEvents:[],
      } as unknown as WellnessState
      const onStateChange = vi.fn()
      const repository: WellnessRepository<WellnessState> = {
        load: () => { throw new Error('repository.load must not be called in cloud-managed mode') },
        save: () => { throw new Error('repository.save must not be called in cloud-managed mode') },
      }

      const { result } = renderHook(() => useWellnessGame({ initialState, onStateChange, repository, now:() => new Date(2026, 7, 11, 7) }))

      expect(onStateChange).not.toHaveBeenCalled()

      act(() => result.current.setSmoothie([{ ingredientId:'banana', grams:50 }]))

      expect(onStateChange).toHaveBeenCalledTimes(1)
      expect(onStateChange).toHaveBeenLastCalledWith(expect.objectContaining({ smoothie:[{ ingredientId:'banana', grams:50 }] }))
      expect(localStorage.getItem('wellness-rpg:v1')).toBeNull()

      act(() => result.current.complete('recovery'))
      expect(onStateChange).toHaveBeenCalledTimes(2)
    })
  })
})
