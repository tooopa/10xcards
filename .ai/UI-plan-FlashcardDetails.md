# Plan implementacji widoku Szczegóły fiszki

## 1. Przegląd

Widok Szczegóły fiszki umożliwia użytkownikom szczegółowe przeglądanie i edycję pojedynczej fiszki. Użytkownicy mogą zobaczyć pełną zawartość front/back, metadane (źródło, data utworzenia), zarządzać tagami oraz wykonywać operacje edycji z zachowaniem logiki przejścia między źródłami (source transition). Widok zapewnia intuicyjny interfejs do nauki z możliwością odwrócenia karty oraz nawigacji między fiszkami w talii.

## 2. Routing widoku

Widok jest dostępny pod ścieżką:
- `/decks/:deckId/flashcards/:flashcardId` - gdzie:
  - `:deckId` - identyfikator talii (BIGINT)
  - `:flashcardId` - identyfikator fiszki (BIGINT)

Wymagania:
- Oba parametry muszą być prawidłowymi BIGINT
- Użytkownik musi być właścicielem fiszki (ownership validation)
- Deck ID może być opcjonalny dla cross-deck navigation
- Przekierowanie na `/decks/:deckId` jeśli fiszka nie istnieje lub brak dostępu

## 3. Struktura komponentów

```
FlashcardDetailsPage (główny komponent)
├── Header
│   ├── Breadcrumbs (Dashboard > [Deck Name] > [Flashcard Preview])
│   ├── NavigationControls
│   │   ├── PrevFlashcardButton
│   │   ├── NextFlashcardButton
│   │   └── BackToDeckButton
│   └── ActionButtons (Edit, Delete)
├── FlashcardDetailView (główna zawartość)
│   ├── FlashcardCard
│   │   ├── CardContainer (flip animation)
│   │   ├── FrontSide
│   │   │   ├── Content (scrollable text)
│   │   │   └── FlipHint
│   │   └── BackSide
│   │       ├── Content (scrollable text)
│   │       └── FlipHint
│   ├── CardControls
│   │   ├── FlipButton
│   │   ├── AutoFlipToggle (on/off)
│   │   └── SoundToggle (future)
│   ├── MetadataPanel
│   │   ├── SourceIndicator (manual/ai-full/ai-edited)
│   │   ├── CreationInfo (date, author)
│   │   ├── GenerationInfo (jeśli AI)
│   │   └── DeckInfo (link to deck)
│   └── TagDisplay (read-only tag list)
├── TagManager (sidebar/panel)
│   ├── CurrentTagsList
│   ├── AddTagSection
│   │   ├── TagSearchInput
│   │   ├── AvailableTagsList
│   │   └── CreateNewTagButton
│   └── TagActions (remove individual tags)
├── EditFlashcardModal
│   ├── Form fields (front, back, deck selection)
│   ├── TagManager (embedded)
│   ├── SourceTransitionWarning
│   ├── Validation messages
│   └── Submit/Cancel buttons
├── DeleteFlashcardModal
│   ├── Confirmation message
│   ├── Flashcard preview
│   └── Confirm/Cancel buttons
└── LoadingStates i ErrorMessages
```

## 4. Szczegóły komponentów

### FlashcardDetailsPage

- **Opis komponentu**: Główny kontener widoku szczegółów fiszki, zarządza ładowaniem danych fiszki, talii i sąsiednich fiszek dla nawigacji, koordynuje wszystkie podkomponenty.

- **Główne elementy**:
  - Header z breadcrumbs i nawigacją
  - Główna zawartość z FlashcardDetailView
  - Sidebar z TagManager
  - Modals dla edycji i usunięcia

- **Obsługiwane interakcje**:
  - onMount: ładowanie danych fiszki, talii i kontekstu nawigacji
  - onFlipCard: animacja odwrócenia karty
  - onNavigatePrev/Next: nawigacja między fiszkami
  - onEdit: otwarcie modalu edycji
  - onDelete: otwarcie modalu usunięcia
  - onTagAction: operacje na tagach
  - onBackToDeck: nawigacja do listy talii

- **Obsługiwana walidacja**:
  - Flashcard ID validation (BIGINT, required)
  - Deck ID validation (BIGINT, optional)
  - Ownership verification (user owns flashcard)
  - Navigation bounds checking

- **Typy**:
  - `FlashcardDetailsState`
  - `NavigationContext`
  - `FlashcardDetailsPageProps`

- **Propsy**:
  ```typescript
  interface FlashcardDetailsPageProps {
    params: {
      deckId: string;
      flashcardId: string;
    };
    searchParams?: URLSearchParams; // dla navigation context
  }
  ```

### FlashcardDetailView

- **Opis komponentu**: Główny komponent wyświetlający zawartość fiszki z animacją flip, metadanymi i kontrolami.

- **Główne elementy**:
  - Card container z 3D flip animation
  - Front side z zawartością i flip indicator
  - Back side z zawartością i flip indicator
  - Control buttons (flip, auto-flip toggle)
  - Metadata panel z informacjami o źródle i dacie
  - Tag display (read-only)

- **Obsługiwane interakcje**:
  - onFlip: toggle między front/back z animacją
  - onAutoFlipToggle: włączenie/wyłączenie auto-flip
  - onContentClick: również flip (oprócz przycisku)
  - onMetadataClick: expand/collapse metadata panel

- **Obsługiwana walidacja**:
  - Content length validation dla display
  - Source enum validation
  - Date format validation

- **Typy**:
  - `CardSide` ('front' | 'back')
  - `FlashcardDetailViewProps`

- **Propsy**:
  ```typescript
  interface FlashcardDetailViewProps {
    flashcard: FlashcardDto;
    isFlipped: boolean;
    autoFlipEnabled: boolean;
    onFlip: () => void;
    onAutoFlipToggle: (enabled: boolean) => void;
  }
  ```

### FlashcardCard

- **Opis komponentu**: Komponent reprezentujący fizyczną kartę z animacją flip między stronami front/back.

- **Główne elementy**:
  - 3D card container z CSS transforms
  - Front side panel z zawartością
  - Back side panel z zawartością
  - Flip animation trigger
  - Visual indicators (shadows, borders)

- **Obsługiwane interakcje**:
  - onClick: trigger flip animation
  - onFlipComplete: callback po zakończeniu animacji
  - onContentResize: adjust card height

- **Obsługiwana walidacja**:
  - Content overflow handling
  - Animation state consistency

- **Typy**:
  - `FlashcardCardProps`
  - `FlipState`

- **Propsy**:
  ```typescript
  interface FlashcardCardProps {
    flashcard: FlashcardDto;
    isFlipped: boolean;
    onFlip: () => void;
    onFlipComplete?: () => void;
    className?: string;
  }
  ```

### TagManager

- **Opis komponentu**: Komponent do zarządzania tagami fiszki z możliwością dodawania, usuwania i tworzenia nowych tagów.

- **Główne elementy**:
  - Current tags list z remove buttons
  - Add tag section z search
  - Available tags dropdown/list
  - Create new tag inline form
  - Tag usage counts i scopes

- **Obsługiwane interakcje**:
  - onRemoveTag: usunięcie tagu z fiszki
  - onAddTag: dodanie istniejącego tagu
  - onCreateTag: utworzenie nowego tagu i przypisanie
  - onTagSearch: filtrowanie dostępnych tagów

- **Obsługiwana walidacja**:
  - Tag name uniqueness within deck
  - Tag accessibility (global + user's deck tags)
  - Tag name length (1-50 chars)

- **Typy**:
  - `TagManagerProps`
  - `TagAction`

- **Propsy**:
  ```typescript
  interface TagManagerProps {
    flashcardId: string;
    currentTags: TagDto[];
    availableTags: TagWithUsageDto[];
    availableDecks: DeckDto[];
    onTagAction: (action: TagAction, tag: TagDto) => Promise<void>;
  }
  ```

### MetadataPanel

- **Opis komponentu**: Panel wyświetlający metadane fiszki w zorganizowany sposób.

- **Główne elementy**:
  - Source indicator z kolorowym badge
  - Creation date i czas
  - Author info (jeśli dostępne)
  - Generation info (jeśli AI-generated)
  - Deck info z linkiem
  - Update history (jeśli dostępne)

- **Obsługiwane interakcje**:
  - onDeckClick: nawigacja do talii
  - onGenerationClick: szczegóły generacji (future)
  - onExpand: toggle pełnych metadanych

- **Obsługiwana walidacja**:
  - Date format validation
  - URL generation for links

- **Typy**:
  - `MetadataPanelProps`

- **Propsy**:
  ```typescript
  interface MetadataPanelProps {
    flashcard: FlashcardDto;
    deck: DeckDto;
    onDeckClick: () => void;
    onGenerationClick?: (generationId: string) => void;
  }
  ```

### NavigationControls

- **Opis komponentu**: Komponent nawigacji między fiszkami w talii z przyciskami prev/next i breadcrumbs.

- **Główne elementy**:
  - Breadcrumbs (Dashboard > Deck > Flashcard)
  - Previous flashcard button
  - Next flashcard button
  - Current position indicator (1 of 25)
  - Back to deck button

- **Obsługiwane interakcje**:
  - onPrev: nawigacja do poprzedniej fiszki
  - onNext: nawigacja do następnej fiszki
  - onBreadcrumbClick: nawigacja do wyższego poziomu
  - onBackToDeck: powrót do listy talii

- **Obsługiwana walidacja**:
  - Navigation bounds (disable prev/next na końcach)
  - URL generation validation

- **Typy**:
  - `NavigationContext`
  - `NavigationControlsProps`

- **Propsy**:
  ```typescript
  interface NavigationControlsProps {
    navigation: NavigationContext;
    onNavigate: (direction: 'prev' | 'next' | 'deck') => void;
    onBreadcrumbClick: (level: 'dashboard' | 'deck') => void;
  }
  ```

### EditFlashcardModal

- **Opis komponentu**: Modal do edycji fiszki z pełną obsługą source transition logic i tag management.

- **Główne elementy**:
  - Form fields dla front/back
  - Deck selector (możliwość przeniesienia)
  - Embedded TagManager
  - Source transition warning/info
  - Character counters
  - Submit/Cancel buttons

- **Obsługiwane interakcje**:
  - onSubmit: aktualizacja z source transition
  - onFieldChange: tracking zmian dla source logic
  - onDeckChange: walidacja nowego deck ownership
  - onTagChange: update tag associations

- **Obsługiwana walidacja**:
  - Front: 1-200 chars, required
  - Back: 1-500 chars, required
  - Deck: ownership validation
  - Tags: accessibility validation
  - Source transition: automatic calculation

- **Typy**:
  - `EditFlashcardModalProps`
  - `EditFormData`

- **Propsy**:
  ```typescript
  interface EditFlashcardModalProps {
    isOpen: boolean;
    flashcard: FlashcardDto;
    availableDecks: DeckDto[];
    availableTags: TagWithUsageDto[];
    onClose: () => void;
    onSuccess: (updatedFlashcard: FlashcardDto) => void;
  }
  ```

### DeleteFlashcardModal

- **Opis komponentu**: Modal potwierdzenia usunięcia fiszki z preview zawartości.

- **Główne elementy**:
  - Confirmation message
  - Flashcard preview (front/back)
  - Soft delete info
  - Confirm/Cancel buttons

- **Obsługiwane interakcje**:
  - onConfirm: wykonanie soft delete
  - onCancel: zamknięcie modalu

- **Obsługiwana walidacja**:
  - Ownership verification
  - User confirmation

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
interface FlashcardDetailsState {
  flashcard: FlashcardDto | null;
  deck: DeckDto | null;
  navigation: NavigationContext | null;
  isLoading: boolean;
  error: ErrorResponse | null;
  modals: {
    edit: boolean;
    delete: boolean;
  };
  ui: {
    isFlipped: boolean;
    autoFlipEnabled: boolean;
  };
}

interface NavigationContext {
  prevFlashcardId: string | null;
  nextFlashcardId: string | null;
  currentPosition: number;
  totalInDeck: number;
  deckId: string;
  filters: FlashcardFilters; // for consistent navigation
}

interface EditFormData {
  front: string;
  back: string;
  deck_id: string;
  tag_ids: string[];
}
```

### Component Props Types
```typescript
interface FlashcardDetailsPageProps {
  params: {
    deckId: string;
    flashcardId: string;
  };
  searchParams?: URLSearchParams;
}

interface FlashcardDetailViewProps {
  flashcard: FlashcardDto;
  isFlipped: boolean;
  autoFlipEnabled: boolean;
  onFlip: () => void;
  onAutoFlipToggle: (enabled: boolean) => void;
}

interface FlashcardCardProps {
  flashcard: FlashcardDto;
  isFlipped: boolean;
  onFlip: () => void;
  onFlipComplete?: () => void;
  className?: string;
}

interface TagManagerProps {
  flashcardId: string;
  currentTags: TagDto[];
  availableTags: TagWithUsageDto[];
  availableDecks: DeckDto[];
  onTagAction: (action: TagAction, tag: TagDto) => Promise<void>;
}

interface MetadataPanelProps {
  flashcard: FlashcardDto;
  deck: DeckDto;
  onDeckClick: () => void;
  onGenerationClick?: (generationId: string) => void;
}

interface NavigationControlsProps {
  navigation: NavigationContext;
  onNavigate: (direction: 'prev' | 'next' | 'deck') => void;
  onBreadcrumbClick: (level: 'dashboard' | 'deck') => void;
}

interface EditFlashcardModalProps {
  isOpen: boolean;
  flashcard: FlashcardDto;
  availableDecks: DeckDto[];
  availableTags: TagWithUsageDto[];
  onClose: () => void;
  onSuccess: (updatedFlashcard: FlashcardDto) => void;
}

interface DeleteFlashcardModalProps {
  isOpen: boolean;
  flashcard: FlashcardDto | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}
```

### Enums and Types
```typescript
type CardSide = 'front' | 'back';
type FlipState = 'flipping' | 'front' | 'back';
type TagAction = 'add' | 'remove' | 'create';

interface SourceTransitionInfo {
  from: FlashcardSource;
  to: FlashcardSource;
  reason: string;
}

interface NavigationContext {
  prevFlashcardId: string | null;
  nextFlashcardId: string | null;
  currentPosition: number;
  totalInDeck: number;
  deckId: string;
  filters: FlashcardFilters;
}
```

## 6. Zarządzanie stanem

### useFlashcardDetails Hook
Custom hook zarządzający stanem widoku szczegółów fiszki:
```typescript
interface UseFlashcardDetailsReturn {
  // State
  flashcard: FlashcardDto | null;
  deck: DeckDto | null;
  navigation: NavigationContext | null;
  isLoading: boolean;
  error: ErrorResponse | null;

  // UI State
  isFlipped: boolean;
  autoFlipEnabled: boolean;

  // Modal states
  editModalOpen: boolean;
  deleteModalOpen: boolean;

  // Available data
  availableDecks: DeckDto[];
  availableTags: TagWithUsageDto[];

  // Actions
  loadFlashcard: (flashcardId: string) => Promise<void>;
  loadNavigation: (deckId: string, flashcardId: string) => Promise<void>;
  updateFlashcard: (id: string, updates: UpdateFlashcardCommand) => Promise<FlashcardDto>;
  deleteFlashcard: (id: string) => Promise<void>;

  // Tag actions
  addTag: (tag: TagDto) => Promise<void>;
  removeTag: (tagId: string) => Promise<void>;
  createAndAddTag: (name: string, deckId: string) => Promise<void>;

  // UI actions
  flipCard: () => void;
  toggleAutoFlip: () => void;
  navigateTo: (direction: 'prev' | 'next' | 'deck') => void;

  // Modal actions
  openEditModal: () => void;
  closeEditModal: () => void;
  openDeleteModal: () => void;
  closeDeleteModal: () => void;
}
```

### Stan lokalny komponentów
- **Flip state**: toggle między front/back z animacją
- **Auto-flip state**: timer-based automatic flipping
- **Navigation state**: prev/next availability
- **Form states**: react-hook-form dla edycji

### Stan globalny (Context)
- **Auth context**: aktualny użytkownik
- **Notification context**: success/error messages
- **Settings context**: user preferences (auto-flip, etc.)

## 7. Integracja API

### GET /api/v1/flashcards/:id (Szczegóły fiszki)
**Request**:
```typescript
GET /api/v1/flashcards/789
Authorization: Bearer {access_token}
```

**Response** (200 OK):
```json
{
  "id": "789",
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
      "scope": "deck",
      "deck_id": "123"
    }
  ]
}
```

**Integration**: Wywołanie w `useFlashcardDetails.loadFlashcard()`

### PATCH /api/v1/flashcards/:id (Aktualizacja fiszki)
**Request**:
```json
{
  "front": "Updated question?",
  "back": "Updated answer",
  "deck_id": "123"
}
```

**Response** (200 OK):
```json
{
  "id": "789",
  "deck_id": "123",
  "front": "Updated question?",
  "back": "Updated answer",
  "source": "ai-edited",
  "generation_id": "999",
  "created_at": "2025-11-16T10:00:00Z",
  "updated_at": "2025-11-16T10:05:00Z"
}
```

**Integration**: Wywołanie w `EditFlashcardModal.onSubmit`

### PUT /api/v1/flashcards/:id/tags (Zastąpienie tagów)
**Request**:
```json
{
  "tag_ids": ["456", "789"]
}
```

**Response** (200 OK):
```json
{
  "flashcard_id": "789",
  "tags": [
    {
      "id": "456",
      "name": "programming",
      "scope": "deck"
    },
    {
      "id": "789",
      "name": "python",
      "scope": "deck"
    }
  ]
}
```

**Integration**: Wywołanie w `TagManager` dla bulk tag operations

### POST /api/v1/flashcards/:id/tags (Dodanie tagów)
**Request**:
```json
{
  "tag_ids": ["789"]
}
```

**Response** (200 OK):
```json
{
  "flashcard_id": "789",
  "tags": [
    {
      "id": "456",
      "name": "programming",
      "scope": "deck"
    },
    {
      "id": "789",
      "name": "python",
      "scope": "deck"
    }
  ]
}
```

**Integration**: Wywołanie w `TagManager.onAddTag`

### DELETE /api/v1/flashcards/:id/tags/:tag_id (Usunięcie tagu)
**Response** (204 No Content)

**Integration**: Wywołanie w `TagManager.onRemoveTag`

### Dodatkowe endpointy dla nawigacji
- **GET /api/v1/decks/:id**: informacje o talii
- **GET /api/v1/flashcards**: z filtrami dla navigation context (prev/next)

## 8. Interakcje użytkownika

### Card Interactions
- **Click on card**: Flip między front/back z smooth animation
- **Flip button**: Dedicated flip control
- **Auto-flip toggle**: Enable/disable automatic flipping
- **Keyboard**: Spacebar do flip, arrow keys dla nawigacji

### Navigation
- **Prev/Next buttons**: Sequential navigation między fiszkami
- **Breadcrumbs**: Hierarchical navigation (Dashboard > Deck > Flashcard)
- **Position indicator**: "Flashcard 3 of 25"
- **Back to deck**: Return to flashcard list

### Tag Management
- **Add tag**: Search and select from available tags
- **Create tag**: Inline tag creation
- **Remove tag**: Individual tag removal
- **Tag filtering**: Search available tags

### Editing
- **Edit modal**: Full flashcard editing
- **Source transition**: Visual feedback o zmianie source
- **Tag editing**: Embedded tag management
- **Deck transfer**: Move flashcard to different deck

### Learning Features
- **Auto-flip**: Configurable timing for spaced repetition
- **Flip hints**: Visual indicators for available actions
- **Content scrolling**: Long content handling

### Keyboard Shortcuts
- **Space**: Flip card
- **Arrow Left/Right**: Navigate prev/next
- **E**: Open edit modal
- **Delete**: Open delete modal
- **Escape**: Close modals

## 9. Warunki i walidacja

### Content Validation
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

### Tag Management Validation
```typescript
const tagIdsSchema = z.array(z.string())
  .refine(async (tagIds) => {
    // Custom validation: check user has access to all tags
    return await verifyTagsAccessible(tagIds, userId);
  }, "Nie masz dostępu do niektórych tagów");

const newTagNameSchema = z.string()
  .min(1, "Nazwa tagu jest wymagana")
  .max(50, "Nazwa tagu nie może być dłuższa niż 50 znaków")
  .regex(/^[a-zA-Z0-9\s\-_]+$/, "Nazwa tagu może zawierać tylko litery, cyfry, spacje, myślniki i podkreślniki");
```

### Deck Transfer Validation
```typescript
const deckIdSchema = z.string()
  .refine(async (deckId) => {
    // Custom validation: check ownership
    return await verifyDeckOwnership(deckId, userId);
  }, "Nie masz dostępu do tej talii");
```

### Source Transition Logic
```typescript
const calculateSourceTransition = (
  currentSource: FlashcardSource,
  frontChanged: boolean,
  backChanged: boolean
): SourceTransitionInfo => {
  if (currentSource === 'ai-full' && (frontChanged || backChanged)) {
    return {
      from: 'ai-full',
      to: 'ai-edited',
      reason: 'Fiszka została wygenerowana przez AI i została zmodyfikowana'
    };
  }

  return {
    from: currentSource,
    to: currentSource,
    reason: 'Brak zmiany źródła'
  };
};
```

### Navigation Validation
```typescript
const navigationSchema = z.object({
  deckId: z.string().refine(isValidBigInt, "Nieprawidłowy identyfikator talii"),
  flashcardId: z.string().refine(isValidBigInt, "Nieprawidłowy identyfikator fiszki"),
  direction: z.enum(['prev', 'next']).optional()
});
```

### Real-time Validation
- **OnChange**: Character counting, basic format validation
- **OnBlur**: Full field validation z error messages
- **OnSubmit**: Complete form validation
- **Tag operations**: Immediate accessibility validation
- **Navigation**: Bounds checking and URL validation

## 10. Obsługa błędów

### API Errors
- **400 Bad Request**: Field validation errors, highlight invalid inputs
- **401 Unauthorized**: Redirect to login
- **404 Not Found**: "Fiszka nie została znaleziona" z navigation options
- **409 Conflict**: "Tag o tej nazwie już istnieje"
- **500 Internal Error**: Generic error with retry option

### Network Errors
- **Timeout**: "Przekroczono czas oczekiwania"
- **Connection failed**: "Brak połączenia z internetem"
- **Retry logic**: Automatic retry dla idempotentnych operations

### Validation Errors
- **Field-level**: Red borders + inline error messages
- **Form-level**: Alert banner z summary errors
- **Tag errors**: Contextual error messages przy tag operations
- **Navigation errors**: Clear feedback o boundary conditions

### Business Logic Errors
- **Ownership violation**: "Nie masz dostępu do tej fiszki"
- **Tag accessibility**: "Nie możesz używać tego tagu"
- **Deck transfer**: "Nie masz dostępu do docelowej talii"

### User Experience
- **Progressive disclosure**: Errors revealed kontekstowo
- **Helpful recovery**: Clear paths to fix validation issues
- **Graceful degradation**: Fallback UI dla error states
- **Context preservation**: Maintain card state podczas error recovery

### Edge Cases
- **Long content**: Scrollable content areas z proper overflow
- **Many tags**: Paginated tag selection, search functionality
- **Navigation bounds**: Disabled prev/next buttons na końcach
- **Concurrent edits**: Optimistic updates z rollback on conflict

## 11. Kroki implementacji

### Krok 1: Setup projektu i dependencies
1. Utwórz strukturę katalogów `/src/components/flashcard-details/`
2. Zainstaluj dodatkowe dependencies:
   - `framer-motion` dla smooth animations (card flip)
   - `react-hook-form` dla form management
   - `lucide-react` dla ikon

### Krok 2: Implementacja typów i schematów walidacji
1. Utwórz `/src/lib/validation/flashcard-details.ts`
2. Zdefiniuj Zod schemas dla wszystkich form i operations
3. Utwórz TypeScript interfaces dla ViewModels i propsów

### Krok 3: Implementacja useFlashcardDetails hook
1. Utwórz `/src/lib/hooks/useFlashcardDetails.ts`
2. Zaimplementuj kompleksowy stan zarządzania
3. Dodaj API integration functions
4. Implementuj navigation logic i URL state

### Krok 4: Implementacja FlashcardCard z flip animation
1. Utwórz `FlashcardCard.tsx` z CSS 3D transforms
2. Zaimplementuj smooth flip animation
3. Dodaj content overflow handling
4. Testuj na różnych urządzeniach

### Krok 5: Implementacja FlashcardDetailView
1. Utwórz główny komponent wyświetlania
2. Zintegruj FlashcardCard z controls
3. Dodaj MetadataPanel i TagDisplay
4. Implementuj auto-flip functionality

### Krok 6: Implementacja TagManager
1. Utwórz `TagManager.tsx` z search i selection
2. Dodaj create new tag functionality
3. Implementuj bulk tag operations
4. Dodaj loading states i error handling

### Krok 7: Implementacja NavigationControls
1. Utwórz `NavigationControls.tsx` z breadcrumbs
2. Implementuj prev/next navigation logic
3. Dodaj position indicators
4. Testuj keyboard navigation

### Krok 8: Implementacja modali
1. Utwórz `EditFlashcardModal.tsx` z source transition
2. Utwórz `DeleteFlashcardModal.tsx` z confirmation
3. Zintegruj TagManager w edit modal
4. Dodaj form validation i error handling

### Krok 9: Implementacja głównego FlashcardDetailsPage
1. Utwórz główny komponent integrujący wszystkie części
2. Dodaj flashcard loading i ownership verification
3. Implementuj navigation context loading
4. Dodaj breadcrumbs i URL management

### Krok 10: Implementacja strony Astro
1. Utwórz `/src/pages/decks/[deckId]/flashcards/[flashcardId].astro`
2. Dodaj client directives dla React components
3. Skonfiguruj nested dynamic routing
4. Dodaj meta tags i SEO optimization

### Krok 11: Testowanie i optymalizacja
1. Unit tests dla hooków i komponentów
2. Integration tests dla pełnych user flows
3. Performance testing dla animations
4. Accessibility testing z screen readers
5. Cross-browser compatibility testing
