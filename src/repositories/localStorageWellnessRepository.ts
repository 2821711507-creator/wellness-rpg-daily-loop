import type { LoadResult, WellnessRepository } from './wellnessRepository'
const KEY = 'wellness-rpg:v1'
export class LocalStorageWellnessRepository<T = unknown> implements WellnessRepository<T> {
  load(): LoadResult<T> { const raw = localStorage.getItem(KEY); if (!raw) return { state: null }; try { return { state: JSON.parse(raw) as T } } catch { return { state: null, warning: '저장 데이터를 복구하지 못해 새로 시작합니다.' } } }
  save(state: T) { localStorage.setItem(KEY, JSON.stringify(state)) }
}
