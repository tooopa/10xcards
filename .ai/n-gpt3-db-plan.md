```markdown
# 1. Tabele, kolumny, typy danych i ograniczenia

## decks
| kolumna          | typ                         | ograniczenia                                           |
|------------------|-----------------------------|--------------------------------------------------------|
| id               | bigserial                  | PRIMARY KEY                                            |
| user_id          | uuid                       | NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE   |
| name             | varchar(120)               | NOT NULL                                              |
| visibility       | varchar CHECK (visibility IN ('private')) DEFAULT 'private' |
| deleted_at       | timestamptz                | NULLABLE                                              |
| created_at       | timestamptz DEFAULT now()  | NOT NULL                                              |
| updated_at       | timestamptz DEFAULT now()  | NOT NULL                                              |

* unikalność: UNIQUE (user_id, lower(name)) WHERE deleted_at IS NULL  

---

## deck_collaborators
| kolumna   | typ     | ograniczenia                                                          |
|-----------|---------|------------------------------------------------------------------------|
| deck_id   | bigint  | NOT NULL REFERENCES decks(id) ON DELETE CASCADE                       |
| user_id   | uuid    | NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE                  |
| role      | varchar CHECK (role IN ('viewer','cooperator')) DEFAULT 'viewer'                |
| added_at  | timestamptz DEFAULT now() NOT NULL                                              |

* PRIMARY KEY (deck_id, user_id)

---

## tags
| kolumna   | typ     | ograniczenia                                                                                                   |
|-----------|---------|----------------------------------------------------------------------------------------------------------------|
| id        | bigserial | PRIMARY KEY                                                                                                   |
| name      | varchar(80) | NOT NULL                                                                                                    |
| scope     | varchar CHECK (scope IN ('global','deck')) NOT NULL                                                                       |
| deck_id   | bigint | NULL REFERENCES decks(id) ON DELETE CASCADE                                                                     |
| user_id   | uuid   | NULL REFERENCES auth.users(id)                                                                                  |
| created_at| timestamptz DEFAULT now() NOT NULL                                                                                        |

* UNIQUE (lower(name)) WHERE scope = 'global'  
* UNIQUE (deck_id, lower(name)) WHERE scope = 'deck'  

---

## flashcards  _(rozszerza istniejącą tabelę)_
| nowa kolumna | typ       | ograniczenia                                     |
|--------------|-----------|--------------------------------------------------|
| deck_id      | bigint    | NOT NULL REFERENCES decks(id) ON DELETE RESTRICT |
| deleted_at   | timestamptz | NULLABLE                                       |
| tsv          | tsvector  | GENERATED ALWAYS AS (to_tsvector('simple', front || ' ' || back)) STORED |

* indeksy dodatkowe:  
  * GIN (tsv)  
  * PG_TRGM (front)  
  * PG_TRGM (back)  
  * PARTIAL INDEX (id) WHERE deleted_at IS NULL  

---

## flashcard_tags
| kolumna       | typ     | ograniczenia                                                         |
|---------------|---------|---------------------------------------------------------------------|
| flashcard_id  | bigint  | NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE               |
| tag_id        | bigint  | NOT NULL REFERENCES tags(id) ON DELETE CASCADE                     |
| assigned_at   | timestamptz DEFAULT now() NOT NULL                                           |

* PRIMARY KEY (flashcard_id, tag_id)

---

## reviews
| kolumna          | typ             | ograniczenia                                                                                 |
|------------------|-----------------|----------------------------------------------------------------------------------------------|
| id               | bigserial       | PRIMARY KEY                                                                                  |
| flashcard_id     | bigint          | NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE                                         |
| user_id          | uuid            | NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE                                         |
| due_at           | timestamptz     | NOT NULL                                                                                    |
| interval_days    | integer         | NOT NULL DEFAULT 1 CHECK (interval_days > 0)                                                |
| ease_factor      | numeric(4,2)    | NOT NULL DEFAULT 2.50                                                                       |
| repetitions      | integer         | NOT NULL DEFAULT 0                                                                          |
| grade            | smallint        | NULLABLE CHECK (grade BETWEEN 0 AND 5)                                                      |
| last_review_at   | timestamptz     | NULLABLE                                                                                    |
| deleted_at       | timestamptz     | NULLABLE                                                                                    |
| created_at       | timestamptz DEFAULT now() NOT NULL                                                                            |
| updated_at       | timestamptz DEFAULT now() NOT NULL                                                                            |

* indeksy dodatkowe:  
  * (user_id, due_at)  
  * PARTIAL INDEX (id) WHERE deleted_at IS NULL  

---

## generations, generation_error_logs
Pozostają bez zmian (patrz istniejące migracje).

---

# 2. Relacje między tabelami
* auth.users 1───∞ decks
* decks 1───∞ flashcards
* decks ∞───∞ auth.users  _(przez deck_collaborators)_
* flashcards ∞───∞ tags  _(przez flashcard_tags)_
* flashcards 1───∞ reviews
* generations 1───∞ flashcards (opcjonalne `generation_id`)
* auth.users 1───∞ generations, generation_error_logs

# 3. Indeksy
* decks: UNIQUE (user_id, lower(name)) WHERE deleted_at IS NULL
* decks: INDEX (user_id)
* tags: UNIQUE (lower(name)) WHERE scope='global'
* tags: UNIQUE (deck_id, lower(name)) WHERE scope='deck'
* flashcards: GIN (tsv), PG_TRGM (front), PG_TRGM (back), INDEX (deck_id), PARTIAL INDEX (id) WHERE deleted_at IS NULL
* flashcard_tags: PRIMARY KEY (flashcard_id, tag_id)
* reviews: INDEX (user_id, due_at), PARTIAL INDEX (id) WHERE deleted_at IS NULL

# 4. Zasady PostgreSQL (RLS)

## decks
```sql
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY decks_select_owner
  ON decks FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY decks_crud_owner
  ON decks FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

## deck_collaborators
```sql
ALTER TABLE deck_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY collaborators_select
  ON deck_collaborators FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.uid() = (SELECT user_id FROM decks d WHERE d.id = deck_id)
  );
/* INSERT/DELETE/UPDATE dopuszczone tylko właścicielowi talii */
CREATE POLICY collaborators_manage
  ON deck_collaborators FOR ALL TO authenticated
  USING (auth.uid() = (SELECT user_id FROM decks d WHERE d.id = deck_id))
  WITH CHECK (auth.uid() = (SELECT user_id FROM decks d WHERE d.id = deck_id));
```

## tags
```sql
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- SELECT: użytkownik widzi tagi globalne lub swoje
CREATE POLICY tags_select
  ON tags FOR SELECT TO authenticated
  USING (
    scope = 'global'
    OR auth.uid() = user_id
  );

/* CRUD wyłącznie na własnych tagach */
CREATE POLICY tags_manage_own
  ON tags FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```
_Admin role otrzyma osobne uprawnienia do globalnych tagów._

## flashcards, flashcard_tags, reviews
Powielamy istniejący wzorzec:
```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY <table>_select
  ON <table> FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY <table>_crud
  ON <table> FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

# 5. Dodatkowe uwagi
* Triggery `set_updated_at()` aktualizują `updated_at` na `decks`, `flashcards`, `reviews`.
* Trigger `soft_delete_flashcard` ustawia `reviews.deleted_at` przy soft-delete fiszki.
* Limit 1000 fiszek w talii realizowany przez BEFORE INSERT trigger na `flashcards`.
* Enumy `visibility` i `role` zostaną rozszerzone w przyszłości bez łamania zgodności.
* Wszystkie migracje umieszczamy w `supabase/migrations` z nazwą `YYYYMMDDHHMMSS_<change>.sql`.
```