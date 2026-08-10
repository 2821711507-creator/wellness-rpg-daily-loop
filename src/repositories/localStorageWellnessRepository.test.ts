import { describe, expect, it } from 'vitest'
import { LocalStorageWellnessRepository } from './localStorageWellnessRepository'

describe('LocalStorageWellnessRepository', () => {
  it('returns a recovery warning for malformed JSON', () => {
    localStorage.setItem('wellness-rpg:v1', '{bad')
    expect(new LocalStorageWellnessRepository().load()).toEqual({ state: null, warning: '저장 데이터를 복구하지 못해 새로 시작합니다.' })
  })
  it('restores valid versioned state', () => {
    const value = { version: 1, marker: 'saved' }
    localStorage.setItem('wellness-rpg:v1', JSON.stringify(value))
    expect(new LocalStorageWellnessRepository().load().state).toEqual(value)
  })
})
