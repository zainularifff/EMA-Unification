const STYLE_ID = "ema-hardware-runtime-fix-styles";

const css = `
@keyframes ema-spin { to { transform: rotate(360deg); } }

html body .ema-module-root .soft-btn,
html body .ema-module-root .ema-sidebar-create-branch {
  width: 100% !important;
  min-height: 2.45rem !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: .5rem !important;
  border: 1px solid #d9e5f4 !important;
  border-radius: .85rem !important;
  background: #fff !important;
  color: #0f172a !important;
  padding: 0 .85rem !important;
  font-size: .78rem !important;
  font-weight: 900 !important;
}

html body .ema-module-root .ema-sidebar-tree-node {
  position: relative !important;
  overflow: visible !important;
}
html body .ema-module-root .ema-sidebar-tree-menu-wrap {
  position: relative !important;
  margin-left: auto !important;
  z-index: 40 !important;
}
html body .ema-module-root .ema-sidebar-tree-menu-btn {
  width: 1.9rem !important;
  height: 1.9rem !important;
  display: inline-grid !important;
  place-items: center !important;
  border: 0 !important;
  border-radius: .65rem !important;
  background: transparent !important;
  color: #334155 !important;
  padding: 0 !important;
}
html body .ema-module-root .ema-sidebar-tree-menu {
  position: absolute !important;
  top: calc(100% + .35rem) !important;
  right: 0 !important;
  z-index: 1000 !important;
  width: 12rem !important;
  display: grid !important;
  gap: .25rem !important;
  border: 1px solid #d9e5f4 !important;
  border-radius: .9rem !important;
  background: #fff !important;
  padding: .45rem !important;
  box-shadow: 0 18px 42px rgba(15,23,42,.16) !important;
}
html body .ema-module-root .ema-sidebar-tree-menu button {
  width: 100% !important;
  min-height: 2.1rem !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  border: 0 !important;
  border-radius: .65rem !important;
  background: transparent !important;
  color: #0f172a !important;
  padding: 0 .65rem !important;
  text-align: left !important;
  font-size: .78rem !important;
  font-weight: 850 !important;
}
html body .ema-module-root .ema-sidebar-tree-menu button:hover {
  background: #eff6ff !important;
  color: #1d4ed8 !important;
}
html body .ema-module-root .ema-sidebar-tree-menu button.danger {
  color: #dc2626 !important;
}

html body .ema-module-root .ema-right-panel {
  height: 100% !important;
  overflow: hidden !important;
  border: 1px solid #d7e2ef !important;
  border-radius: 1rem !important;
  background: #fff !important;
  padding: 0 !important;
  box-shadow: 0 14px 32px rgba(15,23,42,.08) !important;
}
html body .ema-module-root .ema-right-device {
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  min-height: 0 !important;
}
html body .ema-module-root .ema-right-header {
  display: grid !important;
  grid-template-columns: 2.35rem minmax(0,1fr) 2rem !important;
  align-items: center !important;
  gap: .65rem !important;
  padding: .85rem !important;
  border-bottom: 1px solid #e2e8f0 !important;
  background: linear-gradient(180deg,#fff 0%,#f8fbff 100%) !important;
}
html body .ema-module-root .ema-right-icon,
html body .ema-module-root .ema-action-icon {
  width: 2.35rem !important;
  height: 2.35rem !important;
  display: inline-grid !important;
  place-items: center !important;
  border-radius: .8rem !important;
  background: #eff6ff !important;
  color: #2563eb !important;
}
html body .ema-module-root .ema-right-title h3,
html body .ema-module-root .ema-right-title p {
  margin: 0 !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}
html body .ema-module-root .ema-right-title h3 { font-size: .95rem !important; font-weight: 950 !important; }
html body .ema-module-root .ema-right-title p { margin-top: .2rem !important; color: #64748b !important; font-size: .76rem !important; font-weight: 750 !important; }
html body .ema-module-root .ema-right-close {
  width: 2rem !important;
  height: 2rem !important;
  display: inline-grid !important;
  place-items: center !important;
  border: 0 !important;
  border-radius: .65rem !important;
  background: #f1f5f9 !important;
  color: #64748b !important;
}
html body .ema-module-root .ema-action-list {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  display: grid !important;
  align-content: start !important;
  gap: .65rem !important;
  overflow: auto !important;
  padding: .85rem !important;
}
html body .ema-module-root .ema-action-item {
  width: 100% !important;
  min-height: 4.05rem !important;
  display: grid !important;
  grid-template-columns: 2.35rem minmax(0,1fr) !important;
  align-items: center !important;
  gap: .75rem !important;
  border: 1px solid #dbe7f5 !important;
  border-radius: .95rem !important;
  background: #fff !important;
  color: #0f172a !important;
  padding: .75rem !important;
  text-align: left !important;
  box-shadow: 0 8px 18px rgba(15,23,42,.045) !important;
}
html body .ema-module-root .ema-action-item strong,
html body .ema-module-root .ema-action-item span { display: block !important; overflow: hidden !important; text-overflow: ellipsis !important; }
html body .ema-module-root .ema-action-item strong { font-size: .84rem !important; font-weight: 950 !important; white-space: nowrap !important; }
html body .ema-module-root .ema-action-item span { margin-top: .18rem !important; color: #64748b !important; font-size: .73rem !important; font-weight: 700 !important; line-height: 1.25 !important; }

html body .ema-detail-drawer-overlay,
html body .ema-detail-form-overlay {
  position: fixed !important;
  inset: 0 !important;
  z-index: 9995 !important;
  display: grid !important;
  place-items: center !important;
  background: rgba(15,23,42,.52) !important;
  padding: 1rem !important;
  backdrop-filter: blur(5px) !important;
}
html body .ema-detail-drawer,
html body .ema-detail-form-modal {
  width: min(72rem, calc(100vw - 2rem)) !important;
  max-height: calc(100dvh - 2rem) !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  border: 1px solid #dbe7f5 !important;
  border-radius: 1.15rem !important;
  background: #fff !important;
  box-shadow: 0 32px 80px rgba(15,23,42,.32) !important;
}
html body .ema-detail-drawer-header {
  flex: 0 0 auto !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 1rem !important;
  padding: 1rem !important;
  border-bottom: 1px solid #e2e8f0 !important;
  background: linear-gradient(135deg,#0f172a 0%,#1d4ed8 100%) !important;
  color: #fff !important;
}
html body .ema-detail-title-wrap { display: flex !important; align-items: center !important; gap: .8rem !important; min-width: 0 !important; }
html body .ema-detail-device-icon { width: 2.6rem !important; height: 2.6rem !important; display: grid !important; place-items: center !important; border-radius: .85rem !important; background: rgba(255,255,255,.14) !important; }
html body .ema-detail-title-wrap h2,
html body .ema-detail-title-wrap p { margin: 0 !important; }
html body .ema-detail-title-wrap h2 { margin-top: .15rem !important; font-size: 1.05rem !important; font-weight: 950 !important; }
html body .ema-detail-title-wrap p { margin-top: .18rem !important; font-size: .78rem !important; font-weight: 700 !important; opacity: .86 !important; }
html body .ema-detail-eyebrow { font-size: .68rem !important; font-weight: 900 !important; letter-spacing: .12em !important; text-transform: uppercase !important; opacity: .8 !important; }
html body .ema-detail-header-actions { display: inline-flex !important; align-items: center !important; gap: .6rem !important; }
html body .ema-detail-close { width: 2.25rem !important; height: 2.25rem !important; display: grid !important; place-items: center !important; border: 0 !important; border-radius: .75rem !important; background: rgba(255,255,255,.14) !important; color: #fff !important; }
html body .ema-detail-summary-grid { flex: 0 0 auto !important; display: grid !important; grid-template-columns: repeat(4,minmax(0,1fr)) !important; gap: .75rem !important; padding: .85rem 1rem !important; border-bottom: 1px solid #e2e8f0 !important; background: #f8fbff !important; }
html body .ema-detail-summary-card,
html body .ema-detail-card { border: 1px solid #dbe7f5 !important; border-radius: .95rem !important; background: #fff !important; padding: .75rem !important; }
html body .ema-detail-tabs { flex: 0 0 auto !important; display: flex !important; flex-wrap: wrap !important; gap: .45rem !important; padding: .75rem 1rem !important; border-bottom: 1px solid #e2e8f0 !important; }
html body .ema-detail-tabs button { min-height: 2rem !important; border: 1px solid #dbe7f5 !important; border-radius: 999px !important; background: #fff !important; color: #475569 !important; padding: 0 .75rem !important; font-size: .75rem !important; font-weight: 850 !important; }
html body .ema-detail-tabs button.is-active { border-color: #93c5fd !important; background: #eff6ff !important; color: #1d4ed8 !important; }
html body .ema-detail-body { flex: 1 1 auto !important; min-height: 0 !important; overflow: auto !important; padding: 1rem !important; background: #fff !important; }
html body .ema-detail-section-grid { display: grid !important; grid-template-columns: repeat(2,minmax(0,1fr)) !important; gap: .85rem !important; }
html body .ema-detail-card h3 { margin: 0 0 .7rem !important; font-size: .86rem !important; font-weight: 950 !important; }
html body .ema-detail-item { display: grid !important; grid-template-columns: minmax(8rem,.75fr) minmax(0,1fr) !important; gap: .75rem !important; padding: .45rem 0 !important; border-bottom: 1px solid #f1f5f9 !important; }
html body .ema-detail-item span { color: #64748b !important; font-size: .68rem !important; font-weight: 900 !important; letter-spacing: .08em !important; text-transform: uppercase !important; }
html body .ema-detail-item strong { color: #0f172a !important; font-size: .84rem !important; font-weight: 900 !important; }
html body .ema-detail-form-footer { flex: 0 0 auto !important; display: flex !important; justify-content: flex-end !important; gap: .5rem !important; padding: .85rem 1rem !important; border-top: 1px solid #e2e8f0 !important; background: #f8fafc !important; }

@media (max-width: 900px) {
  html body .ema-detail-summary-grid,
  html body .ema-detail-section-grid { grid-template-columns: 1fr !important; }
}
`;

if (typeof document !== "undefined") {
  const existing = document.getElementById(STYLE_ID);
  if (existing) {
    existing.textContent = css;
  } else {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }
}

export {};
