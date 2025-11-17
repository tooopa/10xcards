# REST API Plan v1.2

## 1. Overview

This REST API plan provides a comprehensive backend architecture for the 10x-cards MVP, implementing flashcard management with AI generation capabilities. The API is built on Supabase (PostgreSQL + Auth) with OpenRouter.ai for AI features.

**Version**: 1.2  
**API Base URL**: `/api/v1`  
**Authentication**: JWT Bearer tokens (Supabase Auth)  
**Content-Type**: `application/json`

## 2. Resources

- **Auth**: User registration, login, logout, and account management via Supabase Auth.
- **Decks**: User flashcard decks, including default "Uncategorized" deck and deck deletion with flashcard migration.
- **Flashcards**: Individual flashcards with manual/AI creation, editing, and tagging.
- **Tags**: Global and deck-scoped tags for categorizing flashcards.
- **Generations**: AI flashcard generation, including generation requests, acceptance, and history.

## 3. API Endpoints

### 3.1 Authentication (Supabase Auth)

These endpoints are handled by Supabase Auth directly, not custom API endpoints.

- **POST /auth/v1/signup**
  - **Description**: Register a new user (Supabase native endpoint).
  - **Request Body**:
    ```json
    {
      "email": "string (valid email, required)",
      "password": "string (min 6 chars, required)"
    }
    ```
  - **Response Body** (201 Created):
    ```json
    {
      "user": {
        "id": "uuid",
        "email": "string",
        "created_at": "timestamp"
      },
      "session": {
        "access_token": "string",
        "refresh_token": "string",
        "expires_in": "integer"
      }
    }
    ```
  - **Business Logic**: Database trigger automatically creates default "Uncategorized" deck.
  - **Error Codes**: 400 Bad Request (invalid email/weak password), 422 Unprocessable Entity (email already exists)

- **POST /auth/v1/token?grant_type=password**
  - **Description**: Login existing user (Supabase native endpoint).
  - **Request Body**:
    ```json
    {
      "email": "string (required)",
      "password": "string (required)"
    }
    ```
  - **Response Body** (200 OK):
    ```json
    {
      "access_token": "string",
      "refresh_token": "string",
      "expires_in": "integer",
      "user": {
        "id": "uuid",
        "email": "string"
      }
    }
    ```
  - **Error Codes**: 400 Bad Request (invalid credentials)

- **POST /auth/v1/logout**
  - **Description**: Logout user (Supabase native endpoint).
  - **Request Headers**: `Authorization: Bearer {access_token}`
  - **Response Body**: 204 No Content
  - **Error Codes**: 401 Unauthorized

- **DELETE /api/v1/user**
  - **Description**: Delete user account (custom endpoint with cascade deletion).
  - **Request Headers**: `Authorization: Bearer {access_token}`
  - **Response Body**: 204 No Content
  - **Business Logic**: Cascades to delete all user's decks, flashcards, tags, generations via RLS.
  - **Error Codes**: 401 Unauthorized

### 3.2 Decks

- **GET /api/v1/decks**
  - **Description**: Retrieve list of user's decks (excluding soft-deleted).
  - **Query Parameters**: 
    - `sort` (created_at, updated_at, name) - default: created_at
    - `order` (asc, desc) - default: desc
    - `search` (string) - full-text search on name/description
    - `page` (integer, min 1) - default: 1
    - `limit` (integer, min 1, max 100) - default: 20
  - **Request Headers**: `Authorization: Bearer {access_token}`
  - **Response Body** (200 OK):
    ```json
    {
      "data": [
        {
          "id": "string",
          "name": "string",
          "description": "string|null",
          "visibility": "private",
          "is_default": "boolean",
          "flashcard_count": "integer",
          "created_at": "ISO8601 timestamp",
          "updated_at": "ISO8601 timestamp"
        }
      ],
      "pagination": {
        "page": "integer",
        "limit": "integer",
        "total": "integer",
        "total_pages": "integer"
      }
    }
    ```
  - **Error Codes**: 401 Unauthorized, 400 Bad Request (invalid query params)

- **GET /api/v1/decks/default**
  - **Description**: Retrieve user's default "Uncategorized" deck.
  - **Request Headers**: `Authorization: Bearer {access_token}`
  - **Response Body** (200 OK):
    ```json
    {
      "id": "string",
      "name": "Uncategorized",
      "description": "string|null",
      "visibility": "private",
      "is_default": true,
      "flashcard_count": "integer",
      "created_at": "ISO8601 timestamp",
      "updated_at": "ISO8601 timestamp"
    }
    ```
  - **Error Codes**: 401 Unauthorized, 404 Not Found (should never happen if trigger works)

- **GET /api/v1/decks/:id**
  - **Description**: Retrieve details of a specific deck.
  - **Request Headers**: `Authorization: Bearer {access_token}`
  - **Response Body** (200 OK):
    ```json
    {
      "id": "string",
      "name": "string",
      "description": "string|null",
      "visibility": "private",
      "is_default": "boolean",
      "flashcard_count": "integer",
      "created_at": "ISO8601 timestamp",
      "updated_at": "ISO8601 timestamp"
    }
    ```
  - **Error Codes**: 401 Unauthorized, 404 Not Found

- **POST /api/v1/decks**
  - **Description**: Create a new deck.
  - **Request Headers**: `Authorization: Bearer {access_token}`
  - **Request Body**:
    ```json
    {
      "name": "string (1-100 chars, required)",
      "description": "string (optional, max 5000 chars)"
    }
    ```
  - **Response Body** (201 Created):
    ```json
    {
      "id": "string",
      "name": "string",
      "description": "string|null",
      "visibility": "private",
      "is_default": false,
      "flashcard_count": 0,
      "created_at": "ISO8601 timestamp",
      "updated_at": "ISO8601 timestamp"
    }
    ```
  - **Validation**:
    - Name must be unique per user (enforced by DB constraint)
    - is_default automatically set to false (RLS prevents manual true)
  - **Error Codes**: 
    - 400 Bad Request (validation errors)
    - 401 Unauthorized
    - 409 Conflict (duplicate deck name)

- **PATCH /api/v1/decks/:id**
  - **Description**: Update a deck (name and/or description only).
  - **Request Headers**: `Authorization: Bearer {access_token}`
  - **Request Body**:
    ```json
    {
      "name": "string (1-100 chars, optional)",
      "description": "string (optional, max 5000 chars, nullable)"
    }
    ```
  - **Response Body** (200 OK):
    ```json
    {
      "id": "string",
      "name": "string",
      "description": "string|null",
      "visibility": "private",
      "is_default": "boolean",
      "flashcard_count": "integer",
      "created_at": "ISO8601 timestamp",
      "updated_at": "ISO8601 timestamp"
    }
    ```
  - **Business Logic**:
    - Cannot change is_default (enforced by RLS)
    - Cannot rename default deck to non-"Uncategorized" (enforced by DB constraint)
    - updated_at automatically updated by trigger
  - **Error Codes**: 
    - 400 Bad Request (validation errors, attempting to rename default deck)
    - 401 Unauthorized
    - 404 Not Found
    - 409 Conflict (duplicate deck name)

- **DELETE /api/v1/decks/:id**
  - **Description**: Delete deck with automatic flashcard migration to default deck.
  - **Request Headers**: `Authorization: Bearer {access_token}`
  - **Response Body** (200 OK):
    ```json
    {
      "message": "Deck deleted successfully",
      "migrated_flashcards_count": "integer",
      "migration_tag": {
        "id": "string",
        "name": "string (format: #deleted-from-{deck_name})"
      }
    }
    ```
  - **Business Logic** (Transaction):
    1. Verify deck exists and belongs to user (via RLS)
    2. Verify deck is not default (is_default=false)
    3. Get user's default deck ID
    4. Count flashcards to migrate
    5. Create tag `#deleted-from-{deck_name}` (scope='deck', assigned to default deck)
    6. Update all flashcards: set deck_id to default deck
    7. Add migration tag to all migrated flashcards
    8. Soft-delete deck (set deleted_at)
    9. Commit transaction
  - **Error Codes**: 
    - 400 Bad Request (attempting to delete default deck)
    - 401 Unauthorized
    - 404 Not Found
    - 500 Internal Server Error (transaction failure)

### 3.3 Flashcards

- **GET /api/v1/flashcards**
  - **Description**: Retrieve list of user's flashcards with filtering and search.
  - **Query Parameters**: 
    - `deck_id` (string) - filter by deck
    - `source` (manual, ai-full, ai-edited) - filter by source
    - `tag_id` (string) - filter by tag (supports single tag only in MVP)
    - `search` (string) - full-text search on front/back
    - `sort` (created_at, updated_at) - default: created_at
    - `order` (asc, desc) - default: desc
    - `page` (integer, min 1) - default: 1
    - `limit` (integer, min 1, max 100) - default: 20
  - **Request Headers**: `Authorization: Bearer {access_token}`
  - **Response Body** (200 OK):
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
          "created_at": "ISO8601 timestamp",
          "updated_at": "ISO8601 timestamp",
          "tags": [
            {
              "id": "string",
              "name": "string",
              "scope": "global|deck"
            }
          ]
        }
      ],
      "pagination": {
        "page": "integer",
        "limit": "integer",
        "total": "integer",
        "total_pages": "integer"
      }
    }
    ```
  - **Business Logic**:
    - All filters applied as AND conditions
    - Excludes soft-deleted flashcards (deleted_at IS NULL)
    - Full-text search uses tsv column with GIN index
  - **Error Codes**: 401 Unauthorized, 400 Bad Request (invalid parameters)

- **GET /api/v1/flashcards/:id**
  - **Description**: Retrieve details of a specific flashcard.
  - **Request Headers**: `Authorization: Bearer {access_token}`
  - **Response Body** (200 OK):
    ```json
    {
      "id": "string",
      "deck_id": "string",
      "front": "string",
      "back": "string",
      "source": "manual|ai-full|ai-edited",
      "generation_id": "string|null",
      "created_at": "ISO8601 timestamp",
      "updated_at": "ISO8601 timestamp",
      "tags": [
        {
          "id": "string",
          "name": "string",
          "scope": "global|deck",
          "deck_id": "string|null"
        }
      ]
    }
    ```
  - **Error Codes**: 401 Unauthorized, 404 Not Found

- **POST /api/v1/flashcards**
  - **Description**: Create a new flashcard manually.
  - **Request Headers**: `Authorization: Bearer {access_token}`
  - **Request Body**:
    ```json
    {
      "deck_id": "string (required)",
      "front": "string (1-200 chars, required)",
      "back": "string (1-500 chars, required)"
    }
    ```
  - **Response Body** (201 Created):
    ```json
    {
      "id": "string",
      "deck_id": "string",
      "front": "string",
      "back": "string",
      "source": "manual",
      "generation_id": null,
      "created_at": "ISO8601 timestamp",
      "updated_at": "ISO8601 timestamp"
    }
    ```
  - **Business Logic**:
    - source automatically set to "manual"
    - Verify deck_id exists and belongs to user
  - **Error Codes**: 
    - 400 Bad Request (validation errors, deck doesn't exist)
    - 401 Unauthorized

- **PATCH /api/v1/flashcards/:id**
  - **Description**: Update a flashcard (changes source to 'ai-edited' if applicable).
  - **Request Headers**: `Authorization: Bearer {access_token}`
  - **Request Body**:
    ```json
    {
      "deck_id": "string (optional)",
      "front": "string (1-200 chars, optional)",
      "back": "string (1-500 chars, optional)"
    }
    ```
  - **Response Body** (200 OK):
    ```json
    {
      "id": "string",
      "deck_id": "string",
      "front": "string",
      "back": "string",
      "source": "manual|ai-full|ai-edited",
      "generation_id": "string|null",
      "created_at": "ISO8601 timestamp",
      "updated_at": "ISO8601 timestamp"
    }
    ```
  - **Business Logic**:
    - If source='ai-full' and (front OR back) is edited → change source to 'ai-edited'
    - If source='manual' or 'ai-edited' → source remains unchanged
    - Verify deck_id exists and belongs to user if provided
    - updated_at automatically updated by trigger
  - **Error Codes**: 
    - 400 Bad Request (validation errors, deck doesn't exist)
    - 401 Unauthorized
    - 404 Not Found

- **DELETE /api/v1/flashcards/:id**
  - **Description**: Soft-delete a flashcard.
  - **Request Headers**: `Authorization: Bearer {access_token}`
  - **Response Body**: 204 No Content
  - **Business Logic**: Sets deleted_at to current timestamp
  - **Error Codes**: 401 Unauthorized, 404 Not Found

- **PUT /api/v1/flashcards/:id/tags**
  - **Description**: Replace all tags on a flashcard.
  - **Request Headers**: `Authorization: Bearer {access_token}`
  - **Request Body**:
    ```json
    {
      "tag_ids": ["string"]
    }
    ```
  - **Response Body** (200 OK):
    ```json
    {
      "flashcard_id": "string",
      "tags": [
        {
          "id": "string",
          "name": "string",
          "scope": "global|deck"
        }
      ]
    }
    ```
  - **Business Logic** (Transaction):
    1. Verify flashcard belongs to user
    2. Verify all tag_ids exist and are accessible (global or user's deck tags)
    3. Delete existing flashcard_tags entries
    4. Insert new flashcard_tags entries
  - **Error Codes**: 
    - 400 Bad Request (invalid tag_ids)
    - 401 Unauthorized
    - 404 Not Found (flashcard or tag)

- **POST /api/v1/flashcards/:id/tags**
  - **Description**: Add tags to a flashcard (does not remove existing).
  - **Request Headers**: `Authorization: Bearer {access_token}`
  - **Request Body**:
    ```json
    {
      "tag_ids": ["string"]
    }
    ```
  - **Response Body** (200 OK):
    ```json
    {
      "flashcard_id": "string",
      "tags": [
        {
          "id": "string",
          "name": "string",
          "scope": "global|deck"
        }
      ]
    }
    ```

  - **Business Logic**:
    - Inserts only new tag associations (ignores duplicates via ON CONFLICT)
    - Returns all tags after addition
  - **Error Codes**: 
    - 400 Bad Request (invalid tag_ids)
    - 401 Unauthorized
    - 404 Not Found

- **DELETE /api/v1/flashcards/:id/tags/:tag_id**
  - **Description**: Remove a specific tag from a flashcard.
  - **Request Headers**: `Authorization: Bearer {access_token}`
  - **Response Body**: 204 No Content
  - **Error Codes**: 401 Unauthorized, 404 Not Found

### 3.4 Tags

- **GET /api/v1/tags**
  - **Description**: Retrieve list of available tags (global + user's deck tags).
  - **Query Parameters**: 
    - `scope` (global, deck) - filter by scope
    - `deck_id` (string) - filter by deck (only for deck-scoped tags)
    - `search` (string) - search by name (partial match)
  - **Request Headers**: `Authorization: Bearer {access_token}`
  - **Response Body** (200 OK):
    ```json
    {
      "data": [
        {
          "id": "string",
          "name": "string",
          "scope": "global|deck",
          "deck_id": "string|null",
          "usage_count": "integer",
          "created_at": "ISO8601 timestamp"
        }
      ]
    }
    ```
  - **Business Logic**:
    - usage_count: COUNT of flashcard_tags entries (via LEFT JOIN)
    - Returns global tags + user's deck-scoped tags (enforced by RLS)
  - **Error Codes**: 401 Unauthorized

- **POST /api/v1/tags**
  - **Description**: Create a new deck-scoped tag.
  - **Request Headers**: `Authorization: Bearer {access_token}`
  - **Request Body**:
    ```json
    {
      "name": "string (1-50 chars, required)",
      "deck_id": "string (required)"
    }
    ```
  - **Response Body** (201 Created):
    ```json
    {
      "id": "string",
      "name": "string",
      "scope": "deck",
      "deck_id": "string",
      "created_at": "ISO8601 timestamp"
    }
    ```
  - **Business Logic**:
    - scope automatically set to "deck"
    - user_id automatically set to auth.uid()
    - Verify deck_id exists and belongs to user
    - Name must be unique within deck (enforced by DB unique index)
  - **Error Codes**: 
    - 400 Bad Request (validation errors, deck doesn't exist)
    - 401 Unauthorized
    - 409 Conflict (duplicate tag name in deck)

- **PATCH /api/v1/tags/:id**
  - **Description**: Update a deck-scoped tag name.
  - **Request Headers**: `Authorization: Bearer {access_token}`
  - **Request Body**:
    ```json
    {
      "name": "string (1-50 chars, required)"
    }
    ```
  - **Response Body** (200 OK):
    ```json
    {
      "id": "string",
      "name": "string",
      "scope": "deck",
      "deck_id": "string",
      "created_at": "ISO8601 timestamp"
    }
    ```
  - **Business Logic**:
    - Only deck-scoped tags can be updated (RLS enforces)
    - Name must remain unique within deck
  - **Error Codes**: 
    - 400 Bad Request (validation errors)
    - 401 Unauthorized
    - 404 Not Found (tag doesn't exist or is global)
    - 409 Conflict (duplicate tag name)

- **DELETE /api/v1/tags/:id**
  - **Description**: Delete a deck-scoped tag (cascades to flashcard_tags).
  - **Request Headers**: `Authorization: Bearer {access_token}`
  - **Response Body**: 204 No Content
  - **Business Logic**:
    - Only deck-scoped tags can be deleted (RLS enforces)
    - Cascade deletes all flashcard_tags entries
  - **Error Codes**: 
    - 401 Unauthorized
    - 404 Not Found (tag doesn't exist or is global)

### 3.5 Generations

- **GET /api/v1/generations**
  - **Description**: Retrieve user's generation history.
  - **Query Parameters**: 
    - `deck_id` (string) - filter by target deck
    - `sort` (created_at) - default: created_at
    - `order` (asc, desc) - default: desc
    - `page` (integer, min 1) - default: 1
    - `limit` (integer, min 1, max 100) - default: 20
  - **Request Headers**: `Authorization: Bearer {access_token}`
  - **Response Body** (200 OK):
    ```json
    {
      "data": [
        {
          "id": "string",
          "deck_id": "string",
          "model": "string",
          "generated_count": "integer",
          "accepted_unedited_count": "integer",
          "accepted_edited_count": "integer",
          "source_text_length": "integer",
          "generation_duration_ms": "integer",
          "created_at": "ISO8601 timestamp",
          "updated_at": "ISO8601 timestamp"
        }
      ],
      "pagination": {
        "page": "integer",
        "limit": "integer",
        "total": "integer",
        "total_pages": "integer"
      }
    }
    ```
  - **Error Codes**: 401 Unauthorized

- **GET /api/v1/generations/:id**
  - **Description**: Retrieve details of a specific generation (without suggestions).
  - **Request Headers**: `Authorization: Bearer {access_token}`
  - **Response Body** (200 OK):
    ```json
    {
      "id": "string",
      "deck_id": "string",
      "model": "string",
      "generated_count": "integer",
      "accepted_unedited_count": "integer",
      "accepted_edited_count": "integer",
      "source_text_length": "integer",
      "generation_duration_ms": "integer",
      "created_at": "ISO8601 timestamp",
      "updated_at": "ISO8601 timestamp"
    }
    ```
  - **Note**: Suggestions are NOT stored in database, only returned from /generate endpoint.
  - **Error Codes**: 401 Unauthorized, 404 Not Found

- **POST /api/v1/generations/generate**
  - **Description**: Generate flashcards from source text using AI.
  - **Request Headers**: `Authorization: Bearer {access_token}`
  - **Request Body**:
    ```json
    {
      "source_text": "string (1000-10000 chars, required)",
      "model": "string (required, valid OpenRouter model ID)",
      "deck_id": "string (required)"
    }
    ```
  - **Response Body** (201 Created):
    ```json
    {
      "generation_id": "string",
      "model": "string",
      "generated_count": "integer",
      "source_text_length": "integer",
      "generation_duration_ms": "integer",
      "suggestions": [
        {
          "front": "string",
          "back": "string"
        }
      ],
      "created_at": "ISO8601 timestamp"
    }
    ```
  - **Business Logic** (Transaction):
    1. Validate source_text length (1000-10000)
    2. Verify deck_id exists and belongs to user
    3. Check rate limit (max 10 generations/hour per user)
    4. Generate SHA-256 hash of source_text
    5. Start timer
    6. Call OpenRouter.ai API with structured prompt
    7. Parse AI response into flashcard suggestions
    8. Stop timer
    9. Insert generation record (WITHOUT storing suggestions)
    10. Return generation metadata + suggestions
  - **Rate Limiting**: 10 requests per hour per user (429 if exceeded)
  - **Error Handling**: 
    - On AI failure: Log to generation_error_logs, return appropriate error
    - Validate AI response format
  - **Error Codes**: 
    - 400 Bad Request (validation errors, invalid model)
    - 401 Unauthorized
    - 429 Too Many Requests (rate limit)
    - 502 Bad Gateway (OpenRouter.ai failure)
    - 503 Service Unavailable (OpenRouter.ai timeout)

- **POST /api/v1/generations/:id/accept**
  - **Description**: Accept generated flashcards, creating them in the database.
  - **Request Headers**: `Authorization: Bearer {access_token}`
  - **Request Body**:
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
  - **Response Body** (201 Created):
    ```json
    {
      "accepted_count": "integer",
      "flashcards": [
        {
          "id": "string",
          "front": "string",
          "back": "string",
          "source": "ai-full|ai-edited",
          "generation_id": "string",
          "deck_id": "string",
          "created_at": "ISO8601 timestamp"
        }
      ]
    }
    ```
  - **Business Logic** (Transaction):
    1. Verify generation exists and belongs to user
    2. Get generation's deck_id
    3. For each flashcard:
       - Set source = "ai-full" if edited=false, "ai-edited" if edited=true
       - Set generation_id to this generation
       - Insert flashcard
    4. Update generation statistics:
       - accepted_unedited_count += count where edited=false
       - accepted_edited_count += count where edited=true
    5. Commit transaction
  - **Validation**:
    - Flashcards array must not be empty
    - Each flashcard must have valid front/back lengths
  - **Error Codes**: 
    - 400 Bad Request (validation errors, empty array)
    - 401 Unauthorized
    - 404 Not Found (generation doesn't exist)

## 4. Authentication and Authorization

### 4.1 Authentication Mechanism

- **Provider**: Supabase Auth (JWT-based)
- **Token Type**: Bearer tokens
- **Header Format**: `Authorization: Bearer {access_token}`
- **Token Expiry**: Configurable in Supabase (default: 1 hour)
- **Refresh Tokens**: Supported via Supabase Auth refresh endpoint

### 4.2 Authorization Strategy

- **Row Level Security (RLS)**: Enforced at database level for all tables
- **User Isolation**: All queries automatically filtered by `auth.uid() = user_id`
- **Admin Role**: Identified by `raw_app_meta_data->>'role' = 'admin'` for global tag management
- **Resource Ownership**: Always verified via RLS policies before any operation

### 4.3 Rate Limiting

- **Generation Endpoint**: 10 requests per hour per user
- **Implementation**: Redis-backed counter or Supabase Edge Functions rate limiter
- **Response**: 429 Too Many Requests with `Retry-After` header

### 4.4 Security Measures

- **HTTPS**: Enforced for all API communication
- **Input Sanitization**: All text inputs sanitized to prevent XSS/injection
- **SQL Injection**: Prevented via parameterized queries (Supabase client)
- **CORS**: Configured to allow only trusted origins
- **Secrets Management**: API keys stored in environment variables, not committed

## 5. Error Response Format

All error responses follow a consistent structure:

```json
{
  "error": {
    "code": "string (error code)",
    "message": "string (human-readable message)",
    "details": "object|null (additional context, optional)"
  }
}
```

### Common Error Codes

- **400 Bad Request**: Invalid input, validation failure
- **401 Unauthorized**: Missing or invalid JWT token
- **403 Forbidden**: Valid token but insufficient permissions
- **404 Not Found**: Resource doesn't exist or doesn't belong to user
- **409 Conflict**: Duplicate resource (e.g., deck name, tag name)
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Unexpected server error
- **502 Bad Gateway**: External service (OpenRouter.ai) failure
- **503 Service Unavailable**: Service temporarily unavailable

## 6. Validation Rules

### Decks

- `name`: 1-100 characters, unique per user, required
- `description`: 0-5000 characters, optional
- `is_default`: Cannot be set/changed manually (system managed)
- `visibility`: Always "private" in MVP

### Flashcards

- `front`: 1-200 characters, required
- `back`: 1-500 characters, required
- `deck_id`: Must exist and belong to user, required
- `source`: Enum (manual, ai-full, ai-edited), automatically set

### Tags

- `name`: 1-50 characters, unique per deck (for deck-scoped), required
- `deck_id`: Must exist and belong to user (for deck-scoped), required
- `scope`: Automatically set to "deck" for user-created tags

### Generations

- `source_text`: 1000-10000 characters, required
- `model`: Must be valid OpenRouter.ai model ID, required
- `deck_id`: Must exist and belong to user, required

### Accepted Flashcards

- `front`: 1-200 characters, required
- `back`: 1-500 characters, required
- `edited`: Boolean, required
- Array must not be empty

## 7. Business Logic Implementation

### Default Deck Creation

- **Trigger**: Database trigger on `auth.users` INSERT
- **Function**: `create_default_deck_for_user()`
- **Behavior**: Automatically creates "Uncategorized" deck with is_default=true
- **Error Handling**: Graceful failure with warning log (doesn't block user creation)

### Deck Deletion with Migration

- **Endpoint**: `DELETE /api/v1/decks/:id`
- **Transaction Steps**:
  1. Verify deck is not default
  2. Count flashcards to migrate
  3. Create migration tag `#deleted-from-{deck_name}`
  4. Update flashcard deck_id to default deck
  5. Assign migration tag to all migrated flashcards
  6. Soft-delete deck (set deleted_at)
- **Atomicity**: All steps in single transaction (rollback on any failure)

### AI Generation Flow

- **Generate** (`POST /generate`):
  1. Validate input
  2. Check rate limit
  3. Call OpenRouter.ai
  4. Parse response
  5. Store generation metadata (NOT suggestions)
  6. Return suggestions to client
- **Accept** (`POST /:id/accept`):
  1. Verify generation ownership
  2. Create flashcards with proper source attribution
  3. Update generation statistics
  4. Return created flashcards

### Source Tracking

- **Manual Creation**: source = "manual"
- **AI Unedited**: source = "ai-full" (accepted without changes)
- **AI Edited**: source = "ai-edited" (accepted with changes OR ai-full edited later)
- **Transition**: ai-full → ai-edited on first edit (irreversible)

### Full-Text Search

- **Implementation**: PostgreSQL `tsv` column with GIN index
- **Configuration**: 'simple' dictionary (language-agnostic)
- **Query**: `WHERE tsv @@ to_tsquery('simple', search_term)`
- **Fallback**: pg_trgm for fuzzy/typo-tolerant search (optional)

## 8. Pagination

### Standard Pagination

- **Query Parameters**: `page` (default: 1), `limit` (default: 20, max: 100)
- **Response Format**:
  ```json
  {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "total_pages": 8
    }
  }
  ```
- **SQL Implementation**: `LIMIT {limit} OFFSET {(page-1)*limit}`

## 9. Versioning Strategy

- **Current Version**: v1
- **URL Pattern**: `/api/v1/{resource}`
- **Breaking Changes**: Require new version (v2, v3, etc.)
- **Non-Breaking Changes**: Applied to current version
- **Deprecation**: Minimum 6-month notice before version removal

## 10. Future Enhancements (Post-MVP)

### Out of Scope for MVP

- Spaced repetition algorithm (reviews table)
- Deck sharing and collaboration (deck_collaborators)
- Public/shared deck visibility
- Bulk operations (bulk create/update/delete)
- Import/export (CSV, Anki)
- Advanced search (multiple tags, date ranges)
- Saved search queries
- Notifications and reminders
- Analytics dashboard
- Images/audio in flashcards
- Mobile native apps
- Offline mode

### API Extensibility

The current API design supports future enhancements without breaking changes:
- `visibility` field ready for 'public', 'shared' values
- Deck collaboration can be added via new endpoints
- Spaced repetition can use existing flashcard structure
- Bulk operations can be added as separate endpoints

---

**Document Version**: 1.2  
**Last Updated**: 2025-11-16  
**Compatible With**: Database Schema v2.0, PRD v1.1
