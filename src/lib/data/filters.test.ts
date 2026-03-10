import { describe, it, expect } from "vitest";
import { filterSchools } from "./filters";
import type { School } from "./schema";

function makeSchool(overrides: Partial<School> = {}): School {
  return {
    name: "Test University",
    slug: "test-university",
    state: "CA",
    city: "San Francisco",
    region: "West",
    ranking: 1,
    tuitionInState: 10000,
    tuitionOutOfState: 30000,
    roomAndBoard: 12000,
    acceptanceRate: 0.5,
    enrollment: 5000,
    graduationRate: 0.9,
    medianEarnings6yr: 80000,
    medianDebt: 20000,
    website: "https://test.edu",
    usnewsUrl: null,
    nicheUrl: null,
    nicheGrades: {
      overall: "A",
      academics: "A+",
      value: "B",
      diversity: "B+",
      campus: "A-",
      athletics: "B",
      partyScene: "C",
      professors: "A",
      location: "A-",
      dorms: "B+",
      campusFood: "B",
      studentLife: "B-",
      safety: "A",
    },
    ...overrides,
  };
}

const schoolA = makeSchool({
  name: "Alpha U",
  slug: "alpha-u",
  state: "CA",
  ranking: 1,
  tuitionInState: 5000,
  region: "West",
});
const schoolB = makeSchool({
  name: "Beta U",
  slug: "beta-u",
  state: "NY",
  ranking: 2,
  tuitionInState: 15000,
  region: "Northeast",
});
const schoolC = makeSchool({
  name: "Gamma U",
  slug: "gamma-u",
  state: "CA",
  ranking: 3,
  tuitionInState: 10000,
  region: "West",
});

const schools = [schoolA, schoolB, schoolC];

describe("filterSchools", () => {
  it("returns all schools with no options", () => {
    const result = filterSchools(schools, {});
    expect(result).toHaveLength(3);
  });

  it("filters by state", () => {
    const result = filterSchools(schools, { state: "CA" });
    expect(result).toHaveLength(2);
    expect((result as School[]).every((s) => s.state === "CA")).toBe(true);
  });

  it("filters by multiple states (comma-separated)", () => {
    const result = filterSchools(schools, { state: "CA,NY" });
    expect(result).toHaveLength(3);
  });

  it("filters by region (case-insensitive)", () => {
    const result = filterSchools(schools, { region: "northeast" });
    expect(result).toHaveLength(1);
    expect((result as School[])[0].name).toBe("Beta U");
  });

  it("filters by search on name", () => {
    const result = filterSchools(schools, { search: "alpha" });
    expect(result).toHaveLength(1);
    expect((result as School[])[0].slug).toBe("alpha-u");
  });

  it("sorts ascending by tuitionInState", () => {
    const result = filterSchools(schools, { sortBy: "tuitionInState", sortDir: "asc" }) as School[];
    expect(result[0].tuitionInState).toBe(5000);
    expect(result[2].tuitionInState).toBe(15000);
  });

  it("sorts descending by tuitionInState", () => {
    const result = filterSchools(schools, {
      sortBy: "tuitionInState",
      sortDir: "desc",
    }) as School[];
    expect(result[0].tuitionInState).toBe(15000);
  });

  it("sorts by niche grade field", () => {
    const result = filterSchools(schools, { sortBy: "academics", sortDir: "desc" }) as School[];
    // All same nicheGrades in default school, just check it doesn't crash
    expect(result).toHaveLength(3);
  });

  it("paginates when paginate: true", () => {
    const result = filterSchools(schools, { paginate: true, perPage: 2, page: 1 });
    expect(result).toHaveProperty("schools");
    expect(result).toHaveProperty("totalCount", 3);
    expect(result).toHaveProperty("totalPages", 2);
    expect(result).toHaveProperty("currentPage", 1);
    expect((result as { schools: School[] }).schools).toHaveLength(2);
  });

  it("paginates second page correctly", () => {
    const result = filterSchools(schools, { paginate: true, perPage: 2, page: 2 });
    expect((result as { schools: School[] }).schools).toHaveLength(1);
  });

  it("returns paginated slice when page/perPage provided without paginate flag", () => {
    const result = filterSchools(schools, { page: 1, perPage: 2 }) as School[];
    expect(result).toHaveLength(2);
  });
});
