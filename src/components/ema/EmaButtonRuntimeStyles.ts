const STYLE_ID = "ema-button-runtime-styles";

const css = `
.ema-module-root .ema-scan-command-row > .ema-command-btn:nth-of-type(3):not(:disabled),
.ema-module-root .ema-command-btn.ema-command-primary:not(:disabled) {
  border-color: #2563eb !important;
  background: #2563eb !important;
  color: #ffffff !important;
  box-shadow: 0 12px 24px rgba(37, 99, 235, .22) !important;
}

.ema-module-root .ema-scan-command-row > .ema-command-btn:nth-of-type(3):not(:disabled) svg,
.ema-module-root .ema-command-btn.ema-command-primary:not(:disabled) svg {
  color: #ffffff !important;
  stroke: currentColor !important;
}

.ema-module-root .ema-scan-command-row > .ema-command-btn:nth-of-type(3):not(:disabled):hover,
.ema-module-root .ema-command-btn.ema-command-primary:not(:disabled):hover {
  border-color: #1d4ed8 !important;
  background: #1d4ed8 !important;
  color: #ffffff !important;
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
