import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const MIN_MATCHED = 60;

const dataPath = path.join(process.cwd(), "data", "schools.json");
const schools: Array<Record<string, unknown>> = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

console.log(`Loaded ${schools.length} schools from data/schools.json`);

// ---------------------------------------------------------------------------
// Name matching helpers
// ---------------------------------------------------------------------------

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/[.,\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// CSRankings uses abbreviated/different names. Map CSRankings → our canonical name.
// Key: CSRankings name (lowercased normalized), Value: our school name
// Keys are the result of passing the CSRankings name through normalize().
// To derive a key: normalize(csrName) where normalize lowercases, strips "the ",
// replaces [.,\-] with space, then collapses whitespace.
const CSR_ALIASES: Record<string, string> = {
  // MIT: "Massachusetts Inst. of Technology" → normalize → "massachusetts inst of technology"
  "massachusetts inst of technology": "Massachusetts Institute of Technology",
  // UC schools: "Univ. of California - San Diego" → "univ of california san diego"
  "univ of california berkeley": "University of California Berkeley",
  "univ of california san diego": "University of California San Diego",
  "univ of california los angeles": "University of California Los Angeles",
  "univ of california irvine": "University of California Irvine",
  "univ of california davis": "University of California Davis",
  "univ of california santa barbara": "University of California Santa Barbara",
  "univ of california santa cruz": "University of California Santa Cruz",
  "univ of california riverside": "University of California Riverside",
  // Illinois: "Univ. of Illinois at Urbana-Champaign" → "univ of illinois at urbana champaign"
  "univ of illinois at urbana champaign": "University of Illinois Urbana-Champaign",
  // Maryland: "Univ. of Maryland - College Park" → "univ of maryland college park"
  "univ of maryland college park": "University of Maryland",
  // UMass: "Univ. of Massachusetts Amherst" → "univ of massachusetts amherst"
  "univ of massachusetts amherst": "University of Massachusetts Amherst",
  // Penn State
  "pennsylvania state university": "Penn State University",
  // NC State
  "north carolina state university": "NC State University",
  // RIT: "Rochester Inst. of Technology" → "rochester inst of technology"
  "rochester inst of technology": "Rochester Institute of Technology",
  // Caltech: "California Inst. of Technology" → "california inst of technology"
  "california inst of technology": "California Institute of Technology",
  // UNC Chapel Hill
  "university of north carolina": "University of North Carolina Chapel Hill",
  // Wisconsin: "University of Wisconsin - Madison" → "university of wisconsin madison"
  "university of wisconsin madison": "University of Wisconsin-Madison",
  // UIC
  "university of illinois at chicago": "University of Illinois Chicago",
  // Nebraska-Lincoln
  "university of nebraska": "University of Nebraska-Lincoln",
  // Indiana University Bloomington
  "indiana university": "Indiana University Bloomington",
};

// Build a lookup from our school names
const ourSchoolsByNormalized = new Map<string, string>();
for (const school of schools) {
  const name = school["name"] as string;
  ourSchoolsByNormalized.set(normalize(name), name);
}

function matchCsrName(csrName: string): string | null {
  const norm = normalize(csrName);

  // 1. Check alias map
  if (CSR_ALIASES[norm]) return CSR_ALIASES[norm];

  // 2. Exact normalized match against our schools
  if (ourSchoolsByNormalized.has(norm)) return ourSchoolsByNormalized.get(norm)!;

  // 3. Try replacing "univ." abbreviation
  const expanded = norm.replace(/\buniv\b/g, "university");
  if (ourSchoolsByNormalized.has(expanded)) return ourSchoolsByNormalized.get(expanded)!;

  // 4. Try replacing "inst." abbreviation
  const expanded2 = expanded.replace(/\binst\b/g, "institute");
  if (ourSchoolsByNormalized.has(expanded2)) return ourSchoolsByNormalized.get(expanded2)!;

  return null;
}

// ---------------------------------------------------------------------------
// Scrape
// ---------------------------------------------------------------------------

const browser = await chromium.launch({ headless: true });
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

console.log("Ranking table found. Extracting institutions...");

// Extract all institutions with their ranks
// Each institution has a rank row with td.rank-cell for the rank number
const csrInstitutions = await page.$$eval("#ranking tbody tr td.rank-cell", (cells) => {
  return cells.map((cell) => {
    const row = cell.parentElement!;
    const nameTd = row.querySelectorAll("td")[1];
    // Find the span with cursor:pointer — that's the institution name span
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
    // Fallback: strip the ► from the full td text
    if (!name) {
      name = (nameTd?.textContent?.trim() ?? "").replace(/^►\s*/, "").trim();
    }
    const rank = parseInt(cell.textContent?.trim() ?? "0", 10);
    return { rank, name };
  });
});

await browser.close();

console.log(`Scraped ${csrInstitutions.length} institutions from CSRankings.`);

if (csrInstitutions.length < 50) {
  console.error(`Too few institutions scraped (${csrInstitutions.length}). Aborting.`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Match and write
// ---------------------------------------------------------------------------

// Build a map: our school name → csRanking
const rankBySchoolName = new Map<string, number>();
const unmatched: string[] = [];

for (const inst of csrInstitutions) {
  const matched = matchCsrName(inst.name);
  if (matched) {
    // If a school appears multiple times (tied ranks), keep the first/lower rank
    if (!rankBySchoolName.has(matched)) {
      rankBySchoolName.set(matched, inst.rank);
    }
  } else {
    unmatched.push(`${inst.rank}. ${inst.name}`);
  }
}

let matchedCount = 0;
const updatedSchools = schools.map((school) => {
  const name = school["name"] as string;
  const csRanking = rankBySchoolName.get(name) ?? null;
  if (csRanking !== null) matchedCount++;
  return { ...school, csRanking };
});

console.log(`\nMatched ${matchedCount} of ${schools.length} schools.`);

if (unmatched.length > 0) {
  console.log(`\nCSRankings institutions not matched to our schools (${unmatched.length}):`);
  for (const u of unmatched.slice(0, 30)) {
    console.log(`  ${u}`);
  }
}

const ourUnmatched = schools
  .map((s) => s["name"] as string)
  .filter((n) => !rankBySchoolName.has(n));
if (ourUnmatched.length > 0) {
  console.log(`\nOur schools with no CSRankings match (csRanking = null, ${ourUnmatched.length}):`);
  for (const n of ourUnmatched) {
    console.log(`  ${n}`);
  }
}

if (matchedCount < MIN_MATCHED) {
  console.error(
    `\nFewer than ${MIN_MATCHED} schools matched (got ${matchedCount}). Aborting write.`
  );
  process.exit(1);
}

fs.writeFileSync(dataPath, JSON.stringify(updatedSchools, null, 2) + "\n", "utf-8");
console.log(`\nSuccessfully wrote csRanking values to ${dataPath}`);
