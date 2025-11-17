/**
 * GET /api/v1/decks/default - Get the user's default deck
 * 
 * Returns the deck with is_default=true for the authenticated user.
 * This deck should always exist (created by trigger on user registration).
 */

import type { APIRoute } from "astro";
import { getDefaultDeck } from "../../../../lib/services/decks/deck.service";
import {
  createErrorResponse,
  createSuccessResponse,
  createNotFoundResponse,
  getUserIdFromLocals,
} from "../../../../lib/utils/api-errors";

export const prerender = false;

/**
 * GET handler - Returns the user's default deck
 */
export const GET: APIRoute = async ({ locals }) => {
  try {
    // Get user ID
    const userId = getUserIdFromLocals(locals);

    // Get default deck
    const defaultDeck = await getDefaultDeck(locals.supabase, userId);

    if (!defaultDeck) {
      // This should never happen if the database trigger works correctly
      console.error(`Default deck not found for user ${userId} - data integrity issue`);
      return createNotFoundResponse("Default deck");
    }

    return createSuccessResponse(defaultDeck, 200);
  } catch (error) {
    console.error("Error getting default deck:", error);

    return createErrorResponse(
      "internal_error",
      "Failed to get default deck",
      null,
      500
    );
  }
};

