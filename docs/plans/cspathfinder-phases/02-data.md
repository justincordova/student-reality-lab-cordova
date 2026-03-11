# Phase 2: Data Layer (Tasks 3, 4, 5, 5.5)

> See [00-overview.md](./00-overview.md) for architecture, tech stack, and shared context.

## Task 3: Define Data Schema

**Files:**

- Create: `src/lib/data/schema.ts`
- Create: `src/tests/data/schema.test.ts`

The schema must capture both College Scorecard financial data AND Niche.com letter grades across 12 categories.

**Step 1: Write the failing test**

Create `src/tests/data/schema.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { SchoolSchema, NicheGrade } from "@/lib/data/schema";

describe("School Schema", () => {
  it("should validate a complete school entry", () => {
    const result = SchoolSchema.safeParse({
      name: "Massachusetts Institute of Technology",
      slug: "mit",
      state: "MA",
      city: "Cambridge",
      region: "Northeast",
      ranking: 1,
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
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid school data", () => {
    const result = SchoolSchema.safeParse({ name: "Test" });
    expect(result.success).toBe(false);
  });

  it("should accept valid Niche grade values", () => {
    const validGrades = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"];
    validGrades.forEach((g) => {
      expect(NicheGrade.safeParse(g).success).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test src/tests/data/schema.test.ts`
Expected: FAIL

**Step 3: Write the schema**

Create `src/lib/data/schema.ts`:

```typescript
import { z } from "zod/v4";

export const NicheGrade = z.enum([
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
]);
export type NicheGradeType = z.infer<typeof NicheGrade>;

export const NicheGradesSchema = z.object({
  overall: NicheGrade,
  academics: NicheGrade,
  value: NicheGrade,
  diversity: NicheGrade,
  campus: NicheGrade,
  athletics: NicheGrade,
  partyScene: NicheGrade,
  professors: NicheGrade,
  location: NicheGrade,
  dorms: NicheGrade,
  campusFood: NicheGrade,
  studentLife: NicheGrade,
  safety: NicheGrade,
});
export type NicheGrades = z.infer<typeof NicheGradesSchema>;

export const SchoolSchema = z.object({
  name: z.string(),
  slug: z.string(),
  state: z.string().length(2),
  city: z.string(),
  region: z.enum([
    "Northeast",
    "Southeast",
    "Midwest",
    "Southwest",
    "West",
    "Mid-Atlantic",
    "Pacific",
  ]),
  ranking: z.number().int().min(1),
  tuitionInState: z.number().nonnegative(),
  tuitionOutOfState: z.number().nonnegative(),
  roomAndBoard: z.number().nonnegative(),
  acceptanceRate: z.number().min(0).max(1),
  enrollment: z.number().int().nonnegative(),
  graduationRate: z.number().min(0).max(1),
  medianEarnings6yr: z.number().nullable(),
  medianDebt: z.number().nullable(),
  website: z.string().url(),
  usnewsUrl: z.string().url().nullable(),
  nicheGrades: NicheGradesSchema,
  nicheUrl: z.string().url().nullable(),
});
export type School = z.infer<typeof SchoolSchema>;

/** Convert a Niche letter grade to a numeric value for sorting (A+=13, F=1) */
export function gradeToNumeric(grade: NicheGradeType): number {
  const map: Record<string, number> = {
    "A+": 13,
    A: 12,
    "A-": 11,
    "B+": 10,
    B: 9,
    "B-": 8,
    "C+": 7,
    C: 6,
    "C-": 5,
    "D+": 4,
    D: 3,
    "D-": 2,
    F: 1,
  };
  return map[grade] ?? 0;
}
```

**Step 4: Run test to verify it passes**

Run: `bun run test src/tests/data/schema.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/data/schema.ts src/tests/data/schema.test.ts
git commit -m "feat: add Zod schema with Niche grade categories"
```

---

## Task 4: Create Seed Data (Top 100 CS Schools)

**Files:**

- Create: `data/schools.json`

This is the most labor-intensive task. We need 100 schools with both College Scorecard financial data and Niche.com letter grades across 12 categories.

**Step 1: Data collection approach**

For each of the top 100 CS-ranked schools:

1. **Financial data** — pull from College Scorecard API: `https://api.data.gov/ed/collegescorecard/v1/schools?api_key=YOUR_KEY&school.name=MIT&fields=school.name,latest.cost.tuition.in_state,latest.cost.tuition.out_of_state,latest.cost.roomboard.oncampus,latest.admissions.admission_rate.overall,latest.student.size,latest.completion.rate_suppressed.overall,latest.earnings.6_yrs_after_entry.median,latest.aid.median_debt.completers.overall`
2. **Niche grades** — manually visit each school's Niche.com page and record the 12 letter grades
3. **Rankings** — use US News CS program rankings

**Step 2: Create the JSON file**

Create `data/schools.json` with all 100 entries. Each entry must match `SchoolSchema`. Here are the first 3 as examples:

```json
[
  {
    "name": "Massachusetts Institute of Technology",
    "slug": "mit",
    "state": "MA",
    "city": "Cambridge",
    "region": "Northeast",
    "ranking": 1,
    "tuitionInState": 57986,
    "tuitionOutOfState": 57986,
    "roomAndBoard": 18590,
    "acceptanceRate": 0.04,
    "enrollment": 11520,
    "graduationRate": 0.94,
    "medianEarnings6yr": 104700,
    "medianDebt": 12000,
    "website": "https://www.mit.edu",
    "usnewsUrl": "https://www.usnews.com/best-colleges/mit-2178",
    "nicheGrades": {
      "overall": "A+",
      "academics": "A+",
      "value": "A+",
      "diversity": "A",
      "campus": "A",
      "athletics": "B+",
      "partyScene": "B",
      "professors": "A+",
      "location": "A+",
      "dorms": "B+",
      "campusFood": "B",
      "studentLife": "A",
      "safety": "A+"
    },
    "nicheUrl": "https://www.niche.com/colleges/massachusetts-institute-of-technology/"
  },
  {
    "name": "Stanford University",
    "slug": "stanford",
    "state": "CA",
    "city": "Stanford",
    "region": "West",
    "ranking": 2,
    "tuitionInState": 56169,
    "tuitionOutOfState": 56169,
    "roomAndBoard": 18619,
    "acceptanceRate": 0.04,
    "enrollment": 17246,
    "graduationRate": 0.95,
    "medianEarnings6yr": 95400,
    "medianDebt": 11800,
    "website": "https://www.stanford.edu",
    "usnewsUrl": "https://www.usnews.com/best-colleges/stanford-1305",
    "nicheGrades": {
      "overall": "A+",
      "academics": "A+",
      "value": "A+",
      "diversity": "A",
      "campus": "A+",
      "athletics": "A+",
      "partyScene": "B+",
      "professors": "A+",
      "location": "A+",
      "dorms": "A-",
      "campusFood": "A-",
      "studentLife": "A+",
      "safety": "A"
    },
    "nicheUrl": "https://www.niche.com/colleges/stanford-university/"
  },
  {
    "name": "Carnegie Mellon University",
    "slug": "carnegie-mellon",
    "state": "PA",
    "city": "Pittsburgh",
    "region": "Northeast",
    "ranking": 3,
    "tuitionInState": 58924,
    "tuitionOutOfState": 58924,
    "roomAndBoard": 16796,
    "acceptanceRate": 0.11,
    "enrollment": 15818,
    "graduationRate": 0.91,
    "medianEarnings6yr": 97200,
    "medianDebt": 18500,
    "website": "https://www.cmu.edu",
    "usnewsUrl": "https://www.usnews.com/best-colleges/carnegie-mellon-3242",
    "nicheGrades": {
      "overall": "A+",
      "academics": "A+",
      "value": "A",
      "diversity": "A",
      "campus": "A-",
      "athletics": "B",
      "partyScene": "B-",
      "professors": "A",
      "location": "A-",
      "dorms": "B+",
      "campusFood": "B+",
      "studentLife": "B+",
      "safety": "A"
    },
    "nicheUrl": "https://www.niche.com/colleges/carnegie-mellon-university/"
  }
]
```

Continue for all 100 schools. The full list should include (in approximate ranking order):
MIT, Stanford, CMU, UC Berkeley, UIUC, Caltech, Georgia Tech, Cornell, UW, Princeton, UT Austin, UCLA, Michigan, Columbia, Harvard, UCSD, UW-Madison, UMD, Purdue, Duke, Rice, Northwestern, UPenn, Yale, Brown, USC, NYU, Virginia Tech, NC State, Ohio State, Penn State, UMass Amherst, Rutgers, NJIT, RPI, Stony Brook, Boston U, Northeastern, U Minnesota, Iowa State, Arizona State, UT Dallas, U Florida, UC Irvine, UC Davis, UC Santa Barbara, UC Santa Cruz, Colorado School of Mines, Clemson, Michigan State, Indiana U, U Pittsburgh, Syracuse, Drexel, Stevens, WPI, RIT, George Mason, U Colorado Boulder, Oregon State, Washington State, Florida State, U Arizona, U Utah, Vanderbilt, Emory, Johns Hopkins, U Virginia, Notre Dame, Tufts, Lehigh, and more to reach 100.

**Step 3: Validate seed data**

Create a quick validation script or test that loads `data/schools.json` and:

1. Runs every entry through `SchoolSchema.parse()` to ensure correctness
2. Verifies all slugs are unique (duplicate slugs would break routing):

```typescript
const slugs = schools.map((s) => s.slug);
const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
if (dupes.length > 0) throw new Error(`Duplicate slugs: ${dupes.join(", ")}`);
```

**Step 4: Commit**

```bash
git add data/schools.json
git commit -m "feat: add seed data for top 100 CS programs with Niche grades"
```

---

## Task 5: Data Loading and Filtering Layer

**Files:**

- Create: `src/lib/data/filters.ts` (pure functions — safe for client AND server)
- Create: `src/lib/data/loadSchools.ts` (server-only — uses `fs`)
- Create: `src/tests/data/loadSchools.test.ts`
- Create: `src/tests/data/filters.test.ts` (tests pure filter functions without Node.js deps)

**IMPORTANT:** Filtering/sorting logic goes in `filters.ts` (no Node.js imports). `loadSchools.ts` only handles file I/O and re-exports from `filters.ts`. Client components import from `filters.ts` directly.

**Step 1: Write the failing test**

Create `src/tests/data/loadSchools.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { loadSchools, filterSchools, type FilterOptions } from "@/lib/data/loadSchools";

describe("loadSchools", () => {
  it("should load and validate all school data", () => {
    const schools = loadSchools();
    expect(schools.length).toBeGreaterThanOrEqual(25);
    expect(schools[0]).toHaveProperty("name");
    expect(schools[0]).toHaveProperty("nicheGrades");
    expect(schools[0].nicheGrades).toHaveProperty("campusFood");
  });
});

describe("filterSchools", () => {
  it("should filter by state", () => {
    const schools = loadSchools();
    const ca = filterSchools(schools, { state: "CA" });
    expect(ca.length).toBeGreaterThan(0);
    expect(ca.every((s) => s.state === "CA")).toBe(true);
  });

  it("should sort by ranking ascending", () => {
    const schools = loadSchools();
    const sorted = filterSchools(schools, { sortBy: "ranking", sortDir: "asc" });
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].ranking).toBeGreaterThanOrEqual(sorted[i - 1].ranking);
    }
  });

  it("should sort by Niche grade (e.g. campusFood) descending", () => {
    const schools = loadSchools();
    const sorted = filterSchools(schools, { sortBy: "campusFood", sortDir: "desc" });
    expect(sorted.length).toBeGreaterThan(0);
    // Verify first school has better food grade than last school
    if (sorted.length >= 2) {
      const firstGrade = sorted[0].nicheGrades.campusFood;
      const lastGrade = sorted[sorted.length - 1].nicheGrades.campusFood;
      expect(firstGrade).not.toBe(lastGrade);
    }
  });

  it("should paginate results", () => {
    const schools = loadSchools();
    const page1 = filterSchools(schools, { page: 1, perPage: 10 });
    const page2 = filterSchools(schools, { page: 2, perPage: 10 });
    expect(page1.length).toBeLessThanOrEqual(10);
    expect(page2.length).toBeLessThanOrEqual(10);
    if (page1.length > 0 && page2.length > 0) {
      expect(page1[0].slug).not.toBe(page2[0].slug);
    }
  });

  it("should search by name", () => {
    const schools = loadSchools();
    const results = filterSchools(schools, { search: "MIT" });
    expect(results.some((s) => s.name.includes("MIT") || s.slug === "mit")).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test src/tests/data/loadSchools.test.ts`
Expected: FAIL

**Step 3: Write implementation — filters.ts (client-safe)**

Create `src/lib/data/filters.ts` — this file has NO Node.js imports and is safe for client components:

```typescript
import { type School, type NicheGradeType, gradeToNumeric } from "@/lib/data/schema";

/** Sortable fields — includes both numeric school fields and Niche grade categories */
export type SortField =
  | "ranking"
  | "tuitionInState"
  | "tuitionOutOfState"
  | "acceptanceRate"
  | "graduationRate"
  | "medianEarnings6yr"
  | "medianDebt"
  | "enrollment"
  | "roi"
  // Niche grade categories
  | "overall"
  | "academics"
  | "value"
  | "diversity"
  | "campus"
  | "athletics"
  | "partyScene"
  | "professors"
  | "location"
  | "dorms"
  | "campusFood"
  | "studentLife"
  | "safety";

export interface FilterOptions {
  state?: string;
  region?: string;
  search?: string;
  sortBy?: SortField;
  sortDir?: "asc" | "desc";
  page?: number;
  perPage?: number;
  paginate?: boolean;
}

export interface FilterResult {
  schools: School[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

const NICHE_GRADE_FIELDS = new Set([
  "overall",
  "academics",
  "value",
  "diversity",
  "campus",
  "athletics",
  "partyScene",
  "professors",
  "location",
  "dorms",
  "campusFood",
  "studentLife",
  "safety",
]);

function calculateROI(school: School): number {
  if (!school.medianEarnings6yr) return 0;
  const totalCost = (school.tuitionInState + school.roomAndBoard) * 4;
  if (totalCost === 0) return 0;
  // 6-year ROI: (6-year earnings - 4-year cost) / 4-year cost
  return ((school.medianEarnings6yr * 6 - totalCost) / totalCost) * 100;
}

function getSortValue(school: School, field: SortField): number {
  if (field === "roi") return calculateROI(school);
  if (NICHE_GRADE_FIELDS.has(field)) {
    const grade = school.nicheGrades[field as keyof typeof school.nicheGrades] as NicheGradeType;
    return gradeToNumeric(grade);
  }
  const val = school[field as keyof School];
  return typeof val === "number" ? val : 0;
}

export function filterSchools(
  schools: School[],
  opts: FilterOptions & { paginate: true }
): FilterResult;
export function filterSchools(schools: School[], opts: FilterOptions): School[];
export function filterSchools(schools: School[], opts: FilterOptions): School[] | FilterResult {
  let result = [...schools];

  // Filter by state
  if (opts.state) {
    const states = opts.state.split(",").map((s) => s.trim().toUpperCase());
    result = result.filter((s) => states.includes(s.state.toUpperCase()));
  }

  // Filter by region
  if (opts.region) {
    result = result.filter((s) => s.region.toLowerCase() === opts.region!.toLowerCase());
  }

  // Search by name/city/state
  if (opts.search) {
    const q = opts.search.toLowerCase();
    result = result.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.state.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q)
    );
  }

  // Sort
  if (opts.sortBy) {
    const dir = opts.sortDir === "desc" ? -1 : 1;
    result.sort((a, b) => {
      const av = getSortValue(a, opts.sortBy!);
      const bv = getSortValue(b, opts.sortBy!);
      return (av - bv) * dir;
    });
  }

  // Pagination
  const totalCount = result.length;
  const perPage = opts.perPage ?? 10;
  const page = opts.page ?? 1;
  const totalPages = Math.ceil(totalCount / perPage);
  const paginated = result.slice((page - 1) * perPage, page * perPage);

  if (opts.paginate) {
    return { schools: paginated, totalCount, totalPages, currentPage: page };
  }

  // When no explicit pagination requested but page/perPage are set, still paginate
  if (opts.page || opts.perPage) {
    return paginated;
  }

  return result;
}
```

**Step 3b: Write implementation — loadSchools.ts (server-only)**

Create `src/lib/data/loadSchools.ts` — this file uses Node.js `fs` and is server-only:

```typescript
import fs from "fs";
import path from "path";
import { SchoolSchema, type School } from "@/lib/data/schema";

let cached: School[] | null = null;

export function loadSchools(): School[] {
  if (cached) return cached;

  const jsonPath = path.join(process.cwd(), "data", "schools.json");
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  cached = data.map((item: unknown) => SchoolSchema.parse(item));
  return cached;
}

export function getSchoolBySlug(slug: string): School | undefined {
  return loadSchools().find((s) => s.slug === slug);
}

// Re-export everything from filters.ts for convenience in server components
export * from "./filters";
```

**Step 4: Run test to verify it passes**

Run: `bun run test src/tests/data/loadSchools.test.ts`
Expected: PASS

**Step 4b: Write client-safe filters test**

Create `src/tests/data/filters.test.ts` — this tests the pure functions without needing `fs`:

```typescript
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
    ranking: 1,
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
    ranking: 2,
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

  it("should sort by Niche grade descending", () => {
    const result = filterSchools(mockSchools, { sortBy: "partyScene", sortDir: "desc" });
    expect(result[0].slug).toBe("other"); // A > C
  });

  it("should return FilterResult when paginate is true", () => {
    const result = filterSchools(mockSchools, { paginate: true, perPage: 1 }) as FilterResult;
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
```

Run: `bun run test src/tests/data/filters.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/data/filters.ts src/lib/data/loadSchools.ts src/tests/data/loadSchools.test.ts src/tests/data/filters.test.ts
git commit -m "feat: implement school data loading with filters, sorting, and pagination"
```

---

## Task 5.5: Create Loading Skeleton Component

**Files:**

- Create: `src/components/LoadingSkeleton.tsx`

**Step 1: Create skeleton loader**

Create `src/components/LoadingSkeleton.tsx`:

```typescript
import { cn } from '@/utils/cn';

interface LoadingSkeletonProps {
  className?: string;
}

export default function LoadingSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-surface0 rounded',
        className
      )}
      aria-hidden="true"
    />
  );
}

export function SchoolCardSkeleton() {
  return (
    <div className="p-5 bg-mantle rounded-lg border border-surface0 space-y-3">
      <div className="flex items-start gap-4">
        <LoadingSkeleton className="w-12 h-12 rounded-lg shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <LoadingSkeleton className="w-8 h-4 rounded" />
            <LoadingSkeleton className="w-48 h-5 rounded" />
          </div>
          <LoadingSkeleton className="w-32 h-4 rounded" />
          <div className="flex gap-2 mt-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <LoadingSkeleton key={i} className="w-12 h-6 rounded" />
            ))}
          </div>
        </div>
        <div className="text-right space-y-2 shrink-0">
          <LoadingSkeleton className="w-24 h-4 rounded" />
          <LoadingSkeleton className="w-24 h-4 rounded" />
          <LoadingSkeleton className="w-20 h-4 rounded" />
        </div>
      </div>
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="bg-surface0 px-3 py-2 rounded-lg">
      <div className="space-y-2">
        <LoadingSkeleton className="w-64 h-4 rounded" />
        <LoadingSkeleton className="w-48 h-4 rounded" />
        <LoadingSkeleton className="w-56 h-4 rounded" />
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/LoadingSkeleton.tsx
git commit -m "feat: add LoadingSkeleton component with school card and chat variants"
```

---
