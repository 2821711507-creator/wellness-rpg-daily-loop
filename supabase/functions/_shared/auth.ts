// Shared helpers for the auth Edge Functions (registration, recovery, admin reset,
// and password change). Deliberately dependency-free and self-contained: it does
// NOT import from `src/` even though `AuthErrorCode` and username validation exist
// there already, because a Supabase Edge Function deployment only uploads
// `supabase/functions/**`, so anything reachable from these handlers must live here.

import { corsHeaders } from './cors.ts'

/** Mirrors `AuthErrorCode` from `src/auth/authTypes.ts`. Duplicated on purpose (see
 * above) -- keep the two in sync by hand if the set of codes ever changes. */
export type AuthErrorCode =
  | 'invalid-credentials'
  | 'duplicate-username'
  | 'invalid-username'
  | 'weak-password'
  | 'rate-limited'
  | 'network'
  | 'forbidden'
  | 'unknown'

const USERNAME_PATTERN = /^[a-z0-9_]{4,24}$/

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase()
}

/** Mirrors `validateUsername` from `src/auth/username.ts`. See the module note above. */
export function validateUsername(value: string): { ok: true; username: string } | { ok: false } {
  const username = normalizeUsername(value)
  return USERNAME_PATTERN.test(username) ? { ok: true, username } : { ok: false }
}

export function toInternalEmail(username: string): string {
  return `${username}@users.internal`
}

/** Every response (success and error alike) goes through here, so every response
 * -- including a preflight-adjacent 400/401/403/404/409/500 -- carries the CORS
 * headers a browser needs to read the body cross-origin (see `_shared/cors.ts`). */
export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

/** Builds the `{ ok:true, ... }` success envelope every handler returns. */
export function okResponse(value: Record<string, unknown> = {}, status = 200): Response {
  return jsonResponse(status, { ok: true, ...value })
}

/** Builds the `{ ok:false, code, message }` failure envelope every handler returns. */
export function failResponse(code: AuthErrorCode, message: string, status: number): Response {
  return jsonResponse(status, { ok: false, code, message })
}

export function getBearerToken(req: Request): string | null {
  const header = req.headers.get('Authorization') ?? req.headers.get('authorization')
  if (!header) return null
  const match = /^Bearer\s+(.+)$/i.exec(header)
  return match ? match[1] : null
}

/** Minimal shape needed to resolve a bearer token to a caller id via the Auth admin API. */
export interface BearerAuthClient {
  auth: {
    getUser(jwt: string): Promise<{ data: { user: { id: string } | null }; error: unknown }>
  }
}

/** Verifies the request's bearer token against the Auth admin API and returns the
 * caller's user id, or `null` if the token is missing or invalid. Never trusts a
 * client-supplied user id -- this is the only source of "who is calling". */
export async function authenticateCaller(client: BearerAuthClient, req: Request): Promise<string | null> {
  const token = getBearerToken(req)
  if (!token) return null
  const { data, error } = await client.auth.getUser(token)
  if (error || !data.user) return null
  return data.user.id
}

/** Minimal shape needed to look up a caller's role from `public.profiles`. The
 * query-result row is left as `Record<string, unknown>` (rather than a precise
 * `{ role }` type) so this structurally matches the wider `from()` builders that
 * the admin-reset and registration handlers also need (e.g. supporting `.eq()`
 * chained more than once) -- see each handler's own client interface. */
export interface ProfileRoleClient {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: unknown }>
      }
    }
  }
}

export async function loadCallerRole(client: ProfileRoleClient, userId: string): Promise<'user' | 'admin' | null> {
  const { data, error } = await client.from('profiles').select('role').eq('user_id', userId).maybeSingle()
  if (error || !data) return null
  return data.role === 'admin' ? 'admin' : 'user'
}

const TEMP_PASSWORD_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'

/**
 * A cryptographically random 16-character temporary password (`crypto.getRandomValues`,
 * never `Math.random`). The 64-character alphabet is a power of two, so masking each
 * random byte with `& 63` yields a uniformly distributed index with no modulo bias.
 * Callers must return this value in exactly one response body and never persist or log it.
 */
export function generateTemporaryPassword(length = 16): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let result = ''
  for (const byte of bytes) result += TEMP_PASSWORD_ALPHABET[byte & 63]
  return result
}
