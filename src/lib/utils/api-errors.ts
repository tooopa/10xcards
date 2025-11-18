/**
 * API Error Handling Utilities
 *
 * Common error handling and response formatting for API endpoints.
 */

import type { ErrorResponse } from "../../types";
import { z } from "zod";

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown> | null,
  status = 500
): Response {
  const errorResponse: ErrorResponse = {
    error: {
      code,
      message,
      details: details ?? null,
    },
  };

  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Formats Zod validation errors for API response
 */
export function formatValidationError(error: z.ZodError): ErrorResponse {
  return {
    error: {
      code: "validation_error",
      message: "Request validation failed",
      details: {
        errors: error.errors.map((err) => ({
          path: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
      },
    },
  };
}

/**
 * Creates validation error response
 */
export function createValidationErrorResponse(error: z.ZodError): Response {
  return new Response(JSON.stringify(formatValidationError(error)), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Creates success response
 */
export function createSuccessResponse(data: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

/**
 * Creates unauthorized response
 */
export function createUnauthorizedResponse(message?: string): Response {
  return createErrorResponse("unauthorized", message ?? "Authentication required", null, 401);
}

/**
 * Creates not found response
 */
export function createNotFoundResponse(resource: string): Response {
  return createErrorResponse("not_found", `${resource} not found`, null, 404);
}

/**
 * Creates rate limit exceeded response
 */
export function createRateLimitResponse(
  message: string,
  details: Record<string, unknown>,
  retryAfter: number
): Response {
  return new Response(
    JSON.stringify({
      error: {
        code: "rate_limit_exceeded",
        message,
        details,
      },
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": retryAfter.toString(),
      },
    }
  );
}

/**
 * Custom error for duplicate deck name violations
 */
export class DuplicateDeckError extends Error {
  constructor(deckName: string) {
    super(`A deck with the name "${deckName}" already exists`);
    this.name = "DuplicateDeckError";
  }
}

/**
 * Custom error for operations on default deck that are not allowed
 */
export class DefaultDeckError extends Error {
  constructor(operation: string) {
    super(`Cannot ${operation} the default deck`);
    this.name = "DefaultDeckError";
  }
}

/**
 * Custom error for duplicate tag name violations
 */
export class DuplicateTagError extends Error {
  public readonly tagName: string;
  public readonly deckId: string;

  constructor(tagName: string, deckId: string) {
    super(`A tag with the name "${tagName}" already exists in this deck`);
    this.name = "DuplicateTagError";
    this.tagName = tagName;
    this.deckId = deckId;
  }
}

/**
 * Custom error for tag not found
 */
export class TagNotFoundError extends Error {
  constructor(tagId: string) {
    super(`Tag with ID ${tagId} not found`);
    this.name = "TagNotFoundError";
  }
}

/**
 * Custom error for forbidden operations on global tags
 */
export class GlobalTagOperationError extends Error {
  constructor(operation: string) {
    super(`Cannot ${operation} global tags`);
    this.name = "GlobalTagOperationError";
  }
}

/**
 * Checks if error is a Postgres unique constraint violation
 */
export function isUniqueViolation(error: unknown): boolean {
  if (typeof error === "object" && error !== null) {
    const pgError = error as { code?: string };
    return pgError.code === "23505";
  }
  return false;
}

/**
 * Creates a conflict response for duplicate resources
 */
export function createConflictResponse(resource: string, field: string, value: string): Response {
  return createErrorResponse(
    "conflict",
    `A ${resource} with this ${field} already exists`,
    {
      field,
      value,
      constraint: `unique_${resource}_${field}_per_user`,
    },
    409
  );
}

/**
 * Creates a conflict response for duplicate tag in a specific deck
 */
export function createTagConflictResponse(tagName: string, deckId: string): Response {
  return createErrorResponse(
    "conflict",
    "Tag with this name already exists in deck",
    {
      field: "name",
      value: tagName,
      deck_id: deckId,
      constraint: "unique_tag_name_per_deck",
    },
    409
  );
}

/**
 * Creates forbidden response
 */
export function createForbiddenResponse(message: string): Response {
  return createErrorResponse("forbidden", message, null, 403);
}

/**
 * Gets user ID from session
 * TODO: In production, implement proper authentication
 * For MVP, we use a default user ID
 */
export function getUserIdFromLocals(locals: App.Locals): string {
  const session = locals.session;
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}
