# ADR-001: Use Supabase for Multi-User Authentication and Storage

**Status:** Accepted
**Date:** 2026-08-12

## Context

The current app stores one `WellnessState` in browser localStorage. It cannot distinguish users, synchronize devices, or provide secure password recovery. The product requires username/password accounts, private per-user plans, and administrator-assisted reset without exposing passwords.

## Decision

Use Supabase Auth for passwords and sessions, PostgreSQL with RLS for per-user data, and Edge Functions for username registration and administrator-only resets. Keep the application state as a versioned JSON document initially, accessed through an asynchronous repository boundary. Import legacy local data once for a newly registered account.

## Consequences

Supabase supplies mature authentication and database authorization while keeping the React client small. SQL policies and privileged functions require security tests and deployment configuration. Username-only login needs a project-controlled internal auth identifier. Concurrent cross-device changes use revision conflict detection rather than automatic merging in the first release.

Firebase and a custom backend were rejected: Firebase makes the username/admin-reset flow less direct, while a custom service would add password, session, deployment, and security responsibilities that are not justified at this stage.
