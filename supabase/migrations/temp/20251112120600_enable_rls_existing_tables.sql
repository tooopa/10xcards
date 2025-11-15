-- migration: enable rls on existing tables
-- description: re-enables row level security on generations, flashcards, and generation_error_logs tables
-- affected tables: generations, flashcards, generation_error_logs
-- special considerations:
--   - restores rls that was previously disabled in migration 20240320143003
--   - ensures all tables in the system enforce proper access control
--   - policies are granular: separate policies for each operation and role

-- re-enable row level security on existing tables
alter table public.generations enable row level security;
alter table public.flashcards enable row level security;
alter table public.generation_error_logs enable row level security;

-- ============================================================================
-- generations table rls policies
-- ============================================================================

-- policy: authenticated users can view their own generations
-- rationale: users see only their personal generation history
create policy "Users can view their own generations"
    on public.generations for select
    to authenticated
    using (auth.uid() = user_id);

-- policy: authenticated users can create their own generations
-- rationale: users can initiate flashcard generation
create policy "Users can create their own generations"
    on public.generations for insert
    to authenticated
    with check (auth.uid() = user_id);

-- policy: authenticated users can update their own generations
-- rationale: users can update generation metadata (e.g. acceptance counts)
create policy "Users can update their own generations"
    on public.generations for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- policy: authenticated users can delete their own generations
-- rationale: users can remove their generation history
create policy "Users can delete their own generations"
    on public.generations for delete
    to authenticated
    using (auth.uid() = user_id);

-- ============================================================================
-- flashcards table rls policies
-- ============================================================================

-- policy: authenticated users can view their own flashcards
-- rationale: users see only flashcards they created
create policy "Users can view their own flashcards"
    on public.flashcards for select
    to authenticated
    using (auth.uid() = user_id);

-- policy: authenticated users can create their own flashcards
-- rationale: users can add flashcards to their decks
create policy "Users can create their own flashcards"
    on public.flashcards for insert
    to authenticated
    with check (auth.uid() = user_id);

-- policy: authenticated users can update their own flashcards
-- rationale: users can edit flashcards they own
create policy "Users can update their own flashcards"
    on public.flashcards for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- policy: authenticated users can delete their own flashcards
-- rationale: users can remove flashcards they created
create policy "Users can delete their own flashcards"
    on public.flashcards for delete
    to authenticated
    using (auth.uid() = user_id);

-- ============================================================================
-- generation_error_logs table rls policies
-- ============================================================================

-- policy: authenticated users can view their own error logs
-- rationale: users see only errors from their generation attempts
create policy "Users can view their own error logs"
    on public.generation_error_logs for select
    to authenticated
    using (auth.uid() = user_id);

-- policy: authenticated users can create their own error logs
-- rationale: system can log errors during user's generation attempts
create policy "Users can create their own error logs"
    on public.generation_error_logs for insert
    to authenticated
    with check (auth.uid() = user_id);

-- note: update and delete policies intentionally omitted
-- error logs are immutable for audit trail purposes

-- add migration comment
comment on table public.generations is 'stores flashcard generation session metadata with rls enabled';
comment on table public.flashcards is 'stores user flashcards organized in decks with rls enabled';
comment on table public.generation_error_logs is 'stores immutable error logs from generation attempts with rls enabled';

