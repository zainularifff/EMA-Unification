import type { ReactNode } from "react";

type Tone = "blue" | "emerald" | "amber" | "rose" | "violet" | "slate";

const toneClass: Record<Tone, string> = {
  blue: "bg-blue-50 text-blue-700 ring-blue-100",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  rose: "bg-rose-50 text-rose-700 ring-rose-100",
  violet: "bg-violet-50 text-violet-700 ring-violet-100",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
};

export function EmaKpiGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{children}</div>;
}

export function EmaKpiCard({
  title,
  value,
  note,
  icon,
  tone = "blue",
  active,
  onClick,
}: {
  title: string;
  value: ReactNode;
  note?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  active?: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={[
        "group flex min-h-20 w-full items-center gap-3 rounded-xl border bg-white p-3 text-left shadow-sm transition",
        active ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200 hover:border-blue-200 hover:shadow-md",
      ].join(" ")}
    >
      {icon ? (
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ring-1 ${toneClass[tone]}`}>{icon}</span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.7rem] font-black uppercase tracking-[0.12em] text-slate-500">{title}</span>
        <span className="mt-1 block text-xl font-black leading-none text-slate-950">{value}</span>
        {note ? <span className="mt-1 block truncate text-xs font-semibold text-slate-500">{note}</span> : null}
      </span>
    </Tag>
  );
}
