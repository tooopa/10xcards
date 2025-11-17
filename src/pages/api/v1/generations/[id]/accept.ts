/**
 * POST /api/v1/generations/:id/accept
 * 
 * Accepts generation suggestions and creates flashcards
 * 
 * Flow:
 * 1. Validate request body
 * 2. Verify generation ownership
 * 3. Create flashcards in transaction
 * 4. Update generation statistics
 * 5. Return created flashcards
 */

import type { APIRoute } from "astro";
import { GenerationService } from "../../../../../lib/services/generations/generation.service";
import { AcceptGenerationSchema } from "../../../../../lib/validation/generations";
import {
  createErrorResponse,
  createValidationErrorResponse,
  createSuccessResponse,
  createNotFoundResponse,
  getUserIdFromLocals,
} from "../../../../../lib/utils/api-errors";

export const prerender = false;

/**
 * POST handler - Accept generation and create flashcards
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
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

    // Parse and validate request body
    const body = await request.json();
    const validationResult = AcceptGenerationSchema.safeParse(body);

    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    const { flashcards } = validationResult.data;

    // Validate flashcards array is not empty
    if (flashcards.length === 0) {
      return createErrorResponse(
        "validation_error",
        "Flashcards array cannot be empty",
        null,
        400
      );
    }

    // Accept generation and create flashcards (transaction)
    const generationService = new GenerationService(locals.supabase);

    let result;
    try {
      result = await generationService.acceptGeneration(
        userId,
        generationId,
        flashcards
      );
    } catch (error) {
      // Handle specific errors
      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          return createNotFoundResponse("Generation");
        }

        if (error.message.includes("Unauthorized")) {
          return createErrorResponse(
            "forbidden",
            "You do not have permission to accept this generation",
            null,
            403
          );
        }

        if (error.message.includes("Failed to create flashcards")) {
          return createErrorResponse(
            "transaction_error",
            "Failed to save flashcards. Please try again.",
            { detail: error.message },
            500
          );
        }
      }

      throw error;
    }

    return createSuccessResponse(result, 201);
  } catch (error) {
    console.error("Error accepting generation:", error);

    return createErrorResponse(
      "internal_error",
      "An unexpected error occurred while accepting generation",
      null,
      500
    );
  }
};

