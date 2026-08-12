// Edge Function: change-password
//
// Lets an authenticated user replace their own password. The target user id comes
// ONLY from verifying the caller's own bearer token -- any `userId` present in the
// request body is ignored, so a caller can never change someone else's password.
// Updates the Auth password via the admin API, then clears the caller's own
// `must_change_password` flag through server credentials. Never returns the
// password value and never logs the request body.

import { authenticateCaller, failResponse, okResponse } from '../_shared/auth.ts'
import { corsPreflightResponse } from '../_shared/cors.ts'

/** The minimal Supabase Admin client surface this function depends on. A real
 * `SupabaseClient` created with the service-role key satisfies it. */
export interface ChangePasswordAdminClient {
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
    update(patch: Record<string, unknown>): {
      eq(column: string, value: unknown): Promise<{ error: unknown }>
    }
  }
}

export interface ChangePasswordDeps {
  adminClient: ChangePasswordAdminClient
}

const MIN_PASSWORD_LENGTH = 8

export async function handleChangePassword(req: Request, deps: ChangePasswordDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return corsPreflightResponse()

  const { adminClient } = deps

  const callerId = await authenticateCaller(adminClient, req)
  if (!callerId) {
    return failResponse('forbidden', '인증이 필요해요.', 401)
  }

  let body: { password?: unknown }
  try {
    body = await req.json()
  } catch {
    return failResponse('unknown', '요청 본문을 읽을 수 없어요.', 400)
  }

  if (typeof body.password !== 'string' || body.password.length < MIN_PASSWORD_LENGTH) {
    return failResponse('weak-password', '비밀번호는 8자 이상이어야 해요.', 400)
  }
  const password = body.password

  // `callerId` (from the verified bearer token) is the only possible target --
  // any `userId` field on the request body, if present, is intentionally never read.
  const { error: updateError } = await adminClient.auth.admin.updateUserById(callerId, { password })
  if (updateError) {
    return failResponse('unknown', '비밀번호를 변경하지 못했어요.', 500)
  }

  const { error: profileUpdateError } = await adminClient
    .from('profiles')
    .update({ must_change_password: false })
    .eq('user_id', callerId)
  if (profileUpdateError) {
    // The Auth password was already changed, but we can no longer guarantee the
    // forced-change flag was actually cleared -- surface this as a failure rather
    // than silently leaving the caller stuck in forced-change mode.
    return failResponse('unknown', '비밀번호는 변경됐지만 계정 상태를 갱신하지 못했어요.', 500)
  }

  return okResponse({})
}

if (import.meta.main) {
  Deno.serve(async req => {
    const { createClient } = await import('npm:@supabase/supabase-js@2')
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    ) as unknown as ChangePasswordAdminClient
    return handleChangePassword(req, { adminClient })
  })
}
