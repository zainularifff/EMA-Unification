const STYLE_ID = "ema-table-runtime-styles";

const css = `
html body .ema-module-root table {
  width: 100% !important;
  table-layout: fixed !important;
}

html body .ema-module-root th,
html body .ema-module-root td,
html body .ema-module-root td *,
html body .ema-module-root th * {
  min-width: 0 !important;
  max-width: 100% !important;
  white-space: normal !important;
  overflow-wrap: anywhere !important;
  word-break: break-word !important;
}

html body .ema-module-root .ema-device-main-cell,
html body .ema-module-root .ema-device-main-cell *,
html body .ema-module-root .ema-location-cell,
html body .ema-module-root .ema-location-cell *,
html body .ema-module-root .ema-network-cell,
html body .ema-module-root .ema-network-cell *,
html body .ema-module-root .ema-date-cell,
html body .ema-module-root .ema-model-text {
  min-width: 0 !important;
  max-width: 100% !important;
  white-space: normal !important;
  overflow-wrap: anywhere !important;
  word-break: break-word !important;
  line-height: 1.25 !important;
}

html body .ema-module-root .ema-device-main-cell .user-name > div > small {
  display: none !important;
}

html body .ema-module-root .ema-device-main-cell .user-name > div > em {
  display: block !important;
  max-width: 100% !important;
  margin-top: .18rem !important;
  overflow: visible !important;
  text-overflow: clip !important;
  white-space: normal !important;
  overflow-wrap: anywhere !important;
  word-break: break-word !important;
  color: #64748b !important;
  font-size: .72rem !important;
  font-weight: 750 !important;
  line-height: 1.2 !important;
}

html body .ema-module-root .ema-status-pill {
  min-width: 5.75rem !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: .35rem !important;
  border: 1px solid transparent !important;
  border-radius: 999px !important;
  padding: .32rem .62rem !important;
  font-size: .72rem !important;
  font-weight: 950 !important;
  line-height: 1 !important;
  text-transform: capitalize !important;
  box-shadow: none !important;
  white-space: nowrap !important;
  word-break: normal !important;
  overflow-wrap: normal !important;
}

html body .ema-module-root .ema-status-pill::before {
  content: "" !important;
  width: .45rem !important;
  height: .45rem !important;
  flex: 0 0 .45rem !important;
  border-radius: 999px !important;
  background: currentColor !important;
}

html body .ema-module-root .ema-status-pill.online,
html body .ema-module-root .ema-status-pill[class*="online" i] {
  border-color: #bbf7d0 !important;
  background: #dcfce7 !important;
  color: #15803d !important;
}

html body .ema-module-root .ema-status-pill.offline,
html body .ema-module-root .ema-status-pill[class*="offline" i] {
  border-color: #fecaca !important;
  background: #fee2e2 !important;
  color: #b91c1c !important;
}

html body .ema-module-root .ema-status-pill.idle,
html body .ema-module-root .ema-status-pill.stale,
html body .ema-module-root .ema-status-pill.not-connected,
html body .ema-module-root .ema-status-pill.notconnected,
html body .ema-module-root .ema-status-pill[class*="idle" i],
html body .ema-module-root .ema-status-pill[class*="stale" i],
html body .ema-module-root .ema-status-pill[class*="not" i] {
  border-color: #fed7aa !important;
  background: #ffedd5 !important;
  color: #c2410c !important;
}

html body .ema-module-root .ema-status-dot.online,
html body .ema-module-root .ema-status-dot[class*="online" i] {
  background: #16a34a !important;
  box-shadow: 0 0 0 .25rem rgba(22, 163, 74, .13) !important;
}

html body .ema-module-root .ema-status-dot.offline,
html body .ema-module-root .ema-status-dot[class*="offline" i] {
  background: #dc2626 !important;
  box-shadow: 0 0 0 .25rem rgba(220, 38, 38, .13) !important;
}

html body .ema-module-root .ema-status-dot.idle,
html body .ema-module-root .ema-status-dot.stale,
html body .ema-module-root .ema-status-dot.not-connected,
html body .ema-module-root .ema-status-dot.notconnected,
html body .ema-module-root .ema-status-dot[class*="idle" i],
html body .ema-module-root .ema-status-dot[class*="stale" i],
html body .ema-module-root .ema-status-dot[class*="not" i] {
  background: #f97316 !important;
  box-shadow: 0 0 0 .25rem rgba(249, 115, 22, .13) !important;
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
