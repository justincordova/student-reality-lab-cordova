"use client";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 2) {
      pages.push(i);
    }
  }

  const withEllipsis: number[] = [];
  for (let i = 0; i < pages.length; i++) {
    if (i > 0 && pages[i] - pages[i - 1] > 1) {
      withEllipsis.push(-1);
    }
    withEllipsis.push(pages[i]);
  }

  return (
    <div className="flex items-center justify-center gap-2 pt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="px-3 py-2 rounded-lg bg-surface0 text-text hover:bg-surface1 transition-colors disabled:opacity-40 disabled:cursor-default text-sm"
      >
        Prev
      </button>
      {withEllipsis.map((p, i) =>
        p === -1 ? (
          <span key={`e-${i}`} className="px-1 text-subtext0">
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={p === currentPage ? "page" : undefined}
            aria-label={`Page ${p}`}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              p === currentPage
                ? "bg-blue text-on-primary font-bold"
                : "bg-surface0 text-text hover:bg-surface1"
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="px-3 py-2 rounded-lg bg-surface0 text-text hover:bg-surface1 transition-colors disabled:opacity-40 disabled:cursor-default text-sm"
      >
        Next
      </button>
    </div>
  );
}
