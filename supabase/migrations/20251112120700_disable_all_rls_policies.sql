-- migration: disable all rls policies
-- description: disables all rls policies from all tables defined in migrations
-- affected tables: decks, tags, flashcard_tags, reviews, deck_collaborators
-- special considerations:
--   - this removes all security policies created in previous migrations
--   - tables will be accessible without row-level restrictions (use with caution)
--   - preserves table structure and data, only removes security policies

-- ============================================================================
-- drop policies from decks table
-- ============================================================================

drop policy if exists "Users can view their own decks" on public.decks;
drop policy if exists "Users can create their own decks" on public.decks;
drop policy if exists "Users can update their own decks" on public.decks;
drop policy if exists "Users can delete their own decks" on public.decks;

-- ============================================================================
-- drop policies from tags table
-- ============================================================================

drop policy if exists "Users can view own and global tags" on public.tags;
drop policy if exists "Users can create their own deck tags" on public.tags;
drop policy if exists "Users can update their own tags" on public.tags;
drop policy if exists "Users can delete their own tags" on public.tags;
drop policy if exists "Admins can create global tags" on public.tags;
drop policy if exists "Admins can update global tags" on public.tags;
drop policy if exists "Admins can delete global tags" on public.tags;

-- ============================================================================
-- drop policies from flashcard_tags table
-- ============================================================================

drop policy if exists "Users can view their flashcard tags" on public.flashcard_tags;
drop policy if exists "Users can create tags for their flashcards" on public.flashcard_tags;
drop policy if exists "Users can delete tags from their flashcards" on public.flashcard_tags;

-- ============================================================================
-- drop policies from reviews table
-- ============================================================================

drop policy if exists "Users can view their own reviews" on public.reviews;
drop policy if exists "Users can create their own reviews" on public.reviews;
drop policy if exists "Users can update their own reviews" on public.reviews;
drop policy if exists "Users can delete their own reviews" on public.reviews;

-- ============================================================================
-- drop policies from deck_collaborators table
-- ============================================================================

drop policy if exists "Users can view collaborators of their decks" on public.deck_collaborators;
drop policy if exists "Deck owners can add collaborators" on public.deck_collaborators;
drop policy if exists "Deck owners can update collaborators" on public.deck_collaborators;
drop policy if exists "Deck owners can remove collaborators" on public.deck_collaborators;

-- ============================================================================
-- disable rls on all newly created tables
-- ============================================================================

-- disable row level security on all new tables
alter table public.decks disable row level security;
alter table public.tags disable row level security;
alter table public.flashcard_tags disable row level security;
alter table public.reviews disable row level security;
alter table public.deck_collaborators disable row level security;

-- note: generations, flashcards, and generation_error_logs rls 
-- was already disabled in migration 20240320143003_disable_rls_policies.sql

-- add migration comments
comment on table public.decks is 'stores flashcard decks owned by users (rls disabled)';
comment on table public.tags is 'stores tags for categorizing flashcards, supports global and deck-scoped tags (rls disabled)';
comment on table public.flashcard_tags is 'junction table for many-to-many relationship between flashcards and tags (rls disabled)';
comment on table public.reviews is 'stores spaced repetition state for flashcard learning using sm-2 algorithm (rls disabled)';
comment on table public.deck_collaborators is 'stores deck sharing relationships (future feature, structure only in mvp) (rls disabled)';


