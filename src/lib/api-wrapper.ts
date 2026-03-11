import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { logHttp, logError } from "@/lib/logger";

export async function withHttpLogging(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const start = Date.now();
  const method = request.method;
  const url = request.url;

  try {
    const result = await handler();
    logHttp(method, url, result.status, Date.now() - start);
    return result;
  } catch (error) {
    let status = 500;
    if (error && typeof error === "object") {
      if ("statusCode" in error) {
        status = (error as { statusCode?: number }).statusCode ?? 500;
      } else if ("status" in error) {
        status = (error as { status?: number }).status ?? 500;
      }
    }
    logHttp(method, url, status, Date.now() - start);
    logError(`API request failed: ${method} ${url}`, error, { status });
    throw error;
  }
}
