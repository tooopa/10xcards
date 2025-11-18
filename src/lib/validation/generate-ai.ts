import { z } from "zod";
import type { AIModel, RateLimitInfo, EditableSuggestion, GenerationMetadata, AcceptOptions } from "../types";

// Constants
export const GENERATION_CONSTRAINTS = {
  MIN_SOURCE_LENGTH: 1000,
  MAX_SOURCE_LENGTH: 10000,
  MIN_FLASHCARDS: 3,
  MAX_FLASHCARDS: 20,
  RATE_LIMIT_PER_HOUR: 10,
} as const;

// Enums
export type GenerationStep =
  | "validating"
  | "sending_request"
  | "waiting_for_ai"
  | "parsing_response"
  | "processing_suggestions"
  | "complete";

// Form Data Schemas
export const sourceTextSchema = z
  .string()
  .min(
    GENERATION_CONSTRAINTS.MIN_SOURCE_LENGTH,
    `Tekst źródłowy musi mieć minimum ${GENERATION_CONSTRAINTS.MIN_SOURCE_LENGTH} znaków`
  )
  .max(
    GENERATION_CONSTRAINTS.MAX_SOURCE_LENGTH,
    `Tekst źródłowy nie może przekraczać ${GENERATION_CONSTRAINTS.MAX_SOURCE_LENGTH} znaków`
  )
  .refine((text) => text.trim().length > 0, "Tekst źródłowy nie może być pusty")
  .refine((text) => {
    const words = text.trim().split(/\s+/).length;
    return words >= 50;
  }, "Tekst źródłowy musi zawierać przynajmniej 50 słów");

export const modelSchema = z
  .string()
  .min(1, "Model jest wymagany")
  .refine(() => {
    // This would be validated against available models
    return true; // Placeholder - actual validation in component
  }, "Wybrany model nie jest dostępny");

export const deckIdSchema = z.string().min(1, "Talia jest wymagana");

export const maxFlashcardsSchema = z
  .number()
  .min(GENERATION_CONSTRAINTS.MIN_FLASHCARDS, `Minimum ${GENERATION_CONSTRAINTS.MIN_FLASHCARDS} fiszek`)
  .max(GENERATION_CONSTRAINTS.MAX_FLASHCARDS, `Maksimum ${GENERATION_CONSTRAINTS.MAX_FLASHCARDS} fiszek`)
  .optional();

export const languageSchema = z.string().optional();
export const suggestTagsSchema = z.boolean().optional();

// Generate Form Data Schema
export const generateFormDataSchema = z.object({
  source_text: sourceTextSchema,
  model: modelSchema,
  deck_id: deckIdSchema,
  max_flashcards: maxFlashcardsSchema,
  language: languageSchema,
  suggest_tags: suggestTagsSchema,
});

// Suggestion Validation
export const suggestionSchema = z.object({
  front: z.string().min(1, "Pytanie jest wymagane").max(200, "Pytanie jest zbyt długie"),
  back: z.string().min(1, "Odpowiedź jest wymagana").max(500, "Odpowiedź jest zbyt długa"),
});

// Editable Suggestion Schema
export const editableSuggestionSchema = z.object({
  original: z.any(), // GenerationSuggestionDto
  edited: z.object({
    front: z.string(),
    back: z.string(),
    edited: z.boolean(),
  }),
  quality_score: z.number().min(0).max(1),
  suggested_tags: z.array(z.string()),
});

// Generation Metadata Schema
export const generationMetadataSchema = z.object({
  generation_id: z.string(),
  model: z.string(),
  generated_count: z.number(),
  source_text_length: z.number(),
  generation_duration_ms: z.number(),
  cost_estimate: z.number(),
  created_at: z.string(),
});

// Accept Options Schema
export const acceptOptionsSchema = z
  .object({
    add_tags: z.boolean(),
    tag_ids: z.array(z.string()),
    create_new_deck: z.boolean(),
    new_deck_name: z.string().optional(),
    target_deck_id: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.create_new_deck && !data.new_deck_name) {
        return false;
      }
      if (!data.create_new_deck && !data.target_deck_id) {
        return false;
      }
      return true;
    },
    {
      message: "Wybierz istniejącą talię lub podaj nazwę nowej",
      path: ["target_deck_id"],
    }
  );

// Form Error Types
export interface GenerateFormErrors {
  source_text?: string;
  model?: string;
  deck_id?: string;
  max_flashcards?: string;
  language?: string;
  suggest_tags?: string;
  general?: string;
}

export interface SuggestionErrors {
  front?: string;
  back?: string;
}

// ViewModel Types
export interface GeneratePageState {
  // Form state
  formData: GenerateFormData;
  formErrors: GenerateFormErrors;

  // Generation state
  isGenerating: boolean;
  generationStep: GenerationStep;
  generationProgress: number;
  generationError: Error | null;

  // Suggestions state
  suggestions: EditableSuggestion[] | null;
  selectedSuggestionIndices: number[];
  generationMetadata: GenerationMetadata | null;

  // Rate limit state
  rateLimit: RateLimitInfo;

  // Modal states
  acceptModalOpen: boolean;
  acceptOptions: AcceptOptions;

  // Available data
  availableDecks: any[]; // DeckDto[]
  availableModels: AIModel[];
  availableTags: any[]; // TagWithUsageDto[]
}

export interface GenerateFormData {
  source_text: string;
  model: string;
  deck_id: string;
  max_flashcards?: number;
  language?: string;
  suggest_tags?: boolean;
}

export interface EditableSuggestion {
  original: any; // GenerationSuggestionDto
  edited: {
    front: string;
    back: string;
    edited: boolean;
  };
  quality_score: number;
  suggested_tags: string[];
}

export interface GenerationMetadata {
  generation_id: string;
  model: string;
  generated_count: number;
  source_text_length: number;
  generation_duration_ms: number;
  cost_estimate: number;
  created_at: string;
}

export interface AcceptOptions {
  add_tags: boolean;
  tag_ids: string[];
  create_new_deck: boolean;
  new_deck_name?: string;
  target_deck_id?: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  cost_per_1m_tokens: number;
  timeout_seconds: number;
  is_recommended: boolean;
  description?: string;
}

export interface RateLimitInfo {
  current_count: number;
  limit: number;
  remaining: number;
  reset_at: Date;
  can_generate: boolean;
}

// Component Props Types
export interface GeneratePageProps {
  initialDeckId?: string;
  initialModel?: string;
}

export interface GenerateFormProps {
  onSubmit: (data: GenerateFormData) => Promise<void>;
  rateLimit: RateLimitInfo;
  isGenerating: boolean;
  availableDecks: any[]; // DeckDto[]
  availableModels: AIModel[];
}

export interface SourceTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  maxLength: number;
  minLength: number;
}

export interface ModelSelectorProps {
  selectedModel: string | null;
  onModelChange: (modelId: string) => void;
  sourceTextLength: number;
  availableModels: AIModel[];
}

export interface RateLimitIndicatorProps {
  rateLimit: RateLimitInfo;
  onUpgradeClick?: () => void;
}

export interface SuggestionsListProps {
  suggestions: EditableSuggestion[];
  onSuggestionChange: (index: number, suggestion: EditableSuggestion) => void;
  onSuggestionDelete: (index: number) => void;
  onAcceptSelected: (selectedIndices: number[]) => void;
  generationMetadata: GenerationMetadata;
}

export interface SuggestionCardProps {
  suggestion: EditableSuggestion;
  onChange: (suggestion: EditableSuggestion) => void;
  onDelete: () => void;
}

export interface AcceptSuggestionsModalProps {
  isOpen: boolean;
  selectedSuggestions: EditableSuggestion[];
  onClose: () => void;
  onAccept: (options: AcceptOptions) => Promise<void>;
  availableDecks: any[]; // DeckDto[]
  availableTags: any[]; // TagWithUsageDto[]
}

export interface GenerationProgressProps {
  isVisible: boolean;
  currentStep: GenerationStep;
  progress: number;
  estimatedTimeRemaining: number;
  onCancel: () => void;
}
