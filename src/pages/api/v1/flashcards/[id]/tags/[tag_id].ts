/**
 * DELETE /api/v1/flashcards/:id/tags/:tag_id - Remove a tag from a flashcard
 */

import type { APIRoute } from "astro";
import { getFlashcard } from "../../../../../../lib/services/flashcards/flashcard.service";
import { removeFlashcardTag } from "../../../../../../lib/services/tags/tag.service";
import { validateNumericId } from "../../../../../../lib/validation/flashcards";
import {
  createErrorResponse,
  createNotFoundResponse,
  getUserIdFromLocals,
} from "../../../../../../lib/utils/api-errors";

export const prerender = false;

/**
 * DELETE handler - Removes a specific tag from a flashcard
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    // Get user ID
    const userId = getUserIdFromLocals(locals);

    // Validate flashcard ID
    const flashcardId = params.id;
    if (!flashcardId) {
      return createErrorResponse(
        "invalid_parameter",
        "Flashcard ID is required",
        null,
        400
      );
    }

    if (!validateNumericId(flashcardId)) {
      return createErrorResponse(
        "invalid_parameter",
        "Flashcard ID must be a valid number",
        null,
        400
      );
    }

    // Validate tag ID
    const tagId = params.tag_id;
    if (!tagId) {
      return createErrorResponse(
        "invalid_parameter",
        "Tag ID is required",
        null,
        400
      );
    }

    if (!validateNumericId(tagId)) {
      return createErrorResponse(
        "invalid_parameter",
        "Tag ID must be a valid number",
        null,
        400
      );
    }

    // Verify flashcard exists and belongs to user
    const flashcard = await getFlashcard(locals.supabase, userId, flashcardId);
    if (!flashcard) {
      return createNotFoundResponse("Flashcard");
    }

    // Remove tag from flashcard
    await removeFlashcardTag(locals.supabase, flashcardId, tagId);

    // Return 204 No Content
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Error removing flashcard tag:", error);

    // Check if error is "not associated" from service
    if (
      error instanceof Error &&
      error.message.includes("not associated")
    ) {
      return createNotFoundResponse("Tag association");
    }

    return createErrorResponse(
      "internal_error",
      "Failed to remove tag",
      null,
      500
    );
  }
};

