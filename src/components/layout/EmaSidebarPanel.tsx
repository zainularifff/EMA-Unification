import type { InputHTMLAttributes, ReactNode } from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const sidebarStyles = {
  shell:
    "flex min-h-[calc(100vh-6rem)] min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm",
  header: "shrink-0 border-b border-slate-100 px-3 pb-3 pt-3",
  eyebrow: "text-[0.62rem] font-black uppercase tracking-[0.18em] text-slate-500",
  title: "m-0 mt-1 text-sm font-black tracking-tight text-slate-950",
  description: "m-0 mt-1 text-[0.72rem] font-semibold leading-4 text-slate-500",
  body: "flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden p-3",
  tabs: "grid grid-cols-2 gap-2",
  tabBase:
    "flex min-h-[58px] w-full min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-100",
  tabActive: "border-blue-200 bg-blue-50 text-blue-950 shadow-sm",
  tabIdle: "border-slate-100 bg-white text-slate-700 hover:border-slate-200 hover:bg-slate-50",
  tabIcon: "grid h-7 w-7 shrink-0 place-items-center rounded-md",
  tabIconActive: "bg-white text-blue-600",
  tabIconIdle: "bg-slate-50 text-slate-500",
  tabText: "min-w-0 flex-1 leading-none",
  tabTitle: "block truncate text-xs font-black leading-4 text-slate-950",
  tabDesc: "mt-0.5 block truncate text-[0.64rem] font-semibold leading-3 text-slate-500",
  searchWrap:
    "flex h-9 min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-slate-500 shadow-sm focus-within:border-blue-200 focus-within:ring-2 focus-within:ring-blue-50",
  searchIcon: "grid shrink-0 place-items-center",
  searchInput:
    "min-w-0 flex-1 border-0 bg-transparent text-xs font-semibold text-slate-700 outline-none placeholder:text-slate-400",
  actionButton:
    "inline-flex h-8 w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50",
  actionIcon: "grid shrink-0 place-items-center text-slate-500",
  tree: "min-h-0 flex-1 overflow-auto rounded-lg border border-slate-100 bg-slate-50/40 p-1",
  treeRow:
    "flex min-h-8 w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-black transition focus:outline-none focus:ring-2 focus:ring-blue-100",
  treeRowActive: "bg-white text-blue-700 shadow-sm",
  treeRowIdle: "text-slate-700 hover:bg-white",
  treeToggle: "grid h-4 w-4 shrink-0 place-items-center text-slate-400",
  treeIcon: "grid h-5 w-5 shrink-0 place-items-center text-slate-500",
  treeLabel: "min-w-0 flex-1 truncate",
  treeMeta: "shrink-0 text-[0.65rem] font-black text-slate-400",
};

type EmaModuleSidebarProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
};

type EmaSidebarTabsProps = {
  children: ReactNode;
  className?: string;
};

type EmaSidebarTabButtonProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
};

type EmaSidebarSearchProps = InputHTMLAttributes<HTMLInputElement> & {
  icon?: ReactNode;
  wrapperClassName?: string;
};

type EmaSidebarButtonProps = {
  icon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
};

type EmaSidebarTreeProps = {
  children: ReactNode;
  className?: string;
};

type EmaSidebarTreeRowProps = {
  icon?: ReactNode;
  toggle?: ReactNode;
  label: ReactNode;
  meta?: ReactNode;
  active?: boolean;
  depth?: number;
  onClick?: () => void;
  className?: string;
};

export function EmaModuleSidebar({ eyebrow, title, description, children, actions, className }: EmaModuleSidebarProps) {
  return (
    <aside className={cx(sidebarStyles.shell, className)}>
      <div className={sidebarStyles.header}>
        {eyebrow ? <span className={sidebarStyles.eyebrow}>{eyebrow}</span> : null}
        <h2 className={sidebarStyles.title}>{title}</h2>
        {description ? <p className={sidebarStyles.description}>{description}</p> : null}
        {actions ? <div className="mt-3 grid gap-2">{actions}</div> : null}
      </div>

      <div className={sidebarStyles.body}>{children}</div>
    </aside>
  );
}

export function EmaSidebarTabs({ children, className }: EmaSidebarTabsProps) {
  return <div className={cx(sidebarStyles.tabs, className)}>{children}</div>;
}

export function EmaSidebarTabButton({ icon, title, description, active, onClick, className }: EmaSidebarTabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(sidebarStyles.tabBase, active ? sidebarStyles.tabActive : sidebarStyles.tabIdle, className)}
    >
      {icon ? (
        <span className={cx(sidebarStyles.tabIcon, active ? sidebarStyles.tabIconActive : sidebarStyles.tabIconIdle)}>{icon}</span>
      ) : null}
      <span className={sidebarStyles.tabText}>
        <strong className={sidebarStyles.tabTitle}>{title}</strong>
        {description ? <small className={sidebarStyles.tabDesc}>{description}</small> : null}
      </span>
    </button>
  );
}

export function EmaSidebarSearch({ icon, wrapperClassName, className, ...props }: EmaSidebarSearchProps) {
  return (
    <label className={cx(sidebarStyles.searchWrap, wrapperClassName)}>
      {icon ? <span className={sidebarStyles.searchIcon}>{icon}</span> : null}
      <input {...props} className={cx(sidebarStyles.searchInput, className)} />
    </label>
  );
}

export function EmaSidebarButton({ icon, children, onClick, disabled, className }: EmaSidebarButtonProps) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cx(sidebarStyles.actionButton, className)}>
      {icon ? <span className={sidebarStyles.actionIcon}>{icon}</span> : null}
      {children}
    </button>
  );
}

export function EmaSidebarTree({ children, className }: EmaSidebarTreeProps) {
  return <div className={cx(sidebarStyles.tree, className)}>{children}</div>;
}

export function EmaSidebarTreeRow({ icon, toggle, label, meta, active, depth = 0, onClick, className }: EmaSidebarTreeRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(sidebarStyles.treeRow, active ? sidebarStyles.treeRowActive : sidebarStyles.treeRowIdle, className)}
      style={{ paddingLeft: `${8 + depth * 12}px` }}
    >
      {toggle ? <span className={sidebarStyles.treeToggle}>{toggle}</span> : <span className="h-4 w-4 shrink-0" />}
      {icon ? <span className={sidebarStyles.treeIcon}>{icon}</span> : null}
      <span className={sidebarStyles.treeLabel}>{label}</span>
      {meta ? <span className={sidebarStyles.treeMeta}>{meta}</span> : null}
    </button>
  );
}
