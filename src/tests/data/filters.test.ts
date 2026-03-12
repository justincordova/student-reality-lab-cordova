import { describe, it, expect } from "vitest";
import { filterSchools, calculatePaybackYears, type FilterResult } from "@/lib/data/filters";
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

  it("should sort by ROI descending (best ROI = shortest payback first)", () => {
    // test-u: (50000+15000)*4 / 100000 = 2.6 years payback
    // other:  (30000+12000)*4 / 80000  = 2.1 years payback  ← better ROI
    // ROI is stored as -(payback years); desc sort puts least-negative (best) first
    const result = filterSchools(mockSchools, { sortBy: "roi", sortDir: "desc" });
    expect(result[0].slug).toBe("other");
    expect(result[1].slug).toBe("test-u");
  });

  it("should sort school with no earnings last when sorting by ROI", () => {
    const noEarnings: School = {
      ...mockSchools[0],
      slug: "no-earnings",
      name: "No Earnings U",
      medianEarnings6yr: null,
    };
    const result = filterSchools([...mockSchools, noEarnings], { sortBy: "roi", sortDir: "asc" });
    expect(result[result.length - 1].slug).toBe("no-earnings");
  });

  it("should not truncate schools when sorting large arrays", () => {
    const manySchools: School[] = Array.from({ length: 100 }, (_, i) => ({
      ...mockSchools[0],
      slug: `school-${i}`,
      name: `School ${i}`,
      csRanking: 100 - i,
    }));
    const result = filterSchools(manySchools, { sortBy: "csRanking", sortDir: "asc" });
    expect(result).toHaveLength(100);
    expect(result[0].csRanking).toBe(1);
  });

  it("should use rankField for secondary sort", () => {
    const tied: School[] = [
      {
        ...mockSchools[0],
        slug: "tied-a",
        name: "Tied A",
        tuitionInState: 40000,
        csRanking: 5,
        nicheRanking: 2,
      },
      {
        ...mockSchools[0],
        slug: "tied-b",
        name: "Tied B",
        tuitionInState: 40000,
        csRanking: 3,
        nicheRanking: 8,
      },
    ];
    const result = filterSchools(tied, {
      sortBy: "tuitionInState",
      sortDir: "asc",
      rankField: "csRanking",
    });
    // Primary values tie; secondary sort by csRanking ascending → tied-b (#3) before tied-a (#5)
    expect(result[0].slug).toBe("tied-b");
    expect(result[1].slug).toBe("tied-a");
  });
});

it("should match schools by alias", () => {
  const schools: School[] = [
    {
      ...mockSchools[0],
      slug: "new-jersey-institute-of-technology",
      name: "New Jersey Institute of Technology",
      city: "Newark",
      state: "NJ",
    },
    {
      ...mockSchools[1],
      slug: "massachusetts-institute-of-technology",
      name: "Massachusetts Institute of Technology",
      city: "Cambridge",
      state: "MA",
    },
  ];
  // "njit" alias matches new-jersey-institute-of-technology
  expect(filterSchools(schools, { search: "njit" })[0].slug).toBe(
    "new-jersey-institute-of-technology"
  );
  // "mit" alias matches massachusetts-institute-of-technology
  expect(filterSchools(schools, { search: "mit" })[0].slug).toBe(
    "massachusetts-institute-of-technology"
  );
  // "cmu" not in this set → no results
  expect(filterSchools(schools, { search: "cmu" })).toHaveLength(0);
});

describe("calculatePaybackYears", () => {
  it("should calculate payback years correctly", () => {
    const result = calculatePaybackYears(mockSchools[0]);
    // (50000 + 15000) * 4 / 100000 = 2.6
    expect(result).toBeCloseTo(2.6);
  });

  it("should return null when earnings are missing", () => {
    const school = { ...mockSchools[0], medianEarnings6yr: null };
    expect(calculatePaybackYears(school)).toBeNull();
  });

  it("should return null when earnings are zero", () => {
    const school = { ...mockSchools[0], medianEarnings6yr: 0 };
    expect(calculatePaybackYears(school)).toBeNull();
  });

  it("should return null when earnings are negative", () => {
    const school = { ...mockSchools[0], medianEarnings6yr: -1 };
    expect(calculatePaybackYears(school)).toBeNull();
  });

  it("should return a finite number for valid data", () => {
    const result = calculatePaybackYears(mockSchools[0]);
    expect(result).not.toBeNull();
    expect(isFinite(result!)).toBe(true);
  });
});

describe("filterSchools edge cases", () => {
  it("should throw when schools argument is not an array", () => {
    expect(() => filterSchools(null as unknown as School[], {})).toThrow(
      "schools must be an array"
    );
  });

  it("should filter by region case-insensitively", () => {
    const result = filterSchools(mockSchools, { region: "west" });
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("test-u");
  });

  it("should filter by multiple states (comma-separated)", () => {
    const result = filterSchools(mockSchools, { state: "CA,NY" });
    expect(result).toHaveLength(2);
  });

  it("should return empty array when no schools match search", () => {
    const result = filterSchools(mockSchools, { search: "xyznonexistent" });
    expect(result).toHaveLength(0);
  });

  it("should sort by niche grade field (safety) descending by default", () => {
    // test-u has safety A+ (13), other has safety A (12)
    const result = filterSchools(mockSchools, { sortBy: "safety", sortDir: "desc" });
    expect(result[0].slug).toBe("test-u");
    expect(result[1].slug).toBe("other");
  });

  it("should sort by tuition ascending correctly", () => {
    const result = filterSchools(mockSchools, { sortBy: "tuitionInState", sortDir: "asc" });
    // other (30000) < test-u (50000)
    expect(result[0].slug).toBe("other");
    expect(result[1].slug).toBe("test-u");
  });

  it("page clamping: page beyond totalPages returns last page", () => {
    const result = filterSchools(mockSchools, {
      paginate: true,
      page: 999,
      perPage: 1,
    }) as FilterResult;
    expect(result.currentPage).toBe(result.totalPages);
    expect(result.schools).toHaveLength(1);
  });
});
