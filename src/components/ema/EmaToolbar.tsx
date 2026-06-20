import type { ReactNode } from "react";

export function EmaToolbar({
  left,
  search,
  filters,
  right,
}: {
  left?: ReactNode;
  search?: ReactNode;
  filters?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="ema-toolbar space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="ema-toolbar-primary-row flex flex-wrap items-center gap-2">
        {left ? <div className="ema-toolbar-left flex shrink-0 flex-wrap items-center gap-2">{left}</div> : null}
        {search ? <div className="ema-toolbar-search-slot min-w-[16rem] flex-1">{search}</div> : null}
        {right ? <div className="ema-toolbar-right ml-auto flex shrink-0 flex-wrap items-center gap-2">{right}</div> : null}
      </div>
      {filters ? <div className="ema-toolbar-filter-row flex flex-wrap items-end justify-end gap-3 border-t border-slate-100 pt-3">{filters}</div> : null}
    </div>
  );
}

export function EmaButton({
  children,
  onClick,
  disabled,
  variant = "secondary",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  type?: "button" | "submit" | "reset";
}) {
  const variantClass = {
    primary: "border-blue-600 bg-blue-600 text-white hover:bg-blue-700",
    secondary: "border-slate-200 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700",
    ghost: "border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950",
    danger: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
  }[variant];

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`ema-button ema-button-${variant} inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-extrabold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${variantClass}`}
    >
      {children}
    </button>
  );
}

export function EmaSearchInput({
  value,
  onChange,
  placeholder = "Search...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="ema-search-input flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm">
      <span className="text-slate-500">⌕</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400"
      />
    </div>
  );
}

export function EmaFilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="ema-filter-field grid min-w-[10rem] gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
      <span>{label}</span>
      {children}
    </label>
  );
}
