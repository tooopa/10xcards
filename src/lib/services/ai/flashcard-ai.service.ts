/**
 * Flashcard AI Service
 *
 * High-level service for AI-powered flashcard generation using OpenRouter.
 * Handles prompt construction, API calls, response validation, and error handling.
 */

import { OpenRouterService } from "../../openrouter.service";
import { OpenRouterError } from "../../openrouter.types";
import type { GenerationSuggestionDto } from "../../../types";
import { validateAISuggestions } from "../../validation/generations";
import {
  FLASHCARD_SYSTEM_PROMPT,
  buildFlashcardPrompt,
  FLASHCARD_RESPONSE_SCHEMA,
} from "../../prompts/flashcard-generation";
import { getModelConfig, OPENROUTER_CONFIG } from "../../config/ai.config";

/**
 * Custom error for timeout scenarios
 */
export class OpenRouterTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenRouterTimeoutError";
  }
}

/**
 * Custom error for invalid AI responses
 */
export class InvalidAIResponseError extends Error {
  constructor(
    message: string,
    public readonly response?: unknown
  ) {
    super(message);
    this.name = "InvalidAIResponseError";
  }
}

/**
 * Custom error wrapper for OpenRouter API errors
 */
export class OpenRouterAPIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "OpenRouterAPIError";
  }
}

/**
 * Configuration for FlashcardAIService
 */
export interface FlashcardAIServiceConfig {
  apiKey: string;
  apiUrl?: string;
  defaultTimeout?: number;
}

/**
 * Service for generating flashcards using AI models via OpenRouter
 */
export class FlashcardAIService {
  private readonly openRouter: OpenRouterService;
  private readonly defaultTimeout: number;

  constructor(config: FlashcardAIServiceConfig) {
    if (!config.apiKey) {
      throw new Error("OpenRouter API key is required");
    }

    this.defaultTimeout = config.defaultTimeout || OPENROUTER_CONFIG.DEFAULT_TIMEOUT;

    this.openRouter = new OpenRouterService({
      apiKey: config.apiKey,
      apiUrl: config.apiUrl || OPENROUTER_CONFIG.API_URL,
      timeout: this.defaultTimeout,
      maxRetries: OPENROUTER_CONFIG.MAX_RETRIES,
    });
  }

  /**
   * Generates flashcard suggestions from source text using specified AI model
   *
   * @param sourceText - The text to generate flashcards from (1000-10000 chars)
   * @param model - OpenRouter model ID (must be in whitelist)
   * @returns Array of flashcard suggestions with front and back text
   * @throws {OpenRouterTimeoutError} If request times out
   * @throws {OpenRouterAPIError} If API request fails
   * @throws {InvalidAIResponseError} If AI response format is invalid
   */
  async generateFlashcards(sourceText: string, model: string): Promise<GenerationSuggestionDto[]> {
    try {
      // Get model configuration and validate
      const modelConfig = getModelConfig(model);

      // Configure the OpenRouter service
      this.openRouter.setModel(model, {
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });

      // Set system message
      this.openRouter.setSystemMessage(FLASHCARD_SYSTEM_PROMPT);

      // Build and set user message with source text
      const userPrompt = buildFlashcardPrompt(sourceText);
      this.openRouter.setUserMessage(userPrompt);

      // Set response format for structured output
      this.openRouter.setResponseFormat(FLASHCARD_RESPONSE_SCHEMA);

      // Execute the API call with timeout handling
      const startTime = Date.now();
      let response: string;

      try {
        response = await this.openRouter.sendChatMessage();
      } catch (error) {
        const duration = Date.now() - startTime;

        // Handle timeout
        if (duration >= modelConfig.timeout) {
          throw new OpenRouterTimeoutError(
            `Generation took too long (${Math.round(duration / 1000)}s). Please try with shorter text.`
          );
        }

        // Handle OpenRouter-specific errors
        if (error instanceof OpenRouterError) {
          throw new OpenRouterAPIError(error.message, error.code, error.status);
        }

        // Re-throw unexpected errors
        throw error;
      }

      // Validate and parse AI response
      try {
        const suggestions = validateAISuggestions(response);

        if (suggestions.length === 0) {
          throw new InvalidAIResponseError("AI returned no flashcards", response);
        }

        return suggestions;
      } catch (error) {
        if (error instanceof Error && error.message.includes("not valid JSON")) {
          throw new InvalidAIResponseError("AI response is not valid JSON", response);
        }

        if (error instanceof Error && error.message.includes("Invalid AI response format")) {
          throw new InvalidAIResponseError(error.message, response);
        }

        throw error;
      }
    } catch (error) {
      // Ensure all errors are properly typed
      if (
        error instanceof OpenRouterTimeoutError ||
        error instanceof OpenRouterAPIError ||
        error instanceof InvalidAIResponseError
      ) {
        throw error;
      }

      // Wrap unexpected errors
      if (error instanceof Error) {
        throw new OpenRouterAPIError(`Unexpected error during generation: ${error.message}`, "UNEXPECTED_ERROR");
      }

      throw new OpenRouterAPIError("An unknown error occurred during generation", "UNKNOWN_ERROR");
    }
  }

  /**
   * Maps OpenRouter error to user-friendly message
   */
  static getErrorMessage(error: Error): string {
    if (error instanceof OpenRouterTimeoutError) {
      return "Generation took too long. Please try with shorter text.";
    }

    if (error instanceof InvalidAIResponseError) {
      return "Failed to generate valid flashcards. Please try again.";
    }

    if (error instanceof OpenRouterAPIError) {
      // Map specific API error codes
      switch (error.code) {
        case "insufficient_credits":
          return "AI service is temporarily unavailable due to quota limits.";
        case "invalid_request_error":
          return "Invalid request parameters. Please try again.";
        case "rate_limit_error":
          return "AI service is experiencing high demand. Please try again in a moment.";
        case "api_error":
          return "AI service error. Please try again later.";
        default:
          return "Failed to generate flashcards. Please try again.";
      }
    }

    return "An unexpected error occurred. Please try again.";
  }

  /**
   * Determines appropriate HTTP status code for error
   */
  static getErrorStatusCode(error: Error): number {
    if (error instanceof OpenRouterTimeoutError) {
      return 503; // Service Unavailable
    }

    if (error instanceof InvalidAIResponseError) {
      return 502; // Bad Gateway
    }

    if (error instanceof OpenRouterAPIError) {
      // Map OpenRouter status codes
      if (error.status === 400) return 400;
      if (error.status === 401) return 500; // Don't expose auth errors
      if (error.status === 429) return 503;
      if (error.status && error.status >= 500) return 503;

      return 502; // Bad Gateway for API errors
    }

    return 500; // Internal Server Error
  }
}
