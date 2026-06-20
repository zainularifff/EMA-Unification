const STYLE_ID = "ema-toolbar-runtime-styles";

const css = `
html body .ema-module-root .ema-registry-toolbar,
html body .ema-module-root .ema-registry-toolbar.ema-registry-toolbar-stacked {
  width: 100% !important;
  display: grid !important;
  gap: .75rem !important;
  border: 1px solid #dbe7f5 !important;
  border-radius: 1rem !important;
  background: #ffffff !important;
  padding: .75rem !important;
  box-shadow: 0 12px 28px rgba(15, 23, 42, .055) !important;
}

html body .ema-module-root .ema-scan-command-row {
  width: 100% !important;
  min-width: 0 !important;
  display: grid !important;
  grid-template-columns: max-content max-content max-content minmax(20rem, 1fr) 2.65rem max-content !important;
  align-items: center !important;
  gap: .65rem !important;
}

html body .ema-module-root .ema-command-btn,
html body .ema-module-root .ema-icon-btn,
html body .ema-module-root .ema-clear-filters-btn {
  height: 2.45rem !important;
  min-height: 2.45rem !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: .45rem !important;
  border: 1px solid #d9e5f4 !important;
  border-radius: .9rem !important;
  background: #ffffff !important;
  color: #1d4ed8 !important;
  padding: 0 .9rem !important;
  font-size: .78rem !important;
  font-weight: 900 !important;
  line-height: 1 !important;
  white-space: nowrap !important;
  box-shadow: 0 8px 18px rgba(15, 23, 42, .045) !important;
}

html body .ema-module-root .ema-command-btn:disabled,
html body .ema-module-root .ema-icon-btn:disabled,
html body .ema-module-root .ema-clear-filters-btn:disabled {
  background: #f8fbff !important;
  color: #b3c0d8 !important;
  border-color: #e2eaf6 !important;
  box-shadow: none !important;
  opacity: 1 !important;
}

html body .ema-module-root .ema-toolbar-export {
  min-width: 6.2rem !important;
  border-color: #0284c7 !important;
  background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%) !important;
  color: #ffffff !important;
  box-shadow: 0 12px 24px rgba(3, 105, 161, .22) !important;
}

html body .ema-module-root .ema-toolbar-refresh,
html body .ema-module-root .ema-icon-btn {
  width: 2.65rem !important;
  min-width: 2.65rem !important;
  padding: 0 !important;
}

html body .ema-module-root .ema-search-box,
html body .ema-module-root .ema-toolbar-search {
  width: 100% !important;
  min-width: 0 !important;
  height: 2.45rem !important;
  min-height: 2.45rem !important;
  display: flex !important;
  align-items: center !important;
  gap: .5rem !important;
  border: 1px solid #d9e5f4 !important;
  border-radius: .9rem !important;
  background: #ffffff !important;
  padding: 0 .8rem !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.8) !important;
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

html body .ema-module-root .ema-registry-filters,
html body .ema-module-root .ema-registry-filter-row {
  width: 100% !important;
  min-width: 0 !important;
  display: flex !important;
  align-items: flex-end !important;
  justify-content: flex-end !important;
  gap: .65rem !important;
  padding-top: .7rem !important;
  border-top: 1px solid #edf2f8 !important;
}

html body .ema-module-root .ema-filter-group {
  min-width: 12.5rem !important;
  width: 15rem !important;
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
  border: 1px solid #d9e5f4 !important;
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
  border: 1px solid #d9e5f4 !important;
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
  min-width: 5.4rem !important;
  color: #64748b !important;
}

@media (max-width: 1180px) {
  html body .ema-module-root .ema-scan-command-row {
    grid-template-columns: repeat(3, max-content) minmax(18rem, 1fr) max-content max-content !important;
  }
}

@media (max-width: 920px) {
  html body .ema-module-root .ema-scan-command-row,
  html body .ema-module-root .ema-registry-filter-row {
    display: flex !important;
    flex-wrap: wrap !important;
    justify-content: flex-start !important;
  }

  html body .ema-module-root .ema-toolbar-search {
    flex: 1 1 100% !important;
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
