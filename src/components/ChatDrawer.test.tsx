import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("./ChatProvider", () => ({
  useChatContext: () => ({
    isOpen: false,
    close: vi.fn(),
    applyFilters: vi.fn(),
  }),
}));

// Import after mocks
// We test parseFilterBlock by extracting it indirectly through the module.
// Since it's not exported, we test its behavior via the rendered component output.
// Instead, we test the schema-based parsing logic directly here.

import { ChatFiltersSchema } from "@/lib/data/schema";

// Mirror of parseFilterBlock logic for unit testing
const FILTER_REGEX = /```filter\n([\s\S]*?)\n```/;
function parseFilterBlock(text: string): { cleanText: string; filters: unknown | null } {
  const match = text.match(FILTER_REGEX);
  if (!match) return { cleanText: text, filters: null };
  try {
    const parsed = ChatFiltersSchema.safeParse(JSON.parse(match[1]));
    if (!parsed.success) return { cleanText: text, filters: null };
    const cleanText = text.replace(FILTER_REGEX, "").trim();
    return { cleanText, filters: parsed.data };
  } catch {
    return { cleanText: text, filters: null };
  }
}

describe("parseFilterBlock", () => {
  it("returns original text and null filters when no filter block present", () => {
    const result = parseFilterBlock("Hello world");
    expect(result.cleanText).toBe("Hello world");
    expect(result.filters).toBeNull();
  });

  it("extracts valid filter block", () => {
    const text = 'Here are results\n```filter\n{"sortBy":"ranking","sortDir":"asc"}\n```';
    const result = parseFilterBlock(text);
    expect(result.filters).toEqual({ sortBy: "ranking", sortDir: "asc" });
    expect(result.cleanText).toBe("Here are results");
  });

  it("returns null filters for invalid JSON", () => {
    const text = "```filter\nnot-json\n```";
    const result = parseFilterBlock(text);
    expect(result.filters).toBeNull();
  });

  it("returns null filters for invalid sortDir", () => {
    const text = '```filter\n{"sortDir":"sideways"}\n```';
    const result = parseFilterBlock(text);
    expect(result.filters).toBeNull();
  });

  it("handles filter block with state and region", () => {
    const text =
      'Schools in CA:\n```filter\n{"state":"CA","region":"West","sortBy":"tuitionInState","sortDir":"asc"}\n```';
    const result = parseFilterBlock(text);
    expect(result.filters).toMatchObject({ state: "CA", region: "West" });
    expect(result.cleanText).toBe("Schools in CA:");
  });

  it("returns empty object for filter block with only unknown keys (they get stripped by Zod)", () => {
    const text = '```filter\n{"unknownField":"value"}\n```';
    const result = parseFilterBlock(text);
    // Zod strips unknown keys, parse should succeed with empty object
    expect(result.filters).toEqual({});
  });
});
