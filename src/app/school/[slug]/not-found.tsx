import Link from "next/link";

export default function SchoolNotFound() {
  return (
    <div id="main-content" className="py-12 text-center">
      <p className="text-6xl font-bold text-overlay0 mb-4">404</p>
      <p className="text-xl font-bold text-text mb-2">School not found</p>
      <p className="text-subtext0 mb-6">This school doesn&apos;t exist in our database.</p>
      <Link
        href="/"
        className="px-4 py-2 bg-blue text-on-primary rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
      >
        Back to Rankings
      </Link>
    </div>
  );
}
