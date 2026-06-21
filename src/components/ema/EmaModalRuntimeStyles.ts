const STYLE_ID = "ema-modal-runtime-styles";

const css = `
main[data-section="users"] > div:has(> div > div > h3):has(table) {
  position: fixed !important;
  inset: 0 !important;
  z-index: 2147483400 !important;
  display: grid !important;
  place-items: center !important;
  background: rgba(15, 23, 42, .58) !important;
  backdrop-filter: blur(4px) !important;
  padding: 1.2rem !important;
}

main[data-section="users"] > div:has(> div > div > h3):has(table) > div {
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

main[data-section="users"] > div:has(> div > div > h3):has(table) > div > div:first-child {
  flex: 0 0 auto !important;
  display: flex !important;
  align-items: flex-start !important;
  justify-content: space-between !important;
  gap: .9rem !important;
  background: linear-gradient(135deg, #172554 0%, #2563eb 100%) !important;
  color: #ffffff !important;
  padding: 1rem 1.1rem !important;
}

main[data-section="users"] > div:has(> div > div > h3):has(table) > div > div:first-child h3 {
  margin: 0 !important;
  color: #ffffff !important;
  font-size: 1.15rem !important;
  font-weight: 950 !important;
  line-height: 1.2 !important;
}

main[data-section="users"] > div:has(> div > div > h3):has(table) > div > div:first-child span,
main[data-section="users"] > div:has(> div > div > h3):has(table) > div > div:first-child strong {
  color: rgba(255, 255, 255, .92) !important;
  font-size: .78rem !important;
  font-weight: 850 !important;
  line-height: 1.25 !important;
}

main[data-section="users"] > div:has(> div > div > h3):has(table) > div > div:first-child + div {
  flex: 0 0 auto !important;
  display: grid !important;
  grid-template-columns: minmax(20rem, 1fr) minmax(12rem, .34fr) minmax(12rem, .34fr) auto auto !important;
  gap: .55rem !important;
  align-items: center !important;
  border-bottom: 1px solid #dbe7f5 !important;
  background: #ffffff !important;
  padding: .75rem 1rem !important;
}

main[data-section="users"] > div:has(> div > div > h3):has(table) > div > div:first-child + div label {
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

main[data-section="users"] > div:has(> div > div > h3):has(table) > div > div:first-child + div label svg {
  flex: 0 0 auto !important;
  color: #64748b !important;
}

main[data-section="users"] > div:has(> div > div > h3):has(table) > div > div:first-child + div input {
  width: 100% !important;
  min-width: 0 !important;
  border: 0 !important;
  outline: 0 !important;
  background: transparent !important;
  color: #0f172a !important;
  font-size: .82rem !important;
  font-weight: 750 !important;
}

main[data-section="users"] > div:has(> div > div > h3):has(table) > div > div:first-child + div input::placeholder {
  color: #94a3b8 !important;
}

main[data-section="users"] > div:has(> div > div > h3):has(table) > div > div:first-child + div > select,
main[data-section="users"] > div:has(> div > div > h3):has(table) > div > div:first-child + div > span,
main[data-section="users"] > div:has(> div > div > h3):has(table) > div > div:first-child + div > button {
  min-height: 2.45rem !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: .8rem !important;
  background: #ffffff !important;
  color: #0f172a !important;
  padding: 0 .8rem !important;
  font-size: .82rem !important;
  font-weight: 850 !important;
  white-space: nowrap !important;
}

main[data-section="users"] > div:has(> div > div > h3):has(table) > div > div:first-child + div > span {
  color: #64748b !important;
}

main[data-section="users"] > div:has(> div > div > h3):has(table) > div > div:has(> table) {
  flex: 1 1 auto !important;
  min-height: 14rem !important;
  overflow: auto !important;
  padding: 1rem !important;
}

main[data-section="users"] > div:has(> div > div > h3):has(table) table {
  width: 100% !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: .9rem !important;
  border-collapse: separate !important;
  border-spacing: 0 !important;
  overflow: hidden !important;
  table-layout: fixed !important;
}

main[data-section="users"] > div:has(> div > div > h3):has(table) thead th {
  background: #f1f5f9 !important;
  border-bottom: 1px solid #d8e4f2 !important;
  color: #334155 !important;
  padding: .75rem .8rem !important;
  font-size: .72rem !important;
  font-weight: 950 !important;
  text-transform: uppercase !important;
  letter-spacing: .04em !important;
}

main[data-section="users"] > div:has(> div > div > h3):has(table) tbody td {
  border-bottom: 1px solid #e2e8f0 !important;
  color: #0f172a !important;
  padding: .72rem .8rem !important;
  font-size: .8rem !important;
  font-weight: 750 !important;
  vertical-align: middle !important;
  white-space: normal !important;
  overflow-wrap: anywhere !important;
}

main[data-section="users"] > div:has(> div > div > h3):has(table) tbody tr:last-child td {
  border-bottom: 0 !important;
}

main[data-section="users"] > div:has(> div > div > h3):has(table) tbody td[colspan],
main[data-section="users"] > div:has(> div > div > h3):has(table) tbody td[colspan] > div {
  text-align: center !important;
}

main[data-section="users"] > div:has(> div > div > h3):has(table) tbody td[colspan] svg {
  width: 2.2rem !important;
  height: 2.2rem !important;
  margin: 0 auto .45rem !important;
  color: #64748b !important;
}

main[data-section="users"] > div:has(> div > div > h3):has(table) tbody td[colspan] strong,
main[data-section="users"] > div:has(> div > div > h3):has(table) tbody td[colspan] span {
  display: block !important;
  margin: .15rem auto !important;
  line-height: 1.25 !important;
}

main[data-section="users"] > div:has(> div > div > h3):has(table) > div > footer {
  flex: 0 0 auto !important;
  border-top: 1px solid #dbe7f5 !important;
  background: #ffffff !important;
  padding: .72rem 1rem !important;
}

@media (max-width: 900px) {
  main[data-section="users"] > div:has(> div > div > h3):has(table) > div > div:first-child + div {
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
