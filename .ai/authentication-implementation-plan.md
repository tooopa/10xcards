# API Endpoint Implementation Plan: Authentication API

## 1. Przegląd punktu końcowego

System uwierzytelniania oparty na **Supabase Auth**, wykorzystujący natywne endpointy Supabase dla rejestracji, logowania i wylogowania. Jedyny custom endpoint to **DELETE /api/v1/user** dla usuwania konta z kaskadowym usunięciem wszystkich danych użytkownika. System używa JWT tokens dla autoryzacji, z automatycznym tworzeniem domyślnej talii "Uncategorized" przy rejestracji (database trigger).

**Kluczowe cechy**:
- Integracja z Supabase Auth (signup, login, logout)
- JWT-based authentication (access_token + refresh_token)
- Automatic default deck creation (trigger `on_user_created`)
- Cascade deletion dla DELETE user (RLS ON DELETE CASCADE)
- Email/password validation przez Supabase
- Session management przez Supabase SDK

**Obejmuje**:
- 3 natywne endpointy Supabase (signup, login, logout)
- 1 custom endpoint (DELETE /api/v1/user)
- Middleware integration (session handling)

## 2. Szczegóły żądania

### 2.1 POST /auth/v1/signup (Supabase Native)
- **Metoda HTTP**: POST
- **Struktura URL**: `/auth/v1/signup`
- **Provider**: Supabase Auth (nie wymaga custom implementacji)
- **Body** (wymagane):
  ```json
  {
    "email": "string (valid email, required)",
    "password": "string (min 6 chars, required)"
  }
  ```
- **Uwagi**: 
  - Używany przez Supabase SDK: `supabase.auth.signUp({email, password})`
  - Trigger `on_user_created` automatycznie tworzy default deck

### 2.2 POST /auth/v1/token?grant_type=password (Supabase Native)
- **Metoda HTTP**: POST
- **Struktura URL**: `/auth/v1/token?grant_type=password`
- **Provider**: Supabase Auth
- **Body** (wymagane):
  ```json
  {
    "email": "string (required)",
    "password": "string (required)"
  }
  ```
- **Uwagi**: Używany przez SDK: `supabase.auth.signInWithPassword({email, password})`

### 2.3 POST /auth/v1/logout (Supabase Native)
- **Metoda HTTP**: POST
- **Struktura URL**: `/auth/v1/logout`
- **Provider**: Supabase Auth
- **Nagłówki**: `Authorization: Bearer <access_token>` (wymagany)
- **Uwagi**: Używany przez SDK: `supabase.auth.signOut()`

### 2.4 DELETE /api/v1/user (Custom Endpoint)
- **Metoda HTTP**: DELETE
- **Struktura URL**: `/api/v1/user`
- **Nagłówki**: `Authorization: Bearer <access_token>` (wymagany)
- **Body**: brak
- **Uwaga**: Jedyny custom endpoint wymagający implementacji

## 3. Wykorzystywane typy

### Z `src/types.ts`:
- `ErrorResponse` – dla custom DELETE endpoint

### Supabase Auth Types (from SDK):
- `User` – user object z Supabase
- `Session` – session object (access_token, refresh_token, user)
- `AuthError` – error types z Supabase Auth

### Nie wymagane (Supabase handles):
- Signup/Login/Logout request/response DTOs (handled by SDK)

### Nowe typy (internal):
- Brak potrzeby custom DTOs dla auth
- ErrorResponse wystarczający dla DELETE endpoint

## 4. Szczegóły odpowiedzi

### 4.1 POST /auth/v1/signup (Supabase)
- **201 Created**:
  ```json
  {
    "user": {
      "id": "uuid",
      "email": "string",
      "created_at": "timestamp",
      "...": "other Supabase user fields"
    },
    "session": {
      "access_token": "string (JWT)",
      "refresh_token": "string",
      "expires_in": 3600,
      "token_type": "bearer",
      "user": {...}
    }
  }
  ```
- **400**: invalid email format, weak password
- **422**: email already exists (unprocessable entity)

### 4.2 POST /auth/v1/token (Supabase)
- **200 OK**:
  ```json
  {
    "access_token": "string (JWT)",
    "refresh_token": "string",
    "expires_in": 3600,
    "token_type": "bearer",
    "user": {
      "id": "uuid",
      "email": "string",
      "...": "other fields"
    }
  }
  ```
- **400**: invalid credentials

### 4.3 POST /auth/v1/logout (Supabase)
- **204 No Content**
- **401**: unauthorized (invalid token)

### 4.4 DELETE /api/v1/user (Custom)
- **204 No Content**
- **401**: unauthorized (no session)
- **500**: cascade deletion failure

## 5. Przepływ danych

### 5.1 POST /auth/v1/signup (Supabase handled)
1. **Frontend** wywołuje Supabase SDK:
   ```typescript
   const { data, error } = await supabase.auth.signUp({
     email: 'user@example.com',
     password: 'password123'
   });
   ```
2. **Supabase Auth** (external service):
   - Validates email format
   - Validates password strength (min 6 chars, configurable)
   - Hashes password (bcrypt)
   - Creates user w `auth.users` table
   - Generates JWT tokens (access + refresh)
3. **Database Trigger** `on_user_created`:
   - Fires AFTER INSERT ON auth.users
   - Calls `create_default_deck_for_user()` function
   - Inserts default "Uncategorized" deck z `is_default=true`
4. **Response**: Supabase zwraca user + session
5. **Frontend**: Stores tokens (localStorage/cookies), redirects to app

### 5.2 POST /auth/v1/token (Supabase handled)
1. **Frontend** wywołuje SDK:
   ```typescript
   const { data, error } = await supabase.auth.signInWithPassword({
     email: 'user@example.com',
     password: 'password123'
   });
   ```
2. **Supabase Auth**:
   - Verifies email exists
   - Verifies password hash match
   - Generates new JWT tokens
   - Creates session
3. **Response**: Supabase zwraca access_token + refresh_token + user
4. **Frontend**: Stores tokens, updates UI

### 5.3 POST /auth/v1/logout (Supabase handled)
1. **Frontend** wywołuje SDK:
   ```typescript
   const { error } = await supabase.auth.signOut();
   ```
2. **Supabase Auth**:
   - Invalidates session (JWT blacklist/revoke)
   - Clears refresh token
3. **Response**: 204 No Content
4. **Frontend**: Clears local tokens, redirects to login

### 5.4 DELETE /api/v1/user (Custom Implementation)
1. **Frontend** wywołuje custom endpoint:
   ```typescript
   const response = await fetch('/api/v1/user', {
     method: 'DELETE',
     headers: { 'Authorization': `Bearer ${accessToken}` }
   });
   ```
2. **Middleware** (`src/middleware/index.ts`):
   - Extracts JWT z Authorization header
   - Verifies token przez Supabase SDK
   - Umieszcza `supabase` + `session` w `context.locals`
3. **Handler** (`src/pages/api/v1/user.ts`):
   - Pobiera `userId` z `session.user.id` (401 jeśli brak)
   - Wywołuje `UserService.deleteUser(supabase, userId)`
4. **UserService.deleteUser**:
   - **Krok 1**: Delete all user data (RLS ON DELETE CASCADE handles):
     - `decks` → cascades to `flashcards`, `tags`, `generations`
     - `flashcard_tags` cascades automatically
     - `generation_error_logs` cascades
   - **Krok 2**: Delete user from `auth.users` (requires admin client):
     ```typescript
     const { error } = await supabase.auth.admin.deleteUser(userId);
     ```
   - Admin client needed dla usunięcia auth.users (RLS bypass)
5. **Response**: 204 No Content
6. **Frontend**: Redirects to signup/landing page

## 6. Względy bezpieczeństwa

### 6.1 Supabase Auth Security (Built-in)
- **JWT Tokens**: 
  - Signed by Supabase secret key
  - Short-lived access tokens (default 1h)
  - Refresh tokens for renewal (longer TTL)
  - Automatic token refresh przez SDK
- **Password Hashing**: bcrypt (Supabase default)
- **HTTPS**: Required in production (Supabase enforces)
- **Rate Limiting**: Supabase has built-in protection against brute force
- **Email Verification**: Optional (can enable in Supabase dashboard)

### 6.2 Custom Endpoint Security (DELETE /api/v1/user)
- **Authorization**: Verify session exists (middleware)
- **Ownership**: User can only delete own account (session.user.id)
- **Cascade Cleanup**: RLS policies ensure data isolation
- **Admin Client**: Use `supabase.auth.admin.deleteUser()` for auth.users deletion
  - Requires service_role key (server-side only)
  - NEVER expose service_role key to client

### 6.3 Middleware Integration
- **Session Handling**: Middleware extracts + verifies JWT
- **RLS Context**: Supabase client automatically uses JWT for RLS
- **Error Handling**: 401 for missing/invalid tokens

### 6.4 Token Storage (Frontend)
- **Best Practice**: httpOnly cookies (CSRF-safe)
- **Alternative**: localStorage (XSS risk, but simpler)
- **Supabase SDK**: handles storage automatically

### 6.5 CORS Configuration
- **Supabase**: configure allowed origins w dashboard
- **Astro API**: configure CORS middleware if needed

### 6.6 Environment Variables
- `PUBLIC_SUPABASE_URL`: Supabase project URL (safe to expose)
- `PUBLIC_SUPABASE_ANON_KEY`: Public anon key (safe, RLS protected)
- `SUPABASE_SERVICE_ROLE_KEY`: Admin key (NEVER expose, server-only)

## 7. Obsługa błędów

### 7.1 Kody błędów i scenariusze

| Kod | Endpoint | Scenariusz | Komunikat |
|-----|----------|-----------|-----------|
| 400 | /signup | Invalid email format | `Invalid email address format` (Supabase) |
| 400 | /signup | Weak password | `Password should be at least 6 characters` (Supabase) |
| 400 | /login | Invalid credentials | `Invalid login credentials` (Supabase) |
| 401 | /logout | Invalid token | `Invalid or expired JWT` (Supabase) |
| 401 | /user DELETE | No session | `unauthorized: Authentication required` |
| 422 | /signup | Email exists | `User already registered` (Supabase) |
| 500 | /user DELETE | Cascade failure | `database_error: Failed to delete user account` |
| 500 | /user DELETE | Auth deletion failure | `auth_error: Failed to delete authentication record` |

### 7.2 Supabase Error Handling
Supabase Auth zwraca `AuthError` objects:
```typescript
interface AuthError {
  message: string;
  status: number; // HTTP status code
  code?: string; // Optional error code
}
```

Frontend handling:
```typescript
const { data, error } = await supabase.auth.signUp({...});
if (error) {
  // Display error.message to user
  // Handle specific error codes if needed
}
```

### 7.3 Custom Endpoint Error Response
DELETE /api/v1/user:
```json
{
  "error": {
    "code": "database_error",
    "message": "Failed to delete user account",
    "details": null
  }
}
```

### 7.4 Logowanie błędów
- **Supabase errors**: log przez Supabase dashboard (built-in logging)
- **Custom endpoint**: structured logging dla 500 errors
- **Nie loguj**: passwords, tokens, sensitive data
- **Log context**: userId, timestamp, error type

## 8. Rozważania dotyczące wydajności

### 8.1 Supabase Auth Performance
- **Token Verification**: Fast (JWT signature verification, <1ms)
- **Password Hashing**: Bcrypt (intentionally slow for security, ~50-100ms)
- **Database Trigger**: `on_user_created` adds ~10-50ms to signup
- **Rate Limiting**: Supabase handles automatically

### 8.2 DELETE /api/v1/user Performance
- **Cascade Deletion**: 
  - Depends on user data volume
  - Decks → flashcards → tags (ON DELETE CASCADE)
  - For typical user (<1000 flashcards): ~100-500ms
  - For heavy user (10k+ flashcards): może być dłuższy (1-5s)
- **Auth Deletion**: Fast (single row delete from auth.users)
- **Transaction**: All deletes w single transaction (atomicity)

### 8.3 Middleware Overhead
- **JWT Verification**: ~1-2ms per request
- **Session Lookup**: Cached by Supabase SDK
- **Minimal Impact**: <5ms added latency

### 8.4 Token Refresh
- **Automatic**: Supabase SDK handles refresh before expiry
- **Background**: No user impact
- **Frequency**: Only when access_token near expiry (e.g., <5 min remaining)

### 8.5 Potential Bottlenecks
- **Heavy User Deletion**: Large data volumes
  - Mitigation: inform user "this may take a moment"
  - Future: async job queue dla very large accounts
- **Trigger Latency**: Default deck creation
  - Mitigation: already optimized (single insert)

## 9. Etapy wdrożenia

### Krok 1: Konfiguracja Supabase Auth
1. **Supabase Dashboard**:
   - Enable Email/Password authentication
   - Configure password requirements (default: min 6 chars)
   - Optional: Enable email verification
   - Optional: Configure email templates (signup, password reset)
2. **Environment Variables** (`.env`):
   ```
   PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
3. **Verify Trigger Exists** (from db-plan.md):
   - `on_user_created` trigger on `auth.users`
   - Calls `create_default_deck_for_user()` function
   - Should already exist from database migrations

### Krok 2: Supabase Client Setup
1. **Install Supabase SDK** (if not already):
   ```bash
   npm install @supabase/supabase-js
   ```
2. **Create Supabase clients** (`src/db/supabase.client.ts`):
   - Public client (anon key) – już istnieje
   - Admin client (service_role key) – dla DELETE user:
   ```typescript
   import { createClient } from '@supabase/supabase-js';
   
   // Public client (existing)
   export const supabaseClient = createClient(
     import.meta.env.PUBLIC_SUPABASE_URL,
     import.meta.env.PUBLIC_SUPABASE_ANON_KEY
   );
   
   // Admin client (new, server-only)
   export const supabaseAdmin = createClient(
     import.meta.env.PUBLIC_SUPABASE_URL,
     import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
     { auth: { autoRefreshToken: false, persistSession: false } }
   );
   ```

### Krok 3: Middleware Configuration
1. **Verify Middleware** (`src/middleware/index.ts`):
   - Should already handle session extraction
   - Places `supabase` + `session` in `context.locals`
   - Example (if not exists):
   ```typescript
   export async function onRequest(context, next) {
     const { request, locals } = context;
     const supabase = createClient(/* ... */);
     const { data: { session } } = await supabase.auth.getSession();
     locals.supabase = supabase;
     locals.session = session;
     return next();
   }
   ```

### Krok 4: Frontend Auth Integration (minimal)
1. **Signup Page** (example, może już istnieć):
   ```typescript
   const { data, error } = await supabase.auth.signUp({
     email: formData.email,
     password: formData.password
   });
   if (error) {
     // Display error
   } else {
     // Redirect to dashboard
   }
   ```
2. **Login Page**:
   ```typescript
   const { data, error } = await supabase.auth.signInWithPassword({
     email: formData.email,
     password: formData.password
   });
   ```
3. **Logout Button**:
   ```typescript
   await supabase.auth.signOut();
   // Redirect to login
   ```

### Krok 5: Implementacja UserService
1. **Create** `src/lib/services/users/user.service.ts`:
   ```typescript
   import { supabaseAdmin } from '@/db/supabase.client';
   import type { SupabaseClient } from '@supabase/supabase-js';
   
   export async function deleteUser(
     supabase: SupabaseClient,
     userId: string
   ): Promise<void> {
     // Step 1: Delete user data (RLS cascades automatically)
     // Note: Deletion happens via RLS when auth user is deleted
     
     // Step 2: Delete auth user (requires admin client)
     const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
     
     if (error) {
       throw new Error(`Failed to delete user: ${error.message}`);
     }
   }
   ```

### Krok 6: Implementacja DELETE /api/v1/user Endpoint
1. **Create** `src/pages/api/v1/user.ts`:
   ```typescript
   import type { APIRoute } from 'astro';
   import { deleteUser } from '@/lib/services/users/user.service';
   
   export const prerender = false;
   
   export const DELETE: APIRoute = async ({ locals }) => {
     try {
       const { supabase, session } = locals;
       
       // Verify session exists
       if (!session?.user?.id) {
         return new Response(
           JSON.stringify({
             error: {
               code: 'unauthorized',
               message: 'Authentication required'
             }
           }),
           { status: 401, headers: { 'Content-Type': 'application/json' } }
         );
       }
       
       // Delete user
       await deleteUser(supabase, session.user.id);
       
       // Return 204 No Content
       return new Response(null, { status: 204 });
       
     } catch (error) {
       console.error('Delete user error:', error);
       return new Response(
         JSON.stringify({
           error: {
             code: 'database_error',
             message: 'Failed to delete user account'
           }
         }),
         { status: 500, headers: { 'Content-Type': 'application/json' } }
       );
     }
   };
   ```

### Krok 7: Testy jednostkowe
1. **user.service.test.ts**:
   - Mock supabaseAdmin.auth.admin.deleteUser
   - Test success case
   - Test error handling (auth deletion failure)
2. **Endpoint test**:
   - Mock locals.session
   - Test 401 (no session)
   - Test 204 (success)
   - Test 500 (service error)

### Krok 8: Testy integracyjne
1. **Full Auth Flow**:
   - Signup → verify default deck created
   - Login → verify session returned
   - Logout → verify session cleared
   - Delete user → verify all data removed
2. **Test Cascade Deletion**:
   - Create user with decks, flashcards, tags
   - DELETE /api/v1/user
   - Verify all data removed from tables
   - Verify auth.users record deleted

### Krok 9: Testy RLS i Security
1. **Verify RLS Policies**:
   - User A cannot access user B's data after login
   - Deleted user's data inaccessible
2. **Test Token Security**:
   - Invalid JWT → 401
   - Expired JWT → 401 (Supabase handles)
   - Missing Authorization header → 401
3. **Test Admin Client**:
   - Verify service_role key NOT exposed to client
   - Grep codebase for accidental exposure

### Krok 10: Frontend Integration Testing
1. **Signup Flow**:
   - Valid email/password → success, redirect
   - Invalid email → error display
   - Weak password → error display
   - Duplicate email → 422 error
2. **Login Flow**:
   - Valid credentials → success, store tokens
   - Invalid credentials → 400 error display
3. **Logout Flow**:
   - Logout button → clear tokens, redirect
4. **Delete Account Flow**:
   - Delete button → confirmation modal
   - Confirm → call DELETE /api/v1/user → 204 → redirect to signup

### Krok 11: Default Deck Trigger Testing
1. **Manual Test**:
   - Signup nowy użytkownik
   - Natychmiast query `decks` table dla tego user
   - Verify talia "Uncategorized" z `is_default=true` exists
2. **Automated Test** (SQL):
   ```sql
   -- Simulate trigger
   INSERT INTO auth.users (id, email) VALUES (uuid_generate_v4(), 'test@example.com');
   -- Check deck created
   SELECT * FROM decks WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test@example.com');
   ```

### Krok 12: Error Handling Testing
1. **Supabase Errors**:
   - Test with intentionally invalid inputs
   - Verify error messages user-friendly
2. **Network Errors**:
   - Simulate timeout (disconnect network)
   - Verify graceful error handling
3. **500 Errors**:
   - Simulate DB failure (mock)
   - Verify 500 response + logging

### Krok 13: Dokumentacja
1. **Update** `.ai/authentication-implementation-plan.md` (ten plik)
2. **Create** examples dla frontend developers:
   ```typescript
   // Signup
   const { data, error } = await supabase.auth.signUp({
     email: 'user@example.com',
     password: 'securepass123'
   });
   
   // Login
   const { data, error } = await supabase.auth.signInWithPassword({
     email: 'user@example.com',
     password: 'securepass123'
   });
   
   // Logout
   await supabase.auth.signOut();
   
   // Delete account
   const response = await fetch('/api/v1/user', {
     method: 'DELETE',
     headers: { 'Authorization': `Bearer ${accessToken}` }
   });
   ```
3. **Document** environment variables setup
4. **Document** Supabase dashboard configuration steps

### Krok 14: Deployment Checklist
1. **Staging Environment**:
   - Verify all env vars set
   - Test signup → default deck creation
   - Test login/logout flows
   - Test DELETE user → cascade cleanup
2. **Production Deployment**:
   - HTTPS enabled (Supabase enforces)
   - Email verification configured (if desired)
   - Rate limiting verified (Supabase default)
   - Monitor Supabase dashboard for auth errors
3. **Post-deployment**:
   - Smoke test: signup, login, logout, delete
   - Monitor logs for auth errors
   - Verify trigger working (check decks table)

---

## 10. Uwagi dodatkowe

### 10.1 Supabase Auth vs Custom Auth
- **Why Supabase**: Production-ready, secure by default, handles complex auth flows
- **Benefits**: JWT management, password hashing, rate limiting, email verification
- **Trade-offs**: Less control, vendor lock-in (mitigated: Supabase is open-source)

### 10.2 Email Verification (Optional)
- **Enable**: Supabase Dashboard → Authentication → Email Templates
- **Flow**: Signup → email sent → user clicks link → email_confirmed=true
- **Impact**: Can require verification before allowing login
- **MVP**: Optional, can add later

### 10.3 Password Reset (Future)
- **Supabase handles**: `supabase.auth.resetPasswordForEmail(email)`
- **Flow**: Request → email sent → click link → set new password
- **Implementation**: Minimal frontend code, no backend needed

### 10.4 Social Auth (Future)
- **Supabase supports**: Google, GitHub, etc.
- **Configuration**: Enable providers w dashboard
- **Frontend**: `supabase.auth.signInWithOAuth({ provider: 'google' })`

### 10.5 Session Management
- **Automatic Refresh**: Supabase SDK handles refresh tokens
- **Storage**: SDK stores tokens (localStorage or cookies)
- **Expiry**: Default 1h access token, longer refresh token
- **Logout**: Invalidates both tokens

### 10.6 RLS Context
- **Automatic**: Supabase client uses JWT for RLS context
- **auth.uid()**: Available in RLS policies (returns user_id from JWT)
- **No manual setup**: Works out of the box

### 10.7 Admin Client Security
- **Service Role Key**: Full DB access, bypasses RLS
- **Server-only**: NEVER expose to client (env var, server-side only)
- **Use cases**: Admin operations (delete auth user, bypass RLS for migrations)
- **Security**: Keep in secure env vars, rotate periodically

### 10.8 GDPR Compliance
- **DELETE /api/v1/user**: Fulfills "right to be forgotten"
- **Cascade Deletion**: Removes all personal data
- **Audit Trail**: Log deletion events (optional, for compliance)

### 10.9 Multi-factor Authentication (Future)
- **Supabase Pro**: MFA support available
- **Types**: TOTP (authenticator app), SMS (third-party)
- **Implementation**: Supabase SDK handles

### 10.10 Testing Credentials
- **Don't commit**: Never commit real passwords to git
- **Test users**: Use disposable email services dla testów
- **Cleanup**: Delete test users after tests (use DELETE endpoint)

---

**Priorytet implementacji**: 
1. Kroki 1-3 (Supabase config, client setup, middleware) – critical
2. Kroki 4-6 (Frontend integration, UserService, DELETE endpoint) – high priority
3. Kroki 7-12 (Testing) – medium priority
4. Kroki 13-14 (Documentation, deployment) – low priority

**Szacowany czas**: 
- Supabase configuration: 0.5 dnia (mostly config)
- Custom DELETE endpoint: 1 dzień (service + endpoint + error handling)
- Frontend integration: 1 dzień (signup/login/logout pages, może już istnieć)
- Testing: 1-2 dni (unit + integration + security)
- Documentation: 0.5 dnia
- **Total: 4-5 dni** dla doświadczonego developera

**Zależności**:
- Supabase project already created (assumed)
- Database trigger `on_user_created` exists (from db migrations)
- Middleware setup (may already exist)
- Frontend framework dla auth UI (Astro + React)

**Ryzyka**:
- Minimal (Supabase handles complexity)
- Main risk: Cascade deletion performance dla heavy users (mitigation: inform user, async jobs in future)
- Service role key security (mitigation: env vars, never expose to client)

