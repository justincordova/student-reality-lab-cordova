import LoadingSkeleton from "@/components/LoadingSkeleton";

export default function SchoolLoading() {
  return (
    <div className="py-12 space-y-10">
      <div>
        <LoadingSkeleton className="w-32 h-4 rounded mb-4" />
        <div className="flex items-center gap-4">
          <LoadingSkeleton className="w-16 h-16 rounded-lg" />
          <div className="space-y-2">
            <LoadingSkeleton className="w-64 h-8 rounded" />
            <LoadingSkeleton className="w-40 h-5 rounded" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-4">
        {[...Array(13)].map((_, i) => (
          <LoadingSkeleton key={i} className="w-full h-12 rounded" />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <LoadingSkeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
