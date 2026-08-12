# Wellness RPG Architecture

The application is a React client backed by Supabase Auth, PostgreSQL, Row Level Security, and Edge Functions.

```text
React UI
  ├─ AuthProvider ─────────────── Supabase Auth
  ├─ CloudWellnessRepository ─── wellness_states (RLS: own row)
  ├─ LegacyStateMigrator ─────── browser localStorage → own cloud row
  └─ AdminRecoveryScreen ─────── Edge Function ── password recovery admin API
```

Authentication owns sessions and passwords. The wellness repository owns the validated per-user application document. Server-only Edge Functions own username registration and administrator password reset. PostgreSQL RLS is the final authorization boundary. Detailed requirements are in `docs/superpowers/specs/2026-08-12-multi-user-auth-cloud-sync-design.md`.
