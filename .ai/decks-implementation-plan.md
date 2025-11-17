# API Endpoint Implementation Plan: Decks API

## 1. Przegląd punktu końcowego

Zestaw endpointów zarządzających taliami fiszek użytkownika. System obsługuje pełny CRUD z dodatkowymi mechanizmami: **domyślna talia "Uncategorized"** (tworzona automatycznie przy rejestracji, chroniona przed usunięciem), **soft-delete z migracją fiszek** oraz **unikalność nazw per user**. Każdy użytkownik ma dokładnie jedną talię z flagą `is_default=true`, która służy jako miejsce docelowe dla fiszek z usuniętych talii.

**Kluczowe cechy**:
- Automatyczna talia "Uncategorized" (trigger przy rejestracji)
- Soft-delete z transakcyjną migracją fiszek
- Tagowanie migrowanych fiszek (`#deleted-from-{deck_name}`)
- Unique constraint na nazwę w ramach użytkownika
- flashcard_count agregacja dla każdej talii

**Obejmuje 6 endpointów**:
- GET /api/v1/decks (lista z paginacją i wyszukiwaniem)
- GET /api/v1/decks/default (domyślna talia użytkownika)
- GET /api/v1/decks/:id (szczegóły pojedynczej talii)
- POST /api/v1/decks (tworzenie nowej talii)
- PATCH /api/v1/decks/:id (aktualizacja nazwy/opisu)
- DELETE /api/v1/decks/:id (usunięcie z migracją)

## 2. Szczegóły żądania

### 2.1 GET /api/v1/decks
- **Metoda HTTP**: GET
- **Struktura URL**: `/api/v1/decks`
- **Nagłówki**: `Authorization: Bearer <access_token>` (wymagany)
- **Query params**:
  - Opcjonalne:
    - `sort`: enum (`created_at`, `updated_at`, `name`) – default: `created_at`
    - `order`: enum (`asc`, `desc`) – default: `desc`
    - `search`: string (max 200 chars, trimmed) – full-text search na name/description
    - `page`: integer ≥1 – default: 1
    - `limit`: integer 1–100 – default: 20

### 2.2 GET /api/v1/decks/default
- **Metoda HTTP**: GET
- **Struktura URL**: `/api/v1/decks/default`
- **Nagłówki**: `Authorization: Bearer <access_token>` (wymagany)
- **Uwaga**: Zawsze zwraca talię z `is_default=true` (should exist via trigger)

### 2.3 GET /api/v1/decks/:id
- **Metoda HTTP**: GET
- **Struktura URL**: `/api/v1/decks/:id`
- **Nagłówki**: `Authorization: Bearer <access_token>` (wymagany)
- **Path params**: `id` (BIGINT)

### 2.4 POST /api/v1/decks
- **Metoda HTTP**: POST
- **Struktura URL**: `/api/v1/decks`
- **Nagłówki**: `Authorization: Bearer <access_token>`, `Content-Type: application/json`
- **Body**:
  ```json
  {
    "name": "string (1-100 chars, required)",
    "description": "string (optional, max 5000 chars)"
  }
  ```
- **Uwagi**: `is_default` automatycznie ustawiane na `false` (RLS zapobiega manual true)

### 2.5 PATCH /api/v1/decks/:id
- **Metoda HTTP**: PATCH
- **Struktura URL**: `/api/v1/decks/:id`
- **Nagłówki**: `Authorization: Bearer <access_token>`, `Content-Type: application/json`
- **Path params**: `id` (BIGINT)
- **Body** (co najmniej jedno pole):
  ```json
  {
    "name": "string (1-100 chars, optional)",
    "description": "string (optional, max 5000 chars, nullable)"
  }
  ```
- **Uwagi**: Nie można zmienić `is_default` (RLS + app logic)

### 2.6 DELETE /api/v1/decks/:id
- **Metoda HTTP**: DELETE
- **Struktura URL**: `/api/v1/decks/:id`
- **Nagłówki**: `Authorization: Bearer <access_token>`
- **Path params**: `id` (BIGINT)
- **Uwaga**: Złożona transakcja (9 kroków) z migracją fiszek i tagowaniem

## 3. Wykorzystywane typy

Z `src/types.ts`:
- `DeckDto` – podstawowa reprezentacja talii z flashcard_count
- `DeckListResponseDto` – lista + pagination
- `DeckListQuery` – query params dla GET list
- `CreateDeckCommand` – payload POST
- `UpdateDeckCommand` – payload PATCH
- `DeckDeletionResultDto` – odpowiedź DELETE (message, migrated_count, tag)
- `PaginationMeta`, `PaginationQuery`
- `ErrorResponse`

Nowe Zod schemas (do utworzenia w `src/lib/validation/decks.ts`):
- `DeckListQuerySchema`
- `CreateDeckSchema`
- `UpdateDeckSchema`

Pomocnicze typy (internal):
- `DeckWithCount` – deck row + aggregated flashcard_count

## 4. Szczegóły odpowiedzi

### 4.1 GET /api/v1/decks
- **200 OK**: `DeckListResponseDto`
  ```json
  {
    "data": [
      {
        "id": "string",
        "user_id": "string",
        "name": "string",
        "description": "string|null",
        "visibility": "private",
        "is_default": false,
        "flashcard_count": 42,
        "created_at": "ISO8601",
        "updated_at": "ISO8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "total_pages": 1
    }
  }
  ```
- **400**: invalid query params
- **401**: unauthorized

### 4.2 GET /api/v1/decks/default
- **200 OK**: `DeckDto` (single object, `is_default=true`)
- **401**: unauthorized
- **404**: default deck not found (should never happen if trigger works)

### 4.3 GET /api/v1/decks/:id
- **200 OK**: `DeckDto` (single object)
- **401**: unauthorized
- **404**: deck not found

### 4.4 POST /api/v1/decks
- **201 Created**: `DeckDto` (`is_default=false`, `flashcard_count=0`)
- **400**: validation errors (name length, description length)
- **401**: unauthorized
- **409**: duplicate deck name (unique constraint violation)

### 4.5 PATCH /api/v1/decks/:id
- **200 OK**: `DeckDto` (zaktualizowana talia)
- **400**: validation errors, attempting to rename default deck to non-"Uncategorized"
- **401**: unauthorized
- **404**: deck not found
- **409**: duplicate deck name

### 4.6 DELETE /api/v1/decks/:id
- **200 OK**: `DeckDeletionResultDto`
  ```json
  {
    "message": "Deck deleted successfully",
    "migrated_flashcards_count": 15,
    "migration_tag": {
      "id": "string",
      "name": "#deleted-from-My-Old-Deck"
    }
  }
  ```
- **400**: attempting to delete default deck
- **401**: unauthorized
- **404**: deck not found
- **500**: transaction failure (migration error)

## 5. Przepływ danych

### 5.1 GET /api/v1/decks (lista)
1. Middleware uwierzytelnia, umieszcza `supabase` + `session` w `locals`
2. Handler waliduje query przez Zod, ustawia defaulty
3. Pobiera `userId` z session (401 jeśli brak)
4. Wywołuje `DeckService.listDecks(supabase, userId, filters)`
5. Serwis:
   - Buduje query: `from("decks").select("*", {count: 'exact'})`
   - Filtruje: `eq("user_id", userId)`, `is("deleted_at", null)`
   - Search: `or(ilike("name", %search%), ilike("description", %search%))` jeśli podano
   - Sortowanie: `order(sort, {ascending: order==='asc'})`
   - Paginacja: `range(offset, offset+limit-1)`
   - flashcard_count: agregacja przez subquery lub LEFT JOIN
     ```sql
     SELECT decks.*, COUNT(flashcards.id) as flashcard_count
     FROM decks
     LEFT JOIN flashcards ON flashcards.deck_id = decks.id 
       AND flashcards.deleted_at IS NULL
     WHERE decks.user_id = $1 AND decks.deleted_at IS NULL
     GROUP BY decks.id
     ```
6. Mapuje do `DeckDto[]`, oblicza `PaginationMeta`
7. Zwraca 200 z JSON

### 5.2 GET /api/v1/decks/default (default deck)
1. Parsuje auth, pobiera `userId` (401 jeśli brak)
2. Wywołuje `DeckService.getDefaultDeck(supabase, userId)`
3. Serwis:
   - `from("decks").select("*").eq("user_id", userId).eq("is_default", true).is("deleted_at", null).single()`
   - Agregacja flashcard_count (jak wyżej)
4. 404 jeśli null (shouldn't happen), 200 z `DeckDto` jeśli found

### 5.3 GET /api/v1/decks/:id (single)
1. Parsuje `:id`, waliduje (numeric)
2. Pobiera `userId` z session (401 jeśli brak)
3. Wywołuje `DeckService.getDeck(supabase, userId, id)`
4. Serwis:
   - `from("decks").select("*").eq("id", id).eq("user_id", userId).is("deleted_at", null).single()`
   - Agregacja flashcard_count
5. 404 jeśli null, 200 z `DeckDto` jeśli found

### 5.4 POST /api/v1/decks (create)
1. Parsuje body, waliduje przez Zod (name length, description length)
2. Pobiera `userId` z session (401 jeśli brak)
3. Wywołuje `DeckService.createDeck(supabase, userId, command)`
4. Serwis:
   - `insert({user_id: userId, name, description, visibility: "private", is_default: false})`
   - Obsługuje unique constraint violation → throw DuplicateDeckError
   - Pobiera utworzoną talię z `.select().single()`
   - flashcard_count = 0 (nowa talia)
5. Zwraca 201 z `DeckDto`
6. Error handling: DuplicateDeckError → 409

### 5.5 PATCH /api/v1/decks/:id (update)
1. Parsuje `:id` i body, waliduje (name/description lengths, at least one field)
2. Pobiera `userId` z session (401 jeśli brak)
3. Pobiera istniejącą talię dla weryfikacji:
   - `from("decks").select("is_default, name").eq("id", id).eq("user_id", userId).single()`
   - 404 jeśli null
4. **Business logic checks**:
   - Jeśli `is_default=true` i próba zmiany `name` na nie-"Uncategorized" → 400
5. Wywołuje `DeckService.updateDeck(supabase, userId, id, updates)`
6. Serwis:
   - `update({name?, description?, updated_at: NOW()}).eq("id", id).eq("user_id", userId).select().single()`
   - Obsługuje unique constraint violation → throw DuplicateDeckError
7. Zwraca 200 z zaktualizowanym `DeckDto`
8. Error handling: DuplicateDeckError → 409

### 5.6 DELETE /api/v1/decks/:id (complex migration transaction)
1. Parsuje `:id`
2. Pobiera `userId` z session (401 jeśli brak)
3. Wywołuje `DeckService.deleteDeck(supabase, userId, deckId)`
4. **Serwis implementuje transakcję (9 kroków)**:
   
   a. **Verify deck exists and is not default**:
      - Query: `.select("name, is_default").eq("id", deckId).eq("user_id", userId).is("deleted_at", null).single()`
      - 404 jeśli null
      - 400 jeśli `is_default=true`
   
   b. **Get default deck ID**:
      - Query: `.select("id").eq("user_id", userId).eq("is_default", true).single()`
      - Should always exist (trigger creates it)
   
   c. **Count flashcards to migrate**:
      - Query: `COUNT(*) FROM flashcards WHERE deck_id = deckId AND deleted_at IS NULL`
   
   d. **Create migration tag** (if flashcards > 0):
      - Tag name: `#deleted-from-{deck_name}` (sanitize deck_name)
      - Insert: `{name, scope: "deck", deck_id: default_deck_id, user_id: userId}`
      - ON CONFLICT (name, deck_id) DO UPDATE (idempotent)
   
   e. **Update flashcards deck_id**:
      - `UPDATE flashcards SET deck_id = default_deck_id WHERE deck_id = deckId AND deleted_at IS NULL`
   
   f. **Add migration tag to flashcards**:
      - Get flashcard IDs: `SELECT id FROM flashcards WHERE deck_id = default_deck_id AND ... (recent)` 
      - Bulk insert: `INSERT INTO flashcard_tags (flashcard_id, tag_id) VALUES ...` ON CONFLICT DO NOTHING
   
   g. **Soft-delete deck**:
      - `UPDATE decks SET deleted_at = NOW() WHERE id = deckId`
   
   h. **Commit transaction**
   
   i. **Return migration result**:
      - Fetch created tag details
      - Return `{message, migrated_flashcards_count, migration_tag}`

5. Zwraca 200 z `DeckDeletionResultDto`
6. Error handling:
   - Transaction failure: rollback, log error, return 500
   - 400 if default deck
   - 404 if not found

## 6. Względy bezpieczeństwa

### 6.1 Uwierzytelnianie i autoryzacja
- Wszystkie endpointy wymagają `session` (401 przy braku)
- RLS na `decks` table:
  - Users see: `user_id = auth.uid()` AND `deleted_at IS NULL`
  - Users create: `user_id = auth.uid()` AND `is_default = false`
  - Users update: cannot change `is_default` (CHECK constraint)
  - Users delete: `is_default = false` (enforced by RLS)
- Dodatkowo filtry `eq("user_id", userId)` na poziomie aplikacji

### 6.2 Default Deck Protection
- **Trigger**: `on_user_created` automatycznie tworzy talię "Uncategorized" z `is_default=true`
- **DB Constraint**: `check_default_deck_name` zapewnia, że tylko talia "Uncategorized" może mieć `is_default=true`
- **RLS Policy**: uniemożliwia DELETE jeśli `is_default=true`
- **Application Logic**: explicit check przed DELETE (400 response)
- **Rename Protection**: PATCH waliduje, że default deck nie może być przemianowana na coś innego

### 6.3 Walidacja danych wejściowych
- Zod schemas dla wszystkich payloadów i query params
- Długości: name 1-100, description max 5000, search max 200
- Sort/order enums validation
- Unique constraint: name per user (DB enforces, app handles 409)
- Trimming i sanityzacja search strings

### 6.4 Unikalność nazw
- **DB Constraint**: `unique_deck_name_per_user UNIQUE (user_id, name)`
- Race condition handling: catch unique violation (Postgres error 23505)
- User-friendly error message: "A deck with this name already exists"

### 6.5 Soft-delete Integrity
- Zawsze filtruj `deleted_at IS NULL` przy odczycie
- Przy DELETE użyj `is("deleted_at", null)` w warunku (idempotentność)
- ON DELETE RESTRICT na `flashcards.deck_id` zapobiega przypadkowemu usunięciu talii bez migracji

## 7. Obsługa błędów

### 7.1 Kody błędów i scenariusze

| Kod | Scenariusz | Przykładowy komunikat |
|-----|-----------|----------------------|
| 400 | Name length violation | `validation_error: name must be between 1 and 100 characters` |
| 400 | Description too long | `validation_error: description must not exceed 5000 characters` |
| 400 | Attempting to delete default deck | `forbidden: Cannot delete default deck` |
| 400 | Attempting to rename default deck | `forbidden: Cannot rename default deck to non-"Uncategorized"` |
| 400 | No fields in PATCH | `validation_error: At least one field (name or description) required` |
| 401 | Missing/invalid session | `unauthorized: Authentication required` |
| 404 | Deck not found | `not_found: Deck not found` |
| 404 | Default deck not found | `not_found: Default deck not found (data integrity issue)` |
| 409 | Duplicate deck name | `conflict: A deck with this name already exists` |
| 500 | Database error | `database_error: An unexpected error occurred` |
| 500 | Migration transaction failure | `transaction_error: Failed to delete deck and migrate flashcards` |

### 7.2 Struktura odpowiedzi błędu
```json
{
  "error": {
    "code": "conflict",
    "message": "A deck with this name already exists",
    "details": {
      "field": "name",
      "value": "My Deck",
      "constraint": "unique_deck_name_per_user"
    }
  }
}
```

### 7.3 Logowanie błędów
- 400/401/404/409: info level (expected errors)
- 500: error level z pełnym stack trace
- Transaction failures: log rollback z kontekstem (deck_id, user_id, step)
- Nie loguj do `generation_error_logs` (tylko dla AI)

### 7.4 Transaction Rollback
- DELETE migration: każdy krok w try/catch
- On failure: automatic rollback przez Supabase
- Log który krok zawiódł dla debugging
- Return 500 z generic message (nie expose internal details)

## 8. Rozważania dotyczące wydajności

### 8.1 Indeksy wykorzystywane
- `idx_decks_user_id`: (user_id) – filtrowanie per user
- `idx_decks_deleted_at`: (deleted_at) WHERE deleted_at IS NULL – soft-delete filter
- `idx_decks_visibility`: (visibility) – dla przyszłych filtrów
- `idx_decks_user_default UNIQUE`: (user_id) WHERE is_default=true – unique default per user
- `idx_decks_user_visibility`: (user_id, visibility) WHERE deleted_at IS NULL – composite
- `idx_flashcards_user_deck`: (user_id, deck_id) WHERE deleted_at IS NULL – dla flashcard_count

### 8.2 flashcard_count Aggregation
- **Approach 1**: Subquery w SELECT (simplest)
  ```sql
  SELECT *, (SELECT COUNT(*) FROM flashcards WHERE deck_id = decks.id AND deleted_at IS NULL) as flashcard_count
  ```
- **Approach 2**: LEFT JOIN + GROUP BY (może być szybszy dla list)
- **Approach 3**: Materialized view lub cached counter column (overkill dla MVP)
- Dla MVP: subquery approach, monitor performance

### 8.3 Search Performance
- ILIKE dla name/description może być wolny na dużych zbiorach
- OR condition: `ilike("name", %search%) OR ilike("description", %search%)`
- Indeksy: brak specific text search index w MVP (full-text search nie jest konieczny dla nazw talii)
- Optymalizacja: jeśli potrzeba, dodaj GIN index na `to_tsvector(name || ' ' || description)`

### 8.4 DELETE Transaction Performance
- 9 kroków transakcji: może trwać 100-500ms dla dużych talii (1000+ fiszek)
- Bulk operations: UPDATE flashcards set deck_id (single query)
- Tag creation: INSERT ON CONFLICT (idempotent, fast)
- Bulk tag associations: może być wolny dla >100 fiszek
- Acceptable dla MVP; monitor i optimalizuj jeśli potrzeba

### 8.5 Pagination
- Offset/limit approach: akceptowalny dla małych kolekcji (<1000 decks per user)
- Dla większych: rozważ keyset pagination (cursor-based)
- Count query: `{count: 'exact'}` może być wolny; alternatywa: `planned` lub cache

### 8.6 Potencjalne wąskie gardła
- **GET /decks list**: flashcard_count aggregation dla wielu talii
  - Mitigation: subquery optimized przez planner, indeksy
- **DELETE migration**: bulk operations na tysiącach fiszek
  - Mitigation: batch operations, monitoring timeouts
- **Search z ILIKE**: może być wolny
  - Mitigation: limit search string length, consider text search later

### 8.7 Strategie cache
- Default deck: cache w Redis (long TTL, invalidacja przy utworzeniu/usunięciu default)
- Deck list: krótki TTL (60s), invalidacja przy POST/PATCH/DELETE
- flashcard_count: może być stale (eventual consistency OK), rozważ cached counters

## 9. Etapy wdrożenia

### Krok 1: Przygotowanie walidacji i typów
1. Utwórz `src/lib/validation/decks.ts`:
   - `DeckListQuerySchema` (Zod): sort/order enums, search max 200, page/limit bounds
   - `CreateDeckSchema`: name (1-100, required, trimmed), description (max 5000, optional)
   - `UpdateDeckSchema`: name/description optional, ale co najmniej jedno pole
2. Dodaj helper functions:
   - `sanitizeDeckName(name: string): string` – dla migration tag naming
   - `validateDefaultDeckRename(isDefault: boolean, newName: string): boolean`

### Krok 2: Implementacja DeckService (podstawowe operacje)
1. Utwórz `src/lib/services/decks/deck.service.ts`:
   - `listDecks(supabase, userId, filters): Promise<{data: DeckDto[], count: number}>`
     - Implementuj flashcard_count agregację (subquery lub JOIN)
     - Filtrowanie, sortowanie, paginacja, search
   - `getDeck(supabase, userId, id): Promise<DeckDto | null>`
   - `getDefaultDeck(supabase, userId): Promise<DeckDto | null>`
   - `createDeck(supabase, userId, command): Promise<DeckDto>`
     - Obsłuż unique constraint violation (throw DuplicateDeckError)
   - `updateDeck(supabase, userId, id, updates): Promise<DeckDto>`
     - Obsłuż unique constraint violation
   - `verifyDeckOwnership(supabase, userId, deckId): Promise<boolean>`
     - Helper używany przez inne serwisy (flashcards, tags, generations)

### Krok 3: Implementacja DeckService (DELETE migration)
1. W `deck.service.ts`:
   - `deleteDeck(supabase, userId, deckId): Promise<DeckDeletionResultDto>`
   - **Implementacja transakcji** (9 kroków opisanych w sekcji 5.6):
     - Verify deck exists, not default
     - Get default deck ID
     - Count flashcards to migrate
     - Create migration tag (if needed)
     - Update flashcards deck_id (bulk)
     - Add migration tag to flashcards (bulk insert)
     - Soft-delete deck
     - Commit transaction
     - Return result with migration stats
   - Error handling: rollback on any step failure

### Krok 4: Implementacja error handling utilities
1. Utwórz `src/lib/utils/errors.ts` (jeśli nie istnieje):
   - `class DuplicateDeckError extends Error`
   - `class DefaultDeckError extends Error` – dla operacji na default deck
   - `formatErrorResponse(code, message, details?): ErrorResponse`
   - `handleDatabaseError(error): ErrorResponse` – mapuje Postgres errors
   - `isUniqueViolation(error): boolean` – helper do wykrywania 23505

### Krok 5: Implementacja endpointów Astro
1. `src/pages/api/v1/decks/index.ts`:
   - `export const prerender = false`
   - Handler GET:
     - Parsuj query przez Zod
     - Pobierz userId z session (401 jeśli brak)
     - Wywołaj `listDecks`
     - Zwróć 200 z pagination
   - Handler POST:
     - Parsuj body przez Zod
     - Pobierz userId z session
     - Wywołaj `createDeck`
     - Obsłuż DuplicateDeckError → 409
     - Zwróć 201

2. `src/pages/api/v1/decks/default.ts`:
   - Handler GET:
     - Pobierz userId z session
     - Wywołaj `getDefaultDeck`
     - 404 jeśli null (data integrity issue)
     - Zwróć 200

3. `src/pages/api/v1/decks/[id].ts`:
   - Handler GET:
     - Parsuj id
     - Wywołaj `getDeck`
     - 404 jeśli null
     - Zwróć 200
   - Handler PATCH:
     - Parsuj id + body, waliduj
     - Check default deck rename restriction
     - Wywołaj `updateDeck`
     - Obsłuż DuplicateDeckError → 409
     - Zwróć 200
   - Handler DELETE:
     - Parsuj id
     - Wywołaj `deleteDeck` (complex transaction)
     - Obsłuż DefaultDeckError → 400
     - Obsłuż transaction errors → 500
     - Zwróć 200 z migration result

### Krok 6: Obsługa błędów w handlerach
1. Wrap wszystkie handlery w try/catch
2. Catch specific errors:
   - `DuplicateDeckError` → 409 z clear message
   - `DefaultDeckError` → 400
   - Zod validation errors → 400
   - Generic errors → 500 z logging
3. Użyj `formatErrorResponse()` dla spójności
4. Loguj 500 errors przez strukturowany logger

### Krok 7: Testy jednostkowe
1. `deck.service.test.ts`:
   - Mock Supabase client
   - Testuj `listDecks`:
     - Bez filtrów (wszystkie talie)
     - Z filtrem search (name/description match)
     - Z sortowaniem (created_at, updated_at, name)
     - Z paginacją (page, limit)
     - Verify flashcard_count calculation
   - Testuj `createDeck`:
     - Success case (unique name)
     - Duplicate name → DuplicateDeckError
   - Testuj `updateDeck`:
     - Success case
     - Duplicate name → DuplicateDeckError
     - Attempt to rename default → validation error
   - Testuj `deleteDeck`:
     - Success case (transaction steps)
     - Attempt to delete default → DefaultDeckError
     - Verify migration tag creation
     - Verify flashcards moved to default deck
     - Verify soft-delete (deleted_at set)

2. `deck.service.integration.test.ts`:
   - With real Supabase (test database)
   - Test full DELETE migration flow
   - Verify transaction rollback on failure

### Krok 8: Testy integracyjne
1. Setup: seed użytkowników, decks (including default), flashcards
2. Test endpointów:
   - GET /decks: różne filtry, paginacja, search
   - GET /decks/default: zawsze zwraca default deck
   - POST /decks: tworzenie z weryfikacją unique constraint
   - PATCH /decks/:id: aktualizacja, duplicate handling, default protection
   - DELETE /decks/:id: pełna migracja, verify flashcards moved, tags created
3. Scenariusze błędów:
   - 400: validation, default deck operations
   - 401: missing auth
   - 404: deck not found
   - 409: duplicate name
4. Cross-user isolation: user A nie widzi talii user B

### Krok 9: Testy RLS i bezpieczeństwa
1. Weryfikuj polityki RLS w Supabase:
   - User widzi tylko własne talie
   - User może tworzyć tylko z is_default=false
   - User nie może usunąć default deck (RLS blocks)
   - User nie może zmienić is_default (RLS + check constraint)
2. Testy penetracyjne:
   - Próba dostępu do cudzej talii przez ID
   - Próba utworzenia talii z is_default=true (should fail)
   - Próba usunięcia default deck (400 response)

### Krok 10: Testy transakcji DELETE
1. Utwórz talię z wieloma fiszkami (100+)
2. DELETE talię
3. Weryfikuj:
   - Talia ma deleted_at set
   - Wszystkie fiszki przeniesione do default deck
   - Migration tag utworzony
   - Migration tag przypisany do wszystkich preniesionych fiszek
4. Test rollback:
   - Symuluj błąd w środku transakcji (np. fail tag creation)
   - Verify rollback: fiszki pozostały w oryginalnej talii, deleted_at NULL

### Krok 11: Testy wydajnościowe (opcjonalnie)
1. Seed dużej liczby talii (100+ per user) i fiszek (1000+ per deck)
2. Mierz czas zapytań:
   - GET /decks z różnymi filtrami i paginacją
   - flashcard_count aggregation performance
   - DELETE migration z 1000+ fiszkami
3. Verify wykorzystanie indeksów (EXPLAIN ANALYZE)
4. Optymalizuj jeśli potrzeba (cache, indeksy, query tuning)

### Krok 12: Testy default deck trigger
1. Verify trigger `on_user_created` działa:
   - Utwórz nowego użytkownika w auth.users
   - Sprawdź czy talia "Uncategorized" została utworzona z is_default=true
2. Test idempotentności: jeśli trigger fired dwa razy, nie powinna powstać druga default deck (unique constraint)

### Krok 13: Dokumentacja i przykłady
1. Aktualizuj `.ai/decks-implementation-plan.md` (ten plik)
2. Utwórz przykłady zapytań:
   ```bash
   # GET list
   curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:4321/api/v1/decks?sort=name&order=asc&search=programming"
   
   # GET default
   curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:4321/api/v1/decks/default
   
   # POST create
   curl -X POST -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name":"Programming","description":"CS flashcards"}' \
     http://localhost:4321/api/v1/decks
   
   # PATCH update
   curl -X PATCH -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name":"CS Fundamentals"}' \
     http://localhost:4321/api/v1/decks/123
   
   # DELETE
   curl -X DELETE -H "Authorization: Bearer $TOKEN" \
     http://localhost:4321/api/v1/decks/123
   ```
3. Dokumentuj edge cases:
   - Default deck protection mechanisms
   - Migration tag naming conventions
   - Unique constraint behavior

### Krok 14: Deployment i monitoring
1. Deploy do staging:
   - Verify trigger `on_user_created` exists in DB
   - Test with staging data
2. Smoke tests: podstawowe operacje CRUD + DELETE migration
3. Weryfikuj RLS policies działają poprawnie
4. Monitor performance (flashcard_count aggregation, DELETE transactions)
5. Deploy do production
6. Post-deployment verification (create user, verify default deck created)

---

## 10. Uwagi dodatkowe

### 10.1 Default Deck "Uncategorized"
- **Trigger**: `create_default_deck_for_user()` wykonywany AFTER INSERT ON auth.users
- **Nazewnictwo**: zawsze "Uncategorized" (hard-coded)
- **is_default=true**: tylko jedna per user (unique partial index)
- **Ochrona**:
  - Nie można usunąć (RLS + app logic)
  - Nie można przemianować na coś innego (app validation)
  - Nie można zmienić is_default na false (check constraint)
- **Purpose**: miejsce docelowe dla fiszek z usuniętych talii

### 10.2 Migration Tag Naming
- Format: `#deleted-from-{deck_name}`
- Sanityzacja: replace spaces/special chars (np. "My Deck!" → "My-Deck")
- Scope: `deck` (przypisany do default deck)
- Idempotentność: ON CONFLICT (name, deck_id) DO UPDATE (jeśli tag już istnieje, reuse)
- Purpose: tracking origin fiszek po usunięciu talii, filtrowanie w UI

### 10.3 Soft-delete Strategy
- `deleted_at` timestamp (NULL = active)
- Zawsze filtruj `deleted_at IS NULL` w queries
- Hard delete: nie planowane w MVP (może w przyszłości przez admin/cleanup job)
- Undelete: nie planowane w MVP (może w przyszłości restore endpoint)

### 10.4 flashcard_count Calculation
- **Real-time**: COUNT z `deleted_at IS NULL` filter
- **No caching**: dla MVP, direct query
- **Future optimization**: cached counter column z triggerami (UPDATE on flashcard INSERT/DELETE)
- Trade-off: accuracy vs performance

### 10.5 Unique Constraint Edge Cases
- Case sensitivity: "My Deck" ≠ "my deck" (default Postgres collation)
- Whitespace: " My Deck " ≠ "My Deck" (aplikacja powinna trim przed zapisem)
- Deleted decks: unique constraint nie uwzględnia deleted_at, więc można utworzyć nową talię o tej samej nazwie po usunięciu starej

### 10.6 Visibility Field (Future)
- Currently: tylko `private` (enum constraint)
- Przyszłość: `public`, `shared` (for deck sharing features)
- Index już istnieje: `idx_decks_visibility`
- Rozszerzalność: wystarczy update enum i dodać RLS policies

### 10.7 Concurrent Operations
- **Race condition**: dwa requesty POST z tą samą nazwą → jeden succeed, drugi 409
- **DELETE migration**: lock na deck level (Postgres transaction isolation)
- **flashcard_count**: eventual consistency OK (jeśli używany cache)

### 10.8 Error Recovery
- DELETE migration failure: automatic rollback, user może retry
- Partial migration: nie powinno się zdarzyć (transakcja atomowa)
- Tag creation failure: non-critical (fiszki i tak przeniesione), log warning

---

**Priorytet implementacji**: 
1. Kroki 1-6 (core functionality, critical)
2. Kroki 7-9 (testing unit + integration, high priority)
3. Kroki 10-14 (performance, security, monitoring, medium priority)

**Szacowany czas**: 
- Core implementation: 3-4 dni (services, endpoints, DELETE transaction)
- Testing: 2-3 dni (unit + integration + RLS verification)
- Documentation & deployment: 1 dzień
- **Total: 6-8 dni** dla doświadczonego developera

**Zależności**:
- Database trigger `on_user_created` musi istnieć (seed/migration)
- RLS policies muszą być skonfigurowane (seed/migration)
- Unique constraints i indeksy muszą istnieć (migration)

**Ryzyka**:
- DELETE migration complexity (mitigation: thorough testing, rollback handling)
- flashcard_count performance (mitigation: monitoring, future optimization)
- Unique constraint race conditions (mitigation: proper 409 handling)
- Default deck trigger failures (mitigation: monitoring, fallback manual creation)

