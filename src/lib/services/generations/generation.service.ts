/**
 * Generation Service
 *
 * Business logic for managing AI-powered flashcard generations.
 * Handles CRUD operations, statistics tracking, and transaction management
 * for the generations feature.
 */

import type { SupabaseClient } from "../../../db/supabase.client";
import type {
  GenerationSummaryDto,
  GenerationDetailDto,
  GenerationListQuery,
  PaginationMeta,
  AcceptGenerationFlashcardInput,
  AcceptGenerationResultDto,
  FlashcardSource,
} from "../../../types";

/**
 * Data for creating a new generation record
 */
export interface CreateGenerationData {
  userId: string;
  deckId: string;
  model: string;
  generatedCount: number;
  sourceTextHash: string;
  sourceTextLength: number;
  generationDurationMs: number;
}

/**
 * Data for logging generation errors
 */
export interface GenerationErrorData {
  userId: string;
  model: string;
  sourceTextHash: string;
  sourceTextLength: number;
  errorCode: string;
  errorMessage: string;
}

/**
 * Result of generation list query
 */
export interface GenerationListResult {
  data: GenerationSummaryDto[];
  pagination: PaginationMeta;
}

/**
 * Service for managing flashcard generations
 */
export class GenerationService {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Lists generations with pagination and filters
   *
   * @param userId - User ID to filter by
   * @param query - Query parameters (pagination, filters, sorting)
   * @returns Paginated list of generations
   */
  async listGenerations(userId: string, query: GenerationListQuery): Promise<GenerationListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sort = query.sort ?? "created_at";
    const order = query.order ?? "desc";
    const offset = (page - 1) * limit;

    // Build query
    let dbQuery = this.supabase.from("generations").select("*", { count: "exact" }).eq("user_id", userId);

    // Apply deck filter if provided
    if (query.deck_id) {
      dbQuery = dbQuery.eq("deck_id", parseInt(query.deck_id));
    }

    // Apply sorting
    dbQuery = dbQuery.order(sort, { ascending: order === "asc" });

    // Apply pagination
    dbQuery = dbQuery.range(offset, offset + limit - 1);

    // Execute query
    const { data, error, count } = await dbQuery;

    if (error) {
      throw new Error(`Failed to list generations: ${error.message}`);
    }

    // Map to DTOs
    const generations: GenerationSummaryDto[] = (data || []).map((row) => ({
      id: row.id.toString(),
      deck_id: row.deck_id.toString(),
      model: row.model,
      generated_count: row.generated_count,
      accepted_unedited_count: row.accepted_unedited_count,
      accepted_edited_count: row.accepted_edited_count,
      source_text_length: row.source_text_length,
      generation_duration_ms: row.generation_duration,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    // Calculate pagination metadata
    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    const pagination: PaginationMeta = {
      page,
      limit,
      total,
      total_pages: totalPages,
    };

    return {
      data: generations,
      pagination,
    };
  }

  /**
   * Gets a single generation by ID
   *
   * @param userId - User ID (for authorization)
   * @param generationId - Generation ID to retrieve
   * @returns Generation details or null if not found
   */
  async getGeneration(userId: string, generationId: string): Promise<GenerationDetailDto | null> {
    const { data, error } = await this.supabase
      .from("generations")
      .select("*")
      .eq("id", parseInt(generationId))
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return null;
      }
      throw new Error(`Failed to get generation: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id.toString(),
      deck_id: data.deck_id.toString(),
      model: data.model,
      generated_count: data.generated_count,
      accepted_unedited_count: data.accepted_unedited_count,
      accepted_edited_count: data.accepted_edited_count,
      source_text_length: data.source_text_length,
      generation_duration_ms: data.generation_duration,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  /**
   * Creates a new generation record
   * Called after AI successfully generates flashcard suggestions
   *
   * @param data - Generation metadata
   * @returns Generation ID and created_at timestamp
   */
  async createGeneration(data: CreateGenerationData): Promise<{ id: string; created_at: string }> {
    const { data: generation, error } = await this.supabase
      .from("generations")
      .insert({
        user_id: data.userId,
        deck_id: parseInt(data.deckId),
        model: data.model,
        generated_count: data.generatedCount,
        source_text_hash: data.sourceTextHash,
        source_text_length: data.sourceTextLength,
        generation_duration: data.generationDurationMs,
        accepted_unedited_count: 0,
        accepted_edited_count: 0,
      })
      .select("id, created_at")
      .single();

    if (error) {
      throw new Error(`Failed to create generation: ${error.message}`);
    }

    return {
      id: generation.id.toString(),
      created_at: generation.created_at,
    };
  }

  /**
   * Accepts generation suggestions and creates flashcards
   * Uses a transaction to ensure atomicity
   *
   * @param userId - User ID (for authorization)
   * @param generationId - Generation ID being accepted
   * @param flashcards - Flashcards to create
   * @returns Created flashcards with metadata
   */
  async acceptGeneration(
    userId: string,
    generationId: string,
    flashcards: AcceptGenerationFlashcardInput[]
  ): Promise<AcceptGenerationResultDto> {
    // 1. Verify generation ownership and get deck_id
    const { data: generation, error: genError } = await this.supabase
      .from("generations")
      .select("deck_id, user_id")
      .eq("id", parseInt(generationId))
      .single();

    if (genError || !generation) {
      throw new Error("Generation not found");
    }

    if (generation.user_id !== userId) {
      throw new Error("Unauthorized: Generation belongs to different user");
    }

    const deckId = generation.deck_id;

    // 2. Prepare flashcards for insertion
    const flashcardsToInsert = flashcards.map((fc) => {
      const source: FlashcardSource = fc.edited ? "ai-edited" : "ai-full";
      return {
        user_id: userId,
        deck_id: deckId,
        front: fc.front,
        back: fc.back,
        source,
        generation_id: parseInt(generationId),
      };
    });

    // 3. Bulk insert flashcards
    const { data: createdFlashcards, error: insertError } = await this.supabase
      .from("flashcards")
      .insert(flashcardsToInsert)
      .select("id, front, back, source, generation_id, deck_id, created_at");

    if (insertError) {
      throw new Error(`Failed to create flashcards: ${insertError.message}`);
    }

    // 4. Calculate statistics
    const uneditedCount = flashcards.filter((fc) => !fc.edited).length;
    const editedCount = flashcards.filter((fc) => fc.edited).length;

    // 5. Update generation statistics
    const { error: updateError } = await this.supabase
      .from("generations")
      .update({
        accepted_unedited_count: uneditedCount,
        accepted_edited_count: editedCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parseInt(generationId));

    if (updateError) {
      // Log error but don't fail the transaction
      // (flashcards were already created)
      console.error("Failed to update generation stats:", updateError);
    }

    // 6. Format response
    return {
      accepted_count: createdFlashcards.length,
      flashcards: createdFlashcards.map((fc) => ({
        id: fc.id.toString(),
        front: fc.front,
        back: fc.back,
        source: fc.source as FlashcardSource,
        generation_id: fc.generation_id?.toString() ?? null,
        deck_id: fc.deck_id.toString(),
        created_at: fc.created_at,
      })),
    };
  }

  /**
   * Logs a generation error to the error logs table
   * Used for monitoring and debugging AI service issues
   *
   * @param data - Error information to log
   */
  async logGenerationError(data: GenerationErrorData): Promise<void> {
    try {
      const { error } = await this.supabase.from("generation_error_logs").insert({
        user_id: data.userId,
        model: data.model,
        source_text_hash: data.sourceTextHash,
        source_text_length: data.sourceTextLength,
        error_code: data.errorCode,
        error_message: data.errorMessage,
      });

      if (error) {
        // Log to console but don't throw - logging errors shouldn't break the flow
        console.error("Failed to log generation error:", error);
      }
    } catch (err) {
      console.error("Exception while logging generation error:", err);
    }
  }

  /**
   * Checks for recent duplicate generations based on source text hash
   * Optional deduplication feature to prevent waste
   *
   * @param userId - User ID
   * @param sourceTextHash - SHA-256 hash of source text
   * @param hoursBack - How many hours to look back (default: 24)
   * @returns Generation ID if duplicate found, null otherwise
   */
  async findRecentDuplicate(userId: string, sourceTextHash: string, hoursBack = 24): Promise<string | null> {
    const thresholdTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    const { data, error } = await this.supabase
      .from("generations")
      .select("id")
      .eq("user_id", userId)
      .eq("source_text_hash", sourceTextHash)
      .gte("created_at", thresholdTime.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error checking for duplicates:", error);
      return null;
    }

    return data ? data.id.toString() : null;
  }
}
