import { CSSProperties, DragEvent, useEffect, useMemo, useState } from "react";
import { generateReport, previewReport } from "../services/reportService";

type ReportCategory = "Standard" | "Dynamic";

type ReportPack = {
  id: string;
  title: string;
  subtitle: string;
  category: ReportCategory;
  tone: string;
  icon: string;
  dynamic?: boolean;
};

type PeriodKey = "last-30-days" | "current-month" | "previous-month" | "this-quarter" | "last-7-days" | "custom";

type DateRange = {
  preset: PeriodKey;
  from: string;
  to: string;
};

type CanvasSlot = ReportPack | null;

type PreviewState = {
  payload: any;
  title: string;
  from: string;
  to: string;
  packs: ReportPack[];
} | null;

const CANVAS_SIZE = 6;

const REPORT_PACKS: ReportPack[] = [
  { id: "ai-executive-summary", title: "AI Executive Summary", subtitle: "Executive snapshot for management", category: "Standard", tone: "#2563eb", icon: "▥" },
  { id: "client-summary-rnr", title: "Client RNR Report", subtitle: "Client risk and resource view", category: "Standard", tone: "#0f766e", icon: "◈" },
  { id: "hardware-asset-lifecycle", title: "Hardware Lifecycle", subtitle: "Asset lifecycle and refresh view", category: "Standard", tone: "#7c3aed", icon: "▧" },
  { id: "operations-health-sla", title: "Ops Health & SLA", subtitle: "Operations and SLA health", category: "Standard", tone: "#0284c7", icon: "▤" },
  { id: "security-compliance-exposure", title: "Security Exposure", subtitle: "Risk and compliance exposure", category: "Standard", tone: "#ef4444", icon: "!" },
  { id: "software-application-governance", title: "Software Governance", subtitle: "BSA and software governance", category: "Standard", tone: "#f59e0b", icon: "◇" },
  { id: "dynamic-compliance-report", title: "Compliance Report", subtitle: "AI compliance narrative", category: "Dynamic", tone: "#f59e0b", icon: "✓", dynamic: true },
  { id: "dynamic-cost-saving-report", title: "Cost Saving Report", subtitle: "AI savings and optimisation", category: "Dynamic", tone: "#10b981", icon: "↗", dynamic: true },
  { id: "dynamic-risk-management-report", title: "Risk Management Report", subtitle: "AI risk management analysis", category: "Dynamic", tone: "#ef4444", icon: "⚠", dynamic: true },
];

const TEMPLATES = [
  {
    id: "ops-risk-template",
    title: "Ops + Risk Pack",
    subtitle: "Health, SLA and risk exposure",
    packs: ["operations-health-sla", "security-compliance-exposure", "hardware-asset-lifecycle"],
  },
  {
    id: "governance-template",
    title: "Governance Pack",
    subtitle: "Compliance, software and cost saving",
    packs: ["software-application-governance", "dynamic-compliance-report", "dynamic-cost-saving-report"],
  },
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

function primaryReportId(packs: ReportPack[]) {
  if (packs.length === 1) return packs[0].id;
  if (packs.some((pack) => pack.id === "dynamic-risk-management-report" || pack.id === "security-compliance-exposure")) return "dynamic-risk-management-report";
  if (packs.some((pack) => pack.id === "dynamic-cost-saving-report")) return "dynamic-cost-saving-report";
  if (packs.some((pack) => pack.id === "dynamic-compliance-report")) return "dynamic-compliance-report";
  if (packs.some((pack) => pack.id === "software-application-governance")) return "software-application-governance";
  if (packs.some((pack) => pack.id === "operations-health-sla")) return "operations-health-sla";
  if (packs.some((pack) => pack.id === "hardware-asset-lifecycle")) return "hardware-asset-lifecycle";
  return "ai-executive-summary";
}

function buildRequestPayload(title: string, customer: string, range: DateRange, packs: ReportPack[]) {
  const selectedReportId = primaryReportId(packs);
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
    customer,
    builderMode: true,
    builderPacks: packs.map((pack, index) => ({
      order: index + 1,
      id: pack.id,
      title: pack.title,
      category: pack.category,
      dynamic: Boolean(pack.dynamic),
    })),
    includeSummary: true,
    includeChart: true,
    includeTable: true,
    includeRecommendation: true,
    deviceGroup: "all",
    status: "all",
  };
}

function downloadHtml(title: string, payload: any, range: DateRange, packs: ReportPack[]) {
  const data = unwrapPayload(payload) || {};
  const narrative = data.narrative || {};
  const sections = Array.isArray(data.sections) ? data.sections : [];
  const packList = packs.map((pack, index) => `<li><strong>${index + 1}. ${pack.title}</strong><span>${pack.subtitle}</span></li>`).join("");
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
    .summary{background:#eef6ff;border:1px solid #d3e4fb;border-radius:16px;padding:18px;margin:18px 0}.packs{background:#fff7ed;border:1px solid #fed7aa;border-radius:16px;padding:18px;margin:18px 0}.packs li{display:grid;margin:8px 0}.packs span{color:#64748b;font-size:13px}
    h2{font-size:18px;margin:24px 0 10px;color:#17325d}li{margin:8px 0}strong{color:#17325d}
  </style>
</head>
<body>
<main>
  <h1>${title}</h1>
  <div class="meta">${range.from} to ${range.to}</div>
  <div class="summary">${textValue(narrative.executiveSummary || narrative.summary || narrative.title || "Report generated successfully.").replace(/\n/g, "<br />")}</div>
  <section class="packs"><h2>Selected Report Packs</h2><ol>${packList || "<li>No report pack selected.</li>"}</ol></section>
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
  const [title, setTitle] = useState("Management Report Pack");
  const [customer, setCustomer] = useState("all");
  const [range, setRange] = useState<DateRange>(() => rangeForPreset("last-30-days"));
  const [slots, setSlots] = useState<CanvasSlot[]>(() => Array.from({ length: CANVAS_SIZE }, () => null));
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"packs" | "templates">("packs");
  const [filter, setFilter] = useState<"all" | ReportCategory>("all");
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

  const selectedPacks = useMemo(() => slots.filter(Boolean) as ReportPack[], [slots]);

  const filteredPacks = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return REPORT_PACKS.filter((pack) => {
      if (filter !== "all" && pack.category !== filter) return false;
      if (!keyword) return true;
      return `${pack.title} ${pack.subtitle} ${pack.category}`.toLowerCase().includes(keyword);
    });
  }, [filter, search]);

  const updatePreset = (preset: PeriodKey) => setRange(rangeForPreset(preset));
  const updateRange = (key: "from" | "to", value: string) => setRange((current) => ({ ...current, preset: "custom", [key]: value }));

  const placePack = (packId: string, slotIndex?: number) => {
    const pack = REPORT_PACKS.find((item) => item.id === packId);
    if (!pack) return;
    setSlots((current) => {
      const next = [...current];
      const existingIndex = next.findIndex((slot) => slot?.id === pack.id);
      if (existingIndex >= 0) next[existingIndex] = null;
      const targetIndex = typeof slotIndex === "number" ? slotIndex : next.findIndex((slot) => !slot);
      if (targetIndex < 0) return current;
      next[targetIndex] = pack;
      return next;
    });
  };

  const applyTemplate = (templateId: string) => {
    const template = TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;
    const next = Array.from({ length: CANVAS_SIZE }, () => null) as CanvasSlot[];
    template.packs.forEach((packId, index) => {
      next[index] = REPORT_PACKS.find((pack) => pack.id === packId) || null;
    });
    setSlots(next);
    setTitle(template.title);
    setPreview(null);
    setError("");
  };

  const removePack = (slotIndex: number) => {
    setSlots((current) => current.map((slot, index) => (index === slotIndex ? null : slot)));
  };

  const clearCanvas = () => {
    setSlots(Array.from({ length: CANVAS_SIZE }, () => null));
    setPreview(null);
    setError("");
  };

  const handleDragStart = (event: DragEvent, packId: string) => {
    event.dataTransfer.setData("text/plain", packId);
    event.dataTransfer.effectAllowed = "copyMove";
  };

  const handleDrop = (event: DragEvent, slotIndex: number) => {
    event.preventDefault();
    const packId = event.dataTransfer.getData("text/plain");
    placePack(packId, slotIndex);
  };

  const runPreview = async () => {
    if (!selectedPacks.length) {
      setError("Please add at least one report pack into the canvas.");
      return;
    }
    setLoading("preview");
    setError("");
    try {
      const payload = await previewReport(buildRequestPayload(title, customer, range, selectedPacks));
      setPreview({ title, payload: unwrapPayload(payload), from: range.from, to: range.to, packs: selectedPacks });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to preview report.");
    } finally {
      setLoading(null);
    }
  };

  const runGenerate = async () => {
    if (!selectedPacks.length) {
      setError("Please add at least one report pack into the canvas.");
      return;
    }
    setLoading("generate");
    setError("");
    try {
      const payload = await generateReport(buildRequestPayload(title, customer, range, selectedPacks));
      downloadHtml(title, payload, range, selectedPacks);
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
      packs: selectedPacks.map((pack) => pack.id),
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem("ema-report-pack-template", JSON.stringify(template));
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
          background:
            radial-gradient(circle at 18% -8%, rgba(37,99,235,.10), transparent 30rem),
            radial-gradient(circle at 94% 8%, rgba(139,92,246,.12), transparent 26rem),
            #f7f9fc;
        }
        .builder-topbar {
          position: sticky;
          top: 0;
          z-index: 20;
          min-height: 70px;
          display: grid;
          grid-template-columns: minmax(220px, 1fr) 150px 150px auto;
          align-items: center;
          gap: 14px;
          padding: 12px 16px;
          border-bottom: 1px solid #d9e3f0;
          background: rgba(255,255,255,.94);
          backdrop-filter: blur(12px);
        }
        .builder-field { display: grid; gap: 5px; }
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
          height: 34px;
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
          gap: 8px;
          flex-wrap: wrap;
        }
        .builder-btn {
          height: 34px;
          border: 1px solid #d2dfef;
          border-radius: 10px;
          background: #ffffff;
          color: #17325d;
          padding: 0 13px;
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
          grid-template-columns: 320px minmax(0, 1fr) 280px;
          min-height: calc(100vh - 146px);
        }
        .builder-sidebar,
        .builder-summary {
          background: rgba(255,255,255,.76);
          backdrop-filter: blur(10px);
        }
        .builder-sidebar {
          border-right: 1px solid #d8e3f1;
          padding: 14px;
        }
        .builder-summary {
          border-left: 1px solid #d8e3f1;
          padding: 16px;
        }
        .section-title {
          margin: 0 0 10px;
          color: #17325d;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: .11em;
          text-transform: uppercase;
        }
        .library-tabs,
        .filter-tabs {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }
        .filter-tabs { grid-template-columns: repeat(3, 1fr); }
        .library-tabs button,
        .filter-tabs button {
          height: 32px;
          border: 1px solid #d5e1f0;
          border-radius: 9px;
          background: #ffffff;
          color: #7b8ca7;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: .08em;
          text-transform: uppercase;
        }
        .library-tabs button.active,
        .filter-tabs button.active {
          color: #2563eb;
          border-color: #2563eb;
          background: #f3f7ff;
        }
        .pack-search {
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
        .pack-list {
          display: grid;
          gap: 9px;
        }
        .builder-pack-card {
          min-height: 72px;
          display: grid;
          grid-template-columns: 40px minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          border: 1px solid #d9e4f2;
          border-radius: 15px;
          background:
            radial-gradient(circle at 92% 0%, color-mix(in srgb, var(--pack-accent) 10%, transparent), transparent 8rem),
            #ffffff;
          color: #071d3b;
          padding: 10px;
          text-align: left;
          cursor: grab;
          transition: transform .14s ease, box-shadow .14s ease, border-color .14s ease;
        }
        .builder-pack-card:hover {
          transform: translateY(-1px);
          border-color: var(--pack-accent);
          box-shadow: 0 10px 22px rgba(15,35,71,.08);
        }
        .pack-icon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          color: var(--pack-accent);
          background: color-mix(in srgb, var(--pack-accent) 12%, #ffffff);
          font-weight: 950;
        }
        .builder-pack-card strong,
        .template-card strong {
          display: block;
          color: #071d3b;
          font-size: 12px;
          line-height: 1.12;
          font-weight: 950;
        }
        .builder-pack-card small,
        .template-card small {
          display: block;
          margin-top: 4px;
          color: #72839d;
          font-size: 10px;
          font-weight: 800;
          line-height: 1.2;
        }
        .pack-type {
          padding: 4px 7px;
          border-radius: 999px;
          color: var(--pack-accent);
          background: color-mix(in srgb, var(--pack-accent) 10%, #ffffff);
          font-size: 9px;
          font-weight: 950;
        }
        .template-card {
          min-height: 86px;
          border: 1px solid #d9e4f2;
          border-radius: 15px;
          background: #ffffff;
          padding: 12px;
          text-align: left;
        }
        .builder-canvas-wrap {
          padding: 22px 26px 40px;
        }
        .canvas-head {
          max-width: 780px;
          margin: 0 auto 14px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }
        .canvas-head h2 {
          margin: 0;
          font-size: 21px;
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
          max-width: 780px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .canvas-slot {
          position: relative;
          height: 146px;
          border: 1.5px dashed #d2dfef;
          border-radius: 20px;
          background: rgba(255,255,255,.48);
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
          gap: 7px;
          padding: 14px;
          border-top: 4px solid var(--pack-accent);
          background:
            radial-gradient(circle at 96% 0%, color-mix(in srgb, var(--pack-accent) 13%, transparent), transparent 8rem),
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
          color: #071d3b;
          font-size: 13px;
          font-weight: 950;
        }
        .canvas-card p {
          margin: 4px 0 0;
          color: #72839d;
          font-size: 11px;
          font-weight: 800;
          line-height: 1.25;
        }
        .canvas-card em {
          width: fit-content;
          padding: 4px 8px;
          border-radius: 999px;
          color: var(--pack-accent);
          background: color-mix(in srgb, var(--pack-accent) 10%, #ffffff);
          font-size: 9px;
          font-style: normal;
          font-weight: 950;
          text-transform: uppercase;
        }
        .summary-card {
          border: 1px solid #d8e4f2;
          border-radius: 18px;
          background: #ffffff;
          padding: 14px;
          box-shadow: 0 10px 24px rgba(15,35,71,.052);
          margin-bottom: 12px;
        }
        .summary-card h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 950;
        }
        .summary-card p {
          margin: 6px 0 0;
          color: #72839d;
          font-size: 12px;
          font-weight: 800;
          line-height: 1.35;
        }
        .summary-metric-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-top: 12px;
        }
        .summary-metric {
          border: 1px solid #e0e9f5;
          border-radius: 14px;
          background: #f8fbff;
          padding: 10px;
        }
        .summary-metric span {
          display: block;
          color: #7b8ca7;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: .08em;
          text-transform: uppercase;
        }
        .summary-metric strong {
          display: block;
          margin-top: 4px;
          color: #071d3b;
          font-size: 18px;
          font-weight: 950;
        }
        .selected-pack-list {
          display: grid;
          gap: 8px;
          margin-top: 12px;
        }
        .selected-pack-pill {
          display: grid;
          grid-template-columns: 28px minmax(0, 1fr);
          gap: 8px;
          align-items: center;
          border: 1px solid #e0e9f5;
          border-radius: 13px;
          background: #f8fbff;
          padding: 8px;
        }
        .selected-pack-pill i {
          width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          color: var(--pack-accent);
          background: color-mix(in srgb, var(--pack-accent) 12%, #ffffff);
          font-style: normal;
          font-weight: 950;
        }
        .selected-pack-pill strong {
          display: block;
          font-size: 11px;
          line-height: 1.1;
        }
        .selected-pack-pill small {
          color: #72839d;
          font-size: 10px;
          font-weight: 800;
        }
        .builder-error {
          max-width: 780px;
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
        .report-preview-packs {
          border: 1px solid #d7e3f3;
          border-radius: 16px;
          background: #f8fbff;
          padding: 14px;
          color: #304a70;
          font-weight: 760;
          margin-top: 14px;
        }
        .report-preview-section h4,
        .report-preview-packs h4 { margin: 0 0 10px; }
        .report-preview-section li,
        .report-preview-packs li { margin: 7px 0; color: #3a5274; }
        @media (max-width: 1280px) {
          .builder-shell { grid-template-columns: 300px minmax(0, 1fr); }
          .builder-summary { grid-column: 1 / -1; border-left: 0; border-top: 1px solid #d8e3f1; }
        }
        @media (max-width: 980px) {
          .builder-topbar { grid-template-columns: 1fr 1fr; }
          .builder-actions { justify-content: flex-start; }
          .builder-shell { grid-template-columns: 1fr; }
          .builder-sidebar { border-right: 0; border-bottom: 1px solid #d8e3f1; }
          .pack-list { grid-template-columns: repeat(2, minmax(220px, 1fr)); }
        }
        @media (max-width: 720px) {
          .builder-topbar { grid-template-columns: 1fr; }
          .canvas-grid,
          .pack-list { grid-template-columns: 1fr; }
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
          <button className="builder-btn save" type="button" onClick={saveTemplate} disabled={loading === "save"}>{loading === "save" ? "Saved" : "Save Template"}</button>
          <button className="builder-btn" type="button" onClick={runPreview} disabled={Boolean(loading)}>{loading === "preview" ? "Loading..." : "Preview"}</button>
          <button className="builder-btn primary" type="button" onClick={runGenerate} disabled={Boolean(loading)}>{loading === "generate" ? "Generating..." : "Generate Report"}</button>
        </div>
      </section>

      <div className="builder-shell">
        <aside className="builder-sidebar">
          <h2 className="section-title">Report Packs</h2>
          <div className="library-tabs">
            <button type="button" className={viewMode === "packs" ? "active" : ""} onClick={() => setViewMode("packs")}>Packs</button>
            <button type="button" className={viewMode === "templates" ? "active" : ""} onClick={() => setViewMode("templates")}>Templates</button>
          </div>

          {viewMode === "packs" && (
            <>
              <div className="filter-tabs">
                <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button>
                <button type="button" className={filter === "Standard" ? "active" : ""} onClick={() => setFilter("Standard")}>Standard</button>
                <button type="button" className={filter === "Dynamic" ? "active" : ""} onClick={() => setFilter("Dynamic")}>Dynamic</button>
              </div>
              <input className="pack-search" placeholder="Search report pack..." value={search} onChange={(event) => setSearch(event.target.value)} />
              <div className="pack-list">
                {filteredPacks.map((pack) => (
                  <button
                    key={pack.id}
                    type="button"
                    draggable
                    className="builder-pack-card"
                    style={{ "--pack-accent": pack.tone } as CSSProperties}
                    onDragStart={(event) => handleDragStart(event, pack.id)}
                    onClick={() => placePack(pack.id)}
                    title="Drag to canvas or click to add"
                  >
                    <span className="pack-icon">{pack.icon}</span>
                    <span>
                      <strong>{pack.title}</strong>
                      <small>{pack.subtitle}</small>
                    </span>
                    <em className="pack-type">{pack.category}</em>
                  </button>
                ))}
              </div>
            </>
          )}

          {viewMode === "templates" && (
            <div className="pack-list">
              {TEMPLATES.map((template) => (
                <button key={template.id} type="button" className="template-card" onClick={() => applyTemplate(template.id)}>
                  <strong>{template.title}</strong>
                  <small>{template.subtitle}</small>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="builder-canvas-wrap">
          <div className="canvas-head">
            <div>
              <h2>Report Composition Canvas</h2>
              <p>Build one report by combining selected report packs. Selected: {selectedPacks.length}/{CANVAS_SIZE}</p>
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
                  <div className="canvas-card" style={{ "--pack-accent": slot.tone } as CSSProperties}>
                    <div className="canvas-card-top">
                      <span className="pack-icon">{slot.icon}</span>
                      <button className="canvas-remove" type="button" onClick={() => removePack(index)}>×</button>
                    </div>
                    <div>
                      <strong>{slot.title}</strong>
                      <p>{slot.subtitle}</p>
                    </div>
                    <em>{slot.category} Pack</em>
                  </div>
                ) : (
                  <div className="drop-empty"><i>+</i><span>Drop Report Pack</span></div>
                )}
              </div>
            ))}
          </div>

          {error && <div className="builder-error">{error}</div>}
        </section>

        <aside className="builder-summary">
          <h2 className="section-title">Build Summary</h2>
          <div className="summary-card">
            <h3>{title || "Untitled Report"}</h3>
            <p>{range.from} to {range.to}</p>
            <div className="summary-metric-grid">
              <div className="summary-metric"><span>Packs</span><strong>{selectedPacks.length}</strong></div>
              <div className="summary-metric"><span>AI Packs</span><strong>{selectedPacks.filter((pack) => pack.dynamic).length}</strong></div>
            </div>
          </div>
          <div className="summary-card">
            <h3>Selected Packs</h3>
            {selectedPacks.length ? (
              <div className="selected-pack-list">
                {selectedPacks.map((pack) => (
                  <div className="selected-pack-pill" key={pack.id} style={{ "--pack-accent": pack.tone } as CSSProperties}>
                    <i>{pack.icon}</i>
                    <span><strong>{pack.title}</strong><small>{pack.category}</small></span>
                  </div>
                ))}
              </div>
            ) : (
              <p>No pack selected yet. Drag a report pack into the canvas.</p>
            )}
          </div>
        </aside>
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
            <div className="report-preview-packs">
              <h4>Selected Report Packs</h4>
              <ol>{preview.packs.map((pack) => <li key={pack.id}>{pack.title}</li>)}</ol>
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
