import { useState, useCallback, useMemo } from "react";
import type {
  GenerateFormData,
  GenerateFormErrors,
  EditableSuggestion,
  GenerationMetadata,
  AcceptOptions,
  AIModel,
  RateLimitInfo,
  GenerationStep,
} from "../validation/generate-ai";
import { generateFormDataSchema } from "../validation/generate-ai";

// Mock data for development - replace with actual API calls
const MOCK_AVAILABLE_MODELS: AIModel[] = [
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    cost_per_1m_tokens: 0.15,
    timeout_seconds: 60,
    is_recommended: true,
    description: "Fast and efficient model for flashcard generation",
  },
  {
    id: "anthropic/claude-3-haiku",
    name: "Claude 3 Haiku",
    provider: "Anthropic",
    cost_per_1m_tokens: 0.25,
    timeout_seconds: 90,
    is_recommended: false,
    description: "Balanced performance and cost",
  },
];

const MOCK_RATE_LIMIT: RateLimitInfo = {
  current_count: 7,
  limit: 10,
  remaining: 3,
  reset_at: new Date(Date.now() + 45 * 60 * 1000), // 45 minutes from now
  can_generate: true,
};

interface UseGenerateAIReturn {
  // State
  formData: GenerateFormData;
  formErrors: GenerateFormErrors;
  isGenerating: boolean;
  generationStep: GenerationStep;
  generationProgress: number;
  generationError: Error | null;
  suggestions: EditableSuggestion[] | null;
  selectedSuggestionIndices: number[];
  generationMetadata: GenerationMetadata | null;
  rateLimit: RateLimitInfo;
  acceptModalOpen: boolean;
  acceptOptions: AcceptOptions;

  // Available data
  availableDecks: any[]; // DeckDto[]
  availableModels: AIModel[];
  availableTags: any[]; // TagWithUsageDto[]

  // Actions
  setFormData: (data: Partial<GenerateFormData>) => void;
  validateForm: () => boolean;
  generateFlashcards: () => Promise<void>;
  cancelGeneration: () => void;
  updateSuggestion: (index: number, suggestion: EditableSuggestion) => void;
  deleteSuggestion: (index: number) => void;
  selectSuggestion: (index: number, selected: boolean) => void;
  selectAllSuggestions: (selected: boolean) => void;
  openAcceptModal: () => void;
  closeAcceptModal: () => void;
  setAcceptOptions: (options: Partial<AcceptOptions>) => void;
  acceptSuggestions: () => Promise<void>;
  resetForm: () => void;

  // Computed
  selectedSuggestions: EditableSuggestion[];
  canGenerate: boolean;
  estimatedCost: number;
}

const initialFormData: GenerateFormData = {
  source_text: "",
  model: "",
  deck_id: "",
  max_flashcards: 10,
  language: "pl",
  suggest_tags: true,
};

const initialAcceptOptions: AcceptOptions = {
  add_tags: false,
  tag_ids: [],
  create_new_deck: false,
  target_deck_id: "",
};

export function useGenerateAI(): UseGenerateAIReturn {
  // Form state
  const [formData, setFormDataState] = useState<GenerateFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<GenerateFormErrors>({});

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<GenerationStep>("validating");
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationError, setGenerationError] = useState<Error | null>(null);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<EditableSuggestion[] | null>(null);
  const [selectedSuggestionIndices, setSelectedSuggestionIndices] = useState<number[]>([]);
  const [generationMetadata, setGenerationMetadata] = useState<GenerationMetadata | null>(null);

  // Rate limit state
  const [rateLimit] = useState<RateLimitInfo>(MOCK_RATE_LIMIT);

  // Modal states
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [acceptOptions, setAcceptOptionsState] = useState<AcceptOptions>(initialAcceptOptions);

  // Available data
  const [availableDecks] = useState<any[]>([]); // TODO: Load from API
  const [availableModels] = useState<AIModel[]>(MOCK_AVAILABLE_MODELS);
  const [availableTags] = useState<any[]>([]); // TODO: Load from API

  // Actions
  const setFormData = useCallback((data: Partial<GenerateFormData>) => {
    setFormDataState((prev) => ({ ...prev, ...data }));
    // Clear errors for updated fields
    if (data.source_text !== undefined) setFormErrors((prev) => ({ ...prev, source_text: undefined }));
    if (data.model !== undefined) setFormErrors((prev) => ({ ...prev, model: undefined }));
    if (data.deck_id !== undefined) setFormErrors((prev) => ({ ...prev, deck_id: undefined }));
  }, []);

  const validateForm = useCallback((): boolean => {
    try {
      generateFormDataSchema.parse(formData);
      setFormErrors({});
      return true;
    } catch (error: any) {
      const errors: GenerateFormErrors = {};
      error.errors.forEach((err: any) => {
        const path = err.path[0] as keyof GenerateFormErrors;
        errors[path] = err.message;
      });
      setFormErrors(errors);
      return false;
    }
  }, [formData]);

  const generateFlashcards = useCallback(async () => {
    if (!validateForm()) return;
    if (!rateLimit.can_generate) return;

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationProgress(0);

    try {
      // Step 1: Validating
      setGenerationStep("validating");
      setGenerationProgress(10);
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 2: Sending request
      setGenerationStep("sending_request");
      setGenerationProgress(20);
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 3: Waiting for AI
      setGenerationStep("waiting_for_ai");
      setGenerationProgress(30);
      // Simulate AI processing time
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Step 4: Parsing response
      setGenerationStep("parsing_response");
      setGenerationProgress(80);

      // Mock suggestions
      const mockSuggestions: EditableSuggestion[] = [
        {
          original: { front: "What is Python?", back: "A programming language" },
          edited: { front: "What is Python?", back: "A programming language", edited: false },
          quality_score: 0.9,
          suggested_tags: ["programming", "python"],
        },
        {
          original: { front: "What are variables?", back: "Containers for storing data values" },
          edited: { front: "What are variables?", back: "Containers for storing data values", edited: false },
          quality_score: 0.85,
          suggested_tags: ["programming", "variables"],
        },
      ];

      const mockMetadata: GenerationMetadata = {
        generation_id: "mock-gen-123",
        model: formData.model,
        generated_count: mockSuggestions.length,
        source_text_length: formData.source_text.length,
        generation_duration_ms: 2500,
        cost_estimate: 0.02,
        created_at: new Date().toISOString(),
      };

      // Step 5: Processing suggestions
      setGenerationStep("processing_suggestions");
      setGenerationProgress(90);
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Step 6: Complete
      setGenerationStep("complete");
      setGenerationProgress(100);

      setSuggestions(mockSuggestions);
      setGenerationMetadata(mockMetadata);
      setSelectedSuggestionIndices(mockSuggestions.map((_, i) => i)); // Select all by default
    } catch (error) {
      setGenerationError(error as Error);
    } finally {
      setIsGenerating(false);
    }
  }, [formData, rateLimit, validateForm]);

  const cancelGeneration = useCallback(() => {
    setIsGenerating(false);
    setGenerationStep("validating");
    setGenerationProgress(0);
    setGenerationError(null);
  }, []);

  const updateSuggestion = useCallback((index: number, suggestion: EditableSuggestion) => {
    setSuggestions((prev) => {
      if (!prev) return prev;
      const newSuggestions = [...prev];
      newSuggestions[index] = suggestion;
      return newSuggestions;
    });
  }, []);

  const deleteSuggestion = useCallback((index: number) => {
    setSuggestions((prev) => {
      if (!prev) return prev;
      const newSuggestions = prev.filter((_, i) => i !== index);
      setSelectedSuggestionIndices((indices) => indices.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i)));
      return newSuggestions;
    });
  }, []);

  const selectSuggestion = useCallback((index: number, selected: boolean) => {
    setSelectedSuggestionIndices((prev) => {
      if (selected) {
        return [...new Set([...prev, index])];
      } else {
        return prev.filter((i) => i !== index);
      }
    });
  }, []);

  const selectAllSuggestions = useCallback(
    (selected: boolean) => {
      setSelectedSuggestionIndices(() => {
        if (selected && suggestions) {
          return suggestions.map((_, i) => i);
        } else {
          return [];
        }
      });
    },
    [suggestions]
  );

  const openAcceptModal = useCallback(() => {
    setAcceptModalOpen(true);
  }, []);

  const closeAcceptModal = useCallback(() => {
    setAcceptModalOpen(false);
  }, []);

  const setAcceptOptions = useCallback((options: Partial<AcceptOptions>) => {
    setAcceptOptionsState((prev) => ({ ...prev, ...options }));
  }, []);

  const acceptSuggestions = useCallback(async () => {
    if (!selectedSuggestions.length) return;

    try {
      // TODO: Implement actual API call
      console.log("Accepting suggestions:", selectedSuggestions, acceptOptions);

      // Mock success
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Reset state
      setSuggestions(null);
      setGenerationMetadata(null);
      setSelectedSuggestionIndices([]);
      setAcceptModalOpen(false);
      setAcceptOptionsState(initialAcceptOptions);
    } catch (error) {
      console.error("Error accepting suggestions:", error);
    }
  }, [selectedSuggestions, acceptOptions]);

  const resetForm = useCallback(() => {
    setFormDataState(initialFormData);
    setFormErrors({});
    setGenerationError(null);
    setSuggestions(null);
    setGenerationMetadata(null);
    setSelectedSuggestionIndices([]);
    setAcceptModalOpen(false);
    setAcceptOptionsState(initialAcceptOptions);
  }, []);

  // Computed values
  const selectedSuggestions = useMemo(() => {
    if (!suggestions) return [];
    return selectedSuggestionIndices.map((index) => suggestions[index]).filter(Boolean);
  }, [suggestions, selectedSuggestionIndices]);

  const canGenerate = useMemo(() => {
    return rateLimit.can_generate && !isGenerating && formData.source_text.length >= 1000;
  }, [rateLimit, isGenerating, formData.source_text]);

  const estimatedCost = useMemo(() => {
    if (!formData.model || !formData.source_text) return 0;

    const model = availableModels.find((m) => m.id === formData.model);
    if (!model) return 0;

    // Rough estimation: tokens ≈ characters / 4
    const estimatedTokens = formData.source_text.length / 4;
    return (estimatedTokens / 1_000_000) * model.cost_per_1m_tokens;
  }, [formData.model, formData.source_text, availableModels]);

  return {
    // State
    formData,
    formErrors,
    isGenerating,
    generationStep,
    generationProgress,
    generationError,
    suggestions,
    selectedSuggestionIndices,
    generationMetadata,
    rateLimit,
    acceptModalOpen,
    acceptOptions,

    // Available data
    availableDecks,
    availableModels,
    availableTags,

    // Actions
    setFormData,
    validateForm,
    generateFlashcards,
    cancelGeneration,
    updateSuggestion,
    deleteSuggestion,
    selectSuggestion,
    selectAllSuggestions,
    openAcceptModal,
    closeAcceptModal,
    setAcceptOptions,
    acceptSuggestions,
    resetForm,

    // Computed
    selectedSuggestions,
    canGenerate,
    estimatedCost,
  };
}
