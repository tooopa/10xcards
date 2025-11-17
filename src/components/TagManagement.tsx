import { useState } from "react";
import { useTags, useDecks } from "@/hooks/useApi";
import { TagList } from "./TagList";
import { CreateTagButton } from "./CreateTagButton";
import { SkeletonLoader } from "./SkeletonLoader";
import { ErrorNotification } from "./ErrorNotification";

export function TagManagement() {
  const { tags, isLoading: isLoadingTags, error: tagsError, mutate: mutateTags } = useTags();
  const { decks, isLoading: isLoadingDecks, error: decksError, mutate: mutateDecks } = useDecks();

  const [selectedScope, setSelectedScope] = useState<"all" | "global" | "deck">("all");
  const [selectedDeckId, setSelectedDeckId] = useState<string>("");

  const handleCreateSuccess = () => {
    mutateTags(); // Refresh tags list
  };

  const handleTagUpdate = () => {
    mutateTags(); // Refresh tags list
  };

  // Filter tags based on selected scope
  const filteredTags = tags.filter((tag) => {
    if (selectedScope === "all") return true;
    if (selectedScope === "global") return tag.scope === "global";
    if (selectedScope === "deck") {
      return tag.scope === "deck" && (!selectedDeckId || tag.deck_id === selectedDeckId);
    }
    return true;
  });

  if (tagsError || decksError) {
    return (
      <div className="space-y-4">
        {tagsError && <ErrorNotification message={tagsError.message} error={tagsError} onRetry={() => mutateTags()} />}
        {decksError && <ErrorNotification message={decksError.message} error={decksError} onRetry={() => mutateDecks()} />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Your Tags</h2>
          <p className="text-muted-foreground">Manage tags to organize your flashcards</p>
        </div>
        <CreateTagButton decks={decks} onSuccess={handleCreateSuccess} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-foreground">Scope:</label>
          <select
            value={selectedScope}
            onChange={(e) => {
              setSelectedScope(e.target.value as "all" | "global" | "deck");
              if (e.target.value !== "deck") {
                setSelectedDeckId("");
              }
            }}
            className="px-3 py-1 border border-input bg-background rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Tags</option>
            <option value="global">Global Tags</option>
            <option value="deck">Deck Tags</option>
          </select>
        </div>

        {selectedScope === "deck" && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground">Deck:</label>
            {isLoadingDecks ? (
              <SkeletonLoader className="h-8 w-32" />
            ) : (
              <select
                value={selectedDeckId}
                onChange={(e) => setSelectedDeckId(e.target.value)}
                className="px-3 py-1 border border-input bg-background rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All Decks</option>
                {decks.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Tags list */}
      {isLoadingTags ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonLoader key={i} className="h-20" />
          ))}
        </div>
      ) : filteredTags.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏷️</div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {selectedScope === "all" ? "No tags yet" :
             selectedScope === "global" ? "No global tags" :
             "No deck tags"}
          </h3>
          <p className="text-muted-foreground mb-6">
            Create your first tag to start organizing your flashcards
          </p>
        </div>
      ) : (
        <TagList tags={filteredTags} decks={decks} onTagUpdate={handleTagUpdate} />
      )}
    </div>
  );
}
