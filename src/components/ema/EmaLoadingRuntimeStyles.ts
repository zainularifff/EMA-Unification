const STYLE_ID = "ema-loading-runtime-styles";

const css = `
@keyframes ema-loading-spin {
  to { transform: rotate(360deg); }
}

.ema-loading-state,
.ema-empty-state {
  min-height: 14rem !important;
  display: grid !important;
  place-items: center !important;
  text-align: center !important;
  color: #64748b !important;
  font-size: .76rem !important;
  font-weight: 950 !important;
  letter-spacing: .14em !important;
  text-transform: uppercase !important;
}

.ema-loading-state svg,
.ema-loading-state .ema-spinner,
.ema-spinner {
  width: 2.55rem !important;
  height: 2.55rem !important;
  margin: 0 auto .75rem !important;
  color: #2563eb !important;
  animation: ema-loading-spin .85s linear infinite !important;
}

.ema-loading-state .ema-spinner,
.ema-spinner {
  display: block !important;
  border: .22rem solid #dbeafe !important;
  border-top-color: #2563eb !important;
  border-radius: 999px !important;
}

main[data-section="users"] [aria-label="Network IP and subnet tree"] > div:not(:has(button)),
main[data-section="users"] div:has(> svg[class*="loader" i]):not(button):not(label):not(th):not(td) {
  min-height: 12rem !important;
  display: grid !important;
  place-items: center !important;
  gap: .75rem !important;
  text-align: center !important;
  color: #64748b !important;
  font-size: .74rem !important;
  font-weight: 950 !important;
  letter-spacing: .14em !important;
  text-transform: uppercase !important;
}

main[data-section="users"] [aria-label="Network IP and subnet tree"] > div:not(:has(button)) svg,
main[data-section="users"] div:has(> svg[class*="loader" i]):not(button):not(label):not(th):not(td) > svg[class*="loader" i] {
  width: 2.55rem !important;
  height: 2.55rem !important;
  color: #2563eb !important;
  animation: ema-loading-spin .85s linear infinite !important;
  stroke-width: 2.4 !important;
}

main[data-section="users"] [aria-label="Network IP and subnet tree"] > div:not(:has(button)) {
  border: 1px dashed #dbe7f5 !important;
  border-radius: .95rem !important;
  background: #f8fbff !important;
  padding: 1rem !important;
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
