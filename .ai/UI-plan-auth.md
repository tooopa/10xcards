# Plan implementacji widoku logowania/rejestracji

## 1. Przegląd

Widok logowania/rejestracji umożliwia użytkownikom uwierzytelnienie się w systemie aplikacji 10xCards. Składa się z dwóch głównych formularzy: logowania dla istniejących użytkowników oraz rejestracji dla nowych. Implementacja wykorzystuje Supabase Auth z natywnymi endpointami, zapewniając bezpieczne zarządzanie sesjami JWT i automatyczne tworzenie domyślnej talii "Uncategorized" dla nowych użytkowników.

## 2. Routing widoku

Widok jest dostępny pod ścieżkami:
- `/login` - strona logowania
- `/register` - strona rejestracji

Obie ścieżki renderują ten sam komponent z różnymi trybami wyświetlania.

## 3. Struktura komponentów

```
AuthPage (główny komponent)
├── Header z nawigacją między login/register
├── LoginForm (warunkowo renderowany)
│   ├── Input (email)
│   ├── Input (password)
│   ├── Button (submit)
│   └── Link do rejestracji
├── RegisterForm (warunkowo renderowany)
│   ├── Input (email)
│   ├── Input (password)
│   ├── PasswordStrengthIndicator
│   ├── Input (confirm password)
│   ├── Button (submit)
│   └── Link do logowania
└── ErrorMessage (globalny dla błędów)
```

## 4. Szczegóły komponentów

### AuthPage

- **Opis komponentu**: Główny komponent strony autentyfikacji, zarządza przełączaniem między trybami logowania i rejestracji. Implementuje pełne WCAG compliance z focus management i keyboard navigation.

- **Główne elementy**:
  - Header z tytułem aplikacji i przełącznikiem trybów
  - Kontener formularza z odpowiednim komponentem (LoginForm/RegisterForm)
  - Footer z linkami do pomocy i polityki prywatności

- **Obsługiwane interakcje**:
  - Przełączanie między trybami login/register
  - Keyboard navigation (Tab, Enter, Escape)
  - Form submission przez Enter
  - Linki nawigacyjne do innych sekcji

- **Obsługiwana walidacja**:
  - Brak bezpośredniej walidacji - deleguje do komponentów formularzy
  - Wymagane wypełnienie wszystkich pól przed submission

- **Typy**:
  - `AuthMode` - enum: 'login' | 'register'
  - `AuthPageProps` - opcjonalne propsy konfiguracyjne

- **Propsy**:
  ```typescript
  interface AuthPageProps {
    initialMode?: AuthMode;
    redirectTo?: string; // URL do przekierowania po sukcesie
  }
  ```

### LoginForm

- **Opis komponentu**: Formularz logowania dla istniejących użytkowników. Wykorzystuje react-hook-form do zarządzania stanem formularza i walidacji.

- **Główne elementy**:
  - Input email z walidacją formatu
  - Input hasła z toggle widoczności
  - Button submit z loading state
  - Link "Zapomniałeś hasła?" (future enhancement)
  - Link do rejestracji

- **Obsługiwane interakcje**:
  - onSubmit: wywołanie API logowania
  - onEmailChange: walidacja formatu email
  - onPasswordChange: aktualizacja stanu
  - onTogglePassword: przełączanie widoczności hasła
  - onSwitchToRegister: zmiana trybu na rejestrację

- **Obsługiwana walidacja**:
  - Email: wymagany, prawidłowy format email, maksymalnie 254 znaki
  - Hasło: wymagane, minimum 6 znaków, maksymalnie 128 znaków
  - Walidacja w czasie rzeczywistym z błędami pod polami

- **Typy**:
  - `LoginFormData`
  - `LoginFormErrors`
  - `LoginResponse` (z Supabase)

- **Propsy**:
  ```typescript
  interface LoginFormProps {
    onSuccess?: (user: User) => void;
    onSwitchToRegister?: () => void;
    redirectTo?: string;
  }
  ```

### RegisterForm

- **Opis komponentu**: Formularz rejestracji nowych użytkowników z wskaźnikiem siły hasła i potwierdzeniem hasła.

- **Główne elementy**:
  - Input email z walidacją formatu
  - Input hasła z PasswordStrengthIndicator
  - Input potwierdzenia hasła
  - Button submit z loading state
  - Link do logowania

- **Obsługiwane interakcje**:
  - onSubmit: wywołanie API rejestracji
  - onEmailChange: walidacja formatu email
  - onPasswordChange: walidacja siły hasła i synchronizacja potwierdzenia
  - onConfirmPasswordChange: walidacja zgodności haseł
  - onSwitchToLogin: zmiana trybu na logowanie

- **Obsługiwana walidacja**:
  - Email: wymagany, prawidłowy format, maksymalnie 254 znaki, unikalny w systemie
  - Hasło: wymagane, minimum 6 znaków, maksymalnie 128 znaków, spełnia wymagania siły
  - Potwierdzenie hasła: wymagane, musi się zgadzać z hasłem
  - Walidacja krzyżowa między polami hasła

- **Typy**:
  - `RegisterFormData`
  - `RegisterFormErrors`
  - `RegisterResponse` (z Supabase)

- **Propsy**:
  ```typescript
  interface RegisterFormProps {
    onSuccess?: (user: User) => void;
    onSwitchToLogin?: () => void;
    redirectTo?: string;
  }
  ```

### PasswordStrengthIndicator

- **Opis komponentu**: Wizualny wskaźnik siły hasła z kolorowymi paskami i wskazówkami. Oblicza siłę na podstawie zaimplementowanych reguł bezpieczeństwa.

- **Główne elementy**:
  - Paski siły (5 poziomów: very weak, weak, fair, good, strong)
  - Lista wymagań z statusem (spełnione/niespełnione)
  - Tekstowe wskazówki dotyczące siły hasła

- **Obsługiwane interakcje**:
  - Aktualizacja siły w czasie rzeczywistym przy zmianie hasła
  - Brak bezpośrednich interakcji użytkownika

- **Obsługiwana walidacja**:
  - Minimum 6 znaków
  - Przynajmniej 1 duża litera
  - Przynajmniej 1 mała litera
  - Przynajmniej 1 cyfra
  - Przynajmniej 1 znak specjalny
  - Maksymalnie 128 znaków

- **Typy**:
  - `PasswordStrength`

- **Propsy**:
  ```typescript
  interface PasswordStrengthIndicatorProps {
    password: string;
    className?: string;
  }
  ```

## 5. Typy

### Form Data Types
```typescript
interface LoginFormData {
  email: string;
  password: string;
}

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

interface LoginFormErrors {
  email?: string;
  password?: string;
  general?: string;
}

interface RegisterFormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}
```

### Password Strength Type
```typescript
interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4; // 0=very weak, 1=weak, 2=fair, 3=good, 4=strong
  feedback: string[]; // Lista wskazówek do poprawy
  isValid: boolean; // Czy spełnia minimalne wymagania
  checks: {
    length: boolean; // min 6 chars
    uppercase: boolean; // przynajmniej 1 duża litera
    lowercase: boolean; // przynajmniej 1 mała litera
    number: boolean; // przynajmniej 1 cyfra
    special: boolean; // przynajmniej 1 znak specjalny
  };
}
```

### Component Props Types
```typescript
type AuthMode = 'login' | 'register';

interface AuthPageProps {
  initialMode?: AuthMode;
  redirectTo?: string;
}

interface LoginFormProps {
  onSuccess?: (user: User) => void;
  onSwitchToRegister?: () => void;
  redirectTo?: string;
}

interface RegisterFormProps {
  onSuccess?: (user: User) => void;
  onSwitchToLogin?: () => void;
  redirectTo?: string;
}

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}
```

## 6. Zarządzanie stanem

Widok wykorzystuje kombinację local state i custom hook `useAuth`:

### Local State (komponent AuthPage)
- `mode: AuthMode` - aktualny tryb (login/register)
- `isLoading: boolean` - globalny stan ładowania
- `error: ErrorResponse | null` - globalny błąd

### useAuth Hook
Custom hook zarządzający stanem autentyfikacji:
```typescript
interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  login: (credentials: LoginFormData) => Promise<void>;
  register: (data: RegisterFormData) => Promise<void>;
  logout: () => Promise<void>;
}
```

### Form State Management
- react-hook-form dla zarządzania stanem formularzy
- Zod schemas dla walidacji
- Local state dla UI feedback (loading, errors)

## 7. Integracja API

### Endpointy Authentication (Supabase Auth)

#### POST /auth/v1/signup (Rejestracja)
**Request Body**:
```json
{
  "email": "string",
  "password": "string"
}
```

**Response Success (201)**:
```json
{
  "user": {
    "id": "uuid",
    "email": "string",
    "created_at": "timestamp"
  },
  "session": {
    "access_token": "string",
    "refresh_token": "string",
    "expires_in": "integer"
  }
}
```

**Integration**: Wywołanie przez `RegisterForm.onSubmit`, automatyczne utworzenie domyślnej talii "Uncategorized".

#### POST /auth/v1/token (Logowanie)
**Request Body**:
```json
{
  "email": "string",
  "password": "string"
}
```

**Response Success (200)**:
```json
{
  "access_token": "string",
  "refresh_token": "string",
  "expires_in": "integer",
  "user": {
    "id": "uuid",
    "email": "string"
  }
}
```

**Integration**: Wywołanie przez `LoginForm.onSubmit`, zapisanie sesji w cookies przez Supabase SDK.

### Error Handling
Wszystkie błędy mapowane na user-friendly messages:
- `invalid_credentials` → "Nieprawidłowy email lub hasło"
- `email_not_confirmed` → "Potwierdź swój adres email"
- `signup_disabled` → "Rejestracja jest tymczasowo niedostępna"
- `password_too_weak` → "Hasło jest zbyt słabe"

## 8. Interakcje użytkownika

### Form Navigation
- **Tab**: Przechodzenie między polami formularza
- **Enter**: Submit formularza
- **Escape**: Czyszczenie błędów walidacji
- **Shift+Tab**: Cofanie w nawigacji

### Visual Feedback
- **Focus indicators**: Niebieskie obramowanie dla aktywnego pola
- **Loading states**: Spinner na przyciskach podczas API calls
- **Error states**: Czerwone obramowanie i komunikaty błędów
- **Success states**: Zielony kolor dla poprawnie wypełnionych pól

### Accessibility
- **Screen readers**: ARIA labels i descriptions dla wszystkich pól
- **Keyboard navigation**: Pełna obsługa bez myszki
- **High contrast**: Obsługa trybu wysokiego kontrastu
- **Error announcements**: Automatyczne ogłaszanie błędów

### Progressive Enhancement
- **JavaScript disabled**: Fallback do standardowego form submit
- **Slow connections**: Progressive loading z skeleton screens
- **Offline**: Cache dla statycznych assets

## 9. Warunki i walidacja

### Email Validation
```typescript
const emailSchema = z.string()
  .min(1, "Email jest wymagany")
  .max(254, "Email jest zbyt długi")
  .email("Nieprawidłowy format email")
  .transform(email => email.toLowerCase().trim());
```

### Password Validation
```typescript
const passwordSchema = z.string()
  .min(6, "Hasło musi mieć minimum 6 znaków")
  .max(128, "Hasło jest zbyt długie")
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    "Hasło musi zawierać przynajmniej jedną małą literę, jedną dużą literę, jedną cyfrę i jeden znak specjalny");
```

### Form-level Validation
- **Login**: Email i hasło wymagane
- **Register**: Email, hasło i potwierdzenie hasła wymagane, hasła muszą się zgadzać
- **Real-time**: Walidacja przy onBlur i onChange
- **Submit**: Pełna walidacja wszystkich pól

### Business Rules Validation
- Email nie może już istnieć w systemie (sprawdzane przez Supabase)
- Hasło musi spełniać wymagania siły
- Potwierdzenie hasła musi się zgadzać z hasłem głównym
- Wszystkie dane wejściowe są sanityzowane (trim, lowercase dla email)

## 10. Obsługa błędów

### Network Errors
- **Timeout**: "Przekroczono czas oczekiwania. Spróbuj ponownie."
- **Connection failed**: "Brak połączenia z internetem. Sprawdź połączenie."
- **Retry logic**: Automatyczne ponowienie dla idempotentnych operacji

### Validation Errors
- **Field-level**: Wyświetlane pod każdym polem z błędem
- **Form-level**: Globalne błędy wyświetlane na górze formularza
- **Clear on focus**: Błędy znikają gdy użytkownik zaczyna poprawiać

### Authentication Errors
- **Invalid credentials**: "Nieprawidłowy email lub hasło"
- **Account not found**: "Konto nie istnieje"
- **Too many attempts**: "Zbyt wiele prób logowania. Spróbuj ponownie za 15 minut"
- **Account locked**: "Konto zostało zablokowane. Skontaktuj się z pomocą"

### Registration Errors
- **Email exists**: "Konto z tym adresem email już istnieje"
- **Weak password**: Delegowane do PasswordStrengthIndicator
- **Invalid email**: "Nieprawidłowy format adresu email"

### Recovery Actions
- **Retry buttons**: Dla błędów sieciowych
- **Reset forms**: Dla błędów walidacji
- **Navigation**: Do innych sekcji aplikacji
- **Help links**: Do dokumentacji i wsparcia

## 11. Kroki implementacji

### Krok 1: Setup projektu i dependencies
1. Utwórz strukturę katalogów w `/src/pages/auth/`
2. Zainstaluj wymagane dependencies:
   - `react-hook-form` dla zarządzania formularzami
   - `zod` dla walidacji
   - `@hookform/resolvers` dla integracji zod
   - `lucide-react` dla ikon (shadcn/ui)

### Krok 2: Implementacja typów i schematów walidacji
1. Utwórz `/src/lib/validation/auth.ts`
2. Zdefiniuj Zod schemas dla login i register
3. Utwórz TypeScript interfaces dla form data i errors
4. Zaimplementuj password strength validation logic

### Krok 3: Implementacja useAuth hook
1. Utwórz `/src/lib/hooks/useAuth.ts`
2. Zaimplementuj login i register functions
3. Dodaj error handling i loading states
4. Zintegruj z Supabase Auth SDK

### Krok 4: Implementacja PasswordStrengthIndicator
1. Utwórz komponent w `/src/components/auth/PasswordStrengthIndicator.tsx`
2. Zaimplementuj logikę obliczania siły hasła
3. Dodaj wizualne wskaźniki (paski, kolory)
4. Dodaj listę wymagań z statusami

### Krok 5: Implementacja LoginForm
1. Utwórz komponent `/src/components/auth/LoginForm.tsx`
2. Zintegruj react-hook-form z zod resolver
3. Dodaj pola email i password z walidacją
4. Zaimplementuj submit handler z API call
5. Dodaj loading states i error handling

### Krok 6: Implementacja RegisterForm
1. Utwórz komponent `/src/components/auth/RegisterForm.tsx`
2. Podobna struktura jak LoginForm
3. Dodaj PasswordStrengthIndicator
4. Dodaj pole confirm password z walidacją
5. Zaimplementuj cross-field validation

### Krok 7: Implementacja AuthPage
1. Utwórz główny komponent `/src/pages/auth/AuthPage.tsx`
2. Dodaj logikę przełączania między trybami
3. Zintegruj LoginForm i RegisterForm
4. Dodaj routing logic (login vs register)
5. Zaimplementuj success handling z redirect

### Krok 8: Implementacja stron Astro
1. Utwórz `/src/pages/login.astro`
2. Utwórz `/src/pages/register.astro`
3. Dodaj client directives dla React components
4. Skonfiguruj layout i meta tags

### Krok 9: Stylizacja i responsive design
1. Zastosuj Tailwind CSS classes zgodnie z design system
2. Zaimplementuj mobile-first approach
3. Dodaj dark mode support jeśli potrzebne
4. Zapewnij consistency z resztą aplikacji

### Krok 10: Testowanie i QA
1. Unit tests dla komponentów i hooków
2. Integration tests dla pełnych flows
3. E2E tests z Playwright
4. Accessibility testing z axe-core
5. Cross-browser testing

### Krok 11: Deployment i monitoring
1. Dodaj error tracking (Sentry)
2. Skonfiguruj analytics dla conversion tracking
3. Zaimplementuj rate limiting jeśli potrzebne
4. Monitoruj performance metrics
