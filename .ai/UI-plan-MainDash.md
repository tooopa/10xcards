# Plan implementacji widoku Dashboard głównego

## 1. Przegląd

Dashboard główny to centralny widok aplikacji 10xCards, dostępny po zalogowaniu użytkownika. Zapewnia przegląd wszystkich talii fiszek użytkownika z możliwością zarządzania nimi. Użytkownicy mogą przeglądać swoje talie, wyszukiwać je, tworzyć nowe oraz wykonywać podstawowe operacje CRUD. Widok implementuje paginację, sortowanie i filtrowanie dla efektywnego zarządzania dużymi zbiorami talii.

## 2. Routing widoku

Widok jest dostępny pod ścieżką główną:
- `/` - główna strona aplikacji (wymaga autentyfikacji)

Przekierowanie na `/login` jeśli użytkownik nie jest zalogowany.

## 3. Struktura komponentów

```
DashboardPage (główny komponent)
├── Header
│   ├── Logo aplikacji
│   ├── UserMenu z logout
│   └── CreateDeckButton (szybki dostęp)
├── SearchAndFilters
│   ├── SearchBar (wyszukiwanie pełnotekstowe)
│   ├── SortControls (created_at, updated_at, name)
│   └── OrderToggle (asc/desc)
├── DeckList
│   ├── DeckCard (powtarzany dla każdej talii)
│   │   ├── DeckInfo (nazwa, opis, statystyki)
│   │   ├── ActionButtons (view, edit, delete)
│   │   └── FlashcardCount
│   └── EmptyState (jeśli brak talii)
├── PaginationControls
│   ├── PageNumbers
│   ├── Prev/Next buttons
│   └── ItemsPerPage selector
├── CreateDeckModal
│   ├── Form fields (name, description)
│   ├── Validation messages
│   └── Submit/Cancel buttons
├── DeleteDeckModal
│   ├── Confirmation message
│   ├── Migration info (flashcards → default deck)
│   └── Confirm/Cancel buttons
└── LoadingStates i ErrorMessages
```

## 4. Szczegóły komponentów

### DashboardPage

- **Opis komponentu**: Główny kontener dashboardu, zarządza stanem wszystkich podkomponentów i koordynuje interakcje między nimi. Implementuje authentication guard i loading states dla całej strony.

- **Główne elementy**:
  - Header z nawigacją i akcjami użytkownika
  - Główny kontent z listą talii i kontrolami
  - Modals dla operacji CRUD
  - Toast notifications dla feedbacku

- **Obsługiwane interakcje**:
  - onMount: ładowanie początkowej listy talii
  - onSearch: filtrowanie listy z debouncing
  - onSort: zmiana sortowania z natychmiastowym efektem
  - onPageChange: zmiana strony z paginacją
  - onCreateDeck: otwarcie modalu tworzenia
  - onEditDeck: otwarcie modalu edycji
  - onDeleteDeck: otwarcie modalu potwierdzenia usunięcia
  - onDeckClick: nawigacja do szczegółów talii

- **Obsługiwana walidacja**:
  - Authentication check (przekierowanie jeśli niezalogowany)
  - Ownership validation dla wszystkich operacji na taliach
  - Business rules (nie można usunąć domyślnej talii)

- **Typy**:
  - `DashboardState`
  - `DashboardFilters`
  - `DashboardProps`

- **Propsy**:
  ```typescript
  interface DashboardPageProps {
    initialFilters?: DashboardFilters;
    user?: User; // z context/session
  }
  ```

### SearchAndFilters

- **Opis komponentu**: Komponent kontrolujący wyszukiwanie i filtrowanie listy talii. Implementuje debounced search dla optymalizacji wydajności.

- **Główne elementy**:
  - Search input z ikoną lupy
  - Sort dropdown (created_at, updated_at, name)
  - Order toggle button (asc/desc)
  - Clear filters button

- **Obsługiwane interakcje**:
  - onSearchInput: debounced update filtra wyszukiwania
  - onSortChange: natychmiastowa zmiana sortowania
  - onOrderToggle: przełączanie kierunku sortowania
  - onClearFilters: reset wszystkich filtrów

- **Obsługiwana walidacja**:
  - Search query: max 200 znaków, sanityzacja
  - Sort field: enum validation
  - Order: enum validation

- **Typy**:
  - `SearchFilters`
  - `SortField`
  - `SortOrder`

- **Propsy**:
  ```typescript
  interface SearchAndFiltersProps {
    filters: SearchFilters;
    onFiltersChange: (filters: SearchFilters) => void;
    isLoading?: boolean;
  }
  ```

### DeckList

- **Opis komponentu**: Lista talii renderowana jako grid lub lista kart. Obsługuje empty state i loading states.

- **Główne elementy**:
  - Grid container dla kart talii
  - DeckCard dla każdej talii
  - EmptyState z call-to-action
  - Loading skeleton cards

- **Obsługiwane interakcje**:
  - onDeckClick: nawigacja do szczegółów talii
  - onEditDeck: otwarcie modalu edycji
  - onDeleteDeck: otwarcie modalu usunięcia
  - onCreateDeck: otwarcie modalu tworzenia

- **Obsługiwana walidacja**:
  - Sprawdzenie czy lista jest pusta
  - Walidacja indeksów dla paginacji

- **Typy**:
  - `DeckListViewModel`
  - `DeckCardProps`

- **Propsy**:
  ```typescript
  interface DeckListProps {
    decks: DeckDto[];
    isLoading: boolean;
    onDeckAction: (action: DeckAction, deck: DeckDto) => void;
  }
  ```

### DeckCard

- **Opis komponentu**: Karta reprezentująca pojedynczą talię z podstawowymi informacjami i akcjami.

- **Główne elementy**:
  - Tytuł talii (link do szczegółów)
  - Opis (truncated jeśli długi)
  - Statystyki (liczba fiszek, data utworzenia)
  - Action buttons (view, edit, delete)
  - Visual indicators (czy domyślna talia)

- **Obsługiwane interakcje**:
  - onView: nawigacja do /decks/:id
  - onEdit: trigger edycji talii
  - onDelete: trigger usunięcia talii
  - onCardClick: domyślnie nawigacja do szczegółów

- **Obsługiwana walidacja**:
  - Sprawdzenie czy talia jest domyślna (blokada usunięcia)
  - Walidacja dostępu (ownership)

- **Typy**:
  - `DeckCardProps`
  - `DeckAction`

- **Propsy**:
  ```typescript
  interface DeckCardProps {
    deck: DeckDto;
    onAction: (action: DeckAction, deck: DeckDto) => void;
  }
  ```

### PaginationControls

- **Opis komponentu**: Komponent do nawigacji między stronami wyników z możliwością zmiany liczby elementów na stronie.

- **Główne elementy**:
  - Page number buttons z ellipsis dla dużych zakresów
  - Previous/Next buttons
  - Items per page selector
  - Results info ("Showing 1-20 of 150")

- **Obsługiwane interakcje**:
  - onPageChange: zmiana aktualnej strony
  - onItemsPerPageChange: zmiana limitu
  - onPrev/Next: nawigacja sekwencyjna

- **Obsługiwana walidacja**:
  - Page number: 1 to total_pages
  - Items per page: 1-100 (zgodnie z API)
  - Bounds checking dla paginacji

- **Typy**:
  - `PaginationControlsProps`
  - `PaginationMeta`

- **Propsy**:
  ```typescript
  interface PaginationControlsProps {
    pagination: PaginationMeta;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
  }
  ```

### CreateDeckModal

- **Opis komponentu**: Modal do tworzenia nowej talii z formularzem i walidacją.

- **Główne elementy**:
  - Modal dialog z form
  - Input name (required, 1-100 chars)
  - Textarea description (optional, max 5000 chars)
  - Submit/Cancel buttons
  - Loading state podczas tworzenia

- **Obsługiwane interakcje**:
  - onSubmit: tworzenie talii przez API
  - onCancel: zamknięcie modalu
  - onNameChange: walidacja w czasie rzeczywistym
  - onDescriptionChange: character counter

- **Obsługiwana walidacja**:
  - Name: required, 1-100 chars, unique per user
  - Description: max 5000 chars, optional
  - Form-level: wszystkie pola muszą być poprawne

- **Typy**:
  - `CreateDeckFormData`
  - `CreateDeckModalProps`

- **Propsy**:
  ```typescript
  interface CreateDeckModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (deck: DeckDto) => void;
  }
  ```

### DeleteDeckModal

- **Opis komponentu**: Modal potwierdzenia usunięcia talii z informacją o migracji fiszek.

- **Główne elementy**:
  - Confirmation message
  - Warning o migracji fiszek do domyślnej talii
  - Lista migracji (liczba fiszek, tag)
  - Confirm/Cancel buttons

- **Obsługiwane interakcje**:
  - onConfirm: wykonanie usunięcia
  - onCancel: zamknięcie modalu

- **Obsługiwana walidacja**:
  - Sprawdzenie czy talia nie jest domyślna
  - Potwierdzenie przez użytkownika

- **Typy**:
  - `DeleteDeckModalProps`
  - `DeckDeletionResultDto`

- **Propsy**:
  ```typescript
  interface DeleteDeckModalProps {
    isOpen: boolean;
    deck: DeckDto | null;
    onClose: () => void;
    onConfirm: () => Promise<void>;
  }
  ```

## 5. Typy

### ViewModel Types
```typescript
interface DashboardState {
  decks: DeckDto[];
  pagination: PaginationMeta;
  filters: DashboardFilters;
  isLoading: boolean;
  error: ErrorResponse | null;
  modals: {
    create: boolean;
    delete: { isOpen: boolean; deck: DeckDto | null };
  };
}

interface DashboardFilters {
  search?: string;
  sort: DeckSortField;
  order: SortOrder;
}

type DeckAction = 'view' | 'edit' | 'delete' | 'create';

interface DeckCardViewModel {
  deck: DeckDto;
  canEdit: boolean;
  canDelete: boolean;
  isDefault: boolean;
}
```

### Form Types
```typescript
interface CreateDeckFormData {
  name: string;
  description?: string;
}

interface CreateDeckFormErrors {
  name?: string;
  description?: string;
  general?: string;
}

interface SearchFilters {
  query: string;
  sort: DeckSortField;
  order: SortOrder;
}
```

### Component Props Types
```typescript
interface DashboardPageProps {
  initialFilters?: DashboardFilters;
  user?: User;
}

interface DeckListProps {
  decks: DeckDto[];
  isLoading: boolean;
  onDeckAction: (action: DeckAction, deck: DeckDto) => void;
}

interface DeckCardProps {
  deck: DeckDto;
  onAction: (action: DeckAction, deck: DeckDto) => void;
}

interface PaginationControlsProps {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

interface CreateDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (deck: DeckDto) => void;
}

interface DeleteDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  deck: DeckDto | null;
  onConfirm: () => Promise<void>;
}
```

### Enums and Constants
```typescript
type DeckSortField = 'created_at' | 'updated_at' | 'name';
type SortOrder = 'asc' | 'desc';

const DECKS_PER_PAGE_OPTIONS = [10, 20, 50, 100] as const;
const DEFAULT_DECKS_PER_PAGE = 20;
const MAX_SEARCH_LENGTH = 200;
```

## 6. Zarządzanie stanem

### useDashboard Hook
Custom hook zarządzający stanem dashboardu:
```typescript
interface UseDashboardReturn {
  // State
  decks: DeckDto[];
  pagination: PaginationMeta;
  filters: DashboardFilters;
  isLoading: boolean;
  error: ErrorResponse | null;

  // Modal states
  createModalOpen: boolean;
  deleteModalState: { isOpen: boolean; deck: DeckDto | null };

  // Actions
  setFilters: (filters: DashboardFilters) => void;
  loadDecks: () => Promise<void>;
  createDeck: (data: CreateDeckCommand) => Promise<DeckDto>;
  deleteDeck: (deckId: string) => Promise<DeckDeletionResultDto>;

  // Modal actions
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openDeleteModal: (deck: DeckDto) => void;
  closeDeleteModal: () => void;
}
```

### Stan lokalny komponentów
- **Form states**: react-hook-form dla CreateDeckModal
- **Loading states**: dla API calls i initial load
- **Error states**: dla błędów API i walidacji
- **Modal states**: boolean flags dla otwarcia/zamknięcia

### Stan globalny (Context)
- **Auth context**: aktualny użytkownik
- **Notification context**: toast messages

## 7. Integracja API

### GET /api/v1/decks (Lista talii)
**Request**:
```typescript
GET /api/v1/decks?search=programming&sort=name&order=asc&page=1&limit=20
Authorization: Bearer {access_token}
```

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "string",
      "name": "Programming",
      "description": "CS flashcards",
      "visibility": "private",
      "is_default": false,
      "flashcard_count": 42,
      "created_at": "2025-11-16T10:00:00Z",
      "updated_at": "2025-11-16T10:00:00Z"
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

**Integration**: Wywołanie w `useDashboard.loadDecks()`, mapowanie na DeckDto[]

### POST /api/v1/decks (Tworzenie talii)
**Request**:
```json
{
  "name": "Programming",
  "description": "Computer Science flashcards"
}
```

**Response** (201 Created):
```json
{
  "id": "string",
  "name": "Programming",
  "description": "Computer Science flashcards",
  "visibility": "private",
  "is_default": false,
  "flashcard_count": 0,
  "created_at": "2025-11-16T10:00:00Z",
  "updated_at": "2025-11-16T10:00:00Z"
}
```

**Integration**: Wywołanie w `CreateDeckModal.onSubmit`

### DELETE /api/v1/decks/:id (Usuwanie talii)
**Response** (200 OK):
```json
{
  "message": "Deck deleted successfully",
  "migrated_flashcards_count": 42,
  "migration_tag": {
    "id": "string",
    "name": "#deleted-from-Programming"
  }
}
```

**Integration**: Wywołanie w `DeleteDeckModal.onConfirm`

## 8. Interakcje użytkownika

### Navigation
- **Click na DeckCard**: Przejście do `/decks/:id`
- **Search input**: Debounced search (300ms)
- **Sort controls**: Natychmiastowa zmiana sortowania
- **Pagination**: Natychmiastowa zmiana strony
- **Create button**: Otwarcie modalu tworzenia

### Keyboard Shortcuts
- **Ctrl+F**: Focus na search input
- **Ctrl+N**: Otwarcie modalu tworzenia
- **Enter**: Submit formy w modalach
- **Escape**: Zamknięcie modali

### Visual Feedback
- **Loading states**: Skeleton cards podczas ładowania
- **Hover effects**: Podświetlenie kart i przycisków
- **Active states**: Wskaźniki dla aktualnej strony sortowania
- **Toast notifications**: Sukces/error messages

### Progressive Enhancement
- **JavaScript disabled**: Basic HTML links do nawigacji
- **Slow connections**: Progressive loading z skeletons
- **Large datasets**: Virtual scrolling jeśli >1000 talii

## 9. Warunki i walidacja

### Search Validation
```typescript
const searchSchema = z.string()
  .max(200, "Wyszukiwanie nie może być dłuższe niż 200 znaków")
  .transform(query => query.trim());
```

### Deck Name Validation
```typescript
const deckNameSchema = z.string()
  .min(1, "Nazwa talii jest wymagana")
  .max(100, "Nazwa talii nie może być dłuższa niż 100 znaków")
  .regex(/^[a-zA-Z0-9\s\-_]+$/, "Nazwa może zawierać tylko litery, cyfry, spacje, myślniki i podkreślniki");
```

### Form-level Validation
- **Create Deck**: Name wymagane, unique per user
- **Delete Deck**: Cannot delete default deck
- **Search**: Max length, no special validation
- **Pagination**: Page >=1, limit 1-100

### Business Rules
- Default deck ("Uncategorized") cannot be deleted
- Default deck can only be renamed to "Uncategorized"
- Deck names must be unique per user
- Users can only see/modify their own decks

### Real-time Validation
- **OnChange**: Basic format validation
- **OnBlur**: Full validation z error messages
- **OnSubmit**: Complete validation przed API call

## 10. Obsługa błędów

### API Errors
- **401 Unauthorized**: Przekierowanie do `/login`
- **400 Bad Request**: Highlight invalid fields z messages
- **404 Not Found**: "Talia nie została znaleziona"
- **409 Conflict**: "Talia o tej nazwie już istnieje"
- **500 Internal Error**: Generic error message z retry option

### Network Errors
- **Timeout**: "Przekroczono czas oczekiwania. Spróbuj ponownie."
- **Connection failed**: "Brak połączenia z internetem."
- **Retry logic**: Exponential backoff dla failed requests

### Validation Errors
- **Field-level**: Red borders + error messages pod polami
- **Form-level**: Alert banner na górze modalu
- **Clear on interaction**: Errors znikają gdy użytkownik zaczyna poprawiać

### User Experience
- **Inline errors**: Natychmiastowy feedback dla pól
- **Toast notifications**: Success/error messages
- **Loading states**: Disable interactions podczas API calls
- **Recovery actions**: Retry buttons dla błędów

### Edge Cases
- **Empty search results**: Empty state z sugestią zmiany filtrów
- **No decks**: Call-to-action do utworzenia pierwszej talii
- **Large datasets**: Pagination controls zawsze widoczne
- **Slow responses**: Skeleton loading states

## 11. Kroki implementacji

### Krok 1: Setup projektu i dependencies
1. Utwórz strukturę katalogów `/src/components/dashboard/`
2. Zainstaluj dodatkowe dependencies jeśli potrzebne:
   - `@tanstack/react-query` dla data fetching (opcjonalne)
   - `lucide-react` dla ikon (już w shadcn)
   - `react-hook-form` dla form management

### Krok 2: Implementacja typów i schematów
1. Utwórz `/src/lib/validation/dashboard.ts`
2. Zdefiniuj Zod schemas dla search, create deck, pagination
3. Utwórz TypeScript interfaces dla ViewModels i propsów

### Krok 3: Implementacja useDashboard hook
1. Utwórz `/src/lib/hooks/useDashboard.ts`
2. Zaimplementuj stan dla decks, pagination, filters, modals
3. Dodaj API integration functions (loadDecks, createDeck, deleteDeck)
4. Zaimplementuj error handling i loading states

### Krok 4: Implementacja podstawowych komponentów
1. Utwórz `DeckCard.tsx` - pojedyncza karta talii
2. Utwórz `PaginationControls.tsx` - kontrola paginacji
3. Utwórz `SearchAndFilters.tsx` - wyszukiwanie i sortowanie

### Krok 5: Implementacja DeckList i EmptyState
1. Utwórz `DeckList.tsx` z grid layout
2. Dodaj EmptyState dla braku talii
3. Zaimplementuj loading skeletons
4. Dodaj action handlers dla kart

### Krok 6: Implementacja modali
1. Utwórz `CreateDeckModal.tsx` z form walidacją
2. Utwórz `DeleteDeckModal.tsx` z confirmation logic
3. Zintegruj react-hook-form z Zod schemas

### Krok 7: Implementacja głównego DashboardPage
1. Utwórz główny komponent integrujący wszystkie części
2. Dodaj authentication guard
3. Zaimplementuj initial data loading
4. Dodaj navigation logic

### Krok 8: Implementacja strony Astro
1. Utwórz `/src/pages/index.astro`
2. Dodaj client directives dla React components
3. Skonfiguruj layout i meta tags
4. Dodaj SEO optimization

### Krok 9: Stylizacja i responsive design
1. Zastosuj Tailwind CSS zgodnie z design system
2. Zaimplementuj mobile-first approach
3. Dodaj hover states i transitions
4. Zapewnij consistency z auth pages

### Krok 10: Testowanie i QA
1. Unit tests dla hooków i komponentów
2. Integration tests dla pełnych flows
3. E2E tests z Playwright dla krytycznych ścieżek
4. Performance testing dla dużych list talii
5. Accessibility testing z axe-core

### Krok 11: Optymalizacja i deployment
1. Dodaj React.memo dla komponentów
2. Implementuj virtualization jeśli potrzebne (>100 talii)
3. Dodaj error boundaries
4. Skonfiguruj monitoring i analytics
5. Deploy i monitoruj performance
