/**
 * DELETE /api/v1/user - Delete user account
 *
 * Deletes the authenticated user's account and all associated data.
 * This is the only custom authentication endpoint - all other auth operations
 * (signup, login, logout) are handled by Supabase Auth directly.
 */

import type { APIRoute } from "astro";
import { deleteUser, UserDeletionError } from "../../../lib/services/users/user.service";
import { createErrorResponse, createUnauthorizedResponse } from "../../../lib/utils/api-errors";

export const prerender = false;

/**
 * DELETE handler - Deletes the authenticated user account
 *
 * Security:
 * - Requires valid session (checked via middleware)
 * - User can only delete their own account (session.user.id)
 * - Uses admin client to delete from auth.users (server-side only)
 *
 * Cascade deletion:
 * - All user's decks are deleted
 * - All flashcards in those decks are deleted
 * - All tags in those decks are deleted
 * - All generations are deleted
 * - All relationships (flashcard_tags, generation_error_logs) are deleted
 *
 * @returns 204 No Content on success
 * @returns 401 Unauthorized if no session
 * @returns 500 Internal Server Error on deletion failure
 */
export const DELETE: APIRoute = async ({ locals }) => {
  try {
    const { supabase, session } = locals;

    // Verify session exists
    if (!session?.user?.id) {
      return createUnauthorizedResponse("Authentication required");
    }

    const userId = session.user.id;

    // Delete user account
    await deleteUser(supabase, userId);

    // Return 204 No Content on success
    return new Response(null, { status: 204 });
  } catch (error) {
    // Log error for debugging (don't expose sensitive details to client)
    console.error("Error deleting user account:", {
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
      // Don't log userId in production for privacy
    });

    // Handle specific error types
    if (error instanceof UserDeletionError) {
      return createErrorResponse("auth_error", "Failed to delete user account", null, 500);
    }

    // Generic error response
    return createErrorResponse("database_error", "Failed to delete user account", null, 500);
  }
};
