-- Campaign screenshot files in Supabase Storage (private bucket).
-- Prisma stores only metadata + storage_key; image bytes are NOT in Postgres.
--
-- Run in Supabase Dashboard → SQL Editor if the app cannot create the bucket
-- automatically (missing service_role, or createBucket disabled).
-- Safe to re-run: skips when the bucket already exists.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'campaign-screenshots',
  'campaign-screenshots',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- App uploads/downloads with SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
-- No public policies: objects are served only via authenticated API routes.
