import { describe, it, expect } from "vitest";
import { filterSchools, type FilterResult } from "@/lib/data/filters";
import type { School } from "@/lib/data/schema";

const mockSchools: School[] = [
  {
    name: "Test University",
    slug: "test-u",
    state: "CA",
    city: "LA",
    region: "West",
    csRanking: 1,
    nicheRanking: 2,
    tuitionInState: 50000,
    tuitionOutOfState: 50000,
    roomAndBoard: 15000,
    acceptanceRate: 0.1,
    enrollment: 10000,
    graduationRate: 0.9,
    medianEarnings6yr: 100000,
    medianDebt: 10000,
    website: "https://test.edu",
    usnewsUrl: null,
    nicheUrl: null,
    nicheGrades: {
      overall: "A+",
      academics: "A+",
      value: "A",
      diversity: "A",
      campus: "A",
      athletics: "B",
      partyScene: "C",
      professors: "A+",
      location: "A",
      dorms: "B+",
      campusFood: "A-",
      studentLife: "A",
      safety: "A+",
    },
  },
  {
    name: "Other College",
    slug: "other",
    state: "NY",
    city: "NYC",
    region: "Northeast",
    csRanking: 2,
    nicheRanking: 1,
    tuitionInState: 30000,
    tuitionOutOfState: 40000,
    roomAndBoard: 12000,
    acceptanceRate: 0.3,
    enrollment: 5000,
    graduationRate: 0.85,
    medianEarnings6yr: 80000,
    medianDebt: 15000,
    website: "https://other.edu",
    usnewsUrl: null,
    nicheUrl: null,
    nicheGrades: {
      overall: "A",
      academics: "A",
      value: "A+",
      diversity: "B+",
      campus: "B",
      athletics: "A",
      partyScene: "A",
      professors: "A",
      location: "A+",
      dorms: "A",
      campusFood: "B",
      studentLife: "A+",
      safety: "A",
    },
  },
];

describe("filterSchools (pure)", () => {
  it("should filter by state", () => {
    const result = filterSchools(mockSchools, { state: "CA" });
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("test-u");
  });

  it("should sort by csRanking ascending", () => {
    const result = filterSchools(mockSchools, { sortBy: "csRanking", sortDir: "asc" });
    expect(result[0].slug).toBe("test-u");
  });

  it("should return FilterResult when paginate is true", () => {
    const result = filterSchools(mockSchools, {
      paginate: true,
      perPage: 1,
    }) as FilterResult;
    expect(result.totalCount).toBe(2);
    expect(result.totalPages).toBe(2);
    expect(result.schools).toHaveLength(1);
  });

  it("should search across name and city", () => {
    const result = filterSchools(mockSchools, { search: "NYC" });
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("other");
  });
});
