"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Client component — cannot use server-side logger.
  // Replace with an error reporting service (e.g. Sentry) in production.
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-col min-h-screen items-center justify-center bg-base">
      <p className="mb-1 text-xs text-subtext0">500</p>
      <h2 className="mb-6 text-lg font-medium text-text">Something went wrong</h2>
      <button
        onClick={reset}
        className="rounded-lg border border-surface1 px-4 py-2 text-sm text-subtext1 bg-surface0 transition-colors hover:border-surface2 hover:text-text"
      >
        Try again
      </button>
    </main>
  );
}
