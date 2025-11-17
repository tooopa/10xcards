/**
 * GET /api/v1/generations/:id
 * 
 * Gets details of a single generation
 */

import type { APIRoute } from "astro";
import { GenerationService } from "../../../../lib/services/generations/generation.service";
import {
  createErrorResponse,
  createNotFoundResponse,
  createSuccessResponse,
  getUserIdFromLocals,
} from "../../../../lib/utils/api-errors";

export const prerender = false;

/**
 * GET handler - Gets generation details
 */
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    // Get user ID (for MVP uses default, TODO: implement real auth)
    const userId = getUserIdFromLocals(locals);

    // Validate generation ID
    const generationId = params.id;
    if (!generationId) {
      return createErrorResponse(
        "invalid_parameter",
        "Generation ID is required",
        null,
        400
      );
    }

    // Validate ID format (must be numeric)
    if (!/^\d+$/.test(generationId)) {
      return createErrorResponse(
        "invalid_parameter",
        "Generation ID must be a valid number",
        null,
        400
      );
    }

    // Get generation from service
    const generationService = new GenerationService(locals.supabase);
    const generation = await generationService.getGeneration(
      userId,
      generationId
    );

    // Check if generation exists and belongs to user
    if (!generation) {
      return createNotFoundResponse("Generation");
    }

    return createSuccessResponse(generation, 200);
  } catch (error) {
    console.error("Error getting generation:", error);

    return createErrorResponse(
      "internal_error",
      "Failed to get generation",
      null,
      500
    );
  }
};

