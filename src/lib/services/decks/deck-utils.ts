/**
 * Deck Utility Functions
 *
 * Helper functions for deck operations, primarily for validation and verification.
 */

import type { SupabaseClient } from "../../../db/supabase.client";

/**
 * Verifies that a deck exists and belongs to the specified user
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to check ownership against
 * @param deckId - Deck ID to verify
 * @returns true if deck exists and belongs to user, false otherwise
 */
export async function verifyDeckOwnership(supabase: SupabaseClient, userId: string, deckId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("decks")
      .select("id, user_id")
      .eq("id", parseInt(deckId))
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      console.error("Error verifying deck ownership:", error);
      return false;
    }

    return data !== null;
  } catch (err) {
    console.error("Exception verifying deck ownership:", err);
    return false;
  }
}

/**
 * Gets deck information if it exists and belongs to user
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to check ownership against
 * @param deckId - Deck ID to retrieve
 * @returns Deck data or null if not found/not owned
 */
export async function getDeckIfOwned(
  supabase: SupabaseClient,
  userId: string,
  deckId: string
): Promise<{ id: number; name: string; user_id: string } | null> {
  try {
    const { data, error } = await supabase
      .from("decks")
      .select("id, name, user_id")
      .eq("id", parseInt(deckId))
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data;
  } catch (err) {
    console.error("Exception getting deck:", err);
    return null;
  }
}
