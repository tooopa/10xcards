/**
 * GET    /api/v1/flashcards/:id - Get a single flashcard
 * PATCH  /api/v1/flashcards/:id - Update a flashcard
 * DELETE /api/v1/flashcards/:id - Soft-delete a flashcard
 */

import type { APIRoute } from "astro";
import {
  getFlashcard,
  updateFlashcard,
  deleteFlashcard,
  determineNewSource,
} from "../../../../lib/services/flashcards/flashcard.service";
import { verifyDeckOwnership } from "../../../../lib/services/decks/deck-utils";
import { UpdateFlashcardSchema, validateNumericId } from "../../../../lib/validation/flashcards";
import {
  createErrorResponse,
  createValidationErrorResponse,
  createNotFoundResponse,
  createSuccessResponse,
  getUserIdFromLocals,
} from "../../../../lib/utils/api-errors";

export const prerender = false;

/**
 * GET handler - Gets a single flashcard by ID
 */
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    // Get user ID
    const userId = getUserIdFromLocals(locals);

    // Validate flashcard ID
    const flashcardId = params.id;
    if (!flashcardId) {
      return createErrorResponse("invalid_parameter", "Flashcard ID is required", null, 400);
    }

    if (!validateNumericId(flashcardId)) {
      return createErrorResponse("invalid_parameter", "Flashcard ID must be a valid number", null, 400);
    }

    // Get flashcard from service
    const flashcard = await getFlashcard(locals.supabase, userId, flashcardId);

    if (!flashcard) {
      return createNotFoundResponse("Flashcard");
    }

    return createSuccessResponse(flashcard, 200);
  } catch (error) {
    console.error("Error getting flashcard:", error);

    return createErrorResponse("internal_error", "Failed to get flashcard", null, 500);
  }
};

/**
 * PATCH handler - Updates a flashcard
 * Handles source transition: ai-full -> ai-edited when front/back is modified
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    // Get user ID
    const userId = getUserIdFromLocals(locals);

    // Validate flashcard ID
    const flashcardId = params.id;
    if (!flashcardId) {
      return createErrorResponse("invalid_parameter", "Flashcard ID is required", null, 400);
    }

    if (!validateNumericId(flashcardId)) {
      return createErrorResponse("invalid_parameter", "Flashcard ID must be a valid number", null, 400);
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = UpdateFlashcardSchema.safeParse(body);

    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    const updates = validationResult.data;

    // Get current flashcard to check ownership and determine source transition
    const currentFlashcard = await getFlashcard(locals.supabase, userId, flashcardId);

    if (!currentFlashcard) {
      return createNotFoundResponse("Flashcard");
    }

    // If deck_id is being updated, verify new deck ownership
    if (updates.deck_id) {
      const deckExists = await verifyDeckOwnership(locals.supabase, userId, updates.deck_id);

      if (!deckExists) {
        return createErrorResponse("invalid_deck", "Deck not found or access denied", null, 400);
      }
    }

    // Determine new source based on edit type
    const frontEdited = updates.front !== undefined;
    const backEdited = updates.back !== undefined;
    const newSource = determineNewSource(currentFlashcard.source, frontEdited, backEdited);

    // Update flashcard
    const updatedFlashcard = await updateFlashcard(locals.supabase, userId, flashcardId, updates, newSource);

    return createSuccessResponse(updatedFlashcard, 200);
  } catch (error) {
    console.error("Error updating flashcard:", error);

    // Check if error is "not found" from service
    if (error instanceof Error && error.message.includes("not found")) {
      return createNotFoundResponse("Flashcard");
    }

    return createErrorResponse("internal_error", "Failed to update flashcard", null, 500);
  }
};

/**
 * DELETE handler - Soft-deletes a flashcard
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    // Get user ID
    const userId = getUserIdFromLocals(locals);

    // Validate flashcard ID
    const flashcardId = params.id;
    if (!flashcardId) {
      return createErrorResponse("invalid_parameter", "Flashcard ID is required", null, 400);
    }

    if (!validateNumericId(flashcardId)) {
      return createErrorResponse("invalid_parameter", "Flashcard ID must be a valid number", null, 400);
    }

    // Delete flashcard (soft-delete)
    await deleteFlashcard(locals.supabase, userId, flashcardId);

    // Return 204 No Content
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting flashcard:", error);

    // Check if error is "not found" from service
    if (error instanceof Error && error.message.includes("not found")) {
      return createNotFoundResponse("Flashcard");
    }

    return createErrorResponse("internal_error", "Failed to delete flashcard", null, 500);
  }
};
