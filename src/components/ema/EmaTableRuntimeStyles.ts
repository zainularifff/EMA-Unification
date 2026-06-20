const STYLE_ID = "ema-table-runtime-styles";
const OBSERVER_FLAG = "emaTableRuntimeObserver";

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

html body .ema-module-root .ema-standard-table {
  max-height: min(52vh, 34rem) !important;
  overflow: auto !important;
  border-bottom-left-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
  margin-bottom: 0 !important;
  scrollbar-gutter: stable !important;
}

html body .ema-module-root .ema-pagination {
  position: sticky !important;
  bottom: 0 !important;
  z-index: 80 !important;
  min-height: 3.75rem !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: .85rem !important;
  width: 100% !important;
  margin: 0 !important;
  padding: .7rem .9rem !important;
  border: 1px solid #dbe7f5 !important;
  border-top: 0 !important;
  border-radius: 0 0 1rem 1rem !important;
  background: rgba(255,255,255,.98) !important;
  box-shadow: 0 -14px 26px rgba(15,23,42,.08) !important;
  backdrop-filter: blur(8px) !important;
}

html body .ema-module-root .ema-page-summary {
  flex: 1 1 auto !important;
  min-width: 0 !important;
  color: #334155 !important;
  font-size: .82rem !important;
  font-weight: 850 !important;
}

html body .ema-module-root .ema-pagination-actions {
  flex: 0 0 auto !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: .35rem !important;
}

html body .ema-module-root .ema-pagination .uam-page-icon,
html body .ema-module-root .ema-pagination-current {
  width: 2.1rem !important;
  height: 2.1rem !important;
  display: inline-grid !important;
  place-items: center !important;
  border: 1px solid #dbe7f5 !important;
  border-radius: .65rem !important;
  background: #fff !important;
  color: #0f172a !important;
  font-size: .78rem !important;
  font-weight: 900 !important;
  line-height: 1 !important;
}

html body .ema-module-root .ema-pagination-current {
  border-color: #60a5fa !important;
  background: #eff6ff !important;
  color: #1d4ed8 !important;
}

html body .ema-module-root .ema-pagination .uam-page-icon:disabled {
  opacity: .42 !important;
  cursor: not-allowed !important;
}

html body .ema-module-root .ema-empty-state,
html body .ema-module-root .ema-loading-state {
  min-height: 13rem !important;
  display: grid !important;
  place-items: center !important;
  align-content: center !important;
  justify-items: center !important;
  gap: .65rem !important;
  color: #64748b !important;
  font-size: .78rem !important;
  font-weight: 900 !important;
  letter-spacing: .08em !important;
  text-align: center !important;
  text-transform: uppercase !important;
}

html body .ema-module-root .ema-empty-state.is-loading::before,
html body .ema-module-root .ema-loading-state::before {
  content: "" !important;
  width: 2.15rem !important;
  height: 2.15rem !important;
  display: block !important;
  border-radius: 999px !important;
  border: .22rem solid #dbeafe !important;
  border-top-color: #2563eb !important;
  animation: ema-spin .8s linear infinite !important;
}

html body .ema-module-root .ema-empty-state.is-loading {
  color: #64748b !important;
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

const syncLoadingState = () => {
  if (typeof document === "undefined") return;
  document.querySelectorAll<HTMLElement>(".ema-empty-state").forEach((element) => {
    const text = (element.textContent || "").toLowerCase();
    element.classList.toggle("is-loading", text.includes("loading"));
  });
};

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

  syncLoadingState();
  const win = window as typeof window & { [OBSERVER_FLAG]?: MutationObserver };
  if (!win[OBSERVER_FLAG]) {
    const observer = new MutationObserver(syncLoadingState);
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    win[OBSERVER_FLAG] = observer;
  }
}

export {};
