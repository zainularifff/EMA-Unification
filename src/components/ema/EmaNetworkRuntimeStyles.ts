const STYLE_ID = "ema-network-runtime-styles";

const css = `
body > div[role="listbox"][aria-label*="status" i],
body > div[role="listbox"][aria-label*="network" i],
body > div[role="listbox"][aria-label*="agent" i],
body > div[role="listbox"][aria-label*="workgroup" i] {
  position: fixed !important;
  top: 7.25rem !important;
  right: 2rem !important;
  left: auto !important;
  bottom: auto !important;
  width: min(15rem, calc(100vw - 2rem)) !important;
  max-width: min(15rem, calc(100vw - 2rem)) !important;
  max-height: 18rem !important;
  z-index: 2147483647 !important;
  display: grid !important;
  gap: .22rem !important;
  overflow: auto !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: .85rem !important;
  background: #ffffff !important;
  padding: .35rem !important;
  box-shadow: 0 18px 38px rgba(15, 23, 42, .18) !important;
}

body > div[role="listbox"][aria-label*="status" i] button,
body > div[role="listbox"][aria-label*="network" i] button,
body > div[role="listbox"][aria-label*="agent" i] button,
body > div[role="listbox"][aria-label*="workgroup" i] button {
  width: 100% !important;
  min-height: 2.35rem !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: .55rem !important;
  border: 0 !important;
  border-radius: .65rem !important;
  background: transparent !important;
  color: #0f172a !important;
  padding: 0 .75rem !important;
  font-size: .82rem !important;
  font-weight: 850 !important;
  text-align: left !important;
}

body > div[role="listbox"][aria-label*="status" i] button:hover,
body > div[role="listbox"][aria-label*="network" i] button:hover,
body > div[role="listbox"][aria-label*="agent" i] button:hover,
body > div[role="listbox"][aria-label*="workgroup" i] button:hover,
body > div[role="listbox"] button[aria-selected="true"] {
  background: #eff6ff !important;
  color: #1d4ed8 !important;
}

main[data-section="users"] td div:has(> span > svg) {
  min-width: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: .65rem !important;
  line-height: 1.2 !important;
}

main[data-section="users"] td div:has(> span > svg) > span:first-child {
  width: 1.95rem !important;
  height: 1.95rem !important;
  flex: 0 0 1.95rem !important;
  display: inline-grid !important;
  place-items: center !important;
  border-radius: .65rem !important;
  background: #f1f5f9 !important;
  color: #486581 !important;
}

main[data-section="users"] td div:has(> span > svg) > span:nth-child(2),
main[data-section="users"] td div:has(> span > svg) > div {
  min-width: 0 !important;
  display: grid !important;
  gap: .12rem !important;
  align-content: center !important;
}

main[data-section="users"] td div:has(> span > svg) strong,
main[data-section="users"] td div:has(> span > svg) small {
  display: block !important;
  margin: 0 !important;
  line-height: 1.2 !important;
  white-space: normal !important;
  overflow-wrap: anywhere !important;
}

main[data-section="users"] td div:has(> span > svg) strong {
  color: #020617 !important;
  font-size: .82rem !important;
  font-weight: 950 !important;
}

main[data-section="users"] td div:has(> span > svg) small {
  color: #64748b !important;
  font-size: .7rem !important;
  font-weight: 750 !important;
}

main[data-section="users"] table:has(th:nth-child(1):last-child),
main[data-section="users"] table:has(th:nth-child(3):last-child) {
  table-layout: fixed !important;
}

main[data-section="users"] table:has(th:nth-child(3):last-child) td:nth-child(2),
main[data-section="users"] table:has(th:nth-child(3):last-child) th:nth-child(2),
main[data-section="users"] table:has(th:nth-child(3):last-child) td:nth-child(3),
main[data-section="users"] table:has(th:nth-child(3):last-child) th:nth-child(3) {
  text-align: center !important;
}

main[data-section="users"] table:has(th:nth-child(3):last-child) td:nth-child(3) button {
  width: 2.05rem !important;
  height: 2.05rem !important;
  display: inline-grid !important;
  place-items: center !important;
  border: 0 !important;
  border-radius: .7rem !important;
  background: #f8fafc !important;
  color: #334155 !important;
}

main[data-section="users"] table:has(th:nth-child(3):last-child) td:nth-child(3) button:hover {
  background: #eff6ff !important;
  color: #1d4ed8 !important;
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
