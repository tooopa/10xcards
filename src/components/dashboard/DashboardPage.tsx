import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { DeckDto, ErrorResponse } from "@/types";
import { useDashboard } from "@/lib/hooks/useDashboard";
import { Logger } from "@/lib/logger";
import { SearchAndFilters, type SearchAndFiltersHandle } from "./SearchAndFilters";
import { DeckList } from "./DeckList";
import { PaginationControls } from "./PaginationControls";
import { CreateDeckModal } from "./CreateDeckModal";
import { DeleteDeckModal } from "./DeleteDeckModal";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { type DeckAction } from "./DeckCard";
import { type CreateDeckFormData } from "@/lib/validation/dashboard";
import { useApp } from "@/contexts/AppContext";
import { EditDeckModal } from "./EditDeckModal";
import { cn } from "@/lib/utils";
import { PageShell, PageSection, PageGrid } from "@/components/layout/PageShell";
import { SectionShell } from "@/components/ui/section-shell";
import { PageHeader, PageHeaderHeading, PageHeaderActions } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";

const dashboardLogger = new Logger("DashboardPage");

const ShortcutHint = ({ combo, label }: { combo: string; label: string }) => (
  <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/90 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
    <span className="rounded-md bg-muted px-1.5 py-0.5 font-semibold tracking-widest text-foreground">{combo}</span>
    <span className="font-medium">{label}</span>
  </div>
);

export function DashboardPage() {
  const { user, isUserLoading } = useApp();
  const {
    // State
    decks,
    pagination,
    filters,
    isLoading,
    error,

    // Modal states
    createModalOpen,
    deleteModalState,
    editModalState,

    // Actions
    setFilters,
    createDeck,
    deleteDeck,
    updateDeck,
    setPage,
    setLimit,

    // Modal actions
    openCreateModal,
    closeCreateModal,
    openDeleteModal,
    closeDeleteModal,
    openEditModal,
    closeEditModal,
  } = useDashboard({ skip: !user });
  const searchFiltersRef = useRef<SearchAndFiltersHandle>(null);

  const handleDeleteDeck = async () => {
    if (!deleteModalState.deck) return;

    try {
      const result = await deleteDeck(deleteModalState.deck.id);
      const migrated = result.migrated_flashcards_count;
      if (migrated > 0) {
        toast.success(
          `Talia została usunięta. ${migrated} fiszek przeniesiono do tagu ${result.migration_tag.name || "#migrated"}.`
        );
      } else {
        toast.success("Talia została usunięta pomyślnie!");
      }
      closeDeleteModal();
    } catch (error) {
      const apiError = (error as ErrorResponse | undefined)?.error?.message ?? "Wystąpił błąd podczas usuwania talii";
      toast.error(apiError);
      const errorForLog = error instanceof Error ? error : new Error(apiError);
      dashboardLogger.error(errorForLog, { deckId: deleteModalState.deck?.id?.toString() ?? "unknown" });
    }
  };

  const handleCreateDeck = useCallback(
    async (values: CreateDeckFormData) => {
      const deck = await createDeck(values);
      toast.success(`Talia "${deck.name}" została utworzona!`);
      return deck;
    },
    [createDeck]
  );

  const handleEditDeck = useCallback(
    async (values: CreateDeckFormData) => {
      if (!editModalState.deck) return editModalState.deck as unknown as DeckDto;
      const updated = await updateDeck(Number(editModalState.deck.id), values);
      toast.success(`Talia "${updated.name}" została zaktualizowana!`);
      closeEditModal();
      return updated;
    },
    [updateDeck, editModalState.deck, closeEditModal]
  );

  const handleDeckAction = useCallback(
    (action: DeckAction, deck?: DeckDto) => {
      switch (action) {
        case "view":
          if (deck) {
            window.location.href = `/decks/${deck.id}`;
          }
          break;
        case "edit":
          if (deck) {
            openEditModal(deck);
          }
          break;
        case "delete":
          if (deck) {
            openDeleteModal(deck);
          }
          break;
        case "create":
          openCreateModal();
          break;
        default:
          break;
      }
    },
    [openCreateModal, openDeleteModal, openEditModal]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      if ((event.ctrlKey || event.metaKey) && key === "f") {
        event.preventDefault();
        searchFiltersRef.current?.focusSearchInput();
      }

      if ((event.ctrlKey || event.metaKey) && key === "n") {
        event.preventDefault();
        openCreateModal();
      }

      if (key === "escape") {
        if (editModalState.isOpen) {
          event.preventDefault();
          closeEditModal();
          return;
        }
        if (createModalOpen) {
          event.preventDefault();
          closeCreateModal();
          return;
        }
        if (deleteModalState.isOpen) {
          event.preventDefault();
          closeDeleteModal();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    closeCreateModal,
    closeDeleteModal,
    createModalOpen,
    deleteModalState.isOpen,
    openCreateModal,
    editModalState.isOpen,
    closeEditModal,
  ]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      window.location.href = "/auth/login";
    }
  }, [isUserLoading, user]);

  const totalFlashcards = useMemo(() => decks.reduce((sum, deck) => sum + deck.flashcard_count, 0), [decks]);

  if (isUserLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Sprawdzamy status Twojej sesji...</p>
      </div>
    );
  }

  const maxDeckSize = Math.max(...decks.map((deck) => deck.flashcard_count), 0);

  return (
    <>
      <PageShell>
        <PageSection spacing="lg">
          <SectionShell className="text-xs text-muted-foreground" padded>
            <p className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-primary">
                <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                Nowość
              </span>
              Widok dashboardu wspiera skróty klawiaturowe i szybkie tworzenie talii przy pomocy AI.
            </p>
          </SectionShell>

          <PageHeader>
            <div className="space-y-4">
              <PageHeaderHeading
                eyebrow="Panel główny"
                title="Wszystkie talie i generacje zawsze pod ręką"
                description="Wyszukuj, filtruj i twórz talie szybciej niż kiedykolwiek dzięki skrótom klawiaturowym i natychmiastowym podpowiedziom."
              />
              <div className="flex flex-wrap gap-2">
                <ShortcutHint combo="Ctrl + F" label="Szukaj talii" />
                <ShortcutHint combo="Ctrl + N" label="Utwórz talię" />
              </div>
            </div>
            <PageHeaderActions>
              <Button onClick={openCreateModal} className="gap-2">
                <Sparkles className="w-4 h-4" />
                Utwórz talię
              </Button>
              <a href="/generate" className={cn(buttonVariants({ variant: "outline" }), "gap-2 inline-flex")}>
                <Sparkles className="w-4 h-4" />
                Generuj AI fiszki
              </a>
            </PageHeaderActions>
          </PageHeader>

          <PageGrid columns={{ base: 1, md: 2, lg: 4 }}>
            <StatCard label="Łącznie talii" value={decks.length} description="aktywnych talii w Twojej bibliotece" />
            <StatCard
              label="Łącznie fiszek"
              value={totalFlashcards}
              description="sumaryczna liczba fiszek"
              variant="success"
            />
            <StatCard
              label="Domyślne talie"
              value={decks.filter((deck) => deck.is_default).length}
              description="automatycznie utworzone zestawy"
              variant="warning"
            />
            <StatCard
              label="Maks. fiszek w talii"
              value={maxDeckSize}
              description="największa talia w kolekcji"
              variant="danger"
            />
          </PageGrid>

          <SectionShell>
            <PageSection spacing="md">
              <SearchAndFilters
                ref={searchFiltersRef}
                filters={filters}
                onFiltersChange={setFilters}
                isLoading={isLoading}
              />

              <DeckList decks={decks} isLoading={isLoading} error={error} onDeckAction={handleDeckAction} />

              {pagination.total > 0 && (
                <PaginationControls pagination={pagination} onPageChange={setPage} onLimitChange={setLimit} />
              )}
            </PageSection>
          </SectionShell>
        </PageSection>
      </PageShell>

      <CreateDeckModal isOpen={createModalOpen} onClose={closeCreateModal} onSubmit={handleCreateDeck} />

      <DeleteDeckModal
        isOpen={deleteModalState.isOpen}
        deck={deleteModalState.deck}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteDeck}
      />

      <EditDeckModal
        isOpen={editModalState.isOpen}
        deck={editModalState.deck}
        onClose={closeEditModal}
        onSubmit={handleEditDeck}
      />
    </>
  );
}
