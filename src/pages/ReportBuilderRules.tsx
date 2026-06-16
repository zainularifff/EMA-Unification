import { CSSProperties, DragEvent, useEffect, useMemo, useState } from "react";
import { generateReport, previewReport } from "../services/reportService";
import { getDepartments, type DepartmentNode } from "../services/commonService";
import { buildBuilderReportHtml } from "../utils/reportPdfBuilderOutput";

type Category = "Standard" | "Dynamic";
type Period = "last-30-days" | "current-month" | "previous-month" | "this-quarter" | "custom";
type Pack = { id: string; title: string; subtitle: string; category: Category; tone: string; icon: string; dynamic?: boolean; standalone?: boolean };
type Range = { preset: Period; from: string; to: string };
type BranchOption = { id: string; name: string; relationID: number; fullName?: string; count?: number };

const CANVAS_SIZE = 6;
const SUMMARY_REPORT_ID = "ai-executive-summary";

const PACKS: Pack[] = [
  { id: SUMMARY_REPORT_ID, title: "AI Executive Summary", subtitle: "Standalone executive snapshot", category: "Standard", tone: "#2563eb", icon: "▥", standalone: true },
  { id: "client-summary-rnr", title: "Client RNR Report", subtitle: "Client risk and resource view", category: "Standard", tone: "#0f766e", icon: "◈" },
  { id: "hardware-asset-lifecycle", title: "Hardware Lifecycle", subtitle: "Asset lifecycle and refresh planning", category: "Standard", tone: "#7c3aed", icon: "▧" },
  { id: "operations-health-sla", title: "Ops Health & SLA", subtitle: "Operations and SLA health", category: "Standard", tone: "#0284c7", icon: "▤" },
  { id: "security-compliance-exposure", title: "Security Exposure", subtitle: "Risk and compliance exposure", category: "Standard", tone: "#ef4444", icon: "!" },
  { id: "software-application-governance", title: "Software Governance", subtitle: "BSA and software governance", category: "Standard", tone: "#f59e0b", icon: "◇" },
  { id: "software-metering-report", title: "Software Metering", subtitle: "Licence usage, installs and cleanup evidence", category: "Standard", tone: "#f97316", icon: "◫" },
  { id: "application-metering-report", title: "Application Metering", subtitle: "Application usage, active users and low-usage apps", category: "Standard", tone: "#06b6d4", icon: "▦" },
  { id: "internet-metering-report", title: "Internet Metering", subtitle: "Bandwidth, users, department and category usage", category: "Standard", tone: "#14b8a6", icon: "◎" },
  { id: "dynamic-compliance-report", title: "Compliance Report", subtitle: "AI compliance narrative", category: "Dynamic", tone: "#f59e0b", icon: "✓", dynamic: true },
  { id: "dynamic-cost-saving-report", title: "Cost Saving Report", subtitle: "AI savings and optimisation", category: "Dynamic", tone: "#10b981", icon: "↗", dynamic: true },
  { id: "dynamic-risk-management-report", title: "Risk Management Report", subtitle: "AI risk management analysis", category: "Dynamic", tone: "#ef4444", icon: "⚠", dynamic: true },
];

const TEMPLATES = [
  { title: "RNR + Hardware Pack", packs: ["client-summary-rnr", "hardware-asset-lifecycle"] },
  { title: "Ops + Risk Pack", packs: ["operations-health-sla", "security-compliance-exposure", "hardware-asset-lifecycle"] },
  { title: "Governance Pack", packs: ["software-application-governance", "dynamic-compliance-report", "dynamic-cost-saving-report"] },
  { title: "Metering Governance Pack", packs: ["software-metering-report", "application-metering-report", "internet-metering-report"] },
];

const PERIODS: { value: Period; label: string }[] = [
  { value: "last-30-days", label: "Last 30 Days" },
  { value: "current-month", label: "Current Month" },
  { value: "previous-month", label: "Previous Month" },
  { value: "this-quarter", label: "This Quarter" },
  { value: "custom", label: "Custom Range" },
];

const FALLBACK_BRANCHES: BranchOption[] = [
  { id: "all", name: "All Branches", relationID: 0 },
  { id: "16", name: "HQ", relationID: 16, count: 16 },
  { id: "54", name: "KL Branch", relationID: 54, count: 54 },
  { id: "2-putrajaya", name: "Putrajaya Branch", relationID: 2, count: 2 },
  { id: "2-selangor", name: "Selangor Branch", relationID: 2, count: 2 },
  { id: "6", name: "Servers", relationID: 6, count: 6 },
  { id: "workgroup", name: "WORKGROUP", relationID: 0 },
];

function iso(date: Date) { return date.toISOString().slice(0, 10); }
function monthStart(date = new Date()) { return iso(new Date(date.getFullYear(), date.getMonth(), 1)); }
function monthEnd(date = new Date()) { return iso(new Date(date.getFullYear(), date.getMonth() + 1, 0)); }
function rangeOf(preset: Period): Range {
  const now = new Date();
  if (preset === "last-30-days") { const start = new Date(now); start.setDate(now.getDate() - 29); return { preset, from: iso(start), to: iso(now) }; }
  if (preset === "previous-month") { const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1); return { preset, from: monthStart(previous), to: monthEnd(previous) }; }
  if (preset === "this-quarter") { const startMonth = Math.floor(now.getMonth() / 3) * 3; return { preset, from: iso(new Date(now.getFullYear(), startMonth, 1)), to: iso(now) }; }
  return { preset: "current-month", from: monthStart(now), to: iso(now) };
}

function unwrap(payload: any) { return payload?.data && typeof payload.data === "object" ? payload.data : payload; }
function text(value: any, fallback = "-") { return value === undefined || value === null || value === "" ? fallback : String(typeof value === "object" ? JSON.stringify(value) : value); }
function safeName(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "report"; }
function isSummary(pack?: Pack | null) { return pack?.id === SUMMARY_REPORT_ID || Boolean(pack?.standalone); }
function categoryLabel(pack: Pack | Category) { const value = typeof pack === "string" ? pack : pack.category; return value === "Dynamic" ? "AI Dynamic Reporting" : "Standard Report"; }
function branchLabel(branch: BranchOption) { return branch.count ? `${branch.name} (${branch.count})` : branch.name; }

function flattenBranches(nodes: DepartmentNode[] = [], depth = 0): BranchOption[] {
  return nodes.flatMap((node, index) => {
    const relationID = Number(node.Object_Rel_Idn ?? node.id ?? 0) || 0;
    const name = String(node.Object_Rel_Name || node.Object_Full_Name || node.name || "Branch").trim();
    const option: BranchOption = {
      id: `${relationID || name}-${depth}-${index}`,
      name,
      relationID,
      fullName: node.Object_Full_Name || name,
      count: Number(node.assetCount || node.count || node.total || 0) || undefined,
    };
    return [option, ...flattenBranches(node.children || [], depth + 1)];
  });
}

function filters(range: Range, branch: BranchOption) {
  return {
    dateRange: range.preset,
    startDate: range.from,
    endDate: range.to,
    outputFormat: "PDF",
    relationID: branch.relationID,
    branchName: branch.name,
    locationBranch: branch.fullName || branch.name,
    scope: branch.id === "all" ? "All Sites" : branch.name,
    department: branch.id === "all" ? undefined : branch.name,
    deviceGroup: "all",
    status: "all",
    includeSummary: true,
    includeChart: true,
    includeTable: true,
    includeRecommendation: true,
  };
}

function requestPayload(title: string, branch: BranchOption, range: Range, pack: Pack) {
  return { ...filters(range, branch), reportId: pack.id, dynamicReportType: pack.dynamic ? pack.id : undefined, dynamicReportTitle: pack.dynamic ? pack.title : undefined, customReportTitle: pack.title, parentReportTitle: title };
}

function ensureOriginalPayload(payload: any, pack: Pack, range: Range, branch: BranchOption) {
  const data = unwrap(payload) || {};
  const narrative = data.narrative || {};
  const summary = narrative.executiveSummary || narrative.summary || narrative.managementConclusion || narrative.title || pack.subtitle;
  return {
    ...data,
    report: { ...(data.report || {}), id: data.report?.id || pack.id, title: data.report?.title || pack.title, category: data.report?.category || pack.category, type: data.report?.type || pack.category, description: data.report?.description || pack.subtitle },
    generatedAt: data.generatedAt || new Date().toISOString(),
    dateRange: data.dateRange || { from: range.from, to: range.to, preset: range.preset },
    narrative: { ...narrative, title: narrative.title || pack.title, period: narrative.period || `${range.from} to ${range.to}`, scope: branch.id === "all" ? "All Sites" : branch.name, executiveSummary: summary, managementConclusion: narrative.managementConclusion || summary, keyFindings: Array.isArray(narrative.keyFindings) && narrative.keyFindings.length ? narrative.keyFindings : [summary] },
    sections: Array.isArray(data.sections) ? data.sections : [],
    recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
    metrics: data.metrics || {},
    filters: { ...(data.filters || {}), ...filters(range, branch) },
  };
}

function summaryOf(payload: any, pack: Pack) {
  const data = unwrap(payload) || {};
  const narrative = data.narrative || {};
  return text(narrative.executiveSummary || narrative.summary || narrative.managementConclusion || narrative.title || pack.subtitle, pack.subtitle);
}

function composePayload(title: string, range: Range, branch: BranchOption, packs: Pack[], responses: any[]) {
  if (packs.length === 1) return ensureOriginalPayload(responses[0], packs[0], range, branch);
  const sections: any[] = [];
  const recommendations: any[] = [];
  const keyFindings: string[] = [];
  const metrics: Record<string, any> = {};

  responses.forEach((response, index) => {
    const pack = packs[index];
    const payload = unwrap(response) || {};
    const summary = summaryOf(payload, pack);
    keyFindings.push(`${pack.title}: ${summary}`);
    if (payload.metrics && typeof payload.metrics === "object") Object.assign(metrics, payload.metrics);
    const reportSections = Array.isArray(payload.sections) ? payload.sections : [];
    if (!reportSections.length) sections.push({ title: pack.title, type: "table", rows: [{ Report: pack.title, Summary: summary }] });
    reportSections.forEach((section: any) => sections.push({ ...section, title: `${pack.title} · ${text(section?.title || section?.type, "Report Details")}`, rows: Array.isArray(section?.rows) ? section.rows : [] }));
    const actions = Array.isArray(payload.recommendations) ? payload.recommendations : [];
    actions.forEach((row: any) => recommendations.push({ ...row, area: row.area || pack.title, sourceReport: pack.title }));
  });

  const executiveSummary = packs.map((pack, index) => `${index + 1}. ${pack.title}: ${summaryOf(responses[index], pack)}`).join("\n\n");
  return {
    report: { id: "report-pack-builder", title, category: "Combined Report Pack", type: "Dynamic Report Builder", description: "Combined report generated from selected canvas report packs." },
    generatedAt: new Date().toISOString(),
    dateRange: { from: range.from, to: range.to, preset: range.preset },
    narrative: { title, period: `${range.from} to ${range.to}`, scope: branch.id === "all" ? "All Sites" : branch.name, executiveSummary, managementConclusion: executiveSummary, keyFindings: keyFindings.slice(0, 18) },
    metrics,
    sections,
    recommendations: recommendations.length ? recommendations : packs.map((pack) => ({ priority: "Review", action: `Review ${pack.title} findings and assign owner.`, owner: "Management Team" })),
    builderPacks: packs.map((pack, index) => ({ order: index + 1, id: pack.id, title: pack.title, category: pack.category })),
  };
}

async function buildReport(mode: "preview" | "generate", title: string, branch: BranchOption, range: Range, packs: Pack[]) {
  const service = mode === "generate" ? generateReport : previewReport;
  const responses: any[] = [];
  for (const pack of packs) responses.push(await service(requestPayload(title, branch, range, pack)));
  return composePayload(title, range, branch, packs, responses);
}

function downloadHtml(title: string, payload: any, range: Range, branch: BranchOption) {
  const html = buildBuilderReportHtml(payload, filters(range, branch));
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeName(title)}-${range.from}-to-${range.to}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function ReportBuilderRules() {
  const [title, setTitle] = useState("Management Report Pack");
  const [range, setRange] = useState<Range>(() => rangeOf("last-30-days"));
  const [branchId, setBranchId] = useState("all");
  const [branchOptions, setBranchOptions] = useState<BranchOption[]>(FALLBACK_BRANCHES);
  const [slots, setSlots] = useState<(Pack | null)[]>(() => Array.from({ length: CANVAS_SIZE }, () => null));
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"packs" | "templates">("packs");
  const [filter, setFilter] = useState<"all" | Category>("all");
  const [loading, setLoading] = useState<"preview" | "generate" | null>(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ title: string; html: string; count: number } | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("ema-report-builder-active");
    document.body.classList.add("ema-report-builder-active");
    getDepartments().then((departments) => {
      const options = flattenBranches(departments);
      if (options.length) setBranchOptions([{ id: "all", name: "All Branches", relationID: 0 }, ...options]);
    }).catch(() => setBranchOptions(FALLBACK_BRANCHES));
    return () => { document.documentElement.classList.remove("ema-report-builder-active"); document.body.classList.remove("ema-report-builder-active"); };
  }, []);

  const selectedBranch = useMemo(() => branchOptions.find((branch) => branch.id === branchId) || branchOptions[0] || FALLBACK_BRANCHES[0], [branchOptions, branchId]);
  const selected = useMemo(() => slots.filter(Boolean) as Pack[], [slots]);
  const hasSummary = selected.some(isSummary);
  const standardCount = PACKS.filter((pack) => pack.category === "Standard").length;
  const dynamicCount = PACKS.filter((pack) => pack.category === "Dynamic").length;
  const packs = useMemo(() => PACKS.filter((pack) => (filter === "all" || pack.category === filter) && `${pack.title} ${pack.subtitle} ${categoryLabel(pack)}`.toLowerCase().includes(search.toLowerCase())), [filter, search]);

  const addPack = (pack: Pack, target?: number) => setSlots((current) => {
    if (isSummary(pack)) {
      const next = Array.from({ length: CANVAS_SIZE }, () => null) as (Pack | null)[];
      next[0] = pack;
      setError("AI Executive Summary is standalone and cannot be combined with other report packs.");
      return next;
    }
    const hadSummary = current.some(isSummary);
    const next = current.map((item) => item?.id === pack.id || isSummary(item) ? null : item);
    const index = typeof target === "number" ? target : next.findIndex((item) => !item);
    if (index >= 0) next[index] = pack;
    setError(hadSummary ? "AI Executive Summary was removed because it is standalone. Other reports can now be combined." : "");
    return next;
  });

  const removePack = (index: number) => setSlots((current) => current.map((item, itemIndex) => itemIndex === index ? null : item));
  const dragStart = (event: DragEvent, pack: Pack) => event.dataTransfer.setData("text/report-pack", pack.id);
  const dropPack = (event: DragEvent, index: number) => { event.preventDefault(); const pack = PACKS.find((item) => item.id === event.dataTransfer.getData("text/report-pack")); if (pack) addPack(pack, index); };
  const applyTemplate = (templateIndex: number) => setSlots(() => Array.from({ length: CANVAS_SIZE }, (_, index) => PACKS.find((pack) => pack.id === TEMPLATES[templateIndex].packs[index]) || null));
  const clearCanvas = () => { setSlots(Array.from({ length: CANVAS_SIZE }, () => null)); setError(""); };

  const runPreview = async () => {
    if (!selected.length) return setError("Select at least one report pack before preview.");
    setError(""); setLoading("preview");
    try {
      const payload = await buildReport("preview", title, selectedBranch, range, selected);
      const html = buildBuilderReportHtml(payload, filters(range, selectedBranch), { preview: true, autoPrint: false });
      setPreview({ title: selected.length === 1 ? selected[0].title : title, html, count: selected.length });
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to preview report."); }
    finally { setLoading(null); }
  };

  const runGenerate = async () => {
    if (!selected.length) return setError("Select at least one report pack before generating.");
    setError(""); setLoading("generate");
    try {
      const payload = await buildReport("generate", title, selectedBranch, range, selected);
      downloadHtml(selected.length === 1 ? selected[0].title : title, payload, range, selectedBranch);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to generate report."); }
    finally { setLoading(null); }
  };

  return (
    <main className="builder-page">
      <style>{`
        html.ema-report-builder-active,body.ema-report-builder-active{height:auto!important;min-height:100%!important;overflow:auto!important}body.ema-report-builder-active .ema-shell,body.ema-report-builder-active .ema-main,body.ema-report-builder-active .ema-page{height:auto!important;max-height:none!important;overflow:visible!important}body.ema-report-builder-active .ema-page{padding:0!important}.builder-page{min-height:100vh;background:#f6f8fb;color:#0b2447}.builder-top{display:grid;grid-template-columns:1fr 210px 190px auto;gap:14px;align-items:end;padding:14px 18px;border-bottom:1px solid #dce7f5;background:#fff;position:sticky;top:0;z-index:20}.field{display:grid;gap:5px}.field span{font-size:10px;font-weight:950;color:#7a8ba8;text-transform:uppercase;letter-spacing:.12em}.field input,.field select{height:34px;border:1px solid #cfdced;border-radius:10px;background:#f9fbff;padding:6px 10px;font-weight:850}.actions{display:flex;gap:8px;justify-content:flex-end}.builder-btn{height:34px;border:1px solid #cfdced;border-radius:10px;background:#fff;padding:0 14px;font-weight:950}.builder-btn.primary{background:#4938ed;color:#fff;border-color:transparent}.builder-layout{display:grid;grid-template-columns:270px minmax(0,1fr)280px;gap:16px;padding:14px 18px 24px}.panel{background:#fff;border:1px solid #d8e4f4;border-radius:18px;overflow:hidden;box-shadow:0 12px 30px rgba(15,35,71,.045)}.head{padding:12px 14px;border-bottom:1px solid #e0e9f6;background:linear-gradient(135deg,#fff,#f4f8ff)}.head strong{display:block;font-size:12px;font-weight:950;letter-spacing:.11em;text-transform:uppercase}.head small{color:#6c7d97;font-weight:800}.tabs,.filters{display:grid;gap:8px;padding:10px}.tabs{grid-template-columns:1fr 1fr}.filters{grid-template-columns:repeat(3,1fr);padding-top:0}.tabs button,.filters button{height:30px;border:1px solid #d6e3f5;border-radius:10px;background:#fff;color:#59708f;font-size:10px;font-weight:950}.tabs button.active,.filters button.active{border-color:#2563eb;color:#2563eb;background:#eef5ff}.search{padding:0 10px 10px}.search input{width:100%;height:32px;border:1px solid #d6e3f5;border-radius:10px;padding:6px 10px}.pack-list{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 10px 12px}.pack{min-height:88px;border:1px solid #dce7f6;border-radius:14px;background:#fff;padding:9px;display:grid;place-items:center;gap:5px;text-align:center;cursor:grab}.pack:hover{border-color:var(--accent)}.pack.standalone{background:linear-gradient(180deg,#fff,#f3f7ff)}.ico{width:30px;height:30px;display:grid;place-items:center;border-radius:10px;color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,#fff);font-weight:950}.pack strong{font-size:10px;line-height:1.15}.pack small{font-size:9px;color:#7a8ba8;font-weight:850}.templates{display:grid;gap:8px;padding:10px}.canvas-wrap{padding-top:22px;display:grid;justify-content:center;align-content:start}.canvas-head{width:min(100%,760px);display:flex;justify-content:space-between;align-items:flex-end;margin:0 auto 14px}.canvas-head strong{font-size:18px}.canvas-head small{color:#7a8ba8;font-weight:800}.clear{border:0;background:transparent;color:#607493;font-weight:900}.canvas{width:min(100%,760px);display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.slot{min-height:148px;border:1px dashed #c7d6e9;border-radius:18px;background:rgba(255,255,255,.7);display:grid;place-items:center;color:#a1b1c8;text-align:center;position:relative;overflow:hidden}.slot-empty strong{display:block;font-size:24px}.slot-empty span{font-size:10px;font-weight:950;letter-spacing:.12em;text-transform:uppercase}.filled{width:100%;height:100%;border:1px solid #d8e4f4;border-radius:18px;background:#fff;padding:14px;text-align:left;display:grid;align-content:space-between;box-shadow:0 12px 24px rgba(15,35,71,.07)}.filled.standalone{border-color:#bcd4ff;background:linear-gradient(180deg,#fff,#f4f8ff)}.filled-top{display:flex;align-items:center;gap:10px}.filled h3{margin:6px 0 4px;font-size:13px}.filled p{margin:0;color:#6b7c96;font-size:11px;font-weight:800}.filled em{color:var(--accent);font-size:10px;font-weight:950;font-style:normal;text-transform:uppercase}.remove{position:absolute;top:10px;right:10px;border:0;background:transparent;color:#a9b7ca;font-size:18px}.summary{padding:12px;display:grid;gap:10px}.metric,.selected-pill{border:1px solid #dce7f6;border-radius:14px;background:#fff;padding:10px}.metric span{font-size:10px;font-weight:950;color:#6c7d97;text-transform:uppercase}.metric strong{display:block;margin-top:3px}.selected-pill{display:flex;gap:8px;align-items:center;font-size:11px;font-weight:900;margin-bottom:8px}.rule-note{border:1px solid #cfe0f6;border-radius:14px;background:#f8fbff;padding:10px;color:#45607f;font-size:11px;font-weight:850;line-height:1.35}.error{margin:12px 18px 0;border:1px solid rgba(239,68,68,.24);border-radius:14px;background:rgba(239,68,68,.08);color:#b91c1c;padding:12px 14px;font-weight:850}.backdrop{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:24px;background:rgba(15,23,42,.48);backdrop-filter:blur(8px)}.preview{width:min(1040px,100%);height:min(840px,calc(100vh - 48px));border-radius:24px;background:#eef3f8;overflow:hidden;box-shadow:0 34px 90px rgba(15,23,42,.32);display:grid;grid-template-rows:auto minmax(0,1fr)}.preview-head{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #d8e4f4;background:#fff}.preview-head strong{display:block}.preview-head small{color:#6c7d97;font-weight:800}.preview-frame{width:100%;height:100%;border:0;background:#eef3f8}@media(max-width:1320px){.builder-layout{grid-template-columns:250px minmax(0,1fr)}.right{grid-column:1/-1}}@media(max-width:980px){.builder-top{grid-template-columns:1fr 1fr}.builder-layout{grid-template-columns:1fr}.canvas{grid-template-columns:repeat(2,1fr)}}@media(max-width:620px){.builder-top{grid-template-columns:1fr}.pack-list,.canvas{grid-template-columns:1fr}}
      `}</style>
      <section className="builder-top">
        <label className="field"><span>Report Title</span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label className="field"><span>Location / Branch</span><select value={branchId} onChange={(event) => setBranchId(event.target.value)}>{branchOptions.map((branch) => <option key={branch.id} value={branch.id}>{branchLabel(branch)}</option>)}</select></label>
        <label className="field"><span>Date Range</span><select value={range.preset} onChange={(event) => setRange(rangeOf(event.target.value as Period))}>{PERIODS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <div className="actions"><button className="builder-btn" onClick={runPreview} disabled={Boolean(loading)}>{loading === "preview" ? "Loading..." : "Preview"}</button><button className="builder-btn primary" onClick={runGenerate} disabled={Boolean(loading)}>{loading === "generate" ? "Generating..." : "Generate Report"}</button></div>
      </section>
      {range.preset === "custom" && <section className="builder-top" style={{ position: "relative", top: "auto", zIndex: 1 }}><label className="field"><span>Date From</span><input type="date" value={range.from} onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))} /></label><label className="field"><span>Date To</span><input type="date" value={range.to} onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))} /></label></section>}
      {error && <div className="error">{error}</div>}
      <section className="builder-layout">
        <aside className="panel"><div className="head"><strong>Report Packs</strong><small>{standardCount} standard · {dynamicCount} AI dynamic reporting</small></div><div className="tabs"><button className={tab === "packs" ? "active" : ""} onClick={() => setTab("packs")}>Modules</button><button className={tab === "templates" ? "active" : ""} onClick={() => setTab("templates")}>Templates</button></div>{tab === "packs" ? <><div className="search"><input placeholder="Search report packs..." value={search} onChange={(event) => setSearch(event.target.value)} /></div><div className="filters"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button><button className={filter === "Standard" ? "active" : ""} onClick={() => setFilter("Standard")}>Standard</button><button className={filter === "Dynamic" ? "active" : ""} onClick={() => setFilter("Dynamic")}>AI Dynamic Reporting</button></div><div className="pack-list">{packs.map((pack) => <button key={pack.id} className={`pack ${isSummary(pack) ? "standalone" : ""}`} draggable onDragStart={(event) => dragStart(event, pack)} onClick={() => addPack(pack)} style={{ "--accent": pack.tone } as CSSProperties}><span className="ico">{pack.icon}</span><strong>{pack.title}</strong><small>{isSummary(pack) ? "Standalone report" : pack.dynamic ? "AI Dynamic Reporting" : pack.subtitle}</small></button>)}</div></> : <div className="templates">{TEMPLATES.map((template, index) => <button key={template.title} className="builder-btn" onClick={() => applyTemplate(index)}>{template.title}</button>)}</div>}</aside>
        <section className="canvas-wrap"><div className="canvas-head"><div><strong>Report Canvas</strong><small>{hasSummary ? "AI Executive Summary is standalone. Clear it to combine other reports." : "Drag report packs here to combine them into one management report."}</small></div><button className="clear" onClick={clearCanvas}>Clear Canvas</button></div><div className="canvas">{slots.map((slot, index) => <div key={index} className="slot" onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropPack(event, index)}>{slot ? <article className={`filled ${isSummary(slot) ? "standalone" : ""}`} style={{ "--accent": slot.tone } as CSSProperties}><button className="remove" onClick={() => removePack(index)}>×</button><div><div className="filled-top"><span className="ico">{slot.icon}</span><em>{isSummary(slot) ? "Standalone" : categoryLabel(slot)}</em></div><h3>{slot.title}</h3><p>{isSummary(slot) ? "This summary report cannot be combined with other reports." : slot.subtitle}</p></div><small>Canvas Slot {index + 1}</small></article> : <div className="slot-empty"><strong>+</strong><span>Drop Report</span></div>}</div>)}</div></section>
        <aside className="panel right"><div className="head"><strong>Build Summary</strong><small>{selected.length} selected report pack{selected.length === 1 ? "" : "s"}</small></div><div className="summary"><div className="metric"><span>Branch Scope</span><strong>{branchLabel(selectedBranch)}</strong></div><div className="metric"><span>Period</span><strong>{range.from} → {range.to}</strong></div><div className="metric"><span>Output</span><strong>{hasSummary ? "Standalone PDF" : selected.length > 1 ? "Combined PDF" : "Legacy PDF Design"}</strong></div><div className="rule-note">AI Executive Summary is standalone. Standard reports, Metering reports and AI Dynamic Reporting can be combined.</div>{selected.length ? selected.map((pack, index) => <div className="selected-pill" key={`${pack.id}-${index}`}><span className="ico" style={{ "--accent": pack.tone } as CSSProperties}>{pack.icon}</span>{index + 1}. {pack.title}</div>) : <div className="metric"><span>Status</span><strong>Canvas empty</strong></div>}</div></aside>
      </section>
      {preview && <div className="backdrop" onClick={(event) => event.target === event.currentTarget && setPreview(null)}><section className="preview"><div className="preview-head"><div><strong>{preview.title}</strong><small>{range.from} to {range.to} · {preview.count} pack{preview.count === 1 ? "" : "s"} · {branchLabel(selectedBranch)}</small></div><button className="builder-btn" onClick={() => setPreview(null)}>Close</button></div><iframe className="preview-frame" title={`${preview.title} preview`} srcDoc={preview.html} /></section></div>}
    </main>
  );
}
