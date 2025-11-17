# API Endpoint Implementation Plan: Generations API

## 1. Przegląd punktu końcowego

Zestaw endpointów obsługujących generację fiszek przez AI (OpenRouter.ai) oraz zarządzanie historią generacji. System umożliwia przekształcenie tekstu źródłowego (1000-10000 znaków) w propozycje fiszek, które użytkownik może następnie zaakceptować. **Kluczowa cecha**: propozycje NIE są przechowywane w bazie danych – zwracane są tylko z endpointu `/generate` i muszą być przesłane ponownie do `/accept` w celu utworzenia fiszek.

System obejmuje:
- Rate limiting (10 generacji/godzinę per user)
- Deduplikację przez SHA-256 hash tekstu źródłowego
- Logowanie błędów AI do tabeli `generation_error_logs`
- Tracking statystyk akceptacji (unedited vs edited)
- Integrację z OpenRouter.ai dla dostępu do wielu modeli AI

**Obejmuje 4 endpointy**:
- GET /api/v1/generations (historia generacji z paginacją)
- GET /api/v1/generations/:id (szczegóły pojedynczej generacji)
- POST /api/v1/generations/generate (generowanie przez AI)
- POST /api/v1/generations/:id/accept (akceptacja propozycji)

## 2. Szczegóły żądania

### 2.1 GET /api/v1/generations
- **Metoda HTTP**: GET
- **Struktura URL**: `/api/v1/generations`
- **Nagłówki**: `Authorization: Bearer <access_token>` (wymagany)
- **Query params**:
  - Opcjonalne:
    - `deck_id`: string (BIGINT) – filtr po talii docelowej
    - `sort`: enum (`created_at`) – default: `created_at`
    - `order`: enum (`asc`, `desc`) – default: `desc`
    - `page`: integer ≥1 – default: 1
    - `limit`: integer 1–100 – default: 20

### 2.2 GET /api/v1/generations/:id
- **Metoda HTTP**: GET
- **Struktura URL**: `/api/v1/generations/:id`
- **Nagłówki**: `Authorization: Bearer <access_token>` (wymagany)
- **Path params**: `id` (BIGINT)
- **Uwaga**: NIE zwraca suggestions (nie są przechowywane w DB)

### 2.3 POST /api/v1/generations/generate
- **Metoda HTTP**: POST
- **Struktura URL**: `/api/v1/generations/generate`
- **Nagłówki**: `Authorization: Bearer <access_token>`, `Content-Type: application/json`
- **Body** (wymagane):
  ```json
  {
    "source_text": "string (1000-10000 chars, required)",
    "model": "string (required, valid OpenRouter model ID)",
    "deck_id": "string (BIGINT, required)"
  }
  ```
- **Rate Limiting**: Max 10 requests/hour per user (429 if exceeded)
- **Timeout**: 60 seconds max dla OpenRouter API call

### 2.4 POST /api/v1/generations/:id/accept
- **Metoda HTTP**: POST
- **Struktura URL**: `/api/v1/generations/:id/accept`
- **Nagłówki**: `Authorization: Bearer <access_token>`, `Content-Type: application/json`
- **Path params**: `id` (BIGINT) – generation_id
- **Body** (wymagane):
  ```json
  {
    "flashcards": [
      {
        "front": "string (1-200 chars, required)",
        "back": "string (1-500 chars, required)",
        "edited": "boolean (required)"
      }
    ]
  }
  ```
- **Uwaga**: Transakcja atomowa (wszystkie fiszki lub żadna)

## 3. Wykorzystywane typy

Z `src/types.ts`:
- `GenerationSummaryDto` – dla listy generacji
- `GenerationDetailDto` – dla pojedynczej generacji (tożsame z Summary w MVP)
- `GenerationListResponseDto` – lista + pagination
- `GenerationListQuery` – query params dla GET list
- `GenerateFlashcardsCommand` – payload POST generate
- `GenerationSuggestionsDto` – odpowiedź POST generate (metadata + suggestions)
- `GenerationSuggestionDto` – pojedyncza propozycja (front, back)
- `AcceptGenerationCommand` – payload POST accept
- `AcceptGenerationFlashcardInput` – pojedyncza fiszka do akceptacji
- `AcceptGenerationResultDto` – odpowiedź POST accept
- `PaginationMeta`, `ErrorResponse`

Nowe Zod schemas (do utworzenia w `src/lib/validation/generations.ts`):
- `GenerationListQuerySchema`
- `GenerateFlashcardsSchema`
- `AcceptGenerationSchema`
- `OpenRouterModelSchema` (whitelist dozwolonych modeli)

Nowe typy serwisowe:
- `OpenRouterRequest` (payload do OpenRouter API)
- `OpenRouterResponse` (parsed response z AI)
- `RateLimitInfo` (count, reset_at dla user)

## 4. Szczegóły odpowiedzi

### 4.1 GET /api/v1/generations
- **200 OK**: `GenerationListResponseDto`
  ```json
  {
    "data": [
      {
        "id": "string",
        "deck_id": "string",
        "model": "string",
        "generated_count": 10,
        "accepted_unedited_count": 7,
        "accepted_edited_count": 2,
        "source_text_length": 5000,
        "generation_duration_ms": 12500,
        "created_at": "ISO8601",
        "updated_at": "ISO8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "total_pages": 3
    }
  }
  ```
- **400**: invalid query params
- **401**: unauthorized

### 4.2 GET /api/v1/generations/:id
- **200 OK**: `GenerationDetailDto` (struktura jak w 4.1, single object)
- **401**: unauthorized
- **404**: generation not found

### 4.3 POST /api/v1/generations/generate
- **201 Created**: `GenerationSuggestionsDto`
  ```json
  {
    "generation_id": "string",
    "model": "string",
    "generated_count": 10,
    "source_text_length": 5000,
    "generation_duration_ms": 12500,
    "suggestions": [
      {
        "front": "string",
        "back": "string"
      }
    ],
    "created_at": "ISO8601"
  }
  ```
- **400**: validation errors, deck doesn't exist, invalid model
- **401**: unauthorized
- **429**: rate limit exceeded (10/hour)
- **502**: OpenRouter API failure (bad response)
- **503**: OpenRouter API timeout or unavailable
- **500**: internal errors, DB failure

### 4.4 POST /api/v1/generations/:id/accept
- **201 Created**: `AcceptGenerationResultDto`
  ```json
  {
    "accepted_count": 9,
    "flashcards": [
      {
        "id": "string",
        "front": "string",
        "back": "string",
        "source": "ai-full|ai-edited",
        "generation_id": "string",
        "deck_id": "string",
        "created_at": "ISO8601"
      }
    ]
  }
  ```
- **400**: validation errors, empty flashcards array
- **401**: unauthorized
- **404**: generation not found
- **500**: transaction failure, DB errors

## 5. Przepływ danych

### 5.1 GET /api/v1/generations (lista)
1. Middleware uwierzytelnia, umieszcza `supabase` + `session` w `locals`
2. Handler waliduje query przez Zod, ustawia defaulty
3. Pobiera `userId` z session (401 jeśli brak)
4. Wywołuje `GenerationService.listGenerations(supabase, userId, filters)`
5. Serwis:
   - `from("generations").select("*", {count: 'exact'})`
   - Filtruje: `eq("user_id", userId)`, opcjonalnie `eq("deck_id")`
   - Sortowanie: `order("created_at", {ascending: order==='asc'})`
   - Paginacja: `range(offset, offset+limit-1)`
6. Mapuje do `GenerationSummaryDto[]`, oblicza `PaginationMeta`
7. Zwraca 200 z JSON

### 5.2 GET /api/v1/generations/:id (single)
1. Parsuje `:id`, waliduje (numeric)
2. Pobiera `userId` z session (401 jeśli brak)
3. Wywołuje `GenerationService.getGeneration(supabase, userId, id)`
4. Serwis:
   - `from("generations").select("*").eq("id", id).eq("user_id", userId).single()`
5. 404 jeśli null, 200 z `GenerationDetailDto` jeśli znaleziono

### 5.3 POST /api/v1/generations/generate (GŁÓWNY FLOW)
1. Parsuje body, waliduje przez Zod (source_text length, model whitelist, deck_id)
2. Pobiera `userId` z session (401 jeśli brak)
3. **Rate Limit Check**:
   - Wywołuje `RateLimitService.checkGenerationLimit(supabase, userId)` → 429 jeśli exceeded
   - Implementacja: count generations z `created_at > NOW() - INTERVAL '1 hour'`
4. **Deck Ownership Verification**:
   - Wywołuje `DeckService.verifyDeckOwnership(supabase, userId, deck_id)` → 400 jeśli false
5. **Hash Calculation** (opcjonalne, dla deduplikacji):
   - `source_text_hash = SHA256(source_text)`
   - Check if hash exists in last 24h (optional early exit)
6. **AI Generation**:
   - Start timer: `start_time = Date.now()`
   - Wywołuje `OpenRouterService.generateFlashcards(source_text, model, userId)`
   - OpenRouterService:
     - Buduje prompt strukturalny (format JSON output)
     - POST do OpenRouter API: `https://openrouter.ai/api/v1/chat/completions`
     - Headers: `Authorization: Bearer ${OPENROUTER_API_KEY}`, `HTTP-Referer`, `X-Title`
     - Body: `{model, messages: [{role: "user", content: prompt}], temperature: 0.7}`
     - Timeout: 60s (throw timeout error if exceeded)
     - Parsuje response JSON, waliduje struktur (`choices[0].message.content`)
     - Ekstrahuje suggestions array, waliduje każdy element
   - Stop timer: `duration_ms = Date.now() - start_time`
7. **Save Generation Record**:
   - Wywołuje `GenerationService.createGeneration(supabase, {user_id, deck_id, model, generated_count, source_text_hash, source_text_length, generation_duration_ms})`
   - Insert do tabeli `generations` (bez suggestions!)
   - Return `generation_id`
8. **Return Response**:
   - Zwraca 201 z `GenerationSuggestionsDto` (generation metadata + suggestions)
9. **Error Handling**:
   - On OpenRouter failure: log to `generation_error_logs`, return 502/503
   - On validation failure: return 400
   - On timeout: log error, return 503

### 5.4 POST /api/v1/generations/:id/accept (TRANSACTION)
1. Parsuje `:id` i body, waliduje (flashcards array non-empty, each item valid)
2. Pobiera `userId` z session (401 jeśli brak)
3. **Verify Generation Ownership**:
   - `from("generations").select("deck_id").eq("id", id).eq("user_id", userId).single()`
   - 404 jeśli null
4. **Transaction Begin**:
   - Wywołuje `GenerationService.acceptGeneration(supabase, generation_id, deck_id, flashcards)`
   - W transakcji:
     a. **Insert Flashcards**:
        - For each flashcard in array:
          - `source = flashcard.edited ? "ai-edited" : "ai-full"`
          - `insert({user_id, deck_id, front, back, source, generation_id})`
        - Collect created flashcard IDs
     b. **Update Generation Stats**:
        - `unedited_count = flashcards.filter(f => !f.edited).length`
        - `edited_count = flashcards.filter(f => f.edited).length`
        - `update({accepted_unedited_count: unedited_count, accepted_edited_count: edited_count, updated_at: NOW()}).eq("id", generation_id)`
     c. **Commit Transaction**
5. **Return Response**:
   - Fetch created flashcards with full details
   - Zwraca 201 z `AcceptGenerationResultDto`
6. **Error Handling**:
   - Transaction failure: rollback, return 500
   - Validation errors: return 400

## 6. Względy bezpieczeństwa

### 6.1 Uwierzytelnianie i autoryzacja
- Wszystkie endpointy wymagają `session` (401 przy braku)
- RLS na `generations` table: `eq("user_id", auth.uid())`
- Verify deck ownership przed generacją
- Verify generation ownership przed akceptacją

### 6.2 API Key Management
- **KRYTYCZNE**: OpenRouter API key w environment variables
- Nigdy nie expose key do klienta (tylko server-side calls)
- Używaj `import.meta.env.OPENROUTER_API_KEY` w Astro
- Opcjonalnie: rotacja kluczy, multiple keys dla load balancing

### 6.3 Rate Limiting
- **10 generacji/godzinę per user** – prevent abuse i cost explosion
- Implementacja: query `generations` table z `created_at > NOW() - INTERVAL '1 hour'`
- Alternatywa: Redis/in-memory cache dla wydajności
- Return 429 z header `Retry-After: <seconds>`
- Admin users mogą mieć wyższy limit (optional)

### 6.4 Model Validation
- **Whitelist dozwolonych modeli** (prevent arbitrary model injection)
- Przykłady: `openai/gpt-4o-mini`, `anthropic/claude-3-haiku`, `google/gemini-flash-1.5`
- Walidacja przez Zod enum lub custom validator
- Blokuj expensive models jeśli budget concern

### 6.5 Input Sanitization
- Source text length: strict enforcement 1000-10000 chars
- Model string: alphanumeric + hyphen + slash only
- Hash dla deduplikacji: prevent re-generation abuse
- Trim whitespace z source_text przed hashing

### 6.6 AI Response Validation
- **Nigdy nie ufaj AI output bezpośrednio**
- Validate JSON parsing (try/catch)
- Validate structure: array of objects with front/back
- Validate lengths: front ≤200, back ≤500
- Sanitize HTML/script tags (jeśli applicable)
- Limit suggestions count (np. max 20 fiszek)

### 6.7 Error Information Leakage
- Don't expose OpenRouter API errors bezpośrednio do user
- Mapuj AI errors na generic messages: "AI service temporarily unavailable"
- Log szczegóły do `generation_error_logs` dla debugging
- Nie loguj API keys lub sensitive data

## 7. Obsługa błędów

### 7.1 Kody błędów i scenariusze

| Kod | Scenariusz | Przykładowy komunikat | Action |
|-----|-----------|----------------------|--------|
| 400 | Source text too short/long | `validation_error: source_text must be between 1000 and 10000 characters` | User fix |
| 400 | Invalid model | `validation_error: model not supported` | User fix |
| 400 | Deck doesn't exist | `invalid_deck: Deck not found or access denied` | User fix |
| 400 | Empty flashcards array (accept) | `validation_error: flashcards array cannot be empty` | User fix |
| 401 | Missing/invalid session | `unauthorized: Authentication required` | Re-auth |
| 404 | Generation not found (accept) | `not_found: Generation not found` | Check ID |
| 429 | Rate limit exceeded | `rate_limit_exceeded: Maximum 10 generations per hour. Try again in 23 minutes.` | Wait |
| 502 | OpenRouter API bad response | `ai_service_error: Failed to generate flashcards. Please try again.` | Retry |
| 503 | OpenRouter API timeout | `ai_service_timeout: Generation took too long. Please try with shorter text.` | Retry shorter |
| 500 | Database error | `database_error: An unexpected error occurred` | Report |
| 500 | Transaction failure (accept) | `transaction_error: Failed to save flashcards` | Retry |

### 7.2 OpenRouter Specific Errors
Mapowanie OpenRouter error codes:
- `insufficient_credits` → 402 Payment Required (jeśli exposed) lub 503
- `invalid_request_error` → 400 Bad Request
- `rate_limit_error` (OpenRouter side) → 503 Service Unavailable
- `api_error` → 502 Bad Gateway
- `timeout` → 503 Service Unavailable

### 7.3 Logowanie błędów do generation_error_logs
**Tabela `generation_error_logs` jest DEDYKOWANA dla AI errors**:
```typescript
interface ErrorLogEntry {
  user_id: string;
  model: string;
  source_text_hash: string;
  source_text_length: number;
  error_code: string; // 'timeout', 'invalid_response', 'api_error', etc.
  error_message: string; // detailed error for debugging
  created_at: timestamp;
}
```

Kiedy logować:
- OpenRouter API failures (wszystkie)
- Timeouts
- Invalid AI responses (malformed JSON, validation failures)
- Rate limits (OpenRouter side, nie user side)

Nie logować:
- User validation errors (400)
- Auth errors (401)
- User rate limits (429) – to expected behavior

### 7.4 Struktura odpowiedzi błędu
```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Maximum 10 generations per hour. Try again in 23 minutes.",
    "details": {
      "limit": 10,
      "current_count": 10,
      "reset_at": "2025-11-16T15:30:00Z"
    }
  }
}
```

## 8. Rozważania dotyczące wydajności

### 8.1 Indeksy wykorzystywane
- `idx_generations_user_id`: (user_id) – filtrowanie per user
- `idx_generations_deck_id`: (deck_id) – filtrowanie per deck
- `idx_generations_created_at`: (user_id, created_at DESC) – sortowanie + rate limit queries
- `idx_generations_hash`: (source_text_hash) – deduplikacja lookup

### 8.2 OpenRouter API Performance
- **Czas generacji**: 10-30 sekund typowo (zależy od modelu)
- Timeout: 60s (po przekroczeniu zwróć 503)
- User experience: loading state w UI, WebSocket updates (przyszłość)
- Modele szybsze (cheaper): preferuj dla MVP (np. gpt-4o-mini, claude-haiku)

### 8.3 Rate Limit Check Optimization
- Current approach: query DB dla count w last hour
  ```sql
  SELECT COUNT(*) FROM generations 
  WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'
  ```
- Optymalizacja: cache w Redis z TTL
- Alternatywa: sliding window counter (więcej precyzji)
- Index `idx_generations_created_at` wspiera tę query

### 8.4 Transaction Performance (accept)
- Bulk insert flashcards: używaj `insertMany` zamiast loop
- Update generation stats: single query
- Transaction overhead: minimal dla <20 fiszek
- Monitoruj dla large batches (unlikely w praktyce)

### 8.5 Hash Calculation
- SHA-256 hashing: fast dla tekstów 1-10k chars (<1ms)
- Optional deduplikacja: query `idx_generations_hash` przed AI call
- Trade-off: zapobieganie duplikatom vs dodatkowe query
- Implementacja: check hash + created_at > 24h ago

### 8.6 Potential Bottlenecks
- **OpenRouter API**: główne wąskie gardło (10-30s)
  - Mitigation: user feedback (progress indicators), async processing (przyszłość)
- **Rate limit queries**: mogą być wolne dla active users
  - Mitigation: cache w Redis, sliding window
- **Accept transaction**: bulk inserts mogą być wolne dla >50 fiszek
  - Mitigation: batch size limit, optimized inserts

### 8.7 Strategie cache
- Rate limit info: cache w Redis (TTL 5 min)
- Model whitelist: cache w memory (static config)
- Generation metadata: brak cache (read-heavy nie expected)

### 8.8 Cost Optimization
- Wybór modeli: cheaper models dla MVP (gpt-4o-mini ~$0.15/1M tokens)
- Source text limits: 10k chars ≈ 2500 tokens input
- Expected output: 10 fiszek ≈ 500 tokens
- Cost per generation: ~$0.001-0.005 (zależnie od modelu)
- Monitor usage przez OpenRouter dashboard

## 9. Etapy wdrożenia

### Krok 1: Przygotowanie environment i konfiguracji
1. Dodaj zmienne środowiskowe do `.env`:
   ```
   OPENROUTER_API_KEY=sk-or-...
   OPENROUTER_APP_URL=https://10xcards.app
   OPENROUTER_APP_NAME=10xCards
   ```
2. Utwórz config file `src/lib/config/ai.config.ts`:
   - Whitelist dozwolonych modeli z metadanymi (nazwa, cena, timeout)
   - Default model dla UI
   - Rate limit constants (10/hour)
3. Dokumentuj wymagane env vars w README

### Krok 2: Implementacja walidacji i typów
1. Utwórz `src/lib/validation/generations.ts`:
   - `GenerationListQuerySchema` (Zod)
   - `GenerateFlashcardsSchema` (source_text 1000-10000, model enum, deck_id)
   - `AcceptGenerationSchema` (flashcards array, każdy item z front/back/edited)
   - `OpenRouterModelSchema` (whitelist z config)
2. Dodaj helper functions:
   - `hashSourceText(text: string): string` – SHA-256
   - `validateAISuggestions(suggestions: unknown): GenerationSuggestionDto[]`

### Krok 3: Implementacja OpenRouterService
1. Utwórz `src/lib/services/ai/openrouter.service.ts`:
   - `generateFlashcards(sourceText: string, model: string): Promise<GenerationSuggestionDto[]>`
   - Implementacja:
     - Buduj structured prompt (JSON format instructions)
     - POST do `https://openrouter.ai/api/v1/chat/completions`
     - Headers: Authorization, HTTP-Referer, X-Title
     - Timeout handling (60s)
     - Response parsing i validacja
     - Error handling z mapowaniem na custom errors
   - Custom errors:
     - `class OpenRouterTimeoutError extends Error`
     - `class OpenRouterAPIError extends Error`
     - `class InvalidAIResponseError extends Error`

2. Utwórz `src/lib/prompts/flashcard-generation.ts`:
   - `buildFlashcardPrompt(sourceText: string): string`
   - Structured prompt z przykładami, format instructions
   - Encourage JSON output: `[{"front": "...", "back": "..."}]`

### Krok 4: Implementacja RateLimitService
1. Utwórz `src/lib/services/rate-limit/rate-limit.service.ts`:
   - `checkGenerationLimit(supabase, userId): Promise<{allowed: boolean, remaining: number, resetAt: Date}>`
   - Implementacja:
     - Query: `COUNT(*) WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`
     - Compare z limitem (10)
     - Calculate resetAt (earliest created_at + 1h)
   - Optional: Redis cache implementation dla skalowalności

### Krok 5: Implementacja GenerationService
1. Utwórz `src/lib/services/generations/generation.service.ts`:
   - `listGenerations(supabase, userId, filters): Promise<{data: GenerationSummaryDto[], count: number}>`
   - `getGeneration(supabase, userId, id): Promise<GenerationDetailDto | null>`
   - `createGeneration(supabase, data): Promise<{id: string, created_at: string}>`
   - `acceptGeneration(supabase, generation_id, deck_id, flashcards): Promise<FlashcardRow[]>`
     - **Transaction implementation**:
       - Begin transaction
       - Bulk insert flashcards z source determination
       - Update generation stats (accepted_unedited_count, accepted_edited_count)
       - Commit
       - Return created flashcards
   - `logGenerationError(supabase, errorData): Promise<void>`
     - Insert do `generation_error_logs`

### Krok 6: Implementacja endpointów Astro
1. `src/pages/api/v1/generations/index.ts`:
   - `export const prerender = false`
   - Handler GET:
     - Parsuj query, waliduj
     - Pobierz userId z session
     - Wywołaj `listGenerations`
     - Zwróć 200 z pagination

2. `src/pages/api/v1/generations/[id].ts`:
   - Handler GET:
     - Parsuj id
     - Wywołaj `getGeneration`
     - 404 jeśli null, 200 jeśli found

3. `src/pages/api/v1/generations/generate.ts`:
   - Handler POST:
     - Parsuj body, waliduj (source_text, model, deck_id)
     - Check rate limit → 429 jeśli exceeded
     - Verify deck ownership → 400 jeśli false
     - Hash source text
     - Start timer
     - Wywołaj `OpenRouterService.generateFlashcards`
     - Stop timer
     - Wywołaj `GenerationService.createGeneration`
     - Zwróć 201 z suggestions + metadata
     - Error handling:
       - OpenRouter errors → log + return 502/503
       - Timeout → log + return 503
       - Validation → return 400

4. `src/pages/api/v1/generations/[id]/accept.ts`:
   - Handler POST:
     - Parsuj id + body, waliduj
     - Verify generation ownership → 404 jeśli not found
     - Wywołaj `GenerationService.acceptGeneration` (transaction)
     - Zwróć 201 z created flashcards
     - Error handling:
       - Transaction failure → rollback + 500
       - Validation → 400

### Krok 7: Error handling i logging utilities
1. W `src/lib/utils/errors.ts`:
   - `handleOpenRouterError(error): ErrorResponse` – mapuje AI errors
   - `formatRateLimitError(resetAt): ErrorResponse`
2. W każdym handlerze:
   - Wrap w try/catch
   - Catch specific errors (OpenRouterTimeoutError, etc.)
   - Log 500 errors do console/structured logger
   - Log AI failures do `generation_error_logs`

### Krok 8: Testy jednostkowe
1. `openrouter.service.test.ts`:
   - Mock fetch dla OpenRouter API
   - Testuj generateFlashcards:
     - Success case (valid response)
     - Timeout (throw after 60s)
     - API error (4xx, 5xx)
     - Invalid JSON response
     - Malformed suggestions (validation failure)
   - Verify prompt construction
   - Verify error handling

2. `rate-limit.service.test.ts`:
   - Mock Supabase queries
   - Testuj checkGenerationLimit:
     - Under limit (9/10) → allowed
     - At limit (10/10) → not allowed
     - Calculate correct resetAt

3. `generation.service.test.ts`:
   - Mock Supabase
   - Testuj listGenerations (filters, pagination)
   - Testuj createGeneration
   - Testuj acceptGeneration (transaction):
     - Success case (bulk insert + update stats)
     - Count unedited vs edited correctly
     - Rollback on failure

### Krok 9: Testy integracyjne
1. Setup: seed użytkowników, decks
2. Test full flow:
   - POST /generate z valid source_text → 201 z suggestions
   - POST /generate 11 razy → 429 on 11th (rate limit)
   - POST /accept z suggestions → 201, fiszki utworzone
   - GET /generations → lista zawiera nową generację
   - Verify stats (accepted_unedited_count, accepted_edited_count)
3. Test error scenarios:
   - Invalid source_text (too short/long) → 400
   - Invalid model → 400
   - Non-existent deck → 400
   - Accept non-existent generation → 404
4. Mock OpenRouter API dla stabilnych testów:
   - Używaj VCR/nock dla record/replay responses
   - Test timeout handling (mock delay)

### Krok 10: Testy AI response validation
1. Utwórz fixtures z różnymi AI responses:
   - Valid: array of objects with front/back
   - Invalid JSON
   - Missing fields
   - Wrong types
   - Empty array
   - Too long front/back
2. Testuj `validateAISuggestions` function
3. Verify rejection invalid responses (throw errors)

### Krok 11: Testy wydajnościowe (opcjonalnie)
1. Mock OpenRouter z realistic delays (10-30s)
2. Test concurrent generation requests (5 users simultaneously)
3. Test accept z large flashcard arrays (50+ items)
4. Measure transaction times
5. Verify rate limit queries are fast (<100ms)

### Krok 12: Security testing
1. Verify API key nie jest exposed:
   - Check network requests w browser DevTools
   - Grep codebase dla accidental leaks
2. Test rate limiting:
   - Verify 10/hour enforcement
   - Test multiple users independently
3. Test model whitelist:
   - Attempt arbitrary model string → rejected
4. Test generation ownership:
   - User A nie może accept generations user B

### Krok 13: OpenRouter integration testing (manual)
1. Uzyskaj test API key z OpenRouter
2. Test z real API:
   - Różne modele (gpt-4o-mini, claude-haiku)
   - Różne source texts (1000, 5000, 10000 chars)
   - Verify response quality
   - Measure actual latency
3. Monitor costs w OpenRouter dashboard
4. Verify error handling dla real failures

### Krok 14: Dokumentacja i przykłady
1. Aktualizuj `.ai/generations-implementation-plan.md` (ten plik)
2. Utwórz przykłady zapytań:
   ```bash
   # Generate
   curl -X POST -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "source_text": "...(1000+ chars)...",
       "model": "openai/gpt-4o-mini",
       "deck_id": "123"
     }' \
     http://localhost:4321/api/v1/generations/generate
   
   # Accept
   curl -X POST -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "flashcards": [
         {"front": "Q1", "back": "A1", "edited": false},
         {"front": "Q2 edited", "back": "A2", "edited": true}
       ]
     }' \
     http://localhost:4321/api/v1/generations/456/accept
   
   # List
   curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:4321/api/v1/generations?deck_id=123&page=1"
   ```
3. Dokumentuj:
   - Supported models i ich charakterystyki
   - Rate limits i best practices
   - Expected latencies
   - Error codes i troubleshooting
   - Cost estimates

### Krok 15: Monitoring i alerting setup
1. Implementuj metryki:
   - Generation success/failure rate
   - Average generation duration
   - Rate limit hit rate
   - OpenRouter API error rate
   - Cost per generation
2. Dashboard z kluczowymi metrykami
3. Alerty:
   - Error rate > 10%
   - Average duration > 45s
   - Daily cost > threshold

### Krok 16: Deployment
1. Deploy do staging:
   - Verify env vars set correctly
   - Test with staging OpenRouter key
2. Smoke tests na staging
3. Load testing (opcjonalnie)
4. Deploy do production:
   - Switch to production OpenRouter key
   - Set rate limits w production
   - Monitor closely first 24h
5. Post-deployment verification

---

## 10. Uwagi dodatkowe

### 10.1 Prompt Engineering
- **Kluczowe dla quality**: dobrze napisany prompt = lepsze fiszki
- Struktura prompta:
  - Role: "You are an expert educator creating flashcards..."
  - Format instructions: "Output JSON array: [{front, back}]"
  - Constraints: "Create 8-12 flashcards", "Front: max 200 chars", "Back: max 500 chars"
  - Examples: Podaj 2-3 przykłady dobrych fiszek
  - Source text: "${sourceText}"
- Iteruj prompt based on user feedback

### 10.2 Deduplikacja
- SHA-256 hash source_text dla identyfikacji duplikatów
- Optional check: jeśli hash exists w last 24h, return existing generation
- Trade-off: zapobiega waste vs user może chcieć re-generate z innym modelem
- Implementacja: query `idx_generations_hash` przed AI call
- UI hint: "You generated flashcards from similar text recently. View previous?"

### 10.3 Sugestie NIE są przechowywane
- **Design decision**: oszczędność storage, privacy, cost
- Konsekwencje:
  - User musi zaakceptować od razu lub stracić sugestie
  - Nie można "wrócić" do starych sugestii
  - Frontend musi cache suggestions w session storage
- Przyszłość: opcjonalnie store w encrypted format z TTL

### 10.4 Model Selection Strategy
- **Dla MVP**: single recommended model (np. gpt-4o-mini)
- **Przyszłość**: user choice z trade-offs (speed vs quality vs cost)
- Modele do rozważenia:
  - Fast & cheap: gpt-4o-mini, claude-3-haiku, gemini-flash-1.5
  - High quality: gpt-4, claude-3-opus (expensive)
- A/B testing different models dla quality comparison

### 10.5 Async Processing (Future Enhancement)
- Current: synchronous (user waits 10-30s)
- Future: async job queue
  - POST /generate returns job_id immediately
  - WebSocket/SSE dla progress updates
  - GET /jobs/:job_id dla polling
  - Notification gdy gotowe
- Benefits: better UX, can handle longer generations, retry logic

### 10.6 Quality Feedback Loop
- Collect user feedback na quality sugestii:
  - Accept rate (ile z X sugestii zaakceptowano)
  - Edit rate (ile było edited)
- Use feedback dla:
  - Prompt improvement
  - Model selection
  - Analytics dashboard
- Stats already tracked: accepted_unedited_count, accepted_edited_count

### 10.7 Cost Management
- Monitor daily/monthly costs w OpenRouter dashboard
- Set budget alerts
- Consider capping per-user generations (już mamy 10/hour)
- Freemium model: free tier (10/hour), paid tier (unlimited)
- Estimate: 1000 users, 5 gens/day/user → ~$75-150/month (zależy od modelu)

### 10.8 Error Recovery
- User-facing errors: provide actionable guidance
  - Rate limit: "Try again in X minutes"
  - Timeout: "Try with shorter text"
  - API error: "Try again later"
- Automatic retries: dla transient OpenRouter errors (optional)
- Idempotency: generacje nie są idempotent (każde call = nowe suggestions), ale accept jest (same generation_id + flashcards)

---

**Priorytet implementacji**: 
1. Kroki 1-7 (core functionality, critical)
2. Kroki 8-10 (testing, high priority)
3. Kroki 11-16 (optimization, monitoring, medium priority)

**Szacowany czas**: 
- Core implementation: 5-7 dni (OpenRouter integration, services, endpoints)
- Testing: 2-3 dni (unit + integration + manual OpenRouter testing)
- Monitoring & deployment: 1-2 dni
- **Total: 8-12 dni** dla doświadczonego developera

**Zależności**:
- OpenRouter API key (uzyskaj przed rozpoczęciem)
- DeckService.verifyDeckOwnership (może być parallel track)
- Environment setup (env vars)

**Ryzyka**:
- OpenRouter API latency/reliability (mitigation: timeout handling, retries)
- Cost overruns (mitigation: rate limiting, monitoring, budget alerts)
- AI quality variance (mitigation: prompt engineering, model selection)
- Complex transaction logic (mitigation: thorough testing, rollback handling)

