"use client";

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Blog pages" className="pagination">
      <button
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        type="button"
      >
        ← <span>Newer</span>
      </button>
      <p aria-live="polite">
        <span>{String(page).padStart(2, "0")}</span> /{" "}
        {String(totalPages).padStart(2, "0")}
      </p>
      <button
        aria-label="Next page"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        type="button"
      >
        <span>Older</span> →
      </button>
    </nav>
  );
}
