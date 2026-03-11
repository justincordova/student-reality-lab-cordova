import fs from "fs";
import path from "path";
import { SchoolSchema, type School } from "@/lib/data/schema";

type RankSource = "csrankings" | "niche";

const cache = new Map<string, School[]>();

function loadFromFile(filename: string): School[] {
  if (cache.has(filename)) return cache.get(filename)!;
  const jsonPath = path.join(process.cwd(), "data", filename);
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  const schools = data.map((item: unknown) => {
    const record = item as Record<string, unknown>;
    if (!("csRanking" in record)) record.csRanking = null;
    if (!("nicheRanking" in record)) record.nicheRanking = null;
    return SchoolSchema.parse(record);
  });
  cache.set(filename, schools);
  return schools;
}

const FILE_MAP: Record<RankSource, string> = {
  csrankings: "csrankings-schools.json",
  niche: "niche-schools.json",
};

/** Load all schools (combined from all sources — used for detail pages) */
export function loadSchools(): School[] {
  return loadFromFile("schools.json");
}

/** Load schools for a specific ranking source */
export function loadSchoolsBySource(source: RankSource): School[] {
  return loadFromFile(FILE_MAP[source]);
}

export function getSchoolBySlug(slug: string): School | undefined {
  // Search all sources and merge rankings from both lists
  const matches: School[] = [];
  for (const file of Object.values(FILE_MAP)) {
    const found = loadFromFile(file).find((s) => s.slug === slug);
    if (found) matches.push(found);
  }
  if (matches.length === 0) {
    return loadSchools().find((s) => s.slug === slug);
  }
  // Merge: use first match as base, fill in rankings from other matches
  const merged = { ...matches[0] };
  for (const m of matches) {
    if (m.csRanking && !merged.csRanking) merged.csRanking = m.csRanking;
    if (m.nicheRanking && !merged.nicheRanking) merged.nicheRanking = m.nicheRanking;
  }
  return merged;
}

export * from "./filters";
