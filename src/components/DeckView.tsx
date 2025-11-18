import { useDeck, useFlashcards } from "@/hooks/useApi";
import { FlashcardGrid } from "./FlashcardGrid";
import { SkeletonLoader } from "./SkeletonLoader";
import { ErrorNotification } from "./ErrorNotification";
import { CreateFlashcardButton } from "./CreateFlashcardButton";

interface DeckViewProps {
  deckId: string;
}

export function DeckView({ deckId }: DeckViewProps) {
  const { deck, isLoading: isLoadingDeck, error: deckError } = useDeck(deckId);
  const { flashcards, isLoading: isLoadingFlashcards, error: flashcardsError } = useFlashcards(deckId);

  if (deckError) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <ErrorNotification message={deckError} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <a href="/" className="hover:text-foreground transition-colors">
              Dashboard
            </a>
            <span>/</span>
            {isLoadingDeck ? (
              <SkeletonLoader className="h-4 w-32" />
            ) : (
              <span className="text-foreground">{deck?.name}</span>
            )}
          </nav>

          {isLoadingDeck ? (
            <div className="space-y-4">
              <SkeletonLoader className="h-8 w-64" />
              <SkeletonLoader className="h-4 w-96" />
            </div>
          ) : deck ? (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold text-foreground">{deck.name}</h1>
                {deck.is_default && (
                  <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                    Default Deck
                  </span>
                )}
              </div>
              {deck.description && <p className="text-muted-foreground text-lg">{deck.description}</p>}
              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <span>{deck.flashcard_count} flashcards</span>
                <span>Created {new Date(deck.created_at).toLocaleDateString()}</span>
                <span>Updated {new Date(deck.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Action buttons */}
        <div className="mb-6 flex gap-4">
          <a
            href={`/generate?deck=${deckId}`}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add AI Flashcards
          </a>
          <CreateFlashcardButton deckId={deckId} />
        </div>

        {/* Flashcards */}
        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-6">Flashcards</h2>

          {flashcardsError ? (
            <ErrorNotification message={flashcardsError} />
          ) : isLoadingFlashcards ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonLoader key={i} />
              ))}
            </div>
          ) : flashcards.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🃏</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No flashcards yet</h3>
              <p className="text-muted-foreground mb-6">Start by generating AI flashcards or create them manually</p>
              <div className="flex gap-4 justify-center">
                <a
                  href={`/generate?deck=${deckId}`}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  Generate AI Flashcards
                </a>
                <CreateFlashcardButton deckId={deckId} onSuccess={() => window.location.reload()} />
              </div>
            </div>
          ) : (
            <FlashcardGrid flashcards={flashcards} deckId={deckId} />
          )}
        </div>
      </div>
    </div>
  );
}
