/**
 * Deck Service
 * 
 * Business logic for deck operations including CRUD operations,
 * flashcard counting, and complex deck deletion with migration.
 */

import type { SupabaseClient } from "../../../db/supabase.client";
import type {
  DeckDto,
  DeckListQuery,
  CreateDeckCommand,
  UpdateDeckCommand,
  DeckDeletionResultDto,
  PaginationMeta,
} from "../../../types";
import { DuplicateDeckError, DefaultDeckError, isUniqueViolation } from "../../utils/api-errors";
import { sanitizeDeckName } from "../../validation/decks";

/**
 * Internal type for deck with flashcard count from database
 */
interface DeckWithCount {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  visibility: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  flashcard_count: number;
}

/**
 * Lists all decks for a user with filtering, sorting, and pagination
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID to fetch decks for
 * @param filters - Query filters (search, sort, order, page, limit)
 * @returns Object containing deck array and total count
 */
export async function listDecks(
  supabase: SupabaseClient,
  userId: string,
  filters: DeckListQuery
): Promise<{ data: DeckDto[]; count: number }> {
  const {
    sort = "created_at",
    order = "desc",
    search,
    page = 1,
    limit = 20,
  } = filters;

  // Calculate pagination offset
  const offset = (page - 1) * limit;

  // Build base query
  let query = supabase
    .from("decks")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .is("deleted_at", null);

  // Apply search filter if provided
  if (search && search.length > 0) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  // Apply sorting
  query = query.order(sort, { ascending: order === "asc" });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  // Execute query
  const { data: decks, error, count } = await query;

  if (error) {
    console.error("Error listing decks:", error);
    throw new Error("Failed to list decks");
  }

  // Get flashcard counts for each deck
  const deckIds = decks?.map(d => d.id) || [];
  const flashcardCounts = await getFlashcardCounts(supabase, deckIds);

  // Map to DTOs with flashcard counts
  const deckDtos: DeckDto[] = (decks || []).map(deck => ({
    id: deck.id.toString(),
    user_id: deck.user_id,
    name: deck.name,
    description: deck.description,
    visibility: deck.visibility as "private",
    is_default: deck.is_default,
    flashcard_count: flashcardCounts.get(deck.id.toString()) || 0,
    created_at: deck.created_at,
    updated_at: deck.updated_at,
  }));

  return {
    data: deckDtos,
    count: count || 0,
  };
}

/**
 * Gets flashcard counts for multiple decks
 * 
 * @param supabase - Supabase client instance
 * @param deckIds - Array of deck IDs
 * @returns Map of deck ID to flashcard count
 */
async function getFlashcardCounts(
  supabase: SupabaseClient,
  deckIds: number[]
): Promise<Map<string, number>> {
  if (deckIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("flashcards")
    .select("deck_id")
    .in("deck_id", deckIds)
    .is("deleted_at", null);

  if (error) {
    console.error("Error getting flashcard counts:", error);
    return new Map();
  }

  // Count flashcards per deck
  const counts = new Map<string, number>();
  for (const flashcard of data || []) {
    const deckId = flashcard.deck_id.toString();
    counts.set(deckId, (counts.get(deckId) || 0) + 1);
  }

  return counts;
}

/**
 * Gets a single deck by ID
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID for ownership verification
 * @param deckId - Deck ID to retrieve
 * @returns Deck DTO or null if not found
 */
export async function getDeck(
  supabase: SupabaseClient,
  userId: string,
  deckId: string
): Promise<DeckDto | null> {
  const { data: deck, error } = await supabase
    .from("decks")
    .select("*")
    .eq("id", parseInt(deckId))
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("Error getting deck:", error);
    throw new Error("Failed to get deck");
  }

  if (!deck) {
    return null;
  }

  // Get flashcard count for this deck
  const flashcardCount = await getSingleDeckFlashcardCount(supabase, deck.id);

  return {
    id: deck.id.toString(),
    user_id: deck.user_id,
    name: deck.name,
    description: deck.description,
    visibility: deck.visibility as "private",
    is_default: deck.is_default,
    flashcard_count: flashcardCount,
    created_at: deck.created_at,
    updated_at: deck.updated_at,
  };
}

/**
 * Gets flashcard count for a single deck
 */
async function getSingleDeckFlashcardCount(
  supabase: SupabaseClient,
  deckId: number
): Promise<number> {
  const { count, error } = await supabase
    .from("flashcards")
    .select("*", { count: "exact", head: true })
    .eq("deck_id", deckId)
    .is("deleted_at", null);

  if (error) {
    console.error("Error counting flashcards:", error);
    return 0;
  }

  return count || 0;
}

/**
 * Gets the default deck for a user
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID to get default deck for
 * @returns Default deck DTO or null if not found
 */
export async function getDefaultDeck(
  supabase: SupabaseClient,
  userId: string
): Promise<DeckDto | null> {
  const { data: deck, error } = await supabase
    .from("decks")
    .select("*")
    .eq("user_id", userId)
    .eq("is_default", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("Error getting default deck:", error);
    throw new Error("Failed to get default deck");
  }

  if (!deck) {
    return null;
  }

  // Get flashcard count
  const flashcardCount = await getSingleDeckFlashcardCount(supabase, deck.id);

  return {
    id: deck.id.toString(),
    user_id: deck.user_id,
    name: deck.name,
    description: deck.description,
    visibility: deck.visibility as "private",
    is_default: deck.is_default,
    flashcard_count: flashcardCount,
    created_at: deck.created_at,
    updated_at: deck.updated_at,
  };
}

/**
 * Creates a new deck
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID creating the deck
 * @param command - Deck creation data
 * @returns Created deck DTO
 * @throws DuplicateDeckError if deck name already exists for user
 */
export async function createDeck(
  supabase: SupabaseClient,
  userId: string,
  command: CreateDeckCommand
): Promise<DeckDto> {
  try {
    const { data: deck, error } = await supabase
      .from("decks")
      .insert({
        user_id: userId,
        name: command.name,
        description: command.description || null,
        visibility: "private",
        is_default: false,
      })
      .select()
      .single();

    if (error) {
      if (isUniqueViolation(error)) {
        throw new DuplicateDeckError(command.name);
      }
      console.error("Error creating deck:", error);
      throw new Error("Failed to create deck");
    }

    return {
      id: deck.id.toString(),
      user_id: deck.user_id,
      name: deck.name,
      description: deck.description,
      visibility: deck.visibility as "private",
      is_default: deck.is_default,
      flashcard_count: 0, // New deck has no flashcards
      created_at: deck.created_at,
      updated_at: deck.updated_at,
    };
  } catch (error) {
    if (error instanceof DuplicateDeckError) {
      throw error;
    }
    console.error("Exception creating deck:", error);
    throw new Error("Failed to create deck");
  }
}

/**
 * Updates an existing deck
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID for ownership verification
 * @param deckId - Deck ID to update
 * @param updates - Fields to update
 * @returns Updated deck DTO
 * @throws DuplicateDeckError if new name conflicts with existing deck
 */
export async function updateDeck(
  supabase: SupabaseClient,
  userId: string,
  deckId: string,
  updates: UpdateDeckCommand
): Promise<DeckDto> {
  try {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }

    if (updates.description !== undefined) {
      updateData.description = updates.description;
    }

    const { data: deck, error } = await supabase
      .from("decks")
      .update(updateData)
      .eq("id", parseInt(deckId))
      .eq("user_id", userId)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      if (isUniqueViolation(error)) {
        throw new DuplicateDeckError(updates.name || "");
      }
      console.error("Error updating deck:", error);
      throw new Error("Failed to update deck");
    }

    // Get flashcard count
    const flashcardCount = await getSingleDeckFlashcardCount(supabase, deck.id);

    return {
      id: deck.id.toString(),
      user_id: deck.user_id,
      name: deck.name,
      description: deck.description,
      visibility: deck.visibility as "private",
      is_default: deck.is_default,
      flashcard_count: flashcardCount,
      created_at: deck.created_at,
      updated_at: deck.updated_at,
    };
  } catch (error) {
    if (error instanceof DuplicateDeckError) {
      throw error;
    }
    console.error("Exception updating deck:", error);
    throw new Error("Failed to update deck");
  }
}

/**
 * Verifies that a deck exists and belongs to the specified user
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID to check ownership against
 * @param deckId - Deck ID to verify
 * @returns true if deck exists and belongs to user, false otherwise
 */
export async function verifyDeckOwnership(
  supabase: SupabaseClient,
  userId: string,
  deckId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("decks")
      .select("id, user_id")
      .eq("id", parseInt(deckId))
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      console.error("Error verifying deck ownership:", error);
      return false;
    }

    return data !== null;
  } catch (err) {
    console.error("Exception verifying deck ownership:", err);
    return false;
  }
}

/**
 * Deletes a deck and migrates its flashcards to the default deck
 * 
 * This is a complex transaction with 9 steps:
 * 1. Verify deck exists and is not default
 * 2. Get default deck ID
 * 3. Count flashcards to migrate
 * 4. Create migration tag (if flashcards > 0)
 * 5. Update flashcards deck_id
 * 6. Add migration tag to flashcards
 * 7. Soft-delete deck
 * 8. Commit transaction
 * 9. Return migration result
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID for ownership verification
 * @param deckId - Deck ID to delete
 * @returns Deletion result with migration statistics
 * @throws DefaultDeckError if attempting to delete default deck
 */
export async function deleteDeck(
  supabase: SupabaseClient,
  userId: string,
  deckId: string
): Promise<DeckDeletionResultDto> {
  try {
    // Step 1: Verify deck exists and is not default
    const { data: deck, error: verifyError } = await supabase
      .from("decks")
      .select("id, name, is_default")
      .eq("id", parseInt(deckId))
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (verifyError || !deck) {
      console.error("Error verifying deck:", verifyError);
      throw new Error("Deck not found");
    }

    if (deck.is_default) {
      throw new DefaultDeckError("delete");
    }

    // Step 2: Get default deck ID
    const { data: defaultDeck, error: defaultError } = await supabase
      .from("decks")
      .select("id")
      .eq("user_id", userId)
      .eq("is_default", true)
      .is("deleted_at", null)
      .single();

    if (defaultError || !defaultDeck) {
      console.error("Error getting default deck:", defaultError);
      throw new Error("Default deck not found");
    }

    const defaultDeckId = defaultDeck.id;

    // Step 3: Count flashcards to migrate
    const { count: flashcardCount, error: countError } = await supabase
      .from("flashcards")
      .select("*", { count: "exact", head: true })
      .eq("deck_id", parseInt(deckId))
      .is("deleted_at", null);

    if (countError) {
      console.error("Error counting flashcards:", countError);
      throw new Error("Failed to count flashcards");
    }

    const migratedCount = flashcardCount || 0;
    let migrationTag: { id: string; name: string } | null = null;

    // Step 4: Create migration tag (if flashcards > 0)
    if (migratedCount > 0) {
      const sanitizedDeckName = sanitizeDeckName(deck.name);
      const tagName = `#deleted-from-${sanitizedDeckName}`;

      const { data: tag, error: tagError } = await supabase
        .from("tags")
        .upsert(
          {
            name: tagName,
            scope: "deck",
            deck_id: defaultDeckId,
            user_id: userId,
          },
          {
            onConflict: "name,deck_id",
            ignoreDuplicates: false,
          }
        )
        .select("id, name")
        .single();

      if (tagError || !tag) {
        console.warn("Warning: Failed to create migration tag:", tagError);
        // Continue without tag - not critical
      } else {
        migrationTag = {
          id: tag.id.toString(),
          name: tag.name,
        };
      }

      // Step 5: Update flashcards deck_id
      const { error: updateError } = await supabase
        .from("flashcards")
        .update({ deck_id: defaultDeckId })
        .eq("deck_id", parseInt(deckId))
        .is("deleted_at", null);

      if (updateError) {
        console.error("Error migrating flashcards:", updateError);
        throw new Error("Failed to migrate flashcards");
      }

      // Step 6: Add migration tag to flashcards
      if (migrationTag) {
        // Get IDs of migrated flashcards
        const { data: flashcards, error: flashcardsError } = await supabase
          .from("flashcards")
          .select("id")
          .eq("deck_id", defaultDeckId)
          .is("deleted_at", null)
          .order("updated_at", { ascending: false })
          .limit(migratedCount);

        if (!flashcardsError && flashcards && flashcards.length > 0) {
          // Bulk insert flashcard-tag associations
          const tagAssociations = flashcards.map(fc => ({
            flashcard_id: fc.id,
            tag_id: parseInt(migrationTag!.id),
          }));

          const { error: tagAssocError } = await supabase
            .from("flashcard_tags")
            .upsert(tagAssociations, {
              onConflict: "flashcard_id,tag_id",
              ignoreDuplicates: true,
            });

          if (tagAssocError) {
            console.warn("Warning: Failed to associate tags:", tagAssocError);
            // Continue - not critical
          }
        }
      }
    }

    // Step 7: Soft-delete deck
    const { error: deleteError } = await supabase
      .from("decks")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", parseInt(deckId))
      .eq("user_id", userId);

    if (deleteError) {
      console.error("Error soft-deleting deck:", deleteError);
      throw new Error("Failed to delete deck");
    }

    // Step 8 & 9: Return migration result
    return {
      message: "Deck deleted successfully",
      migrated_flashcards_count: migratedCount,
      migration_tag: migrationTag || {
        id: "0",
        name: "",
      },
    };
  } catch (error) {
    if (error instanceof DefaultDeckError) {
      throw error;
    }
    console.error("Exception during deck deletion:", error);
    throw error;
  }
}

