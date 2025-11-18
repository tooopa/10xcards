/**
 * Flashcard Service
 *
 * Business logic for flashcard CRUD operations.
 */

import type { SupabaseClient } from "../../../db/supabase.client";
import type {
  FlashcardDto,
  FlashcardListQuery,
  CreateFlashcardCommand,
  UpdateFlashcardCommand,
  FlashcardSource,
  TagDto,
} from "../../../types";

/**
 * Lists flashcards for a user with filtering and pagination
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to filter by
 * @param filters - Query filters and pagination options
 * @returns Array of flashcards and total count
 */
export async function listFlashcards(
  supabase: SupabaseClient,
  userId: string,
  filters: FlashcardListQuery
): Promise<{ data: FlashcardDto[]; count: number }> {
  try {
    // Start building query
    let query = supabase
      .from("flashcards")
      .select("*, flashcard_tags!inner(tag_id, tags!inner(*))", { count: "exact" })
      .eq("user_id", userId)
      .is("deleted_at", null);

    // Apply filters
    if (filters.deck_id) {
      query = query.eq("deck_id", parseInt(filters.deck_id));
    }

    if (filters.source) {
      query = query.eq("source", filters.source);
    }

    if (filters.tag_id) {
      // Filter by specific tag through the join table
      query = query.eq("flashcard_tags.tag_id", parseInt(filters.tag_id));
    }

    if (filters.search && filters.search.trim() !== "") {
      const searchTerm = filters.search.trim();
      // Use ilike for case-insensitive search on front and back fields
      query = query.or(`front.ilike.%${searchTerm}%,back.ilike.%${searchTerm}%`);
    }

    // Apply sorting
    const sortField = filters.sort || "created_at";
    const sortOrder = filters.order === "asc";
    query = query.order(sortField, { ascending: sortOrder });

    // Apply pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error listing flashcards:", error);
      throw new Error(`Failed to list flashcards: ${error.message}`);
    }

    // Map to FlashcardDto format with nested tags
    const flashcards: FlashcardDto[] = (data || []).map((row: any) => {
      // Extract unique tags from the join
      const tagsMap = new Map<string, TagDto>();
      if (row.flashcard_tags && Array.isArray(row.flashcard_tags)) {
        row.flashcard_tags.forEach((ft: any) => {
          if (ft.tags) {
            const tag = ft.tags;
            tagsMap.set(tag.id, {
              id: tag.id,
              name: tag.name,
              scope: tag.scope,
              deck_id: tag.deck_id,
              created_at: tag.created_at,
            });
          }
        });
      }

      return {
        id: row.id,
        deck_id: row.deck_id,
        front: row.front,
        back: row.back,
        source: row.source as FlashcardSource,
        generation_id: row.generation_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        tags: Array.from(tagsMap.values()),
      };
    });

    return {
      data: flashcards,
      count: count || 0,
    };
  } catch (error) {
    console.error("Exception in listFlashcards:", error);
    throw error;
  }
}

/**
 * Gets a single flashcard by ID for a specific user
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to check ownership
 * @param id - Flashcard ID
 * @returns Flashcard data or null if not found
 */
export async function getFlashcard(supabase: SupabaseClient, userId: string, id: string): Promise<FlashcardDto | null> {
  try {
    const { data, error } = await supabase
      .from("flashcards")
      .select("*, flashcard_tags(tag_id, tags(*))")
      .eq("id", parseInt(id))
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      console.error("Error getting flashcard:", error);
      throw new Error(`Failed to get flashcard: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    // Map tags
    const tagsMap = new Map<string, TagDto>();
    if (data.flashcard_tags && Array.isArray(data.flashcard_tags)) {
      data.flashcard_tags.forEach((ft: any) => {
        if (ft.tags) {
          const tag = ft.tags;
          tagsMap.set(tag.id, {
            id: tag.id,
            name: tag.name,
            scope: tag.scope,
            deck_id: tag.deck_id,
            created_at: tag.created_at,
          });
        }
      });
    }

    return {
      id: data.id,
      deck_id: data.deck_id,
      front: data.front,
      back: data.back,
      source: data.source as FlashcardSource,
      generation_id: data.generation_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
      tags: Array.from(tagsMap.values()),
    };
  } catch (error) {
    console.error("Exception in getFlashcard:", error);
    throw error;
  }
}

/**
 * Creates a new flashcard with source="manual"
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID creating the flashcard
 * @param command - Flashcard creation data
 * @returns Created flashcard
 */
export async function createFlashcard(
  supabase: SupabaseClient,
  userId: string,
  command: CreateFlashcardCommand
): Promise<FlashcardDto> {
  try {
    const { data, error } = await supabase
      .from("flashcards")
      .insert({
        user_id: userId,
        deck_id: parseInt(command.deck_id),
        front: command.front,
        back: command.back,
        source: "manual" as FlashcardSource,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating flashcard:", error);
      throw new Error(`Failed to create flashcard: ${error.message}`);
    }

    return {
      id: data.id,
      deck_id: data.deck_id,
      front: data.front,
      back: data.back,
      source: data.source as FlashcardSource,
      generation_id: data.generation_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
      tags: [],
    };
  } catch (error) {
    console.error("Exception in createFlashcard:", error);
    throw error;
  }
}

/**
 * Updates an existing flashcard
 * Handles source transition: ai-full -> ai-edited when front/back is modified
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to check ownership
 * @param id - Flashcard ID
 * @param updates - Fields to update
 * @param newSource - New source value (computed by caller)
 * @returns Updated flashcard
 */
export async function updateFlashcard(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  updates: UpdateFlashcardCommand,
  newSource: FlashcardSource
): Promise<FlashcardDto> {
  try {
    // Build update object
    const updateData: any = {
      source: newSource,
      updated_at: new Date().toISOString(),
    };

    if (updates.deck_id !== undefined) {
      updateData.deck_id = parseInt(updates.deck_id);
    }
    if (updates.front !== undefined) {
      updateData.front = updates.front;
    }
    if (updates.back !== undefined) {
      updateData.back = updates.back;
    }

    const { data, error } = await supabase
      .from("flashcards")
      .update(updateData)
      .eq("id", parseInt(id))
      .eq("user_id", userId)
      .is("deleted_at", null)
      .select("*, flashcard_tags(tag_id, tags(*))")
      .single();

    if (error) {
      console.error("Error updating flashcard:", error);
      throw new Error(`Failed to update flashcard: ${error.message}`);
    }

    // Map tags
    const tagsMap = new Map<string, TagDto>();
    if (data.flashcard_tags && Array.isArray(data.flashcard_tags)) {
      data.flashcard_tags.forEach((ft: any) => {
        if (ft.tags) {
          const tag = ft.tags;
          tagsMap.set(tag.id, {
            id: tag.id,
            name: tag.name,
            scope: tag.scope,
            deck_id: tag.deck_id,
            created_at: tag.created_at,
          });
        }
      });
    }

    return {
      id: data.id,
      deck_id: data.deck_id,
      front: data.front,
      back: data.back,
      source: data.source as FlashcardSource,
      generation_id: data.generation_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
      tags: Array.from(tagsMap.values()),
    };
  } catch (error) {
    console.error("Exception in updateFlashcard:", error);
    throw error;
  }
}

/**
 * Soft-deletes a flashcard
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to check ownership
 * @param id - Flashcard ID
 * @throws Error if flashcard not found
 */
export async function deleteFlashcard(supabase: SupabaseClient, userId: string, id: string): Promise<void> {
  try {
    const { error, count } = await supabase
      .from("flashcards")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", parseInt(id))
      .eq("user_id", userId)
      .is("deleted_at", null)
      .select("id", { count: "exact", head: true });

    if (error) {
      console.error("Error deleting flashcard:", error);
      throw new Error(`Failed to delete flashcard: ${error.message}`);
    }

    if (count === 0) {
      throw new Error("Flashcard not found");
    }
  } catch (error) {
    console.error("Exception in deleteFlashcard:", error);
    throw error;
  }
}

/**
 * Determines new source based on current source and edited fields
 * Implements logic: ai-full + edit front/back -> ai-edited
 *
 * @param currentSource - Current flashcard source
 * @param frontEdited - Whether front field is being edited
 * @param backEdited - Whether back field is being edited
 * @returns New source value
 */
export function determineNewSource(
  currentSource: FlashcardSource,
  frontEdited: boolean,
  backEdited: boolean
): FlashcardSource {
  // If current source is "ai-full" and either front or back is edited, transition to "ai-edited"
  if (currentSource === "ai-full" && (frontEdited || backEdited)) {
    return "ai-edited";
  }

  // Otherwise, keep the current source
  return currentSource;
}
