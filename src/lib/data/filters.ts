import { type School } from "@/lib/data/schema";

export type SortField =
  | "csRanking"
  | "nicheRanking"
  | "tuitionInState"
  | "tuitionOutOfState"
  | "acceptanceRate"
  | "graduationRate"
  | "medianEarnings6yr"
  | "medianDebt"
  | "enrollment"
  | "roi"
  | "earnings";

export interface FilterOptions {
  state?: string;
  region?: string;
  search?: string;
  sortBy?: SortField;
  sortDir?: "asc" | "desc";
  page?: number;
  perPage?: number;
  paginate?: boolean;
  rankField?: "csRanking" | "nicheRanking";
}

export interface FilterResult {
  schools: School[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

// Returns payback period in years (lower = better). Negated so desc sort = best ROI first.
function calculateROI(school: School): number {
  if (!school.medianEarnings6yr) return 0;
  const totalCost = (school.tuitionInState + school.roomAndBoard) * 4;
  if (totalCost === 0 || school.medianEarnings6yr === 0) return 0;
  return -(totalCost / school.medianEarnings6yr);
}

function getSortValue(school: School, field: SortField): number {
  if (field === "roi") return calculateROI(school);
  if (field === "csRanking") return school.csRanking ?? 999;
  if (field === "nicheRanking") return school.nicheRanking ?? 999;
  if (field === "earnings") return school.medianEarnings6yr ?? 0;
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
      if (av !== bv) return (av - bv) * dir;
      // Tiebreaker: lower rank = better (nulls last), then alphabetical
      const rf = opts.rankField ?? "csRanking";
      const ar = a[rf],
        br = b[rf];
      if (ar !== br) {
        if (ar === null) return 1;
        if (br === null) return -1;
        return ar - br;
      }
      return a.name.localeCompare(b.name);
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
