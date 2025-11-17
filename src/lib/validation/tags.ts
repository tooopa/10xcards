/**
 * Tag Validation Schemas
 * 
 * Zod schemas for validating tag-related API requests.
 */

import { z } from "zod";

/**
 * Schema for tag list query parameters (GET /api/v1/tags)
 */
export const TagListQuerySchema = z.object({
  scope: z.enum(["global", "deck"]).optional(),
  deck_id: z
    .string()
    .regex(/^\d+$/, "deck_id must be a valid integer")
    .transform(val => val)
    .optional(),
  search: z
    .string()
    .max(100, "search must not exceed 100 characters")
    .transform(val => val.trim())
    .optional(),
});

/**
 * Schema for creating a new tag (POST /api/v1/tags)
 */
export const CreateTagSchema = z.object({
  name: z
    .string()
    .min(1, "name is required")
    .max(50, "name must not exceed 50 characters")
    .transform(val => normalizeTagName(val)),
  deck_id: z
    .string()
    .regex(/^\d+$/, "deck_id must be a valid integer"),
});

/**
 * Schema for updating a tag (PATCH /api/v1/tags/:id)
 */
export const UpdateTagSchema = z.object({
  name: z
    .string()
    .min(1, "name is required")
    .max(50, "name must not exceed 50 characters")
    .transform(val => normalizeTagName(val)),
});

/**
 * Schema for tag ID path parameter
 */
export const TagIdSchema = z
  .string()
  .regex(/^\d+$/, "tag id must be a valid integer");

/**
 * Normalizes tag name by trimming whitespace
 * Note: We keep case-sensitive for MVP, can add lowercase normalization later
 * 
 * @param name - Raw tag name input
 * @returns Normalized tag name
 */
export function normalizeTagName(name: string): string {
  return name.trim();
}

/**
 * Type exports for use in handlers
 */
export type TagListQueryInput = z.infer<typeof TagListQuerySchema>;
export type CreateTagInput = z.infer<typeof CreateTagSchema>;
export type UpdateTagInput = z.infer<typeof UpdateTagSchema>;

