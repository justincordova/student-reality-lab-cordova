import { Suspense } from "react";
import { loadSchoolsBySource } from "@/lib/data/loadSchools";
import SchoolList from "@/components/SchoolList";
import { SchoolCardSkeleton } from "@/components/LoadingSkeleton";
import PageTransition from "@/components/PageTransition";

function SchoolListFallback() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <SchoolCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function HomePage() {
  const csrankingsSchools = loadSchoolsBySource("csrankings");
  const nicheSchools = loadSchoolsBySource("niche");

  return (
    <PageTransition>
      <div id="main-content" className="pt-6 pb-12">
        <Suspense fallback={<SchoolListFallback />}>
          <SchoolList csrankingsSchools={csrankingsSchools} nicheSchools={nicheSchools} />
        </Suspense>
      </div>
    </PageTransition>
  );
}
