# Architektura UI dla 10x-cards

## 1. Przegląd struktury UI

Architektura interfejsu użytkownika dla aplikacji 10x-cards została zaprojektowana w oparciu o wymagania MVP z PRD, specyfikację REST API v1 oraz wnioski z sesji planowania UI. Struktura opiera się na hierarchicznej nawigacji odzwierciedlającej strukturę danych API, z naciskiem na responsywność mobilną, dostępność WCAG 2.1 AA oraz bezpieczeństwo.

Główna struktura składa się z trzech poziomów hierarchii:
- **Poziom główny**: Dashboard z listą talii
- **Poziom talii**: Szczegóły wybranej talii z fiszkami
- **Poziom fiszek**: Szczegóły pojedynczej fiszki

Dodatkowe funkcjonalności (generowanie AI, zarządzanie tagami) dostępne są jako osobne sekcje głównej nawigacji. Wszystkie widoki wykorzystują wspólne komponenty (layout, nawigacja, paginacja, wyszukiwanie) dla zapewnienia spójności.

## 2. Lista widoków

### 2.1 Widok logowania/rejestracji
- **Ścieżka**: `/login`, `/register`
- **Główny cel**: Uwierzytelnienie użytkownika w systemie Supabase Auth
- **Kluczowe informacje**: Formularze rejestracji/logowania, walidacja siły hasła, komunikaty błędów
- **Kluczowe komponenty**: LoginForm, RegisterForm, PasswordStrengthIndicator
- **UX**: Prosta, intuicyjna rejestracja z natychmiastowym feedbackiem; automatyczne przekierowanie po sukcesie
- **Dostępność**: Pełna nawigacja klawiszowa, obsługa czytników ekranowych, komunikaty błędów w języku naturalnym
- **Bezpieczeństwo**: Walidacja siły hasła po stronie klienta, sanityzacja inputów, ochrona przed brute force

### 2.2 Dashboard główny
- **Ścieżka**: `/`
- **Główny cel**: Przegląd wszystkich talii użytkownika z możliwością zarządzania
- **Kluczowe informacje**: Lista talii z nazwą, opisem, liczbą fiszek, datami; przyciski akcji (utwórz, edytuj, usuń)
- **Kluczowe komponenty**: DeckList, CreateDeckModal, DeckCard, SearchBar, PaginationControls
- **UX**: Przewodnik wprowadzający dla nowych użytkowników, szybki dostęp do najczęściej używanych akcji
- **Dostępność**: Lista talii jako region nawigacyjny, focus management, keyboard shortcuts dla akcji
- **Bezpieczeństwo**: Weryfikacja własności talii, ochrona przed CSRF, bezpieczne usuwanie z potwierdzeniem

### 2.3 Szczegóły talii
- **Ścieżka**: `/decks/:id`
- **Główny cel**: Przegląd i zarządzanie fiszkami w wybranej talii
- **Kluczowe informacje**: Lista fiszek z front/back preview, tagi, źródło (manual/AI), przyciski edycji/usunięcia
- **Kluczowe komponenty**: FlashcardGrid, FlashcardPreview, TagDisplay, CreateFlashcardModal, FiltersPanel
- **UX**: Siatka kart z możliwością szybkiego podglądu, filtry kontekstowe, breadcrumbs do nawigacji
- **Dostępność**: Grid layout z semantic HTML, focus trapping w modalach, high contrast mode
- **Bezpieczeństwo**: Walidacja dostępu do talii, bezpieczne operacje CRUD, ochrona przed XSS w treści fiszek

### 2.4 Szczegóły fiszki
- **Ścieżka**: `/decks/:deckId/flashcards/:flashcardId`
- **Główny cel**: Szczegółowy podgląd i edycja pojedynczej fiszki
- **Kluczowe informacje**: Pełna treść front/back, metadane (źródło, data utworzenia), lista tagów, przyciski edycji
- **Kluczowe komponenty**: FlashcardDetailView, EditFlashcardModal, TagManager, GenerationInfo
- **UX**: Możliwość "odwrócenia" karty dla nauki, szybka edycja inline, kontekstowe akcje
- **Dostępność**: Semantic markup dla karty, keyboard navigation między sekcjami, screen reader support
- **Bezpieczeństwo**: Walidacja długości treści (1-200/1-500 znaków), tracking zmian source, bezpieczna edycja

### 2.5 Generowanie AI fiszek
- **Ścieżka**: `/generate`
- **Główny cel**: Generowanie nowych fiszek przy użyciu OpenRouter.ai
- **Kluczowe informacje**: Formularz z polem tekstu źródłowego, wyborem modelu, sugerowane fiszki, przycisk akceptacji
- **Kluczowe komponenty**: GenerateForm, ModelSelector, SuggestionsList, AcceptSuggestionsModal
- **UX**: Progres indicator dla generowania, podgląd sugestii przed akceptacją, rate limit feedback
- **Dostępność**: Form labels, progress announcements, keyboard navigation w listach sugestii
- **Bezpieczeństwo**: Rate limiting (10/h), walidacja długości tekstu (1000-10000), bezpieczna komunikacja z API

### 2.6 Zarządzanie tagami
- **Ścieżka**: `/tags`
- **Główny cel**: Przegląd i zarządzanie wszystkimi tagami użytkownika
- **Kluczowe informacje**: Lista tagów globalnych i deck-scoped z licznikami użycia, przyciski tworzenia/edycji
- **Kluczowe komponenty**: TagsList, CreateTagModal, TagUsageStats, DeckFilter
- **UX**: Filtrowanie po zakresie (global/deck), szybkie tworzenie nowych tagów, wizualne liczniki użycia
- **Dostępność**: Lista z semantic markup, focus management, keyboard shortcuts dla akcji
- **Bezpieczeństwo**: Walidacja unikalności nazw w ramach talii, ochrona przed duplikacją, bezpieczne usuwanie

### 2.7 Wyszukiwanie i filtrowanie (modal kontekstowy)
- **Ścieżka**: Modal w kontekście list
- **Główny cel**: Zaawansowane wyszukiwanie i filtrowanie fiszek/talii
- **Kluczowe informacje**: Pole wyszukiwania pełnotekstowego, filtry po tagach, źródle, deck, datach
- **Kluczowe komponenty**: SearchInput, FilterControls, DateRangePicker, SavedFilters
- **UX**: Debounced search, natychmiastowe wyniki, możliwość zapisywania ulubionych filtrów
- **Dostępność**: Form labels, live regions dla wyników, keyboard navigation
- **Bezpieczeństwo**: Sanityzacja query parameters, ochrona przed injection, bezpieczne filtrowanie

## 3. Mapa podróży użytkownika

### 3.1 Podróż nowego użytkownika
1. **Rejestracja** → Użytkownik trafia na stronę rejestracji z formularzem email/hasło
2. **Weryfikacja** → Po rejestracji automatyczne utworzenie domyślnej talii "Uncategorized"
3. **Onboarding** → Przekierowanie do dashboardu z interaktywnym przewodnikiem wprowadzającym
4. **Pierwsze akcje** → Użytkownik może od razu utworzyć nową talię lub przejść do generowania AI

### 3.2 Główny przypadek użycia: Zarządzanie fiszkami
1. **Dashboard** → Użytkownik przegląda listę talii, wybiera interesującą
2. **Szczegóły talii** → Widok fiszek w talii z opcjami filtrowania/wyszukiwania
3. **Szczegóły fiszki** → Szczegółowy podgląd wybranej fiszki
4. **Edycja/Akcje** → Możliwość edycji, tagowania lub usunięcia fiszki

### 3.3 Generowanie nowych fiszek AI
1. **Rozpoczęcie** → Z dashboardu lub szczegółów talii przejście do `/generate`
2. **Konfiguracja** → Wybór talii docelowej, modelu AI, wprowadzenie tekstu źródłowego
3. **Generowanie** → Proces z progress indicator, oczekiwanie na odpowiedź API
4. **Przegląd** → Wyświetlenie wygenerowanych sugestii do akceptacji
5. **Akceptacja** → Wybór fiszek do dodania, zapisanie do bazy z odpowiednim source

### 3.4 Zarządzanie organizacją
1. **Dashboard** → Tworzenie nowych talii dla różnych tematów
2. **Tagowanie** → Dodawanie tagów do fiszek dla lepszej kategoryzacji
3. **Filtrowanie** → Wyszukiwanie i filtrowanie po różnych kryteriach

### 3.5 Obsługa błędów i przypadki brzegowe
- **Błąd autoryzacji (401)** → Automatyczne przekierowanie do logowania
- **Rate limit (429)** → Informacja o limicie z przyciskiem retry
- **Błąd serwera (500)** → Toast z opcją retry, fallback do poprzedniego stanu
- **Brak danych** → Puste stany z call-to-action (np. "Utwórz pierwszą talię")

## 4. Układ i struktura nawigacji

### 4.1 Główna nawigacja
- **Desktop**: Horizontal bar z linkami: Dashboard, Tags, Generate AI, User Menu (profil, logout)
- **Mobile**: Hamburger menu z tymi samymi opcjami, collapsible sidebar
- **Umiejscowienie**: Fixed na górze strony, z logo aplikacji po lewej

### 4.2 Nawigacja hierarchiczna (Breadcrumbs)
- **Poziom 1**: Dashboard
- **Poziom 2**: Dashboard > [Nazwa talii]
- **Poziom 3**: Dashboard > [Nazwa talii] > [Front fiszki]
- **Implementacja**: Semantic breadcrumb navigation z linkami do wyższych poziomów

### 4.3 Nawigacja kontekstowa
- **W listach**: Przyciski akcji dla każdego elementu (view, edit, delete)
- **W formularzach**: Przyciski save/cancel, walidacja w czasie rzeczywistym
- **W modalach**: Focus trapping, ESC do zamknięcia, confirm dialogs dla destrukcyjnych akcji

### 4.4 Nawigacja klawiszowa
- **Globalne**: Tab navigation między sekcjami, Enter/Space dla akcji
- **Listy**: Arrow keys dla nawigacji, Enter dla wyboru
- **Formularze**: Tab między polami, Ctrl+Enter dla submit
- **Modals**: Tab cycling w modalu, ESC do zamknięcia

## 5. Kluczowe komponenty

### 5.1 Komponenty layoutu
- **AppLayout**: Główny kontener z nawigacją, breadcrumbs i content area
- **Navigation**: Responsive nav bar z menu mobile/desktop
- **Sidebar**: Collapsible panel dla dodatkowych akcji/filtrów

### 5.2 Komponenty danych
- **DataList**: Generyczny komponent list z paginacją i sortowaniem
- **DataCard**: Karta prezentująca pojedynczy element (deck, flashcard, tag)
- **DataGrid**: Siatka kart z responsywnym layoutem

### 5.3 Komponenty formularzy
- **FormField**: Wrapper dla inputów z walidacją i błędami
- **Modal**: Overlay dialog z focus management
- **Toast**: Powiadomienia dla feedbacku użytkownika

### 5.4 Komponenty interaktywne
- **SearchBar**: Input z debouncing i autocomplete
- **FilterPanel**: Złożone filtry z multi-select i date ranges
- **PaginationControls**: Kontrolki poprzedni/następny z info o stronach

### 5.5 Komponenty specjalizowane
- **FlashcardFlip**: Komponent do "odwracania" karty podczas nauki
- **TagSelector**: Multi-select dla przypisywania tagów
- **ProgressIndicator**: Wizualny indicator dla długotrwałych operacji (generowanie AI)

### 5.6 Komponenty bezpieczeństwa i dostępności
- **ErrorBoundary**: Catch JavaScript errors z fallback UI
- **LoadingSpinner**: Consistent loading states
- **ScreenReaderOnly**: Hidden text dla czytników ekranowych
