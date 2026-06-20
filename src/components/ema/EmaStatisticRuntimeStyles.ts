const STYLE_ID = "ema-statistic-runtime-styles";

const css = `
html body .ema-module-root .ema-stat-workbench {
  width: 100% !important;
  min-height: calc(100dvh - 170px) !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 1rem !important;
  padding: 1rem !important;
  border: 1px solid #dbe7f5 !important;
  border-radius: 1.15rem !important;
  background: #ffffff !important;
  box-shadow: 0 16px 38px rgba(15, 23, 42, .06) !important;
  overflow: hidden !important;
}

html body .ema-module-root .ema-stat-commandbar {
  width: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: .85rem !important;
  padding: .9rem 1rem !important;
  border: 1px solid #e2eaf5 !important;
  border-radius: 1rem !important;
  background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%) !important;
}

html body .ema-module-root .ema-stat-commandbar h3 {
  margin: 0 !important;
  color: #0f172a !important;
  font-size: 1rem !important;
  font-weight: 900 !important;
  letter-spacing: -.02em !important;
  line-height: 1.15 !important;
}

html body .ema-module-root .ema-stat-commandbar p {
  margin: .22rem 0 0 !important;
  color: #64748b !important;
  font-size: .72rem !important;
  font-weight: 850 !important;
  letter-spacing: .08em !important;
  text-transform: uppercase !important;
  line-height: 1.2 !important;
}

html body .ema-module-root .ema-stat-refresh-btn {
  min-height: 2.45rem !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: .45rem !important;
  padding: 0 .95rem !important;
  border: 1px solid #bfd4ff !important;
  border-radius: .85rem !important;
  background: #ffffff !important;
  color: #1455d9 !important;
  font-size: .78rem !important;
  font-weight: 900 !important;
  box-shadow: 0 10px 24px rgba(37, 99, 235, .08) !important;
  white-space: nowrap !important;
}

html body .ema-module-root .ema-stat-refresh-btn:hover:not(:disabled) {
  border-color: #7aa5ff !important;
  background: #eff6ff !important;
}

html body .ema-module-root .ema-stat-refresh-btn:disabled {
  opacity: .65 !important;
  cursor: not-allowed !important;
}

html body .ema-module-root .ema-stat-table-card {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  border: 1px solid #dbe7f5 !important;
  border-radius: 1rem !important;
  background: #ffffff !important;
}

html body .ema-module-root .ema-stat-table-scroll {
  flex: 1 1 auto !important;
  min-height: 28rem !important;
  max-height: calc(100dvh - 320px) !important;
  overflow: auto !important;
  background: #ffffff !important;
}

html body .ema-module-root .ema-stat-table-scroll > div:not(.ema-stat-summary-layout) {
  padding: 1rem !important;
}

html body .ema-module-root .ema-stat-table-scroll table,
html body .ema-module-root .ema-stat-summary-table {
  width: 100% !important;
  border-collapse: separate !important;
  border-spacing: 0 !important;
  table-layout: fixed !important;
  color: #0f172a !important;
  font-size: .78rem !important;
}

html body .ema-module-root .ema-stat-table-scroll thead tr,
html body .ema-module-root .ema-stat-summary-table thead tr {
  background: #f3f6fb !important;
}

html body .ema-module-root .ema-stat-table-scroll thead th,
html body .ema-module-root .ema-stat-summary-table thead th {
  position: sticky !important;
  top: 0 !important;
  z-index: 3 !important;
  padding: .82rem .95rem !important;
  border-bottom: 1px solid #dbe7f5 !important;
  background: #f3f6fb !important;
  color: #334155 !important;
  font-size: .68rem !important;
  font-weight: 950 !important;
  letter-spacing: .05em !important;
  text-transform: uppercase !important;
  text-align: left !important;
  white-space: normal !important;
  overflow-wrap: anywhere !important;
}

html body .ema-module-root .ema-stat-table-scroll tbody td,
html body .ema-module-root .ema-stat-summary-table tbody td {
  padding: .8rem .95rem !important;
  border-bottom: 1px solid #e6edf7 !important;
  background: #ffffff !important;
  color: #1e293b !important;
  font-size: .78rem !important;
  font-weight: 750 !important;
  line-height: 1.25 !important;
  vertical-align: middle !important;
  white-space: normal !important;
  overflow-wrap: anywhere !important;
  word-break: break-word !important;
}

html body .ema-module-root .ema-stat-table-scroll tbody tr:hover td {
  background: #f8fbff !important;
}

html body .ema-module-root .ema-stat-table-scroll span[class*="rounded-full"],
html body .ema-module-root .ema-stat-summary-table tbody td:nth-child(2),
html body .ema-module-root .ema-stat-summary-table tbody td:nth-child(3) {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-width: 2.25rem !important;
  padding: .25rem .55rem !important;
  border-radius: 999px !important;
  background: #eaf2ff !important;
  color: #1455d9 !important;
  font-size: .72rem !important;
  font-weight: 950 !important;
}

html body .ema-module-root .ema-stat-summary-layout {
  padding: 1rem !important;
}

html body .ema-module-root .ema-stat-summary-total {
  display: inline-flex !important;
  align-items: center !important;
  gap: .45rem !important;
  margin-bottom: .9rem !important;
  padding: .55rem .75rem !important;
  border: 1px solid #bfd4ff !important;
  border-radius: .85rem !important;
  background: #eff6ff !important;
  color: #1455d9 !important;
  font-size: .82rem !important;
  font-weight: 950 !important;
}

html body .ema-module-root .ema-stat-summary-reference {
  margin-top: 1rem !important;
  color: #64748b !important;
  font-size: .68rem !important;
  font-weight: 900 !important;
  letter-spacing: .06em !important;
  text-transform: uppercase !important;
}

html body .ema-module-root .ema-stat-table-scroll .flex.items-center.justify-center,
html body .ema-module-root .ema-stat-table-scroll .text-center {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-height: 22rem !important;
  text-align: center !important;
  color: #64748b !important;
}

html body .ema-module-root .ema-stat-table-scroll .text-center {
  flex-direction: column !important;
  gap: .35rem !important;
}

html body .ema-module-root .ema-stat-table-scroll .text-center svg {
  width: 2rem !important;
  height: 2rem !important;
  color: #2563eb !important;
}

html body .ema-module-root .ema-stat-table-scroll .text-center p:first-of-type {
  margin: .25rem 0 0 !important;
  color: #0f172a !important;
  font-size: .78rem !important;
  font-weight: 950 !important;
  letter-spacing: .06em !important;
  text-transform: uppercase !important;
}

html body .ema-module-root .ema-stat-table-scroll .text-center p:last-of-type {
  margin: 0 !important;
  color: #64748b !important;
  font-size: .72rem !important;
  font-weight: 700 !important;
}

@media (max-width: 900px) {
  html body .ema-module-root .ema-stat-commandbar {
    align-items: stretch !important;
    flex-direction: column !important;
  }

  html body .ema-module-root .ema-stat-refresh-btn {
    width: 100% !important;
  }
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
