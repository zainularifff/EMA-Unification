const STYLE_ID = "ema-toolbar-runtime-styles";

const css = `
.ema-module-root .ema-registry-toolbar,
.ema-module-root .ema-registry-toolbar.ema-registry-toolbar-stacked {
  width: 100% !important;
  display: grid !important;
  gap: .8rem !important;
  padding: .95rem 1rem 1rem !important;
  margin: 0 !important;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  overflow: visible !important;
  box-sizing: border-box !important;
}

.ema-module-root .ema-registry-toolbar *,
.ema-module-root .ema-registry-toolbar.ema-registry-toolbar-stacked * {
  box-sizing: border-box !important;
}

.ema-module-root .ema-scan-command-row {
  width: 100% !important;
  display: grid !important;
  grid-template-columns: minmax(7.75rem, 8.8rem) minmax(7.75rem, 8.8rem) minmax(7.75rem, 8.8rem) minmax(0, 1fr) 2.75rem minmax(6.25rem, 6.75rem) !important;
  align-items: center !important;
  gap: .65rem !important;
  padding: 0 !important;
  margin: 0 !important;
  overflow: visible !important;
}

.ema-module-root .ema-command-btn,
.ema-module-root .ema-icon-btn,
.ema-module-root .ema-clear-filters-btn {
  height: 2.55rem !important;
  min-height: 2.55rem !important;
  max-height: 2.55rem !important;
  max-width: 100% !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: .48rem !important;
  border: 1px solid #cfe0f6 !important;
  border-radius: .9rem !important;
  background: #fff !important;
  color: #0f172a !important;
  padding: 0 .9rem !important;
  font-size: .78rem !important;
  font-weight: 900 !important;
  line-height: 1 !important;
  white-space: nowrap !important;
  box-shadow: 0 6px 16px rgba(15, 23, 42, .045) !important;
  opacity: 1 !important;
  position: relative !important;
  top: auto !important;
  transform: none !important;
}

.ema-module-root .ema-command-btn svg,
.ema-module-root .ema-icon-btn svg,
.ema-module-root .ema-clear-filters-btn svg {
  width: 1rem !important;
  height: 1rem !important;
  flex: 0 0 auto !important;
  stroke-width: 2.25 !important;
}

.ema-module-root .ema-command-btn:not(:disabled):hover,
.ema-module-root .ema-icon-btn:not(:disabled):hover,
.ema-module-root .ema-clear-filters-btn:not(:disabled):hover {
  border-color: #93c5fd !important;
  background: #eff6ff !important;
  color: #1d4ed8 !important;
}

.ema-module-root .ema-command-btn:disabled,
.ema-module-root .ema-icon-btn:disabled,
.ema-module-root .ema-clear-filters-btn:disabled {
  cursor: not-allowed !important;
  border-color: #dce7f5 !important;
  background: #f8fbff !important;
  color: #94a3b8 !important;
  box-shadow: none !important;
  opacity: .92 !important;
}

.ema-module-root .ema-scan-command-row > .ema-command-btn:nth-of-type(3):not(:disabled) {
  border-color: #93b8ff !important;
  color: #0b63ff !important;
}

.ema-module-root .ema-toolbar-export {
  min-width: 6.25rem !important;
  border-color: #0284c7 !important;
  background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%) !important;
  color: #fff !important;
  box-shadow: 0 12px 24px rgba(3, 105, 161, .22) !important;
}

.ema-module-root .ema-toolbar-export:disabled {
  border-color: #dce7f5 !important;
  background: #f8fbff !important;
  color: #94a3b8 !important;
  box-shadow: none !important;
}

.ema-module-root .ema-toolbar-refresh,
.ema-module-root .ema-icon-btn {
  width: 2.75rem !important;
  min-width: 2.75rem !important;
  padding: 0 !important;
  color: #0b63ff !important;
}

.ema-module-root .ema-search-box,
.ema-module-root .ema-toolbar-search {
  width: 100% !important;
  min-width: 0 !important;
  height: 2.55rem !important;
  min-height: 2.55rem !important;
  display: flex !important;
  align-items: center !important;
  gap: .55rem !important;
  border: 1px solid #cfe0f6 !important;
  border-radius: .9rem !important;
  background: #fff !important;
  padding: 0 .85rem !important;
  position: relative !important;
  top: auto !important;
}

.ema-module-root .ema-search-box input,
.ema-module-root .ema-toolbar-search input {
  width: 100% !important;
  min-width: 0 !important;
  border: 0 !important;
  outline: 0 !important;
  background: transparent !important;
  color: #0f172a !important;
  font-size: .82rem !important;
  font-weight: 750 !important;
}

.ema-module-root .ema-search-box input::placeholder,
.ema-module-root .ema-toolbar-search input::placeholder {
  color: #94a3b8 !important;
}

.ema-module-root .ema-registry-filters,
.ema-module-root .ema-registry-filter-row {
  width: 100% !important;
  display: flex !important;
  align-items: flex-end !important;
  justify-content: flex-end !important;
  gap: .65rem !important;
  padding-top: .75rem !important;
  border-top: 1px solid #edf2f8 !important;
  overflow: visible !important;
}

.ema-module-root .ema-filter-group {
  min-width: 12.75rem !important;
  width: 15.25rem !important;
  display: grid !important;
  gap: .35rem !important;
  position: relative !important;
}

.ema-module-root .ema-filter-group label {
  margin: 0 !important;
  color: #475569 !important;
  font-size: .68rem !important;
  font-weight: 950 !important;
  letter-spacing: .08em !important;
  text-transform: uppercase !important;
}

.ema-module-root .ema-custom-select,
.ema-module-root .ema-filter-group select {
  position: relative !important;
  width: 100% !important;
  z-index: 30 !important;
}

.ema-module-root .ema-custom-select-trigger,
.ema-module-root .ema-custom-select > button,
.ema-module-root .ema-filter-group select {
  height: 2.45rem !important;
  min-height: 2.45rem !important;
  border: 1px solid #cfe0f6 !important;
  border-radius: .85rem !important;
  background: #fff !important;
  color: #0f172a !important;
  padding: 0 .8rem !important;
  font-size: .82rem !important;
  font-weight: 850 !important;
}

.ema-module-root .ema-custom-select-menu,
.ema-module-root .ema-custom-select-options,
.ema-module-root .ema-custom-select [role="listbox"] {
  position: absolute !important;
  top: calc(100% + .4rem) !important;
  left: 0 !important;
  right: 0 !important;
  z-index: 9999 !important;
  max-height: 14rem !important;
  overflow: auto !important;
  border: 1px solid #d7e4f5 !important;
  border-radius: .9rem !important;
  background: #fff !important;
  padding: .35rem !important;
  box-shadow: 0 18px 42px rgba(15, 23, 42, .16) !important;
}

.ema-module-root .ema-clear-filters-btn {
  min-width: 5.55rem !important;
  color: #64748b !important;
}

@media (max-width: 1080px) {
  .ema-module-root .ema-scan-command-row,
  .ema-module-root .ema-registry-filter-row {
    display: flex !important;
    flex-wrap: wrap !important;
    justify-content: flex-start !important;
  }

  .ema-module-root .ema-toolbar-search {
    flex: 1 1 22rem !important;
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
