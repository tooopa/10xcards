/**
 * Deck Validation Schemas
 * 
 * Zod schemas for validating deck-related requests.
 */

import { z } from "zod";

/**
 * Validation constraints for deck fields
 */
export const DECK_CONSTRAINTS = {
  NAME_MIN_LENGTH: 1,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 5000,
  SEARCH_MAX_LENGTH: 200,
} as const;

/**
 * Validation schema for deck sort fields
 */
export const DeckSortFieldSchema = z.enum(["created_at", "updated_at", "name"], {
  errorMap: () => ({ message: "Invalid sort field. Must be one of: created_at, updated_at, name" }),
});

/**
 * Validation schema for sort order
 */
export const SortOrderSchema = z.enum(["asc", "desc"], {
  errorMap: () => ({ message: "Invalid sort order. Must be one of: asc, desc" }),
});

/**
 * Validation schema for GET /api/v1/decks query parameters
 */
export const DeckListQuerySchema = z.object({
  sort: DeckSortFieldSchema.optional().default("created_at"),
  order: SortOrderSchema.optional().default("desc"),
  search: z
    .string()
    .max(DECK_CONSTRAINTS.SEARCH_MAX_LENGTH, `Search query must not exceed ${DECK_CONSTRAINTS.SEARCH_MAX_LENGTH} characters`)
    .transform(text => text.trim())
    .optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/**
 * Validation schema for POST /api/v1/decks request body
 */
export const CreateDeckSchema = z.object({
  name: z
    .string()
    .min(DECK_CONSTRAINTS.NAME_MIN_LENGTH, `Deck name must be at least ${DECK_CONSTRAINTS.NAME_MIN_LENGTH} character`)
    .max(DECK_CONSTRAINTS.NAME_MAX_LENGTH, `Deck name must not exceed ${DECK_CONSTRAINTS.NAME_MAX_LENGTH} characters`)
    .transform(text => text.trim()),
  description: z
    .string()
    .max(DECK_CONSTRAINTS.DESCRIPTION_MAX_LENGTH, `Description must not exceed ${DECK_CONSTRAINTS.DESCRIPTION_MAX_LENGTH} characters`)
    .transform(text => text.trim())
    .optional()
    .nullable(),
});

/**
 * Validation schema for PATCH /api/v1/decks/:id request body
 * At least one field must be provided
 */
export const UpdateDeckSchema = z
  .object({
    name: z
      .string()
      .min(DECK_CONSTRAINTS.NAME_MIN_LENGTH, `Deck name must be at least ${DECK_CONSTRAINTS.NAME_MIN_LENGTH} character`)
      .max(DECK_CONSTRAINTS.NAME_MAX_LENGTH, `Deck name must not exceed ${DECK_CONSTRAINTS.NAME_MAX_LENGTH} characters`)
      .transform(text => text.trim())
      .optional(),
    description: z
      .string()
      .max(DECK_CONSTRAINTS.DESCRIPTION_MAX_LENGTH, `Description must not exceed ${DECK_CONSTRAINTS.DESCRIPTION_MAX_LENGTH} characters`)
      .transform(text => text.trim())
      .optional()
      .nullable(),
  })
  .refine(
    (data) => data.name !== undefined || data.description !== undefined,
    {
      message: "At least one field (name or description) must be provided for update",
    }
  );

/**
 * Sanitizes deck name for use in migration tags
 * Replaces spaces and special characters with hyphens
 * 
 * @param name - Deck name to sanitize
 * @returns Sanitized deck name suitable for tag naming
 */
export function sanitizeDeckName(name: string): string {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Validates whether default deck can be renamed
 * Default deck can only be renamed to "Uncategorized"
 * 
 * @param isDefault - Whether the deck is the default deck
 * @param newName - New name for the deck
 * @returns true if the rename is allowed, false otherwise
 */
export function validateDefaultDeckRename(isDefault: boolean, newName: string): boolean {
  if (!isDefault) {
    return true; // Non-default decks can be renamed to anything
  }
  
  // Default deck can only keep the name "Uncategorized"
  return newName.trim() === "Uncategorized";
}

/**
 * Helper to validate numeric ID (BIGINT)
 */
export function validateNumericId(id: string): boolean {
  const numId = parseInt(id, 10);
  return !isNaN(numId) && numId > 0 && Number.isSafeInteger(numId);
}

