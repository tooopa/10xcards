# API Endpoint Implementation Plan: Flashcards API

## 1. Przegląd punktu końcowego

Zestaw endpointów zarządzających fiszkami użytkownika, obejmujący pełny CRUD oraz operacje tagowania. Fiszki mogą pochodzić z trzech źródeł (manual, ai-full, ai-edited) i zawierają mechanizm automatycznej zmiany źródła przy edycji. System wspiera pełnotekstowe wyszukiwanie, filtrowanie wielokryteriowe oraz transakcyjne operacje na tagach.

**Obejmuje 8 endpointów**:
- GET /api/v1/flashcards (lista z filtrowaniem)
- GET /api/v1/flashcards/:id (szczegóły pojedynczej fiszki)
- POST /api/v1/flashcards (tworzenie ręczne)
- PATCH /api/v1/flashcards/:id (aktualizacja z logiką source)
- DELETE /api/v1/flashcards/:id (soft-delete)
- PUT /api/v1/flashcards/:id/tags (zastąpienie wszystkich tagów)
- POST /api/v1/flashcards/:id/tags (dodanie tagów)
- DELETE /api/v1/flashcards/:id/tags/:tag_id (usunięcie tagu)

## 2. Szczegóły żądania

### 2.1 GET /api/v1/flashcards
- **Metoda HTTP**: GET
- **Struktura URL**: `/api/v1/flashcards`
- **Nagłówki**: `Authorization: Bearer <access_token>` (wymagany)
- **Query params**:
  - Opcjonalne:
    - `deck_id`: string (BIGINT) – filtr po talii
    - `source`: enum (`manual`, `ai-full`, `ai-edited`) – filtr po źródle
    - `tag_id`: string (BIGINT) – filtr po tagu (single tag w MVP)
    - `search`: string (max 200 chars, trimmed) – full-text search front/back
    - `sort`: enum (`created_at`, `updated_at`) – default: `created_at`
    - `order`: enum (`asc`, `desc`) – default: `desc`
    - `page`: integer ≥1 – default: 1
    - `limit`: integer 1–100 – default: 20

### 2.2 GET /api/v1/flashcards/:id
- **Metoda HTTP**: GET
- **Struktura URL**: `/api/v1/flashcards/:id`
- **Nagłówki**: `Authorization: Bearer <access_token>` (wymagany)
- **Path params**: `id` (BIGINT)

### 2.3 POST /api/v1/flashcards
- **Metoda HTTP**: POST
- **Struktura URL**: `/api/v1/flashcards`
- **Nagłówki**: `Authorization: Bearer <access_token>`, `Content-Type: application/json`
- **Body** (wymagane):
  ```json
  {
    "deck_id": "string (BIGINT, required)",
    "front": "string (1-200 chars, required)",
    "back": "string (1-500 chars, required)"
  }
  ```

### 2.4 PATCH /api/v1/flashcards/:id
- **Metoda HTTP**: PATCH
- **Struktura URL**: `/api/v1/flashcards/:id`
- **Nagłówki**: `Authorization: Bearer <access_token>`, `Content-Type: application/json`
- **Path params**: `id` (BIGINT)
- **Body** (co najmniej jedno pole):
  ```json
  {
    "deck_id": "string (BIGINT, optional)",
    "front": "string (1-200 chars, optional)",
    "back": "string (1-500 chars, optional)"
  }
  ```

### 2.5 DELETE /api/v1/flashcards/:id
- **Metoda HTTP**: DELETE
- **Struktura URL**: `/api/v1/flashcards/:id`
- **Nagłówki**: `Authorization: Bearer <access_token>`
- **Path params**: `id` (BIGINT)

### 2.6 PUT /api/v1/flashcards/:id/tags
- **Metoda HTTP**: PUT
- **Struktura URL**: `/api/v1/flashcards/:id/tags`
- **Nagłówki**: `Authorization: Bearer <access_token>`, `Content-Type: application/json`
- **Path params**: `id` (BIGINT)
- **Body**:
  ```json
  {
    "tag_ids": ["string (BIGINT)"]
  }
  ```

### 2.7 POST /api/v1/flashcards/:id/tags
- **Metoda HTTP**: POST
- **Struktura URL**: `/api/v1/flashcards/:id/tags`
- **Nagłówki**: `Authorization: Bearer <access_token>`, `Content-Type: application/json`
- **Path params**: `id` (BIGINT)
- **Body**:
  ```json
  {
    "tag_ids": ["string (BIGINT)"]
  }
  ```

### 2.8 DELETE /api/v1/flashcards/:id/tags/:tag_id
- **Metoda HTTP**: DELETE
- **Struktura URL**: `/api/v1/flashcards/:id/tags/:tag_id`
- **Nagłówki**: `Authorization: Bearer <access_token>`
- **Path params**: `id` (flashcard BIGINT), `tag_id` (tag BIGINT)

## 3. Wykorzystywane typy

Z `src/types.ts`:
- `FlashcardDto` – pełna reprezentacja fiszki z tagami
- `FlashcardListResponseDto` – lista + pagination
- `FlashcardListQuery` – query params dla listy
- `CreateFlashcardCommand` – payload POST
- `UpdateFlashcardCommand` – payload PATCH
- `ReplaceFlashcardTagsCommand` – payload PUT tags
- `AddFlashcardTagsCommand` – payload POST tags
- `FlashcardTagsDto` – odpowiedź operacji tagowania
- `TagDto` – zagnieżdżony w FlashcardDto
- `FlashcardSource` – enum typu literal
- `PaginationMeta`, `PaginationQuery`
- `ErrorResponse`

Nowe Zod schemas (do utworzenia w `src/lib/validation/flashcards.ts`):
- `FlashcardListQuerySchema`
- `CreateFlashcardSchema`
- `UpdateFlashcardSchema`
- `FlashcardTagsSchema`

## 4. Szczegóły odpowiedzi

### 4.1 GET /api/v1/flashcards
- **200 OK**: `FlashcardListResponseDto`
  ```json
  {
    "data": [
      {
        "id": "string",
        "deck_id": "string",
        "front": "string",
        "back": "string",
        "source": "manual|ai-full|ai-edited",
        "generation_id": "string|null",
        "created_at": "ISO8601",
        "updated_at": "ISO8601",
        "tags": [
          {
            "id": "string",
            "name": "string",
            "scope": "global|deck",
            "deck_id": "string|null",
            "created_at": "ISO8601"
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "total_pages": 5
    }
  }
  ```
- **400**: invalid query params
- **401**: unauthorized

### 4.2 GET /api/v1/flashcards/:id
- **200 OK**: `FlashcardDto` (struktura jak w 4.1, single object)
- **401**: unauthorized
- **404**: flashcard not found

### 4.3 POST /api/v1/flashcards
- **201 Created**: `FlashcardDto` (bez tagów, source="manual")
- **400**: validation errors, deck doesn't exist/belong to user
- **401**: unauthorized

### 4.4 PATCH /api/v1/flashcards/:id
- **200 OK**: `FlashcardDto` (z zaktualizowanym source jeśli ai-full→ai-edited)
- **400**: validation errors, deck doesn't exist, no fields provided
- **401**: unauthorized
- **404**: flashcard not found

### 4.5 DELETE /api/v1/flashcards/:id
- **204 No Content**
- **401**: unauthorized
- **404**: flashcard not found

### 4.6 PUT /api/v1/flashcards/:id/tags
- **200 OK**: `FlashcardTagsDto`
  ```json
  {
    "flashcard_id": "string",
    "tags": [...]
  }
  ```
- **400**: invalid tag_ids
- **401**: unauthorized
- **404**: flashcard or tag not found

### 4.7 POST /api/v1/flashcards/:id/tags
- **200 OK**: `FlashcardTagsDto` (wszystkie tagi po dodaniu)
- **400**: invalid tag_ids
- **401**: unauthorized
- **404**: flashcard or tag not found

### 4.8 DELETE /api/v1/flashcards/:id/tags/:tag_id
- **204 No Content**
- **401**: unauthorized
- **404**: flashcard or tag association not found

## 5. Przepływ danych

### 5.1 GET /api/v1/flashcards (lista)
1. Middleware uwierzytelnia, umieszcza `supabase` + `session` w `locals`
2. Handler waliduje query przez Zod, ustawia defaulty
3. Pobiera `userId` z session (401 jeśli brak)
4. Wywołuje `FlashcardService.listFlashcards(supabase, userId, filters)`
5. Serwis:
   - Buduje query: `from("flashcards")`, `select("*, tags!inner(*)")` dla joina z tagami
   - Filtruje: `eq("user_id", userId)`, `is("deleted_at", null)`
   - Dodaje filtry: `eq("deck_id")`, `eq("source")`, opcjonalnie join przez `flashcard_tags` dla `tag_id`
   - Full-text search: `textSearch("tsv", search)` lub `ilike` na front/back
   - Sortowanie: `order(sort, {ascending: order==='asc'})`
   - Paginacja: `range(offset, offset+limit-1)`
   - Pobiera count z `{count: 'exact'}`
6. Mapuje do `FlashcardDto[]` z zagnieżdżonymi tagami
7. Oblicza `PaginationMeta`
8. Zwraca 200 z JSON

### 5.2 GET /api/v1/flashcards/:id (single)
1. Parsuje `:id`, waliduje (numeric)
2. Wywołuje `FlashcardService.getFlashcard(supabase, userId, id)`
3. Serwis:
   - `from("flashcards").select("*, tags(*)").eq("id", id).eq("user_id", userId).is("deleted_at", null).single()`
   - Join z `tags` przez `flashcard_tags`
4. 404 jeśli null, 200 z `FlashcardDto` jeśli znaleziono

### 5.3 POST /api/v1/flashcards (create)
1. Parsuje body, waliduje przez Zod
2. Wywołuje `DeckService.verifyDeckOwnership(supabase, userId, deck_id)` → 400 jeśli false
3. Wywołuje `FlashcardService.createFlashcard(supabase, userId, command)`
4. Serwis:
   - `insert({ user_id: userId, deck_id, front, back, source: "manual" })`
   - Pobiera utworzoną fiszkę z `select().single()`
5. Zwraca 201 z `FlashcardDto`

### 5.4 PATCH /api/v1/flashcards/:id (update)
1. Parsuje `:id` i body, waliduje (co najmniej jedno pole)
2. Pobiera istniejącą fiszkę dla userId (404 jeśli brak)
3. Jeśli `deck_id` w body → weryfikuje ownership
4. Określa nowy source:
   - Jeśli `current.source === "ai-full"` i edytowano `front` lub `back` → `"ai-edited"`
   - Inaczej zachowuje `current.source`
5. Wywołuje `FlashcardService.updateFlashcard(supabase, userId, id, updates, newSource)`
6. Serwis:
   - `update({...updates, source: newSource}).eq("id", id).eq("user_id", userId).select().single()`
7. Zwraca 200 z zaktualizowanym `FlashcardDto`

### 5.5 DELETE /api/v1/flashcards/:id (soft-delete)
1. Parsuje `:id`
2. Wywołuje `FlashcardService.deleteFlashcard(supabase, userId, id)`
3. Serwis:
   - `update({deleted_at: new Date().toISOString()}).eq("id", id).eq("user_id", userId).is("deleted_at", null)`
   - Sprawdza `count` affected rows (404 jeśli 0)
4. Zwraca 204

### 5.6 PUT /api/v1/flashcards/:id/tags (replace tags - TRANSACTION)
1. Parsuje `:id` i body (`tag_ids[]`)
2. Weryfikuje flashcard ownership (404 jeśli brak)
3. Wywołuje `TagService.verifyTagsAccessible(supabase, userId, tag_ids)` → 400 jeśli false
4. Wywołuje `TagService.replaceFlashcardTags(supabase, flashcard_id, tag_ids)` w transakcji:
   - `from("flashcard_tags").delete().eq("flashcard_id", id)`
   - `from("flashcard_tags").insert(tag_ids.map(tag_id => ({flashcard_id: id, tag_id})))`
5. Pobiera aktualne tagi: `from("tags").select().in("id", tag_ids)`
6. Zwraca 200 z `FlashcardTagsDto`

### 5.7 POST /api/v1/flashcards/:id/tags (add tags)
1. Parsuje `:id` i body (`tag_ids[]`)
2. Weryfikuje flashcard ownership (404 jeśli brak)
3. Wywołuje `TagService.verifyTagsAccessible(supabase, userId, tag_ids)` → 400 jeśli false
4. Wywołuje `TagService.addFlashcardTags(supabase, flashcard_id, tag_ids)`:
   - `from("flashcard_tags").upsert(tag_ids.map(...), {onConflict: 'flashcard_id,tag_id', ignoreDuplicates: true})`
5. Pobiera wszystkie tagi fiszki po dodaniu
6. Zwraca 200 z `FlashcardTagsDto`

### 5.8 DELETE /api/v1/flashcards/:id/tags/:tag_id (remove tag)
1. Parsuje `:id` i `:tag_id`
2. Weryfikuje flashcard ownership (404 jeśli brak)
3. Wywołuje `TagService.removeFlashcardTag(supabase, flashcard_id, tag_id)`:
   - `from("flashcard_tags").delete().eq("flashcard_id", id).eq("tag_id", tag_id)`
   - Sprawdza affected count (404 jeśli 0)
4. Zwraca 204

## 6. Względy bezpieczeństwa

### 6.1 Uwierzytelnianie i autoryzacja
- Wszystkie endpointy wymagają `session` (401 przy braku)
- RLS na tabelach `flashcards`, `flashcard_tags`, `tags` izoluje dane użytkowników
- Dodatkowo filtry `eq("user_id", userId)` na poziomie aplikacji

### 6.2 Weryfikacja własności zasobów
- Przy tworzeniu/aktualizacji: weryfikuj `deck_id` belongs to userId
- Przy operacjach na fiszkach: weryfikuj `flashcard.user_id === userId`
- Przy operacjach na tagach: weryfikuj dostęp do tagów (global OR user's deck tags)

### 6.3 Walidacja danych wejściowych
- Zod schemas dla wszystkich payloadów i query params
- Długości: front 1-200, back 1-500, search max 200
- Enums: source, sort, order
- Trimming i sanityzacja search strings
- Walidacja numerycznych ID (BIGINT range)
- tag_ids: non-empty array, valid IDs

### 6.4 Ochrona przed atakami
- SQL injection: parametryzowane zapytania przez Supabase SDK
- XSS: walidacja długości i typów, brak raw HTML
- CSRF: nie dotyczy (stateless Bearer token)
- Rate limiting: implementacja na poziomie middleware/proxy (poza zakresem MVP)

### 6.5 Soft-delete
- Zawsze filtruj `deleted_at IS NULL` przy odczycie
- Przy DELETE użyj `is("deleted_at", null)` w warunku update (idempotentność)

## 7. Obsługa błędów

### 7.1 Kody błędów i scenariusze

| Kod | Scenariusz | Przykładowy komunikat |
|-----|-----------|----------------------|
| 400 | Invalid query params | `invalid_query_params: sort must be one of: created_at, updated_at` |
| 400 | Front/back length violation | `validation_error: front must be between 1 and 200 characters` |
| 400 | Deck doesn't exist/belong to user | `invalid_deck: Deck not found or access denied` |
| 400 | Invalid tag_ids | `invalid_tags: One or more tags not found or inaccessible` |
| 400 | No fields in PATCH | `validation_error: At least one field required for update` |
| 400 | Empty tag_ids array | `validation_error: tag_ids must contain at least one tag` |
| 401 | Missing/invalid session | `unauthorized: Authentication required` |
| 404 | Flashcard not found | `not_found: Flashcard not found` |
| 404 | Tag not found | `not_found: Tag not found` |
| 404 | Tag association not found | `not_found: Tag not associated with flashcard` |
| 500 | Database error | `database_error: An unexpected error occurred` |
| 500 | Transaction failure | `transaction_error: Failed to update tags` |

### 7.2 Struktura odpowiedzi błędu
```json
{
  "error": {
    "code": "validation_error",
    "message": "front must be between 1 and 200 characters",
    "details": {
      "field": "front",
      "value": "",
      "constraint": "min_length"
    }
  }
}
```

### 7.3 Logowanie błędów
- 400/401/404: info level (expected errors)
- 500: error level z pełnym stack trace
- Transakcje: log rollback z kontekstem (flashcard_id, tag_ids)
- Nie loguj do `generation_error_logs` (tylko dla AI)

## 8. Rozważania dotyczące wydajności

### 8.1 Indeksy wykorzystywane
- `idx_flashcards_user_deck`: (user_id, deck_id) WHERE deleted_at IS NULL
- `idx_flashcards_tsv`: GIN na kolumnie tsv (full-text search)
- `idx_flashcards_source`: source enum
- `idx_flashcard_tags_flashcard_id`, `idx_flashcard_tags_tag_id`: joiny M2M
- `idx_tags_scope`, `idx_tags_deck_id`: dostęp do tagów

### 8.2 Optymalizacje zapytań
- Join z tagami: używaj `select("*, tags(*)")` zamiast osobnych zapytań (N+1)
- Paginacja: offset/limit akceptowalny dla MVP, rozważ keyset w przyszłości
- Count: `{count: 'exact'}` może spowalniać na dużych zbiorach; monitoruj i rozważ `planned` lub cache
- Full-text search: `tsv` GIN index jest wydajny, ale dla bardzo długich wyników rozważ `rank` i limit

### 8.3 Potencjalne wąskie gardła
- Tag operations: transakcje z delete+insert mogą być wolne przy wielu tagach; akceptowalne dla MVP
- Search na dużych zbiorach: monitoruj czasy zapytań, rozważ limit wyników (np. max 1000)
- Multiple filters (deck+source+tag+search): złożone warunki WHERE; indeksy composite mogą pomóc
- Flashcard count per deck: jeśli potrzebne w liście fiszek, rozważ agregację lub cache

### 8.4 Strategie cache
- Read-heavy endpoints (GET list/single): rozważ edge cache z TTL 60s
- Tag lists: cache per user (invalidacja przy POST/PUT/DELETE tags)
- Deck ownership checks: cache w ramach request (locals)

## 9. Etapy wdrożenia

### Krok 1: Przygotowanie walidacji i typów
1. Utwórz `src/lib/validation/flashcards.ts`:
   - `FlashcardListQuerySchema` (Zod) z defaultami i ograniczeniami
   - `CreateFlashcardSchema` (front 1-200, back 1-500, deck_id required)
   - `UpdateFlashcardSchema` (wszystkie pola optional, ale co najmniej jedno)
   - `FlashcardTagsSchema` (tag_ids non-empty array)
2. Weryfikuj zgodność z `src/types.ts` (już zdefiniowane DTOs)

### Krok 2: Implementacja serwisu fiszek
1. Utwórz `src/lib/services/flashcards/flashcard.service.ts`:
   - `listFlashcards(supabase, userId, filters): Promise<{data: FlashcardDto[], count: number}>`
   - `getFlashcard(supabase, userId, id): Promise<FlashcardDto | null>`
   - `createFlashcard(supabase, userId, command): Promise<FlashcardDto>`
   - `updateFlashcard(supabase, userId, id, updates, newSource): Promise<FlashcardDto>`
   - `deleteFlashcard(supabase, userId, id): Promise<void>`
2. Zaimplementuj logikę joinów z tagami (wykorzystaj Supabase relationships)
3. Obsłuż full-text search przez `textSearch` lub `ilike`

### Krok 3: Implementacja serwisu tagów (operacje na fiszkach)
1. Utwórz `src/lib/services/tags/tag.service.ts` (lub rozszerz istniejący):
   - `verifyTagsAccessible(supabase, userId, tag_ids): Promise<boolean>`
   - `replaceFlashcardTags(supabase, flashcard_id, tag_ids): Promise<void>` (transakcja)
   - `addFlashcardTags(supabase, flashcard_id, tag_ids): Promise<void>`
   - `removeFlashcardTag(supabase, flashcard_id, tag_id): Promise<void>`
   - `getFlashcardTags(supabase, flashcard_id): Promise<TagDto[]>`
2. Implementuj transakcję dla `replaceFlashcardTags` (DELETE + INSERT)

### Krok 4: Implementacja pomocniczych funkcji
1. W `src/lib/services/decks/deck.service.ts`:
   - `verifyDeckOwnership(supabase, userId, deck_id): Promise<boolean>`
2. W `src/lib/utils/flashcards.ts`:
   - `determineNewSource(currentSource, frontEdited, backEdited): FlashcardSource`

### Krok 5: Implementacja endpointów Astro
1. `src/pages/api/v1/flashcards/index.ts`:
   - `export const prerender = false`
   - Handler GET: parsuj query, wywołaj listFlashcards, zwróć 200
   - Handler POST: parsuj body, weryfikuj deck, wywołaj createFlashcard, zwróć 201
2. `src/pages/api/v1/flashcards/[id].ts`:
   - GET: parsuj id, wywołaj getFlashcard, zwróć 200 lub 404
   - PATCH: parsuj id+body, wywołaj updateFlashcard z logiką source, zwróć 200
   - DELETE: parsuj id, wywołaj deleteFlashcard, zwróć 204
3. `src/pages/api/v1/flashcards/[id]/tags.ts` (lub osobne pliki):
   - PUT: parsuj id+body, transakcja replaceFlashcardTags, zwróć 200
   - POST: parsuj id+body, addFlashcardTags, zwróć 200
4. `src/pages/api/v1/flashcards/[id]/tags/[tag_id].ts`:
   - DELETE: parsuj id+tag_id, removeFlashcardTag, zwróć 204

### Krok 6: Obsługa błędów i middleware
1. W każdym handlerze: wrap w try/catch
2. Użyj pomocniczej funkcji `formatErrorResponse(code, message, details?)` z `src/lib/utils/errors.ts`
3. Loguj 500 errors przez strukturowany logger
4. Zwracaj odpowiednie statusy i `ErrorResponse`

### Krok 7: Testy jednostkowe
1. `flashcard.service.test.ts`:
   - Mock Supabase client
   - Testuj listFlashcards z różnymi filtrami (deck, source, tag, search, sort)
   - Testuj createFlashcard z weryfikacją source="manual"
   - Testuj updateFlashcard z logiką ai-full→ai-edited
   - Testuj deleteFlashcard (soft-delete)
2. `tag.service.test.ts`:
   - Testuj verifyTagsAccessible (global vs deck tags)
   - Testuj replaceFlashcardTags (transakcja)
   - Testuj addFlashcardTags (ON CONFLICT)
   - Testuj removeFlashcardTag

### Krok 8: Testy integracyjne
1. Setup: seed bazy z użytkownikami, decks, flashcards, tags
2. Testy endpointów:
   - GET /flashcards: różne kombinacje filtrów, paginacja, search
   - POST /flashcards: tworzenie z weryfikacją deck ownership
   - PATCH /flashcards/:id: edycja z logiką source transition
   - DELETE /flashcards/:id: soft-delete i weryfikacja
   - PUT/POST/DELETE tags: operacje tagowania z transakcjami
3. Scenariusze błędów: 400 (validation), 401 (auth), 404 (not found)
4. Cross-user isolation: user A nie widzi fiszek user B

### Krok 9: Testy RLS i bezpieczeństwa
1. Weryfikuj polityki RLS w Supabase (użyj Supabase Studio SQL Editor):
   - User A nie może odczytać/edytować fiszek user B
   - Tag operations respektują scope (global vs deck)
2. Testy penetracyjne:
   - Próba dostępu do cudzych fiszek przez ID
   - Próba przypisania tagów do cudzych fiszek
   - Próba przeniesienia fiszki do cudzej talii

### Krok 10: Testy wydajnościowe (opcjonalnie)
1. Seed dużej liczby fiszek (10k+) dla jednego użytkownika
2. Mierz czas zapytań:
   - GET /flashcards z różnymi filtrami
   - Full-text search na dużym zbiorze
   - Tag operations z wieloma tagami
3. Monitoruj wykorzystanie indeksów (EXPLAIN ANALYZE w Postgres)
4. Optymalizuj jeśli potrzeba (dodatkowe indeksy, query tuning)

### Krok 11: Dokumentacja i QA
1. Aktualizuj `.ai/flashcards-implementation-plan.md` (ten plik)
2. Utwórz przykłady zapytań (cURL/Thunder Client) dla każdego endpointu
3. Dokumentuj edge cases i known limitations
4. Code review z zespołem
5. QA manual testing: różne scenariusze użytkownika, UI flows

### Krok 12: Deployment i monitoring
1. Deploy do staging environment
2. Smoke tests na staging
3. Monitoruj logi i metryki (Supabase Dashboard, aplikacja)
4. Deploy do production
5. Post-deployment verification (health checks)

---

**Priorytet implementacji**: Kroki 1-6 (core functionality), następnie 7-9 (testy), opcjonalnie 10-12 (zaawansowane).

**Szacowany czas**: 3-5 dni dla doświadczonego developera (core + testy jednostkowe), +2 dni dla testów integracyjnych i QA.

