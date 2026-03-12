"use client";

import { Fragment } from "react";
import Link from "next/link";
import type { School, NicheGrades } from "@/lib/data/schema";
import { gradeToNumeric } from "@/lib/data/schema";
import { calculatePaybackYears } from "@/lib/data/filters";
import GradeBadge from "./GradeBadge";
import SchoolLogo from "./SchoolLogo";
import HeartButton from "./HeartButton";
import { cn } from "@/utils/cn";

interface CompareTableProps {
  schools: School[];
}

function formatCurrency(n: number | null | undefined): string {
  if (n === null || n === undefined || !isFinite(n) || n === 0) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatPercent(n: number | null | undefined): string {
  if (n === null || n === undefined || !isFinite(n) || n < 0 || n > 1) return "—";
  return `${(n * 100).toFixed(0)}%`;
}

type RowDef = {
  label: string;
  getValue: (s: School) => number | null;
  format: (s: School) => React.ReactNode;
  higherIsBetter: boolean | null;
  section?: string;
};

const GRADE_KEYS: (keyof NicheGrades)[] = [
  "overall",
  "academics",
  "professors",
  "campusFood",
  "dorms",
  "studentLife",
  "safety",
  "diversity",
  "athletics",
  "partyScene",
  "value",
  "location",
  "campus",
];

const GRADE_LABELS: Record<keyof NicheGrades, string> = {
  overall: "Overall",
  academics: "Academics",
  professors: "Professors",
  campusFood: "Campus Food",
  dorms: "Dorms",
  studentLife: "Student Life",
  safety: "Safety",
  diversity: "Diversity",
  athletics: "Athletics",
  partyScene: "Party Scene",
  value: "Value",
  location: "Location",
  campus: "Campus",
};

const ROWS: RowDef[] = [
  // Rankings
  {
    label: "CSRankings",
    section: "Rankings",
    getValue: (s) => s.csRanking,
    format: (s) => (s.csRanking ? `#${s.csRanking}` : "N/A"),
    higherIsBetter: false,
  },
  {
    label: "Niche CS",
    getValue: (s) => s.nicheRanking,
    format: (s) => (s.nicheRanking ? `#${s.nicheRanking}` : "N/A"),
    higherIsBetter: false,
  },
  // Cost
  {
    label: "In-State Tuition",
    section: "Cost",
    getValue: (s) => s.tuitionInState || null,
    format: (s) => formatCurrency(s.tuitionInState),
    higherIsBetter: false,
  },
  {
    label: "Out-of-State Tuition",
    getValue: (s) => s.tuitionOutOfState || null,
    format: (s) => formatCurrency(s.tuitionOutOfState),
    higherIsBetter: false,
  },
  {
    label: "Room & Board",
    getValue: (s) => s.roomAndBoard || null,
    format: (s) => formatCurrency(s.roomAndBoard),
    higherIsBetter: false,
  },
  {
    label: "Total 4-Year (In-State)",
    getValue: (s) => {
      const total = (s.tuitionInState + s.roomAndBoard) * 4;
      return total > 0 ? total : null;
    },
    format: (s) => {
      const total = (s.tuitionInState + s.roomAndBoard) * 4;
      return formatCurrency(total > 0 ? total : null);
    },
    higherIsBetter: false,
  },
  // Outcomes
  {
    label: "Median Earnings (6yr)",
    section: "Outcomes",
    getValue: (s) => s.medianEarnings6yr,
    format: (s) => formatCurrency(s.medianEarnings6yr),
    higherIsBetter: true,
  },
  {
    label: "Median Debt",
    getValue: (s) => s.medianDebt,
    format: (s) => formatCurrency(s.medianDebt),
    higherIsBetter: false,
  },
  {
    label: "ROI / Payback Years",
    getValue: (s) => calculatePaybackYears(s),
    format: (s) => {
      const p = calculatePaybackYears(s);
      return p !== null ? `${p.toFixed(1)} yrs` : "—";
    },
    higherIsBetter: false,
  },
  // Admissions
  {
    label: "Acceptance Rate",
    section: "Admissions",
    getValue: (_s) => null, // no highlight
    format: (s) => formatPercent(s.acceptanceRate),
    higherIsBetter: null,
  },
  {
    label: "Graduation Rate",
    getValue: (s) => s.graduationRate,
    format: (s) => formatPercent(s.graduationRate),
    higherIsBetter: true,
  },
  {
    label: "Enrollment",
    getValue: (_s) => null, // no highlight
    format: (s) => s.enrollment.toLocaleString("en-US"),
    higherIsBetter: null,
  },
];

// Grade rows
const GRADE_ROWS: RowDef[] = GRADE_KEYS.map((key, i) => ({
  label: GRADE_LABELS[key],
  section: i === 0 ? "Niche Grades" : undefined,
  getValue: (s: School) => gradeToNumeric(s.nicheGrades[key]),
  format: (s: School) => <GradeBadge grade={s.nicheGrades[key]} />,
  higherIsBetter: true as boolean | null,
}));

const ALL_ROWS: RowDef[] = [...ROWS, ...GRADE_ROWS];

function getBestIndices(values: (number | null)[], higherIsBetter: boolean): Set<number> {
  const valid = values.filter((v): v is number => v !== null && isFinite(v));
  if (valid.length === 0) return new Set();
  const best = higherIsBetter ? Math.max(...valid) : Math.min(...valid);
  const indices = new Set<number>();
  values.forEach((v, i) => {
    if (v === best) indices.add(i);
  });
  return indices;
}

export default function CompareTable({ schools }: CompareTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-surface0">
      <table className="w-full min-w-[480px] border-collapse">
        <thead>
          <tr className="bg-surface0">
            <th className="text-left px-4 py-3 text-subtext0 text-xs font-bold uppercase tracking-wide w-36 sm:w-48" />
            {schools.map((school) => (
              <th key={school.slug} className="px-4 py-3 text-center">
                <div className="flex flex-col items-center gap-2">
                  <SchoolLogo website={school.website} name={school.name} size={40} />
                  <div>
                    <Link
                      href={`/school/${school.slug}`}
                      className="font-semibold text-sm text-text hover:text-primary transition-colors line-clamp-2"
                    >
                      {school.name}
                    </Link>
                    <div className="flex justify-center mt-1">
                      <HeartButton slug={school.slug} size="sm" />
                    </div>
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ALL_ROWS.map((row, rowIdx) => {
            const values = schools.map((s) => row.getValue(s));
            const bestIndices =
              row.higherIsBetter !== null
                ? getBestIndices(values, row.higherIsBetter)
                : new Set<number>();

            return (
              <Fragment key={row.label}>
                {row.section && (
                  <tr>
                    <td
                      colSpan={schools.length + 1}
                      className="bg-surface0 text-subtext0 text-xs font-bold uppercase tracking-wide px-4 py-2"
                    >
                      {row.section}
                    </td>
                  </tr>
                )}
                <tr className={rowIdx % 2 === 0 ? "bg-base" : "bg-mantle"}>
                  <td className="px-4 py-3 font-medium text-subtext0 text-sm">{row.label}</td>
                  {schools.map((school, colIdx) => {
                    const isBest = bestIndices.has(colIdx);
                    return (
                      <td
                        key={school.slug}
                        className={cn(
                          "px-4 py-3 text-sm text-center",
                          isBest && "bg-green/10 text-green font-bold"
                        )}
                      >
                        {row.format(school)}
                      </td>
                    );
                  })}
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
