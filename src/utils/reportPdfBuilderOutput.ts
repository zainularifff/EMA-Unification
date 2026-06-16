import { buildLegacyReportHtml } from "./reportPdfLegacyDesign";
import { buildExecutiveLegacyReportHtml } from "./reportPdfExecutiveDesign";

const EXECUTIVE_REPORT_IDS = new Set(["ai-executive-summary", "executive-summary"]);
const METERING_REPORT_IDS = new Set(["software-metering-report", "application-metering-report", "internet-metering-report"]);

function numeric(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readMetric(payload: any, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = numeric(payload?.metrics?.[key], NaN);
    if (Number.isFinite(value)) return value;
  }
  return fallback;
}

function reportTitle(id: string) {
  if (id === "software-metering-report") return "Software Metering";
  if (id === "application-metering-report") return "Application Metering";
  if (id === "internet-metering-report") return "Internet Metering";
  return "Metering Report";
}

function scopeOf(payload: any, filters: any) {
  return payload?.narrative?.scope || payload?.filters?.scope || filters?.scope || filters?.branchName || "All Sites";
}

function periodOf(payload: any, filters: any) {
  const start = payload?.dateRange?.from || filters?.startDate;
  const end = payload?.dateRange?.to || filters?.endDate;
  if (start && end) return `${start} to ${end}`;
  return payload?.narrative?.period || filters?.dateRange || "Current period";
}

function meteringContent(id: string, payload: any) {
  if (id === "software-metering-report") {
    const records = readMetric(payload, ["softwareRecords", "softwareRows", "totalSoftwareRecords", "totalSoftware"], 0);
    const installs = readMetric(payload, ["totalInstalls", "installCount", "installs"], 0);
    const owned = readMetric(payload, ["licensesOwned", "licencesOwned", "licenseOwned"], 0);
    const used = readMetric(payload, ["licensesUsed", "licencesUsed", "licenseUsed"], 0);
    const unlicensed = readMetric(payload, ["unlicensedSoftware", "unlicensedCount"], 0);
    return {
      metrics: { softwareRecords: records, totalInstalls: installs, licensesOwned: owned, licensesUsed: used, unlicensedSoftware: unlicensed },
      kpi: [
        { label: "Software Records", value: records || "Pending", note: "Inventory records reviewed for metering evidence" },
        { label: "Total Installs", value: installs || "Pending", note: "Install footprint across selected scope" },
        { label: "Licence Used", value: used || "Pending", note: `${owned || "Pending"} owned seat(s)` },
        { label: "Unlicensed Items", value: unlicensed, note: "Candidate items requiring entitlement validation" },
      ],
      findings: [
        "Software metering reviews install footprint, licence ownership, usage evidence and cleanup opportunities.",
        `${unlicensed} software item(s) require licence ownership validation before audit or renewal review.`,
        "High install-count applications should be prioritised for version standardisation and duplicate cleanup.",
        "Unused or under-used licence seats should be reviewed for reclaim before renewal.",
      ],
      bars: [{ label: "Installs", value: installs || 1 }, { label: "Licences Used", value: used || 1 }, { label: "Licences Owned", value: owned || 1 }, { label: "Unlicensed", value: unlicensed || 1 }],
      focus: [
        { area: "Licence compliance", severity: unlicensed > 0 ? "Action" : "Monitor", finding: `${unlicensed} entitlement candidate(s) need validation.`, action: "Validate purchase evidence and software owner." },
        { area: "Licence usage", severity: "Review", finding: "Licence usage must be compared with owned entitlement.", action: "Compare used seats against allocation and renewal record." },
        { area: "Cleanup", severity: "Opportunity", finding: "Inactive or duplicate installs may create cleanup opportunity.", action: "Prepare uninstall and reclaim list." },
      ],
    };
  }

  if (id === "application-metering-report") {
    const apps = readMetric(payload, ["totalApplications", "applications", "appCount"], 0);
    const users = readMetric(payload, ["activeUsers", "totalActiveUsers"], 0);
    const hours = readMetric(payload, ["usageHours", "totalUsageHours", "totalHours"], 0);
    const low = readMetric(payload, ["lowUsageApps", "unusedApps", "staleApplications"], 0);
    return {
      metrics: { totalApplications: apps, activeUsers: users, usageHours: hours, lowUsageApps: low },
      kpi: [
        { label: "Applications Tracked", value: apps || "Pending", note: "Applications evaluated for usage behaviour" },
        { label: "Active Users", value: users || "Pending", note: "Users with recorded application activity" },
        { label: "Usage Hours", value: hours || "Pending", note: "Total application usage hours" },
        { label: "Low Usage Apps", value: low, note: "Rationalisation candidates" },
      ],
      findings: [
        "Application metering reviews actual app usage, active user reach and rationalisation opportunities.",
        `${apps || "Pending"} application(s) are tracked for usage behaviour in the selected scope.`,
        `${low} low or no-usage application candidate(s) should be challenged with the owner.`,
        "Top-used applications should be retained and monitored as business-critical dependencies.",
      ],
      bars: [{ label: "Applications", value: apps || 1 }, { label: "Active Users", value: users || 1 }, { label: "Usage Hours", value: hours || 1 }, { label: "Low Usage", value: low || 1 }],
      focus: [
        { area: "Low usage", severity: low > 0 ? "Opportunity" : "Monitor", finding: `${low} low usage candidate(s) found.`, action: "Review uninstall or licence reclaim with owner." },
        { area: "Active user coverage", severity: users > 0 ? "Visible" : "Pending", finding: `${users || "Pending"} active user(s) recorded.`, action: "Validate metering agent and user mapping." },
        { area: "Rationalisation", severity: "Review", finding: "Duplicate or low-adoption tools should be challenged.", action: "Consolidate tools and remove inactive applications." },
      ],
    };
  }

  const users = readMetric(payload, ["usersTracked", "totalUsers", "users"], 0);
  const download = readMetric(payload, ["downloadMb", "totalDownloadMb", "downloadMB"], 0);
  const upload = readMetric(payload, ["uploadMb", "totalUploadMb", "uploadMB"], 0);
  const total = readMetric(payload, ["totalMb", "totalBandwidthMb", "bandwidthMb"], download + upload);
  const high = readMetric(payload, ["highBandwidthUsers", "topUsers", "heavyUsers"], 0);
  return {
    metrics: { usersTracked: users, downloadMb: download, uploadMb: upload, totalMb: total, highBandwidthUsers: high },
    kpi: [
      { label: "Users Tracked", value: users || "Pending", note: "Users included in internet metering scope" },
      { label: "Total Bandwidth", value: total ? `${total} MB` : "Pending", note: `${download || 0} MB download · ${upload || 0} MB upload` },
      { label: "Download", value: download ? `${download} MB` : "Pending", note: "Inbound traffic" },
      { label: "High Usage Users", value: high, note: "Usage governance candidates" },
    ],
    findings: [
      "Internet metering reviews bandwidth usage, high-usage users, department consumption and category pattern.",
      `${total || "Pending"} MB total bandwidth was recorded for the selected period.`,
      `${high} high-bandwidth user candidate(s) should be validated against business activity.`,
      "Department and category breakdown should be reviewed for non-business usage and policy exceptions.",
    ],
    bars: [{ label: "Download MB", value: download || 1 }, { label: "Upload MB", value: upload || 1 }, { label: "Total MB", value: total || 1 }, { label: "High Users", value: high || 1 }],
    focus: [
      { area: "Bandwidth usage", severity: total > 0 ? "Available" : "Pending", finding: `${total || "Pending"} MB total usage.`, action: "Validate heavy usage against business role." },
      { area: "High usage users", severity: high > 0 ? "Action" : "Monitor", finding: `${high} high usage candidate(s).`, action: "Review repeated peaks and policy exceptions." },
      { area: "Category governance", severity: "Review", finding: "Category and protocol pattern require governance review.", action: "Map findings to web restriction policy." },
    ],
  };
}

function enrichMeteringPayload(payload: any, filters: any) {
  const id = String(payload?.report?.id || payload?.filters?.reportId || filters?.reportId || "").toLowerCase();
  if (!METERING_REPORT_IDS.has(id)) return payload;
  const title = reportTitle(id);
  const scope = scopeOf(payload, filters);
  const period = periodOf(payload, filters);
  const data = meteringContent(id, payload);
  const summary = `${title} was prepared for ${scope} covering ${period}. The report reviews usage evidence, activity patterns, cleanup opportunities and governance actions for the selected metering scope.`;
  const conclusion = `${title} should be used to validate accountability, clean inactive usage, review high-risk or high-cost activity and prepare follow-up actions before the next management review.`;
  return {
    ...payload,
    report: { ...(payload?.report || {}), id, title, category: "Metering Report", type: "Metering Report", description: payload?.report?.description || `${title} usage, evidence and governance analysis.` },
    metrics: { ...(payload?.metrics || {}), ...data.metrics },
    narrative: { ...(payload?.narrative || {}), title, scope, period, executiveSummary: summary, managementConclusion: conclusion, keyFindings: data.findings },
    sections: [
      { type: "kpi", title: `${title} Management Snapshot`, rows: data.kpi },
      { type: "bar", title: `${title} Usage Mix`, rows: data.bars },
      { type: "risk", title: `${title} Governance Focus`, rows: data.focus },
      { type: "table", title: `${title} Evidence Register`, rows: data.focus },
    ],
    recommendations: data.focus.map((row: any, index: number) => ({ priority: `Priority ${index + 1}`, action: row.action, owner: index === 0 ? "IT Operations" : "Management Team", target: "Next review" })),
  };
}

function disableAutoPrint(html: string) {
  const printCall = "window." + "print();";
  const focusCall = "window." + "focus();";
  return html.replace(`${focusCall} ${printCall}`, "void 0;").replace(printCall, "void 0;");
}

export function buildBuilderReportHtml(payload: any, filters: any, options: any = {}) {
  const enrichedPayload = enrichMeteringPayload(payload, filters);
  const id = String(enrichedPayload?.report?.id || enrichedPayload?.filters?.reportId || "").toLowerCase();
  const executive = EXECUTIVE_REPORT_IDS.has(id);
  const html = executive ? buildExecutiveLegacyReportHtml(enrichedPayload, filters, options) : buildLegacyReportHtml(enrichedPayload, filters, options);
  return options.autoPrint ? html : disableAutoPrint(html);
}
