// Edge Function: register-username
//
// Creates a new account for a normalized username. The Auth user is created first
// (with a deterministic internal email so duplicate usernames surface naturally as
// duplicate-email errors from the Auth admin API), then the `profiles` row is
// created. If the profile insert fails for any reason, the just-created Auth user
// is deleted so we never leave an orphaned Auth user with no profile
// (compensating transaction). Never logs the request body or password.

import { failResponse, okResponse, toInternalEmail, validateUsername } from '../_shared/auth.ts'
import { corsPreflightResponse } from '../_shared/cors.ts'

interface AdminError {
  message: string
  code?: string
}

/** The minimal Supabase Admin client surface this function depends on. A real
 * `SupabaseClient` created with the service-role key satisfies it. */
export interface RegisterAdminClient {
  auth: {
    admin: {
      createUser(attrs: {
        email: string
        password: string
        email_confirm?: boolean
      }): Promise<{ data: { user: { id: string } | null }; error: AdminError | null }>
      deleteUser(userId: string): Promise<{ error: AdminError | null }>
    }
  }
  from(table: string): {
    insert(row: Record<string, unknown>): Promise<{ error: AdminError | null }>
  }
}

export interface RegisterDeps {
  adminClient: RegisterAdminClient
}

const MIN_PASSWORD_LENGTH = 8

function isDuplicateEmailError(error: AdminError | null): boolean {
  if (!error) return false
  return error.code === 'email_exists' || /already.*registered/i.test(error.message)
}

function isDuplicateUsernameError(error: AdminError | null): boolean {
  if (!error) return false
  return error.code === '23505'
}

export async function handleRegisterUsername(req: Request, deps: RegisterDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return corsPreflightResponse()

  let body: { username?: unknown; password?: unknown }
  try {
    body = await req.json()
  } catch {
    return failResponse('unknown', '요청 본문을 읽을 수 없어요.', 400)
  }

  if (typeof body.username !== 'string' || typeof body.password !== 'string') {
    return failResponse('unknown', '요청 본문이 올바르지 않아요.', 400)
  }

  const validated = validateUsername(body.username)
  if (!validated.ok) {
    return failResponse('invalid-username', '아이디는 영문 소문자, 숫자, 밑줄로 4~24자여야 해요.', 400)
  }
  const { username } = validated
  const password = body.password

  if (password.length < MIN_PASSWORD_LENGTH) {
    return failResponse('weak-password', '비밀번호는 8자 이상이어야 해요.', 400)
  }

  const { adminClient } = deps
  const { data, error } = await adminClient.auth.admin.createUser({
    email: toInternalEmail(username),
    password,
    email_confirm: true,
  })

  if (error || !data.user) {
    if (isDuplicateEmailError(error)) {
      return failResponse('duplicate-username', '이미 사용 중인 아이디예요.', 409)
    }
    return failResponse('unknown', '계정을 생성하지 못했어요.', 500)
  }

  const userId = data.user.id
  const { error: profileError } = await adminClient.from('profiles').insert({ user_id: userId, username })

  if (profileError) {
    // Compensating transaction: the Auth user must not outlive its profile.
    await adminClient.auth.admin.deleteUser(userId)
    if (isDuplicateUsernameError(profileError)) {
      return failResponse('duplicate-username', '이미 사용 중인 아이디예요.', 409)
    }
    return failResponse('unknown', '계정을 생성하지 못했어요.', 500)
  }

  return okResponse({ userId }, 201)
}

if (import.meta.main) {
  Deno.serve(async req => {
    const { createClient } = await import('npm:@supabase/supabase-js@2')
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    ) as unknown as RegisterAdminClient
    return handleRegisterUsername(req, { adminClient })
  })
}
