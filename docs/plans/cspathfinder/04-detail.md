# Phase 4: School Detail Page (Task 7)

> See [00-overview.md](./00-overview.md) for architecture, tech stack, and shared context.

## Task 7: School Detail Page

**Files:**

- Create: `src/app/school/[slug]/page.tsx`
- Create: `src/app/school/[slug]/loading.tsx`
- Create: `src/app/school/[slug]/not-found.tsx`

**Step 0: Create loading and not-found states**

Create `src/app/school/[slug]/loading.tsx`:

```typescript
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function SchoolLoading() {
  return (
    <div className="py-12 space-y-10">
      <div>
        <LoadingSkeleton className="w-32 h-4 rounded mb-4" />
        <div className="flex items-center gap-4">
          <LoadingSkeleton className="w-16 h-16 rounded-lg" />
          <div className="space-y-2">
            <LoadingSkeleton className="w-64 h-8 rounded" />
            <LoadingSkeleton className="w-40 h-5 rounded" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-4">
        {[...Array(13)].map((_, i) => (
          <LoadingSkeleton key={i} className="w-full h-12 rounded" />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <LoadingSkeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
```

Create `src/app/school/[slug]/not-found.tsx`:

```typescript
import Link from 'next/link';

export default function SchoolNotFound() {
  return (
    <div id="main-content" className="py-12 text-center">
      <p className="text-6xl font-bold text-overlay0 mb-4">404</p>
      <p className="text-xl font-bold text-text mb-2">School not found</p>
      <p className="text-subtext0 mb-6">
        This school doesn't exist in our database.
      </p>
      <Link
        href="/"
        className="px-4 py-2 bg-blue text-on-primary rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
      >
        Back to Rankings
      </Link>
    </div>
  );
}
```

**Step 1: Create dynamic school detail page**

Create `src/app/school/[slug]/page.tsx`:

```typescript
import { notFound } from "next/navigation";
import Link from "next/link";
import { loadSchools, getSchoolBySlug } from "@/lib/data/loadSchools";
import GradeBadge from "@/components/GradeBadge";
import SchoolLogo from "@/components/SchoolLogo";
import type { Metadata } from "next";
import type { NicheGrades, NicheGradeType } from "@/lib/data/schema";

export async function generateStaticParams() {
  return loadSchools().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const school = getSchoolBySlug(slug);
  return { title: school?.name ?? "School" };
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function formatPercent(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

const GRADE_LABELS: Record<keyof NicheGrades, string> = {
  overall: "Overall",
  academics: "Academics",
  value: "Value",
  diversity: "Diversity",
  campus: "Campus",
  athletics: "Athletics",
  partyScene: "Party Scene",
  professors: "Professors",
  location: "Location",
  dorms: "Dorms",
  campusFood: "Campus Food",
  studentLife: "Student Life",
  safety: "Safety",
};

export default async function SchoolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const school = getSchoolBySlug(slug);
  if (!school) notFound();

  const totalCost = (school.tuitionInState + school.roomAndBoard) * 4;
  const roi =
    school.medianEarnings6yr && totalCost > 0
      ? ((school.medianEarnings6yr * 6 - totalCost) / totalCost * 100).toFixed(0)
      : null;

  const stats = [
    { label: "CS Ranking", value: `#${school.ranking}` },
    { label: "In-State Tuition", value: formatCurrency(school.tuitionInState) },
    { label: "Out-of-State Tuition", value: formatCurrency(school.tuitionOutOfState) },
    { label: "Room & Board", value: formatCurrency(school.roomAndBoard) },
    { label: "Total 4-Year Cost (In-State)", value: formatCurrency(totalCost) },
    { label: "Acceptance Rate", value: formatPercent(school.acceptanceRate) },
    { label: "Graduation Rate", value: formatPercent(school.graduationRate) },
    { label: "Enrollment", value: school.enrollment.toLocaleString() },
    { label: "Median Earnings (6yr)", value: school.medianEarnings6yr ? formatCurrency(school.medianEarnings6yr) : "—" },
    { label: "Median Debt", value: school.medianDebt ? formatCurrency(school.medianDebt) : "—" },
  ];

  return (
    <div id="main-content" className="py-12 space-y-10">
      {/* Header */}
      <div>
        <Link href="/" className="text-blue hover:underline text-sm mb-4 inline-block">
          ← Back to Rankings
        </Link>
        <div className="flex items-center gap-4">
          <SchoolLogo website={school.website} name={school.name} size={64} />
          <div>
            <h1 className="text-3xl font-bold">{school.name}</h1>
            <p className="text-subtext0 text-lg">{school.city}, {school.state} · {school.region}</p>
          </div>
        </div>
      </div>

      {/* Niche Grades grid */}
      <section>
        <h2 className="text-xl font-bold mb-4">Niche Grades</h2>
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-4">
          {(Object.entries(school.nicheGrades) as [keyof NicheGrades, string][]).map(([key, grade]) => (
            <GradeBadge key={key} grade={grade as NicheGradeType} label={GRADE_LABELS[key]} size="md" />
          ))}
        </div>
      </section>

      {/* Stats grid */}
      <section>
        <h2 className="text-xl font-bold mb-4">Key Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="p-4 bg-mantle rounded-lg border border-surface0">
              <div className="text-sm text-subtext0 mb-1">{stat.label}</div>
              <div className="text-xl font-bold">{stat.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ROI highlight */}
      {roi && (
        <section className="p-6 bg-mantle rounded-lg border border-surface0">
          <div className="text-sm text-subtext0 mb-1">6-Year ROI (Median Earnings over 6 Years vs Total Cost of Attendance)</div>
          <div className={`text-3xl font-bold ${Number(roi) > 0 ? "text-green" : "text-red"}`}>
            {Number(roi) > 0 ? "+" : ""}{roi}%
          </div>
        </section>
      )}

      {/* Links */}
      <div className="flex flex-wrap gap-4">
        <a
          href={school.website}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-blue text-on-primary rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
        >
          School Website
        </a>
        {school.usnewsUrl && (
          <a
            href={school.usnewsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-surface0 text-text rounded-lg hover:bg-surface1 transition-colors text-sm font-medium"
          >
            US News Profile
          </a>
        )}
        {school.nicheUrl && (
          <a
            href={school.nicheUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-surface0 text-text rounded-lg hover:bg-surface1 transition-colors text-sm font-medium"
          >
            Niche Profile
          </a>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/school/\[slug\]/page.tsx src/app/school/\[slug\]/loading.tsx src/app/school/\[slug\]/not-found.tsx
git commit -m "feat: create school detail page with Niche grades, stats, loading and 404"
```

---
