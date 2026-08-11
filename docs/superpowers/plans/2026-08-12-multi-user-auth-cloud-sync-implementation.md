# Multi-User Authentication and Cloud Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add username/password accounts, private Supabase-backed wellness state, one-time legacy migration, and administrator-assisted password recovery.

**Architecture:** Supabase Auth owns passwords and sessions; PostgreSQL RLS owns authorization; Edge Functions own privileged registration and reset operations. React is split into an authentication shell and the existing wellness app, with asynchronous cloud persistence behind a user-scoped repository and a small pending-save cache.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, `@supabase/supabase-js`, Supabase PostgreSQL/RLS, Supabase Edge Functions.

## Global Constraints

- The public UI accepts a normalized username and password; it does not require an email address.
- Usernames are trimmed, lowercased, 4–24 characters, and contain only ASCII letters, numbers, and underscore.
- Passwords are at least 8 characters and are never stored in application tables or logs.
- The service-role key is server-only and must never enter a `VITE_*` variable or client bundle.
- RLS must deny cross-user profile and wellness-state access.
- Existing `wellness-rpg:v1` data is removed only after a successful, idempotent first-account migration.
- Administrator reset displays a temporary password once and forces replacement at next login.
- Existing application behavior and tests remain supported through test doubles.
- Simultaneous cross-device editing uses revision conflict detection; automatic merge is out of scope.

---

## File Map

- `src/auth/authTypes.ts`: stable auth/session/service contracts.
- `src/auth/username.ts`: username normalization and validation.
- `src/auth/supabaseAuthService.ts`: public client auth commands and Edge Function calls.
- `src/cloud/cloudWellnessRepository.ts`: asynchronous user-scoped state load/save with revisions.
- `src/cloud/legacyStateMigrator.ts`: one-time validated localStorage import.
- `src/hooks/useAuth.ts`: auth session lifecycle.
- `src/hooks/useCloudWellness.ts`: remote loading, queued saves, retry, and conflict state.
- `src/components/AuthScreen.tsx`: login, registration, and recovery request UI.
- `src/components/ForcePasswordChangeScreen.tsx`: mandatory password replacement.
- `src/components/SyncStatus.tsx`: cloud persistence feedback.
- `src/components/AdminRecoveryScreen.tsx`: administrator recovery queue.
- `supabase/migrations/202608120001_multi_user_auth.sql`: tables, indexes, functions, triggers, and RLS.
- `supabase/functions/register-username/index.ts`: privileged account/profile creation.
- `supabase/functions/request-password-recovery/index.ts`: enumeration-resistant recovery request.
- `supabase/functions/admin-reset-password/index.ts`: administrator-only temporary reset.
- `supabase/functions/change-password/index.ts`: authenticated password replacement and forced-change flag clearing.
- `src/App.tsx`: auth gate and authenticated application composition.

### Task 1: Username and Authentication Contracts

**Files:**
- Create: `src/auth/authTypes.ts`
- Create: `src/auth/username.ts`
- Create: `src/auth/username.test.ts`

**Interfaces:**
- Produces: `normalizeUsername(value:string):string`, `validateUsername(value:string): { ok:true; username:string } | { ok:false; message:string }`.
- Produces: `AuthUser`, `AuthSession`, `AuthService`, and `AuthErrorCode` used by Tasks 3–8.

- [ ] **Step 1: Write failing username tests**

```ts
import { describe, expect, it } from 'vitest'
import { normalizeUsername, validateUsername } from './username'

describe('username', () => {
  it('normalizes a valid username', () => expect(normalizeUsername('  Runner_01 ')).toBe('runner_01'))
  it.each(['abc', '한글이름', 'space name', 'a'.repeat(25)])('rejects %s', value => {
    expect(validateUsername(value)).toEqual({ ok:false, message:'아이디는 영문 소문자, 숫자, 밑줄로 4~24자여야 해요.' })
  })
})
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- src/auth/username.test.ts`
Expected: FAIL because `./username` does not exist.

- [ ] **Step 3: Implement the contracts and validation**

```ts
export type AuthErrorCode = 'invalid-credentials'|'duplicate-username'|'invalid-username'|'weak-password'|'rate-limited'|'network'|'forbidden'|'unknown'
export interface AuthUser { id:string; username:string; role:'user'|'admin'; mustChangePassword:boolean }
export interface AuthSession { accessToken:string; user:AuthUser }
export type AuthResult<T> = { ok:true; value:T } | { ok:false; code:AuthErrorCode; message:string }
export interface AuthService {
  currentSession():Promise<AuthSession|null>
  onSessionChange(listener:(session:AuthSession|null)=>void):()=>void
  login(username:string,password:string):Promise<AuthResult<AuthSession>>
  register(username:string,password:string):Promise<AuthResult<AuthSession>>
  requestRecovery(username:string):Promise<AuthResult<void>>
  changePassword(password:string):Promise<AuthResult<void>>
  logout():Promise<void>
}
```

Implement `normalizeUsername` with `trim().toLowerCase()` and accept only `/^[a-z0-9_]{4,24}$/`.

- [ ] **Step 4: Run the test and verify GREEN**

Run: `npm test -- src/auth/username.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/auth/authTypes.ts src/auth/username.ts src/auth/username.test.ts
git commit -m "feat: define username authentication contracts"
```

### Task 2: Supabase Schema and RLS

**Files:**
- Create: `supabase/migrations/202608120001_multi_user_auth.sql`
- Create: `supabase/tests/multi_user_auth_test.sql`

**Interfaces:**
- Produces: `public.profiles`, `public.wellness_states`, `public.password_recovery_requests`.
- Produces: `public.is_admin()` and an atomic wellness-state revision update policy used by Task 4.

- [ ] **Step 1: Write failing database policy tests**

The SQL test must create two auth users, set `request.jwt.claim.sub` for each, and assert:

```sql
select is((select count(*) from public.wellness_states), 1::bigint, 'user sees only own state');
select throws_ok(
  $$ update public.profiles set role = 'admin' where user_id = auth.uid() $$,
  '42501', null, 'user cannot promote self'
);
```

Also assert ordinary users cannot select recovery rows and an admin can select pending rows.

- [ ] **Step 2: Run the tests and verify RED**

Run: `supabase test db`
Expected: FAIL because the tables and policies do not exist.

- [ ] **Step 3: Create tables, constraints, and policies**

Use exact core definitions:

```sql
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{4,24}$'),
  role text not null default 'user' check (role in ('user','admin')),
  must_change_password boolean not null default false,
  legacy_migrated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.wellness_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schema_version integer not null default 1,
  state jsonb not null,
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);
create table public.password_recovery_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','resolved','cancelled')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id)
);
create unique index one_pending_recovery_per_user
  on public.password_recovery_requests(user_id) where status = 'pending';
```

Enable RLS on all three tables. Add own-row `select` policies, an own-state insert/update policy, and admin-only recovery policies. Prevent role and `must_change_password` changes through client policies; privileged Edge Functions use service credentials.

Add `save_wellness_state(next_state jsonb, expected_revision bigint)` as a security-invoker function. It inserts only when no row exists and `expected_revision = 0`; otherwise it updates only the `auth.uid()` row whose revision equals `expected_revision`, increments revision, and returns the new revision. No matching row returns zero rows so the client can report a conflict.

- [ ] **Step 4: Run database tests and verify GREEN**

Run: `supabase test db`
Expected: all pgTAP assertions pass.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/202608120001_multi_user_auth.sql supabase/tests/multi_user_auth_test.sql
git commit -m "feat: add private multi-user database schema"
```

### Task 3: Supabase Client and Auth Service

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/auth/supabaseClient.ts`
- Create: `src/auth/supabaseAuthService.ts`
- Create: `src/auth/supabaseAuthService.test.ts`
- Create: `.env.example`

**Interfaces:**
- Consumes: `AuthService`, `AuthResult`, `validateUsername` from Task 1.
- Produces: `createSupabaseAuthService(client):AuthService`.

- [ ] **Step 1: Install the browser SDK**

Run: `npm install @supabase/supabase-js`
Expected: dependency and lockfile updated without audit errors that block installation.

- [ ] **Step 2: Write failing service tests with a fake Supabase client**

Cover: normalization before invocation, login via the internal identifier, registration through `functions.invoke('register-username')`, profile loading, Korean error mapping, session subscription cleanup, and logout.

```ts
expect(await service.login(' Runner_01 ', 'password1')).toEqual({
  ok:true,
  value:{ accessToken:'token', user:{ id:'u1', username:'runner_01', role:'user', mustChangePassword:false } },
})
expect(fake.auth.signInWithPassword).toHaveBeenCalledWith({ email:'runner_01@users.internal', password:'password1' })
```

- [ ] **Step 3: Run the test and verify RED**

Run: `npm test -- src/auth/supabaseAuthService.test.ts`
Expected: FAIL because the service does not exist.

- [ ] **Step 4: Implement the Supabase client and service**

```ts
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
if (!url || !anonKey) throw new Error('Supabase 환경 변수가 필요합니다.')
export const supabase = createClient(url, anonKey)
```

Map `FunctionsHttpError`, auth errors, and fetch failures to the declared `AuthErrorCode` values. `.env.example` contains only:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

- [ ] **Step 5: Run service and full tests**

Run: `npm test -- src/auth/supabaseAuthService.test.ts && npm test`
Expected: service tests and the existing suite pass.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .env.example src/auth
git commit -m "feat: add Supabase authentication service"
```

### Task 4: Cloud Repository, Revisions, and Legacy Migration

**Files:**
- Create: `src/cloud/cloudWellnessRepository.ts`
- Create: `src/cloud/cloudWellnessRepository.test.ts`
- Create: `src/cloud/legacyStateMigrator.ts`
- Create: `src/cloud/legacyStateMigrator.test.ts`
- Modify: `src/hooks/useWellnessGame.ts`
- Modify: `src/hooks/useWellnessGame.test.tsx`

**Interfaces:**
- Produces: `CloudLoadResult<T>`, `CloudSaveResult`, `CloudWellnessRepository<T>.load(userId)`, `.save(userId,state,expectedRevision)`.
- Produces: `migrateLegacyState({ userId, repository, storage }):Promise<MigrationResult>`.
- Modifies: `useWellnessGame` to accept `initialState?:WellnessState` and `onStateChange?:(state:WellnessState)=>void` while preserving the current synchronous repository option for existing tests.

- [ ] **Step 1: Write failing repository and migration tests**

```ts
expect(await repository.load('u1')).toEqual({ state:saved, revision:3 })
expect(await repository.save('u1', next, 3)).toEqual({ ok:true, revision:4 })
expect(await repository.save('u1', next, 2)).toEqual({ ok:false, reason:'conflict' })
```

Migration tests prove invalid legacy JSON is retained, successful upload removes `wellness-rpg:v1`, an existing remote row is never overwritten, and retry after success performs no second write.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/cloud/cloudWellnessRepository.test.ts src/cloud/legacyStateMigrator.test.ts`
Expected: FAIL because both modules are missing.

- [ ] **Step 3: Implement user-scoped load/save**

Load with `.from('wellness_states').select('state,revision').eq('user_id', userId).maybeSingle()`. Save via a revision-checked RPC or update filtered by `user_id` and `revision`; zero updated rows returns `{ ok:false, reason:'conflict' }`. Never accept a caller-supplied user ID that differs from the active session user.

- [ ] **Step 4: Implement idempotent legacy migration**

Validate `version === 1` plus the existing plan, avatar, weight, and event normalization path before upload. Mark `profiles.legacy_migrated_at` in the same server transaction as the initial state insert. Remove the local key only after that transaction succeeds.

- [ ] **Step 5: Add state injection without breaking local repository tests**

```ts
export function useWellnessGame(options: {
  repository?: WellnessRepository<WellnessState>
  initialState?: WellnessState
  onStateChange?:(state:WellnessState)=>void
  now?:()=>Date
} = {})
```

When `initialState` is supplied, hydrate it through the existing validators and call `onStateChange` from the save effect. Otherwise preserve the current `WellnessRepository` behavior.

- [ ] **Step 6: Run focused and full tests**

Run: `npm test -- src/cloud src/hooks/useWellnessGame.test.tsx && npm test`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/cloud src/hooks/useWellnessGame.ts src/hooks/useWellnessGame.test.tsx
git commit -m "feat: add revisioned cloud wellness storage"
```

### Task 5: Edge Functions for Registration and Recovery

**Files:**
- Create: `supabase/functions/_shared/auth.ts`
- Create: `supabase/functions/register-username/index.ts`
- Create: `supabase/functions/request-password-recovery/index.ts`
- Create: `supabase/functions/admin-reset-password/index.ts`
- Create: `supabase/functions/change-password/index.ts`
- Create: `supabase/functions/tests/auth-functions.test.ts`

**Interfaces:**
- Consumes: tables from Task 2.
- Produces endpoints returning JSON `{ ok:true, ... }` or `{ ok:false, code, message }`.

- [ ] **Step 1: Write failing handler tests**

Cover duplicate normalized usernames, weak passwords, generic recovery responses for missing and existing users, non-admin reset rejection, one pending request, temporary-password generation, `must_change_password=true`, authenticated password replacement, forced-change flag clearing, and resolved request metadata.

```ts
expect(await resetAsUser(requestId)).toMatchObject({ status:403 })
const result = await resetAsAdmin(requestId)
expect(result.body.temporaryPassword).toMatch(/^[A-Za-z0-9_-]{16}$/)
expect(result.body).not.toHaveProperty('oldPassword')
```

- [ ] **Step 2: Run function tests and verify RED**

Run: `deno test --allow-env supabase/functions/tests/auth-functions.test.ts`
Expected: FAIL because handlers are missing.

- [ ] **Step 3: Implement registration**

Validate input, create the Auth user with internal email `${username}@users.internal`, create `profiles` in a compensating transaction, and delete the Auth user if profile creation fails. Never log the password or request body.

- [ ] **Step 4: Implement recovery request**

Normalize username, look up the user only with server credentials, upsert a pending request, rate-limit by username and request source, and always return the same accepted response to the caller.

- [ ] **Step 5: Implement administrator reset**

Verify bearer token, load caller profile, require `role='admin'`, generate a cryptographically random 16-character temporary password, call the Auth admin update API, set `must_change_password=true`, resolve the request, and return the password only in the current response.

- [ ] **Step 6: Implement authenticated password replacement**

Verify the bearer token, require an 8-character password, update only the caller's Auth password, then set only that caller's `must_change_password=false` through server credentials. Return no password value and never log the body. `SupabaseAuthService.changePassword` must call this function rather than updating `profiles` from the browser.

- [ ] **Step 7: Run function and database tests**

Run: `deno test --allow-env supabase/functions/tests/auth-functions.test.ts && supabase test db`
Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add supabase/functions
git commit -m "feat: add secure username recovery functions"
```

### Task 6: Authentication and Forced-Change UI

**Files:**
- Create: `src/hooks/useAuth.ts`
- Create: `src/hooks/useAuth.test.tsx`
- Create: `src/components/AuthScreen.tsx`
- Create: `src/components/AuthScreen.test.tsx`
- Create: `src/components/ForcePasswordChangeScreen.tsx`
- Create: `src/components/ForcePasswordChangeScreen.test.tsx`
- Create: `src/auth.css`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `AuthService` from Task 1.
- Produces: `{ status:'loading'|'anonymous'|'authenticated'; session; error; login; register; requestRecovery; changePassword; logout }`.

- [ ] **Step 1: Write failing hook and component tests**

Prove initial session loading, login/register switching, duplicate username error, recovery generic success, disabled submission while pending, focus on error summary, password confirmation, and forced-change blocking.

```tsx
await user.type(screen.getByLabelText('아이디'), 'runner_01')
await user.type(screen.getByLabelText('비밀번호'), 'password1')
await user.click(screen.getByRole('button', { name:'로그인' }))
expect(auth.login).toHaveBeenCalledWith('runner_01', 'password1')
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/hooks/useAuth.test.tsx src/components/AuthScreen.test.tsx src/components/ForcePasswordChangeScreen.test.tsx`
Expected: FAIL because components and hook are missing.

- [ ] **Step 3: Implement the auth hook and forms**

Use one form mode at a time, semantic labels, `aria-live` status, no password persistence, and a minimum 44px target. Recovery success copy is `복구 요청을 접수했어요. 관리자에게 임시 비밀번호를 받아 주세요.`

- [ ] **Step 4: Implement responsive styling**

Create a centered auth card at desktop widths and edge-safe 12px mobile gutters. Password inputs use `autocomplete="current-password"` or `new-password`; username uses `autocomplete="username"`. Import `auth.css` from `main.tsx`.

- [ ] **Step 5: Run focused tests and build**

Run: `npm test -- src/hooks/useAuth.test.tsx src/components/AuthScreen.test.tsx src/components/ForcePasswordChangeScreen.test.tsx && npm run build`
Expected: tests and build pass.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useAuth* src/components/AuthScreen* src/components/ForcePasswordChangeScreen* src/auth.css src/main.tsx
git commit -m "feat: add username account screens"
```

### Task 7: Authenticated App, Sync State, and Local Migration

**Files:**
- Create: `src/hooks/useCloudWellness.ts`
- Create: `src/hooks/useCloudWellness.test.tsx`
- Create: `src/components/SyncStatus.tsx`
- Create: `src/components/SyncStatus.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/AppFlow.test.tsx`
- Modify: `src/components/TodayScreen.tsx`

**Interfaces:**
- Consumes: active `AuthSession`, `CloudWellnessRepository`, `migrateLegacyState`, and injected `useWellnessGame` state callbacks.
- Produces: authenticated application gate and `SyncState = 'loading'|'saved'|'saving'|'waiting'|'conflict'|'error'`.

- [ ] **Step 1: Write failing integration tests**

Test anonymous users see login, authenticated users load only their own state, first registration imports legacy data, existing accounts do not import it, logout clears private UI, offline save becomes waiting then retries, and conflict blocks silent overwrite.

```tsx
render(<App services={fakeServices({ session:null })}/>)
expect(await screen.findByRole('heading', { name:'로그인' })).toBeInTheDocument()

render(<App services={fakeServices({ session:userA, remoteState:userAState })}/>)
expect(await screen.findByText('오늘')).toBeInTheDocument()
expect(screen.queryByText(userBMarker)).not.toBeInTheDocument()
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/hooks/useCloudWellness.test.tsx src/App.test.tsx src/AppFlow.test.tsx`
Expected: FAIL because the auth gate is not connected.

- [ ] **Step 3: Implement cloud loading and save queue**

Load after authentication, retain pending state in `wellness-rpg:pending:<userId>`, debounce saves by 300ms, retry on `online`, and delete pending state only after a successful revisioned save. A conflict sets `conflict` and stops retries until the user reloads remote state.

- [ ] **Step 4: Compose the authenticated app**

Split current UI body into `WellnessApp`. `App` renders loading, `AuthScreen`, `ForcePasswordChangeScreen`, or `WellnessApp` based on auth and cloud states. Inject test services so unit tests never require real environment variables.

- [ ] **Step 5: Add sign-out and sync feedback**

Turn the existing profile button into an accessible account menu with username, password change, and logout. `SyncStatus` announces `저장 중`, `저장됨`, `동기화 대기 중`, or conflict/error actions without covering bottom navigation.

- [ ] **Step 6: Run integration and full tests**

Run: `npm test -- src/hooks/useCloudWellness.test.tsx src/components/SyncStatus.test.tsx src/App.test.tsx src/AppFlow.test.tsx && npm test`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useCloudWellness* src/components/SyncStatus* src/App.tsx src/App.test.tsx src/AppFlow.test.tsx src/components/TodayScreen.tsx
git commit -m "feat: connect accounts to private cloud state"
```

### Task 8: Administrator Recovery UI and Release Verification

**Files:**
- Create: `src/admin/adminRecoveryService.ts`
- Create: `src/admin/adminRecoveryService.test.ts`
- Create: `src/components/AdminRecoveryScreen.tsx`
- Create: `src/components/AdminRecoveryScreen.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/auth.css`
- Create: `docs/supabase-setup.md`

**Interfaces:**
- Produces: `AdminRecoveryService.listPending()` and `.reset(requestId)`.
- Consumes: administrator session role and `admin-reset-password` Edge Function.

- [ ] **Step 1: Write failing administrator tests**

Prove admin-only route visibility, pending request rendering, confirmation before reset, one-time temporary password, copy action, removal after dismissal, and no password in subsequent list calls. Prove normal users cannot reach or invoke the screen.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/admin/adminRecoveryService.test.ts src/components/AdminRecoveryScreen.test.tsx`
Expected: FAIL because the service and screen are missing.

- [ ] **Step 3: Implement service and screen**

The list query returns request ID, username, and requested time only. Reset invokes the Edge Function, renders the returned temporary password in a `role="status"` panel once, and clears it on dismissal or navigation. Do not put it in a URL, localStorage, analytics event, or console output.

- [ ] **Step 4: Write deployment documentation**

Document Supabase CLI setup, `supabase db push`, function deployment, server-only secret configuration, `.env.local`, and explicit first-admin promotion:

```sql
update public.profiles set role = 'admin' where username = 'chosen_admin_username';
```

Warn that this SQL must run only in the protected Supabase dashboard or an authenticated administrative migration.

- [ ] **Step 5: Run all automated verification**

Run: `npm test && npm run build && supabase test db && deno test --allow-env supabase/functions/tests/auth-functions.test.ts && git diff --check`
Expected: all commands pass and no whitespace errors are reported.

- [ ] **Step 6: Perform browser verification**

At 390px, 1024px, and 1440px verify no horizontal overflow; keyboard-only login, registration, recovery, forced password change, account menu, and admin reset; visible focus; temporary-password one-time behavior; and sync-status placement. Verify reduced-motion mode has no unnecessary animation.

- [ ] **Step 7: Security review**

Search the client bundle and tracked files for `service_role`, temporary passwords, and real project secrets. Verify two real test accounts cannot query or update each other's `profiles` or `wellness_states` rows. Confirm an ordinary account receives 403 from the admin reset function.

- [ ] **Step 8: Commit**

```bash
git add src/admin src/components/AdminRecoveryScreen* src/App.tsx src/auth.css docs/supabase-setup.md
git commit -m "feat: add administrator password recovery"
```
