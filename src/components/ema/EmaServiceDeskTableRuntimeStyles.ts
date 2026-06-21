const STYLE_ID = "ema-service-desk-table-polish";

const css = `
html body main[data-section="service-desk"] table {
  table-layout: fixed !important;
  min-width: 1120px !important;
}
html body main[data-section="service-desk"] table th,
html body main[data-section="service-desk"] table td {
  vertical-align: top !important;
}
html body main[data-section="service-desk"] table th:nth-child(1),
html body main[data-section="service-desk"] table td:nth-child(1) {
  width: 7.4rem !important;
  max-width: 7.4rem !important;
  white-space: normal !important;
  overflow-wrap: anywhere !important;
  word-break: break-word !important;
  line-height: 1.25 !important;
}
html body main[data-section="service-desk"] table td:nth-child(1) {
  font-size: .84rem !important;
}
html body main[data-section="service-desk"] table th:nth-child(2),
html body main[data-section="service-desk"] table td:nth-child(2) {
  width: 6.2rem !important;
}
html body main[data-section="service-desk"] table th:nth-child(3),
html body main[data-section="service-desk"] table td:nth-child(3) {
  width: 11.5rem !important;
}
html body main[data-section="service-desk"] table td:nth-child(3) > div {
  display: block !important;
}
html body main[data-section="service-desk"] table td:nth-child(3) > div > span:first-child {
  display: none !important;
}
html body main[data-section="service-desk"] table td:nth-child(3) strong {
  display: block !important;
  max-width: 100% !important;
  white-space: normal !important;
  overflow-wrap: anywhere !important;
  line-height: 1.25 !important;
}
html body main[data-section="service-desk"] table th:nth-child(4),
html body main[data-section="service-desk"] table td:nth-child(4) {
  width: 9rem !important;
}
html body main[data-section="service-desk"] table td:nth-child(4) span {
  max-width: 8.4rem !important;
  white-space: normal !important;
  overflow-wrap: anywhere !important;
  line-height: 1.2 !important;
}
html body main[data-section="service-desk"] table th:nth-child(5),
html body main[data-section="service-desk"] table td:nth-child(5) {
  width: 15rem !important;
}
html body main[data-section="service-desk"] table td:nth-child(5) strong,
html body main[data-section="service-desk"] table td:nth-child(5) small {
  max-width: 100% !important;
  white-space: normal !important;
  overflow-wrap: anywhere !important;
  line-height: 1.35 !important;
}
html body main[data-section="service-desk"] table th:nth-child(6),
html body main[data-section="service-desk"] table td:nth-child(6) {
  width: 6.6rem !important;
}
html body main[data-section="service-desk"] table th:nth-child(7),
html body main[data-section="service-desk"] table td:nth-child(7) {
  width: 9.5rem !important;
}
html body main[data-section="service-desk"] table th:nth-child(8),
html body main[data-section="service-desk"] table td:nth-child(8) {
  width: 12.5rem !important;
}
html body main[data-section="service-desk"] table th:nth-child(9),
html body main[data-section="service-desk"] table td:nth-child(9) {
  width: 8.2rem !important;
}
html body main[data-section="service-desk"] table td:nth-child(9) span {
  --sd-status-color: #2563eb;
  --sd-status-bg: #eff6ff;
  --sd-status-border: #bfdbfe;
  position: relative !important;
  display: inline-flex !important;
  align-items: center !important;
  min-height: 1.85rem !important;
  border: 1px solid var(--sd-status-border) !important;
  border-radius: 999px !important;
  background: var(--sd-status-bg) !important;
  color: var(--sd-status-color) !important;
  padding: .25rem .7rem .25rem 1.35rem !important;
  font-size: .73rem !important;
  font-weight: 900 !important;
  line-height: 1.1 !important;
  white-space: nowrap !important;
}
html body main[data-section="service-desk"] table td:nth-child(9) span::before {
  content: "" !important;
  position: absolute !important;
  left: .55rem !important;
  top: 50% !important;
  width: .42rem !important;
  height: .42rem !important;
  border-radius: 999px !important;
  background: var(--sd-status-color) !important;
  transform: translateY(-50%) !important;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--sd-status-color) 14%, transparent) !important;
}
html body main[data-section="service-desk"] table td[data-sd-status="awaiting"] span {
  --sd-status-color: #2563eb;
  --sd-status-bg: #eff6ff;
  --sd-status-border: #bfdbfe;
}
html body main[data-section="service-desk"] table td[data-sd-status="in-progress"] span {
  --sd-status-color: #7c3aed;
  --sd-status-bg: #f5f3ff;
  --sd-status-border: #ddd6fe;
}
html body main[data-section="service-desk"] table td[data-sd-status="pending"] span {
  --sd-status-color: #d97706;
  --sd-status-bg: #fffbeb;
  --sd-status-border: #fde68a;
}
html body main[data-section="service-desk"] table td[data-sd-status="on-site"] span {
  --sd-status-color: #0891b2;
  --sd-status-bg: #ecfeff;
  --sd-status-border: #a5f3fc;
}
html body main[data-section="service-desk"] table td[data-sd-status="resolved"] span {
  --sd-status-color: #059669;
  --sd-status-bg: #ecfdf5;
  --sd-status-border: #a7f3d0;
}
html body main[data-section="service-desk"] table td[data-sd-status="rejected"] span {
  --sd-status-color: #dc2626;
  --sd-status-bg: #fef2f2;
  --sd-status-border: #fecaca;
}
html body main[data-section="service-desk"] table th:nth-child(10),
html body main[data-section="service-desk"] table td:nth-child(10) {
  width: 7.4rem !important;
}
html body main[data-section="service-desk"] table tbody tr {
  cursor: default !important;
}
html body main[data-section="service-desk"] > aside.fixed.right-4.top-24 {
  display: none !important;
}
`;

function injectServiceDeskTableStyles() {
  if (typeof document === "undefined") return;

  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = css;
}

function getStatusKey(text: string) {
  const value = text.toLowerCase().trim();
  if (!value) return "default";
  if (value.includes("progress")) return "in-progress";
  if (value.includes("pending")) return "pending";
  if (value.includes("site")) return "on-site";
  if (value.includes("resolved") || value.includes("closed") || value.includes("solved")) return "resolved";
  if (value.includes("reject") || value.includes("cancel")) return "rejected";
  if (value.includes("await")) return "awaiting";
  return "default";
}

function applyServiceDeskStatusKeys() {
  if (typeof document === "undefined") return;
  document.querySelectorAll<HTMLTableRowElement>('main[data-section="service-desk"] table tbody tr').forEach((row) => {
    const statusCell = row.children.item(8) as HTMLElement | null;
    if (!statusCell) return;
    statusCell.dataset.sdStatus = getStatusKey(statusCell.textContent || "");
  });
}

function blockServiceDeskRowDetail(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (!target?.closest('main[data-section="service-desk"]')) return;
  if (target.closest('button, a, input, textarea, select, [role="button"]')) return;
  const row = target.closest('main[data-section="service-desk"] table tbody tr');
  if (!row) return;
  event.stopPropagation();
}

injectServiceDeskTableStyles();
applyServiceDeskStatusKeys();

if (typeof window !== "undefined") {
  window.setTimeout(applyServiceDeskStatusKeys, 0);
  window.setTimeout(applyServiceDeskStatusKeys, 250);
  document.addEventListener("click", blockServiceDeskRowDetail, true);

  const observer = new MutationObserver(() => applyServiceDeskStatusKeys());
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
}

export {};
