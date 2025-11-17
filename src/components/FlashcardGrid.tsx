import type { FlashcardDto } from "@/types";

interface FlashcardGridProps {
  flashcards: FlashcardDto[];
  deckId: string;
}

export function FlashcardGrid({ flashcards, deckId }: FlashcardGridProps) {
  if (flashcards.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {flashcards.map((flashcard) => (
        <FlashcardCard key={flashcard.id} flashcard={flashcard} deckId={deckId} />
      ))}
    </div>
  );
}

interface FlashcardCardProps {
  flashcard: FlashcardDto;
  deckId: string;
}

function FlashcardCard({ flashcard, deckId }: FlashcardCardProps) {
  return (
    <a
      href={`/decks/${deckId}/flashcards/${flashcard.id}`}
      className="block p-4 bg-card border border-border rounded-lg hover:shadow-lg transition-all duration-200 hover:border-primary/20"
    >
      <div className="mb-3">
        <div className="text-sm font-medium text-card-foreground line-clamp-2 mb-1">
          {flashcard.front}
        </div>
        <div className="text-xs text-muted-foreground line-clamp-2">
          {flashcard.back}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="capitalize">{flashcard.source.replace('-', ' ')}</span>
        {flashcard.tags.length > 0 && (
          <span>{flashcard.tags.length} tag{flashcard.tags.length !== 1 ? 's' : ''}</span>
        )}
      </div>
    </a>
  );
}
