import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { WellnessRepository } from '../repositories/wellnessRepository'
import { useWellnessGame, type WellnessState } from './useWellnessGame'

describe('useWellnessGame weekly plans', () => {
  beforeEach(() => localStorage.clear())

  it('starts with the normalized layered avatar defaults', () => {
    const { result } = renderHook(() => useWellnessGame())
    expect(result.current.state.avatar).toMatchObject({ gender:'male', skin:'medium', equipped:{ hair:'hair-short', top:'top-runner' } })
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
    expect(result.current.mutationMessage).toBe('오늘 기록을 저장했어요.')
    act(() => result.current.saveWeight(72.1))
    expect(result.current.state.weightEntries).toHaveLength(1)
    expect(result.current.state.weightEntries?.[0].weightKg).toBe(72.1)
    act(() => result.current.deleteWeight('2026-08-11'))
    expect(result.current.state.weightEntries).toEqual([])
  })

  it('records a planned completion event and xp exactly once', () => {
    const { result } = renderHook(() => useWellnessGame({ now:() => new Date(2026, 7, 10, 12) }))
    act(() => result.current.generatePlan({ mealsPerDay:2, smoothieSlots:['breakfast'], activitiesPerWeek:2, activityMix:{ gym:1, home:1, walk:0 } }))
    act(() => result.current.complete('activity'))
    expect(result.current.state.completionEvents).toEqual([expect.objectContaining({ date:'2026-08-10', kind:'planned-activity', xpEarned:40 })])
    act(() => result.current.complete('activity'))
    expect(result.current.state.completionEvents).toHaveLength(1)
  })
})
