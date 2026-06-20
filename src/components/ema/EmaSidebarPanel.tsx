import type { ReactNode } from "react";

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
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="shrink-0">
        {eyebrow ? <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-slate-500">{eyebrow}</p> : null}
        <h2 className="mt-1 text-base font-extrabold leading-tight text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-xs font-medium leading-snug text-slate-600">{description}</p> : null}
      </div>

      {tabs.length ? (
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange?.(tab.id)}
                className={[
                  "flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-extrabold transition",
                  isActive
                    ? "bg-white text-blue-700 shadow-sm ring-1 ring-blue-100"
                    : "text-slate-700 hover:bg-white hover:text-blue-700",
                ].join(" ")}
              >
                {tab.icon ? <span className="grid size-5 place-items-center text-slate-600">{tab.icon}</span> : null}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {onSearchChange ? (
        <div className="mt-3 flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-500 shadow-sm">
          <span className="text-sm">⌕</span>
          <input
            value={searchValue ?? ""}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400"
          />
        </div>
      ) : null}

      {action ? <div className="mt-3 shrink-0">{action}</div> : null}

      <div className="ema-sidebar-content mt-3 min-h-0 flex-1 overflow-auto">{children}</div>
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
      className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-950 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
    <button
      type="button"
      onClick={onClick}
      style={{ paddingLeft: `${0.75 + depth * 0.9}rem` }}
      className={[
        "mb-1 flex min-h-10 w-full items-center gap-2 rounded-xl pr-3 text-left text-sm font-extrabold transition",
        active ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200" : "bg-slate-50 text-slate-950 hover:bg-slate-100",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
