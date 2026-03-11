import "server-only";
import { RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";
import { NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";

// In-memory store — suitable for single-process deployments (Docker, traditional servers).
// For multi-instance deployments (Vercel, clustered Node), swap RateLimiterMemory
// for RateLimiterRedis and provide a shared Redis connection.
const limiters = new Map<string, RateLimiterMemory>();
const MAX_LIMITERS = 100;

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
    if (limiters.size >= MAX_LIMITERS) {
      const firstKey = limiters.keys().next().value;
      if (firstKey) limiters.delete(firstKey);
    }
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
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const ips = xForwardedFor.split(",").map((ip) => ip.trim());
    if (ips.length > 0 && ips[0]) {
      const ip = ips[0];
      if (isValidIp(ip) && !isPrivateIp(ip) && ip !== "::1") {
        return ip;
      }
    }
  }
  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp && isValidIp(xRealIp) && !isPrivateIp(xRealIp) && xRealIp !== "::1") {
    return xRealIp;
  }
  return "127.0.0.1";
}

function isValidIp(ip: string): boolean {
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex =
    /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){0,6}::(?:[0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

function isPrivateIp(ip: string): boolean {
  const privateIpRanges = [
    /^10\./,
    /^172\.(1[6-9]|2\d|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^169\.254\./,
    /^fc00:/i,
    /^fe80:/i,
    /^::1$/,
  ];
  return privateIpRanges.some((range) => range.test(ip));
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
    logger.warn(`Rate limit exceeded for ${ip} on ${options.id}`, {
      limit,
      retryAfter,
      remainingPoints: res.remainingPoints,
    });
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
