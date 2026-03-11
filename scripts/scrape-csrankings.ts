/**
 * Scrape CSRankings.org and build csrankings-schools.json.
 *
 * Step 1: Scrape all US institutions + ranks from CSRankings.org
 * Step 2: Match each to a Niche profile slug (for school data)
 * Step 3: Build csrankings-schools.json using Niche profile data
 *
 * Niche profiles must be pre-scraped with scrape-niche-profile.ts.
 * Missing profiles are listed so you can scrape them.
 *
 * Usage: bun run scripts/scrape-csrankings.ts [--scrape-only] [--merge-only]
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
const scrapeOnly = args.includes("--scrape-only");
const mergeOnly = args.includes("--merge-only");

const csrDataPath = path.join(process.cwd(), "data", "csrankings-raw.json");
const profileDir = path.join(process.cwd(), "data", "niche-profiles");
const outPath = path.join(process.cwd(), "data", "csrankings-schools.json");

// State → region mapping
const STATE_TO_REGION: Record<string, string> = {
  CT: "Northeast",
  ME: "Northeast",
  MA: "Northeast",
  NH: "Northeast",
  RI: "Northeast",
  VT: "Northeast",
  NJ: "Mid-Atlantic",
  NY: "Mid-Atlantic",
  PA: "Mid-Atlantic",
  DE: "Mid-Atlantic",
  MD: "Mid-Atlantic",
  DC: "Mid-Atlantic",
  IL: "Midwest",
  IN: "Midwest",
  IA: "Midwest",
  KS: "Midwest",
  MI: "Midwest",
  MN: "Midwest",
  MO: "Midwest",
  NE: "Midwest",
  ND: "Midwest",
  OH: "Midwest",
  SD: "Midwest",
  WI: "Midwest",
  AL: "Southeast",
  AR: "Southeast",
  FL: "Southeast",
  GA: "Southeast",
  KY: "Southeast",
  LA: "Southeast",
  MS: "Southeast",
  NC: "Southeast",
  SC: "Southeast",
  TN: "Southeast",
  VA: "Southeast",
  WV: "Southeast",
  AZ: "Southwest",
  NM: "Southwest",
  OK: "Southwest",
  TX: "Southwest",
  AK: "Pacific",
  HI: "Pacific",
  CA: "Pacific",
  OR: "Pacific",
  WA: "Pacific",
  CO: "West",
  ID: "West",
  MT: "West",
  NV: "West",
  UT: "West",
  WY: "West",
};

// CSRankings name → Niche profile slug
// Add entries here when auto-matching fails
const CSR_TO_NICHE_SLUG: Record<string, string> = {
  "Massachusetts Inst. of Technology": "massachusetts-institute-of-technology",
  "Univ. of California - Berkeley": "university-of-california-berkeley",
  "Univ. of California - San Diego": "university-of-california-san-diego",
  "Univ. of California - Los Angeles": "university-of-california-los-angeles",
  "Univ. of California - Irvine": "university-of-california-irvine",
  "Univ. of California - Davis": "university-of-california-davis",
  "Univ. of California - Santa Barbara": "university-of-california-santa-barbara",
  "Univ. of California - Santa Cruz": "university-of-california-santa-cruz",
  "Univ. of California - Riverside": "university-of-california-riverside",
  "Univ. of California - Merced": "university-of-california-merced",
  "Univ. of Illinois at Urbana-Champaign": "university-of-illinois-urbana-champaign",
  "Univ. of Maryland - College Park": "university-of-maryland-college-park",
  "Univ. of Maryland - Baltimore County": "university-of-maryland-baltimore-county",
  "Univ. of Massachusetts Amherst": "university-of-massachusetts-amherst",
  "California Inst. of Technology": "california-institute-of-technology",
  "Rochester Inst. of Technology": "rochester-institute-of-technology",
  "Georgia Inst. of Technology": "georgia-institute-of-technology",
  "New Jersey Inst. of Technology": "new-jersey-institute-of-technology",
  "Illinois Institute of Technology": "illinois-institute-of-technology",
  "Florida Institute of Technology": "florida-institute-of-technology",
  "Air Force Inst. of Technology": "united-states-air-force-academy",
  "Virginia Polytechnic Inst. and State Univ.": "virginia-tech",
  "Pennsylvania State University": "penn-state",
  "North Carolina State University": "north-carolina-state-university",
  "University of North Carolina": "university-of-north-carolina-at-chapel-hill",
  "UNC - Charlotte": "university-of-north-carolina-at-charlotte",
  "UNC - Greensboro": "university-of-north-carolina-greensboro",
  "University of Wisconsin - Madison": "university-of-wisconsin-madison",
  "Univ. of Wisconsin - Milwaukee": "university-of-wisconsin-milwaukee",
  "University of Illinois at Chicago": "university-of-illinois-chicago",
  "University of Nebraska": "university-of-nebraska-lincoln",
  "University of Nebraska - Omaha": "university-of-nebraska-at-omaha",
  "Indiana University": "indiana-university-bloomington",
  "University of Michigan": "university-of-michigan-ann-arbor",
  "University of Michigan-Dearborn": "university-of-michigan-dearborn",
  "Rutgers University": "rutgers-universitynew-brunswick",
  "University of Minnesota": "university-of-minnesota-twin-cities",
  "University of Texas at Austin": "university-of-texas-austin",
  "University of Texas at Dallas": "university-of-texas-dallas",
  "University of Texas at Arlington": "university-of-texas-arlington",
  "University of Texas at San Antonio": "the-university-of-texas-at-san-antonio",
  "University of Texas - El Paso": "university-of-texas-el-paso",
  "Ohio State University": "the-ohio-state-university",
  "Texas A&M University": "texas-a-and-m-university",
  "SUNY - Stony Brook University": "stony-brook-university",
  "SUNY - University at Buffalo": "university-at-buffalo",
  "University at Buffalo": "university-at-buffalo",
  "University at Albany - SUNY": "university-at-albany-suny",
  NJIT: "new-jersey-institute-of-technology",
  "College of William and Mary": "william-and-mary",
  "Binghamton University": "binghamton-university-suny",
  "University of Tennessee": "university-of-tennessee-knoxville",
  "University of Kansas": "the-university-of-kansas",
  "Univ. of Louisiana - Lafayette": "university-of-louisiana-at-lafayette",
  "University of Nevada": "university-of-nevada-reno",
  "University of Nevada Las Vegas": "university-of-nevada-las-vegas",
  "Missouri S&T": "missouri-university-of-science-and-technology",
  "The University of Alabama": "the-university-of-alabama",
  "University of Alabama - Birmingham": "university-of-alabama-at-birmingham",
  "University of Alabama - Huntsville": "the-university-of-alabama-in-huntsville",
  "New York Tech": "new-york-institute-of-technology",
  "Univ. of Missouri - Kansas City": "university-of-missouri-kansas-city",
  "University of Colorado - Denver": "university-of-colorado-denver",
  "University of Tulsa": "the-university-of-tulsa",
  "Univ. of Arkansas - Little Rock": "university-of-arkansas-at-little-rock",
  CUNY: "cuny-brooklyn-college",
  IUPUI: "indiana-university-indianapolis",
  UCCS: "university-of-colorado-colorado-springs",
  OHSU: "oregon-health-and-science-university",
  "TTI Chicago": "toyota-technological-institute-at-chicago",
  "Ohio University": "ohio-university",
  "University of Alabama - Birmingham": "university-of-alabama-birmingham",
  "University of New Hampshire": "university-of-new-hampshire-at-manchester",
  "Ohio University": "ohio-university",
};

interface CsrInstitution {
  rank: number;
  name: string;
}

// ---------------------------------------------------------------------------
// Step 1: Scrape CSRankings.org
// ---------------------------------------------------------------------------

async function scrape(): Promise<CsrInstitution[]> {
  console.log("Launching browser...");
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log("Navigating to https://csrankings.org/#/index?all&us ...");
    await page.goto("https://csrankings.org/#/index?all&us", {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    console.log("Waiting for ranking table...");
    await page.waitForFunction(
      () => {
        const table = document.querySelector("#ranking");
        return table && table.querySelectorAll("tbody tr td.rank-cell").length > 5;
      },
      { timeout: 30000 }
    );

    const institutions = await page.$$eval("#ranking tbody tr td.rank-cell", (cells) => {
      return cells.map((cell) => {
        const row = cell.parentElement!;
        const nameTd = row.querySelectorAll("td")[1];
        let name = "";
        const spans = nameTd?.querySelectorAll("span");
        if (spans) {
          for (const span of Array.from(spans)) {
            const style = span.getAttribute("style") ?? "";
            if (style.includes("cursor:pointer")) {
              name = span.textContent?.trim() ?? "";
              break;
            }
          }
        }
        if (!name) {
          name = (nameTd?.textContent?.trim() ?? "").replace(/^►\s*/, "").trim();
        }
        const rank = parseInt(cell.textContent?.trim() ?? "0", 10);
        return { rank, name };
      });
    });

    console.log(`Scraped ${institutions.length} institutions.`);
    return institutions;
  } catch (error) {
    console.error("Error during scraping:", error);
    throw error;
  } finally {
    if (browser) {
      await browser.close().catch((err) => console.error("Error closing browser:", err));
    }
  }
}

// ---------------------------------------------------------------------------
// Step 2: Auto-generate Niche slug from CSRankings name
// ---------------------------------------------------------------------------

function csrNameToNicheSlug(name: string): string {
  // Check manual mapping first
  if (CSR_TO_NICHE_SLUG[name]) return CSR_TO_NICHE_SLUG[name];

  // Auto-generate: expand abbreviations, slugify
  return name
    .replace(/\bUniv\.\s*/g, "University ")
    .replace(/\bInst\.\s*/g, "Institute ")
    .replace(/\s*-\s*/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
// Step 3: Build csrankings-schools.json
// ---------------------------------------------------------------------------

// Schools that don't have Niche college pages (graduate-only, military, etc.)
const SKIP_INSTITUTIONS = new Set(["TTI Chicago", "Naval Postgraduate School"]);

function merge(institutions: CsrInstitution[]) {
  const profileExists = fs.existsSync(profileDir);
  const missing: string[] = [];
  const schools: Record<string, unknown>[] = [];

  for (const inst of institutions) {
    if (SKIP_INSTITUTIONS.has(inst.name)) continue;

    const nicheSlug = csrNameToNicheSlug(inst.name);
    const profilePath = path.join(profileDir, `${nicheSlug}.json`);

    if (!profileExists || !fs.existsSync(profilePath)) {
      missing.push(`#${inst.rank} ${inst.name} → ${nicheSlug}`);
      continue;
    }

    const profile: Record<string, unknown> = JSON.parse(fs.readFileSync(profilePath, "utf-8"));

    const state = (profile.state as string) ?? "";
    const region = STATE_TO_REGION[state] ?? "Northeast";

    const DEFAULT_GRADES: Record<string, string> = {
      overall: "B",
      academics: "B",
      value: "B",
      diversity: "B",
      campus: "B",
      athletics: "B",
      partyScene: "B",
      professors: "B",
      location: "B",
      dorms: "B",
      campusFood: "B",
      studentLife: "B",
      safety: "B",
    };
    const nicheGrades = (profile.nicheGrades as Record<string, string>) ?? DEFAULT_GRADES;
    for (const key of Object.keys(DEFAULT_GRADES)) {
      if (!nicheGrades[key]) nicheGrades[key] = DEFAULT_GRADES[key];
    }

    const schoolSlug = ((profile.name as string) ?? inst.name)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    schools.push({
      name: (profile.name as string) ?? inst.name,
      slug: schoolSlug,
      state,
      city: (profile.city as string) ?? "",
      region,
      csRanking: inst.rank,
      nicheRanking: null,
      tuitionInState: (profile.tuitionInState as number) ?? 0,
      tuitionOutOfState: (profile.tuitionOutOfState as number) ?? 0,
      roomAndBoard: (profile.roomAndBoard as number) ?? 0,
      acceptanceRate: (profile.acceptanceRate as number) ?? 0,
      enrollment: (profile.enrollment as number) ?? 0,
      graduationRate: (profile.graduationRate as number) ?? 0,
      medianEarnings6yr: (profile.medianEarnings6yr as number) ?? null,
      medianDebt: (profile.medianDebt as number) ?? null,
      website:
        (profile.website as string) ??
        `https://www.google.com/search?q=${encodeURIComponent(inst.name)}`,
      usnewsUrl: null,
      nicheGrades,
      nicheUrl: `https://www.niche.com/colleges/${nicheSlug}/`,
    });
  }

  schools.sort((a, b) => (a.csRanking as number) - (b.csRanking as number));

  fs.writeFileSync(outPath, JSON.stringify(schools, null, 2) + "\n");
  console.log(`\nWrote ${schools.length} schools to ${outPath}`);

  if (missing.length > 0) {
    console.log(`\nMissing Niche profiles (${missing.length} schools skipped):`);
    for (const m of missing) {
      console.log(`  ${m}`);
    }

    // Write missing slugs for easy batch scraping
    const missingSlugs = missing.map((m) => m.split(" → ")[1]);
    const missingPath = path.join(process.cwd(), "data", "csrankings-missing-profiles.txt");
    fs.writeFileSync(missingPath, missingSlugs.join("\n") + "\n");
    console.log(`\nMissing slugs written to ${missingPath}`);
    console.log("Scrape them with:");
    console.log(
      '  cat data/csrankings-missing-profiles.txt | while read slug; do bun run scripts/scrape-niche-profile.ts "$slug"; sleep 5; done'
    );
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

if (!mergeOnly) {
  const institutions = await scrape();
  fs.writeFileSync(csrDataPath, JSON.stringify(institutions, null, 2) + "\n");
  console.log(`Saved raw data to ${csrDataPath}`);

  if (!scrapeOnly) {
    merge(institutions);
  }
} else {
  if (!fs.existsSync(csrDataPath)) {
    console.error("No csrankings-raw.json found. Run without --merge-only first.");
    process.exit(1);
  }
  const institutions: CsrInstitution[] = JSON.parse(fs.readFileSync(csrDataPath, "utf-8"));
  merge(institutions);
}
