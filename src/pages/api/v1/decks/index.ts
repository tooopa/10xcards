/**
 * GET  /api/v1/decks - List decks with filtering, sorting and pagination
 * POST /api/v1/decks - Create a new deck
 */

import type { APIRoute } from "astro";
import {
  listDecks,
  createDeck,
} from "../../../../lib/services/decks/deck.service";
import { DeckListQuerySchema, CreateDeckSchema } from "../../../../lib/validation/decks";
import {
  createErrorResponse,
  createValidationErrorResponse,
  createSuccessResponse,
  createConflictResponse,
  createUnauthorizedResponse,
  getUserIdFromLocals,
  DuplicateDeckError,
} from "../../../../lib/utils/api-errors";
import type { DeckListResponseDto, PaginationMeta } from "../../../../types";

export const prerender = false;

/**
 * GET handler - Lists decks with filtering, sorting and pagination
 */
export const GET: APIRoute = async ({ url, locals }) => {
  try {
    // Get user ID
    const userId = getUserIdFromLocals(locals);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return createUnauthorizedResponse();
    }
    throw error;
  }

  try {

    // Parse and validate query parameters
    const queryParams = {
      sort: url.searchParams.get("sort") ?? undefined,
      order: url.searchParams.get("order") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    };

    const validationResult = DeckListQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    // Query decks using service
    const result = await listDecks(
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
    const response: DeckListResponseDto = {
      data: result.data,
      pagination,
    };

    return createSuccessResponse(response, 200);
  } catch (error) {
    console.error("Error listing decks:", error);

    return createErrorResponse(
      "internal_error",
      "Failed to list decks",
      null,
      500
    );
  }
};

/**
 * POST handler - Creates a new deck
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Get user ID
    const userId = getUserIdFromLocals(locals);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return createUnauthorizedResponse();
    }
    throw error;
  }

  try {

    // Parse and validate request body
    const body = await request.json();
    const validationResult = CreateDeckSchema.safeParse(body);

    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    const { name, description } = validationResult.data;

    // Create deck
    const deck = await createDeck(locals.supabase, userId, {
      name,
      description,
    });

    return createSuccessResponse(deck, 201);
  } catch (error) {
    console.error("Error creating deck:", error);

    // Handle duplicate deck name error
    if (error instanceof DuplicateDeckError) {
      // Extract deck name from error (it's in the error message)
      const nameMatch = error.message.match(/"([^"]+)"/);
      const deckName = nameMatch ? nameMatch[1] : "unknown";
      
      return createConflictResponse("deck", "name", deckName);
    }

    return createErrorResponse(
      "internal_error",
      "Failed to create deck",
      null,
      500
    );
  }
};

