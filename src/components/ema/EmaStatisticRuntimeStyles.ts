const STYLE_ID = "ema-statistic-runtime-styles";

const css = `
html body .ema-module-root .ema-stat-workbench {
  width: 100% !important;
  min-height: calc(100dvh - 175px) !important;
  display: flex !important;
  flex-direction: column !important;
  gap: .85rem !important;
  padding: .85rem !important;
  border-radius: 1rem !important;
  background: #f8fbff !important;
  color: #0f172a !important;
}

html body .ema-module-root .ema-stat-commandbar {
  width: 100% !important;
  min-height: 4.25rem !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 1rem !important;
  padding: 1rem 1.1rem !important;
  border: 1px solid #dbe7f5 !important;
  border-radius: 1rem !important;
  background: #ffffff !important;
  box-shadow: 0 12px 28px rgba(15, 23, 42, .05) !important;
}

html body .ema-module-root .ema-stat-commandbar h3 {
  margin: 0 !important;
  color: #0f172a !important;
  font-size: 1rem !important;
  font-weight: 950 !important;
  letter-spacing: -.02em !important;
  line-height: 1.2 !important;
}

html body .ema-module-root .ema-stat-commandbar p {
  margin: .24rem 0 0 !important;
  color: #2563eb !important;
  font-size: .7rem !important;
  font-weight: 950 !important;
  letter-spacing: .08em !important;
  text-transform: uppercase !important;
  line-height: 1.2 !important;
}

html body .ema-module-root .ema-stat-refresh-btn {
  height: 2.45rem !important;
  min-width: 7.2rem !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: .45rem !important;
  border: 1px solid #bfdbfe !important;
  border-radius: .8rem !important;
  background: #eff6ff !important;
  color: #1d4ed8 !important;
  padding: 0 .9rem !important;
  font-size: .76rem !important;
  font-weight: 900 !important;
  box-shadow: 0 10px 22px rgba(37, 99, 235, .08) !important;
}

html body .ema-module-root .ema-stat-refresh-btn:hover:not(:disabled) {
  border-color: #93c5fd !important;
  background: #dbeafe !important;
}

html body .ema-module-root .ema-stat-refresh-btn:disabled {
  cursor: wait !important;
  opacity: .7 !important;
}

html body .ema-module-root .ema-stat-refresh-btn:disabled svg,
html body .ema-module-root .ema-stat-table-scroll .animate-spin {
  animation: emaSpin .85s linear infinite !important;
}

html body .ema-module-root .ema-stat-table-card {
  flex: 1 1 auto !important;
  min-height: 26rem !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  border: 1px solid #dbe7f5 !important;
  border-radius: 1rem !important;
  background: #ffffff !important;
  box-shadow: 0 14px 30px rgba(15, 23, 42, .05) !important;
}

html body .ema-module-root .ema-stat-table-scroll {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  overflow: auto !important;
  padding: 1rem !important;
}

html body .ema-module-root .ema-stat-table-scroll table,
html body .ema-module-root .ema-stat-summary-table {
  width: 100% !important;
  border-collapse: separate !important;
  border-spacing: 0 !important;
  table-layout: fixed !important;
  overflow: hidden !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: .85rem !important;
  background: #ffffff !important;
}

html body .ema-module-root .ema-stat-table-scroll thead tr,
html body .ema-module-root .ema-stat-summary-table thead tr {
  background: #f1f5f9 !important;
}

html body .ema-module-root .ema-stat-table-scroll th,
html body .ema-module-root .ema-stat-summary-table th {
  padding: .78rem .85rem !important;
  border-bottom: 1px solid #dbe7f5 !important;
  color: #334155 !important;
  font-size: .68rem !important;
  font-weight: 950 !important;
  letter-spacing: .06em !important;
  text-transform: uppercase !important;
  text-align: left !important;
  white-space: normal !important;
  overflow-wrap: anywhere !important;
}

html body .ema-module-root .ema-stat-table-scroll td,
html body .ema-module-root .ema-stat-summary-table td {
  padding: .76rem .85rem !important;
  border-bottom: 1px solid #edf2f7 !important;
  color: #0f172a !important;
  font-size: .76rem !important;
  font-weight: 700 !important;
  line-height: 1.25 !important;
  white-space: normal !important;
  overflow-wrap: anywhere !important;
  word-break: break-word !important;
}

html body .ema-module-root .ema-stat-table-scroll tbody tr:hover td,
html body .ema-module-root .ema-stat-summary-table tbody tr:hover td {
  background: #f8fbff !important;
}

html body .ema-module-root .ema-stat-summary-layout {
  padding: 0 !important;
  display: grid !important;
  gap: .9rem !important;
}

html body .ema-module-root .ema-stat-summary-total {
  width: fit-content !important;
  margin: 0 !important;
  padding: .55rem .75rem !important;
  border: 1px solid #bfdbfe !important;
  border-radius: .75rem !important;
  background: #eff6ff !important;
  color: #1d4ed8 !important;
  font-size: .78rem !important;
  font-weight: 950 !important;
}

html body .ema-module-root .ema-stat-summary-reference {
  margin: 0 !important;
  color: #64748b !important;
  font-size: .68rem !important;
  font-weight: 900 !important;
  letter-spacing: .06em !important;
  text-transform: uppercase !important;
}

html body .ema-module-root .ema-stat-table-scroll .flex.items-center.justify-center,
html body .ema-module-root .ema-stat-table-scroll [class*="items-center"][class*="justify-center"] {
  min-height: 22rem !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  color: #64748b !important;
}

html body .ema-module-root .ema-stat-table-scroll .text-center {
  display: grid !important;
  justify-items: center !important;
  gap: .45rem !important;
  max-width: 28rem !important;
  text-align: center !important;
}

html body .ema-module-root .ema-stat-table-scroll .text-center svg {
  width: 2.35rem !important;
  height: 2.35rem !important;
  padding: .45rem !important;
  border-radius: 999px !important;
  background: #eff6ff !important;
  color: #2563eb !important;
}

html body .ema-module-root .ema-stat-table-scroll .text-center p {
  margin: 0 !important;
}

html body .ema-module-root .ema-stat-table-scroll .text-center p:first-of-type {
  color: #0f172a !important;
  font-size: .78rem !important;
  font-weight: 950 !important;
  letter-spacing: .06em !important;
  text-transform: uppercase !important;
}

html body .ema-module-root .ema-stat-table-scroll .text-center p:last-of-type {
  color: #64748b !important;
  font-size: .72rem !important;
  font-weight: 750 !important;
}

html body .ema-module-root .ema-stat-table-scroll .text-rose-500,
html body .ema-module-root .ema-stat-table-scroll .text-rose-600 {
  color: #e11d48 !important;
}

html body .ema-module-root .ema-stat-table-scroll .text-center .text-rose-500,
html body .ema-module-root .ema-stat-table-scroll .text-center svg.text-rose-500 {
  background: #fff1f2 !important;
  color: #e11d48 !important;
}

@keyframes emaSpin {
  to { transform: rotate(360deg); }
}

@media (max-width: 900px) {
  html body .ema-module-root .ema-stat-commandbar {
    align-items: flex-start !important;
    flex-direction: column !important;
  }

  html body .ema-module-root .ema-stat-refresh-btn {
    width: 100% !important;
  }
}
`;

if (typeof document !== "undefined") {
  const existing = document.getElementById(STYLE_ID);
  if (existing) existing.textContent = css;
  else {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }
}

export {};
