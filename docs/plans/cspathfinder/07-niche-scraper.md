# Phase 7: Niche.com CS Rankings Scraper

## Overview

Replace US News ranking with Niche.com's numeric CS program rankings as the primary ranking system. Automate daily scraping via GitHub Actions + Playwright. Remove letter-grade sort filters (not granular enough to rank), keep only sorts backed by real numbers.

## Architecture

```
Daily at 6 AM UTC (GitHub Actions cron)
  → Spin up Ubuntu VM (free)
  → Install Playwright + Chromium
  → Scrape all 15 pages of niche.com/colleges/search/best-colleges-for-computer-science/
  → 356 schools scraped, matched to our 100 via nicheUrl slug
  → Update data/schools.json with nicheRanking field
  → Validate: abort if <80 of our 100 schools matched (something went wrong)
  → Git commit + push (only if data actually changed)
  → Vercel auto-deploys with fresh data (zero-downtime swap)
```

## Phase 1: Scraper Script

### New file: `scripts/scrape-niche-rankings.ts`

**Dependencies**: `playwright` (devDependency only — not shipped to production)

**Script structure:**

1. **Launch Playwright Chromium** with `headless: true`, realistic user-agent, viewport `1280x720`
2. **Navigate all 15 pages** — confirmed URL pattern:
   - Page 1: `https://www.niche.com/colleges/search/best-colleges-for-computer-science/`
   - Page 2–15: `https://www.niche.com/colleges/search/best-colleges-for-computer-science/?page=N`
   - ~25 schools per page, 356 total across 15 pages
   - Random delay (2–5s) between pages to reduce bot detection
3. **Extract data per page** — each card has:
   - School name (heading/link text)
   - School href (e.g. `/colleges/massachusetts-institute-of-technology/`)
   - Rank is implicit from position: page 1 = #1–25, page 2 = #26–50, etc.
4. **Match to our data** — primary key: compare scraped href slug to our `nicheUrl` slug
   - Extract slug from scraped href: `/colleges/massachusetts-institute-of-technology/` → `massachusetts-institute-of-technology`
   - Extract slug from our `nicheUrl`: `https://www.niche.com/colleges/massachusetts-institute-of-technology/` → `massachusetts-institute-of-technology`
   - Exact string match — no fuzzy matching needed since we're comparing Niche URLs to Niche URLs
5. **Validate before saving**:
   - Each scraped entry validated with Zod: `{ name: string, rank: number (1–356), slug: string }`
   - Must match at least 80 of our 100 schools or abort (prevents saving garbage data)
   - If scrape finds significantly different rankings (>30% of schools shifted 50+ positions vs last run), log a warning but still save
6. **Write updated data** — read `data/schools.json`, set `nicheRanking` for matched schools, `null` for unmatched, write back with `JSON.stringify(data, null, 2)`
7. **Failure handling** — if any page yields zero results, hits a CAPTCHA page, or errors: abort without writing. Exit code 1 so GitHub Actions stops before commit.

**PerimeterX mitigations:**

- Real Chromium browser (not lightweight headless)
- Realistic user-agent string matching current Chrome version
- Random delays (2–5s) between page navigations
- Detect blocks: check for CAPTCHA elements, empty result lists, or unexpected page titles
- Escalation path if blocked: `playwright-extra` with stealth plugin → `xvfb-run` with headed mode in GitHub Actions

**Package.json script:**

```json
"scrape:niche": "bunx playwright install chromium && bun run scripts/scrape-niche-rankings.ts"
```

## Phase 2: Data Schema Update

### `src/lib/data/schema.ts`

- Add `nicheRanking: z.number().int().min(1).nullable()` to SchoolSchema
- Remove `ranking` field (US News) from SchoolSchema
- Remove any references to the old `ranking` field across the codebase

### `data/schools.json`

- Remove `"ranking"` field from all 100 entries
- Add `"nicheRanking": null` to all 100 entries initially (populated after first scrape)

### `src/lib/data/filters.ts`

- Replace `"ranking"` with `"nicheRanking"` in `SortField` union type
- Handle in `getSortValue`: `school.nicheRanking ?? 999` (unranked schools sort last)
- Remove all Niche grade fields from `SortField`: `overall`, `academics`, `value`, `diversity`, `campus`, `athletics`, `partyScene`, `professors`, `location`, `dorms`, `campusFood`, `studentLife`, `safety`
- Remove `NICHE_GRADE_FIELDS` set and grade-sorting branch in `getSortValue`
- Keep `gradeToNumeric` in schema.ts (still used by `GradeBadge` for display)

### `src/components/SchoolList.tsx`

Replace `SORT_OPTIONS` with only real-number sorts:

```
Overall (asc, default) | ROI (asc) | Earnings (asc) | Tuition (asc) | Acceptance (asc)
```

- Default sort = `nicheRanking` ascending (#1 = best)
- All sorts default to ascending for consistency (#1 = best in every category)
- **Remove `rankMap` useMemo entirely** — use `school.nicheRanking` directly
- Card rank badge: `#{school.nicheRanking}` (or `—` if null)
- Update `clearAllFilters` to reset to `nicheRanking`
- Keep GradeBadges on cards as visual display (not sortable)

### Sort direction for each field:

| Sort       | Ascending (#1 = best) means           | Descending means             |
| ---------- | ------------------------------------- | ---------------------------- |
| Overall    | #1 first (best overall)               | #100 first (worst overall)   |
| ROI        | Fastest payback first                 | Slowest payback first        |
| Earnings   | Highest earnings first                | Lowest earnings first        |
| Tuition    | Cheapest first                        | Most expensive first         |
| Acceptance | Lowest rate first (hardest to get in) | Highest rate first (easiest) |

Note: all default to ascending. For Earnings this means highest first because `getSortValue` returns the raw dollar amount and we sort descending internally for "higher is better" fields — wait, no. To keep it consistent, we need `getSortValue` to return values where **lower = better for ascending sort**:

- `nicheRanking`: already lower = better ✓
- `roi`: currently negated payback (more negative = better). Needs adjustment: return `totalCost / earnings` directly (lower payback years = better) ✓
- `medianEarnings6yr`: higher = better, so negate it: return `-school.medianEarnings6yr` so asc sort puts highest first ✓
- `tuitionInState`: lower = cheaper = better ✓
- `acceptanceRate`: lower = more selective. This is subjective — some students want easy admission. Default asc = most selective first (lower rate = better). Toggle to desc for easiest first.

## Phase 3: GitHub Actions Workflow

### New file: `.github/workflows/scrape-niche.yml`

```yaml
name: Scrape Niche Rankings

on:
  schedule:
    - cron: "0 6 * * *" # Daily at 6 AM UTC
  workflow_dispatch: {} # Manual trigger

permissions:
  contents: write

jobs:
  scrape:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - run: bun install

      - name: Install Playwright browsers
        run: bunx playwright install --with-deps chromium

      - name: Run Niche scraper
        run: bun run scripts/scrape-niche-rankings.ts

      - name: Commit and push if changed
        run: |
          git diff --quiet data/schools.json && exit 0
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/schools.json
          git commit -m "data: update niche rankings $(date -u +%Y-%m-%d)"
          git push
```

**Budget:** ~5 min/run (15 pages with delays) × 30 days = 150 min/month (within 2000 free minutes)

**Failure behavior:** Scraper exits code 1 → workflow stops before commit → last good data preserved

**Timeout:** 15 minutes (increased from 10 to allow for 15 pages + delays)

## Phase 4: Frontend Cleanup

### School cards (`SchoolList.tsx`)

- Show Niche ranking: `#{school.nicheRanking}` or `—` if unranked
- Keep GradeBadges on cards (visual info, just not sortable)
- Users can still see "A+ Professors" at a glance, they just can't sort by it

### School detail page (`src/app/school/[slug]/page.tsx`)

- Show "Niche CS Ranking" → `#3` in stats grid
- Remove "CS Ranking" (old US News reference)
- Keep all other stats (tuition, earnings, acceptance, graduation, etc.)
- Keep Niche grades grid display

### Chat system prompt (`src/app/api/chat/route.ts`)

- Update `buildSystemPrompt()` to reference `nicheRanking` instead of `ranking`
- Update available sortBy values in the prompt

## Implementation Order

1. Write scraper script `scripts/scrape-niche-rankings.ts`
2. Test scraper locally — confirm it works and matches our schools
3. If scraper works: update schema, data, filters, frontend
4. If scraper is blocked: troubleshoot PerimeterX before changing anything else
5. Add GitHub Actions workflow
6. Update tests, run lint, commit all changes

## Risks & Mitigations

| Risk                                     | Likelihood              | Mitigation                                                                         |
| ---------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------- |
| PerimeterX blocks scraper                | Medium                  | Stealth plugin → headed mode with xvfb → manual fallback                           |
| Niche DOM structure changes              | Low                     | Assert min 20 results/page, fail loudly, log selectors that break                  |
| Schools not in Niche top 356             | Unlikely (356 is large) | `nicheRanking: null`, sort last                                                    |
| GitHub Actions minutes exceeded          | Very low (150/2000)     | N/A                                                                                |
| Niche ToS prohibits scraping             | Unknown                 | Use respectful delays, don't scrape more than once/day, cache results              |
| Rankings shift dramatically between runs | Low                     | Log warning if >30% shift 50+ positions, still save (rankings do genuinely change) |

## Files Changed

| File                                 | Action                                                    |
| ------------------------------------ | --------------------------------------------------------- |
| `scripts/scrape-niche-rankings.ts`   | **New** — scraper script                                  |
| `.github/workflows/scrape-niche.yml` | **New** — daily cron workflow                             |
| `data/schools.json`                  | Remove `ranking`, add `nicheRanking`                      |
| `src/lib/data/schema.ts`             | Remove `ranking`, add `nicheRanking`                      |
| `src/lib/data/filters.ts`            | Replace sort fields, remove grade sorts                   |
| `src/components/SchoolList.tsx`      | New sort options, remove rankMap, update card display     |
| `src/app/school/[slug]/page.tsx`     | Show Niche ranking instead of US News                     |
| `src/app/api/chat/route.ts`          | Update system prompt references                           |
| `package.json`                       | Add `playwright` devDependency, add `scrape:niche` script |
