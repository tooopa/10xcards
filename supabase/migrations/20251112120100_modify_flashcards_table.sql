-- migration: modify flashcards table for deck integration
-- description: adds deck relationship, soft-delete support, and full-text search capabilities
-- affected tables: flashcards
-- special considerations:
--   - deck_id uses on delete restrict to prevent accidental deletion of decks with flashcards
--   - full-text search vector is automatically maintained via generated column
--   - existing data must be migrated to associate with a deck

-- add new columns to flashcards table
alter table public.flashcards add column deck_id bigint;
alter table public.flashcards add column deleted_at timestamptz;

-- add foreign key constraint for deck relationship
-- using on delete restrict to enforce soft-delete pattern on decks
alter table public.flashcards 
    add constraint fk_flashcards_deck 
    foreign key (deck_id) references public.decks(id) on delete restrict;

-- add full-text search vector column (automatically maintained)
-- uses 'simple' dictionary to avoid stemming for better control
alter table public.flashcards 
    add column tsv tsvector 
    generated always as (to_tsvector('simple', front || ' ' || back)) stored;

-- make deck_id not null after data migration
-- note: this should be run after ensuring all flashcards are associated with a deck
-- uncomment the following line after data migration:
alter table public.flashcards alter column deck_id set not null;

-- create index for deck relationship
create index idx_flashcards_deck_id on public.flashcards(deck_id);

-- partial index for active (non-deleted) flashcards
create index idx_flashcards_deleted_at on public.flashcards(deleted_at) where deleted_at is null;

-- gin index for full-text search on the tsvector column
create index idx_flashcards_tsv on public.flashcards using gin(tsv);

-- enable pg_trgm extension for fuzzy/like search
create extension if not exists pg_trgm;

-- trigram indexes for pattern matching (like/ilike queries) on front and back
create index idx_flashcards_front_trgm on public.flashcards using gin(front gin_trgm_ops);
create index idx_flashcards_back_trgm on public.flashcards using gin(back gin_trgm_ops);

-- update table comment
comment on column public.flashcards.deck_id is 'reference to the deck containing this flashcard';
comment on column public.flashcards.deleted_at is 'soft-delete timestamp, null means active flashcard';
comment on column public.flashcards.tsv is 'full-text search vector, automatically generated from front and back';


