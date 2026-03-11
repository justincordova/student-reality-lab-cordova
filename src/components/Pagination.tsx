"use client";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages));
  const safeTotalPages = Math.max(1, totalPages);

  if (safeTotalPages <= 1) return null;

  const pages: number[] = [];
  for (let i = 1; i <= safeTotalPages; i++) {
    if (i === 1 || i === safeTotalPages || Math.abs(i - safeCurrentPage) <= 2) {
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
        onClick={() => onPageChange(safeCurrentPage - 1)}
        disabled={safeCurrentPage <= 1}
        className="px-3 py-2 rounded-lg bg-surface0 text-text hover:bg-surface1 transition-colors disabled:opacity-40 disabled:cursor-default text-sm"
        aria-label="Go to previous page"
      >
        Prev
      </button>
      {withEllipsis.map((p, i) =>
        p === -1 ? (
          <span key={`e-${i}`} className="px-1 text-subtext0" aria-label="ellipsis">
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={p === safeCurrentPage ? "page" : undefined}
            aria-label={`Page ${p}`}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              p === safeCurrentPage
                ? "bg-blue text-on-primary font-bold"
                : "bg-surface0 text-text hover:bg-surface1"
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(safeCurrentPage + 1)}
        disabled={safeCurrentPage >= safeTotalPages}
        className="px-3 py-2 rounded-lg bg-surface0 text-text hover:bg-surface1 transition-colors disabled:opacity-40 disabled:cursor-default text-sm"
        aria-label="Go to next page"
      >
        Next
      </button>
    </div>
  );
}
