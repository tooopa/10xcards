import { z } from "zod";
import { getAllowedModelIds, SOURCE_TEXT_CONSTRAINTS, GENERATION_CONSTRAINTS } from "../config/ai.config";
import type { GenerationSuggestionDto } from "../../types";
import crypto from "crypto";

/**
 * Validation schema for GET /api/v1/generations query parameters
 */
export const GenerationListQuerySchema = z.object({
  deck_id: z.string().optional(),
  sort: z.enum(["created_at"]).optional().default("created_at"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/**
 * Validation schema for OpenRouter model selection
 * Uses whitelist from ai.config.ts
 */
export const OpenRouterModelSchema = z.enum(getAllowedModelIds() as [string, ...string[]], {
  errorMap: () => ({
    message: `Invalid model. Allowed models: ${getAllowedModelIds().join(", ")}`,
  }),
});

/**
 * Validation schema for POST /api/v1/generations/generate request body
 */
export const GenerateFlashcardsSchema = z.object({
  source_text: z
    .string()
    .min(
      SOURCE_TEXT_CONSTRAINTS.MIN_LENGTH,
      `Source text must be at least ${SOURCE_TEXT_CONSTRAINTS.MIN_LENGTH} characters`
    )
    .max(
      SOURCE_TEXT_CONSTRAINTS.MAX_LENGTH,
      `Source text must not exceed ${SOURCE_TEXT_CONSTRAINTS.MAX_LENGTH} characters`
    )
    .transform((text) => text.trim()),
  model: OpenRouterModelSchema,
  deck_id: z.string().min(1, "Deck ID is required"),
});

/**
 * Validation schema for a single flashcard suggestion from AI
 */
const FlashcardSuggestionSchema = z.object({
  front: z
    .string()
    .min(1, "Front text cannot be empty")
    .max(
      GENERATION_CONSTRAINTS.MAX_FRONT_LENGTH,
      `Front text must not exceed ${GENERATION_CONSTRAINTS.MAX_FRONT_LENGTH} characters`
    )
    .transform((text) => text.trim()),
  back: z
    .string()
    .min(1, "Back text cannot be empty")
    .max(
      GENERATION_CONSTRAINTS.MAX_BACK_LENGTH,
      `Back text must not exceed ${GENERATION_CONSTRAINTS.MAX_BACK_LENGTH} characters`
    )
    .transform((text) => text.trim()),
});

/**
 * Validation schema for AI response containing flashcard suggestions
 */
const AIResponseSchema = z.object({
  flashcards: z
    .array(FlashcardSuggestionSchema)
    .min(GENERATION_CONSTRAINTS.MIN_FLASHCARDS, `At least ${GENERATION_CONSTRAINTS.MIN_FLASHCARDS} flashcards expected`)
    .max(GENERATION_CONSTRAINTS.MAX_FLASHCARDS, `Maximum ${GENERATION_CONSTRAINTS.MAX_FLASHCARDS} flashcards allowed`),
});

/**
 * Validation schema for a single flashcard in accept request
 */
const AcceptFlashcardInputSchema = z.object({
  front: z.string().min(1, "Front text cannot be empty").max(GENERATION_CONSTRAINTS.MAX_FRONT_LENGTH),
  back: z.string().min(1, "Back text cannot be empty").max(GENERATION_CONSTRAINTS.MAX_BACK_LENGTH),
  edited: z.boolean(),
});

/**
 * Validation schema for POST /api/v1/generations/:id/accept request body
 */
export const AcceptGenerationSchema = z.object({
  flashcards: z
    .array(AcceptFlashcardInputSchema)
    .min(1, "At least one flashcard is required")
    .max(GENERATION_CONSTRAINTS.MAX_FLASHCARDS, `Maximum ${GENERATION_CONSTRAINTS.MAX_FLASHCARDS} flashcards allowed`),
});

/**
 * Helper function to calculate SHA-256 hash of source text
 * Used for deduplication of generation requests
 *
 * @param text - Source text to hash
 * @returns SHA-256 hash as hexadecimal string
 */
export function hashSourceText(text: string): string {
  const trimmedText = text.trim();
  return crypto.createHash("sha256").update(trimmedText).digest("hex");
}

/**
 * Validates and parses AI response containing flashcard suggestions
 * Throws error if validation fails
 *
 * @param response - Raw response from AI (expected to be JSON string or object)
 * @returns Validated array of flashcard suggestions
 * @throws Error if response format is invalid
 */
export function validateAISuggestions(response: unknown): GenerationSuggestionDto[] {
  try {
    // If response is a string, parse it as JSON
    const data = typeof response === "string" ? JSON.parse(response) : response;

    // Validate structure using Zod
    const validationResult = AIResponseSchema.safeParse(data);

    if (!validationResult.success) {
      throw new Error(`Invalid AI response format: ${validationResult.error.errors.map((e) => e.message).join(", ")}`);
    }

    // Transform to GenerationSuggestionDto format
    return validationResult.data.flashcards.map((card) => ({
      front: card.front,
      back: card.back,
    }));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("AI response is not valid JSON");
    }
    throw error;
  }
}

/**
 * Custom error class for validation errors
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Helper to format Zod validation errors for API responses
 */
export function formatZodError(error: z.ZodError): string {
  return error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join("; ");
}
