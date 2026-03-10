export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-base">
      <div
        role="status"
        aria-live="polite"
        className="size-4 animate-spin rounded-full border-2 border-surface1 border-t-overlay0"
      />
    </main>
  );
}
