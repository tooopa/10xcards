import { useDecks } from "@/hooks/useApi";
import { SkeletonLoader } from "./SkeletonLoader";
import { ErrorNotification } from "./ErrorNotification";

export function DeckList() {
  const { decks, isLoading, error, mutate } = useDecks();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonLoader key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorNotification message={error.message} error={error} onRetry={() => mutate()} />;
  }

  if (decks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📚</div>
        <h3 className="text-xl font-semibold text-foreground mb-2">No decks yet</h3>
        <p className="text-muted-foreground mb-6">
          Create your first flashcard deck to get started with learning
        </p>
        <a
          href="/generate"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          Create Your First Deck
        </a>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {decks.map((deck) => (
        <DeckCard key={deck.id} deck={deck} />
      ))}
    </div>
  );
}

interface DeckCardProps {
  deck: DeckDto;
}

function DeckCard({ deck }: DeckCardProps) {
  return (
    <a
      href={`/decks/${deck.id}`}
      className="block p-6 bg-card border border-border rounded-lg hover:shadow-lg transition-all duration-200 hover:border-primary/20"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-card-foreground mb-1 truncate">
            {deck.name}
          </h3>
          {deck.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {deck.description}
            </p>
          )}
        </div>
        {deck.is_default && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
            Default
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{deck.flashcard_count} cards</span>
        <span>
          {new Date(deck.updated_at).toLocaleDateString()}
        </span>
      </div>
    </a>
  );
}
