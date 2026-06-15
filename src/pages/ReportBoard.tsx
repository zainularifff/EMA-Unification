import { CSSProperties, useEffect, useState } from "react";
import { generateReport, previewReport } from "../services/reportService";

type ReportCard = {
  id: string;
  title: string;
  subtitle: string;
  group: "Standard" | "Dynamic";
  tone: string;
  icon: string;
  dynamic?: boolean;
};

type PeriodKey = "current-month" | "previous-month" | "this-quarter" | "last-7-days" | "custom";

type DateRange = {
  preset: PeriodKey;
  from: string;
  to: string;
};

type PreviewState = {
  report: ReportCard;
  payload: any;
  from: string;
  to: string;
} | null;

const REPORTS: ReportCard[] = [
  { id: "ai-executive-summary", title: "AI Executive Summary", subtitle: "Executive snapshot", group: "Standard", tone: "#2563eb", icon: "▥" },
  { id: "client-summary-rnr", title: "Client RNR Report", subtitle: "Client risk & resource", group: "Standard", tone: "#0f766e", icon: "◈" },
  { id: "hardware-asset-lifecycle", title: "Hardware Lifecycle", subtitle: "Asset lifecycle", group: "Standard", tone: "#7c3aed", icon: "▧" },
  { id: "operations-health-sla", title: "Ops Health & SLA", subtitle: "Ops and SLA health", group: "Standard", tone: "#0284c7", icon: "▤" },
  { id: "security-compliance-exposure", title: "Security Exposure", subtitle: "Risk exposure", group: "Standard", tone: "#ef4444", icon: "!" },
  { id: "software-application-governance", title: "Software Governance", subtitle: "BSA and software", group: "Standard", tone: "#f59e0b", icon: "◇" },
  { id: "dynamic-compliance-report", title: "Compliance Report", subtitle: "AI compliance", group: "Dynamic", tone: "#f59e0b", icon: "✓", dynamic: true },
  { id: "dynamic-cost-saving-report", title: "Cost Saving Report", subtitle: "AI savings", group: "Dynamic", tone: "#10b981", icon: "↗", dynamic: true },
  { id: "dynamic-risk-management-report", title: "Risk Management Report", subtitle: "AI risk management", group: "Dynamic", tone: "#ef4444", icon: "!", dynamic: true },
];

const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: "current-month", label: "Current Month" },
  { value: "previous-month", label: "Previous Month" },
  { value: "this-quarter", label: "This Quarter" },
  { value: "last-7-days", label: "Last 7 Days" },
  { value: "custom", label: "Custom Range" },
];

function dateIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function today() {
  return dateIso(new Date());
}

function firstDayOfMonth(date = new Date()) {
  return dateIso(new Date(date.getFullYear(), date.getMonth(), 1));
}

function lastDayOfMonth(date = new Date()) {
  return dateIso(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function rangeForPreset(preset: PeriodKey): DateRange {
  const now = new Date();
  if (preset === "previous-month") {
    const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { preset, from: firstDayOfMonth(previous), to: lastDayOfMonth(previous) };
  }
  if (preset === "this-quarter") {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    return { preset, from: dateIso(new Date(now.getFullYear(), quarterStartMonth, 1)), to: today() };
  }
  if (preset === "last-7-days") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    return { preset, from: dateIso(start), to: today() };
  }
  return { preset: "current-month", from: firstDayOfMonth(now), to: today() };
}

function fileSafeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "report";
}

function unwrapPayload(payload: any) {
  return payload?.data && typeof payload.data === "object" ? payload.data : payload;
}

function buildRequestPayload(report: ReportCard, range: DateRange) {
  return {
    reportId: report.id,
    dynamicReportType: report.dynamic ? report.id : undefined,
    dynamicReportTitle: report.dynamic ? report.title : undefined,
    dateRange: range.preset === "custom" ? "custom" : range.preset,
    startDate: range.from,
    endDate: range.to,
    outputFormat: "PDF",
    includeSummary: true,
    includeChart: true,
    includeTable: true,
    includeRecommendation: true,
    relationID: 0,
    deviceGroup: "all",
    status: "all",
  };
}

function textValue(value: any, fallback = "-") {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function downloadHtml(report: ReportCard, payload: any, range: DateRange) {
  const data = unwrapPayload(payload) || {};
  const narrative = data.narrative || {};
  const sections = Array.isArray(data.sections) ? data.sections : [];
  const rowsHtml = sections
    .map((section: any) => {
      const rows = Array.isArray(section.rows) ? section.rows : [];
      const body = rows.slice(0, 12).map((row: any) => {
        if (!row || typeof row !== "object") return `<li>${textValue(row)}</li>`;
        return `<li>${Object.entries(row).map(([key, value]) => `<strong>${key}:</strong> ${textValue(value)}`).join(" · ")}</li>`;
      }).join("");
      return `<section><h2>${textValue(section.title || section.type, "Section")}</h2><ul>${body || "<li>No rows available.</li>"}</ul></section>`;
    })
    .join("");

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${report.title}</title>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;margin:36px;color:#12233f;background:#f8fbff;line-height:1.45}
    main{max-width:980px;margin:auto;background:white;border:1px solid #d8e5f6;border-radius:24px;padding:34px;box-shadow:0 18px 45px rgba(15,35,71,.10)}
    h1{margin:0 0 6px;font-size:30px}.meta{color:#64748b;font-weight:700;margin-bottom:22px}
    .summary{background:#eef6ff;border:1px solid #d3e4fb;border-radius:16px;padding:18px;margin:18px 0}
    h2{font-size:18px;margin:24px 0 10px;color:#17325d}li{margin:8px 0}strong{color:#17325d}
  </style>
</head>
<body>
<main>
  <h1>${report.title}</h1>
  <div class="meta">${range.from} to ${range.to}</div>
  <div class="summary">${textValue(narrative.executiveSummary || narrative.summary || narrative.title || report.subtitle, "Report generated successfully.").replace(/\n/g, "<br />")}</div>
  ${rowsHtml || "<section><h2>Report Data</h2><p>No section data returned.</p></section>"}
</main>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileSafeName(report.title)}-${range.from}-to-${range.to}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function ReportBoard() {
  const [ranges, setRanges] = useState<Record<string, DateRange>>(() => {
    const initial = rangeForPreset("current-month");
    return REPORTS.reduce<Record<string, DateRange>>((record, report) => {
      record[report.id] = initial;
      return record;
    }, {});
  });
  const [loading, setLoading] = useState<Record<string, "preview" | "download" | undefined>>({});
  const [preview, setPreview] = useState<PreviewState>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.classList.remove("ema-settings-page-active", "ema-report-page-active");
    body.classList.remove("ema-settings-page-active", "ema-report-page-active");
    root.classList.add("ema-report-board-active");
    body.classList.add("ema-report-board-active");

    return () => {
      root.classList.remove("ema-report-board-active");
      body.classList.remove("ema-report-board-active");
    };
  }, []);

  const updatePreset = (reportId: string, preset: PeriodKey) => {
    setRanges((current) => ({ ...current, [reportId]: rangeForPreset(preset) }));
  };

  const updateRange = (reportId: string, key: "from" | "to", value: string) => {
    setRanges((current) => ({ ...current, [reportId]: { ...current[reportId], preset: "custom", [key]: value } }));
  };

  const runPreview = async (report: ReportCard) => {
    const range = ranges[report.id];
    setError("");
    setLoading((current) => ({ ...current, [report.id]: "preview" }));
    try {
      const payload = await previewReport(buildRequestPayload(report, range));
      setPreview({ report, payload: unwrapPayload(payload), from: range.from, to: range.to });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to preview report.");
    } finally {
      setLoading((current) => ({ ...current, [report.id]: undefined }));
    }
  };

  const runDownload = async (report: ReportCard) => {
    const range = ranges[report.id];
    setError("");
    setLoading((current) => ({ ...current, [report.id]: "download" }));
    try {
      const payload = await generateReport(buildRequestPayload(report, range));
      downloadHtml(report, payload, range);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to download report.");
    } finally {
      setLoading((current) => ({ ...current, [report.id]: undefined }));
    }
  };

  const standardReports = REPORTS.filter((report) => report.group === "Standard");
  const dynamicReports = REPORTS.filter((report) => report.group === "Dynamic");

  const renderReportCard = (report: ReportCard) => {
    const range = ranges[report.id];
    const state = loading[report.id];
    return (
      <article className={`report-card ${report.dynamic ? "is-dynamic" : "is-standard"}`} key={report.id} style={{ "--report-accent": report.tone } as CSSProperties}>
        <div className="report-card-art" />
        <div className="report-card-top">
          <div className="report-card-icon">{report.icon}</div>
          <div>
            <span className="report-card-kicker">{report.group === "Dynamic" ? "AI Dynamic" : "Standard Report"}</span>
            <h3>{report.title}</h3>
            <p>{report.subtitle}</p>
          </div>
          <span className="report-card-badge">{report.dynamic ? "Daily AI" : "Report"}</span>
        </div>

        <div className="report-card-period">
          <label>
            Period
            <select value={range.preset} onChange={(event) => updatePreset(report.id, event.target.value as PeriodKey)}>
              {PERIOD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>

        <div className="report-date-grid">
          <label>
            From
            <input type="date" value={range.from} onChange={(event) => updateRange(report.id, "from", event.target.value)} />
          </label>
          <label>
            To
            <input type="date" value={range.to} onChange={(event) => updateRange(report.id, "to", event.target.value)} />
          </label>
        </div>

        <div className="report-card-actions">
          <button type="button" onClick={() => runPreview(report)} disabled={Boolean(state)}>
            {state === "preview" ? "Loading..." : "Preview"}
          </button>
          <button className="primary" type="button" onClick={() => runDownload(report)} disabled={Boolean(state)}>
            {state === "download" ? "Preparing..." : "Download"}
          </button>
        </div>
      </article>
    );
  };

  return (
    <main className="report-board-page">
      <style>{`
        html.ema-report-board-active,
        body.ema-report-board-active {
          height: auto !important;
          min-height: 100% !important;
          overflow: auto !important;
        }
        body.ema-report-board-active .ema-shell,
        body.ema-report-board-active .ema-main {
          height: auto !important;
          min-height: 100vh !important;
          max-height: none !important;
          overflow: visible !important;
        }
        body.ema-report-board-active .ema-page {
          height: auto !important;
          min-height: calc(100vh - 76px) !important;
          max-height: none !important;
          overflow: visible !important;
          padding: 0 !important;
        }
        .report-board-page {
          min-height: 100%;
          height: auto;
          overflow: visible;
          padding: 16px;
          color: #13294b;
          background:
            radial-gradient(circle at 10% 0%, rgba(37, 99, 235, 0.055), transparent 22rem),
            linear-gradient(135deg, #f6f8fb 0%, #edf2f7 54%, #e5ecf4 100%);
        }
        .report-board-head {
          min-height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 12px;
          padding: 12px 14px;
          border: 1px solid #d6e3f5;
          border-radius: 20px;
          background:
            radial-gradient(circle at 90% 0%, rgba(37,99,235,.10), transparent 14rem),
            linear-gradient(135deg, rgba(255,255,255,.94), rgba(238,246,255,.78));
          box-shadow: 0 10px 26px rgba(15,35,71,.045);
        }
        .report-board-head span {
          display: block;
          color: #2563eb;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: .13em;
          text-transform: uppercase;
        }
        .report-board-head h2 {
          margin: 3px 0 2px;
          font-size: clamp(20px, 1.9vw, 30px);
          line-height: 1;
          letter-spacing: -0.055em;
        }
        .report-board-head p {
          margin: 0;
          color: #667996;
          font-size: 12px;
          font-weight: 760;
        }
        .report-board-count {
          min-width: 72px;
          border: 1px solid #d6e3f5;
          border-radius: 15px;
          background: #ffffff;
          padding: 8px 10px;
          text-align: center;
        }
        .report-board-count strong { display: block; font-size: 20px; line-height: 1; }
        .report-board-count small { color: #72839d; font-size: 10px; font-weight: 850; }

        .report-board-columns {
          display: grid;
          grid-template-columns: minmax(0, 1.62fr) minmax(320px, .86fr);
          gap: 12px;
          align-items: start;
        }
        .report-category-panel {
          position: relative;
          border: 1px solid #d6e3f5;
          border-radius: 22px;
          background:
            radial-gradient(circle at 96% 0%, color-mix(in srgb, var(--category-accent, #2563eb) 9%, transparent), transparent 17rem),
            rgba(255,255,255,.68);
          padding: 12px;
          box-shadow: 0 12px 30px rgba(15,35,71,.052);
        }
        .report-category-panel.is-dynamic-panel {
          background:
            radial-gradient(circle at 96% 0%, rgba(139,92,246,.12), transparent 17rem),
            linear-gradient(180deg, rgba(255,255,255,.78), rgba(250,246,255,.72));
        }
        .report-category-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          margin: 0 0 10px;
          padding-bottom: 9px;
          border-bottom: 1px solid #dfe9f7;
        }
        .report-category-head strong {
          display: block;
          color: #17325d;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: .12em;
          text-transform: uppercase;
        }
        .report-category-head small {
          display: block;
          margin-top: 2px;
          color: #6c7d97;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0;
          text-transform: none;
        }
        .report-category-head span {
          color: var(--category-accent, #2563eb);
          font-size: 11px;
          font-weight: 950;
        }
        .report-card-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(210px, 1fr));
          gap: 10px;
          align-items: stretch;
        }
        .is-dynamic-panel .report-card-grid {
          grid-template-columns: 1fr;
        }
        .report-card {
          position: relative;
          min-height: 176px;
          display: grid;
          grid-template-rows: auto auto auto auto;
          gap: 7px;
          border: 1px solid #d6e3f5;
          border-radius: 18px;
          background:
            radial-gradient(circle at 98% 0%, color-mix(in srgb, var(--report-accent) 15%, transparent), transparent 8.8rem),
            linear-gradient(180deg, rgba(255,255,255,.99), rgba(249,252,255,.96));
          padding: 11px;
          box-shadow: 0 10px 22px rgba(15,35,71,.052);
          overflow: hidden;
          transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
        }
        .report-card:hover {
          transform: translateY(-2px);
          border-color: color-mix(in srgb, var(--report-accent) 34%, #d6e3f5);
          box-shadow: 0 16px 30px rgba(15,35,71,.082);
        }
        .report-card::before {
          content: "";
          position: absolute;
          inset: 0 0 auto;
          height: 4px;
          background: linear-gradient(90deg, var(--report-accent), color-mix(in srgb, var(--report-accent) 38%, #ffffff));
        }
        .report-card-art {
          position: absolute;
          right: -38px;
          top: -42px;
          width: 106px;
          height: 106px;
          border-radius: 999px;
          border: 18px solid color-mix(in srgb, var(--report-accent) 10%, transparent);
          pointer-events: none;
        }
        .report-card-top {
          position: relative;
          display: grid;
          grid-template-columns: 36px minmax(0, 1fr) auto;
          gap: 8px;
          align-items: center;
        }
        .report-card-icon {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          color: var(--report-accent);
          background: color-mix(in srgb, var(--report-accent) 12%, #ffffff);
          font-weight: 950;
        }
        .report-card-kicker {
          display: block;
          color: var(--report-accent);
          font-size: 8px;
          font-weight: 950;
          letter-spacing: .09em;
          text-transform: uppercase;
        }
        .report-card-badge {
          align-self: start;
          padding: 4px 7px;
          border-radius: 999px;
          color: var(--report-accent);
          background: color-mix(in srgb, var(--report-accent) 10%, #ffffff);
          font-size: 9px;
          font-weight: 950;
          white-space: nowrap;
        }
        .report-card h3 {
          margin: 1px 0 0;
          font-size: 13px;
          line-height: 1.08;
          letter-spacing: -0.02em;
        }
        .report-card p {
          margin: 2px 0 0;
          color: #647895;
          font-size: 10px;
          font-weight: 800;
          line-height: 1.12;
        }
        .report-card-period {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 4px;
          padding: 7px;
          border: 1px solid color-mix(in srgb, var(--report-accent) 16%, #dce7f6);
          border-radius: 13px;
          background: color-mix(in srgb, var(--report-accent) 5%, #ffffff);
        }
        .report-card-period label,
        .report-date-grid label {
          display: grid;
          gap: 3px;
          color: #6d7f9a;
          font-size: 8px;
          font-weight: 950;
          letter-spacing: .08em;
          text-transform: uppercase;
        }
        .report-card-period select,
        .report-date-grid input {
          width: 100%;
          min-height: 28px;
          border: 1px solid #d4e1f3;
          border-radius: 10px;
          background: #fff;
          color: #13294b;
          padding: 4px 7px;
          font-size: 10px;
          font-weight: 850;
          outline: none;
        }
        .report-date-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 6px;
        }
        .report-card-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 6px;
        }
        .report-card-actions button {
          min-height: 30px;
          border-radius: 11px;
          border: 1px solid #cfddef;
          background: #ffffff;
          color: #13294b;
          font-size: 11px;
          font-weight: 950;
        }
        .report-card-actions button.primary {
          border-color: transparent;
          color: #ffffff;
          background: linear-gradient(135deg, var(--report-accent), color-mix(in srgb, var(--report-accent) 72%, #071d3b));
          box-shadow: 0 10px 18px color-mix(in srgb, var(--report-accent) 18%, transparent);
        }
        .report-card-actions button:disabled { opacity: .58; cursor: wait; }
        .report-board-error {
          margin: 12px 0 0;
          border: 1px solid rgba(239, 68, 68, .24);
          border-radius: 16px;
          background: rgba(239, 68, 68, .08);
          color: #b91c1c;
          padding: 12px 14px;
          font-weight: 850;
        }
        .report-preview-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: grid;
          place-items: center;
          padding: 26px;
          background: rgba(15, 23, 42, .46);
          backdrop-filter: blur(8px);
        }
        .report-preview-modal {
          width: min(880px, 100%);
          max-height: min(760px, calc(100vh - 52px));
          overflow: auto;
          border-radius: 26px;
          border: 1px solid #d8e5f6;
          background: #ffffff;
          padding: 24px;
          box-shadow: 0 28px 80px rgba(15, 23, 42, .26);
        }
        .report-preview-modal header {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          border-bottom: 1px solid #e2eaf6;
          padding-bottom: 14px;
          margin-bottom: 14px;
        }
        .report-preview-modal h3 { margin: 0; font-size: 24px; }
        .report-preview-modal header small { color: #64748b; font-weight: 800; }
        .report-preview-modal header button {
          border: 1px solid #d4e1f3;
          background: #f8fbff;
          border-radius: 12px;
          padding: 8px 12px;
          font-weight: 900;
        }
        .report-preview-summary {
          border: 1px solid #d7e3f3;
          border-radius: 16px;
          background: #f8fbff;
          padding: 14px;
          color: #304a70;
          font-weight: 760;
        }
        .report-preview-section {
          margin-top: 16px;
          border: 1px solid #e0e9f6;
          border-radius: 16px;
          padding: 14px;
        }
        .report-preview-section h4 { margin: 0 0 10px; }
        .report-preview-section li { margin: 7px 0; color: #3a5274; }
        @media (min-width: 1660px) {
          .report-card-grid { grid-template-columns: repeat(3, minmax(190px, 1fr)); }
          .is-dynamic-panel .report-card-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 1500px) {
          .report-board-columns { grid-template-columns: minmax(0, 1.35fr) minmax(310px, .9fr); }
          .report-card-grid { grid-template-columns: repeat(2, minmax(200px, 1fr)); }
        }
        @media (max-width: 1180px) {
          .report-board-columns { grid-template-columns: 1fr; }
          .is-dynamic-panel .report-card-grid { grid-template-columns: repeat(3, minmax(200px, 1fr)); }
        }
        @media (max-width: 840px) {
          .report-card-grid,
          .is-dynamic-panel .report-card-grid { grid-template-columns: repeat(2, minmax(190px, 1fr)); }
        }
        @media (max-width: 620px) {
          .report-board-page { padding: 12px; }
          .report-card-grid,
          .is-dynamic-panel .report-card-grid { grid-template-columns: 1fr; }
          .report-board-head { align-items: flex-start; flex-direction: column; }
        }
      `}</style>

      <section className="report-board-head">
        <div>
          <span>Reporting</span>
          <h2>Report Center</h2>
          <p>Choose a report, select the reporting period or custom date range, then preview or download.</p>
        </div>
        <div className="report-board-count">
          <strong>{REPORTS.length}</strong>
          <small>reports</small>
        </div>
      </section>

      <div className="report-board-columns">
        <section className="report-category-panel is-standard-panel" aria-label="Standard reports" style={{ "--category-accent": "#2563eb" } as CSSProperties}>
          <div className="report-category-head">
            <div>
              <strong>Standard Reports</strong>
              <small>Regular reporting packs for operations, risk, asset and software governance.</small>
            </div>
            <span>{standardReports.length} reports</span>
          </div>
          <div className="report-card-grid">
            {standardReports.map(renderReportCard)}
          </div>
        </section>

        <section className="report-category-panel is-dynamic-panel" aria-label="Dynamic reporting" style={{ "--category-accent": "#8b5cf6" } as CSSProperties}>
          <div className="report-category-head">
            <div>
              <strong>Dynamic Reporting</strong>
              <small>AI generated once per day per selected report title.</small>
            </div>
            <span>{dynamicReports.length} reports</span>
          </div>
          <div className="report-card-grid">
            {dynamicReports.map(renderReportCard)}
          </div>
        </section>
      </div>

      {error && <div className="report-board-error">{error}</div>}

      {preview && (
        <div className="report-preview-backdrop" onClick={(event) => event.target === event.currentTarget && setPreview(null)}>
          <section className="report-preview-modal">
            <header>
              <div>
                <h3>{preview.report.title}</h3>
                <small>{preview.from} to {preview.to}</small>
              </div>
              <button type="button" onClick={() => setPreview(null)}>Close</button>
            </header>
            <div className="report-preview-summary">
              {textValue(preview.payload?.narrative?.executiveSummary || preview.payload?.narrative?.summary || preview.payload?.narrative?.title || preview.report.subtitle, "Preview loaded.")}
            </div>
            {(Array.isArray(preview.payload?.sections) ? preview.payload.sections : []).slice(0, 5).map((section: any, index: number) => (
              <section className="report-preview-section" key={`${section?.title || section?.type || "section"}-${index}`}>
                <h4>{textValue(section?.title || section?.type, `Section ${index + 1}`)}</h4>
                <ul>
                  {(Array.isArray(section?.rows) ? section.rows : []).slice(0, 8).map((row: any, rowIndex: number) => (
                    <li key={rowIndex}>{typeof row === "object" && row ? Object.entries(row).map(([key, value]) => `${key}: ${textValue(value)}`).join(" · ") : textValue(row)}</li>
                  ))}
                </ul>
              </section>
            ))}
          </section>
        </div>
      )}
    </main>
  );
}
