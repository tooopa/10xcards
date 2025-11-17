/**
 * GET    /api/v1/tags/:id - Get a single tag
 * PATCH  /api/v1/tags/:id - Update a tag's name
 * DELETE /api/v1/tags/:id - Delete a tag (with cascade to flashcard_tags)
 */

import type { APIRoute } from "astro";
import {
  getTag,
  updateTag,
  deleteTag,
} from "../../../../lib/services/tags/tag.service";
import { TagIdSchema, UpdateTagSchema } from "../../../../lib/validation/tags";
import {
  createErrorResponse,
  createValidationErrorResponse,
  createNotFoundResponse,
  createSuccessResponse,
  createForbiddenResponse,
  createTagConflictResponse,
  getUserIdFromLocals,
  DuplicateTagError,
  TagNotFoundError,
  GlobalTagOperationError,
} from "../../../../lib/utils/api-errors";

export const prerender = false;

/**
 * GET handler - Gets a single tag by ID
 * 
 * Path parameters:
 * - id: string (required) - tag ID
 * 
 * Returns the tag if accessible to the user:
 * - Global tags are accessible to all users
 * - Deck tags are only accessible to their owner
 */
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    // Get user ID
    const userId = getUserIdFromLocals(locals);

    // Validate tag ID
    const tagId = params.id;
    if (!tagId) {
      return createErrorResponse(
        "invalid_parameter",
        "Tag ID is required",
        null,
        400
      );
    }

    const idValidation = TagIdSchema.safeParse(tagId);
    if (!idValidation.success) {
      return createValidationErrorResponse(idValidation.error);
    }

    // Get tag from service
    const tag = await getTag(locals.supabase, userId, tagId);

    if (!tag) {
      return createNotFoundResponse("Tag");
    }

    return createSuccessResponse(tag, 200);
  } catch (error) {
    console.error("Error getting tag:", error);

    return createErrorResponse(
      "internal_error",
      "Failed to get tag",
      null,
      500
    );
  }
};

/**
 * PATCH handler - Updates a tag's name
 * 
 * Path parameters:
 * - id: string (required) - tag ID
 * 
 * Request body:
 * - name: string (1-50 chars, required) - new tag name
 * 
 * Business rules:
 * - Only deck-scoped tags can be updated
 * - Cannot update global tags (scope='global')
 * - User must own the tag's deck
 * - New name must be unique within the deck
 * - Tag names are trimmed of whitespace
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    // Get user ID
    const userId = getUserIdFromLocals(locals);

    // Validate tag ID
    const tagId = params.id;
    if (!tagId) {
      return createErrorResponse(
        "invalid_parameter",
        "Tag ID is required",
        null,
        400
      );
    }

    const idValidation = TagIdSchema.safeParse(tagId);
    if (!idValidation.success) {
      return createValidationErrorResponse(idValidation.error);
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = UpdateTagSchema.safeParse(body);

    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    const updates = validationResult.data;

    // Update tag
    const updatedTag = await updateTag(
      locals.supabase,
      userId,
      tagId,
      updates
    );

    return createSuccessResponse(updatedTag, 200);
  } catch (error) {
    console.error("Error updating tag:", error);

    // Handle tag not found
    if (error instanceof TagNotFoundError) {
      return createNotFoundResponse("Tag");
    }

    // Handle global tag operation attempt
    if (error instanceof GlobalTagOperationError) {
      return createErrorResponse(
        "forbidden",
        "Cannot modify global tags",
        null,
        404 // Using 404 to not expose global tags existence
      );
    }

    // Handle duplicate tag name error
    if (error instanceof DuplicateTagError) {
      return createTagConflictResponse(error.tagName, error.deckId);
    }

    return createErrorResponse(
      "internal_error",
      "Failed to update tag",
      null,
      500
    );
  }
};

/**
 * DELETE handler - Deletes a tag
 * 
 * Path parameters:
 * - id: string (required) - tag ID
 * 
 * Business rules:
 * - Only deck-scoped tags can be deleted
 * - Cannot delete global tags (scope='global')
 * - User must own the tag's deck
 * - Cascade deletion: all flashcard_tags associations are automatically removed
 * - Flashcards themselves are NOT deleted, only the tag association
 * 
 * Returns: 204 No Content on success
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    // Get user ID
    const userId = getUserIdFromLocals(locals);

    // Validate tag ID
    const tagId = params.id;
    if (!tagId) {
      return createErrorResponse(
        "invalid_parameter",
        "Tag ID is required",
        null,
        400
      );
    }

    const idValidation = TagIdSchema.safeParse(tagId);
    if (!idValidation.success) {
      return createValidationErrorResponse(idValidation.error);
    }

    // Delete tag (cascade handled by database)
    await deleteTag(locals.supabase, userId, tagId);

    // Return 204 No Content (successful deletion with no response body)
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting tag:", error);

    // Handle tag not found
    if (error instanceof TagNotFoundError) {
      return createNotFoundResponse("Tag");
    }

    // Handle global tag operation attempt
    if (error instanceof GlobalTagOperationError) {
      return createErrorResponse(
        "forbidden",
        "Cannot delete global tags",
        null,
        404 // Using 404 to not expose global tags existence
      );
    }

    // Cascade deletion errors (unlikely due to ON DELETE CASCADE)
    if (error instanceof Error && error.message.includes("cascade")) {
      return createErrorResponse(
        "database_error",
        "Failed to delete tag associations",
        null,
        500
      );
    }

    return createErrorResponse(
      "internal_error",
      "Failed to delete tag",
      null,
      500
    );
  }
};

