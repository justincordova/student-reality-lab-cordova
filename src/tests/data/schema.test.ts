import { describe, it, expect } from "vitest";
import { SchoolSchema, NicheGrade, gradeToNumeric, ChatFiltersSchema } from "@/lib/data/schema";

const validSchool = {
  name: "Massachusetts Institute of Technology",
  slug: "mit",
  state: "MA",
  city: "Cambridge",
  region: "Northeast",
  csRanking: 1,
  nicheRanking: 1,
  tuitionInState: 57986,
  tuitionOutOfState: 57986,
  roomAndBoard: 18590,
  acceptanceRate: 0.04,
  enrollment: 11520,
  graduationRate: 0.94,
  medianEarnings6yr: 104700,
  medianDebt: 12000,
  website: "https://www.mit.edu",
  usnewsUrl: "https://www.usnews.com/best-colleges/mit-2178",
  nicheGrades: {
    overall: "A+",
    academics: "A+",
    value: "A+",
    diversity: "A",
    campus: "A",
    athletics: "B+",
    partyScene: "B",
    professors: "A+",
    location: "A+",
    dorms: "B+",
    campusFood: "B",
    studentLife: "A",
    safety: "A+",
  },
  nicheUrl: "https://www.niche.com/colleges/massachusetts-institute-of-technology/",
};

describe("School Schema", () => {
  it("should validate a complete school entry", () => {
    const result = SchoolSchema.safeParse(validSchool);
    expect(result.success).toBe(true);
  });

  it("should reject school with missing required fields", () => {
    const result = SchoolSchema.safeParse({ name: "Test" });
    expect(result.success).toBe(false);
  });

  it("should reject out-of-range acceptance rate", () => {
    const result = SchoolSchema.safeParse({ ...validSchool, acceptanceRate: 1.5 });
    expect(result.success).toBe(false);
  });

  it("should reject negative acceptance rate", () => {
    const result = SchoolSchema.safeParse({ ...validSchool, acceptanceRate: -0.1 });
    expect(result.success).toBe(false);
  });

  it("should reject invalid state code (too long)", () => {
    const result = SchoolSchema.safeParse({ ...validSchool, state: "CAL" });
    expect(result.success).toBe(false);
  });

  it("should reject invalid region", () => {
    const result = SchoolSchema.safeParse({ ...validSchool, region: "InvalidRegion" });
    expect(result.success).toBe(false);
  });

  it("should reject negative tuition", () => {
    const result = SchoolSchema.safeParse({ ...validSchool, tuitionInState: -1 });
    expect(result.success).toBe(false);
  });

  it("should accept valid Niche grade values", () => {
    const validGrades = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"];
    validGrades.forEach((g) => {
      expect(NicheGrade.safeParse(g).success).toBe(true);
    });
  });

  it("should reject invalid Niche grade", () => {
    expect(NicheGrade.safeParse("Z+").success).toBe(false);
    expect(NicheGrade.safeParse("").success).toBe(false);
    expect(NicheGrade.safeParse("AA").success).toBe(false);
  });

  it("should reject school with invalid Niche grade in nicheGrades", () => {
    const result = SchoolSchema.safeParse({
      ...validSchool,
      nicheGrades: { ...validSchool.nicheGrades, overall: "Z+" },
    });
    expect(result.success).toBe(false);
  });

  it("should accept null for nullable fields", () => {
    const result = SchoolSchema.safeParse({
      ...validSchool,
      medianEarnings6yr: null,
      medianDebt: null,
      usnewsUrl: null,
      nicheUrl: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("gradeToNumeric", () => {
  it("maps A+ to 13 and F to 1", () => {
    expect(gradeToNumeric("A+")).toBe(13);
    expect(gradeToNumeric("F")).toBe(1);
  });

  it("maintains A+ > A > B+ ordering", () => {
    expect(gradeToNumeric("A+")).toBeGreaterThan(gradeToNumeric("A"));
    expect(gradeToNumeric("A")).toBeGreaterThan(gradeToNumeric("B+"));
  });

  it("maps every grade to a unique positive integer", () => {
    const grades = [
      "A+",
      "A",
      "A-",
      "B+",
      "B",
      "B-",
      "C+",
      "C",
      "C-",
      "D+",
      "D",
      "D-",
      "F",
    ] as const;
    const values = grades.map((g) => gradeToNumeric(g));
    const unique = new Set(values);
    expect(unique.size).toBe(grades.length);
    values.forEach((v) => expect(v).toBeGreaterThan(0));
  });

  it("produces a strictly descending sequence A+ > A > A- > ... > F", () => {
    const grades = [
      "A+",
      "A",
      "A-",
      "B+",
      "B",
      "B-",
      "C+",
      "C",
      "C-",
      "D+",
      "D",
      "D-",
      "F",
    ] as const;
    const values = grades.map((g) => gradeToNumeric(g));
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeLessThan(values[i - 1]);
    }
  });
});

describe("ChatFiltersSchema", () => {
  it("parses valid filter object", () => {
    const result = ChatFiltersSchema.safeParse({ sortBy: "csRanking", sortDir: "asc" });
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

  it("accepts compare array up to 3 entries", () => {
    const result = ChatFiltersSchema.safeParse({
      compare: [
        { slug: "mit", name: "MIT" },
        { slug: "stanford-university", name: "Stanford University" },
        { slug: "cmu", name: "Carnegie Mellon University" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects compare array with more than 3 entries", () => {
    const result = ChatFiltersSchema.safeParse({
      compare: [
        { slug: "mit", name: "MIT" },
        { slug: "stanford-university", name: "Stanford" },
        { slug: "cmu", name: "CMU" },
        { slug: "caltech", name: "Caltech" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid sortBy values", () => {
    const sortByValues = [
      "csRanking",
      "nicheRanking",
      "roi",
      "earnings",
      "tuitionInState",
      "acceptanceRate",
      "campusFood",
      "dorms",
      "safety",
      "partyScene",
      "diversity",
      "studentLife",
      "professors",
      "athletics",
      "value",
      "location",
      "academics",
    ];
    for (const sortBy of sortByValues) {
      const result = ChatFiltersSchema.safeParse({ sortBy });
      expect(result.success).toBe(true);
    }
  });

  it("rejects search string longer than 100 characters", () => {
    const result = ChatFiltersSchema.safeParse({ search: "x".repeat(101) });
    expect(result.success).toBe(false);
  });
});
