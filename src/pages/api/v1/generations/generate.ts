/**
 * POST /api/v1/generations/generate
 * 
 * Generates flashcard suggestions using AI
 * 
 * Flow:
 * 1. Validate request body
 * 2. Check rate limit (10/hour)
 * 3. Verify deck ownership
 * 4. Calculate source text hash
 * 5. Call AI service to generate flashcards
 * 6. Save generation metadata
 * 7. Return suggestions (NOT saved to DB)
 */

import type { APIRoute } from "astro";
import { GenerationService } from "../../../../lib/services/generations/generation.service";
import { RateLimitService, RateLimitExceededError } from "../../../../lib/services/rate-limit/rate-limit.service";
import {
  FlashcardAIService,
  OpenRouterTimeoutError,
  InvalidAIResponseError,
  OpenRouterAPIError,
} from "../../../../lib/services/ai/flashcard-ai.service";
import { verifyDeckOwnership } from "../../../../lib/services/decks/deck-utils";
import { GenerateFlashcardsSchema, hashSourceText } from "../../../../lib/validation/generations";
import {
  createErrorResponse,
  createValidationErrorResponse,
  createSuccessResponse,
  createRateLimitResponse,
  getUserIdFromLocals,
} from "../../../../lib/utils/api-errors";
import type { GenerationSuggestionsDto } from "../../../../types";

export const prerender = false;

/**
 * POST handler - Generate flashcards using AI
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const startTime = Date.now();
  let sourceTextHash: string | null = null;

  try {
    // Get user ID (for MVP uses default, TODO: implement real auth)
    const userId = getUserIdFromLocals(locals);

    // Parse and validate request body
    const body = await request.json();
    const validationResult = GenerateFlashcardsSchema.safeParse(body);

    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    const { source_text, model, deck_id } = validationResult.data;

    // Step 1: Check rate limit (10 generations/hour)
    try {
      await RateLimitService.enforceGenerationLimit(locals.supabase, userId);
    } catch (error) {
      if (error instanceof RateLimitExceededError) {
        const retryAfter = RateLimitService.getRetryAfterSeconds(
          error.rateLimitInfo.resetAt
        );

        return createRateLimitResponse(
          error.message,
          {
            limit: error.rateLimitInfo.limit,
            current_count: error.rateLimitInfo.currentCount,
            reset_at: error.rateLimitInfo.resetAt.toISOString(),
          },
          retryAfter
        );
      }
      throw error;
    }

    // Step 2: Verify deck ownership
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

    // Step 3: Calculate source text hash (for deduplication and logging)
    sourceTextHash = hashSourceText(source_text);

    // Step 4: Generate flashcards using AI service
    const aiService = new FlashcardAIService({
      apiKey: import.meta.env.OPENROUTER_API_KEY,
    });

    let suggestions;
    try {
      suggestions = await aiService.generateFlashcards(source_text, model);
    } catch (error) {
      // Log AI errors to generation_error_logs
      const generationService = new GenerationService(locals.supabase);
      await generationService.logGenerationError({
        userId,
        model,
        sourceTextHash,
        sourceTextLength: source_text.length,
        errorCode: error instanceof Error ? error.name : "UNKNOWN_ERROR",
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      // Return appropriate error response based on error type
      if (error instanceof OpenRouterTimeoutError) {
        return createErrorResponse(
          "ai_service_timeout",
          "Generation took too long. Please try with shorter text.",
          null,
          503
        );
      }

      if (error instanceof InvalidAIResponseError) {
        return createErrorResponse(
          "ai_service_error",
          "Failed to generate valid flashcards. Please try again.",
          null,
          502
        );
      }

      if (error instanceof OpenRouterAPIError) {
        const statusCode = FlashcardAIService.getErrorStatusCode(error);
        const message = FlashcardAIService.getErrorMessage(error);

        return createErrorResponse(
          "ai_service_error",
          message,
          null,
          statusCode
        );
      }

      // Unexpected error
      throw error;
    }

    // Step 5: Save generation metadata to database
    const durationMs = Date.now() - startTime;
    const generationService = new GenerationService(locals.supabase);

    const { id, created_at } = await generationService.createGeneration({
      userId,
      deckId: deck_id,
      model,
      generatedCount: suggestions.length,
      sourceTextHash,
      sourceTextLength: source_text.length,
      generationDurationMs: durationMs,
    });

    // Step 6: Return response with suggestions
    // NOTE: Suggestions are NOT stored in database, only returned here
    const response: GenerationSuggestionsDto = {
      generation_id: id,
      model,
      generated_count: suggestions.length,
      source_text_length: source_text.length,
      generation_duration_ms: durationMs,
      suggestions,
      created_at,
    };

    return createSuccessResponse(response, 201);
  } catch (error) {
    console.error("Error generating flashcards:", error);

    // Log unexpected errors if we have enough context
    if (sourceTextHash && error instanceof Error) {
      try {
        const userId = getUserIdFromLocals(locals);
        const generationService = new GenerationService(locals.supabase);
        await generationService.logGenerationError({
          userId,
          model: "unknown",
          sourceTextHash,
          sourceTextLength: 0,
          errorCode: error.name,
          errorMessage: error.message,
        });
      } catch (logError) {
        console.error("Failed to log error:", logError);
      }
    }

    return createErrorResponse(
      "internal_error",
      "An unexpected error occurred during generation",
      null,
      500
    );
  }
};

