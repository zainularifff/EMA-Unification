import { useEffect, useMemo, useState } from "react";
import { generateReport, getReportCatalog, getReportOptions, previewReport } from "../services/reportService";

type ReportTemplate = {
  id: string;
  title: string;
  description: string;
  type: string;
  source: string;
  outputs: string[];
  category?: string;
};

type ReportCategory = {
  name: string;
  desc: string;
  items: ReportTemplate[];
};

type OptionItem = { value: string; label: string };

type ReportOptions = {
  sites: { id: number; name: string }[];
  groups: OptionItem[];
  statuses: OptionItem[];
  dateRanges: OptionItem[];
  outputFormats: OptionItem[];
};

type ReportFilters = {
  dateRange: string;
  relationID: number;
  deviceGroup: string;
  status: string;
  outputFormat: string;
  includeChart: boolean;
  includeSummary: boolean;
  includeTable: boolean;
  includeRecommendation: boolean;
};

type ReportPayload = {
  success?: boolean;
  mode?: string;
  generatedAt?: string;
  report?: ReportTemplate;
  filters?: Record<string, unknown>;
  metrics?: Record<string, number | string>;
  narrative?: {
    title?: string;
    period?: string;
    scope?: string;
    executiveSummary?: string;
    keyFindings?: string[];
    managementConclusion?: string;
    recommendations?: string[];
    disclaimer?: string;
  };
  sections?: Array<{
    type: string;
    title: string;
    rows: Array<Record<string, unknown>>;
    columns?: string[];
  }>;
  recommendations?: Array<{ priority?: string; action?: string }>;
  dataSources?: Array<{ name?: string; table?: string; rows?: number }>;
};

type DynamicRule = {
  accent: string;
  eyebrow: string;
  focus: string;
  intro: string;
  kpis: string[];
};

const DAILY_DISCLAIMER =
  "AI Dynamic Reporting is generated once per day for each selected report title. The content reflects the latest available dataset at generation time and should be reviewed by the report owner before management sign-off.";

const DYNAMIC_IDS = ["dynamic-compliance-report", "dynamic-cost-saving-report", "dynamic-risk-management-report"];

const DYNAMIC_RULES: Record<string, DynamicRule> = {
  "dynamic-compliance-report": {
    accent: "#f59e0b",
    eyebrow: "Gemini Flash Compliance",
    focus: "Audit readiness, evidence quality, OS compliance, software governance and exception ownership.",
    intro: "Compliance output must stay within compliance evidence, policy exceptions and management sign-off readiness.",
    kpis: ["Compliance score", "Audit gaps", "Evidence records"]
  },
  "dynamic-cost-saving-report": {
    accent: "#10b981",
    eyebrow: "Gemini Flash Savings",
    focus: "Cost saving opportunities, software rationalisation, renewal cleanup, refresh planning and avoidable support cost.",
    intro: "Cost Saving output must stay within savings, optimisation, procurement decisions and renewal cleanup only.",
    kpis: ["Savings opportunities", "Software rationalisation", "Refresh candidates"]
  },
  "dynamic-risk-management-report": {
    accent: "#ef4444",
    eyebrow: "Gemini Flash Risk",
    focus: "Risk exposure, severity, unsupported OS, SLA pressure, stale telemetry and remediation ownership.",
    intro: "Risk Management output must stay within exposure, impact, severity and remediation accountability only.",
    kpis: ["High risk items", "Severity", "Remediation owners"]
  }
};

const FALLBACK_CATALOG: ReportCategory[] = [
  {
    name: "Featured Reports",
    desc: "Operational report packs for management, inventory, SLA, security and software governance.",
    items: [
      { id: "ai-executive-summary", title: "AI Executive Summary", description: "Executive KPI summary, key findings and priority recommendations.", type: "Summary", source: "Endpoint Inventory + Service Desk + Software Inventory + Jobs + Geolocation", outputs: ["PDF", "PowerPoint", "Excel"] },
      { id: "client-summary-rnr", title: "Client RNR Report", description: "Client-facing risk and resource planning pack.", type: "Summary", source: "Endpoint Inventory + Subscription + Asset Pricing + Software Inventory + Browser Risk", outputs: ["PDF", "PowerPoint", "Excel"] },
      { id: "hardware-asset-lifecycle", title: "Hardware Lifecycle", description: "Asset estate, device age and refresh planning.", type: "Summary", source: "Hardware Inventory + Asset Lifecycle + Endpoint Inventory", outputs: ["PDF", "Excel"] },
      { id: "operations-health-sla", title: "Ops Health & SLA", description: "Endpoint health, service activity and SLA follow-up.", type: "Summary", source: "Endpoint Inventory + Jobs + HD_Incidents + SLA Due", outputs: ["PDF", "PowerPoint", "Excel"] },
      { id: "security-compliance-exposure", title: "Security Exposure", description: "Endpoint risk, compliance gaps and exception action list.", type: "Risk", source: "Device Status + OS Inventory + Software Inventory + Data Quality + Service Desk SLA", outputs: ["PDF", "Excel"] },
      { id: "software-application-governance", title: "Software Governance", description: "Application inventory, licence review and cleanup actions.", type: "Compliance", source: "TSMDM_SW_LIST + TS_SW_CATEGORY + Application Metering + Browser Inventory", outputs: ["PDF", "Excel"] }
    ]
  },
  {
    name: "Dynamic Reporting",
    desc: "Gemini Flash generated report packs for compliance, savings and risk management.",
    items: [
      { id: "dynamic-compliance-report", title: "Compliance Report", description: "AI-generated compliance report with posture analysis, evidence summary and governance actions.", type: "Compliance", source: "Endpoint Inventory + Software Inventory + OS Compliance + Service Desk SLA", outputs: ["PDF", "PowerPoint", "Excel"] },
      { id: "dynamic-cost-saving-report", title: "Cost Saving Report", description: "AI-generated cost saving report for refresh planning, software rationalisation and optimisation opportunities.", type: "Cost Saving", source: "Hardware Lifecycle + Software Inventory + Endpoint Utilisation + Resource Planning", outputs: ["PDF", "PowerPoint", "Excel"] },
      { id: "dynamic-risk-management-report", title: "Risk Management Report", description: "AI-generated risk management report with exposure analysis, severity view and remediation priorities.", type: "Risk", source: "Endpoint Risk + Unsupported OS + Service Desk SLA + Data Quality + Software Risk", outputs: ["PDF", "PowerPoint", "Excel"] }
    ]
  }
];

const FALLBACK_OPTIONS: ReportOptions = {
  sites: [],
  groups: [
    { value: "all", label: "All Groups" },
    { value: "em", label: "EM Devices" },
    { value: "mdm", label: "MDM Devices" }
  ],
  statuses: [
    { value: "all", label: "All Status" },
    { value: "online", label: "Online" },
    { value: "offline", label: "Offline" },
    { value: "stale", label: "Stale Sync" },
    { value: "locked", label: "Locked" }
  ],
  dateRanges: [
    { value: "current-month", label: "Current Month" },
    { value: "last-7-days", label: "Last 7 Days" },
    { value: "last-30-days", label: "Last 30 Days" },
    { value: "quarter-to-date", label: "Quarter to Date" },
    { value: "year-to-date", label: "Year to Date" }
  ],
  outputFormats: [
    { value: "PDF", label: "PDF" },
    { value: "PowerPoint", label: "PowerPoint" },
    { value: "Excel", label: "Excel / CSV" }
  ]
};

const INITIAL_FILTERS: ReportFilters = {
  dateRange: "current-month",
  relationID: 0,
  deviceGroup: "all",
  status: "all",
  outputFormat: "PDF",
  includeChart: true,
  includeSummary: true,
  includeTable: true,
  includeRecommendation: true
};

function normaliseCatalog(raw: unknown): ReportCategory[] {
  const maybeRecord = raw as { data?: unknown; categories?: unknown };
  const source = Array.isArray(raw)
    ? raw
    : Array.isArray(maybeRecord?.data)
      ? maybeRecord.data
      : Array.isArray(maybeRecord?.categories)
        ? maybeRecord.categories
        : FALLBACK_CATALOG;

  const categories = (source as ReportCategory[])
    .filter((category) => Array.isArray(category.items) && category.items.length > 0)
    .map((category) => ({ ...category, items: category.items.filter((item) => item?.id && item?.title) }));

  return categories.length ? categories : FALLBACK_CATALOG;
}

function normaliseOptions(raw: unknown): ReportOptions {
  const maybeRecord = raw as Partial<ReportOptions> | undefined;
  return {
    sites: Array.isArray(maybeRecord?.sites) ? maybeRecord.sites : FALLBACK_OPTIONS.sites,
    groups: Array.isArray(maybeRecord?.groups) && maybeRecord.groups.length ? maybeRecord.groups : FALLBACK_OPTIONS.groups,
    statuses: Array.isArray(maybeRecord?.statuses) && maybeRecord.statuses.length ? maybeRecord.statuses : FALLBACK_OPTIONS.statuses,
    dateRanges: Array.isArray(maybeRecord?.dateRanges) && maybeRecord.dateRanges.length ? maybeRecord.dateRanges : FALLBACK_OPTIONS.dateRanges,
    outputFormats: Array.isArray(maybeRecord?.outputFormats) && maybeRecord.outputFormats.length ? maybeRecord.outputFormats : FALLBACK_OPTIONS.outputFormats
  };
}

function flattenReports(catalog: ReportCategory[]) {
  return catalog.flatMap((category) => category.items.map((report) => ({ ...report, category: category.name })));
}

function isDynamicReport(report: ReportTemplate) {
  return DYNAMIC_IDS.includes(report.id);
}

function reportAccent(report: ReportTemplate) {
  if (DYNAMIC_RULES[report.id]) return DYNAMIC_RULES[report.id].accent;
  if (report.type === "Risk") return "#ef4444";
  if (report.type === "Compliance") return "#f59e0b";
  if (report.id.includes("hardware")) return "#7c3aed";
  if (report.id.includes("software")) return "#f59e0b";
  return "#2563eb";
}

function reportIcon(report: ReportTemplate) {
  if (report.id.includes("cost")) return "↗";
  if (report.type === "Risk") return "!";
  if (report.type === "Compliance") return "✓";
  if (report.id.includes("hardware")) return "▣";
  if (report.id.includes("software")) return "⌘";
  return "▥";
}

function extractPayload(raw: unknown, fallbackReport: ReportTemplate): ReportPayload {
  const first = raw as ReportPayload & { data?: unknown };
  const nested = first?.data as ReportPayload | undefined;
  const payload = nested?.report ? nested : first;
  return payload?.report ? payload : buildLocalPayload(fallbackReport, INITIAL_FILTERS, "preview");
}

function selectedOptionLabel(items: OptionItem[], value: string) {
  return items.find((item) => item.value === value)?.label || value;
}

function selectedSiteLabel(sites: ReportOptions["sites"], value: number) {
  if (!value) return "All Sites";
  return sites.find((site) => Number(site.id) === Number(value))?.name || `Site ${value}`;
}

function buildLocalPayload(report: ReportTemplate, filters: ReportFilters, mode: "preview" | "generate"): ReportPayload {
  const dynamicRule = DYNAMIC_RULES[report.id];
  const isDynamic = Boolean(dynamicRule);
  const title = isDynamic ? `${report.title} analysis` : `${report.title} preview`;
  const baseSummary = isDynamic
    ? `${dynamicRule.intro} The generated report must refer directly to ${report.title} and avoid unrelated executive summary wording.`
    : `${report.title} is prepared as a focused report pack using the selected period, site scope and output options.`;
  const keyFindings = isDynamic
    ? [dynamicRule.focus, "Each chart, table and recommendation should match the selected report title.", DAILY_DISCLAIMER]
    : ["Report scope follows the selected filters.", "Preview content will be refined when backend data is available.", "Management review should validate the output before sign-off."];

  return {
    success: true,
    mode,
    generatedAt: new Date().toISOString(),
    report,
    filters: { ...filters },
    metrics: {
      selectedSections: [filters.includeSummary, filters.includeChart, filters.includeTable, filters.includeRecommendation].filter(Boolean).length,
      dataSources: isDynamic ? 4 : 3,
      reportReadiness: isDynamic ? "AI Ready" : "Ready"
    },
    narrative: {
      title,
      period: filters.dateRange,
      scope: filters.relationID ? `Site ${filters.relationID}` : "All Sites",
      executiveSummary: baseSummary,
      keyFindings,
      managementConclusion: isDynamic ? DAILY_DISCLAIMER : "Generate the report after confirming filters and selected output format.",
      recommendations: isDynamic
        ? ["Keep the report content strictly aligned with the selected title.", "Review the generated AI narrative before management sign-off."]
        : ["Preview the report before export.", "Confirm the selected scope and output format."]
    },
    sections: [
      {
        type: "kpi",
        title: isDynamic ? `${report.title} KPI Focus` : "Report Values",
        rows: [
          { label: "Report Pack", value: report.title, note: report.type },
          { label: "Output", value: filters.outputFormat, note: report.outputs.join(" / ") },
          { label: "Scope", value: filters.relationID ? `Site ${filters.relationID}` : "All Sites", note: filters.deviceGroup }
        ]
      },
      {
        type: "table",
        title: isDynamic ? `${report.title} Evidence Plan` : "Output Plan",
        rows: [
          { item: "Summary", status: filters.includeSummary ? "Included" : "Excluded", purpose: "Narrative and management overview" },
          { item: "Chart", status: filters.includeChart ? "Included" : "Excluded", purpose: "Visual trend or distribution" },
          { item: "Detail Table", status: filters.includeTable ? "Included" : "Excluded", purpose: "Evidence rows and ownership" },
          { item: "Recommendation", status: filters.includeRecommendation ? "Included" : "Excluded", purpose: "Action and follow-up" }
        ]
      }
    ],
    recommendations: [
      { priority: "High", action: isDynamic ? `Generate ${report.title} once per day and keep content tied to the selected topic.` : "Confirm report scope before export." },
      { priority: "Medium", action: "Review data and management wording before sign-off." }
    ],
    dataSources: [
      { name: "Report API", table: "api/reports", rows: 1 },
      { name: "Selected Report", table: report.source, rows: 1 }
    ]
  };
}

function summaryParagraphs(payload: ReportPayload) {
  const text = payload.narrative?.executiveSummary || "Preview the report to load report narrative.";
  return text.split(/\n{2,}|\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function formatDate(value?: string) {
  if (!value) return "Not generated";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function ReportModern() {
  const [catalog, setCatalog] = useState<ReportCategory[]>(FALLBACK_CATALOG);
  const [options, setOptions] = useState<ReportOptions>(FALLBACK_OPTIONS);
  const [selectedReportId, setSelectedReportId] = useState("ai-executive-summary");
  const [filters, setFilters] = useState<ReportFilters>(INITIAL_FILTERS);
  const [search, setSearch] = useState("");
  const [payload, setPayload] = useState<ReportPayload>(() => buildLocalPayload(FALLBACK_CATALOG[0].items[0], INITIAL_FILTERS, "preview"));
  const [status, setStatus] = useState<"Idle" | "Previewed" | "Generated">("Idle");
  const [loading, setLoading] = useState<"preview" | "generate" | "load" | null>("load");
  const [error, setError] = useState("");

  const reports = useMemo(() => flattenReports(catalog), [catalog]);
  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedReportId) || reports[0] || FALLBACK_CATALOG[0].items[0],
    [reports, selectedReportId]
  );
  const selectedAccent = reportAccent(selectedReport);
  const dynamicRule = DYNAMIC_RULES[selectedReport.id];
  const filteredCatalog = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return catalog;
    return catalog
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => `${item.title} ${item.description} ${item.type}`.toLowerCase().includes(query))
      }))
      .filter((category) => category.items.length > 0);
  }, [catalog, search]);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading("load");
      try {
        const [catalogPayload, optionPayload] = await Promise.all([getReportCatalog(), getReportOptions()]);
        if (!isMounted) return;
        const nextCatalog = normaliseCatalog(catalogPayload);
        setCatalog(nextCatalog);
        setOptions(normaliseOptions(optionPayload));
        const firstReport = flattenReports(nextCatalog)[0] || FALLBACK_CATALOG[0].items[0];
        setSelectedReportId((current) => current || firstReport.id);
      } catch (loadError) {
        if (!isMounted) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load report setup. Using local catalog.");
      } finally {
        if (isMounted) setLoading(null);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setPayload(buildLocalPayload(selectedReport, filters, "preview"));
    setStatus("Idle");
    setError("");
  }, [selectedReport, filters]);

  function updateFilter<K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function requestPayload() {
    return {
      ...filters,
      reportId: selectedReport.id,
      report: selectedReport,
      dynamicReportType: isDynamicReport(selectedReport) ? selectedReport.id : undefined,
      dynamicReportTitle: isDynamicReport(selectedReport) ? selectedReport.title : undefined,
      dynamicReportCategory: isDynamicReport(selectedReport) ? "Dynamic Reporting" : undefined,
      useAiAnalysis: isDynamicReport(selectedReport),
      aiEngine: isDynamicReport(selectedReport) ? "gemini-flash" : undefined,
      generationFrequency: isDynamicReport(selectedReport) ? "once-per-day" : undefined,
      aiDisclaimer: isDynamicReport(selectedReport) ? DAILY_DISCLAIMER : undefined
    };
  }

  async function handlePreview() {
    setLoading("preview");
    setError("");
    try {
      if (isDynamicReport(selectedReport)) {
        const response = await previewReport(requestPayload());
        setPayload(extractPayload(response, selectedReport));
      } else {
        setPayload(buildLocalPayload(selectedReport, filters, "preview"));
      }
      setStatus("Previewed");
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Preview failed.");
      setPayload(buildLocalPayload(selectedReport, filters, "preview"));
      setStatus("Previewed");
    } finally {
      setLoading(null);
    }
  }

  async function handleGenerate() {
    setLoading("generate");
    setError("");
    try {
      if (isDynamicReport(selectedReport)) {
        const response = await generateReport(requestPayload());
        setPayload(extractPayload(response, selectedReport));
      } else {
        setPayload(buildLocalPayload(selectedReport, filters, "generate"));
      }
      setStatus("Generated");
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Generate failed.");
      setPayload(buildLocalPayload(selectedReport, filters, "generate"));
      setStatus("Generated");
    } finally {
      setLoading(null);
    }
  }

  const selectedSections = [
    filters.includeSummary ? "Summary" : "",
    filters.includeChart ? "Chart" : "",
    filters.includeTable ? "Detail Table" : "",
    filters.includeRecommendation ? "Recommendation" : ""
  ].filter(Boolean);

  return (
    <main className="report-modern-page" style={{ "--report-accent": selectedAccent } as React.CSSProperties}>
      <style>{modernReportStyles}</style>

      <aside className="report-modern-sidebar">
        <div className="report-side-brand">
          <span>REPORT CENTER</span>
          <strong>{reports.length}</strong>
        </div>
        <label className="report-search-box">
          <span>Search</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find report pack..." />
        </label>
        <div className="report-nav-groups">
          {filteredCatalog.map((category) => (
            <section className="report-nav-group" key={category.name}>
              <div className="report-nav-title">
                <span>{category.name}</span>
                <small>{category.items.length} modules</small>
              </div>
              {category.items.map((report) => (
                <button
                  type="button"
                  key={report.id}
                  className={`report-nav-item ${report.id === selectedReport.id ? "active" : ""}`}
                  onClick={() => setSelectedReportId(report.id)}
                  style={{ "--item-accent": reportAccent(report) } as React.CSSProperties}
                >
                  <span className="report-nav-icon">{reportIcon(report)}</span>
                  <span className="report-nav-copy">
                    <strong>{report.title}</strong>
                    <small>{report.type}</small>
                  </span>
                </button>
              ))}
            </section>
          ))}
        </div>
      </aside>

      <section className="report-modern-workspace">
        <header className="report-modern-hero">
          <div>
            <span className="report-eyebrow">{dynamicRule?.eyebrow || selectedReport.category || "Report Workspace"}</span>
            <h1>Report Workspace</h1>
            <p>Choose one report pack, configure the scope, preview the content, then generate the output.</p>
          </div>
          <div className="report-hero-stats">
            <article><span>Modules</span><strong>{reports.length}</strong></article>
            <article><span>Selected</span><strong>{selectedReport.title}</strong></article>
            <article><span>Status</span><strong>{status}</strong></article>
            <article><span>Last Output</span><strong>{formatDate(payload.generatedAt)}</strong></article>
          </div>
        </header>

        <div className="report-modern-grid">
          <section className="report-center-column">
            <article className="report-selected-card">
              <div className="report-selected-top">
                <span className="report-selected-icon">{reportIcon(selectedReport)}</span>
                <div>
                  <span className="report-eyebrow">Current report pack</span>
                  <h2>{selectedReport.title}</h2>
                  <p>{selectedReport.description}</p>
                </div>
              </div>
              <div className="report-meta-grid">
                <div><span>Report Type</span><strong>{selectedReport.type}</strong></div>
                <div><span>Source</span><strong>{selectedReport.source}</strong></div>
                <div><span>Output</span><strong>{selectedReport.outputs.join(" / ")}</strong></div>
              </div>
              {dynamicRule ? (
                <div className="report-ai-notice inline">
                  <strong>AI Dynamic Reporting Notice</strong>
                  <span>{DAILY_DISCLAIMER}</span>
                </div>
              ) : null}
            </article>

            <article className="report-card clean-config-card">
              <div className="report-card-head">
                <div>
                  <span className="report-eyebrow">Configuration</span>
                  <h3>Report scope</h3>
                </div>
                <small>{selectedSections.join(" / ")}</small>
              </div>
              <div className="report-form-grid">
                <label>
                  <span>Period</span>
                  <select value={filters.dateRange} onChange={(event) => updateFilter("dateRange", event.target.value)}>
                    {options.dateRanges.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <label>
                  <span>Site / Branch</span>
                  <select value={filters.relationID} onChange={(event) => updateFilter("relationID", Number(event.target.value))}>
                    <option value={0}>All Sites</option>
                    {options.sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
                  </select>
                </label>
                <label>
                  <span>Device Group</span>
                  <select value={filters.deviceGroup} onChange={(event) => updateFilter("deviceGroup", event.target.value)}>
                    {options.groups.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <label>
                  <span>Endpoint Status</span>
                  <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
                    {options.statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <label>
                  <span>Output Format</span>
                  <select value={filters.outputFormat} onChange={(event) => updateFilter("outputFormat", event.target.value)}>
                    {options.outputFormats.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
              </div>
              <div className="report-section-toggles">
                <label><input type="checkbox" checked={filters.includeSummary} onChange={(event) => updateFilter("includeSummary", event.target.checked)} /> Summary</label>
                <label><input type="checkbox" checked={filters.includeChart} onChange={(event) => updateFilter("includeChart", event.target.checked)} /> Chart</label>
                <label><input type="checkbox" checked={filters.includeTable} onChange={(event) => updateFilter("includeTable", event.target.checked)} /> Detail Table</label>
                <label><input type="checkbox" checked={filters.includeRecommendation} onChange={(event) => updateFilter("includeRecommendation", event.target.checked)} /> Recommendation</label>
              </div>
            </article>

            <article className="report-card preview-card">
              <div className="report-card-head">
                <div>
                  <span className="report-eyebrow">Report Content</span>
                  <h3>{payload.narrative?.title || `${selectedReport.title} preview`}</h3>
                </div>
                <small>{payload.mode || "preview"}</small>
              </div>
              <div className="report-summary-copy">
                {summaryParagraphs(payload).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
              {payload.narrative?.keyFindings?.length ? (
                <div className="report-findings">
                  {payload.narrative.keyFindings.slice(0, 4).map((finding) => <span key={finding}>{finding}</span>)}
                </div>
              ) : null}
              <div className="report-section-preview">
                {(payload.sections || []).slice(0, 3).map((section) => (
                  <section key={`${section.type}-${section.title}`}>
                    <h4>{section.title}</h4>
                    <div className="section-row-list">
                      {(section.rows || []).slice(0, 4).map((row, index) => (
                        <div key={`${section.title}-${index}`}>
                          <strong>{String(row.label || row.area || row.item || row.control || row.opportunity || `Item ${index + 1}`)}</strong>
                          <span>{String(row.value || row.status || row.severity || row.nextAction || row.note || "Review")}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </article>
          </section>

          <aside className="report-action-column">
            <article className="report-card action-card">
              <span className="report-eyebrow">Actions</span>
              <h3>Preview & Generate</h3>
              <p>Run preview first to validate topic and scope. Generate will create the final daily output for dynamic reports.</p>
              <button type="button" className="btn secondary" disabled={Boolean(loading)} onClick={handlePreview}>{loading === "preview" ? "Previewing..." : "Preview"}</button>
              <button type="button" className="btn primary" disabled={Boolean(loading)} onClick={handleGenerate}>{loading === "generate" ? "Generating..." : "Generate"}</button>
              {error ? <div className="report-error">{error}</div> : null}
            </article>

            <article className="report-card scope-card">
              <span className="report-eyebrow">Current Selection</span>
              <dl>
                <div><dt>Period</dt><dd>{selectedOptionLabel(options.dateRanges, filters.dateRange)}</dd></div>
                <div><dt>Site</dt><dd>{selectedSiteLabel(options.sites, filters.relationID)}</dd></div>
                <div><dt>Group</dt><dd>{selectedOptionLabel(options.groups, filters.deviceGroup)}</dd></div>
                <div><dt>Status</dt><dd>{selectedOptionLabel(options.statuses, filters.status)}</dd></div>
              </dl>
            </article>

            <article className="report-card insight-card">
              <span className="report-eyebrow">Topic Guard</span>
              <h3>{dynamicRule ? dynamicRule.eyebrow : "Focused report pack"}</h3>
              <p>{dynamicRule?.focus || "This report pack keeps the content focused on the selected module and output configuration."}</p>
              <div className="mini-kpi-list">
                {(dynamicRule?.kpis || ["Scope", "Narrative", "Evidence"]).map((item) => <span key={item}>{item}</span>)}
              </div>
            </article>

            <article className="report-card source-card">
              <span className="report-eyebrow">Data Sources</span>
              {(payload.dataSources || []).slice(0, 4).map((source) => (
                <div key={`${source.name}-${source.table}`}>
                  <strong>{source.name || "Source"}</strong>
                  <span>{source.table || selectedReport.source}</span>
                </div>
              ))}
            </article>
          </aside>
        </div>
      </section>
    </main>
  );
}

const modernReportStyles = `
.report-modern-page {
  --report-accent: #2563eb;
  min-height: calc(100vh - 76px);
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 18px;
  padding: 16px;
  color: #10213d;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--report-accent) 11%, transparent), transparent 34%),
    linear-gradient(135deg, #f4f8ff 0%, #eef5fb 100%);
}
.report-modern-sidebar,
.report-modern-workspace,
.report-card,
.report-selected-card {
  border: 1px solid rgba(148, 163, 184, .28);
  background: rgba(255,255,255,.92);
  box-shadow: 0 18px 44px rgba(15, 35, 71, .08);
}
.report-modern-sidebar {
  position: sticky;
  top: 14px;
  align-self: start;
  height: calc(100vh - 110px);
  display: flex;
  flex-direction: column;
  border-radius: 24px;
  overflow: hidden;
}
.report-side-brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 18px 16px;
  border-bottom: 1px solid rgba(148, 163, 184, .22);
}
.report-side-brand span,
.report-eyebrow,
.report-search-box span,
.report-form-grid span,
.report-meta-grid span,
.report-nav-title span {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .11em;
  text-transform: uppercase;
  color: #6c7d98;
}
.report-side-brand strong {
  min-width: 32px;
  min-height: 32px;
  display: inline-grid;
  place-items: center;
  color: #fff;
  border-radius: 12px;
  background: var(--report-accent);
}
.report-search-box {
  display: grid;
  gap: 8px;
  padding: 14px 16px 10px;
}
.report-search-box input,
.report-form-grid select {
  width: 100%;
  height: 42px;
  border: 1px solid #d8e4f2;
  border-radius: 14px;
  background: #fff;
  color: #10213d;
  font-weight: 800;
  padding: 0 12px;
  outline: none;
}
.report-search-box input:focus,
.report-form-grid select:focus {
  border-color: color-mix(in srgb, var(--report-accent) 56%, #d8e4f2);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--report-accent) 14%, transparent);
}
.report-nav-groups {
  overflow: auto;
  padding: 8px 12px 18px;
}
.report-nav-group + .report-nav-group {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(148, 163, 184, .18);
}
.report-nav-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 4px 8px;
}
.report-nav-title small {
  color: #7a8ca8;
  font-size: 11px;
  font-weight: 800;
}
.report-nav-item {
  width: 100%;
  min-height: 58px;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  margin-bottom: 8px;
  border: 0;
  border-radius: 16px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  color: #10213d;
}
.report-nav-item:hover {
  background: color-mix(in srgb, var(--item-accent) 9%, #fff);
}
.report-nav-item.active {
  color: #fff;
  background: linear-gradient(135deg, var(--item-accent), color-mix(in srgb, var(--item-accent) 76%, #0b1f3a));
  box-shadow: 0 16px 30px color-mix(in srgb, var(--item-accent) 28%, transparent);
}
.report-nav-icon {
  width: 40px;
  height: 40px;
  display: inline-grid;
  place-items: center;
  border-radius: 14px;
  background: color-mix(in srgb, var(--item-accent) 13%, #fff);
  color: var(--item-accent);
  font-weight: 900;
}
.report-nav-item.active .report-nav-icon {
  background: rgba(255,255,255,.18);
  color: #fff;
}
.report-nav-copy {
  min-width: 0;
  display: grid;
  gap: 3px;
}
.report-nav-copy strong {
  font-size: 13px;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.report-nav-copy small {
  font-size: 11px;
  color: #7d8fab;
  font-weight: 800;
}
.report-nav-item.active .report-nav-copy small { color: rgba(255,255,255,.82); }
.report-modern-workspace {
  min-width: 0;
  border-radius: 26px;
  padding: 18px;
}
.report-modern-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(420px, .78fr);
  gap: 18px;
  align-items: stretch;
  padding: 18px;
  border-radius: 22px;
  background: linear-gradient(135deg, #ffffff 0%, color-mix(in srgb, var(--report-accent) 7%, #ffffff) 100%);
  border: 1px solid rgba(148, 163, 184, .22);
}
.report-modern-hero h1 {
  margin: 4px 0 4px;
  color: #10213d;
  font-size: clamp(24px, 3vw, 34px);
  line-height: 1;
  letter-spacing: -.04em;
}
.report-modern-hero p,
.report-selected-card p,
.report-card p {
  margin: 0;
  color: #62738f;
  line-height: 1.55;
  font-weight: 700;
}
.report-hero-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.report-hero-stats article,
.report-meta-grid div,
.report-ai-notice,
.report-findings span,
.mini-kpi-list span {
  border: 1px solid #dbe6f4;
  background: rgba(255,255,255,.78);
  border-radius: 16px;
}
.report-hero-stats article {
  display: grid;
  gap: 4px;
  padding: 12px;
}
.report-hero-stats span {
  color: #6c7d98;
  font-size: 10px;
  text-transform: uppercase;
  font-weight: 900;
  letter-spacing: .08em;
}
.report-hero-stats strong {
  min-width: 0;
  color: #10213d;
  font-size: 18px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.report-modern-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 18px;
  margin-top: 18px;
  align-items: start;
}
.report-center-column,
.report-action-column {
  display: grid;
  gap: 16px;
  min-width: 0;
}
.report-action-column {
  position: sticky;
  top: 14px;
}
.report-selected-card,
.report-card {
  border-radius: 22px;
  padding: 18px;
}
.report-selected-card {
  border-top: 5px solid var(--report-accent);
}
.report-selected-top {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}
.report-selected-icon {
  width: 56px;
  height: 56px;
  display: inline-grid;
  place-items: center;
  border-radius: 18px;
  color: #fff;
  background: var(--report-accent);
  font-weight: 900;
  font-size: 22px;
}
.report-selected-card h2,
.report-card h3 {
  margin: 4px 0 6px;
  color: #10213d;
  letter-spacing: -.03em;
}
.report-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1.5fr 1fr;
  gap: 10px;
  margin-top: 16px;
}
.report-meta-grid div {
  display: grid;
  gap: 5px;
  padding: 12px;
}
.report-meta-grid strong {
  min-width: 0;
  font-size: 13px;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
}
.report-ai-notice {
  display: grid;
  gap: 5px;
  margin-top: 14px;
  padding: 13px;
  color: color-mix(in srgb, var(--report-accent) 72%, #10213d);
  background: color-mix(in srgb, var(--report-accent) 9%, #fff);
}
.report-ai-notice strong { font-size: 13px; }
.report-ai-notice span { color: #5d708f; font-size: 12px; line-height: 1.45; font-weight: 700; }
.report-card-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: start;
  margin-bottom: 14px;
}
.report-card-head small {
  padding: 6px 10px;
  border-radius: 999px;
  color: var(--report-accent);
  background: color-mix(in srgb, var(--report-accent) 10%, #fff);
  font-weight: 900;
}
.report-form-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}
.report-form-grid label {
  display: grid;
  gap: 7px;
  min-width: 0;
}
.report-section-toggles {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}
.report-section-toggles label {
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 12px;
  border: 1px solid #dbe6f4;
  border-radius: 14px;
  background: #f8fbff;
  color: #10213d;
  font-size: 12px;
  font-weight: 900;
}
.report-section-toggles input { width: 16px; height: 16px; accent-color: var(--report-accent); }
.report-summary-copy {
  display: grid;
  gap: 10px;
}
.report-summary-copy p {
  color: #4d607c;
  font-size: 14px;
  font-weight: 700;
}
.report-findings {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}
.report-findings span,
.mini-kpi-list span {
  padding: 11px 12px;
  color: #18345f;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.45;
}
.report-section-preview {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}
.report-section-preview section {
  border: 1px solid #e1e9f5;
  border-radius: 16px;
  padding: 14px;
  background: #fbfdff;
}
.report-section-preview h4 {
  margin: 0 0 10px;
  color: #10213d;
}
.section-row-list {
  display: grid;
  gap: 8px;
}
.section-row-list div,
.source-card div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 0;
  border-top: 1px solid #edf2f8;
}
.section-row-list div:first-child,
.source-card div:first-of-type { border-top: 0; }
.section-row-list strong,
.source-card strong {
  color: #10213d;
  font-size: 13px;
}
.section-row-list span,
.source-card span {
  color: #667894;
  font-size: 12px;
  font-weight: 800;
  text-align: right;
}
.action-card .btn {
  width: 100%;
  height: 44px;
  border: 0;
  border-radius: 14px;
  margin-top: 10px;
  font-weight: 900;
  cursor: pointer;
}
.action-card .btn:disabled { opacity: .65; cursor: not-allowed; }
.action-card .btn.primary { color: #fff; background: var(--report-accent); box-shadow: 0 14px 28px color-mix(in srgb, var(--report-accent) 25%, transparent); }
.action-card .btn.secondary { color: #10213d; background: #eef4fb; border: 1px solid #dbe6f4; }
.report-error {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  color: #b42318;
  background: #fff1f0;
  font-size: 12px;
  font-weight: 800;
}
.scope-card dl {
  display: grid;
  gap: 10px;
  margin: 10px 0 0;
}
.scope-card dl div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 9px;
  border-bottom: 1px solid #edf2f8;
}
.scope-card dt {
  color: #6c7d98;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}
.scope-card dd {
  margin: 0;
  color: #10213d;
  font-size: 13px;
  font-weight: 900;
  text-align: right;
}
.mini-kpi-list {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}
@media (max-width: 1380px) {
  .report-modern-page { grid-template-columns: 250px minmax(0, 1fr); }
  .report-modern-hero,
  .report-modern-grid { grid-template-columns: 1fr; }
  .report-action-column { position: static; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .source-card { grid-column: span 2; }
}
@media (max-width: 980px) {
  .report-modern-page { grid-template-columns: 1fr; }
  .report-modern-sidebar { position: static; height: auto; }
  .report-nav-groups { max-height: 360px; }
  .report-form-grid,
  .report-meta-grid,
  .report-section-toggles,
  .report-findings,
  .report-action-column { grid-template-columns: 1fr; }
  .source-card { grid-column: auto; }
}
`;
