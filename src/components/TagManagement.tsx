import { useState } from "react";
import { useTags, useDecks } from "@/hooks/useApi";
import { TagList } from "./TagList";
import { CreateTagButton } from "./CreateTagButton";
import { SkeletonLoader } from "./SkeletonLoader";
import { ErrorNotification } from "./ErrorNotification";
import { PageShell, PageSection } from "@/components/layout/PageShell";
import { PageHeader, PageHeaderHeading, PageHeaderActions } from "@/components/ui/page-header";
import { SectionShell } from "@/components/ui/section-shell";

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
      <PageShell background="plain">
        <PageSection spacing="md">
          {tagsError && (
            <ErrorNotification message={tagsError.message} error={tagsError} onRetry={() => mutateTags()} />
          )}
          {decksError && (
            <ErrorNotification message={decksError.message} error={decksError} onRetry={() => mutateDecks()} />
          )}
        </PageSection>
      </PageShell>
    );
  }

  return (
    <PageShell background="plain">
      <PageSection spacing="lg">
        <PageHeader>
          <PageHeaderHeading
            title="Twoje tagi"
            description="Zarządzaj tagami globalnymi i taliami, aby szybciej filtrować fiszki."
          />
          <PageHeaderActions>
            <CreateTagButton decks={decks} onSuccess={handleCreateSuccess} />
          </PageHeaderActions>
        </PageHeader>

        <SectionShell>
          <PageSection spacing="md">
            <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/70 bg-card/70 p-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground" htmlFor="tag-scope-filter">
                  Zakres:
                </label>
                <select
                  id="tag-scope-filter"
                  value={selectedScope}
                  onChange={(e) => {
                    setSelectedScope(e.target.value as "all" | "global" | "deck");
                    if (e.target.value !== "deck") {
                      setSelectedDeckId("");
                    }
                  }}
                  className="rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="all">Wszystkie tagi</option>
                  <option value="global">Tagi globalne</option>
                  <option value="deck">Tagi talii</option>
                </select>
              </div>

              {selectedScope === "deck" && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="tag-deck-filter">
                    Talia:
                  </label>
                  {isLoadingDecks ? (
                    <SkeletonLoader className="h-8 w-32" />
                  ) : (
                    <select
                      id="tag-deck-filter"
                      value={selectedDeckId}
                      onChange={(e) => setSelectedDeckId(e.target.value)}
                      className="rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Wszystkie talie</option>
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

            {isLoadingTags ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonLoader key={i} className="h-20" />
                ))}
              </div>
            ) : filteredTags.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mb-4 text-6xl">🏷️</div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">
                  {selectedScope === "all"
                    ? "Brak tagów"
                    : selectedScope === "global"
                      ? "Brak tagów globalnych"
                      : "Brak tagów talii"}
                </h3>
                <p className="mb-6 text-muted-foreground">
                  Utwórz swój pierwszy tag, aby usprawnić organizację fiszek.
                </p>
              </div>
            ) : (
              <TagList tags={filteredTags} decks={decks} onTagUpdate={handleTagUpdate} />
            )}
          </PageSection>
        </SectionShell>
      </PageSection>
    </PageShell>
  );
}
