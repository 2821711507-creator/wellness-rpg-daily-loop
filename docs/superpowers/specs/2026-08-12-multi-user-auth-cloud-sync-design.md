# Multi-User Authentication and Cloud Sync Design

**Date:** 2026-08-12
**Status:** Approved design; awaiting written-spec review
**Scope:** Add username/password accounts, per-user cloud persistence, one-time local-data migration, and admin-assisted password recovery.

## Goal

Every person gets a private account and an isolated wellness state containing their profile, nutrition target, avatar, quests, weekly plan, weight entries, and completion records. Users sign in with a username and password. Supabase supplies authentication, PostgreSQL storage, row-level security, and server-side recovery operations.

## User Experience

Unauthenticated visitors see a dedicated authentication screen with login, registration, and password-recovery modes. Registration accepts a username, password, and password confirmation. After registration, the app imports the current browser's legacy state once when present; otherwise it opens the existing profile onboarding.

Authenticated users enter the existing app. The profile menu exposes sign out and password change. A user whose password was reset by an administrator sees only the forced password-change screen until a new password is accepted.

Password recovery accepts a username and creates one pending request without revealing whether repeated requests changed account state. An administrator reviews pending requests in a separate admin route, generates a temporary password, sees it once, and communicates it to the user outside the app. The old password and temporary password are never stored as readable database values.

## Authentication Architecture

Supabase Auth remains the sole password and session authority. A normalized username is mapped to a project-owned internal auth identifier so the public UI never requires an email address. Registration and administrator reset operations run through Supabase Edge Functions using server-only credentials. Client code never receives the service-role key.

Usernames are lowercased for uniqueness, trimmed, 4–24 characters, and limited to ASCII letters, numbers, and underscore. Display and lookup use the same normalized value. Passwords must be at least 8 characters. Authentication errors use Korean user-facing copy and do not expose internal identifiers or secrets.

Admin status is stored in `profiles.role` and additionally verified server-side. The first administrator is promoted only through an explicit database migration or server-side administrative command; no client path can grant admin status.

## Data Model

### `profiles`

- `user_id uuid primary key references auth.users`
- `username text unique not null`
- `role text not null check in ('user', 'admin')`
- `must_change_password boolean not null default false`
- `created_at`, `updated_at`

### `wellness_states`

- `user_id uuid primary key references auth.users`
- `schema_version integer not null`
- `state jsonb not null`
- `revision bigint not null default 1`
- `updated_at timestamptz`

The existing `WellnessState` remains the application payload. Its current validators run before remote data enters React state. A future normalized schema can replace the JSON document without changing authentication.

### `password_recovery_requests`

- `id uuid primary key`
- `user_id uuid references auth.users`
- `status text check in ('pending', 'resolved', 'cancelled')`
- `requested_at`, `resolved_at`, `resolved_by`

Only one pending request may exist per user. The table never stores a password.

## Access Control

RLS allows authenticated users to read and update only the `profiles` and `wellness_states` row matching `auth.uid()`. Users may create a recovery request through a security-definer server function that performs username lookup without returning account details. Only verified administrators may list or resolve recovery requests. Edge Functions validate the caller session and role on every privileged operation.

## Persistence and Migration

`CloudWellnessRepository` implements asynchronous load and save operations for the current user. The app exposes explicit authentication and synchronization states instead of assuming a synchronous local repository. Remote state is authoritative after successful login.

On a newly registered account with no remote state, the migration reads the legacy `wellness-rpg:v1` payload, validates it, writes it to the new user's row via a revision-checked insert (`expectedRevision` 0), and then removes the legacy key only after the cloud write succeeds. Retrying is idempotent. Logging into an existing account never imports unrelated browser data.

During a network outage, accepted local changes remain in memory and in a user-scoped pending cache. The UI shows `동기화 대기 중` and retries when connectivity returns. Saves carry a revision; a revision conflict fetches the latest cloud state and asks the user to reload instead of silently overwriting another device's newer state. Simultaneous multi-device editing and automatic field-level merge are outside this first release.

## Components and Boundaries

- `AuthProvider`: session lifecycle and auth commands.
- `AuthScreen`: login, registration, and recovery-request forms.
- `ForcePasswordChangeScreen`: blocks app access until password replacement succeeds.
- `AdminRecoveryScreen`: pending requests and one-time temporary-password result.
- `CloudWellnessRepository`: user-scoped state persistence and revision handling.
- `LegacyStateMigrator`: validates and transfers the prior local payload exactly once.
- `SyncStatus`: saving, saved, waiting, and conflict feedback.

Authentication code does not interpret wellness data. The repository does not render UI or perform password operations. Admin recovery never runs from ordinary client privileges.

## Error Handling

The UI distinguishes invalid credentials, duplicate/invalid username, weak password, rate limiting, unavailable network, invalid saved data, authorization failure, and revision conflict. Registration rolls back an incomplete profile setup server-side. Failed migration preserves the original local payload. Sign-out clears in-memory private state and user-scoped pending cache references before returning to login.

## Verification

- Unit tests cover username normalization, validation, auth state transitions, migration idempotence, repository revision conflicts, and error mapping.
- Integration tests cover registration, login, logout, account isolation, forced password change, recovery-request deduplication, administrator authorization, and offline retry.
- Database tests prove RLS prevents cross-user reads and writes and that ordinary users cannot promote themselves or reset passwords.
- Existing 160 application tests remain green through repository test doubles.
- Login, registration, forced-change, sync status, and admin recovery are checked at 390px, 1024px, and 1440px with keyboard and focus behavior.

## Delivery Constraints

The repository will include SQL migrations, Edge Functions, an environment-variable example, and local test instructions. Real cloud execution requires Supabase project URL and public anon key. Service-role credentials remain only in Supabase server configuration. Google login, email recovery, social features, audit exports, and automatic cross-device conflict merging are excluded.
