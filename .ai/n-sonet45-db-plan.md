Na podstawie analizy PRD, notatek z sesji planowania i stacku technologicznego, przedstawiam kompletny schemat bazy danych PostgreSQL:

```markdown
# Schemat bazy danych PostgreSQL - 10x-cards MVP

## 1. Tabele z kolumnami, typami danych i ograniczeniami

### 1.1 decks
Przechowuje talie fiszek należące do użytkowników.

```sql
CREATE TABLE public.decks (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    visibility VARCHAR(20) NOT NULL DEFAULT 'private' CHECK (visibility IN ('private')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT unique_deck_name_per_user UNIQUE (user_id, name)
);
```

**Uwagi:**
- `visibility` enum obecnie zawiera tylko 'private', ale jest rozszerzalny o 'public', 'shared' w przyszłości
- Soft-delete przez `deleted_at`
- Unikalność nazwy w ramach użytkownika

### 1.2 flashcards (modyfikacja istniejącej tabeli)
Przechowuje fiszki utworzone przez użytkowników.

```sql
CREATE TABLE public.flashcards (
    id BIGSERIAL PRIMARY KEY,
    deck_id BIGINT NOT NULL REFERENCES public.decks(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    front VARCHAR(200) NOT NULL,
    back VARCHAR(500) NOT NULL,
    source VARCHAR(20) NOT NULL CHECK (source IN ('ai-full', 'ai-edited', 'manual')),
    generation_id BIGINT REFERENCES public.generations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    tsv TSVECTOR GENERATED ALWAYS AS (to_tsvector('simple', front || ' ' || back)) STORED
);
```

**Uwagi:**
- Dodano `deck_id` (relacja do talii, ON DELETE RESTRICT wymusza soft-delete)
- Dodano `deleted_at` dla soft-delete
- Dodano `tsv` dla pełnotekstowego wyszukiwania

### 1.3 tags
Przechowuje tagi dla fiszek - globalne lub prywatne w ramach talii.

```sql
CREATE TABLE public.tags (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    scope VARCHAR(20) NOT NULL CHECK (scope IN ('global', 'deck')),
    deck_id BIGINT REFERENCES public.decks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_scope_consistency CHECK (
        (scope = 'global' AND deck_id IS NULL AND user_id IS NULL) OR
        (scope = 'deck' AND deck_id IS NOT NULL AND user_id IS NOT NULL)
    )
);
```

**Uwagi:**
- `scope='global'`: tag dostępny dla wszystkich, `deck_id` i `user_id` NULL
- `scope='deck'`: tag prywatny, musi mieć `deck_id` i `user_id`

### 1.4 flashcard_tags
Tabela łączącaMany-to-Many między fiszkami a tagami.

```sql
CREATE TABLE public.flashcard_tags (
    flashcard_id BIGINT NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (flashcard_id, tag_id)
);
```

### 1.5 reviews
Przechowuje historię i stan powtórek dla algorytmu spaced-repetition.

```sql
CREATE TABLE public.reviews (
    id BIGSERIAL PRIMARY KEY,
    flashcard_id BIGINT NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    due_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    interval INTEGER NOT NULL DEFAULT 0,
    ease_factor NUMERIC(4,2) NOT NULL DEFAULT 2.5,
    repetitions INTEGER NOT NULL DEFAULT 0,
    grade SMALLINT CHECK (grade BETWEEN 0 AND 5),
    last_review_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    version INTEGER NOT NULL DEFAULT 0
);
```

**Uwagi:**
- `grade`: ocena użytkownika (0-5) przy każdym powtórzeniu
- `version`: optimistic locking dla zapobiegania wyścigom
- Soft-delete synchronizowany z fiszką

### 1.6 deck_collaborators
Tabela dla przyszłego współdzielenia talii (pusta w MVP).

```sql
CREATE TABLE public.deck_collaborators (
    deck_id BIGINT NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('cooperator', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (deck_id, user_id)
);
```

**Uwagi:**
- `cooperator`: pełne uprawnienia CRUD jak właściciel
- `viewer`: tylko uprawnienia do odczytu

### 1.7 generations (istniejąca, bez zmian)
```sql
CREATE TABLE public.generations (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    model VARCHAR NOT NULL,
    generated_count INTEGER NOT NULL,
    accepted_unedited_count INTEGER,
    accepted_edited_count INTEGER,
    source_text_hash VARCHAR NOT NULL,
    source_text_length INTEGER NOT NULL CHECK (source_text_length BETWEEN 1000 AND 10000),
    generation_duration INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 1.8 generation_error_logs (istniejąca, bez zmian)
```sql
CREATE TABLE public.generation_error_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    model VARCHAR NOT NULL,
    source_text_hash VARCHAR NOT NULL,
    source_text_length INTEGER NOT NULL CHECK (source_text_length BETWEEN 1000 AND 10000),
    error_code VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 2. Relacje między tabelami

### Hierarchia główna:
```
auth.users (Supabase)
  ├─1→* decks
  │     └─1→* flashcards
  │           ├─*←→* tags (przez flashcard_tags)
  │           └─1→* reviews
  ├─1→* generations
  │     └─1→* flashcards (opcjonalnie)
  └─1→* generation_error_logs

decks *←→* auth.users (przez deck_collaborators)
```

### Szczegółowe relacje:

1. **users → decks**: 1-to-Many
   - Użytkownik może mieć wiele talii
   - `decks.user_id` → `auth.users.id` (ON DELETE CASCADE)

2. **decks → flashcards**: 1-to-Many
   - Talia zawiera wiele fiszek
   - `flashcards.deck_id` → `decks.id` (ON DELETE RESTRICT - wymusza soft-delete)

3. **users → flashcards**: 1-to-Many
   - Użytkownik jest właścicielem fiszek
   - `flashcards.user_id` → `auth.users.id` (ON DELETE CASCADE)

4. **flashcards ←→ tags**: Many-to-Many (przez `flashcard_tags`)
   - Fiszka może mieć wiele tagów, tag może być przypisany do wielu fiszek
   - `flashcard_tags.flashcard_id` → `flashcards.id` (ON DELETE CASCADE)
   - `flashcard_tags.tag_id` → `tags.id` (ON DELETE CASCADE)

5. **flashcards → reviews**: 1-to-Many
   - Fiszka może mieć wiele powtórek
   - `reviews.flashcard_id` → `flashcards.id` (ON DELETE CASCADE)

6. **users → reviews**: 1-to-Many
   - Użytkownik ma swoje powtórki
   - `reviews.user_id` → `auth.users.id` (ON DELETE CASCADE)

7. **decks ←→ users**: Many-to-Many (przez `deck_collaborators`)
   - Talia może być współdzielona z wieloma użytkownikami (przyszłość)
   - `deck_collaborators.deck_id` → `decks.id` (ON DELETE CASCADE)
   - `deck_collaborators.user_id` → `auth.users.id` (ON DELETE CASCADE)

8. **generations → flashcards**: 1-to-Many (opcjonalnie)
   - Generacja może być źródłem wielu fiszek
   - `flashcards.generation_id` → `generations.id` (ON DELETE SET NULL)

9. **users → tags**: 1-to-Many (dla tagów prywatnych)
   - Użytkownik może tworzyć własne tagi
   - `tags.user_id` → `auth.users.id` (ON DELETE CASCADE, tylko dla scope='deck')

10. **decks → tags**: 1-to-Many (dla tagów prywatnych)
    - Talia może mieć własne tagi
    - `tags.deck_id` → `decks.id` (ON DELETE CASCADE, tylko dla scope='deck')

## 3. Indeksy

### decks
```sql
CREATE INDEX idx_decks_user_id ON public.decks(user_id);
CREATE INDEX idx_decks_deleted_at ON public.decks(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_decks_visibility ON public.decks(visibility);
```

### flashcards
```sql
CREATE INDEX idx_flashcards_user_id ON public.flashcards(user_id);
CREATE INDEX idx_flashcards_deck_id ON public.flashcards(deck_id);
CREATE INDEX idx_flashcards_generation_id ON public.flashcards(generation_id);
CREATE INDEX idx_flashcards_deleted_at ON public.flashcards(deleted_at) WHERE deleted_at IS NULL;

-- Pełnotekstowe wyszukiwanie
CREATE INDEX idx_flashcards_tsv ON public.flashcards USING GIN(tsv);

-- PG_TRGM dla wyszukiwania LIKE
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_flashcards_front_trgm ON public.flashcards USING GIN(front gin_trgm_ops);
CREATE INDEX idx_flashcards_back_trgm ON public.flashcards USING GIN(back gin_trgm_ops);
```

### tags
```sql
CREATE INDEX idx_tags_scope ON public.tags(scope);
CREATE INDEX idx_tags_user_id ON public.tags(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_tags_deck_id ON public.tags(deck_id) WHERE deck_id IS NOT NULL;

-- Unikalność dla tagów globalnych
CREATE UNIQUE INDEX idx_tags_global_name ON public.tags(name) WHERE scope = 'global';

-- Unikalność dla tagów prywatnych w ramach talii
CREATE UNIQUE INDEX idx_tags_deck_name ON public.tags(deck_id, name) WHERE scope = 'deck';
```

### flashcard_tags
```sql
CREATE INDEX idx_flashcard_tags_tag_id ON public.flashcard_tags(tag_id);
CREATE INDEX idx_flashcard_tags_flashcard_id ON public.flashcard_tags(flashcard_id);
```

### reviews
```sql
CREATE INDEX idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX idx_reviews_flashcard_id ON public.reviews(flashcard_id);
CREATE INDEX idx_reviews_user_due ON public.reviews(user_id, due_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_reviews_deleted_at ON public.reviews(deleted_at) WHERE deleted_at IS NULL;
```

### deck_collaborators
```sql
CREATE INDEX idx_deck_collaborators_user_id ON public.deck_collaborators(user_id);
CREATE INDEX idx_deck_collaborators_deck_id ON public.deck_collaborators(deck_id);
```

### generations
```sql
CREATE INDEX idx_generations_user_id ON public.generations(user_id);
```

### generation_error_logs
```sql
CREATE INDEX idx_generation_error_logs_user_id ON public.generation_error_logs(user_id);
```

## 4. Zasady PostgreSQL Row Level Security (RLS)

### 4.1 decks
```sql
ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;

-- Użytkownik widzi swoje talie
CREATE POLICY "Users can view their own decks"
    ON public.decks FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Użytkownik tworzy swoje talie
CREATE POLICY "Users can create their own decks"
    ON public.decks FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Użytkownik aktualizuje swoje talie
CREATE POLICY "Users can update their own decks"
    ON public.decks FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Użytkownik usuwa swoje talie (soft-delete)
CREATE POLICY "Users can delete their own decks"
    ON public.decks FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
```

### 4.2 flashcards
```sql
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own flashcards"
    ON public.flashcards FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own flashcards"
    ON public.flashcards FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcards"
    ON public.flashcards FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcards"
    ON public.flashcards FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
```

### 4.3 tags
```sql
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Użytkownik widzi swoje tagi + tagi globalne
CREATE POLICY "Users can view own and global tags"
    ON public.tags FOR SELECT
    TO authenticated
    USING (
        scope = 'global' OR 
        (scope = 'deck' AND auth.uid() = user_id)
    );

-- Użytkownik tworzy tylko swoje tagi prywatne
CREATE POLICY "Users can create their own deck tags"
    ON public.tags FOR INSERT
    TO authenticated
    WITH CHECK (scope = 'deck' AND auth.uid() = user_id);

-- Użytkownik aktualizuje tylko swoje tagi
CREATE POLICY "Users can update their own tags"
    ON public.tags FOR UPDATE
    TO authenticated
    USING (scope = 'deck' AND auth.uid() = user_id)
    WITH CHECK (scope = 'deck' AND auth.uid() = user_id);

-- Użytkownik usuwa tylko swoje tagi
CREATE POLICY "Users can delete their own tags"
    ON public.tags FOR DELETE
    TO authenticated
    USING (scope = 'deck' AND auth.uid() = user_id);

-- Admin może tworzyć tagi globalne (wymaga roli admin w Supabase)
CREATE POLICY "Admins can create global tags"
    ON public.tags FOR INSERT
    TO authenticated
    WITH CHECK (
        scope = 'global' AND 
        EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_app_meta_data->>'role' = 'admin')
    );

-- Admin może aktualizować tagi globalne
CREATE POLICY "Admins can update global tags"
    ON public.tags FOR UPDATE
    TO authenticated
    USING (
        scope = 'global' AND 
        EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_app_meta_data->>'role' = 'admin')
    )
    WITH CHECK (
        scope = 'global' AND 
        EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_app_meta_data->>'role' = 'admin')
    );

-- Admin może usuwać tagi globalne
CREATE POLICY "Admins can delete global tags"
    ON public.tags FOR DELETE
    TO authenticated
    USING (
        scope = 'global' AND 
        EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_app_meta_data->>'role' = 'admin')
    );
```

### 4.4 flashcard_tags
```sql
ALTER TABLE public.flashcard_tags ENABLE ROW LEVEL SECURITY;

-- Użytkownik widzi tagi swoich fiszek
CREATE POLICY "Users can view their flashcard tags"
    ON public.flashcard_tags FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.flashcards 
            WHERE flashcards.id = flashcard_tags.flashcard_id 
            AND flashcards.user_id = auth.uid()
        )
    );

-- Użytkownik może tagować swoje fiszki
CREATE POLICY "Users can create tags for their flashcards"
    ON public.flashcard_tags FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.flashcards 
            WHERE flashcards.id = flashcard_tags.flashcard_id 
            AND flashcards.user_id = auth.uid()
        )
    );

-- Użytkownik może usuwać tagi ze swoich fiszek
CREATE POLICY "Users can delete tags from their flashcards"
    ON public.flashcard_tags FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.flashcards 
            WHERE flashcards.id = flashcard_tags.flashcard_id 
            AND flashcards.user_id = auth.uid()
        )
    );
```

### 4.5 reviews
```sql
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reviews"
    ON public.reviews FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reviews"
    ON public.reviews FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
    ON public.reviews FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK