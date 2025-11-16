-- migration: create reviews table
-- description: creates the reviews table for spaced repetition learning algorithm
-- affected tables: reviews
-- special considerations:
--   - stores sm-2 algorithm state (interval, ease_factor, repetitions)
--   - version column for optimistic locking to prevent race conditions
--   - soft-delete synchronized with flashcard deletion
--   - due_at scheduling for study sessions

-- create the reviews table
create table public.reviews (
    id bigserial primary key,
    flashcard_id bigint not null references public.flashcards(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    -- scheduling: when the flashcard is due for next review
    due_at timestamptz not null default now(),
    -- sm-2 algorithm parameters
    -- interval: days until next review
    interval integer not null default 0,
    -- ease_factor: difficulty multiplier (default 2.5 per sm-2)
    ease_factor numeric(4,2) not null default 2.5,
    -- repetitions: number of successful consecutive reviews
    repetitions integer not null default 0,
    -- grade: user's recall quality (0-5 scale per sm-2 algorithm)
    grade smallint check (grade between 0 and 5),
    -- last_review_at: timestamp of most recent review
    last_review_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    -- soft-delete timestamp (synchronized with flashcard)
    deleted_at timestamptz,
    -- version: for optimistic locking in concurrent review sessions
    version integer not null default 0
);

-- create indexes for performance optimization
-- index for filtering reviews by user
create index idx_reviews_user_id on public.reviews(user_id);

-- index for finding reviews by flashcard
create index idx_reviews_flashcard_id on public.reviews(flashcard_id);

-- composite index for querying due reviews per user (most common query)
-- partial index excludes soft-deleted reviews
create index idx_reviews_user_due on public.reviews(user_id, due_at) 
    where deleted_at is null;

-- partial index for active reviews
create index idx_reviews_deleted_at on public.reviews(deleted_at) 
    where deleted_at is null;

-- enable row level security
alter table public.reviews enable row level security;

-- rls policy: users can view their own reviews
-- rationale: users see only their personal learning progress
create policy "Users can view their own reviews"
    on public.reviews for select
    to authenticated
    using (auth.uid() = user_id);

-- rls policy: users can create their own reviews
-- rationale: users can start reviewing their flashcards
create policy "Users can create their own reviews"
    on public.reviews for insert
    to authenticated
    with check (auth.uid() = user_id);

-- rls policy: users can update their own reviews
-- rationale: users can record review results and update algorithm state
create policy "Users can update their own reviews"
    on public.reviews for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- rls policy: users can delete their own reviews
-- rationale: users can reset learning progress if needed
create policy "Users can delete their own reviews"
    on public.reviews for delete
    to authenticated
    using (auth.uid() = user_id);

-- create trigger for automatically updating updated_at timestamp
create trigger set_updated_at_reviews
    before update on public.reviews
    for each row
    execute function public.handle_updated_at();

-- add table and column comments for documentation
comment on table public.reviews is 'stores spaced repetition state for flashcard learning using sm-2 algorithm';
comment on column public.reviews.due_at is 'timestamp when flashcard is scheduled for next review';
comment on column public.reviews.interval is 'number of days until next review (sm-2 algorithm)';
comment on column public.reviews.ease_factor is 'difficulty multiplier for scheduling (sm-2 algorithm, default 2.5)';
comment on column public.reviews.repetitions is 'count of consecutive successful reviews';
comment on column public.reviews.grade is 'user recall quality rating (0-5 scale per sm-2 algorithm)';
comment on column public.reviews.version is 'version counter for optimistic locking in concurrent updates';
comment on column public.reviews.deleted_at is 'soft-delete timestamp, synchronized with flashcard deletion';


