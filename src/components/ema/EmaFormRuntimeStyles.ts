const STYLE_ID = "ema-form-runtime-styles";

const css = `
/* Network/registry toolbar polish: no double line/card around search filter row */
main[data-section="users"] > div:has(> aside) > section > main > div:nth-of-type(1) {
  border-top: 0 !important;
  border-bottom: 0 !important;
  box-shadow: none !important;
  background: transparent !important;
  padding: .85rem 1rem !important;
  gap: .7rem !important;
}

main[data-section="users"] > div:has(> aside) > section > main > div:nth-of-type(1)::before,
main[data-section="users"] > div:has(> aside) > section > main > div:nth-of-type(1)::after {
  display: none !important;
  content: none !important;
}

/* Custom select wrapper must not look like a container inside another container */
main[data-section="users"] > div:has(> aside) > section > main > div:nth-of-type(1) > div:has(> button[aria-label*="Filter" i]) {
  min-height: 0 !important;
  display: block !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  padding: 0 !important;
}

main[data-section="users"] button[aria-label*="Filter" i] {
  min-width: 8.6rem !important;
  min-height: 2.45rem !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: .65rem !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: .8rem !important;
  background: #ffffff !important;
  color: #0f172a !important;
  padding: 0 .85rem !important;
  font-size: .8rem !important;
  font-weight: 950 !important;
  box-shadow: none !important;
}

main[data-section="users"] button[aria-label*="Filter" i]:hover,
main[data-section="users"] button[aria-label*="Filter" i][aria-expanded="true"] {
  border-color: #93c5fd !important;
  background: #eff6ff !important;
  color: #1d4ed8 !important;
}

main[data-section="users"] button[aria-label*="Filter" i] svg {
  flex: 0 0 auto !important;
  width: .95rem !important;
  height: .95rem !important;
}

/* Table icon + text alignment */
main[data-section="users"] table td > div:has(> span > svg):has(> div) {
  min-width: 0 !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: .55rem !important;
  vertical-align: middle !important;
}

main[data-section="users"] table td > div:has(> span > svg):has(> div) > span:first-child {
  width: 1.8rem !important;
  height: 1.8rem !important;
  flex: 0 0 1.8rem !important;
  display: inline-grid !important;
  place-items: center !important;
  border-radius: .65rem !important;
  background: #f1f5f9 !important;
  color: #334155 !important;
}

main[data-section="users"] table td > div:has(> span > svg):has(> div) > div {
  min-width: 0 !important;
  display: grid !important;
  gap: .12rem !important;
  line-height: 1.18 !important;
}

main[data-section="users"] table td > div:has(> span > svg):has(> div) strong,
main[data-section="users"] table td > div:has(> span > svg):has(> div) small {
  display: block !important;
  min-width: 0 !important;
  max-width: 100% !important;
  white-space: normal !important;
  overflow-wrap: anywhere !important;
  word-break: break-word !important;
}

/* Device Status table where icon/label/subtitle are direct children in td */
main[data-section="users"] table td > svg:first-child {
  display: inline-block !important;
  width: 1rem !important;
  height: 1rem !important;
  margin-right: .55rem !important;
  vertical-align: middle !important;
  color: #334155 !important;
}

main[data-section="users"] table td > svg:first-child + strong {
  display: inline !important;
  vertical-align: middle !important;
  font-weight: 950 !important;
}

main[data-section="users"] table td > svg:first-child + strong + small {
  display: block !important;
  margin-top: .16rem !important;
  margin-left: 1.6rem !important;
  color: #64748b !important;
  font-size: .74rem !important;
  font-weight: 750 !important;
  line-height: 1.2 !important;
}

/* Add/Edit device modal form */
main[data-section="users"] > div:not(:has(> aside)):has(> form) {
  position: fixed !important;
  inset: 0 !important;
  z-index: 2147483400 !important;
  display: grid !important;
  place-items: center !important;
  background: rgba(15, 23, 42, .58) !important;
  padding: 1rem !important;
  backdrop-filter: blur(5px) !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> form) > form {
  width: min(58rem, 96vw) !important;
  max-height: 88vh !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  border: 1px solid #dbe7f5 !important;
  border-radius: 1rem !important;
  background: #ffffff !important;
  box-shadow: 0 28px 70px rgba(15, 23, 42, .28) !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> form) > form > div:first-child {
  flex: 0 0 auto !important;
  display: flex !important;
  align-items: flex-start !important;
  justify-content: space-between !important;
  gap: 1rem !important;
  background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%) !important;
  color: #ffffff !important;
  padding: 1rem 1.1rem !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> form) > form > div:first-child span {
  display: block !important;
  color: rgba(255, 255, 255, .74) !important;
  font-size: .7rem !important;
  font-weight: 950 !important;
  letter-spacing: .12em !important;
  text-transform: uppercase !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> form) > form > div:first-child h2 {
  margin: .24rem 0 .18rem !important;
  color: #ffffff !important;
  font-size: 1.18rem !important;
  font-weight: 950 !important;
  line-height: 1.1 !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> form) > form > div:first-child p {
  margin: 0 !important;
  color: rgba(255, 255, 255, .78) !important;
  font-size: .82rem !important;
  font-weight: 750 !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> form) > form > div:first-child > button {
  width: 2.35rem !important;
  height: 2.35rem !important;
  flex: 0 0 2.35rem !important;
  display: inline-grid !important;
  place-items: center !important;
  border: 0 !important;
  border-radius: .75rem !important;
  background: rgba(255, 255, 255, .16) !important;
  color: #ffffff !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> form) > form > div:nth-of-type(2) {
  min-height: 0 !important;
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: .9rem !important;
  overflow: auto !important;
  padding: 1rem !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> form) > form > div:nth-of-type(2) > div {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: .9rem !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> form) label {
  min-width: 0 !important;
  display: grid !important;
  gap: .4rem !important;
  color: #334155 !important;
  font-size: .76rem !important;
  font-weight: 950 !important;
  letter-spacing: .03em !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> form) label > span {
  display: block !important;
  color: #475569 !important;
  font-size: .72rem !important;
  font-weight: 950 !important;
  letter-spacing: .06em !important;
  text-transform: uppercase !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> form) input,
main[data-section="users"] > div:not(:has(> aside)):has(> form) select,
main[data-section="users"] > div:not(:has(> aside)):has(> form) textarea {
  width: 100% !important;
  min-width: 0 !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: .8rem !important;
  background: #ffffff !important;
  color: #0f172a !important;
  padding: 0 .8rem !important;
  font-size: .86rem !important;
  font-weight: 750 !important;
  outline: 0 !important;
  box-shadow: 0 5px 12px rgba(15, 23, 42, .025) !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> form) input,
main[data-section="users"] > div:not(:has(> aside)):has(> form) select {
  height: 2.65rem !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> form) textarea {
  min-height: 5.75rem !important;
  padding-top: .75rem !important;
  resize: vertical !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> form) label:has(textarea) {
  grid-column: 1 / -1 !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> form) > form > div:last-child {
  flex: 0 0 auto !important;
  display: flex !important;
  justify-content: flex-end !important;
  align-items: center !important;
  gap: .6rem !important;
  border-top: 1px solid #e2e8f0 !important;
  background: #f8fafc !important;
  padding: .8rem 1rem !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> form) > form > div:last-child button {
  min-height: 2.45rem !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: .45rem !important;
  border-radius: .75rem !important;
  padding: 0 .95rem !important;
  font-size: .82rem !important;
  font-weight: 950 !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> form) > form > div:last-child button:first-child {
  border: 1px solid #d8e4f2 !important;
  background: #ffffff !important;
  color: #1e293b !important;
}

main[data-section="users"] > div:not(:has(> aside)):has(> form) > form > div:last-child button:last-child {
  border: 1px solid #2563eb !important;
  background: #2563eb !important;
  color: #ffffff !important;
}

@media (max-width: 760px) {
  main[data-section="users"] > div:not(:has(> aside)):has(> form) > form > div:nth-of-type(2),
  main[data-section="users"] > div:not(:has(> aside)):has(> form) > form > div:nth-of-type(2) > div {
    grid-template-columns: 1fr !important;
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
