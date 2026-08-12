import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js'
import type { AuthErrorCode, AuthResult, AuthService, AuthSession } from './authTypes'
import { validateUsername } from './username'

const INTERNAL_EMAIL_DOMAIN = '@users.internal'

const ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  'invalid-credentials': '아이디 또는 비밀번호가 올바르지 않아요.',
  'duplicate-username': '이미 사용 중인 아이디예요.',
  'invalid-username': '아이디는 영문 소문자, 숫자, 밑줄로 4~24자여야 해요.',
  'weak-password': '비밀번호는 8자 이상이어야 해요.',
  'rate-limited': '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.',
  network: '네트워크 연결을 확인해 주세요.',
  forbidden: '권한이 없어요.',
  unknown: '알 수 없는 오류가 발생했어요. 잠시 후 다시 시도해 주세요.',
}

const KNOWN_ERROR_CODES = new Set<AuthErrorCode>(Object.keys(ERROR_MESSAGES) as AuthErrorCode[])

interface RawAuthUser {
  id: string
  email?: string | null
}

interface RawSession {
  access_token: string
  user: RawAuthUser
}

interface RawAuthError {
  name?: string
  status?: number
  code?: string
}

interface ProfileRow {
  role: 'user' | 'admin'
  must_change_password: boolean
}

/** The minimal Supabase client surface this service depends on. A real `SupabaseClient` satisfies it. */
export interface SupabaseAuthClient {
  auth: {
    signInWithPassword(credentials: {
      email: string
      password: string
    }): Promise<{ data: { session: RawSession | null } | null; error: RawAuthError | null }>
    getSession(): Promise<{ data: { session: RawSession | null } | null; error: RawAuthError | null }>
    onAuthStateChange(
      callback: (event: string, session: RawSession | null) => void,
    ): { data: { subscription: { unsubscribe(): void } } }
    signOut(): Promise<{ error: RawAuthError | null }>
  }
  functions: {
    invoke(name: string, options?: { body?: unknown }): Promise<{ data: unknown; error: unknown }>
  }
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): Promise<{ data: ProfileRow | null; error: unknown }>
      }
    }
  }
}

function toInternalEmail(username: string) {
  return `${username}${INTERNAL_EMAIL_DOMAIN}`
}

function usernameFromEmail(email: string | null | undefined): string | null {
  if (!email || !email.endsWith(INTERNAL_EMAIL_DOMAIN)) return null
  return email.slice(0, -INTERNAL_EMAIL_DOMAIN.length)
}

function normalizeErrorCode(value: unknown): AuthErrorCode {
  return typeof value === 'string' && KNOWN_ERROR_CODES.has(value as AuthErrorCode) ? (value as AuthErrorCode) : 'unknown'
}

function failure<T>(code: AuthErrorCode, message?: string): AuthResult<T> {
  return { ok: false, code, message: message ?? ERROR_MESSAGES[code] }
}

function authErrorResult<T>(error: RawAuthError | null | undefined): AuthResult<T> {
  if (!error) return failure('unknown')
  if (error.name === 'AuthRetryableFetchError') return failure('network')
  if (error.code === 'invalid_credentials') return failure('invalid-credentials')
  if (error.code === 'over_request_rate_limit' || error.status === 429) return failure('rate-limited')
  if (error.code === 'weak_password') return failure('weak-password')
  if (error.status === 400 || error.status === 401) return failure('invalid-credentials')
  if (error.status === 403) return failure('forbidden')
  return failure('unknown')
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

async function loadProfile(client: SupabaseAuthClient, userId: string): Promise<ProfileRow | null> {
  const { data, error } = await client.from('profiles').select('role,must_change_password').eq('user_id', userId).maybeSingle()
  if (error || !data) return null
  return data
}

async function toAuthSession(client: SupabaseAuthClient, session: RawSession | null): Promise<AuthSession | null> {
  if (!session) return null
  const username = usernameFromEmail(session.user.email)
  if (!username) return null
  const profile = await loadProfile(client, session.user.id)
  if (!profile) return null
  return {
    accessToken: session.access_token,
    user: { id: session.user.id, username, role: profile.role, mustChangePassword: profile.must_change_password },
  }
}

async function login(client: SupabaseAuthClient, usernameInput: string, password: string): Promise<AuthResult<AuthSession>> {
  const validated = validateUsername(usernameInput)
  if (!validated.ok) return failure('invalid-username', validated.message)
  const { username } = validated

  const { data, error } = await client.auth.signInWithPassword({ email: toInternalEmail(username), password })
  if (error) return authErrorResult(error)

  const session = data?.session ?? null
  if (!session) return failure('unknown')

  const profile = await loadProfile(client, session.user.id)
  if (!profile) return failure('unknown')

  return {
    ok: true,
    value: {
      accessToken: session.access_token,
      user: { id: session.user.id, username, role: profile.role, mustChangePassword: profile.must_change_password },
    },
  }
}

async function register(client: SupabaseAuthClient, usernameInput: string, password: string): Promise<AuthResult<AuthSession>> {
  const validated = validateUsername(usernameInput)
  if (!validated.ok) return failure('invalid-username', validated.message)
  const { username } = validated

  const { error } = await client.functions.invoke('register-username', { body: { username, password } })
  if (error) {
    const mapped = await mapFunctionsError(error)
    return failure(mapped.code, mapped.message)
  }

  return login(client, username, password)
}

async function requestRecovery(client: SupabaseAuthClient, usernameInput: string): Promise<AuthResult<void>> {
  const validated = validateUsername(usernameInput)
  if (!validated.ok) return failure('invalid-username', validated.message)

  const { error } = await client.functions.invoke('request-password-recovery', { body: { username: validated.username } })
  if (error) {
    const mapped = await mapFunctionsError(error)
    return failure(mapped.code, mapped.message)
  }

  return { ok: true, value: undefined }
}

async function changePassword(client: SupabaseAuthClient, password: string): Promise<AuthResult<void>> {
  const { error } = await client.functions.invoke('change-password', { body: { password } })
  if (error) {
    const mapped = await mapFunctionsError(error)
    return failure(mapped.code, mapped.message)
  }

  return { ok: true, value: undefined }
}

async function logout(client: SupabaseAuthClient): Promise<void> {
  await client.auth.signOut()
}

async function currentSession(client: SupabaseAuthClient): Promise<AuthSession | null> {
  const { data } = await client.auth.getSession()
  return toAuthSession(client, data?.session ?? null)
}

function onSessionChange(client: SupabaseAuthClient, listener: (session: AuthSession | null) => void): () => void {
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    // Deliberately deferred (via a macrotask) out of this synchronous callback:
    // supabase-js documents that starting a new Supabase call directly inside
    // `onAuthStateChange`'s callback is a deadlock hazard, since the callback runs
    // while an internal auth lock is held. `toAuthSession` below issues a `profiles`
    // query, so it must never run before this callback has returned.
    setTimeout(() => {
      if (!session) {
        // An actual sign-out (no session at all) -- always a real logout.
        listener(null)
        return
      }
      // A session exists: only forward it once resolved. If `toAuthSession` resolves
      // `null` here, that means the profile lookup itself failed or returned no row --
      // NOT that the user signed out. Calling `listener(null)` in that case would read
      // as a logout to `useAuth` and kick a still-validly-authenticated user back to the
      // login screen over what may be a transient fetch failure. Simply not calling the
      // listener preserves whatever session/user state the app already had.
      void toAuthSession(client, session).then(resolved => { if (resolved) listener(resolved) })
    }, 0)
  })
  return () => data.subscription.unsubscribe()
}

export function createSupabaseAuthService(client: SupabaseAuthClient): AuthService {
  return {
    currentSession: () => currentSession(client),
    onSessionChange: listener => onSessionChange(client, listener),
    login: (username, password) => login(client, username, password),
    register: (username, password) => register(client, username, password),
    requestRecovery: username => requestRecovery(client, username),
    changePassword: password => changePassword(client, password),
    logout: () => logout(client),
  }
}
