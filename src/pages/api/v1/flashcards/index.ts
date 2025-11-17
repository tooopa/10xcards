/**
 * GET  /api/v1/flashcards - List flashcards with filtering and pagination
 * POST /api/v1/flashcards - Create a new flashcard manually
 */

import type { APIRoute } from "astro";
import {
  listFlashcards,
  createFlashcard,
} from "../../../../lib/services/flashcards/flashcard.service";
import { verifyDeckOwnership } from "../../../../lib/services/decks/deck-utils";
import {
  FlashcardListQuerySchema,
  CreateFlashcardSchema,
} from "../../../../lib/validation/flashcards";
import {
  createErrorResponse,
  createValidationErrorResponse,
  createSuccessResponse,
  getUserIdFromLocals,
} from "../../../../lib/utils/api-errors";
import type {
  FlashcardListResponseDto,
  FlashcardDto,
  PaginationMeta,
} from "../../../../types";

export const prerender = false;

/**
 * GET handler - Lists flashcards with filtering and pagination
 */
export const GET: APIRoute = async ({ url, locals }) => {
  try {
    // Get user ID
    const userId = getUserIdFromLocals(locals);

    // Parse and validate query parameters
    const queryParams = {
      deck_id: url.searchParams.get("deck_id") ?? undefined,
      source: url.searchParams.get("source") ?? undefined,
      tag_id: url.searchParams.get("tag_id") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
      sort: url.searchParams.get("sort") ?? undefined,
      order: url.searchParams.get("order") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    };

    const validationResult = FlashcardListQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    // Query flashcards using service
    const result = await listFlashcards(
      locals.supabase,
      userId,
      validationResult.data
    );

    // Calculate pagination metadata
    const page = validationResult.data.page;
    const limit = validationResult.data.limit;
    const totalPages = Math.ceil(result.count / limit);

    const pagination: PaginationMeta = {
      page,
      limit,
      total: result.count,
      total_pages: totalPages,
    };

    // Format response
    const response: FlashcardListResponseDto = {
      data: result.data,
      pagination,
    };

    return createSuccessResponse(response, 200);
  } catch (error) {
    console.error("Error listing flashcards:", error);

    return createErrorResponse(
      "internal_error",
      "Failed to list flashcards",
      null,
      500
    );
  }
};

/**
 * POST handler - Creates a new flashcard with source="manual"
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Get user ID
    const userId = getUserIdFromLocals(locals);

    // Parse and validate request body
    const body = await request.json();
    const validationResult = CreateFlashcardSchema.safeParse(body);

    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    const { deck_id, front, back } = validationResult.data;

    // Verify deck ownership
    const deckExists = await verifyDeckOwnership(
      locals.supabase,
      userId,
      deck_id
    );

    if (!deckExists) {
      return createErrorResponse(
        "invalid_deck",
        "Deck not found or access denied",
        null,
        400
      );
    }

    // Create flashcard
    const flashcard = await createFlashcard(locals.supabase, userId, {
      deck_id,
      front,
      back,
    });

    return createSuccessResponse(flashcard, 201);
  } catch (error) {
    console.error("Error creating flashcard:", error);

    return createErrorResponse(
      "internal_error",
      "Failed to create flashcard",
      null,
      500
    );
  }
};

