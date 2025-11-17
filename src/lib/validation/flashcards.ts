/**
 * Flashcard Validation Schemas
 * 
 * Zod schemas for validating flashcard-related requests.
 */

import { z } from "zod";

/**
 * Validation constraints for flashcard fields
 */
export const FLASHCARD_CONSTRAINTS = {
  FRONT_MIN_LENGTH: 1,
  FRONT_MAX_LENGTH: 200,
  BACK_MIN_LENGTH: 1,
  BACK_MAX_LENGTH: 500,
  SEARCH_MAX_LENGTH: 200,
} as const;

/**
 * Validation schema for flashcard source enum
 */
export const FlashcardSourceSchema = z.enum(["manual", "ai-full", "ai-edited"], {
  errorMap: () => ({ message: "Invalid source. Must be one of: manual, ai-full, ai-edited" }),
});

/**
 * Validation schema for flashcard sort fields
 */
export const FlashcardSortFieldSchema = z.enum(["created_at", "updated_at"], {
  errorMap: () => ({ message: "Invalid sort field. Must be one of: created_at, updated_at" }),
});

/**
 * Validation schema for GET /api/v1/flashcards query parameters
 */
export const FlashcardListQuerySchema = z.object({
  deck_id: z.string().min(1).optional(),
  source: FlashcardSourceSchema.optional(),
  tag_id: z.string().min(1).optional(),
  search: z
    .string()
    .max(FLASHCARD_CONSTRAINTS.SEARCH_MAX_LENGTH, `Search query must not exceed ${FLASHCARD_CONSTRAINTS.SEARCH_MAX_LENGTH} characters`)
    .transform(text => text.trim())
    .optional(),
  sort: FlashcardSortFieldSchema.optional().default("created_at"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/**
 * Validation schema for POST /api/v1/flashcards request body
 */
export const CreateFlashcardSchema = z.object({
  deck_id: z.string().min(1, "Deck ID is required"),
  front: z
    .string()
    .min(FLASHCARD_CONSTRAINTS.FRONT_MIN_LENGTH, `Front must be at least ${FLASHCARD_CONSTRAINTS.FRONT_MIN_LENGTH} character`)
    .max(FLASHCARD_CONSTRAINTS.FRONT_MAX_LENGTH, `Front must not exceed ${FLASHCARD_CONSTRAINTS.FRONT_MAX_LENGTH} characters`)
    .transform(text => text.trim()),
  back: z
    .string()
    .min(FLASHCARD_CONSTRAINTS.BACK_MIN_LENGTH, `Back must be at least ${FLASHCARD_CONSTRAINTS.BACK_MIN_LENGTH} character`)
    .max(FLASHCARD_CONSTRAINTS.BACK_MAX_LENGTH, `Back must not exceed ${FLASHCARD_CONSTRAINTS.BACK_MAX_LENGTH} characters`)
    .transform(text => text.trim()),
});

/**
 * Validation schema for PATCH /api/v1/flashcards/:id request body
 * At least one field must be provided
 */
export const UpdateFlashcardSchema = z
  .object({
    deck_id: z.string().min(1).optional(),
    front: z
      .string()
      .min(FLASHCARD_CONSTRAINTS.FRONT_MIN_LENGTH, `Front must be at least ${FLASHCARD_CONSTRAINTS.FRONT_MIN_LENGTH} character`)
      .max(FLASHCARD_CONSTRAINTS.FRONT_MAX_LENGTH, `Front must not exceed ${FLASHCARD_CONSTRAINTS.FRONT_MAX_LENGTH} characters`)
      .transform(text => text.trim())
      .optional(),
    back: z
      .string()
      .min(FLASHCARD_CONSTRAINTS.BACK_MIN_LENGTH, `Back must be at least ${FLASHCARD_CONSTRAINTS.BACK_MIN_LENGTH} character`)
      .max(FLASHCARD_CONSTRAINTS.BACK_MAX_LENGTH, `Back must not exceed ${FLASHCARD_CONSTRAINTS.BACK_MAX_LENGTH} characters`)
      .transform(text => text.trim())
      .optional(),
  })
  .refine(
    (data) => data.deck_id !== undefined || data.front !== undefined || data.back !== undefined,
    {
      message: "At least one field (deck_id, front, or back) must be provided for update",
    }
  );

/**
 * Validation schema for PUT/POST /api/v1/flashcards/:id/tags request body
 */
export const FlashcardTagsSchema = z.object({
  tag_ids: z
    .array(z.string().min(1, "Tag ID cannot be empty"))
    .min(1, "At least one tag ID is required")
    .max(50, "Maximum 50 tags allowed per flashcard"),
});

/**
 * Validation schema for path parameter ID
 */
export const IdParamSchema = z.string().min(1, "ID is required");

/**
 * Helper to validate numeric ID (BIGINT)
 */
export function validateNumericId(id: string): boolean {
  const numId = parseInt(id, 10);
  return !isNaN(numId) && numId > 0 && Number.isSafeInteger(numId);
}

