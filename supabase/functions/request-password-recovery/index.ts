// Edge Function: request-password-recovery
//
// Looks up the target user by normalized username using server (service-role)
// credentials only -- the caller never supplies a user id. Ensures at most one
// pending recovery request exists per user (an upsert-by-lookup, which doubles as
// rate-limiting: repeated requests for the same username while one is already
// pending are no-ops, so they cannot pile up recovery rows). Always returns the
// same generic "accepted" response regardless of whether the username exists, so
// the response cannot be used to enumerate registered usernames.

import { failResponse, okResponse, validateUsername } from '../_shared/auth.ts'
import { corsPreflightResponse } from '../_shared/cors.ts'

interface MaybeSingleResult {
  data: Record<string, unknown> | null
  error: unknown
}

interface EqChain {
  eq(column: string, value: unknown): EqChain
  maybeSingle(): Promise<MaybeSingleResult>
}

/** The minimal Supabase Admin client surface this function depends on. A real
 * `SupabaseClient` created with the service-role key satisfies it. */
export interface RecoveryAdminClient {
  from(table: string): {
    select(columns: string): EqChain
    insert(row: Record<string, unknown>): Promise<{ error: unknown }>
  }
}

export interface RecoveryDeps {
  adminClient: RecoveryAdminClient
}

/** The one response every caller gets, whether or not `username` matched an account. */
function acceptedResponse(): Response {
  return okResponse({ accepted: true }, 202)
}

export async function handleRequestPasswordRecovery(req: Request, deps: RecoveryDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return corsPreflightResponse()

  let body: { username?: unknown }
  try {
    body = await req.json()
  } catch {
    return failResponse('unknown', '요청 본문을 읽을 수 없어요.', 400)
  }

  if (typeof body.username !== 'string') {
    return failResponse('unknown', '요청 본문이 올바르지 않아요.', 400)
  }

  const validated = validateUsername(body.username)
  if (!validated.ok) {
    return failResponse('invalid-username', '아이디는 영문 소문자, 숫자, 밑줄로 4~24자여야 해요.', 400)
  }

  const { adminClient } = deps
  const { data: profile } = await adminClient
    .from('profiles')
    .select('user_id')
    .eq('username', validated.username)
    .maybeSingle()

  if (profile) {
    const userId = profile.user_id as string
    const { data: pending } = await adminClient
      .from('password_recovery_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .maybeSingle()

    if (!pending) {
      await adminClient.from('password_recovery_requests').insert({ user_id: userId, status: 'pending' })
    }
  }

  // Reached whether or not `profile` was found -- do not branch the response on it.
  return acceptedResponse()
}

if (import.meta.main) {
  Deno.serve(async req => {
    const { createClient } = await import('npm:@supabase/supabase-js@2')
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    ) as unknown as RecoveryAdminClient
    return handleRequestPasswordRecovery(req, { adminClient })
  })
}
