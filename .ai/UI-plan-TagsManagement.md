# Plan implementacji widoku Zarządzanie tagami

## 1. Przegląd

Widok Zarządzanie tagami umożliwia użytkownikom kompleksowe zarządzanie wszystkimi tagami w systemie. Użytkownicy mogą przeglądać tagi globalne (wspólne dla wszystkich) oraz tagi deck-scoped (prywatne dla konkretnych talii), filtrować je, wyszukiwać, tworzyć nowe tagi przypisane do talii oraz wykonywać operacje edycji i usunięcia. Widok implementuje dwupoziomową hierarchię tagów z odpowiednią kontrolą dostępu i statystykami użycia.

## 2. Routing widoku

Widok jest dostępny pod ścieżką:
- `/tags` - strona główna zarządzania tagami

Wymagania dostępu:
- Użytkownik musi być zalogowany
- Przekierowanie na `/login` jeśli nieautoryzowany
- Opcjonalne query params dla filtrów (scope, deck_id, search)

## 3. Struktura komponentów

```
TagsPage (główny komponent)
├── Header
│   ├── PageTitle ("Zarządzanie tagami")
│   ├── TagStatsSummary
│   │   ├── TotalTagsCount
│   │   ├── GlobalTagsCount
│   │   ├── DeckTagsCount
│   │   └── MostUsedTag
│   └── CreateTagButton
├── FiltersPanel
│   ├── ScopeFilter
│   │   ├── AllTagsTab
│   │   ├── GlobalTagsTab
│   │   └── DeckTagsTab
│   ├── DeckFilter (visible when deck-scoped selected)
│   │   ├── DeckSelector
│   │   └── DeckChips (selected decks)
│   ├── SearchInput
│   │   ├── SearchField
│   │   ├── ClearSearchButton
│   │   └── SearchSuggestions (future)
│   └── ActiveFiltersDisplay
├── TagsList
│   ├── TagCard (powtarzany dla każdego tagu)
│   │   ├── TagInfo
│   │   │   ├── TagName
│   │   │   ├── ScopeBadge (global/deck)
│   │   │   ├── DeckInfo (for deck-scoped)
│   │   │   └── UsageCount
│   │   ├── TagActions
│   │   │   ├── EditButton (only for deck-scoped)
│   │   │   ├── DeleteButton (only for deck-scoped)
│   │   │   └── UsageDetailsButton
│   │   └── TagPreview (flashcard samples)
│   ├── EmptyState (brak tagów)
│   │   ├── NoTagsMessage
│   │   ├── CreateFirstTagCTA
│   │   └── BrowseGlobalTagsCTA
│   └── BulkActions (future - select multiple)
├── CreateTagModal
│   ├── TagForm
│   │   ├── TagNameInput
│   │   ├── DeckSelector (required for deck-scoped)
│   │   ├── ScopeSelector (future - allow global)
│   │   └── TagPreview
│   ├── ValidationMessages
│   ├── CreateButton
│   └── CancelButton
├── EditTagModal
│   ├── TagForm (similar to CreateTagModal)
│   │   ├── CurrentTagInfo
│   │   ├── TagNameInput (pre-filled)
│   │   └── UpdateButton
│   └── ValidationMessages
├── DeleteTagModal
│   ├── TagInfoDisplay
│   │   ├── TagName & Scope
│   │   ├── UsageCount
│   │   ├── AffectedFlashcards
│   │   └── MigrationWarning
│   ├── DeleteOptions
│   │   ├── SoftDeleteOption (keep associations)
│   │   └── HardDeleteOption (remove associations)
│   ├── ConfirmButton
│   └── CancelButton
├── TagDetailsModal (future - usage details)
│   ├── TagInfo
│   ├── UsageStatistics
│   ├── AssociatedFlashcards (paginated list)
│   └── CloseButton
└── LoadingStates i ErrorMessages
```

## 4. Szczegóły komponentów

### TagsPage

- **Opis komponentu**: Główny kontener widoku zarządzania tagami, zarządza ładowaniem danych tagów, filtrami, wyszukiwaniem i koordynuje wszystkie operacje CRUD na tagach.

- **Główne elementy**:
  - Header ze statystykami i akcjami
  - FiltersPanel dla wyszukiwania i filtrowania
  - TagsList jako główna lista zawartości
  - Modals dla wszystkich operacji CRUD

- **Obsługiwane interakcje**:
  - onMount: ładowanie początkowej listy tagów
  - onFiltersChange: ponowne ładowanie z nowymi filtrami
  - onSearch: debounced wyszukiwanie
  - onTagAction: obsługa akcji na tagach (create, edit, delete, view)
  - onBulkAction: future - operacje na wielu tagach

- **Obsługiwana walidacja**:
  - User authentication check
  - Tag ownership verification dla deck-scoped tags
  - Business rules (global tags read-only)

- **Typy**:
  - `TagsPageState`
  - `TagsPageProps`

- **Propsy**:
  ```typescript
  interface TagsPageProps {
    initialFilters?: TagFilters;
    user?: User;
  }
  ```

### FiltersPanel

- **Opis komponentu**: Zaawansowany panel filtrów umożliwiający wielopoziomowe filtrowanie tagów z dynamicznym UI w zależności od wybranego scope.

- **Główne elementy**:
  - Scope tabs (All/Global/Deck)
  - Deck selector (aktywny tylko dla deck-scoped)
  - Search input z debouncing
  - Active filters chips
  - Clear all filters button

- **Obsługiwane interakcje**:
  - onScopeChange: zmiana między global/deck/all
  - onDeckSelect: wybór talii dla filtrowania
  - onSearchInput: debounced update filtra wyszukiwania
  - onFilterRemove: usunięcie pojedynczego filtra
  - onClearAll: reset wszystkich filtrów

- **Obsługiwana walidacja**:
  - Deck IDs validation (ownership)
  - Search query max length (200 chars)
  - Scope enum validation

- **Typy**:
  - `TagFilters`
  - `FiltersPanelProps`

- **Propsy**:
  ```typescript
  interface FiltersPanelProps {
    filters: TagFilters;
    availableDecks: DeckDto[];
    onFiltersChange: (filters: TagFilters) => void;
    isLoading?: boolean;
  }
  ```

### TagsList

- **Opis komponentu**: Lista tagów wyświetlana jako grid lub lista kart z informacjami o każdym tagu i dostępnymi akcjami.

- **Główne elementy**:
  - Responsive grid container
  - TagCard dla każdego tagu
  - EmptyState dla braku wyników
  - Loading skeleton cards
  - Bulk selection UI (future)

- **Obsługiwane interakcje**:
  - onTagClick: nawigacja do szczegółów tagu (future)
  - onTagEdit: otwarcie modalu edycji
  - onTagDelete: otwarcie modalu usunięcia
  - onBulkSelect: future - zaznaczanie wielu tagów

- **Obsługiwana walidacja**:
  - Tag ownership verification
  - Action availability (global tags read-only)

- **Typy**:
  - `TagsListProps`
  - `TagAction`

- **Propsy**:
  ```typescript
  interface TagsListProps {
    tags: TagWithUsageDto[];
    isLoading: boolean;
    onTagAction: (action: TagAction, tag: TagWithUsageDto) => void;
    currentFilters: TagFilters;
  }
  ```

### TagCard

- **Opis komponentu**: Karta reprezentująca pojedynczy tag z informacjami podstawowymi i akcjami.

- **Główne elementy**:
  - Tag name z kolorowym badge
  - Scope indicator (global/deck)
  - Deck info (dla deck-scoped tags)
  - Usage count z tooltip
  - Action buttons (edit/delete dla deck-scoped)
  - Preview fiszek (opcjonalnie)

- **Obsługiwane interakcje**:
  - onEdit: trigger edycji tagu
  - onDelete: trigger usunięcia tagu
  - onUsageClick: show usage details
  - onCardClick: select tag (future bulk operations)

- **Obsługiwana walidacja**:
  - Scope-based action availability
  - Ownership verification

- **Typy**:
  - `TagCardProps`

- **Propsy**:
  ```typescript
  interface TagCardProps {
    tag: TagWithUsageDto;
    onAction: (action: TagAction, tag: TagWithUsageDto) => void;
    canEdit: boolean;
    canDelete: boolean;
  }
  ```

### CreateTagModal

- **Opis komponentu**: Modal do tworzenia nowego tagu przypisanego do talii z walidacją unikalności nazwy.

- **Główne elementy**:
  - Form z nazwą tagu
  - Deck selector (wymagany)
  - Tag preview
  - Character counter
  - Submit/Cancel buttons

- **Obsługiwane interakcje**:
  - onSubmit: tworzenie tagu przez API
  - onCancel: zamknięcie modalu
  - onNameChange: real-time walidacja i preview
  - onDeckChange: walidacja ownership

- **Obsługiwana walidacja**:
  - Name: 1-50 chars, unikalny w deck
  - Deck: ownership validation, required
  - Real-time feedback

- **Typy**:
  - `CreateTagFormData`
  - `CreateTagModalProps`

- **Propsy**:
  ```typescript
  interface CreateTagModalProps {
    isOpen: boolean;
    availableDecks: DeckDto[];
    onClose: () => void;
    onSuccess: (tag: TagDto) => void;
  }
  ```

### EditTagModal

- **Opis komponentu**: Modal do edycji nazwy istniejącego tagu z sprawdzeniem unikalności.

- **Główne elementy**:
  - Current tag info display
  - Name input (pre-filled)
  - Update/Cancel buttons
  - Validation messages

- **Obsługiwane interakcje**:
  - onSubmit: aktualizacja tagu przez API
  - onCancel: zamknięcie modalu
  - onNameChange: walidacja unikalności

- **Obsługiwana walidacja**:
  - Name uniqueness within deck
  - Length validation
  - Ownership verification

- **Typy**:
  - `EditTagFormData`
  - `EditTagModalProps`

- **Propsy**:
  ```typescript
  interface EditTagModalProps {
    isOpen: boolean;
    tag: TagDto;
    availableDecks: DeckDto[];
    onClose: () => void;
    onSuccess: (tag: TagDto) => void;
  }
  ```

### DeleteTagModal

- **Opis komponentu**: Modal potwierdzenia usunięcia tagu z informacją o konsekwencjach i opcjami usunięcia.

- **Główne elementy**:
  - Tag information display
  - Usage impact summary
  - Delete options (soft/hard delete)
  - Affected flashcards count
  - Confirm/Cancel buttons

- **Obsługiwane interakcje**:
  - onConfirm: wykonanie usunięcia
  - onCancel: zamknięcie modalu
  - onOptionChange: zmiana opcji usunięcia

- **Obsługiwana walidacja**:
  - Scope check (tylko deck-scoped)
  - Usage calculation accuracy

- **Typy**:
  - `DeleteOptions`
  - `DeleteTagModalProps`

- **Propsy**:
  ```typescript
  interface DeleteTagModalProps {
    isOpen: boolean;
    tag: TagWithUsageDto;
    onClose: () => void;
    onConfirm: (options: DeleteOptions) => Promise<void>;
  }
  ```

### TagStatsSummary

- **Opis komponentu**: Komponent wyświetlający podsumowanie statystyk tagów użytkownika.

- **Główne elementy**:
  - Total tags count
  - Global vs deck-scoped breakdown
  - Most used tag
  - Recent activity (future)

- **Obsługiwane interakcje**:
  - onStatClick: filter by category

- **Obsługiwana walidacja**:
  - Data accuracy

- **Typy**:
  - `TagStats`
  - `TagStatsSummaryProps`

- **Propsy**:
  ```typescript
  interface TagStatsSummaryProps {
    stats: TagStats;
    onStatClick?: (filter: TagFilters) => void;
  }
  ```

## 5. Typy

### ViewModel Types
```typescript
interface TagsPageState {
  tags: TagWithUsageDto[];
  filters: TagFilters;
  isLoading: boolean;
  error: ErrorResponse | null;
  stats: TagStats;
  modals: {
    create: boolean;
    edit: { isOpen: boolean; tag: TagDto | null };
    delete: { isOpen: boolean; tag: TagWithUsageDto | null };
  };
  availableDecks: DeckDto[];
}

interface TagFilters {
  scope?: TagScope;
  deck_ids?: string[];
  search?: string;
}

interface TagStats {
  total: number;
  global: number;
  deck: number;
  mostUsed?: {
    tag: TagDto;
    count: number;
  };
}

interface CreateTagFormData {
  name: string;
  deck_id: string;
}

interface EditTagFormData {
  name: string;
}

interface DeleteOptions {
  mode: 'soft' | 'hard'; // soft = keep associations, hard = remove
}
```

### Component Props Types
```typescript
interface TagsPageProps {
  initialFilters?: TagFilters;
  user?: User;
}

interface FiltersPanelProps {
  filters: TagFilters;
  availableDecks: DeckDto[];
  onFiltersChange: (filters: TagFilters) => void;
  isLoading?: boolean;
}

interface TagsListProps {
  tags: TagWithUsageDto[];
  isLoading: boolean;
  onTagAction: (action: TagAction, tag: TagWithUsageDto) => void;
  currentFilters: TagFilters;
}

interface TagCardProps {
  tag: TagWithUsageDto;
  onAction: (action: TagAction, tag: TagWithUsageDto) => void;
  canEdit: boolean;
  canDelete: boolean;
}

interface CreateTagModalProps {
  isOpen: boolean;
  availableDecks: DeckDto[];
  onClose: () => void;
  onSuccess: (tag: TagDto) => void;
}

interface EditTagModalProps {
  isOpen: boolean;
  tag: TagDto;
  availableDecks: DeckDto[];
  onClose: () => void;
  onSuccess: (tag: TagDto) => void;
}

interface DeleteTagModalProps {
  isOpen: boolean;
  tag: TagWithUsageDto;
  onClose: () => void;
  onConfirm: (options: DeleteOptions) => Promise<void>;
}

interface TagStatsSummaryProps {
  stats: TagStats;
  onStatClick?: (filter: TagFilters) => void;
}
```

### Enums and Types
```typescript
type TagScope = 'global' | 'deck' | 'all';
type TagAction = 'view' | 'edit' | 'delete' | 'create';

interface TagFilters {
  scope?: TagScope;
  deck_ids?: string[];
  search?: string;
}

interface TagStats {
  total: number;
  global: number;
  deck: number;
  mostUsed?: {
    tag: TagDto;
    count: number;
  };
}

const TAG_CONSTRAINTS = {
  NAME_MIN_LENGTH: 1,
  NAME_MAX_LENGTH: 50,
  SEARCH_MAX_LENGTH: 200,
} as const;
```

## 6. Zarządzanie stanem

### useTagsManagement Hook
Custom hook zarządzający stanem widoku zarządzania tagami:
```typescript
interface UseTagsManagementReturn {
  // State
  tags: TagWithUsageDto[];
  filters: TagFilters;
  isLoading: boolean;
  error: ErrorResponse | null;
  stats: TagStats;
  availableDecks: DeckDto[];

  // Modal states
  createModalOpen: boolean;
  editModalState: { isOpen: boolean; tag: TagDto | null };
  deleteModalState: { isOpen: boolean; tag: TagWithUsageDto | null };

  // Actions
  setFilters: (filters: TagFilters) => void;
  loadTags: () => Promise<void>;
  loadStats: () => Promise<void>;
  createTag: (data: CreateTagCommand) => Promise<TagDto>;
  updateTag: (id: string, updates: UpdateTagCommand) => Promise<TagDto>;
  deleteTag: (id: string, options: DeleteOptions) => Promise<void>;

  // Modal actions
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openEditModal: (tag: TagDto) => void;
  closeEditModal: () => void;
  openDeleteModal: (tag: TagWithUsageDto) => void;
  closeDeleteModal: () => void;

  // Filter actions
  setScope: (scope: TagScope) => void;
  addDeckFilter: (deckId: string) => void;
  removeDeckFilter: (deckId: string) => void;
  setSearch: (query: string) => void;
  clearFilters: () => void;
}
```

### Stan lokalny komponentów
- **Form states**: react-hook-form dla modali
- **Filter states**: complex multi-level filters
- **Modal states**: CRUD operation states
- **Stats state**: calculated statistics

### Stan globalny (Context)
- **Auth context**: aktualny użytkownik
- **Notification context**: success/error messages
- **Tags context**: shared tag data across app

## 7. Integracja API

### GET /api/v1/tags (Lista tagów z filtrami)
**Request**:
```typescript
GET /api/v1/tags?scope=deck&deck_id=123&search=program
Authorization: Bearer {access_token}
```

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "456",
      "name": "programming",
      "scope": "deck",
      "deck_id": "123",
      "created_at": "2025-11-16T10:00:00Z",
      "usage_count": 15
    }
  ]
}
```

**Integration**: Wywołanie w `useTagsManagement.loadTags()`

### POST /api/v1/tags (Tworzenie tagu)
**Request**:
```json
{
  "name": "urgent",
  "deck_id": "123"
}
```

**Response** (201 Created):
```json
{
  "id": "789",
  "name": "urgent",
  "scope": "deck",
  "deck_id": "123",
  "created_at": "2025-11-16T10:00:00Z"
}
```

**Integration**: Wywołanie w `CreateTagModal.onSubmit`

### PATCH /api/v1/tags/:id (Aktualizacja tagu)
**Request**:
```json
{
  "name": "very-urgent"
}
```

**Response** (200 OK):
```json
{
  "id": "789",
  "name": "very-urgent",
  "scope": "deck",
  "deck_id": "123",
  "created_at": "2025-11-16T10:00:00Z"
}
```

**Integration**: Wywołanie w `EditTagModal.onSubmit`

### DELETE /api/v1/tags/:id (Usuwanie tagu)
**Response** (204 No Content)

**Integration**: Wywołanie w `DeleteTagModal.onConfirm`

## 8. Interakcje użytkownika

### Navigation
- **Header stats**: Click na statystyki filtruje listę
- **Tag cards**: Click na tag pokazuje szczegóły (future)
- **Deck links**: Navigation do talii

### Filtering
- **Scope tabs**: Quick filtering między global/deck/all
- **Deck selector**: Multi-select dla talii
- **Search**: Real-time debounced search
- **Active filters**: Visual chips z remove buttons

### CRUD Operations
- **Create**: Modal z deck selection
- **Edit**: Inline editing w modal
- **Delete**: Confirmation z impact assessment
- **Bulk operations**: Future - select multiple

### Keyboard Shortcuts
- **Ctrl+F**: Focus na search
- **Ctrl+N**: Open create modal
- **Enter**: Submit forms
- **Escape**: Close modals

### Visual Feedback
- **Usage counts**: Hover tooltips z details
- **Scope badges**: Color-coded indicators
- **Action availability**: Disabled states dla global tags
- **Loading states**: Skeleton cards

## 9. Warunki i walidacja

### Tag Name Validation
```typescript
const tagNameSchema = z.string()
  .min(1, "Nazwa tagu jest wymagana")
  .max(50, "Nazwa tagu nie może być dłuższa niż 50 znaków")
  .regex(/^[a-zA-Z0-9\s\-_]+$/, "Nazwa tagu może zawierać tylko litery, cyfry, spacje, myślniki i podkreślniki")
  .refine(async (name, ctx) => {
    // Check uniqueness within deck
    const existing = await checkTagExists(name, ctx.parent.deck_id);
    return !existing;
  }, {
    message: "Tag o tej nazwie już istnieje w tej talii",
    path: ["name"]
  });
```

### Deck Selection Validation
```typescript
const deckIdSchema = z.string()
  .min(1, "Talia jest wymagana")
  .refine(async (deckId) => {
    return await verifyDeckOwnership(deckId, userId);
  }, "Nie masz dostępu do tej talii");
```

### Scope Validation
```typescript
const scopeSchema = z.enum(['global', 'deck', 'all'], {
  errorMap: () => ({ message: "Nieprawidłowy zakres tagów" })
});
```

### Search Validation
```typescript
const searchSchema = z.string()
  .max(200, "Wyszukiwanie nie może być dłuższe niż 200 znaków")
  .transform(query => query.trim());
```

### Filters Validation
```typescript
const tagFiltersSchema = z.object({
  scope: scopeSchema.optional(),
  deck_ids: z.array(z.string()).optional(),
  search: searchSchema.optional(),
}).refine((filters) => {
  // Business rule: deck_ids only valid when scope includes deck
  if (filters.deck_ids && filters.scope === 'global') {
    return false;
  }
  return true;
}, {
  message: "Filtrowanie po talii jest dostępne tylko dla tagów deck-scoped",
  path: ["deck_ids"]
});
```

### Business Rules Validation
- **Global tags**: Read-only, cannot be modified
- **Deck tags**: Full CRUD, scoped to deck ownership
- **Uniqueness**: Names unique within deck
- **Ownership**: Users can only manage their own deck tags
- **Cascade deletion**: Tag removal affects flashcard associations

### Real-time Validation
- **OnChange**: Character counting, format validation
- **OnBlur**: Full validation z error messages
- **OnSubmit**: Complete validation przed API call
- **Cross-field**: Deck ownership, uniqueness checks

## 10. Obsługa błędów

### API Errors
- **400 Bad Request**: Field validation errors, highlight invalid inputs
- **401 Unauthorized**: Redirect to login
- **404 Not Found**: "Tag nie został znaleziony"
- **409 Conflict**: "Tag o tej nazwie już istnieje w tej talii"
- **500 Internal Error**: Generic error with retry option

### Network Errors
- **Timeout**: "Przekroczono czas oczekiwania"
- **Connection failed**: "Brak połączenia z internetem"
- **Retry logic**: Automatic retry dla idempotentnych operations

### Validation Errors
- **Field-level**: Red borders + inline error messages
- **Form-level**: Alert banner z summary errors
- **Business logic**: Contextual error messages

### Business Logic Errors
- **Global tag modification**: "Tagi globalne nie mogą być modyfikowane"
- **Ownership violation**: "Nie masz dostępu do tego tagu"
- **Uniqueness violation**: "Nazwa tagu musi być unikalna w talii"

### User Experience
- **Progressive disclosure**: Errors revealed kontekstowo
- **Helpful recovery**: Clear paths to fix validation issues
- **Graceful degradation**: Fallback UI dla error states
- **Context preservation**: Maintain filter state podczas error recovery

### Edge Cases
- **No tags**: Special empty state z guidance
- **Filtered to empty**: "Brak tagów spełniających kryteria"
- **Many decks**: Efficient deck selection UI
- **Long tag names**: Text truncation z tooltips

## 11. Kroki implementacji

### Krok 1: Setup projektu i dependencies
1. Utwórz strukturę katalogów `/src/components/tags-management/`
2. Zainstaluj dodatkowe dependencies:
   - `react-hook-form` dla form management
   - `@headlessui/react` dla tabs i modals

### Krok 2: Implementacja typów i schematów walidacji
1. Utwórz `/src/lib/validation/tags-management.ts`
2. Zdefiniuj Zod schemas dla wszystkich form i filters
3. Utwórz TypeScript interfaces dla ViewModels i propsów

### Krok 3: Implementacja useTagsManagement hook
1. Utwórz `/src/lib/hooks/useTagsManagement.ts`
2. Zaimplementuj kompleksowy stan zarządzania
3. Dodaj API integration functions
4. Implementuj filter persistence

### Krok 4: Implementacja FiltersPanel
1. Utwórz `FiltersPanel.tsx` z scope tabs
2. Dodaj deck multi-select
3. Implementuj debounced search
4. Testuj filter combinations

### Krok 5: Implementacja TagCard i TagsList
1. Utwórz `TagCard.tsx` z action buttons
2. Utwórz `TagsList.tsx` z responsive grid
3. Dodaj empty states i loading skeletons
4. Implementuj scope-based actions

### Krok 6: Implementacja TagStatsSummary
1. Utwórz `TagStatsSummary.tsx` z statistics display
2. Implementuj stat calculation logic
3. Dodaj click handlers dla filtering

### Krok 7: Implementacja modali
1. Utwórz `CreateTagModal.tsx` z deck selection
2. Utwórz `EditTagModal.tsx` z pre-filled data
3. Utwórz `DeleteTagModal.tsx` z impact assessment
4. Dodaj form validation i error handling

### Krok 8: Implementacja głównego TagsPage
1. Utwórz główny komponent integrujący wszystkie części
2. Dodaj initial data loading (tags, decks, stats)
3. Implementuj URL state management dla filtrów
4. Dodaj authentication guard

### Krok 9: Implementacja strony Astro
1. Utwórz `/src/pages/tags.astro`
2. Dodaj client directives dla React components
3. Skonfiguruj routing z optional query params
4. Dodaj meta tags i SEO

### Krok 10: Stylizacja i responsive design
1. Zastosuj Tailwind CSS zgodnie z design system
2. Zaimplementuj mobile-first approach
3. Dodaj hover states i transitions
4. Zapewnij consistency z resztą aplikacji

### Krok 11: Testowanie i optymalizacja
1. Unit tests dla hooków i komponentów
2. Integration tests dla pełnych CRUD flows
3. E2E tests z Playwright dla tag operations
4. Performance testing dla large tag lists
5. Accessibility testing z axe-core
