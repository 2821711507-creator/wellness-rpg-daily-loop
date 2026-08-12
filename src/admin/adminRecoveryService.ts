// Client-side administrator recovery service: lists pending recovery requests (id,
// username, requested time only -- no other profile fields) and resolves one by
// invoking the `admin-reset-password` Edge Function. The Edge Function itself
// re-verifies the caller's bearer token and admin role server-side (see
// `supabase/functions/admin-reset-password/index.ts`), so a non-admin caller is
// rejected with 403 regardless of what this client-side code does -- this module
// never trusts the caller's own role to gate the reset call.
//
// The temporary password returned by a successful reset is handed back to the
// caller exactly once, in the resolved value, and is never read again: this
// module has no cache, storage, or logging of it anywhere.

import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js'
import type { AuthErrorCode, AuthResult } from '../auth/authTypes'

export interface PendingRecoveryRequest {
  id: string
  username: string
  requestedAt: string
}

interface ListQueryResult {
  data: Record<string, unknown>[] | null
  error: unknown
}

interface RecoveryEqChain {
  order(column: string, options: { ascending: boolean }): Promise<ListQueryResult>
}

/** The minimal Supabase client surface this service depends on. A real `SupabaseClient`
 * satisfies it. Row shapes are left as `Record<string, unknown>` (rather than precise
 * per-table types) because the same builder interface serves both the
 * `password_recovery_requests` and `profiles` queries -- see `handleAdminResetPassword`'s
 * client interface for the same convention. */
export interface AdminRecoveryClient {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): RecoveryEqChain
      in(column: string, values: string[]): Promise<ListQueryResult>
    }
  }
  functions: {
    invoke(name: string, options?: { body?: unknown }): Promise<{ data: unknown; error: unknown }>
  }
}

export interface AdminRecoveryService {
  listPending(): Promise<AuthResult<PendingRecoveryRequest[]>>
  reset(requestId: string): Promise<AuthResult<string>>
}

const DEFAULT_MESSAGES: Partial<Record<AuthErrorCode, string>> = {
  forbidden: '관리자만 사용할 수 있어요.',
  network: '네트워크 연결을 확인해 주세요.',
  unknown: '알 수 없는 오류가 발생했어요. 잠시 후 다시 시도해 주세요.',
}

function failure<T>(code: AuthErrorCode, message?: string): AuthResult<T> {
  return { ok: false, code, message: message ?? DEFAULT_MESSAGES[code] ?? DEFAULT_MESSAGES.unknown! }
}

function normalizeErrorCode(value: unknown): AuthErrorCode {
  return typeof value === 'string' ? (value as AuthErrorCode) : 'unknown'
}

async function mapFunctionsError(error: unknown): Promise<{ code: AuthErrorCode; message?: string }> {
  if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) {
    return { code: 'network' }
  }
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json()
      const message = typeof body?.message === 'string' ? body.message : undefined
      return { code: normalizeErrorCode(body?.code), message }
    } catch {
      return { code: 'unknown' }
    }
  }
  return { code: 'unknown' }
}

/**
 * Fetches pending recovery requests and joins in each requester's username. This is
 * two queries (not a single embedded select) because `password_recovery_requests` and
 * `profiles` are sibling tables -- both reference `auth.users`, but neither has a
 * foreign key to the other -- so PostgREST cannot embed one inside the other. A
 * request whose owning profile can no longer be found (should not happen in practice)
 * is silently omitted rather than shown with a missing username.
 */
async function listPending(client: AdminRecoveryClient): Promise<AuthResult<PendingRecoveryRequest[]>> {
  const { data: requests, error: requestsError } = await client
    .from('password_recovery_requests')
    .select('id,user_id,requested_at')
    .eq('status', 'pending')
    .order('requested_at', { ascending: true })

  if (requestsError || !requests) return failure('unknown', '대기 중인 요청을 불러오지 못했어요.')
  if (requests.length === 0) return { ok: true, value: [] }

  const userIds = [...new Set(requests.map(row => row.user_id as string))]
  const { data: profiles, error: profilesError } = await client
    .from('profiles')
    .select('user_id,username')
    .in('user_id', userIds)

  if (profilesError) return failure('unknown', '사용자 정보를 불러오지 못했어요.')

  const usernameByUserId = new Map((profiles ?? []).map(row => [row.user_id as string, row.username as string]))

  const pending: PendingRecoveryRequest[] = []
  for (const row of requests) {
    const username = usernameByUserId.get(row.user_id as string)
    if (username) pending.push({ id: row.id as string, username, requestedAt: row.requested_at as string })
  }

  return { ok: true, value: pending }
}

async function reset(client: AdminRecoveryClient, requestId: string): Promise<AuthResult<string>> {
  const { data, error } = await client.functions.invoke('admin-reset-password', { body: { requestId } })
  if (error) {
    const mapped = await mapFunctionsError(error)
    return failure(mapped.code, mapped.message)
  }

  const temporaryPassword = (data as { temporaryPassword?: unknown } | null)?.temporaryPassword
  if (typeof temporaryPassword !== 'string') return failure('unknown')

  return { ok: true, value: temporaryPassword }
}

export function createAdminRecoveryService(client: AdminRecoveryClient): AdminRecoveryService {
  return {
    listPending: () => listPending(client),
    reset: requestId => reset(client, requestId),
  }
}
