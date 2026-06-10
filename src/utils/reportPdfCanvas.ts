type ReportSection = {
  type: string;
  title: string;
  rows: any[];
  columns?: string[];
};

type ReportPayload = any;
type ReportFilters = any;

function formatDateTime(value?: string) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("en-MY", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch (err) {
    return value;
  }
}

function formatLabel(value: string) {
  return String(value || "")
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function numberMetric(payload: ReportPayload, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = payload?.metrics?.[key];
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) return numeric;
  }
  return fallback;
}

function pdfEscape(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function pdfText(value: unknown, max = 120) {
  const text = String(value ?? "-").replace(/\s+/g, " ").trim() || "-";
  return pdfEscape(text.length > max ? `${text.slice(0, max - 1)}…` : text);
}

function pdfNumber(payload: ReportPayload, keys: string[], fallback = 0) {
  return numberMetric(payload, keys, fallback);
}

function metricFromRows(section?: ReportSection, limit = 4) {
  return (section?.rows || []).slice(0, limit).map((row) => {
    const label = row.label ?? row.name ?? row.status ?? row.category ?? row.metric ?? row.area ?? "Metric";
    const value = row.value ?? row.count ?? row.total ?? row.score ?? row.percentage ?? "-";
    const note = row.note ?? row.description ?? row.finding ?? row.action ?? "";
    return { label, value, note };
  });
}

function printableKpis(payload: ReportPayload) {
  const kpiSection = payload.sections.find((section) => section.type === "kpi");
  const fromSection = metricFromRows(kpiSection, 4);
  if (fromSection.length) return fromSection;

  return [
    { label: "Endpoint Estate", value: pdfNumber(payload, ["endpointTotal", "totalEndpoints", "assets"], 0), note: `${pdfNumber(payload, ["onlineEndpoints", "online"], 0)} online · ${pdfNumber(payload, ["offlineEndpoints", "offline"], 0)} offline` },
    { label: "Open Tickets", value: pdfNumber(payload, ["openTickets", "tickets"], 0), note: `${pdfNumber(payload, ["slaBreachCandidates", "slaBreaches"], 0)} SLA breach candidate(s)` },
    { label: "Software Records", value: pdfNumber(payload, ["softwareRows", "softwareRecords"], 0), note: `${pdfNumber(payload, ["distinctSoftware", "softwareNames"], 0)} distinct software name(s)` },
    { label: "Telemetry Watch", value: pdfNumber(payload, ["staleEndpoints", "stale"], 0), note: "Stale or missing last-seen telemetry" }
  ];
}

function sectionByType(payload: ReportPayload, type: string) {
  return payload.sections.find((section) => section.type === type);
}

const PDF_COLUMN_PRIORITY = [
  "id",
  "assetId",
  "assetTag",
  "deviceName",
  "computerName",
  "name",
  "status",
  "severity",
  "priority",
  "category",
  "source",
  "site",
  "department",
  "assignedTo",
  "createdAt",
  "updatedAt",
  "lastSeen",
  "connectionStatus",
  "value",
  "count",
  "total"
];

function getPdfColumns(section: ReportSection | undefined, rows: Record<string, any>[], maxColumns = 7) {
  const sourceColumns = section?.columns?.length ? section.columns : Object.keys(rows[0] || {});
  const normalized = sourceColumns.filter((column) => !/^__/i.test(column));
  const selected: string[] = [];

  PDF_COLUMN_PRIORITY.forEach((priorityColumn) => {
    const found = normalized.find((column) => column.toLowerCase() === priorityColumn.toLowerCase());
    if (found && !selected.includes(found)) selected.push(found);
  });

  normalized.forEach((column) => {
    if (!selected.includes(column)) selected.push(column);
  });

  return selected.slice(0, maxColumns);
}

function tableRowsHtml(section?: ReportSection, limit = 36, maxColumns = 7) {
  const allRows = (section?.rows || []) as Record<string, any>[];
  const rows = allRows.slice(0, limit);
  if (!rows.length) return `<div class="pdf-empty">No matching records for this table.</div>`;

  const columns = getPdfColumns(section, rows, maxColumns);
  const table = `
    <div class="pdf-table-box">
      <table class="pdf-real-table">
        <thead><tr>${columns.map((col) => `<th>${pdfEscape(formatLabel(col))}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows.map((row) => `<tr>${columns.map((col) => `<td>${pdfText(row[col], 120)}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;

  const note = allRows.length > limit
    ? `<p class="pdf-table-note">Showing first ${limit} of ${allRows.length} records in this PDF. Export Excel / CSV for the complete dataset.</p>`
    : "";

  return `${table}${note}`;
}

function sectionRowsHtml(section?: ReportSection, limit = 12) {
  const allRows = (section?.rows || []) as Record<string, any>[];
  const rows = allRows.slice(0, limit);
  if (!rows.length) return `<div class="pdf-empty">No matching records for this section.</div>`;

  const columns = getPdfColumns(section, rows, 6);
  const shouldRenderAsTable = allRows.length > 4 || columns.length > 4 || section?.type === "table";
  if (shouldRenderAsTable) return tableRowsHtml(section, Math.max(limit, 18), 6);

  return rows
    .map((row) => {
      const entries = Object.entries(row).slice(0, 4);
      const title = row.title ?? row.name ?? row.deviceName ?? row.area ?? row.category ?? row.status ?? entries[0]?.[1] ?? "Record";
      const meta = entries
        .filter(([key]) => !["title", "name", "deviceName", "area"].includes(key))
        .map(([key, value]) => `<span><b>${pdfEscape(formatLabel(key))}</b>${pdfText(value, 80)}</span>`)
        .join("");
      return `<article class="pdf-evidence-card"><strong>${pdfText(title, 90)}</strong><div>${meta}</div></article>`;
    })
    .join("");
}

function riskTableHtml(rows: Record<string, any>[], limit = 24) {
  const visible = rows.slice(0, limit);
  if (!visible.length) return `<div class="pdf-empty">No management attention items returned.</div>`;

  const table = `
    <div class="pdf-table-box">
      <table class="pdf-real-table pdf-risk-data-table">
        <thead>
          <tr><th>Area</th><th>Severity</th><th>Finding</th><th>Action</th></tr>
        </thead>
        <tbody>
          ${visible.map((row) => {
            const severity = row.severity || row.priority || "Focus";
            const area = row.area || row.title || row.category || "Management Focus";
            const finding = row.finding || row.description || row.issue || row.action || "Review this focus area.";
            const action = row.action || row.recommendation || row.nextStep || "Assign owner and track closure.";
            return `<tr><td>${pdfText(area, 90)}</td><td><span class="pdf-risk-pill">${pdfText(severity, 28)}</span></td><td>${pdfText(finding, 150)}</td><td>${pdfText(action, 150)}</td></tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;

  const note = rows.length > limit
    ? `<p class="pdf-table-note">Showing first ${limit} of ${rows.length} risk item(s). Export Excel / CSV for full evidence detail.</p>`
    : "";

  return `${table}${note}`;
}

function riskCardsHtml(payload: ReportPayload) {
  const riskSection = sectionByType(payload, "risk");
  const risks = (riskSection?.rows || payload.recommendations || []).slice(0, 4) as Record<string, any>[];
  if (!risks.length) return `<div class="pdf-empty">No management attention items returned.</div>`;
  return risks
    .map((row) => {
      const severity = row.severity || row.priority || "Focus";
      const area = row.area || row.title || row.action || "Management Focus";
      const finding = row.finding || row.description || row.action || "Review this focus area.";
      const action = row.action || row.recommendation || "Assign owner and track closure.";
      return `
        <article class="pdf-focus-card">
          <span class="pdf-severity">${pdfText(severity, 24)}</span>
          <h3>${pdfText(area, 70)}</h3>
          <p>${pdfText(finding, 120)}</p>
          <div>${pdfText(action, 120)}</div>
        </article>
      `;
    })
    .join("");
}

function managementAttentionHtml(payload: ReportPayload, limit = 24) {
  const riskSection = sectionByType(payload, "risk");
  const rows = (riskSection?.rows || payload.recommendations || []) as Record<string, any>[];
  if (!rows.length) return `<div class="pdf-empty">No management attention items returned.</div>`;
  if (rows.length > 2) return riskTableHtml(rows, limit);
  return `<div class="pdf-focus-grid">${riskCardsHtml(payload)}</div>`;
}

function recommendationsTableHtml(recommendations: ReportPayload["recommendations"], limit = 24) {
  const rows = (recommendations || []) as Record<string, any>[];
  const visible = rows.slice(0, limit);
  if (!visible.length) return `<div class="pdf-empty">No recommended actions generated for this report.</div>`;

  const table = `
    <div class="pdf-table-box">
      <table class="pdf-real-table pdf-action-table">
        <thead>
          <tr><th>Priority</th><th>Action</th><th>Owner</th><th>Target</th></tr>
        </thead>
        <tbody>
          ${visible.map((row) => {
            const priority = row.priority || row.severity || "Action";
            const action = row.action || row.recommendation || row.title || row.description || "Review and assign next action.";
            const owner = row.owner || row.assignee || row.assignedTo || "Management Team";
            const target = row.targetDate || row.dueDate || row.eta || row.timeline || row.status || "Track in next review";
            return `<tr><td><span class="pdf-risk-pill">${pdfText(priority, 28)}</span></td><td>${pdfText(action, 180)}</td><td>${pdfText(owner, 80)}</td><td>${pdfText(target, 80)}</td></tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;

  const note = rows.length > limit
    ? `<p class="pdf-table-note">Showing first ${limit} of ${rows.length} recommended action(s).</p>`
    : "";

  return `${table}${note}`;
}

function barListHtml(section?: ReportSection, limit = 6) {
  const rows = (section?.rows || []).slice(0, limit);
  if (!rows.length) return `<div class="pdf-empty">No chart rows available.</div>`;
  const max = Math.max(...rows.map((row) => Number(row.value ?? row.count ?? row.total ?? 0)), 1);
  return rows
    .map((row) => {
      const label = row.label ?? row.name ?? row.status ?? row.category ?? "Item";
      const value = Number(row.value ?? row.count ?? row.total ?? 0);
      const width = Math.max(4, Math.min(100, Math.round((value / max) * 100)));
      return `<div class="pdf-bar-row"><span>${pdfText(label, 46)}</span><b>${pdfEscape(value)}</b><i><em style="width:${width}%"></em></i></div>`;
    })
    .join("");
}

function printableFindingRows(payload: ReportPayload, limit = 6) {
  const findings = payload.narrative.keyFindings || [];
  if (!findings.length) return `<tr><td colspan="3">No key finding returned for this scope.</td></tr>`;
  return findings.slice(0, limit).map((item, index) => `<tr><td>${String(index + 1).padStart(2, "0")}</td><td>${pdfText(item, 190)}</td><td>${pdfText(index === 0 ? "High" : index === 1 ? "Medium" : "Monitor", 20)}</td></tr>`).join("");
}


function pdfReportPackName(payload: ReportPayload) {
  const raw = `${payload.report.category || payload.report.type || "Report Pack"}`;
  return raw.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}


function buildPdfCoverOnlyPage(payload: ReportPayload, filters: ReportFilters, mode: "executive" | "generic") {
  const generated = formatDateTime(payload.generatedAt);
  const period = payload.narrative?.period || filters.dateRange || "Current period";
  const scope = payload.narrative?.scope || "All Sites";
  const title = payload.report?.title || "EMA Report";
  const intro = payload.report?.description || payload.narrative?.executiveSummary || "Prepared from the current EMA operational dataset.";
  const label = mode === "executive" ? "Management board report" : "Operational report";
  const endpointTotal = pdfNumber(payload, ["endpointTotal", "totalEndpoints", "assets", "totalNodes"], 0);
  const online = pdfNumber(payload, ["onlineEndpoints", "online"], 0);
  const offline = pdfNumber(payload, ["offlineEndpoints", "offline"], 0);
  const stale = pdfNumber(payload, ["staleEndpoints", "stale"], 0);
  const openTickets = pdfNumber(payload, ["openTickets", "tickets"], 0);
  const sla = pdfNumber(payload, ["slaBreachCandidates", "slaBreaches", "slaBreached"], 0);
  const software = pdfNumber(payload, ["softwareRows", "softwareRecords", "totalSoftwareRecords"], 0);
  const score = pdfNumber(payload, ["operationalScore", "score"], 0);
  const onlineRate = endpointTotal ? Math.round((online / Math.max(endpointTotal, 1)) * 100) : pdfNumber(payload, ["onlineRate"], 0);
  const narrative = payload.narrative?.executiveSummary || payload.narrative?.managementConclusion || intro;

  return `
    <section class="pdf-title-sheet pdf-title-${mode}">
      <header class="pdf-report-header">
        <div class="pdf-brand-lockup">
          <div class="pdf-brand-seal">EMA</div>
          <div>
            <strong>EMA Unified System</strong>
            <span>${pdfText(pdfReportPackName(payload), 76)}</span>
          </div>
        </div>
        <div class="pdf-document-label">
          <span>${pdfText(label, 42)}</span>
          <b>${pdfText(filters.outputFormat || "PDF", 22)}</b>
        </div>
      </header>

      <div class="pdf-title-grid">
        <div class="pdf-title-copy">
          <span class="pdf-report-kicker">${pdfText(label, 58)}</span>
          <h1>${pdfText(title, 120)}</h1>
          <p>${pdfText(intro, 300)}</p>
        </div>
        <aside class="pdf-score-panel">
          <small>Operational Score</small>
          <strong>${pdfEscape(score)}%</strong>
          <span>Composite posture based on endpoint availability, SLA exposure and reporting quality.</span>
        </aside>
      </div>

      <div class="pdf-title-kpi-grid">
        <div><small>Endpoint Estate</small><b>${pdfEscape(endpointTotal)}</b><span>${pdfEscape(onlineRate)}% online / ${pdfEscape(offline)} offline</span></div>
        <div><small>Telemetry Watch</small><b>${pdfEscape(stale)}</b><span>Stale or missing last-seen endpoint(s)</span></div>
        <div><small>Service Desk</small><b>${pdfEscape(openTickets)}</b><span>${pdfEscape(sla)} SLA breach candidate(s)</span></div>
        <div><small>Software Inventory</small><b>${pdfEscape(software)}</b><span>Inventory records in scope</span></div>
      </div>

      <div class="pdf-management-brief">
        <div>
          <span class="pdf-eyebrow">Management Brief</span>
          <p>${pdfText(narrative, 460)}</p>
        </div>
        <div class="pdf-meta-list">
          <div><small>Prepared On</small><b>${pdfEscape(generated)}</b></div>
          <div><small>Scope</small><b>${pdfText(scope, 72)}</b></div>
          <div><small>Period</small><b>${pdfText(period, 72)}</b></div>
        </div>
      </div>
    </section>
    <div class="pdf-page-break"></div>
  `;
}

function buildPdfMetricTable(payload: ReportPayload) {
  const endpointTotal = pdfNumber(payload, ["endpointTotal", "totalEndpoints", "assets"], 0);
  const online = pdfNumber(payload, ["onlineEndpoints", "online"], 0);
  const offline = pdfNumber(payload, ["offlineEndpoints", "offline"], 0);
  const stale = pdfNumber(payload, ["staleEndpoints", "stale"], 0);
  const openTickets = pdfNumber(payload, ["openTickets", "tickets"], 0);
  const sla = pdfNumber(payload, ["slaBreachCandidates", "slaBreaches", "slaBreached"], 0);
  const software = pdfNumber(payload, ["softwareRows", "softwareRecords", "totalSoftwareRecords"], 0);
  const score = pdfNumber(payload, ["operationalScore", "score"], 0);
  const onlineRate = endpointTotal ? Math.round((online / Math.max(endpointTotal, 1)) * 100) : pdfNumber(payload, ["onlineRate"], 0);
  const rows = [
    ["Board Score", `${score}%`, "Composite management posture"],
    ["Endpoint Estate", endpointTotal, `${online} online / ${offline} offline`],
    ["Online Rate", `${onlineRate}%`, `${stale} stale or missing telemetry`],
    ["Service Desk", openTickets, `${sla} SLA breach candidate(s)`],
    ["Software", software, "Inventory records in scope"]
  ];

  return `
    <table class="pdf-real-table pdf-metric-table">
      <thead><tr><th>Metric</th><th>Value</th><th>Notes</th></tr></thead>
      <tbody>${rows.map((row) => `<tr><td>${pdfText(row[0], 60)}</td><td>${pdfText(row[1], 40)}</td><td>${pdfText(row[2], 100)}</td></tr>`).join("")}</tbody>
    </table>
  `;
}

function buildExecutivePrintableHtml(payload: ReportPayload, filters: ReportFilters) {
  const barSection = payload.sections.find((section) => ["bar", "donut"].includes(section.type));

  return `
    ${buildPdfCoverOnlyPage(payload, filters, "executive")}

    <section class="pdf-section pdf-summary-section">
      <div class="pdf-section-head"><div><h2>Management Snapshot</h2><p>High-level operating posture for the selected reporting scope.</p></div><span>Page 2</span></div>
      <div class="pdf-summary-layout">
        <div>
          <span class="pdf-eyebrow">Executive Summary</span>
          <h2>${pdfText(payload.narrative.title || payload.report.title, 90)}</h2>
          <p>${pdfText(payload.narrative.executiveSummary || payload.narrative.managementConclusion, 300)}</p>
        </div>
        ${buildPdfMetricTable(payload)}
      </div>
    </section>

    <section class="pdf-section">
      <div class="pdf-section-head"><div><h2>Key Findings</h2><p>Priority observations converted into management-ready findings.</p></div><span>Focus</span></div>
      <table class="pdf-real-table"><thead><tr><th>No</th><th>Finding</th></tr></thead><tbody>${payload.narrative.keyFindings.slice(0, 6).map((item, index) => `<tr><td>${String(index + 1).padStart(2, "0")}</td><td>${pdfText(item, 220)}</td></tr>`).join("")}</tbody></table>
    </section>

    ${filters.includeChart ? `<section class="pdf-section"><div class="pdf-section-head"><div><h2>${pdfText(barSection?.title || "Operational Distribution", 80)}</h2><p>Visual summary rendered as PDF-safe chart rows.</p></div><span>Chart</span></div><div class="pdf-bars">${barListHtml(barSection)}</div></section>` : ""}
    ${filters.includeTable ? `<section class="pdf-section"><div class="pdf-section-head"><div><h2>Board Attention Focus</h2><p>Management-level attention items are shown in a structured table-friendly layout.</p></div><span>Decision Focus</span></div><div class="pdf-focus-grid">${riskCardsHtml(payload)}</div></section>` : ""}
    ${filters.includeRecommendation ? `<section class="pdf-section"><div class="pdf-section-head"><div><h2>Recommended Actions</h2><p>Follow-up actions generated from current findings.</p></div><span>Action Plan</span></div>${tableRowsHtml({ type: "table", title: "Actions", rows: payload.recommendations || [] }, 10)}</section>` : ""}
  `;
}

function buildGenericPrintableHtml(payload: ReportPayload, filters: ReportFilters) {
  const kpis = printableKpis(payload);
  const barSection = payload.sections.find((section) => ["bar", "donut"].includes(section.type));
  const tableSection = payload.sections.find((section) => section.type === "table");
  const riskSection = payload.sections.find((section) => section.type === "risk");

  return `
    ${buildPdfCoverOnlyPage(payload, filters, "generic")}

    <section class="pdf-section pdf-summary-section">
      <div class="pdf-section-head"><div><h2>Report Snapshot</h2><p>High-level overview of the current reporting scope.</p></div><span>Overview</span></div>
      <div class="pdf-summary-layout">
        <div>
          <span class="pdf-eyebrow">Report Narrative</span>
          <h2>${pdfText(payload.narrative.title || payload.report.title, 90)}</h2>
          <p>${pdfText(payload.narrative.managementConclusion || payload.narrative.executiveSummary, 300)}</p>
        </div>
        <table class="pdf-real-table pdf-metric-table">
          <thead><tr><th>Metric</th><th>Value</th><th>Notes</th></tr></thead>
          <tbody>${kpis.map((item) => `<tr><td>${pdfText(item.label, 55)}</td><td>${pdfText(item.value, 35)}</td><td>${pdfText(item.note, 95)}</td></tr>`).join("")}</tbody>
        </table>
      </div>
    </section>

    <section class="pdf-section">
      <div class="pdf-section-head"><div><h2>Key Findings</h2><p>Priority observations converted into report findings.</p></div><span>Findings</span></div>
      <table class="pdf-real-table"><thead><tr><th>No</th><th>Finding</th></tr></thead><tbody>${payload.narrative.keyFindings.slice(0, 6).map((item, index) => `<tr><td>${String(index + 1).padStart(2, "0")}</td><td>${pdfText(item, 220)}</td></tr>`).join("")}</tbody></table>
    </section>

    ${filters.includeChart ? `<section class="pdf-section"><div class="pdf-section-head"><div><h2>${pdfText(barSection?.title || "Operational Distribution", 80)}</h2><p>Summary chart generated as real HTML bars.</p></div><span>Chart</span></div><div class="pdf-bars">${barListHtml(barSection)}</div></section>` : ""}
    ${riskSection && filters.includeTable ? `<section class="pdf-section"><div class="pdf-section-head"><div><h2>${pdfText(riskSection.title, 80)}</h2><p>Evidence and priority items.</p></div><span>Risk</span></div><div class="pdf-focus-grid">${riskCardsHtml(payload)}</div></section>` : ""}
    ${tableSection && filters.includeTable ? `<section class="pdf-section"><div class="pdf-section-head"><div><h2>${pdfText(tableSection.title, 80)}</h2><p>Detail rows are rendered as real selectable table data.</p></div><span>Table</span></div>${tableRowsHtml(tableSection, 32)}</section>` : ""}
    ${filters.includeRecommendation ? `<section class="pdf-section"><div class="pdf-section-head"><div><h2>Recommended Actions</h2><p>Management actions generated from the live report dataset.</p></div><span>Action</span></div>${tableRowsHtml({ type: "table", title: "Actions", rows: payload.recommendations || [] }, 10)}</section>` : ""}
  `;
}

function pdfSafeSections(payload: ReportPayload) {
  return Array.isArray(payload.sections) ? payload.sections : [];
}

function pdfSectionByKeyword(payload: ReportPayload, keywords: string[]) {
  const lowered = keywords.map((item) => item.toLowerCase());
  return pdfSafeSections(payload).find((section) => {
    const text = `${section.type || ""} ${section.title || ""}`.toLowerCase();
    return lowered.some((keyword) => text.includes(keyword));
  });
}

function pdfMetricValue(payload: ReportPayload, keys: string[], fallback: unknown = "-") {
  for (const key of keys) {
    const value = payload.metrics?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

function pdfLogoLockup(label: string, value: string) {
  return `<div class="pdf-logo-lockup"><span>${pdfText(label, 40)}</span><strong>${pdfText(value, 70)}</strong></div>`;
}

function pdfMiniMetric(label: string, value: unknown, note = "") {
  return `<article class="pdf-mini-metric"><small>${pdfText(label, 42)}</small><strong>${pdfText(value, 40)}</strong><span>${pdfText(note, 90)}</span></article>`;
}

function pdfMiniInfoRows(rows: Array<[string, unknown, string?]>) {
  return `
    <div class="pdf-info-grid">
      ${rows.map(([label, value, note]) => `
        <div>
          <small>${pdfText(label, 54)}</small>
          <b>${pdfText(value, 80)}</b>
          ${note ? `<span>${pdfText(note, 120)}</span>` : ""}
        </div>
      `).join("")}
    </div>
  `;
}

function pdfSectionPage(sectionNo: string, title: string, subtitle: string, body: string, className = "") {
  return `
    <section class="pdf-section pdf-client-section ${className}">
      <div class="pdf-client-section-head">
        <span>${pdfText(sectionNo, 8)}</span>
        <div><h2>${pdfText(title, 90)}</h2><p>${pdfText(subtitle, 180)}</p></div>
      </div>
      ${body}
    </section>
  `;
}


function buildClientRiskResourceCover(payload: ReportPayload, filters: ReportFilters) {
  const generated = formatDateTime(payload.generatedAt);
  const scope = payload.narrative?.scope || "All Sites";
  const period = payload.narrative?.period || filters.dateRange || "Current period";
  const title = payload.report?.title || "Client Risk & Resource Planning Report";
  const intro = payload.report?.description || payload.narrative?.executiveSummary || "Subscription, endpoint management, resource planning and application risk review.";
  const totalNodes = pdfMetricValue(payload, ["totalNodes", "totalEndpoints", "endpointTotal"], 0);
  const serviceType = pdfMetricValue(payload, ["serviceType"], "Subscribe / Purchase");
  const version = pdfMetricValue(payload, ["version", "systemVersion"], "EMA System");
  const score = pdfMetricValue(payload, ["operationalScore", "score"], 0);

  return `
    <section class="pdf-title-sheet pdf-client-title-sheet">
      <header class="pdf-client-lockups">
        <div class="pdf-logo-box"><small>Client</small><strong>${pdfText(scope, 50)}</strong><span>Logo placeholder</span></div>
        <div class="pdf-logo-box"><small>Solution</small><strong>EMA Unified System</strong><span>Risk & Resource Planning</span></div>
        <div class="pdf-logo-box"><small>Prepared By</small><strong>Worldtech Solutions</strong><span>Management report</span></div>
      </header>

      <div class="pdf-title-grid">
        <div class="pdf-title-copy">
          <span class="pdf-report-kicker">Client Risk & Resource Planning Pack</span>
          <h1>${pdfText(title, 120)}</h1>
          <p>${pdfText(intro, 320)}</p>
        </div>
        <aside class="pdf-score-panel">
          <small>Readiness Score</small>
          <strong>${pdfEscape(score)}%</strong>
          <span>Based on current endpoint, software, service desk and data-quality evidence.</span>
        </aside>
      </div>

      <div class="pdf-title-kpi-grid">
        <div><small>Service Type</small><b>${pdfText(serviceType, 28)}</b><span>Subscription / purchase profile</span></div>
        <div><small>Version</small><b>${pdfText(version, 28)}</b><span>Solution package</span></div>
        <div><small>Total Nodes</small><b>${pdfEscape(totalNodes)}</b><span>Endpoint estate in scope</span></div>
        <div><small>Report Period</small><b>${pdfText(period, 28)}</b><span>${pdfEscape(generated)}</span></div>
      </div>

      <div class="pdf-management-brief">
        <div>
          <span class="pdf-eyebrow">Management Purpose</span>
          <p>Prepared for client review covering subscription summary, endpoint management, endpoint aging, OS compliance, resource planning and application risk.</p>
        </div>
        <div class="pdf-meta-list">
          <div><small>Prepared For</small><b>${pdfText(scope, 72)}</b></div>
          <div><small>Prepared By</small><b>Worldtech Solutions</b></div>
          <div><small>Output</small><b>${pdfText(filters.outputFormat || "PDF", 30)}</b></div>
        </div>
      </div>
    </section>
    <div class="pdf-page-break"></div>
  `;
}

function buildReportIndexPage(items: string[]) {
  return `
    <section class="pdf-section pdf-index-page">
      <div class="pdf-client-section-head">
        <span>00</span>
        <div><h2>Report Contents</h2><p>Client Risk & Resource Planning Pack section flow.</p></div>
      </div>
      <div class="pdf-index-grid">
        ${items.map((item, index) => `<div><b>${String(index + 1).padStart(2, "0")}</b><span>${pdfText(item, 80)}</span></div>`).join("")}
      </div>
    </section>
    <div class="pdf-page-break"></div>
  `;
}

function buildSubscriptionSummarySection(payload: ReportPayload, filters: ReportFilters) {
  const section = pdfSectionByKeyword(payload, ["subscription", "contract", "integration"]);
  const rows = section?.rows?.length ? section.rows : [
    { item: "Service Type", value: pdfMetricValue(payload, ["serviceType"], "Subscribe / Purchase"), note: "Confirm subscription or purchased service package." },
    { item: "Version", value: pdfMetricValue(payload, ["version", "systemVersion"], "EMA System"), note: "Solution/package version in use." },
    { item: "Start Contract", value: pdfMetricValue(payload, ["contractStart"], "To be configured"), note: "Contract source not configured in current dataset." },
    { item: "End Contract", value: pdfMetricValue(payload, ["contractEnd"], "To be configured"), note: "Contract source not configured in current dataset." },
    { item: "Total Nodes", value: pdfMetricValue(payload, ["totalNodes", "totalEndpoints"], 0), note: "Endpoint estate in current scope." },
    { item: "Integration Consideration", value: pdfMetricValue(payload, ["integrationStatus"], "Consider Integration"), note: "Link subscription/licensing source for stronger reporting." }
  ];

  return pdfSectionPage("01", "Subscription Summary / Consider Integration", "Service type, version, contract period, total nodes and integration consideration.", tableRowsHtml({ type: "table", title: "Subscription Summary", rows, columns: ["item", "value", "note"] }, 12, 3));
}

function buildEndpointManagementSection(payload: ReportPayload) {
  const section = pdfSectionByKeyword(payload, ["endpoint management", "management basic", "endpoint coverage"]);
  const total = pdfMetricValue(payload, ["totalNodes", "totalEndpoints"], 0);
  const windows = pdfMetricValue(payload, ["windowsEndpoints", "windowsEndpointTotal"], "-");
  const onlineRate = pdfMetricValue(payload, ["onlineRate"], 0);
  const rows = section?.rows?.length ? section.rows : [
    { label: "PC / Endpoint", value: total, note: "Total managed endpoint records." },
    { label: "Windows OS", value: windows, note: "Windows endpoint coverage where platform is available." },
    { label: "Coverage", value: `${onlineRate}%`, note: "Online coverage rate in selected scope." },
    { label: "Benefits", value: "Visibility / inventory / compliance", note: "Endpoint management value summary." }
  ];
  return pdfSectionPage("02", "Endpoint Management", "Basic information for PC, Windows OS, endpoint coverage, benefits and endpoint type.", `<div class="pdf-kpi-grid pdf-client-kpis">${rows.slice(0, 4).map((row) => pdfMiniMetric(row.label, row.value, row.note)).join("")}</div>${sectionRowsHtml(section, 12)}`);
}

function buildEndpointAnalyticsSection(payload: ReportPayload) {
  const section = pdfSectionByKeyword(payload, ["endpoint analytics", "endpoint type", "endpoint by type"]);
  const fallback = pdfSectionByKeyword(payload, ["endpoint health", "endpoint distribution", "health mix"]);
  const active = section || fallback;
  return pdfSectionPage("03", "Endpoint Analytics Result", "Total endpoint type, source and status distribution.", active ? `<div class="pdf-bars">${barListHtml(active, 10)}</div>` : `<div class="pdf-empty">No endpoint analytics rows returned.</div>`);
}

function buildLocationDepartmentSection(payload: ReportPayload) {
  const section = pdfSectionByKeyword(payload, ["location", "department", "site"]);
  return pdfSectionPage("04", "Location / Department", "Grouping endpoint estate by location or department.", section ? `<div class="pdf-bars">${barListHtml(section, 12)}</div>${tableRowsHtml(section, 18, 4)}` : `<div class="pdf-empty">No location or department grouping returned.</div>`);
}

function buildEndpointAgingSection(payload: ReportPayload) {
  const section = pdfSectionByKeyword(payload, ["aging", "replacement", "lifecycle"]);
  return pdfSectionPage("05", "Endpoint Aging", "Endpoint aging and refresh candidate view by location.", section ? tableRowsHtml(section, 24, 6) : `<div class="pdf-empty">No aging rows returned. Connect BIOS date, purchase date or lifecycle data for richer aging evidence.</div>`);
}

function buildOsComplianceSection(payload: ReportPayload) {
  const section = pdfSectionByKeyword(payload, ["os compliance", "supported os", "unsupported os", "platform"]);
  return pdfSectionPage("06", "OS Supported / OS Compliance", "Windows and supported OS compliance summary.", section ? tableRowsHtml(section, 24, 5) : `<div class="pdf-empty">No OS compliance rows returned.</div>`);
}

function buildResourcePlanningSection(payload: ReportPayload) {
  const section = pdfSectionByKeyword(payload, ["resource planning", "brand", "model", "replacement"]);
  return pdfSectionPage("07", "Resources Planning", "Focus brand PC, model concentration and replacement planning.", section ? `<div class="pdf-bars">${barListHtml(section, 10)}</div>${tableRowsHtml(section, 24, 6)}` : `<div class="pdf-empty">No resource planning rows returned.</div>`);
}

function buildApplicationPurchasingSection(payload: ReportPayload) {
  const section = pdfSectionByKeyword(payload, ["application purchasing", "microsoft", "adobe", "purchasing"]);
  return pdfSectionPage("08", "Application Based On Purchasing", "Microsoft / Adobe and purchased application evidence.", section ? tableRowsHtml(section, 24, 6) : `<div class="pdf-empty">No Microsoft / Adobe purchasing rows returned.</div>`);
}

function buildSensitiveApplicationSection(payload: ReportPayload) {
  const section = pdfSectionByKeyword(payload, ["sensitive", "remote tools", "remote application"]);
  return pdfSectionPage("09", "Sensitive Application", "Remote tools and sensitive access application review.", section ? riskTableHtml(section.rows || [], 24) : `<div class="pdf-empty">No sensitive application rows returned.</div>`, "pdf-sensitive-section");
}

function buildSoftwareRiskSection(payload: ReportPayload) {
  const section = pdfSectionByKeyword(payload, ["games", "antivirus", "unwanted", "unauthorized", "software risk"]);
  return pdfSectionPage("10", "Games / Antivirus / Unwanted / Unauthorized Software", "Software risk summary for games, antivirus, unwanted and unauthorized applications.", section ? tableRowsHtml(section, 30, 6) : `<div class="pdf-empty">No software risk rows returned.</div>`);
}

function buildBrowserVulnerabilitySection(payload: ReportPayload) {
  const section = pdfSectionByKeyword(payload, ["browser", "vulnerability", "chrome", "edge", "firefox"]);
  return pdfSectionPage("11", "Browser Vulnerability", "Browser inventory and outdated browser candidate summary.", section ? tableRowsHtml(section, 24, 6) : `<div class="pdf-empty">No browser vulnerability rows returned.</div>`);
}

function buildManagementSummarySection(payload: ReportPayload, filters: ReportFilters) {
  const findingRows = (payload.narrative?.keyFindings || []).slice(0, 8).map((finding, index) => ({ no: String(index + 1).padStart(2, "0"), finding, priority: index < 2 ? "High" : "Monitor" }));
  return pdfSectionPage("12", "Management Summary", "Overall finding summary and recommended management actions.", `
    <p class="pdf-lead">${pdfText(payload.narrative?.managementConclusion || payload.narrative?.executiveSummary || "Overall management summary generated from available system data.", 420)}</p>
    ${tableRowsHtml({ type: "table", title: "Key Findings", rows: findingRows, columns: ["no", "finding", "priority"] }, 8, 3)}
    ${filters.includeRecommendation ? recommendationsTableHtml(payload.recommendations || [], 12) : ""}
  `);
}

function buildClientRiskResourcePrintableHtml(payload: ReportPayload, filters: ReportFilters) {
  return `
    ${buildClientRiskResourceCover(payload, filters)}
    ${buildReportIndexPage([
      "Subscription Summary / Consider Integration",
      "Endpoint Management",
      "Endpoint Analytics Result",
      "Location / Department",
      "Endpoint Aging",
      "OS Supported / OS Compliance",
      "Resources Planning",
      "Application Based On Purchasing",
      "Sensitive Application",
      "Games / Antivirus / Unwanted / Unauthorized Software",
      "Browser Vulnerability",
      "Management Summary"
    ])}
    ${buildSubscriptionSummarySection(payload, filters)}
    ${buildEndpointManagementSection(payload)}
    ${buildEndpointAnalyticsSection(payload)}
    ${buildLocationDepartmentSection(payload)}
    ${buildEndpointAgingSection(payload)}
    ${buildOsComplianceSection(payload)}
    ${buildResourcePlanningSection(payload)}
    ${buildApplicationPurchasingSection(payload)}
    ${buildSensitiveApplicationSection(payload)}
    ${buildSoftwareRiskSection(payload)}
    ${buildBrowserVulnerabilitySection(payload)}
    ${buildManagementSummarySection(payload, filters)}
  `;
}


function buildSystemOverallPrintableHtml(payload: ReportPayload, filters: ReportFilters) {
  const kpis = printableKpis(payload);
  const chartSections = pdfSafeSections(payload).filter((section) => ["bar", "donut"].includes(section.type));
  const tableSections = pdfSafeSections(payload).filter((section) => section.type === "table");
  const riskSection = pdfSectionByKeyword(payload, ["risk", "attention", "quality"]);
  const findings = (payload.narrative?.keyFindings || []).slice(0, 6).map((finding, index) => ({
    no: String(index + 1).padStart(2, "0"),
    finding,
    priority: index < 2 ? "High" : "Monitor"
  }));

  return `
    ${buildPdfCoverOnlyPage(payload, filters, "executive")}

    <section class="pdf-section pdf-exec-dashboard">
      <div class="pdf-section-head">
        <div><h2>Executive Dashboard</h2><p>Board-level view of system posture, endpoint estate, service pressure and software coverage.</p></div>
        <span>Overview</span>
      </div>
      <div class="pdf-kpi-grid pdf-client-kpis">${kpis.slice(0, 6).map((item) => pdfMiniMetric(item.label, item.value, item.note)).join("")}</div>
      <div class="pdf-two-column-block">
        <div>
          <span class="pdf-eyebrow">Management Interpretation</span>
          <p class="pdf-lead">${pdfText(payload.narrative?.executiveSummary || payload.narrative?.managementConclusion || "Overall system information summary generated from available EMA data.", 520)}</p>
        </div>
        <div>
          <span class="pdf-eyebrow">Key Findings</span>
          ${tableRowsHtml({ type: "table", title: "Key Findings", rows: findings, columns: ["no", "finding", "priority"] }, 6, 3)}
        </div>
      </div>
    </section>

    ${filters.includeChart ? chartSections.slice(0, 6).map((section, index) => pdfSectionPage(String(index + 2).padStart(2, "0"), section.title, "System distribution and trend summary.", `<div class="pdf-bars">${barListHtml(section, 10)}</div>`)).join("") : ""}
    ${riskSection && filters.includeTable ? pdfSectionPage("08", "Risk & Data Quality Summary", "Management attention items and reporting confidence.", riskTableHtml(riskSection.rows || [], 24), "pdf-sensitive-section") : ""}
    ${filters.includeTable ? tableSections.slice(0, 4).map((section, index) => pdfSectionPage(String(index + 9).padStart(2, "0"), section.title, "Detailed evidence table from the current system dataset.", tableRowsHtml(section, 30, 7), "pdf-table-section")).join("") : ""}
    ${filters.includeRecommendation ? pdfSectionPage("99", "Top Management Actions", "Recommended next actions across modules.", recommendationsTableHtml(payload.recommendations || [], 12)) : ""}
  `;
}

function buildDataOnlyPrintableHtml(payload: ReportPayload, filters: ReportFilters) {
  const sections = pdfSafeSections(payload);
  const chartSections = sections.filter((section) => ["bar", "donut"].includes(section.type));
  const tableSections = sections.filter((section) => section.type === "table" || Array.isArray(section.rows));
  const dataSources = payload.dataSources || [];

  return `
    ${buildPdfCoverOnlyPage(payload, { ...filters, includeSummary: false, includeRecommendation: false }, "generic")}
    <section class="pdf-section pdf-summary-section">
      <div class="pdf-section-head"><div><h2>Standard Data Report</h2><p>Direct data output from EMA System. AI analysis and management recommendations are disabled for non-Summary reports.</p></div><span>Data Only</span></div>
      <div class="pdf-summary-layout">
        <div>
          <span class="pdf-eyebrow">No AI Analysis</span>
          <h2>${pdfText(payload.report?.title || "Data Report", 90)}</h2>
          <p>${pdfText(payload.report?.description || "Generated from selected filters and available source records.", 300)}</p>
        </div>
        ${tableRowsHtml({ type: "table", title: "Data Sources", rows: dataSources, columns: ["name", "table", "rows"] }, 12, 3)}
      </div>
    </section>
    ${filters.includeChart ? chartSections.map((section, index) => `<section class="pdf-section"><div class="pdf-section-head"><div><h2>${pdfText(section.title, 80)}</h2><p>System distribution based on selected filters.</p></div><span>Chart</span></div><div class="pdf-bars">${barListHtml(section)}</div></section>`).join("") : ""}
    ${filters.includeTable ? tableSections.slice(0, 8).map((section) => `<section class="pdf-section pdf-table-section"><div class="pdf-section-head"><div><h2>${pdfText(section.title, 80)}</h2><p>Detail rows rendered as selectable table data.</p></div><span>Table</span></div>${tableRowsHtml(section, 36)}</section>`).join("") : ""}
  `;
}

function isSummaryPdf(payload: ReportPayload) {
  return String(payload.report?.type || "").toLowerCase() === "summary" && payload.aiAnalysisEnabled !== false;
}

function isRiskResourcePdf(payload: ReportPayload, filters: ReportFilters) {
  if (!isSummaryPdf(payload)) return false;
  const selected = String(filters.pdfDesign || "auto").toLowerCase();
  const reportId = String(payload.report?.id || "").toLowerCase();
  return selected === "risk-resource" || ["client-summary-rnr", "resource-planning-brand-summary"].includes(reportId);
}

function isSystemOverallPdf(payload: ReportPayload, filters: ReportFilters) {
  if (!isSummaryPdf(payload)) return false;
  const selected = String(filters.pdfDesign || "auto").toLowerCase();
  const reportId = String(payload.report?.id || "").toLowerCase();
  return selected === "system-summary" || reportId === "system-overall-summary";
}

export 
function buildProfessionalPdfCss() {
  return `
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #eef2f7;
      color: #101f36;
      font-family: "Segoe UI", Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body { width: 210mm; min-height: 297mm; }
    .pdf-pack { width: 186mm; margin: 0 auto; padding: 0; display: flex; flex-direction: column; gap: 6mm; }
    .pdf-page-break { page-break-after: always; break-after: page; height: 0; }

    /* hard reset for older experimental cover classes */
    .pdf-cover-wave,
    .pdf-cover-arc,
    .pdf-cover-dots,
    .pdf-client-cover-bg,
    .pdf-cover-page::before,
    .pdf-cover-page::after,
    .pdf-client-cover-page::before,
    .pdf-client-cover-page::after { display: none !important; content: none !important; }
    .pdf-cover-page,
    .pdf-client-cover-page { background: #fff !important; }

    .pdf-title-sheet,
    .pdf-section {
      width: 100%;
      background: #ffffff;
      border: 1px solid #d8e0ec;
      border-radius: 4mm;
      box-shadow: 0 8px 22px rgba(16, 31, 54, .07);
      overflow: hidden;
    }

    .pdf-title-sheet {
      min-height: 273mm;
      padding: 12mm;
      page-break-after: always;
      break-after: page;
      display: flex;
      flex-direction: column;
      gap: 8mm;
      position: relative;
    }
    .pdf-title-sheet::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3mm;
      background: #173b66;
    }

    .pdf-report-header,
    .pdf-client-lockups {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 6mm;
      align-items: center;
      padding-top: 3mm;
    }
    .pdf-client-lockups { grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: stretch; }
    .pdf-brand-lockup { display: flex; gap: 4mm; align-items: center; min-width: 0; }
    .pdf-brand-seal {
      width: 16mm;
      height: 16mm;
      border-radius: 4mm;
      display: grid;
      place-items: center;
      background: #173b66;
      color: #fff;
      font-size: 8pt;
      font-weight: 900;
      letter-spacing: .04em;
    }
    .pdf-brand-lockup strong,
    .pdf-logo-box strong { display: block; color: #101f36; font-size: 11pt; line-height: 1.25; }
    .pdf-brand-lockup span,
    .pdf-logo-box span,
    .pdf-document-label span {
      display: block;
      margin-top: 1mm;
      color: #6c7e96;
      font-size: 7pt;
      font-weight: 800;
      letter-spacing: .1em;
      text-transform: uppercase;
    }
    .pdf-document-label {
      border: 1px solid #d8e0ec;
      border-radius: 3mm;
      padding: 3mm 4mm;
      text-align: right;
      min-width: 36mm;
      background: #f8fafc;
    }
    .pdf-document-label b { display: block; margin-top: 1mm; color: #173b66; font-size: 10pt; }
    .pdf-logo-box {
      min-height: 25mm;
      border: 1px solid #d8e0ec;
      border-radius: 3mm;
      padding: 4mm;
      background: #fbfdff;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .pdf-logo-box small { display: block; color: #1d4ed8; font-size: 7pt; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }

    .pdf-title-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 46mm;
      gap: 8mm;
      align-items: stretch;
      padding: 8mm 0 2mm;
      border-bottom: 1px solid #e2e8f0;
    }
    .pdf-report-kicker,
    .pdf-eyebrow,
    .pdf-section-head > span,
    .pdf-meta-row span {
      display: inline-flex;
      width: fit-content;
      color: #1d4ed8;
      background: #edf4ff;
      border: 1px solid #c8dbff;
      border-radius: 999px;
      padding: 1.5mm 3mm;
      font-size: 6.8pt;
      font-weight: 900;
      letter-spacing: .12em;
      text-transform: uppercase;
    }
    .pdf-title-copy h1 {
      margin: 5mm 0 0;
      color: #101f36;
      font-size: 30pt;
      line-height: 1.08;
      letter-spacing: -.045em;
      font-weight: 850;
    }
    .pdf-title-copy p,
    .pdf-lead {
      margin: 4mm 0 0;
      color: #52667f;
      font-size: 10.2pt;
      line-height: 1.55;
      font-weight: 600;
    }
    .pdf-score-panel {
      border: 1px solid #d8e0ec;
      border-radius: 4mm;
      padding: 5mm;
      background: linear-gradient(180deg, #f8fbff, #ffffff);
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-height: 42mm;
    }
    .pdf-score-panel small,
    .pdf-title-kpi-grid small,
    .pdf-meta-list small,
    .pdf-mini-metric small,
    .pdf-cover-summary-card small {
      display: block;
      color: #6c7e96;
      font-size: 6.7pt;
      font-weight: 900;
      letter-spacing: .1em;
      text-transform: uppercase;
    }
    .pdf-score-panel strong { display: block; margin: 2mm 0; color: #1d4ed8; font-size: 34pt; line-height: 1; letter-spacing: -.04em; }
    .pdf-score-panel span,
    .pdf-title-kpi-grid span,
    .pdf-mini-metric span { color: #5d6f86; font-size: 7.6pt; line-height: 1.35; font-weight: 700; }

    .pdf-title-kpi-grid,
    .pdf-kpi-grid,
    .pdf-cover-summary-card,
    .pdf-client-cover-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 3mm;
    }
    .pdf-title-kpi-grid div,
    .pdf-mini-metric,
    .pdf-cover-summary-card div {
      border: 1px solid #d8e0ec;
      border-radius: 3mm;
      padding: 4mm;
      background: #ffffff;
      min-height: 23mm;
    }
    .pdf-title-kpi-grid b,
    .pdf-mini-metric strong,
    .pdf-cover-summary-card b {
      display: block;
      margin: 1.4mm 0 .8mm;
      color: #101f36;
      font-size: 17pt;
      line-height: 1;
      font-weight: 900;
    }

    .pdf-management-brief {
      margin-top: auto;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 56mm;
      gap: 6mm;
      padding-top: 6mm;
      border-top: 1px solid #e2e8f0;
    }
    .pdf-management-brief p { margin: 3mm 0 0; color: #40546f; font-size: 9.4pt; line-height: 1.55; font-weight: 600; }
    .pdf-meta-list { display: grid; gap: 2.5mm; }
    .pdf-meta-list div { border-left: 2px solid #173b66; padding-left: 3mm; }
    .pdf-meta-list b { display: block; margin-top: 1mm; color: #101f36; font-size: 8.6pt; line-height: 1.3; }

    .pdf-section { padding: 7mm; break-inside: avoid; page-break-inside: avoid; }
    .pdf-table-section { break-inside: auto; page-break-inside: auto; overflow: visible; }
    .pdf-section-head,
    .pdf-client-section-head {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 5mm;
      align-items: start;
      padding-bottom: 3mm;
      margin-bottom: 5mm;
      border-bottom: 1px solid #e2e8f0;
    }
    .pdf-client-section-head { grid-template-columns: 14mm minmax(0, 1fr); align-items: center; }
    .pdf-client-section-head > span,
    .pdf-section-number {
      width: 11mm;
      height: 11mm;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: #173b66;
      color: #fff;
      font-size: 7pt;
      font-weight: 900;
    }
    .pdf-section-head h2,
    .pdf-client-section-head h2 { margin: 0; color: #101f36; font-size: 16pt; line-height: 1.15; letter-spacing: -.025em; }
    .pdf-section-head p,
    .pdf-client-section-head p { margin: 1.5mm 0 0; color: #64748b; font-size: 8.5pt; line-height: 1.4; font-weight: 600; }

    .pdf-summary-layout,
    .pdf-two-column-block { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 5mm; align-items: start; }
    .pdf-exec-dashboard { border-top: 1.6mm solid #1d4ed8; }
    .pdf-sensitive-section { border-top: 1.6mm solid #dc2626; }

    .pdf-table-box { width: 100%; overflow: visible; }
    .pdf-real-table { width: 100%; border-collapse: collapse; font-size: 7.8pt; color: #21324a; }
    .pdf-real-table th {
      background: #f1f5f9;
      color: #50647d;
      text-transform: uppercase;
      letter-spacing: .08em;
      font-size: 6.6pt;
      font-weight: 900;
      text-align: left;
      padding: 2.5mm;
      border: 1px solid #dbe3ee;
    }
    .pdf-real-table td { padding: 2.4mm; border: 1px solid #dbe3ee; vertical-align: top; line-height: 1.35; }
    .pdf-real-table tbody tr:nth-child(even) td { background: #fbfdff; }
    .pdf-metric-table td:nth-child(2) { color: #101f36; font-weight: 900; font-size: 10pt; white-space: nowrap; }
    .pdf-table-note { margin: 3mm 0 0; color: #64748b; font-size: 7.4pt; font-weight: 700; }
    .pdf-empty { border: 1px dashed #bfccdc; border-radius: 3mm; padding: 5mm; background: #f8fafc; color: #64748b; font-size: 8.5pt; font-weight: 700; }

    .pdf-bars { display: grid; gap: 2.5mm; }
    .pdf-bar-row { display: grid; grid-template-columns: minmax(0, 1fr) 18mm 58mm; gap: 3mm; align-items: center; color: #21324a; font-size: 8pt; font-weight: 700; }
    .pdf-bar-row b { color: #101f36; text-align: right; }
    .pdf-bar-row i { height: 4mm; display: block; background: #e7edf6; border-radius: 999px; overflow: hidden; }
    .pdf-bar-row em { height: 100%; display: block; background: #1d4ed8; border-radius: 999px; }

    .pdf-focus-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3mm; }
    .pdf-focus-card,
    .pdf-evidence-card { border: 1px solid #d8e0ec; border-radius: 3mm; padding: 4mm; background: #fbfdff; }
    .pdf-focus-card h3 { margin: 2mm 0 1.5mm; color: #101f36; font-size: 11pt; }
    .pdf-focus-card p,
    .pdf-focus-card div { margin: 0; color: #52667f; font-size: 8pt; line-height: 1.4; }
    .pdf-severity,
    .pdf-risk-pill { display: inline-flex; align-items: center; border-radius: 999px; background: #fff1f2; color: #be123c; padding: 1mm 2mm; font-size: 6.8pt; font-weight: 900; text-transform: uppercase; letter-spacing: .06em; }
    .pdf-risk-pill { background: #eef5ff; color: #1d4ed8; }
    .pdf-index-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3mm; }
    .pdf-index-grid div { border: 1px solid #d8e0ec; border-radius: 3mm; padding: 4mm; background: #fbfdff; display: grid; grid-template-columns: 12mm 1fr; gap: 3mm; align-items: center; }
    .pdf-index-grid b { color: #1d4ed8; font-size: 13pt; }
    .pdf-index-grid span { color: #21324a; font-size: 8.2pt; font-weight: 750; }

    @media print {
      html, body { background: #ffffff; }
      .pdf-pack { width: 186mm; margin: 0 auto; gap: 0; }
      .pdf-title-sheet,
      .pdf-section { box-shadow: none !important; border-color: #d8e0ec; }
      .pdf-section { margin-bottom: 6mm; }
    }
  `;
}

function buildRegeneratedReportHtml(payload: ReportPayload, filters: ReportFilters) {
  const effectiveFilters = isSummaryPdf(payload)
    ? filters
    : { ...filters, includeSummary: false, includeRecommendation: false, pdfDesign: "generic" };
  const isExecutive = /executive/i.test(`${payload.report.id} ${payload.report.title} ${payload.report.category || ""}`);
  const content = !isSummaryPdf(payload)
    ? buildDataOnlyPrintableHtml(payload, effectiveFilters)
    : isRiskResourcePdf(payload, effectiveFilters)
      ? buildClientRiskResourcePrintableHtml(payload, effectiveFilters)
      : isSystemOverallPdf(payload, effectiveFilters)
        ? buildSystemOverallPrintableHtml(payload, effectiveFilters)
        : isExecutive
          ? buildExecutivePrintableHtml(payload, effectiveFilters)
          : buildGenericPrintableHtml(payload, effectiveFilters);
  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${pdfText(payload.report.title, 90)}</title>
  <style>
    ${buildProfessionalPdfCss()}
  </style>
</head>
<body>
  <main class="pdf-pack">${content}</main>
  <script>
    const triggerPrint = () => setTimeout(() => { window.focus(); window.print(); }, 250);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(triggerPrint).catch(triggerPrint);
    else window.addEventListener('load', triggerPrint);
  <\/script>
</body>
</html>`;
}
