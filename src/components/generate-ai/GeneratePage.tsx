import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Sparkles, AlertCircle } from "lucide-react";
import { useGenerateAI } from "../../lib/hooks/useGenerateAI";
import { GenerateForm } from "./GenerateForm";
import { RateLimitIndicator } from "./RateLimitIndicator";
import { GenerationProgress } from "./GenerationProgress";
import { SuggestionsList } from "./SuggestionsList";
import { AcceptSuggestionsModal } from "./AcceptSuggestionsModal";
import type { GeneratePageProps } from "../../lib/validation/generate-ai";
import { PageShell, PageSection } from "@/components/layout/PageShell";
import { SectionShell } from "@/components/ui/section-shell";
import { PageHeader, PageHeaderHeading, PageHeaderActions } from "@/components/ui/page-header";

export function GeneratePage({ initialDeckId, initialModel }: GeneratePageProps) {
  const {
    // State
    formErrors,
    isGenerating,
    generationStep,
    generationProgress,
    generationError,
    suggestions,
    generationMetadata,
    rateLimit,
    acceptModalOpen,

    // Available data
    availableDecks,
    availableModels,
    availableTags,

    // Actions
    setFormData,
    generateFlashcards,
    cancelGeneration,
    updateSuggestion,
    deleteSuggestion,
    selectSuggestion,
    selectAllSuggestions,
    openAcceptModal,
    closeAcceptModal,
    acceptSuggestions,
    resetForm,

    // Computed
    selectedSuggestions,
    estimatedCost,
  } = useGenerateAI();

  // Initialize with URL params
  useEffect(() => {
    if (initialDeckId) {
      setFormData({ deck_id: initialDeckId });
    }
    if (initialModel) {
      setFormData({ model: initialModel });
    }
  }, [initialDeckId, initialModel, setFormData]);

  const handleFormSubmit = async () => {
    await generateFlashcards();
  };

  const handleSuggestionChange = (index: number, suggestion: any) => {
    updateSuggestion(index, suggestion);
  };

  const handleSuggestionDelete = (index: number) => {
    deleteSuggestion(index);
  };

  const handleAcceptSelected = (selectedIndices: number[]) => {
    selectAllSuggestions(false); // Clear all
    selectedIndices.forEach((index) => selectSuggestion(index, true)); // Select specific
    openAcceptModal();
  };

  const handleAcceptModalClose = () => {
    closeAcceptModal();
  };

  const handleAcceptSuggestions = async () => {
    await acceptSuggestions();
  };

  const hasSuggestions = suggestions && suggestions.length > 0;
  const hasErrors = Object.keys(formErrors).length > 0 || generationError;

  return (
    <>
      <PageShell background="plain">
        <PageSection spacing="lg">
          <PageHeader>
            <PageHeaderHeading
              eyebrow="Generowanie AI"
              title={
                <span className="flex items-center gap-2">
                  <Sparkles className="h-7 w-7 text-primary" />
                  Generuj fiszki z AI
                </span>
              }
              description="Wykorzystaj modele OpenRouter, aby stworzyć nowe fiszki z istniejącego materiału w kilka sekund."
            />
            <PageHeaderActions className="flex-col items-stretch gap-4 sm:flex-row sm:items-center">
              <Button variant="ghost" size="sm" asChild className="justify-center">
                <a href="/dashboard">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Powrót do dashboardu
                </a>
              </Button>
              <div className="hidden md:block">
                <RateLimitIndicator
                  rateLimit={rateLimit}
                  onUpgradeClick={() => {
                    console.log("Navigate to upgrade");
                  }}
                />
              </div>
            </PageHeaderActions>
          </PageHeader>

          <div className="md:hidden">
            <RateLimitIndicator
              rateLimit={rateLimit}
              onUpgradeClick={() => {
                console.log("Navigate to upgrade");
              }}
            />
          </div>

          {hasErrors && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {generationError ? (
                  <div>
                    <p className="font-medium">Błąd generowania:</p>
                    <p>{generationError.message}</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium">Błędy formularza:</p>
                    <ul className="list-disc list-inside mt-2">
                      {Object.entries(formErrors).map(([field, error]) => (
                        <li key={field}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <SectionShell>
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="space-y-8 lg:col-span-2">
                {!hasSuggestions && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Konfiguracja generowania</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <GenerateForm
                        onSubmit={handleFormSubmit}
                        rateLimit={rateLimit}
                        isGenerating={isGenerating}
                        availableDecks={availableDecks}
                        availableModels={availableModels}
                      />
                    </CardContent>
                  </Card>
                )}

                {hasSuggestions && (
                  <SuggestionsList
                    suggestions={suggestions}
                    onSuggestionChange={handleSuggestionChange}
                    onSuggestionDelete={handleSuggestionDelete}
                    onAcceptSelected={handleAcceptSelected}
                    generationMetadata={generationMetadata}
                  />
                )}

                {estimatedCost > 0 && !hasSuggestions && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Szacowany koszt generowania:</span>
                        <span className="text-lg font-semibold text-primary">${estimatedCost.toFixed(4)}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Jak to działa?</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="flex gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                        1
                      </div>
                      <p>Wklej lub wpisz tekst źródłowy (minimum 1000 znaków)</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                        2
                      </div>
                      <p>Wybierz model AI i talię docelową</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                        3
                      </div>
                      <p>Wygeneruj fiszki i przejrzyj sugestie</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                        4
                      </div>
                      <p>Akceptuj wybrane fiszki do swojej talii</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Wskazówki</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p>• Im dłuższy i bardziej szczegółowy tekst, tym lepsze fiszki</p>
                    <p>• Wybieraj teksty z jasną strukturą i kluczowymi koncepcjami</p>
                    <p>• Możesz edytować wygenerowane fiszki przed akceptacją</p>
                    <p>• Sprawdzaj jakość — AI nie zawsze rozumie kontekst poprawnie</p>
                    <p>• Używaj tagów do lepszej organizacji fiszek</p>
                  </CardContent>
                </Card>

                {(hasSuggestions || hasErrors) && (
                  <Button variant="outline" onClick={resetForm} className="w-full">
                    Rozpocznij od nowa
                  </Button>
                )}
              </div>
            </div>
          </SectionShell>
        </PageSection>
      </PageShell>

      <GenerationProgress
        isVisible={isGenerating}
        currentStep={generationStep}
        progress={generationProgress}
        estimatedTimeRemaining={30}
        onCancel={cancelGeneration}
      />

      <AcceptSuggestionsModal
        isOpen={acceptModalOpen}
        selectedSuggestions={selectedSuggestions}
        onClose={handleAcceptModalClose}
        onAccept={handleAcceptSuggestions}
        availableDecks={availableDecks}
        availableTags={availableTags}
      />
    </>
  );
}
