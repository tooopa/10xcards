import type { TagWithUsageDto, DeckDto } from "@/types";
import { EditTagButton } from "./EditTagButton";

interface TagListProps {
  tags: TagWithUsageDto[];
  decks: DeckDto[];
  onTagUpdate: () => void;
}

export function TagList({ tags, decks, onTagUpdate }: TagListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tags.map((tag) => (
        <TagCard
          key={tag.id}
          tag={tag}
          decks={decks}
          onTagUpdate={onTagUpdate}
        />
      ))}
    </div>
  );
}

interface TagCardProps {
  tag: TagWithUsageDto;
  decks: DeckDto[];
  onTagUpdate: () => void;
}

function TagCard({ tag, decks, onTagUpdate }: TagCardProps) {
  const deckName = tag.scope === "deck" && tag.deck_id
    ? decks.find(d => d.id === tag.deck_id)?.name || "Unknown Deck"
    : null;

  return (
    <div className="p-4 bg-card border border-border rounded-lg hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{tag.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-1 rounded-full ${
              tag.scope === "global"
                ? "bg-primary/10 text-primary"
                : "bg-secondary/50 text-secondary-foreground"
            }`}>
              {tag.scope}
            </span>
            {deckName && (
              <span className="text-xs text-muted-foreground">
                {deckName}
              </span>
            )}
          </div>
        </div>

        {tag.scope === "deck" && (
          <EditTagButton tag={tag} onSuccess={onTagUpdate} />
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        Used in {tag.usage_count} flashcard{tag.usage_count !== 1 ? 's' : ''}
      </div>

      <div className="text-xs text-muted-foreground mt-2">
        Created {new Date(tag.created_at).toLocaleDateString()}
      </div>
    </div>
  );
}
