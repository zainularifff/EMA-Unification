const STYLE_ID = "ema-service-desk-instant-shell-styles";
const SHELL_MARK = "data-ema-service-desk-loading-shell";

const css = `
[${SHELL_MARK}="true"] {
  width: 100% !important;
  min-height: calc(100vh - 2rem) !important;
  display: grid !important;
  grid-template-columns: 18rem minmax(0, 1fr) !important;
  gap: 1rem !important;
  padding: 1rem !important;
  background: #f8fafc !important;
  color: #0f172a !important;
}

[${SHELL_MARK}="true"] .ema-sd-shell-sidebar,
[${SHELL_MARK}="true"] .ema-sd-shell-main,
[${SHELL_MARK}="true"] .ema-sd-shell-card {
  border: 1px solid #dbe7f5 !important;
  border-radius: 1rem !important;
  background: #ffffff !important;
  box-shadow: 0 10px 25px rgba(15, 23, 42, .045) !important;
}

[${SHELL_MARK}="true"] .ema-sd-shell-sidebar {
  min-height: calc(100vh - 4rem) !important;
  padding: 1rem !important;
}

[${SHELL_MARK}="true"] .ema-sd-shell-brand {
  display: grid !important;
  gap: .25rem !important;
  margin-bottom: 1rem !important;
}

[${SHELL_MARK}="true"] .ema-sd-shell-eyebrow,
[${SHELL_MARK}="true"] .ema-sd-shell-table th {
  color: #64748b !important;
  font-size: .68rem !important;
  font-weight: 950 !important;
  letter-spacing: .08em !important;
  text-transform: uppercase !important;
}

[${SHELL_MARK}="true"] .ema-sd-shell-brand strong,
[${SHELL_MARK}="true"] .ema-sd-shell-hero h2 {
  margin: 0 !important;
  color: #0f172a !important;
  font-size: 1.15rem !important;
  font-weight: 950 !important;
}

[${SHELL_MARK}="true"] .ema-sd-shell-brand small,
[${SHELL_MARK}="true"] .ema-sd-shell-hero p {
  margin: 0 !important;
  color: #64748b !important;
  font-size: .82rem !important;
  font-weight: 750 !important;
}

[${SHELL_MARK}="true"] .ema-sd-shell-nav {
  display: grid !important;
  gap: .55rem !important;
}

[${SHELL_MARK}="true"] .ema-sd-shell-nav-row {
  height: 3.25rem !important;
  display: grid !important;
  grid-template-columns: 2rem minmax(0, 1fr) 2rem !important;
  align-items: center !important;
  gap: .65rem !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: .85rem !important;
  background: #f8fafc !important;
  padding: .55rem !important;
}

[${SHELL_MARK}="true"] .ema-sd-shell-nav-icon,
[${SHELL_MARK}="true"] .ema-sd-shell-spinner {
  display: inline-grid !important;
  place-items: center !important;
  border-radius: .7rem !important;
  background: #eff6ff !important;
  color: #2563eb !important;
}

[${SHELL_MARK}="true"] .ema-sd-shell-nav-icon {
  width: 2rem !important;
  height: 2rem !important;
}

[${SHELL_MARK}="true"] .ema-sd-shell-main {
  min-width: 0 !important;
  display: grid !important;
  gap: 1rem !important;
  align-content: start !important;
  padding: 1rem !important;
}

[${SHELL_MARK}="true"] .ema-sd-shell-hero {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) minmax(20rem, .85fr) !important;
  gap: 1rem !important;
  align-items: center !important;
}

[${SHELL_MARK}="true"] .ema-sd-shell-kpis {
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: .75rem !important;
}

[${SHELL_MARK}="true"] .ema-sd-shell-kpi {
  border: 1px solid #dbe7f5 !important;
  border-radius: .9rem !important;
  background: #f8fafc !important;
  padding: .75rem !important;
}

[${SHELL_MARK}="true"] .ema-sd-shell-kpi span,
[${SHELL_MARK}="true"] .ema-sd-shell-kpi small {
  display: block !important;
  color: #64748b !important;
  font-size: .72rem !important;
  font-weight: 850 !important;
}

[${SHELL_MARK}="true"] .ema-sd-shell-kpi strong {
  display: block !important;
  color: #0f172a !important;
  font-size: 1.25rem !important;
  font-weight: 950 !important;
}

[${SHELL_MARK}="true"] .ema-sd-shell-toolbar {
  display: flex !important;
  align-items: center !important;
  gap: .65rem !important;
  border-bottom: 1px solid #e2e8f0 !important;
  padding: 1rem !important;
}

[${SHELL_MARK}="true"] .ema-sd-shell-search {
  flex: 1 1 auto !important;
  height: 2.55rem !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: .85rem !important;
  background: #ffffff !important;
}

[${SHELL_MARK}="true"] .ema-sd-shell-button {
  width: 2.55rem !important;
  height: 2.55rem !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: .85rem !important;
  background: #ffffff !important;
}

[${SHELL_MARK}="true"] .ema-sd-shell-button.is-primary {
  width: 8.5rem !important;
  background: #2563eb !important;
  border-color: #2563eb !important;
}

[${SHELL_MARK}="true"] .ema-sd-shell-table-wrap {
  padding: 0 1rem 1rem !important;
}

[${SHELL_MARK}="true"] .ema-sd-shell-table {
  width: 100% !important;
  border-collapse: separate !important;
  border-spacing: 0 !important;
  overflow: hidden !important;
  border: 1px solid #dbe7f5 !important;
  border-radius: .9rem !important;
}

[${SHELL_MARK}="true"] .ema-sd-shell-table th {
  background: #f1f5f9 !important;
  padding: .8rem !important;
  text-align: left !important;
}

[${SHELL_MARK}="true"] .ema-sd-shell-loading-row {
  height: 11rem !important;
  text-align: center !important;
}

[${SHELL_MARK}="true"] .ema-sd-shell-loading-cell {
  padding: 2rem !important;
}

[${SHELL_MARK}="true"] .ema-sd-shell-spinner {
  width: 3rem !important;
  height: 3rem !important;
  margin: 0 auto .75rem !important;
}

[${SHELL_MARK}="true"] .ema-sd-shell-spinner svg {
  animation: ema-sd-spin .8s linear infinite !important;
}

[${SHELL_MARK}="true"] .ema-sd-shell-loading-cell strong {
  display: block !important;
  color: #0f172a !important;
  font-size: .96rem !important;
  font-weight: 950 !important;
}

[${SHELL_MARK}="true"] .ema-sd-shell-loading-cell span {
  display: block !important;
  margin-top: .25rem !important;
  color: #64748b !important;
  font-size: .82rem !important;
  font-weight: 750 !important;
}

@keyframes ema-sd-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 1100px) {
  [${SHELL_MARK}="true"] {
    grid-template-columns: 1fr !important;
  }
  [${SHELL_MARK}="true"] .ema-sd-shell-hero,
  [${SHELL_MARK}="true"] .ema-sd-shell-kpis {
    grid-template-columns: 1fr !important;
  }
}
`;

function ensureStyles() {
  const existing = document.getElementById(STYLE_ID);
  if (existing) {
    existing.textContent = css;
    return;
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = css;
  document.head.appendChild(style);
}

function isServiceDeskLoadingNode(node: Element) {
  const text = (node.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
  return text.includes("loading service desk") && text.includes("loading incident queue");
}

function renderShell(node: Element) {
  if (node.getAttribute(SHELL_MARK) === "true") return;
  node.setAttribute(SHELL_MARK, "true");
  node.innerHTML = `
    <aside class="ema-sd-shell-sidebar">
      <div class="ema-sd-shell-brand">
        <span class="ema-sd-shell-eyebrow">SERVICE CENTER</span>
        <strong>Service Desk</strong>
        <small>Ticket queue and support operation</small>
      </div>
      <div class="ema-sd-shell-nav">
        ${["All Tickets", "My Assigned", "SLA Risk", "Unassigned", "Awaiting", "In Progress", "Pending User", "Resolved"].map((label) => `
          <div class="ema-sd-shell-nav-row">
            <span class="ema-sd-shell-nav-icon">${label.slice(0, 1)}</span>
            <span><strong>${label}</strong><small>Loading count...</small></span>
            <b>0</b>
          </div>
        `).join("")}
      </div>
    </aside>
    <section class="ema-sd-shell-main">
      <div class="ema-sd-shell-hero">
        <div>
          <span class="ema-sd-shell-eyebrow">INCIDENT COMMAND CENTER</span>
          <h2>Service Desk</h2>
          <p>Manage tickets, assignments, SLA risk and support activity.</p>
        </div>
        <div class="ema-sd-shell-kpis">
          ${["Open Tickets", "SLA Risk", "Awaiting", "In Progress"].map((label) => `
            <div class="ema-sd-shell-kpi"><span>${label}</span><strong>0</strong><small>loading</small></div>
          `).join("")}
        </div>
      </div>
      <div class="ema-sd-shell-card">
        <div class="ema-sd-shell-toolbar">
          <div class="ema-sd-shell-search"></div>
          <div class="ema-sd-shell-button is-primary"></div>
          <div class="ema-sd-shell-button"></div>
          <div class="ema-sd-shell-button"></div>
          <div class="ema-sd-shell-button"></div>
        </div>
        <div class="ema-sd-shell-table-wrap">
          <table class="ema-sd-shell-table">
            <thead>
              <tr>
                <th>No</th><th>Req No</th><th>Submitted</th><th>Requester</th><th>Asset</th><th>Incident</th><th>Urgency</th><th>Assigned</th><th>SLA</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr class="ema-sd-shell-loading-row">
                <td colspan="11" class="ema-sd-shell-loading-cell">
                  <div class="ema-sd-shell-spinner">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
                  </div>
                  <strong>Loading ticket data...</strong>
                  <span>Service Desk UI is ready. Incident records are loading in the table.</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

function applyServiceDeskShell() {
  if (typeof document === "undefined") return;
  ensureStyles();
  const candidates = Array.from(document.querySelectorAll("#root > div, #root main, #root section, #root div"));
  candidates.forEach((node) => {
    if (isServiceDeskLoadingNode(node)) renderShell(node);
  });
}

if (typeof document !== "undefined") {
  const run = () => applyServiceDeskShell();
  run();
  const observer = new MutationObserver(run);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export {};
