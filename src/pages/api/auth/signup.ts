/**
 * API endpoint for user signup
 * This provides a server-side signup endpoint that can be more reliable than client-side
 */

import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

// Environment variables in Astro API routes
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

// Use service role client for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({
          error: { code: "validation_error", message: "Email and password are required" }
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("Server-side signup attempt for:", email);

    // Create user using admin client
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email since we're in development
    });

    if (error) {
      console.error("Server signup error:", error);
      return new Response(
        JSON.stringify({
          error: { code: "signup_failed", message: error.message }
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("Server signup success:", data.user?.id);

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: data.user?.id,
          email: data.user?.email,
        },
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected server error:", err);
    return new Response(
      JSON.stringify({
        error: { code: "internal_error", message: "Internal server error" }
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
