/**
 * DTO (Data Transfer Object) and Command Model Type Definitions
 * for 10x-cards API
 *
 * This file contains all type definitions used for API communication,
 * derived from database models in database.types.ts
 */

import type { Database } from "./db/database.types";

// ============================================================================
// DATABASE MODEL ALIASES
// ============================================================================

/** Database table type aliases for convenience */
type DeckRow = Database["public"]["Tables"]["decks"]["Row"];
type DeckInsert = Database["public"]["Tables"]["decks"]["Insert"];
type DeckUpdate = Database["public"]["Tables"]["decks"]["Update"];

type FlashcardRow = Database["public"]["Tables"]["flashcards"]["Row"];
type FlashcardInsert = Database["public"]["Tables"]["flashcards"]["Insert"];
type FlashcardUpdate = Database["public"]["Tables"]["flashcards"]["Update"];

type TagRow = Database["public"]["Tables"]["tags"]["Row"];
type TagInsert = Database["public"]["Tables"]["tags"]["Insert"];
type TagUpdate = Database["public"]["Tables"]["tags"]["Update"];

type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];
type ReviewInsert = Database["public"]["Tables"]["reviews"]["Insert"];
type ReviewUpdate = Database["public"]["Tables"]["reviews"]["Update"];

type GenerationRow = Database["public"]["Tables"]["generations"]["Row"];
type GenerationInsert = Database["public"]["Tables"]["generations"]["Insert"];
type GenerationUpdate = Database["public"]["Tables"]["generations"]["Update"];

// ============================================================================
// COMMON / UTILITY TYPES
// ============================================================================

/**
 * Standard pagination metadata for list responses
 */
export interface PaginationDTO {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

/**
 * Generic paginated response wrapper
 */
export interface PaginatedResponseDTO<T> {
  data: T[];
  pagination: PaginationDTO;
}

/**
 * Standard error response structure
 */
export interface ErrorDTO {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Flashcard source type
 */
export type FlashcardSource = "manual" | "ai-full" | "ai-edited";

/**
 * Tag scope type
 */
export type TagScope = "global" | "deck";

/**
 * Deck visibility type
 */
export type DeckVisibility = "private";

/**
 * Review grade (0-5 for SM-2 algorithm)
 */
export type ReviewGrade = 0 | 1 | 2 | 3 | 4 | 5;

// ============================================================================
// DECK DTOs AND COMMANDS
// ============================================================================

/**
 * Deck response DTO - includes computed fields
 *
 * NOTE: The API plan specifies an `is_default` field to identify the
 * "Uncategorized" deck. This field needs to be added to the database schema.
 * See api-plan.md section 20 for migration details.
 */
export interface DeckDTO {
  id: number;
  user_id: string;
  name: string;
  description: string | null;
  visibility: DeckVisibility;
  is_default: boolean; // NOTE: This field needs to be added to DB schema
  created_at: string;
  updated_at: string;
  flashcard_count: number; // Computed field
}

/**
 * Command to create a new deck
 */
export interface CreateDeckCommand {
  name: string; // 1-100 characters, unique per user
  description?: string; // max 5000 characters
}

/**
 * Command to update an existing deck
 */
export interface UpdateDeckCommand {
  name?: string; // 1-100 characters, unique per user
  description?: string; // max 5000 characters
}

/**
 * Response from deck deletion operation
 */
export interface DeleteDeckResponseDTO {
  deck_deleted: boolean;
  deck_name: string;
  flashcards_moved: number;
  destination_deck_id: number;
  destination_deck_name: string;
  tag_created: string;
  tag_id: number;
}

// ============================================================================
// FLASHCARD DTOs AND COMMANDS
// ============================================================================

/**
 * Flashcard response DTO - includes related tags
 * Omits internal fields (tsv, deleted_at)
 */
export interface FlashcardDTO extends Omit<FlashcardRow, "tsv" | "deleted_at"> {
  tags: TagDTO[];
}

/**
 * Command to create a flashcard manually
 */
export interface CreateFlashcardCommand {
  deck_id: number;
  front: string; // 1-200 characters
  back: string; // 1-500 characters
  tag_ids?: number[]; // Optional array of tag IDs
}

/**
 * Command to update an existing flashcard
 */
export interface UpdateFlashcardCommand {
  front?: string; // 1-200 characters
  back?: string; // 1-500 characters
  deck_id?: number;
}

/**
 * Command to add tags to a flashcard
 */
export interface AddTagsCommand {
  tag_ids: number[];
}

/**
 * Partial flashcard response (used in some contexts)
 */
export interface FlashcardPartialDTO {
  id: number;
  front: string;
  back: string;
  tags?: Pick<TagDTO, "id" | "name">[];
}

// ============================================================================
// TAG DTOs AND COMMANDS
// ============================================================================

/**
 * Tag response DTO - includes usage count
 */
export interface TagDTO extends Omit<TagRow, "created_at"> {
  usage_count?: number; // Computed field - number of flashcards with this tag
  created_at?: string; // Optional in list responses
}

/**
 * Command to create a new deck-scoped tag
 */
export interface CreateTagCommand {
  name: string; // 1-50 characters, unique within deck
  deck_id: number;
}

/**
 * Command to update an existing tag
 */
export interface UpdateTagCommand {
  name: string; // 1-50 characters, unique within deck
}

// ============================================================================
// GENERATION DTOs AND COMMANDS
// ============================================================================

/**
 * Flashcard suggestion from AI generation (not yet saved)
 */
export interface FlashcardSuggestionDTO {
  front: string;
  back: string;
}

/**
 * Command to generate flashcards using AI
 */
export interface GenerateFlashcardsCommand {
  source_text: string; // 1000-10000 characters
  model: string; // OpenRouter.ai model identifier
  deck_id: number;
}

/**
 * Response from flashcard generation
 */
export interface GenerationResponseDTO extends Omit<GenerationRow, "updated_at"> {
  suggestions: FlashcardSuggestionDTO[];
}

/**
 * Flashcard data for accepting generated flashcards
 */
export interface AcceptedFlashcardDTO {
  front: string; // 1-200 characters
  back: string; // 1-500 characters
  edited: boolean; // true if user modified the suggestion
}

/**
 * Command to accept and save generated flashcards
 */
export interface AcceptFlashcardsCommand {
  flashcards: AcceptedFlashcardDTO[];
}

/**
 * Accepted flashcard with ID and timestamps
 */
export interface AcceptedFlashcardResponseDTO {
  id: number;
  deck_id: number;
  front: string;
  back: string;
  source: FlashcardSource;
  generation_id: number;
  created_at: string;
}

/**
 * Response from accepting flashcards
 */
export interface AcceptFlashcardsResponseDTO {
  created_count: number;
  flashcards: AcceptedFlashcardResponseDTO[];
}

/**
 * Generation summary DTO (for list views)
 */
export interface GenerationSummaryDTO
  extends Pick<
    GenerationRow,
    | "id"
    | "model"
    | "generated_count"
    | "accepted_unedited_count"
    | "accepted_edited_count"
    | "source_text_length"
    | "generation_duration"
    | "created_at"
  > {}

// ============================================================================
// REVIEW DTOs AND COMMANDS
// ============================================================================

/**
 * Review DTO - full review information
 * Omits deleted_at for active reviews
 */
export interface ReviewDTO extends Omit<ReviewRow, "deleted_at"> {}

/**
 * Due review with embedded flashcard details
 */
export interface DueReviewDTO {
  review_id: number;
  flashcard: FlashcardPartialDTO;
  due_at: string;
  interval: number;
  ease_factor: number;
  repetitions: number;
}

/**
 * Command to submit a review (study session)
 */
export interface SubmitReviewCommand {
  flashcard_id: number;
  grade: ReviewGrade; // 0-5
  version: number; // For optimistic locking
}

/**
 * Review statistics response
 */
export interface ReviewStatsDTO {
  total_flashcards: number;
  due_today: number;
  due_this_week: number;
  reviews_completed_today: number;
  reviews_completed_this_week: number;
  average_ease_factor: number;
  retention_rate: number; // 0.0 to 1.0
}

// ============================================================================
// LIST RESPONSE TYPE ALIASES
// ============================================================================

/**
 * Paginated deck list response
 */
export type DeckListResponseDTO = PaginatedResponseDTO<DeckDTO>;

/**
 * Paginated flashcard list response
 */
export type FlashcardListResponseDTO = PaginatedResponseDTO<FlashcardDTO>;

/**
 * Tag list response (not paginated)
 */
export interface TagListResponseDTO {
  data: TagDTO[];
}

/**
 * Paginated generation list response
 */
export type GenerationListResponseDTO = PaginatedResponseDTO<GenerationSummaryDTO>;

/**
 * Due reviews response (not paginated, but includes total)
 */
export interface DueReviewsResponseDTO {
  data: DueReviewDTO[];
  total_due: number;
}

// ============================================================================
// QUERY PARAMETER TYPES
// ============================================================================

/**
 * Common pagination query parameters
 */
export interface PaginationParams {
  limit?: number; // default: 50, max: 100
  offset?: number; // default: 0
}

/**
 * Common sort query parameters
 */
export interface SortParams {
  sort?: string; // field name
  order?: "asc" | "desc"; // default: 'desc'
}

/**
 * Query parameters for listing decks
 */
export interface ListDecksParams extends PaginationParams, SortParams {
  // sort: 'created_at' | 'updated_at' | 'name'
}

/**
 * Query parameters for listing flashcards
 */
export interface ListFlashcardsParams extends PaginationParams, SortParams {
  deck_id?: number;
  source?: FlashcardSource;
  tag_id?: number;
  search?: string; // full-text search
  // sort: 'created_at' | 'updated_at'
}

/**
 * Query parameters for listing generations
 */
export interface ListGenerationsParams extends PaginationParams, SortParams {
  // sort: 'created_at'
}

/**
 * Query parameters for listing tags
 */
export interface ListTagsParams {
  scope?: TagScope;
  deck_id?: number;
  search?: string;
}

/**
 * Query parameters for getting due reviews
 */
export interface GetDueReviewsParams {
  deck_id?: number;
  limit?: number; // default: 20, max: 100
}

/**
 * Query parameters for getting review statistics
 */
export interface GetReviewStatsParams {
  deck_id?: number;
}

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

/**
 * Validation constraints for various fields
 */
export const ValidationConstraints = {
  DECK: {
    NAME_MIN: 1,
    NAME_MAX: 100,
    DESCRIPTION_MAX: 5000,
  },
  FLASHCARD: {
    FRONT_MIN: 1,
    FRONT_MAX: 200,
    BACK_MIN: 1,
    BACK_MAX: 500,
  },
  TAG: {
    NAME_MIN: 1,
    NAME_MAX: 50,
  },
  GENERATION: {
    SOURCE_TEXT_MIN: 1000,
    SOURCE_TEXT_MAX: 10000,
  },
  REVIEW: {
    GRADE_MIN: 0,
    GRADE_MAX: 5,
  },
  PAGINATION: {
    LIMIT_DEFAULT: 50,
    LIMIT_MAX: 100,
    OFFSET_DEFAULT: 0,
  },
  REVIEW_PAGINATION: {
    LIMIT_DEFAULT: 20,
    LIMIT_MAX: 100,
  },
} as const;

// ============================================================================
// ERROR CODE CONSTANTS
// ============================================================================

/**
 * Standard error codes used in API responses
 */
export const ErrorCodes = {
  AUTHENTICATION_REQUIRED: "AUTHENTICATION_REQUIRED",
  AUTHORIZATION_FAILED: "AUTHORIZATION_FAILED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  GENERATION_FAILED: "GENERATION_FAILED",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  VERSION_CONFLICT: "VERSION_CONFLICT",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
