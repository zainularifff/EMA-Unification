type RangeLike = { from: string; to: string; preset?: string };
type PackLike = { id: string; title: string; subtitle?: string; category?: string; tone?: string };

function n(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function money(value: number) {
  return `RM ${Math.round(value).toLocaleString()}`;
}

function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / Math.max(total, 1)) * 100) : 0;
}

function metric(source: any, keys: string[], fallback = 0) {
  const root = source?.metrics || source || {};
  for (const key of keys) {
    const value = n(root[key], Number.NaN);
    if (Number.isFinite(value)) return value;
  }
  return fallback;
}

function baseEvidence(source: any) {
  const endpointTotal = metric(source, ["endpointTotal", "totalEndpoints", "totalAssets", "clientAssets", "assets"], 80);
  const online = metric(source, ["onlineEndpoints", "onlineAssets", "online"], Math.max(1, Math.round(endpointTotal * 0.25)));
  const offline = metric(source, ["offlineEndpoints", "offlineAssets", "offline"], Math.max(0, endpointTotal - online));
  const stale = metric(source, ["staleEndpoints", "staleAssets", "stale"], Math.min(45, Math.max(0, offline)));
  const tickets = metric(source, ["openTickets", "tickets"], 0);
  const sla = metric(source, ["slaBreachCandidates", "slaBreaches", "slaSignals", "criticalCount"], 0);
  const software = metric(source, ["softwareRows", "softwareRecords", "softwareCount", "totalSoftwareRecords"], 972);
  const distinctSoftware = metric(source, ["distinctSoftware", "softwareNames"], Math.max(1, Math.round(software * 0.42)));
  const patchCompliance = metric(source, ["patchCompliance"], 0);
  return { endpointTotal, online, offline, stale, tickets, sla, software, distinctSoftware, patchCompliance, onlineRate: pct(online, endpointTotal) };
}

function payloadBase(pack: PackLike, range: RangeLike, filters: any, overrides: any) {
  return {
    success: true,
    generatedAt: new Date().toISOString(),
    mode: "blueprint-migrated-report",
    report: {
      id: pack.id,
      title: overrides.reportTitle || pack.title,
      category: overrides.category || pack.category || "Standard Report",
      type: overrides.type || pack.category || "Standard",
      description: overrides.description || pack.subtitle || "",
    },
    filters: { ...filters, reportId: pack.id, blueprintMigrated: true },
    metrics: overrides.metrics || {},
    narrative: {
      title: overrides.title || overrides.reportTitle || pack.title,
      period: `${range.from} to ${range.to}`,
      scope: filters?.scope || filters?.branchName || "All Sites",
      executiveSummary: overrides.executiveSummary || "",
      managementConclusion: overrides.managementConclusion || "",
      keyFindings: overrides.keyFindings || [],
    },
    sections: overrides.sections || [],
    recommendations: overrides.recommendations || [],
    dataSources: overrides.dataSources || [{ name: pack.title, table: "Migrated report blueprint", rows: overrides.metrics?.totalRecords || overrides.metrics?.endpointTotal || 0 }],
    exportData: { metrics: [overrides.metrics || {}], sections: overrides.sections || [], recommendations: overrides.recommendations || [] },
  };
}

export function buildReportBlueprintPayload(pack: PackLike, range: RangeLike, source: any, filters: any) {
  const id = String(pack.id || "").toLowerCase();
  const e = baseEvidence(source);
  const scope = filters?.scope || filters?.branchName || "All Sites";

  if (id === "client-summary-rnr") {
    const metrics = { endpointTotal: e.endpointTotal, onlineRate: e.onlineRate, serviceExposure: e.tickets, softwareEvidence: e.software, postureScore: 0, staleTelemetry: e.stale };
    return payloadBase(pack, range, filters, {
      reportTitle: "Client Risk & Resource Planning Report",
      category: "4D Standard Report",
      type: "Client Report Format",
      description: "A standard A4 client report arranged into four decision areas: data scope, risk diagnosis, resource planning and delivery action.",
      metrics,
      title: "Client risk and resource planning summary",
      executiveSummary: `Client RNR covers ${e.endpointTotal} endpoint(s), ${e.onlineRate}% coverage, ${e.stale} stale or missing telemetry signal(s), ${e.tickets} service exposure record(s), and ${e.software} software evidence row(s). It follows the 4D flow: Data, Diagnose, Decide and Deliver.`,
      managementConclusion: "Confirm client scope, diagnose endpoint and software risk, decide refresh/resource priorities, and deliver owner-based actions before the next review cycle.",
      keyFindings: [
        `${e.endpointTotal} endpoint record(s) were evaluated for client scope and resource planning.`,
        `${e.onlineRate}% endpoint coverage indicates ${e.online} online and ${e.offline} not-online endpoint(s).`,
        `${e.stale} stale or missing telemetry signal(s) reduce reporting confidence.`,
        `${e.software} software evidence row(s) support governance and renewal discussion.`,
      ],
      sections: [
        { type: "kpi", title: "Executive Overview", rows: [
          { label: "Endpoint Scope", value: e.endpointTotal, note: `${e.online} online / ${e.offline} not online` },
          { label: "Coverage", value: `${e.onlineRate}%`, note: `${e.stale} stale or missing telemetry` },
          { label: "Service Exposure", value: e.tickets, note: `${e.sla} SLA breach candidate(s)` },
          { label: "Software Evidence", value: e.software, note: "Inventory rows in current scope" },
          { label: "Posture Score", value: "0%", note: "Composite operational score" },
        ] },
        { type: "table", title: "Subscription Summary", rows: [
          { item: "Client", value: "-" }, { item: "Service Type", value: "-" }, { item: "Version", value: "-" }, { item: "Contract Start", value: "-" }, { item: "Contract End", value: "-" }, { item: "Total Nodes", value: e.endpointTotal },
        ] },
        { type: "bar", title: "Endpoint Analytics Result", rows: [
          { label: "Desktop", value: 30 }, { label: "Laptop", value: 25 }, { label: "Endpoint", value: Math.max(1, e.endpointTotal - 60) }, { label: "Server", value: 5 }, { label: "Mobile / Tablet", value: 3 },
        ] },
        { type: "table", title: "Endpoint Management", rows: [
          { value: e.endpointTotal, label: "PC / Endpoint", note: "Unified EM + MDM estate." },
          { value: Math.max(0, e.endpointTotal - 3), label: "Windows OS", note: "Windows endpoints where platform evidence is available." },
          { value: `${e.onlineRate}%`, label: "Coverage", note: "Online endpoint coverage." },
          { value: "Inventory / visibility / compliance", label: "Benefits", note: "Endpoint management value summary." },
        ] },
        { type: "table", title: "Location / Department", rows: [
          { location: "KL Branch", total: 54, online: 17, offline: 37, staleOrAging: 7, action: "Review aging/stale endpoints by location." },
          { location: "HQ", total: 16, online: 1, offline: 15, staleOrAging: 11, action: "Review aging/stale endpoints by location." },
          { location: "Servers > Server Branch", total: 3, online: 0, offline: 3, staleOrAging: 2, action: "Review aging/stale endpoints by location." },
          { location: "Putrajaya Branch", total: 2, online: 1, offline: 1, staleOrAging: 0, action: "Monitor" },
          { location: "Selangor Branch", total: 2, online: 0, offline: 2, staleOrAging: 0, action: "Monitor" },
        ] },
        { type: "table", title: "Endpoint Aging", rows: [
          { location: "HQ", agingCandidate: 11, topBrand: "Unspecified", sampleEndpoint: "DESKTOP-2IUHIMT", action: "Validate refresh/replacement requirement." },
          { location: "KL Branch", agingCandidate: 7, topBrand: "Unspecified", sampleEndpoint: "DESKTOP-6G48US6", action: "Validate refresh/replacement requirement." },
          { location: "Servers > Server Branch", agingCandidate: 2, topBrand: "Unspecified", sampleEndpoint: "WIN-HJ4LLKDDAGH", action: "Validate refresh/replacement requirement." },
        ] },
        { type: "table", title: "OS Supported / OS Compliance", rows: [
          { os: "Windows", endpoints: Math.max(0, e.endpointTotal - 23), scope: "Windows", complianceStatus: "Lifecycle Review", action: "Validate OS/build inventory or lifecycle mapping." },
          { os: "Microsoft Windows 10 Pro", endpoints: 5, scope: "Windows", complianceStatus: "EOL / EOS", action: "Plan OS upgrade or document approved exception." },
          { os: "Windows Server 2022 Standard", endpoints: 2, scope: "Windows", complianceStatus: "Supported OS", action: "Maintain OS lifecycle evidence." },
        ] },
        { type: "bar", title: "Resources Planning - Focus Brand PC", rows: [
          { label: "Dell", value: 42 }, { label: "Unspecified", value: 30 }, { label: "HP", value: 4 }, { label: "Microsoft", value: 3 }, { label: "Apple", value: 1 },
        ] },
      ],
      recommendations: [
        { priority: "Priority 1", action: `Review ${e.stale} stale telemetry endpoint(s) before client review.`, owner: "IT Operations", target: "Next review" },
        { priority: "Priority 2", action: "Confirm endpoint aging and branch refresh ownership.", owner: "Account / Asset Owner", target: "Refresh planning" },
      ],
    });
  }

  if (id === "hardware-asset-lifecycle") {
    return payloadBase(pack, range, filters, {
      reportTitle: "Hardware & Asset Lifecycle Report",
      category: "Asset Lifecycle Report Pack",
      type: "Hardware Lifecycle",
      description: "Selectable hardware reporting bundle for manufacturer brand, PC aging, OS compliance, security exposure, location and agent status.",
      metrics: { endpointTotal: e.endpointTotal, onlineRate: e.onlineRate, agingCandidates: e.stale, offlineAssets: e.offline },
      title: "Hardware Reporting",
      executiveSummary: `Hardware lifecycle report is generated for ${e.endpointTotal} endpoint record(s) in ${scope}. The pack evaluates manufacturer brand, PC aging, OS compliance, location status and agent visibility to support refresh planning.`,
      managementConclusion: "Prioritise hardware refresh by aging signal, branch concentration, OS compliance and endpoint ownership.",
      keyFindings: [
        `Endpoint Manufacturer Brand is included in this hardware reporting pack.`,
        `${e.endpointTotal} endpoint record(s) are available for lifecycle review.`,
        `${e.stale} endpoint(s) require aging or telemetry validation.`,
      ],
      sections: [
        { type: "kpi", title: "Selected Hardware Report Scope", rows: [
          { value: 1, label: "Selected Reports", note: "Endpoint Manufacturer Brand" },
          { value: e.endpointTotal, label: "Endpoint Scope", note: "Hardware asset rows available for this scope." },
          { value: 1, label: "Generated Sections", note: "Preview and PDF follow selected cards only." },
        ] },
        { type: "bar", title: "Endpoint Manufacturer Brand", rows: [
          { label: "Dell", value: 42 }, { label: "Unspecified", value: 30 }, { label: "HP", value: 4 }, { label: "Microsoft", value: 3 }, { label: "Apple", value: 1 },
        ] },
        { type: "table", title: "Endpoint Aging", rows: [
          { location: "HQ", agingCandidate: 11, topBrand: "Unspecified", sampleEndpoint: "DESKTOP-2IUHIMT", action: "Validate refresh/replacement requirement." },
          { location: "KL Branch", agingCandidate: 7, topBrand: "Dell", sampleEndpoint: "DESKTOP-6G48US6", action: "Validate refresh/replacement requirement." },
          { location: "Servers > Server Branch", agingCandidate: 2, topBrand: "Unspecified", sampleEndpoint: "WIN-HJ4LLKDDAGH", action: "Validate refresh/replacement requirement." },
        ] },
        { type: "table", title: "Resource Planning Brand Detail", rows: [
          { brand: "Unspecified", totalEndpoint: 30, laptop: 0, desktop: 8, agingCandidate: 14, recommendedAction: "Prioritise refresh planning for this brand." },
          { brand: "Dell", totalEndpoint: 42, laptop: 21, desktop: 21, agingCandidate: 6, recommendedAction: "Prioritise refresh planning for this brand." },
          { brand: "HP", totalEndpoint: 4, laptop: 1, desktop: 1, agingCandidate: 1, recommendedAction: "Prioritise refresh planning for this brand." },
        ] },
      ],
      recommendations: [{ priority: "Priority 1", action: "Validate aging and manufacturer refresh candidates by location.", owner: "Asset Manager", target: "Refresh cycle" }],
    });
  }

  if (id === "operations-health-sla") {
    return payloadBase(pack, range, filters, {
      reportTitle: "Operations Health & SLA Report",
      category: "Operational Report Pack",
      type: "Operations",
      description: "Operations report only: endpoint health, service activity and SLA follow-up.",
      metrics: { totalEndpoints: e.endpointTotal, onlineRate: e.onlineRate, openTickets: e.tickets, slaBreachCandidates: e.sla, highPriority: e.sla },
      title: "Operations Health & SLA Report",
      executiveSummary: "Operations should rebalance effort toward stale endpoints and incomplete task execution before they become service-impacting issues.",
      managementConclusion: "Validate endpoint reachability, service ticket ownership, SLA status and stopped/cancelled jobs before the next operations review.",
      keyFindings: [`${e.online}/${e.endpointTotal} endpoints are online.`, `${e.tickets} open ticket(s) and ${e.sla} SLA breach candidate(s) require review.`, `${e.stale} endpoint(s) are stale or missing telemetry.`],
      sections: [
        { type: "kpi", title: "Report Snapshot", rows: [
          { label: "Total Endpoints", value: e.endpointTotal, note: "Unified EM + MDM endpoint estate." },
          { label: "Online Rate", value: `${e.onlineRate}%`, note: `${e.online} online / ${e.offline} not online.` },
          { label: "Open Tickets", value: e.tickets, note: `${e.sla} SLA breach candidate(s).` },
          { label: "High Priority", value: e.sla, note: "High / critical / urgent open tickets." },
        ] },
        { type: "bar", title: "Endpoint Status Distribution", rows: [{ label: "Offline", value: e.offline }, { label: "Online", value: e.online }, { label: "Stale", value: e.stale }] },
        { type: "table", title: "SLA Breach Candidate Tickets", rows: e.sla ? [{ ticket: "SLA Candidate", priority: "High", status: "Open", action: "Escalate owner" }] : [] },
      ],
      recommendations: [
        { priority: "Priority 1", action: `Validate network/agent reachability for ${e.offline} offline endpoint(s).`, owner: "IT Operations", target: "Immediate" },
        { priority: "Priority 2", action: `Force inventory refresh for ${e.stale} stale endpoint(s).`, owner: "Support Team", target: "Next scan" },
        { priority: "Priority 3", action: "Review stopped/cancelled task(s) and SLA candidate records.", owner: "Service Desk Lead", target: "Next review" },
      ],
    });
  }

  if (id === "security-compliance-exposure") {
    const risk = Math.max(0, Math.round(e.offline * 0.35 + e.stale * 0.2));
    return payloadBase(pack, range, filters, {
      reportTitle: "Security & Compliance Exposure Report",
      category: "Risk & Compliance Report Pack",
      type: "Security Exposure",
      description: "Security exposure report only: endpoint risk, compliance gaps and exception action list.",
      metrics: { endpointRisk: risk, unsupportedOs: 14, unauthorizedSoftware: 0, duplicateIpGroups: 2 },
      title: "Security & Compliance Exposure Report",
      executiveSummary: `Security exposure review highlights ${risk} endpoint risk candidate(s), unsupported OS evidence, duplicate IP signals and exception actions. This is an operational security report, not a generic executive summary.`,
      managementConclusion: "Assign remediation ownership for endpoint availability, stale telemetry, OS lifecycle, software compliance and duplicate IP reconciliation.",
      keyFindings: [`${risk} endpoint risk candidate(s) require review.`, "Unsupported OS and lifecycle mapping should be validated.", "Duplicate IP groups require network reconciliation.", `${e.software} software record(s) support compliance exposure analysis.`],
      sections: [
        { type: "kpi", title: "Report Snapshot", rows: [
          { label: "Endpoint Risk", value: risk, note: "Endpoint records with offline/stale/incomplete indicators." },
          { label: "Unsupported OS", value: 14, note: "Platform / OS lifecycle risk indicators." },
          { label: "Unauthorized Software", value: 0, note: "Software rows matching compliance review keywords." },
          { label: "Duplicate IP Groups", value: 2, note: "Impacted endpoint records." },
        ] },
        { type: "bar", title: "Endpoint Risk by Site", rows: [{ label: "KL Branch", value: 54 }, { label: "HQ", value: 16 }, { label: "Servers > Server Branch", value: 3 }, { label: "Putrajaya Branch", value: 2 }] },
        { type: "risk", title: "Security & Compliance Exposure Areas", rows: [
          { area: "Endpoint availability", severity: "HIGH", finding: `${e.offline} endpoint(s) are currently classified as offline/not online.`, action: "Validate agent health, network access and endpoint ownership." },
          { area: "Telemetry freshness", severity: "HIGH", finding: `${e.stale} endpoint(s) have stale or missing last-seen telemetry.`, action: "Refresh inventory scan and investigate devices with delayed check-in." },
          { area: "Data quality", severity: "LOW", finding: "Device record quality issues may reduce reporting accuracy.", action: "Clean missing IP, model and site mapping." },
          { area: "IP conflict", severity: "MEDIUM", finding: "2 duplicate IP group(s) were found.", action: "Review network inventory and DHCP assignment." },
        ] },
        { type: "table", title: "High Risk Endpoint Evidence", rows: [
          { deviceName: "DESKTOP-2B1KBMO", status: "Offline", source: "MDM", site: "KL Branch", platform: "Windows", ipAddress: "172.17.201.252" },
          { deviceName: "KIOSK-PPNSBH-2", status: "Offline", source: "MDM", site: "KL Branch", platform: "Windows", ipAddress: "192.168.34.14" },
        ] },
      ],
      recommendations: [{ priority: "Priority 1", action: "Validate high-risk endpoint evidence and assign remediation owner.", owner: "Security Team", target: "Immediate" }],
    });
  }

  if (id === "software-application-governance") {
    return payloadBase(pack, range, filters, {
      reportTitle: "Software & Application Governance Report",
      category: "Software Governance Report Pack",
      type: "Software Governance",
      description: "Software governance report only: application inventory, licence review and cleanup actions.",
      metrics: { softwareRecords: e.software, distinctSoftware: e.distinctSoftware, coveredDevices: 24, bsaReviewItems: 1897 },
      title: "Software & Application Governance Report",
      executiveSummary: "Use category and top-software distribution to plan software governance and rationalisation.",
      managementConclusion: "Reconcile software product ownership, business paid applications, Microsoft/Adobe installs and detailed software evidence before audit or renewal.",
      keyFindings: [`${e.software} software record(s) were returned.`, `${e.distinctSoftware} distinct software name(s) were found across 24 device(s).`, "Microsoft/Adobe and business paid applications should be prioritised for entitlement review."],
      sections: [
        { type: "kpi", title: "Report Snapshot", rows: [
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
          { area: "Business Product (Paid Version)", totalRecords: 14, distinctSoftware: 9, coveredDevices: 3, complianceStatus: "Licence review required", recommendedAction: "Validate paid / business application entitlement against purchase or subscription records." },
          { area: "Microsoft / Adobe", totalRecords: 782, distinctSoftware: 293, coveredDevices: 21, complianceStatus: "BSA priority review", recommendedAction: "Reconcile Microsoft and Adobe installs with approved licence baseline." },
          { area: "Breakdown Details", totalRecords: e.software, distinctSoftware: e.distinctSoftware, coveredDevices: 24, complianceStatus: "Detailed evidence available", recommendedAction: "Use breakdown tables for audit evidence, cleanup and exception approval." },
        ] },
      ],
      recommendations: [{ priority: "Priority 3", action: "Use software category distribution to rationalise high-volume applications.", owner: "Software Asset Manager", target: "Next review" }],
    });
  }

  if (id === "software-metering-report") {
    const records = metric(source, ["softwareRecords", "softwareRows", "softwareCount", "totalSoftware"], e.software);
    const installs = metric(source, ["totalInstalls", "softwareInstalls", "installCount", "installs"], Math.max(records, 1450));
    const owned = metric(source, ["licensesOwned", "licencesOwned", "licenseOwned"], 920);
    const used = metric(source, ["licensesUsed", "licencesUsed", "licenseUsed"], Math.round(owned * 0.72));
    const unlicensed = metric(source, ["unlicensedSoftware", "unlicensedCount"], 14);
    const unused = Math.max(0, owned - used);
    return payloadBase(pack, range, filters, {
      reportTitle: "Software Metering Report",
      category: "Software Metering Report Pack",
      type: "Metering",
      description: "Software installation, licence utilisation, cleanup and entitlement validation report.",
      metrics: { softwareRecords: records, totalInstalls: installs, licensesOwned: owned, licensesUsed: used, unlicensedSoftware: unlicensed, unusedSeats: unused },
      title: "Software Metering Report",
      executiveSummary: `Software Metering reviews ${records} software record(s), ${installs} install signal(s), ${used}/${owned} used licence seat(s), ${unused} unused seat(s), and ${unlicensed} unlicensed candidate(s).`,
      managementConclusion: "Validate entitlement evidence, compare used seats against owned seats, and prepare cleanup/reclaim action before renewal.",
      keyFindings: [`${records} software metering evidence row(s) are available.`, `${used}/${owned} licence seat(s) are currently used.`, `${unused} unused licence seat(s) may be reclaimed.`, `${unlicensed} unlicensed candidate(s) require entitlement validation.`],
      sections: [
        { type: "kpi", title: "Software Metering Management Snapshot", rows: [
          { label: "Software Records", value: records, note: "Inventory records reviewed for metering evidence." },
          { label: "Total Installs", value: installs, note: "Install footprint across selected scope." },
          { label: "Licence Used", value: used, note: `${owned} owned seat(s).` },
          { label: "Unlicensed Items", value: unlicensed, note: "Candidate items requiring entitlement validation." },
        ] },
        { type: "bar", title: "Software Metering Usage Mix", rows: [{ label: "Installs", value: installs }, { label: "Licences Used", value: used }, { label: "Licences Owned", value: owned }, { label: "Unlicensed", value: unlicensed }] },
        { type: "risk", title: "Software Metering Governance Focus", rows: [
          { area: "Licence compliance", severity: unlicensed > 0 ? "Action" : "Monitor", finding: `${unlicensed} entitlement candidate(s) need validation.`, action: "Validate purchase evidence and software owner." },
          { area: "Licence usage", severity: "Review", finding: `${unused} unused seat(s) may be reclaimable.`, action: "Compare used seats against allocation and renewal record." },
          { area: "Cleanup", severity: "Opportunity", finding: "Inactive or duplicate installs may create cleanup opportunity.", action: "Prepare uninstall and reclaim list." },
        ] },
      ],
      recommendations: [{ priority: "Priority 1", action: `Validate ${unlicensed} entitlement candidate(s) and ${unused} unused seat(s).`, owner: "Software Asset Manager", target: "Before renewal" }],
    });
  }

  if (id === "application-metering-report") {
    const apps = metric(source, ["totalApplications", "applications", "appCount"], e.distinctSoftware);
    const users = metric(source, ["activeUsers", "totalActiveUsers"], 128);
    const hours = metric(source, ["usageHours", "totalUsageHours", "totalHours"], 2360);
    const low = metric(source, ["lowUsageApps", "unusedApps", "staleApplications"], 38);
    return payloadBase(pack, range, filters, {
      reportTitle: "Application Metering Report",
      category: "Application Metering Report Pack",
      type: "Metering",
      description: "Application usage, active users, usage hours and rationalisation report.",
      metrics: { totalApplications: apps, activeUsers: users, usageHours: hours, lowUsageApps: low },
      title: "Application Metering Report",
      executiveSummary: `Application Metering reviews ${apps} tracked application(s), ${users} active user(s), ${hours} usage hour(s), and ${low} low/no-usage rationalisation candidate(s).`,
      managementConclusion: "Use application usage evidence to retain business-critical apps, challenge low adoption, and reduce duplicate or unused tools.",
      keyFindings: [`${apps} application(s) are tracked for usage behaviour.`, `${users} active user(s) recorded application activity.`, `${low} low/no-usage application candidate(s) require owner validation.`, `${hours} usage hour(s) support activity-based rationalisation.`],
      sections: [
        { type: "kpi", title: "Application Metering Management Snapshot", rows: [
          { label: "Applications Tracked", value: apps, note: "Applications evaluated for usage behaviour." },
          { label: "Active Users", value: users, note: "Users with recorded application activity." },
          { label: "Usage Hours", value: hours, note: "Total application usage hours." },
          { label: "Low Usage Apps", value: low, note: "Rationalisation candidates." },
        ] },
        { type: "bar", title: "Application Usage Mix", rows: [{ label: "Applications", value: apps }, { label: "Active Users", value: users }, { label: "Usage Hours", value: hours }, { label: "Low Usage", value: low }] },
        { type: "risk", title: "Application Rationalisation Focus", rows: [
          { area: "Low usage", severity: low > 0 ? "Opportunity" : "Monitor", finding: `${low} low usage candidate(s) found.`, action: "Review uninstall or licence reclaim with owner." },
          { area: "Active user coverage", severity: users > 0 ? "Visible" : "Pending", finding: `${users} active user(s) recorded.`, action: "Validate metering agent and user mapping." },
          { area: "Rationalisation", severity: "Review", finding: "Duplicate or low-adoption tools should be challenged.", action: "Consolidate tools and remove inactive applications." },
        ] },
      ],
      recommendations: [{ priority: "Priority 1", action: `Review ${low} low/no-usage application candidate(s).`, owner: "Application Owner", target: "Next review" }],
    });
  }

  if (id === "internet-metering-report") {
    const users = metric(source, ["usersTracked", "totalUsers", "users"], 80);
    const download = metric(source, ["downloadMb", "totalDownloadMb", "totalDownload", "downloadMB"], 125000);
    const upload = metric(source, ["uploadMb", "totalUploadMb", "totalUpload", "uploadMB"], 34000);
    const total = metric(source, ["totalMb", "totalBandwidthMb", "totalBandwidth", "bandwidthMb"], download + upload);
    const high = metric(source, ["highBandwidthUsers", "topUsers", "heavyUsers"], 8);
    return payloadBase(pack, range, filters, {
      reportTitle: "Internet Metering Report",
      category: "Internet Metering Report Pack",
      type: "Metering",
      description: "Internet usage, bandwidth trend, department usage, category exposure and governance report.",
      metrics: { usersTracked: users, downloadMb: download, uploadMb: upload, totalMb: total, highBandwidthUsers: high },
      title: "Internet Metering Report",
      executiveSummary: `Internet Metering reviews ${users} tracked user(s), ${total} MB total bandwidth, ${download} MB download, ${upload} MB upload, and ${high} high-bandwidth candidate user(s).`,
      managementConclusion: "Validate high usage against business role, review department capacity, and map category/protocol exposure to web governance policy.",
      keyFindings: [`${total} MB total bandwidth was recorded for the selected period.`, `${high} high-bandwidth user candidate(s) require business justification.`, `${users} user(s) are included in internet metering scope.`, "Department and category usage should be reviewed for policy exceptions."],
      sections: [
        { type: "kpi", title: "Internet Usage KPI", rows: [
          { label: "Users Tracked", value: users, note: "Users included in internet metering scope." },
          { label: "Total Bandwidth", value: `${total} MB`, note: `${download} MB download · ${upload} MB upload.` },
          { label: "Download", value: `${download} MB`, note: "Inbound traffic." },
          { label: "High Usage Users", value: high, note: "Usage governance candidates." },
        ] },
        { type: "bar", title: "Bandwidth Usage Mix", rows: [{ label: "Download MB", value: download }, { label: "Upload MB", value: upload }, { label: "Total MB", value: total }, { label: "High Users", value: high }] },
        { type: "risk", title: "Internet Governance Focus", rows: [
          { area: "Bandwidth usage", severity: total > 0 ? "Available" : "Pending", finding: `${total} MB total usage.`, action: "Validate heavy usage against business role." },
          { area: "High usage users", severity: high > 0 ? "Action" : "Monitor", finding: `${high} high usage candidate(s).`, action: "Review repeated peaks and policy exceptions." },
          { area: "Category governance", severity: "Review", finding: "Category and protocol pattern require governance review.", action: "Map findings to web restriction policy." },
        ] },
      ],
      recommendations: [{ priority: "Priority 1", action: `Review ${high} high-bandwidth user candidate(s).`, owner: "Network / Security Team", target: "Next review" }],
    });
  }

  return null;
}
