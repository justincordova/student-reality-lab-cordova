import { loadSchoolsBySource } from "@/lib/data/loadSchools";
import CompareTable from "@/components/CompareTable";
import Link from "next/link";
import type { School } from "@/lib/data/schema";

export const metadata = { title: "Compare Schools" };

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ schools?: string }>;
}) {
  const { schools: slugsParam } = await searchParams;
  const slugs = (slugsParam ?? "").split(",").filter(Boolean).slice(0, 3);

  const all = [...loadSchoolsBySource("csrankings"), ...loadSchoolsBySource("niche")];
  const unique = new Map(all.map((s) => [s.slug, s]));
  const schools = slugs.map((slug) => unique.get(slug)).filter((s): s is School => s !== undefined);

  return (
    <div id="main-content" className="py-12">
      <Link href="/" className="text-primary hover:underline text-sm mb-6 inline-block">
        ← Back to Rankings
      </Link>
      <h1 className="text-3xl font-bold mb-8">Compare Schools</h1>
      {schools.length < 2 ? (
        <div className="text-center py-16 text-subtext0">
          <p className="text-lg mb-4">Select at least 2 schools from the rankings to compare.</p>
          <Link
            href="/"
            className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Browse Schools
          </Link>
        </div>
      ) : (
        <CompareTable schools={schools} />
      )}
    </div>
  );
}
