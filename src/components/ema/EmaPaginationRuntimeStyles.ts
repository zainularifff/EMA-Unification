const STYLE_ID = "ema-pagination-runtime-styles";

const css = `
main[data-section="users"] footer:has(nav[aria-label*="pagination" i]),
.ema-pagination-bar {
  width: 100% !important;
  min-height: 3.65rem !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: .75rem !important;
  border-top: 1px solid #dbe7f5 !important;
  background: #ffffff !important;
  padding: .72rem .9rem !important;
  margin: 0 !important;
  box-shadow: none !important;
}

main[data-section="users"] footer:has(nav[aria-label*="pagination" i]) > span,
.ema-pagination-bar > span,
.ema-pagination-summary {
  display: inline-flex !important;
  align-items: center !important;
  min-width: 0 !important;
  color: #334155 !important;
  font-size: .82rem !important;
  font-weight: 900 !important;
  line-height: 1.2 !important;
}

main[data-section="users"] footer:has(nav[aria-label*="pagination" i]) > span:nth-of-type(2) {
  color: #64748b !important;
  font-weight: 800 !important;
}

main[data-section="users"] footer:has(nav[aria-label*="pagination" i]) nav,
.ema-pagination-controls {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: .35rem !important;
  margin-left: auto !important;
  flex: 0 0 auto !important;
}

main[data-section="users"] footer:has(nav[aria-label*="pagination" i]) nav button,
main[data-section="users"] footer:has(nav[aria-label*="pagination" i]) nav b,
.ema-pagination-controls button,
.ema-pagination-controls b,
.ema-pagination-page {
  width: 2.08rem !important;
  height: 2.08rem !important;
  min-width: 2.08rem !important;
  display: inline-grid !important;
  place-items: center !important;
  border: 1px solid #dbe7f5 !important;
  border-radius: .7rem !important;
  background: #ffffff !important;
  color: #64748b !important;
  padding: 0 !important;
  font-size: .78rem !important;
  font-weight: 950 !important;
  line-height: 1 !important;
  box-shadow: 0 5px 12px rgba(15, 23, 42, .03) !important;
}

main[data-section="users"] footer:has(nav[aria-label*="pagination" i]) nav b,
.ema-pagination-controls b,
.ema-pagination-page.is-active,
.ema-pagination-page[aria-current="page"] {
  border-color: #2563eb !important;
  background: #2563eb !important;
  color: #ffffff !important;
  box-shadow: 0 8px 18px rgba(37, 99, 235, .18) !important;
}

main[data-section="users"] footer:has(nav[aria-label*="pagination" i]) nav button:not(:disabled):hover,
.ema-pagination-controls button:not(:disabled):hover {
  border-color: #93c5fd !important;
  background: #eff6ff !important;
  color: #1d4ed8 !important;
}

main[data-section="users"] footer:has(nav[aria-label*="pagination" i]) nav button:disabled,
.ema-pagination-controls button:disabled {
  cursor: not-allowed !important;
  opacity: .45 !important;
  background: #f8fafc !important;
  color: #94a3b8 !important;
}

main[data-section="users"] footer:has(nav[aria-label*="pagination" i]) svg,
.ema-pagination-controls svg {
  width: .95rem !important;
  height: .95rem !important;
  stroke-width: 2.4 !important;
}

@media (max-width: 860px) {
  main[data-section="users"] footer:has(nav[aria-label*="pagination" i]),
  .ema-pagination-bar {
    flex-wrap: wrap !important;
    align-items: flex-start !important;
  }

  main[data-section="users"] footer:has(nav[aria-label*="pagination" i]) nav,
  .ema-pagination-controls {
    width: 100% !important;
    justify-content: flex-start !important;
    margin-left: 0 !important;
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
