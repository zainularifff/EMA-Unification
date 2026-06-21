const STYLE_ID = "ema-app-metering-runtime-styles";

const css = `
main[data-section="application-metering"] {
  min-height: 100vh !important;
  height: calc(100vh - 0px) !important;
  overflow: auto !important;
  background: #eef4fb !important;
  color: #0f172a !important;
  padding: .9rem !important;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
}

main[data-section="application-metering"] > input,
main[data-section="application-metering"] > button[hidden] {
  display: none !important;
}

main[data-section="application-metering"] > div:has(> aside) {
  width: 100% !important;
  min-height: calc(100vh - 1.8rem) !important;
  display: grid !important;
  grid-template-columns: 20rem minmax(0, 1fr) !important;
  gap: .85rem !important;
  align-items: stretch !important;
}

main[data-section="application-metering"] > div:has(> aside) > aside {
  min-width: 0 !important;
  min-height: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: 1rem !important;
  background: #ffffff !important;
  padding: 1rem !important;
  box-shadow: 0 18px 35px rgba(15, 23, 42, .06) !important;
  overflow: hidden !important;
}

main[data-section="application-metering"] > div:has(> aside) > aside > div:first-child span,
main[data-section="application-metering"] > div:has(> aside) > section > div:first-child > div:first-child span,
main[data-section="application-metering"] > div:has(> aside) > section > div:nth-child(2) > div:first-child > div:first-child span {
  display: block !important;
  color: #64748b !important;
  font-size: .68rem !important;
  font-weight: 950 !important;
  letter-spacing: .16em !important;
  text-transform: uppercase !important;
}

main[data-section="application-metering"] > div:has(> aside) > aside > div:first-child strong,
main[data-section="application-metering"] > div:has(> aside) > section h2,
main[data-section="application-metering"] > div:has(> aside) > section h3 {
  display: block !important;
  margin: .22rem 0 0 !important;
  color: #020617 !important;
  font-size: 1rem !important;
  font-weight: 950 !important;
  line-height: 1.15 !important;
}

main[data-section="application-metering"] > div:has(> aside) > aside > div:first-child small,
main[data-section="application-metering"] > div:has(> aside) > section p {
  display: block !important;
  margin: .35rem 0 0 !important;
  color: #475569 !important;
  font-size: .76rem !important;
  font-weight: 650 !important;
  line-height: 1.25 !important;
}

main[data-section="application-metering"] nav[role="tablist"] {
  margin-top: .95rem !important;
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: .35rem !important;
  border: 1px solid #dbe7f5 !important;
  border-radius: .9rem !important;
  background: #f8fafc !important;
  padding: .28rem !important;
}

main[data-section="application-metering"] nav[role="tablist"] button {
  min-height: 2.65rem !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: .45rem !important;
  border: 0 !important;
  border-radius: .72rem !important;
  background: #ffffff !important;
  color: #2563eb !important;
  padding: 0 .65rem !important;
  font-size: .82rem !important;
  font-weight: 950 !important;
  box-shadow: 0 4px 12px rgba(15, 23, 42, .05) !important;
}

main[data-section="application-metering"] nav[role="tablist"] small {
  display: none !important;
}

main[data-section="application-metering"] > div:has(> aside) > aside > div:nth-of-type(2) {
  min-height: 0 !important;
  flex: 1 1 auto !important;
  margin-top: .9rem !important;
  overflow: auto !important;
}

main[data-section="application-metering"] > div:has(> aside) > aside label[for="appmSidebarSearch"] {
  min-height: 2.55rem !important;
  display: flex !important;
  align-items: center !important;
  gap: .55rem !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: .85rem !important;
  background: #ffffff !important;
  padding: 0 .8rem !important;
  box-shadow: 0 5px 12px rgba(15, 23, 42, .03) !important;
}

main[data-section="application-metering"] input,
main[data-section="application-metering"] textarea {
  min-width: 0 !important;
  color: #334155 !important;
  font-weight: 750 !important;
  outline: 0 !important;
}

main[data-section="application-metering"] > div:has(> aside) > aside input {
  width: 100% !important;
  border: 0 !important;
  background: transparent !important;
  font-size: .82rem !important;
}

main[data-section="application-metering"] [role="tree"] {
  margin-top: .8rem !important;
  display: grid !important;
  gap: .38rem !important;
}

main[data-section="application-metering"] [role="tree"] div:has(> button + button) {
  width: 100% !important;
  min-height: 2.55rem !important;
  display: grid !important;
  grid-template-columns: 1.35rem minmax(0, 1fr) !important;
  align-items: center !important;
  gap: .3rem !important;
  border-radius: .85rem !important;
  background: #f8fafc !important;
  padding: .3rem .45rem !important;
}

main[data-section="application-metering"] [role="tree"] button {
  border: 0 !important;
  background: transparent !important;
  color: #0f172a !important;
  font-weight: 900 !important;
}

main[data-section="application-metering"] [role="tree"] button:nth-child(2) {
  min-width: 0 !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: .55rem !important;
  text-align: left !important;
}

main[data-section="application-metering"] [role="tree"] button:nth-child(2) span:first-child {
  width: 1.75rem !important;
  height: 1.75rem !important;
  flex: 0 0 1.75rem !important;
  display: inline-grid !important;
  place-items: center !important;
  border-radius: .6rem !important;
  background: #eef6ff !important;
  color: #486581 !important;
}

main[data-section="application-metering"] > div:has(> aside) > section {
  min-width: 0 !important;
  min-height: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: .85rem !important;
  overflow: hidden !important;
}

main[data-section="application-metering"] > div:has(> aside) > section > div:first-child {
  display: grid !important;
  grid-template-columns: minmax(13rem, .75fr) minmax(0, 2.9fr) !important;
  gap: .85rem !important;
  align-items: stretch !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: 1rem !important;
  background: #ffffff !important;
  padding: .95rem !important;
  box-shadow: 0 14px 28px rgba(15, 23, 42, .05) !important;
}

main[data-section="application-metering"] > div:has(> aside) > section > div:first-child > div:last-child {
  min-width: 0 !important;
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: .65rem !important;
}

main[data-section="application-metering"] > div:has(> aside) > section > div:first-child > div:last-child > button {
  min-width: 0 !important;
  min-height: 5.2rem !important;
  position: relative !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) !important;
  align-content: center !important;
  justify-items: start !important;
  gap: .18rem !important;
  border: 1px solid #dbe7f5 !important;
  border-radius: .9rem !important;
  background: #ffffff !important;
  color: #0f172a !important;
  padding: .8rem .9rem !important;
  text-align: left !important;
  box-shadow: 0 8px 18px rgba(15, 23, 42, .035) !important;
}

main[data-section="application-metering"] > div:has(> aside) > section > div:first-child > div:last-child > button:first-child {
  border-color: #60a5fa !important;
  box-shadow: inset 3px 0 0 #3b82f6, 0 10px 20px rgba(59, 130, 246, .08) !important;
}

main[data-section="application-metering"] > div:has(> aside) > section > div:first-child > div:last-child span {
  color: #475569 !important;
  font-size: .68rem !important;
  font-weight: 950 !important;
  letter-spacing: .08em !important;
  text-transform: uppercase !important;
}

main[data-section="application-metering"] > div:has(> aside) > section > div:first-child > div:last-child strong {
  color: #020617 !important;
  font-size: 1.35rem !important;
  font-weight: 950 !important;
  line-height: 1 !important;
}

main[data-section="application-metering"] > div:has(> aside) > section > div:first-child > div:last-child small {
  color: #64748b !important;
  font-size: .72rem !important;
  font-weight: 750 !important;
}

main[data-section="application-metering"] > div:has(> aside) > section > div:nth-child(2) {
  min-height: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: 1rem !important;
  background: #ffffff !important;
  overflow: hidden !important;
  box-shadow: 0 14px 28px rgba(15, 23, 42, .05) !important;
}

main[data-section="application-metering"] > div:has(> aside) > section > div:nth-child(2) > div:first-child {
  flex: 0 0 auto !important;
  display: flex !important;
  align-items: flex-start !important;
  justify-content: space-between !important;
  gap: .8rem !important;
  border-bottom: 1px solid #dbe7f5 !important;
  padding: .95rem 1rem !important;
}

main[data-section="application-metering"] > div:has(> aside) > section > div:nth-child(2) > div:first-child > div:last-child {
  display: inline-flex !important;
  align-items: center !important;
  gap: .45rem !important;
}

main[data-section="application-metering"] > div:has(> aside) > section > div:nth-child(2) > div:first-child button,
main[data-section="application-metering"] > div:has(> aside) > section > div:nth-child(2) > div:nth-child(2) button,
main[data-section="application-metering"] > div:has(> aside) > section > div:nth-child(2) > div:nth-child(2) > div:nth-child(2) button {
  min-height: 2.35rem !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: .45rem !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: .78rem !important;
  background: #ffffff !important;
  color: #0f172a !important;
  padding: 0 .8rem !important;
  font-size: .82rem !important;
  font-weight: 950 !important;
  box-shadow: 0 6px 14px rgba(15, 23, 42, .035) !important;
}

main[data-section="application-metering"] > div:has(> aside) > section > div:nth-child(2) > div:nth-child(2) {
  flex: 0 0 auto !important;
  display: grid !important;
  gap: .7rem !important;
  border-bottom: 1px solid #dbe7f5 !important;
  padding: .85rem 1rem !important;
}

main[data-section="application-metering"] label[for="appmRegistrySearch"] {
  min-width: 16rem !important;
  min-height: 2.45rem !important;
  display: flex !important;
  align-items: center !important;
  gap: .55rem !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: .85rem !important;
  background: #ffffff !important;
  padding: 0 .8rem !important;
  box-shadow: 0 5px 12px rgba(15, 23, 42, .03) !important;
}

main[data-section="application-metering"] label[for="appmRegistrySearch"] input {
  width: 100% !important;
  border: 0 !important;
  background: transparent !important;
}

main[data-section="application-metering"] > div:has(> aside) > section > div:nth-child(2) > div:nth-child(2) > div:first-child {
  display: grid !important;
  grid-template-columns: minmax(16rem, 1fr) auto !important;
  gap: .7rem !important;
  align-items: center !important;
}

main[data-section="application-metering"] [aria-label="Application metering filters"] {
  display: grid !important;
  grid-template-columns: repeat(6, minmax(8.6rem, 1fr)) !important;
  gap: .65rem !important;
  align-items: end !important;
}

main[data-section="application-metering"] [aria-label="Application metering filters"] label {
  min-width: 0 !important;
  display: grid !important;
  gap: .35rem !important;
  color: #475569 !important;
  font-size: .68rem !important;
  font-weight: 950 !important;
  letter-spacing: .08em !important;
  text-transform: uppercase !important;
}

main[data-section="application-metering"] [aria-label="Application metering filters"] input,
main[data-section="application-metering"] [aria-label="Application metering filters"] select {
  width: 100% !important;
  min-height: 2.4rem !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: .8rem !important;
  background: #ffffff !important;
  color: #0f172a !important;
  padding: 0 .75rem !important;
  font-size: .8rem !important;
  font-weight: 850 !important;
}

main[data-section="application-metering"] table {
  width: 100% !important;
  border-collapse: separate !important;
  border-spacing: 0 !important;
  table-layout: fixed !important;
}

main[data-section="application-metering"] > div:has(> aside) > section > div:nth-child(2) > div:nth-child(4) {
  min-height: 20rem !important;
  overflow: auto !important;
}

main[data-section="application-metering"] th {
  background: #f1f5f9 !important;
  border-bottom: 1px solid #d8e4f2 !important;
  color: #334155 !important;
  padding: .8rem .85rem !important;
  font-size: .72rem !important;
  font-weight: 950 !important;
  text-align: left !important;
  text-transform: uppercase !important;
  letter-spacing: .04em !important;
}

main[data-section="application-metering"] td {
  border-bottom: 1px solid #e2e8f0 !important;
  color: #0f172a !important;
  padding: .75rem .85rem !important;
  font-size: .78rem !important;
  font-weight: 780 !important;
  vertical-align: middle !important;
  white-space: normal !important;
  overflow-wrap: anywhere !important;
}

main[data-section="application-metering"] tbody tr:last-child td {
  border-bottom: 0 !important;
}

main[data-section="application-metering"] td small,
main[data-section="application-metering"] td span,
main[data-section="application-metering"] td strong {
  display: block !important;
  max-width: 100% !important;
  line-height: 1.25 !important;
  white-space: normal !important;
  overflow-wrap: anywhere !important;
}

main[data-section="application-metering"] td button {
  border: 0 !important;
  background: transparent !important;
  color: #1d4ed8 !important;
  padding: 0 !important;
  font-weight: 950 !important;
  text-align: left !important;
}

main[data-section="application-metering"] td[colspan] > div {
  min-height: 13rem !important;
  display: grid !important;
  place-items: center !important;
  align-content: center !important;
  gap: .3rem !important;
  color: #64748b !important;
  text-align: center !important;
}

main[data-section="application-metering"] [aria-label="Application metering pagination"] {
  flex: 0 0 auto !important;
  min-height: 3.7rem !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: .65rem !important;
  border-top: 1px solid #dbe7f5 !important;
  background: #ffffff !important;
  padding: .75rem 1rem !important;
}

main[data-section="application-metering"] [aria-label="Application metering pagination"] > div {
  color: #334155 !important;
  font-size: .82rem !important;
  font-weight: 900 !important;
}

main[data-section="application-metering"] [aria-label="Pagination controls"] {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: .35rem !important;
  margin-left: auto !important;
}

main[data-section="application-metering"] [aria-label="Pagination controls"] button,
main[data-section="application-metering"] [aria-label="Pagination controls"] b {
  width: 2.08rem !important;
  height: 2.08rem !important;
  min-width: 2.08rem !important;
  display: inline-grid !important;
  place-items: center !important;
  border: 1px solid #dbe7f5 !important;
  border-radius: .7rem !important;
  background: #ffffff !important;
  color: #64748b !important;
  padding: 0 !important;
  font-size: .78rem !important;
  font-weight: 950 !important;
}

main[data-section="application-metering"] [aria-label="Pagination controls"] b {
  border-color: #2563eb !important;
  background: #2563eb !important;
  color: #ffffff !important;
}

main[data-section="application-metering"] [aria-label="Pagination controls"] button:disabled {
  opacity: .45 !important;
}

main[data-section="application-metering"] > div:not(:has(> aside)):has(> section),
main[data-section="application-metering"] > div:not(:has(> aside)):has(> div > div > strong) {
  position: fixed !important;
  inset: 0 !important;
  z-index: 2147483300 !important;
  display: grid !important;
  place-items: center !important;
  background: rgba(15, 23, 42, .58) !important;
  backdrop-filter: blur(4px) !important;
  padding: 1.25rem !important;
}

main[data-section="application-metering"] > div:not(:has(> aside)) > section {
  width: min(62rem, calc(100vw - 2.5rem)) !important;
  max-height: min(45rem, calc(100vh - 2.5rem)) !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  border: 1px solid #dbeafe !important;
  border-radius: 1rem !important;
  background: #ffffff !important;
  box-shadow: 0 30px 80px rgba(15, 23, 42, .42) !important;
}

main[data-section="application-metering"] > div:not(:has(> aside)) > section > div:first-child {
  flex: 0 0 auto !important;
  display: flex !important;
  align-items: flex-start !important;
  justify-content: space-between !important;
  gap: 1rem !important;
  background: linear-gradient(135deg, #172554 0%, #2563eb 100%) !important;
  color: #ffffff !important;
  padding: 1rem 1.15rem !important;
}

main[data-section="application-metering"] > div:not(:has(> aside)) > section > div:first-child span,
main[data-section="application-metering"] > div:not(:has(> aside)) > section > div:first-child h3,
main[data-section="application-metering"] > div:not(:has(> aside)) > section > div:first-child p {
  color: #ffffff !important;
}

main[data-section="application-metering"] > div:not(:has(> aside)) > section > div:nth-child(2) {
  flex: 1 1 auto !important;
  overflow: auto !important;
  display: grid !important;
  gap: .75rem !important;
  padding: 1rem !important;
}

main[data-section="application-metering"] > div:not(:has(> aside)) > section > div:last-child {
  flex: 0 0 auto !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: .65rem !important;
  border-top: 1px solid #dbe7f5 !important;
  background: #f8fafc !important;
  padding: .9rem 1rem !important;
}

main[data-section="application-metering"] > div:not(:has(> aside)) > section input,
main[data-section="application-metering"] > div:not(:has(> aside)) > section select {
  width: 100% !important;
  min-height: 2.4rem !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: .75rem !important;
  background: #ffffff !important;
  padding: 0 .75rem !important;
}

main[data-section="application-metering"] > div:not(:has(> aside)) > section button {
  min-height: 2.4rem !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: .75rem !important;
  background: #ffffff !important;
  color: #2563eb !important;
  padding: 0 .85rem !important;
  font-size: .82rem !important;
  font-weight: 950 !important;
}

@media (max-width: 1100px) {
  main[data-section="application-metering"] > div:has(> aside) {
    grid-template-columns: minmax(0, 1fr) !important;
  }

  main[data-section="application-metering"] > div:has(> aside) > aside {
    min-height: 26rem !important;
  }

  main[data-section="application-metering"] > div:has(> aside) > section > div:first-child,
  main[data-section="application-metering"] > div:has(> aside) > section > div:first-child > div:last-child,
  main[data-section="application-metering"] [aria-label="Application metering filters"] {
    grid-template-columns: minmax(0, 1fr) !important;
  }

  main[data-section="application-metering"] > div:has(> aside) > section > div:nth-child(2) > div:nth-child(2) > div:first-child {
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
