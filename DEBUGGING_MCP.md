# Debugowanie z użyciem wbudowanej przeglądarki Chrome MCP w Cursor

## Wprowadzenie

Cursor oferuje wbudowaną przeglądarkę Chrome przez MCP (Model Context Protocol), która pozwala na interaktywne debugowanie aplikacji webowych bezpośrednio z poziomu edytora.

## Konfiguracja MCP przeglądarki

MCP przeglądarka powinna być dostępna domyślnie w Cursor. Jeśli narzędzia MCP nie są dostępne:

1. **Sprawdź czy masz najnowszą wersję Cursor** - MCP przeglądarka jest dostępna w nowszych wersjach
2. **Sprawdź ustawienia MCP** - W Cursor Settings → Features → MCP powinna być włączona przeglądarka
3. **Restart Cursor** - Po zmianach w konfiguracji MCP może być potrzebny restart

Narzędzia MCP przeglądarki są dostępne automatycznie gdy są skonfigurowane - nie wymagają dodatkowej konfiguracji w projekcie.

## Dostępne narzędzia MCP przeglądarki

### 1. **Nawigacja**
- `browser_navigate(url)` - Przejdź do określonego URL
- `browser_navigate_back()` - Wróć do poprzedniej strony

### 2. **Inspekcja strony**
- `browser_snapshot()` - Pobierz snapshot dostępności strony (lepsze niż screenshot)
- `browser_take_screenshot()` - Zrób screenshot strony lub elementu
- `browser_console_messages()` - Pobierz wszystkie wiadomości z konsoli
- `browser_network_requests()` - Pobierz wszystkie żądania sieciowe

### 3. **Interakcje**
- `browser_click(element, ref)` - Kliknij element
- `browser_type(element, ref, text)` - Wpisz tekst do pola
- `browser_hover(element, ref)` - Najedź kursorem na element
- `browser_select_option(element, ref, values)` - Wybierz opcję z dropdown
- `browser_press_key(key)` - Naciśnij klawisz

### 4. **Oczekiwanie**
- `browser_wait_for(text/time)` - Czekaj na pojawienie się tekstu lub określony czas

## Przykładowy workflow debugowania

### Krok 1: Uruchom serwer deweloperski
```bash
npm run dev
```
Serwer powinien działać na `http://localhost:3000`

### Krok 2: Otwórz aplikację w przeglądarce MCP
Użyj `browser_navigate` aby przejść do aplikacji.

### Krok 3: Zbadaj stronę
- Użyj `browser_snapshot` aby zobaczyć strukturę strony
- Sprawdź `browser_console_messages` dla błędów JavaScript
- Przejrzyj `browser_network_requests` dla problemów z API

### Krok 4: Testuj interakcje
- Klikaj elementy używając `browser_click`
- Wypełniaj formularze używając `browser_type`
- Sprawdzaj czy aplikacja reaguje poprawnie

### Krok 5: Debuguj problemy
- Sprawdzaj komunikaty konsoli
- Analizuj żądania sieciowe
- Wykonuj screenshoty w różnych stanach aplikacji

## Przykłady użycia

### Przykład 1: Sprawdzenie strony głównej
```javascript
// 1. Przejdź do strony głównej
browser_navigate("http://localhost:3000")

// 2. Pobierz snapshot strony
browser_snapshot()

// 3. Sprawdź konsolę pod kątem błędów
browser_console_messages()
```

### Przykład 2: Testowanie formularza
```javascript
// 1. Przejdź do strony z formularzem
browser_navigate("http://localhost:3000/generate")

// 2. Pobierz snapshot aby zobaczyć elementy
browser_snapshot()

// 3. Wypełnij pole tekstowe (użyj ref z snapshot)
browser_type("Text input field", "ref_from_snapshot", "Test input")

// 4. Kliknij przycisk submit
browser_click("Submit button", "ref_from_snapshot")

// 5. Sprawdź konsolę i żądania sieciowe
browser_console_messages()
browser_network_requests()
```

### Przykład 3: Debugowanie błędów API
```javascript
// 1. Otwórz aplikację
browser_navigate("http://localhost:3000/flashcards")

// 2. Wykonaj akcję która wywołuje API
browser_click("Load flashcards button", "ref")

// 3. Sprawdź żądania sieciowe
browser_network_requests()

// 4. Sprawdź konsolę dla błędów
browser_console_messages()

// 5. Zrób screenshot stanu błędu
browser_take_screenshot()
```

## Najlepsze praktyki

1. **Zawsze zaczynaj od snapshot** - `browser_snapshot()` daje pełny obraz strony
2. **Sprawdzaj konsolę regularnie** - Błędy JavaScript mogą być niewidoczne wizualnie
3. **Monitoruj żądania sieciowe** - Problemy z API często widoczne są w network requests
4. **Używaj screenshotów** - Dokumentuj stany aplikacji przed i po zmianach
5. **Czekaj na elementy** - Używaj `browser_wait_for` przed interakcją z dynamicznymi elementami

## Przykład użycia dla projektu 10x Cards

### Debugowanie strony generowania fiszek

```javascript
// 1. Upewnij się że serwer działa
// npm run dev (powinien działać na http://localhost:3000)

// 2. Przejdź do strony generowania
browser_navigate("http://localhost:3000/generate")

// 3. Pobierz snapshot strony
browser_snapshot()
// Zwróci strukturę strony z wszystkimi elementami i ich refs

// 4. Sprawdź czy strona załadowała się poprawnie
browser_console_messages()
// Sprawdź czy są błędy JavaScript

// 5. Wypełnij pole tekstowe (użyj ref z snapshot)
browser_type("Text input area", "textarea_ref", "Przykładowy tekst do generowania fiszek...")

// 6. Kliknij przycisk generowania
browser_click("Generate button", "button_ref")

// 7. Czekaj na odpowiedź API
browser_wait_for("Flashcards generated") // lub określony czas

// 8. Sprawdź żądania sieciowe
browser_network_requests()
// Sprawdź czy żądanie do /api/v1/generations zostało wysłane poprawnie

// 9. Sprawdź konsolę po interakcji
browser_console_messages()
// Sprawdź czy są błędy związane z generowaniem

// 10. Zrób screenshot wyniku
browser_take_screenshot()
```

### Debugowanie autentykacji

```javascript
// 1. Przejdź do strony logowania
browser_navigate("http://localhost:3000/auth/login")

// 2. Sprawdź strukturę strony
browser_snapshot()

// 3. Wypełnij formularz logowania
browser_type("Email input", "email_input_ref", "test@example.com")
browser_type("Password input", "password_input_ref", "password123")

// 4. Kliknij przycisk logowania
browser_click("Login button", "login_button_ref")

// 5. Sprawdź żądania sieciowe
browser_network_requests()
// Sprawdź czy żądanie do Supabase Auth zostało wysłane

// 6. Sprawdź konsolę
browser_console_messages()
// Sprawdź czy są błędy autentykacji

// 7. Sprawdź czy nastąpiło przekierowanie
browser_snapshot()
// Powinieneś być na stronie głównej po udanym logowaniu
```

### Debugowanie błędów API

```javascript
// 1. Otwórz aplikację
browser_navigate("http://localhost:3000/flashcards")

// 2. Wykonaj akcję która wywołuje API
browser_click("Load flashcards", "load_button_ref")

// 3. Sprawdź żądania sieciowe
const requests = browser_network_requests()
// Znajdź żądanie do /api/v1/flashcards
// Sprawdź status code (powinien być 200, nie 401/500)

// 4. Jeśli jest błąd 401 (Unauthorized)
// - Sprawdź czy użytkownik jest zalogowany
// - Sprawdź czy token jest wysyłany w headers

// 5. Jeśli jest błąd 500 (Server Error)
// - Sprawdź konsolę serwera (terminal gdzie działa npm run dev)
// - Sprawdź konsolę przeglądarki dla szczegółów błędu

// 6. Sprawdź konsolę przeglądarki
browser_console_messages()
// Błędy API często są logowane w konsoli
```

## Rozwiązywanie problemów

### Problem: Element nie został znaleziony
- Upewnij się, że używasz poprawnego `ref` z `browser_snapshot()`
- Sprawdź czy element jest widoczny (może być ukryty lub załadowany asynchronicznie)
- Użyj `browser_wait_for` aby poczekać na pojawienie się elementu
- W aplikacjach React/Astro elementy mogą być renderowane asynchronicznie

### Problem: Strona nie ładuje się
- Sprawdź czy serwer deweloperski działa (`npm run dev`)
- Sprawdź konsolę przeglądarki dla błędów
- Sprawdź żądania sieciowe dla błędów 404/500
- Upewnij się że port 3000 jest dostępny (sprawdź `astro.config.mjs`)

### Problem: Interakcje nie działają
- Sprawdź czy element jest klikalny (może być zablokowany przez overlay)
- Sprawdź konsolę dla błędów JavaScript
- Użyj `browser_snapshot` aby zobaczyć aktualny stan strony
- W aplikacjach React sprawdź czy komponent jest w stanie "loading"

### Problem: MCP przeglądarka nie działa
- Sprawdź czy masz najnowszą wersję Cursor
- Sprawdź ustawienia MCP w Cursor Settings
- Spróbuj zrestartować Cursor
- Sprawdź czy serwer działa przed próbą nawigacji

