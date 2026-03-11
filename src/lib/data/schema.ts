import { z } from "zod/v4";

export const NicheGrade = z.enum([
  "A+",
  "A",
  "A-",
  "B+",
  "B",
  "B-",
  "C+",
  "C",
  "C-",
  "D+",
  "D",
  "D-",
  "F",
]);
export type NicheGradeType = z.infer<typeof NicheGrade>;

export const NicheGradesSchema = z.object({
  overall: NicheGrade,
  academics: NicheGrade,
  value: NicheGrade,
  diversity: NicheGrade,
  campus: NicheGrade,
  athletics: NicheGrade,
  partyScene: NicheGrade,
  professors: NicheGrade,
  location: NicheGrade,
  dorms: NicheGrade,
  campusFood: NicheGrade,
  studentLife: NicheGrade,
  safety: NicheGrade,
});
export type NicheGrades = z.infer<typeof NicheGradesSchema>;

export const SchoolSchema = z.object({
  name: z.string(),
  slug: z.string(),
  state: z.string().length(2).nullable(),
  city: z.string(),
  region: z
    .enum(["Northeast", "Southeast", "Midwest", "Southwest", "West", "Mid-Atlantic", "Pacific"])
    .nullable(),
  csRanking: z.number().int().min(1).nullable(),
  nicheRanking: z.number().int().min(1).nullable(),
  tuitionInState: z.number().nonnegative(),
  tuitionOutOfState: z.number().nonnegative(),
  roomAndBoard: z.number().nonnegative(),
  acceptanceRate: z.number().min(0).max(1),
  enrollment: z.number().int().nonnegative(),
  graduationRate: z.number().min(0).max(1),
  medianEarnings6yr: z.number().nullable(),
  medianDebt: z.number().nullable(),
  website: z.string().url(),
  usnewsUrl: z.string().url().nullable(),
  nicheGrades: NicheGradesSchema,
  nicheUrl: z.string().url().nullable(),
});
export type School = z.infer<typeof SchoolSchema>;

export const ResourceSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  description: z.string(),
});
export type Resource = z.infer<typeof ResourceSchema>;

export const ChatFiltersSchema = z.object({
  sortBy: z.string().optional(),
  rankSource: z.enum(["csrankings", "niche"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  state: z.string().optional(),
  region: z.string().optional(),
  search: z.string().optional(),
});
export type ChatFilters = z.infer<typeof ChatFiltersSchema>;

/** Convert a Niche letter grade to a numeric value for sorting (A+=13, F=1) */
export function gradeToNumeric(grade: NicheGradeType): number {
  const map: Record<string, number> = {
    "A+": 13,
    A: 12,
    "A-": 11,
    "B+": 10,
    B: 9,
    "B-": 8,
    "C+": 7,
    C: 6,
    "C-": 5,
    "D+": 4,
    D: 3,
    "D-": 2,
    F: 1,
  };
  return map[grade] ?? 0;
}
