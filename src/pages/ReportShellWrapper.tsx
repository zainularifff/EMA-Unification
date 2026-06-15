import { useEffect } from "react";
import ReportDynamicWrapper from "./ReportDynamicWrapper";

const REPORT_SHELL_FIX_STYLE_ID = "ema-report-shell-consistency-fix";

const REPORT_SHELL_FIX_CSS = `
  html.ema-report-page-active,
  body.ema-report-page-active {
    height: 100% !important;
    overflow: hidden !important;
    background: #e8eef6 !important;
  }

  body.ema-report-page-active .ema-shell {
    min-height: 100vh !important;
    height: 100vh !important;
    overflow: hidden !important;
    background: linear-gradient(135deg, #eef3f8 0%, #e8eef6 52%, #dfe7f1 100%) !important;
  }

  body.ema-report-page-active .ema-main {
    min-height: 0 !important;
    height: 100vh !important;
    overflow: hidden !important;
    background: #e8eef6 !important;
  }

  body.ema-report-page-active .ema-topbar {
    flex: 0 0 76px !important;
    background: #3f4955 !important;
    border-bottom: 1px solid rgba(203, 213, 225, 0.42) !important;
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.14) !important;
    backdrop-filter: none !important;
  }

  body.ema-report-page-active .ema-topbar-title h1,
  body.ema-report-page-active .ema-topbar-role-label {
    color: #f8fafc !important;
  }

  body.ema-report-page-active .ema-topbar-title p {
    color: #cbd5e1 !important;
  }

  body.ema-report-page-active .ema-global-search,
  body.ema-report-page-active .ema-icon-btn,
  body.ema-report-page-active .ema-admin-topbar-btn {
    border-color: rgba(148, 163, 184, 0.28) !important;
    background: rgba(15, 23, 42, 0.28) !important;
  }

  body.ema-report-page-active .ema-page {
    flex: 1 1 auto !important;
    min-height: 0 !important;
    height: calc(100vh - 76px) !important;
    overflow: hidden !important;
    padding: 0 !important;
    background: #e8eef6 !important;
  }

  body.ema-report-page-active .settings-module-root.ema-report-module-root,
  body.ema-report-page-active .ema-report-module-root {
    width: 100% !important;
    height: 100% !important;
    min-height: 0 !important;
    max-height: 100% !important;
    overflow: hidden !important;
    padding: 14px !important;
    box-sizing: border-box !important;
    color: #173154 !important;
    background:
      radial-gradient(circle at 8% 0%, rgba(37, 99, 235, 0.075), transparent 24rem),
      radial-gradient(circle at 100% 6%, rgba(8, 126, 164, 0.055), transparent 24rem),
      linear-gradient(135deg, #f6f8fb 0%, #edf2f7 54%, #e5ecf4 100%) !important;
  }

  body.ema-report-page-active .ema-report-module-root .settings-layout.report-settings-layout {
    height: 100% !important;
    min-height: 0 !important;
    max-height: 100% !important;
    align-items: stretch !important;
    overflow: hidden !important;
    grid-template-columns: 292px minmax(0, 1fr) !important;
    gap: 14px !important;
  }

  body.ema-report-page-active .ema-report-module-root .settings-sidebar,
  body.ema-report-page-active .ema-report-module-root .featured-report-nav-panel {
    height: 100% !important;
    min-height: 0 !important;
    max-height: 100% !important;
    overflow: hidden !important;
    align-self: stretch !important;
    position: relative !important;
    top: auto !important;
    display: flex !important;
    flex-direction: column !important;
    border: 1px solid rgba(124, 139, 161, 0.22) !important;
    border-radius: 22px !important;
    background:
      radial-gradient(circle at 6% 0%, rgba(37, 99, 235, 0.08), transparent 13rem),
      linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(250, 252, 255, 0.96)) !important;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.052), inset 0 1px 0 rgba(255, 255, 255, 0.84) !important;
  }

  body.ema-report-page-active .ema-report-module-root .featured-report-nav-panel .panel-head {
    flex: 0 0 auto !important;
    min-height: 102px !important;
    padding: 1rem 1rem 0.82rem !important;
    border-bottom: 1px solid rgba(156, 171, 190, 0.30) !important;
    background: transparent !important;
  }

  body.ema-report-page-active .ema-report-module-root .featured-report-nav-panel .panel-head span {
    display: block !important;
    color: #2558e8 !important;
    font-size: 0.64rem !important;
    font-weight: 900 !important;
    letter-spacing: 0.12em !important;
    text-transform: uppercase !important;
  }

  body.ema-report-page-active .ema-report-module-root .featured-report-nav-panel .panel-head strong {
    display: block !important;
    margin-top: 0.4rem !important;
    color: #0f2746 !important;
    font-size: 1rem !important;
    font-weight: 850 !important;
    line-height: 1.12 !important;
    letter-spacing: -0.035em !important;
  }

  body.ema-report-page-active .ema-report-module-root .featured-report-nav-panel .panel-head small {
    display: block !important;
    margin-top: 0.24rem !important;
    color: #64748b !important;
    font-size: 0.72rem !important;
    font-weight: 680 !important;
  }

  body.ema-report-page-active .ema-report-module-root .featured-report-nav-list,
  body.ema-report-page-active .ema-report-module-root .settings-menu-list {
    flex: 1 1 auto !important;
    min-height: 0 !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
    display: grid !important;
    align-content: start !important;
    gap: 12px !important;
    padding: 0.75rem 0.72rem 1rem !important;
    overscroll-behavior: contain !important;
  }

  body.ema-report-page-active .ema-report-module-root .featured-report-nav-list::-webkit-scrollbar {
    width: 8px !important;
  }

  body.ema-report-page-active .ema-report-module-root .featured-report-nav-list::-webkit-scrollbar-thumb {
    border-radius: 999px !important;
    background: #c9d7ea !important;
  }

  body.ema-report-page-active .ema-report-module-root .featured-report-nav-group {
    position: relative !important;
    display: grid !important;
    gap: 8px !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
  }

  body.ema-report-page-active .ema-report-module-root .featured-report-nav-group + .featured-report-nav-group {
    margin-top: 6px !important;
    padding-top: 12px !important;
    border-top: 1px solid rgba(156, 171, 190, 0.24) !important;
  }

  body.ema-report-page-active .ema-report-module-root .featured-report-nav-group-title.report-nav-section-title,
  body.ema-report-page-active .ema-report-module-root .featured-report-nav-group-title.dynamic-reporting-section-title,
  body.ema-report-page-active .ema-report-module-root .featured-report-nav-group-title.featured-reporting-section-title {
    width: 100% !important;
    min-height: 40px !important;
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
    margin: 0 !important;
    padding: 8px 10px !important;
    border: 1px solid rgba(37, 99, 235, 0.18) !important;
    border-radius: 14px !important;
    color: #2558e8 !important;
    background: linear-gradient(180deg, #f3f7ff 0%, #edf4ff 100%) !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.78) !important;
    font-size: 0.69rem !important;
    font-weight: 900 !important;
    letter-spacing: 0.09em !important;
    text-transform: uppercase !important;
  }

  body.ema-report-page-active .ema-report-module-root .featured-report-nav-group-title.report-nav-section-title::before,
  body.ema-report-page-active .ema-report-module-root .featured-report-nav-group-title.dynamic-reporting-section-title::before,
  body.ema-report-page-active .ema-report-module-root .featured-report-nav-group-title.featured-reporting-section-title::before {
    content: "⌄" !important;
    width: 20px !important;
    height: 20px !important;
    display: inline-grid !important;
    place-items: center !important;
    flex: 0 0 20px !important;
    color: #2558e8 !important;
    border-radius: 999px !important;
    font-size: 0.72rem !important;
    font-weight: 900 !important;
    background: rgba(255,255,255,.64) !important;
  }

  body.ema-report-page-active .ema-report-module-root .featured-report-nav-group-title small {
    margin-left: auto !important;
    min-width: 22px !important;
    height: 22px !important;
    display: inline-grid !important;
    place-items: center !important;
    padding: 0 7px !important;
    color: #2558e8 !important;
    background: rgba(37, 99, 235, 0.10) !important;
    border-radius: 999px !important;
    font-size: 0.62rem !important;
    font-weight: 900 !important;
    letter-spacing: 0 !important;
    text-transform: none !important;
  }

  body.ema-report-page-active .ema-report-module-root .report-nav-children,
  body.ema-report-page-active .ema-report-module-root .featured-report-nav-children,
  body.ema-report-page-active .ema-report-module-root .dynamic-report-nav-children {
    position: relative !important;
    display: grid !important;
    gap: 8px !important;
    margin: 0 0 0 12px !important;
    padding: 2px 0 2px 16px !important;
    border-left: 2px solid rgba(37, 99, 235, 0.14) !important;
  }

  body.ema-report-page-active .ema-report-module-root .featured-report-nav-item,
  body.ema-report-page-active .ema-report-module-root .report-nav-child-item,
  body.ema-report-page-active .ema-report-module-root .dynamic-report-child-item,
  body.ema-report-page-active .ema-report-module-root .featured-report-child-item {
    position: relative !important;
    width: 100% !important;
    min-height: 44px !important;
    display: grid !important;
    grid-template-columns: 32px minmax(0, 1fr) 18px !important;
    align-items: center !important;
    gap: 8px !important;
    padding: 6px 8px !important;
    border: 1px solid transparent !important;
    border-radius: 13px !important;
    color: #173154 !important;
    background: transparent !important;
    box-shadow: none !important;
    text-align: left !important;
    transition: background 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease !important;
  }

  body.ema-report-page-active .ema-report-module-root .featured-report-nav-item::after,
  body.ema-report-page-active .ema-report-module-root .report-nav-child-item::after,
  body.ema-report-page-active .ema-report-module-root .dynamic-report-child-item::after,
  body.ema-report-page-active .ema-report-module-root .featured-report-child-item::after {
    content: "⋮" !important;
    justify-self: end !important;
    color: #64748b !important;
    font-size: 1rem !important;
    line-height: 1 !important;
    font-weight: 900 !important;
    opacity: 0.92 !important;
  }

  body.ema-report-page-active .ema-report-module-root .featured-report-nav-item:hover,
  body.ema-report-page-active .ema-report-module-root .report-nav-child-item:hover,
  body.ema-report-page-active .ema-report-module-root .dynamic-report-child-item:hover {
    border-color: rgba(37, 99, 235, 0.14) !important;
    background: rgba(37, 99, 235, 0.055) !important;
  }

  body.ema-report-page-active .ema-report-module-root .featured-report-nav-item.active,
  body.ema-report-page-active .ema-report-module-root .report-nav-child-item.active,
  body.ema-report-page-active .ema-report-module-root .dynamic-report-child-item.active {
    color: #ffffff !important;
    border-color: transparent !important;
    background: linear-gradient(135deg, #3b82f6 0%, #2558e8 100%) !important;
    box-shadow: 0 12px 24px rgba(37, 99, 235, 0.20) !important;
  }

  body.ema-report-page-active .ema-report-module-root .featured-report-nav-item.active::after,
  body.ema-report-page-active .ema-report-module-root .dynamic-report-child-item.active::after {
    color: rgba(255,255,255,.82) !important;
  }

  body.ema-report-page-active .ema-report-module-root .featured-report-nav-icon {
    width: 30px !important;
    height: 30px !important;
    display: grid !important;
    place-items: center !important;
    border-radius: 9px !important;
    color: var(--pack-accent, #2558e8) !important;
    background: color-mix(in srgb, var(--pack-accent, #2558e8) 12%, #ffffff) !important;
  }

  body.ema-report-page-active .ema-report-module-root .featured-report-nav-icon svg,
  body.ema-report-page-active .ema-report-module-root .featured-report-nav-icon svg * {
    width: 16px !important;
    height: 16px !important;
  }

  body.ema-report-page-active .ema-report-module-root .featured-report-nav-item.active .featured-report-nav-icon,
  body.ema-report-page-active .ema-report-module-root .dynamic-report-child-item.active .featured-report-nav-icon {
    color: #ffffff !important;
    background: rgba(255, 255, 255, 0.18) !important;
  }

  body.ema-report-page-active .ema-report-module-root .featured-report-nav-copy strong {
    display: block !important;
    color: inherit !important;
    font-size: 0.78rem !important;
    font-weight: 850 !important;
    line-height: 1.12 !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  body.ema-report-page-active .ema-report-module-root .featured-report-nav-copy small {
    display: block !important;
    margin-top: 0.12rem !important;
    color: #64748b !important;
    font-size: 0.64rem !important;
    font-weight: 720 !important;
    line-height: 1.18 !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  body.ema-report-page-active .ema-report-module-root .featured-report-nav-item.active .featured-report-nav-copy small,
  body.ema-report-page-active .ema-report-module-root .dynamic-report-child-item.active .featured-report-nav-copy small {
    color: rgba(255, 255, 255, 0.82) !important;
  }

  body.ema-report-page-active .ema-report-module-root .settings-content.report-main-content {
    height: 100% !important;
    min-height: 0 !important;
    max-height: 100% !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
    scrollbar-gutter: stable !important;
    -webkit-overflow-scrolling: touch !important;
  }

  body.ema-report-page-active .ema-report-module-root .settings-content.report-main-content::-webkit-scrollbar {
    width: 10px !important;
  }

  body.ema-report-page-active .ema-report-module-root .settings-content.report-main-content::-webkit-scrollbar-track {
    background: #eef4fb !important;
    border-radius: 999px !important;
  }

  body.ema-report-page-active .ema-report-module-root .settings-content.report-main-content::-webkit-scrollbar-thumb {
    background: #c9d7ea !important;
    border: 2px solid #eef4fb !important;
    border-radius: 999px !important;
  }

  body.ema-report-page-active .ema-report-module-root .report-workspace-shell,
  body.ema-report-page-active .ema-report-module-root .report-workspace-body,
  body.ema-report-page-active .ema-report-module-root .featured-report-layout,
  body.ema-report-page-active .ema-report-module-root .featured-report-main-panel,
  body.ema-report-page-active .ema-report-module-root .report-config-panel,
  body.ema-report-page-active .ema-report-module-root .report-config-panel .config-card {
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    overflow: visible !important;
  }

  body.ema-report-page-active .ema-report-module-root .report-workspace-body {
    padding-bottom: 56px !important;
  }
`;

function installReportShellFixes() {
  if (typeof document === "undefined") return;

  document.documentElement.classList.add("ema-report-page-active");
  document.body.classList.add("ema-report-page-active");
  document.body.classList.remove("ema-report-sidebar-collapsed");

  let style = document.getElementById(REPORT_SHELL_FIX_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = REPORT_SHELL_FIX_STYLE_ID;
    style.textContent = REPORT_SHELL_FIX_CSS;
    document.body.appendChild(style);
  }
}

function removeReportShellFixes() {
  if (typeof document === "undefined") return;

  document.documentElement.classList.remove("ema-report-page-active");
  document.body.classList.remove("ema-report-page-active");
  document.body.classList.remove("ema-report-sidebar-collapsed");
  document.getElementById(REPORT_SHELL_FIX_STYLE_ID)?.remove();
}

export default function ReportShellWrapper() {
  useEffect(() => {
    installReportShellFixes();
    window.requestAnimationFrame(installReportShellFixes);
    const timer = window.setTimeout(installReportShellFixes, 120);

    return () => {
      window.clearTimeout(timer);
      removeReportShellFixes();
    };
  }, []);

  return <ReportDynamicWrapper />;
}
