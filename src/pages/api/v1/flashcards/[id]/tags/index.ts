/**
 * PUT  /api/v1/flashcards/:id/tags - Replace all tags for a flashcard
 * POST /api/v1/flashcards/:id/tags - Add tags to a flashcard
 */

import type { APIRoute } from "astro";
import { getFlashcard } from "../../../../../../lib/services/flashcards/flashcard.service";
import {
  verifyTagsAccessible,
  replaceFlashcardTags,
  addFlashcardTags,
  getFlashcardTags,
} from "../../../../../../lib/services/tags/tag.service";
import { FlashcardTagsSchema, validateNumericId } from "../../../../../../lib/validation/flashcards";
import {
  createErrorResponse,
  createValidationErrorResponse,
  createNotFoundResponse,
  createSuccessResponse,
  getUserIdFromLocals,
} from "../../../../../../lib/utils/api-errors";
import type { FlashcardTagsDto } from "../../../../../../types";

export const prerender = false;

/**
 * PUT handler - Replaces all tags for a flashcard
 * Uses transaction: DELETE all existing + INSERT new tags
 */
export const PUT: APIRoute = async ({ params, request, locals }) => {
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
    const validationResult = FlashcardTagsSchema.safeParse(body);

    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    const { tag_ids } = validationResult.data;

    // Verify flashcard exists and belongs to user
    const flashcard = await getFlashcard(locals.supabase, userId, flashcardId);
    if (!flashcard) {
      return createNotFoundResponse("Flashcard");
    }

    // Verify all tags are accessible to user
    const tagsAccessible = await verifyTagsAccessible(locals.supabase, userId, tag_ids);

    if (!tagsAccessible) {
      return createErrorResponse("invalid_tags", "One or more tags not found or inaccessible", null, 400);
    }

    // Replace tags (transaction)
    await replaceFlashcardTags(locals.supabase, flashcardId, tag_ids);

    // Get updated tags
    const tags = await getFlashcardTags(locals.supabase, flashcardId);

    // Format response
    const response: FlashcardTagsDto = {
      flashcard_id: flashcardId,
      tags,
    };

    return createSuccessResponse(response, 200);
  } catch (error) {
    console.error("Error replacing flashcard tags:", error);

    // Check for transaction errors
    if (error instanceof Error && error.message.includes("transaction")) {
      return createErrorResponse("transaction_error", "Failed to update tags", null, 500);
    }

    return createErrorResponse("internal_error", "Failed to replace tags", null, 500);
  }
};

/**
 * POST handler - Adds tags to a flashcard
 * Uses upsert to handle duplicates gracefully
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
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
    const validationResult = FlashcardTagsSchema.safeParse(body);

    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    const { tag_ids } = validationResult.data;

    // Verify flashcard exists and belongs to user
    const flashcard = await getFlashcard(locals.supabase, userId, flashcardId);
    if (!flashcard) {
      return createNotFoundResponse("Flashcard");
    }

    // Verify all tags are accessible to user
    const tagsAccessible = await verifyTagsAccessible(locals.supabase, userId, tag_ids);

    if (!tagsAccessible) {
      return createErrorResponse("invalid_tags", "One or more tags not found or inaccessible", null, 400);
    }

    // Add tags (uses upsert to handle duplicates)
    await addFlashcardTags(locals.supabase, flashcardId, tag_ids);

    // Get all tags after addition
    const tags = await getFlashcardTags(locals.supabase, flashcardId);

    // Format response
    const response: FlashcardTagsDto = {
      flashcard_id: flashcardId,
      tags,
    };

    return createSuccessResponse(response, 200);
  } catch (error) {
    console.error("Error adding flashcard tags:", error);

    return createErrorResponse("internal_error", "Failed to add tags", null, 500);
  }
};
