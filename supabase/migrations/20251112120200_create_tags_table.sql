-- migration: create tags table
-- description: creates the tags table supporting both global and deck-scoped tags
-- affected tables: tags
-- special considerations:
--   - global tags (scope='global') are system-wide and managed by admins
--   - deck tags (scope='deck') are private to a deck and owned by users
--   - check constraints ensure scope consistency with deck_id/user_id
--   - unique indexes prevent duplicate tag names within scope

-- create the tags table
create table public.tags (
    id bigserial primary key,
    name varchar(50) not null,
    -- scope determines tag visibility: 'global' for all users, 'deck' for private tags
    scope varchar(20) not null check (scope in ('global', 'deck')),
    -- deck_id is required for deck-scoped tags, null for global tags
    deck_id bigint references public.decks(id) on delete cascade,
    -- user_id is required for deck-scoped tags (owner), null for global tags
    user_id uuid references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    -- constraint ensures scope consistency:
    -- global tags must have null deck_id and user_id
    -- deck tags must have both deck_id and user_id
    constraint check_scope_consistency check (
        (scope = 'global' and deck_id is null and user_id is null) or
        (scope = 'deck' and deck_id is not null and user_id is not null)
    )
);

-- create indexes for performance optimization
-- index for filtering by scope
create index idx_tags_scope on public.tags(scope);

-- partial index for deck-scoped tags by user
create index idx_tags_user_id on public.tags(user_id) where user_id is not null;

-- partial index for deck-scoped tags by deck
create index idx_tags_deck_id on public.tags(deck_id) where deck_id is not null;

-- unique index for global tag names (system-wide uniqueness)
create unique index idx_tags_global_name on public.tags(name) where scope = 'global';

-- unique index for deck tag names (unique within deck scope)
create unique index idx_tags_deck_name on public.tags(deck_id, name) where scope = 'deck';

-- enable row level security
alter table public.tags enable row level security;

-- rls policy: users can view global tags and their own deck tags
-- rationale: global tags are visible to all, users see only their private tags
create policy "Users can view own and global tags"
    on public.tags for select
    to authenticated
    using (
        scope = 'global' or 
        (scope = 'deck' and auth.uid() = user_id)
    );

-- rls policy: users can create only deck-scoped tags
-- rationale: regular users cannot create global tags (admin-only)
create policy "Users can create their own deck tags"
    on public.tags for insert
    to authenticated
    with check (scope = 'deck' and auth.uid() = user_id);

-- rls policy: users can update only their own deck tags
-- rationale: users modify only tags they own
create policy "Users can update their own tags"
    on public.tags for update
    to authenticated
    using (scope = 'deck' and auth.uid() = user_id)
    with check (scope = 'deck' and auth.uid() = user_id);

-- rls policy: users can delete only their own deck tags
-- rationale: users can remove tags they created
create policy "Users can delete their own tags"
    on public.tags for delete
    to authenticated
    using (scope = 'deck' and auth.uid() = user_id);

-- rls policy: admins can create global tags
-- rationale: only admin role can create system-wide tags
create policy "Admins can create global tags"
    on public.tags for insert
    to authenticated
    with check (
        scope = 'global' and 
        exists (select 1 from auth.users where id = auth.uid() and raw_app_meta_data->>'role' = 'admin')
    );

-- rls policy: admins can update global tags
-- rationale: only admins can modify system-wide tags
create policy "Admins can update global tags"
    on public.tags for update
    to authenticated
    using (
        scope = 'global' and 
        exists (select 1 from auth.users where id = auth.uid() and raw_app_meta_data->>'role' = 'admin')
    )
    with check (
        scope = 'global' and 
        exists (select 1 from auth.users where id = auth.uid() and raw_app_meta_data->>'role' = 'admin')
    );

-- rls policy: admins can delete global tags
-- rationale: only admins can remove system-wide tags
create policy "Admins can delete global tags"
    on public.tags for delete
    to authenticated
    using (
        scope = 'global' and 
        exists (select 1 from auth.users where id = auth.uid() and raw_app_meta_data->>'role' = 'admin')
    );

-- add table and column comments for documentation
comment on table public.tags is 'stores tags for categorizing flashcards, supports global and deck-scoped tags';
comment on column public.tags.scope is 'tag scope: global (system-wide) or deck (user-private)';
comment on column public.tags.deck_id is 'deck reference for deck-scoped tags, null for global tags';
comment on column public.tags.user_id is 'owner of deck-scoped tags, null for global tags';


