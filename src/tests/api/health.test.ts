import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/api-wrapper", () => ({
  withHttpLogging: vi.fn((_req, handler) => handler()),
}));

import { GET } from "@/app/api/health/route";

function createMockRequest(): NextRequest {
  return new Request("http://localhost:3000/api/health", {
    method: "GET",
  }) as unknown as NextRequest;
}

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with status ok", async () => {
    const response = await GET(createMockRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
  });

  it("returns a valid ISO timestamp", async () => {
    const response = await GET(createMockRequest());
    const body = await response.json();

    const parsed = new Date(body.timestamp);
    expect(parsed.toISOString()).toBe(body.timestamp);
  });
});
