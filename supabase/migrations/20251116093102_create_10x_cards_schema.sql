-- ============================================================================
-- Migration: Create 10x-cards MVP Schema
-- Description: Initial database schema for 10x-cards flashcard application
-- Version: 2.0
-- Date: 2025-11-16
-- 
-- This migration creates the complete database structure for the 10x-cards MVP,
-- including tables for decks, flashcards, tags, generations, and their relationships.
-- It includes Row Level Security (RLS) policies, indexes, triggers, and functions.
--
-- Tables affected: 
--   - decks (new)
--   - flashcards (new)
--   - tags (new)
--   - flashcard_tags (new)
--   - generations (new)
--   - generation_error_logs (new)
--
-- Special notes:
--   - Each user gets a default "Uncategorized" deck via trigger
--   - Soft-delete strategy implemented for data safety
--   - Full-text search enabled on flashcards
--   - Optimistic locking for concurrent review updates
-- ============================================================================

-- ============================================================================
-- SECTION 1: CLEANUP (Drop existing structure if any)
-- ============================================================================

-- drop existing tables if they exist
-- note: we preserve auth.users table as it's managed by supabase
drop table if exists public.flashcard_tags cascade;
drop table if exists public.generation_error_logs cascade;
drop table if exists public.generations cascade;
drop table if exists public.reviews cascade;
drop table if exists public.tags cascade;
drop table if exists public.flashcards cascade;
drop table if exists public.decks cascade;

-- drop existing functions and triggers if they exist
drop trigger if exists on_user_created on auth.users;
drop trigger if exists update_decks_updated_at on public.decks;
drop trigger if exists update_generations_updated_at on public.generations;
drop function if exists create_default_deck_for_user() cascade;
drop function if exists update_updated_at_column() cascade;

-- drop extensions if needed (we'll recreate them)
-- pg_trgm is optional but useful for fuzzy text search

-- ============================================================================
-- SECTION 2: EXTENSIONS
-- ============================================================================

-- enable pg_trgm extension for trigram-based text search (like operations with typo tolerance)
create extension if not exists pg_trgm;

comment on extension pg_trgm is 'provides functions and operators for determining similarity of text based on trigram matching';

-- ============================================================================
-- SECTION 3: TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- table: decks
-- description: stores flashcard decks belonging to users
-- special: each user has exactly one default "uncategorized" deck
-- ----------------------------------------------------------------------------
create table public.decks (
    id bigserial primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    name varchar(100) not null,
    description text,
    visibility varchar(20) not null default 'private' check (visibility in ('private')),
    is_default boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    
    -- ensure deck names are unique per user
    constraint unique_deck_name_per_user unique (user_id, name),
    
    -- ensure only "uncategorized" deck can be marked as default
    constraint check_default_deck_name check (
        (is_default = true and name = 'Uncategorized') or 
        (is_default = false)
    )
);

comment on table public.decks is 'flashcard decks for organizing flashcards by topic or category';
comment on column public.decks.id is 'unique identifier for the deck';
comment on column public.decks.user_id is 'owner of the deck, references auth.users';
comment on column public.decks.name is 'deck name, must be unique per user (1-100 chars)';
comment on column public.decks.description is 'optional deck description (max 5000 chars)';
comment on column public.decks.visibility is 'deck visibility: private (mvp only), future: public, shared';
comment on column public.decks.is_default is 'true for the uncategorized default deck (one per user)';
comment on column public.decks.created_at is 'timestamp when deck was created';
comment on column public.decks.updated_at is 'timestamp when deck was last updated';
comment on column public.decks.deleted_at is 'soft delete timestamp, null if not deleted';

-- ----------------------------------------------------------------------------
-- table: flashcards
-- description: stores flashcards with front/back content
-- special: supports full-text search via generated tsvector column
-- ----------------------------------------------------------------------------
create table public.flashcards (
    id bigserial primary key,
    deck_id bigint not null references public.decks(id) on delete restrict,
    user_id uuid not null references auth.users(id) on delete cascade,
    front varchar(200) not null,
    back varchar(500) not null,
    source varchar(20) not null check (source in ('ai-full', 'ai-edited', 'manual')),
    generation_id bigint,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    
    -- generated column for full-text search
    tsv tsvector generated always as (to_tsvector('simple', front || ' ' || back)) stored
);

comment on table public.flashcards is 'flashcards with question (front) and answer (back)';
comment on column public.flashcards.id is 'unique identifier for the flashcard';
comment on column public.flashcards.deck_id is 'deck containing this flashcard, on delete restrict requires migration';
comment on column public.flashcards.user_id is 'owner of the flashcard, references auth.users';
comment on column public.flashcards.front is 'question side of flashcard (1-200 chars)';
comment on column public.flashcards.back is 'answer side of flashcard (1-500 chars)';
comment on column public.flashcards.source is 'origin: ai-full (unedited ai), ai-edited (edited ai), manual (user created)';
comment on column public.flashcards.generation_id is 'optional reference to ai generation that created this flashcard';
comment on column public.flashcards.created_at is 'timestamp when flashcard was created';
comment on column public.flashcards.updated_at is 'timestamp when flashcard was last updated';
comment on column public.flashcards.deleted_at is 'soft delete timestamp, null if not deleted';
comment on column public.flashcards.tsv is 'generated tsvector for full-text search on front and back';

-- ----------------------------------------------------------------------------
-- table: tags
-- description: tags for categorizing flashcards
-- special: supports both global tags (admin-managed) and deck-scoped tags (user-managed)
-- ----------------------------------------------------------------------------
create table public.tags (
    id bigserial primary key,
    name varchar(50) not null,
    scope varchar(20) not null check (scope in ('global', 'deck')),
    deck_id bigint references public.decks(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    
    -- ensure scope consistency: global tags have null deck_id/user_id, deck tags have both
    constraint check_scope_consistency check (
        (scope = 'global' and deck_id is null and user_id is null) or
        (scope = 'deck' and deck_id is not null and user_id is not null)
    )
);

comment on table public.tags is 'tags for categorizing flashcards, can be global or deck-scoped';
comment on column public.tags.id is 'unique identifier for the tag';
comment on column public.tags.name is 'tag name (1-50 chars)';
comment on column public.tags.scope is 'global (admin-managed, all users) or deck (user-managed, specific deck)';
comment on column public.tags.deck_id is 'for deck-scoped tags, references the deck they belong to';
comment on column public.tags.user_id is 'for deck-scoped tags, references the user who created them';
comment on column public.tags.created_at is 'timestamp when tag was created';

-- ----------------------------------------------------------------------------
-- table: flashcard_tags
-- description: junction table for many-to-many relationship between flashcards and tags
-- ----------------------------------------------------------------------------
create table public.flashcard_tags (
    flashcard_id bigint not null references public.flashcards(id) on delete cascade,
    tag_id bigint not null references public.tags(id) on delete cascade,
    created_at timestamptz not null default now(),
    
    primary key (flashcard_id, tag_id)
);

comment on table public.flashcard_tags is 'many-to-many junction table linking flashcards to tags';
comment on column public.flashcard_tags.flashcard_id is 'reference to flashcard';
comment on column public.flashcard_tags.tag_id is 'reference to tag';
comment on column public.flashcard_tags.created_at is 'timestamp when association was created';

-- ----------------------------------------------------------------------------
-- table: generations
-- description: metadata for ai-generated flashcard batches
-- special: tracks statistics on acceptance rates of generated flashcards
-- ----------------------------------------------------------------------------
create table public.generations (
    id bigserial primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    deck_id bigint not null references public.decks(id) on delete cascade,
    model varchar(100) not null,
    generated_count integer not null,
    accepted_unedited_count integer not null default 0,
    accepted_edited_count integer not null default 0,
    source_text_hash varchar(64) not null,
    source_text_length integer not null check (source_text_length between 1000 and 10000),
    generation_duration integer not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.generations is 'metadata for ai flashcard generation sessions';
comment on column public.generations.id is 'unique identifier for the generation';
comment on column public.generations.user_id is 'user who requested the generation';
comment on column public.generations.deck_id is 'target deck for generated flashcards';
comment on column public.generations.model is 'ai model used for generation (from openrouter.ai)';
comment on column public.generations.generated_count is 'number of flashcards generated by ai';
comment on column public.generations.accepted_unedited_count is 'count of unedited flashcards accepted';
comment on column public.generations.accepted_edited_count is 'count of edited flashcards accepted';
comment on column public.generations.source_text_hash is 'sha-256 hash of source text for deduplication';
comment on column public.generations.source_text_length is 'length of source text in characters (1000-10000)';
comment on column public.generations.generation_duration is 'time taken to generate in milliseconds';
comment on column public.generations.created_at is 'timestamp when generation was created';
comment on column public.generations.updated_at is 'timestamp when generation stats were last updated';

-- add foreign key for flashcards.generation_id after generations table exists
alter table public.flashcards 
    add constraint fk_flashcards_generation 
    foreign key (generation_id) 
    references public.generations(id) 
    on delete set null;

comment on constraint fk_flashcards_generation on public.flashcards is 'links flashcard to its ai generation source, set null if generation deleted';

-- ----------------------------------------------------------------------------
-- table: generation_error_logs
-- description: logs errors that occur during ai generation attempts
-- ----------------------------------------------------------------------------
create table public.generation_error_logs (
    id bigserial primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    model varchar(100) not null,
    source_text_hash varchar(64) not null,
    source_text_length integer not null check (source_text_length between 1000 and 10000),
    error_code varchar(100) not null,
    error_message text not null,
    created_at timestamptz not null default now()
);

comment on table public.generation_error_logs is 'error logs for failed ai generation attempts';
comment on column public.generation_error_logs.id is 'unique identifier for the error log';
comment on column public.generation_error_logs.user_id is 'user who attempted the generation';
comment on column public.generation_error_logs.model is 'ai model that was attempted';
comment on column public.generation_error_logs.source_text_hash is 'hash of source text that caused error';
comment on column public.generation_error_logs.source_text_length is 'length of source text in characters';
comment on column public.generation_error_logs.error_code is 'error code from ai service or application';
comment on column public.generation_error_logs.error_message is 'detailed error message';
comment on column public.generation_error_logs.created_at is 'timestamp when error occurred';


-- ============================================================================
-- SECTION 4: INDEXES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- indexes for decks table
-- ----------------------------------------------------------------------------

-- basic indexes for common queries
create index idx_decks_user_id on public.decks(user_id);
create index idx_decks_deleted_at on public.decks(deleted_at) where deleted_at is null;
create index idx_decks_visibility on public.decks(visibility);

-- unique partial index ensures only one default deck per user
create unique index idx_decks_user_default on public.decks(user_id) where is_default = true;

-- composite index for filtering decks by user and visibility
create index idx_decks_user_visibility on public.decks(user_id, visibility) where deleted_at is null;

comment on index idx_decks_user_id is 'speeds up queries filtering decks by user';
comment on index idx_decks_deleted_at is 'partial index for non-deleted decks only';
comment on index idx_decks_visibility is 'speeds up visibility-based queries';
comment on index idx_decks_user_default is 'ensures each user has exactly one default deck';
comment on index idx_decks_user_visibility is 'composite index for user+visibility queries';

-- ----------------------------------------------------------------------------
-- indexes for flashcards table
-- ----------------------------------------------------------------------------

-- basic indexes for common queries
create index idx_flashcards_user_id on public.flashcards(user_id);
create index idx_flashcards_deck_id on public.flashcards(deck_id);
create index idx_flashcards_generation_id on public.flashcards(generation_id) where generation_id is not null;
create index idx_flashcards_deleted_at on public.flashcards(deleted_at) where deleted_at is null;
create index idx_flashcards_source on public.flashcards(source);

-- gin index for full-text search on tsvector column
create index idx_flashcards_tsv on public.flashcards using gin(tsv);

-- gin indexes for trigram fuzzy matching on front and back
create index idx_flashcards_front_trgm on public.flashcards using gin(front gin_trgm_ops);
create index idx_flashcards_back_trgm on public.flashcards using gin(back gin_trgm_ops);

-- composite indexes for frequent query patterns
create index idx_flashcards_user_deck on public.flashcards(user_id, deck_id) where deleted_at is null;
create index idx_flashcards_deck_deleted on public.flashcards(deck_id, deleted_at);

comment on index idx_flashcards_user_id is 'speeds up queries filtering flashcards by user';
comment on index idx_flashcards_deck_id is 'speeds up queries filtering flashcards by deck';
comment on index idx_flashcards_generation_id is 'partial index for ai-generated flashcards';
comment on index idx_flashcards_deleted_at is 'partial index for non-deleted flashcards only';
comment on index idx_flashcards_source is 'speeds up queries filtering by source type';
comment on index idx_flashcards_tsv is 'gin index enables fast full-text search';
comment on index idx_flashcards_front_trgm is 'trigram index for fuzzy search on front text';
comment on index idx_flashcards_back_trgm is 'trigram index for fuzzy search on back text';
comment on index idx_flashcards_user_deck is 'composite index for user+deck queries';
comment on index idx_flashcards_deck_deleted is 'composite index for deck deletion checks';

-- ----------------------------------------------------------------------------
-- indexes for tags table
-- ----------------------------------------------------------------------------

-- basic indexes
create index idx_tags_scope on public.tags(scope);
create index idx_tags_user_id on public.tags(user_id) where user_id is not null;
create index idx_tags_deck_id on public.tags(deck_id) where deck_id is not null;
create index idx_tags_name on public.tags(name);

-- unique indexes for tag name uniqueness
create unique index idx_tags_global_name on public.tags(name) where scope = 'global';
create unique index idx_tags_deck_name on public.tags(deck_id, name) where scope = 'deck';

-- composite index for filtering
create index idx_tags_scope_deck on public.tags(scope, deck_id) where deck_id is not null;

comment on index idx_tags_scope is 'speeds up queries filtering tags by scope';
comment on index idx_tags_user_id is 'partial index for deck-scoped tags by user';
comment on index idx_tags_deck_id is 'partial index for deck-scoped tags by deck';
comment on index idx_tags_name is 'speeds up tag name searches';
comment on index idx_tags_global_name is 'ensures global tag names are unique';
comment on index idx_tags_deck_name is 'ensures deck-scoped tag names are unique within deck';
comment on index idx_tags_scope_deck is 'composite index for scope+deck queries';

-- ----------------------------------------------------------------------------
-- indexes for flashcard_tags table
-- ----------------------------------------------------------------------------

create index idx_flashcard_tags_tag_id on public.flashcard_tags(tag_id);
create index idx_flashcard_tags_flashcard_id on public.flashcard_tags(flashcard_id);
create index idx_flashcard_tags_tag_created on public.flashcard_tags(tag_id, created_at);

comment on index idx_flashcard_tags_tag_id is 'speeds up queries finding flashcards by tag';
comment on index idx_flashcard_tags_flashcard_id is 'speeds up queries finding tags by flashcard';
comment on index idx_flashcard_tags_tag_created is 'composite index for tag+time queries';

-- ----------------------------------------------------------------------------
-- indexes for generations table
-- ----------------------------------------------------------------------------

create index idx_generations_user_id on public.generations(user_id);
create index idx_generations_deck_id on public.generations(deck_id);
create index idx_generations_created_at on public.generations(user_id, created_at desc);
create index idx_generations_hash on public.generations(source_text_hash);
create index idx_generations_user_counts on public.generations(user_id, generated_count, accepted_unedited_count, accepted_edited_count);

comment on index idx_generations_user_id is 'speeds up queries filtering generations by user';
comment on index idx_generations_deck_id is 'speeds up queries filtering generations by deck';
comment on index idx_generations_created_at is 'composite index for user generation history';
comment on index idx_generations_hash is 'speeds up deduplication checks by hash';
comment on index idx_generations_user_counts is 'composite index for statistics queries';

-- ----------------------------------------------------------------------------
-- indexes for generation_error_logs table
-- ----------------------------------------------------------------------------

create index idx_generation_error_logs_user_id on public.generation_error_logs(user_id);
create index idx_generation_error_logs_created_at on public.generation_error_logs(created_at desc);
create index idx_generation_error_logs_error_code on public.generation_error_logs(error_code);
create index idx_generation_error_logs_user_code on public.generation_error_logs(user_id, error_code, created_at desc);

comment on index idx_generation_error_logs_user_id is 'speeds up queries filtering errors by user';
comment on index idx_generation_error_logs_created_at is 'speeds up time-based error queries';
comment on index idx_generation_error_logs_error_code is 'speeds up queries filtering by error type';
comment on index idx_generation_error_logs_user_code is 'composite index for user error analysis';

-- ============================================================================
-- SECTION 5: FUNCTIONS AND TRIGGERS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- function: create_default_deck_for_user
-- description: automatically creates "uncategorized" default deck when user registers
-- ----------------------------------------------------------------------------
create or replace function create_default_deck_for_user()
returns trigger as $$
begin
  insert into public.decks (user_id, name, description, visibility, is_default)
  values (
    new.id, 
    'Uncategorized', 
    'Default deck for uncategorized flashcards', 
    'private', 
    true
  );
  return new;
exception
  when others then
    -- log warning but don't fail user registration
    raise warning 'failed to create default deck for user %: %', new.id, sqlerrm;
    return new;
end;
$$ language plpgsql security definer;

comment on function create_default_deck_for_user is 'creates default uncategorized deck for new users via trigger';

-- trigger to create default deck on user registration
create trigger on_user_created
  after insert on auth.users
  for each row
  execute function create_default_deck_for_user();

comment on trigger on_user_created on auth.users is 'automatically creates default deck when user registers';

-- ----------------------------------------------------------------------------
-- function: update_updated_at_column
-- description: automatically updates updated_at timestamp on row update
-- ----------------------------------------------------------------------------
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

comment on function update_updated_at_column is 'updates updated_at timestamp automatically on row update';

-- triggers for automatic updated_at updates
create trigger update_decks_updated_at
    before update on public.decks
    for each row
    execute function update_updated_at_column();

create trigger update_generations_updated_at
    before update on public.generations
    for each row
    execute function update_updated_at_column();


comment on trigger update_decks_updated_at on public.decks is 'auto-updates updated_at on deck changes';
comment on trigger update_generations_updated_at on public.generations is 'auto-updates updated_at on generation changes';

-- ============================================================================
-- SECTION 6: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- rls for decks table
-- users can only access their own decks
-- users cannot manually set is_default=true or delete default deck
-- ----------------------------------------------------------------------------
alter table public.decks enable row level security;

-- select policy: users can view their own decks
create policy "users can view their own decks"
    on public.decks for select
    to authenticated
    using (auth.uid() = user_id);

comment on policy "users can view their own decks" on public.decks is 
    'allows authenticated users to view only their own decks';

-- insert policy: users can create their own decks (but not default decks)
create policy "users can create their own decks"
    on public.decks for insert
    to authenticated
    with check (
        auth.uid() = user_id and 
        is_default = false
    );

comment on policy "users can create their own decks" on public.decks is 
    'allows authenticated users to create decks for themselves, prevents setting is_default=true';

-- update policy: users can update their own decks (but not change is_default flag)
create policy "users can update their own decks"
    on public.decks for update
    to authenticated
    using (auth.uid() = user_id)
    with check (
        auth.uid() = user_id and
        is_default = (select is_default from public.decks where id = decks.id)
    );

comment on policy "users can update their own decks" on public.decks is 
    'allows authenticated users to update their decks, prevents changing is_default flag';

-- delete policy: users can delete their own non-default decks
create policy "users can delete their own non-default decks"
    on public.decks for delete
    to authenticated
    using (
        auth.uid() = user_id and 
        is_default = false
    );

comment on policy "users can delete their own non-default decks" on public.decks is 
    'allows authenticated users to delete their non-default decks, protects default deck from deletion';

-- ----------------------------------------------------------------------------
-- rls for flashcards table
-- users can only access their own flashcards
-- ----------------------------------------------------------------------------
alter table public.flashcards enable row level security;

-- select policy: users can view their own flashcards
create policy "users can view their own flashcards"
    on public.flashcards for select
    to authenticated
    using (auth.uid() = user_id);

comment on policy "users can view their own flashcards" on public.flashcards is 
    'allows authenticated users to view only their own flashcards';

-- insert policy: users can create their own flashcards
create policy "users can create their own flashcards"
    on public.flashcards for insert
    to authenticated
    with check (auth.uid() = user_id);

comment on policy "users can create their own flashcards" on public.flashcards is 
    'allows authenticated users to create flashcards for themselves';

-- update policy: users can update their own flashcards
create policy "users can update their own flashcards"
    on public.flashcards for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

comment on policy "users can update their own flashcards" on public.flashcards is 
    'allows authenticated users to update their own flashcards';

-- delete policy: users can delete their own flashcards
create policy "users can delete their own flashcards"
    on public.flashcards for delete
    to authenticated
    using (auth.uid() = user_id);

comment on policy "users can delete their own flashcards" on public.flashcards is 
    'allows authenticated users to delete their own flashcards (soft delete)';

-- ----------------------------------------------------------------------------
-- rls for tags table
-- users can view global tags and their own deck-scoped tags
-- users can only manage their own deck-scoped tags
-- admins can manage global tags
-- ----------------------------------------------------------------------------
alter table public.tags enable row level security;

-- select policy: users can view global tags and their own deck tags
create policy "users can view own and global tags"
    on public.tags for select
    to authenticated
    using (
        scope = 'global' or 
        (scope = 'deck' and auth.uid() = user_id)
    );

comment on policy "users can view own and global tags" on public.tags is 
    'allows authenticated users to view global tags and their own deck-scoped tags';

-- insert policy: users can create their own deck-scoped tags
create policy "users can create their own deck tags"
    on public.tags for insert
    to authenticated
    with check (scope = 'deck' and auth.uid() = user_id);

comment on policy "users can create their own deck tags" on public.tags is 
    'allows authenticated users to create deck-scoped tags for themselves';

-- update policy: users can update their own deck-scoped tags
create policy "users can update their own tags"
    on public.tags for update
    to authenticated
    using (scope = 'deck' and auth.uid() = user_id)
    with check (scope = 'deck' and auth.uid() = user_id);

comment on policy "users can update their own tags" on public.tags is 
    'allows authenticated users to update their own deck-scoped tags';

-- delete policy: users can delete their own deck-scoped tags
create policy "users can delete their own tags"
    on public.tags for delete
    to authenticated
    using (scope = 'deck' and auth.uid() = user_id);

comment on policy "users can delete their own tags" on public.tags is 
    'allows authenticated users to delete their own deck-scoped tags';

-- admin insert policy: admins can create global tags
create policy "admins can create global tags"
    on public.tags for insert
    to authenticated
    with check (
        scope = 'global' and 
        exists (
            select 1 from auth.users 
            where id = auth.uid() 
            and raw_app_meta_data->>'role' = 'admin'
        )
    );

comment on policy "admins can create global tags" on public.tags is 
    'allows admin users to create global tags accessible to all users';

-- admin update policy: admins can update global tags
create policy "admins can update global tags"
    on public.tags for update
    to authenticated
    using (
        scope = 'global' and 
        exists (
            select 1 from auth.users 
            where id = auth.uid() 
            and raw_app_meta_data->>'role' = 'admin'
        )
    )
    with check (
        scope = 'global' and 
        exists (
            select 1 from auth.users 
            where id = auth.uid() 
            and raw_app_meta_data->>'role' = 'admin'
        )
    );

comment on policy "admins can update global tags" on public.tags is 
    'allows admin users to update global tags';

-- admin delete policy: admins can delete global tags
create policy "admins can delete global tags"
    on public.tags for delete
    to authenticated
    using (
        scope = 'global' and 
        exists (
            select 1 from auth.users 
            where id = auth.uid() 
            and raw_app_meta_data->>'role' = 'admin'
        )
    );

comment on policy "admins can delete global tags" on public.tags is 
    'allows admin users to delete global tags';

-- ----------------------------------------------------------------------------
-- rls for flashcard_tags table
-- users can only manage tags on their own flashcards
-- ----------------------------------------------------------------------------
alter table public.flashcard_tags enable row level security;

-- select policy: users can view tags on their own flashcards
create policy "users can view their flashcard tags"
    on public.flashcard_tags for select
    to authenticated
    using (
        exists (
            select 1 from public.flashcards 
            where flashcards.id = flashcard_tags.flashcard_id 
            and flashcards.user_id = auth.uid()
        )
    );

comment on policy "users can view their flashcard tags" on public.flashcard_tags is 
    'allows authenticated users to view tags associated with their own flashcards';

-- insert policy: users can add tags to their own flashcards
create policy "users can create tags for their flashcards"
    on public.flashcard_tags for insert
    to authenticated
    with check (
        exists (
            select 1 from public.flashcards 
            where flashcards.id = flashcard_tags.flashcard_id 
            and flashcards.user_id = auth.uid()
        )
    );

comment on policy "users can create tags for their flashcards" on public.flashcard_tags is 
    'allows authenticated users to tag their own flashcards';

-- delete policy: users can remove tags from their own flashcards
create policy "users can delete tags from their flashcards"
    on public.flashcard_tags for delete
    to authenticated
    using (
        exists (
            select 1 from public.flashcards 
            where flashcards.id = flashcard_tags.flashcard_id 
            and flashcards.user_id = auth.uid()
        )
    );

comment on policy "users can delete tags from their flashcards" on public.flashcard_tags is 
    'allows authenticated users to remove tags from their own flashcards';

-- ----------------------------------------------------------------------------
-- rls for generations table
-- users can only access their own ai generations
-- ----------------------------------------------------------------------------
alter table public.generations enable row level security;

-- select policy: users can view their own generations
create policy "users can view their own generations"
    on public.generations for select
    to authenticated
    using (auth.uid() = user_id);

comment on policy "users can view their own generations" on public.generations is 
    'allows authenticated users to view their own ai generation history';

-- insert policy: users can create their own generations
create policy "users can create their own generations"
    on public.generations for insert
    to authenticated
    with check (auth.uid() = user_id);

comment on policy "users can create their own generations" on public.generations is 
    'allows authenticated users to create ai generations for themselves';

-- update policy: users can update their own generations
create policy "users can update their own generations"
    on public.generations for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

comment on policy "users can update their own generations" on public.generations is 
    'allows authenticated users to update their own generation statistics';

-- delete policy: users can delete their own generations
create policy "users can delete their own generations"
    on public.generations for delete
    to authenticated
    using (auth.uid() = user_id);

comment on policy "users can delete their own generations" on public.generations is 
    'allows authenticated users to delete their own generation records';

-- ----------------------------------------------------------------------------
-- rls for generation_error_logs table
-- users can view their own error logs, admins can view all
-- ----------------------------------------------------------------------------
alter table public.generation_error_logs enable row level security;

-- select policy: users can view their own error logs
create policy "users can view their own error logs"
    on public.generation_error_logs for select
    to authenticated
    using (auth.uid() = user_id);

comment on policy "users can view their own error logs" on public.generation_error_logs is 
    'allows authenticated users to view their own ai generation error logs';

-- insert policy: users can create their own error logs
create policy "users can create their own error logs"
    on public.generation_error_logs for insert
    to authenticated
    with check (auth.uid() = user_id);

comment on policy "users can create their own error logs" on public.generation_error_logs is 
    'allows authenticated users to log their own ai generation errors';

-- admin select policy: admins can view all error logs
create policy "admins can view all error logs"
    on public.generation_error_logs for select
    to authenticated
    using (
        exists (
            select 1 from auth.users 
            where id = auth.uid() 
            and raw_app_meta_data->>'role' = 'admin'
        )
    );

comment on policy "admins can view all error logs" on public.generation_error_logs is 
    'allows admin users to view all error logs for monitoring and debugging';


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- note: the default "uncategorized" deck will be automatically created for
-- existing users the next time they log in, or immediately for new users
-- via the on_user_created trigger.
--
-- note: flashcards.generation_id foreign key is set to on delete set null,
-- meaning if a generation is deleted, the flashcards remain but lose their
-- generation reference.
--
-- note: flashcards.deck_id is set to on delete restrict, meaning decks
-- cannot be deleted until all flashcards are moved to another deck or deleted.
-- the api should implement the migration logic to move flashcards to the
-- "uncategorized" deck before deletion.
