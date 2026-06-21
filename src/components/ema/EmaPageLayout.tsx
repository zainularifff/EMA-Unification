import type { ReactNode } from "react";

type EmaPageLayoutProps = {
  title?: string;
  subtitle?: string;
  sidebar?: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
  fullHeight?: boolean;
  showHeader?: boolean;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function EmaPageLayout({
  title,
  subtitle,
  sidebar,
  headerActions,
  children,
  fullHeight = true,
  showHeader = false,
}: EmaPageLayoutProps) {
  const hasHeader = showHeader && Boolean(title || subtitle || headerActions);

  return (
    <section className={cx("min-h-0 bg-slate-100 text-slate-950", fullHeight ? "h-full overflow-hidden" : "min-h-full")}> 
      {hasHeader ? (
        <header className="sticky top-0 z-20 flex min-h-[4.5rem] items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-5 shadow-sm backdrop-blur">
          <div className="min-w-0">
            {title ? <h1 className="truncate text-xl font-extrabold tracking-tight text-slate-950">{title}</h1> : null}
            {subtitle ? <p className="mt-1 truncate text-sm font-medium text-slate-500">{subtitle}</p> : null}
          </div>
          {headerActions ? <div className="flex shrink-0 items-center gap-2">{headerActions}</div> : null}
        </header>
      ) : null}

      <div className={cx("flex min-h-0 gap-3 overflow-hidden p-3", fullHeight ? (hasHeader ? "h-[calc(100%-4.5rem)]" : "h-full") : "") }>
        {sidebar ? <aside className="w-80 shrink-0 overflow-hidden">{sidebar}</aside> : null}
        <main className="min-w-0 flex-1 overflow-hidden">
          <div className={cx(fullHeight ? "h-full overflow-auto pr-1" : "pr-1")}>{children}</div>
        </main>
      </div>
    </section>
  );
}

export function EmaSection({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const hasHeader = Boolean(eyebrow || title || description || action);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {hasHeader ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(14rem,17rem)_minmax(0,1fr)] lg:items-stretch">
          <div className="flex min-w-0 flex-col justify-center">
            {eyebrow ? <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-slate-500">{eyebrow}</p> : null}
            {title ? <h2 className="mt-1 text-base font-extrabold leading-tight text-slate-950">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm font-medium leading-snug text-slate-600">{description}</p> : null}
            {action ? <div className="mt-3">{action}</div> : null}
          </div>
          <div className="min-w-0">{children}</div>
        </div>
      ) : (
        children
      )}
    </section>
  );
}
