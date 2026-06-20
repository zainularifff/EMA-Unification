const STYLE_ID = "ema-notice-runtime-styles";

const css = `
main[data-section="users"] > div:has([role="alert"]),
main[data-section="users"] > div:has([role="status"][aria-live]) {
  position: fixed !important;
  top: 1rem !important;
  right: 1rem !important;
  z-index: 2147483600 !important;
  width: min(24rem, calc(100vw - 2rem)) !important;
  margin: 0 !important;
  padding: 0 !important;
  pointer-events: none !important;
}

main[data-section="users"] > div:has([role="alert"]) > div,
main[data-section="users"] > div:has([role="status"][aria-live]) > div {
  pointer-events: auto !important;
  display: grid !important;
  grid-template-columns: 2.25rem minmax(0, 1fr) 1.8rem !important;
  align-items: start !important;
  gap: .75rem !important;
  border: 1px solid #dbe7f5 !important;
  border-radius: .9rem !important;
  background: #ffffff !important;
  padding: .85rem !important;
  box-shadow: 0 18px 35px rgba(15, 23, 42, .18) !important;
  color: #0f172a !important;
}

main[data-section="users"] > div:has([role="alert"]) > div {
  border-color: #fecaca !important;
  background: #fff7f7 !important;
}

main[data-section="users"] > div:has([role="status"][aria-live]) > div {
  border-color: #bbf7d0 !important;
  background: #f7fff9 !important;
}

main[data-section="users"] [role="alert"] > span,
main[data-section="users"] [role="status"][aria-live] > span {
  width: 2.25rem !important;
  height: 2.25rem !important;
  display: inline-grid !important;
  place-items: center !important;
  border-radius: .7rem !important;
  background: #eff6ff !important;
  color: #2563eb !important;
}

main[data-section="users"] [role="alert"] > span {
  background: #fee2e2 !important;
  color: #dc2626 !important;
}

main[data-section="users"] [role="status"][aria-live] > span {
  background: #dcfce7 !important;
  color: #16a34a !important;
}

main[data-section="users"] [role="alert"] strong,
main[data-section="users"] [role="status"][aria-live] strong {
  display: block !important;
  margin: 0 0 .2rem !important;
  color: #0f172a !important;
  font-size: .82rem !important;
  font-weight: 950 !important;
  line-height: 1.15 !important;
}

main[data-section="users"] [role="alert"] span,
main[data-section="users"] [role="status"][aria-live] span {
  color: #475569 !important;
  font-size: .8rem !important;
  font-weight: 700 !important;
  line-height: 1.28 !important;
}

main[data-section="users"] [role="alert"] button,
main[data-section="users"] [role="status"][aria-live] button {
  width: 1.8rem !important;
  height: 1.8rem !important;
  min-width: 1.8rem !important;
  display: inline-grid !important;
  place-items: center !important;
  border: 0 !important;
  border-radius: .6rem !important;
  background: transparent !important;
  color: #64748b !important;
  padding: 0 !important;
}

main[data-section="users"] [role="alert"] button:hover,
main[data-section="users"] [role="status"][aria-live] button:hover {
  background: #f1f5f9 !important;
  color: #0f172a !important;
}

main[data-section="users"] > div:has(> aside) > section > main > div:nth-of-type(1) > div button,
main[data-section="users"] > div:has(> aside) > section > main > div:nth-of-type(1) > div > button,
main[data-section="users"] > div:has(> aside) > section > main > div:nth-of-type(1) > div > button:last-child {
  min-height: 2.45rem !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: .8rem !important;
  background: #ffffff !important;
  color: #0f172a !important;
  box-shadow: none !important;
}

main[data-section="users"] > div:has(> aside) > section > main > div:nth-of-type(1) > div button:hover,
main[data-section="users"] > div:has(> aside) > section > main > div:nth-of-type(1) > div > button:hover {
  border-color: #93c5fd !important;
  background: #eff6ff !important;
  color: #1d4ed8 !important;
}

main[data-section="users"] > div:has(> aside) > section > main > div:nth-of-type(1) > button:last-child {
  border-color: #2563eb !important;
  background: #2563eb !important;
  color: #ffffff !important;
  box-shadow: 0 12px 24px rgba(37, 99, 235, .2) !important;
}

main[data-section="users"] > div:has(> aside) > section > main > div:nth-of-type(1) > button:last-child:hover {
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
