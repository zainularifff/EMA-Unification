import Report from "./Report";

type AnyRecord = Record<string, any>;

type DynamicReportDefinition = {
  id: string;
  title: string;
  type: string;
  description: string;
  source: string;
  color: string;
  summaryLabel: string;
  findings: string[];
  sectionTitles: Record<string, string>;
  recommendations: { priority: string; action: string }[];
};

const DYNAMIC_REPORTS: Record<string, DynamicReportDefinition> = {
  "dynamic-compliance-report": {
    id: "dynamic-compliance-report",
    title: "Compliance Report",
    type: "Compliance",
    description: "AI-generated compliance report with posture analysis, evidence summary and governance actions.",
    source: "Endpoint Inventory + Software Inventory + OS Compliance + Service Desk SLA",
    color: "#f59e0b",
    summaryLabel: "Compliance posture analysis",
    findings: [
      "Compliance posture is evaluated from endpoint, OS, software governance and service evidence.",
      "Exceptions should be reviewed with owner, evidence status and target closure date.",
      "Audit readiness depends on complete inventory, supported OS posture and SLA visibility."
    ],
    sectionTitles: {
      kpi: "Compliance Posture KPI",
      bar: "Compliance Gap Breakdown",
      donut: "Compliance Control Distribution",
      risk: "Compliance Exceptions & Audit Exposure",
      table: "Compliance Evidence Register"
    },
    recommendations: [
      { priority: "High", action: "Validate unsupported OS, stale endpoint and SLA breach evidence before audit sign-off." },
      { priority: "Medium", action: "Review software governance exceptions, paid application usage and ownership gaps." },
      { priority: "Medium", action: "Prepare compliance action register with owner, due date and evidence status." }
    ]
  },
  "dynamic-cost-saving-report": {
    id: "dynamic-cost-saving-report",
    title: "Cost Saving Report",
    type: "Summary",
    description: "AI-generated cost saving report for refresh planning, software rationalisation and optimisation opportunities.",
    source: "Hardware Lifecycle + Software Inventory + Endpoint Utilisation + Resource Planning",
    color: "#10b981",
    summaryLabel: "Cost optimisation analysis",
    findings: [
      "Cost opportunities are derived from lifecycle, utilisation, software footprint and refresh planning signals.",
      "Savings should prioritise unused software, duplicate tooling, aging devices and avoidable support workload.",
      "Management should convert optimisation findings into a renewal, cleanup and procurement action plan."
    ],
    sectionTitles: {
      kpi: "Cost Saving Opportunity KPI",
      bar: "Savings Opportunity Breakdown",
      donut: "Optimisation Area Distribution",
      risk: "Cost Leakage & Optimisation Risks",
      table: "Cost Saving Evidence Register"
    },
    recommendations: [
      { priority: "High", action: "Identify unused or duplicated software and prepare rationalisation candidates for review." },
      { priority: "Medium", action: "Prioritise aging endpoint refresh planning by branch, model and support impact." },
      { priority: "Medium", action: "Create cost-saving tracker covering renewal, cleanup and procurement decisions." }
    ]
  },
  "dynamic-risk-management-report": {
    id: "dynamic-risk-management-report",
    title: "Risk Management Report",
    type: "Risk",
    description: "AI-generated risk management report with exposure analysis, severity view and remediation priorities.",
    source: "Endpoint Risk + Unsupported OS + Service Desk SLA + Data Quality + Software Risk",
    color: "#ef4444",
    summaryLabel: "Risk exposure analysis",
    findings: [
      "Risk exposure is assessed from endpoint availability, unsupported OS, SLA pressure, data quality and software risk.",
      "High-severity findings should be prioritised by business impact, affected device count and remediation complexity.",
      "Risk treatment should include owner assignment, due date, exception approval and evidence update."
    ],
    sectionTitles: {
      kpi: "Risk Exposure KPI",
      bar: "Severity Breakdown",
      donut: "Risk Distribution",
      risk: "Risk Register & Remediation Priority",
      table: "Risk Evidence Register"
    },
    recommendations: [
      { priority: "High", action: "Prioritise high-risk endpoints, unsupported OS and SLA breach candidates for remediation." },
      { priority: "High", action: "Assign risk owners and target dates for each severity item in the register." },
      { priority: "Medium", action: "Track exception approval and remediation evidence before the next governance review." }
    ]
  }
};

const DYNAMIC_REPORT_IDS = Object.keys(DYNAMIC_REPORTS);

function safeJsonParse(value: any): AnyRecord | null {
  if (!value || typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function requestBody(input: RequestInfo | URL, init?: RequestInit): AnyRecord | null {
  const directBody = typeof init?.body === "string" ? safeJsonParse(init.body) : null;
  if (directBody) return directBody;

  if (typeof Request !== "undefined" && input instanceof Request) {
    const contentType = input.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return null;
  }

  return null;
}

function requestUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  if (typeof Request !== "undefined" && input instanceof Request) return input.url;
  return String(input || "");
}

function cleanDynamicText(value: any, fallback = "") {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  return text
    .replace(/AI Executive Summary/gi, "AI Dynamic Report")
    .replace(/Executive Summary/gi, "Dynamic Report")
    .replace(/executive summary/g, "dynamic report");
}

function numberFromMetrics(metrics: AnyRecord | undefined, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = Number(metrics?.[key]);
    if (Number.isFinite(value)) return value;
  }
  return fallback;
}

function normaliseDynamicSections(sections: any[], definition: DynamicReportDefinition) {
  const sourceSections = Array.isArray(sections) ? sections : [];
  const mapped = sourceSections.map((section, index) => {
    const type = String(section?.type || "table");
    const title = definition.sectionTitles[type] || `${definition.title} Section ${index + 1}`;
    return {
      ...section,
      title,
      rows: Array.isArray(section?.rows) ? section.rows : []
    };
  });

  if (!mapped.some((section) => section.type === "kpi")) {
    mapped.unshift({
      type: "kpi",
      title: definition.sectionTitles.kpi,
      rows: [
        { label: "Report Type", value: definition.type, note: definition.summaryLabel },
        { label: "AI Mode", value: "Gemini Flash", note: "Generated based on selected dynamic report title." },
        { label: "Output Focus", value: definition.title, note: definition.description }
      ]
    });
  }

  return mapped;
}

function normaliseDynamicPayload(rawPayload: AnyRecord, requestPayload: AnyRecord, definition: DynamicReportDefinition) {
  const existingReport = rawPayload.report || {};
  const metrics = rawPayload.metrics || {};
  const endpointTotal = numberFromMetrics(metrics, ["totalEndpoints", "endpointTotal", "assets"], 0);
  const openTickets = numberFromMetrics(metrics, ["openTickets", "totalTickets", "tickets"], 0);
  const riskItems = numberFromMetrics(metrics, ["slaBreached", "slaBreachCandidates", "duplicateIpGroups", "offlineEndpoints"], 0);
  const existingFindings = Array.isArray(rawPayload.narrative?.keyFindings) ? rawPayload.narrative.keyFindings : [];
  const findings = [...definition.findings, ...existingFindings.map((item: any) => cleanDynamicText(item)).filter(Boolean)]
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, 7);

  const existingSummary = cleanDynamicText(rawPayload.narrative?.executiveSummary, "");
  const summaryPrefix = `${definition.title} generated by Gemini Flash based on the selected report title. This report focuses on ${definition.summaryLabel.toLowerCase()} using the current reporting scope.`;
  const scopedEvidence = endpointTotal || openTickets || riskItems
    ? ` Current evidence includes ${endpointTotal} endpoint record(s), ${openTickets} service desk item(s), and ${riskItems} risk or exception signal(s).`
    : "";

  return {
    ...rawPayload,
    mode: "dynamic-reporting",
    report: {
      ...existingReport,
      id: definition.id,
      title: definition.title,
      type: definition.type,
      description: definition.description,
      source: definition.source,
      outputs: Array.isArray(existingReport.outputs) && existingReport.outputs.length ? existingReport.outputs : ["PDF", "PowerPoint", "Excel"]
    },
    filters: {
      ...(rawPayload.filters || {}),
      ...requestPayload,
      useAiAnalysis: true,
      aiProvider: "google",
      aiEngine: "gemini-flash",
      aiModel: requestPayload.aiModel || "gemini-2.5-flash",
      aiReportMode: "dynamic-reporting",
      dynamicReportType: definition.id,
      dynamicReportTitle: definition.title,
      dynamicReportCategory: "Dynamic Reporting"
    },
    narrative: {
      ...(rawPayload.narrative || {}),
      title: `${definition.title} Analysis`,
      executiveSummary: `${summaryPrefix}${scopedEvidence}${existingSummary ? ` ${existingSummary}` : ""}`,
      keyFindings: findings,
      managementConclusion: cleanDynamicText(
        rawPayload.narrative?.managementConclusion,
        `${definition.title} requires owner-led follow-up based on the generated AI findings and available evidence.`
      ),
      recommendations: definition.recommendations.map((item) => item.action)
    },
    sections: normaliseDynamicSections(rawPayload.sections, definition),
    recommendations: definition.recommendations,
    dataSources: Array.isArray(rawPayload.dataSources) ? rawPayload.dataSources : [],
    exportData: rawPayload.exportData || {}
  };
}

function resolveDynamicDefinition(requestPayload: AnyRecord | null, payload: AnyRecord | null) {
  const candidates = [
    requestPayload?.dynamicReportType,
    requestPayload?.reportId,
    requestPayload?.report?.id,
    payload?.filters?.dynamicReportType,
    payload?.report?.id
  ].map((item) => String(item || ""));

  const id = candidates.find((candidate) => DYNAMIC_REPORT_IDS.includes(candidate));
  return id ? DYNAMIC_REPORTS[id] : null;
}

function normaliseDynamicResponseBody(body: AnyRecord, requestPayload: AnyRecord | null) {
  const directDefinition = resolveDynamicDefinition(requestPayload, body);
  if (directDefinition) return normaliseDynamicPayload(body, requestPayload || {}, directDefinition);

  const nestedPayload = body?.data;
  const nestedDefinition = nestedPayload && typeof nestedPayload === "object" ? resolveDynamicDefinition(requestPayload, nestedPayload) : null;
  if (nestedDefinition) {
    return {
      ...body,
      data: normaliseDynamicPayload(nestedPayload, requestPayload || {}, nestedDefinition)
    };
  }

  return body;
}

function installDynamicReportFetchNormaliser() {
  if (typeof window === "undefined" || typeof window.fetch !== "function") return;

  const patchedKey = "__emaDynamicReportFetchNormalised";
  const originalKey = "__emaOriginalFetchForDynamicReports";
  const globalWindow = window as any;
  if (globalWindow[patchedKey]) return;

  const originalFetch = window.fetch.bind(window);
  globalWindow[originalKey] = originalFetch;
  globalWindow[patchedKey] = true;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await originalFetch(input, init);
    const url = requestUrl(input);
    const isReportEndpoint = url.includes("/api/reports/preview") || url.includes("/api/reports/generate");
    if (!isReportEndpoint) return response;

    const payload = requestBody(input, init);
    const definition = resolveDynamicDefinition(payload, null);
    if (!definition) return response;

    try {
      const json = await response.clone().json();
      const normalised = normaliseDynamicResponseBody(json, payload);
      const headers = new Headers(response.headers);
      headers.set("content-type", "application/json");
      return new Response(JSON.stringify(normalised), {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch {
      return response;
    }
  };
}

installDynamicReportFetchNormaliser();

export default function ReportDynamicWrapper() {
  return <Report />;
}
