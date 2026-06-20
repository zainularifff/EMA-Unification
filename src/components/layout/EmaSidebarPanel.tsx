import type { InputHTMLAttributes, ReactNode } from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const sidebarStyles = {
  shell:
    "flex min-h-[calc(100vh-6rem)] min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]",
  header: "shrink-0 px-4 pb-2 pt-4",
  eyebrow: "text-[0.64rem] font-black uppercase tracking-[0.18em] text-slate-500",
  title: "m-0 mt-1 text-[0.95rem] font-black leading-5 tracking-tight text-slate-950",
  description: "m-0 mt-1 max-w-[15rem] text-[0.73rem] font-semibold leading-4 text-slate-500",
  headerActions: "mt-3 grid gap-2",
  body: "flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden px-4 pb-4 pt-2",
  tabs:
    "grid h-12 min-w-0 grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-inner shadow-slate-100/60",
  tabBase:
    "flex h-10 w-full min-w-0 items-center justify-center gap-2 rounded-xl border border-transparent px-2 text-center transition focus:outline-none focus:ring-2 focus:ring-blue-100",
  tabActive: "bg-white text-blue-700 shadow-sm shadow-slate-200/80",
  tabIdle: "bg-transparent text-slate-700 hover:bg-white/70",
  tabIcon: "grid h-7 w-7 shrink-0 place-items-center rounded-lg",
  tabIconActive: "bg-blue-50 text-blue-600",
  tabIconIdle: "bg-white text-slate-500 shadow-sm shadow-slate-100",
  tabText: "min-w-0 leading-none",
  tabTitle: "block truncate text-xs font-black leading-4",
  searchWrap:
    "flex h-10 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-500 shadow-sm shadow-slate-100/80 focus-within:border-blue-200 focus-within:ring-2 focus-within:ring-blue-50",
  searchIcon: "grid shrink-0 place-items-center",
  searchInput:
    "min-w-0 flex-1 border-0 bg-transparent text-xs font-semibold text-slate-700 outline-none placeholder:text-slate-400",
  actionButton:
    "inline-flex h-8 w-full min-w-0 items-center justify-start gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-xs font-black text-slate-700 shadow-sm shadow-slate-100 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50",
  actionIcon: "grid shrink-0 place-items-center text-slate-500",
  tree: "min-h-0 flex-1 overflow-auto rounded-xl bg-white p-0",
  treeRow:
    "flex min-h-10 w-full min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs font-black transition focus:outline-none focus:ring-2 focus:ring-blue-100",
  treeRowActive: "border-blue-400 bg-blue-50 text-slate-950 shadow-sm shadow-blue-100/70",
  treeRowIdle: "border-transparent bg-slate-50/80 text-slate-700 hover:border-slate-200 hover:bg-white",
  treeToggle: "grid h-4 w-4 shrink-0 place-items-center text-slate-400",
  treeIcon: "grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-white text-slate-500 shadow-sm shadow-slate-100",
  treeLabel: "min-w-0 flex-1 truncate text-slate-950",
  treeMeta: "shrink-0 text-[0.7rem] font-black text-slate-500",
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
        {actions ? <div className={sidebarStyles.headerActions}>{actions}</div> : null}
      </div>

      <div className={sidebarStyles.body}>{children}</div>
    </aside>
  );
}

export function EmaSidebarTabs({ children, className }: EmaSidebarTabsProps) {
  return <div className={cx(sidebarStyles.tabs, className)}>{children}</div>;
}

export function EmaSidebarTabButton({ icon, title, active, onClick, className }: EmaSidebarTabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(sidebarStyles.tabBase, active ? sidebarStyles.tabActive : sidebarStyles.tabIdle, className)}
      title={title}
    >
      {icon ? (
        <span className={cx(sidebarStyles.tabIcon, active ? sidebarStyles.tabIconActive : sidebarStyles.tabIconIdle)}>{icon}</span>
      ) : null}
      <span className={sidebarStyles.tabText}>
        <strong className={sidebarStyles.tabTitle}>{title}</strong>
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
      style={{ paddingLeft: `${10 + depth * 14}px` }}
    >
      {toggle ? <span className={sidebarStyles.treeToggle}>{toggle}</span> : <span className="h-4 w-4 shrink-0" />}
      {icon ? <span className={sidebarStyles.treeIcon}>{icon}</span> : null}
      <span className={sidebarStyles.treeLabel}>{label}</span>
      {meta ? <span className={sidebarStyles.treeMeta}>{meta}</span> : null}
    </button>
  );
}
