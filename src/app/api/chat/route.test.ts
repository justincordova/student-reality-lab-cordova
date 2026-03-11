import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only and dependencies before importing route
vi.mock("@/lib", () => ({
  childLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  logError: vi.fn(),
  checkRateLimit: vi.fn().mockResolvedValue(null),
  withHttpLogging: vi.fn().mockImplementation((_req: unknown, fn: () => unknown) => fn()),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  handleApiError: vi.fn().mockImplementation((err: unknown) => {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }),
}));

vi.mock("@/lib/data/loadSchools", () => ({
  loadSchools: vi.fn().mockReturnValue([]),
}));

vi.mock("@/lib/env", () => ({
  env: { HF_TOKEN: "test-token" },
}));

vi.mock("openai", () => ({
  OpenAI: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: "Hello from AI" } }],
          usage: { total_tokens: 10 },
        }),
      },
    },
  })),
}));

import { NextRequest } from "next/server";
import { POST } from "./route";

function makeRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  const defaultHeaders: Record<string, string> = {
    "content-type": "application/json",
    "content-length": String(JSON.stringify(body).length),
    ...headers,
  };
  return new NextRequest("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify(body),
    headers: defaultHeaders,
  });
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset cached system prompt between tests
  });

  it("returns 415 when content-type is not application/json", async () => {
    const req = makeRequest(
      { messages: [{ role: "user", content: "hi" }] },
      { "content-type": "text/plain" }
    );
    const res = await POST(req);
    expect(res.status).toBe(415);
  });

  it("returns 413 when body is too large", async () => {
    const req = makeRequest(
      { messages: [{ role: "user", content: "hi" }] },
      { "content-length": "99999" }
    );
    const res = await POST(req);
    expect(res.status).toBe(413);
  });

  it("returns 400 for invalid request body schema", async () => {
    const req = makeRequest({ messages: [] }); // min 1 message required
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-JSON body", async () => {
    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: "not json{{{",
      headers: {
        "content-type": "application/json",
        "content-length": "11",
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 for mismatched origin", async () => {
    const req = makeRequest(
      { messages: [{ role: "user", content: "hi" }] },
      {
        origin: "https://evil-site.com",
        host: "myapp.com",
      }
    );
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 200 with reply for valid request", async () => {
    const req = makeRequest({ messages: [{ role: "user", content: "hello" }] });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("reply");
  });

  it("returns 503 when HF_TOKEN is missing", async () => {
    const { env } = await import("@/lib/env");
    const originalToken = env.HF_TOKEN;
    (env as { HF_TOKEN?: string }).HF_TOKEN = undefined;
    const req = makeRequest({ messages: [{ role: "user", content: "hi" }] });
    const res = await POST(req);
    expect(res.status).toBe(503);
    (env as { HF_TOKEN?: string }).HF_TOKEN = originalToken;
  });
});
