const STYLE_ID = "ema-path-runtime-styles";

const css = `
main[data-section="users"] > div:has(> aside) > section > main > header > div:last-child {
  display: inline-flex !important;
  align-items: center !important;
  gap: .35rem !important;
  border: 1px solid #dbe7f5 !important;
  border-radius: .9rem !important;
  background: #f8fafc !important;
  padding: .25rem !important;
}

main[data-section="users"] > div:has(> aside) > section > main > header > div:last-child > button {
  min-height: 2.25rem !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  border: 1px solid transparent !important;
  border-radius: .72rem !important;
  background: transparent !important;
  color: #475569 !important;
  padding: 0 .9rem !important;
  font-size: .82rem !important;
  font-weight: 950 !important;
  box-shadow: none !important;
  transition: border-color .16s ease, background .16s ease, color .16s ease, box-shadow .16s ease !important;
}

main[data-section="users"] > div:has(> aside) > section > main > header > div:last-child > button:hover {
  background: #ffffff !important;
  color: #1d4ed8 !important;
}

main[data-section="users"] > div:has(> aside) > section > main:has(> header + div > div > strong) > header > div:last-child > button:first-child,
main[data-section="users"] > div:has(> aside) > section > main:has(> header + div > label) > header > div:last-child > button:nth-child(2),
main[data-section="users"] > div:has(> aside) > section > main > header > div:last-child > button:focus-visible {
  border-color: #bfdbfe !important;
  background: #ffffff !important;
  color: #2563eb !important;
  box-shadow: 0 8px 18px rgba(37, 99, 235, .12) !important;
}

main[data-section="users"] > div:has(> aside) > section > main:has(> header + div > label) > header > div:last-child > button:first-child,
main[data-section="users"] > div:has(> aside) > section > main:has(> header + div > div > strong) > header > div:last-child > button:nth-child(2) {
  border-color: transparent !important;
  background: transparent !important;
  color: #475569 !important;
  box-shadow: none !important;
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
