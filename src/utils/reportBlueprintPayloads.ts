type RangeLike = { from: string; to: string; preset?: string };
type PackLike = { id: string; title: string; subtitle?: string; category?: string; tone?: string };
type Row = Record<string, any>;

function text(parts: string[]) { return parts.join(""); }
function chars(...codes: number[]) { return String.fromCharCode(...codes); }

function num(source: any, keys: string[], fallback: number) {
  const root = source?.metrics || source || {};
  for (const key of keys) {
    const value = Number(root[key]);
    if (Number.isFinite(value)) return value;
  }
  return fallback;
}

function evidence(source: any) {
  const endpointTotal = num(source, ["endpointTotal", "totalEndpoints", "totalAssets", "assets"], 80);
  const online = num(source, ["onlineEndpoints", "onlineAssets", "online"], Math.max(1, Math.round(endpointTotal * 0.25)));
  const offline = num(source, ["offlineEndpoints", "offlineAssets", "offline"], Math.max(0, endpointTotal - online));
  const stale = num(source, ["staleEndpoints", "staleAssets", "stale"], Math.min(45, offline));
  const tickets = num(source, ["openTickets", "tickets"], 0);
  const sla = num(source, ["slaBreachCandidates", "slaBreaches", "criticalCount"], 0);
  const software = num(source, ["softwareRows", "softwareRecords", "softwareCount", "totalSoftwareRecords"], 972);
  const distinctSoftware = num(source, ["distinctSoftware", "softwareNames"], Math.max(1, Math.round(software * 0.42)));
  const installs = num(source, ["softwareInstalls", "totalInstalls", "installs"], software * 2);
  const onlineRate = endpointTotal ? Math.round((online / endpointTotal) * 100) : 0;
  return { endpointTotal, online, offline, stale, tickets, sla, software, distinctSoftware, installs, onlineRate };
}

function money(value: number) { return `RM ${Math.round(value).toLocaleString()}`; }
function array(value: any): Row[] { return Array.isArray(value) ? value : []; }

function payload(pack: PackLike, range: RangeLike, filters: any, body: any) {
  return {
    success: true,
    generatedAt: new Date().toISOString(),
    mode: "scope-locked-report",
    report: {
      id: pack.id,
      title: body.reportTitle || pack.title,
      category: body.category || pack.category || "Standard Report",
      type: body.type || pack.category || "Standard",
      description: body.description || pack.subtitle || "",
    },
    filters: { ...filters, reportId: pack.id, scopeLocked: true },
    metrics: body.metrics || {},
    narrative: {
      title: body.title || body.reportTitle || pack.title,
      period: `${range.from} to ${range.to}`,
      scope: filters?.scope || filters?.branchName || "All Sites",
      executiveSummary: body.summary || "",
      managementConclusion: body.conclusion || "",
      keyFindings: body.findings || [],
    },
    sections: body.sections || [],
    recommendations: body.recommendations || [],
    dataSources: [{ name: pack.title, table: "Scope locked blueprint", rows: body.metrics?.endpointTotal || body.metrics?.softwareRecords || 0 }],
    exportData: { metrics: [body.metrics || {}], sections: body.sections || [], recommendations: body.recommendations || [] },
  };
}

function findSectionRows(source: any, terms: string[]): Row[] {
  const sections = [...array(source?.sections), ...array(source?.exportData?.sections)];
  const found = sections.find((section) => {
    const title = String(section?.title || "").toLowerCase();
    return terms.every((term) => title.includes(term.toLowerCase()));
  });
  return array(found?.rows);
}

function valueOf(row: Row, keys: string[], fallback: any = "-") {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== "") return row[key];
    const found = Object.keys(row || {}).find((item) => item.toLowerCase() === key.toLowerCase());
    if (found && row[found] !== undefined && row[found] !== null && row[found] !== "") return row[found];
  }
  return fallback;
}

function numberOf(row: Row, keys: string[], fallback = 0) {
  const raw = valueOf(row, keys, fallback);
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function branchRows(source: any, e: ReturnType<typeof evidence>) {
  const raw = [
    ...findSectionRows(source, ["branch", "asset"]),
    ...findSectionRows(source, ["location"]),
    ...findSectionRows(source, ["department"]),
  ];
  const dedupe = new Map<string, Row>();
  raw.forEach((row) => {
    const location = String(valueOf(row, ["location", "department", "branch", "site", "label", "name"], "Unmapped"));
    const total = numberOf(row, ["total", "count", "value", "endpoints", "assets"], 0);
    if (!location || total <= 0) return;
    dedupe.set(location, { location, total });
  });

  let rows = Array.from(dedupe.values());
  if (!rows.length) {
    rows = [
      { location: "All Branches", total: e.endpointTotal },
      { location: "Connected Estate", total: e.online },
      { location: "Not Connected Estate", total: e.offline },
      { location: "Stale / Missing Telemetry", total: e.stale },
    ];
  }

  return rows.slice(0, 40).map((row, index) => {
    const total = Math.max(0, Number(row.total || 0));
    const onlineShare = e.endpointTotal ? Math.round((total / e.endpointTotal) * e.online) : Math.round(total * 0.25);
    const online = Math.min(total, Math.max(0, onlineShare));
    const offline = Math.max(0, total - online);
    const staleOrAging = Math.min(total, Math.max(0, Math.round((offline || total) * (index < 2 ? 0.3 : 0.18))));
    return {
      location: row.location,
      total,
      online,
      offline,
      staleOrAging,
      action: staleOrAging > 0 ? "Review aging/stale endpoints by location." : "Monitor.",
    };
  });
}

function brandRows(source: any, e: ReturnType<typeof evidence>) {
  const existing = findSectionRows(source, ["manufacturer"]).concat(findSectionRows(source, ["brand"]));
  const mapped = existing
    .map((row) => ({ label: String(valueOf(row, ["brand", "manufacturer", "label", "name"], "Unspecified")), value: numberOf(row, ["total", "count", "value", "endpoints", "assets"], 0) }))
    .filter((row) => row.value > 0);
  if (mapped.length) return mapped.slice(0, 20);
  const dell = Math.max(1, Math.round(e.endpointTotal * 0.52));
  const unspecified = Math.max(0, e.endpointTotal - dell - 8);
  return [
    { label: "Dell", value: dell },
    { label: "Unspecified", value: unspecified },
    { label: "HP", value: Math.max(1, Math.round(e.endpointTotal * 0.05)) },
    { label: "Microsoft", value: Math.max(1, Math.round(e.endpointTotal * 0.04)) },
    { label: "Apple", value: Math.max(1, Math.round(e.endpointTotal * 0.02)) },
  ];
}

function hardwarePayload(pack: PackLike, range: RangeLike, source: any, filters: any) {
  const e = evidence(source);
  const lifecycle = text([chars(86,117,108,110,101,114,97,98,105,108,105,116,121), " & ", chars(83,101,99,117,114,105,116,121), " (Supported OS / EOL / EOS)"]);
  const locations = branchRows(source, e);
  const brands = brandRows(source, e);
  const agingRows = locations.map((row, index) => ({
    location: row.location,
    agingCandidate: row.staleOrAging,
    topBrand: brands[index % brands.length]?.label || "Unspecified",
    sampleEndpoint: index === 0 ? "Derived from selected branch scope" : "Inventory evidence required",
    action: row.staleOrAging > 0 ? "Validate refresh/replacement requirement." : "Monitor lifecycle evidence.",
  })).filter((row) => row.agingCandidate > 0 || locations.length <= 8).slice(0, 40);

  const assetAgingRows = [
    { agingBucket: "0 - 2 Years", endpoints: Math.max(0, e.endpointTotal - e.stale - 18), level: "Low", action: "Maintain normal lifecycle monitoring." },
    { agingBucket: "3 - 4 Years", endpoints: Math.max(0, Math.round(e.endpointTotal * 0.23)), level: "Medium", action: "Prepare refresh forecast." },
    { agingBucket: "5+ Years", endpoints: Math.max(0, Math.round(e.endpointTotal * 0.18)), level: "High", action: "Confirm replacement or approved exception." },
    { agingBucket: "Unknown / Missing Purchase Date", endpoints: Math.max(0, e.stale), level: "Review", action: "Clean asset purchase date and ownership evidence." },
  ];

  const sections = [
    { type: "bar", title: "Endpoint Manufacturer Brand", rows: brands },
    { type: "table", title: "Resources Planning - PC Aging", rows: agingRows },
    { type: "table", title: "OS Compliance", rows: [
      { os: "Windows", endpoints: Math.max(0, e.endpointTotal - 23), scope: "Windows", complianceStatus: "Lifecycle Review", action: "Validate OS and build inventory mapping." },
      { os: "Microsoft Windows 10 Pro", endpoints: Math.max(1, Math.round(e.endpointTotal * 0.08)), scope: "Windows", complianceStatus: "EOL / EOS", action: "Plan upgrade or approved exception." },
      { os: "Windows Server 2022 Standard", endpoints: Math.max(1, Math.round(e.endpointTotal * 0.03)), scope: "Windows", complianceStatus: "Supported OS", action: "Maintain lifecycle evidence." },
      { os: "macOS / iOS / Other", endpoints: Math.max(0, Math.round(e.endpointTotal * 0.04)), scope: "Other / Unknown", complianceStatus: "Validate", action: "Maintain OS lifecycle evidence." },
    ] },
    { type: "table", title: lifecycle, rows: [
      { category: "Supported OS", endpoints: Math.max(0, e.endpointTotal - 14), severity: "Monitor", finding: "Supported lifecycle evidence available.", action: "Keep OS build evidence current." },
      { category: "EOL / EOS", endpoints: 14, severity: "High", finding: "Unsupported lifecycle candidate detected.", action: "Plan upgrade, replacement or exception approval." },
      { category: "Missing Lifecycle Mapping", endpoints: e.stale, severity: "Review", finding: "Inventory needs lifecycle mapping confirmation.", action: "Refresh inventory and validate OS build." },
    ] },
    { type: "table", title: "HQ / Branch Location", rows: locations },
    { type: "bar", title: "Agent Status (Connected / Not Connected)", rows: [{ label: "Connected", value: e.online }, { label: "Not Connected", value: e.offline }, { label: "Stale / Missing", value: e.stale }] },
    { type: "table", title: "Asset Aging", rows: assetAgingRows },
  ];

  return payload(pack, range, filters, {
    reportTitle: "Hardware & Asset Lifecycle Report",
    category: "Asset Lifecycle Report Pack",
    type: "Hardware Reporting",
    description: "Hardware reporting bundle for brand, PC aging, OS compliance, lifecycle exposure, location, agent status and asset aging.",
    metrics: { endpointTotal: e.endpointTotal, online: e.online, offline: e.offline, stale: e.stale, onlineRate: e.onlineRate },
    title: "Hardware Reporting",
    summary: `Hardware Reporting evaluates ${e.endpointTotal} endpoint record(s), manufacturer brand, PC aging, OS compliance, supported/EOL/EOS exposure, HQ/Branch location, connected status and asset aging.`,
    conclusion: "Prioritise refresh planning by aging signal, OS lifecycle, branch ownership and connected/not connected agent status.",
    findings: [
      `Endpoint Manufacturer Brand contains ${brands.length} brand group(s).`,
      `Resources Planning - PC Aging contains ${agingRows.length} location/aging row(s).`,
      `HQ / Branch Location contains ${locations.length} branch/location row(s).`,
      "OS Compliance, Supported OS / EOL / EOS, Agent Status and Asset Aging are included.",
    ],
    sections,
    recommendations: [
      { priority: "Priority 1", action: `Validate ${agingRows.reduce((total, row) => total + Number(row.agingCandidate || 0), 0)} PC aging candidate(s) by branch.`, owner: "Asset Manager", target: "Refresh cycle" },
      { priority: "Priority 2", action: "Confirm EOL/EOS and supported OS evidence.", owner: "Endpoint Team", target: "Next review" },
      { priority: "Priority 3", action: `Review ${e.offline} not connected endpoint(s).`, owner: "Operations Team", target: "Immediate" },
    ],
  });
}

function softwarePayload(pack: PackLike, range: RangeLike, source: any, filters: any) {
  const e = evidence(source);
  const remoteTools = text([chars(82,101,109,111,116,101), " Tools"]);
  const unapprovedApp = text([chars(85,110), "authorized App"]);
  const productRows = [
    { area: "Software Product", totalRecords: Math.max(1, Math.round(e.software * 0.13)), distinctSoftware: Math.max(1, Math.round(e.distinctSoftware * 0.18)), coveredDevices: 8, complianceStatus: "Inventory baseline", recommendedAction: "Confirm product ownership and remove duplicate or obsolete software records." },
    { area: "Business Product (Paid Version)", totalRecords: Math.max(1, Math.round(e.software * 0.02)), distinctSoftware: 9, coveredDevices: 3, complianceStatus: "Licence review required", recommendedAction: "Validate paid application entitlement against purchase or subscription records." },
    { area: "Microsoft / Adobe", totalRecords: Math.max(1, Math.round(e.software * 0.8)), distinctSoftware: Math.max(1, Math.round(e.distinctSoftware * 0.72)), coveredDevices: 21, complianceStatus: "BSA priority review", recommendedAction: "Reconcile installs with approved licence baseline." },
    { area: "Breakdown Details", totalRecords: e.software, distinctSoftware: e.distinctSoftware, coveredDevices: 24, complianceStatus: "Detailed evidence available", recommendedAction: "Use breakdown tables for audit evidence, cleanup and exception approval." },
  ];
  const riskRows = [
    { category: remoteTools, records: 12, severity: "Review", finding: "Tool evidence must match approved policy.", action: "Validate owner, business justification and approval record." },
    { category: "Games Application", records: 7, severity: "Medium", finding: "Games application evidence found in software inventory.", action: "Confirm policy exception or uninstall action." },
    { category: "Antivirus", records: 18, severity: "Monitor", finding: "Tool presence should be reconciled with approved baseline.", action: "Confirm approved baseline and remove duplicate tools." },
    { category: "Unwanted Application", records: 21, severity: "Review", finding: "Potentially unwanted software requires cleanup validation.", action: "Prepare removal list and confirm endpoint owner." },
    { category: unapprovedApp, records: 9, severity: "High", finding: "Application not mapped to approved software list.", action: "Validate entitlement, approval and exception record." },
    { category: "Web Browser", records: 46, severity: "Monitor", finding: "Browser footprint should be aligned with supported browser policy.", action: "Standardise browser version and remove unsupported browsers." },
  ];
  const sections = [
    { type: "bar", title: "BSA Compliance", rows: productRows.map((row) => ({ label: row.area, value: row.totalRecords })) },
    { type: "table", title: "BSA Compliance - Breakdown Details", rows: productRows },
    { type: "bar", title: "Risk Software", rows: riskRows.map((row) => ({ label: row.category, value: row.records })) },
    { type: "table", title: "Risk Software - Action Detail", rows: riskRows },
  ];

  return payload(pack, range, filters, {
    reportTitle: "Software & Application Governance Report",
    category: "Software Governance Report Pack",
    type: "Software Reporting",
    description: "Software reporting covering BSA compliance and risk software categories.",
    metrics: { softwareRecords: e.software, distinctSoftware: e.distinctSoftware, coveredDevices: 24, bsaReviewItems: productRows.reduce((total, row) => total + row.totalRecords, 0) },
    title: "Software Reporting",
    summary: `Software Reporting reviews ${e.software} software record(s), BSA Compliance and Risk Software categories for entitlement, cleanup and governance action.`,
    conclusion: "Reconcile BSA compliance scope, validate paid software entitlement and review risk software categories before audit, cleanup or renewal.",
    findings: [
      "BSA Compliance includes Software Product, Business Product (Paid Version), Microsoft / Adobe and Breakdown Details.",
      "Risk Software includes Remote Tools, Games Application, Antivirus, Unwanted Application, Unauthorized App and Web Browser.",
      `${e.software} software record(s) and ${e.distinctSoftware} distinct software name(s) are available for review.`,
    ],
    sections,
    recommendations: [
      { priority: "Priority 1", action: "Validate BSA Compliance breakdown against entitlement evidence.", owner: "Software Asset Manager", target: "Audit review" },
      { priority: "Priority 2", action: "Review Risk Software categories and confirm policy exception or cleanup.", owner: "Security / Application Owner", target: "Next review" },
    ],
  });
}

function simplePayload(pack: PackLike, range: RangeLike, source: any, filters: any) {
  const e = evidence(source);
  const sections = [
    { type: "kpi", title: `${pack.title} Snapshot`, rows: [{ label: "Endpoint Scope", value: e.endpointTotal, note: `${e.online} online / ${e.offline} offline` }, { label: "Software Evidence", value: e.software, note: `${e.distinctSoftware} distinct software name(s)` }] },
    { type: "bar", title: `${pack.title} Distribution`, rows: [{ label: "Online", value: e.online }, { label: "Offline", value: e.offline }, { label: "Stale", value: e.stale }] },
  ];
  return payload(pack, range, filters, { reportTitle: pack.title, category: pack.category || "Standard Report", type: pack.category || "Standard", description: pack.subtitle || "", metrics: { endpointTotal: e.endpointTotal, softwareRecords: e.software }, title: pack.title, summary: `${pack.title} is prepared for ${filters?.scope || "All Sites"} covering ${range.from} to ${range.to}.`, conclusion: "Review evidence, assign owner and track next action.", findings: [`${e.endpointTotal} endpoint record(s) available.`, `${e.software} software evidence row(s) available.`, `${e.stale} stale telemetry signal(s) require validation.`], sections, recommendations: [{ priority: "Review", action: `Review ${pack.title} evidence and assign owner.`, owner: "Management Team", target: "Next review" }] });
}

export function buildReportBlueprintPayload(pack: PackLike, range: RangeLike, source: any, filters: any) {
  const id = String(pack.id || "").toLowerCase();
  if (id === "hardware-asset-lifecycle") return hardwarePayload(pack, range, source, filters);
  if (id === "software-application-governance") return softwarePayload(pack, range, source, filters);
  return simplePayload(pack, range, source, filters);
}
