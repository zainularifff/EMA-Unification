const STYLE_ID = "ema-dropdown-runtime-styles";

const css = `
.ema-module-root select,
.ema-filter-field select,
.ema-toolbar-filter-row select,
main[data-section="users"] select,
.ema-custom-select-trigger,
.ema-custom-select > button {
  width: 100% !important;
  min-width: 0 !important;
  height: 2.55rem !important;
  min-height: 2.55rem !important;
  max-height: 2.55rem !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: space-between !important;
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
  appearance: none !important;
  -webkit-appearance: none !important;
  background-image: linear-gradient(45deg, transparent 50%, #334155 50%), linear-gradient(135deg, #334155 50%, transparent 50%) !important;
  background-position: calc(100% - 1.15rem) calc(50% - .12rem), calc(100% - .82rem) calc(50% - .12rem) !important;
  background-size: .34rem .34rem, .34rem .34rem !important;
  background-repeat: no-repeat !important;
}

.ema-module-root select:hover,
.ema-filter-field select:hover,
.ema-toolbar-filter-row select:hover,
main[data-section="users"] select:hover,
.ema-custom-select-trigger:hover,
.ema-custom-select > button:hover {
  border-color: #93c5fd !important;
  background-color: #ffffff !important;
  color: #1e40af !important;
}

.ema-module-root select:focus,
.ema-filter-field select:focus,
.ema-toolbar-filter-row select:focus,
main[data-section="users"] select:focus,
.ema-custom-select-trigger:focus,
.ema-custom-select > button:focus {
  border-color: #2563eb !important;
  box-shadow: 0 0 0 .22rem rgba(37, 99, 235, .12) !important;
}

.ema-module-root select option,
.ema-filter-field select option,
.ema-toolbar-filter-row select option,
main[data-section="users"] select option {
  background: #ffffff !important;
  color: #0f172a !important;
  font-size: .85rem !important;
  font-weight: 850 !important;
  padding: .65rem .8rem !important;
}

.ema-module-root select option:checked,
.ema-filter-field select option:checked,
.ema-toolbar-filter-row select option:checked,
main[data-section="users"] select option:checked {
  background: linear-gradient(135deg, #eff6ff 0%, #eff6ff 100%) !important;
  color: #1d4ed8 !important;
  font-weight: 950 !important;
}

body > div[role="listbox"],
.ema-custom-select-menu,
.ema-custom-select-options,
.ema-custom-select [role="listbox"] {
  z-index: 2147483647 !important;
  overflow: auto !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: .95rem !important;
  background: #ffffff !important;
  padding: .35rem !important;
  box-shadow: 0 22px 48px rgba(15, 23, 42, .18) !important;
}

body > div[role="listbox"] button,
.ema-custom-select-menu button,
.ema-custom-select-options button,
.ema-custom-select [role="listbox"] button {
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
.ema-custom-select-menu button:hover,
.ema-custom-select-menu button[aria-selected="true"],
.ema-custom-select-options button:hover,
.ema-custom-select-options button[aria-selected="true"],
.ema-custom-select [role="listbox"] button:hover,
.ema-custom-select [role="listbox"] button[aria-selected="true"] {
  background: #eff6ff !important;
  color: #1d4ed8 !important;
}

.ema-filter-field,
.ema-toolbar-filter-row .ema-filter-field,
.ema-module-root .ema-filter-group {
  position: relative !important;
  min-width: 12.75rem !important;
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
