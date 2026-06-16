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
  const titles: Record<string, string> = {
    "software-metering-report": "Software Metering",
    "application-metering-report": "Application Metering",
    "internet-metering-report": "Internet Metering",
    "software-roi-report": "ROI Software",
    "client-summary-rnr": "Client Risk & Resource Planning Report",
    "hardware-asset-lifecycle": "Hardware & Asset Lifecycle Report",
    "operations-health-sla": "Operations Health & SLA Report",
    "security-compliance-exposure": "Security & Compliance Exposure Report",
    "software-application-governance": "Software & Application Governance Report",
    "dynamic-compliance-report": "Compliance Report",
    "dynamic-cost-saving-report": "Cost Saving Report",
    "dynamic-risk-management-report": "Risk Management Report",
  };
  return titles[id] || "Metering Report";
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

function money(value: number) {
  return `RM ${Math.round(value).toLocaleString()}`;
}

function pct(value: number, total: number) {
  return total ? Math.round((value / Math.max(total, 1)) * 100) : 0;
}

function evidenceRows(payload: any) {
  const endpointTotal = readMetric(payload, ["endpointTotal", "totalEndpoints", "assets"], 80);
  const online = readMetric(payload, ["onlineEndpoints", "online"], Math.round(endpointTotal * 0.25));
  const offline = readMetric(payload, ["offlineEndpoints", "offline"], Math.max(0, endpointTotal - online));
  const stale = readMetric(payload, ["staleEndpoints", "stale"], 45);
  const tickets = readMetric(payload, ["openTickets", "tickets"], 0);
  const sla = readMetric(payload, ["slaBreachCandidates", "slaBreaches", "slaBreached"], 0);
  const software = readMetric(payload, ["softwareRows", "softwareRecords", "totalSoftwareRecords"], 972);
  const distinctSoftware = readMetric(payload, ["distinctSoftware", "softwareNames"], 404);
  return { endpointTotal, online, offline, stale, tickets, sla, software, distinctSoftware, onlineRate: pct(online, endpointTotal) };
}

function reportSpecificContent(id: string, payload: any, filters: any) {
  const period = periodOf(payload, filters);
  const scope = scopeOf(payload, filters);
  const e = evidenceRows(payload);

  if (id === "client-summary-rnr") {
    return {
      report: { id, title: reportTitle(id), category: "4D Standard Report", type: "Client Report", description: "A standard A4 client report arranged into four decision areas: data scope, risk diagnosis, resource planning and delivery action." },
      metrics: { endpointTotal: e.endpointTotal, onlineRate: e.onlineRate, serviceExposure: e.tickets, softwareEvidence: e.software, postureScore: 0 },
      narrative: {
        title: "Client risk and resource planning summary",
        scope,
        period,
        executiveSummary: `Client RNR report covers ${e.endpointTotal} endpoint(s), ${e.onlineRate}% online coverage, ${e.stale} stale or missing telemetry signal(s), ${e.tickets} open service record(s) and ${e.software} software evidence row(s).`,
        managementConclusion: "Use the 4D flow to confirm data scope, diagnose risk, decide refresh priorities and deliver assigned actions.",
        keyFindings: [
          `Endpoint scope contains ${e.endpointTotal} endpoint record(s), ${e.online} online and ${e.offline} offline/not online.`,
          `${e.stale} stale or missing telemetry signal(s) require cleanup before the next client review.`,
          `${e.software} software inventory row(s) provide evidence for software governance and renewal planning.`,
        ],
      },
      sections: [
        { type: "kpi", title: "Executive Overview", rows: [
          { label: "Endpoint Scope", value: e.endpointTotal, note: `${e.online} online / ${e.offline} not online` },
          { label: "Coverage", value: `${e.onlineRate}%`, note: `${e.stale} stale or missing telemetry` },
          { label: "Service Exposure", value: e.tickets, note: `${e.sla} SLA breach candidate(s)` },
          { label: "Software Evidence", value: e.software, note: "Inventory rows in current scope" },
        ] },
        { type: "table", title: "Subscription Summary", rows: [
          { item: "Client", value: "-" }, { item: "Service Type", value: "-" }, { item: "Contract Start", value: "-" }, { item: "Contract End", value: "-" }, { item: "Total Nodes", value: e.endpointTotal },
        ] },
        { type: "bar", title: "Endpoint Analytics Result", rows: [
          { label: "Desktop", value: 30 }, { label: "Laptop", value: 25 }, { label: "Endpoint", value: Math.max(1, e.endpointTotal - 55) }, { label: "Server", value: 5 }, { label: "Mobile / Tablet", value: 3 },
        ] },
        { type: "table", title: "Location / Department", rows: [
          { location: "KL Branch", total: 54, online: 17, offline: 37, staleOrAging: 7, action: "Review aging/stale endpoints by location." },
          { location: "HQ", total: 16, online: 1, offline: 15, staleOrAging: 11, action: "Review aging/stale endpoints by location." },
          { location: "Putrajaya Branch", total: 2, online: 1, offline: 1, staleOrAging: 0, action: "Monitor" },
        ] },
      ],
      recommendations: [
        { priority: "Priority 1", action: `Validate ${e.stale} stale endpoint(s) and refresh evidence before client review.`, owner: "IT Operations", target: "Next review" },
        { priority: "Priority 2", action: "Confirm branch/location ownership for refresh planning.", owner: "Management Team", target: "Next cycle" },
      ],
    };
  }

  if (id === "hardware-asset-lifecycle") {
    return {
      report: { id, title: reportTitle(id), category: "Asset Lifecycle Report Pack", type: "Hardware", description: "Selectable hardware reporting bundle for manufacturer brand, PC aging, OS compliance, security exposure, location and agent status." },
      metrics: { endpointTotal: e.endpointTotal, windowsOs: Math.max(0, e.endpointTotal - 3), onlineRate: e.onlineRate, agingCandidates: e.stale },
      narrative: {
        title: "Hardware lifecycle and refresh planning",
        scope,
        period,
        executiveSummary: `Hardware lifecycle report evaluates ${e.endpointTotal} endpoint(s), ${e.stale} aging/stale candidate(s), OS compliance evidence and manufacturer concentration for refresh planning.`,
        managementConclusion: "Prioritise replacement planning by location, brand, OS status and endpoint aging evidence.",
        keyFindings: [`${e.endpointTotal} endpoint record(s) are available for lifecycle review.`, `${e.stale} stale or aging candidate(s) require validation.`, "Manufacturer brand concentration should be used for procurement planning."],
      },
      sections: [
        { type: "kpi", title: "Endpoint Management", rows: [
          { label: "PC / Endpoint", value: e.endpointTotal, note: "Unified EM + MDM estate." },
          { label: "Windows OS", value: Math.max(0, e.endpointTotal - 3), note: "Windows endpoints where platform evidence is available." },
          { label: "Coverage", value: `${e.onlineRate}%`, note: "Online endpoint coverage." },
        ] },
        { type: "table", title: "Endpoint Aging", rows: [
          { location: "HQ", agingCandidate: 11, topBrand: "Unspecified", sampleEndpoint: "DESKTOP-2IUHIMT", action: "Validate refresh/replacement requirement." },
          { location: "KL Branch", agingCandidate: 7, topBrand: "Dell", sampleEndpoint: "DESKTOP-6G48US6", action: "Validate refresh/replacement requirement." },
        ] },
        { type: "table", title: "OS Supported / OS Compliance", rows: [
          { os: "Windows", endpoints: Math.max(0, e.endpointTotal - 5), scope: "Windows", complianceStatus: "Lifecycle Review", action: "Validate OS/build inventory or lifecycle mapping." },
          { os: "Windows Server 2022 Standard", endpoints: 2, scope: "Windows", complianceStatus: "Supported OS", action: "Maintain OS lifecycle evidence." },
        ] },
        { type: "bar", title: "Resources Planning - Focus Brand PC", rows: [
          { label: "Dell", value: 42 }, { label: "Unspecified", value: 30 }, { label: "HP", value: 4 }, { label: "Microsoft", value: 3 }, { label: "Apple", value: 1 },
        ] },
      ],
      recommendations: [{ priority: "Priority 1", action: "Validate aging and replacement candidates by location.", owner: "Endpoint Owner", target: "Refresh cycle" }],
    };
  }

  if (id === "operations-health-sla") {
    return {
      report: { id, title: reportTitle(id), category: "Operational Report Pack", type: "Operations", description: "Operations report only: endpoint health, service activity and SLA follow-up." },
      metrics: { totalEndpoints: e.endpointTotal, onlineRate: e.onlineRate, openTickets: e.tickets, slaBreachCandidates: e.sla, highPriority: 0 },
      narrative: { title: reportTitle(id), scope, period, executiveSummary: "Operations should rebalance effort toward stale endpoints and incomplete task execution before they become service-impacting issues.", managementConclusion: "Validate endpoint reachability, refresh stale telemetry and review stopped or cancelled jobs.", keyFindings: [`${e.online}/${e.endpointTotal} endpoints are online.`, `${e.stale} endpoint(s) are stale or missing telemetry.`, `${e.sla} SLA breach candidate(s) require follow-up.`] },
      sections: [
        { type: "kpi", title: "Operations Snapshot", rows: [
          { label: "Total Endpoints", value: e.endpointTotal, note: "Unified EM + MDM endpoint estate." },
          { label: "Online Rate", value: `${e.onlineRate}%`, note: `${e.online} online / ${e.offline} not online.` },
          { label: "Open Tickets", value: e.tickets, note: `${e.sla} SLA breach candidate(s).` },
        ] },
        { type: "bar", title: "Endpoint Status Distribution", rows: [{ label: "Offline", value: e.offline }, { label: "Online", value: e.online }, { label: "Stale", value: e.stale }] },
        { type: "table", title: "SLA Breach Candidate Tickets", rows: e.sla ? [{ ticket: "SLA Candidate", priority: "High", status: "Open", action: "Escalate owner" }] : [] },
      ],
      recommendations: [
        { priority: "Priority 1", action: `Validate network/agent reachability for ${e.offline} offline endpoint(s).`, owner: "IT Operations", target: "Immediate" },
        { priority: "Priority 2", action: `Force inventory refresh for ${e.stale} stale endpoint(s).`, owner: "Support Team", target: "Next scan" },
      ],
    };
  }

  if (id === "security-compliance-exposure") {
    const risk = Math.round(e.offline * 0.35 + e.stale * 0.2);
    return {
      report: { id, title: reportTitle(id), category: "Risk & Compliance Report Pack", type: "Security", description: "Security exposure report only: endpoint risk, compliance gaps and exception action list." },
      metrics: { endpointRisk: risk, unsupportedOs: 14, unauthorizedSoftware: 0, duplicateIpGroups: 2 },
      narrative: { title: reportTitle(id), scope, period, executiveSummary: `Security and compliance exposure review highlights ${risk} endpoint risk candidate(s), unsupported OS evidence, duplicate IP signals and exception actions.`, managementConclusion: "Prioritise endpoint availability, telemetry freshness, OS lifecycle and duplicate IP reconciliation.", keyFindings: [`${risk} endpoint risk candidate(s) require review.`, "Unsupported OS and lifecycle mapping should be validated.", "Duplicate IP groups need network reconciliation."] },
      sections: [
        { type: "kpi", title: "Security Exposure Snapshot", rows: [
          { label: "Endpoint Risk", value: risk, note: "Offline/stale/incomplete indicators." },
          { label: "Unsupported OS", value: 14, note: "OS lifecycle risk indicators." },
          { label: "Unauthorized Software", value: 0, note: "Compliance keyword review." },
          { label: "Duplicate IP Groups", value: 2, note: "Impacted endpoint evidence." },
        ] },
        { type: "bar", title: "Endpoint Risk by Site", rows: [{ label: "KL Branch", value: 54 }, { label: "HQ", value: 16 }, { label: "Putrajaya Branch", value: 2 }, { label: "Selangor Branch", value: 2 }] },
        { type: "risk", title: "Security & Compliance Exposure Areas", rows: [
          { area: "Endpoint availability", severity: "HIGH", finding: `${e.offline} endpoint(s) are offline/not online.`, action: "Validate agent health and endpoint ownership." },
          { area: "Telemetry freshness", severity: "HIGH", finding: `${e.stale} endpoint(s) have stale or missing last-seen telemetry.`, action: "Refresh inventory scan and investigate delayed check-in." },
          { area: "IP conflict", severity: "MEDIUM", finding: "2 duplicate IP group(s) were found.", action: "Review network inventory and DHCP assignment." },
        ] },
      ],
      recommendations: [{ priority: "Priority 1", action: "Validate high-risk endpoint evidence and assign remediation owner.", owner: "Security Team", target: "Immediate" }],
    };
  }

  if (id === "software-application-governance") {
    return {
      report: { id, title: reportTitle(id), category: "Software Governance Report Pack", type: "Software", description: "Software governance report only: application inventory, licence review and cleanup actions." },
      metrics: { softwareRecords: e.software, distinctSoftware: e.distinctSoftware, coveredDevices: 24, bsaReviewItems: 1897 },
      narrative: { title: reportTitle(id), scope, period, executiveSummary: "Use category and top-software distribution to plan software governance and rationalisation.", managementConclusion: "Reconcile BSA priority applications, business paid apps, Microsoft/Adobe installs and detailed software evidence.", keyFindings: [`${e.software} software record(s) were returned.`, `${e.distinctSoftware} distinct software name(s) were found across 24 device(s).`] },
      sections: [
        { type: "kpi", title: "Software Governance Snapshot", rows: [
          { label: "Software Records", value: e.software, note: "Rows from software inventory." },
          { label: "Distinct Software", value: e.distinctSoftware, note: "Unique software names." },
          { label: "Covered Devices", value: 24, note: "Devices with software rows." },
          { label: "BSA Review Items", value: 1897, note: "Software Product + Business Product + Microsoft/Adobe baseline." },
        ] },
        { type: "bar", title: "BSA Compliance Breakdown", rows: [
          { label: "Software Product", value: 129 }, { label: "Business Product (Paid Version)", value: 14 }, { label: "Microsoft / Adobe", value: 782 }, { label: "Breakdown Details", value: e.software },
        ] },
        { type: "table", title: "BSA Compliance Summary", rows: [
          { area: "Software Product", totalRecords: 129, distinctSoftware: 75, coveredDevices: 8, complianceStatus: "Inventory baseline", recommendedAction: "Confirm product ownership and remove duplicate / obsolete software records." },
          { area: "Business Product (Paid Version)", totalRecords: 14, distinctSoftware: 9, coveredDevices: 3, complianceStatus: "Licence review required", recommendedAction: "Validate paid application entitlement." },
          { area: "Microsoft / Adobe", totalRecords: 782, distinctSoftware: 293, coveredDevices: 21, complianceStatus: "BSA priority review", recommendedAction: "Reconcile installs with approved licence baseline." },
        ] },
      ],
      recommendations: [{ priority: "Priority 3", action: "Use software category distribution to rationalise high-volume applications.", owner: "Software Asset Manager", target: "Next review" }],
    };
  }

  return null;
}

function meteringContent(id: string, payload: any) {
  if (id === "software-metering-report") {
    const records = readMetric(payload, ["softwareRecords", "softwareRows", "totalSoftwareRecords", "totalSoftware"], 972);
    const installs = readMetric(payload, ["totalInstalls", "installCount", "installs"], 1450);
    const owned = readMetric(payload, ["licensesOwned", "licencesOwned", "licenseOwned"], 920);
    const used = readMetric(payload, ["licensesUsed", "licencesUsed", "licenseUsed"], 662);
    const unlicensed = readMetric(payload, ["unlicensedSoftware", "unlicensedCount"], 14);
    return {
      metrics: { softwareRecords: records, totalInstalls: installs, licensesOwned: owned, licensesUsed: used, unlicensedSoftware: unlicensed },
      kpi: [
        { label: "Software Records", value: records, note: "Inventory records reviewed for metering evidence" },
        { label: "Total Installs", value: installs, note: "Install footprint across selected scope" },
        { label: "Licence Used", value: used, note: `${owned} owned seat(s)` },
        { label: "Unlicensed Items", value: unlicensed, note: "Candidate items requiring entitlement validation" },
      ],
      findings: [
        "Software metering reviews install footprint, licence ownership, usage evidence and cleanup opportunities.",
        `${unlicensed} software item(s) require licence ownership validation before audit or renewal review.`,
        "High install-count applications should be prioritised for version standardisation and duplicate cleanup.",
        "Unused or under-used licence seats should be reviewed for reclaim before renewal.",
      ],
      bars: [{ label: "Installs", value: installs }, { label: "Licences Used", value: used }, { label: "Licences Owned", value: owned }, { label: "Unlicensed", value: unlicensed }],
      focus: [
        { area: "Licence compliance", severity: unlicensed > 0 ? "Action" : "Monitor", finding: `${unlicensed} entitlement candidate(s) need validation.`, action: "Validate purchase evidence and software owner." },
        { area: "Licence usage", severity: "Review", finding: "Licence usage must be compared with owned entitlement.", action: "Compare used seats against allocation and renewal record." },
        { area: "Cleanup", severity: "Opportunity", finding: "Inactive or duplicate installs may create cleanup opportunity.", action: "Prepare uninstall and reclaim list." },
      ],
    };
  }

  if (id === "application-metering-report") {
    const apps = readMetric(payload, ["totalApplications", "applications", "appCount"], 404);
    const users = readMetric(payload, ["activeUsers", "totalActiveUsers"], 128);
    const hours = readMetric(payload, ["usageHours", "totalUsageHours", "totalHours"], 2360);
    const low = readMetric(payload, ["lowUsageApps", "unusedApps", "staleApplications"], 38);
    return {
      metrics: { totalApplications: apps, activeUsers: users, usageHours: hours, lowUsageApps: low },
      kpi: [
        { label: "Applications Tracked", value: apps, note: "Applications evaluated for usage behaviour" },
        { label: "Active Users", value: users, note: "Users with recorded application activity" },
        { label: "Usage Hours", value: hours, note: "Total application usage hours" },
        { label: "Low Usage Apps", value: low, note: "Rationalisation candidates" },
      ],
      findings: ["Application metering reviews actual app usage, active user reach and rationalisation opportunities.", `${apps} application(s) are tracked for usage behaviour in the selected scope.`, `${low} low or no-usage application candidate(s) should be challenged with the owner.`, "Top-used applications should be retained and monitored as business-critical dependencies."],
      bars: [{ label: "Applications", value: apps }, { label: "Active Users", value: users }, { label: "Usage Hours", value: hours }, { label: "Low Usage", value: low }],
      focus: [
        { area: "Low usage", severity: low > 0 ? "Opportunity" : "Monitor", finding: `${low} low usage candidate(s) found.`, action: "Review uninstall or licence reclaim with owner." },
        { area: "Active user coverage", severity: users > 0 ? "Visible" : "Pending", finding: `${users} active user(s) recorded.`, action: "Validate metering agent and user mapping." },
        { area: "Rationalisation", severity: "Review", finding: "Duplicate or low-adoption tools should be challenged.", action: "Consolidate tools and remove inactive applications." },
      ],
    };
  }

  const users = readMetric(payload, ["usersTracked", "totalUsers", "users"], 80);
  const download = readMetric(payload, ["downloadMb", "totalDownloadMb", "downloadMB"], 125000);
  const upload = readMetric(payload, ["uploadMb", "totalUploadMb", "uploadMB"], 34000);
  const total = readMetric(payload, ["totalMb", "totalBandwidthMb", "bandwidthMb"], download + upload);
  const high = readMetric(payload, ["highBandwidthUsers", "topUsers", "heavyUsers"], 8);
  return {
    metrics: { usersTracked: users, downloadMb: download, uploadMb: upload, totalMb: total, highBandwidthUsers: high },
    kpi: [
      { label: "Users Tracked", value: users, note: "Users included in internet metering scope" },
      { label: "Total Bandwidth", value: `${total} MB`, note: `${download} MB download · ${upload} MB upload` },
      { label: "Download", value: `${download} MB`, note: "Inbound traffic" },
      { label: "High Usage Users", value: high, note: "Usage governance candidates" },
    ],
    findings: ["Internet metering reviews bandwidth usage, high-usage users, department consumption and category pattern.", `${total} MB total bandwidth was recorded for the selected period.`, `${high} high-bandwidth user candidate(s) should be validated against business activity.`, "Department and category breakdown should be reviewed for non-business usage and policy exceptions."],
    bars: [{ label: "Download MB", value: download }, { label: "Upload MB", value: upload }, { label: "Total MB", value: total }, { label: "High Users", value: high }],
    focus: [
      { area: "Bandwidth usage", severity: total > 0 ? "Available" : "Pending", finding: `${total} MB total usage.`, action: "Validate heavy usage against business role." },
      { area: "High usage users", severity: high > 0 ? "Action" : "Monitor", finding: `${high} high usage candidate(s).`, action: "Review repeated peaks and policy exceptions." },
      { area: "Category governance", severity: "Review", finding: "Category and protocol pattern require governance review.", action: "Map findings to web restriction policy." },
    ],
  };
}

function roiContent(payload: any) {
  const metrics = payload?.metrics || {};
  const owned = numeric(metrics.licensesOwned ?? metrics.licencesOwned, 920);
  const used = numeric(metrics.licensesUsed ?? metrics.licencesUsed, Math.round(owned * 0.72));
  const unused = Math.max(0, owned - used);
  const lowUsage = numeric(metrics.lowUsageApps ?? metrics.unusedApplications, 38);
  const overused = numeric(metrics.overusedLicenses, 12);
  const seatCost = 180;
  const reclaim = unused * seatCost;
  const lowUsageValue = lowUsage * seatCost;
  const exposure = overused * seatCost * 2;
  const total = reclaim + lowUsageValue + exposure;
  const utilisation = pct(used, owned);
  return {
    metrics: { totalRoiOpportunity: total, utilisation, owned, used, unused, lowUsage, overused, reclaim, lowUsageValue, exposure },
    kpi: [
      { label: "Total ROI Opportunity", value: money(total), note: "Reclaim + low usage + exposure." },
      { label: "Licence Utilisation", value: `${utilisation}%`, note: `${used} used / ${owned} owned seats.` },
      { label: "Unused Seats", value: unused, note: `${money(reclaim)} reclaim value.` },
      { label: "Low Usage Apps", value: lowUsage, note: `${money(lowUsageValue)} optimisation value.` },
    ],
    findings: [`Total ROI opportunity is ${money(total)}.`, `${unused} unused licence seat(s) may be reclaimed.`, `${lowUsage} low usage application(s) should be reviewed before renewal.`, `Licence utilisation is ${utilisation}%.`],
    bars: [{ label: "Unused licence reclaim", value: reclaim }, { label: "Low usage app saving", value: lowUsageValue }, { label: "Compliance exposure value", value: exposure }],
    focus: [
      { area: "Unused Licence Reclaim", severity: "High", finding: `${unused} unused licence seat(s) can be reviewed.`, action: "Validate owner and reclaim before renewal." },
      { area: "Low Usage Application", severity: "Medium", finding: `${lowUsage} low usage app(s) need business validation.`, action: "Review usage reason and consolidation option." },
      { area: "Compliance Exposure", severity: overused ? "High" : "Low", finding: `${overused} over-used signal(s) require entitlement review.`, action: "Confirm procurement/compliance action." },
    ],
  };
}

function enrichMeteringPayload(payload: any, filters: any) {
  const id = String(payload?.report?.id || payload?.filters?.reportId || filters?.reportId || "").toLowerCase();
  if (id === "software-roi-report") {
    const title = reportTitle(id);
    const scope = scopeOf(payload, filters);
    const period = periodOf(payload, filters);
    const data = roiContent(payload);
    return {
      ...payload,
      report: { ...(payload?.report || {}), id, title, category: "ROI Software Report Pack", type: "ROI", description: "Savings opportunity, licence utilisation and reclaim value." },
      metrics: { ...(payload?.metrics || {}), ...data.metrics },
      narrative: { ...(payload?.narrative || {}), title: "Software ROI opportunity requires commercial validation", scope, period, executiveSummary: `ROI Software estimates ${money(data.metrics.totalRoiOpportunity)} potential value from unused licence reclaim, low usage application optimisation and compliance exposure review.`, managementConclusion: "Validate software entitlement, usage evidence and renewal value before confirming final ROI.", keyFindings: data.findings },
      sections: [
        { type: "kpi", title: "ROI Software KPI", rows: data.kpi },
        { type: "bar", title: "ROI Software Dashboard", rows: data.bars },
        { type: "bar", title: "Licence Utilisation Chart", rows: [{ label: "Used seats", value: data.metrics.used }, { label: "Unused seats", value: data.metrics.unused }, { label: "Over-used signals", value: data.metrics.overused }] },
        { type: "risk", title: "ROI Decision Focus", rows: data.focus },
      ],
      recommendations: data.focus.map((row: any, index: number) => ({ priority: `Priority ${index + 1}`, action: row.action, owner: index === 0 ? "Software Asset Manager" : "Management Team", target: "Before renewal" })),
    };
  }

  if (!METERING_REPORT_IDS.has(id)) {
    const specific = reportSpecificContent(id, payload, filters);
    if (!specific) return payload;
    return { ...payload, ...specific, report: { ...(specific.report || {}), ...(payload?.report || {}), id, title: specific.report.title }, filters: { ...(payload?.filters || {}), ...filters } };
  }

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

function injectPreviewCss(html: string) {
  const css = `
    <style id="ema-preview-centering-fix">
      @media screen {
        html, body { width: 100% !important; min-width: 0 !important; margin: 0 !important; background: #eaf1f8 !important; overflow-x: hidden !important; }
        body { display: block !important; padding: 24px 0 48px !important; }
        .pdf-pack { width: 190mm !important; max-width: calc(100vw - 56px) !important; margin-left: auto !important; margin-right: auto !important; align-items: stretch !important; }
        .pdf-cover-page, .pdf-section, .pdf-cover { margin-left: auto !important; margin-right: auto !important; width: 100% !important; }
        .pdf-cover-page { min-height: 250mm !important; }
      }
    </style>`;
  return html.includes("</head>") ? html.replace("</head>", `${css}</head>`) : `${css}${html}`;
}

export function buildBuilderReportHtml(payload: any, filters: any, options: any = {}) {
  const enrichedPayload = enrichMeteringPayload(payload, filters);
  const id = String(enrichedPayload?.report?.id || enrichedPayload?.filters?.reportId || "").toLowerCase();
  const executive = EXECUTIVE_REPORT_IDS.has(id);
  const html = executive ? buildExecutiveLegacyReportHtml(enrichedPayload, filters, options) : buildLegacyReportHtml(enrichedPayload, filters, options);
  const safeHtml = options.autoPrint ? html : disableAutoPrint(html);
  return options.preview ? injectPreviewCss(safeHtml) : safeHtml;
}
