# Dokument wymagań produktu (PRD) - 10x-cards

## 1. Przegląd produktu

10x-cards to aplikacja webowa do tworzenia i zarządzania fiszkami edukacyjnymi z wykorzystaniem sztucznej inteligencji. Narzędzie ma ułatwić tworzenie fiszek AI oraz zapewnić łatwą obsługę wielu fiszek poprzez możliwość ich segregacji, wyszukiwania i kategoryzacji przy użyciu talii (decks) oraz tagów.

Główne cechy produktu:
- Uwierzytelnianie i autoryzacja użytkowników (Supabase Auth)
- Tworzenie fiszek ręcznie lub automatycznie z wykorzystaniem AI (OpenRouter.ai)
- Organizacja fiszek w talie (decks)
- Tagowanie i kategoryzacja fiszek
- Wyszukiwanie pełnotekstowe
- Automatyczna migracja fiszek przy usuwaniu talii

Technologie:
- Backend: REST API z integracją Supabase
- Baza danych: PostgreSQL z Row Level Security (RLS)
- Uwierzytelnianie: Supabase Auth (JWT)
- AI: OpenRouter.ai dla generowania fiszek
- Architektura: RESTful API z wersjonowaniem (v1)

Grupa docelowa:
- Studenci przygotowujący się do egzaminów
- Uczniowie języków obcych
- Osoby uczące się nowych umiejętności
- Nauczyciele tworzący materiały edukacyjne

## 2. Problem użytkownika

Tradycyjne metody nauki często prowadzą do nieefektywnego zapamiętywania informacji. Użytkownicy borykają się z następującymi problemami:

Wyzwanie 1: Czasochłonne tworzenie fiszek
- Ręczne tworzenie fiszek z materiałów źródłowych jest żmudne i czasochłonne

Wyzwanie 3: Słaba organizacja materiałów
- Brak centralnego miejsca na zarządzanie fiszkami

Celem rozwiązania jest skrócenie czasu potrzebnego na tworzenie odpowiednich pytań i odpowiedzi oraz uproszczenie procesu zarządzania materiałem do nauki.

## 3. Wymagania funkcjonalne

### 3.1 Zarządzanie kontami użytkowników
FR-001: System musi umożliwiać rejestrację nowych użytkowników z adresem email i hasłem
FR-002: System musi umożliwiać logowanie użytkowników
FR-003: System musi umożliwiać wylogowanie użytkowników
FR-004: System musi umożliwiać usunięcie konta użytkownika

### 3.2 Zarządzanie taliami (Decks)
FR-005: System musi automatycznie tworzyć domyślną talię "Uncategorized" dla każdego nowego użytkownika
FR-006: System musi umożliwiać tworzenie nowych talii
FR-007: System musi umożliwiać przeglądanie listy talii użytkownika
FR-008: System musi umożliwiać wyświetlanie szczegółów pojedynczej talii
FR-009: System musi umożliwiać edycję talii
FR-010: System musi umożliwiać usuwanie talii z migracją fiszek
FR-011: System musi umożliwiać pobieranie domyślnej talii użytkownika

### 3.3 Zarządzanie fiszkami (Flashcards)
FR-012: System musi umożliwiać ręczne tworzenie fiszek
FR-013: System musi umożliwiać przeglądanie listy fiszek
FR-014: System musi umożliwiać wyświetlanie szczegółów pojedynczej fiszki
FR-015: System musi umożliwiać edycję fiszek
FR-016: System musi umożliwiać usuwanie fiszek
FR-017: System musi umożliwiać dodawanie tagów do fiszki
FR-018: System musi umożliwiać usuwanie tagów z fiszki

### 3.4 Generowanie fiszek AI
FR-019: System musi umożliwiać generowanie fiszek z tekstu źródłowego przy użyciu AI
FR-020: System musi implementować limit częstotliwości dla generowania AI
FR-021: System musi zapisywać metadane generacji
FR-022: System musi umożliwiać akceptację wygenerowanych fiszek
FR-023: System musi umożliwiać przeglądanie historii generacji
FR-024: System musi umożliwiać wyświetlanie szczegółów pojedynczej generacji

### 3.6 Zarządzanie tagami
FR-031: System musi umożliwiać przeglądanie dostępnych tagów
FR-032: System musi umożliwiać tworzenie tagów przypisanych do talii
FR-033: System musi umożliwiać edycję tagów użytkownika
FR-034: System musi umożliwiać usuwanie tagów użytkownika
FR-035: System musi automatycznie tworzyć tagi "#deleted-from-[nazwa]" przy usuwaniu talii

### 3.7 Bezpieczeństwo i autoryzacja
FR-036: System musi implementować Row Level Security (RLS)
FR-037: System musi wymagać autentykacji dla wszystkich endpointów (poza auth)
FR-038: System musi weryfikować własność zasobów
FR-039: System musi sanityzować wszystkie dane wejściowe
FR-040: System musi używać HTTPS dla całej komunikacji

## 4. Granice produktu

### 4.1 Co jest w zakresie MVP

W zakresie:
- Uwierzytelnianie i zarządzanie kontem użytkownika
- Tworzenie i zarządzanie taliami (decks)
- Tworzenie fiszek ręcznie i przez AI
- Tagowanie fiszek (global i deck-scoped)
- Wyszukiwanie i filtrowanie


### 4.2 Co jest poza zakresem MVP

Poza zakresem (future enhancements):
- Algorytmy powtórek
- Udostępnianie talii innym użytkownikom (deck_collaborators)
- Role: cooperator, viewer
- Publiczne talie (visibility: public, shared)
- Klonowanie talii innych użytkowników
- Import/export fiszek (CSV, Anki)
- Zaawansowane wyszukiwanie (multiple tags, date ranges)
- Zapisane zapytania wyszukiwania
- Notyfikacje i przypomnienia (webhook, push, email)
- Szczegółowe analytics i dashboard
- Operacje bulk (bulk create, update, delete)
- Mobilne aplikacje natywne (iOS, Android)
- Offline mode
- Obrazki w fiszkach
- Audio w fiszkach
- Współdzielone sesje nauki
- Gamifikacja (achievements, streaks)
- Rankingi i leaderboards
- Integracje z innymi platformami edukacyjnymi
- Własny hosting modeli AI
- Personalizacja UI/themes
- Zaawansowane ustawienia algorytmu powtórek
- Multi-language support (MVP tylko angielski)

## 5. Historyjki użytkowników

### 5.1 Uwierzytelnianie i zarządzanie kontem

US-001: Rejestracja nowego użytkownika
Jako nowy użytkownik
Chcę zarejestrować się w systemie za pomocą adresu email i hasła
Aby móc tworzyć i zarządzać swoimi fiszkami

Kryteria akceptacji:
- System przyjmuje poprawny adres email i hasło
- Hasło jest walidowane pod względem siły (minimum wymagań bezpieczeństwa)
- Po rejestracji system automatycznie tworzy talię "Uncategorized" dla użytkownika

### 5.2 Zarządzanie taliami

US-007: Przeglądanie listy talii
Jako użytkownik
Chcę zobaczyć listę wszystkich moich talii
Aby wybrać talię do nauki lub zarządzania

Kryteria akceptacji:
- System zwraca wszystkie talie należące do zalogowanego użytkownika
- Lista zawiera nazwę, opis, liczbę fiszek, daty created_at i updated_at

### 5.3 Zarządzanie fiszkami - tworzenie ręczne

US-017: Edycja fiszki
Jako użytkownik
Chcę edytować treść fiszki
Aby poprawić lub zaktualizować informacje

Kryteria akceptacji:
- System przyjmuje nowy front (1-200 znaków, opcjonalny)
- System przyjmuje nowy back (1-500 znaków, opcjonalny)
- System przyjmuje nowy deck_id (opcjonalny, musi istnieć i należeć do użytkownika)
- Wszystkie pola są opcjonalne
- System aktualizuje updated_at
- Jeśli fiszka ma source = "ai-full" i zostanie edytowany front lub back, system zmienia source na "ai-edited"
- Jeśli fiszka ma source = "manual" lub "ai-edited", source pozostaje bez zmian

### 5.4 Generowanie fiszek AI

US-021: Generowanie fiszek z tekstu źródłowego
Jako użytkownik
Chcę wygenerować fiszki z tekstu źródłowego używając AI
Aby szybko utworzyć wiele fiszek bez ręcznego pisania

Kryteria akceptacji:
- System przyjmuje source_text (1000-10000 znaków, wymagany)
- System przyjmuje model (wymagany, poprawny identyfikator z OpenRouter.ai)
- System przyjmuje deck_id (wymagany, musi istnieć i należeć do użytkownika)
- System generuje hash tekstu źródłowego (do deduplikacji)
- System wysyła request do OpenRouter.ai
- System mierzy czas generowania (generation_duration)
- System zapisuje metadane generacji (id, model, generated_count, source_text_hash, source_text_length, generation_duration)
- System zwraca status 201 Created z:
  - id generacji
  - metadanymi generacji
  - tablicą suggestions (front, back dla każdej fiszki)
- System NIE zapisuje automatycznie fiszek (użytkownik musi je zaakceptować)

### 5.6 Zarządzanie tagami

US-031: Przeglądanie dostępnych tagów
Jako użytkownik
Chcę zobaczyć listę dostępnych tagów
Aby móc przypisać je do fiszek

Kryteria akceptacji:
- System zwraca tagi globalne (scope: global)
- System zwraca tagi użytkownika przypisane do talii (scope: deck)
- System obsługuje filtrowanie po scope (global, deck)
- System obsługuje filtrowanie po deck_id (dla tagów deck-scoped)
- System obsługuje wyszukiwanie po nazwie
- Każdy tag zawiera: id, name, scope, usage_count
- Tagi deck-scoped zawierają też: deck_id, user_id

US-032: Tworzenie tagu przypisanego do talii
Jako użytkownik
Chcę utworzyć własny tag przypisany do talii
Aby kategoryzować fiszki w sposób specyficzny dla mojej talii

Kryteria akceptacji:
- System przyjmuje name (1-50 znaków, wymagany)
- System przyjmuje deck_id (wymagany, musi istnieć i należeć do użytkownika)
- Nazwa musi być unikalna w obrębie talii
- System automatycznie ustawia scope = "deck"
- System automatycznie przypisuje user_id zalogowanego użytkownika

### 5.7 Wyszukiwanie i filtrowanie

US-036: Wyszukiwanie pełnotekstowe fiszek
Jako użytkownik
Chcę wyszukać fiszki po ich zawartości
Aby szybko znaleźć konkretną informację

Kryteria akceptacji:
- System przyjmuje query parameter "search"
- System wyszukuje w polach front i back
- System używa PostgreSQL full-text search (tsvector, GIN index)
- System zwraca fiszki zawierające wyszukiwane słowa
- Wyniki są paginowane

US-037: Filtrowanie fiszek po wielu kryteriach
Jako użytkownik
Chcę filtrować fiszki po różnych kryteriach jednocześnie
Aby zawęzić wyniki do interesujących mnie fiszek

Kryteria akceptacji:
- System obsługuje jednoczesne filtrowanie po:
  - deck_id
  - source (manual, ai-full, ai-edited)
  - tag_id
  - search (full-text)
- Filtry działają jako AND (wszystkie muszą być spełnione)
- Wyniki są paginowane i sortowane

US-038: Sortowanie list
Jako użytkownik
Chcę móc sortować listy talii i fiszek
Aby przeglądać je w preferowanej kolejności

Kryteria akceptacji:
- System obsługuje parametry sort i order
- Dla talii: sort = created_at, updated_at, name
- Dla fiszek: sort = created_at, updated_at
- Order: asc lub desc
- Domyślnie: sort = created_at, order = desc

### 5.8 Bezpieczeństwo

US-040: Row Level Security (RLS)
Jako system
Chcę automatycznie filtrować dane po user_id
Aby użytkownicy widzieli tylko swoje dane

Kryteria akceptacji:
- Wszystkie zapytania do bazy są automatycznie filtrowane przez RLS
- Polityki RLS sprawdzają: user_id = auth.uid()
- Użytkownik nie może zobaczyć danych innego użytkownika
- Użytkownik nie może modyfikować danych innego użytkownika
- RLS działa na poziomie bazy danych (nie aplikacji)

US-041: Walidacja własności zasobów
Jako system
Gdy użytkownik próbuje uzyskać dostęp do zasobu
System powinien sprawdzić czy zasób należy do użytkownika
Aby zapobiec nieautoryzowanemu dostępowi

Kryteria akceptacji:
- System weryfikuje własność przed każdą operacją CRUD
- Dla decks: user_id musi się zgadzać
- Dla flashcards: user_id musi się zgadzać
- Dla reviews: user_id musi się zgadzać
- Dla generations: user_id musi się zgadzać
- Dla tags deck-scoped: user_id musi się zgadzać
- System zwraca błąd 404 jeśli zasób nie istnieje lub nie należy do użytkownika
- System nie ujawnia czy zasób istnieje, ale nie należy do użytkownika (zawsze 404)

## 6. Metryki sukcesu

### 6.5 Metryki biznesowe (future)
M-012: Koszt AI na użytkownika
- Średni koszt wywołań OpenRouter.ai na użytkownika miesięcznie
- ROI generacji AI (wartość dla użytkownika vs koszt)
- Cel: monitorowanie i optymalizacja kosztów

### 6.6 Metryki produktowe

M-014: Wykorzystanie funkcji
- Procent użytkowników używających tagów
- Procent użytkowników używających wyszukiwania
- Procent użytkowników tworzących więcej niż 1 talię
- Cel MVP: 60% używa tagów i wyszukiwania, 75% ma więcej niż 1 talię


### 6.7 KPI dla MVP

Kluczowe wskaźniki sukcesu MVP (3 miesiące po uruchomieniu):
1. 80% użytkowników tworzy fiszki z wykorzystaniem AI
2. 60% acceptance rate dla generacji AI
3. Error rate < 1%

Definicja sukcesu MVP:
- Produkt jest stabilny technicznie (uptime, performance)
- AI generuje wartościowe fiszki (wysoki acceptance rate)
- System wyszukiwania i tagowania jest wykorzystywany przez większość użytkowników
- Podstawowa funkcjonalność działa zgodnie z oczekiwaniami (brak krytycznych bugów)

