# Phase 3: Home Page (Task 6)

> See [00-overview.md](./00-overview.md) for architecture, tech stack, and shared context.

## Task 6: Home Page — School List with Filters and Pagination

**Files:**

- Modify: `src/app/page.tsx` (server component)
- Create: `src/components/SchoolList.tsx` (client component)
- Create: `src/components/Pagination.tsx` (client component)
- Create: `src/components/GradeBadge.tsx` (shared component)
- Create: `src/components/SchoolLogo.tsx` (client component — logo with fallback)
- Create: `src/hooks/useDebounce.ts` (debounce hook for search input)

**Step 1: Create GradeBadge component**

Create `src/components/GradeBadge.tsx` — renders a Niche letter grade with color coding:

```typescript
import { cn } from '@/utils/cn';
import type { NicheGradeType } from '@/lib/data/schema';

interface GradeBadgeProps {
  grade: NicheGradeType;
  label?: string;
  size?: 'sm' | 'md';
}

function gradeColor(grade: NicheGradeType): string {
  if (grade.startsWith('A')) return 'bg-green/20 text-green';
  if (grade.startsWith('B')) return 'bg-blue/20 text-blue';
  if (grade.startsWith('C')) return 'bg-yellow/20 text-yellow';
  if (grade.startsWith('D')) return 'bg-peach/20 text-peach';
  return 'bg-red/20 text-red';
}

// Accessible grade description for screen readers and colorblind users
function getGradeDescription(grade: NicheGradeType): string {
  if (grade.startsWith('A')) return 'Excellent';
  if (grade.startsWith('B')) return 'Good';
  if (grade.startsWith('C')) return 'Fair';
  if (grade.startsWith('D')) return 'Poor';
  return 'Failing';
}

export default function GradeBadge({ grade, label, size = 'sm' }: GradeBadgeProps) {
  const description = getGradeDescription(grade);
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className={cn(
          'rounded font-bold font-mono inline-flex items-center justify-center',
          gradeColor(grade),
          size === 'sm' ? 'text-xs px-1.5 py-0.5 min-w-[28px]' : 'text-sm px-2 py-1 min-w-[36px]'
        )}
        aria-label={`${grade} grade: ${description}`}
        title={`${grade} grade: ${description}`}
      >
        {grade}
      </span>
      {label && <span className="text-[10px] text-subtext0 whitespace-nowrap">{label}</span>}
    </div>
  );
}
```

**Step 2: Create Pagination component**

Create `src/components/Pagination.tsx`:

```typescript
'use client';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 2) {
      pages.push(i);
    }
  }

  // Insert ellipsis markers (represented as -1)
  const withEllipsis: number[] = [];
  for (let i = 0; i < pages.length; i++) {
    if (i > 0 && pages[i] - pages[i - 1] > 1) {
      withEllipsis.push(-1);
    }
    withEllipsis.push(pages[i]);
  }

  return (
    <div className="flex items-center justify-center gap-2 pt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="px-3 py-2 rounded-lg bg-surface0 text-text hover:bg-surface1 transition-colors disabled:opacity-40 disabled:cursor-default text-sm"
      >
        Prev
      </button>
      {withEllipsis.map((p, i) =>
        p === -1 ? (
          <span key={`e-${i}`} className="px-1 text-subtext0">...</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={p === currentPage ? 'page' : undefined}
            aria-label={`Page ${p}`}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              p === currentPage
                ? 'bg-blue text-on-primary font-bold'
                : 'bg-surface0 text-text hover:bg-surface1'
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="px-3 py-2 rounded-lg bg-surface0 text-text hover:bg-surface1 transition-colors disabled:opacity-40 disabled:cursor-default text-sm"
      >
        Next
      </button>
    </div>
  );
}
```

**Step 3: Create SchoolLogo component**

Create `src/components/SchoolLogo.tsx` — uses Clearbit's free logo API (derives logo from school website domain) with a fallback to initials:

```typescript
'use client';

import { useState } from 'react';
import Image from 'next/image';

interface SchoolLogoProps {
  website: string;
  name: string;
  size?: number;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => w.length > 0) // Keep all non-empty words
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export default function SchoolLogo({ website, name, size = 40 }: SchoolLogoProps) {
  const [failed, setFailed] = useState(false);
  const domain = getDomain(website);

  if (failed || !domain) {
    return (
      <div
        className="rounded-lg bg-surface0 flex items-center justify-center text-subtext0 font-bold shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.35 }}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <Image
      src={`https://logo.clearbit.com/${domain}`}
      alt={`${name} logo`}
      width={size}
      height={size}
      className="rounded-lg shrink-0 bg-white"
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}
```

**Note on Clearbit Logos:**

- External API calls may cause network delays or rate limits
- Consider pre-downloading logos to `public/school-logos/` for production
- Fallback to initials ensures graceful degradation when API fails
- `loading="lazy"` attribute improves initial page load performance

Add `logo.clearbit.com` to the Next.js image domains config. In `next.config.ts`:

```typescript
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "logo.clearbit.com" }],
  },
};
```

**Step 4: Create useDebounce hook**

Create `src/hooks/useDebounce.ts` — prevents re-filtering the list on every keystroke:

```typescript
import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
```

**Step 5: Create SchoolList client component**

Create `src/components/SchoolList.tsx`:

```typescript
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { School } from '@/lib/data/schema';
import { useDebounce } from '@/hooks/useDebounce';
import GradeBadge from './GradeBadge';
import Pagination from './Pagination';
import SchoolLogo from './SchoolLogo';

// Import filtering logic from client-safe filters.ts (NOT loadSchools.ts which uses Node.js fs)
import { filterSchools, type SortField, type FilterOptions, type FilterResult } from '@/lib/data/filters';

interface SchoolListProps {
  schools: School[];
}

/** Sort options grouped by category to reduce visual clutter */
const SORT_GROUPS: { label: string; options: { key: SortField; label: string }[] }[] = [
  {
    label: 'Financial',
    options: [
      { key: 'ranking', label: 'Rank' },
      { key: 'roi', label: 'ROI' },
      { key: 'tuitionInState', label: 'In-State $' },
      { key: 'medianEarnings6yr', label: 'Earnings' },
    ],
  },
  {
    label: 'Campus Life',
    options: [
      { key: 'campusFood', label: 'Food' },
      { key: 'partyScene', label: 'Party' },
      { key: 'studentLife', label: 'Social' },
      { key: 'athletics', label: 'Athletics' },
      { key: 'dorms', label: 'Dorms' },
      { key: 'safety', label: 'Safety' },
    ],
  },
  {
    label: 'Academics',
    options: [
      { key: 'professors', label: 'Professors' },
      { key: 'academics', label: 'Academics' },
      { key: 'acceptanceRate', label: 'Acceptance' },
      { key: 'diversity', label: 'Diversity' },
      { key: 'value', label: 'Value' },
    ],
  },
];

const PER_PAGE = 10;

export default function SchoolList({ schools }: SchoolListProps) {
  const searchParams = useSearchParams();

  // Initialize state from URL search params (enables shareable/bookmarkable URLs)
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [stateFilter, setStateFilter] = useState(searchParams.get('state') ?? '');
  const [regionFilter, setRegionFilter] = useState(searchParams.get('region') ?? '');
  const [sortBy, setSortBy] = useState<SortField>((searchParams.get('sort') as SortField) ?? 'ranking');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>((searchParams.get('dir') as 'asc' | 'desc') ?? 'asc');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [isFiltering, setIsFiltering] = useState(false);

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
    if (debouncedSearch) params.set('q', debouncedSearch);
    if (stateFilter) params.set('state', stateFilter);
    if (regionFilter) params.set('region', regionFilter);
    if (sortBy !== 'ranking') params.set('sort', sortBy);
    if (sortDir !== 'asc') params.set('dir', sortDir);
    if (page > 1) params.set('page', String(page));

    const paramString = params.toString();
    const newUrl = paramString ? `/?${paramString}` : '/';
    window.history.replaceState(null, '', newUrl);
  }, [debouncedSearch, stateFilter, regionFilter, sortBy, sortDir, page]);

  const result = useMemo(() => filterSchools(schools, {
    search: debouncedSearch || undefined,
    state: stateFilter || undefined,
    region: regionFilter || undefined,
    sortBy,
    sortDir,
    page,
    perPage: PER_PAGE,
    paginate: true,
  }) as FilterResult,
    [schools, debouncedSearch, stateFilter, regionFilter, sortBy, sortDir, page]);

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
    setSearch('');
    setStateFilter('');
    setRegionFilter('');
    setSortBy('ranking');
    setSortDir('asc');
    setPage(1);
  }, []);

  const toggleSort = useCallback((key: SortField) => {
    setSortBy((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      // Default sort direction: ascending for ranking/tuition/acceptance (lower=better),
      // descending for everything else (higher=better)
      setSortDir(['ranking', 'tuitionInState', 'tuitionOutOfState', 'acceptanceRate', 'medianDebt'].includes(key) ? 'asc' : 'desc');
      return key;
    });
    setPage(1);
  }, []);

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
            <option key={s} value={s}>{s}</option>
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
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Sort selector - dropdown for mobile, grouped pills for desktop */}
      <div className="text-sm space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-subtext0 font-medium">Sort:</span>
          {/* Mobile dropdown */}
          <select
            value={sortBy}
            onChange={(e) => toggleSort(e.target.value as SortField)}
            className="sm:hidden px-3 py-1.5 bg-mantle border border-surface0 rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-blue"
            aria-label="Sort by"
          >
            {SORT_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map(({ key, label }) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </optgroup>
            ))}
          </select>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-subtext0 hover:text-red transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
        {/* Desktop grouped pills */}
        <div className="hidden sm:flex flex-wrap gap-x-4 gap-y-2">
          {SORT_GROUPS.map((group) => (
            <div key={group.label} className="flex items-center gap-1.5">
              <span className="text-xs text-overlay0 mr-1">{group.label}:</span>
              {group.options.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => toggleSort(key)}
                  className={`px-2.5 py-0.5 rounded-full transition-colors text-xs ${
                    sortBy === key ? 'bg-blue text-on-primary font-bold' : 'bg-surface0 text-text hover:bg-surface1'
                  }`}
                  aria-label={`Sort by ${label}, currently ${sortBy === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'not selected'}`}
                >
                  {label} {sortBy === key && (sortDir === 'asc' ? '↑' : '↓')}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-subtext0" aria-live="polite" aria-atomic="true">
        {isFiltering ? 'Filtering...' : `${result.totalCount} schools found`}
      </p>

      {/* School list or empty state */}
      {paginated.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xl font-bold text-text mb-2">No schools found</p>
          <p className="text-subtext0 mb-4">
            {hasActiveFilters
              ? 'Try adjusting your filters or search terms.'
              : 'No schools match the current criteria.'}
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
          {paginated.map((school) => (
            <Link
              key={school.slug}
              href={`/school/${school.slug}`}
              className="block p-5 bg-mantle rounded-lg border border-surface0 hover:border-blue transition-colors"
            >
              <div className="flex items-start gap-4">
                <SchoolLogo website={school.website} name={school.name} size={48} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-blue font-mono text-sm font-bold">#{school.ranking}</span>
                    <span className="font-semibold text-lg truncate">{school.name}</span>
                  </div>
                  <p className="text-subtext0 text-sm">{school.city}, {school.state} · {school.region}</p>
                  {/* Mobile: compact stats inline */}
                  <div className="sm:hidden flex gap-3 text-xs text-subtext0 mt-1">
                    <span>${school.tuitionInState.toLocaleString()}</span>
                    <span className="text-green">{school.medianEarnings6yr ? `$${school.medianEarnings6yr.toLocaleString()}` : '—'}</span>
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
                      {school.medianEarnings6yr ? `$${school.medianEarnings6yr.toLocaleString()}` : '—'}
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
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => {
          setPage(p);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }} />
      )}
    </div>
  );
}
```

**Step 4: Create the home page (server component)**

Update `src/app/page.tsx`:

```typescript
import { Suspense } from "react";
import { loadSchools } from "@/lib/data/loadSchools";
import SchoolList from "@/components/SchoolList";
import { SchoolCardSkeleton } from "@/components/LoadingSkeleton";

function SchoolListFallback() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <SchoolCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function HomePage() {
  const schools = loadSchools();

  return (
    <div id="main-content" className="py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Top 100 CS Programs</h1>
        <p className="text-subtext0 text-lg">
          Compare Computer Science programs by ranking, ROI, campus life, dining, and more.
        </p>
      </div>
      {/* Suspense required because SchoolList uses useSearchParams */}
      <Suspense fallback={<SchoolListFallback />}>
        <SchoolList schools={schools} />
      </Suspense>
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add src/app/page.tsx src/components/SchoolList.tsx src/components/Pagination.tsx src/components/GradeBadge.tsx src/components/SchoolLogo.tsx src/hooks/useDebounce.ts next.config.ts
git commit -m "feat: create home page with paginated school list, logos, and rich filters"
```

---
