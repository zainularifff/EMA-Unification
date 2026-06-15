import { CSSProperties, DragEvent, useEffect, useMemo, useState } from "react";
import { generateReport, previewReport } from "../services/reportService";

type ModuleCategory = "Risk" | "Asset" | "Software" | "Operations" | "Commercial" | "Project";

type ReportModule = {
  id: string;
  title: string;
  subtitle: string;
  category: ModuleCategory;
  tone: string;
  icon: string;
  reportId: string;
};

type PeriodKey = "last-30-days" | "current-month" | "previous-month" | "this-quarter" | "last-7-days" | "custom";

type DateRange = {
  preset: PeriodKey;
  from: string;
  to: string;
};

type CanvasSlot = ReportModule | null;

type PreviewState = {
  payload: any;
  title: string;
  from: string;
  to: string;
  modules: ReportModule[];
} | null;

const CANVAS_SIZE = 9;

const MODULES: ReportModule[] = [
  { id: "os-vulnerability", title: "OS Vulnerability Status", subtitle: "OS compliance, priority and patches", category: "Risk", tone: "#ef4444", icon: "!", reportId: "security-compliance-exposure" },
  { id: "customer-engagement", title: "Customer Engagement", subtitle: "Client data, contract and projects", category: "Commercial", tone: "#2563eb", icon: "◉", reportId: "client-summary-rnr" },
  { id: "realtime-asset", title: "Realtime Asset", subtitle: "Live asset inventory status", category: "Asset", tone: "#6366f1", icon: "◈", reportId: "hardware-asset-lifecycle" },
  { id: "top-software", title: "Top Software & Compliance", subtitle: "Top software category distribution", category: "Software", tone: "#06b6d4", icon: "▤", reportId: "software-application-governance" },
  { id: "top-hardware", title: "Top Hardware Models", subtitle: "Model distribution and fleet profile", category: "Asset", tone: "#a855f7", icon: "▣", reportId: "hardware-asset-lifecycle" },
  { id: "connection-statistics", title: "Connection Statistics", subtitle: "Online, offline and telemetry coverage", category: "Operations", tone: "#10b981", icon: "◌", reportId: "operations-health-sla" },
  { id: "asset-manufacturer", title: "Asset by Manufacturer", subtitle: "Manufacturer distribution view", category: "Asset", tone: "#f97316", icon: "◒", reportId: "hardware-asset-lifecycle" },
  { id: "asset-aging", title: "Asset Aging Profile", subtitle: "Device age and refresh profile", category: "Asset", tone: "#64748b", icon: "⚙", reportId: "hardware-asset-lifecycle" },
  { id: "network-topology", title: "Network Topology", subtitle: "Network device and branch profile", category: "Operations", tone: "#14b8a6", icon: "◎", reportId: "operations-health-sla" },
  { id: "leasing-period", title: "Leasing Period", subtitle: "Lease expiry and renewal window", category: "Commercial", tone: "#f43f5e", icon: "▦", reportId: "client-summary-rnr" },
  { id: "project-status", title: "Project Status Overview", subtitle: "Project progress and delivery health", category: "Project", tone: "#6366f1", icon: "▥", reportId: "ai-executive-summary" },
  { id: "helpdesk-ticket", title: "Helpdesk / Support Ticket Overview", subtitle: "Ticket volume and support pressure", category: "Operations", tone: "#f97316", icon: "☏", reportId: "operations-health-sla" },
  { id: "contract-revenue", title: "Customer Contract & Revenue Analysis", subtitle: "Contract and renewal opportunity", category: "Commercial", tone: "#10b981", icon: "$", reportId: "client-summary-rnr" },
  { id: "pending-lease", title: "Pending or Expiring Leases", subtitle: "Lease risk and renewal action", category: "Commercial", tone: "#ec4899", icon: "◔", reportId: "client-summary-rnr" },
  { id: "budget-utilization", title: "Budget Utilization per Project", subtitle: "Budget usage and project spend", category: "Project", tone: "#3b82f6", icon: "↗", reportId: "dynamic-cost-saving-report" },
  { id: "sla-trend", title: "SLA Compliance & Incident Resolution Trend", subtitle: "SLA pressure and resolution health", category: "Operations", tone: "#f43f5e", icon: "⌁", reportId: "operations-health-sla" },
  { id: "asset-maintenance", title: "Asset Lifecycle & Maintenance History", subtitle: "Maintenance, warranty and lifecycle actions", category: "Asset", tone: "#64748b", icon: "⟳", reportId: "hardware-asset-lifecycle" },
  { id: "risk-management", title: "Risk Management Summary", subtitle: "Risk exposure and remediation priority", category: "Risk", tone: "#ef4444", icon: "⚠", reportId: "dynamic-risk-management-report" },
];

const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: "last-30-days", label: "Last 30 Days" },
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
  if (preset === "last-30-days") {
    const start = new Date(now);
    start.setDate(now.getDate() - 29);
    return { preset, from: dateIso(start), to: today() };
  }
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

function unwrapPayload(payload: any) {
  return payload?.data && typeof payload.data === "object" ? payload.data : payload;
}

function textValue(value: any, fallback = "-") {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function fileSafeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "report";
}

function primaryReportId(modules: ReportModule[]) {
  if (modules.some((module) => module.category === "Risk")) return "dynamic-risk-management-report";
  if (modules.some((module) => module.category === "Commercial" || module.id.includes("budget"))) return "dynamic-cost-saving-report";
  if (modules.some((module) => module.category === "Software")) return "software-application-governance";
  if (modules.some((module) => module.category === "Operations")) return "operations-health-sla";
  if (modules.some((module) => module.category === "Asset")) return "hardware-asset-lifecycle";
  return "ai-executive-summary";
}

function buildRequestPayload(title: string, range: DateRange, modules: ReportModule[]) {
  const selectedReportId = primaryReportId(modules);
  return {
    reportId: selectedReportId,
    dynamicReportType: selectedReportId.startsWith("dynamic-") ? selectedReportId : undefined,
    dynamicReportTitle: title,
    customReportTitle: title,
    dateRange: range.preset === "custom" ? "custom" : range.preset,
    startDate: range.from,
    endDate: range.to,
    outputFormat: "PDF",
    relationID: 0,
    customer: "all",
    builderMode: true,
    builderModules: modules.map((module, index) => ({
      order: index + 1,
      id: module.id,
      title: module.title,
      category: module.category,
      reportId: module.reportId,
    })),
    includeSummary: true,
    includeChart: true,
    includeTable: true,
    includeRecommendation: true,
    deviceGroup: "all",
    status: "all",
  };
}

function downloadHtml(title: string, payload: any, range: DateRange, modules: ReportModule[]) {
  const data = unwrapPayload(payload) || {};
  const narrative = data.narrative || {};
  const sections = Array.isArray(data.sections) ? data.sections : [];
  const moduleList = modules.map((module, index) => `<li><strong>${index + 1}. ${module.title}</strong><span>${module.subtitle}</span></li>`).join("");
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
  <title>${title}</title>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;margin:36px;color:#12233f;background:#f8fbff;line-height:1.45}
    main{max-width:980px;margin:auto;background:white;border:1px solid #d8e5f6;border-radius:24px;padding:34px;box-shadow:0 18px 45px rgba(15,35,71,.10)}
    h1{margin:0 0 6px;font-size:30px}.meta{color:#64748b;font-weight:700;margin-bottom:22px}
    .summary{background:#eef6ff;border:1px solid #d3e4fb;border-radius:16px;padding:18px;margin:18px 0}.modules{background:#fff7ed;border:1px solid #fed7aa;border-radius:16px;padding:18px;margin:18px 0}.modules li{display:grid;margin:8px 0}.modules span{color:#64748b;font-size:13px}
    h2{font-size:18px;margin:24px 0 10px;color:#17325d}li{margin:8px 0}strong{color:#17325d}
  </style>
</head>
<body>
<main>
  <h1>${title}</h1>
  <div class="meta">${range.from} to ${range.to}</div>
  <div class="summary">${textValue(narrative.executiveSummary || narrative.summary || narrative.title || "Report generated successfully.").replace(/\n/g, "<br />")}</div>
  <section class="modules"><h2>Selected Report Modules</h2><ol>${moduleList || "<li>No module selected.</li>"}</ol></section>
  ${rowsHtml || "<section><h2>Report Data</h2><p>No section data returned.</p></section>"}
</main>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileSafeName(title)}-${range.from}-to-${range.to}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function ReportBoard() {
  const [title, setTitle] = useState("Monthly Asset Security Summary");
  const [customer, setCustomer] = useState("all");
  const [range, setRange] = useState<DateRange>(() => rangeForPreset("last-30-days"));
  const [slots, setSlots] = useState<CanvasSlot[]>(() => Array.from({ length: CANVAS_SIZE }, () => null));
  const [search, setSearch] = useState("");
  const [libraryMode, setLibraryMode] = useState<"predefined" | "enterprise">("predefined");
  const [panelMode, setPanelMode] = useState<"modules" | "templates">("modules");
  const [loading, setLoading] = useState<"preview" | "generate" | "save" | null>(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<PreviewState>(null);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.classList.remove("ema-settings-page-active", "ema-report-page-active");
    body.classList.remove("ema-settings-page-active", "ema-report-page-active");
    root.classList.add("ema-report-builder-active");
    body.classList.add("ema-report-builder-active");
    return () => {
      root.classList.remove("ema-report-builder-active");
      body.classList.remove("ema-report-builder-active");
    };
  }, []);

  const selectedModules = useMemo(() => slots.filter(Boolean) as ReportModule[], [slots]);
  const filteredModules = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return MODULES.filter((module) => {
      if (libraryMode === "enterprise" && !["Commercial", "Project", "Operations"].includes(module.category)) return false;
      if (!keyword) return true;
      return `${module.title} ${module.subtitle} ${module.category}`.toLowerCase().includes(keyword);
    });
  }, [libraryMode, search]);

  const updatePreset = (preset: PeriodKey) => setRange(rangeForPreset(preset));
  const updateRange = (key: "from" | "to", value: string) => setRange((current) => ({ ...current, preset: "custom", [key]: value }));

  const placeModule = (moduleId: string, slotIndex?: number) => {
    const module = MODULES.find((item) => item.id === moduleId);
    if (!module) return;
    setSlots((current) => {
      const next = [...current];
      const existingIndex = next.findIndex((slot) => slot?.id === module.id);
      if (existingIndex >= 0) next[existingIndex] = null;
      const targetIndex = typeof slotIndex === "number" ? slotIndex : next.findIndex((slot) => !slot);
      if (targetIndex < 0) return current;
      next[targetIndex] = module;
      return next;
    });
  };

  const removeModule = (slotIndex: number) => {
    setSlots((current) => current.map((slot, index) => (index === slotIndex ? null : slot)));
  };

  const clearCanvas = () => {
    setSlots(Array.from({ length: CANVAS_SIZE }, () => null));
    setPreview(null);
    setError("");
  };

  const handleDragStart = (event: DragEvent, moduleId: string) => {
    event.dataTransfer.setData("text/plain", moduleId);
    event.dataTransfer.effectAllowed = "copyMove";
  };

  const handleDrop = (event: DragEvent, slotIndex: number) => {
    event.preventDefault();
    const moduleId = event.dataTransfer.getData("text/plain");
    placeModule(moduleId, slotIndex);
  };

  const runPreview = async () => {
    if (!selectedModules.length) {
      setError("Please add at least one module into the report canvas.");
      return;
    }
    setLoading("preview");
    setError("");
    try {
      const payload = await previewReport(buildRequestPayload(title, range, selectedModules));
      setPreview({ title, payload: unwrapPayload(payload), from: range.from, to: range.to, modules: selectedModules });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to preview report.");
    } finally {
      setLoading(null);
    }
  };

  const runGenerate = async () => {
    if (!selectedModules.length) {
      setError("Please add at least one module into the report canvas.");
      return;
    }
    setLoading("generate");
    setError("");
    try {
      const payload = await generateReport(buildRequestPayload(title, range, selectedModules));
      downloadHtml(title, payload, range, selectedModules);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate report.");
    } finally {
      setLoading(null);
    }
  };

  const saveTemplate = () => {
    setLoading("save");
    const template = {
      title,
      customer,
      range,
      modules: selectedModules.map((module) => module.id),
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem("ema-report-builder-template", JSON.stringify(template));
    window.setTimeout(() => setLoading(null), 300);
  };

  return (
    <main className="report-builder-page">
      <style>{`
        html.ema-report-builder-active,
        body.ema-report-builder-active {
          height: auto !important;
          min-height: 100% !important;
          overflow: auto !important;
        }
        body.ema-report-builder-active .ema-shell,
        body.ema-report-builder-active .ema-main {
          height: auto !important;
          min-height: 100vh !important;
          max-height: none !important;
          overflow: visible !important;
        }
        body.ema-report-builder-active .ema-page {
          height: auto !important;
          min-height: calc(100vh - 76px) !important;
          max-height: none !important;
          overflow: visible !important;
          padding: 0 !important;
        }
        .report-builder-page {
          min-height: calc(100vh - 76px);
          color: #071d3b;
          background: #f7f9fc;
        }
        .builder-topbar {
          position: sticky;
          top: 0;
          z-index: 20;
          min-height: 72px;
          display: grid;
          grid-template-columns: minmax(200px, 1fr) 150px 155px auto;
          align-items: center;
          gap: 16px;
          padding: 14px 18px;
          border-bottom: 1px solid #d9e3f0;
          background: rgba(255,255,255,.94);
          backdrop-filter: blur(12px);
        }
        .builder-field { display: grid; gap: 6px; }
        .builder-field span {
          color: #7b8ca7;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: .13em;
          text-transform: uppercase;
        }
        .builder-title-input,
        .builder-select,
        .builder-date-input {
          width: 100%;
          height: 36px;
          border: 1px solid #d4e0ee;
          border-radius: 10px;
          background: #f8fbff;
          color: #071d3b;
          padding: 0 12px;
          font-weight: 850;
          outline: none;
        }
        .builder-title-input {
          border: 0;
          background: transparent;
          padding: 0;
          font-size: 16px;
          font-weight: 950;
        }
        .builder-date-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .builder-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }
        .builder-btn {
          height: 36px;
          border: 1px solid #d2dfef;
          border-radius: 10px;
          background: #ffffff;
          color: #17325d;
          padding: 0 14px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
        }
        .builder-btn.save { color: #047857; border-color: #b7ead2; background: #f1fff8; }
        .builder-btn.primary {
          color: #ffffff;
          border-color: transparent;
          background: linear-gradient(135deg, #2563eb, #6d28d9);
          box-shadow: 0 12px 22px rgba(37,99,235,.18);
        }
        .builder-btn:disabled { opacity: .62; cursor: wait; }
        .builder-shell {
          display: grid;
          grid-template-columns: 255px minmax(0, 1fr);
          min-height: calc(100vh - 148px);
        }
        .builder-sidebar {
          border-right: 1px solid #d8e3f1;
          background: #ffffff;
          padding: 14px;
        }
        .library-tabs,
        .panel-tabs {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }
        .library-tabs button,
        .panel-tabs button {
          height: 32px;
          border: 1px solid #d5e1f0;
          border-radius: 9px;
          background: #ffffff;
          color: #7b8ca7;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: .1em;
          text-transform: uppercase;
        }
        .library-tabs button.active,
        .panel-tabs button.active {
          color: #2563eb;
          border-color: #2563eb;
          background: #f3f7ff;
        }
        .panel-tabs { border-bottom: 1px solid #dce6f3; padding-bottom: 10px; }
        .module-search {
          width: 100%;
          height: 34px;
          border: 1px solid #d5e1f0;
          border-radius: 10px;
          background: #f8fbff;
          padding: 0 12px;
          color: #17325d;
          font-weight: 800;
          margin-bottom: 12px;
          outline: none;
        }
        .module-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        .builder-module-card {
          min-height: 76px;
          display: grid;
          justify-items: center;
          align-content: center;
          gap: 7px;
          border: 1px solid #d9e4f2;
          border-radius: 12px;
          background: #ffffff;
          color: #071d3b;
          padding: 10px 8px;
          text-align: center;
          cursor: grab;
          transition: transform .14s ease, box-shadow .14s ease, border-color .14s ease;
        }
        .builder-module-card:hover {
          transform: translateY(-1px);
          border-color: var(--module-accent);
          box-shadow: 0 10px 22px rgba(15,35,71,.08);
        }
        .module-icon {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          color: var(--module-accent);
          background: color-mix(in srgb, var(--module-accent) 12%, #ffffff);
          font-weight: 950;
        }
        .builder-module-card strong {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          color: #071d3b;
          font-size: 10px;
          line-height: 1.15;
          font-weight: 950;
        }
        .builder-canvas-wrap {
          padding: 24px 28px 46px;
        }
        .canvas-head {
          width: min(720px, 100%);
          margin: 0 auto 18px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }
        .canvas-head h2 {
          margin: 0;
          font-size: 19px;
          font-weight: 950;
          letter-spacing: -0.04em;
        }
        .canvas-head p {
          margin: 4px 0 0;
          color: #7b8ca7;
          font-size: 12px;
          font-weight: 800;
        }
        .canvas-head button {
          border: 0;
          background: transparent;
          color: #7b8ca7;
          font-size: 11px;
          font-weight: 950;
        }
        .canvas-grid {
          width: min(720px, 100%);
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }
        .canvas-slot {
          position: relative;
          height: 164px;
          border: 1.5px dashed #d2dfef;
          border-radius: 22px;
          background: #f9fbfe;
          display: grid;
          place-items: center;
          color: #b8c8dc;
          overflow: hidden;
        }
        .canvas-slot.is-filled {
          place-items: stretch;
          border-style: solid;
          border-color: #d5e1f0;
          background: #ffffff;
          box-shadow: 0 12px 28px rgba(15,35,71,.07);
        }
        .drop-empty {
          display: grid;
          place-items: center;
          gap: 8px;
          color: #bfd0e4;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: .1em;
          text-transform: uppercase;
        }
        .drop-empty i { font-style: normal; font-size: 24px; line-height: 1; }
        .canvas-card {
          position: relative;
          height: 100%;
          display: grid;
          grid-template-rows: auto 1fr auto;
          gap: 8px;
          padding: 18px;
          border-top: 4px solid var(--module-accent);
          background:
            radial-gradient(circle at 96% 0%, color-mix(in srgb, var(--module-accent) 13%, transparent), transparent 8rem),
            #ffffff;
        }
        .canvas-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .canvas-remove {
          width: 24px;
          height: 24px;
          border: 0;
          border-radius: 999px;
          background: #f1f5fb;
          color: #9aabc2;
          font-weight: 950;
        }
        .canvas-card strong {
          display: block;
          margin-top: 8px;
          color: #071d3b;
          font-size: 12px;
          font-weight: 950;
        }
        .canvas-card p {
          margin: 4px 0 0;
          color: #72839d;
          font-size: 11px;
          font-weight: 800;
          line-height: 1.25;
        }
        .canvas-lines span {
          display: block;
          height: 5px;
          margin-top: 7px;
          border-radius: 999px;
          background: #edf2f8;
        }
        .canvas-lines span:nth-child(1) { width: 92%; }
        .canvas-lines span:nth-child(2) { width: 72%; }
        .canvas-lines span:nth-child(3) { width: 54%; }
        .builder-error {
          width: min(720px, 100%);
          margin: 14px auto 0;
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
        .report-preview-summary,
        .report-preview-section,
        .report-preview-modules {
          border: 1px solid #d7e3f3;
          border-radius: 16px;
          background: #f8fbff;
          padding: 14px;
          color: #304a70;
          font-weight: 760;
          margin-top: 14px;
        }
        .report-preview-section h4,
        .report-preview-modules h4 { margin: 0 0 10px; }
        .report-preview-section li,
        .report-preview-modules li { margin: 7px 0; color: #3a5274; }
        @media (max-width: 1180px) {
          .builder-topbar { grid-template-columns: 1fr 1fr; }
          .builder-actions { justify-content: flex-start; }
          .builder-shell { grid-template-columns: 1fr; }
          .builder-sidebar { border-right: 0; border-bottom: 1px solid #d8e3f1; }
          .module-list { grid-template-columns: repeat(4, minmax(120px, 1fr)); }
        }
        @media (max-width: 780px) {
          .builder-topbar { grid-template-columns: 1fr; }
          .module-list { grid-template-columns: repeat(2, minmax(120px, 1fr)); }
          .canvas-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <section className="builder-topbar">
        <label className="builder-field">
          <span>Report Title</span>
          <input className="builder-title-input" value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>

        <label className="builder-field">
          <span>Customer</span>
          <select className="builder-select" value={customer} onChange={(event) => setCustomer(event.target.value)}>
            <option value="all">All Customers</option>
            <option value="internal">Internal Customer</option>
            <option value="external">External Customer</option>
          </select>
        </label>

        <label className="builder-field">
          <span>Date Range</span>
          <select className="builder-select" value={range.preset} onChange={(event) => updatePreset(event.target.value as PeriodKey)}>
            {PERIOD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>

        <div className="builder-actions">
          {range.preset === "custom" && (
            <div className="builder-date-row">
              <input className="builder-date-input" type="date" value={range.from} onChange={(event) => updateRange("from", event.target.value)} />
              <input className="builder-date-input" type="date" value={range.to} onChange={(event) => updateRange("to", event.target.value)} />
            </div>
          )}
          <button className="builder-btn" type="button">History</button>
          <button className="builder-btn save" type="button" onClick={saveTemplate} disabled={loading === "save"}>{loading === "save" ? "Saved" : "Save Template"}</button>
          <button className="builder-btn" type="button" onClick={runPreview} disabled={Boolean(loading)}>{loading === "preview" ? "Loading..." : "Preview"}</button>
          <button className="builder-btn primary" type="button" onClick={runGenerate} disabled={Boolean(loading)}>{loading === "generate" ? "Generating..." : "Generate Report"}</button>
        </div>
      </section>

      <div className="builder-shell">
        <aside className="builder-sidebar">
          <div className="library-tabs">
            <button type="button" className={libraryMode === "predefined" ? "active" : ""} onClick={() => setLibraryMode("predefined")}>Predefined</button>
            <button type="button" className={libraryMode === "enterprise" ? "active" : ""} onClick={() => setLibraryMode("enterprise")}>Enterprise</button>
          </div>

          <div className="panel-tabs">
            <button type="button" className={panelMode === "modules" ? "active" : ""} onClick={() => setPanelMode("modules")}>Modules</button>
            <button type="button" className={panelMode === "templates" ? "active" : ""} onClick={() => setPanelMode("templates")}>Templates</button>
          </div>

          <input className="module-search" placeholder="Search modules..." value={search} onChange={(event) => setSearch(event.target.value)} />

          <div className="module-list">
            {panelMode === "modules" ? filteredModules.map((module) => (
              <button
                key={module.id}
                type="button"
                draggable
                className="builder-module-card"
                style={{ "--module-accent": module.tone } as CSSProperties}
                onDragStart={(event) => handleDragStart(event, module.id)}
                onClick={() => placeModule(module.id)}
                title="Drag to canvas or click to add"
              >
                <span className="module-icon">{module.icon}</span>
                <strong>{module.title}</strong>
              </button>
            )) : (
              <button type="button" className="builder-module-card" style={{ "--module-accent": "#2563eb" } as CSSProperties} onClick={() => MODULES.slice(0, 4).forEach((module, index) => placeModule(module.id, index))}>
                <span className="module-icon">▥</span>
                <strong>Monthly Asset Security Template</strong>
              </button>
            )}
          </div>
        </aside>

        <section className="builder-canvas-wrap">
          <div className="canvas-head">
            <div>
              <h2>Report Canvas</h2>
              <p>Drag and drop modules to build your report. Selected: {selectedModules.length}/{CANVAS_SIZE}</p>
            </div>
            <button type="button" onClick={clearCanvas}>Clear Canvas</button>
          </div>

          <div className="canvas-grid">
            {slots.map((slot, index) => (
              <div
                key={index}
                className={`canvas-slot ${slot ? "is-filled" : ""}`}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleDrop(event, index)}
              >
                {slot ? (
                  <div className="canvas-card" style={{ "--module-accent": slot.tone } as CSSProperties}>
                    <div className="canvas-card-top">
                      <span className="module-icon">{slot.icon}</span>
                      <button className="canvas-remove" type="button" onClick={() => removeModule(index)}>×</button>
                    </div>
                    <div>
                      <strong>{slot.title}</strong>
                      <p>{slot.subtitle}</p>
                    </div>
                    <div className="canvas-lines"><span /><span /><span /></div>
                  </div>
                ) : (
                  <div className="drop-empty"><i>+</i><span>Drop Module</span></div>
                )}
              </div>
            ))}
          </div>

          {error && <div className="builder-error">{error}</div>}
        </section>
      </div>

      {preview && (
        <div className="report-preview-backdrop" onClick={(event) => event.target === event.currentTarget && setPreview(null)}>
          <section className="report-preview-modal">
            <header>
              <div>
                <h3>{preview.title}</h3>
                <small>{preview.from} to {preview.to}</small>
              </div>
              <button type="button" onClick={() => setPreview(null)}>Close</button>
            </header>
            <div className="report-preview-modules">
              <h4>Selected Modules</h4>
              <ol>{preview.modules.map((module) => <li key={module.id}>{module.title}</li>)}</ol>
            </div>
            <div className="report-preview-summary">
              {textValue(preview.payload?.narrative?.executiveSummary || preview.payload?.narrative?.summary || preview.payload?.narrative?.title || "Preview loaded.")}
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
