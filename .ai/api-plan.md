# REST API Plan - 10x-cards MVP

## 1. Overview

This REST API plan is designed for the 10x-cards application, which enables users to create and manage educational flashcards with AI assistance. The API follows RESTful principles and integrates with Supabase for authentication and database operations, and OpenRouter.ai for AI-powered flashcard generation.

**Base URL**: `/api/v1`

**Authentication**: All endpoints (except authentication) require a valid JWT token from Supabase Auth in the `Authorization: Bearer <token>` header.

## 2. Resources

| Resource | Database Table | Description |
|----------|---------------|-------------|
| Decks | `decks` | Collections of flashcards organized by users |
| Flashcards | `flashcards` | Individual flashcards with front/back content |
| Tags | `tags` | Labels for organizing flashcards (global or deck-scoped) |
| Reviews | `reviews` | Spaced-repetition review history and scheduling |
| Generations | `generations` | AI generation sessions and metadata |
| Users | `auth.users` (Supabase) | User accounts and authentication |

## 3. Authentication Endpoints

Authentication is handled by Supabase Auth. The frontend will interact directly with Supabase Auth endpoints.

### 3.1 Register

**Method**: `POST`  
**Path**: `/auth/v1/signup` (Supabase endpoint)  
**Description**: Create a new user account

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Business Logic**:
- After successful user creation, automatically create a default "Uncategorized" deck
- This deck cannot be deleted or renamed
- Used as destination for flashcards from deleted decks
- Marked with special flag `is_default = true`

**Success Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "2025-11-15T10:00:00Z"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid email format or weak password
- `409 Conflict`: Email already registered

**Implementation Note**: A database trigger or post-registration hook should automatically create the default "Uncategorized" deck for the new user.

### 3.2 Login

**Method**: `POST`  
**Path**: `/auth/v1/token?grant_type=password` (Supabase endpoint)  
**Description**: Authenticate and receive access token

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Success Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "...",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid credentials
- `401 Unauthorized`: Wrong email or password

### 3.3 Logout

**Method**: `POST`  
**Path**: `/auth/v1/logout` (Supabase endpoint)  
**Description**: Invalidate current session  
**Headers**: `Authorization: Bearer <token>`

**Success Response** (204 No Content)

### 3.4 Delete Account

**Method**: `DELETE`  
**Path**: `/api/v1/users/me`  
**Description**: Delete user account and all associated data (decks, flashcards, reviews)  
**Headers**: `Authorization: Bearer <token>`

**Success Response** (204 No Content)

**Error Responses**:
- `401 Unauthorized`: Invalid or missing token

## 4. Deck Endpoints

### 4.1 List Decks

**Method**: `GET`  
**Path**: `/api/v1/decks`  
**Description**: Retrieve all decks for authenticated user  
**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `limit` (integer, optional, default: 50, max: 100): Number of decks to return
- `offset` (integer, optional, default: 0): Pagination offset
- `sort` (string, optional, default: "created_at"): Sort field (`created_at`, `updated_at`, `name`)
- `order` (string, optional, default: "desc"): Sort order (`asc`, `desc`)

**Success Response** (200 OK):
```json
{
  "data": [
    {
      "id": 2,
      "user_id": "uuid",
      "name": "Uncategorized",
      "description": "Default deck for uncategorized flashcards",
      "visibility": "private",
      "is_default": true,
      "created_at": "2025-11-01T09:00:00Z",
      "updated_at": "2025-11-01T09:00:00Z",
      "flashcard_count": 3
    },
    {
      "id": 1,
      "user_id": "uuid",
      "name": "Biology 101",
      "description": "Introduction to cellular biology",
      "visibility": "private",
      "is_default": false,
      "created_at": "2025-11-01T10:00:00Z",
      "updated_at": "2025-11-10T15:30:00Z",
      "flashcard_count": 25
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 50,
    "offset": 0,
    "has_more": true
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid or missing token

### 4.2 Get Default Deck

**Method**: `GET`  
**Path**: `/api/v1/decks/default`  
**Description**: Retrieve the user's default "Uncategorized" deck  
**Headers**: `Authorization: Bearer <token>`

**Success Response** (200 OK):
```json
{
  "id": 2,
  "user_id": "uuid",
  "name": "Uncategorized",
  "description": "Default deck for uncategorized flashcards",
  "visibility": "private",
  "is_default": true,
  "created_at": "2025-11-01T09:00:00Z",
  "updated_at": "2025-11-01T09:00:00Z",
  "flashcard_count": 3
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid or missing token
- `404 Not Found`: Default deck not found (should never happen if user registration is correct)

### 4.3 Get Deck by ID

**Method**: `GET`  
**Path**: `/api/v1/decks/:id`  
**Description**: Retrieve a specific deck  
**Headers**: `Authorization: Bearer <token>`

**Success Response** (200 OK):
```json
{
  "id": 1,
  "user_id": "uuid",
  "name": "Biology 101",
  "description": "Introduction to cellular biology",
  "visibility": "private",
  "is_default": false,
  "created_at": "2025-11-01T10:00:00Z",
  "updated_at": "2025-11-10T15:30:00Z",
  "flashcard_count": 25
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid or missing token
- `404 Not Found`: Deck does not exist or does not belong to user

### 4.4 Create Deck

**Method**: `POST`  
**Path**: `/api/v1/decks`  
**Description**: Create a new deck  
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "name": "Biology 101",
  "description": "Introduction to cellular biology"
}
```

**Validation**:
- `name`: Required, 1-100 characters, must be unique for the user
- `description`: Optional, max 5000 characters

**Business Logic**:
- `is_default` is automatically set to `false` (only registration can create default deck)
- Cannot create a deck named "Uncategorized" (reserved for default deck)

**Success Response** (201 Created):
```json
{
  "id": 1,
  "user_id": "uuid",
  "name": "Biology 101",
  "description": "Introduction to cellular biology",
  "visibility": "private",
  "is_default": false,
  "created_at": "2025-11-01T10:00:00Z",
  "updated_at": "2025-11-01T10:00:00Z",
  "flashcard_count": 0
}
```

**Error Responses**:
- `400 Bad Request`: Validation error (name too long, empty name, reserved name, etc.)
- `401 Unauthorized`: Invalid or missing token
- `409 Conflict`: Deck name already exists for this user

### 4.5 Update Deck

**Method**: `PATCH`  
**Path**: `/api/v1/decks/:id`  
**Description**: Update deck details  
**Headers**: `Authorization: Bearer <token>`

**Request Body** (all fields optional):
```json
{
  "name": "Advanced Biology",
  "description": "Updated description"
}
```

**Validation**:
- `name`: 1-100 characters if provided, must be unique for the user
- `description`: Max 5000 characters if provided
- Cannot update the default "Uncategorized" deck (where `is_default = true`)
- Cannot rename to "Uncategorized" (reserved name)

**Success Response** (200 OK):
```json
{
  "id": 1,
  "user_id": "uuid",
  "name": "Advanced Biology",
  "description": "Updated description",
  "visibility": "private",
  "is_default": false,
  "created_at": "2025-11-01T10:00:00Z",
  "updated_at": "2025-11-15T10:00:00Z",
  "flashcard_count": 25
}
```

**Error Responses**:
- `400 Bad Request`: Validation error (reserved name, etc.)
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: Cannot modify default "Uncategorized" deck
- `404 Not Found`: Deck does not exist or does not belong to user
- `409 Conflict`: Deck name already exists for this user

### 4.6 Delete Deck

**Method**: `DELETE`  
**Path**: `/api/v1/decks/:id`  
**Description**: Delete a deck and move all flashcards to "Uncategorized" deck  
**Headers**: `Authorization: Bearer <token>`

**Business Logic**:
1. Verify deck exists and belongs to user
2. Check if deck is the default "Uncategorized" deck (`is_default = true`) - cannot be deleted
3. Get user's "Uncategorized" deck ID
4. For each flashcard in the deleted deck:
   - Move flashcard to "Uncategorized" deck (`deck_id` updated)
   - Create or get tag `#deleted-from-<deck_name>` (deck-scoped, in Uncategorized deck)
   - Add this tag to the flashcard via `flashcard_tags` junction table
5. Soft-delete the deck (set `deleted_at` timestamp)

**Transaction**: All operations must be performed in a database transaction to ensure atomicity

**Example**: Deleting deck "Biology 101" with 5 flashcards:
- All 5 flashcards moved to "Uncategorized"
- Tag "#deleted-from-Biology 101" created (if doesn't exist)
- Tag "#deleted-from-Biology 101" added to all 5 flashcards
- Deck "Biology 101" is soft-deleted

**Success Response** (200 OK):
```json
{
  "deck_deleted": true,
  "deck_name": "Biology 101",
  "flashcards_moved": 5,
  "destination_deck_id": 2,
  "destination_deck_name": "Uncategorized",
  "tag_created": "#deleted-from-Biology 101",
  "tag_id": 15
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: Cannot delete the default "Uncategorized" deck
- `404 Not Found`: Deck does not exist or does not belong to user
- `500 Internal Server Error`: Failed to move flashcards or create tags (transaction rolled back)

## 5. Flashcard Endpoints

### 5.1 List Flashcards

**Method**: `GET`  
**Path**: `/api/v1/flashcards`  
**Description**: Retrieve flashcards for authenticated user  
**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `deck_id` (integer, optional): Filter by deck ID
- `source` (string, optional): Filter by source (`ai-full`, `ai-edited`, `manual`)
- `tag_id` (integer, optional): Filter by tag ID
- `search` (string, optional): Full-text search in front and back
- `limit` (integer, optional, default: 50, max: 100): Number of flashcards to return
- `offset` (integer, optional, default: 0): Pagination offset
- `sort` (string, optional, default: "created_at"): Sort field (`created_at`, `updated_at`)
- `order` (string, optional, default: "desc"): Sort order (`asc`, `desc`)

**Success Response** (200 OK):
```json
{
  "data": [
    {
      "id": 1,
      "deck_id": 1,
      "user_id": "uuid",
      "front": "What is the powerhouse of the cell?",
      "back": "The mitochondria",
      "source": "ai-full",
      "generation_id": 5,
      "created_at": "2025-11-01T10:00:00Z",
      "updated_at": "2025-11-01T10:00:00Z",
      "tags": [
        {
          "id": 1,
          "name": "biology",
          "scope": "global"
        }
      ]
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "has_more": true
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid or missing token
- `400 Bad Request`: Invalid query parameters

### 5.2 Get Flashcard by ID

**Method**: `GET`  
**Path**: `/api/v1/flashcards/:id`  
**Description**: Retrieve a specific flashcard  
**Headers**: `Authorization: Bearer <token>`

**Success Response** (200 OK):
```json
{
  "id": 1,
  "deck_id": 1,
  "user_id": "uuid",
  "front": "What is the powerhouse of the cell?",
  "back": "The mitochondria",
  "source": "ai-full",
  "generation_id": 5,
  "created_at": "2025-11-01T10:00:00Z",
  "updated_at": "2025-11-01T10:00:00Z",
  "tags": [
    {
      "id": 1,
      "name": "biology",
      "scope": "global"
    }
  ]
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid or missing token
- `404 Not Found`: Flashcard does not exist or does not belong to user

### 5.3 Create Flashcard (Manual)

**Method**: `POST`  
**Path**: `/api/v1/flashcards`  
**Description**: Create a flashcard manually  
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "deck_id": 1,
  "front": "What is photosynthesis?",
  "back": "The process by which plants convert light energy into chemical energy",
  "tag_ids": [1, 3]
}
```

**Validation**:
- `deck_id`: Required, must exist and belong to user
- `front`: Required, 1-200 characters
- `back`: Required, 1-500 characters
- `tag_ids`: Optional, array of tag IDs (must be global or user's deck tags)

**Business Logic**:
- `source` is automatically set to `manual`
- `generation_id` is NULL
- Creates review record with default spaced-repetition values

**Success Response** (201 Created):
```json
{
  "id": 1,
  "deck_id": 1,
  "user_id": "uuid",
  "front": "What is photosynthesis?",
  "back": "The process by which plants convert light energy into chemical energy",
  "source": "manual",
  "generation_id": null,
  "created_at": "2025-11-01T10:00:00Z",
  "updated_at": "2025-11-01T10:00:00Z",
  "tags": [
    {
      "id": 1,
      "name": "biology",
      "scope": "global"
    }
  ]
}
```

**Error Responses**:
- `400 Bad Request`: Validation error (front/back too long, deck_id missing, etc.)
- `401 Unauthorized`: Invalid or missing token
- `404 Not Found`: Deck does not exist or does not belong to user

### 5.4 Update Flashcard

**Method**: `PATCH`  
**Path**: `/api/v1/flashcards/:id`  
**Description**: Update flashcard content  
**Headers**: `Authorization: Bearer <token>`

**Request Body** (all fields optional):
```json
{
  "front": "Updated question?",
  "back": "Updated answer",
  "deck_id": 2
}
```

**Validation**:
- `front`: 1-200 characters if provided
- `back`: 1-500 characters if provided
- `deck_id`: Must exist and belong to user if provided

**Business Logic**:
- If flashcard was generated by AI (`source=ai-full`) and content is edited, `source` changes to `ai-edited`
- `updated_at` is automatically updated

**Success Response** (200 OK):
```json
{
  "id": 1,
  "deck_id": 2,
  "user_id": "uuid",
  "front": "Updated question?",
  "back": "Updated answer",
  "source": "ai-edited",
  "generation_id": 5,
  "created_at": "2025-11-01T10:00:00Z",
  "updated_at": "2025-11-15T10:00:00Z",
  "tags": []
}
```

**Error Responses**:
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Invalid or missing token
- `404 Not Found`: Flashcard or deck does not exist or does not belong to user

### 5.5 Delete Flashcard

**Method**: `DELETE`  
**Path**: `/api/v1/flashcards/:id`  
**Description**: Soft-delete a flashcard (sets `deleted_at` timestamp)  
**Headers**: `Authorization: Bearer <token>`

**Business Logic**:
- Flashcard is soft-deleted
- Associated reviews are also soft-deleted
- Tags associations are removed

**Success Response** (204 No Content)

**Error Responses**:
- `401 Unauthorized`: Invalid or missing token
- `404 Not Found`: Flashcard does not exist or does not belong to user

### 5.6 Add Tags to Flashcard

**Method**: `POST`  
**Path**: `/api/v1/flashcards/:id/tags`  
**Description**: Add tags to a flashcard  
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "tag_ids": [1, 3, 5]
}
```

**Validation**:
- `tag_ids`: Required, array of tag IDs
- Tags must be global or belong to user's deck

**Success Response** (200 OK):
```json
{
  "id": 1,
  "front": "What is photosynthesis?",
  "back": "The process by which plants convert light energy into chemical energy",
  "tags": [
    {
      "id": 1,
      "name": "biology",
      "scope": "global"
    },
    {
      "id": 3,
      "name": "important",
      "scope": "deck"
    }
  ]
}
```

**Error Responses**:
- `400 Bad Request`: Invalid tag IDs
- `401 Unauthorized`: Invalid or missing token
- `404 Not Found`: Flashcard or tag does not exist

### 5.7 Remove Tag from Flashcard

**Method**: `DELETE`  
**Path**: `/api/v1/flashcards/:id/tags/:tag_id`  
**Description**: Remove a tag from a flashcard  
**Headers**: `Authorization: Bearer <token>`

**Success Response** (204 No Content)

**Error Responses**:
- `401 Unauthorized`: Invalid or missing token
- `404 Not Found`: Flashcard or tag association does not exist

## 6. Generation Endpoints

### 6.1 Generate Flashcards

**Method**: `POST`  
**Path**: `/api/v1/generations`  
**Description**: Generate flashcard suggestions using AI  
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "source_text": "Photosynthesis is the process by which green plants... [1000-10000 characters]",
  "model": "openai/gpt-4",
  "deck_id": 1
}
```

**Validation**:
- `source_text`: Required, 1000-10000 characters
- `model`: Required, valid model identifier from OpenRouter.ai
- `deck_id`: Required, must exist and belong to user

**Business Logic**:
1. Validate text length
2. Generate hash of source_text for deduplication
3. Send to OpenRouter.ai API with structured prompt
4. Parse response into flashcard suggestions
5. Save generation metadata (model, duration, count)
6. Return suggestions without saving them as flashcards

**Success Response** (201 Created):
```json
{
  "id": 5,
  "user_id": "uuid",
  "model": "openai/gpt-4",
  "generated_count": 8,
  "source_text_hash": "abc123...",
  "source_text_length": 2500,
  "generation_duration": 3500,
  "created_at": "2025-11-15T10:00:00Z",
  "suggestions": [
    {
      "front": "What is photosynthesis?",
      "back": "The process by which plants convert light energy into chemical energy"
    },
    {
      "front": "Where does photosynthesis occur in plant cells?",
      "back": "In the chloroplasts"
    }
  ]
}
```

**Error Responses**:
- `400 Bad Request`: Validation error (text too short/long, invalid model, etc.)
- `401 Unauthorized`: Invalid or missing token
- `404 Not Found`: Deck does not exist
- `429 Too Many Requests`: Rate limit exceeded (10 requests/hour)
- `500 Internal Server Error`: AI generation failed
- `503 Service Unavailable`: OpenRouter.ai API unavailable

**Rate Limiting**: 10 requests per hour per user

### 6.2 Accept Generated Flashcards

**Method**: `POST`  
**Path**: `/api/v1/generations/:id/accept`  
**Description**: Accept and save suggested flashcards from a generation  
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "flashcards": [
    {
      "front": "What is photosynthesis?",
      "back": "The process by which plants convert light energy into chemical energy",
      "edited": false
    },
    {
      "front": "Where does photosynthesis happen?",
      "back": "In chloroplasts of plant cells",
      "edited": true
    }
  ]
}
```

**Validation**:
- `flashcards`: Required, array of flashcard objects
- Each flashcard must have `front`, `back`, and `edited` boolean
- `front`: 1-200 characters
- `back`: 1-500 characters
- Generation must belong to authenticated user

**Business Logic**:
1. Create flashcards with `source=ai-full` if `edited=false`, `source=ai-edited` if `edited=true`
2. Link flashcards to generation via `generation_id`
3. Update generation statistics: `accepted_unedited_count` and `accepted_edited_count`
4. Create review records for each new flashcard

**Success Response** (201 Created):
```json
{
  "created_count": 2,
  "flashcards": [
    {
      "id": 10,
      "deck_id": 1,
      "front": "What is photosynthesis?",
      "back": "The process by which plants convert light energy into chemical energy",
      "source": "ai-full",
      "generation_id": 5,
      "created_at": "2025-11-15T10:05:00Z"
    },
    {
      "id": 11,
      "deck_id": 1,
      "front": "Where does photosynthesis happen?",
      "back": "In chloroplasts of plant cells",
      "source": "ai-edited",
      "generation_id": 5,
      "created_at": "2025-11-15T10:05:00Z"
    }
  ]
}
```

**Error Responses**:
- `400 Bad Request`: Validation error (flashcard content invalid, etc.)
- `401 Unauthorized`: Invalid or missing token
- `404 Not Found`: Generation does not exist or does not belong to user

### 6.3 Get Generation by ID

**Method**: `GET`  
**Path**: `/api/v1/generations/:id`  
**Description**: Retrieve generation details and statistics  
**Headers**: `Authorization: Bearer <token>`

**Success Response** (200 OK):
```json
{
  "id": 5,
  "user_id": "uuid",
  "model": "openai/gpt-4",
  "generated_count": 8,
  "accepted_unedited_count": 1,
  "accepted_edited_count": 1,
  "source_text_hash": "abc123...",
  "source_text_length": 2500,
  "generation_duration": 3500,
  "created_at": "2025-11-15T10:00:00Z",
  "updated_at": "2025-11-15T10:05:00Z"
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid or missing token
- `404 Not Found`: Generation does not exist or does not belong to user

### 6.4 List Generations

**Method**: `GET`  
**Path**: `/api/v1/generations`  
**Description**: List all generations for authenticated user  
**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `limit` (integer, optional, default: 50, max: 100): Number of generations to return
- `offset` (integer, optional, default: 0): Pagination offset
- `sort` (string, optional, default: "created_at"): Sort field
- `order` (string, optional, default: "desc"): Sort order (`asc`, `desc`)

**Success Response** (200 OK):
```json
{
  "data": [
    {
      "id": 5,
      "model": "openai/gpt-4",
      "generated_count": 8,
      "accepted_unedited_count": 1,
      "accepted_edited_count": 1,
      "source_text_length": 2500,
      "generation_duration": 3500,
      "created_at": "2025-11-15T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 50,
    "offset": 0,
    "has_more": false
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid or missing token

## 7. Review Endpoints (Spaced Repetition)

### 7.1 Get Due Reviews

**Method**: `GET`  
**Path**: `/api/v1/reviews/due`  
**Description**: Get flashcards due for review  
**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `deck_id` (integer, optional): Filter by deck
- `limit` (integer, optional, default: 20, max: 100): Number of reviews to return

**Business Logic**:
- Returns reviews where `due_at <= NOW()` and `deleted_at IS NULL`
- Ordered by `due_at` ASC (oldest due first)
- Includes flashcard details

**Success Response** (200 OK):
```json
{
  "data": [
    {
      "review_id": 1,
      "flashcard": {
        "id": 1,
        "deck_id": 1,
        "front": "What is the powerhouse of the cell?",
        "back": "The mitochondria",
        "tags": [
          {
            "id": 1,
            "name": "biology"
          }
        ]
      },
      "due_at": "2025-11-15T08:00:00Z",
      "interval": 7,
      "ease_factor": 2.5,
      "repetitions": 3
    }
  ],
  "total_due": 15
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid or missing token

### 7.2 Submit Review

**Method**: `POST`  
**Path**: `/api/v1/reviews`  
**Description**: Submit a review for a flashcard after study  
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "flashcard_id": 1,
  "grade": 4,
  "version": 0
}
```

**Validation**:
- `flashcard_id`: Required, must exist and belong to user
- `grade`: Required, integer 0-5
  - 0: Complete blackout
  - 1: Incorrect, but familiar
  - 2: Incorrect, but easy to recall
  - 3: Correct with difficulty
  - 4: Correct with hesitation
  - 5: Perfect recall
- `version`: Required for optimistic locking, must match current review version

**Business Logic** (SuperMemo SM-2 Algorithm):
1. Verify version matches for optimistic locking
2. Calculate new interval based on grade:
   - Grade < 3: Reset to day 1
   - Grade >= 3: Multiply interval by ease_factor
3. Adjust ease_factor:
   - EF' = EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
   - Minimum EF: 1.3
4. Calculate next `due_at` = NOW() + interval
5. Increment `repetitions` if grade >= 3, else reset to 0
6. Update `last_review_at` = NOW()
7. Increment `version`

**Success Response** (200 OK):
```json
{
  "id": 1,
  "flashcard_id": 1,
  "user_id": "uuid",
  "due_at": "2025-11-22T10:00:00Z",
  "interval": 14,
  "ease_factor": 2.6,
  "repetitions": 4,
  "grade": 4,
  "last_review_at": "2025-11-15T10:00:00Z",
  "version": 1
}
```

**Error Responses**:
- `400 Bad Request`: Validation error (invalid grade, etc.)
- `401 Unauthorized`: Invalid or missing token
- `404 Not Found`: Flashcard does not exist
- `409 Conflict`: Version mismatch (concurrent update detected)

### 7.3 Get Review Statistics

**Method**: `GET`  
**Path**: `/api/v1/reviews/stats`  
**Description**: Get user's review statistics  
**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `deck_id` (integer, optional): Filter by deck

**Success Response** (200 OK):
```json
{
  "total_flashcards": 100,
  "due_today": 15,
  "due_this_week": 45,
  "reviews_completed_today": 12,
  "reviews_completed_this_week": 67,
  "average_ease_factor": 2.4,
  "retention_rate": 0.85
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid or missing token

## 8. Tag Endpoints

### 8.1 List Tags

**Method**: `GET`  
**Path**: `/api/v1/tags`  
**Description**: List available tags (global + user's deck tags)  
**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `scope` (string, optional): Filter by scope (`global`, `deck`)
- `deck_id` (integer, optional): Filter by deck (for deck-scoped tags)
- `search` (string, optional): Search tag names

**Success Response** (200 OK):
```json
{
  "data": [
    {
      "id": 1,
      "name": "biology",
      "scope": "global",
      "usage_count": 25
    },
    {
      "id": 5,
      "name": "important",
      "scope": "deck",
      "deck_id": 1,
      "user_id": "uuid",
      "usage_count": 8
    }
  ]
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid or missing token

### 8.2 Create Tag

**Method**: `POST`  
**Path**: `/api/v1/tags`  
**Description**: Create a new deck-scoped tag  
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "name": "important",
  "deck_id": 1
}
```

**Validation**:
- `name`: Required, 1-50 characters, unique within deck
- `deck_id`: Required, must exist and belong to user

**Business Logic**:
- Only deck-scoped tags can be created via API
- Global tags require admin privileges (managed separately)
- `scope` is automatically set to `deck`

**Success Response** (201 Created):
```json
{
  "id": 5,
  "name": "important",
  "scope": "deck",
  "deck_id": 1,
  "user_id": "uuid",
  "created_at": "2025-11-15T10:00:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Validation error (name too long, empty name, etc.)
- `401 Unauthorized`: Invalid or missing token
- `404 Not Found`: Deck does not exist
- `409 Conflict`: Tag name already exists in this deck

### 8.3 Update Tag

**Method**: `PATCH`  
**Path**: `/api/v1/tags/:id`  
**Description**: Update a deck-scoped tag  
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "name": "very-important"
}
```

**Validation**:
- `name`: Required, 1-50 characters, unique within deck
- Only deck-scoped tags belonging to user can be updated

**Success Response** (200 OK):
```json
{
  "id": 5,
  "name": "very-important",
  "scope": "deck",
  "deck_id": 1,
  "user_id": "uuid",
  "created_at": "2025-11-15T10:00:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: Cannot edit global tags (admin only)
- `404 Not Found`: Tag does not exist or does not belong to user
- `409 Conflict`: Tag name already exists in this deck

### 8.4 Delete Tag

**Method**: `DELETE`  
**Path**: `/api/v1/tags/:id`  
**Description**: Delete a deck-scoped tag  
**Headers**: `Authorization: Bearer <token>`

**Business Logic**:
- Removes tag and all associations with flashcards
- Only deck-scoped tags belonging to user can be deleted

**Success Response** (204 No Content)

**Error Responses**:
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: Cannot delete global tags (admin only)
- `404 Not Found`: Tag does not exist or does not belong to user

## 9. Error Response Format

All error responses follow a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Front text must be between 1 and 200 characters",
    "details": {
      "field": "front",
      "provided_length": 250,
      "max_length": 200
    }
  }
}
```

### Common Error Codes

- `AUTHENTICATION_REQUIRED`: Missing or invalid authentication token
- `AUTHORIZATION_FAILED`: User lacks permission for the requested resource
- `VALIDATION_ERROR`: Request body or parameters failed validation
- `NOT_FOUND`: Requested resource does not exist
- `CONFLICT`: Request conflicts with existing data (e.g., duplicate name)
- `RATE_LIMIT_EXCEEDED`: Too many requests in time window
- `GENERATION_FAILED`: AI generation service error
- `SERVICE_UNAVAILABLE`: External service (OpenRouter.ai) unavailable
- `INTERNAL_ERROR`: Unexpected server error
- `VERSION_CONFLICT`: Optimistic locking version mismatch

## 10. Authentication and Authorization

### 10.1 Authentication Mechanism

**Technology**: Supabase Auth with JWT tokens

**Flow**:
1. User registers or logs in via Supabase Auth endpoints
2. Supabase returns JWT access token and refresh token
3. Client includes access token in `Authorization: Bearer <token>` header for all API requests
4. API validates token with Supabase and extracts user ID
5. Token expires after 1 hour, client must refresh using refresh token

### 10.2 Authorization

**Row Level Security (RLS)**:
- All database queries are automatically filtered by `user_id = auth.uid()`
- RLS policies enforce that users can only access their own data
- Implemented at database level via PostgreSQL RLS

**Resource Ownership**:
- Decks: User must be owner (`user_id` matches)
- Flashcards: User must be owner (`user_id` matches)
- Tags: User can access global tags and their own deck tags
- Reviews: User can only access their own reviews
- Generations: User can only access their own generations

**Future Considerations** (Post-MVP):
- `deck_collaborators` table enables sharing decks with other users
- Roles: `cooperator` (full CRUD) and `viewer` (read-only)

## 11. Validation and Business Logic

### 11.1 Input Validation

**Decks**:
- `name`: Required, 1-100 characters, unique per user
- `description`: Optional, max 5000 characters
- `visibility`: Must be 'private' (only option in MVP)
- `is_default`: Boolean flag indicating the "Uncategorized" deck (cannot be modified or deleted)
- Reserved names: "Uncategorized" (can only be used for the default deck)

**Flashcards**:
- `front`: Required, 1-200 characters
- `back`: Required, 1-500 characters
- `source`: Automatically set based on creation method
  - `manual`: Created by user via POST /api/v1/flashcards
  - `ai-full`: Accepted from generation without edits
  - `ai-edited`: Accepted from generation with edits
- `deck_id`: Required, must exist and belong to user

**Tags**:
- `name`: Required, 1-50 characters
- Unique within scope:
  - Global tags: Unique across all users
  - Deck tags: Unique within deck
- `scope`: Cannot be changed after creation

**Reviews**:
- `grade`: Required, integer 0-5
- `version`: Required for optimistic locking

**Generations**:
- `source_text`: Required, 1000-10000 characters
- `model`: Required, valid OpenRouter.ai model identifier

### 11.2 Business Logic

**Default "Uncategorized" Deck**:
- Created automatically during user registration
- Marked with `is_default = true` flag
- Cannot be deleted or renamed
- Serves as destination for flashcards from deleted decks
- Each user has exactly one default deck

**Deck Deletion with Flashcard Migration**:
- When deleting a deck containing flashcards:
  1. Verify deck is not the default "Uncategorized" deck (`is_default = false`)
  2. Get user's "Uncategorized" deck ID
  3. Start database transaction
  4. For each flashcard in the deleted deck:
     - Update `flashcards.deck_id` to "Uncategorized" deck ID
     - Create tag `#deleted-from-<deck_name>` if it doesn't exist (deck-scoped, belongs to Uncategorized deck)
     - Insert record into `flashcard_tags` linking flashcard to the new tag
  5. Soft-delete the deck (set `deleted_at` timestamp)
  6. Commit transaction
- The default "Uncategorized" deck cannot be deleted
- This ensures no flashcards are lost when deleting decks
- All operations are atomic (transaction ensures all-or-nothing execution)

**Soft Delete**:
- Decks, flashcards, and reviews use soft delete (`deleted_at` timestamp)
- Soft-deleted records are filtered from all queries by default
- Enables data recovery and audit trails

**Cascading Deletes**:
- Deleting a user hard-deletes all owned decks, flashcards, reviews, generations (including "Uncategorized" deck)
- Deleting a deck triggers flashcard migration to "Uncategorized" before soft-deletion
- Deleting a flashcard soft-deletes associated reviews

**Flashcard Source Tracking**:
- When AI-generated flashcard (`source=ai-full`) is edited, `source` changes to `ai-edited`
- Tracked in generation statistics: `accepted_unedited_count` vs `accepted_edited_count`

**Spaced Repetition Algorithm**:
- Uses SuperMemo SM-2 algorithm
- Key parameters:
  - `interval`: Days until next review
  - `ease_factor`: Multiplier for interval calculation (default 2.5, min 1.3)
  - `repetitions`: Consecutive correct reviews
- Grade < 3 resets progress (interval = 1, repetitions = 0)
- Grade >= 3 increases interval and adjusts ease_factor

**Review Scheduling**:
- New flashcards have `due_at = NOW()` (immediately due)
- After each review, `due_at` is recalculated based on interval

**Tag Management**:
- Global tags are read-only for users (admin-managed)
- Users can create, edit, delete deck-scoped tags
- Tags can be shared across flashcards within a deck
- System automatically creates `#deleted-from-<deck_name>` tags when decks are deleted
- These tags are deck-scoped to the "Uncategorized" deck

### 11.3 Deck Deletion Algorithm (Detailed Implementation)

The deck deletion endpoint implements a complex algorithm to safely migrate flashcards and maintain data integrity. Here's the detailed step-by-step process:

**Step 1: Validation**
```
1. Verify user is authenticated (JWT token valid)
2. Verify deck exists in database
3. Verify deck belongs to authenticated user (via RLS)
4. Check if deck.is_default = true
   - If true: Return 403 Forbidden "Cannot delete default Uncategorized deck"
   - If false: Continue
```

**Step 2: Get Default Deck**
```
5. Query for user's default deck:
   SELECT id, name FROM decks 
   WHERE user_id = <user_id> AND is_default = true AND deleted_at IS NULL
   
6. If no default deck found: Return 500 Internal Server Error
   (This should never happen if registration logic is correct)
```

**Step 3: Count Flashcards**
```
7. Count flashcards in the deck to be deleted:
   SELECT COUNT(*) FROM flashcards 
   WHERE deck_id = <deck_to_delete_id> AND deleted_at IS NULL
   
8. Store count for response
```

**Step 4: Begin Transaction**
```
9. BEGIN TRANSACTION (ensures atomicity)
```

**Step 5: Create Migration Tag**
```
10. Generate tag name: tag_name = "#deleted-from-" + deck.name
    Example: "#deleted-from-Biology 101"
    
11. Check if tag already exists:
    SELECT id FROM tags 
    WHERE name = <tag_name> AND scope = 'deck' AND deck_id = <default_deck_id>
    
12. If tag doesn't exist, create it:
    INSERT INTO tags (name, scope, deck_id, user_id)
    VALUES (<tag_name>, 'deck', <default_deck_id>, <user_id>)
    RETURNING id
    
13. Store tag_id for next steps
```

**Step 6: Migrate Flashcards**
```
14. Get all flashcard IDs from the deck to be deleted:
    SELECT id FROM flashcards 
    WHERE deck_id = <deck_to_delete_id> AND deleted_at IS NULL
    
15. For each flashcard_id:
    a. Update flashcard's deck:
       UPDATE flashcards 
       SET deck_id = <default_deck_id>, updated_at = NOW()
       WHERE id = <flashcard_id>
       
    b. Check if flashcard already has this tag:
       SELECT 1 FROM flashcard_tags 
       WHERE flashcard_id = <flashcard_id> AND tag_id = <tag_id>
       
    c. If tag not already associated, add it:
       INSERT INTO flashcard_tags (flashcard_id, tag_id)
       VALUES (<flashcard_id>, <tag_id>)
       ON CONFLICT DO NOTHING
```

**Step 7: Soft-Delete Deck**
```
16. Soft-delete the deck:
    UPDATE decks 
    SET deleted_at = NOW(), updated_at = NOW()
    WHERE id = <deck_to_delete_id>
```

**Step 8: Commit Transaction**
```
17. COMMIT TRANSACTION
```

**Step 9: Return Success Response**
```
18. Return 200 OK with details:
    {
      "deck_deleted": true,
      "deck_name": <original_deck_name>,
      "flashcards_moved": <count_from_step_7>,
      "destination_deck_id": <default_deck_id>,
      "destination_deck_name": "Uncategorized",
      "tag_created": <tag_name>,
      "tag_id": <tag_id>
    }
```

**Error Handling:**
- If any step fails during transaction (steps 10-16):
  - ROLLBACK TRANSACTION
  - Return 500 Internal Server Error with details
  - No changes are persisted to database
  
- If database connection fails:
  - Return 503 Service Unavailable
  
**Performance Considerations:**
- For decks with many flashcards (>1000), consider batch updates
- Use database connection pooling
- Consider adding progress tracking for large migrations (future enhancement)

**Edge Cases:**
- Empty deck (0 flashcards): Still create tag and soft-delete deck
- Deck name with special characters: Tag name must escape/sanitize
- Concurrent deletion attempts: Database locks prevent race conditions
- Tag already exists from previous deck deletion: Reuse existing tag

### 11.5 Rate Limiting

**AI Generation**: 10 requests per hour per user
- Prevents cost abuse
- Returns `429 Too Many Requests` when exceeded
- Rate limit reset time included in response header: `X-RateLimit-Reset: 1731667200`

**Other Endpoints**: No explicit rate limiting in MVP
- Future consideration: 100 requests per minute per user for general API

### 11.6 Concurrency Control

**Optimistic Locking** (Reviews):
- `version` field incremented on each update
- Client must provide current version when submitting review
- If version mismatch, returns `409 Conflict`
- Prevents race conditions when multiple devices review same flashcard

### 11.7 Data Integrity

**Foreign Key Constraints**:
- All relationships enforced at database level
- Invalid references rejected with `404 Not Found`

**Check Constraints**:
- `source` must be 'ai-full', 'ai-edited', or 'manual'
- `visibility` must be 'private'
- `grade` must be 0-5
- `source_text_length` must be 1000-10000

**Unique Constraints**:
- Deck names unique per user
- Global tag names globally unique
- Deck tag names unique within deck

## 12. Performance Considerations

### 12.1 Pagination

All list endpoints support pagination:
- `limit`: Number of results (default 50, max 100)
- `offset`: Skip first N results
- Response includes `pagination` object with `total`, `limit`, `offset`, `has_more`

### 12.2 Indexing

Database indices optimize common queries:
- `idx_flashcards_user_id`: Fast filtering by user
- `idx_flashcards_deck_id`: Fast filtering by deck
- `idx_flashcards_tsv`: Full-text search
- `idx_reviews_user_due`: Fast lookup of due reviews
- Foreign key indices on all relationships

### 12.3 Caching Strategy

**Future Consideration** (Post-MVP):
- Cache user's deck list (invalidate on create/update/delete)
- Cache tag list (invalidate on create/update/delete)
- Cache generation statistics
- Use Redis or similar for session storage

### 12.4 Search Optimization

**Full-Text Search**:
- Uses PostgreSQL `tsvector` and GIN index on flashcards
- Enables fast search across front and back text
- Search query: `?search=mitochondria`

**Trigram Search**:
- PostgreSQL `pg_trgm` extension for fuzzy matching
- Enables LIKE queries with good performance
- Useful for autocomplete on tags

## 13. Future Enhancements (Post-MVP)

### 13.1 Deck Sharing
- Implement `deck_collaborators` functionality
- Add endpoints: POST /api/v1/decks/:id/collaborators
- Support roles: `cooperator`, `viewer`
- Update RLS policies for shared access

### 13.2 Public Decks
- Add `visibility` values: `public`, `shared`
- Endpoint: GET /api/v1/decks/public for browsing
- Clone functionality: POST /api/v1/decks/:id/clone

### 13.3 Advanced Search
- Search by multiple tags (AND/OR logic)
- Date range filtering
- Search within specific decks
- Save search queries

### 13.4 Import/Export
- POST /api/v1/decks/:id/import (CSV, Anki format)
- GET /api/v1/decks/:id/export?format=csv

### 13.5 Notifications
- Webhook or push notifications for due reviews
- Email reminders

### 13.6 Analytics
- Detailed learning analytics dashboard
- Progress tracking over time
- Endpoint: GET /api/v1/analytics

### 13.7 Bulk Operations
- POST /api/v1/flashcards/bulk (create multiple)
- PATCH /api/v1/flashcards/bulk (update multiple)
- DELETE /api/v1/flashcards/bulk (delete multiple)

## 14. API Versioning

**Current Version**: v1

**Versioning Strategy**:
- Version included in URL path: `/api/v1/`
- Breaking changes require new version: `/api/v2/`
- Non-breaking changes (new fields, new endpoints) added to current version
- Previous versions supported for 6 months after new version release

**Breaking Changes**:
- Removing fields from responses
- Changing field types
- Removing endpoints
- Changing URL structure
- Changing authentication mechanism

**Non-Breaking Changes**:
- Adding new optional fields to requests
- Adding new fields to responses
- Adding new endpoints
- Adding new query parameters

## 15. Security Considerations

### 15.1 Input Sanitization
- All text inputs sanitized to prevent XSS
- SQL injection prevented by Supabase parameterized queries
- File upload not supported in MVP (no risk)

### 15.2 Data Privacy (GDPR Compliance)
- User can delete account: DELETE /api/v1/users/me
- Hard delete removes all personal data
- User can export data (future enhancement)
- Minimal data collection (email, flashcards only)

### 15.3 HTTPS Only
- All API communication over HTTPS
- Tokens never transmitted in URLs (headers only)

### 15.4 CORS
- Configure allowed origins in production
- Restrict to application domain

### 15.5 Secrets Management
- API keys (OpenRouter.ai) stored in environment variables
- Never exposed in responses or logs
- Rotate keys periodically

## 16. Monitoring and Logging

### 16.1 Logging (Future Consideration)
- Log all API requests (method, path, status, duration)
- Log authentication failures
- Log AI generation errors to `generation_error_logs` table
- Exclude sensitive data (passwords, tokens)

### 16.2 Metrics
- Request count by endpoint
- Response time percentiles (p50, p95, p99)
- Error rate by endpoint
- AI generation success rate
- Daily active users
- Flashcards created per user

### 16.3 Alerting
- Alert on high error rate (>5%)
- Alert on slow response times (p95 > 1s)
- Alert on AI generation failures (>10% failure rate)
- Alert on rate limit violations

## 17. Testing Strategy

### 17.1 Unit Tests
- Validation logic
- Spaced repetition algorithm calculations
- Business logic functions

### 17.2 Integration Tests
- All API endpoints
- Authentication and authorization
- Database queries and RLS policies
- Error handling

### 17.3 End-to-End Tests
- Complete user flows:
  - Register → Create deck → Generate flashcards → Accept → Review
  - Register → Create deck → Manual flashcard → Review
  - Edit flashcard → Delete flashcard
  - Add tags → Filter by tags

### 17.4 Load Tests
- AI generation endpoint (cost-sensitive)
- Review submission (high frequency)
- Flashcard listing (large datasets)

## 18. API Client SDKs

### 18.1 JavaScript/TypeScript (Frontend)
- Supabase JS SDK for auth and database operations
- Custom API client wrapper for business logic endpoints
- Type definitions generated from OpenAPI spec

### 18.2 Future Considerations
- Python SDK for data analysis
- Mobile SDKs (iOS, Android) if mobile apps developed

## 19. Documentation

### 19.1 API Documentation
- OpenAPI 3.0 specification
- Interactive documentation (Swagger UI or similar)
- Code examples for each endpoint
- Authentication guide

### 19.2 Developer Resources
- Getting started guide
- Authentication tutorial
- Spaced repetition algorithm explanation
- Rate limiting guide
- Error handling best practices

## 20. Appendix: Database Schema Reference

### Key Tables
- `decks`: User's flashcard collections (including special "Uncategorized" deck with `is_default = true`)
- `flashcards`: Individual flashcards with front/back content
- `tags`: Global and deck-scoped tags (including system-generated `#deleted-from-*` tags)
- `flashcard_tags`: Many-to-many junction table
- `reviews`: Spaced repetition state and history
- `generations`: AI generation metadata
- `generation_error_logs`: AI error tracking

### Database Schema Changes Required

**1. Add `is_default` column to `decks` table:**
```sql
ALTER TABLE public.decks 
ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT false;
```

**2. Add unique constraint for default deck per user:**
```sql
CREATE UNIQUE INDEX idx_decks_user_default 
ON public.decks(user_id) 
WHERE is_default = true;
```

**3. Create function to automatically create "Uncategorized" deck on user registration:**
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_deck_for_user();
```

**4. Keep ON DELETE RESTRICT on `flashcards.deck_id`:**
- The constraint remains RESTRICT (as in original schema)
- Deck deletion logic is handled at application level (API endpoint)
- This prevents accidental data loss from direct database operations

**5. Add check constraint to prevent renaming default deck:**
```sql
ALTER TABLE public.decks
ADD CONSTRAINT check_default_deck_name 
CHECK (
  (is_default = true AND name = 'Uncategorized') OR 
  (is_default = false)
);
```

### Key Relationships
- User → Decks (1:N)
- Deck → Flashcards (1:N)
- Flashcard ↔ Tags (N:M via flashcard_tags)
- Flashcard → Reviews (1:N)
- Generation → Flashcards (1:N, optional)

### Soft Delete Pattern
- Tables with `deleted_at` column: decks, flashcards, reviews
- Filtered from queries with `WHERE deleted_at IS NULL`
- Enables data recovery and compliance with audit requirements

### Default Deck Pattern
- Each user has one "Uncategorized" deck with `is_default = true`
- Created automatically on user registration
- Cannot be deleted or renamed
- Serves as safety net for flashcards from deleted decks
- Flashcards are moved here with tracking tags when their deck is deleted

---

## Summary of Changes

**Version 1.1 Updates:**
1. **Default "Uncategorized" Deck System:**
   - Automatically created during user registration
   - Cannot be deleted or renamed
   - Receives flashcards from deleted decks

2. **Enhanced Deck Deletion:**
   - Flashcards are migrated to "Uncategorized" instead of blocking deletion
   - Automatic tagging with `#deleted-from-<deck_name>` for traceability
   - Transaction-based implementation ensures atomicity

3. **New Endpoints:**
   - `GET /api/v1/decks/default` - Retrieve user's default deck

4. **Database Schema Updates:**
   - Added `is_default` column to `decks` table
   - Created trigger for automatic default deck creation
   - Added constraints to protect default deck integrity

5. **Enhanced Validation:**
   - Reserved "Uncategorized" name for default deck only
   - Protection against modifying or deleting default deck

**Document Version**: 1.1  
**Last Updated**: 2025-11-15  
**Author**: 10x-cards API Architecture Team

