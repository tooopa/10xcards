import { useState } from "react";
import { useFlashcard, useDeck } from "@/hooks/useApi";
import { SkeletonLoader } from "./SkeletonLoader";
import { ErrorNotification } from "./ErrorNotification";
import { EditFlashcardButton } from "./EditFlashcardButton";

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
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <ErrorNotification message={flashcardError.message} />
        </div>
      </div>
    );
  }

  const isLoading = isLoadingFlashcard || isLoadingDeck;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <a href="/" className="hover:text-foreground transition-colors">Dashboard</a>
          <span>/</span>
          <a href={`/decks/${deckId}`} className="hover:text-foreground transition-colors">
            {isLoading ? <SkeletonLoader className="h-4 w-20 inline-block" /> : deck?.name || 'Deck'}
          </a>
          <span>/</span>
          <span className="text-foreground">Flashcard</span>
        </nav>

        {isLoading ? (
          <div className="max-w-2xl mx-auto">
            <SkeletonLoader className="h-8 w-64 mb-6" />
            <SkeletonLoader className="h-64 w-full" />
          </div>
        ) : flashcard ? (
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground mb-2">Flashcard Details</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Source: {flashcard.source}</span>
                <span>Created: {new Date(flashcard.created_at).toLocaleDateString()}</span>
                <span>Updated: {new Date(flashcard.updated_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Flashcard Display */}
            <div className="mb-6">
              <div
                className="relative h-64 bg-card border border-border rounded-lg cursor-pointer transition-transform hover:scale-105"
                onClick={() => setIsFlipped(!isFlipped)}
              >
                <div className={`absolute inset-0 p-6 flex items-center justify-center text-center transition-transform duration-300 ${isFlipped ? 'rotate-y-180' : ''}`}>
                  <div className="text-lg text-card-foreground">
                    {isFlipped ? flashcard.back : flashcard.front}
                  </div>
                </div>
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-sm text-muted-foreground">
                  Click to flip
                </div>
              </div>
            </div>

            {/* Tags */}
            {flashcard.tags.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {flashcard.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => window.history.back()}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
              >
                Back to Deck
              </button>
              <EditFlashcardButton
                flashcard={flashcard}
                onSuccess={() => window.location.reload()}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
