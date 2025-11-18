<!-- Generated to codify the design system tokens -->

# UI Style Guide

## 1. Tokeny

- Wszystkie kolory, promienie i skale odstępów znajdują się w `src/styles/global.css` i są eksportowane do kodu jako `src/styles/tokens.ts`.
- Korzystaj z `colorTokens`, `spacingTokens`, `radiusTokens` oraz `typographyTokens`, aby budować komponenty JS/TS (np. w animacjach).
- Bezwzględnie unikamy klas Tailwind takich jak `bg-white`, `text-slate-*`, `bg-green-*`. Linter (`npm run check:tokens`) blokuje takie użycia.

## 2. Layouty i sekcje

- `PageShell`, `PageSection`, `PageGrid` (`src/components/layout/PageShell.tsx`) odpowiadają za tła, gradienty i maksymalną szerokość stron.
- `SectionShell` (`src/components/ui/section-shell.tsx`) to uniwersalny kontener o spójnych obramowaniach i cieniach. Używamy go dla kart, paneli filtrów i formularzy.
- `PageHeader`, `PageHeaderHeading`, `PageHeaderActions` (`src/components/ui/page-header.tsx`) przejmują całą logikę nagłówków sekcji/widoków.

## 3. Typografia

- W `src/styles/global.css` dodano klasy `.heading-*` i `.body-*`.
- Komponenty `H1…H4`, `Lead`, `MutedText`, `Eyebrow` (`src/components/ui/typography.tsx`) korzystają z powyższych klas. Nie twórzmy własnych `h2` z ręcznymi klasami.

## 4. Formy i selektory

- `FormField` (`src/components/ui/form-field.tsx`) grupuje label, opis, treść i błędy.
- Do wyborów zawsze używamy `Select` (`src/components/ui/select.tsx`). Wspiera warianty (`variant`, `fullWidth`, `size`).

## 5. Przycisk i akcje

- `Button` (`src/components/ui/button.tsx`) ma warianty: `default`, `secondary`, `outline`, `ghost`, `subtle`, `pill`, `icon`, `pulse`.
- Wariant `pulse` służy do CTA (np. `GenerateButton`), `pill` do akcji w paskach narzędzi, `icon` dla ikon bez tekstu.

## 6. Podgląd komponentów

- W `src/components/ui/preview.tsx` znajduje się `UIPrimitivesPreview` – prosty zbiór przycisków i kart referencyjnych.
- Można go zaimportować na dowolną stronę/Storybook, aby szybko zweryfikować zmiany wizualne.

## 7. Checklist

Przy każdym PR:

1. Czy wszystkie nowe kolory pochodzą z tokenów (`colorTokens` lub klas `.bg-card` itp.)?
2. Czy widok używa `PageShell`/`SectionShell`/`PageHeader` zamiast własnego układu?
3. Czy formularze korzystają z `FormField`, a przyciski z `Button`?
4. Czy `npm run lint` (wraz z `check:tokens`) przechodzi lokalnie?

Zastosowanie powyższych zasad gwarantuje, że UI pozostanie spójny i łatwy do dalszego skalowania.
