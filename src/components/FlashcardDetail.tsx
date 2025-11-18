import { useState, type KeyboardEvent } from "react";
import { useFlashcard, useDeck } from "@/hooks/useApi";
import { SkeletonLoader } from "./SkeletonLoader";
import { ErrorNotification } from "./ErrorNotification";
import { EditFlashcardButton } from "./EditFlashcardButton";
import { PageShell, PageSection } from "@/components/layout/PageShell";
import { SectionShell } from "@/components/ui/section-shell";
import { PageHeader, PageHeaderHeading, PageHeaderActions } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

interface FlashcardDetailProps {
  deckId: string;
  flashcardId: string;
}

export function FlashcardDetail({ deckId, flashcardId }: FlashcardDetailProps) {
  const { flashcard, isLoading: isLoadingFlashcard, error: flashcardError } = useFlashcard(flashcardId);
  const { deck, isLoading: isLoadingDeck } = useDeck(deckId);
  const [isFlipped, setIsFlipped] = useState(false);

  if (flashcardError) {
    return (
      <PageShell background="plain">
        <PageSection spacing="md">
          <ErrorNotification message={flashcardError.message} />
        </PageSection>
      </PageShell>
    );
  }

  const isLoading = isLoadingFlashcard || isLoadingDeck;

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsFlipped((prev) => !prev);
    }
  };

  return (
    <PageShell background="plain">
      <PageSection spacing="lg">
        <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <a href="/" className="transition-colors hover:text-foreground">
            Dashboard
          </a>
          <span>/</span>
          <a href={`/decks/${deckId}`} className="transition-colors hover:text-foreground">
            {isLoading ? <SkeletonLoader className="inline-block h-4 w-20" /> : deck?.name || "Deck"}
          </a>
          <span>/</span>
          <span className="text-foreground">Flashcard</span>
        </nav>

        {isLoading ? (
          <div className="mx-auto max-w-2xl">
            <SkeletonLoader className="mb-6 h-8 w-64" />
            <SkeletonLoader className="h-64 w-full" />
          </div>
        ) : flashcard ? (
          <SectionShell className="mx-auto max-w-2xl">
            <PageHeader subdued>
              <PageHeaderHeading
                title="Szczegóły fiszki"
                description={`Źródło: ${flashcard.source} • Utworzono ${new Date(flashcard.created_at).toLocaleDateString()} • Zaktualizowano ${new Date(flashcard.updated_at).toLocaleDateString()}`}
              />
              <PageHeaderActions className="gap-3">
                <Button variant="outline" onClick={() => window.history.back()}>
                  Powrót do talii
                </Button>
                <EditFlashcardButton flashcard={flashcard} onSuccess={() => window.location.reload()} />
              </PageHeaderActions>
            </PageHeader>

            <div className="space-y-6 pt-6">
              <div
                className="relative h-64 cursor-pointer rounded-3xl border border-border/80 bg-card/90 shadow-inner transition-transform hover:scale-[1.01]"
                onClick={() => setIsFlipped(!isFlipped)}
                onKeyDown={handleCardKeyDown}
                role="button"
                tabIndex={0}
              >
                <div
                  className={`absolute inset-0 flex items-center justify-center p-6 text-center text-lg text-card-foreground transition-transform duration-300 ${
                    isFlipped ? "rotate-y-180" : ""
                  }`}
                >
                  {isFlipped ? flashcard.back : flashcard.front}
                </div>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-muted-foreground">
                  Kliknij, aby obrócić
                </div>
              </div>

              {flashcard.tags.length > 0 && (
                <div>
                  <h3 className="mb-3 text-lg font-semibold text-foreground">Tagi</h3>
                  <div className="flex flex-wrap gap-2">
                    {flashcard.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SectionShell>
        ) : null}
      </PageSection>
    </PageShell>
  );
}
