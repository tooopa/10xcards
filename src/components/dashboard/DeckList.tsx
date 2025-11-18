import { DeckCard, type DeckAction } from "./DeckCard";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import type { DeckDto, ErrorResponse } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorNotification } from "@/components/ErrorNotification";
import { cn } from "@/lib/utils";

interface DeckListProps {
  decks: DeckDto[];
  isLoading: boolean;
  error?: ErrorResponse | null;
  onDeckAction: (action: DeckAction, deck?: DeckDto) => void;
}

const SKELETON_PLACEHOLDERS = 6;

function DeckCardSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-6 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <div className="flex items-center justify-between text-xs">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
}

export function DeckList({ decks, isLoading, error, onDeckAction }: DeckListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: SKELETON_PLACEHOLDERS }).map((_, index) => (
          <DeckCardSkeleton key={`deck-skeleton-${index}`} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ErrorNotification
        message={error.error.message}
        error={{ code: error.error.code }}
        onRetry={() => window.location.reload()}
        showRetry
      />
    );
  }

  if (decks.length === 0) {
    return (
      <div className="text-center py-16" aria-live="polite">
        <div className="text-6xl mb-4">📚</div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Brak talii</h3>
        <p className="text-muted-foreground mb-6">
          Zacznij od stworzenia swojej pierwszej talii lub wygeneruj fiszki automatycznie przy pomocy AI.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Button onClick={() => onDeckAction("create")} className="gap-2">
            <Sparkles className="w-4 h-4" />
            Utwórz pierwszą talię
          </Button>
          <a href="/generate" className={cn(buttonVariants({ variant: "outline" }), "gap-2 inline-flex")}>
            <Sparkles className="w-4 h-4" />
            Generuj AI fiszki
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {decks.map((deck) => (
        <DeckCard key={deck.id} deck={deck} onAction={(action) => onDeckAction(action, deck)} />
      ))}
    </div>
  );
}
