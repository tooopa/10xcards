import { createBrowserClient, createServerClient } from "@supabase/ssr";

import type { Database } from "./database.types.ts";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Public Supabase client for client-side and server-side operations
 * Uses anon key with RLS protection
 */
export const supabaseClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
  global: {
    headers: {
      "X-Client-Info": "10x-cards-web",
    },
  },
});

/**
 * Admin Supabase client for server-side admin operations only
 * Uses service_role key which bypasses RLS
 * NEVER expose this client to the frontend
 *
 * Use cases:
 * - Deleting users from auth.users table
 * - Admin operations that require bypassing RLS
 */
export const supabaseAdmin = supabaseServiceRoleKey
  ? createServerClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

export type SupabaseClient = typeof supabaseClient;

// TODO: Remove this default user ID once proper authentication is fully implemented
export const DEFAULT_USER_ID = "f411742b-d4b9-4a55-b8d9-44f8167d7bb1";
