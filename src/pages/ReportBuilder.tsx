import { CSSProperties, DragEvent, useEffect, useMemo, useState } from "react";
import { generateReport, previewReport } from "../services/reportService";
import { buildRegeneratedReportHtml } from "../utils/reportPdfCanvas";

type Category = "Standard" | "Dynamic";
type Period = "last-30-days" | "current-month" | "previous-month" | "this-quarter" | "custom";
type Pack = { id: string; title: string; subtitle: string; category: Category; tone: string; icon: string; dynamic?: boolean };
type Range = { preset: Period; from: string; to: string };

const PACKS: Pack[] = [
  { id: "ai-executive-summary", title: "AI Executive Summary", subtitle: "Executive management snapshot", category: "Standard", tone: "#2563eb", icon: "▥" },
  { id: "client-summary-rnr", title: "Client RNR Report", subtitle: "Client risk and resource view", category: "Standard", tone: "#0f766e", icon: "◈" },
  { id: "hardware-asset-lifecycle", title: "Hardware Lifecycle", subtitle: "Asset lifecycle and refresh planning", category: "Standard", tone: "#7c3aed", icon: "▧" },
  { id: "operations-health-sla", title: "Ops Health & SLA", subtitle: "Operations and SLA health", category: "Standard", tone: "#0284c7", icon: "▤" },
  { id: "security-compliance-exposure", title: "Security Exposure", subtitle: "Risk and compliance exposure", category: "Standard", tone: "#ef4444", icon: "!" },
  { id: "software-application-governance", title: "Software Governance", subtitle: "BSA and software governance", category: "Standard", tone: "#f59e0b", icon: "◇" },
  { id: "dynamic-compliance-report", title: "Compliance Report", subtitle: "AI compliance narrative", category: "Dynamic", tone: "#f59e0b", icon: "✓", dynamic: true },
  { id: "dynamic-cost-saving-report", title: "Cost Saving Report", subtitle: "AI savings and optimisation", category: "Dynamic", tone: "#10b981", icon: "↗", dynamic: true },
  { id: "dynamic-risk-management-report", title: "Risk Management Report", subtitle: "AI risk management analysis", category: "Dynamic", tone: "#ef4444", icon: "⚠", dynamic: true },
];

const TEMPLATES = [
  { title: "Ops + Risk Pack", packs: ["operations-health-sla", "security-compliance-exposure", "hardware-asset-lifecycle"] },
  { title: "Governance Pack", packs: ["software-application-governance", "dynamic-compliance-report", "dynamic-cost-saving-report"] },
];

function iso(date: Date) { return date.toISOString().slice(0, 10); }
function firstMonth(date = new Date()) { return iso(new Date(date.getFullYear(), date.getMonth(), 1)); }
function lastMonth(date = new Date()) { return iso(new Date(date.getFullYear(), date.getMonth() + 1, 0)); }
function rangeOf(preset: Period): Range {
  const now = new Date();
  if (preset === "last-30-days") { const start = new Date(now); start.setDate(now.getDate() - 29); return { preset, from: iso(start), to: iso(now) }; }
  if (preset === "previous-month") { const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1); return { preset, from: firstMonth(prev), to: lastMonth(prev) }; }
  if (preset === "this-quarter") { const startMonth = Math.floor(now.getMonth() / 3) * 3; return { preset, from: iso(new Date(now.getFullYear(), startMonth, 1)), to: iso(now) }; }
  return { preset: "current-month", from: firstMonth(now), to: iso(now) };
}

function unwrap(payload: any) { return payload?.data && typeof payload.data === "object" ? payload.data : payload; }
function text(value: any, fallback = "-") { return value === undefined || value === null || value === "" ? fallback : String(typeof value === "object" ? JSON.stringify(value) : value); }
function safeName(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "report"; }

function filters(range: Range, customer: string) {
  return { dateRange: range.preset, startDate: range.from, endDate: range.to, outputFormat: "PDF", relationID: 0, customer, includeSummary: true, includeChart: true, includeTable: true, includeRecommendation: true, deviceGroup: "all", status: "all" };
}

function requestPayload(title: string, customer: string, range: Range, pack: Pack) {
  return { ...filters(range, customer), reportId: pack.id, dynamicReportType: pack.dynamic ? pack.id : undefined, dynamicReportTitle: pack.dynamic ? pack.title : undefined, parentReportTitle: title };
}

function summaryFrom(payload: any, fallback: string) {
  const data = unwrap(payload) || {};
  const narrative = data.narrative || {};
  return text(narrative.executiveSummary || narrative.summary || narrative.managementConclusion || narrative.title || fallback, fallback);
}

function composePayload(title: string, range: Range, packs: Pack[], responses: any[]) {
  const payloads = responses.map((item) => unwrap(item) || {});
  const sections: any[] = [];
  const recommendations: any[] = [];
  const findings: string[] = [];
  const metrics: Record<string, any> = {};

  payloads.forEach((payload, index) => {
    const pack = packs[index];
    const summary = summaryFrom(payload, pack.subtitle);
    const packFindings = Array.isArray(payload?.narrative?.keyFindings) ? payload.narrative.keyFindings : [];
    (packFindings.length ? packFindings : [summary]).forEach((item: any) => findings.push(`${pack.title}: ${text(item, summary)}`));
    if (payload?.metrics && typeof payload.metrics === "object") Object.assign(metrics, payload.metrics);
    const packSections = Array.isArray(payload?.sections) ? payload.sections : [];
    if (!packSections.length) sections.push({ title: pack.title, type: "table", rows: [{ Report: pack.title, Summary: summary }] });
    packSections.forEach((section: any) => sections.push({ ...section, title: `${pack.title} · ${text(section?.title || section?.type, "Report Details")}`, rows: Array.isArray(section?.rows) ? section.rows : [] }));
    const packActions = Array.isArray(payload?.recommendations) ? payload.recommendations : [];
    if (packActions.length) packActions.forEach((row: any) => recommendations.push({ ...row, area: row.area || pack.title }));
  });

  return {
    report: { id: "report-pack-builder", title, category: "Management Report Pack", type: "Dynamic Report Builder", description: "Combined report generated from the selected report canvas packs." },
    generatedAt: new Date().toISOString(),
    dateRange: { from: range.from, to: range.to, preset: range.preset },
    narrative: { title, period: `${range.from} to ${range.to}`, scope: "All Sites", executiveSummary: packs.map((pack, i) => `${i + 1}. ${pack.title}: ${summaryFrom(payloads[i], pack.subtitle)}`).join("\n\n"), managementConclusion: `${packs.length} report pack${packs.length === 1 ? "" : "s"} combined in the report canvas.`, keyFindings: findings.slice(0, 18) },
    metrics,
    sections,
    recommendations: recommendations.length ? recommendations : packs.map((pack) => ({ priority: "Review", action: `Review ${pack.title} findings and assign owner.`, owner: "Management Team" })),
    builderPacks: packs.map((pack, index) => ({ order: index + 1, id: pack.id, title: pack.title, category: pack.category })),
  };
}

async function buildReport(mode: "preview" | "generate", title: string, customer: string, range: Range, packs: Pack[]) {
  const service = mode === "generate" ? generateReport : previewReport;
  const responses: any[] = [];
  for (const pack of packs) responses.push(await service(requestPayload(title, customer, range, pack)));
  return composePayload(title, range, packs, responses);
}

function downloadHtml(title: string, payload: any, range: Range, customer: string) {
  const html = buildRegeneratedReportHtml(payload, filters(range, customer));
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

export default function ReportBuilder() {
  const [title, setTitle] = useState("Management Report Pack");
  const [customer, setCustomer] = useState("all");
  const [range, setRange] = useState<Range>(() => rangeOf("last-30-days"));
  const [slots, setSlots] = useState<(Pack | null)[]>(() => Array.from({ length: 6 }, () => null));
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"packs" | "templates">("packs");
  const [filter, setFilter] = useState<"all" | Category>("all");
  const [loading, setLoading] = useState<"preview" | "generate" | null>(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ title: string; html: string; count: number } | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("ema-report-builder-active");
    document.body.classList.add("ema-report-builder-active");
    return () => { document.documentElement.classList.remove("ema-report-builder-active"); document.body.classList.remove("ema-report-builder-active"); };
  }, []);

  const selected = useMemo(() => slots.filter(Boolean) as Pack[], [slots]);
  const packs = useMemo(() => PACKS.filter((pack) => (filter === "all" || pack.category === filter) && `${pack.title} ${pack.subtitle}`.toLowerCase().includes(search.toLowerCase())), [filter, search]);

  const addPack = (pack: Pack, target?: number) => setSlots((current) => {
    const next = current.map((item) => item?.id === pack.id ? null : item);
    const index = typeof target === "number" ? target : next.findIndex((item) => !item);
    if (index >= 0) next[index] = pack;
    return next;
  });
  const removePack = (index: number) => setSlots((current) => current.map((item, itemIndex) => itemIndex === index ? null : item));
  const dragStart = (event: DragEvent, pack: Pack) => event.dataTransfer.setData("text/report-pack", pack.id);
  const dropPack = (event: DragEvent, index: number) => { event.preventDefault(); const pack = PACKS.find((item) => item.id === event.dataTransfer.getData("text/report-pack")); if (pack) addPack(pack, index); };
  const applyTemplate = (templateIndex: number) => setSlots(() => Array.from({ length: 6 }, (_, index) => PACKS.find((pack) => pack.id === TEMPLATES[templateIndex].packs[index]) || null));

  const runPreview = async () => {
    if (!selected.length) return setError("Select at least one report pack before preview.");
    setError(""); setLoading("preview");
    try { const payload = await buildReport("preview", title, customer, range, selected); setPreview({ title, html: buildRegeneratedReportHtml(payload, filters(range, customer)), count: selected.length }); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to preview report."); }
    finally { setLoading(null); }
  };
  const runGenerate = async () => {
    if (!selected.length) return setError("Select at least one report pack before generating.");
    setError(""); setLoading("generate");
    try { const payload = await buildReport("generate", title, customer, range, selected); downloadHtml(title, payload, range, customer); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to generate report."); }
    finally { setLoading(null); }
  };

  return (
    <main className="builder-page">
      <style>{`
        html.ema-report-builder-active, body.ema-report-builder-active { height:auto!important; min-height:100%!important; overflow:auto!important; }
        body.ema-report-builder-active .ema-shell, body.ema-report-builder-active .ema-main, body.ema-report-builder-active .ema-page { height:auto!important; max-height:none!important; overflow:visible!important; }
        body.ema-report-builder-active .ema-page { padding:0!important; }
        .builder-page{min-height:100vh;background:#f6f8fb;color:#0b2447}.builder-top{display:grid;grid-template-columns:1fr 160px 190px auto;gap:14px;align-items:end;padding:14px 18px;border-bottom:1px solid #dce7f5;background:#fff;position:sticky;top:0;z-index:20}.field{display:grid;gap:5px}.field span{font-size:10px;font-weight:950;color:#7a8ba8;text-transform:uppercase;letter-spacing:.12em}.field input,.field select{height:34px;border:1px solid #cfdced;border-radius:10px;background:#f9fbff;padding:6px 10px;font-weight:850}.actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}.btn{height:34px;border:1px solid #cfdced;border-radius:10px;background:#fff;padding:0 14px;font-weight:950}.btn.primary{background:#4938ed;color:white;border-color:transparent}.btn.green{background:#eafff4;color:#047857;border-color:#b7efd4}.builder-layout{display:grid;grid-template-columns:260px minmax(0,1fr)280px;gap:16px;padding:14px 18px 24px}.panel{background:#fff;border:1px solid #d8e4f4;border-radius:18px;overflow:hidden;box-shadow:0 12px 30px rgba(15,35,71,.045)}.head{padding:12px 14px;border-bottom:1px solid #e0e9f6;background:linear-gradient(135deg,#fff,#f4f8ff)}.head strong{display:block;font-size:12px;font-weight:950;letter-spacing:.11em;text-transform:uppercase}.head small{color:#6c7d97;font-weight:800}.tabs,.filters{display:grid;gap:8px;padding:10px}.tabs{grid-template-columns:1fr 1fr}.filters{grid-template-columns:repeat(3,1fr);padding-top:0}.tabs button,.filters button{height:30px;border:1px solid #d6e3f5;border-radius:10px;background:#fff;color:#59708f;font-size:10px;font-weight:950}.tabs button.active,.filters button.active{border-color:#2563eb;color:#2563eb;background:#eef5ff}.search{padding:0 10px 10px}.search input{width:100%;height:32px;border:1px solid #d6e3f5;border-radius:10px;padding:6px 10px}.pack-list{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 10px 12px}.pack{min-height:86px;border:1px solid #dce7f6;border-radius:14px;background:#fff;padding:9px;display:grid;place-items:center;gap:5px;text-align:center;cursor:grab}.pack:hover{border-color:var(--accent)}.ico{width:30px;height:30px;display:grid;place-items:center;border-radius:10px;color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,#fff);font-weight:950}.pack strong{font-size:10px;line-height:1.15}.pack small{font-size:9px;color:#7a8ba8;font-weight:850}.templates{display:grid;gap:8px;padding:10px}.canvas-wrap{padding-top:22px;display:grid;justify-content:center;align-content:start}.canvas-head{width:min(100%,760px);display:flex;justify-content:space-between;align-items:flex-end;margin:0 auto 14px}.canvas-head strong{font-size:18px}.canvas-head small{color:#7a8ba8;font-weight:800}.clear{border:0;background:transparent;color:#607493;font-weight:900}.canvas{width:min(100%,760px);display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.slot{min-height:148px;border:1px dashed #c7d6e9;border-radius:18px;background:rgba(255,255,255,.7);display:grid;place-items:center;color:#a1b1c8;text-align:center;position:relative;overflow:hidden}.slot-empty strong{display:block;font-size:24px}.slot-empty span{font-size:10px;font-weight:950;letter-spacing:.12em;text-transform:uppercase}.filled{width:100%;height:100%;border:1px solid #d8e4f4;border-radius:18px;background:#fff;padding:14px;text-align:left;display:grid;align-content:space-between;box-shadow:0 12px 24px rgba(15,35,71,.07)}.filled-top{display:flex;align-items:center;gap:10px}.filled h3{margin:6px 0 4px;font-size:13px}.filled p{margin:0;color:#6b7c96;font-size:11px;font-weight:800}.filled em{color:var(--accent);font-size:10px;font-weight:950;font-style:normal;text-transform:uppercase}.remove{position:absolute;top:10px;right:10px;border:0;background:transparent;color:#a9b7ca;font-size:18px}.summary{padding:12px;display:grid;gap:10px}.metric,.selected-pill{border:1px solid #dce7f6;border-radius:14px;background:#fff;padding:10px}.metric span{font-size:10px;font-weight:950;color:#6c7d97;text-transform:uppercase}.metric strong{display:block;margin-top:3px}.selected-pill{display:flex;gap:8px;align-items:center;font-size:11px;font-weight:900;margin-bottom:8px}.error{margin:12px 18px 0;border:1px solid rgba(239,68,68,.24);border-radius:14px;background:rgba(239,68,68,.08);color:#b91c1c;padding:12px 14px;font-weight:850}.backdrop{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:24px;background:rgba(15,23,42,.48);backdrop-filter:blur(8px)}.preview{width:min(1040px,100%);height:min(840px,calc(100vh - 48px));border-radius:24px;background:#eef3f8;overflow:hidden;box-shadow:0 34px 90px rgba(15,23,42,.32);display:grid;grid-template-rows:auto minmax(0,1fr)}.preview-head{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #d8e4f4;background:#fff}.preview-head strong{display:block}.preview-head small{color:#6c7d97;font-weight:800}.preview-frame{width:100%;height:100%;border:0;background:#eef3f8}@media(max-width:1320px){.builder-layout{grid-template-columns:240px minmax(0,1fr)}.right{grid-column:1/-1}}@media(max-width:980px){.builder-top{grid-template-columns:1fr 1fr}.builder-layout{grid-template-columns:1fr}.canvas{grid-template-columns:repeat(2,1fr)}}@media(max-width:620px){.builder-top{grid-template-columns:1fr}.pack-list,.canvas{grid-template-columns:1fr}}
      `}</style>
      <section className="builder-top">
        <label className="field"><span>Report Title</span><input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label className="field"><span>Customer</span><select value={customer} onChange={(e) => setCustomer(e.target.value)}><option value="all">All Customers</option><option value="selected">Selected Customer</option></select></label>
        <label className="field"><span>Date Range</span><select value={range.preset} onChange={(e) => setRange(rangeOf(e.target.value as Period))}>{["last-30-days","current-month","previous-month","this-quarter","custom"].map((item) => <option key={item} value={item}>{item.replace(/-/g," ").replace(/\b\w/g,(c)=>c.toUpperCase())}</option>)}</select></label>
        <div className="actions"><button className="btn">History</button><button className="btn green">Save Template</button><button className="btn" onClick={runPreview} disabled={Boolean(loading)}>{loading === "preview" ? "Loading..." : "Preview"}</button><button className="btn primary" onClick={runGenerate} disabled={Boolean(loading)}>{loading === "generate" ? "Generating..." : "Generate Report"}</button></div>
      </section>
      {range.preset === "custom" && <section className="builder-top" style={{ position: "relative", top: "auto", zIndex: 1 }}><label className="field"><span>Date From</span><input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} /></label><label className="field"><span>Date To</span><input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} /></label></section>}
      {error && <div className="error">{error}</div>}
      <section className="builder-layout">
        <aside className="panel"><div className="head"><strong>Report Packs</strong><small>6 standard · 3 dynamic</small></div><div className="tabs"><button className={tab === "packs" ? "active" : ""} onClick={() => setTab("packs")}>Modules</button><button className={tab === "templates" ? "active" : ""} onClick={() => setTab("templates")}>Templates</button></div>{tab === "packs" ? <><div className="search"><input placeholder="Search report packs..." value={search} onChange={(e) => setSearch(e.target.value)} /></div><div className="filters"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button><button className={filter === "Standard" ? "active" : ""} onClick={() => setFilter("Standard")}>Standard</button><button className={filter === "Dynamic" ? "active" : ""} onClick={() => setFilter("Dynamic")}>Dynamic</button></div><div className="pack-list">{packs.map((pack) => <button key={pack.id} className="pack" draggable onDragStart={(e) => dragStart(e, pack)} onClick={() => addPack(pack)} style={{ "--accent": pack.tone } as CSSProperties}><span className="ico">{pack.icon}</span><strong>{pack.title}</strong><small>{pack.subtitle}</small></button>)}</div></> : <div className="templates">{TEMPLATES.map((template, i) => <button key={template.title} className="btn" onClick={() => applyTemplate(i)}>{template.title}</button>)}</div>}</aside>
        <section className="canvas-wrap"><div className="canvas-head"><div><strong>Report Canvas</strong><small>Drag report packs here to build one combined management report.</small></div><button className="clear" onClick={() => setSlots(Array.from({ length: 6 }, () => null))}>Clear Canvas</button></div><div className="canvas">{slots.map((slot, index) => <div key={index} className="slot" onDragOver={(e) => e.preventDefault()} onDrop={(e) => dropPack(e, index)}>{slot ? <article className="filled" style={{ "--accent": slot.tone } as CSSProperties}><button className="remove" onClick={() => removePack(index)}>×</button><div><div className="filled-top"><span className="ico">{slot.icon}</span><em>{slot.category}</em></div><h3>{slot.title}</h3><p>{slot.subtitle}</p></div><small>Canvas Slot {index + 1}</small></article> : <div className="slot-empty"><strong>+</strong><span>Drop Report</span></div>}</div>)}</div></section>
        <aside className="panel right"><div className="head"><strong>Build Summary</strong><small>{selected.length} selected report pack{selected.length === 1 ? "" : "s"}</small></div><div className="summary"><div className="metric"><span>Period</span><strong>{range.from} → {range.to}</strong></div><div className="metric"><span>Output</span><strong>PDF Design</strong></div>{selected.length ? selected.map((pack, index) => <div className="selected-pill" key={`${pack.id}-${index}`}><span className="ico" style={{ "--accent": pack.tone } as CSSProperties}>{pack.icon}</span>{index + 1}. {pack.title}</div>) : <div className="metric"><span>Status</span><strong>Canvas empty</strong></div>}</div></aside>
      </section>
      {preview && <div className="backdrop" onClick={(e) => e.target === e.currentTarget && setPreview(null)}><section className="preview"><div className="preview-head"><div><strong>{preview.title}</strong><small>{range.from} to {range.to} · {preview.count} pack{preview.count === 1 ? "" : "s"}</small></div><button className="btn" onClick={() => setPreview(null)}>Close</button></div><iframe className="preview-frame" title={`${preview.title} preview`} srcDoc={preview.html} /></section></div>}
    </main>
  );
}
