# Plan implementacji widoku Szczegóły talii

## 1. Przegląd

Widok Szczegóły talii pozwala użytkownikom na szczegółowe zarządzanie pojedynczą talią fiszek. Użytkownicy mogą przeglądać wszystkie fiszki w talii, stosować zaawansowane filtry i wyszukiwanie, tworzyć nowe fiszki oraz wykonywać operacje CRUD na istniejących fiszkach. Widok implementuje paginację, sortowanie i wielopoziomowe filtrowanie dla efektywnego zarządzania dużymi zbiorami fiszek.

## 2. Routing widoku

Widok jest dostępny pod ścieżką:
- `/decks/:id` - gdzie `:id` to identyfikator talii (BIGINT)

Wymagania:
- Parametr `id` musi być prawidłowym BIGINT
- Użytkownik musi być właścicielem talii (ownership validation)
- Przekierowanie na `/` jeśli talia nie istnieje lub brak dostępu

## 3. Struktura komponentów

```
DeckDetailsPage (główny komponent)
├── Header
│   ├── Breadcrumbs (Dashboard > [Deck Name])
│   ├── DeckInfo (nazwa, opis, statystyki)
│   ├── ActionButtons (edit deck, create flashcard)
│   └── BackButton
├── FiltersPanel
│   ├── SearchInput (pełnotekstowe wyszukiwanie)
│   ├── FilterControls
│   │   ├── SourceFilter (manual, ai-full, ai-edited)
│   │   ├── TagFilter (multiple tags)
│   │   └── DateRangePicker
│   ├── SortControls (created_at, updated_at)
│   ├── OrderToggle (asc/desc)
│   └── ClearFiltersButton
├── FlashcardGrid
│   ├── FlashcardPreview (powtarzany dla każdej fiszki)
│   │   ├── FrontPreview (truncated)
│   │   ├── BackPreview (truncated)
│   │   ├── TagDisplay (list of tags)
│   │   ├── Metadata (source, created_at)
│   │   └── ActionButtons (view, edit, delete)
│   └── EmptyState (jeśli brak fiszek po filtrach)
├── PaginationControls
│   ├── PageNumbers
│   ├── Prev/Next buttons
│   └── ItemsPerPage selector
├── CreateFlashcardModal
│   ├── Form fields (front, back, deck selection)
│   ├── TagSelector (add tags during creation)
│   ├── Validation messages
│   └── Submit/Cancel buttons
├── EditFlashcardModal
│   ├── Form fields (front, back, deck selection)
│   ├── TagManager (edit tags)
│   ├── Validation messages
│   └── Submit/Cancel buttons
├── DeleteFlashcardModal
│   ├── Confirmation message
│   └── Confirm/Cancel buttons
└── LoadingStates i ErrorMessages
```

## 4. Szczegóły komponentów

### DeckDetailsPage

- **Opis komponentu**: Główny kontener widoku szczegółów talii, zarządza ładowaniem danych talii i fiszek, koordynuje wszystkie podkomponenty i obsługuje nawigację.

- **Główne elementy**:
  - Header z informacjami o talii i akcjami
  - FiltersPanel dla wyszukiwania i filtrowania
  - FlashcardGrid jako główna lista zawartości
  - PaginationControls dla nawigacji
  - Modals dla operacji CRUD na fiszkach

- **Obsługiwane interakcje**:
  - onMount: ładowanie danych talii i pierwszej strony fiszek
  - onFiltersChange: ponowne ładowanie fiszek z nowymi filtrami
  - onPageChange: zmiana strony z paginacją
  - onFlashcardAction: obsługa akcji na fiszkach (view, edit, delete, create)
  - onBack: nawigacja do dashboard
  - onEditDeck: nawigacja do edycji talii

- **Obsługiwana walidacja**:
  - Deck ID validation (BIGINT, required)
  - Deck ownership verification
  - Business rules (flashcard operations tylko dla własnych fiszek)

- **Typy**:
  - `DeckDetailsState`
  - `DeckDetailsPageProps`

- **Propsy**:
  ```typescript
  interface DeckDetailsPageProps {
    params: { id: string };
    searchParams?: URLSearchParams; // dla initial filters
  }
  ```

### FiltersPanel

- **Opis komponentu**: Zaawansowany panel filtrów umożliwiający wielopoziomowe filtrowanie fiszek z debounced search dla optymalizacji.

- **Główne elementy**:
  - Search input z pełnotekstowym wyszukiwaniem
  - Multi-select dla tagów
  - Radio buttons dla source (manual, ai-full, ai-edited)
  - Date range picker dla filtracji czasowej
  - Sort controls z toggle asc/desc
  - Clear all filters button
  - Active filters summary

- **Obsługiwane interakcje**:
  - onSearchInput: debounced update (300ms) filtra wyszukiwania
  - onTagToggle: dodanie/usunięcie tagu z filtra
  - onSourceChange: zmiana filtra źródła
  - onDateRangeChange: ustawienie zakresu dat
  - onSortChange: natychmiastowa zmiana sortowania
  - onClearFilters: reset wszystkich filtrów

- **Obsługiwana walidacja**:
  - Search query: max 200 znaków, sanityzacja
  - Tag IDs: validation czy użytkownik ma dostęp do tagów
  - Source: enum validation
  - Date range: valid date format, from <= to

- **Typy**:
  - `FlashcardFilters`
  - `FiltersPanelProps`

- **Propsy**:
  ```typescript
  interface FiltersPanelProps {
    filters: FlashcardFilters;
    availableTags: TagWithUsageDto[];
    onFiltersChange: (filters: FlashcardFilters) => void;
    isLoading?: boolean;
  }
  ```

### FlashcardGrid

- **Opis komponentu**: Główna lista fiszek wyświetlana jako grid lub lista kart. Obsługuje virtual scrolling dla dużych zbiorów.

- **Główne elementy**:
  - Responsive grid container
  - FlashcardPreview dla każdej fiszki
  - EmptyState z różnymi wariantami (no flashcards, no results after filtering)
  - Loading skeleton cards
  - Virtual scrolling container (opcjonalnie)

- **Obsługiwane interakcje**:
  - onFlashcardClick: nawigacja do szczegółów fiszki
  - onEditFlashcard: otwarcie modalu edycji
  - onDeleteFlashcard: otwarcie modalu usunięcia
  - onCreateFlashcard: otwarcie modalu tworzenia

- **Obsługiwana walidacja**:
  - Sprawdzenie czy użytkownik jest właścicielem fiszek
  - Walidacja indeksów dla paginacji

- **Typy**:
  - `FlashcardGridProps`
  - `FlashcardAction`

- **Propsy**:
  ```typescript
  interface FlashcardGridProps {
    flashcards: FlashcardDto[];
    isLoading: boolean;
    onFlashcardAction: (action: FlashcardAction, flashcard: FlashcardDto) => void;
  }
  ```

### FlashcardPreview

- **Opis komponentu**: Kompaktowa karta podglądu pojedynczej fiszki z podstawowymi informacjami i akcjami.

- **Główne elementy**:
  - Front side preview (truncated do 100 znaków)
  - Back side preview (truncated do 100 znaków)
  - Tag badges z kolorami
  - Metadata (source indicator, creation date)
  - Action menu (view, edit, delete)
  - Quick flip button (toggle front/back)

- **Obsługiwane interakcje**:
  - onView: nawigacja do pełnych szczegółów
  - onEdit: trigger edycji fiszki
  - onDelete: trigger usunięcia fiszki
  - onFlip: toggle między front/back preview
  - onTagClick: filtrowanie po tym tagu

- **Obsługiwana walidacja**:
  - Sprawdzenie czy użytkownik jest właścicielem fiszki
  - Walidacja source enum
  - Tag accessibility validation

- **Typy**:
  - `FlashcardPreviewProps`
  - `PreviewMode` ('front' | 'back')

- **Propsy**:
  ```typescript
  interface FlashcardPreviewProps {
    flashcard: FlashcardDto;
    onAction: (action: FlashcardAction, flashcard: FlashcardDto) => void;
    initialMode?: PreviewMode;
  }
  ```

### CreateFlashcardModal

- **Opis komponentu**: Modal do tworzenia nowej fiszki w bieżącej talii z możliwością przypisania tagów.

- **Główne elementy**:
  - Modal dialog z form
  - Textarea front (required, 1-200 chars, auto-resize)
  - Textarea back (required, 1-500 chars, auto-resize)
  - Deck selector (pre-selected na current deck, możliwość zmiany)
  - Tag selector (multi-select z available tags)
  - Character counters dla front/back
  - Submit/Cancel buttons

- **Obsługiwane interakcje**:
  - onSubmit: tworzenie fiszki przez API
  - onCancel: zamknięcie modalu z potwierdzeniem jeśli wprowadzono zmiany
  - onFrontChange: real-time walidacja i character count
  - onBackChange: real-time walidacja i character count
  - onDeckChange: walidacja ownership
  - onTagToggle: dodanie/usunięcie tagu

- **Obsługiwana walidacja**:
  - Front: required, 1-200 chars, trimmed
  - Back: required, 1-500 chars, trimmed
  - Deck: required, ownership validation
  - Tags: optional, accessibility validation
  - Cross-field: wszystkie wymagane pola muszą być poprawne

- **Typy**:
  - `CreateFlashcardFormData`
  - `CreateFlashcardModalProps`

- **Propsy**:
  ```typescript
  interface CreateFlashcardModalProps {
    isOpen: boolean;
    currentDeck: DeckDto;
    availableDecks: DeckDto[];
    availableTags: TagWithUsageDto[];
    onClose: () => void;
    onSuccess: (flashcard: FlashcardDto) => void;
  }
  ```

### EditFlashcardModal

- **Opis komponentu**: Modal do edycji istniejącej fiszki z logiką source transition i zarządzaniem tagami.

- **Główne elementy**:
  - Modal dialog z form
  - Textarea front (required, pre-filled)
  - Textarea back (required, pre-filled)
  - Deck selector (możliwość przeniesienia do innej talii)
  - TagManager z aktualną listą tagów
  - Source indicator z wyjaśnieniem transition logic
  - Submit/Cancel buttons

- **Obsługiwane interakcje**:
  - onSubmit: aktualizacja fiszki z source transition
  - onCancel: zamknięcie modalu
  - onFieldChange: tracking zmian dla source logic
  - onDeckChange: walidacja nowego deck ownership
  - onTagChange: update tag associations

- **Obsługiwana walidacja**:
  - Identyczna jak CreateFlashcardModal
  - Additional: source transition validation
  - Tag ownership validation

- **Typy**:
  - `EditFlashcardFormData`
  - `EditFlashcardModalProps`

- **Propsy**:
  ```typescript
  interface EditFlashcardModalProps {
    isOpen: boolean;
    flashcard: FlashcardDto;
    availableDecks: DeckDto[];
    availableTags: TagWithUsageDto[];
    onClose: () => void;
    onSuccess: (flashcard: FlashcardDto) => void;
  }
  ```

### DeleteFlashcardModal

- **Opis komponentu**: Prosty modal potwierdzenia usunięcia fiszki z informacją o soft delete.

- **Główne elementy**:
  - Confirmation message
  - Flashcard preview (front/back)
  - Warning o nieodwracalnym usunięciu
  - Confirm/Cancel buttons

- **Obsługiwane interakcje**:
  - onConfirm: wykonanie soft delete
  - onCancel: zamknięcie modalu

- **Obsługiwana walidacja**:
  - Sprawdzenie czy użytkownik jest właścicielem fiszki
  - Potwierdzenie przez użytkownika

- **Typy**:
  - `DeleteFlashcardModalProps`

- **Propsy**:
  ```typescript
  interface DeleteFlashcardModalProps {
    isOpen: boolean;
    flashcard: FlashcardDto | null;
    onClose: () => void;
    onConfirm: () => Promise<void>;
  }
  ```

## 5. Typy

### ViewModel Types
```typescript
interface DeckDetailsState {
  deck: DeckDto | null;
  flashcards: FlashcardDto[];
  pagination: PaginationMeta;
  filters: FlashcardFilters;
  isLoading: boolean;
  error: ErrorResponse | null;
  modals: {
    create: boolean;
    edit: { isOpen: boolean; flashcard: FlashcardDto | null };
    delete: { isOpen: boolean; flashcard: FlashcardDto | null };
  };
}

interface FlashcardFilters {
  deck_id?: string;
  source?: FlashcardSource;
  tag_ids?: string[];
  search?: string;
  date_from?: Date;
  date_to?: Date;
  sort: FlashcardSortField;
  order: SortOrder;
}

type FlashcardAction = 'view' | 'edit' | 'delete' | 'create';
type PreviewMode = 'front' | 'back';
```

### Form Types
```typescript
interface CreateFlashcardFormData {
  front: string;
  back: string;
  deck_id: string;
  tag_ids: string[];
}

interface EditFlashcardFormData extends CreateFlashcardFormData {
  id: string;
  currentSource: FlashcardSource;
}

interface CreateFlashcardFormErrors {
  front?: string;
  back?: string;
  deck_id?: string;
  tag_ids?: string;
  general?: string;
}

interface EditFlashcardFormErrors extends CreateFlashcardFormErrors {
  source_transition?: string;
}
```

### Component Props Types
```typescript
interface DeckDetailsPageProps {
  params: { id: string };
  searchParams?: URLSearchParams;
}

interface FiltersPanelProps {
  filters: FlashcardFilters;
  availableTags: TagWithUsageDto[];
  onFiltersChange: (filters: FlashcardFilters) => void;
  isLoading?: boolean;
}

interface FlashcardGridProps {
  flashcards: FlashcardDto[];
  isLoading: boolean;
  onFlashcardAction: (action: FlashcardAction, flashcard: FlashcardDto) => void;
}

interface FlashcardPreviewProps {
  flashcard: FlashcardDto;
  onAction: (action: FlashcardAction, flashcard: FlashcardDto) => void;
  initialMode?: PreviewMode;
}

interface CreateFlashcardModalProps {
  isOpen: boolean;
  currentDeck: DeckDto;
  availableDecks: DeckDto[];
  availableTags: TagWithUsageDto[];
  onClose: () => void;
  onSuccess: (flashcard: FlashcardDto) => void;
}

interface EditFlashcardModalProps {
  isOpen: boolean;
  flashcard: FlashcardDto;
  availableDecks: DeckDto[];
  availableTags: TagWithUsageDto[];
  onClose: () => void;
  onSuccess: (flashcard: FlashcardDto) => void;
}

interface DeleteFlashcardModalProps {
  isOpen: boolean;
  flashcard: FlashcardDto | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}
```

### Enums and Constants
```typescript
const FLASHCARDS_PER_PAGE_OPTIONS = [10, 20, 50, 100] as const;
const DEFAULT_FLASHCARDS_PER_PAGE = 20;
const MAX_SEARCH_LENGTH = 200;
const PREVIEW_TRUNCATE_LENGTH = 100;
```

## 6. Zarządzanie stanem

### useDeckDetails Hook
Custom hook zarządzający stanem widoku szczegółów talii:
```typescript
interface UseDeckDetailsReturn {
  // State
  deck: DeckDto | null;
  flashcards: FlashcardDto[];
  pagination: PaginationMeta;
  filters: FlashcardFilters;
  isLoading: boolean;
  error: ErrorResponse | null;

  // Modal states
  createModalOpen: boolean;
  editModalState: { isOpen: boolean; flashcard: FlashcardDto | null };
  deleteModalState: { isOpen: boolean; flashcard: FlashcardDto | null };

  // Available data
  availableDecks: DeckDto[];
  availableTags: TagWithUsageDto[];

  // Actions
  setFilters: (filters: FlashcardFilters) => void;
  loadDeck: (deckId: string) => Promise<void>;
  loadFlashcards: () => Promise<void>;
  createFlashcard: (data: CreateFlashcardCommand) => Promise<FlashcardDto>;
  updateFlashcard: (id: string, updates: UpdateFlashcardCommand) => Promise<FlashcardDto>;
  deleteFlashcard: (id: string) => Promise<void>;

  // Modal actions
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openEditModal: (flashcard: FlashcardDto) => void;
  closeEditModal: () => void;
  openDeleteModal: (flashcard: FlashcardDto) => void;
  closeDeleteModal: () => void;
}
```

### Stan lokalny komponentów
- **Form states**: react-hook-form dla Create/Edit modals
- **Preview states**: toggle między front/back w FlashcardPreview
- **Filter states**: complex multi-level filters
- **Loading states**: granular loading dla różnych akcji

### Stan URL
- **Query parameters**: filters persistowane w URL dla bookmarkability
- **Pagination**: page i limit w URL
- **Search params**: search, sort, order w URL

## 7. Integracja API

### GET /api/v1/decks/:id (Szczegóły talii)
**Request**:
```typescript
GET /api/v1/decks/123
Authorization: Bearer {access_token}
```

**Response** (200 OK):
```json
{
  "id": "123",
  "name": "Programming",
  "description": "CS flashcards",
  "visibility": "private",
  "is_default": false,
  "flashcard_count": 42,
  "created_at": "2025-11-16T10:00:00Z",
  "updated_at": "2025-11-16T10:00:00Z"
}
```

**Integration**: Wywołanie w `useDeckDetails.loadDeck()`

### GET /api/v1/flashcards (Lista fiszek z filtrami)
**Request**:
```typescript
GET /api/v1/flashcards?deck_id=123&source=manual&tag_id=456&search=python&sort=created_at&order=desc&page=1&limit=20
Authorization: Bearer {access_token}
```

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "string",
      "deck_id": "123",
      "front": "What is Python?",
      "back": "A programming language",
      "source": "manual",
      "generation_id": null,
      "created_at": "2025-11-16T10:00:00Z",
      "updated_at": "2025-11-16T10:00:00Z",
      "tags": [
        {
          "id": "456",
          "name": "programming",
          "scope": "deck"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

**Integration**: Wywołanie w `useDeckDetails.loadFlashcards()`

### POST /api/v1/flashcards (Tworzenie fiszki)
**Request**:
```json
{
  "deck_id": "123",
  "front": "What is Python?",
  "back": "A programming language"
}
```

**Response** (201 Created):
```json
{
  "id": "789",
  "deck_id": "123",
  "front": "What is Python?",
  "back": "A programming language",
  "source": "manual",
  "generation_id": null,
  "created_at": "2025-11-16T10:00:00Z",
  "updated_at": "2025-11-16T10:00:00Z"
}
```

**Integration**: Wywołanie w `CreateFlashcardModal.onSubmit`

### PATCH /api/v1/flashcards/:id (Aktualizacja fiszki)
**Request**:
```json
{
  "front": "Updated question",
  "back": "Updated answer",
  "deck_id": "123"
}
```

**Response** (200 OK):
```json
{
  "id": "789",
  "deck_id": "123",
  "front": "Updated question",
  "back": "Updated answer",
  "source": "ai-edited",
  "generation_id": "999",
  "created_at": "2025-11-16T10:00:00Z",
  "updated_at": "2025-11-16T10:05:00Z"
}
```

**Integration**: Wywołanie w `EditFlashcardModal.onSubmit`

### DELETE /api/v1/flashcards/:id (Usuwanie fiszki)
**Response** (204 No Content)

**Integration**: Wywołanie w `DeleteFlashcardModal.onConfirm`

## 8. Interakcje użytkownika

### Navigation
- **Breadcrumbs**: Click na "Dashboard" → powrót do listy talii
- **FlashcardPreview click**: Przejście do `/decks/:deckId/flashcards/:id`
- **Pagination**: Natychmiastowa zmiana strony
- **Filters**: Debounced search, natychmiastowe inne filtry

### Keyboard Shortcuts
- **Ctrl+F**: Focus na search input
- **Ctrl+N**: Otwarcie modalu tworzenia fiszki
- **Enter**: Submit formy
- **Escape**: Zamknięcie modali
- **Arrow keys**: Nawigacja między FlashcardPreview

### Visual Feedback
- **Hover effects**: Podświetlenie kart i przycisków
- **Active filters**: Visual indicators dla aktywnych filtrów
- **Loading skeletons**: Podczas ładowania nowych danych
- **Source indicators**: Color-coded badges (manual=gray, ai-full=blue, ai-edited=purple)

### Progressive Enhancement
- **URL persistence**: Filtry zapisane w URL dla bookmarkability
- **Infinite scroll**: Opcjonalnie dla mobile devices
- **Offline indicators**: Warning przy network errors

### Accessibility
- **ARIA labels**: Wszystkie interactive elements
- **Screen reader**: Announcements dla dynamic content
- **Focus management**: Proper focus flow w modalach
- **High contrast**: Support dla accessibility themes

## 9. Warunki i walidacja

### Front/Back Content Validation
```typescript
const frontSchema = z.string()
  .min(1, "Pytanie jest wymagane")
  .max(200, "Pytanie nie może być dłuższe niż 200 znaków")
  .transform(content => content.trim());

const backSchema = z.string()
  .min(1, "Odpowiedź jest wymagana")
  .max(500, "Odpowiedź nie może być dłuższa niż 500 znaków")
  .transform(content => content.trim());
```

### Deck Selection Validation
```typescript
const deckIdSchema = z.string()
  .min(1, "Talia jest wymagana")
  .refine(async (deckId) => {
    // Custom validation: check ownership
    return await verifyDeckOwnership(deckId, userId);
  }, "Nie masz dostępu do tej talii");
```

### Tag Selection Validation
```typescript
const tagIdsSchema = z.array(z.string())
  .optional()
  .refine(async (tagIds) => {
    if (!tagIds) return true;
    // Custom validation: check accessibility
    return await verifyTagsAccessible(tagIds, userId);
  }, "Nie masz dostępu do niektórych tagów");
```

### Search and Filters Validation
```typescript
const searchSchema = z.string()
  .max(200, "Wyszukiwanie nie może być dłuższe niż 200 znaków")
  .transform(query => query.trim());

const filtersSchema = z.object({
  source: z.enum(['manual', 'ai-full', 'ai-edited']).optional(),
  tag_ids: z.array(z.string()).optional(),
  search: searchSchema.optional(),
  sort: z.enum(['created_at', 'updated_at']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});
```

### Source Transition Validation
```typescript
// Business logic validation
const validateSourceTransition = (
  currentSource: FlashcardSource,
  frontChanged: boolean,
  backChanged: boolean
): FlashcardSource => {
  if (currentSource === 'ai-full' && (frontChanged || backChanged)) {
    return 'ai-edited';
  }
  return currentSource; // manual and ai-edited remain unchanged
};
```

### Real-time Validation
- **OnChange**: Basic format validation i character counts
- **OnBlur**: Full validation z error messages
- **OnSubmit**: Complete validation przed API call
- **Cross-field**: Tag accessibility, deck ownership

### Business Rules Validation
- Users can only see/modify flashcards in decks they own
- Users can only assign tags they have access to (global + own deck tags)
- Source transition follows strict business logic
- Soft delete preserves data integrity

## 10. Obsługa błędów

### API Errors
- **400 Bad Request**: Highlight invalid fields, show validation messages
- **401 Unauthorized**: Redirect to login
- **404 Not Found**: "Fiszka/talia nie została znaleziona"
- **409 Conflict**: "Nazwa tagu już istnieje" (dla tag operations)
- **500 Internal Error**: Generic error with retry option

### Network Errors
- **Timeout**: "Przekroczono czas oczekiwania. Spróbuj ponownie."
- **Connection failed**: "Brak połączenia z internetem."
- **Retry logic**: Exponential backoff, max 3 retries

### Validation Errors
- **Field-level**: Red borders + error messages pod polami
- **Form-level**: Alert banner na górze modalu
- **Inline**: Character counters, format hints
- **Clear on interaction**: Errors znikają gdy użytkownik zaczyna poprawiać

### Business Logic Errors
- **Deck ownership**: "Nie masz dostępu do tej talii"
- **Tag accessibility**: "Nie masz dostępu do tego tagu"
- **Source transition**: Informational message o zmianie source

### User Experience
- **Progressive disclosure**: Errors revealed kontekstowo
- **Helpful messages**: Actionable error descriptions
- **Recovery actions**: Clear paths to fix issues
- **Graceful degradation**: Fallback UI dla error states

### Edge Cases
- **Empty deck**: Special empty state z call-to-action
- **Filtered to empty**: "Brak fiszek spełniających kryteria"
- **Large content**: Textarea auto-resize, scroll for long content
- **Many tags**: Tag selector z search i pagination

## 11. Kroki implementacji

### Krok 1: Setup projektu i dependencies
1. Utwórz strukturę katalogów `/src/components/deck-details/`
2. Zainstaluj dodatkowe dependencies:
   - `react-hook-form` dla form management
   - `date-fns` dla date handling (jeśli potrzebne)
   - `@headlessui/react` dla advanced select components

### Krok 2: Implementacja typów i schematów walidacji
1. Utwórz `/src/lib/validation/deck-details.ts`
2. Zdefiniuj Zod schemas dla wszystkich form i filters
3. Utwórz TypeScript interfaces dla ViewModels i propsów

### Krok 3: Implementacja useDeckDetails hook
1. Utwórz `/src/lib/hooks/useDeckDetails.ts`
2. Zaimplementuj kompleksowy stan zarządzania
3. Dodaj API integration functions
4. Implementuj filter persistence w URL

### Krok 4: Implementacja FiltersPanel
1. Utwórz `FiltersPanel.tsx` z advanced filtering
2. Zaimplementuj debounced search
3. Dodaj multi-select dla tagów
4. Zintegruj date range picker jeśli potrzebne

### Krok 5: Implementacja FlashcardPreview
1. Utwórz `FlashcardPreview.tsx` z flip functionality
2. Dodaj tag display i metadata
3. Implementuj action menu
4. Dodaj responsive design

### Krok 6: Implementacja FlashcardGrid
1. Utwórz `FlashcardGrid.tsx` z responsive layout
2. Dodaj empty states i loading skeletons
3. Implementuj virtual scrolling dla performance
4. Dodaj pagination integration

### Krok 7: Implementacja modali
1. Utwórz `CreateFlashcardModal.tsx` z form walidacją
2. Utwórz `EditFlashcardModal.tsx` z source transition
3. Utwórz `DeleteFlashcardModal.tsx` z confirmation
4. Dodaj TagManager dla edycji tagów

### Krok 8: Implementacja głównego DeckDetailsPage
1. Utwórz główny komponent integrujący wszystkie części
2. Dodaj deck loading i ownership verification
3. Implementuj URL state management
4. Dodaj breadcrumbs i navigation

### Krok 9: Implementacja strony Astro
1. Utwórz `/src/pages/decks/[id].astro`
2. Dodaj client directives dla React components
3. Skonfiguruj dynamic routing
4. Dodaj meta tags i SEO

### Krok 10: Stylizacja i responsive design
1. Zastosuj Tailwind CSS zgodnie z design system
2. Zaimplementuj mobile-first approach
3. Dodaj smooth transitions i animations
4. Zapewnij consistency z dashboard

### Krok 11: Testowanie i optymalizacja
1. Unit tests dla hooków i komponentów
2. Integration tests dla pełnych flows
3. Performance testing dla dużych list fiszek
4. Accessibility testing z axe-core
5. Memory leak testing dla virtual scrolling
