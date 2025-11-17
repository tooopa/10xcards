import { defineMiddleware } from "astro:middleware";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "../db/database.types.ts";

/**
 * Middleware for handling Supabase authentication
 *
 * This middleware:
 * 1. Creates a Supabase client with proper cookie handling for SSR
 * 2. Extracts and verifies the user's session from cookies
 * 3. Makes both the Supabase client and session available in context.locals
 *
 * Usage in API routes:
 * ```typescript
 * export const GET: APIRoute = async ({ locals }) => {
 *   const { supabase, session } = locals;
 *   if (!session) {
 *     return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
 *   }
 *   const userId = session.user.id;
 *   // ... use userId for RLS queries
 * };
 * ```
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = createServerClient<Database>(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (key) => context.cookies.get(key)?.value,
        set: (key, value, options) => {
          context.cookies.set(key, value, options);
        },
        remove: (key, options) => {
          context.cookies.delete(key, options);
        },
      },
    }
  );

  // Extract and verify session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Make Supabase client and session available in context.locals
  context.locals.supabase = supabase;
  context.locals.session = session;

  // Redirect unauthenticated users to login page (except for auth pages)
  const url = new URL(context.request.url);
  const isAuthPage = url.pathname.startsWith("/auth");
  const isApiRoute = url.pathname.startsWith("/api");

  if (!session && !isAuthPage && !isApiRoute) {
    return context.redirect("/auth/login");
  }

  return next();
});
