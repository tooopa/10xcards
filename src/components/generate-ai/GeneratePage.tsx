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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <a href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Powrót do dashboard
              </a>
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Sparkles className="h-8 w-8 text-primary" />
                Generuj fiszki z AI
              </h1>
              <p className="text-muted-foreground mt-1">
                Użyj sztucznej inteligencji do automatycznego tworzenia fiszek z tekstu źródłowego
              </p>
            </div>
          </div>

          {/* Rate Limit Indicator */}
          <div className="hidden md:block">
            <RateLimitIndicator
              rateLimit={rateLimit}
              onUpgradeClick={() => {
                // TODO: Navigate to upgrade page
                console.log("Navigate to upgrade");
              }}
            />
          </div>
        </div>

        {/* Mobile Rate Limit */}
        <div className="md:hidden mb-6">
          <RateLimitIndicator
            rateLimit={rateLimit}
            onUpgradeClick={() => {
              // TODO: Navigate to upgrade page
              console.log("Navigate to upgrade");
            }}
          />
        </div>

        {/* Error Display */}
        {hasErrors && (
          <Alert variant="destructive" className="mb-6">
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

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Generate Form */}
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

            {/* Suggestions List */}
            {hasSuggestions && (
              <SuggestionsList
                suggestions={suggestions}
                onSuggestionChange={handleSuggestionChange}
                onSuggestionDelete={handleSuggestionDelete}
                onAcceptSelected={handleAcceptSelected}
                generationMetadata={generationMetadata}
              />
            )}

            {/* Cost Estimate */}
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

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Help Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Jak to działa?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                    1
                  </div>
                  <p>Wklej lub wpisz tekst źródłowy (minimum 1000 znaków)</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                    2
                  </div>
                  <p>Wybierz model AI i talię docelową</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                    3
                  </div>
                  <p>Wygeneruj fiszki i przejrzyj sugestie</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                    4
                  </div>
                  <p>Akceptuj wybrane fiszki do swojej talii</p>
                </div>
              </CardContent>
            </Card>

            {/* Tips Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Wskazówki</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>• Im dłuższy i bardziej szczegółowy tekst, tym lepsze fiszki</p>
                <p>• Wybieraj teksty z jasną strukturą i kluczowymi koncepcjami</p>
                <p>• Możesz edytować wygenerowane fiszki przed akceptacją</p>
                <p>• Sprawdzaj jakość - AI nie zawsze rozumie kontekst poprawnie</p>
                <p>• Używaj tagów do lepszej organizacji fiszek</p>
              </CardContent>
            </Card>

            {/* Reset Button */}
            {(hasSuggestions || hasErrors) && (
              <Button variant="outline" onClick={resetForm} className="w-full">
                Rozpocznij od nowa
              </Button>
            )}
          </div>
        </div>

        {/* Generation Progress Modal */}
        <GenerationProgress
          isVisible={isGenerating}
          currentStep={generationStep}
          progress={generationProgress}
          estimatedTimeRemaining={30} // Mock value
          onCancel={cancelGeneration}
        />

        {/* Accept Suggestions Modal */}
        <AcceptSuggestionsModal
          isOpen={acceptModalOpen}
          selectedSuggestions={selectedSuggestions}
          onClose={handleAcceptModalClose}
          onAccept={handleAcceptSuggestions}
          availableDecks={availableDecks}
          availableTags={availableTags}
        />
      </div>
    </div>
  );
}
