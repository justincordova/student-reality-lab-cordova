import { NextResponse } from "next/server";
import { logError } from "@/lib/logger";

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const isProduction = process.env.NODE_ENV === "production";

export function createErrorResponse(status: number, message: string) {
  const errorMessage =
    isProduction && status >= 500 ? "An error occurred. Please try again." : message;
  return NextResponse.json({ error: errorMessage }, { status });
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return createErrorResponse(error.statusCode, error.message);
  }
  logError("Unhandled API error", error);
  return createErrorResponse(500, "Internal server error");
}
