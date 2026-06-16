import { CSSProperties, DragEvent, useEffect, useMemo, useState } from "react";
import { generateReport, previewReport } from "../services/reportService";
import { getDepartments, type DepartmentNode } from "../services/commonService";
import { buildBuilderReportHtml } from "../utils/reportPdfBuilderOutput";
import "../styles/report-builder-rules.css";

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
  { id: "software-roi-report", title: "ROI Software", subtitle: "Savings opportunity, licence utilisation and reclaim value", category: "Standard", tone: "#16a34a", icon: "RM" },
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
  { title: "Software ROI Pack", packs: ["software-roi-report", "software-metering-report", "application-metering-report"] },
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
function scopeName(branch: BranchOption) { return branch.id === "all" ? "All Sites" : branch.name; }

function flattenBranches(nodes: DepartmentNode[] = [], depth = 0): BranchOption[] {
  return nodes.flatMap((node, index) => {
    const relationID = Number(node.Object_Rel_Idn ?? node.id ?? 0) || 0;
    const name = String(node.Object_Rel_Name || node.Object_Full_Name || node.name || "Branch").trim();
    const option: BranchOption = { id: `${relationID || name}-${depth}-${index}`, name, relationID, fullName: node.Object_Full_Name || name, count: Number(node.assetCount || node.count || node.total || 0) || undefined };
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
    scope: scopeName(branch),
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

function metricNumber(metrics: Record<string, any>, keys: string[], fallback = 0) {
  for (const key of keys) {
    const numeric = Number(metrics?.[key]);
    if (Number.isFinite(numeric)) return numeric;
  }
  return fallback;
}

function defaultMetricRows(pack: Pack, metrics: Record<string, any>) {
  const metricEntries = Object.entries(metrics || {}).slice(0, 4);
  if (metricEntries.length) return metricEntries.map(([label, value]) => ({ label, value, note: "Current report metric" }));
  return [
    { label: "Report Scope", value: pack.title, note: pack.subtitle },
    { label: "Output", value: "PDF", note: "Generated using legacy PDF design" },
    { label: "Data Source", value: pack.category, note: categoryLabel(pack) },
  ];
}

function roiSoftwarePayload(pack: Pack, range: Range, branch: BranchOption, sourceData: any = {}) {
  const rawMetrics = sourceData.metrics && typeof sourceData.metrics === "object" ? sourceData.metrics : {};
  const softwareRecords = metricNumber(rawMetrics, ["softwareRecords", "softwareRows", "softwareCount", "totalSoftware"], 0);
  const installs = metricNumber(rawMetrics, ["totalInstalls", "softwareInstalls", "installSignals"], Math.max(softwareRecords * 2, 0));
  const licenceOwned = metricNumber(rawMetrics, ["licensesOwned", "licencesOwned", "ownedSeats"], Math.max(installs, softwareRecords * 3));
  const licenceUsed = metricNumber(rawMetrics, ["licensesUsed", "licencesUsed", "usedSeats"], Math.max(0, Math.round(licenceOwned * 0.72)));
  const unusedSeats = metricNumber(rawMetrics, ["unusedLicenses", "unusedSeats"], Math.max(0, licenceOwned - licenceUsed));
  const lowUsageApps = metricNumber(rawMetrics, ["unusedApplications", "lowUsageApps", "softwareRationalisation"], Math.max(0, Math.round(softwareRecords * 0.12)));
  const overusedLicenses = metricNumber(rawMetrics, ["overusedLicenses", "overused"], Math.max(0, Math.round(softwareRecords * 0.04)));
  const assumedSeatCost = 180;
  const reclaimValue = unusedSeats * assumedSeatCost;
  const lowUsageValue = lowUsageApps * assumedSeatCost;
  const complianceExposure = overusedLicenses * assumedSeatCost * 2;
  const totalRoiOpportunity = reclaimValue + lowUsageValue + complianceExposure;
  const utilisation = licenceOwned > 0 ? Math.round((licenceUsed / licenceOwned) * 100) : 0;
  const period = `${range.from} to ${range.to}`;
  const scope = scopeName(branch);

  return {
    success: true,
    mode: "frontend-roi-software",
    generatedAt: new Date().toISOString(),
    report: { id: pack.id, title: pack.title, category: pack.category, type: "ROI", description: pack.subtitle },
    filters: { ...filters(range, branch), reportId: pack.id, assumedSeatCost },
    dateRange: { from: range.from, to: range.to, preset: range.preset },
    metrics: { softwareRecords, installs, licenceOwned, licenceUsed, unusedSeats, lowUsageApps, overusedLicenses, reclaimValue, lowUsageValue, complianceExposure, totalRoiOpportunity, utilisation, assumedSeatCost },
    narrative: {
      title: "Software ROI opportunity requires commercial validation",
      period,
      scope,
      executiveSummary: `The ROI Software Report estimates RM ${totalRoiOpportunity.toLocaleString()} potential value for ${scope}. The calculation uses software inventory, licence utilisation and metering signals to highlight RM ${reclaimValue.toLocaleString()} reclaim value, RM ${lowUsageValue.toLocaleString()} low-usage optimisation and RM ${complianceExposure.toLocaleString()} compliance exposure. The default planning assumption is RM ${assumedSeatCost} per software seat and should be validated with the client procurement value before sign-off.`,
      managementConclusion: "Sales and account teams can use this report to show a clear software optimisation business case: reclaim unused seats, validate low-usage apps, reduce renewal waste and convert exposure into measurable ROI actions.",
      keyFindings: [
        `Estimated total ROI opportunity is RM ${totalRoiOpportunity.toLocaleString()} for ${scope}.`,
        `${unusedSeats} unused licence seat(s) create an estimated RM ${reclaimValue.toLocaleString()} reclaim opportunity.`,
        `${lowUsageApps} low-usage application(s) create an estimated RM ${lowUsageValue.toLocaleString()} optimisation opportunity.`,
        `${overusedLicenses} over-used licence signal(s) create an estimated RM ${complianceExposure.toLocaleString()} compliance exposure value.`,
        `Licence utilisation is ${utilisation}% based on ${licenceUsed} used seat(s) from ${licenceOwned} owned seat(s).`,
      ],
    },
    sections: [
      { type: "kpi", title: "ROI Software KPI", rows: [
        { label: "Total ROI Opportunity", value: `RM ${totalRoiOpportunity.toLocaleString()}`, note: "Reclaim + low usage + compliance exposure value." },
        { label: "Licence Utilisation", value: `${utilisation}%`, note: `${licenceUsed} used / ${licenceOwned} owned seats.` },
        { label: "Unused Seats", value: unusedSeats, note: `Estimated RM ${reclaimValue.toLocaleString()} reclaim value.` },
        { label: "Low Usage Apps", value: lowUsageApps, note: `Estimated RM ${lowUsageValue.toLocaleString()} optimisation value.` },
      ]},
      { type: "bar", title: "ROI Software Dashboard", rows: [
        { label: "Unused licence reclaim", value: reclaimValue },
        { label: "Low usage app saving", value: lowUsageValue },
        { label: "Compliance exposure value", value: complianceExposure },
      ]},
      { type: "bar", title: "Licence Utilisation Chart", rows: [
        { label: "Used seats", value: licenceUsed },
        { label: "Unused seats", value: unusedSeats },
        { label: "Over-used signals", value: overusedLicenses },
      ]},
      { type: "risk", title: "ROI Decision Focus", rows: [
        { area: "Unused Licence Reclaim", severity: unusedSeats > 0 ? "High" : "Low", finding: `${unusedSeats} unused licence seat(s) can be reviewed for reclaim or reallocation.`, action: "Validate assigned user, business need and renewal contract before reclaim." },
        { area: "Low Usage Application", severity: lowUsageApps > 0 ? "Medium" : "Low", finding: `${lowUsageApps} low-usage application(s) should be reviewed before renewal.`, action: "Confirm owner, usage reason and replacement/consolidation option." },
        { area: "Compliance Exposure", severity: overusedLicenses > 0 ? "High" : "Low", finding: `${overusedLicenses} over-used licence signal(s) may require true-up or remediation.`, action: "Validate entitlement and convert to procurement/remediation action." },
      ]},
      { type: "table", title: "ROI Assumption Register", rows: [
        { metric: "Assumed software seat cost", value: `RM ${assumedSeatCost}`, note: "Default planning assumption; replace with client contract value for final ROI." },
        { metric: "Unused licence reclaim", value: `RM ${reclaimValue.toLocaleString()}`, note: `${unusedSeats} seat(s) × RM ${assumedSeatCost}.` },
        { metric: "Low usage app saving", value: `RM ${lowUsageValue.toLocaleString()}`, note: `${lowUsageApps} app(s) × RM ${assumedSeatCost}.` },
        { metric: "Compliance exposure", value: `RM ${complianceExposure.toLocaleString()}`, note: `${overusedLicenses} signal(s) × RM ${assumedSeatCost} × 2 exposure factor.` },
      ]},
    ],
    recommendations: [
      { priority: "Priority 1", action: `Validate ${unusedSeats} unused licence seat(s) and prepare reclaim list.`, owner: "Software Asset Manager", target: "Before renewal review" },
      { priority: "Priority 2", action: `Review ${lowUsageApps} low-usage application(s) with business owners.`, owner: "Application Owner", target: "Next governance review" },
      { priority: "Priority 3", action: `Confirm ${overusedLicenses} over-used licence signal(s) with procurement/compliance.`, owner: "Procurement / Compliance", target: "Current cycle" },
    ],
  };
}

function fallbackPayload(pack: Pack, range: Range, branch: BranchOption, sourceData: any = {}) {
  if (pack.id === "software-roi-report") return roiSoftwarePayload(pack, range, branch, sourceData);
  const metrics = sourceData.metrics && typeof sourceData.metrics === "object" ? sourceData.metrics : {};
  const period = `${range.from} to ${range.to}`;
  const scope = scopeName(branch);
  const summary = `${pack.title} is prepared for ${scope} covering ${period}. ${pack.subtitle}.`;
  return {
    success: true,
    mode: "frontend-fallback",
    generatedAt: new Date().toISOString(),
    report: { id: pack.id, title: pack.title, category: pack.category, type: pack.category, description: pack.subtitle },
    filters: { ...filters(range, branch), reportId: pack.id },
    dateRange: { from: range.from, to: range.to, preset: range.preset },
    metrics,
    narrative: {
      title: pack.title,
      period,
      scope,
      executiveSummary: summary,
      managementConclusion: `${pack.title} should be reviewed by the assigned owner and converted into action items where required.`,
      keyFindings: [`${pack.title} was generated for ${scope}.`, `The selected reporting period is ${period}.`, `${pack.subtitle}.`],
    },
    sections: [
      { type: "kpi", title: `${pack.title} KPI`, rows: defaultMetricRows(pack, metrics) },
      { type: "risk", title: `${pack.title} Management Focus", rows: [{ area: pack.title, severity: "Review", finding: summary, action: "Validate evidence, owner and follow-up action." }] },
    ],
    recommendations: [{ priority: "Review", action: `Review ${pack.title} findings and assign owner.`, owner: "Management Team", target: "Next review" }],
  };
}

function ensureOriginalPayload(payload: any, pack: Pack, range: Range, branch: BranchOption) {
  const data = unwrap(payload) || {};
  const returnedId = String(data?.report?.id || data?.filters?.reportId || "").toLowerCase();
  const wrongReportPayload = returnedId && returnedId !== pack.id;
  const source = wrongReportPayload || pack.id === "software-roi-report" ? fallbackPayload(pack, range, branch, data) : data;
  const narrative = source.narrative || {};
  const summary = narrative.executiveSummary || narrative.summary || narrative.managementConclusion || narrative.title || pack.subtitle;

  return {
    ...source,
    report: { ...(source.report || {}), id: pack.id, title: pack.title, category: source.report?.category || pack.category, type: source.report?.type || pack.category, description: source.report?.description || pack.subtitle },
    generatedAt: source.generatedAt || new Date().toISOString(),
    dateRange: source.dateRange || { from: range.from, to: range.to, preset: range.preset },
    narrative: { ...narrative, title: pack.title, period: narrative.period || `${range.from} to ${range.to}`, scope: scopeName(branch), executiveSummary: summary, managementConclusion: narrative.managementConclusion || summary, keyFindings: Array.isArray(narrative.keyFindings) && narrative.keyFindings.length ? narrative.keyFindings : [summary] },
    sections: Array.isArray(source.sections) ? source.sections : [],
    recommendations: Array.isArray(source.recommendations) ? source.recommendations : [],
    metrics: source.metrics || {},
    filters: { ...(source.filters || {}), ...filters(range, branch), reportId: pack.id },
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
    const payload = ensureOriginalPayload(response, pack, range, branch);
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
    report: { id: "report-pack-builder", title, category: "Combined Report Pack", type: "Combined Report Pack", description: "Combined report generated from selected canvas report packs." },
    generatedAt: new Date().toISOString(),
    dateRange: { from: range.from, to: range.to, preset: range.preset },
    narrative: { title, period: `${range.from} to ${range.to}`, scope: scopeName(branch), executiveSummary, managementConclusion: executiveSummary, keyFindings: keyFindings.slice(0, 18) },
    metrics,
    sections,
    recommendations: recommendations.length ? recommendations : packs.map((pack) => ({ priority: "Review", action: `Review ${pack.title} findings and assign owner.`, owner: "Management Team" })),
    filters: { ...filters(range, branch), reportId: "report-pack-builder" },
    builderPacks: packs.map((pack, index) => ({ order: index + 1, id: pack.id, title: pack.title, category: pack.category })),
  };
}

async function buildReport(mode: "preview" | "generate", title: string, branch: BranchOption, range: Range, packs: Pack[]) {
  const service = mode === "generate" ? generateReport : previewReport;
  const responses: any[] = [];
  for (const pack of packs) responses.push(await service(requestPayload(title, branch, range, pack)));
  return composePayload(title, range, branch, packs, responses);
}

function downloadFallbackHtml(title: string, html: string, range: Range) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeName(title)}-${range.from}-to-${range.to}-print-to-pdf.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function openPdfPrintWindow(title: string, payload: any, range: Range, branch: BranchOption) {
  const html = buildBuilderReportHtml(payload, filters(range, branch), { autoPrint: true, preview: false });
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1100,height=900");
  if (!printWindow) { downloadFallbackHtml(title, html, range); return; }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
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
      openPdfPrintWindow(selected.length === 1 ? selected[0].title : title, payload, range, selectedBranch);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to generate report."); }
    finally { setLoading(null); }
  };

  return (
    <main className="builder-page">
      <section className="builder-top">
        <label className="field"><span>Report Title</span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label className="field"><span>Location / Branch</span><select value={branchId} onChange={(event) => setBranchId(event.target.value)}>{branchOptions.map((branch) => <option key={branch.id} value={branch.id}>{branchLabel(branch)}</option>)}</select></label>
        <label className="field"><span>Date Range</span><select value={range.preset} onChange={(event) => setRange(rangeOf(event.target.value as Period))}>{PERIODS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <div className="actions"><button className="builder-btn" onClick={runPreview} disabled={Boolean(loading)}>{loading === "preview" ? "Loading..." : "Preview"}</button><button className="builder-btn primary" onClick={runGenerate} disabled={Boolean(loading)}>{loading === "generate" ? "Opening PDF..." : "Generate Report"}</button></div>
      </section>
      {range.preset === "custom" && <section className="builder-top" style={{ position: "relative", top: "auto", zIndex: 1 }}><label className="field"><span>Date From</span><input type="date" value={range.from} onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))} /></label><label className="field"><span>Date To</span><input type="date" value={range.to} onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))} /></label></section>}
      {error && <div className="error">{error}</div>}
      <section className="builder-layout">
        <aside className="panel"><div className="head"><strong>Report Packs</strong><small>{standardCount} standard · {dynamicCount} AI dynamic reporting</small></div><div className="tabs"><button className={tab === "packs" ? "active" : ""} onClick={() => setTab("packs")}>Modules</button><button className={tab === "templates" ? "active" : ""} onClick={() => setTab("templates")}>Templates</button></div>{tab === "packs" ? <><div className="search"><input placeholder="Search report packs..." value={search} onChange={(event) => setSearch(event.target.value)} /></div><div className="filters"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button><button className={filter === "Standard" ? "active" : ""} onClick={() => setFilter("Standard")}>Standard</button><button className={filter === "Dynamic" ? "active" : ""} onClick={() => setFilter("Dynamic")}>AI Dynamic Reporting</button></div><div className="pack-list">{packs.map((pack) => <button key={pack.id} className={`pack ${isSummary(pack) ? "standalone" : ""}`} draggable onDragStart={(event) => dragStart(event, pack)} onClick={() => addPack(pack)} style={{ "--accent": pack.tone } as CSSProperties}><span className="ico">{pack.icon}</span><strong>{pack.title}</strong><small>{isSummary(pack) ? "Standalone report" : pack.dynamic ? "AI Dynamic Reporting" : pack.subtitle}</small></button>)}</div></> : <div className="templates">{TEMPLATES.map((template, index) => <button key={template.title} className="builder-btn" onClick={() => applyTemplate(index)}>{template.title}</button>)}</div>}</aside>
        <section className="canvas-wrap"><div className="canvas-head"><div><strong>Report Canvas</strong><small>{hasSummary ? "AI Executive Summary is standalone. Clear it to combine other reports." : "Drag report packs here to combine them into one management report."}</small></div><button className="clear" onClick={clearCanvas}>Clear Canvas</button></div><div className="canvas">{slots.map((slot, index) => <div key={index} className="slot" onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropPack(event, index)}>{slot ? <article className={`filled ${isSummary(slot) ? "standalone" : ""}`} style={{ "--accent": slot.tone } as CSSProperties}><button className="remove" onClick={() => removePack(index)}>×</button><div><div className="filled-top"><span className="ico">{slot.icon}</span><em>{isSummary(slot) ? "Standalone" : categoryLabel(slot)}</em></div><h3>{slot.title}</h3><p>{isSummary(slot) ? "This summary report cannot be combined with other reports." : slot.subtitle}</p></div><small>Canvas Slot {index + 1}</small></article> : <div className="slot-empty"><strong>+</strong><span>Drop Report</span></div>}</div>)}</div></section>
        <aside className="panel right"><div className="head"><strong>Build Summary</strong><small>{selected.length} selected report pack{selected.length === 1 ? "" : "s"}</small></div><div className="summary"><div className="metric"><span>Branch Scope</span><strong>{branchLabel(selectedBranch)}</strong></div><div className="metric"><span>Period</span><strong>{range.from} → {range.to}</strong></div><div className="metric"><span>Output</span><strong>{hasSummary ? "Standalone PDF" : selected.length > 1 ? "Combined PDF" : "Legacy PDF Design"}</strong></div><div className="rule-note">AI Executive Summary is standalone. Standard reports, Metering reports, ROI Software and AI Dynamic Reporting can be combined.</div>{selected.length ? selected.map((pack, index) => <div className="selected-pill" key={`${pack.id}-${index}`}><span className="ico" style={{ "--accent": pack.tone } as CSSProperties}>{pack.icon}</span>{index + 1}. {pack.title}</div>) : <div className="metric"><span>Status</span><strong>Canvas empty</strong></div>}</div></aside>
      </section>
      {preview && <div className="backdrop" onClick={(event) => event.target === event.currentTarget && setPreview(null)}><section className="preview"><div className="preview-head"><div><strong>{preview.title}</strong><small>{range.from} to {range.to} · {preview.count} pack{preview.count === 1 ? "" : "s"} · {branchLabel(selectedBranch)}</small></div><button className="builder-btn" onClick={() => setPreview(null)}>Close</button></div><iframe className="preview-frame" title={`${preview.title} preview`} srcDoc={preview.html} /></section></div>}
    </main>
  );
}
