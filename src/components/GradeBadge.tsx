import { cn } from "@/utils/cn";
import type { NicheGradeType } from "@/lib/data/schema";
import { memo } from "react";

interface GradeBadgeProps {
  grade: NicheGradeType;
  label?: string;
  size?: "sm" | "md";
}

function gradeColor(grade: NicheGradeType): string {
  if (!grade) return "bg-surface0 text-subtext0";
  const g = grade.toUpperCase();
  if (g.startsWith("A")) return "bg-green/20 text-green";
  if (g.startsWith("B")) return "bg-blue/20 text-blue";
  if (g.startsWith("C")) return "bg-peach/20 text-peach";
  if (g.startsWith("D")) return "bg-red/20 text-red";
  return "bg-red/20 text-red";
}

function getGradeDescription(grade: NicheGradeType): string {
  if (grade.startsWith("A")) return "Excellent";
  if (grade.startsWith("B")) return "Good";
  if (grade.startsWith("C")) return "Fair";
  if (grade.startsWith("D")) return "Poor";
  return "Failing";
}

export default memo(function GradeBadge({ grade, label, size = "sm" }: GradeBadgeProps) {
  const description = getGradeDescription(grade);
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className={cn(
          "rounded font-bold font-mono inline-flex items-center justify-center",
          gradeColor(grade),
          size === "sm" ? "text-xs px-1.5 py-0.5 min-w-[28px]" : "text-sm px-2 py-1 min-w-[36px]"
        )}
        aria-label={`${grade} grade: ${description}`}
        title={`${grade} grade: ${description}`}
      >
        {grade}
      </span>
      {label && <span className="text-[10px] text-subtext0 whitespace-nowrap">{label}</span>}
    </div>
  );
});
