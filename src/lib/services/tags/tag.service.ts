/**
 * Tag Service
 *
 * Business logic for tag operations including CRUD operations for tags
 * and tag-flashcard associations.
 */

import type { SupabaseClient } from "../../../db/supabase.client";
import type { TagDto, TagWithUsageDto, TagListQuery, CreateTagCommand, UpdateTagCommand } from "../../../types";
import {
  DuplicateTagError,
  TagNotFoundError,
  GlobalTagOperationError,
  isUniqueViolation,
} from "../../utils/api-errors";

/**
 * ============================================================================
 * TAG CRUD OPERATIONS
 * ============================================================================
 */

/**
 * Lists all tags accessible to the user with usage counts and optional filters
 * Returns both global tags (accessible to all) and user's deck-scoped tags
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to fetch tags for
 * @param filters - Optional filters (scope, deck_id, search)
 * @returns Array of tags with usage counts
 */
export async function listTags(
  supabase: SupabaseClient,
  userId: string,
  filters: TagListQuery = {}
): Promise<TagWithUsageDto[]> {
  try {
    const { scope, deck_id, search } = filters;

    // Build base query with LEFT JOIN to get usage counts
    // We'll count flashcard_tags associations per tag
    let query = supabase
      .from("tags")
      .select(
        `
        id,
        name,
        scope,
        deck_id,
        created_at,
        flashcard_tags(count)
      `
      )
      .is("deleted_at", null);

    // Filter by scope if provided
    if (scope) {
      query = query.eq("scope", scope);
    }

    // Filter by deck_id if provided (only for deck-scoped tags)
    if (deck_id) {
      query = query.eq("deck_id", parseInt(deck_id));
    }

    // Apply search filter (partial match on name)
    if (search && search.length > 0) {
      query = query.ilike("name", `%${search}%`);
    }

    // Note: RLS policies ensure user only sees:
    // - Global tags (scope='global'), OR
    // - Their own deck tags (scope='deck' AND user_id=auth.uid())

    // Sort by name alphabetically
    query = query.order("name", { ascending: true });

    const { data: tags, error } = await query;

    if (error) {
      console.error("Error listing tags:", error);
      throw new Error("Failed to list tags");
    }

    if (!tags) {
      return [];
    }

    // Map to TagWithUsageDto format
    const tagDtos: TagWithUsageDto[] = tags.map((tag: any) => ({
      id: tag.id.toString(),
      name: tag.name,
      scope: tag.scope,
      deck_id: tag.deck_id ? tag.deck_id.toString() : null,
      created_at: tag.created_at,
      usage_count: Array.isArray(tag.flashcard_tags) ? tag.flashcard_tags.length : 0,
    }));

    return tagDtos;
  } catch (error) {
    console.error("Exception in listTags:", error);
    throw error;
  }
}

/**
 * Gets a single tag by ID (with access verification)
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID for access verification
 * @param tagId - Tag ID to retrieve
 * @returns Tag DTO or null if not found/not accessible
 */
export async function getTag(supabase: SupabaseClient, userId: string, tagId: string): Promise<TagDto | null> {
  try {
    const { data: tag, error } = await supabase
      .from("tags")
      .select("id, name, scope, deck_id, created_at")
      .eq("id", parseInt(tagId))
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      console.error("Error getting tag:", error);
      throw new Error("Failed to get tag");
    }

    if (!tag) {
      return null;
    }

    // Note: RLS policies handle access control
    // If tag is returned, user has access to it

    return {
      id: tag.id.toString(),
      name: tag.name,
      scope: tag.scope,
      deck_id: tag.deck_id ? tag.deck_id.toString() : null,
      created_at: tag.created_at,
    };
  } catch (error) {
    console.error("Exception in getTag:", error);
    throw error;
  }
}

/**
 * Creates a new deck-scoped tag
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID creating the tag
 * @param command - Tag creation data (name, deck_id)
 * @returns Created tag DTO
 * @throws DuplicateTagError if tag name already exists in deck
 */
export async function createTag(supabase: SupabaseClient, userId: string, command: CreateTagCommand): Promise<TagDto> {
  try {
    const { data: tag, error } = await supabase
      .from("tags")
      .insert({
        name: command.name,
        scope: "deck", // Always deck-scoped for user-created tags
        deck_id: parseInt(command.deck_id),
        user_id: userId,
      })
      .select("id, name, scope, deck_id, created_at")
      .single();

    if (error) {
      // Check for unique constraint violation
      if (isUniqueViolation(error)) {
        throw new DuplicateTagError(command.name, command.deck_id);
      }
      console.error("Error creating tag:", error);
      throw new Error("Failed to create tag");
    }

    return {
      id: tag.id.toString(),
      name: tag.name,
      scope: tag.scope,
      deck_id: tag.deck_id ? tag.deck_id.toString() : null,
      created_at: tag.created_at,
    };
  } catch (error) {
    if (error instanceof DuplicateTagError) {
      throw error;
    }
    console.error("Exception in createTag:", error);
    throw error;
  }
}

/**
 * Updates a deck-scoped tag's name
 * Cannot update global tags (scope='global')
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID for ownership verification
 * @param tagId - Tag ID to update
 * @param updates - Fields to update (name)
 * @returns Updated tag DTO
 * @throws TagNotFoundError if tag not found or is global
 * @throws DuplicateTagError if new name conflicts with existing tag in deck
 */
export async function updateTag(
  supabase: SupabaseClient,
  userId: string,
  tagId: string,
  updates: UpdateTagCommand
): Promise<TagDto> {
  try {
    // First, verify the tag exists and is deck-scoped
    const { data: existingTag, error: fetchError } = await supabase
      .from("tags")
      .select("id, scope, deck_id")
      .eq("id", parseInt(tagId))
      .is("deleted_at", null)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching tag for update:", fetchError);
      throw new Error("Failed to fetch tag");
    }

    if (!existingTag) {
      throw new TagNotFoundError(tagId);
    }

    // Cannot update global tags
    if (existingTag.scope === "global") {
      throw new GlobalTagOperationError("update");
    }

    // Perform update (RLS will ensure user_id match)
    const { data: tag, error } = await supabase
      .from("tags")
      .update({
        name: updates.name,
      })
      .eq("id", parseInt(tagId))
      .eq("scope", "deck") // Extra safety check
      .eq("user_id", userId) // Explicit ownership check
      .is("deleted_at", null)
      .select("id, name, scope, deck_id, created_at")
      .single();

    if (error) {
      // Check for unique constraint violation
      if (isUniqueViolation(error)) {
        throw new DuplicateTagError(updates.name, existingTag.deck_id ? existingTag.deck_id.toString() : "");
      }
      console.error("Error updating tag:", error);
      throw new Error("Failed to update tag");
    }

    if (!tag) {
      throw new TagNotFoundError(tagId);
    }

    return {
      id: tag.id.toString(),
      name: tag.name,
      scope: tag.scope,
      deck_id: tag.deck_id ? tag.deck_id.toString() : null,
      created_at: tag.created_at,
    };
  } catch (error) {
    if (
      error instanceof TagNotFoundError ||
      error instanceof GlobalTagOperationError ||
      error instanceof DuplicateTagError
    ) {
      throw error;
    }
    console.error("Exception in updateTag:", error);
    throw error;
  }
}

/**
 * Deletes a deck-scoped tag
 * Cannot delete global tags (scope='global')
 * Cascade deletion of flashcard_tags handled by database (ON DELETE CASCADE)
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID for ownership verification
 * @param tagId - Tag ID to delete
 * @throws TagNotFoundError if tag not found or is global
 */
export async function deleteTag(supabase: SupabaseClient, userId: string, tagId: string): Promise<void> {
  try {
    // First, verify the tag exists and is deck-scoped
    const { data: existingTag, error: fetchError } = await supabase
      .from("tags")
      .select("id, scope")
      .eq("id", parseInt(tagId))
      .is("deleted_at", null)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching tag for deletion:", fetchError);
      throw new Error("Failed to fetch tag");
    }

    if (!existingTag) {
      throw new TagNotFoundError(tagId);
    }

    // Cannot delete global tags
    if (existingTag.scope === "global") {
      throw new GlobalTagOperationError("delete");
    }

    // Perform soft delete (RLS will ensure user_id match)
    const { error, count } = await supabase
      .from("tags")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", parseInt(tagId))
      .eq("scope", "deck") // Extra safety check
      .eq("user_id", userId) // Explicit ownership check
      .is("deleted_at", null)
      .select("id", { count: "exact", head: true });

    if (error) {
      console.error("Error deleting tag:", error);
      throw new Error("Failed to delete tag");
    }

    if (count === 0) {
      throw new TagNotFoundError(tagId);
    }

    // Note: Cascade deletion of flashcard_tags is handled by database
    // with ON DELETE CASCADE constraint
  } catch (error) {
    if (error instanceof TagNotFoundError || error instanceof GlobalTagOperationError) {
      throw error;
    }
    console.error("Exception in deleteTag:", error);
    throw error;
  }
}

/**
 * ============================================================================
 * TAG-FLASHCARD ASSOCIATION OPERATIONS
 * ============================================================================
 */

/**
 * Verifies that all provided tags are accessible to the user
 * A tag is accessible if:
 * - It's a global tag (scope="global"), OR
 * - It's a deck tag (scope="deck") belonging to one of the user's decks
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to check access for
 * @param tagIds - Array of tag IDs to verify
 * @returns true if all tags are accessible, false otherwise
 */
export async function verifyTagsAccessible(
  supabase: SupabaseClient,
  userId: string,
  tagIds: string[]
): Promise<boolean> {
  if (tagIds.length === 0) {
    return true;
  }

  try {
    const numericTagIds = tagIds.map((id) => parseInt(id));

    // Get all tags by IDs
    const { data: tags, error } = await supabase
      .from("tags")
      .select("id, scope, deck_id, decks!inner(user_id)")
      .in("id", numericTagIds)
      .is("deleted_at", null);

    if (error) {
      console.error("Error verifying tags accessibility:", error);
      return false;
    }

    // Check if we found all requested tags
    if (!tags || tags.length !== tagIds.length) {
      return false;
    }

    // Verify each tag is accessible
    for (const tag of tags) {
      // Global tags are always accessible
      if (tag.scope === "global") {
        continue;
      }

      // Deck tags must belong to user's deck
      if (tag.scope === "deck") {
        const deck = tag.decks as any;
        if (!deck || deck.user_id !== userId) {
          return false;
        }
      } else {
        return false; // Unknown scope
      }
    }

    return true;
  } catch (error) {
    console.error("Exception verifying tags accessibility:", error);
    return false;
  }
}

/**
 * Replaces all tags for a flashcard (transaction: DELETE + INSERT)
 *
 * @param supabase - Supabase client instance
 * @param flashcardId - Flashcard ID
 * @param tagIds - Array of new tag IDs to set
 */
export async function replaceFlashcardTags(
  supabase: SupabaseClient,
  flashcardId: string,
  tagIds: string[]
): Promise<void> {
  try {
    const numericFlashcardId = parseInt(flashcardId);
    const numericTagIds = tagIds.map((id) => parseInt(id));

    // Step 1: Delete all existing tags for this flashcard
    const { error: deleteError } = await supabase
      .from("flashcard_tags")
      .delete()
      .eq("flashcard_id", numericFlashcardId);

    if (deleteError) {
      console.error("Error deleting flashcard tags:", deleteError);
      throw new Error(`Failed to delete existing tags: ${deleteError.message}`);
    }

    // Step 2: Insert new tags (if any)
    if (numericTagIds.length > 0) {
      const insertData = numericTagIds.map((tagId) => ({
        flashcard_id: numericFlashcardId,
        tag_id: tagId,
      }));

      const { error: insertError } = await supabase.from("flashcard_tags").insert(insertData);

      if (insertError) {
        console.error("Error inserting flashcard tags:", insertError);
        throw new Error(`Failed to insert new tags: ${insertError.message}`);
      }
    }
  } catch (error) {
    console.error("Exception in replaceFlashcardTags:", error);
    throw error;
  }
}

/**
 * Adds tags to a flashcard (uses upsert to avoid duplicates)
 *
 * @param supabase - Supabase client instance
 * @param flashcardId - Flashcard ID
 * @param tagIds - Array of tag IDs to add
 */
export async function addFlashcardTags(supabase: SupabaseClient, flashcardId: string, tagIds: string[]): Promise<void> {
  try {
    const numericFlashcardId = parseInt(flashcardId);
    const numericTagIds = tagIds.map((id) => parseInt(id));

    const insertData = numericTagIds.map((tagId) => ({
      flashcard_id: numericFlashcardId,
      tag_id: tagId,
    }));

    // Use upsert with onConflict to handle duplicates gracefully
    const { error } = await supabase.from("flashcard_tags").upsert(insertData, {
      onConflict: "flashcard_id,tag_id",
      ignoreDuplicates: true,
    });

    if (error) {
      console.error("Error adding flashcard tags:", error);
      throw new Error(`Failed to add tags: ${error.message}`);
    }
  } catch (error) {
    console.error("Exception in addFlashcardTags:", error);
    throw error;
  }
}

/**
 * Removes a specific tag from a flashcard
 *
 * @param supabase - Supabase client instance
 * @param flashcardId - Flashcard ID
 * @param tagId - Tag ID to remove
 * @throws Error if association not found
 */
export async function removeFlashcardTag(supabase: SupabaseClient, flashcardId: string, tagId: string): Promise<void> {
  try {
    const numericFlashcardId = parseInt(flashcardId);
    const numericTagId = parseInt(tagId);

    const { error, count } = await supabase
      .from("flashcard_tags")
      .delete()
      .eq("flashcard_id", numericFlashcardId)
      .eq("tag_id", numericTagId)
      .select("flashcard_id", { count: "exact", head: true });

    if (error) {
      console.error("Error removing flashcard tag:", error);
      throw new Error(`Failed to remove tag: ${error.message}`);
    }

    if (count === 0) {
      throw new Error("Tag not associated with flashcard");
    }
  } catch (error) {
    console.error("Exception in removeFlashcardTag:", error);
    throw error;
  }
}

/**
 * Gets all tags for a specific flashcard
 *
 * @param supabase - Supabase client instance
 * @param flashcardId - Flashcard ID
 * @returns Array of tags
 */
export async function getFlashcardTags(supabase: SupabaseClient, flashcardId: string): Promise<TagDto[]> {
  try {
    const numericFlashcardId = parseInt(flashcardId);

    const { data, error } = await supabase
      .from("flashcard_tags")
      .select("tags(*)")
      .eq("flashcard_id", numericFlashcardId);

    if (error) {
      console.error("Error getting flashcard tags:", error);
      throw new Error(`Failed to get tags: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    // Map to TagDto format
    const tags: TagDto[] = data
      .filter((row: any) => row.tags !== null)
      .map((row: any) => {
        const tag = row.tags;
        return {
          id: tag.id,
          name: tag.name,
          scope: tag.scope,
          deck_id: tag.deck_id,
          created_at: tag.created_at,
        };
      });

    return tags;
  } catch (error) {
    console.error("Exception in getFlashcardTags:", error);
    throw error;
  }
}
