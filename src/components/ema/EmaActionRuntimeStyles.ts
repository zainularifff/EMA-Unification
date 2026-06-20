const STYLE_ID = "ema-action-runtime-styles";

const css = `
/* Shared table action buttons */
.ema-module-root table td:last-child button,
main[data-section="users"] table td:last-child button {
  width: 2rem !important;
  height: 2rem !important;
  min-width: 2rem !important;
  display: inline-grid !important;
  place-items: center !important;
  border: 1px solid transparent !important;
  border-radius: .68rem !important;
  background: #f8fafc !important;
  color: #475569 !important;
  padding: 0 !important;
  margin: 0 .12rem !important;
  line-height: 1 !important;
  box-shadow: none !important;
  transition: border-color .15s ease, background .15s ease, color .15s ease, transform .15s ease !important;
}

.ema-module-root table td:last-child button svg,
main[data-section="users"] table td:last-child button svg {
  width: .95rem !important;
  height: .95rem !important;
  stroke-width: 2.35 !important;
}

.ema-module-root table td:last-child button:hover,
main[data-section="users"] table td:last-child button:hover {
  transform: translateY(-1px) !important;
}

.ema-module-root table td:last-child button[title*="Edit" i],
.ema-module-root table td:last-child button[aria-label*="Edit" i],
main[data-section="users"] table td:last-child button[title*="Edit" i],
main[data-section="users"] table td:last-child button[aria-label*="Edit" i] {
  border-color: #bfdbfe !important;
  background: #eff6ff !important;
  color: #2563eb !important;
}

.ema-module-root table td:last-child button[title*="Edit" i]:hover,
.ema-module-root table td:last-child button[aria-label*="Edit" i]:hover,
main[data-section="users"] table td:last-child button[title*="Edit" i]:hover,
main[data-section="users"] table td:last-child button[aria-label*="Edit" i]:hover {
  border-color: #60a5fa !important;
  background: #dbeafe !important;
  color: #1d4ed8 !important;
}

.ema-module-root table td:last-child button[title*="Remove" i],
.ema-module-root table td:last-child button[aria-label*="Remove" i],
.ema-module-root table td:last-child button[title*="Delete" i],
.ema-module-root table td:last-child button[aria-label*="Delete" i],
main[data-section="users"] table td:last-child button[title*="Remove" i],
main[data-section="users"] table td:last-child button[aria-label*="Remove" i],
main[data-section="users"] table td:last-child button[title*="Delete" i],
main[data-section="users"] table td:last-child button[aria-label*="Delete" i] {
  border-color: #fecaca !important;
  background: #fff1f2 !important;
  color: #dc2626 !important;
}

.ema-module-root table td:last-child button[title*="Remove" i]:hover,
.ema-module-root table td:last-child button[aria-label*="Remove" i]:hover,
.ema-module-root table td:last-child button[title*="Delete" i]:hover,
.ema-module-root table td:last-child button[aria-label*="Delete" i]:hover,
main[data-section="users"] table td:last-child button[title*="Remove" i]:hover,
main[data-section="users"] table td:last-child button[aria-label*="Remove" i]:hover,
main[data-section="users"] table td:last-child button[title*="Delete" i]:hover,
main[data-section="users"] table td:last-child button[aria-label*="Delete" i]:hover {
  border-color: #f87171 !important;
  background: #fee2e2 !important;
  color: #b91c1c !important;
}

/* Shared confirm/delete modal for legacy pages without component classes */
main[data-section="users"] > div:has(> section[role="dialog"][aria-labelledby*="delete" i]) {
  position: fixed !important;
  inset: 0 !important;
  z-index: 2147483000 !important;
  display: grid !important;
  place-items: center !important;
  background: rgba(15, 23, 42, .58) !important;
  backdrop-filter: blur(7px) !important;
  padding: 1.25rem !important;
}

main[data-section="users"] > div:has(> section[role="dialog"][aria-labelledby*="delete" i]) > section[role="dialog"] {
  width: min(34rem, calc(100vw - 2rem)) !important;
  max-height: min(80vh, 34rem) !important;
  display: grid !important;
  gap: 1rem !important;
  border: 1px solid #fecaca !important;
  border-radius: 1.05rem !important;
  background: #ffffff !important;
  color: #0f172a !important;
  padding: 1.25rem !important;
  box-shadow: 0 28px 70px rgba(15, 23, 42, .30) !important;
  overflow: auto !important;
}

main[data-section="users"] > div:has(> section[role="dialog"][aria-labelledby*="delete" i]) h3 {
  margin: 0 !important;
  color: #0f172a !important;
  font-size: 1.05rem !important;
  font-weight: 950 !important;
  line-height: 1.2 !important;
}

main[data-section="users"] > div:has(> section[role="dialog"][aria-labelledby*="delete" i]) p {
  margin: -.35rem 0 .2rem !important;
  color: #64748b !important;
  font-size: .84rem !important;
  font-weight: 650 !important;
  line-height: 1.35 !important;
}

main[data-section="users"] > div:has(> section[role="dialog"][aria-labelledby*="delete" i]) section > div:first-of-type {
  display: grid !important;
  gap: .25rem !important;
  border: 1px solid #fee2e2 !important;
  border-radius: .9rem !important;
  background: #fff7f7 !important;
  padding: .9rem !important;
}

main[data-section="users"] > div:has(> section[role="dialog"][aria-labelledby*="delete" i]) section > div:first-of-type strong {
  display: block !important;
  color: #0f172a !important;
  font-size: .98rem !important;
  font-weight: 950 !important;
  line-height: 1.25 !important;
}

main[data-section="users"] > div:has(> section[role="dialog"][aria-labelledby*="delete" i]) section > div:first-of-type span {
  display: block !important;
  color: #475569 !important;
  font-size: .82rem !important;
  font-weight: 700 !important;
  line-height: 1.35 !important;
}

main[data-section="users"] > div:has(> section[role="dialog"][aria-labelledby*="delete" i]) section > div:last-child {
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: .55rem !important;
  margin-top: .15rem !important;
}

main[data-section="users"] > div:has(> section[role="dialog"][aria-labelledby*="delete" i]) section > div:last-child button {
  min-width: 6.25rem !important;
  height: 2.45rem !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: .45rem !important;
  border: 1px solid #dbe7f5 !important;
  border-radius: .78rem !important;
  background: #ffffff !important;
  color: #334155 !important;
  padding: 0 .9rem !important;
  font-size: .82rem !important;
  font-weight: 900 !important;
  line-height: 1 !important;
  box-shadow: 0 6px 14px rgba(15, 23, 42, .05) !important;
}

main[data-section="users"] > div:has(> section[role="dialog"][aria-labelledby*="delete" i]) section > div:last-child button:last-child {
  border-color: #dc2626 !important;
  background: #dc2626 !important;
  color: #ffffff !important;
  box-shadow: 0 10px 18px rgba(220, 38, 38, .20) !important;
}

main[data-section="users"] > div:has(> section[role="dialog"][aria-labelledby*="delete" i]) section > div:last-child button:hover:not(:disabled) {
  transform: translateY(-1px) !important;
}

main[data-section="users"] > div:has(> section[role="dialog"][aria-labelledby*="delete" i]) section > div:last-child button:disabled {
  cursor: not-allowed !important;
  opacity: .6 !important;
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
