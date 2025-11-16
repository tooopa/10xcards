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
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT unique_deck_name_per_user UNIQUE (user_id, name),
    CONSTRAINT check_default_deck_name CHECK (
        (is_default = true AND name = 'Uncategorized') OR 
        (is_default = false)
    )
);
```

**Uwagi:**
- `visibility` enum obecnie zawiera tylko 'private', ale jest rozszerzalny o 'public', 'shared' w przyszłości
- `is_default` oznacza domyślną talię "Uncategorized" (nieusuwalną)
- Soft-delete przez `deleted_at`
- Unikalność nazwy w ramach użytkownika
- Check constraint zapewnia, że tylko talia "Uncategorized" może mieć is_default=true

### 1.2 flashcards
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
- `deck_id` relacja do talii, ON DELETE RESTRICT wymusza ręczną migrację przed usunięciem talii
- `source` określa pochodzenie fiszki: 'ai-full' (AI bez edycji), 'ai-edited' (AI z edycją), 'manual' (ręcznie utworzona)
- `generation_id` opcjonalnie łączy z generacją AI
- `deleted_at` dla soft-delete
- `tsv` dla pełnotekstowego wyszukiwania (automatycznie generowane)

### 1.3 tags
Przechowuje tagi dla fiszek - globalne lub przypisane do talii.

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
- `scope='deck'`: tag prywatny użytkownika, musi mieć `deck_id` i `user_id`
- Tagi `#deleted-from-<nazwa-talii>` są tworzone automatycznie przy usuwaniu talii

### 1.4 flashcard_tags
Tabela łącząca Many-to-Many między fiszkami a tagami.

```sql
CREATE TABLE public.flashcard_tags (
    flashcard_id BIGINT NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (flashcard_id, tag_id)
);
```

**Uwagi:**
- Kaskadowe usuwanie przy usunięciu fiszki lub tagu
- Composite primary key zapewnia unikalność powiązań

### 1.5 generations
Przechowuje metadane generacji fiszek przez AI.

```sql
CREATE TABLE public.generations (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    deck_id BIGINT NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
    model VARCHAR(100) NOT NULL,
    generated_count INTEGER NOT NULL,
    accepted_unedited_count INTEGER NOT NULL DEFAULT 0,
    accepted_edited_count INTEGER NOT NULL DEFAULT 0,
    source_text_hash VARCHAR(64) NOT NULL,
    source_text_length INTEGER NOT NULL CHECK (source_text_length BETWEEN 1000 AND 10000),
    generation_duration INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Uwagi:**
- `deck_id` zapisuje docelową talię dla wygenerowanych fiszek
- `source_text_hash` dla deduplikacji (SHA-256)
- `source_text_length` walidowany w zakresie 1000-10000 znaków
- `generation_duration` w milisekundach
- `accepted_*_count` śledzi statystyki akceptacji

### 1.6 generation_error_logs
Loguje błędy generacji AI.

```sql
CREATE TABLE public.generation_error_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    model VARCHAR(100) NOT NULL,
    source_text_hash VARCHAR(64) NOT NULL,
    source_text_length INTEGER NOT NULL CHECK (source_text_length BETWEEN 1000 AND 10000),
    error_code VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Uwagi:**
- Przechowuje informacje o nieudanych generacjach
- Pomaga w monitoringu i debugowaniu problemów z AI

### 1.7 deck_collaborators
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
- Funkcjonalność poza zakresem MVP

## 2. Relacje między tabelami

### Diagram relacji:
```
auth.users (Supabase)
  ├─1→* decks
  │     ├─1→* flashcards
  │     │     ├─*←→* tags (przez flashcard_tags)
  │     │     └─1→* generations (docelowa talia)
  │     └─1→* tags (tagi przypisane do talii)
  ├─1→* generations
  │     └─1→* flashcards (opcjonalnie przez generation_id)
  └─1→* generation_error_logs

decks *←→* auth.users (przez deck_collaborators, przyszłość)
```

### Szczegółowe relacje:

1. **auth.users → decks**: 1-to-Many
   - Użytkownik może mieć wiele talii
   - `decks.user_id` → `auth.users.id` (ON DELETE CASCADE)
   - Każdy użytkownik ma dokładnie jedną talię z `is_default=true`

2. **decks → flashcards**: 1-to-Many
   - Talia zawiera wiele fiszek
   - `flashcards.deck_id` → `decks.id` (ON DELETE RESTRICT)
   - RESTRICT wymusza migrację fiszek przed usunięciem talii

3. **auth.users → flashcards**: 1-to-Many
   - Użytkownik jest właścicielem fiszek
   - `flashcards.user_id` → `auth.users.id` (ON DELETE CASCADE)

4. **flashcards ←→ tags**: Many-to-Many (przez `flashcard_tags`)
   - Fiszka może mieć wiele tagów, tag może być przypisany do wielu fiszek
   - `flashcard_tags.flashcard_id` → `flashcards.id` (ON DELETE CASCADE)
   - `flashcard_tags.tag_id` → `tags.id` (ON DELETE CASCADE)

5. **decks → tags**: 1-to-Many (dla tagów deck-scoped)
   - Talia może mieć własne tagi
   - `tags.deck_id` → `decks.id` (ON DELETE CASCADE, tylko dla scope='deck')

6. **auth.users → tags**: 1-to-Many (dla tagów deck-scoped)
   - Użytkownik może tworzyć własne tagi
   - `tags.user_id` → `auth.users.id` (ON DELETE CASCADE, tylko dla scope='deck')

7. **auth.users → generations**: 1-to-Many
   - Użytkownik ma historię generacji
   - `generations.user_id` → `auth.users.id` (ON DELETE CASCADE)

8. **decks → generations**: 1-to-Many
   - Generacja jest przypisana do docelowej talii
   - `generations.deck_id` → `decks.id` (ON DELETE CASCADE)

9. **generations → flashcards**: 1-to-Many (opcjonalnie)
   - Generacja może być źródłem wielu fiszek
   - `flashcards.generation_id` → `generations.id` (ON DELETE SET NULL)

10. **decks ←→ auth.users**: Many-to-Many (przez `deck_collaborators`)
    - Talia może być współdzielona z wieloma użytkownikami (przyszłość)
    - `deck_collaborators.deck_id` → `decks.id` (ON DELETE CASCADE)
    - `deck_collaborators.user_id` → `auth.users.id` (ON DELETE CASCADE)

11. **auth.users → generation_error_logs**: 1-to-Many
    - Użytkownik ma logi błędów generacji
    - `generation_error_logs.user_id` → `auth.users.id` (ON DELETE CASCADE)

## 3. Indeksy

### decks
```sql
-- Podstawowe indeksy
CREATE INDEX idx_decks_user_id ON public.decks(user_id);
CREATE INDEX idx_decks_deleted_at ON public.decks(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_decks_visibility ON public.decks(visibility);

-- Indeks dla domyślnej talii (unique partial index)
CREATE UNIQUE INDEX idx_decks_user_default ON public.decks(user_id) WHERE is_default = true;

-- Composite index dla filtrowania
CREATE INDEX idx_decks_user_visibility ON public.decks(user_id, visibility) WHERE deleted_at IS NULL;
```

### flashcards
```sql
-- Podstawowe indeksy
CREATE INDEX idx_flashcards_user_id ON public.flashcards(user_id);
CREATE INDEX idx_flashcards_deck_id ON public.flashcards(deck_id);
CREATE INDEX idx_flashcards_generation_id ON public.flashcards(generation_id) WHERE generation_id IS NOT NULL;
CREATE INDEX idx_flashcards_deleted_at ON public.flashcards(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_flashcards_source ON public.flashcards(source);

-- Pełnotekstowe wyszukiwanie (GIN index)
CREATE INDEX idx_flashcards_tsv ON public.flashcards USING GIN(tsv);

-- PG_TRGM dla wyszukiwania LIKE (opcjonalnie)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_flashcards_front_trgm ON public.flashcards USING GIN(front gin_trgm_ops);
CREATE INDEX idx_flashcards_back_trgm ON public.flashcards USING GIN(back gin_trgm_ops);

-- Composite indexes dla częstych zapytań
CREATE INDEX idx_flashcards_user_deck ON public.flashcards(user_id, deck_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_flashcards_deck_deleted ON public.flashcards(deck_id, deleted_at);
```

### tags
```sql
-- Podstawowe indeksy
CREATE INDEX idx_tags_scope ON public.tags(scope);
CREATE INDEX idx_tags_user_id ON public.tags(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_tags_deck_id ON public.tags(deck_id) WHERE deck_id IS NOT NULL;
CREATE INDEX idx_tags_name ON public.tags(name);

-- Unikalność dla tagów globalnych
CREATE UNIQUE INDEX idx_tags_global_name ON public.tags(name) WHERE scope = 'global';

-- Unikalność dla tagów prywatnych w ramach talii
CREATE UNIQUE INDEX idx_tags_deck_name ON public.tags(deck_id, name) WHERE scope = 'deck';

-- Composite index dla filtrowania
CREATE INDEX idx_tags_scope_deck ON public.tags(scope, deck_id) WHERE deck_id IS NOT NULL;
```

### flashcard_tags
```sql
CREATE INDEX idx_flashcard_tags_tag_id ON public.flashcard_tags(tag_id);
CREATE INDEX idx_flashcard_tags_flashcard_id ON public.flashcard_tags(flashcard_id);

-- Composite index dla częstych zapytań
CREATE INDEX idx_flashcard_tags_tag_created ON public.flashcard_tags(tag_id, created_at);
```

### generations
```sql
CREATE INDEX idx_generations_user_id ON public.generations(user_id);
CREATE INDEX idx_generations_deck_id ON public.generations(deck_id);
CREATE INDEX idx_generations_created_at ON public.generations(user_id, created_at DESC);
CREATE INDEX idx_generations_hash ON public.generations(source_text_hash);

-- Composite index dla statystyk
CREATE INDEX idx_generations_user_counts ON public.generations(user_id, generated_count, accepted_unedited_count, accepted_edited_count);
```

### generation_error_logs
```sql
CREATE INDEX idx_generation_error_logs_user_id ON public.generation_error_logs(user_id);
CREATE INDEX idx_generation_error_logs_created_at ON public.generation_error_logs(created_at DESC);
CREATE INDEX idx_generation_error_logs_error_code ON public.generation_error_logs(error_code);

-- Composite index dla analizy błędów
CREATE INDEX idx_generation_error_logs_user_code ON public.generation_error_logs(user_id, error_code, created_at DESC);
```

### deck_collaborators
```sql
CREATE INDEX idx_deck_collaborators_user_id ON public.deck_collaborators(user_id);
CREATE INDEX idx_deck_collaborators_deck_id ON public.deck_collaborators(deck_id);
CREATE INDEX idx_deck_collaborators_role ON public.deck_collaborators(role);

-- Composite index dla uprawnień
CREATE INDEX idx_deck_collaborators_deck_role ON public.deck_collaborators(deck_id, role);
```

## 4. Funkcje pomocnicze

### 4.1 Funkcja do automatycznego tworzenia domyślnej talii

```sql
CREATE OR REPLACE FUNCTION create_default_deck_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.decks (user_id, name, description, visibility, is_default)
  VALUES (
    NEW.id, 
    'Uncategorized', 
    'Default deck for uncategorized flashcards', 
    'private', 
    true
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create default deck for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_default_deck_for_user IS 'Automatically creates a default "Uncategorized" deck when a new user is registered';
```

### 4.2 Trigger dla automatycznego tworzenia domyślnej talii

```sql
CREATE TRIGGER on_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_deck_for_user();

COMMENT ON TRIGGER on_user_created ON auth.users IS 'Creates default "Uncategorized" deck for newly registered users';
```

### 4.3 Funkcja do aktualizacji updated_at

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column IS 'Automatically updates the updated_at timestamp';
```

### 4.4 Triggery dla updated_at

```sql
CREATE TRIGGER update_decks_updated_at
    BEFORE UPDATE ON public.decks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generations_updated_at
    BEFORE UPDATE ON public.generations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deck_collaborators_updated_at
    BEFORE UPDATE ON public.deck_collaborators
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## 5. Zasady PostgreSQL Row Level Security (RLS)

### 5.1 decks

```sql
ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;

-- Użytkownik widzi swoje talie
CREATE POLICY "Users can view their own decks"
    ON public.decks FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Użytkownik tworzy swoje talie (ale nie może ustawić is_default=true)
CREATE POLICY "Users can create their own decks"
    ON public.decks FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id AND 
        is_default = false
    );

-- Użytkownik aktualizuje swoje talie (ale nie może zmienić is_default)
CREATE POLICY "Users can update their own decks"
    ON public.decks FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id AND
        is_default = (SELECT is_default FROM public.decks WHERE id = decks.id)
    );

-- Użytkownik usuwa swoje talie (soft-delete, ale nie domyślnej)
CREATE POLICY "Users can delete their own non-default decks"
    ON public.decks FOR DELETE
    TO authenticated
    USING (
        auth.uid() = user_id AND 
        is_default = false
    );
```

### 5.2 flashcards

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

### 5.3 tags

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
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_app_meta_data->>'role' = 'admin'
        )
    );

-- Admin może aktualizować tagi globalne
CREATE POLICY "Admins can update global tags"
    ON public.tags FOR UPDATE
    TO authenticated
    USING (
        scope = 'global' AND 
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_app_meta_data->>'role' = 'admin'
        )
    )
    WITH CHECK (
        scope = 'global' AND 
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_app_meta_data->>'role' = 'admin'
        )
    );

-- Admin może usuwać tagi globalne
CREATE POLICY "Admins can delete global tags"
    ON public.tags FOR DELETE
    TO authenticated
    USING (
        scope = 'global' AND 
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_app_meta_data->>'role' = 'admin'
        )
    );
```

### 5.4 flashcard_tags

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

### 5.5 generations

```sql
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own generations"
    ON public.generations FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own generations"
    ON public.generations FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generations"
    ON public.generations FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generations"
    ON public.generations FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
```

### 5.6 generation_error_logs

```sql
ALTER TABLE public.generation_error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own error logs"
    ON public.generation_error_logs FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own error logs"
    ON public.generation_error_logs FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Admins mogą przeglądać wszystkie logi błędów
CREATE POLICY "Admins can view all error logs"
    ON public.generation_error_logs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_app_meta_data->>'role' = 'admin'
        )
    );
```

### 5.7 deck_collaborators

```sql
ALTER TABLE public.deck_collaborators ENABLE ROW LEVEL SECURITY;

-- Użytkownik widzi talie, do których ma dostęp jako współpracownik
CREATE POLICY "Users can view their collaborations"
    ON public.deck_collaborators FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.decks 
            WHERE decks.id = deck_collaborators.deck_id 
            AND decks.user_id = auth.uid()
        )
    );

-- Właściciel talii może dodawać współpracowników
CREATE POLICY "Deck owners can add collaborators"
    ON public.deck_collaborators FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.decks 
            WHERE decks.id = deck_collaborators.deck_id 
            AND decks.user_id = auth.uid()
        )
    );

-- Właściciel talii może aktualizować współpracowników
CREATE POLICY "Deck owners can update collaborators"
    ON public.deck_collaborators FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.decks 
            WHERE decks.id = deck_collaborators.deck_id 
            AND decks.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.decks 
            WHERE decks.id = deck_collaborators.deck_id 
            AND decks.user_id = auth.uid()
        )
    );

-- Właściciel talii może usuwać współpracowników
CREATE POLICY "Deck owners can remove collaborators"
    ON public.deck_collaborators FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.decks 
            WHERE decks.id = deck_collaborators.deck_id 
            AND decks.user_id = auth.uid()
        )
    );
```

## 6. Dodatkowe uwagi i wyjaśnienia

### 6.1 Strategia soft-delete

- **decks**: Soft-delete przez `deleted_at`, ale aplikacja powinna migrować fiszki do "Uncategorized" przed ustawieniem deleted_at
- **flashcards**: Soft-delete przez `deleted_at`
- ON DELETE RESTRICT na `flashcards.deck_id` zapobiega przypadkowemu usunięciu talii z fiszkami

### 6.2 Domyślna talia "Uncategorized"

- Każdy użytkownik ma dokładnie jedną talię z `is_default=true`
- Tworzona automatycznie przez trigger podczas rejestracji
- Nie może być usunięta ani przemianowana (chroniona przez check constraint i RLS)
- Służy jako miejsce docelowe dla fiszek z usuniętych talii

### 6.3 Mechanizm usuwania talii z migracją

Proces usuwania talii (implementowany w aplikacji):
1. Sprawdzenie, czy talia nie jest domyślna (`is_default=false`)
2. Pobranie ID domyślnej talii użytkownika
3. Rozpoczęcie transakcji
4. Migracja wszystkich fiszek do domyślnej talii
5. Utworzenie tagu `#deleted-from-<nazwa-talii>` (scope='deck', przypisany do Uncategorized)
6. Przypisanie tagu do wszystkich przenoszonych fiszek
7. Soft-delete talii (ustawienie `deleted_at`)
8. Commit transakcji

### 6.4 Pełnotekstowe wyszukiwanie

- Kolumna `tsv` w tabeli `flashcards` jest automatycznie generowana
- Używa prostej konfiguracji ('simple') dla obsługi różnych języków
- Index GIN zapewnia szybkie wyszukiwanie
- Opcjonalnie: pg_trgm dla wyszukiwania LIKE z typo-tolerance

### 6.5 Generacje AI

- `source_text_hash` używa SHA-256 dla deduplikacji
- `generation_duration` w milisekundach
- Statystyki akceptacji (`accepted_unedited_count`, `accepted_edited_count`) aktualizowane przy zapisywaniu fiszek
- `deck_id` referencja do docelowej talii (gdzie mają być zapisane fiszki)

### 6.6 System tagowania

- **Tagi globalne** (scope='global'): zarządzane przez adminów, dostępne dla wszystkich
- **Tagi deck-scoped** (scope='deck'): prywatne tagi użytkownika przypisane do konkretnej talii
- Tagi automatyczne `#deleted-from-*` tworzone przy usuwaniu talii
- Constraint `check_scope_consistency` zapewnia integralność danych

### 6.7 Wydajność

- Indeksy są zoptymalizowane pod częste zapytania
- Partial indexes (WHERE deleted_at IS NULL) redukują rozmiar indeksów
- Composite indexes dla często używanych kombinacji filtrów
- Generated column `tsv` dla pełnotekstowego wyszukiwania

### 6.8 Bezpieczeństwo

- RLS włączone na wszystkich tabelach użytkownika
- Automatyczna izolacja danych między użytkownikami
- Polityki RLS zapobiegają manipulacji flagą `is_default`
- Admin role wymagana dla zarządzania tagami globalnymi

### 6.9 Rozszerzalność

- `visibility` w decks przygotowane na 'public', 'shared'
- `deck_collaborators` gotowe na przyszłe współdzielenie
- Struktura obsługuje przyszłe funkcjonalności bez breaking changes

### 6.10 Normalizacja

- Schemat jest znormalizowany do 3NF
- Jedyna denormalizacja: `tsv` generated column dla wydajności wyszukiwania
- Brak redundancji danych
- Relacje Many-to-Many przez dedykowane tabele junction

---

**Wersja schematu**: 2.0  
**Data aktualizacji**: 2025-11-15  
**Zgodność z**: PRD v1.1, API Plan v1.1

