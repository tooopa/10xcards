/**
 * Rate Limiting Service
 *
 * Implements rate limiting for AI generation requests to prevent abuse
 * and control costs. Default limit: 10 generations per hour per user.
 */

import type { SupabaseClient } from "../../../db/supabase.client";
import { RATE_LIMITS } from "../../config/ai.config";

/**
 * Rate limit information for a user
 */
export interface RateLimitInfo {
  /** Whether the user is allowed to make another request */
  allowed: boolean;
  /** Number of remaining requests in current window */
  remaining: number;
  /** Timestamp when the rate limit will reset */
  resetAt: Date;
  /** Current count of requests in window */
  currentCount: number;
  /** Maximum allowed requests */
  limit: number;
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitExceededError extends Error {
  constructor(
    message: string,
    public readonly rateLimitInfo: RateLimitInfo
  ) {
    super(message);
    this.name = "RateLimitExceededError";
  }
}

/**
 * Service for checking and enforcing rate limits on generation requests
 */
export class RateLimitService {
  /**
   * Checks if user has exceeded generation rate limit
   *
   * @param supabase - Supabase client instance
   * @param userId - User ID to check rate limit for
   * @returns Rate limit information
   * @throws {RateLimitExceededError} If rate limit is exceeded
   */
  static async checkGenerationLimit(supabase: SupabaseClient, userId: string): Promise<RateLimitInfo> {
    const limit = RATE_LIMITS.GENERATIONS_PER_HOUR;
    const timeWindowMs = RATE_LIMITS.TIME_WINDOW_MS;

    // Calculate the time threshold (1 hour ago)
    const thresholdTime = new Date(Date.now() - timeWindowMs);

    try {
      // Query generations in the last hour
      const { data, error } = await supabase
        .from("generations")
        .select("id, created_at", { count: "exact" })
        .eq("user_id", userId)
        .gte("created_at", thresholdTime.toISOString())
        .order("created_at", { ascending: true });

      if (error) {
        throw new Error(`Failed to check rate limit: ${error.message}`);
      }

      const currentCount = data?.length ?? 0;
      const remaining = Math.max(0, limit - currentCount);
      const allowed = currentCount < limit;

      // Calculate reset time (earliest request + 1 hour)
      let resetAt: Date;
      if (data && data.length > 0 && data[0].created_at) {
        const earliestRequest = new Date(data[0].created_at);
        resetAt = new Date(earliestRequest.getTime() + timeWindowMs);
      } else {
        // If no requests yet, reset is not applicable
        resetAt = new Date(Date.now() + timeWindowMs);
      }

      const rateLimitInfo: RateLimitInfo = {
        allowed,
        remaining,
        resetAt,
        currentCount,
        limit,
      };

      return rateLimitInfo;
    } catch (error) {
      // On database errors, fail open (allow request) rather than blocking user
      console.error("Rate limit check failed:", error);

      return {
        allowed: true,
        remaining: limit,
        resetAt: new Date(Date.now() + timeWindowMs),
        currentCount: 0,
        limit,
      };
    }
  }

  /**
   * Checks rate limit and throws error if exceeded
   *
   * @param supabase - Supabase client instance
   * @param userId - User ID to check
   * @throws {RateLimitExceededError} If rate limit is exceeded
   */
  static async enforceGenerationLimit(supabase: SupabaseClient, userId: string): Promise<void> {
    const rateLimitInfo = await this.checkGenerationLimit(supabase, userId);

    if (!rateLimitInfo.allowed) {
      const minutesUntilReset = Math.ceil((rateLimitInfo.resetAt.getTime() - Date.now()) / (60 * 1000));

      throw new RateLimitExceededError(
        `Rate limit exceeded. Maximum ${rateLimitInfo.limit} generations per hour. Try again in ${minutesUntilReset} minutes.`,
        rateLimitInfo
      );
    }
  }

  /**
   * Formats rate limit info for HTTP response headers
   * Following standard rate limit header conventions
   */
  static getRateLimitHeaders(info: RateLimitInfo): Record<string, string> {
    return {
      "X-RateLimit-Limit": info.limit.toString(),
      "X-RateLimit-Remaining": info.remaining.toString(),
      "X-RateLimit-Reset": Math.floor(info.resetAt.getTime() / 1000).toString(),
    };
  }

  /**
   * Calculates Retry-After header value in seconds
   */
  static getRetryAfterSeconds(resetAt: Date): number {
    return Math.ceil((resetAt.getTime() - Date.now()) / 1000);
  }
}
