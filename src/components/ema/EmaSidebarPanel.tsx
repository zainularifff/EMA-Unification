import type { ReactNode } from "react";
import { Search } from "lucide-react";

type EmaSidebarTab = {
  id: string;
  label: string;
  icon?: ReactNode;
};

type EmaSidebarPanelProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  tabs?: EmaSidebarTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  action?: ReactNode;
  children?: ReactNode;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function EmaSidebarPanel({
  eyebrow,
  title,
  description,
  tabs = [],
  activeTab,
  onTabChange,
  searchValue,
  searchPlaceholder = "Search...",
  onSearchChange,
  action,
  children,
}: EmaSidebarPanelProps) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 rounded-2xl bg-slate-50 p-4">
        {eyebrow ? <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">{eyebrow}</p> : null}
        <h2 className="mt-1 text-lg font-black leading-tight text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-xs font-semibold leading-snug text-slate-500">{description}</p> : null}
      </div>

      {tabs.length ? (
        <nav className="mb-4 grid shrink-0 grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1" role="tablist" aria-label={`${title} navigation`}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={cx(
                  "flex min-w-0 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-black transition",
                  isActive ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:bg-white hover:text-slate-900"
                )}
                onClick={() => onTabChange?.(tab.id)}
              >
                {tab.icon ? <span className={cx("grid size-6 shrink-0 place-items-center rounded-lg", isActive ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500")}>{tab.icon}</span> : null}
                <span className="min-w-0 truncate">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      ) : null}

      {onSearchChange ? (
        <label className="relative mb-3 block shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={searchValue ?? ""}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          />
        </label>
      ) : null}

      {action ? <div className="mb-3 shrink-0">{action}</div> : null}

      <div className="min-h-0 flex-1 overflow-auto pr-1">
        <div className="space-y-1">{children}</div>
      </div>
    </div>
  );
}

export function EmaSidebarActionButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function EmaSidebarTreeRow({
  children,
  active,
  depth = 0,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  depth?: number;
  onClick?: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onClick?.();
      }}
      style={{ paddingLeft: `${0.15 + depth * 0.75}rem` }}
      className={cx(
        "group flex min-h-11 w-full min-w-0 items-center gap-2 rounded-2xl border px-3 py-2 text-left text-sm font-black transition",
        active ? "border-blue-300 bg-blue-50 text-blue-700 shadow-sm" : "border-transparent bg-white text-slate-700 hover:border-slate-200 hover:bg-slate-50"
      )}
    >
      {children}
    </div>
  );
}
