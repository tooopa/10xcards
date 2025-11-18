import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import type { GenerateFormData, GenerateFormProps } from "../../lib/validation/generate-ai";
import { generateFormDataSchema } from "../../lib/validation/generate-ai";
import { SourceTextArea } from "./SourceTextArea";
import { ModelSelector } from "./ModelSelector";
import { DeckSelector } from "./DeckSelector";
import { AdvancedOptions } from "./AdvancedOptions";
import { Loader2 } from "lucide-react";

export function GenerateForm({
  onSubmit,
  rateLimit,
  isGenerating,
  availableDecks,
  availableModels,
}: GenerateFormProps) {
  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<GenerateFormData>({
    resolver: zodResolver(generateFormDataSchema),
    defaultValues: {
      source_text: "",
      model: "",
      deck_id: "",
      max_flashcards: 10,
      language: "pl",
      suggest_tags: true,
    },
  });

  const watchedSourceText = watch("source_text");
  const watchedModel = watch("model");

  const handleFormSubmit = async (data: GenerateFormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="space-y-4">
        <SourceTextArea
          value={watchedSourceText}
          onChange={(value) => setValue("source_text", value)}
          error={errors.source_text?.message}
          maxLength={10000}
          minLength={1000}
        />

        <ModelSelector
          selectedModel={watchedModel}
          onModelChange={(modelId) => setValue("model", modelId)}
          sourceTextLength={watchedSourceText.length}
          availableModels={availableModels}
        />

        <DeckSelector
          selectedDeckId={watch("deck_id")}
          onDeckChange={(deckId) => setValue("deck_id", deckId)}
          availableDecks={availableDecks}
          error={errors.deck_id?.message}
        />

        <AdvancedOptions
          maxFlashcards={watch("max_flashcards")}
          onMaxFlashcardsChange={(value) => setValue("max_flashcards", value)}
          language={watch("language")}
          onLanguageChange={(value) => setValue("language", value)}
          suggestTags={watch("suggest_tags")}
          onSuggestTagsChange={(value) => setValue("suggest_tags", value)}
        />
      </div>

      <div className="flex flex-col gap-4">
        <Button type="submit" disabled={!rateLimit.can_generate || isGenerating} className="w-full" size="lg">
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generowanie...
            </>
          ) : rateLimit.can_generate ? (
            "Generuj fiszki"
          ) : (
            "Limit przekroczony"
          )}
        </Button>

        {!rateLimit.can_generate && (
          <p className="text-sm text-muted-foreground text-center">
            Osiągnąłeś limit {rateLimit.limit} generacji na godzinę. Następny reset za{" "}
            {Math.ceil((rateLimit.reset_at.getTime() - Date.now()) / (1000 * 60))} minut.
          </p>
        )}
      </div>
    </form>
  );
}
