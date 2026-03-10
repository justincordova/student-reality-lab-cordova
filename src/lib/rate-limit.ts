import "server-only";
import { RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";
import { NextRequest, NextResponse } from "next/server";

// In-memory store — suitable for single-process deployments (Docker, traditional servers).
// For multi-instance deployments (Vercel, clustered Node), swap RateLimiterMemory
// for RateLimiterRedis and provide a shared Redis connection.
const limiters = new Map<string, RateLimiterMemory>();

interface RateLimitOptions {
  /** Unique key for this limiter (e.g. "api/health") */
  id: string;
  /** Max requests per window */
  limit?: number;
  /** Window duration in seconds */
  windowSecs?: number;
}

/** Returns or creates a rate limiter instance by ID. Limiters are cached for reuse. */
export function getRateLimiter({ id, limit = 60, windowSecs = 60 }: RateLimitOptions) {
  if (!limiters.has(id)) {
    limiters.set(id, new RateLimiterMemory({ points: limit, duration: windowSecs }));
  }
  return limiters.get(id)!;
}

/**
 * Extracts the client IP from the request.
 * Checks X-Forwarded-For (reverse proxy), X-Real-IP (Nginx), then falls back to 127.0.0.1.
 * Note: X-Forwarded-For is spoofable in non-proxied environments. Configure your
 * reverse proxy to set a trusted header and update this function accordingly.
 */
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

/**
 * Returns a 429 response if the caller exceeds the rate limit, otherwise null.
 * Key is the client IP address extracted from request headers.
 */
export async function checkRateLimit(
  request: NextRequest,
  options: RateLimitOptions
): Promise<NextResponse | null> {
  const limiter = getRateLimiter(options);
  const limit = options.limit ?? 60;
  const ip = getClientIp(request);

  try {
    await limiter.consume(ip);
    return null;
  } catch (error) {
    if (!(error instanceof RateLimiterRes)) throw error;
    const res = error;
    const retryAfter = Math.ceil(res.msBeforeNext / 1000);
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }
}
