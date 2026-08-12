// Client-side feedback service: any authenticated user may submit feedback
// (RLS `feedback_insert_own` on `public.feedback` -- see
// `supabase/migrations/202608121000_user_feedback.sql` -- restricts the
// insert to the caller's own `user_id`, so this module never needs an Edge
// Function or the service-role key, unlike password recovery). Listing all
// feedback is restricted server-side to administrators by
// `feedback_select_admin`; a non-admin caller's query is simply filtered to
// zero rows by RLS, not rejected, so `listAll` is safe to call from any
// session but only ever returns data for one.

import type { AuthErrorCode, AuthResult } from '../auth/authTypes'

export interface FeedbackEntry {
  id: string
  username: string
  message: string
  createdAt: string
}

interface InsertResult { error: unknown }
interface ListQueryResult { data: Record<string, unknown>[] | null; error: unknown }
interface FeedbackOrderChain { order(column: string, options: { ascending: boolean }): Promise<ListQueryResult> }

/** The minimal Supabase client surface this service depends on -- a real
 * `SupabaseClient` satisfies it. See `AdminRecoveryClient` for the same
 * convention of leaving row shapes as `Record<string, unknown>`. */
export interface FeedbackClient {
  from(table: string): {
    insert(row: Record<string, unknown>): Promise<InsertResult>
    select(columns: string): FeedbackOrderChain & { in(column: string, values: string[]): Promise<ListQueryResult> }
  }
}

export interface FeedbackService {
  submit(userId: string, message: string): Promise<AuthResult<void>>
  listAll(): Promise<AuthResult<FeedbackEntry[]>>
}

const DEFAULT_MESSAGES: Partial<Record<AuthErrorCode, string>> = {
  network: '네트워크 연결을 확인해 주세요.',
  unknown: '알 수 없는 오류가 발생했어요. 잠시 후 다시 시도해 주세요.',
}

function failure<T>(code: AuthErrorCode, message?: string): AuthResult<T> {
  return { ok: false, code, message: message ?? DEFAULT_MESSAGES[code] ?? DEFAULT_MESSAGES.unknown! }
}

async function submit(client: FeedbackClient, userId: string, message: string): Promise<AuthResult<void>> {
  const trimmed = message.trim()
  if (!trimmed) return failure('unknown', '피드백 내용을 입력해 주세요.')

  const { error } = await client.from('feedback').insert({ user_id: userId, message: trimmed })
  if (error) return failure('unknown', '피드백을 보내지 못했어요.')

  return { ok: true, value: undefined }
}

/** Mirrors `AdminRecoveryService.listPending()`'s two-query join: `feedback`
 * and `profiles` are sibling tables with no foreign key between them, so
 * PostgREST cannot embed one inside the other. A row whose owning profile
 * can no longer be found (should not happen in practice) is silently
 * omitted rather than shown with a missing username. */
async function listAll(client: FeedbackClient): Promise<AuthResult<FeedbackEntry[]>> {
  const { data: rows, error } = await client
    .from('feedback')
    .select('id,user_id,message,created_at')
    .order('created_at', { ascending: false })

  if (error || !rows) return failure('unknown', '피드백을 불러오지 못했어요.')
  if (rows.length === 0) return { ok: true, value: [] }

  const userIds = [...new Set(rows.map(row => row.user_id as string))]
  const { data: profiles, error: profilesError } = await client
    .from('profiles')
    .select('user_id,username')
    .in('user_id', userIds)

  if (profilesError) return failure('unknown', '사용자 정보를 불러오지 못했어요.')

  const usernameByUserId = new Map((profiles ?? []).map(row => [row.user_id as string, row.username as string]))

  const entries: FeedbackEntry[] = []
  for (const row of rows) {
    const username = usernameByUserId.get(row.user_id as string)
    if (username) entries.push({ id: row.id as string, username, message: row.message as string, createdAt: row.created_at as string })
  }

  return { ok: true, value: entries }
}

export function createFeedbackService(client: FeedbackClient): FeedbackService {
  return {
    submit: (userId, message) => submit(client, userId, message),
    listAll: () => listAll(client),
  }
}
