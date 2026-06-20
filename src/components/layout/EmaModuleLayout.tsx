import type { ReactNode } from "react";
export { EmaModuleSidebar, EmaSidebarButton, EmaSidebarSearch, EmaSidebarTabButton, EmaSidebarTabs, EmaSidebarTree, EmaSidebarTreeRow } from "./EmaSidebarPanel";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const layoutStyles = {
  root: "min-w-0 h-full flex-1 overflow-auto px-3 py-3 text-slate-900",
  grid: "grid min-w-0 items-stretch gap-3 lg:grid-cols-[16.25rem_minmax(0,1fr)]",
  content: "min-w-0",
  stack: "grid min-w-0 gap-3",
  panel: "min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm",
  headerShell: "min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm",
  headerTop: "flex min-w-0 flex-wrap items-start justify-between gap-3",
  headerText: "min-w-0",
  eyebrow: "text-[0.65rem] font-black uppercase tracking-wider text-slate-500",
  title: "m-0 text-base font-black tracking-tight text-slate-950",
  description: "m-0 mt-1 text-xs font-semibold leading-5 text-slate-500",
  actions: "flex flex-wrap items-center gap-2",
  headerChildren: "mt-3",
  kpiGrid: "grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5",
  kpiCard: "min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm",
  toolbar: "grid min-w-0 gap-2 lg:grid-cols-[auto_minmax(14rem,1fr)_auto] lg:items-center",
  toolbarLeft: "flex min-w-0 flex-wrap items-center gap-2",
  toolbarCenter: "min-w-0",
  toolbarRight: "flex min-w-0 flex-wrap items-center justify-end gap-2",
  tableOuter: "min-w-0 overflow-auto rounded-xl border border-slate-200 bg-white",
  stateShell: "grid min-h-[10rem] place-items-center rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center",
  stateInner: "grid justify-items-center gap-2",
  spinner: "h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-500",
  stateTitle: "text-[0.7rem] font-black uppercase tracking-[0.18em] text-slate-400",
  emptyTitle: "text-sm font-black text-slate-950",
  stateDescription: "m-0 text-xs font-semibold text-slate-500",
  pagination: "flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-500",
};

type EmaModuleLayoutProps = {
  children: ReactNode;
  section?: string;
  className?: string;
};

type EmaModuleContentProps = {
  children: ReactNode;
  className?: string;
};

type EmaModulePanelProps = {
  children: ReactNode;
  className?: string;
};

type EmaModuleHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

type EmaModuleToolbarProps = {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
};

type EmaModuleTableShellProps = {
  children: ReactNode;
  minWidth?: number | string;
  className?: string;
};

type EmaStateBlockProps = {
  title?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
};

export function EmaModuleLayout({ children, section, className }: EmaModuleLayoutProps) {
  return (
    <main className={cx(layoutStyles.root, className)} data-section={section}>
      <div className={layoutStyles.grid}>{children}</div>
    </main>
  );
}

export function EmaModuleContent({ children, className }: EmaModuleContentProps) {
  return <section className={cx(layoutStyles.content, className)}>{children}</section>;
}

export function EmaModuleStack({ children, className }: EmaModulePanelProps) {
  return <div className={cx(layoutStyles.stack, className)}>{children}</div>;
}

export function EmaModulePanel({ children, className }: EmaModulePanelProps) {
  return <section className={cx(layoutStyles.panel, className)}>{children}</section>;
}

export function EmaModuleHeader({ eyebrow, title, description, actions, children, className }: EmaModuleHeaderProps) {
  return (
    <section className={cx(layoutStyles.headerShell, className)}>
      <div className={layoutStyles.headerTop}>
        <div className={layoutStyles.headerText}>
          {eyebrow ? <span className={layoutStyles.eyebrow}>{eyebrow}</span> : null}
          <h2 className={layoutStyles.title}>{title}</h2>
          {description ? <p className={layoutStyles.description}>{description}</p> : null}
        </div>
        {actions ? <div className={layoutStyles.actions}>{actions}</div> : null}
      </div>
      {children ? <div className={layoutStyles.headerChildren}>{children}</div> : null}
    </section>
  );
}

export function EmaKpiGrid({ children, className }: EmaModulePanelProps) {
  return <div className={cx(layoutStyles.kpiGrid, className)}>{children}</div>;
}

export function EmaKpiCard({ children, className }: EmaModulePanelProps) {
  return <div className={cx(layoutStyles.kpiCard, className)}>{children}</div>;
}

export function EmaModuleToolbar({ left, center, right, children, className }: EmaModuleToolbarProps) {
  return (
    <div className={cx(layoutStyles.toolbar, className)}>
      {children ? children : null}
      {left ? <div className={layoutStyles.toolbarLeft}>{left}</div> : null}
      {center ? <div className={layoutStyles.toolbarCenter}>{center}</div> : null}
      {right ? <div className={layoutStyles.toolbarRight}>{right}</div> : null}
    </div>
  );
}

export function EmaTableShell({ children, minWidth = 720, className }: EmaModuleTableShellProps) {
  const resolvedMinWidth = typeof minWidth === "number" ? `${minWidth}px` : minWidth;
  return (
    <div className={cx(layoutStyles.tableOuter, className)}>
      <div style={{ minWidth: resolvedMinWidth }}>{children}</div>
    </div>
  );
}

export function EmaLoadingState({ title = "LOADING DATA...", description, children, className }: EmaStateBlockProps) {
  return (
    <div className={cx(layoutStyles.stateShell, className)}>
      <div className={layoutStyles.stateInner}>
        <span className={layoutStyles.spinner} />
        <strong className={layoutStyles.stateTitle}>{title}</strong>
        {description ? <p className={layoutStyles.stateDescription}>{description}</p> : null}
        {children}
      </div>
    </div>
  );
}

export function EmaEmptyState({ title = "No data found", description, children, className }: EmaStateBlockProps) {
  return (
    <div className={cx(layoutStyles.stateShell, className)}>
      <div className={layoutStyles.stateInner}>
        <strong className={layoutStyles.emptyTitle}>{title}</strong>
        {description ? <p className={layoutStyles.stateDescription}>{description}</p> : null}
        {children}
      </div>
    </div>
  );
}

export function EmaPaginationBar({ children, className }: EmaModulePanelProps) {
  return <div className={cx(layoutStyles.pagination, className)}>{children}</div>;
}
