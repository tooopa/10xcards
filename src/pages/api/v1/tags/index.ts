/**
 * GET  /api/v1/tags - List tags with filtering and usage counts
 * POST /api/v1/tags - Create a new deck-scoped tag
 */

import type { APIRoute } from "astro";
import {
  listTags,
  createTag,
} from "../../../../lib/services/tags/tag.service";
import { verifyDeckOwnership } from "../../../../lib/services/decks/deck.service";
import { TagListQuerySchema, CreateTagSchema } from "../../../../lib/validation/tags";
import {
  createErrorResponse,
  createValidationErrorResponse,
  createSuccessResponse,
  createTagConflictResponse,
  getUserIdFromLocals,
  DuplicateTagError,
} from "../../../../lib/utils/api-errors";
import type { TagListResponseDto } from "../../../../types";

export const prerender = false;

/**
 * GET handler - Lists tags with optional filters
 * 
 * Query parameters:
 * - scope: "global" | "deck" (optional) - filter by tag scope
 * - deck_id: string (optional) - filter by deck ID
 * - search: string (optional) - partial match search on tag name
 * 
 * Returns tags accessible to the user:
 * - Global tags (scope='global'), AND
 * - User's deck-scoped tags (scope='deck' with user_id match)
 * 
 * Each tag includes usage_count (number of flashcards using the tag)
 */
export const GET: APIRoute = async ({ url, locals }) => {
  try {
    // Get user ID
    const userId = getUserIdFromLocals(locals);

    // Parse and validate query parameters
    const queryParams = {
      scope: url.searchParams.get("scope") ?? undefined,
      deck_id: url.searchParams.get("deck_id") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
    };

    const validationResult = TagListQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    // Query tags using service
    const tags = await listTags(
      locals.supabase,
      userId,
      validationResult.data
    );

    // Format response (no pagination for tags in MVP)
    const response: TagListResponseDto = {
      data: tags,
    };

    return createSuccessResponse(response, 200);
  } catch (error) {
    console.error("Error listing tags:", error);

    return createErrorResponse(
      "internal_error",
      "Failed to list tags",
      null,
      500
    );
  }
};

/**
 * POST handler - Creates a new deck-scoped tag
 * 
 * Request body:
 * - name: string (1-50 chars, required) - tag name
 * - deck_id: string (required) - deck ID to associate tag with
 * 
 * Business rules:
 * - Tag scope is automatically set to "deck"
 * - User must own the specified deck
 * - Tag name must be unique within the deck
 * - Tag names are trimmed of whitespace
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Get user ID
    const userId = getUserIdFromLocals(locals);

    // Parse and validate request body
    const body = await request.json();
    const validationResult = CreateTagSchema.safeParse(body);

    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    const { name, deck_id } = validationResult.data;

    // Verify deck ownership
    const deckBelongsToUser = await verifyDeckOwnership(
      locals.supabase,
      userId,
      deck_id
    );

    if (!deckBelongsToUser) {
      return createErrorResponse(
        "invalid_deck",
        "Deck not found or access denied",
        { deck_id },
        400
      );
    }

    // Create tag
    const tag = await createTag(locals.supabase, userId, {
      name,
      deck_id,
    });

    return createSuccessResponse(tag, 201);
  } catch (error) {
    console.error("Error creating tag:", error);

    // Handle duplicate tag name error
    if (error instanceof DuplicateTagError) {
      return createTagConflictResponse(error.tagName, error.deckId);
    }

    return createErrorResponse(
      "internal_error",
      "Failed to create tag",
      null,
      500
    );
  }
};

