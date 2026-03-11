import { notFound } from "next/navigation";
import Link from "next/link";
import { loadSchools, getSchoolBySlug } from "@/lib/data/loadSchools";
import GradeBadge from "@/components/GradeBadge";
import SchoolLogo from "@/components/SchoolLogo";
import type { Metadata } from "next";
import type { NicheGrades, NicheGradeType } from "@/lib/data/schema";

export async function generateStaticParams() {
  return loadSchools().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const school = getSchoolBySlug(slug);
  return { title: school?.name ?? "School" };
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatPercent(n: number) {
  return `${(n * 100).toFixed(1)}%`;
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
  const school = getSchoolBySlug(slug);
  if (!school) notFound();

  const totalCost = (school.tuitionInState + school.roomAndBoard) * 4;
  const paybackYears =
    school.medianEarnings6yr && totalCost > 0
      ? (totalCost / school.medianEarnings6yr).toFixed(1)
      : null;

  const stats = [
    { label: "CS Ranking", value: school.csRanking ? `#${school.csRanking}` : "—" },
    { label: "In-State Tuition", value: formatCurrency(school.tuitionInState) },
    { label: "Out-of-State Tuition", value: formatCurrency(school.tuitionOutOfState) },
    { label: "Room & Board", value: formatCurrency(school.roomAndBoard) },
    { label: "Total 4-Year Cost (In-State)", value: formatCurrency(totalCost) },
    { label: "Acceptance Rate", value: formatPercent(school.acceptanceRate) },
    { label: "Graduation Rate", value: formatPercent(school.graduationRate) },
    { label: "Enrollment", value: school.enrollment.toLocaleString() },
    {
      label: "Median Earnings (6yr)",
      value: school.medianEarnings6yr ? formatCurrency(school.medianEarnings6yr) : "—",
    },
    { label: "Median Debt", value: school.medianDebt ? formatCurrency(school.medianDebt) : "—" },
  ];

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
          {(Object.entries(school.nicheGrades) as [keyof NicheGrades, string][]).map(
            ([key, grade]) => (
              <GradeBadge
                key={key}
                grade={grade as NicheGradeType}
                label={GRADE_LABELS[key]}
                size="md"
              />
            )
          )}
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
            Payback Period (4-Year Cost of Attendance ÷ Median First-Year Earnings)
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
