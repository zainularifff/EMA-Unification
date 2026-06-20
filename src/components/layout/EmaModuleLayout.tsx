import type { ReactNode } from "react";

type EmaModuleLayoutProps = {
  children: ReactNode;
  section?: string;
  className?: string;
};

type EmaSidebarPanelProps = {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

type EmaContentPanelProps = {
  children: ReactNode;
  className?: string;
};

type EmaHeroPanelProps = {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
};

type EmaDataPanelProps = {
  children: ReactNode;
  className?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function EmaModuleLayout({ children, section, className }: EmaModuleLayoutProps) {
  return (
    <main className={cx("settings-module-root ema-module-root ema-settings-pro ema-page", className)} data-section={section}>
      <div className="settings-layout ema-module-layout">{children}</div>
    </main>
  );
}

export function EmaSidebarPanel({ eyebrow, title, description, children, className }: EmaSidebarPanelProps) {
  return (
    <aside className={cx("settings-menu ema-sidebar-panel ema-panel-surface", className)}>
      <div className="panel-head">
        <span>{eyebrow}</span>
        <strong>{title}</strong>
        {description && <small>{description}</small>}
      </div>
      <div className="ema-sidebar-content">{children}</div>
    </aside>
  );
}

export function EmaContentPanel({ children, className }: EmaContentPanelProps) {
  return <section className={cx("settings-content ema-content-panel", className)}>{children}</section>;
}

export function EmaHeroPanel({ eyebrow, title, description, children, className }: EmaHeroPanelProps) {
  return (
    <section className={cx("ema-hero-panel", className)}>
      <div className="ema-hero-copy">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function EmaKpiGrid({ children, className }: EmaDataPanelProps) {
  return <div className={cx("ema-kpi-grid", className)}>{children}</div>;
}

export function EmaDataPanel({ children, className }: EmaDataPanelProps) {
  return <section className={cx("ema-data-panel", className)}>{children}</section>;
}

export function EmaLoadingState({ label = "LOADING DATA..." }: { label?: string }) {
  return <div className="ema-loading-state" aria-live="polite" data-label={label} />;
}
