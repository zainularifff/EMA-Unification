const STYLE_ID = "ema-bare-page-runtime-styles";

const css = `
main[data-section="users"] {
  min-height: 100vh !important;
  height: calc(100vh - 0px) !important;
  overflow: auto !important;
  background: #eef4fb !important;
  color: #0f172a !important;
  padding: .9rem !important;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
}

main[data-section="users"] > input,
main[data-section="users"] > button[hidden] {
  display: none !important;
}

main[data-section="users"] > div:has(> aside) {
  width: 100% !important;
  min-height: calc(100vh - 1.8rem) !important;
  display: grid !important;
  grid-template-columns: 20rem minmax(0, 1fr) !important;
  gap: .85rem !important;
  align-items: stretch !important;
}

main[data-section="users"] > div:has(> aside) > aside {
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

main[data-section="users"] > div:has(> aside) > aside > div:first-child span {
  display: block !important;
  color: #64748b !important;
  font-size: .68rem !important;
  font-weight: 950 !important;
  letter-spacing: .16em !important;
  text-transform: uppercase !important;
}

main[data-section="users"] > div:has(> aside) > aside > div:first-child strong {
  display: block !important;
  margin-top: .25rem !important;
  color: #020617 !important;
  font-size: 1rem !important;
  font-weight: 950 !important;
  line-height: 1.15 !important;
}

main[data-section="users"] > div:has(> aside) > aside > div:first-child small {
  display: block !important;
  margin-top: .35rem !important;
  color: #475569 !important;
  font-size: .76rem !important;
  font-weight: 650 !important;
  line-height: 1.25 !important;
}

main[data-section="users"] > div:has(> aside) > aside nav {
  margin-top: .95rem !important;
  display: grid !important;
  grid-template-columns: 1fr !important;
  gap: .35rem !important;
  border: 1px solid #dbe7f5 !important;
  border-radius: .9rem !important;
  background: #f8fafc !important;
  padding: .28rem !important;
}

main[data-section="users"] > div:has(> aside) > aside nav button {
  min-height: 2.65rem !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: .55rem !important;
  border: 0 !important;
  border-radius: .72rem !important;
  background: #ffffff !important;
  color: #2563eb !important;
  padding: 0 .85rem !important;
  font-size: .82rem !important;
  font-weight: 950 !important;
  box-shadow: 0 4px 12px rgba(15, 23, 42, .05) !important;
}

main[data-section="users"] > div:has(> aside) > aside nav small {
  display: none !important;
}

main[data-section="users"] > div:has(> aside) > aside > div:nth-of-type(2) {
  min-height: 0 !important;
  flex: 1 1 auto !important;
  margin-top: .9rem !important;
  overflow: auto !important;
}

main[data-section="users"] > div:has(> aside) > aside input {
  width: 100% !important;
  min-width: 0 !important;
  border: 0 !important;
  background: transparent !important;
  color: #334155 !important;
  outline: 0 !important;
  font-size: .82rem !important;
  font-weight: 750 !important;
}

main[data-section="users"] > div:has(> aside) > aside input::placeholder {
  color: #94a3b8 !important;
}

main[data-section="users"] > div:has(> aside) > aside > div:nth-of-type(2) > div > div:first-child > div:first-child {
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

main[data-section="users"] > div:has(> aside) > aside > div:nth-of-type(2) > div > div:first-child > button {
  width: 100% !important;
  min-height: 2.55rem !important;
  margin-top: .7rem !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: .45rem !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: .85rem !important;
  background: #ffffff !important;
  color: #0f172a !important;
  font-size: .82rem !important;
  font-weight: 950 !important;
  box-shadow: 0 5px 12px rgba(15, 23, 42, .03) !important;
}

main[data-section="users"] > div:has(> aside) > aside [aria-label="Network IP and subnet tree"] {
  margin-top: .8rem !important;
}

main[data-section="users"] > div:has(> aside) > aside [aria-label="Network IP and subnet tree"] div div:has(> button + button) {
  width: 100% !important;
  min-height: 2.55rem !important;
  display: grid !important;
  grid-template-columns: 1.4rem minmax(0, 1fr) 1.5rem !important;
  align-items: center !important;
  gap: .3rem !important;
  margin-bottom: .36rem !important;
  border-radius: .85rem !important;
  background: #f8fafc !important;
  padding: .3rem .45rem !important;
}

main[data-section="users"] > div:has(> aside) > aside [aria-label="Network IP and subnet tree"] button {
  border: 0 !important;
  background: transparent !important;
  color: #0f172a !important;
  font-weight: 850 !important;
}

main[data-section="users"] > div:has(> aside) > aside [aria-label="Network IP and subnet tree"] button:nth-child(2) {
  min-width: 0 !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: .55rem !important;
  text-align: left !important;
}

main[data-section="users"] > div:has(> aside) > aside [aria-label="Network IP and subnet tree"] button:nth-child(2) span:nth-child(1) {
  width: 1.75rem !important;
  height: 1.75rem !important;
  flex: 0 0 1.75rem !important;
  display: inline-grid !important;
  place-items: center !important;
  border-radius: .6rem !important;
  background: #eef6ff !important;
  color: #486581 !important;
}

main[data-section="users"] > div:has(> aside) > section {
  min-width: 0 !important;
  min-height: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: .85rem !important;
  overflow: hidden !important;
}

main[data-section="users"] > div:has(> aside) > section > section:first-child {
  display: grid !important;
  grid-template-columns: minmax(12rem, .82fr) minmax(0, 2.8fr) !important;
  gap: .85rem !important;
  align-items: stretch !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: 1rem !important;
  background: #ffffff !important;
  padding: .95rem !important;
  box-shadow: 0 14px 28px rgba(15, 23, 42, .05) !important;
}

main[data-section="users"] > div:has(> aside) > section > section:first-child > div:first-child span,
main[data-section="users"] > div:has(> aside) > section main header span {
  display: block !important;
  color: #64748b !important;
  font-size: .68rem !important;
  font-weight: 950 !important;
  letter-spacing: .16em !important;
  text-transform: uppercase !important;
}

main[data-section="users"] > div:has(> aside) > section > section:first-child h2,
main[data-section="users"] > div:has(> aside) > section main h3 {
  margin: .2rem 0 0 !important;
  color: #020617 !important;
  font-size: 1.02rem !important;
  font-weight: 950 !important;
  line-height: 1.15 !important;
}

main[data-section="users"] > div:has(> aside) > section > section:first-child p,
main[data-section="users"] > div:has(> aside) > section main header p {
  margin: .35rem 0 0 !important;
  color: #334155 !important;
  font-size: .78rem !important;
  font-weight: 650 !important;
  line-height: 1.25 !important;
}

main[data-section="users"] > div:has(> aside) > section > section:first-child > div:last-child {
  min-width: 0 !important;
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: .65rem !important;
}

main[data-section="users"] > div:has(> aside) > section > section:first-child > div:last-child > div {
  min-width: 0 !important;
  min-height: 5.2rem !important;
  position: relative !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) 2.25rem !important;
  align-content: center !important;
  gap: .2rem .55rem !important;
  border: 1px solid #dbe7f5 !important;
  border-radius: .9rem !important;
  background: #ffffff !important;
  padding: .75rem !important;
  box-shadow: 0 8px 18px rgba(15, 23, 42, .035) !important;
}

main[data-section="users"] > div:has(> aside) > section > section:first-child > div:last-child > div:first-child {
  border-color: #60a5fa !important;
  box-shadow: inset 3px 0 0 #3b82f6, 0 10px 20px rgba(59, 130, 246, .08) !important;
}

main[data-section="users"] > div:has(> aside) > section > section:first-child > div:last-child span {
  color: #475569 !important;
  font-size: .68rem !important;
  font-weight: 950 !important;
  letter-spacing: .08em !important;
  text-transform: uppercase !important;
}

main[data-section="users"] > div:has(> aside) > section > section:first-child > div:last-child strong {
  color: #020617 !important;
  font-size: 1.35rem !important;
  font-weight: 950 !important;
  line-height: 1 !important;
}

main[data-section="users"] > div:has(> aside) > section > section:first-child > div:last-child small {
  color: #64748b !important;
  font-size: .72rem !important;
  font-weight: 750 !important;
}

main[data-section="users"] > div:has(> aside) > section > section:first-child > div:last-child i {
  grid-row: 1 / span 3 !important;
  grid-column: 2 !important;
  width: 2.25rem !important;
  height: 2.25rem !important;
  display: grid !important;
  place-items: center !important;
  border-radius: .7rem !important;
  background: #eff6ff !important;
  color: #2563eb !important;
  font-style: normal !important;
}

main[data-section="users"] > div:has(> aside) > section > main {
  min-height: 0 !important;
  flex: 1 1 auto !important;
  display: flex !important;
  flex-direction: column !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: 1rem !important;
  background: #ffffff !important;
  box-shadow: 0 14px 28px rgba(15, 23, 42, .05) !important;
  overflow: hidden !important;
}

main[data-section="users"] > div:has(> aside) > section > main > header {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: .8rem !important;
  border-bottom: 1px solid #e2e8f0 !important;
  padding: .9rem 1rem !important;
}

main[data-section="users"] > div:has(> aside) > section > main > header > div:last-child {
  display: inline-flex !important;
  align-items: center !important;
  gap: .45rem !important;
  border: 1px solid #dbe7f5 !important;
  border-radius: .85rem !important;
  background: #f8fafc !important;
  padding: .25rem !important;
}

main[data-section="users"] > div:has(> aside) > section > main > header > div:last-child button {
  min-height: 2.25rem !important;
  border: 0 !important;
  border-radius: .65rem !important;
  background: #ffffff !important;
  color: #2563eb !important;
  padding: 0 .8rem !important;
  font-size: .78rem !important;
  font-weight: 950 !important;
}

main[data-section="users"] > div:has(> aside) > section > main > div:nth-of-type(1) {
  display: flex !important;
  align-items: center !important;
  gap: .65rem !important;
  border-bottom: 1px solid #e2e8f0 !important;
  padding: .75rem 1rem !important;
}

main[data-section="users"] > div:has(> aside) > section > main > div:nth-of-type(1) label,
main[data-section="users"] > div:has(> aside) > section > main > div:nth-of-type(1) > div:not(:last-child) {
  min-height: 2.45rem !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: .45rem !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: .8rem !important;
  background: #ffffff !important;
  padding: 0 .75rem !important;
}

main[data-section="users"] > div:has(> aside) > section > main > div:nth-of-type(1) label {
  flex: 1 1 auto !important;
}

main[data-section="users"] > div:has(> aside) > section > main > div:nth-of-type(1) input {
  min-width: 0 !important;
  flex: 1 1 auto !important;
  border: 0 !important;
  background: transparent !important;
  outline: 0 !important;
  font-size: .82rem !important;
  font-weight: 750 !important;
}

main[data-section="users"] > div:has(> aside) > section > main > div:nth-of-type(1) button {
  min-height: 2.45rem !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: .45rem !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: .8rem !important;
  background: #ffffff !important;
  color: #0f172a !important;
  padding: 0 .85rem !important;
  font-size: .8rem !important;
  font-weight: 950 !important;
}

main[data-section="users"] > div:has(> aside) > section > main > div:nth-of-type(1) button:last-child {
  border-color: #2563eb !important;
  background: #2563eb !important;
  color: #ffffff !important;
}

main[data-section="users"] > div:has(> aside) > section > main > div:nth-of-type(2) {
  min-height: 0 !important;
  flex: 1 1 auto !important;
  overflow: auto !important;
  padding: 1rem !important;
}

main[data-section="users"] table {
  width: 100% !important;
  border-collapse: separate !important;
  border-spacing: 0 !important;
  overflow: hidden !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: .9rem !important;
  background: #ffffff !important;
}

main[data-section="users"] th,
main[data-section="users"] td {
  border-bottom: 1px solid #e2e8f0 !important;
  padding: .75rem !important;
  color: #0f172a !important;
  font-size: .8rem !important;
  font-weight: 750 !important;
  text-align: left !important;
  vertical-align: middle !important;
  white-space: normal !important;
  overflow-wrap: anywhere !important;
}

main[data-section="users"] th {
  background: #f1f5f9 !important;
  color: #334155 !important;
  font-size: .7rem !important;
  font-weight: 950 !important;
  letter-spacing: .03em !important;
  text-transform: uppercase !important;
}

main[data-section="users"] > div:has(> section[role="dialog"]) {
  position: fixed !important;
  inset: 0 !important;
  z-index: 2147483400 !important;
  display: grid !important;
  place-items: center !important;
  background: rgba(15, 23, 42, .5) !important;
  padding: 1rem !important;
  backdrop-filter: blur(4px) !important;
}

main[data-section="users"] section[role="dialog"] {
  width: min(48rem, 96vw) !important;
  max-height: 88vh !important;
  overflow: auto !important;
  border: 1px solid #dbe7f5 !important;
  border-radius: 1rem !important;
  background: #ffffff !important;
  padding: 1rem !important;
  box-shadow: 0 24px 60px rgba(15, 23, 42, .22) !important;
}

main[data-section="users"] section[role="dialog"] h3 {
  margin: 0 0 .4rem !important;
  color: #020617 !important;
  font-size: 1rem !important;
  font-weight: 950 !important;
}

body > div[role="listbox"] {
  overflow: auto !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: .85rem !important;
  background: #ffffff !important;
  padding: .35rem !important;
  box-shadow: 0 20px 45px rgba(15, 23, 42, .18) !important;
}

body > div[role="listbox"] button {
  width: 100% !important;
  min-height: 2.25rem !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  border: 0 !important;
  border-radius: .65rem !important;
  background: transparent !important;
  padding: 0 .65rem !important;
  color: #0f172a !important;
  font-size: .82rem !important;
  font-weight: 850 !important;
}

body > div[role="listbox"] button:hover {
  background: #eff6ff !important;
  color: #2563eb !important;
}

@media (max-width: 1180px) {
  main[data-section="users"] > div:has(> aside) {
    grid-template-columns: 18rem minmax(0, 1fr) !important;
  }

  main[data-section="users"] > div:has(> aside) > section > section:first-child,
  main[data-section="users"] > div:has(> aside) > section > section:first-child > div:last-child {
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
