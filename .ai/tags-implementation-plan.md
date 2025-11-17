# API Endpoint Implementation Plan: Tags API

## 1. Przegląd punktu końcowego

Zestaw endpointów zarządzających tagami w systemie fiszek. System tagów ma dwupoziomową strukturę: **tagi globalne** (zarządzane przez adminów, dostępne dla wszystkich użytkowników, read-only w MVP) oraz **tagi deck-scoped** (prywatne tagi użytkownika przypisane do konkretnej talii). Endpointy umożliwiają przeglądanie, tworzenie, edycję i usuwanie tagów deck-scoped, z automatyczną kaskadową obsługą powiązań z fiszkami.

**Obejmuje 4 endpointy**:
- GET /api/v1/tags (lista z filtrami i usage_count)
- POST /api/v1/tags (tworzenie deck-scoped)
- PATCH /api/v1/tags/:id (aktualizacja nazwy)
- DELETE /api/v1/tags/:id (usunięcie z kaskadą)

## 2. Szczegóły żądania

### 2.1 GET /api/v1/tags
- **Metoda HTTP**: GET
- **Struktura URL**: `/api/v1/tags`
- **Nagłówki**: `Authorization: Bearer <access_token>` (wymagany)
- **Query params**:
  - Opcjonalne:
    - `scope`: enum (`global`, `deck`) – filtr po zakresie
    - `deck_id`: string (BIGINT) – filtr po talii (tylko dla scope='deck')
    - `search`: string (max 100 chars, trimmed) – wyszukiwanie po nazwie (partial match)
- **Uwagi**: 
  - Brak paginacji (zakładamy małą liczbę tagów per user)
  - Zwraca global tags + user's deck tags (RLS enforcement)

### 2.2 POST /api/v1/tags
- **Metoda HTTP**: POST
- **Struktura URL**: `/api/v1/tags`
- **Nagłówki**: `Authorization: Bearer <access_token>`, `Content-Type: application/json`
- **Body** (wymagane):
  ```json
  {
    "name": "string (1-50 chars, required)",
    "deck_id": "string (BIGINT, required)"
  }
  ```
- **Uwagi**:
  - `scope` automatycznie ustawiane na "deck"
  - `user_id` automatycznie z session.user.id

### 2.3 PATCH /api/v1/tags/:id
- **Metoda HTTP**: PATCH
- **Struktura URL**: `/api/v1/tags/:id`
- **Nagłówki**: `Authorization: Bearer <access_token>`, `Content-Type: application/json`
- **Path params**: `id` (BIGINT)
- **Body** (wymagane):
  ```json
  {
    "name": "string (1-50 chars, required)"
  }
  ```
- **Uwagi**: Tylko deck-scoped tags mogą być edytowane

### 2.4 DELETE /api/v1/tags/:id
- **Metoda HTTP**: DELETE
- **Struktura URL**: `/api/v1/tags/:id`
- **Nagłówki**: `Authorization: Bearer <access_token>`
- **Path params**: `id` (BIGINT)
- **Uwagi**: 
  - Tylko deck-scoped tags mogą być usunięte
  - Kaskadowo usuwa powiązania w flashcard_tags (ON DELETE CASCADE)

## 3. Wykorzystywane typy

Z `src/types.ts`:
- `TagDto` – podstawowa reprezentacja tagu
- `TagWithUsageDto` – TagDto + usage_count
- `TagListQuery` – query params dla GET
- `TagListResponseDto` – odpowiedź GET (data array, bez paginacji)
- `CreateTagCommand` – payload POST
- `UpdateTagCommand` – payload PATCH
- `ErrorResponse`

Nowe Zod schemas (do utworzenia w `src/lib/validation/tags.ts`):
- `TagListQuerySchema`
- `CreateTagSchema`
- `UpdateTagSchema`

## 4. Szczegóły odpowiedzi

### 4.1 GET /api/v1/tags
- **200 OK**: `TagListResponseDto`
  ```json
  {
    "data": [
      {
        "id": "string",
        "name": "string",
        "scope": "global|deck",
        "deck_id": "string|null",
        "usage_count": 42,
        "created_at": "ISO8601"
      }
    ]
  }
  ```
- **400**: invalid query params (bad scope enum, invalid deck_id)
- **401**: unauthorized

### 4.2 POST /api/v1/tags
- **201 Created**: `TagDto`
  ```json
  {
    "id": "string",
    "name": "string",
    "scope": "deck",
    "deck_id": "string",
    "created_at": "ISO8601"
  }
  ```
- **400**: validation errors, deck doesn't exist/belong to user
- **401**: unauthorized
- **409**: duplicate tag name in deck

### 4.3 PATCH /api/v1/tags/:id
- **200 OK**: `TagDto`
  ```json
  {
    "id": "string",
    "name": "string",
    "scope": "deck",
    "deck_id": "string",
    "created_at": "ISO8601"
  }
  ```
- **400**: validation errors (name length)
- **401**: unauthorized
- **404**: tag not found or is global (cannot edit global tags)
- **409**: duplicate tag name in deck

### 4.4 DELETE /api/v1/tags/:id
- **204 No Content**
- **401**: unauthorized
- **404**: tag not found or is global (cannot delete global tags)
- **500**: cascade delete failure

## 5. Przepływ danych

### 5.1 GET /api/v1/tags (lista)
1. Middleware uwierzytelnia, umieszcza `supabase` + `session` w `locals`
2. Handler waliduje query przez Zod
3. Pobiera `userId` z session (401 jeśli brak)
4. Wywołuje `TagService.listTags(supabase, userId, filters)`
5. Serwis:
   - Buduje query: `from("tags")`
   - Select z LEFT JOIN: 
     ```sql
     SELECT tags.*, COUNT(flashcard_tags.flashcard_id) as usage_count
     FROM tags
     LEFT JOIN flashcard_tags ON tags.id = flashcard_tags.tag_id
     WHERE (scope = 'global' OR (scope = 'deck' AND user_id = userId))
     GROUP BY tags.id
     ```
   - Alternatywnie przez Supabase: `.select("*, flashcard_tags(count)")`
   - Filtruje: `eq("scope")` jeśli podano, `eq("deck_id")` jeśli podano
   - Search: `ilike("name", %search%)` jeśli podano
   - Sortowanie: domyślnie `order("name", {ascending: true})`
6. Mapuje do `TagWithUsageDto[]`
7. Zwraca 200 z JSON (struktura `TagListResponseDto`)

### 5.2 POST /api/v1/tags (create)
1. Parsuje body, waliduje przez Zod (name length, deck_id required)
2. Pobiera `userId` z session (401 jeśli brak)
3. Wywołuje `DeckService.verifyDeckOwnership(supabase, userId, deck_id)` → 400 jeśli false
4. Wywołuje `TagService.createTag(supabase, userId, command)`
5. Serwis:
   - `insert({ name, scope: "deck", deck_id, user_id: userId })`
   - Obsługuje UNIQUE constraint violation → 409 Conflict
   - Pobiera utworzony tag z `.select().single()`
6. Zwraca 201 z `TagDto`

### 5.3 PATCH /api/v1/tags/:id (update)
1. Parsuje `:id` i body, waliduje (name length)
2. Pobiera `userId` z session (401 jeśli brak)
3. Pobiera istniejący tag dla weryfikacji:
   - `from("tags").select().eq("id", id).single()`
   - 404 jeśli null lub scope='global'
   - Weryfikacja ownership przez RLS (user_id match)
4. Wywołuje `TagService.updateTag(supabase, userId, id, {name})`
5. Serwis:
   - `update({name}).eq("id", id).eq("scope", "deck").eq("user_id", userId).select().single()`
   - Obsługuje UNIQUE constraint violation → 409 Conflict
6. Zwraca 200 z zaktualizowanym `TagDto`

### 5.4 DELETE /api/v1/tags/:id (delete)
1. Parsuje `:id`
2. Pobiera `userId` z session (401 jeśli brak)
3. Pobiera istniejący tag dla weryfikacji:
   - 404 jeśli null lub scope='global'
4. Wywołuje `TagService.deleteTag(supabase, userId, id)`
5. Serwis:
   - `delete().eq("id", id).eq("scope", "deck").eq("user_id", userId)`
   - Sprawdza affected count (404 jeśli 0)
   - Cascade delete w flashcard_tags obsłużone przez DB (ON DELETE CASCADE)
6. Zwraca 204 No Content

## 6. Względy bezpieczeństwa

### 6.1 Uwierzytelnianie i autoryzacja
- Wszystkie endpointy wymagają `session` (401 przy braku)
- RLS na tabeli `tags`:
  - Users see: scope='global' OR (scope='deck' AND user_id=auth.uid())
  - Users create: only scope='deck' with user_id=auth.uid()
  - Users update/delete: only scope='deck' with user_id=auth.uid()
- Dodatkowo filtry `eq("user_id", userId)` na poziomie aplikacji dla operacji modyfikujących

### 6.2 Weryfikacja własności zasobów
- Przy tworzeniu: weryfikuj `deck_id` belongs to userId (DeckService.verifyDeckOwnership)
- Przy update/delete: weryfikuj scope='deck' i user_id match (RLS + app logic)
- Zablokowaj operacje na global tags (scope='global')

### 6.3 Walidacja danych wejściowych
- Zod schemas dla wszystkich payloadów i query params
- Długość name: 1-50 chars (zgodnie z DB VARCHAR(50))
- Scope enum validation (GET query)
- deck_id numeric validation (BIGINT)
- Search string trimming i length limit (max 100)
- Sanityzacja nazw tagów (trim whitespace, lowercase normalizacja opcjonalnie)

### 6.4 Ochrona przed atakami
- SQL injection: parametryzowane zapytania przez Supabase SDK
- XSS: walidacja długości, brak raw HTML w nazwach tagów
- Unique constraint race condition: obsłuż 409 elegance (retry logic po stronie klienta)
- Prevent scope manipulation: zawsze enforce scope="deck" w POST, ignore user input

### 6.5 Unikalność nazw
- DB constraint `idx_tags_deck_name UNIQUE (deck_id, name) WHERE scope='deck'`
- Constraint `idx_tags_global_name UNIQUE (name) WHERE scope='global'`
- Aplikacja obsługuje violation jako 409 Conflict z clear message

## 7. Obsługa błędów

### 7.1 Kody błędów i scenariusze

| Kod | Scenariusz | Przykładowy komunikat |
|-----|-----------|----------------------|
| 400 | Invalid scope enum | `invalid_query_params: scope must be one of: global, deck` |
| 400 | Name length violation | `validation_error: name must be between 1 and 50 characters` |
| 400 | Deck doesn't exist/belong to user | `invalid_deck: Deck not found or access denied` |
| 400 | Invalid deck_id format | `validation_error: deck_id must be a valid integer` |
| 401 | Missing/invalid session | `unauthorized: Authentication required` |
| 404 | Tag not found | `not_found: Tag not found` |
| 404 | Attempting to edit/delete global tag | `forbidden: Cannot modify global tags` |
| 409 | Duplicate tag name in deck | `conflict: Tag with this name already exists in deck` |
| 500 | Database error | `database_error: An unexpected error occurred` |
| 500 | Cascade delete failure | `database_error: Failed to delete tag associations` |

### 7.2 Struktura odpowiedzi błędu
```json
{
  "error": {
    "code": "conflict",
    "message": "Tag with this name already exists in deck",
    "details": {
      "field": "name",
      "value": "important",
      "deck_id": "123",
      "constraint": "unique_tag_name_per_deck"
    }
  }
}
```

### 7.3 Logowanie błędów
- 400/401/404/409: info level (expected errors)
- 500: error level z pełnym stack trace
- Nie loguj do `generation_error_logs` (tylko dla AI)
- Unique constraint violations: log with context (name, deck_id, user_id)

## 8. Rozważania dotyczące wydajności

### 8.1 Indeksy wykorzystywane
- `idx_tags_scope`: scope enum (filtrowanie)
- `idx_tags_deck_id`: deck_id (filtrowanie, WHERE deck_id IS NOT NULL)
- `idx_tags_name`: name (search ILIKE)
- `idx_tags_deck_name UNIQUE`: (deck_id, name) WHERE scope='deck' (uniqueness + lookup)
- `idx_tags_global_name UNIQUE`: (name) WHERE scope='global' (uniqueness)
- `idx_flashcard_tags_tag_id`: tag_id (LEFT JOIN dla usage_count)

### 8.2 Optymalizacje zapytań
- usage_count: LEFT JOIN z flashcard_tags, GROUP BY tags.id
  - Alternatywa: Supabase relationships `.select("*, flashcard_tags(count)")`
  - Dla dużych zbiorów: rozważ materialized view z cached counts
- Brak paginacji: akceptowalne jeśli < 500 tagów per user
  - Monitoruj rozmiary, dodaj paginację jeśli potrzeba
- Search ILIKE: może być wolny na dużych zbiorach; idx_tags_name pomaga
  - Opcjonalnie: pg_trgm dla fuzzy search (overkill dla MVP)

### 8.3 Potencjalne wąskie gardła
- usage_count calculation: JOIN + GROUP BY może być wolny dla user z tysiącami fiszek
  - Rozważ cache lub pre-computed counter column w przyszłości
- Global tags list: jeśli setki global tags, cache na edge (long TTL)
- Unique constraint checks: minimal overhead dzięki B-tree index

### 8.4 Strategie cache
- GET /api/v1/tags: cache per user (TTL 5 min, invalidacja przy POST/PATCH/DELETE)
- Global tags subset: aggressive cache (TTL 1 hour, invalidacja tylko przez admina)
- usage_count: może być stale (eventual consistency OK), rozważ stale-while-revalidate

### 8.5 Skalowanie
- Brak paginacji: limit response size (np. max 1000 tagów)
- Jeśli przekroczono limit, wprowadź paginację lub pagination cursor
- usage_count: dla very high volume, rozważ async counter update (eventual consistency)

## 9. Etapy wdrożenia

### Krok 1: Przygotowanie walidacji i typów
1. Utwórz `src/lib/validation/tags.ts`:
   - `TagListQuerySchema` (Zod): scope enum optional, deck_id optional (numeric string), search optional (max 100)
   - `CreateTagSchema`: name (1-50, required, trimmed), deck_id (numeric string, required)
   - `UpdateTagSchema`: name (1-50, required, trimmed)
2. Weryfikuj zgodność z `src/types.ts` (już zdefiniowane DTOs)
3. Dodaj helper functions:
   - `normalizeTagName(name: string): string` – trim, opcjonalnie lowercase

### Krok 2: Implementacja serwisu tagów
1. Utwórz `src/lib/services/tags/tag.service.ts`:
   - `listTags(supabase, userId, filters): Promise<TagWithUsageDto[]>`
     - Obsłuż LEFT JOIN z flashcard_tags dla usage_count
     - Filtrowanie: scope, deck_id, search (ILIKE)
     - Return global + user's deck tags (RLS handled by query)
   - `getTag(supabase, userId, id): Promise<TagDto | null>`
     - Weryfikuj dostęp (global or user's deck)
   - `createTag(supabase, userId, command): Promise<TagDto>`
     - Insert z scope="deck", user_id auto-set
     - Obsłuż unique constraint violation (throw 409 error)
   - `updateTag(supabase, userId, id, {name}): Promise<TagDto>`
     - Update tylko dla scope='deck' i user_id match
     - Obsłuż unique constraint violation
   - `deleteTag(supabase, userId, id): Promise<void>`
     - Delete tylko dla scope='deck' i user_id match
     - Cascade handled by DB
2. Implementuj usage_count przez Supabase relationships lub raw SQL
3. Obsłuż Postgres error codes:
   - `23505` (unique_violation) → custom error class `DuplicateTagError`

### Krok 3: Rozszerz DeckService (jeśli nie istnieje)
1. W `src/lib/services/decks/deck.service.ts`:
   - `verifyDeckOwnership(supabase, userId, deck_id): Promise<boolean>`
     - Query: `.from("decks").select("id").eq("id", deck_id).eq("user_id", userId).single()`
     - Return true jeśli znaleziono, false otherwise

### Krok 4: Implementacja error handling utilities
1. Utwórz `src/lib/utils/errors.ts` (jeśli nie istnieje):
   - `class DuplicateTagError extends Error` – dla unique constraint violations
   - `class TagNotFoundError extends Error`
   - `class ForbiddenError extends Error` – dla operacji na global tags
   - `formatErrorResponse(code, message, details?): ErrorResponse`
   - `handleDatabaseError(error): ErrorResponse` – mapuje Postgres errors

### Krok 5: Implementacja endpointów Astro
1. `src/pages/api/v1/tags/index.ts`:
   - `export const prerender = false`
   - Handler GET:
     - Parsuj query przez Zod
     - Pobierz userId z session (401 jeśli brak)
     - Wywołaj `listTags(supabase, userId, filters)`
     - Zwróć 200 z `TagListResponseDto`
   - Handler POST:
     - Parsuj body przez Zod
     - Pobierz userId z session (401 jeśli brak)
     - Weryfikuj deck ownership (400 jeśli false)
     - Wywołaj `createTag(supabase, userId, command)`
     - Obsłuż DuplicateTagError → 409
     - Zwróć 201 z `TagDto`

2. `src/pages/api/v1/tags/[id].ts`:
   - Handler GET (opcjonalnie, dla single tag):
     - Parsuj `:id`
     - Wywołaj `getTag(supabase, userId, id)`
     - 404 jeśli null
     - Zwróć 200 z `TagDto`
   - Handler PATCH:
     - Parsuj `:id` i body przez Zod
     - Pobierz istniejący tag (404 jeśli null)
     - Sprawdź scope='deck' (404/403 jeśli global)
     - Wywołaj `updateTag(supabase, userId, id, {name})`
     - Obsłuż DuplicateTagError → 409
     - Zwróć 200 z `TagDto`
   - Handler DELETE:
     - Parsuj `:id`
     - Pobierz istniejący tag (404 jeśli null)
     - Sprawdź scope='deck' (404/403 jeśli global)
     - Wywołaj `deleteTag(supabase, userId, id)`
     - Zwróć 204 No Content

### Krok 6: Obsługa błędów w handlerach
1. Wrap wszystkie handlery w try/catch
2. Catch specific errors:
   - `DuplicateTagError` → 409 z clear message
   - `TagNotFoundError` → 404
   - `ForbiddenError` → 403 lub 404 (dla global tags)
   - Zod validation errors → 400
   - Generic errors → 500 z logging
3. Użyj `formatErrorResponse()` dla spójności
4. Loguj 500 errors przez strukturowany logger

### Krok 7: Testy jednostkowe
1. `tag.service.test.ts`:
   - Mock Supabase client
   - Testuj `listTags`:
     - Bez filtrów (global + user's deck tags)
     - Z filtrem scope='global' (tylko global)
     - Z filtrem scope='deck' (tylko user's deck)
     - Z filtrem deck_id (tylko tagi z danej talii)
     - Z search (partial match)
     - usage_count poprawnie liczone (mock JOIN)
   - Testuj `createTag`:
     - Success case (scope auto-set do 'deck')
     - Duplicate name w deck → DuplicateTagError
     - Invalid deck_id → error
   - Testuj `updateTag`:
     - Success case
     - Duplicate name → DuplicateTagError
     - Attempt to update global tag → error
   - Testuj `deleteTag`:
     - Success case (cascade verify w integration test)
     - Attempt to delete global tag → error

2. `deck.service.test.ts`:
   - Testuj `verifyDeckOwnership` (true/false cases)

### Krok 8: Testy integracyjne
1. Setup: seed bazy z użytkownikami, decks, tags (global + deck-scoped), flashcards + flashcard_tags
2. Testy endpointów:
   - GET /tags: różne kombinacje filtrów, weryfikuj usage_count
   - POST /tags: tworzenie z weryfikacją deck ownership, duplicate handling
   - PATCH /tags/:id: update nazwy, duplicate handling, forbidden dla global
   - DELETE /tags/:id: usunięcie z weryfikacją cascade (flashcard_tags cleared)
3. Scenariusze błędów:
   - 400: validation errors, invalid deck
   - 401: missing auth
   - 404: tag not found
   - 409: duplicate name
4. Cross-user isolation:
   - User A nie widzi deck tags user B
   - User A nie może edytować tagów user B

### Krok 9: Testy RLS i bezpieczeństwa
1. Weryfikuj polityki RLS w Supabase (SQL Editor):
   - User widzi global tags + własne deck tags
   - User może tworzyć tylko deck tags z user_id=auth.uid()
   - User może edytować/usuwać tylko własne deck tags
   - Global tags read-only dla non-admins
2. Testy penetracyjne:
   - Próba utworzenia tagu z scope='global' (should fail przez RLS)
   - Próba edycji cudzego deck tag (should fail przez RLS)
   - Próba edycji global tag (should fail - 404/403)
   - Próba utworzenia tagu w cudzym deck (should fail - 400)

### Krok 10: Testy kaskadowego usuwania
1. Utwórz tag, przypisz do fiszek (flashcard_tags entries)
2. Usuń tag przez DELETE /tags/:id
3. Weryfikuj:
   - Tag usunięty z `tags`
   - Wszystkie powiązania usunięte z `flashcard_tags` (ON DELETE CASCADE)
   - Fiszki pozostały niezmienione (flashcards intact)

### Krok 11: Testy wydajnościowe (opcjonalnie)
1. Seed dużej liczby tagów (500+ per user) i fiszek (10k+)
2. Mierz czas zapytań:
   - GET /tags (z/bez filtrów)
   - usage_count calculation z dużą liczbą fiszek
3. Weryfikuj wykorzystanie indeksów (EXPLAIN ANALYZE)
4. Optymalizuj jeśli potrzeba:
   - Materialized view dla usage_count
   - Paginacja jeśli response time > 1s

### Krok 12: Dokumentacja i QA
1. Aktualizuj `.ai/tags-implementation-plan.md` (ten plik)
2. Utwórz przykłady zapytań (cURL/Thunder Client):
   ```bash
   # GET list
   curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:4321/api/v1/tags?scope=deck&search=import"
   
   # POST create
   curl -X POST -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name":"important","deck_id":"123"}' \
     http://localhost:4321/api/v1/tags
   
   # PATCH update
   curl -X PATCH -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name":"very-important"}' \
     http://localhost:4321/api/v1/tags/456
   
   # DELETE
   curl -X DELETE -H "Authorization: Bearer $TOKEN" \
     http://localhost:4321/api/v1/tags/456
   ```
3. Dokumentuj edge cases:
   - Global tags są read-only w MVP (admin interface poza zakresem)
   - Unikalność nazw case-sensitive (rozważ normalizację w przyszłości)
   - usage_count może być stale dla bardzo aktywnych tagów
4. Code review z zespołem
5. QA manual testing: różne scenariusze użytkownika, UI flows

### Krok 13: Deployment i monitoring
1. Deploy do staging environment
2. Smoke tests: podstawowe operacje CRUD
3. Weryfikuj RLS policies działają poprawnie
4. Monitoruj wydajność usage_count queries
5. Deploy do production
6. Post-deployment verification

---

## 10. Uwagi dodatkowe

### 10.1 Globalne tagi (Admin functionality)
- W MVP użytkownicy mają read-only access do global tags
- Admin interface dla zarządzania global tags poza zakresem tego planu
- RLS policies już przygotowane (see db-plan.md sekcja 5.3)
- W przyszłości: dodaj endpointy `/api/v1/admin/tags` z weryfikacją roli admin

### 10.2 Migracja tagów przy usuwaniu talii
- System automatycznie tworzy tag `#deleted-from-{deck_name}` (see deck deletion flow)
- Te tagi są scope='deck', przypisane do "Uncategorized" deck
- Endpointy tagów obsługują te tagi transparentnie (no special logic)

### 10.3 Case sensitivity i normalizacja
- Obecnie: case-sensitive comparison w unique constraint
- Przyszłość: rozważ:
  - Lowercase normalization: `CREATE UNIQUE INDEX ... LOWER(name)`
  - Lub aplikacyjna normalizacja przed insert/update
  - Trade-off: może być nieintuicyjne dla użytkowników ("Important" vs "important")

### 10.4 Limity i quotas (przyszłość)
- Rozważ limit tagów per user (np. 100 deck tags)
- Rozważ limit długości nazwy display vs storage (currently 50)
- Rate limiting na POST/PATCH/DELETE (prevent spam)

---

**Priorytet implementacji**: Kroki 1-6 (core functionality), następnie 7-9 (testy), opcjonalnie 10-13 (zaawansowane).

**Szacowany czas**: 2-3 dni dla doświadczonego developera (core + testy jednostkowe), +1 dzień dla testów integracyjnych i QA.

**Zależności**: Wymaga `DeckService.verifyDeckOwnership` (może być zaimplementowane równolegle lub wcześniej w ramach deck endpoints).

