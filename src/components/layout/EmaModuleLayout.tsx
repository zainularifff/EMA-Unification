import type { ReactNode } from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type EmaModuleLayoutProps = {
  children: ReactNode;
  section?: string;
  className?: string;
};

type EmaModuleSidebarProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
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
    <main
      className={cx("min-w-0 h-full flex-1 overflow-auto px-3 py-3 text-slate-900", className)}
      data-section={section}
    >
      <div className="grid min-w-0 items-stretch gap-3 lg:grid-cols-[16.25rem_minmax(0,1fr)]">{children}</div>
    </main>
  );
}

export function EmaModuleSidebar({ eyebrow, title, description, children, actions, className }: EmaModuleSidebarProps) {
  return (
    <aside className={cx("min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm", className)}>
      <div className="mb-3 grid gap-1">
        {eyebrow ? <span className="text-[0.65rem] font-black uppercase tracking-wider text-slate-500">{eyebrow}</span> : null}
        <strong className="text-sm font-black text-slate-950">{title}</strong>
        {description ? <small className="text-xs font-semibold leading-5 text-slate-500">{description}</small> : null}
        {actions ? <div className="mt-2">{actions}</div> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </aside>
  );
}

export function EmaModuleContent({ children, className }: EmaModuleContentProps) {
  return <section className={cx("min-w-0", className)}>{children}</section>;
}

export function EmaModuleStack({ children, className }: EmaModulePanelProps) {
  return <div className={cx("grid min-w-0 gap-3", className)}>{children}</div>;
}

export function EmaModulePanel({ children, className }: EmaModulePanelProps) {
  return <section className={cx("min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm", className)}>{children}</section>;
}

export function EmaModuleHeader({ eyebrow, title, description, actions, children, className }: EmaModuleHeaderProps) {
  return (
    <section className={cx("min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm", className)}>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? <span className="text-[0.65rem] font-black uppercase tracking-wider text-slate-500">{eyebrow}</span> : null}
          <h2 className="m-0 text-base font-black tracking-tight text-slate-950">{title}</h2>
          {description ? <p className="m-0 mt-1 text-xs font-semibold leading-5 text-slate-500">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </section>
  );
}

export function EmaKpiGrid({ children, className }: EmaModulePanelProps) {
  return <div className={cx("grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5", className)}>{children}</div>;
}

export function EmaKpiCard({ children, className }: EmaModulePanelProps) {
  return <div className={cx("min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm", className)}>{children}</div>;
}

export function EmaModuleToolbar({ left, center, right, children, className }: EmaModuleToolbarProps) {
  return (
    <div className={cx("grid min-w-0 gap-2 lg:grid-cols-[auto_minmax(14rem,1fr)_auto] lg:items-center", className)}>
      {children ? children : null}
      {left ? <div className="flex min-w-0 flex-wrap items-center gap-2">{left}</div> : null}
      {center ? <div className="min-w-0">{center}</div> : null}
      {right ? <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">{right}</div> : null}
    </div>
  );
}

export function EmaTableShell({ children, minWidth = 720, className }: EmaModuleTableShellProps) {
  const resolvedMinWidth = typeof minWidth === "number" ? `${minWidth}px` : minWidth;
  return (
    <div className={cx("min-w-0 overflow-auto rounded-xl border border-slate-200 bg-white", className)}>
      <div style={{ minWidth: resolvedMinWidth }}>{children}</div>
    </div>
  );
}

export function EmaLoadingState({ title = "LOADING DATA...", description, children, className }: EmaStateBlockProps) {
  return (
    <div className={cx("grid min-h-[10rem] place-items-center rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center", className)}>
      <div className="grid justify-items-center gap-2">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-500" />
        <strong className="text-[0.7rem] font-black uppercase tracking-[0.18em] text-slate-400">{title}</strong>
        {description ? <p className="m-0 text-xs font-semibold text-slate-500">{description}</p> : null}
        {children}
      </div>
    </div>
  );
}

export function EmaEmptyState({ title = "No data found", description, children, className }: EmaStateBlockProps) {
  return (
    <div className={cx("grid min-h-[10rem] place-items-center rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center", className)}>
      <div className="grid justify-items-center gap-2">
        <strong className="text-sm font-black text-slate-950">{title}</strong>
        {description ? <p className="m-0 text-xs font-semibold text-slate-500">{description}</p> : null}
        {children}
      </div>
    </div>
  );
}

export function EmaPaginationBar({ children, className }: EmaModulePanelProps) {
  return <div className={cx("flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-500", className)}>{children}</div>;
}
