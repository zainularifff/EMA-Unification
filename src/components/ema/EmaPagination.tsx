export function EmaPagination({
  page,
  totalPages,
  totalLabel,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalLabel?: string;
  onPageChange: (page: number) => void;
}) {
  const safeTotal = Math.max(1, totalPages || 1);
  const safePage = Math.min(Math.max(1, page || 1), safeTotal);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
      <p className="text-sm font-bold text-slate-600">{totalLabel ?? `Page ${safePage} of ${safeTotal}`}</p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(1)}
          className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          «
        </button>
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          ‹
        </button>
        <span className="grid size-8 place-items-center rounded-lg bg-blue-600 text-sm font-black text-white">{safePage}</span>
        <button
          type="button"
          disabled={safePage >= safeTotal}
          onClick={() => onPageChange(safePage + 1)}
          className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          ›
        </button>
        <button
          type="button"
          disabled={safePage >= safeTotal}
          onClick={() => onPageChange(safeTotal)}
          className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          »
        </button>
      </div>
    </div>
  );
}
