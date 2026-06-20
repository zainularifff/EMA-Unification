import type { ReactNode } from "react";

export type EmaTableColumn<Row> = {
  key: string;
  header: ReactNode;
  width?: string;
  align?: "left" | "center" | "right";
  render: (row: Row, index: number) => ReactNode;
};

function alignClass(align?: "left" | "center" | "right") {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
}

export function EmaTableShell({
  title,
  subtitle,
  toolbar,
  children,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {(title || subtitle || toolbar) ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 p-4">
          <div className="min-w-0">
            {title ? <h3 className="text-base font-extrabold text-slate-950">{title}</h3> : null}
            {subtitle ? <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p> : null}
          </div>
          {toolbar ? <div className="shrink-0">{toolbar}</div> : null}
        </div>
      ) : null}
      <div className="overflow-hidden">{children}</div>
    </section>
  );
}

export function EmaTable<Row>({
  columns,
  rows,
  getRowKey,
  loading,
  emptyText = "No records found.",
}: {
  columns: EmaTableColumn<Row>[];
  rows: Row[];
  getRowKey: (row: Row, index: number) => string | number;
  loading?: boolean;
  emptyText?: ReactNode;
}) {
  return (
    <div className="overflow-auto">
      <table className="min-w-full border-separate border-spacing-0 text-sm">
        <thead className="sticky top-0 z-10 bg-slate-100">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                style={column.width ? { width: column.width } : undefined}
                className={`border-b border-slate-200 px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-slate-600 ${alignClass(column.align)}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-sm font-bold text-slate-500">
                Loading data...
              </td>
            </tr>
          ) : rows.length ? (
            rows.map((row, index) => (
              <tr key={getRowKey(row, index)} className="bg-white transition hover:bg-slate-50">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`border-b border-slate-100 px-4 py-3 align-middle text-slate-800 ${alignClass(column.align)}`}
                  >
                    {column.render(row, index)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-sm font-bold text-slate-500">
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
