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

main[data-section="users"] > div:has(> aside) > section > main > div:nth-of-type(2) > div > div:first-child:has(> strong:first-child) {
  display: none !important;
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

main[data-section="users"] > div:not(:has(> aside)):has(> div > form) {
  position: fixed !important;
  inset: 0 !important;
  z-index: 2147483400 !important;
  display: grid !important;
  place-items: center !important;
  background: rgba(15, 23, 42, .58) !important;
  backdrop-filter: blur(5px) !important;
  padding: 1rem !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> div > form) > div {
  width: min(44rem, calc(100vw - 2rem)) !important;
  max-height: min(90vh, 34rem) !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  border: 1px solid #dbeafe !important;
  border-radius: 1rem !important;
  background: #ffffff !important;
  box-shadow: 0 28px 70px rgba(15, 23, 42, .34) !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> div > form) > div > div:first-child {
  flex: 0 0 auto !important;
  display: flex !important;
  align-items: flex-start !important;
  justify-content: space-between !important;
  gap: 1rem !important;
  background: linear-gradient(135deg, #172554 0%, #2563eb 100%) !important;
  color: #ffffff !important;
  padding: 1rem 1.1rem !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> div > form) > div > div:first-child > div:first-child {
  min-width: 0 !important;
  display: flex !important;
  align-items: center !important;
  gap: .75rem !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> div > form) > div > div:first-child svg {
  width: 2.15rem !important;
  height: 2.15rem !important;
  flex: 0 0 2.15rem !important;
  border-radius: .7rem !important;
  background: rgba(255, 255, 255, .16) !important;
  padding: .48rem !important;
  color: #ffffff !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> div > form) > div > div:first-child strong {
  display: block !important;
  margin: 0 !important;
  color: #ffffff !important;
  font-size: 1.05rem !important;
  font-weight: 950 !important;
  line-height: 1.15 !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> div > form) > div > div:first-child span {
  display: block !important;
  margin-top: .25rem !important;
  color: rgba(255, 255, 255, .78) !important;
  font-size: .78rem !important;
  font-weight: 800 !important;
  letter-spacing: .02em !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> div > form) > div > div:first-child > button {
  width: 2.35rem !important;
  height: 2.35rem !important;
  flex: 0 0 2.35rem !important;
  display: inline-grid !important;
  place-items: center !important;
  border: 0 !important;
  border-radius: .75rem !important;
  background: rgba(255, 255, 255, .16) !important;
  color: #ffffff !important;
  padding: 0 !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> div > form) form {
  display: grid !important;
  gap: .9rem !important;
  padding: 1rem !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> div > form) form > div {
  min-width: 0 !important;
  display: grid !important;
  gap: .45rem !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> div > form) form label,
main[data-section="users"] > div:not(:has(> aside)):has(> div > form) form span {
  color: #475569 !important;
  font-size: .75rem !important;
  font-weight: 950 !important;
  letter-spacing: .05em !important;
  text-transform: uppercase !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> div > form) form input {
  width: 100% !important;
  height: 2.75rem !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: .85rem !important;
  background: #ffffff !important;
  color: #0f172a !important;
  padding: 0 .85rem !important;
  font-size: .88rem !important;
  font-weight: 800 !important;
  outline: 0 !important;
  box-shadow: 0 5px 12px rgba(15, 23, 42, .025) !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> div > form) form input::placeholder {
  color: #94a3b8 !important;
  font-weight: 750 !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> div > form) form > div:nth-child(2) {
  border: 1px solid #dbe7f5 !important;
  border-radius: .9rem !important;
  background: #f8fafc !important;
  padding: .85rem !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> div > form) form > div:nth-child(2) strong {
  display: block !important;
  margin-top: .2rem !important;
  color: #0f172a !important;
  font-size: .92rem !important;
  font-weight: 950 !important;
  line-height: 1.25 !important;
  word-break: break-word !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> div > form) form > div:last-child {
  display: flex !important;
  justify-content: flex-end !important;
  align-items: center !important;
  gap: .55rem !important;
  border-top: 1px solid #e2e8f0 !important;
  margin: .15rem -1rem -1rem !important;
  padding: .8rem 1rem !important;
  background: #f8fafc !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> div > form) form > div:last-child button {
  min-height: 2.45rem !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: .75rem !important;
  padding: 0 .95rem !important;
  font-size: .82rem !important;
  font-weight: 950 !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> div > form) form > div:last-child button:first-child {
  border: 1px solid #d8e4f2 !important;
  background: #ffffff !important;
  color: #1e293b !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> div > form) form > div:last-child button:last-child {
  border: 1px solid #2563eb !important;
  background: #2563eb !important;
  color: #ffffff !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> div > form) form > div:last-child button:disabled {
  cursor: not-allowed !important;
  opacity: .55 !important;
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
