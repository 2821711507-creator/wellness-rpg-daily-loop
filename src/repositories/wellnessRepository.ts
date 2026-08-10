export interface LoadResult<T = unknown> { state: T | null; warning?: string }
export interface WellnessRepository<T = unknown> { load(): LoadResult<T>; save(state: T): void }
