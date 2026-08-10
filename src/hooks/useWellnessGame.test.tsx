import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { WellnessRepository } from '../repositories/wellnessRepository'
import { useWellnessGame, type WellnessState } from './useWellnessGame'

describe('useWellnessGame weekly plans', () => {
  beforeEach(() => localStorage.clear())

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
})
