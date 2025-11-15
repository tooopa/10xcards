-- migration: create flashcard_tags junction table
-- description: creates many-to-many relationship between flashcards and tags
-- affected tables: flashcard_tags
-- special considerations:
--   - composite primary key ensures each tag is assigned once per flashcard
--   - cascading deletes maintain referential integrity
--   - rls policies ensure users can only tag their own flashcards

-- create the flashcard_tags junction table
create table public.flashcard_tags (
    flashcard_id bigint not null references public.flashcards(id) on delete cascade,
    tag_id bigint not null references public.tags(id) on delete cascade,
    created_at timestamptz not null default now(),
    -- composite primary key prevents duplicate tag assignments
    primary key (flashcard_id, tag_id)
);

-- create indexes for efficient lookups in both directions
-- index for finding all tags for a flashcard
create index idx_flashcard_tags_flashcard_id on public.flashcard_tags(flashcard_id);

-- index for finding all flashcards with a specific tag
create index idx_flashcard_tags_tag_id on public.flashcard_tags(tag_id);

-- enable row level security
alter table public.flashcard_tags enable row level security;

-- rls policy: users can view tags of their own flashcards
-- rationale: users see tag assignments only for flashcards they own
create policy "Users can view their flashcard tags"
    on public.flashcard_tags for select
    to authenticated
    using (
        exists (
            select 1 from public.flashcards 
            where flashcards.id = flashcard_tags.flashcard_id 
            and flashcards.user_id = auth.uid()
        )
    );

-- rls policy: users can tag their own flashcards
-- rationale: users can assign tags to flashcards they own
create policy "Users can create tags for their flashcards"
    on public.flashcard_tags for insert
    to authenticated
    with check (
        exists (
            select 1 from public.flashcards 
            where flashcards.id = flashcard_tags.flashcard_id 
            and flashcards.user_id = auth.uid()
        )
    );

-- rls policy: users can remove tags from their own flashcards
-- rationale: users can unassign tags from flashcards they own
create policy "Users can delete tags from their flashcards"
    on public.flashcard_tags for delete
    to authenticated
    using (
        exists (
            select 1 from public.flashcards 
            where flashcards.id = flashcard_tags.flashcard_id 
            and flashcards.user_id = auth.uid()
        )
    );

-- add table comment for documentation
comment on table public.flashcard_tags is 'junction table for many-to-many relationship between flashcards and tags';


