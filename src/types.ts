import type { Database } from "./db/database.types";

type PublicTables = Database["public"]["Tables"];

type TableRow<T extends keyof PublicTables> = PublicTables[T]["Row"];
type TableInsert<T extends keyof PublicTables> = PublicTables[T]["Insert"];
type TableUpdate<T extends keyof PublicTables> = PublicTables[T]["Update"];

type DeckRow = TableRow<"decks">;
type DeckInsert = TableInsert<"decks">;
type DeckUpdate = TableUpdate<"decks">;

type FlashcardRow = TableRow<"flashcards">;
type FlashcardInsert = TableInsert<"flashcards">;
type FlashcardUpdate = TableUpdate<"flashcards">;

type TagRow = TableRow<"tags">;
type TagInsert = TableInsert<"tags">;
type TagUpdate = TableUpdate<"tags">;

type GenerationRow = TableRow<"generations">;

export type TimestampString = DeckRow["created_at"];
export type SortOrder = "asc" | "desc";

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown> | null;
  };
}

/**
 * Deck DTOs & Commands
 */
type DeckBaseDto = Pick<
  DeckRow,
  "id" | "name" | "description" | "visibility" | "is_default" | "created_at" | "updated_at" | "user_id"
> & {
  flashcard_count: number;
};

export type DeckDto = DeckBaseDto;
export interface DeckListResponseDto {
  data: DeckDto[];
  pagination: PaginationMeta;
}

export interface DeckDeletionResultDto {
  message: string;
  migrated_flashcards_count: number;
  migration_tag: Pick<TagRow, "id" | "name">;
}

type DeckSortField = "created_at" | "updated_at" | "name";

export type DeckListQuery = PaginationQuery & {
  sort?: DeckSortField;
  order?: SortOrder;
  search?: string;
};

export type CreateDeckCommand = Pick<DeckInsert, "name" | "description">;
export type UpdateDeckCommand = Pick<DeckUpdate, "name" | "description">;

/**
 * Flashcard DTOs & Commands
 */
export type FlashcardSource = "manual" | "ai-full" | "ai-edited";

export type TagDto = Pick<TagRow, "id" | "name" | "scope" | "deck_id" | "created_at">;
export type TagWithUsageDto = TagDto & {
  usage_count: number;
};

export type FlashcardDto = Pick<
  FlashcardRow,
  "id" | "deck_id" | "front" | "back" | "source" | "generation_id" | "created_at" | "updated_at"
> & {
  tags: TagDto[];
};

export interface FlashcardListResponseDto {
  data: FlashcardDto[];
  pagination: PaginationMeta;
}

type FlashcardSortField = "created_at" | "updated_at";

export type FlashcardListQuery = PaginationQuery & {
  deck_id?: FlashcardRow["deck_id"];
  source?: FlashcardSource;
  tag_id?: TagRow["id"];
  search?: string;
  sort?: FlashcardSortField;
  order?: SortOrder;
};

export type CreateFlashcardCommand = Pick<FlashcardInsert, "deck_id" | "front" | "back">;
export type UpdateFlashcardCommand = Pick<FlashcardUpdate, "deck_id" | "front" | "back">;

export interface ReplaceFlashcardTagsCommand {
  tag_ids: TagRow["id"][];
}

export type AddFlashcardTagsCommand = ReplaceFlashcardTagsCommand;

export interface FlashcardTagsDto {
  flashcard_id: FlashcardRow["id"];
  tags: TagDto[];
}

/**
 * Tag DTOs & Commands
 */
export interface TagListQuery {
  scope?: TagRow["scope"];
  deck_id?: TagRow["deck_id"];
  search?: string;
}

export interface TagListResponseDto {
  data: TagWithUsageDto[];
}

export type CreateTagCommand = Pick<TagInsert, "name" | "deck_id">;
export type UpdateTagCommand = Pick<TagUpdate, "name">;

/**
 * Generation DTOs & Commands
 */
type GenerationDurationMs = GenerationRow["generation_duration"];

type BaseGenerationDto = Pick<
  GenerationRow,
  | "id"
  | "deck_id"
  | "model"
  | "generated_count"
  | "accepted_unedited_count"
  | "accepted_edited_count"
  | "source_text_length"
  | "created_at"
  | "updated_at"
> & {
  generation_duration_ms: GenerationDurationMs;
};

export type GenerationSummaryDto = BaseGenerationDto;
export type GenerationDetailDto = BaseGenerationDto;

export interface GenerationListResponseDto {
  data: GenerationSummaryDto[];
  pagination: PaginationMeta;
}

export type GenerationListQuery = PaginationQuery & {
  deck_id?: GenerationRow["deck_id"];
  sort?: "created_at";
  order?: SortOrder;
};

export interface GenerateFlashcardsCommand {
  source_text: string;
  model: GenerationRow["model"];
  deck_id: GenerationRow["deck_id"];
}

export type GenerationSuggestionDto = Pick<FlashcardInsert, "front" | "back">;

export interface GenerationSuggestionsDto {
  generation_id: GenerationRow["id"];
  model: GenerationRow["model"];
  generated_count: GenerationRow["generated_count"];
  source_text_length: GenerationRow["source_text_length"];
  generation_duration_ms: GenerationDurationMs;
  suggestions: GenerationSuggestionDto[];
  created_at: GenerationRow["created_at"];
}

export type AcceptGenerationFlashcardInput = GenerationSuggestionDto & {
  edited: boolean;
};

export interface AcceptGenerationCommand {
  flashcards: AcceptGenerationFlashcardInput[];
}

export interface AcceptGenerationResultDto {
  accepted_count: number;
  flashcards: Pick<FlashcardRow, "id" | "front" | "back" | "source" | "generation_id" | "deck_id" | "created_at">[];
}

/**
 * Legacy types for backward compatibility with existing React components
 * TODO: Update components to use new type names
 */
export type FlashcardProposalDto = GenerationSuggestionDto & {
  source: FlashcardSource;
};

export interface GenerationCreateResponseDto {
  generation_id: number;
  flashcards_proposals: FlashcardProposalDto[];
  generated_count: number;
}

/**
 * Flashcard creation types (used by bulk save operations)
 */
export interface FlashcardsCreateCommand {
  flashcards: {
    front: string;
    back: string;
    source: FlashcardSource;
    generation_id: number | null;
  }[];
}
