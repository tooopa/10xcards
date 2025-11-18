import { useState, useEffect } from "react";
import type { GenerationSuggestionsDto, GenerationSuggestionDto } from "@/types";
import { TextInputArea } from "./TextInputArea";
import { GenerateButton } from "./GenerateButton";
import { FlashcardList } from "./FlashcardList";
import { SkeletonLoader } from "./SkeletonLoader";
import { BulkSaveButton } from "./BulkSaveButton";
import { ErrorNotification } from "./ErrorNotification";
import { FormField } from "@/components/ui/form-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type FlashcardProposalViewModel = GenerationSuggestionDto & {
  accepted: boolean;
  edited: boolean;
  source: "ai-full" | "ai-edited";
};

interface FlashcardGenerationViewProps {
  deckId?: string | null;
}

export function FlashcardGenerationView({ deckId }: FlashcardGenerationViewProps) {
  const [textValue, setTextValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<number | null>(null);
  const [flashcards, setFlashcards] = useState<FlashcardProposalViewModel[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>("");
  const [availableDecks, setAvailableDecks] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchAvailableDecks();
  }, []);

  useEffect(() => {
    if (deckId) {
      setSelectedDeckId(deckId);
    } else if (availableDecks.length > 0 && !selectedDeckId) {
      // Auto-select first deck if none selected
      setSelectedDeckId(availableDecks[0].id);
    }
  }, [deckId, availableDecks, selectedDeckId]);

  const fetchAvailableDecks = async () => {
    try {
      const response = await fetch("/api/v1/decks");
      if (!response.ok) {
        throw new Error("Failed to fetch decks");
      }
      interface DeckOption {
        id: string;
        name: string;
      }
      const data = await response.json();
      setAvailableDecks(data.data.map((deck: DeckOption) => ({ id: deck.id, name: deck.name })));
    } catch {
      // ignore
    }
  };

  const handleTextChange = (value: string) => {
    setTextValue(value);
    setErrorMessage(null);
  };

  const handleGenerateFlashcards = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const response = await fetch("/api/v1/generations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_text: textValue,
          model: "openai/gpt-4o-mini", // Default model for MVP
          deck_id: selectedDeckId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate flashcards. Please try again.");
      }

      const data: GenerationSuggestionsDto = await response.json();
      setGenerationId(data.generation_id);
      setFlashcards(
        data.suggestions.map((proposal) => ({
          ...proposal,
          accepted: false,
          edited: false,
          source: "ai-full" as const,
        }))
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFlashcardAccept = (index: number) => {
    setFlashcards((prev) => prev.map((card, i) => (i === index ? { ...card, accepted: true } : card)));
  };

  const handleFlashcardReject = (index: number) => {
    setFlashcards((prev) => prev.map((card, i) => (i === index ? { ...card, accepted: false } : card)));
  };

  const handleFlashcardEdit = (index: number, front: string, back: string) => {
    setFlashcards((prev) =>
      prev.map((card, i) => (i === index ? { ...card, front, back, edited: true, source: "ai-edited" as const } : card))
    );
  };

  const handleSaveSuccess = () => {
    setTextValue("");
    setFlashcards([]);
    setGenerationId(null);
  };

  return (
    <div className="space-y-6">
      {errorMessage && <ErrorNotification message={errorMessage} />}

      {/* Deck Selector */}
      <FormField label="Docelowa talia" description="Wygenerowane fiszki zostaną zapisane w wybranym zbiorze." required>
        <Select
          value={selectedDeckId}
          onValueChange={setSelectedDeckId}
          disabled={isLoading || availableDecks.length === 0}
        >
          <SelectTrigger fullWidth aria-label="Wybierz talię docelową">
            <SelectValue placeholder="Wybierz talię" />
          </SelectTrigger>
          <SelectContent>
            {availableDecks.map((deck) => (
              <SelectItem key={deck.id} value={deck.id}>
                {deck.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <TextInputArea value={textValue} onChange={handleTextChange} disabled={isLoading} />

      <GenerateButton
        onClick={handleGenerateFlashcards}
        disabled={isLoading || textValue.length < 1000 || textValue.length > 10000 || !selectedDeckId}
        isLoading={isLoading}
      />

      {isLoading && <SkeletonLoader />}

      {flashcards.length > 0 && (
        <>
          {generationId !== null && (
            <BulkSaveButton
              flashcards={flashcards}
              generationId={generationId}
              disabled={isLoading}
              onSuccess={handleSaveSuccess}
            />
          )}
          <FlashcardList
            flashcards={flashcards}
            onAccept={handleFlashcardAccept}
            onReject={handleFlashcardReject}
            onEdit={handleFlashcardEdit}
          />
        </>
      )}
    </div>
  );
}
