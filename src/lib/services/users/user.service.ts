/**
 * User Service
 *
 * Business logic for user account operations including account deletion.
 * Handles cascade deletion of all user data through Supabase Auth admin API.
 */

import { supabaseAdmin } from "../../../db/supabase.client";
import type { SupabaseClient } from "../../../db/supabase.client";

/**
 * Custom error for user deletion failures
 */
export class UserDeletionError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = "UserDeletionError";
  }
}

/**
 * Deletes a user account and all associated data
 *
 * This function performs a complete account deletion:
 * 1. Deletes the user from auth.users table using admin client
 * 2. RLS ON DELETE CASCADE policies automatically handle deletion of:
 *    - All user's decks
 *    - All flashcards (cascades from decks)
 *    - All tags (cascades from decks)
 *    - All generations (cascades from decks)
 *    - All flashcard_tags relationships
 *    - All generation_error_logs
 *
 * @param supabase - Supabase client instance (not used, kept for consistency)
 * @param userId - User ID to delete
 * @throws {UserDeletionError} If deletion fails
 * @returns Promise<void>
 *
 * @example
 * ```typescript
 * try {
 *   await deleteUser(supabase, userId);
 *   console.log("User deleted successfully");
 * } catch (error) {
 *   if (error instanceof UserDeletionError) {
 *     console.error("Failed to delete user:", error.message);
 *   }
 * }
 * ```
 */
export async function deleteUser(supabase: SupabaseClient, userId: string): Promise<void> {
  try {
    // Delete user from auth.users using admin client
    // This requires service_role key which bypasses RLS
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      throw new UserDeletionError(`Failed to delete user from auth: ${error.message}`, error);
    }

    // All user data is automatically deleted by ON DELETE CASCADE constraints:
    // - decks (ON DELETE CASCADE from auth.users)
    // - flashcards (ON DELETE CASCADE from decks)
    // - tags (ON DELETE CASCADE from decks)
    // - generations (ON DELETE CASCADE from decks)
    // - flashcard_tags (ON DELETE CASCADE from flashcards and tags)
    // - generation_error_logs (ON DELETE CASCADE from generations)
  } catch (error) {
    // Re-throw UserDeletionError as-is
    if (error instanceof UserDeletionError) {
      throw error;
    }

    // Wrap other errors
    throw new UserDeletionError("An unexpected error occurred during user deletion", error);
  }
}
