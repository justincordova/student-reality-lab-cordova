# Phase 6: Polish & Verify (Tasks 9, 10, 11)

> See [00-overview.md](./00-overview.md) for architecture, tech stack, and shared context.

## Task 9: ROI Comparison Chart (Optional Enhancement)

**Files:**

- Create: `src/components/ROIChart.tsx` (lazy-loaded client component)
- Modify: `src/app/page.tsx` (add chart toggle)

**Step 1: Create ROI comparison chart**

Create `src/components/ROIChart.tsx` using Recharts. Shows a bar chart comparing tuition vs 6-year earnings for the currently visible (filtered) schools:

**Important:** The chart should receive the **filtered/paginated** school list (not all schools) to reflect the current search/filter state. Pass `paginated` from SchoolList, not the full `schools` array.

```typescript
'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { School } from '@/lib/data/schema';

interface ROIChartProps {
  schools: School[];
}

export default function ROIChart({ schools }: ROIChartProps) {
  const data = schools
    .filter((s) => s.medianEarnings6yr)
    .slice(0, 15)
    .map((s) => ({
      name: s.name.length > 20 ? s.name.slice(0, 20) + '...' : s.name,
      tuition: s.tuitionInState,
      earnings: s.medianEarnings6yr,
    }));

  if (data.length === 0) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-mantle rounded-lg border border-surface0">
        <div className="text-center text-subtext0">
          <p className="text-lg font-bold text-overlay0 mb-2">No Chart Data</p>
          <p className="text-sm">No data available for chart</p>
          <p className="text-xs mt-1">Try adjusting filters or adding more schools</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--ctp-surface1)" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" tick={{ fontSize: 11, fill: 'var(--ctp-subtext0)' }} />
          <YAxis tick={{ fill: 'var(--ctp-subtext0)' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
          <Tooltip
            contentStyle={{ backgroundColor: 'var(--ctp-mantle)', border: '1px solid var(--ctp-surface0)', color: 'var(--ctp-text)' }}
            formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
          />
          <Legend />
          <Bar dataKey="tuition" name="In-State Tuition" fill="var(--ctp-peach)" />
          <Bar dataKey="earnings" name="Median Earnings (6yr)" fill="var(--ctp-green)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**Step 2: Lazy-load the chart in the home page**

In `src/app/page.tsx`, add:

```typescript
import dynamic from "next/dynamic";
const ROIChart = dynamic(() => import("@/components/ROIChart"), { ssr: false });
```

Add a "Show Chart" toggle button above the SchoolList that reveals the chart.

**Important:** Pass `result.schools` (the filtered/paginated array) to ROIChart, not the full `schools` array. This ensures the chart reflects the current filter/sort/page state.

**Step 3: Commit**

```bash
git add src/components/ROIChart.tsx src/app/page.tsx
git commit -m "feat: add lazy-loaded ROI comparison chart"
```

---

## Task 10: Update README

**Files:**

- Modify: `README.md`

**Step 1: Update README**

Replace `README.md` with:

````markdown
# CSPathFinder

Find and compare the top 100 Computer Science programs across US colleges.

## Features

- **Top 100 CS Schools:** Paginated list (10 per page) with rankings, tuition, earnings, and Niche grades
- **Rich Filters:** Sort by ranking, ROI, tuition, earnings, campus food, party scene, social life, athletics, dorms, safety, professors, diversity, value, location
- **School Details:** Full stats page with Niche letter grades across 12 categories
- **AI Chat Assistant:** Slide-out chatbot that answers questions AND auto-applies filters to the list
- **Theming:** Catppuccin Mocha (dark) / Latte (light) with toggle
- **Charts:** Visual ROI comparison across schools

## Quick Start

```bash
bun install
cp .env.example .env.local  # Add your HF_TOKEN
bun run dev                  # http://localhost:3000
```

## Environment Variables

| Variable   | Description                                                     |
| ---------- | --------------------------------------------------------------- |
| `HF_TOKEN` | Hugging Face API token (free at huggingface.co/settings/tokens) |

## Data Sources

- [College Scorecard API](https://collegescorecard.ed.gov/data/api/) — tuition, earnings, debt, graduation rates
- [Niche.com](https://www.niche.com/colleges/) — 12-category letter grades (food, party, social, safety, etc.)
- [US News](https://www.usnews.com/best-graduate-schools/top-science-schools/computer-science-rankings) — CS program rankings

## Tech Stack

- Next.js 16 (App Router), React 19, Bun, TypeScript
- Tailwind CSS v4, Catppuccin theme
- Recharts, Zod v4, Vitest
- Hugging Face Inference API (Mistral Small 3)
````

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README for CSPathFinder"
```

---

## Task 11: Tests and Verification

**Step 1: Run all tests**

Run: `bun run test`
Expected: All tests pass

**Step 2: Verify web app builds**

Run: `bun run build`
Expected: Builds successfully

**Step 3: Manual verification**

Run: `bun run dev`

- Visit `/` — Top 100 list, paginated, with grouped sort pills and filters
- Click sort pills (Rank, ROI, Food, Party, etc.) — list re-sorts
- Filter by state dropdown — list updates, pagination resets
- Search "MIT" — filters to matching schools
- Verify URL updates with filters (e.g. `/?sort=campusFood&dir=desc&state=CA`)
- Copy filtered URL → paste in new tab → same filters applied
- Click page 2 → viewport scrolls to top of list
- Click a school → loading skeleton appears → detail page with Niche grades grid and stats
- Visit `/school/nonexistent-slug` → custom 404 with "Back to Rankings" link
- Click floating chat icon → drawer slides in from right
- Ask "Best CS school for food?" → AI answers + undo banner appears + list auto-sorts
- Click "Undo" on the banner → previous filters restored
- Ask "Cheapest in California?" on a school detail page → navigates to home with filters
- Press Escape → chat drawer closes
- Tab through sort pills → keyboard focus visible, Enter activates
- Toggle Dark/Light theme — everything looks correct in both themes
- Test on mobile viewport: sort dropdown with optgroups, compact stats inline on cards, chat backdrop covers page

---
