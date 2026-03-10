import { type School, type NicheGradeType, gradeToNumeric } from "@/lib/data/schema";

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
  return ((school.medianEarnings6yr - totalCost) / totalCost) * 100;
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

  if (opts.state) {
    const states = opts.state.split(",").map((s) => s.trim().toUpperCase());
    result = result.filter((s) => states.includes(s.state.toUpperCase()));
  }

  if (opts.region) {
    result = result.filter((s) => s.region.toLowerCase() === opts.region!.toLowerCase());
  }

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

  if (opts.sortBy) {
    const dir = opts.sortDir === "desc" ? -1 : 1;
    result.sort((a, b) => {
      const av = getSortValue(a, opts.sortBy!);
      const bv = getSortValue(b, opts.sortBy!);
      return (av - bv) * dir;
    });
  }

  const totalCount = result.length;
  const perPage = opts.perPage ?? 10;
  const page = opts.page ?? 1;
  const totalPages = Math.ceil(totalCount / perPage);
  const paginated = result.slice((page - 1) * perPage, page * perPage);

  if (opts.paginate) {
    return { schools: paginated, totalCount, totalPages, currentPage: page };
  }

  if (opts.page || opts.perPage) {
    return paginated;
  }

  return result;
}
