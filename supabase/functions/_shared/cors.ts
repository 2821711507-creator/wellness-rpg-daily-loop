// Shared CORS handling for the auth Edge Functions.
//
// A real browser call via `supabase.functions.invoke()` sends non-simple headers
// (Authorization, apikey, x-client-info), which triggers a CORS preflight `OPTIONS`
// request. Without these headers on every response (including error responses) and
// without handling the `OPTIONS` request itself, none of these functions are
// reachable from a real deployed frontend, even though they work fine when called
// directly (as the other tests in this file do -- those never go through a browser's
// CORS layer).
//
// `Access-Control-Allow-Origin: *` is deliberately permissive: every one of these
// functions already authenticates the caller itself (bearer token verification or,
// for registration/recovery, no ambient trust at all), so there is no session-cookie
// -based capability that a permissive origin could ride on.

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** The `OPTIONS` preflight response every handler must return before doing anything else. */
export function corsPreflightResponse(): Response {
  return new Response('ok', { headers: corsHeaders })
}
