import { CSSProperties, DragEvent, useEffect, useMemo, useState } from "react";
import { generateReport, previewReport } from "../services/reportService";
import { buildRegeneratedReportHtml } from "../utils/reportPdfCanvas";

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
  html: string;
  title: string;
  from: string;
  to: string;
  packs: ReportPack[];
  filters: any;
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
  { id: "ops-risk-template", title: "Ops + Risk Pack", subtitle: "Health, SLA and risk exposure", packs: ["operations-health-sla", "security-compliance-exposure", "hardware-asset-lifecycle"] },
  { id: "governance-template", title: "Governance Pack", subtitle: "Compliance, software and cost saving", packs: ["software-application-governance", "dynamic-compliance-report", "dynamic-cost-saving-report"] },
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

function getReportSummary(payload: any, fallback: string) {
  const data = unwrapPayload(payload) || {};
  const narrative = data.narrative || {};
  return textValue(narrative.executiveSummary || narrative.summary || narrative.managementConclusion || narrative.title || data.summary || fallback, fallback);
}

function buildCanvasFilters(range: DateRange, customer: string) {
  return {
    dateRange: range.preset === "custom" ? "custom" : range.preset,
    startDate: range.from,
    endDate: range.to,
    outputFormat: "PDF",
    relationID: 0,
    customer,
    includeSummary: true,
    includeChart: true,
    includeTable: true,
    includeRecommendation: true,
    deviceGroup: "all",
    status: "all",
  };
}

function buildPackRequestPayload(title: string, customer: string, range: DateRange, pack: ReportPack) {
  return {
    ...buildCanvasFilters(range, customer),
    reportId: pack.id,
    dynamicReportType: pack.dynamic ? pack.id : undefined,
    dynamicReportTitle: pack.dynamic ? pack.title : undefined,
    customReportTitle: pack.title,
    parentReportTitle: title,
  };
}

function uniqueRows(rows: any[]) {
  return rows.filter(Boolean);
}

function mergeReportPayloads(title: string, range: DateRange, packs: ReportPack[], payloads: any[]) {
  const unwrapped = payloads.map((payload) => unwrapPayload(payload) || {});
  const summaries = packs.map((pack, index) => ({ pack, summary: getReportSummary(unwrapped[index], pack.subtitle) }));
  const keyFindings = uniqueRows(unwrapped.flatMap((payload, index) => {
    const pack = packs[index];
    const findings = Array.isArray(payload?.narrative?.keyFindings) ? payload.narrative.keyFindings : [];
    if (findings.length) return findings.map((item: any) => `${pack.title}: ${textValue(item, pack.subtitle)}`);
    return [`${pack.title}: ${summaries[index]?.summary || pack.subtitle}`];
  })).slice(0, 18);
  const recommendations = uniqueRows(unwrapped.flatMap((payload, index) => {
    const pack = packs[index];
    const rows = Array.isArray(payload?.recommendations) ? payload.recommendations : [];
    if (rows.length) return rows.map((row: any) => ({ ...row, area: row.area || pack.title, sourceReport: pack.title }));
    return [{ priority: pack.dynamic ? "AI Review" : "Review", action: `Review ${pack.title} findings and assign follow-up owner.`, owner: "Management Team", sourceReport: pack.title }];
  }));
  const sections = unwrapped.flatMap((payload, index) => {
    const pack = packs[index];
    const reportSections = Array.isArray(payload.sections) ? payload.sections : [];
    if (!reportSections.length) {
      return [{
        title: pack.title,
        type: pack.dynamic ? "risk" : "table",
        packId: pack.id,
        packTitle: pack.title,
        rows: [{ Summary: summaries[index]?.summary || pack.subtitle }],
      }];
    }
    return reportSections.map((section: any) => ({
      ...section,
      title: `${pack.title} · ${textValue(section?.title || section?.type, "Report Details")}`,
      packId: pack.id,
      packTitle: pack.title,
      rows: Array.isArray(section?.rows) ? section.rows : [],
    }));
  });

  return {
    report: {
      id: "report-pack-builder",
      title,
      category: "Management Report Pack",
      type: "Dynamic Report Builder",
      description: "Combined report pack generated from selected report canvas modules.",
    },
    generatedAt: new Date().toISOString(),
    dateRange: { from: range.from, to: range.to, preset: range.preset },
    narrative: {
      title,
      period: `${range.from} to ${range.to}`,
      scope: "All Sites",
      executiveSummary: summaries.map((item, index) => `${index + 1}. ${item.pack.title}: ${item.summary}`).join("\n\n"),
      managementConclusion: `${packs.length} selected report pack${packs.length === 1 ? "" : "s"} combined into one management-ready PDF canvas output.",
      summary: `${packs.length} report pack${packs.length === 1 ? "" : "s"} combined into one report canvas output.",
      keyFindings,
    },
    metrics: unwrapped.reduce((record, payload) => ({ ...record, ...(payload.metrics || {}) }), {}),
    builderPacks: packs.map((pack, index) => ({
      order: index + 1,
      id: pack.id,
      title: pack.title,
      subtitle: pack.subtitle,
      category: pack.category,
      dynamic: Boolean(pack.dynamic),
    })),
    dataSources: unwrapped.flatMap((payload, index) => {
      const sources = Array.isArray(payload.dataSources) ? payload.dataSources : [];
      return sources.map((source: any) => ({ ...source, packTitle: packs[index].title }));
    }),
    sections,
    recommendations,
  };
}

async function requestComposedReport(mode: "preview" | "generate", title: string, customer: string, range: DateRange, packs: ReportPack[]) {
  const service = mode === "generate" ? generateReport : previewReport;
  const payloads = [];
  for (const pack of packs) {
    payloads.push(await service(buildPackRequestPayload(title, customer, range, pack)));
  }
  return mergeReportPayloads(title, range, packs, payloads);
}

function downloadPdfDesignHtml(title: string, payload: any, range: DateRange, customer: string) {
  const html = buildRegeneratedReportHtml(payload, buildCanvasFilters(range, customer));
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
    root.classList.remove("ema-settings-page-active", "ema-report-page-active", "ema-report-board-active");
    body.classList.remove("ema-settings-page-active", "ema-report-page-active", "ema-report-board-active");
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
      const matchesFilter = filter === "all" || pack.category === filter;
      const matchesSearch = !keyword || `${pack.title} ${pack.subtitle} ${pack.category}`.toLowerCase().includes(keyword);
      return matchesFilter && matchesSearch;
    });
  }, [filter, search]);

  const updatePreset = (preset: PeriodKey) => setRange(rangeForPreset(preset));
  const updateRange = (key: "from" | "to", value: string) => setRange((current) => ({ ...current, preset: "custom", [key]: value }));

  const placePack = (packId: string, targetIndex?: number) => {
    const pack = REPORT_PACKS.find((item) => item.id === packId);
    if (!pack) return;
    setSlots((current) => {
      const next = [...current];
      const existingIndex = next.findIndex((slot) => slot?.id === pack.id);
      if (existingIndex >= 0) next[existingIndex] = null;
      const index = typeof targetIndex === "number" ? targetIndex : next.findIndex((slot) => !slot);
      if (index < 0) return current;
      next[index] = pack;
      return next;
    });
  };

  const handleDragStart = (event: DragEvent<HTMLElement>, packId: string) => {
    event.dataTransfer.setData("text/plain", packId);
    event.dataTransfer.effectAllowed = "copy";
  };

  const handleDrop = (event: DragEvent<HTMLElement>, index: number) => {
    event.preventDefault();
    const packId = event.dataTransfer.getData("text/plain");
    placePack(packId, index);
  };

  const removePack = (index: number) => setSlots((current) => current.map((slot, slotIndex) => (slotIndex === index ? null : slot)));
  const clearCanvas = () => setSlots(Array.from({ length: CANVAS_SIZE }, () => null));

  const applyTemplate = (templateId: string) => {
    const template = TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;
    const next = Array.from({ length: CANVAS_SIZE }, () => null) as CanvasSlot[];
    template.packs.slice(0, CANVAS_SIZE).forEach((packId, index) => {
      next[index] = REPORT_PACKS.find((pack) => pack.id === packId) || null;
    });
    setSlots(next);
  };

  const runPreview = async () => {
    if (!selectedPacks.length) {
      setError("Please add at least one report pack into the canvas.");
      return;
    }
    setLoading("preview");
    setError("");
    try {
      const payload = await requestComposedReport("preview", title, customer, range, selectedPacks);
      const filters = buildCanvasFilters(range, customer);
      const html = buildRegeneratedReportHtml(payload, filters);
      setPreview({ payload, html, filters, title, from: range.from, to: range.to, packs: selectedPacks });
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
      const payload = await requestComposedReport("generate", title, customer, range, selectedPacks);
      downloadPdfDesignHtml(title, payload, range, customer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate report.");
    } finally {
      setLoading(null);
    }
  };

  const saveTemplate = () => {
    setLoading("save");
    const template = { title, customer, range, packs: selectedPacks.map((pack) => pack.id), savedAt: new Date().toISOString() };
    localStorage.setItem("ema-report-pack-template", JSON.stringify(template));
    window.setTimeout(() => setLoading(null), 300);
  };

  const downloadPreview = () => {
    if (!preview) return;
    downloadPdfDesignHtml(preview.title, preview.payload, range, customer);
  };

  return (
    <main className="report-builder-page">
      <style>{`
        html.ema-report-builder-active,
        body.ema-report-builder-active { height: auto !important; min-height: 100% !important; overflow: auto !important; }
        body.ema-report-builder-active .ema-shell,
        body.ema-report-builder-active .ema-main { height: auto !important; min-height: 100vh !important; max-height: none !important; overflow: visible !important; }
        body.ema-report-builder-active .ema-page { height: auto !important; min-height: calc(100vh - 76px) !important; max-height: none !important; overflow: visible !important; padding: 0 !important; }
        .report-builder-page { min-height: calc(100vh - 76px); color: #071d3b; background: radial-gradient(circle at 18% -8%, rgba(37,99,235,.10), transparent 30rem), radial-gradient(circle at 94% 8%, rgba(139,92,246,.12), transparent 26rem), #f7f9fc; }
        .builder-topbar { position: sticky; top: 0; z-index: 20; min-height: 70px; display: grid; grid-template-columns: minmax(220px, 1fr) 150px 150px auto; align-items: center; gap: 14px; padding: 12px 16px; border-bottom: 1px solid #d9e3f0; background: rgba(255,255,255,.94); backdrop-filter: blur(12px); }
        .builder-field { display: grid; gap: 5px; }
        .builder-field span { color: #7b8ca7; font-size: 10px; font-weight: 950; letter-spacing: .13em; text-transform: uppercase; }
        .builder-title-input, .builder-select, .builder-date-input { width: 100%; height: 34px; border: 1px solid #d4e0ee; border-radius: 10px; background: #f8fbff; color: #071d3b; padding: 0 12px; font-weight: 850; outline: none; }
        .builder-title-input { border: 0; background: transparent; padding: 0; font-size: 16px; font-weight: 950; }
        .builder-date-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .builder-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
        .builder-btn { height: 34px; border: 1px solid #d2dfef; border-radius: 10px; background: #ffffff; color: #17325d; padding: 0 13px; font-size: 12px; font-weight: 950; cursor: pointer; }
        .builder-btn.save { color: #047857; border-color: #b7ead2; background: #f1fff8; }
        .builder-btn.primary { color: #ffffff; border-color: transparent; background: linear-gradient(135deg, #2563eb, #6d28d9); box-shadow: 0 12px 22px rgba(37,99,235,.18); }
        .builder-btn:disabled { opacity: .62; cursor: wait; }
        .builder-shell { display: grid; grid-template-columns: 300px minmax(0, 1fr) 280px; min-height: calc(100vh - 146px); }
        .builder-sidebar, .builder-summary { background: rgba(255,255,255,.76); backdrop-filter: blur(10px); }
        .builder-sidebar { border-right: 1px solid #d8e3f1; padding: 14px; }
        .builder-summary { border-left: 1px solid #d8e3f1; padding: 16px; }
        .section-title { margin: 0 0 10px; color: #17325d; font-size: 12px; font-weight: 950; letter-spacing: .11em; text-transform: uppercase; }
        .library-tabs, .filter-tabs { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 12px; }
        .filter-tabs { grid-template-columns: repeat(3, 1fr); }
        .library-tabs button, .filter-tabs button { height: 32px; border: 1px solid #d5e1f0; border-radius: 9px; background: #ffffff; color: #7b8ca7; font-size: 10px; font-weight: 950; letter-spacing: .08em; text-transform: uppercase; }
        .library-tabs button.active, .filter-tabs button.active { color: #2563eb; border-color: #2563eb; background: #f3f7ff; }
        .pack-search { width: 100%; height: 34px; border: 1px solid #d5e1f0; border-radius: 10px; background: #f8fbff; padding: 0 12px; color: #17325d; font-weight: 800; margin-bottom: 12px; outline: none; }
        .pack-list { display: grid; gap: 9px; }
        .builder-pack-card { min-height: 72px; display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; align-items: center; gap: 10px; border: 1px solid #d9e4f2; border-radius: 15px; background: radial-gradient(circle at 92% 0%, color-mix(in srgb, var(--pack-accent) 10%, transparent), transparent 8rem), #ffffff; color: #071d3b; padding: 10px; text-align: left; cursor: grab; transition: transform .14s ease, box-shadow .14s ease, border-color .14s ease; }
        .builder-pack-card:hover { transform: translateY(-1px); border-color: var(--pack-accent); box-shadow: 0 10px 22px rgba(15,35,71,.08); }
        .pack-icon { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 13px; color: var(--pack-accent); background: color-mix(in srgb, var(--pack-accent) 12%, #ffffff); font-weight: 950; }
        .builder-pack-card strong, .template-card strong { display: block; color: #071d3b; font-size: 12px; line-height: 1.12; font-weight: 950; }
        .builder-pack-card small, .template-card small { display: block; margin-top: 4px; color: #72839d; font-size: 10px; font-weight: 800; line-height: 1.2; }
        .pack-type { padding: 4px 7px; border-radius: 999px; color: var(--pack-accent); background: color-mix(in srgb, var(--pack-accent) 10%, #ffffff); font-size: 9px; font-weight: 950; }
        .template-card { min-height: 86px; border: 1px solid #d9e4f2; border-radius: 15px; background: #ffffff; padding: 12px; text-align: left; }
        .builder-canvas-wrap { padding: 22px 26px 40px; }
        .canvas-head { max-width: 820px; margin: 0 auto 14px; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
        .canvas-head h2 { margin: 0; font-size: 22px; font-weight: 950; letter-spacing: -0.04em; }
        .canvas-head p { margin: 4px 0 0; color: #7b8ca7; font-size: 12px; font-weight: 800; }
        .canvas-head button { border: 0; background: transparent; color: #7b8ca7; font-size: 11px; font-weight: 950; }
        .canvas-grid { max-width: 820px; margin: 0 auto; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        .canvas-slot { position: relative; height: 156px; border: 1.5px dashed #d2dfef; border-radius: 20px; background: rgba(255,255,255,.56); display: grid; place-items: center; color: #b8c8dc; overflow: hidden; }
        .canvas-slot.is-filled { place-items: stretch; border-style: solid; border-color: #d5e1f0; background: #ffffff; box-shadow: 0 12px 28px rgba(15,35,71,.07); }
        .drop-empty { display: grid; place-items: center; gap: 8px; color: #bfd0e4; font-size: 10px; font-weight: 950; letter-spacing: .1em; text-transform: uppercase; }
        .drop-empty i { font-style: normal; font-size: 24px; line-height: 1; }
        .canvas-card { position: relative; height: 100%; display: grid; grid-template-rows: auto 1fr auto; gap: 7px; padding: 14px; border-top: 4px solid var(--pack-accent); background: radial-gradient(circle at 96% 0%, color-mix(in srgb, var(--pack-accent) 13%, transparent), transparent 8rem), #ffffff; }
        .canvas-card-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .canvas-remove { width: 24px; height: 24px; border: 0; border-radius: 999px; background: #f1f5fb; color: #9aabc2; font-weight: 950; }
        .canvas-card strong { display: block; color: #071d3b; font-size: 13px; font-weight: 950; }
        .canvas-card p { margin: 4px 0 0; color: #72839d; font-size: 11px; font-weight: 800; line-height: 1.25; }
        .canvas-card em { color: var(--pack-accent); font-style: normal; font-size: 10px; font-weight: 950; text-transform: uppercase; }
        .summary-card { border: 1px solid #d9e4f2; border-radius: 18px; background: #ffffff; padding: 14px; box-shadow: 0 10px 24px rgba(15,35,71,.045); margin-bottom: 12px; }
        .summary-card h3 { margin: 0 0 6px; font-size: 15px; font-weight: 950; }
        .summary-card p { margin: 0; color: #72839d; font-size: 12px; font-weight: 800; line-height: 1.35; }
        .summary-metric-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 12px; }
        .summary-metric { border: 1px solid #e0e9f5; border-radius: 14px; background: #f8fbff; padding: 10px; }
        .summary-metric span { display: block; color: #7b8ca7; font-size: 9px; font-weight: 950; letter-spacing: .08em; text-transform: uppercase; }
        .summary-metric strong { display: block; margin-top: 4px; color: #071d3b; font-size: 18px; font-weight: 950; }
        .selected-pack-list { display: grid; gap: 8px; margin-top: 12px; }
        .selected-pack-pill { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 8px; align-items: center; border: 1px solid #e0e9f5; border-radius: 13px; background: #f8fbff; padding: 8px; }
        .selected-pack-pill i { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 10px; color: var(--pack-accent); background: color-mix(in srgb, var(--pack-accent) 12%, #ffffff); font-style: normal; font-weight: 950; }
        .selected-pack-pill strong { display: block; font-size: 11px; line-height: 1.1; }
        .selected-pack-pill small { color: #72839d; font-size: 10px; font-weight: 800; }
        .builder-error { max-width: 820px; margin: 14px auto 0; border: 1px solid rgba(239, 68, 68, .24); border-radius: 16px; background: rgba(239, 68, 68, .08); color: #b91c1c; padding: 12px 14px; font-weight: 850; }
        .report-preview-backdrop { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 18px; background: rgba(15, 23, 42, .56); backdrop-filter: blur(8px); }
        .report-preview-modal { width: min(1180px, 100%); height: min(92vh, 900px); display: grid; grid-template-rows: auto minmax(0, 1fr); overflow: hidden; border-radius: 24px; border: 1px solid #d8e5f6; background: #eef3f8; box-shadow: 0 28px 80px rgba(15, 23, 42, .30); }
        .report-preview-modal header { display: flex; justify-content: space-between; gap: 16px; align-items: center; border-bottom: 1px solid #d6e3f5; padding: 12px 14px; background: #ffffff; }
        .report-preview-modal h3 { margin: 0; font-size: 22px; }
        .report-preview-modal header small { color: #64748b; font-weight: 800; }
        .preview-actions { display: flex; gap: 8px; align-items: center; }
        .preview-actions button { border: 1px solid #d4e1f3; background: #f8fbff; border-radius: 12px; padding: 8px 12px; font-weight: 900; }
        .preview-actions .primary { color: #ffffff; border-color: transparent; background: linear-gradient(135deg, #2563eb, #6d28d9); }
        .report-pdf-frame { width: 100%; height: 100%; border: 0; background: #eef3f8; }
        @media (max-width: 1280px) { .builder-shell { grid-template-columns: 290px minmax(0, 1fr); } .builder-summary { grid-column: 1 / -1; border-left: 0; border-top: 1px solid #d8e3f1; } }
        @media (max-width: 980px) { .builder-topbar { grid-template-columns: 1fr 1fr; } .builder-actions { justify-content: flex-start; } .builder-shell { grid-template-columns: 1fr; } .builder-sidebar { border-right: 0; border-bottom: 1px solid #d8e3f1; } .pack-list { grid-template-columns: repeat(2, minmax(220px, 1fr)); } }
        @media (max-width: 720px) { .builder-topbar { grid-template-columns: 1fr; } .canvas-grid, .pack-list { grid-template-columns: 1fr; } }
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
                  <button key={pack.id} type="button" draggable className="builder-pack-card" style={{ "--pack-accent": pack.tone } as CSSProperties} onDragStart={(event) => handleDragStart(event, pack.id)} onClick={() => placePack(pack.id)} title="Drag to canvas or click to add">
                    <span className="pack-icon">{pack.icon}</span>
                    <span><strong>{pack.title}</strong><small>{pack.subtitle}</small></span>
                    <em className="pack-type">{pack.category}</em>
                  </button>
                ))}
              </div>
            </>
          )}

          {viewMode === "templates" && (
            <div className="pack-list">
              {TEMPLATES.map((template) => <button key={template.id} type="button" className="template-card" onClick={() => applyTemplate(template.id)}><strong>{template.title}</strong><small>{template.subtitle}</small></button>)}
            </div>
          )}
        </aside>

        <section className="builder-canvas-wrap">
          <div className="canvas-head">
            <div>
              <h2>Report Canvas</h2>
              <p>Drag report packs here. Preview and generate will use the original PDF-style report format. Selected: {selectedPacks.length}/{CANVAS_SIZE}</p>
            </div>
            <button type="button" onClick={clearCanvas}>Clear Canvas</button>
          </div>

          <div className="canvas-grid">
            {slots.map((slot, index) => (
              <div key={index} className={`canvas-slot ${slot ? "is-filled" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, index)}>
                {slot ? (
                  <div className="canvas-card" style={{ "--pack-accent": slot.tone } as CSSProperties}>
                    <div className="canvas-card-top"><span className="pack-icon">{slot.icon}</span><button className="canvas-remove" type="button" onClick={() => removePack(index)}>×</button></div>
                    <div><strong>{slot.title}</strong><p>{slot.subtitle}</p></div>
                    <em>{slot.category} Pack</em>
                  </div>
                ) : <div className="drop-empty"><i>+</i><span>Drop Report Pack</span></div>}
              </div>
            ))}
          </div>
          {error && <div className="builder-error">{error}</div>}
        </section>

        <aside className="builder-summary">
          <h2 className="section-title">Build Summary</h2>
          <div className="summary-card"><h3>{title || "Untitled Report"}</h3><p>{range.from} to {range.to}</p><div className="summary-metric-grid"><div className="summary-metric"><span>Packs</span><strong>{selectedPacks.length}</strong></div><div className="summary-metric"><span>AI Packs</span><strong>{selectedPacks.filter((pack) => pack.dynamic).length}</strong></div></div></div>
          <div className="summary-card">
            <h3>Selected Packs</h3>
            {selectedPacks.length ? <div className="selected-pack-list">{selectedPacks.map((pack) => <div className="selected-pack-pill" key={pack.id} style={{ "--pack-accent": pack.tone } as CSSProperties}><i>{pack.icon}</i><span><strong>{pack.title}</strong><small>{pack.category}</small></span></div>)}</div> : <p>No pack selected yet. Drag a report pack into the canvas.</p>}
          </div>
        </aside>
      </div>

      {preview && (
        <div className="report-preview-backdrop" onClick={(event) => event.target === event.currentTarget && setPreview(null)}>
          <section className="report-preview-modal">
            <header>
              <div><h3>{preview.title}</h3><small>{preview.from} to {preview.to} · {preview.packs.length} selected pack(s)</small></div>
              <div className="preview-actions"><button className="primary" type="button" onClick={downloadPreview}>Download</button><button type="button" onClick={() => setPreview(null)}>Close</button></div>
            </header>
            <iframe title={`${preview.title} PDF preview`} className="report-pdf-frame" srcDoc={preview.html} />
          </section>
        </div>
      )}
    </main>
  );
}
