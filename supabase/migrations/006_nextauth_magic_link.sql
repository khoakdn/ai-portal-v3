-- NextAuth.js tables for passwordless magic-link authentication.
-- Used by the Supabase adapter in src/lib/auth/supabase-adapter.ts.

create table if not exists auth_users (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text unique,
  email_verified timestamptz,
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists auth_verification_tokens (
  identifier text not null,
  token text not null,
  expires timestamptz not null,
  primary key (identifier, token)
);

create index if not exists auth_verification_tokens_identifier_idx
  on auth_verification_tokens (identifier);
