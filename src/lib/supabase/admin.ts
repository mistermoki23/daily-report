import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const globalForSupabase = globalThis as unknown as {
  supabaseAdmin?: SupabaseClient;
};

function firstEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

/** Derive https://<ref>.supabase.co from DATABASE_URL / DIRECT_URL if SUPABASE_URL is unset. */
export function supabaseUrlFromDatabaseUrl(databaseUrl: string): string | null {
  try {
    const parsed = new URL(databaseUrl.replace(/^postgresql:/i, "postgres:"));
    const user = decodeURIComponent(parsed.username || "");
    const fromUser = user.match(/^postgres\.([a-z0-9]+)$/i);
    if (fromUser) return `https://${fromUser[1]}.supabase.co`;

    const host = parsed.hostname;
    const fromDbHost = host.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
    if (fromDbHost) return `https://${fromDbHost[1]}.supabase.co`;
    const fromApiHost = host.match(/^([a-z0-9]+)\.supabase\.co$/i);
    if (fromApiHost) return `https://${fromApiHost[1]}.supabase.co`;
    return null;
  } catch {
    return null;
  }
}

export function getSupabaseUrl(): string {
  const explicit = firstEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  if (explicit) return explicit.replace(/\/+$/, "");

  const fromDb =
    (process.env.DATABASE_URL &&
      supabaseUrlFromDatabaseUrl(process.env.DATABASE_URL)) ||
    (process.env.DIRECT_URL && supabaseUrlFromDatabaseUrl(process.env.DIRECT_URL));
  if (fromDb) return fromDb;

  throw new Error(
    "Не задан SUPABASE_URL (или NEXT_PUBLIC_SUPABASE_URL). Добавьте URL проекта Supabase в переменные окружения."
  );
}

export function getSupabaseServiceRoleKey(): string {
  const key = firstEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY",
    "SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
  if (!key) {
    throw new Error(
      "Не задан SUPABASE_SERVICE_ROLE_KEY. Добавьте service_role ключ проекта (Settings → API) в переменные окружения сервера. Не коммитьте ключ в репозиторий."
    );
  }
  return key;
}

/** Server-only client. Service role bypasses Storage RLS for campaign screenshots. */
export function getSupabaseAdmin(): SupabaseClient {
  if (globalForSupabase.supabaseAdmin) return globalForSupabase.supabaseAdmin;
  const client = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  globalForSupabase.supabaseAdmin = client;
  return client;
}
