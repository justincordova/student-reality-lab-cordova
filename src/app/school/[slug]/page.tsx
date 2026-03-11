import { notFound } from "next/navigation";
import Link from "next/link";
import {
  loadSchoolsBySource,
  getSchoolBySlug,
  calculatePaybackYears,
} from "@/lib/data/loadSchools";
import GradeBadge from "@/components/GradeBadge";
import SchoolLogo from "@/components/SchoolLogo";
import type { Metadata } from "next";
import type { NicheGrades, NicheGradeType } from "@/lib/data/schema";

export async function generateStaticParams() {
  const all = [...loadSchoolsBySource("csrankings"), ...loadSchoolsBySource("niche")];
  const unique = [...new Map(all.map((s) => [s.slug, s])).values()];
  return unique.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const school = getSchoolBySlug(slug);
  return { title: school?.name ?? "Not Found" };
}

function formatCurrency(n: number | null): string {
  if (n === null || typeof n !== "number" || !isFinite(n) || n === 0) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatPercent(n: number): string {
  if (typeof n !== "number" || !isFinite(n) || n < 0 || n > 1) return "—";
  const percent = n * 100;
  return `${Math.round(percent * 10) / 10}%`;
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

export default async function SchoolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (!slug || typeof slug !== "string" || slug.length > 200) {
    notFound();
  }

  const school = getSchoolBySlug(slug);
  if (!school) notFound();

  const totalCostInState = (school.tuitionInState + school.roomAndBoard) * 4;
  const totalCostOutOfState = (school.tuitionOutOfState + school.roomAndBoard) * 4;
  const rawPayback = calculatePaybackYears(school);
  const paybackYears = rawPayback !== null ? rawPayback.toFixed(1) : null;

  const stats: { label: string; value: string }[] = [
    { label: "CSRankings", value: school.csRanking ? `#${school.csRanking}` : "N/A" },
    { label: "Niche CS", value: school.nicheRanking ? `#${school.nicheRanking}` : "N/A" },
    { label: "In-State Tuition", value: formatCurrency(school.tuitionInState) },
    { label: "Out-of-State Tuition", value: formatCurrency(school.tuitionOutOfState) },
    { label: "Room & Board", value: formatCurrency(school.roomAndBoard) },
    {
      label: "Median Earnings (6yr after enrollment)",
      value: school.medianEarnings6yr ? formatCurrency(school.medianEarnings6yr) : "—",
    },
    { label: "Median Debt", value: school.medianDebt ? formatCurrency(school.medianDebt) : "—" },
    { label: "Acceptance Rate", value: formatPercent(school.acceptanceRate) },
    { label: "Graduation Rate", value: formatPercent(school.graduationRate) },
    { label: "Enrollment", value: school.enrollment.toLocaleString("en-US") },
  ];

  if (totalCostInState > 0) {
    stats.push({ label: "Total 4-Year Cost (In-State)", value: formatCurrency(totalCostInState) });
  }
  if (totalCostOutOfState > 0) {
    stats.push({
      label: "Total 4-Year Cost (Out-of-State)",
      value: formatCurrency(totalCostOutOfState),
    });
  }

  return (
    <div id="main-content" className="py-12 space-y-10">
      <div>
        <Link href="/" className="text-blue hover:underline text-sm mb-4 inline-block">
          ← Back to Rankings
        </Link>
        <div className="flex items-center gap-4">
          <SchoolLogo website={school.website} name={school.name} size={64} />
          <div>
            <h1 className="text-3xl font-bold">{school.name}</h1>
            <p className="text-subtext0 text-lg">
              {school.city}, {school.state} · {school.region}
            </p>
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-xl font-bold mb-4">Niche Grades</h2>
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-4">
          {Object.entries(school.nicheGrades).map(([key, grade]) => {
            const gradeKey = key as keyof NicheGrades;
            const gradeValue = grade as NicheGradeType;
            return (
              <GradeBadge key={key} grade={gradeValue} label={GRADE_LABELS[gradeKey]} size="md" />
            );
          })}
        </div>
      </section>

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

      {paybackYears && (
        <section className="p-6 bg-mantle rounded-lg border border-surface0">
          <div className="text-sm text-subtext0 mb-1">
            Payback Period (4-Year Cost of Attendance ÷ Median Earnings 6 Years After Enrollment)
          </div>
          <div className="text-3xl font-bold text-text">
            {paybackYears} <span className="text-lg font-normal text-subtext0">years</span>
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-4">
        <a
          href={school.website}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-blue text-on-primary rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
        >
          School Website
        </a>
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
