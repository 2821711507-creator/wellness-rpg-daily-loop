# Supabase deployment setup

This project has no real Supabase project wired up yet -- every task so far has been
built and tested against injected fakes (`src/**/*.test.ts(x)`) so that development
never depends on live credentials. This document is what a maintainer needs to stand
up a real backend and deploy the multi-user auth / cloud sync / administrator
recovery features implemented in
`docs/superpowers/plans/2026-08-12-multi-user-auth-cloud-sync-implementation.md`.

## 1. Install and authenticate the Supabase CLI

```bash
npm install -g supabase
supabase login
```

From the repository root, link to the target project (create one first at
https://supabase.com/dashboard if it does not exist yet):

```bash
supabase link --project-ref <your-project-ref>
```

## 2. Push the database schema

The schema, RLS policies, and `save_wellness_state` function live in
`supabase/migrations/202608120001_multi_user_auth.sql`. Apply it with:

```bash
supabase db push
```

This creates `public.profiles`, `public.wellness_states`, and
`public.password_recovery_requests`, enables row level security on all three, and
installs `public.is_admin()`. Run the pgTAP suite locally with Docker before pushing
to a real project:

```bash
supabase test db
```

## 3. Deploy the Edge Functions

Each privileged operation is its own Edge Function under `supabase/functions/`.
Deploy all of them:

```bash
supabase functions deploy register-username
supabase functions deploy request-password-recovery
supabase functions deploy change-password
supabase functions deploy admin-reset-password
```

## 4. Configure server-only secrets

The Edge Functions authenticate with the **service-role key**, which bypasses RLS
and must never reach a browser. It is never read from a `VITE_*` variable and never
appears in `src/`, so it cannot end up in the client bundle. Set it (and any other
server-only secret) with:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-role-key-from-dashboard>
```

`SUPABASE_URL` is provided automatically to deployed functions by the Supabase
platform; it does not need to be set manually.

## 5. Configure the client (`.env.local`)

Copy `.env.example` to `.env.local` (already git-ignored, see `.gitignore`'s
`.env*` pattern) and fill in the **public** URL and anon key only -- never the
service-role key:

```bash
cp .env.example .env.local
```

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

`npm run dev` / `npm run build` will fail fast with a clear error
(`Supabase 환경 변수가 필요합니다.`, from `src/auth/supabaseClient.ts`) if either
variable is missing.

## 6. Promote the first administrator

There is no public "become admin" flow -- `public.profiles` has no client-facing
UPDATE policy at all (see the design note at the top of the migration file), so
`role` can only be changed with elevated database access. After the first account
registers through the app's normal sign-up flow, promote it by running:

```sql
update public.profiles set role = 'admin' where username = 'chosen_admin_username';
```

**This statement must only ever be run from the Supabase dashboard's SQL editor
(which uses the postgres superuser role) or from an authenticated administrative
migration/script that connects with the database's admin credentials.** Never expose
this statement, or any endpoint that runs it, to a request originating from the
client app -- doing so would let any authenticated user grant themselves
administrator access.

Once a user's `role` is `admin`, they will see a "관리자: 비밀번호 복구 관리" entry
point above the app after logging in, which opens `AdminRecoveryScreen`
(`src/components/AdminRecoveryScreen.tsx`).

## Known limitation: recovery queue usernames require a follow-up migration

`AdminRecoveryService.listPending()` (`src/admin/adminRecoveryService.ts`) queries
`public.password_recovery_requests` (allowed for admins by the
`recovery_requests_select_admin` policy) and then looks up each requester's
`username` with a second query against `public.profiles`.

As shipped by the Task 2 migration (`202608120001_multi_user_auth.sql`),
`public.profiles` has **only** an own-row select policy
(`profiles_select_own using (user_id = auth.uid())`) -- there is no admin bypass.
Against a real deployed project, an administrator's client-side query for another
user's `profiles` row will be filtered out by RLS and return no data, so the
recovery queue would show requests but be unable to resolve their usernames.

This was intentionally **not** worked around by editing the already-committed Task 2
migration or by adding an undocumented new Edge Function, since neither was in this
task's scope. Before deploying the administrator recovery screen against a real
project, add a small follow-up migration such as:

```sql
create policy profiles_select_admin
  on public.profiles
  for select
  to authenticated
  using (public.is_admin());
```

(or, if broader admin visibility into `profiles` is undesirable, replace the
client-side profile lookup in `adminRecoveryService.ts` with a dedicated
service-role Edge Function, mirroring `admin-reset-password`.) This gap only affects
the recovery queue's UI join -- it does not weaken any existing RLS guarantee, since
`profiles_select_own` still denies ordinary users' access to each other's rows.

## Everything else

`npm test` and `npm run build` are the source of truth for correctness up to this
point; they run entirely against injected fakes and do not require any of the setup
above. This document only matters once a real deployment is needed.
