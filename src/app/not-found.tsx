import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-base">
      <p className="mb-1 text-xs text-subtext0">404</p>
      <h2 className="mb-6 text-lg font-medium text-text">Page not found</h2>
      <Link
        href="/"
        className="rounded-lg border border-surface1 px-4 py-2 text-sm text-subtext1 bg-surface0 transition-colors hover:border-surface2 hover:text-text"
      >
        Return home
      </Link>
    </main>
  );
}
