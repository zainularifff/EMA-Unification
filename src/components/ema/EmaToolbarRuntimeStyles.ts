const STYLE_ID = "ema-toolbar-runtime-styles";

const css = `
html body .ema-module-root .ema-registry-toolbar,
html body .ema-module-root .ema-registry-toolbar.ema-registry-toolbar-stacked {
  width: 100% !important;
  min-width: 0 !important;
  display: grid !important;
  gap: .72rem !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  padding: 0 0 .85rem !important;
  margin: 0 !important;
  box-shadow: none !important;
}

html body .ema-module-root .ema-scan-command-row {
  width: 100% !important;
  min-width: 0 !important;
  display: grid !important;
  grid-template-columns: 8.8rem 8.8rem 8.8rem minmax(20rem, 1fr) 2.75rem 6.75rem !important;
  align-items: center !important;
  gap: .62rem !important;
}

html body .ema-module-root .ema-command-btn,
html body .ema-module-root .ema-icon-btn,
html body .ema-module-root .ema-clear-filters-btn {
  height: 2.55rem !important;
  min-height: 2.55rem !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: .48rem !important;
  border: 1px solid #cfe0f6 !important;
  border-radius: .9rem !important;
  background: #ffffff !important;
  color: #0f172a !important;
  padding: 0 .9rem !important;
  font-size: .78rem !important;
  font-weight: 900 !important;
  line-height: 1 !important;
  white-space: nowrap !important;
  box-shadow: 0 6px 16px rgba(15, 23, 42, .045) !important;
  opacity: 1 !important;
  transition: border-color .16s ease, background .16s ease, color .16s ease, box-shadow .16s ease !important;
}

html body .ema-module-root .ema-command-btn svg,
html body .ema-module-root .ema-icon-btn svg,
html body .ema-module-root .ema-clear-filters-btn svg {
  width: 1rem !important;
  height: 1rem !important;
  flex: 0 0 auto !important;
  stroke-width: 2.25 !important;
}

html body .ema-module-root .ema-command-btn:not(:disabled):hover,
html body .ema-module-root .ema-icon-btn:not(:disabled):hover,
html body .ema-module-root .ema-clear-filters-btn:not(:disabled):hover {
  border-color: #93c5fd !important;
  background: #eff6ff !important;
  color: #1d4ed8 !important;
  box-shadow: 0 10px 22px rgba(37, 99, 235, .1) !important;
}

html body .ema-module-root .ema-command-btn:disabled,
html body .ema-module-root .ema-icon-btn:disabled,
html body .ema-module-root .ema-clear-filters-btn:disabled {
  cursor: not-allowed !important;
  border-color: #dce7f5 !important;
  background: #f8fbff !important;
  color: #94a3b8 !important;
  box-shadow: none !important;
  opacity: .92 !important;
}

html body .ema-module-root .ema-command-btn:disabled svg,
html body .ema-module-root .ema-icon-btn:disabled svg,
html body .ema-module-root .ema-clear-filters-btn:disabled svg {
  color: #a9b8cf !important;
}

html body .ema-module-root .ema-scan-command-row > .ema-command-btn:nth-of-type(3):not(:disabled) {
  border-color: #93b8ff !important;
  background: #ffffff !important;
  color: #0b63ff !important;
  box-shadow: 0 8px 18px rgba(37, 99, 235, .08) !important;
}

html body .ema-module-root .ema-toolbar-export {
  min-width: 6.75rem !important;
  border-color: #0284c7 !important;
  background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%) !important;
  color: #ffffff !important;
  box-shadow: 0 12px 24px rgba(3, 105, 161, .22) !important;
}

html body .ema-module-root .ema-toolbar-export:disabled {
  border-color: #dce7f5 !important;
  background: #f8fbff !important;
  color: #94a3b8 !important;
  box-shadow: none !important;
}

html body .ema-module-root .ema-toolbar-refresh,
html body .ema-module-root .ema-icon-btn {
  width: 2.75rem !important;
  min-width: 2.75rem !important;
  padding: 0 !important;
  color: #0b63ff !important;
}

html body .ema-module-root .ema-search-box,
html body .ema-module-root .ema-toolbar-search {
  width: 100% !important;
  min-width: 0 !important;
  height: 2.55rem !important;
  min-height: 2.55rem !important;
  display: flex !important;
  align-items: center !important;
  gap: .55rem !important;
  border: 1px solid #cfe0f6 !important;
  border-radius: .9rem !important;
  background: #ffffff !important;
  padding: 0 .85rem !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.85) !important;
}

html body .ema-module-root .ema-search-box input,
html body .ema-module-root .ema-toolbar-search input {
  width: 100% !important;
  min-width: 0 !important;
  border: 0 !important;
  outline: 0 !important;
  background: transparent !important;
  color: #0f172a !important;
  font-size: .82rem !important;
  font-weight: 750 !important;
}

html body .ema-module-root .ema-search-box input::placeholder,
html body .ema-module-root .ema-toolbar-search input::placeholder {
  color: #94a3b8 !important;
  font-weight: 750 !important;
}

html body .ema-module-root .ema-search-clear {
  width: 1.8rem !important;
  height: 1.8rem !important;
  display: inline-grid !important;
  place-items: center !important;
  border: 0 !important;
  border-radius: .55rem !important;
  background: transparent !important;
  color: #64748b !important;
  padding: 0 !important;
}

html body .ema-module-root .ema-search-clear:hover {
  background: #eff6ff !important;
  color: #1d4ed8 !important;
}

html body .ema-module-root .ema-registry-filters,
html body .ema-module-root .ema-registry-filter-row {
  width: 100% !important;
  min-width: 0 !important;
  display: flex !important;
  align-items: flex-end !important;
  justify-content: flex-end !important;
  gap: .65rem !important;
  padding-top: .68rem !important;
  border-top: 1px solid #edf2f8 !important;
  background: transparent !important;
}

html body .ema-module-root .ema-filter-group {
  min-width: 12.75rem !important;
  width: 15.25rem !important;
  display: grid !important;
  gap: .35rem !important;
  position: relative !important;
}

html body .ema-module-root .ema-filter-group label {
  display: block !important;
  margin: 0 !important;
  color: #475569 !important;
  font-size: .68rem !important;
  font-weight: 950 !important;
  letter-spacing: .08em !important;
  line-height: 1 !important;
  text-transform: uppercase !important;
}

html body .ema-module-root .ema-custom-select {
  position: relative !important;
  width: 100% !important;
  min-width: 0 !important;
  z-index: 30 !important;
}

html body .ema-module-root .ema-custom-select-trigger,
html body .ema-module-root .ema-custom-select > button,
html body .ema-module-root .ema-filter-group select {
  width: 100% !important;
  height: 2.45rem !important;
  min-height: 2.45rem !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: .6rem !important;
  border: 1px solid #cfe0f6 !important;
  border-radius: .85rem !important;
  background: #ffffff !important;
  color: #0f172a !important;
  padding: 0 .8rem !important;
  font-size: .82rem !important;
  font-weight: 850 !important;
  line-height: 1 !important;
  white-space: nowrap !important;
  box-shadow: none !important;
}

html body .ema-module-root .ema-custom-select-menu,
html body .ema-module-root .ema-custom-select-options,
html body .ema-module-root .ema-custom-select [role="listbox"] {
  position: absolute !important;
  top: calc(100% + .4rem) !important;
  left: 0 !important;
  right: 0 !important;
  z-index: 9999 !important;
  max-height: 14rem !important;
  overflow: auto !important;
  display: grid !important;
  gap: .25rem !important;
  border: 1px solid #d7e4f5 !important;
  border-radius: .9rem !important;
  background: #ffffff !important;
  padding: .35rem !important;
  box-shadow: 0 18px 42px rgba(15, 23, 42, .16) !important;
}

html body .ema-module-root .ema-custom-select-menu button,
html body .ema-module-root .ema-custom-select-options button,
html body .ema-module-root .ema-custom-select [role="option"] {
  width: 100% !important;
  min-height: 2.15rem !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: .5rem !important;
  border: 0 !important;
  border-radius: .65rem !important;
  background: transparent !important;
  color: #0f172a !important;
  padding: 0 .65rem !important;
  text-align: left !important;
  font-size: .78rem !important;
  font-weight: 800 !important;
  white-space: normal !important;
}

html body .ema-module-root .ema-custom-select-menu button:hover,
html body .ema-module-root .ema-custom-select-options button:hover,
html body .ema-module-root .ema-custom-select [role="option"]:hover {
  background: #eff6ff !important;
  color: #1d4ed8 !important;
}

html body .ema-module-root .ema-clear-filters-btn {
  min-width: 5.55rem !important;
  color: #64748b !important;
}

@media (max-width: 1250px) {
  html body .ema-module-root .ema-scan-command-row {
    grid-template-columns: repeat(3, minmax(7.5rem, max-content)) minmax(18rem, 1fr) 2.75rem 6.75rem !important;
  }
}

@media (max-width: 1080px) {
  html body .ema-module-root .ema-scan-command-row,
  html body .ema-module-root .ema-registry-filter-row {
    display: flex !important;
    flex-wrap: wrap !important;
    justify-content: flex-start !important;
  }

  html body .ema-module-root .ema-toolbar-search {
    flex: 1 1 22rem !important;
  }

  html body .ema-module-root .ema-filter-group {
    width: min(100%, 15rem) !important;
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
