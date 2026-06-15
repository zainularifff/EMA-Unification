import { useEffect } from "react";
import ReportDynamicWrapper from "./ReportDynamicWrapper";

const REPORT_GRID_STYLE_ID = "ema-report-main-card-grid-layout";

const REPORT_GRID_CSS = `
  .ema-report-module-root .settings-layout.report-settings-layout {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    grid-template-rows: auto minmax(0, 1fr) !important;
    gap: 16px !important;
    height: 100% !important;
    min-height: 0 !important;
    overflow: hidden !important;
  }

  .ema-report-module-root .featured-report-nav-panel {
    position: relative !important;
    width: 100% !important;
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  .ema-report-module-root .featured-report-nav-panel .panel-head {
    display: none !important;
  }

  .ema-report-module-root .featured-report-nav-list {
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
    display: grid !important;
    gap: 18px !important;
    padding: 0 !important;
  }

  .ema-report-module-root .featured-report-nav-group {
    display: grid !important;
    gap: 10px !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  .ema-report-module-root .featured-report-nav-group-title.report-nav-section-title {
    width: 100% !important;
    min-height: auto !important;
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
    padding: 0 !important;
    margin: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    color: #667996 !important;
    cursor: default !important;
    pointer-events: none !important;
  }

  .ema-report-module-root .featured-report-nav-group-title span:not(.featured-report-nav-group-icon) {
    color: #667996 !important;
    font-size: 0.72rem !important;
    font-weight: 900 !important;
    letter-spacing: 0.12em !important;
    text-transform: uppercase !important;
  }

  .ema-report-module-root .featured-report-nav-group-title small {
    margin-left: auto !important;
    color: var(--pack-accent, #2563eb) !important;
    font-size: 0.72rem !important;
    font-weight: 900 !important;
    letter-spacing: 0 !important;
    text-transform: none !important;
  }

  .ema-report-module-root .featured-report-nav-group-icon {
    width: 16px !important;
    height: 16px !important;
    color: var(--pack-accent, #2563eb) !important;
  }

  .ema-report-module-root .report-nav-children,
  .ema-report-module-root .featured-report-nav-children,
  .ema-report-module-root .dynamic-report-nav-children {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(190px, 1fr)) !important;
    gap: 12px !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    position: static !important;
  }

  .ema-report-module-root .featured-report-nav-item.report-nav-child-item {
    min-height: 86px !important;
    width: 100% !important;
    display: grid !important;
    grid-template-columns: 46px minmax(0, 1fr) !important;
    align-items: center !important;
    gap: 12px !important;
    padding: 14px 16px !important;
    border: 1px solid #d7e3f3 !important;
    border-radius: 18px !important;
    background: #ffffff !important;
    box-shadow: 0 10px 22px rgba(15, 35, 71, 0.045) !important;
    color: #17325d !important;
    text-align: left !important;
  }

  .ema-report-module-root .featured-report-nav-item.report-nav-child-item:hover {
    transform: translateY(-1px) !important;
    border-color: color-mix(in srgb, var(--pack-accent, #2563eb) 30%, #d7e3f3) !important;
    box-shadow: 0 14px 28px rgba(15, 35, 71, 0.08) !important;
  }

  .ema-report-module-root .featured-report-nav-item.report-nav-child-item.active {
    color: #ffffff !important;
    border-color: transparent !important;
    background: linear-gradient(135deg, var(--pack-accent, #2563eb) 0%, color-mix(in srgb, var(--pack-accent, #2563eb) 76%, #071d3b) 100%) !important;
    box-shadow: 0 18px 32px color-mix(in srgb, var(--pack-accent, #2563eb) 26%, transparent) !important;
  }

  .ema-report-module-root .featured-report-nav-icon {
    width: 42px !important;
    height: 42px !important;
    border-radius: 14px !important;
    display: grid !important;
    place-items: center !important;
    color: var(--pack-accent, #2563eb) !important;
    background: color-mix(in srgb, var(--pack-accent, #2563eb) 12%, #ffffff) !important;
  }

  .ema-report-module-root .featured-report-nav-item.active .featured-report-nav-icon {
    color: #ffffff !important;
    background: rgba(255, 255, 255, 0.18) !important;
  }

  .ema-report-module-root .featured-report-nav-copy strong {
    display: block !important;
    color: inherit !important;
    font-size: 0.92rem !important;
    font-weight: 900 !important;
    line-height: 1.1 !important;
    white-space: normal !important;
  }

  .ema-report-module-root .featured-report-nav-copy small {
    display: block !important;
    margin-top: 4px !important;
    color: inherit !important;
    opacity: 0.72 !important;
    font-size: 0.72rem !important;
    font-weight: 800 !important;
    line-height: 1.15 !important;
    white-space: normal !important;
  }

  .ema-report-module-root .featured-report-nav-badge {
    display: none !important;
  }

  .ema-report-module-root .settings-content.report-main-content {
    min-height: 0 !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
    padding-right: 2px !important;
  }

  .ema-report-module-root .settings-hero.users-hero,
  .ema-report-module-root .selected-pack-toolbar,
  .ema-report-module-root .report-breadcrumb-panel,
  .ema-report-module-root .dynamic-report-breadcrumb-tabs,
  .ema-report-module-root .report-live-summary-panel,
  .ema-report-module-root .client-rnr-summary-panel,
  .ema-report-module-root .report-analysis-panel {
    display: none !important;
  }

  .ema-report-module-root .content-shell.report-workspace-shell {
    margin: 0 !important;
  }

  .ema-report-module-root .featured-report-layout {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) minmax(360px, 420px) !important;
    gap: 16px !important;
    align-items: start !important;
  }

  .ema-report-module-root .report-pack-command-card {
    min-height: 140px !important;
  }

  .ema-report-module-root .report-pack-command-card .report-pack-kpi-row {
    display: none !important;
  }

  .ema-report-module-root .report-config-panel {
    position: sticky !important;
    top: 0 !important;
  }

  .ema-report-module-root .config-actions {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 10px !important;
  }

  @media (max-width: 1480px) {
    .ema-report-module-root .report-nav-children,
    .ema-report-module-root .featured-report-nav-children,
    .ema-report-module-root .dynamic-report-nav-children {
      grid-template-columns: repeat(3, minmax(190px, 1fr)) !important;
    }
  }

  @media (max-width: 1120px) {
    .ema-report-module-root .report-nav-children,
    .ema-report-module-root .featured-report-nav-children,
    .ema-report-module-root .dynamic-report-nav-children,
    .ema-report-module-root .featured-report-layout {
      grid-template-columns: 1fr !important;
    }

    .ema-report-module-root .report-config-panel {
      position: static !important;
    }
  }
`;

function installReportGridStyles() {
  if (typeof document === "undefined") return;
  let style = document.getElementById(REPORT_GRID_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = REPORT_GRID_STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = REPORT_GRID_CSS;
}

export default function ReportGridWrapper() {
  useEffect(() => {
    installReportGridStyles();
    window.requestAnimationFrame(installReportGridStyles);
    const timer = window.setTimeout(installReportGridStyles, 120);
    return () => window.clearTimeout(timer);
  }, []);

  return <ReportDynamicWrapper />;
}
