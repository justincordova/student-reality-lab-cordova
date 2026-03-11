import { Suspense } from "react";
import { loadSchools } from "@/lib/data/loadSchools";
import SchoolList from "@/components/SchoolList";
import { SchoolCardSkeleton } from "@/components/LoadingSkeleton";

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
  const schools = loadSchools();

  return (
    <div id="main-content" className="py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Top CS Programs</h1>
        <p className="text-subtext0 text-lg">
          Compare Computer Science programs by ranking, ROI, campus life, dining, and more.
        </p>
      </div>
      <Suspense fallback={<SchoolListFallback />}>
        <SchoolList schools={schools} />
      </Suspense>
    </div>
  );
}
