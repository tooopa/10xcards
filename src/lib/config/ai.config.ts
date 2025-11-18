/**
 * AI Configuration for OpenRouter.ai integration
 *
 * This file contains configuration for AI model selection, rate limiting,
 * and other AI-related settings.
 */

/**
 * Supported AI model configurations
 */
export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  /** Estimated cost per 1M tokens (USD) */
  costPer1MTokens: number;
  /** Recommended timeout in milliseconds */
  timeout: number;
  /** Whether this model is recommended for production use */
  recommended: boolean;
}

/**
 * Whitelist of allowed OpenRouter models
 * Only these models can be used for flashcard generation
 */
export const ALLOWED_MODELS: Record<string, ModelConfig> = {
  "openai/gpt-4o-mini": {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    costPer1MTokens: 0.15,
    timeout: 60000,
    recommended: true,
  },
  "anthropic/claude-3-haiku": {
    id: "anthropic/claude-3-haiku",
    name: "Claude 3 Haiku",
    provider: "Anthropic",
    costPer1MTokens: 0.25,
    timeout: 60000,
    recommended: true,
  },
  "google/gemini-flash-1.5": {
    id: "google/gemini-flash-1.5",
    name: "Gemini Flash 1.5",
    provider: "Google",
    costPer1MTokens: 0.075,
    timeout: 60000,
    recommended: true,
  },
  "anthropic/claude-3-5-sonnet": {
    id: "anthropic/claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    costPer1MTokens: 3.0,
    timeout: 90000,
    recommended: false,
  },
} as const;

/**
 * Default model to use when none is specified
 */
export const DEFAULT_MODEL = "openai/gpt-4o-mini";

/**
 * Rate limiting configuration
 */
export const RATE_LIMITS = {
  /** Maximum generations per user per hour */
  GENERATIONS_PER_HOUR: 10,
  /** Time window for rate limiting in milliseconds (1 hour) */
  TIME_WINDOW_MS: 60 * 60 * 1000,
} as const;

/**
 * Source text constraints
 */
export const SOURCE_TEXT_CONSTRAINTS = {
  /** Minimum source text length in characters */
  MIN_LENGTH: 1000,
  /** Maximum source text length in characters */
  MAX_LENGTH: 10000,
} as const;

/**
 * Flashcard generation constraints
 */
export const GENERATION_CONSTRAINTS = {
  /** Maximum number of flashcards to generate */
  MAX_FLASHCARDS: 20,
  /** Minimum number of flashcards expected */
  MIN_FLASHCARDS: 3,
  /** Maximum front text length */
  MAX_FRONT_LENGTH: 200,
  /** Maximum back text length */
  MAX_BACK_LENGTH: 500,
} as const;

/**
 * OpenRouter API configuration
 */
export const OPENROUTER_CONFIG = {
  /** OpenRouter API base URL */
  API_URL: "https://openrouter.ai/api/v1",
  /** Default request timeout in milliseconds */
  DEFAULT_TIMEOUT: 60000,
  /** Maximum number of retries for failed requests */
  MAX_RETRIES: 3,
} as const;

/**
 * Get model configuration by ID
 * @throws Error if model is not in whitelist
 */
export function getModelConfig(modelId: string): ModelConfig {
  const config = ALLOWED_MODELS[modelId];
  if (!config) {
    throw new Error(`Model '${modelId}' is not supported. Allowed models: ${Object.keys(ALLOWED_MODELS).join(", ")}`);
  }
  return config;
}

/**
 * Check if a model ID is valid
 */
export function isValidModel(modelId: string): boolean {
  return modelId in ALLOWED_MODELS;
}

/**
 * Get all allowed model IDs
 */
export function getAllowedModelIds(): string[] {
  return Object.keys(ALLOWED_MODELS);
}

/**
 * Get recommended models only
 */
export function getRecommendedModels(): ModelConfig[] {
  return Object.values(ALLOWED_MODELS).filter((model) => model.recommended);
}
