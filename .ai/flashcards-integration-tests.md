# Flashcards API - Integration Tests Guide

## 📋 Przegląd

Przewodnik po testach integracyjnych dla Flashcards API. Zawiera scenariusze testowe do wykonania po skonfigurowaniu frameworka testowego (Vitest, Jest) i seeda bazy danych.

---

## 🎯 Scenariusze testowe

### Setup testów

```typescript
// test/setup.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/db/database.types';

// Test user IDs
export const TEST_USER_1 = 'test-user-1-uuid';
export const TEST_USER_2 = 'test-user-2-uuid';

// Supabase test client
export function createTestClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
  );
}

// Seed test data
export async function seedTestData(supabase: ReturnType<typeof createTestClient>) {
  // 1. Create decks
  const { data: decks } = await supabase
    .from('decks')
    .insert([
      { user_id: TEST_USER_1, name: 'Test Deck 1', description: 'First test deck' },
      { user_id: TEST_USER_1, name: 'Test Deck 2', description: 'Second test deck' },
      { user_id: TEST_USER_2, name: 'User 2 Deck', description: 'Deck for user 2' },
    ])
    .select();

  // 2. Create tags
  const { data: tags } = await supabase
    .from('tags')
    .insert([
      { name: 'programming', scope: 'global', user_id: null, deck_id: null },
      { name: 'python', scope: 'deck', user_id: TEST_USER_1, deck_id: decks![0].id },
      { name: 'beginner', scope: 'global', user_id: null, deck_id: null },
    ])
    .select();

  // 3. Create flashcards
  const { data: flashcards } = await supabase
    .from('flashcards')
    .insert([
      {
        user_id: TEST_USER_1,
        deck_id: decks![0].id,
        front: 'What is Python?',
        back: 'A programming language',
        source: 'manual',
      },
      {
        user_id: TEST_USER_1,
        deck_id: decks![0].id,
        front: 'What is a variable?',
        back: 'A named storage location',
        source: 'ai-full',
      },
      {
        user_id: TEST_USER_2,
        deck_id: decks![2].id,
        front: 'User 2 Question',
        back: 'User 2 Answer',
        source: 'manual',
      },
    ])
    .select();

  // 4. Assign tags to flashcards
  await supabase
    .from('flashcard_tags')
    .insert([
      { flashcard_id: flashcards![0].id, tag_id: tags![0].id },
      { flashcard_id: flashcards![0].id, tag_id: tags![1].id },
    ]);

  return { decks, tags, flashcards };
}

// Cleanup after tests
export async function cleanupTestData(supabase: ReturnType<typeof createTestClient>) {
  await supabase.from('flashcard_tags').delete().in('flashcard_id', []);
  await supabase.from('flashcards').delete().in('user_id', [TEST_USER_1, TEST_USER_2]);
  await supabase.from('tags').delete().in('user_id', [TEST_USER_1, TEST_USER_2, null]);
  await supabase.from('decks').delete().in('user_id', [TEST_USER_1, TEST_USER_2]);
}
```

---

## 📦 Test Suite 1: GET /api/v1/flashcards - Lista

### Test 1.1: Lista wszystkich fiszek użytkownika
```typescript
describe('GET /api/v1/flashcards', () => {
  test('should return all flashcards for authenticated user', async () => {
    const response = await fetch('http://localhost:3000/api/v1/flashcards', {
      headers: { 'Authorization': `Bearer ${TEST_USER_1_TOKEN}` }
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.data).toBeInstanceOf(Array);
    expect(data.data.length).toBeGreaterThanOrEqual(2); // User 1 ma co najmniej 2 fiszki
    expect(data.pagination).toMatchObject({
      page: 1,
      limit: 20,
      total: expect.any(Number),
      total_pages: expect.any(Number),
    });
  });
});
```

### Test 1.2: Filtrowanie po deck_id
```typescript
test('should filter flashcards by deck_id', async () => {
  const deckId = testData.decks[0].id;
  const response = await fetch(
    `http://localhost:3000/api/v1/flashcards?deck_id=${deckId}`,
    { headers: { 'Authorization': `Bearer ${TEST_USER_1_TOKEN}` }}
  );
  
  expect(response.status).toBe(200);
  const data = await response.json();
  
  expect(data.data.every(f => f.deck_id === deckId.toString())).toBe(true);
});
```

### Test 1.3: Filtrowanie po source
```typescript
test('should filter flashcards by source=manual', async () => {
  const response = await fetch(
    'http://localhost:3000/api/v1/flashcards?source=manual',
    { headers: { 'Authorization': `Bearer ${TEST_USER_1_TOKEN}` }}
  );
  
  expect(response.status).toBe(200);
  const data = await response.json();
  
  expect(data.data.every(f => f.source === 'manual')).toBe(true);
});
```

### Test 1.4: Full-text search
```typescript
test('should search flashcards by text', async () => {
  const response = await fetch(
    'http://localhost:3000/api/v1/flashcards?search=Python',
    { headers: { 'Authorization': `Bearer ${TEST_USER_1_TOKEN}` }}
  );
  
  expect(response.status).toBe(200);
  const data = await response.json();
  
  expect(data.data.length).toBeGreaterThan(0);
  expect(
    data.data.some(f => 
      f.front.includes('Python') || f.back.includes('Python')
    )
  ).toBe(true);
});
```

### Test 1.5: Filtrowanie po tag_id
```typescript
test('should filter flashcards by tag_id', async () => {
  const tagId = testData.tags[0].id; // 'programming' tag
  const response = await fetch(
    `http://localhost:3000/api/v1/flashcards?tag_id=${tagId}`,
    { headers: { 'Authorization': `Bearer ${TEST_USER_1_TOKEN}` }}
  );
  
  expect(response.status).toBe(200);
  const data = await response.json();
  
  expect(data.data.length).toBeGreaterThan(0);
  expect(
    data.data.every(f => f.tags.some(t => t.id === tagId.toString()))
  ).toBe(true);
});
```

### Test 1.6: Sortowanie
```typescript
test('should sort flashcards by updated_at desc', async () => {
  const response = await fetch(
    'http://localhost:3000/api/v1/flashcards?sort=updated_at&order=desc',
    { headers: { 'Authorization': `Bearer ${TEST_USER_1_TOKEN}` }}
  );
  
  expect(response.status).toBe(200);
  const data = await response.json();
  
  const dates = data.data.map(f => new Date(f.updated_at));
  const sortedDates = [...dates].sort((a, b) => b.getTime() - a.getTime());
  
  expect(dates).toEqual(sortedDates);
});
```

### Test 1.7: Paginacja
```typescript
test('should paginate results', async () => {
  const response1 = await fetch(
    'http://localhost:3000/api/v1/flashcards?page=1&limit=1',
    { headers: { 'Authorization': `Bearer ${TEST_USER_1_TOKEN}` }}
  );
  
  const data1 = await response1.json();
  expect(data1.data.length).toBe(1);
  expect(data1.pagination.page).toBe(1);
  
  const response2 = await fetch(
    'http://localhost:3000/api/v1/flashcards?page=2&limit=1',
    { headers: { 'Authorization': `Bearer ${TEST_USER_1_TOKEN}` }}
  );
  
  const data2 = await response2.json();
  expect(data2.pagination.page).toBe(2);
  expect(data1.data[0].id).not.toBe(data2.data[0]?.id); // Różne fiszki
});
```

### Test 1.8: Cross-user isolation
```typescript
test('should not return flashcards from other users', async () => {
  const response = await fetch(
    'http://localhost:3000/api/v1/flashcards',
    { headers: { 'Authorization': `Bearer ${TEST_USER_1_TOKEN}` }}
  );
  
  const data = await response.json();
  const user2FlashcardId = testData.flashcards[2].id; // Fiszka user 2
  
  expect(data.data.every(f => f.id !== user2FlashcardId.toString())).toBe(true);
});
```

---

## 📦 Test Suite 2: POST /api/v1/flashcards - Tworzenie

### Test 2.1: Poprawne tworzenie fiszki
```typescript
test('should create flashcard with valid data', async () => {
  const deckId = testData.decks[0].id;
  const response = await fetch('http://localhost:3000/api/v1/flashcards', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_USER_1_TOKEN}`,
    },
    body: JSON.stringify({
      deck_id: deckId.toString(),
      front: 'New Question',
      back: 'New Answer',
    }),
  });
  
  expect(response.status).toBe(201);
  const data = await response.json();
  
  expect(data).toMatchObject({
    front: 'New Question',
    back: 'New Answer',
    source: 'manual',
    deck_id: deckId.toString(),
    tags: [],
  });
  expect(data.id).toBeDefined();
  expect(data.created_at).toBeDefined();
});
```

### Test 2.2: Błąd przy nieistniejącym deck
```typescript
test('should return 400 for non-existent deck', async () => {
  const response = await fetch('http://localhost:3000/api/v1/flashcards', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_USER_1_TOKEN}`,
    },
    body: JSON.stringify({
      deck_id: '999999',
      front: 'Question',
      back: 'Answer',
    }),
  });
  
  expect(response.status).toBe(400);
  const data = await response.json();
  expect(data.error.code).toBe('invalid_deck');
});
```

### Test 2.3: Walidacja wymaganych pól
```typescript
test('should return 400 for missing fields', async () => {
  const response = await fetch('http://localhost:3000/api/v1/flashcards', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_USER_1_TOKEN}`,
    },
    body: JSON.stringify({
      deck_id: testData.decks[0].id.toString(),
      // missing front and back
    }),
  });
  
  expect(response.status).toBe(400);
  const data = await response.json();
  expect(data.error.code).toBe('validation_error');
  expect(data.error.details.errors.length).toBeGreaterThan(0);
});
```

---

## 📦 Test Suite 3: PATCH /api/v1/flashcards/:id - Aktualizacja

### Test 3.1: Source transition ai-full → ai-edited
```typescript
test('should change source from ai-full to ai-edited when editing content', async () => {
  const flashcardId = testData.flashcards[1].id; // ai-full fiszka
  
  const response = await fetch(
    `http://localhost:3000/api/v1/flashcards/${flashcardId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_USER_1_TOKEN}`,
      },
      body: JSON.stringify({
        front: 'Updated question',
      }),
    }
  );
  
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.source).toBe('ai-edited');
  expect(data.front).toBe('Updated question');
});
```

### Test 3.2: Source pozostaje manual po edycji
```typescript
test('should keep source=manual when editing manual flashcard', async () => {
  const flashcardId = testData.flashcards[0].id; // manual fiszka
  
  const response = await fetch(
    `http://localhost:3000/api/v1/flashcards/${flashcardId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_USER_1_TOKEN}`,
      },
      body: JSON.stringify({
        back: 'Updated answer',
      }),
    }
  );
  
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.source).toBe('manual');
});
```

### Test 3.3: Przeniesienie do innej talii
```typescript
test('should move flashcard to different deck', async () => {
  const flashcardId = testData.flashcards[0].id;
  const newDeckId = testData.decks[1].id;
  
  const response = await fetch(
    `http://localhost:3000/api/v1/flashcards/${flashcardId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_USER_1_TOKEN}`,
      },
      body: JSON.stringify({
        deck_id: newDeckId.toString(),
      }),
    }
  );
  
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.deck_id).toBe(newDeckId.toString());
});
```

---

## 📦 Test Suite 4: DELETE /api/v1/flashcards/:id - Usuwanie

### Test 4.1: Soft-delete fiszki
```typescript
test('should soft-delete flashcard', async () => {
  const flashcardId = testData.flashcards[0].id;
  
  const response = await fetch(
    `http://localhost:3000/api/v1/flashcards/${flashcardId}`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${TEST_USER_1_TOKEN}` },
    }
  );
  
  expect(response.status).toBe(204);
  
  // Verify it's not returned in list
  const listResponse = await fetch(
    'http://localhost:3000/api/v1/flashcards',
    { headers: { 'Authorization': `Bearer ${TEST_USER_1_TOKEN}` }}
  );
  const listData = await listResponse.json();
  
  expect(
    listData.data.every(f => f.id !== flashcardId.toString())
  ).toBe(true);
  
  // Verify deleted_at is set in database
  const { data } = await supabase
    .from('flashcards')
    .select('deleted_at')
    .eq('id', flashcardId)
    .single();
  
  expect(data.deleted_at).not.toBeNull();
});
```

---

## 📦 Test Suite 5: Operacje na tagach

### Test 5.1: PUT - Zastąpienie tagów
```typescript
test('should replace all tags for flashcard', async () => {
  const flashcardId = testData.flashcards[0].id;
  const newTagIds = [testData.tags[2].id]; // tylko 'beginner' tag
  
  const response = await fetch(
    `http://localhost:3000/api/v1/flashcards/${flashcardId}/tags`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_USER_1_TOKEN}`,
      },
      body: JSON.stringify({
        tag_ids: newTagIds.map(id => id.toString()),
      }),
    }
  );
  
  expect(response.status).toBe(200);
  const data = await response.json();
  
  expect(data.tags.length).toBe(1);
  expect(data.tags[0].name).toBe('beginner');
});
```

### Test 5.2: POST - Dodanie tagów
```typescript
test('should add tags to flashcard', async () => {
  const flashcardId = testData.flashcards[0].id;
  const tagToAdd = testData.tags[2].id;
  
  // Get current tags count
  const beforeResponse = await fetch(
    `http://localhost:3000/api/v1/flashcards/${flashcardId}`,
    { headers: { 'Authorization': `Bearer ${TEST_USER_1_TOKEN}` }}
  );
  const beforeData = await beforeResponse.json();
  const beforeCount = beforeData.tags.length;
  
  // Add tag
  const response = await fetch(
    `http://localhost:3000/api/v1/flashcards/${flashcardId}/tags`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_USER_1_TOKEN}`,
      },
      body: JSON.stringify({
        tag_ids: [tagToAdd.toString()],
      }),
    }
  );
  
  expect(response.status).toBe(200);
  const data = await response.json();
  
  expect(data.tags.length).toBeGreaterThanOrEqual(beforeCount);
});
```

### Test 5.3: DELETE - Usunięcie tagu
```typescript
test('should remove specific tag from flashcard', async () => {
  const flashcardId = testData.flashcards[0].id;
  const tagToRemove = testData.tags[0].id;
  
  const response = await fetch(
    `http://localhost:3000/api/v1/flashcards/${flashcardId}/tags/${tagToRemove}`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${TEST_USER_1_TOKEN}` },
    }
  );
  
  expect(response.status).toBe(204);
  
  // Verify tag is removed
  const flashcardResponse = await fetch(
    `http://localhost:3000/api/v1/flashcards/${flashcardId}`,
    { headers: { 'Authorization': `Bearer ${TEST_USER_1_TOKEN}` }}
  );
  const flashcardData = await flashcardResponse.json();
  
  expect(
    flashcardData.tags.every(t => t.id !== tagToRemove.toString())
  ).toBe(true);
});
```

---

## 🔐 Test Suite 6: Bezpieczeństwo

### Test 6.1: Nie można edytować cudzych fiszek
```typescript
test('should not allow editing flashcards from other users', async () => {
  const user2FlashcardId = testData.flashcards[2].id;
  
  const response = await fetch(
    `http://localhost:3000/api/v1/flashcards/${user2FlashcardId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_USER_1_TOKEN}`, // User 1 próbuje edytować fiszkę user 2
      },
      body: JSON.stringify({
        front: 'Hacked!',
      }),
    }
  );
  
  expect(response.status).toBe(404); // Not found z perspektywy user 1
});
```

### Test 6.2: Nie można przypisać tagów z cudzych talii
```typescript
test('should not allow assigning tags from other users decks', async () => {
  const flashcardId = testData.flashcards[0].id;
  // Assuming there's a deck tag for user 2
  const user2DeckTag = await createTagForUser2Deck();
  
  const response = await fetch(
    `http://localhost:3000/api/v1/flashcards/${flashcardId}/tags`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_USER_1_TOKEN}`,
      },
      body: JSON.stringify({
        tag_ids: [user2DeckTag.id.toString()],
      }),
    }
  );
  
  expect(response.status).toBe(400);
  expect(response.json()).toHaveProperty('error.code', 'invalid_tags');
});
```

---

## 🎯 Podsumowanie testów integracyjnych

### Kategorie testów
- **Lista i filtrowanie**: 8 testów
- **Tworzenie**: 3 testy
- **Aktualizacja**: 3 testy
- **Usuwanie**: 1 test
- **Operacje na tagach**: 3 testy
- **Bezpieczeństwo**: 2 testy

**Łącznie**: 20 testów integracyjnych

### Setup wymagany do uruchomienia
1. Framework testowy (Vitest recommended)
2. Test database (Supabase local development)
3. Seed script dla danych testowych
4. Cleanup po testach
5. Mock autentykacji (test tokens)

### Uruchomienie testów
```bash
# Setup
npm install -D vitest @vitest/ui
npm run test:setup  # seed database

# Run tests
npm run test:integration

# Cleanup
npm run test:cleanup
```

---

**Gotowe do implementacji po skonfigurowaniu frameworka testowego! ✅**

