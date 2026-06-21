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

body > div:has(> div > div > h3):has(table) {
  position: fixed !important;
  inset: 0 !important;
  z-index: 2147483400 !important;
  display: grid !important;
  place-items: center !important;
  background: rgba(15, 23, 42, .58) !important;
  backdrop-filter: blur(4px) !important;
  padding: 1.2rem !important;
}

body > div:has(> div > div > h3):has(table) > div {
  width: min(76rem, calc(100vw - 2.4rem)) !important;
  max-height: min(44rem, calc(100vh - 2.4rem)) !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  border: 1px solid #dbeafe !important;
  border-radius: 1rem !important;
  background: #ffffff !important;
  box-shadow: 0 28px 70px rgba(15, 23, 42, .38) !important;
}

body > div:has(> div > div > h3):has(table) > div > div:first-child {
  flex: 0 0 auto !important;
  display: flex !important;
  align-items: flex-start !important;
  justify-content: space-between !important;
  gap: .9rem !important;
  background: linear-gradient(135deg, #172554 0%, #2563eb 100%) !important;
  color: #ffffff !important;
  padding: 1rem 1.1rem !important;
}

body > div:has(> div > div > h3):has(table) > div > div:first-child h3 {
  margin: 0 !important;
  color: #ffffff !important;
  font-size: 1.15rem !important;
  font-weight: 950 !important;
  line-height: 1.2 !important;
}

body > div:has(> div > div > h3):has(table) > div > div:first-child span,
body > div:has(> div > div > h3):has(table) > div > div:first-child strong {
  color: rgba(255, 255, 255, .92) !important;
  font-size: .78rem !important;
  font-weight: 850 !important;
  line-height: 1.25 !important;
}

body > div:has(> div > div > h3):has(table) > div > div:first-child + div {
  flex: 0 0 auto !important;
  display: grid !important;
  grid-template-columns: minmax(18rem, 1fr) minmax(11rem, .3fr) minmax(11rem, .3fr) auto auto !important;
  gap: .55rem !important;
  align-items: center !important;
  border-bottom: 1px solid #dbe7f5 !important;
  background: #ffffff !important;
  padding: .75rem 1rem !important;
}

body > div:has(> div > div > h3):has(table) > div > div:first-child + div label {
  min-width: 0 !important;
  min-height: 2.45rem !important;
  display: flex !important;
  align-items: center !important;
  gap: .5rem !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: .8rem !important;
  background: #ffffff !important;
  padding: 0 .75rem !important;
}

body > div:has(> div > div > h3):has(table) > div > div:first-child + div input {
  width: 100% !important;
  min-width: 0 !important;
  border: 0 !important;
  outline: 0 !important;
  background: transparent !important;
  color: #0f172a !important;
  font-size: .82rem !important;
  font-weight: 750 !important;
}

body > div:has(> div > div > h3):has(table) > div > div:first-child + div > select,
body > div:has(> div > div > h3):has(table) > div > div:first-child + div > span,
body > div:has(> div > div > h3):has(table) > div > div:first-child + div > button {
  min-height: 2.45rem !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: .8rem !important;
  background: #ffffff !important;
  color: #0f172a !important;
  padding: 0 .8rem !important;
  font-size: .82rem !important;
  font-weight: 850 !important;
}

body > div:has(> div > div > h3):has(table) > div > div:has(> table) {
  flex: 1 1 auto !important;
  min-height: 14rem !important;
  overflow: auto !important;
  padding: 1rem !important;
}

body > div:has(> div > div > h3):has(table) table {
  width: 100% !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: .9rem !important;
  border-collapse: separate !important;
  border-spacing: 0 !important;
  overflow: hidden !important;
  table-layout: fixed !important;
}

body > div:has(> div > div > h3):has(table) thead th {
  background: #f1f5f9 !important;
  border-bottom: 1px solid #d8e4f2 !important;
  color: #334155 !important;
  padding: .75rem .8rem !important;
  font-size: .72rem !important;
  font-weight: 950 !important;
  text-transform: uppercase !important;
  letter-spacing: .04em !important;
}

body > div:has(> div > div > h3):has(table) tbody td {
  border-bottom: 1px solid #e2e8f0 !important;
  color: #0f172a !important;
  padding: .72rem .8rem !important;
  font-size: .8rem !important;
  font-weight: 750 !important;
  vertical-align: middle !important;
  white-space: normal !important;
  overflow-wrap: anywhere !important;
}

body > div:has(> div > div > h3):has(table) tbody tr:last-child td {
  border-bottom: 0 !important;
}

body > div:has(> div > div > h3):has(table) tbody td[colspan] {
  padding: 0 !important;
  text-align: center !important;
}

body > div:has(> div > div > h3):has(table) tbody td[colspan] > div {
  min-height: 7.5rem !important;
  width: 100% !important;
  display: grid !important;
  place-items: center !important;
  align-content: center !important;
  justify-items: center !important;
  gap: .35rem !important;
  padding: 1.25rem !important;
  text-align: center !important;
}

body > div:has(> div > div > h3):has(table) tbody td[colspan] > div > svg,
body > div:has(> div > div > h3):has(table) tbody td[colspan] > div svg {
  width: 2.3rem !important;
  height: 2.3rem !important;
  display: block !important;
  margin: 0 auto .25rem !important;
  color: #334155 !important;
  stroke-width: 2.2 !important;
}

body > div:has(> div > div > h3):has(table) tbody td[colspan] strong,
body > div:has(> div > div > h3):has(table) tbody td[colspan] span,
body > div:has(> div > div > h3):has(table) tbody td[colspan] p,
body > div:has(> div > div > h3):has(table) tbody td[colspan] small {
  display: block !important;
  width: 100% !important;
  margin: .05rem auto !important;
  text-align: center !important;
  line-height: 1.35 !important;
}

body > div:has(> div > div > h3):has(table) tbody td[colspan] strong {
  color: #0f172a !important;
  font-size: .88rem !important;
  font-weight: 950 !important;
}

body > div:has(> div > div > h3):has(table) tbody td[colspan] span,
body > div:has(> div > div > h3):has(table) tbody td[colspan] p,
body > div:has(> div > div > h3):has(table) tbody td[colspan] small {
  color: #64748b !important;
  font-size: .78rem !important;
  font-weight: 750 !important;
}

body > div:has(> div > div > h3):has(table) > div > footer {
  flex: 0 0 auto !important;
  border-top: 1px solid #dbe7f5 !important;
  padding: .72rem 1rem !important;
}

@media (max-width: 900px) {
  body > div:has(> div > div > h3):has(table) > div > div:first-child + div {
    grid-template-columns: minmax(0, 1fr) !important;
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
