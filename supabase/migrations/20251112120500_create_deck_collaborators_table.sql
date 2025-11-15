-- migration: create deck_collaborators table
-- description: creates table for future deck sharing functionality (mvp: table structure only)
-- affected tables: deck_collaborators
-- special considerations:
--   - supports future feature: shared deck access
--   - two roles: cooperator (full crud) and viewer (read-only)
--   - composite primary key ensures unique user-deck relationships
--   - mvp: table created but not actively used

-- create the deck_collaborators table
create table public.deck_collaborators (
    deck_id bigint not null references public.decks(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    -- role determines access level:
    -- cooperator: full crud access like owner
    -- viewer: read-only access
    role varchar(20) not null check (role in ('cooperator', 'viewer')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    -- composite primary key ensures each user can be added once per deck
    primary key (deck_id, user_id)
);

-- create indexes for efficient lookups
-- index for finding all collaborators of a deck
create index idx_deck_collaborators_deck_id on public.deck_collaborators(deck_id);

-- index for finding all decks a user collaborates on
create index idx_deck_collaborators_user_id on public.deck_collaborators(user_id);

-- enable row level security
alter table public.deck_collaborators enable row level security;

-- rls policy: users can view collaborators of decks they own or collaborate on
-- rationale: users see collaborator lists only for decks they have access to
create policy "Users can view collaborators of their decks"
    on public.deck_collaborators for select
    to authenticated
    using (
        -- user is the deck owner
        exists (
            select 1 from public.decks 
            where decks.id = deck_collaborators.deck_id 
            and decks.user_id = auth.uid()
        )
        or
        -- user is a collaborator on the deck
        user_id = auth.uid()
    );

-- rls policy: deck owners can add collaborators
-- rationale: only deck owners can share their decks
create policy "Deck owners can add collaborators"
    on public.deck_collaborators for insert
    to authenticated
    with check (
        exists (
            select 1 from public.decks 
            where decks.id = deck_collaborators.deck_id 
            and decks.user_id = auth.uid()
        )
    );

-- rls policy: deck owners can update collaborator roles
-- rationale: only deck owners can change access levels
create policy "Deck owners can update collaborators"
    on public.deck_collaborators for update
    to authenticated
    using (
        exists (
            select 1 from public.decks 
            where decks.id = deck_collaborators.deck_id 
            and decks.user_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from public.decks 
            where decks.id = deck_collaborators.deck_id 
            and decks.user_id = auth.uid()
        )
    );

-- rls policy: deck owners can remove collaborators
-- rationale: only deck owners can revoke access
create policy "Deck owners can remove collaborators"
    on public.deck_collaborators for delete
    to authenticated
    using (
        exists (
            select 1 from public.decks 
            where decks.id = deck_collaborators.deck_id 
            and decks.user_id = auth.uid()
        )
    );

-- create trigger for automatically updating updated_at timestamp
create trigger set_updated_at_deck_collaborators
    before update on public.deck_collaborators
    for each row
    execute function public.handle_updated_at();

-- add table and column comments for documentation
comment on table public.deck_collaborators is 'stores deck sharing relationships (future feature, structure only in mvp)';
comment on column public.deck_collaborators.role is 'access level: cooperator (full crud) or viewer (read-only)';


