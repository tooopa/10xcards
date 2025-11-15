<conversation_summary>

<decisions>
1. Supabase pozostaje jedynym źródłem danych o użytkownikach – brak tabeli `user_profiles`.
2. Tworzymy tabelę `decks` z:
   • kolumną `visibility enum('private') default 'private'` (rozszerzalną o `public, shared`),  
   • unikalnym indeksem `(user_id, name)`.
3. Przygotowujemy pustą tabelę `deck_collaborators(deck_id, user_id, role)` na przyszłe współdzielenie; w MVP niewykorzystywana.
4. Implementujemy tagowanie:
   • tabela `tags` z `scope enum('global','deck')`,  
   • tabela `flashcard_tags(flashcard_id, tag_id)`,  
   • unikalność `name` globalnie lub w ramach talii.
5. Dodajemy tabelę `reviews` (algorytm spaced-repetition) z minimalnym zestawem pól i kolumną `grade`.
6. Wprowadzamy soft-delete (`deleted_at`) dla `flashcards`, `decks`, `reviews`; triggery synchronizują powiązane rekordy.
7. Utrzymujemy istniejące RLS: tabele z `user_id` → pełny zestaw SELECT/INSERT/UPDATE/DELETE; tabele globalne (np. `tags` z scope `global`) bez RLS lub tylko SELECT public.
8. Pełnotekstowe wyszukiwanie: kolumna `tsv` (STORED) + indeks GIN; indeksy PG_TRGM na `front` i `back`.
9. Limit 1000 fiszek w talii wymuszany triggerem.
10. Przyjmujemy konwencję wersjonowanych migracji `supabase/migrations` (`YYYYMMDDHHMMSS_<change>.sql`) z opisem rollback.

</decisions>

<matched_recommendations>
1. Dodanie kolumny `visibility` i rozszerzalnego enuma (rekomendacja #1).  
2. Utworzenie tabeli‐szkieletu `deck_collaborators` (rekomendacja #2).  
3. Zakres tagów zgodny z taliami i obsługa enum `scope` (rekomendacje #3–#4).  
4. Minimalny zestaw pól w `reviews` + kolumna `grade` (rekomendacje #4 i #5).  
5. Soft-delete + częściowe indeksy (rekomendacje #5–#7).  
6. Pełnotekstowe wyszukiwanie + PG_TRGM na `front` i `back` (rekomendacja #8 + dopisek).  
7. Zachowanie wzorca RLS `auth.uid() = user_id` (rekomendacja #10).  
8. Przygotowanie widoku `v_users_abusing` (rekomendacja #9).  
9. Unikalność nazw talii per użytkownik (rekomendacja #2 wcześniejsza).  
10. Konwencja migracji w `supabase/migrations` (rekomendacja #10 późniejsza).

</matched_recommendations>

<database_planning_summary>
Główne wymagania:
• Przechowywanie fiszek, talii, tagów, powtórek (reviews) oraz metryk generacji AI.  
• Prywatność danych użytkownika dzięki RLS; możliwość rozbudowy o talie publiczne/współdzielone.  
• Soft-delete zamiast fizycznego kasowania.  
• Wydajne wyszukiwanie pełnotekstowe oraz LIKE (PG_TRGM).  
• Wersjonowane migracje Supabase.

Kluczowe encje i relacje:
• `users` (Supabase) –1→* `decks` –1→* `flashcards`.  
• `flashcards` *←→* `tags` przez łącznik `flashcard_tags`; tag może być globalny lub zależny od talii.  
• `flashcards` 1→* `reviews` (historia powtórek).  
• `decks` *←→* `deck_collaborators` (przyszłe współdzielenie).  
• `generations`, `generation_error_logs` pozostają bez zmian, powiązane z `flashcards`.

Bezpieczeństwo i skalowalność:
• RLS oparty na `auth.uid()` dla tabel z danymi prywatnymi.  
• Tabele globalne tylko SELECT public; brak mutacji.  
• Indeksy: GIN (`tsv`), PG_TRGM (`front`,`back`), `(user_id, due_at)` w `reviews`, unikalne `(user_id, name)` w `decks`.  
• Soft-delete z partial indexem `WHERE deleted_at IS NULL` redukuje koszty zapytań.  
• Możliwość rozszerzenia widoczności talii bez migracji PK/FK.

Nierozwiązane obszary:
• Dokładna definicja roli (`viewer`,`editor`) w `deck_collaborators`.  
• Parametry algorytmu spaced-repetition (domyślne wartości `interval`, `ease_factor`).  
• Mechanizm limitu 1000 fiszek – czy konfigurowalny per użytkownik/admin.  
• Szczegóły polityki RLS dla tagów `scope='global'` (tylko SELECT czy też INSERT dla admina).

</database_planning_summary>

<unresolved_issues>
1. Ustalenie ról i uprawnień w `deck_collaborators`.  - wyjaśnienie osobna rola cooperator uprawnienia pełne jak właściciel CRUD i rola viewer - uprawnienia tylko  przegląnia bez edycji
2. Dopracowanie domyślnych parametrów algorytmu powtórek w `reviews`.  - zostawiamy to na później
3. Czy limit fiszek ma być globalny czy konfigurowalny. - globalny
4. Precyzyjne RLS dla tabel globalnych (`tags`, ewentualnie widoki admina).  - Użytkownik SELECT: użytkownik widzi swoje tagi + tagi globalne; reszta uprawnień INSERT, UPDATE, DELETE - tylko swoje tagi; aDmin - pełna kontrola + tworzenie tagów globalnych
5. Implementacja i dostępność widoku `v_users_abusing` (rola admin vs system). - Zamiast tworzyć widok "`v_users_abusing":
Zaimplementuj system audytu - loguj wszystkie istotne akcje
Ustaw rate limiting - kontroluj częstotliwość działań
Twórz alerty - powiadamiaj adminów o podejrzanych wzorcach
Analizuj zachowania - używaj widoków analitycznych
Zastosuj limity na poziomie aplikacji - zapobiegaj problemom zanim wystąpią
</unresolved_issues>

</conversation_summary>