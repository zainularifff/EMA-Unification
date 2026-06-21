const STYLE_ID = "ema-network-sidebar-runtime-styles";

const css = `
main[data-section="users"] aside div:has(> svg + input),
main[data-section="users"] aside label:has(> svg + input) {
  width: 100% !important;
  min-height: 2.6rem !important;
  display: flex !important;
  align-items: center !important;
  gap: .55rem !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: .85rem !important;
  background: #ffffff !important;
  padding: 0 .78rem !important;
  margin: 0 !important;
  box-shadow: 0 5px 12px rgba(15, 23, 42, .03) !important;
}

main[data-section="users"] aside div:has(> svg + input) > svg,
main[data-section="users"] aside label:has(> svg + input) > svg {
  width: .95rem !important;
  height: .95rem !important;
  flex: 0 0 .95rem !important;
  color: #64748b !important;
  stroke-width: 2.2 !important;
}

main[data-section="users"] aside div:has(> svg + input) > input,
main[data-section="users"] aside label:has(> svg + input) > input {
  width: 100% !important;
  min-width: 0 !important;
  height: 100% !important;
  border: 0 !important;
  outline: 0 !important;
  background: transparent !important;
  color: #0f172a !important;
  padding: 0 !important;
  font-size: .82rem !important;
  font-weight: 800 !important;
  line-height: 1 !important;
}

main[data-section="users"] aside div:has(> svg + input) > input::placeholder,
main[data-section="users"] aside label:has(> svg + input) > input::placeholder {
  color: #94a3b8 !important;
  font-weight: 800 !important;
}

main[data-section="users"] aside > div:nth-of-type(2) > div > div:first-child > button:not([aria-label]),
main[data-section="users"] aside button:has(> svg):not([aria-label]) {
  width: 100% !important;
  min-height: 2.6rem !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: .55rem !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: .85rem !important;
  background: #ffffff !important;
  color: #0f172a !important;
  padding: 0 .78rem !important;
  margin: .7rem 0 0 !important;
  font-size: .82rem !important;
  font-weight: 950 !important;
  line-height: 1 !important;
  box-shadow: 0 5px 12px rgba(15, 23, 42, .03) !important;
  text-align: left !important;
}

main[data-section="users"] aside > div:nth-of-type(2) > div > div:first-child > button:not([aria-label]) > svg,
main[data-section="users"] aside button:has(> svg):not([aria-label]) > svg {
  width: 1rem !important;
  height: 1rem !important;
  flex: 0 0 1rem !important;
  color: #2563eb !important;
  stroke-width: 2.2 !important;
}

main[data-section="users"] aside > div:nth-of-type(2) > div > div:first-child > button:not([aria-label]):hover,
main[data-section="users"] aside button:has(> svg):not([aria-label]):hover {
  border-color: #93c5fd !important;
  background: #eff6ff !important;
  color: #1d4ed8 !important;
}

main[data-section="users"] aside [aria-label="Network IP and subnet tree"] {
  margin-top: .9rem !important;
}

main[data-section="users"] aside [aria-label="Network IP and subnet tree"] > div:empty,
main[data-section="users"] aside [aria-label="Network IP and subnet tree"] > div:has(> div:only-child) {
  width: 100% !important;
}

main[data-section="users"] aside [aria-label="Network IP and subnet tree"] div:has(> button + button) {
  width: 100% !important;
  min-height: 2.55rem !important;
  display: grid !important;
  grid-template-columns: 1.45rem minmax(0, 1fr) 1.55rem !important;
  align-items: center !important;
  gap: .35rem !important;
  border-radius: .85rem !important;
  background: #f8fafc !important;
  padding: .3rem .45rem !important;
  margin-bottom: .38rem !important;
}

main[data-section="users"] aside [aria-label="Network IP and subnet tree"] button {
  min-width: 0 !important;
  border: 0 !important;
  background: transparent !important;
  color: #0f172a !important;
  padding: 0 !important;
  font-weight: 850 !important;
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
