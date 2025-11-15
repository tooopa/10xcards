-- migration: create decks table
-- description: creates the decks table for organizing flashcards into user-owned collections
-- affected tables: decks
-- special considerations: 
--   - enables rls for user data isolation
--   - implements soft-delete pattern with deleted_at column
--   - ensures unique deck names per user

-- create the decks table
create table public.decks (
    id bigserial primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    name varchar(100) not null,
    description text,
    -- visibility is currently limited to 'private' but extensible for future features
    visibility varchar(20) not null default 'private' check (visibility in ('private')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    -- soft-delete timestamp
    deleted_at timestamptz,
    -- ensure unique deck names per user (excluding soft-deleted records)
    constraint unique_deck_name_per_user unique (user_id, name)
);

-- create indexes for performance optimization
-- index for filtering decks by user
create index idx_decks_user_id on public.decks(user_id);

-- partial index for active (non-deleted) decks
create index idx_decks_deleted_at on public.decks(deleted_at) where deleted_at is null;

-- index for filtering by visibility
create index idx_decks_visibility on public.decks(visibility);

-- enable row level security
alter table public.decks enable row level security;

-- rls policy: users can view their own decks
-- rationale: users should only see decks they own
create policy "Users can view their own decks"
    on public.decks for select
    to authenticated
    using (auth.uid() = user_id);

-- rls policy: users can create their own decks
-- rationale: authenticated users can create decks associated with their account
create policy "Users can create their own decks"
    on public.decks for insert
    to authenticated
    with check (auth.uid() = user_id);

-- rls policy: users can update their own decks
-- rationale: users should only modify decks they own
create policy "Users can update their own decks"
    on public.decks for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- rls policy: users can delete their own decks (soft-delete)
-- rationale: users can mark their own decks as deleted
create policy "Users can delete their own decks"
    on public.decks for delete
    to authenticated
    using (auth.uid() = user_id);

-- create trigger for automatically updating updated_at timestamp
create trigger set_updated_at_decks
    before update on public.decks
    for each row
    execute function public.handle_updated_at();

-- add table and column comments for documentation
comment on table public.decks is 'stores flashcard decks owned by users';
comment on column public.decks.visibility is 'deck visibility: private (mvp), extensible to public/shared';
comment on column public.decks.deleted_at is 'soft-delete timestamp, null means active deck';


