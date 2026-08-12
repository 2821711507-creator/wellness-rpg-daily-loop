/** Result of loading a user's cloud wellness state. A `state` of `null` with `revision` 0 means no row exists yet. */
export interface CloudLoadResult<T> {
  state: T | null
  revision: number
}

/** Result of a revision-checked save. `conflict` means another writer moved the revision on; `error` means the request itself failed. */
export type CloudSaveResult = { ok: true; revision: number } | { ok: false; reason: 'conflict' | 'error' }

/** Async, user-scoped counterpart to `WellnessRepository`, backed by `public.wellness_states`. */
export interface CloudWellnessRepository<T> {
  load(userId: string): Promise<CloudLoadResult<T>>
  save(userId: string, state: T, expectedRevision: number): Promise<CloudSaveResult>
}

interface WellnessStateRow {
  state: unknown
  revision: number
}

/** The minimal Supabase client surface this repository depends on. A real `SupabaseClient` satisfies it. */
export interface CloudWellnessClient {
  auth: {
    getUser(): Promise<{ data: { user: { id: string } | null }; error: unknown }>
  }
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): Promise<{ data: WellnessStateRow | null; error: unknown }>
      }
    }
  }
  rpc(
    fn: string,
    args: { next_state: unknown; expected_revision: number },
  ): Promise<{ data: Array<{ revision: number }> | null; error: unknown }>
}

async function assertActiveUser(client: CloudWellnessClient, userId: string): Promise<void> {
  const { data, error } = await client.auth.getUser()
  if (error || data.user?.id !== userId) {
    throw new Error('요청한 사용자 ID가 활성 세션과 일치하지 않습니다.')
  }
}

async function load<T>(client: CloudWellnessClient, userId: string): Promise<CloudLoadResult<T>> {
  await assertActiveUser(client, userId)
  const { data, error } = await client.from('wellness_states').select('state,revision').eq('user_id', userId).maybeSingle()
  if (error) throw new Error('클라우드 상태를 불러오지 못했습니다.')
  if (!data) return { state: null, revision: 0 }
  return { state: data.state as T, revision: data.revision }
}

async function save<T>(client: CloudWellnessClient, userId: string, state: T, expectedRevision: number): Promise<CloudSaveResult> {
  await assertActiveUser(client, userId)
  const { data, error } = await client.rpc('save_wellness_state', { next_state: state, expected_revision: expectedRevision })
  if (error) return { ok: false, reason: 'error' }
  const row = data?.[0]
  if (!row) return { ok: false, reason: 'conflict' }
  return { ok: true, revision: row.revision }
}

/** Creates a `CloudWellnessRepository` backed by the given Supabase-like client. */
export function createCloudWellnessRepository<T>(client: CloudWellnessClient): CloudWellnessRepository<T> {
  return {
    load: userId => load<T>(client, userId),
    save: (userId, state, expectedRevision) => save<T>(client, userId, state, expectedRevision),
  }
}
