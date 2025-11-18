# Plan implementacji widoku Generowanie AI fiszek

## 1. Przegląd

Widok Generowanie AI fiszek umożliwia użytkownikom tworzenie nowych fiszek przy użyciu sztucznej inteligencji OpenRouter.ai. Użytkownicy wprowadzają tekst źródłowy, wybierają model AI i talię docelową, a system generuje propozycje fiszek. Widok zawiera rate limiting (10 generacji/godzinę), progress indication, możliwość edycji sugestii przed akceptacją oraz pełną integrację z systemem tagów i talii.

## 2. Routing widoku

Widok jest dostępny pod ścieżką:
- `/generate` - strona główna generowania AI

Wymagania dostępu:
- Użytkownik musi być zalogowany
- Przekierowanie na `/login` jeśli nieautoryzowany
- Opcjonalne query params dla pre-selected deck/model

## 3. Struktura komponentów

```
GeneratePage (główny komponent)
├── Header
│   ├── PageTitle ("Generuj fiszki z AI")
│   ├── RateLimitIndicator
│   │   ├── CurrentUsage (7/10)
│   │   ├── ResetTimer (00:45:30)
│   │   └── UpgradePrompt (future)
│   └── BackToDashboardButton
├── GenerateForm (główny formularz)
│   ├── SourceTextArea
│   │   ├── TextInput (1000-10000 chars)
│   │   ├── CharacterCounter (animated)
│   │   ├── WordCount
│   │   └── PasteButton (clipboard)
│   ├── ModelSelector
│   │   ├── ModelDropdown
│   │   │   ├── ModelCard (recommended)
│   │   │   │   ├── Name & Provider
│   │   │   │   ├── CostInfo ($0.15/1M tokens)
│   │   │   │   ├── SpeedInfo (timeout)
│   │   │   │   └── RecommendedBadge
│   │   │   └── ModelCard (premium)
│   │   ├── ModelSearch (future)
│   │   └── CostCalculator (estimated cost)
│   ├── DeckSelector
│   │   ├── DeckDropdown
│   │   │   ├── DeckOption (name, flashcard_count)
│   │   │   └── CreateNewDeckLink
│   │   └── DeckPreview (selected deck info)
│   ├── AdvancedOptions (collapsible)
│   │   ├── MaxFlashcardsSlider (3-20)
│   │   ├── LanguageSelector (future)
│   │   └── TagSuggestionsToggle
│   └── GenerateButton
│       ├── IdleState ("Generuj fiszki")
│       ├── LoadingState ("Generowanie..." + spinner)
│       └── DisabledState ("Limit przekroczony")
├── GenerationProgress (overlay/modal)
│   ├── ProgressBar (animated)
│   ├── CurrentStep ("Analizowanie tekstu...")
│   ├── EstimatedTime
│   ├── CancelButton
│   └── ErrorState (retry option)
├── SuggestionsList (po generowaniu)
│   ├── SuggestionsHeader
│   │   ├── CountInfo ("Wygenerowano 12 fiszek")
│   │   ├── ModelUsed ("OpenAI GPT-4o-mini")
│   │   ├── CostInfo ("Koszt: $0.02")
│   │   └── GenerationTime ("Czas: 15s")
│   ├── SuggestionCard (powtarzany)
│   │   ├── CardHeader
│   │   │   ├── IndexNumber
│   │   │   ├── EditToggle
│   │   │   └── DeleteButton
│   │   ├── FrontSide (editable)
│   │   ├── BackSide (editable)
│   │   ├── QualityIndicator (auto-calculated)
│   │   └── TagSuggestions (AI-generated)
│   ├── BulkActions
│   │   ├── SelectAllToggle
│   │   ├── DeleteSelected
│   │   └── AcceptSelectedButton
│   └── PaginationControls (jeśli >20 sugestii)
├── AcceptSuggestionsModal
│   ├── SummaryInfo
│   │   ├── SelectedCount ("Akceptujesz 8/12 fiszek")
│   │   ├── EstimatedFlashcards ("Utworzysz 8 nowych fiszek")
│   │   └── CostSummary
│   ├── ConfirmationOptions
│   │   ├── AddTagsToFlashcards (checkbox)
│   │   ├── CreateNewDeck (radio)
│   │   └── AppendToExistingDeck (radio)
│   ├── AcceptButton
│   └── CancelButton
└── ErrorStates i SuccessFeedback
```

## 4. Szczegóły komponentów

### GeneratePage

- **Opis komponentu**: Główny kontener widoku generowania, zarządza całym flow od wprowadzania danych przez generowanie po akceptację sugestii. Implementuje complex state management dla rate limiting, progress tracking i error recovery.

- **Główne elementy**:
  - Header z rate limit info
  - GenerateForm dla input
  - GenerationProgress dla feedback
  - SuggestionsList po generowaniu
  - AcceptSuggestionsModal dla potwierdzenia

- **Obsługiwane interakcje**:
  - onFormSubmit: rozpoczęcie generowania
  - onProgressUpdate: aktualizacja statusu generowania
  - onSuggestionsReady: wyświetlenie listy sugestii
  - onSuggestionEdit: inline edycja sugestii
  - onAcceptSuggestions: otwarcie modalu akceptacji
  - onCancelGeneration: przerwanie procesu

- **Obsługiwana walidacja**:
  - Form validation (source text, model, deck)
  - Rate limit checking przed generowaniem
  - Ownership validation dla wybranej talii

- **Typy**:
  - `GeneratePageState`
  - `GenerationFlowStep`
  - `GeneratePageProps`

- **Propsy**:
  ```typescript
  interface GeneratePageProps {
    initialDeckId?: string; // from URL params
    initialModel?: string; // from URL params
  }
  ```

### GenerateForm

- **Opis komponentu**: Główny formularz zbierający dane do generowania: tekst źródłowy, model AI i talię docelową.

- **Główne elementy**:
  - SourceTextArea z character counting
  - ModelSelector z cost info
  - DeckSelector z preview
  - AdvancedOptions collapsible
  - GenerateButton z dynamic state

- **Obsługiwane interakcje**:
  - onSourceTextChange: real-time validation i counting
  - onModelChange: cost recalculation
  - onDeckChange: deck validation
  - onGenerateClick: form submission z validation

- **Obsługiwana walidacja**:
  - Source text: 1000-10000 chars, required
  - Model: whitelist validation, required
  - Deck: ownership validation, required
  - Rate limit: check przed submission

- **Typy**:
  - `GenerateFormData`
  - `GenerateFormErrors`
  - `GenerateFormProps`

- **Propsy**:
  ```typescript
  interface GenerateFormProps {
    onSubmit: (data: GenerateFormData) => Promise<void>;
    rateLimit: RateLimitInfo;
    isGenerating: boolean;
    availableDecks: DeckDto[];
    availableModels: AIModel[];
  }
  ```

### SourceTextArea

- **Opis komponentu**: Zaawansowany textarea dla tekstu źródłowego z character counting, word counting i paste support.

- **Główne elementy**:
  - Auto-resizing textarea
  - Character counter z color coding
  - Word count display
  - Paste from clipboard button
  - Validation indicators

- **Obsługiwane interakcje**:
  - onInput: real-time counting i validation
  - onPaste: clipboard integration
  - onFocus/Blur: validation feedback

- **Obsługiwana walidacja**:
  - Min 1000, max 10000 characters
  - Real-time feedback o długości
  - Paste content validation

- **Typy**:
  - `SourceTextAreaProps`

- **Propsy**:
  ```typescript
  interface SourceTextAreaProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    maxLength: number;
    minLength: number;
  }
  ```

### ModelSelector

- **Opis komponentu**: Komponent do wyboru modelu AI z informacjami o kosztach, prędkości i rekomendacjach.

- **Główne elementy**:
  - Model cards grid/list
  - Cost calculator
  - Speed indicators
  - Recommended badges
  - Model search (future)

- **Obsługiwane interakcje**:
  - onModelSelect: wybór modelu
  - onCostInfoClick: szczegóły kosztów
  - onRecommendedClick: wybór recommended

- **Obsługiwana walidacja**:
  - Model whitelist validation
  - Availability checking

- **Typy**:
  - `AIModel`
  - `ModelSelectorProps`

- **Propsy**:
  ```typescript
  interface ModelSelectorProps {
    selectedModel: string | null;
    onModelChange: (modelId: string) => void;
    sourceTextLength: number;
    availableModels: AIModel[];
  }
  ```

### RateLimitIndicator

- **Opis komponentu**: Komponent wyświetlający aktualne użycie rate limit i pozostały czas do reset.

- **Główne elementy**:
  - Progress bar (7/10)
  - Reset countdown timer
  - Usage history (optional)
  - Upgrade prompt (future)

- **Obsługiwane interakcje**:
  - onUpgradeClick: przekierowanie do upgrade (future)
  - onInfoClick: szczegóły rate limiting

- **Obsługiwana walidacja**:
  - Real-time rate limit status
  - Timer accuracy

- **Typy**:
  - `RateLimitInfo`
  - `RateLimitIndicatorProps`

- **Propsy**:
  ```typescript
  interface RateLimitIndicatorProps {
    rateLimit: RateLimitInfo;
    onUpgradeClick?: () => void;
  }
  ```

### SuggestionsList

- **Opis komponentu**: Lista wygenerowanych sugestii fiszek z możliwością edycji i selekcji przed akceptacją.

- **Główne elementy**:
  - Header z metadanymi generacji
  - Editable suggestion cards
  - Bulk selection controls
  - Quality indicators
  - Tag suggestions

- **Obsługiwane interakcje**:
  - onSuggestionEdit: toggle edit mode
  - onSuggestionDelete: usunięcie pojedynczej sugestii
  - onBulkSelect: zaznaczenie/odznaczenie wszystkich
  - onAcceptSelected: akceptacja wybranych sugestii

- **Obsługiwana walidacja**:
  - Edited content validation
  - Selection state management

- **Typy**:
  - `EditableSuggestion`
  - `SuggestionsListProps`

- **Propsy**:
  ```typescript
  interface SuggestionsListProps {
    suggestions: EditableSuggestion[];
    onSuggestionChange: (index: number, suggestion: EditableSuggestion) => void;
    onSuggestionDelete: (index: number) => void;
    onAcceptSelected: (selectedIndices: number[]) => void;
    generationMetadata: GenerationMetadata;
  }
  ```

### SuggestionCard

- **Opis komponentu**: Indywidualna karta sugestii z trybem view/edit i walidacją jakości.

- **Główne elementy**:
  - Front/back display
  - Edit toggle
  - Quality score
  - Tag suggestions
  - Delete button

- **Obsługiwane interakcje**:
  - onEditToggle: przełączanie między view/edit
  - onContentChange: aktualizacja treści
  - onDelete: usunięcie sugestii

- **Obsługiwana walidacja**:
  - Content validation w edit mode
  - Quality scoring

- **Typy**:
  - `SuggestionCardProps`

- **Propsy**:
  ```typescript
  interface SuggestionCardProps {
    suggestion: EditableSuggestion;
    onChange: (suggestion: EditableSuggestion) => void;
    onDelete: () => void;
  }
  ```

### AcceptSuggestionsModal

- **Opis komponentu**: Modal potwierdzenia akceptacji wybranych sugestii z opcjami dotyczącymi tagów i talii.

- **Główne elementy**:
  - Summary of acceptance
  - Tag assignment options
  - Deck selection options
  - Final confirmation

- **Obsługiwane interakcje**:
  - onAccept: final acceptance
  - onCancel: cancellation
  - onOptionChange: tag/deck options

- **Obsługiwana walidacja**:
  - Selected suggestions validation
  - Tag accessibility
  - Deck ownership

- **Typy**:
  - `AcceptOptions`
  - `AcceptSuggestionsModalProps`

- **Propsy**:
  ```typescript
  interface AcceptSuggestionsModalProps {
    isOpen: boolean;
    selectedSuggestions: EditableSuggestion[];
    onClose: () => void;
    onAccept: (options: AcceptOptions) => Promise<void>;
    availableDecks: DeckDto[];
    availableTags: TagWithUsageDto[];
  }
  ```

### GenerationProgress

- **Opis komponentu**: Overlay/modal pokazujący postęp generowania z możliwością anulowania.

- **Główne elementy**:
  - Animated progress bar
  - Step descriptions
  - Estimated time
  - Cancel button

- **Obsługiwane interakcje**:
  - onCancel: przerwanie generowania

- **Obsługiwana walidacja**:
  - Progress state management

- **Typy**:
  - `GenerationStep`
  - `GenerationProgressProps`

- **Propsy**:
  ```typescript
  interface GenerationProgressProps {
    isVisible: boolean;
    currentStep: GenerationStep;
    progress: number; // 0-100
    estimatedTimeRemaining: number; // seconds
    onCancel: () => void;
  }
  ```

## 5. Typy

### ViewModel Types
```typescript
interface GeneratePageState {
  // Form state
  formData: GenerateFormData;
  formErrors: GenerateFormErrors;

  // Generation state
  isGenerating: boolean;
  generationStep: GenerationStep;
  generationProgress: number;
  generationError: ErrorResponse | null;

  // Suggestions state
  suggestions: EditableSuggestion[] | null;
  selectedSuggestionIndices: number[];
  generationMetadata: GenerationMetadata | null;

  // Rate limit state
  rateLimit: RateLimitInfo;

  // Modal states
  acceptModalOpen: boolean;
  acceptOptions: AcceptOptions;

  // Available data
  availableDecks: DeckDto[];
  availableModels: AIModel[];
  availableTags: TagWithUsageDto[];
}

interface GenerateFormData {
  source_text: string;
  model: string;
  deck_id: string;
  max_flashcards?: number;
  language?: string;
  suggest_tags?: boolean;
}

interface EditableSuggestion {
  original: GenerationSuggestionDto;
  edited: {
    front: string;
    back: string;
    edited: boolean;
  };
  quality_score: number; // 0-1
  suggested_tags: string[];
}

interface GenerationMetadata {
  generation_id: string;
  model: string;
  generated_count: number;
  source_text_length: number;
  generation_duration_ms: number;
  cost_estimate: number;
  created_at: string;
}

interface AcceptOptions {
  add_tags: boolean;
  tag_ids: string[];
  create_new_deck: boolean;
  new_deck_name?: string;
  target_deck_id?: string;
}
```

### Component Props Types
```typescript
interface GeneratePageProps {
  initialDeckId?: string;
  initialModel?: string;
}

interface GenerateFormProps {
  onSubmit: (data: GenerateFormData) => Promise<void>;
  rateLimit: RateLimitInfo;
  isGenerating: boolean;
  availableDecks: DeckDto[];
  availableModels: AIModel[];
}

interface SourceTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  maxLength: number;
  minLength: number;
}

interface ModelSelectorProps {
  selectedModel: string | null;
  onModelChange: (modelId: string) => void;
  sourceTextLength: number;
  availableModels: AIModel[];
}

interface RateLimitIndicatorProps {
  rateLimit: RateLimitInfo;
  onUpgradeClick?: () => void;
}

interface SuggestionsListProps {
  suggestions: EditableSuggestion[];
  onSuggestionChange: (index: number, suggestion: EditableSuggestion) => void;
  onSuggestionDelete: (index: number) => void;
  onAcceptSelected: (selectedIndices: number[]) => void;
  generationMetadata: GenerationMetadata;
}

interface SuggestionCardProps {
  suggestion: EditableSuggestion;
  onChange: (suggestion: EditableSuggestion) => void;
  onDelete: () => void;
}

interface AcceptSuggestionsModalProps {
  isOpen: boolean;
  selectedSuggestions: EditableSuggestion[];
  onClose: () => void;
  onAccept: (options: AcceptOptions) => Promise<void>;
  availableDecks: DeckDto[];
  availableTags: TagWithUsageDto[];
}

interface GenerationProgressProps {
  isVisible: boolean;
  currentStep: GenerationStep;
  progress: number;
  estimatedTimeRemaining: number;
  onCancel: () => void;
}
```

### Enums and Constants
```typescript
type GenerationStep =
  | 'validating'
  | 'sending_request'
  | 'waiting_for_ai'
  | 'parsing_response'
  | 'processing_suggestions'
  | 'complete';

interface AIModel {
  id: string;
  name: string;
  provider: string;
  cost_per_1m_tokens: number;
  timeout_seconds: number;
  is_recommended: boolean;
  description?: string;
}

interface RateLimitInfo {
  current_count: number;
  limit: number;
  remaining: number;
  reset_at: Date;
  can_generate: boolean;
}

const GENERATION_CONSTRAINTS = {
  MIN_SOURCE_LENGTH: 1000,
  MAX_SOURCE_LENGTH: 10000,
  MIN_FLASHCARDS: 3,
  MAX_FLASHCARDS: 20,
  RATE_LIMIT_PER_HOUR: 10,
} as const;
```

## 6. Zarządzanie stanem

### useGenerateAI Hook
Custom hook zarządzający całym flow generowania AI:
```typescript
interface UseGenerateAIReturn {
  // State
  formData: GenerateFormData;
  formErrors: GenerateFormErrors;
  isGenerating: boolean;
  generationStep: GenerationStep;
  generationProgress: number;
  generationError: ErrorResponse | null;
  suggestions: EditableSuggestion[] | null;
  selectedSuggestionIndices: number[];
  generationMetadata: GenerationMetadata | null;
  rateLimit: RateLimitInfo;
  acceptModalOpen: boolean;
  acceptOptions: AcceptOptions;

  // Available data
  availableDecks: DeckDto[];
  availableModels: AIModel[];
  availableTags: TagWithUsageDto[];

  // Actions
  setFormData: (data: Partial<GenerateFormData>) => void;
  validateForm: () => boolean;
  generateFlashcards: () => Promise<void>;
  cancelGeneration: () => void;
  updateSuggestion: (index: number, suggestion: EditableSuggestion) => void;
  deleteSuggestion: (index: number) => void;
  selectSuggestion: (index: number, selected: boolean) => void;
  selectAllSuggestions: (selected: boolean) => void;
  openAcceptModal: () => void;
  closeAcceptModal: () => void;
  setAcceptOptions: (options: Partial<AcceptOptions>) => void;
  acceptSuggestions: () => Promise<void>;
  resetForm: () => void;

  // Computed
  selectedSuggestions: EditableSuggestion[];
  canGenerate: boolean;
  estimatedCost: number;
}
```

### Stan lokalny komponentów
- **Form state**: react-hook-form dla GenerateForm
- **Generation state**: progress tracking z WebSocket/updates
- **Suggestions state**: editable array z selection tracking
- **Modal state**: accept options i confirmation

### Stan globalny (Context)
- **Auth context**: aktualny użytkownik
- **Notification context**: success/error messages
- **Settings context**: user preferences (default model, etc.)

## 7. Integracja API

### GET /api/v1/decks (Lista talii)
**Request**:
```typescript
GET /api/v1/decks?sort=name&order=asc
Authorization: Bearer {access_token}
```

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "123",
      "name": "Programming",
      "flashcard_count": 42
    }
  ]
}
```

**Integration**: Ładowanie availableDecks w useGenerateAI

### POST /api/v1/generations/generate (Generowanie fiszek)
**Request**:
```json
{
  "source_text": "Python is a programming language...",
  "model": "openai/gpt-4o-mini",
  "deck_id": "123"
}
```

**Response** (201 Created):
```json
{
  "generation_id": "789",
  "model": "openai/gpt-4o-mini",
  "generated_count": 12,
  "source_text_length": 2500,
  "generation_duration_ms": 15000,
  "suggestions": [
    {
      "front": "What is Python?",
      "back": "A programming language"
    }
  ],
  "created_at": "2025-11-16T10:00:00Z"
}
```

**Integration**: Główna akcja w generateFlashcards()

### POST /api/v1/generations/:id/accept (Akceptacja sugestii)
**Request**:
```json
{
  "flashcards": [
    {
      "front": "What is Python?",
      "back": "A programming language",
      "edited": false
    }
  ]
}
```

**Response** (201 Created):
```json
{
  "accepted_count": 8,
  "flashcards": [
    {
      "id": "1001",
      "front": "What is Python?",
      "back": "A programming language",
      "source": "ai-full"
    }
  ]
}
```

**Integration**: Akcja acceptSuggestions() w modal

### Dodatkowe endpointy
- **GET /api/v1/tags**: dla tag suggestions (optional)
- **Rate limit info**: embedded w responses lub separate endpoint

## 8. Interakcje użytkownika

### Form Interactions
- **Text input**: Auto-resize textarea z character counting
- **Model selection**: Visual cards z cost info
- **Deck selection**: Dropdown z flashcard counts
- **Advanced options**: Collapsible section

### Generation Flow
- **Generate button**: Dynamic state (idle/loading/disabled)
- **Progress overlay**: Real-time updates z cancel option
- **Error recovery**: Retry options dla failed generations

### Suggestions Management
- **Edit mode**: Inline editing każdej sugestii
- **Bulk selection**: Checkboxy dla mass operations
- **Quality indicators**: Visual feedback o jakości sugestii
- **Tag suggestions**: AI-generated tag recommendations

### Acceptance Flow
- **Modal confirmation**: Summary przed akceptacją
- **Options selection**: Tags, deck assignment
- **Final confirmation**: Create flashcards

### Keyboard Shortcuts
- **Ctrl+Enter**: Submit generate form
- **Escape**: Cancel generation lub close modals
- **Tab/Shift+Tab**: Navigate przez suggestions

### Visual Feedback
- **Rate limit**: Color-coded progress bar
- **Cost estimation**: Real-time calculation
- **Quality scores**: Color indicators
- **Loading states**: Skeletons i progress bars

## 9. Warunki i walidacja

### Source Text Validation
```typescript
const sourceTextSchema = z.string()
  .min(1000, "Tekst źródłowy musi mieć minimum 1000 znaków")
  .max(10000, "Tekst źródłowy nie może przekraczać 10000 znaków")
  .refine(text => text.trim().length > 0, "Tekst źródłowy nie może być pusty")
  .refine(text => {
    // Check for meaningful content (not just spaces/repeated chars)
    const words = text.trim().split(/\s+/).length;
    return words >= 50; // Minimum 50 words
  }, "Tekst źródłowy musi zawierać przynajmniej 50 słów");
```

### Model Selection Validation
```typescript
const modelSchema = z.string()
  .refine(modelId => ALLOWED_MODELS.includes(modelId),
    "Wybrany model nie jest dostępny")
  .refine(async (modelId) => {
    // Check model availability (future: maintenance mode)
    return await checkModelAvailability(modelId);
  }, "Model jest tymczasowo niedostępny");
```

### Deck Selection Validation
```typescript
const deckIdSchema = z.string()
  .min(1, "Talia jest wymagana")
  .refine(async (deckId) => {
    return await verifyDeckOwnership(deckId, userId);
  }, "Nie masz dostępu do tej talii");
```

### Rate Limit Validation
```typescript
const rateLimitCheck = async (): Promise<boolean> => {
  const rateLimit = await getRateLimitInfo(userId);
  return rateLimit.can_generate;
};

// Pre-flight check before API call
if (!await rateLimitCheck()) {
  throw new RateLimitExceededError(rateLimit);
}
```

### Suggestions Validation
```typescript
const suggestionSchema = z.object({
  front: z.string()
    .min(1, "Pytanie jest wymagane")
    .max(200, "Pytanie jest zbyt długie"),
  back: z.string()
    .min(1, "Odpowiedź jest wymagana")
    .max(500, "Odpowiedź jest zbyt długa")
});

// Validate all edited suggestions before acceptance
const validateSuggestions = (suggestions: EditableSuggestion[]): boolean => {
  return suggestions.every(suggestion =>
    suggestionSchema.safeParse(suggestion.edited).success
  );
};
```

### Business Rules Validation
- **Rate limiting**: 10 generations/hour per user
- **Cost limits**: Per-user spending limits (future)
- **Content quality**: AI response validation
- **Deck ownership**: User can only generate into owned decks
- **Tag accessibility**: Can only assign accessible tags

### Real-time Validation
- **OnChange**: Character counting, basic format validation
- **OnBlur**: Full field validation z error messages
- **Pre-submit**: Rate limit checking
- **Post-generation**: AI response validation

## 10. Obsługa błędów

### API Errors
- **400 Bad Request**: Form validation errors, highlight invalid fields
- **401 Unauthorized**: Redirect to login
- **402 Payment Required**: Insufficient credits (future)
- **429 Too Many Requests**: Rate limit exceeded with countdown
- **500 Internal Error**: AI service errors, retry options
- **502 Bad Gateway**: OpenRouter.ai unavailable
- **503 Service Unavailable**: AI timeout, queue full

### Network Errors
- **Timeout**: "Generowanie trwa dłużej niż oczekiwano. Spróbuj ponownie."
- **Connection failed**: "Brak połączenia z internetem"
- **Retry logic**: Exponential backoff dla AI calls

### Validation Errors
- **Field-level**: Red borders + inline error messages
- **Form-level**: Alert banner z summary
- **Rate limit**: Special UI z countdown timer
- **AI errors**: User-friendly messages dla różnych failure types

### Business Logic Errors
- **Rate limit exceeded**: Clear countdown i upgrade options
- **Invalid AI response**: "Wygenerowane fiszki są nieprawidłowe. Spróbuj ponownie."
- **Deck access denied**: "Nie masz dostępu do wybranej talii"

### User Experience
- **Progressive disclosure**: Errors revealed kontekstowo
- **Helpful recovery**: Clear retry options i alternative actions
- **Graceful degradation**: Fallback dla failed generations
- **Context preservation**: Maintain form state podczas error recovery

### Edge Cases
- **Empty suggestions**: "AI nie wygenerował żadnych fiszek. Spróbuj zmienić tekst źródłowy."
- **Partial failures**: Allow acceptance of valid suggestions, warn about invalid
- **Cost estimation errors**: Fallback do conservative estimates
- **Long generations**: Progress updates i cancel options

## 11. Kroki implementacji

### Krok 1: Setup projektu i dependencies
1. Utwórz strukturę katalogów `/src/components/generate-ai/`
2. Zainstaluj dodatkowe dependencies:
   - `react-hook-form` dla form management
   - `@headlessui/react` dla advanced modals
   - `framer-motion` dla animations (progress)

### Krok 2: Implementacja typów i schematów walidacji
1. Utwórz `/src/lib/validation/generate-ai.ts`
2. Zdefiniuj Zod schemas dla wszystkich form i operations
3. Utwórz TypeScript interfaces dla ViewModels i propsów

### Krok 3: Implementacja useGenerateAI hook
1. Utwórz `/src/lib/hooks/useGenerateAI.ts`
2. Zaimplementuj kompleksowy stan zarządzania
3. Dodaj API integration functions
4. Implementuj rate limit tracking i progress updates

### Krok 4: Implementacja podstawowych komponentów
1. Utwórz `GenerateForm.tsx` z walidacją
2. Utwórz `SourceTextArea.tsx` z character counting
3. Utwórz `ModelSelector.tsx` z cost display
4. Utwórz `RateLimitIndicator.tsx` z countdown

### Krok 5: Implementacja GenerationProgress
1. Utwórz `GenerationProgress.tsx` z animated progress
2. Implementuj step tracking i cancel functionality
3. Dodaj error states i retry options

### Krok 6: Implementacja SuggestionsList i SuggestionCard
1. Utwórz `SuggestionsList.tsx` z bulk operations
2. Utwórz `SuggestionCard.tsx` z edit mode
3. Implementuj selection management
4. Dodaj quality scoring

### Krok 7: Implementacja AcceptSuggestionsModal
1. Utwórz modal z summary i options
2. Implementuj tag assignment logic
3. Dodaj deck selection options
4. Testuj acceptance flow

### Krok 8: Implementacja głównego GeneratePage
1. Utwórz główny komponent integrujący wszystkie części
2. Dodaj initial data loading (decks, models)
3. Implementuj generation flow orchestration
4. Dodaj error boundaries

### Krok 9: Implementacja strony Astro
1. Utwórz `/src/pages/generate.astro`
2. Dodaj client directives dla React components
3. Skonfiguruj routing z optional params
4. Dodaj meta tags i SEO

### Krok 10: Stylizacja i responsive design
1. Zastosuj Tailwind CSS zgodnie z design system
2. Zaimplementuj mobile-first approach
3. Dodaj smooth animations dla transitions
4. Zapewnij consistency z resztą aplikacji

### Krok 11: Testowanie i optymalizacja
1. Unit tests dla hooków i komponentów
2. Integration tests dla pełnych generation flows
3. E2E tests z mock AI responses
4. Performance testing dla long generations
5. Rate limit testing i edge cases
