"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { School } from "@/lib/data/schema";
import { useDebounce } from "@/hooks/useDebounce";
import GradeBadge from "./GradeBadge";
import Pagination from "./Pagination";
import SchoolLogo from "./SchoolLogo";
import { useChatContext } from "./ChatProvider";
import HeartButton from "./HeartButton";
import CompareButton from "./CompareButton";

const ROIChart = dynamic(() => import("./ROIChart"), { ssr: false });

// Import filtering logic from client-safe filters.ts (NOT loadSchools.ts which uses Node.js fs)
import { filterSchools, type SortField, type FilterResult } from "@/lib/data/filters";

interface SchoolListProps {
  csrankingsSchools: School[];
  nicheSchools: School[];
}

interface SortOption {
  value: SortField;
  label: string;
  defaultDir: "asc" | "desc";
}

type RankSource = "csrankings" | "niche";

function getSortOptions(rankSource: RankSource): SortOption[] {
  const rankField: SortField = rankSource === "niche" ? "nicheRanking" : "csRanking";
  return [
    { value: rankField, label: "Overall", defaultDir: "asc" },
    { value: "roi", label: "ROI", defaultDir: "asc" },
    { value: "earnings", label: "Earnings", defaultDir: "desc" },
    { value: "tuitionInState", label: "Tuition", defaultDir: "asc" },
    { value: "acceptanceRate", label: "Acceptance", defaultDir: "asc" },
  ];
}

const PER_PAGE = 10;

export default function SchoolList({ csrankingsSchools, nicheSchools }: SchoolListProps) {
  const searchParams = useSearchParams();

  // Initialize state from URL search params (enables shareable/bookmarkable URLs)
  const [rankSource, setRankSource] = useState<RankSource>(() => {
    const param = searchParams.get("rank");
    return param === "csrankings" ? "csrankings" : "niche";
  });
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [stateFilter, setStateFilter] = useState(searchParams.get("state") ?? "");
  const [regionFilter, setRegionFilter] = useState(searchParams.get("region") ?? "");
  const [sortBy, setSortBy] = useState<SortField>(() => {
    const param = searchParams.get("sort");
    const src = searchParams.get("rank") === "csrankings" ? "csrankings" : "niche";
    const defaultField: SortField = src === "niche" ? "nicheRanking" : "csRanking";
    if (!param || param === "ranking") return defaultField;
    const allOptions = getSortOptions(src);
    const match = allOptions.find((o) => o.value === param);
    return match ? match.value : defaultField;
  });
  const [sortDir, setSortDir] = useState<"asc" | "desc">(() => {
    const dir = searchParams.get("dir");
    if (dir === "asc" || dir === "desc") return dir;
    const src = searchParams.get("rank") === "csrankings" ? "csrankings" : "niche";
    const paramSort = searchParams.get("sort");
    const allOptions = getSortOptions(src);
    const matchedOption = allOptions.find((o) => o.value === paramSort);
    return matchedOption?.defaultDir ?? "asc";
  });
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [isFiltering, setIsFiltering] = useState(false);
  const [showChart, setShowChart] = useState(false);

  const activeRankField: "csRanking" | "nicheRanking" =
    rankSource === "niche" ? "nicheRanking" : "csRanking";
  const sortOptions = useMemo(() => getSortOptions(rankSource), [rankSource]);

  const { pendingFilters, clearPendingFilters } = useChatContext();
  const [previousFilters, setPreviousFilters] = useState<{
    search: string;
    stateFilter: string;
    regionFilter: string;
    sortBy: SortField;
    sortDir: "asc" | "desc";
    page: number;
  } | null>(null);

  const currentFiltersRef = useRef({ search, stateFilter, regionFilter, sortBy, sortDir, page });
  useEffect(() => {
    currentFiltersRef.current = { search, stateFilter, regionFilter, sortBy, sortDir, page };
  }, [search, stateFilter, regionFilter, sortBy, sortDir, page]);

  const handleRankSourceChange = useCallback(
    (source: RankSource) => {
      const oldField = rankSource === "niche" ? "nicheRanking" : "csRanking";
      const newField = source === "niche" ? "nicheRanking" : "csRanking";
      setRankSource(source);
      if (sortBy === oldField) setSortBy(newField);
      setPage(1);
    },
    [rankSource, sortBy]
  );

  useEffect(() => {
    if (!pendingFilters) return;
    setPreviousFilters({ ...currentFiltersRef.current });
    if (pendingFilters.rankSource) handleRankSourceChange(pendingFilters.rankSource);
    if (pendingFilters.sortBy) setSortBy(pendingFilters.sortBy as SortField);
    if (pendingFilters.sortDir) setSortDir(pendingFilters.sortDir);
    if (pendingFilters.state !== undefined) setStateFilter(pendingFilters.state);
    if (pendingFilters.region !== undefined) setRegionFilter(pendingFilters.region);
    if (pendingFilters.search !== undefined) setSearch(pendingFilters.search);
    setPage(1);
    clearPendingFilters();
  }, [pendingFilters, clearPendingFilters, handleRankSourceChange]);

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

  const schools = (rankSource === "niche" ? nicheSchools : csrankingsSchools).filter(
    (school) => school.state
  );

  const states = useMemo(() => {
    const stateSet = new Set(
      schools.map((school) => school.state).filter((s): s is string => s != null)
    );
    return Array.from(stateSet).sort();
  }, [schools]);

  const regions = useMemo(() => {
    const regionSet = new Set(
      schools.map((school) => school.region).filter((r): r is Exclude<typeof r, null> => r != null)
    );
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
    params.set("rank", rankSource);
    if (sortBy !== activeRankField) params.set("sort", sortBy);
    if (sortDir !== "asc") params.set("dir", sortDir);
    if (page > 1) params.set("page", String(page));

    const paramString = params.toString();
    const newUrl = paramString ? `/?${paramString}` : "/";
    window.history.replaceState(null, "", newUrl);
  }, [
    debouncedSearch,
    stateFilter,
    regionFilter,
    rankSource,
    activeRankField,
    sortBy,
    sortDir,
    page,
  ]);

  const result = useMemo(
    () =>
      filterSchools(schools, {
        search: debouncedSearch || undefined,
        state: stateFilter || undefined,
        region: regionFilter || undefined,
        sortBy,
        sortDir,
        rankField: activeRankField,
        page,
        perPage: PER_PAGE,
        paginate: true,
      }) as FilterResult,
    [schools, debouncedSearch, stateFilter, regionFilter, sortBy, sortDir, activeRankField, page]
  );

  const allFiltered = useMemo(
    () =>
      filterSchools(schools, {
        search: debouncedSearch || undefined,
        state: stateFilter || undefined,
        region: regionFilter || undefined,
        sortBy,
        sortDir,
        rankField: activeRankField,
      }),
    [schools, debouncedSearch, stateFilter, regionFilter, sortBy, sortDir, activeRankField]
  );

  const paginated = result.schools;
  const totalPages = result.totalPages;
  const defaultSortField: SortField = rankSource === "niche" ? "nicheRanking" : "csRanking";
  const hasActiveFilters = !!(
    search ||
    stateFilter ||
    regionFilter ||
    rankSource !== "niche" ||
    sortBy !== defaultSortField
  );

  // Show filtering state when debounced search is different from current search
  useEffect(() => {
    setIsFiltering(debouncedSearch !== search);
  }, [debouncedSearch, search]);

  // Reset to page 1 when filters change
  const updateFilter = useCallback(
    <T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
      setter(value);
      setPage(1);
    },
    []
  );

  const clearAllFilters = useCallback(() => {
    setSearch("");
    setStateFilter("");
    setRegionFilter("");
    setRankSource("niche");
    setSortBy("nicheRanking");
    setSortDir("asc");
    setPage(1);
  }, []);

  const toggleSort = useCallback(
    (key: SortField) => {
      if (sortBy === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        const option = sortOptions.find((o) => o.value === key);
        setSortBy(key);
        setSortDir(option?.defaultDir ?? "desc");
      }
      setPage(1);
    },
    [sortBy, sortOptions]
  );

  return (
    <div className="space-y-4">
      {/* Search + dropdowns */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search schools..."
            value={search}
            onChange={(e) => updateFilter(setSearch, e.target.value.slice(0, 100))}
            maxLength={100}
            className="w-full px-4 py-2 bg-mantle border border-surface0 rounded-lg text-text placeholder:text-overlay0 focus:outline-none focus:ring-2 focus:ring-primary pr-8"
            aria-label="Search schools"
          />
          {search && (
            <button
              onClick={() => updateFilter(setSearch, "" as string)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-overlay0 hover:text-text transition-colors"
              aria-label="Clear search"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
        <div className="relative">
          <select
            value={stateFilter}
            onChange={(e) => updateFilter(setStateFilter, e.target.value as string)}
            className="appearance-none px-4 py-2 pr-8 bg-mantle border border-surface0 rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Filter by state"
          >
            <option value="">All States</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4 text-subtext0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
        <div className="relative">
          <select
            value={regionFilter}
            onChange={(e) => updateFilter(setRegionFilter, e.target.value as string)}
            className="appearance-none px-4 py-2 pr-8 bg-mantle border border-surface0 rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Filter by region"
          >
            <option value="">All Regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4 text-subtext0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      {/* Ranking source toggle */}
      <div className="flex items-center gap-1 text-sm">
        <span className="text-subtext0 font-medium mr-1">Ranking:</span>
        <span
          className="text-subtext0 cursor-help mr-1"
          title="Niche ranks based on student reviews; CSRankings ranks based on faculty research publications"
          aria-label="Ranking source info"
        >
          ⓘ
        </span>
        <div className="inline-flex rounded-lg border border-surface0 overflow-hidden">
          <button
            key="niche"
            onClick={() => handleRankSourceChange("niche")}
            title="Niche: student reviews covering academics, campus life, food, safety, and more"
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              rankSource === "niche"
                ? "bg-primary text-on-primary"
                : "bg-mantle text-subtext0 hover:bg-surface0"
            }`}
            aria-label="Use Niche rankings"
          >
            Niche
          </button>
          <button
            key="csrankings"
            onClick={() => handleRankSourceChange("csrankings")}
            title="CSRankings: based on faculty research publications — best for evaluating CS research strength"
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              rankSource === "csrankings"
                ? "bg-primary text-on-primary"
                : "bg-mantle text-subtext0 hover:bg-surface0"
            }`}
            aria-label="Use CSRankings rankings"
          >
            CSRankings
          </button>
        </div>
      </div>

      {/* Sort pills */}
      <div className="flex items-start gap-2 flex-wrap text-sm">
        <span className="text-subtext0 font-medium py-0.5 shrink-0">Sort:</span>
        <div className="flex flex-wrap gap-1.5">
          {sortOptions.map(({ value: key, label }) => (
            <button
              key={key}
              onClick={() => toggleSort(key)}
              className={`px-2.5 py-0.5 rounded-full transition-colors text-xs ${
                sortBy === key
                  ? "bg-primary text-on-primary font-bold"
                  : "bg-surface0 text-text hover:bg-surface1"
              }`}
              aria-label={`Sort by ${label}${sortBy === key ? `, currently ${sortDir === "asc" ? "ascending" : "descending"}, click to reverse` : ""}`}
            >
              {label}
              {sortBy === key && (sortDir === "asc" ? " ↑" : " ↓")}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-subtext0" aria-live="assertive" aria-atomic="true">
        {isFiltering ? "Filtering..." : `${result.totalCount} schools`}
      </p>

      {/* AI filter undo banner */}
      {previousFilters && (
        <div className="flex items-center gap-3 px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg text-sm">
          <span className="text-text">AI updated your filters.</span>
          <button onClick={undoChatFilters} className="text-primary font-medium hover:underline">
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
            Tuition vs Median Earnings (top 15 matching schools)
          </h2>
          <ROIChart schools={allFiltered} />
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
              className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        /* School cards */
        <div className="space-y-3">
          {paginated.map((school) => (
            <Link
              key={school.slug}
              href={`/school/${school.slug}`}
              className="block p-5 bg-mantle rounded-lg border border-surface0 hover:border-primary hover:shadow-[0_0_0_1px_var(--ctp-primary)] transition-all duration-150"
            >
              <div className="flex items-start gap-4">
                <SchoolLogo website={school.website} name={school.name} size={48} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-primary font-mono text-sm font-bold">
                      {school[activeRankField] ? `#${school[activeRankField]}` : "—"}
                    </span>
                    <span className="font-semibold text-lg truncate">{school.name}</span>
                  </div>
                  <p className="text-subtext0 text-sm">
                    {school.city}, {school.state} · {school.region}
                  </p>
                  {/* Mobile: heart + compare */}
                  <div className="sm:hidden flex items-center gap-2 mt-1">
                    <HeartButton slug={school.slug} size="sm" />
                    <CompareButton slug={school.slug} name={school.name} />
                  </div>
                  {/* Mobile: compact stats inline */}
                  <div className="sm:hidden flex gap-3 text-xs text-subtext0 mt-1">
                    <span>
                      Tuition:{" "}
                      {school.tuitionInState > 0
                        ? `$${school.tuitionInState.toLocaleString()}`
                        : "—"}
                    </span>
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
                  <div className="flex justify-end gap-2 mb-1">
                    <CompareButton slug={school.slug} name={school.name} />
                    <HeartButton slug={school.slug} size="sm" />
                  </div>
                  <div>
                    <span className="text-subtext0">In-state: </span>
                    <span className="font-medium">
                      {school.tuitionInState > 0
                        ? `$${school.tuitionInState.toLocaleString()}`
                        : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-subtext0">Out-of-state: </span>
                    <span className="font-medium">
                      {school.tuitionOutOfState > 0
                        ? `$${school.tuitionOutOfState.toLocaleString()}`
                        : "—"}
                    </span>
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
      {result.totalCount > 0 && (
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
