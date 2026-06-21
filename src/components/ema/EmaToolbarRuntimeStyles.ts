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

.ema-toolbar,
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
  border-color: #2563eb !important;
  background: #2563eb !important;
  color: #ffffff !important;
  box-shadow: 0 12px 24px rgba(37, 99, 235, .22) !important;
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
.ema-module-root .ema-toolbar-search,
.ema-search-input {
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
.ema-module-root .ema-toolbar-search input,
.ema-search-input input {
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
.ema-module-root .ema-toolbar-search input::placeholder,
.ema-search-input input::placeholder {
  color: #94a3b8 !important;
}

.ema-module-root .ema-registry-filters,
.ema-module-root .ema-registry-filter-row,
.ema-toolbar-filter-row {
  width: 100% !important;
  display: flex !important;
  flex-wrap: wrap !important;
  align-items: flex-end !important;
  justify-content: flex-end !important;
  gap: .65rem !important;
  padding-top: .75rem !important;
  border-top: 1px solid #edf2f8 !important;
  overflow: visible !important;
}

.ema-module-root .ema-filter-group,
.ema-filter-field {
  min-width: 12.75rem !important;
  width: 15.25rem !important;
  display: grid !important;
  grid-template-columns: 1fr !important;
  gap: .35rem !important;
  position: relative !important;
  align-items: start !important;
  text-align: left !important;
}

.ema-module-root .ema-filter-group > label,
.ema-filter-field > span {
  display: block !important;
  margin: 0 !important;
  color: #475569 !important;
  font-size: .68rem !important;
  font-weight: 950 !important;
  letter-spacing: .08em !important;
  line-height: 1 !important;
  text-transform: uppercase !important;
  text-align: left !important;
}

.ema-module-root .ema-custom-select,
.ema-module-root .ema-filter-group select,
.ema-filter-field select {
  position: relative !important;
  width: 100% !important;
  min-width: 0 !important;
  z-index: 30 !important;
}

.ema-module-root .ema-custom-select-trigger,
.ema-module-root .ema-custom-select > button,
.ema-module-root .ema-filter-group select,
.ema-filter-field select,
main[data-section="users"] select {
  width: 100% !important;
  height: 2.55rem !important;
  min-height: 2.55rem !important;
  max-height: 2.55rem !important;
  border: 1px solid #cfe0f6 !important;
  border-radius: .9rem !important;
  background-color: #ffffff !important;
  color: #0f172a !important;
  padding: 0 2.35rem 0 .9rem !important;
  font-size: .82rem !important;
  font-weight: 900 !important;
  line-height: 1 !important;
  text-align: left !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  box-shadow: 0 6px 16px rgba(15, 23, 42, .04) !important;
  cursor: pointer !important;
  outline: none !important;
}

.ema-module-root .ema-custom-select-trigger,
.ema-module-root .ema-custom-select > button {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: .6rem !important;
}

.ema-module-root .ema-custom-select-trigger:hover,
.ema-module-root .ema-custom-select > button:hover,
.ema-module-root .ema-filter-group select:hover,
.ema-filter-field select:hover,
main[data-section="users"] select:hover {
  border-color: #93c5fd !important;
  color: #1e40af !important;
}

.ema-module-root .ema-custom-select-trigger:focus,
.ema-module-root .ema-custom-select > button:focus,
.ema-module-root .ema-filter-group select:focus,
.ema-filter-field select:focus,
main[data-section="users"] select:focus {
  border-color: #2563eb !important;
  box-shadow: 0 0 0 .22rem rgba(37, 99, 235, .12) !important;
}

.ema-module-root .ema-custom-select-trigger svg,
.ema-module-root .ema-custom-select > button svg {
  width: 1rem !important;
  height: 1rem !important;
  margin-left: auto !important;
  flex: 0 0 auto !important;
  position: static !important;
  transform: none !important;
}

.ema-module-root .ema-filter-group select,
.ema-filter-field select,
main[data-section="users"] select {
  appearance: none !important;
  -webkit-appearance: none !important;
  background-image: linear-gradient(45deg, transparent 50%, #334155 50%), linear-gradient(135deg, #334155 50%, transparent 50%) !important;
  background-position: calc(100% - 1.15rem) calc(50% - .12rem), calc(100% - .82rem) calc(50% - .12rem) !important;
  background-size: .34rem .34rem, .34rem .34rem !important;
  background-repeat: no-repeat !important;
}

.ema-module-root .ema-filter-group select option,
.ema-filter-field select option,
main[data-section="users"] select option {
  background: #ffffff !important;
  color: #0f172a !important;
  font-size: .85rem !important;
  font-weight: 850 !important;
}

.ema-module-root .ema-filter-group select option:checked,
.ema-filter-field select option:checked,
main[data-section="users"] select option:checked {
  background: #eff6ff !important;
  color: #1d4ed8 !important;
}

.ema-module-root .ema-filter-group select::-ms-expand,
.ema-filter-field select::-ms-expand,
main[data-section="users"] select::-ms-expand {
  display: none !important;
}

.ema-module-root .ema-custom-select-menu,
.ema-module-root .ema-custom-select-options,
.ema-module-root .ema-custom-select [role="listbox"],
body > div[role="listbox"] {
  z-index: 2147483647 !important;
  max-height: 14rem !important;
  overflow: auto !important;
  border: 1px solid #d7e4f5 !important;
  border-radius: .95rem !important;
  background: #fff !important;
  padding: .35rem !important;
  box-shadow: 0 22px 48px rgba(15, 23, 42, .18) !important;
}

.ema-module-root .ema-custom-select-menu,
.ema-module-root .ema-custom-select-options,
.ema-module-root .ema-custom-select [role="listbox"] {
  position: absolute !important;
  top: calc(100% + .4rem) !important;
  left: 0 !important;
  right: 0 !important;
}

body > div[role="listbox"] button,
.ema-module-root .ema-custom-select-menu button,
.ema-module-root .ema-custom-select-options button,
.ema-module-root .ema-custom-select [role="listbox"] button {
  width: 100% !important;
  min-height: 2.35rem !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: .55rem !important;
  border: 0 !important;
  border-radius: .7rem !important;
  background: #ffffff !important;
  color: #0f172a !important;
  padding: 0 .75rem !important;
  font-size: .82rem !important;
  font-weight: 850 !important;
  text-align: left !important;
}

body > div[role="listbox"] button:hover,
body > div[role="listbox"] button[aria-selected="true"],
.ema-module-root .ema-custom-select-menu button:hover,
.ema-module-root .ema-custom-select-menu button[aria-selected="true"],
.ema-module-root .ema-custom-select-options button:hover,
.ema-module-root .ema-custom-select-options button[aria-selected="true"],
.ema-module-root .ema-custom-select [role="listbox"] button:hover,
.ema-module-root .ema-custom-select [role="listbox"] button[aria-selected="true"] {
  background: #eff6ff !important;
  color: #1d4ed8 !important;
}

.ema-module-root .ema-clear-filters-btn,
.ema-toolbar-filter-row .ema-button-ghost {
  min-width: 5.55rem !important;
  color: #64748b !important;
}

main div[class~="space-y-3"] > div[class~="rounded-xl"][class~="border"][class~="p-3"][class~="shadow-sm"]:has(+ section[class~="rounded-xl"][class~="border"][class~="shadow-sm"]) {
  margin-bottom: 0 !important;
  border-bottom-left-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
  border-bottom: 0 !important;
  box-shadow: 0 8px 18px rgba(15, 23, 42, .04) !important;
}

main div[class~="space-y-3"] > div[class~="rounded-xl"][class~="border"][class~="p-3"][class~="shadow-sm"] + section[class~="rounded-xl"][class~="border"][class~="shadow-sm"] {
  margin-top: 0 !important;
  border-top-left-radius: 0 !important;
  border-top-right-radius: 0 !important;
}

main div[class~="space-y-3"] > div[class~="rounded-xl"][class~="border"][class~="p-3"][class~="shadow-sm"] + section[class~="rounded-xl"][class~="border"][class~="shadow-sm"] > div:first-child {
  border-top: 1px solid #e2e8f0 !important;
}

@media (max-width: 1080px) {
  .ema-module-root .ema-scan-command-row,
  .ema-module-root .ema-registry-filter-row,
  .ema-toolbar-filter-row {
    display: flex !important;
    flex-wrap: wrap !important;
    justify-content: flex-start !important;
  }

  .ema-module-root .ema-toolbar-search,
  .ema-toolbar-search-slot {
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
