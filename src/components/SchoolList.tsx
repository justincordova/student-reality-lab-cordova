"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { School } from "@/lib/data/schema";
import { useDebounce } from "@/hooks/useDebounce";
import GradeBadge from "./GradeBadge";
import Pagination from "./Pagination";
import SchoolLogo from "./SchoolLogo";
import { useChatContext } from "./ChatProvider";

const ROIChart = dynamic(() => import("./ROIChart"), { ssr: false });

// Import filtering logic from client-safe filters.ts (NOT loadSchools.ts which uses Node.js fs)
import { filterSchools, type SortField, type FilterResult } from "@/lib/data/filters";

interface SchoolListProps {
  schools: School[];
}

interface SortOption {
  key: SortField;
  label: string;
  defaultDir: "asc" | "desc";
}

const SORT_OPTIONS: SortOption[] = [
  { key: "academics", label: "Academics", defaultDir: "desc" },
  { key: "professors", label: "Professors", defaultDir: "desc" },
  { key: "value", label: "Value", defaultDir: "desc" },
  { key: "roi", label: "ROI", defaultDir: "desc" },
  { key: "medianEarnings6yr", label: "Earnings", defaultDir: "desc" },
  { key: "tuitionInState", label: "Tuition", defaultDir: "asc" },
  { key: "acceptanceRate", label: "Acceptance", defaultDir: "desc" },
  { key: "safety", label: "Safety", defaultDir: "desc" },
  { key: "campusFood", label: "Food", defaultDir: "desc" },
  { key: "dorms", label: "Dorms", defaultDir: "desc" },
  { key: "studentLife", label: "Social", defaultDir: "desc" },
  { key: "partyScene", label: "Party", defaultDir: "desc" },
  { key: "athletics", label: "Athletics", defaultDir: "desc" },
  { key: "diversity", label: "Diversity", defaultDir: "desc" },
];

const PER_PAGE = 10;

export default function SchoolList({ schools }: SchoolListProps) {
  const searchParams = useSearchParams();

  // Initialize state from URL search params (enables shareable/bookmarkable URLs)
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [stateFilter, setStateFilter] = useState(searchParams.get("state") ?? "");
  const [regionFilter, setRegionFilter] = useState(searchParams.get("region") ?? "");
  const [sortBy, setSortBy] = useState<SortField>(
    (searchParams.get("sort") as SortField) ?? "academics"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">(() => {
    if (searchParams.get("dir")) return searchParams.get("dir") as "asc" | "desc";
    const defaultSort = (searchParams.get("sort") as SortField) ?? "academics";
    return SORT_OPTIONS.find((o) => o.key === defaultSort)?.defaultDir ?? "desc";
  });
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [isFiltering, setIsFiltering] = useState(false);
  const [showChart, setShowChart] = useState(false);

  const { pendingFilters, clearPendingFilters } = useChatContext();
  const [previousFilters, setPreviousFilters] = useState<{
    search: string;
    stateFilter: string;
    regionFilter: string;
    sortBy: SortField;
    sortDir: "asc" | "desc";
    page: number;
  } | null>(null);

  useEffect(() => {
    if (!pendingFilters) return;
    setPreviousFilters({ search, stateFilter, regionFilter, sortBy, sortDir, page });
    if (pendingFilters.sortBy) setSortBy(pendingFilters.sortBy as SortField);
    if (pendingFilters.sortDir) setSortDir(pendingFilters.sortDir);
    if (pendingFilters.state !== undefined) setStateFilter(pendingFilters.state);
    if (pendingFilters.region !== undefined) setRegionFilter(pendingFilters.region);
    if (pendingFilters.search !== undefined) setSearch(pendingFilters.search);
    setPage(1);
    clearPendingFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFilters, clearPendingFilters]);

  const undoChatFilters = useCallback(() => {
    if (!previousFilters) return;
    setSearch(previousFilters.search);
    setStateFilter(previousFilters.stateFilter);
    setRegionFilter(previousFilters.regionFilter);
    setSortBy(previousFilters.sortBy);
    setSortDir(previousFilters.sortDir);
    setPage(previousFilters.page);
    setPreviousFilters(null);
  }, [previousFilters]);

  const states = useMemo(() => {
    const stateSet = new Set(schools.map((school) => school.state));
    return Array.from(stateSet).sort();
  }, [schools]);

  const regions = useMemo(() => {
    const regionSet = new Set(schools.map((school) => school.region));
    return Array.from(regionSet).sort();
  }, [schools]);

  const debouncedSearch = useDebounce(search, 300);

  // Sync state to URL search params (shareable URLs)
  // Uses window.history.replaceState to avoid React router re-renders
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (stateFilter) params.set("state", stateFilter);
    if (regionFilter) params.set("region", regionFilter);
    if (sortBy !== "academics") params.set("sort", sortBy);
    if (sortDir !== "asc") params.set("dir", sortDir);
    if (page > 1) params.set("page", String(page));

    const paramString = params.toString();
    const newUrl = paramString ? `/?${paramString}` : "/";
    window.history.replaceState(null, "", newUrl);
  }, [debouncedSearch, stateFilter, regionFilter, sortBy, sortDir, page]);

  const result = useMemo(
    () =>
      filterSchools(schools, {
        search: debouncedSearch || undefined,
        state: stateFilter || undefined,
        region: regionFilter || undefined,
        sortBy,
        sortDir,
        page,
        perPage: PER_PAGE,
        paginate: true,
      }) as FilterResult,
    [schools, debouncedSearch, stateFilter, regionFilter, sortBy, sortDir, page]
  );

  const paginated = result.schools;
  const totalPages = result.totalPages;
  const hasActiveFilters = !!(search || stateFilter || regionFilter);

  // Show filtering state when debounced search is different from current search
  useEffect(() => {
    setIsFiltering(debouncedSearch !== search);
  }, [debouncedSearch, search]);

  // Reset to page 1 when filters change
  const updateFilter = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
    setter(value);
    setPage(1);
  };

  const clearAllFilters = useCallback(() => {
    setSearch("");
    setStateFilter("");
    setRegionFilter("");
    setSortBy("academics");
    setSortDir("asc");
    setPage(1);
  }, []);

  const toggleSort = useCallback(
    (key: SortField) => {
      if (sortBy === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        const option = SORT_OPTIONS.find((o) => o.key === key);
        setSortBy(key);
        setSortDir(option?.defaultDir ?? "desc");
      }
      setPage(1);
    },
    [sortBy]
  );

  return (
    <div className="space-y-6">
      {/* Search + dropdowns */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search schools..."
          value={search}
          onChange={(e) => updateFilter(setSearch, e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 bg-mantle border border-surface0 rounded-lg text-text placeholder:text-overlay0 focus:outline-none focus:ring-2 focus:ring-blue"
          aria-label="Search schools"
        />
        <select
          value={stateFilter}
          onChange={(e) => updateFilter(setStateFilter, e.target.value)}
          className="px-4 py-2 bg-mantle border border-surface0 rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-blue"
          aria-label="Filter by state"
        >
          <option value="">All States</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={regionFilter}
          onChange={(e) => updateFilter(setRegionFilter, e.target.value)}
          className="px-4 py-2 bg-mantle border border-surface0 rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-blue"
          aria-label="Filter by region"
        >
          <option value="">All Regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* Sort pills */}
      <div className="flex items-start gap-2 flex-wrap text-sm">
        <span className="text-subtext0 font-medium py-0.5 shrink-0">Sort:</span>
        <div className="flex flex-wrap gap-1.5">
          {SORT_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => toggleSort(key)}
              className={`px-2.5 py-0.5 rounded-full transition-colors text-xs ${
                sortBy === key
                  ? "bg-blue text-base font-bold"
                  : "bg-surface0 text-text hover:bg-surface1"
              }`}
              aria-label={`Sort by ${label}${sortBy === key ? `, currently ${sortDir === "asc" ? "ascending" : "descending"}, click to reverse` : ""}`}
            >
              {label}
              {sortBy === key && (sortDir === "asc" ? " ↑" : " ↓")}
            </button>
          ))}
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="ml-auto text-sm text-subtext0 hover:text-red transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Results count */}
      <p className="text-sm text-subtext0" aria-live="polite" aria-atomic="true">
        {isFiltering ? "Filtering..." : `${result.totalCount} schools`}
      </p>

      {/* AI filter undo banner */}
      {previousFilters && (
        <div className="flex items-center gap-3 px-4 py-2 bg-blue/10 border border-blue/20 rounded-lg text-sm">
          <span className="text-text">AI updated your filters.</span>
          <button onClick={undoChatFilters} className="text-blue font-medium hover:underline">
            Undo
          </button>
        </div>
      )}

      {/* Chart toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowChart((v) => !v)}
          className="text-sm px-3 py-1.5 rounded-lg bg-surface0 text-text hover:bg-surface1 transition-colors"
        >
          {showChart ? "Hide Chart" : "Show ROI Chart"}
        </button>
      </div>
      {showChart && (
        <div className="bg-mantle rounded-lg border border-surface0 p-4">
          <h2 className="text-sm font-bold text-subtext0 mb-4">
            Tuition vs Median Earnings (current page)
          </h2>
          <ROIChart schools={paginated} />
        </div>
      )}

      {/* School list or empty state */}
      {paginated.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xl font-bold text-text mb-2">No schools found</p>
          <p className="text-subtext0 mb-4">
            {hasActiveFilters
              ? "Try adjusting your filters or search terms."
              : "No schools match the current criteria."}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="px-4 py-2 bg-blue text-on-primary rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        /* School cards */
        <div className="space-y-3">
          {paginated.map((school, i) => (
            <Link
              key={school.slug}
              href={`/school/${school.slug}`}
              className="block p-5 bg-mantle rounded-lg border border-surface0 hover:border-blue transition-colors"
            >
              <div className="flex items-start gap-4">
                <SchoolLogo website={school.website} name={school.name} size={48} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-blue font-mono text-sm font-bold">
                      #{(page - 1) * PER_PAGE + i + 1}
                    </span>
                    <span className="font-semibold text-lg truncate">{school.name}</span>
                  </div>
                  <p className="text-subtext0 text-sm">
                    {school.city}, {school.state} · {school.region}
                  </p>
                  {/* Mobile: compact stats inline */}
                  <div className="sm:hidden flex gap-3 text-xs text-subtext0 mt-1">
                    <span>${school.tuitionInState.toLocaleString()}</span>
                    <span className="text-green">
                      {school.medianEarnings6yr
                        ? `$${school.medianEarnings6yr.toLocaleString()}`
                        : "—"}
                    </span>
                    <span>{(school.acceptanceRate * 100).toFixed(0)}% accept</span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-3">
                    <GradeBadge grade={school.nicheGrades.overall} label="Overall" />
                    <GradeBadge grade={school.nicheGrades.academics} label="Academics" />
                    <GradeBadge grade={school.nicheGrades.campusFood} label="Food" />
                    <GradeBadge grade={school.nicheGrades.partyScene} label="Party" />
                    <GradeBadge grade={school.nicheGrades.studentLife} label="Social" />
                    <GradeBadge grade={school.nicheGrades.safety} label="Safety" />
                  </div>
                </div>
                {/* Desktop: stacked right-aligned stats */}
                <div className="hidden sm:block text-right text-sm space-y-1 shrink-0">
                  <div>
                    <span className="text-subtext0">In-state: </span>
                    <span className="font-medium">${school.tuitionInState.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-subtext0">Earnings: </span>
                    <span className="font-medium text-green">
                      {school.medianEarnings6yr
                        ? `$${school.medianEarnings6yr.toLocaleString()}`
                        : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-subtext0">Accept: </span>
                    <span className="font-medium">{(school.acceptanceRate * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {paginated.length > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={(p) => {
            setPage(p);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}
    </div>
  );
}
