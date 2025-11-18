/**
 * GET    /api/v1/decks/:id - Get a single deck
 * PATCH  /api/v1/decks/:id - Update a deck (name/description)
 * DELETE /api/v1/decks/:id - Delete a deck (with flashcard migration)
 */

import type { APIRoute } from "astro";
import { getDeck, updateDeck, deleteDeck } from "../../../../lib/services/decks/deck.service";
import { UpdateDeckSchema, validateNumericId, validateDefaultDeckRename } from "../../../../lib/validation/decks";
import {
  createErrorResponse,
  createValidationErrorResponse,
  createNotFoundResponse,
  createSuccessResponse,
  createConflictResponse,
  createForbiddenResponse,
  getUserIdFromLocals,
  DuplicateDeckError,
  DefaultDeckError,
} from "../../../../lib/utils/api-errors";

export const prerender = false;

/**
 * GET handler - Gets a single deck by ID
 */
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    // Get user ID
    const userId = getUserIdFromLocals(locals);

    // Validate deck ID
    const deckId = params.id;
    if (!deckId) {
      return createErrorResponse("invalid_parameter", "Deck ID is required", null, 400);
    }

    if (!validateNumericId(deckId)) {
      return createErrorResponse("invalid_parameter", "Deck ID must be a valid number", null, 400);
    }

    // Get deck from service
    const deck = await getDeck(locals.supabase, userId, deckId);

    if (!deck) {
      return createNotFoundResponse("Deck");
    }

    return createSuccessResponse(deck, 200);
  } catch (error) {
    console.error("Error getting deck:", error);

    return createErrorResponse("internal_error", "Failed to get deck", null, 500);
  }
};

/**
 * PATCH handler - Updates a deck's name and/or description
 *
 * Business rules:
 * - Default deck can only be renamed to "Uncategorized"
 * - At least one field (name or description) must be provided
 * - Deck name must be unique per user
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    // Get user ID
    const userId = getUserIdFromLocals(locals);

    // Validate deck ID
    const deckId = params.id;
    if (!deckId) {
      return createErrorResponse("invalid_parameter", "Deck ID is required", null, 400);
    }

    if (!validateNumericId(deckId)) {
      return createErrorResponse("invalid_parameter", "Deck ID must be a valid number", null, 400);
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = UpdateDeckSchema.safeParse(body);

    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    const updates = validationResult.data;

    // Get current deck to check if it's the default deck
    const currentDeck = await getDeck(locals.supabase, userId, deckId);

    if (!currentDeck) {
      return createNotFoundResponse("Deck");
    }

    // Business logic check: Validate default deck rename
    if (updates.name !== undefined) {
      const renameAllowed = validateDefaultDeckRename(currentDeck.is_default, updates.name);

      if (!renameAllowed) {
        return createForbiddenResponse('Cannot rename default deck to anything other than "Uncategorized"');
      }
    }

    // Update deck
    const updatedDeck = await updateDeck(locals.supabase, userId, deckId, updates);

    return createSuccessResponse(updatedDeck, 200);
  } catch (error) {
    console.error("Error updating deck:", error);

    // Handle duplicate deck name error
    if (error instanceof DuplicateDeckError) {
      // Extract deck name from error
      const nameMatch = error.message.match(/"([^"]+)"/);
      const deckName = nameMatch ? nameMatch[1] : "unknown";

      return createConflictResponse("deck", "name", deckName);
    }

    // Check if error is "not found" from service
    if (error instanceof Error && error.message.includes("not found")) {
      return createNotFoundResponse("Deck");
    }

    return createErrorResponse("internal_error", "Failed to update deck", null, 500);
  }
};

/**
 * DELETE handler - Deletes a deck and migrates its flashcards
 *
 * This operation performs a complex transaction:
 * 1. Verifies deck exists and is not default
 * 2. Counts flashcards to migrate
 * 3. Creates migration tag (#deleted-from-{deck_name})
 * 4. Moves all flashcards to default deck
 * 5. Tags migrated flashcards with migration tag
 * 6. Soft-deletes the deck
 *
 * Business rules:
 * - Cannot delete default deck
 * - All flashcards are migrated to default deck
 * - Migration is tracked with a special tag
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    // Get user ID
    const userId = getUserIdFromLocals(locals);

    // Validate deck ID
    const deckId = params.id;
    if (!deckId) {
      return createErrorResponse("invalid_parameter", "Deck ID is required", null, 400);
    }

    if (!validateNumericId(deckId)) {
      return createErrorResponse("invalid_parameter", "Deck ID must be a valid number", null, 400);
    }

    // Delete deck (complex transaction with migration)
    const result = await deleteDeck(locals.supabase, userId, deckId);

    return createSuccessResponse(result, 200);
  } catch (error) {
    console.error("Error deleting deck:", error);

    // Handle default deck deletion attempt
    if (error instanceof DefaultDeckError) {
      return createErrorResponse("forbidden", "Cannot delete the default deck", null, 400);
    }

    // Check if error is "not found" from service
    if (error instanceof Error && error.message.includes("not found")) {
      return createNotFoundResponse("Deck");
    }

    // Transaction errors
    if (error instanceof Error && error.message.includes("migrate")) {
      return createErrorResponse("transaction_error", "Failed to delete deck and migrate flashcards", null, 500);
    }

    return createErrorResponse("internal_error", "Failed to delete deck", null, 500);
  }
};
