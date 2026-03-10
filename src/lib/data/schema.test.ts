import { describe, it, expect } from "vitest";
import { gradeToNumeric, SchoolSchema, NicheGrade, ChatFiltersSchema } from "./schema";

describe("gradeToNumeric", () => {
  it("maps A+ to 13", () => expect(gradeToNumeric("A+")).toBe(13));
  it("maps A to 12", () => expect(gradeToNumeric("A")).toBe(12));
  it("maps A- to 11", () => expect(gradeToNumeric("A-")).toBe(11));
  it("maps B+ to 10", () => expect(gradeToNumeric("B+")).toBe(10));
  it("maps B to 9", () => expect(gradeToNumeric("B")).toBe(9));
  it("maps B- to 8", () => expect(gradeToNumeric("B-")).toBe(8));
  it("maps C+ to 7", () => expect(gradeToNumeric("C+")).toBe(7));
  it("maps C to 6", () => expect(gradeToNumeric("C")).toBe(6));
  it("maps C- to 5", () => expect(gradeToNumeric("C-")).toBe(5));
  it("maps D+ to 4", () => expect(gradeToNumeric("D+")).toBe(4));
  it("maps D to 3", () => expect(gradeToNumeric("D")).toBe(3));
  it("maps D- to 2", () => expect(gradeToNumeric("D-")).toBe(2));
  it("maps F to 1", () => expect(gradeToNumeric("F")).toBe(1));
  it("A+ > A > B+ ordering is maintained", () => {
    expect(gradeToNumeric("A+")).toBeGreaterThan(gradeToNumeric("A"));
    expect(gradeToNumeric("A")).toBeGreaterThan(gradeToNumeric("B+"));
  });
});

describe("NicheGrade", () => {
  it("parses valid grades", () => {
    expect(NicheGrade.parse("A+")).toBe("A+");
    expect(NicheGrade.parse("F")).toBe("F");
  });

  it("rejects invalid grades", () => {
    expect(() => NicheGrade.parse("E")).toThrow();
    expect(() => NicheGrade.parse("")).toThrow();
  });
});

describe("SchoolSchema", () => {
  const validSchool = {
    name: "MIT",
    slug: "mit",
    state: "MA",
    city: "Cambridge",
    region: "Northeast",
    ranking: 1,
    tuitionInState: 57000,
    tuitionOutOfState: 57000,
    roomAndBoard: 17000,
    acceptanceRate: 0.04,
    enrollment: 11000,
    graduationRate: 0.94,
    medianEarnings6yr: 110000,
    medianDebt: 15000,
    website: "https://mit.edu",
    usnewsUrl: "https://usnews.com/mit",
    nicheUrl: "https://niche.com/mit",
    nicheGrades: {
      overall: "A+",
      academics: "A+",
      value: "A",
      diversity: "A",
      campus: "A",
      athletics: "B+",
      partyScene: "B",
      professors: "A+",
      location: "A",
      dorms: "A-",
      campusFood: "B+",
      studentLife: "A-",
      safety: "A",
    },
  };

  it("parses a valid school", () => {
    const result = SchoolSchema.safeParse(validSchool);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("MIT");
      expect(result.data.ranking).toBe(1);
    }
  });

  it("rejects state with wrong length", () => {
    const result = SchoolSchema.safeParse({ ...validSchool, state: "Massachusetts" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid region", () => {
    const result = SchoolSchema.safeParse({ ...validSchool, region: "Moon" });
    expect(result.success).toBe(false);
  });

  it("accepts null for nullable fields", () => {
    const result = SchoolSchema.safeParse({
      ...validSchool,
      medianEarnings6yr: null,
      medianDebt: null,
      usnewsUrl: null,
      nicheUrl: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative tuition", () => {
    const result = SchoolSchema.safeParse({ ...validSchool, tuitionInState: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects acceptanceRate > 1", () => {
    const result = SchoolSchema.safeParse({ ...validSchool, acceptanceRate: 1.5 });
    expect(result.success).toBe(false);
  });
});

describe("ChatFiltersSchema", () => {
  it("parses valid filter object", () => {
    const result = ChatFiltersSchema.safeParse({ sortBy: "ranking", sortDir: "asc" });
    expect(result.success).toBe(true);
  });

  it("parses empty object", () => {
    const result = ChatFiltersSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects invalid sortDir", () => {
    const result = ChatFiltersSchema.safeParse({ sortDir: "sideways" });
    expect(result.success).toBe(false);
  });
});
