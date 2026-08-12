// Edge Function: admin-reset-password
//
// Called from the (future) admin UI to resolve a pending recovery request. Verifies
// the caller's bearer token AND that their `profiles.role === 'admin'` before doing
// anything else -- a non-admin caller (even a valid, authenticated one) gets 403.
// Generates a cryptographically random 16-character temporary password, sets it via
// the Auth admin API, forces `must_change_password = true` on the target profile,
// and marks the recovery request resolved. The temporary password is returned ONLY
// in this response body -- it is never persisted or logged.

import { authenticateCaller, failResponse, generateTemporaryPassword, loadCallerRole, okResponse } from '../_shared/auth.ts'
import { corsPreflightResponse } from '../_shared/cors.ts'

interface MaybeSingleResult {
  data: Record<string, unknown> | null
  error: unknown
}

interface EqChain {
  eq(column: string, value: unknown): EqChain
  maybeSingle(): Promise<MaybeSingleResult>
}

interface UpdateBuilder {
  eq(column: string, value: unknown): Promise<{ error: unknown }>
}

/** The minimal Supabase Admin client surface this function depends on. A real
 * `SupabaseClient` created with the service-role key satisfies it. */
export interface AdminResetAdminClient {
  auth: {
    getUser(jwt: string): Promise<{ data: { user: { id: string } | null }; error: unknown }>
    admin: {
      updateUserById(
        userId: string,
        attrs: { password: string },
      ): Promise<{ data: { user: { id: string } | null }; error: unknown }>
    }
  }
  from(table: string): {
    select(columns: string): EqChain
    update(patch: Record<string, unknown>): UpdateBuilder
  }
}

export interface AdminResetDeps {
  adminClient: AdminResetAdminClient
}

export async function handleAdminResetPassword(req: Request, deps: AdminResetDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return corsPreflightResponse()

  const { adminClient } = deps

  const callerId = await authenticateCaller(adminClient, req)
  if (!callerId) {
    return failResponse('forbidden', '인증이 필요해요.', 401)
  }

  const role = await loadCallerRole(adminClient, callerId)
  if (role !== 'admin') {
    return failResponse('forbidden', '관리자만 사용할 수 있어요.', 403)
  }

  let body: { requestId?: unknown }
  try {
    body = await req.json()
  } catch {
    return failResponse('unknown', '요청 본문을 읽을 수 없어요.', 400)
  }

  if (typeof body.requestId !== 'string') {
    return failResponse('unknown', '요청 본문이 올바르지 않아요.', 400)
  }
  const requestId = body.requestId

  const { data: recoveryRequest } = await adminClient
    .from('password_recovery_requests')
    .select('id,user_id,status')
    .eq('id', requestId)
    .maybeSingle()

  if (!recoveryRequest) {
    return failResponse('unknown', '요청을 찾을 수 없어요.', 404)
  }
  if (recoveryRequest.status !== 'pending') {
    return failResponse('unknown', '이미 처리된 요청이에요.', 409)
  }

  const targetUserId = recoveryRequest.user_id as string
  const temporaryPassword = generateTemporaryPassword()

  const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUserId, {
    password: temporaryPassword,
  })
  if (updateError) {
    return failResponse('unknown', '비밀번호를 재설정하지 못했어요.', 500)
  }

  const { error: profileUpdateError } = await adminClient
    .from('profiles')
    .update({ must_change_password: true })
    .eq('user_id', targetUserId)
  if (profileUpdateError) {
    // The Auth password was already reset, but we can no longer guarantee the
    // "forces replacement at next login" flag was set -- do not hand back the
    // temporary password as if this succeeded.
    return failResponse('unknown', '비밀번호를 재설정했지만 계정 상태를 갱신하지 못했어요.', 500)
  }

  const { error: resolveError } = await adminClient
    .from('password_recovery_requests')
    .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: callerId })
    .eq('id', requestId)
  if (resolveError) {
    return failResponse('unknown', '요청 처리 상태를 갱신하지 못했어요.', 500)
  }

  return okResponse({ temporaryPassword })
}

if (import.meta.main) {
  Deno.serve(async req => {
    const { createClient } = await import('npm:@supabase/supabase-js@2')
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    ) as unknown as AdminResetAdminClient
    return handleAdminResetPassword(req, { adminClient })
  })
}
