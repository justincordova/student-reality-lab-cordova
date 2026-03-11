import fs from "fs";
import path from "path";
import { SchoolSchema, type School } from "@/lib/data/schema";
import logger from "@/lib/logger";

type RankSource = "csrankings" | "niche";

const cache = new Map<string, School[]>();
const MAX_CACHE_SIZE = 10;

function loadFromFile(filename: string): School[] {
  if (cache.has(filename)) {
    logger.debug(`Loading ${filename} from cache`);
    return cache.get(filename)!;
  }

  const normalizedFilename = path.basename(filename);
  if (normalizedFilename !== filename) {
    throw new Error(`Invalid filename: ${filename}`);
  }

  const jsonPath = path.join(process.cwd(), "data", normalizedFilename);
  let data: unknown;
  try {
    const content = fs.readFileSync(jsonPath, "utf-8");
    data = JSON.parse(content);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to load school data from ${filename}: ${message}`, {
      error: err instanceof Error ? err : new Error(String(err)),
    });
    throw new Error(`Failed to load school data from ${filename}: ${message}`);
  }
  if (!Array.isArray(data)) {
    throw new Error(`Invalid school data in ${filename}: expected an array`);
  }
  const MAX_SCHOOLS = 10000;
  if (data.length > MAX_SCHOOLS) {
    throw new Error(`Too many schools in ${filename}: maximum ${MAX_SCHOOLS} allowed`);
  }
  const schools = data.map((item: unknown, index: number) => {
    if (item === null || typeof item !== "object") {
      throw new Error(`Invalid school record at index ${index} in ${filename}: not an object`);
    }
    const record: Record<string, unknown> = { ...item };
    if (!("csRanking" in record)) record.csRanking = null;
    if (!("nicheRanking" in record)) record.nicheRanking = null;
    const result = SchoolSchema.safeParse(record);
    if (!result.success) {
      throw new Error(
        `Invalid school record at index ${index} in ${filename}: ${result.error.message}`
      );
    }
    return result.data;
  });

  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(filename, schools);
  logger.info(`Loaded ${schools.length} schools from ${filename}`);
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
  const filename = FILE_MAP[source];
  if (!filename) {
    throw new Error(`Invalid ranking source: ${source}`);
  }
  return loadFromFile(filename);
}

export function getSchoolBySlug(slug: string): School | undefined {
  try {
    if (!slug || typeof slug !== "string" || slug.length === 0) {
      logger.warn(`Invalid slug provided to getSchoolBySlug: ${slug}`);
      return undefined;
    }

    logger.debug(`Looking up school with slug: ${slug}`);
    // Search all sources and merge rankings from both lists
    const matches: School[] = [];
    for (const file of Object.values(FILE_MAP)) {
      try {
        const found = loadFromFile(file).find((s) => s.slug === slug);
        if (found) matches.push(found);
      } catch (err) {
        logger.error(`Failed to load from ${file} while searching for slug ${slug}`, {
          error: err instanceof Error ? err : new Error(String(err)),
        });
      }
    }
    if (matches.length === 0) {
      try {
        return loadSchools().find((s) => s.slug === slug);
      } catch (err) {
        logger.error(`Failed to load schools.json while searching for slug ${slug}`, {
          error: err instanceof Error ? err : new Error(String(err)),
        });
        return undefined;
      }
    }
    // Merge: use first match as base, fill in rankings from other matches
    const merged = { ...matches[0] };
    for (const m of matches) {
      if (m.csRanking && !merged.csRanking) merged.csRanking = m.csRanking;
      if (m.nicheRanking && !merged.nicheRanking) merged.nicheRanking = m.nicheRanking;
    }
    logger.debug(`Found school ${merged.name} with slug ${slug}`);
    return merged;
  } catch (err) {
    logger.error(`Error in getSchoolBySlug for slug ${slug}`, {
      error: err instanceof Error ? err : new Error(String(err)),
    });
    return undefined;
  }
}

export * from "./filters";
