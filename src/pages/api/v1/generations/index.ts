/**
 * GET /api/v1/generations
 *
 * Lists generations with pagination and optional filtering
 */

import type { APIRoute } from "astro";
import { GenerationService } from "../../../../lib/services/generations/generation.service";
import { GenerationListQuerySchema } from "../../../../lib/validation/generations";
import {
  createErrorResponse,
  createValidationErrorResponse,
  createSuccessResponse,
  getUserIdFromLocals,
} from "../../../../lib/utils/api-errors";
import type { GenerationListResponseDto } from "../../../../types";

export const prerender = false;

/**
 * GET handler - Lists generations with pagination
 */
export const GET: APIRoute = async ({ url, locals }) => {
  try {
    // Get user ID (for MVP uses default, TODO: implement real auth)
    const userId = getUserIdFromLocals(locals);

    // Parse and validate query parameters
    const queryParams = {
      deck_id: url.searchParams.get("deck_id") ?? undefined,
      sort: url.searchParams.get("sort") ?? undefined,
      order: url.searchParams.get("order") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    };

    const validationResult = GenerationListQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    // Query generations using service
    const generationService = new GenerationService(locals.supabase);
    const result = await generationService.listGenerations(userId, validationResult.data);

    // Format response
    const response: GenerationListResponseDto = {
      data: result.data,
      pagination: result.pagination,
    };

    return createSuccessResponse(response, 200);
  } catch (error) {
    console.error("Error listing generations:", error);

    return createErrorResponse("internal_error", "Failed to list generations", null, 500);
  }
};
