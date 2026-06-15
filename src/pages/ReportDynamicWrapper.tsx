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
  promptFocus: string;
  sectionTitles: Record<string, string>;
  fallbackRecommendations: { priority: string; action: string }[];
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
    promptFocus: "audit readiness, compliance gaps, OS support posture, software governance evidence, SLA exposure and exception ownership",
    sectionTitles: {
      kpi: "Compliance Posture KPI",
      bar: "Compliance Gap Breakdown",
      donut: "Compliance Control Distribution",
      risk: "Compliance Exceptions & Audit Exposure",
      table: "Compliance Evidence Register"
    },
    fallbackRecommendations: [
      { priority: "High", action: "Validate compliance exceptions with owner, evidence status and target closure date." },
      { priority: "Medium", action: "Review OS support, software governance and SLA evidence before audit sign-off." },
      { priority: "Medium", action: "Prepare a compliance action register for management review." }
    ]
  },
  "dynamic-cost-saving-report": {
    id: "dynamic-cost-saving-report",
    title: "Cost Saving Report",
    type: "Cost Saving",
    description: "AI-generated cost saving report for refresh planning, software rationalisation and optimisation opportunities.",
    source: "Hardware Lifecycle + Software Inventory + Endpoint Utilisation + Resource Planning",
    color: "#10b981",
    summaryLabel: "Cost optimisation analysis",
    promptFocus: "cost optimisation, unused software, duplicate tools, endpoint refresh planning, renewal cleanup and avoidable support workload",
    sectionTitles: {
      kpi: "Cost Saving Opportunity KPI",
      bar: "Savings Opportunity Breakdown",
      donut: "Optimisation Area Distribution",
      risk: "Cost Leakage & Optimisation Risks",
      table: "Cost Saving Evidence Register"
    },
    fallbackRecommendations: [
      { priority: "High", action: "Identify software rationalisation and renewal cleanup candidates." },
      { priority: "Medium", action: "Prioritise aging endpoint refresh planning by business impact and support cost." },
      { priority: "Medium", action: "Create a savings tracker covering cleanup, renewal and procurement decisions." }
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
    promptFocus: "risk exposure, severity prioritisation, unsupported OS, SLA pressure, stale telemetry, data quality, software risk and remediation ownership",
    sectionTitles: {
      kpi: "Risk Exposure KPI",
      bar: "Severity Breakdown",
      donut: "Risk Distribution",
      risk: "Risk Register & Remediation Priority",
      table: "Risk Evidence Register"
    },
    fallbackRecommendations: [
      { priority: "High", action: "Prioritise high-risk endpoints, unsupported OS and SLA breach candidates for remediation." },
      { priority: "High", action: "Assign risk owners and target dates for each severity item in the register." },
      { priority: "Medium", action: "Track exception approval and remediation evidence before the next governance review." }
    ]
  }
};

const DYNAMIC_REPORT_IDS = Object.keys(DYNAMIC_REPORTS);
const LAST_DYNAMIC_PAYLOAD_KEY = "__emaLastDynamicReportPayload";
const FETCH_PATCHED_KEY = "__emaDynamicReportFetchNormalised";
const PRINT_PATCHED_KEY = "__emaDynamicReportPrintGuardInstalled";
const DAILY_DISCLAIMER = "AI Dynamic Reporting is generated once per day for each selected report title. The content reflects the latest available dataset at generation time and should be reviewed by the report owner before management sign-off.";

function safeJsonParse(value: any): AnyRecord | null {
  if (!value || typeof value !== "string") return null;
  try { return JSON.parse(value); } catch { return null; }
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
  return text.replace(/AI Executive Summary/gi, "AI Dynamic Report").replace(/Executive Summary/gi, "Dynamic Report").replace(/executive summary/g, "dynamic report");
}

function isStaticExecutiveTemplate(value: any) {
  const text = String(value ?? "").toLowerCase();
  if (!text) return true;
  const markers = [
    "immediate management attention is required",
    "the current report scope covers",
    "endpoint availability directly affects support visibility",
    "management should treat this as a reporting-confidence issue",
    "software inventory record(s) are available in scope",
    "executive management brief",
    "recommended response is to prioritise breached",
    "reporting cycle"
  ];
  return markers.some((marker) => text.includes(marker));
}

function reportDayKey() {
  return new Date().toISOString().slice(0, 10);
}

function dynamicAiInstruction(definition: DynamicReportDefinition) {
  return [
    `Generate a fresh ${definition.title} using Gemini Flash narrative.`,
    `Focus only on ${definition.promptFocus}.`,
    `Do not reuse Executive Summary wording, do not use the heading Immediate management attention is required, and do not produce generic endpoint-only paragraphs unless they directly support ${definition.title}.`,
    "Every paragraph, finding, section insight and recommendation must be specific to the selected report title.",
    "This AI Dynamic Reporting output is generated once per day for this report title; include a short disclaimer that the report reflects the latest available dataset at generation time and requires owner review before management sign-off."
  ].join(" ");
}

function normaliseDynamicSections(sections: any[], definition: DynamicReportDefinition) {
  const sourceSections = Array.isArray(sections) ? sections : [];
  const mapped = sourceSections.map((section, index) => {
    const type = String(section?.type || "table");
    return { ...section, title: definition.sectionTitles[type] || `${definition.title} Section ${index + 1}`, rows: Array.isArray(section?.rows) ? section.rows : [] };
  });

  mapped.unshift({
    type: "notice",
    title: "AI Dynamic Reporting Notice",
    rows: [
      { label: "Generation Frequency", value: "Once per day", note: `Daily report key: ${definition.id}-${reportDayKey()}` },
      { label: "Disclaimer", value: DAILY_DISCLAIMER, note: definition.title }
    ]
  });

  if (!mapped.some((section) => section.type === "kpi")) {
    mapped.unshift({
      type: "kpi",
      title: definition.sectionTitles.kpi,
      rows: [
        { label: "Report Type", value: definition.type, note: definition.summaryLabel },
        { label: "AI Mode", value: "Gemini Flash", note: "Generated once per day based on the selected dynamic report title." },
        { label: "Output Focus", value: definition.title, note: definition.description }
      ]
    });
  }
  return mapped;
}

function fallbackNarrative(definition: DynamicReportDefinition) {
  const byId: Record<string, { title: string; paragraphs: string[]; findings: string[] }> = {
    "dynamic-compliance-report": {
      title: "Compliance evidence requires owner validation before sign-off",
      paragraphs: [
        "This Compliance Report should be treated as an AI-assisted governance review, not a repeated operational executive summary. The report focus is audit readiness, control evidence, exception ownership and whether available inventory data is strong enough for compliance sign-off.",
        "The key management concern is not only the number of devices or software records, but whether each compliance gap has a named owner, supporting evidence, target closure date and clear acceptance status.",
        "The recommended action is to validate compliance exceptions, confirm unsupported or unverified assets, and prepare a traceable evidence register before management approval."
      ],
      findings: ["Compliance output must be reviewed against evidence quality.", "Exception ownership should be confirmed before sign-off.", "Audit-ready records should include owner, status and closure date."]
    },
    "dynamic-cost-saving-report": {
      title: "Cost saving opportunities require tracked financial ownership",
      paragraphs: [
        "This Cost Saving Report should highlight optimisation opportunities rather than repeat endpoint health commentary. The report focus is software rationalisation, renewal cleanup, duplicate tooling, refresh planning and avoidable support cost.",
        "Management should separate quick-win savings from planned procurement decisions so every opportunity has an expected value, owner, dependency and target review date.",
        "The recommended action is to create a savings tracker covering unused software, overlapping applications, refresh candidates and procurement decisions that can reduce recurring cost."
      ],
      findings: ["Savings items need owner and estimated value.", "Software rationalisation should be reviewed before renewal.", "Refresh planning should prioritise avoidable support cost."]
    },
    "dynamic-risk-management-report": {
      title: "Risk exposure requires severity-based remediation ownership",
      paragraphs: [
        "This Risk Management Report should focus on exposure, severity and remediation accountability rather than repeat a general executive summary. The report focus is risk ownership, unsupported assets, SLA pressure, data quality and remediation priority.",
        "Management should review each risk signal by business impact, likelihood, owner and target date so unresolved operational gaps are converted into accountable treatment actions.",
        "The recommended action is to maintain a risk register with severity, exception approval status, remediation evidence and escalation path for overdue items."
      ],
      findings: ["Risk items need severity and owner validation.", "Unsupported or stale assets should be treated as exposure signals.", "Remediation evidence should be tracked before governance review."]
    }
  };
  return byId[definition.id];
}

function normaliseRecommendations(rawPayload: AnyRecord, definition: DynamicReportDefinition) {
  const source = Array.isArray(rawPayload.recommendations) ? rawPayload.recommendations : [];
  const cleaned = source.map((item: any) => {
    if (typeof item === "string") return { priority: "AI", action: cleanDynamicText(item) };
    const action = cleanDynamicText(item?.action || item?.recommendation || item?.description || "");
    if (!action || isStaticExecutiveTemplate(action)) return null;
    return { ...item, priority: item?.priority || item?.severity || "AI", action };
  }).filter(Boolean);
  return cleaned.length ? cleaned : definition.fallbackRecommendations;
}

function normaliseDynamicPayload(rawPayload: AnyRecord, requestPayload: AnyRecord, definition: DynamicReportDefinition) {
  const existingReport = rawPayload.report || {};
  const rawNarrative = rawPayload.narrative || {};
  const fallback = fallbackNarrative(definition);
  const rawSummary = cleanDynamicText(rawNarrative.executiveSummary || rawNarrative.summary || "");
  const rawConclusion = cleanDynamicText(rawNarrative.managementConclusion || "");
  const rawTitle = cleanDynamicText(rawNarrative.title || "");
  const useRawSummary = rawSummary && !isStaticExecutiveTemplate(rawSummary);
  const useRawConclusion = rawConclusion && !isStaticExecutiveTemplate(rawConclusion);
  const useRawTitle = rawTitle && !isStaticExecutiveTemplate(rawTitle);
  const aiFindings = (Array.isArray(rawNarrative.keyFindings) ? rawNarrative.keyFindings : []).map((item: any) => cleanDynamicText(item)).filter((item: string) => item && !isStaticExecutiveTemplate(item));
  const recommendations = normaliseRecommendations(rawPayload, definition);

  const normalised = {
    ...rawPayload,
    mode: "dynamic-reporting",
    report: { ...existingReport, id: definition.id, title: definition.title, type: definition.type, description: definition.description, source: definition.source, category: "Dynamic Reporting", outputs: Array.isArray(existingReport.outputs) && existingReport.outputs.length ? existingReport.outputs : ["PDF", "PowerPoint", "Excel"] },
    filters: { ...(rawPayload.filters || {}), ...requestPayload, useAiAnalysis: true, aiProvider: "google", aiEngine: "gemini-flash", aiModel: requestPayload.aiModel || "gemini-2.5-flash", aiReportMode: "dynamic-reporting", aiPrompt: requestPayload.aiPrompt || dynamicAiInstruction(definition), forceAiNarrative: true, disableStaticNarrative: true, dynamicReportType: definition.id, dynamicReportTitle: definition.title, dynamicReportCategory: "Dynamic Reporting", generationFrequency: "once-per-day", dailyGenerationKey: `${definition.id}-${reportDayKey()}`, aiDisclaimer: DAILY_DISCLAIMER },
    narrative: { ...rawNarrative, title: useRawTitle ? rawTitle : fallback.title, executiveSummary: `${useRawSummary ? rawSummary : fallback.paragraphs.join("\n\n")}\n\n${DAILY_DISCLAIMER}`, keyFindings: (aiFindings.length ? aiFindings : fallback.findings).slice(0, 7), managementConclusion: useRawConclusion ? rawConclusion : `${definition.title} requires owner-led follow-up based on AI findings, available evidence and management priority.`, disclaimer: DAILY_DISCLAIMER, recommendations: recommendations.map((item: any) => item.action) },
    sections: normaliseDynamicSections(rawPayload.sections, definition),
    recommendations,
    dataSources: Array.isArray(rawPayload.dataSources) ? rawPayload.dataSources : [],
    exportData: { ...(rawPayload.exportData || {}), aiDisclaimer: DAILY_DISCLAIMER, generationFrequency: "once-per-day" }
  };

  if (typeof window !== "undefined") (window as any)[LAST_DYNAMIC_PAYLOAD_KEY] = normalised;
  return normalised;
}

function resolveDynamicDefinition(requestPayload: AnyRecord | null, payload: AnyRecord | null) {
  const candidates = [requestPayload?.dynamicReportType, requestPayload?.reportId, requestPayload?.report?.id, payload?.filters?.dynamicReportType, payload?.report?.id].map((item) => String(item || ""));
  const id = candidates.find((candidate) => DYNAMIC_REPORT_IDS.includes(candidate));
  return id ? DYNAMIC_REPORTS[id] : null;
}

function normaliseDynamicResponseBody(body: AnyRecord, requestPayload: AnyRecord | null) {
  const directDefinition = resolveDynamicDefinition(requestPayload, body);
  if (directDefinition) return normaliseDynamicPayload(body, requestPayload || {}, directDefinition);
  const nestedPayload = body?.data;
  const nestedDefinition = nestedPayload && typeof nestedPayload === "object" ? resolveDynamicDefinition(requestPayload, nestedPayload) : null;
  if (nestedDefinition) return { ...body, data: normaliseDynamicPayload(nestedPayload, requestPayload || {}, nestedDefinition) };
  return body;
}

function enrichDynamicRequestBody(payload: AnyRecord | null, definition: DynamicReportDefinition | null) {
  if (!payload || !definition) return payload;
  return { ...payload, useAiAnalysis: true, aiProvider: "google", aiEngine: "gemini-flash", aiModel: payload.aiModel || "gemini-2.5-flash", aiReportMode: "dynamic-reporting", dynamicReportType: definition.id, dynamicReportTitle: definition.title, dynamicReportCategory: "Dynamic Reporting", aiPrompt: payload.aiPrompt || dynamicAiInstruction(definition), aiInstruction: payload.aiInstruction || dynamicAiInstruction(definition), forceAiNarrative: true, disableStaticNarrative: true, aiTemperature: payload.aiTemperature ?? 0.85, aiUniquenessSeed: `${definition.id}-${reportDayKey()}`, generationFrequency: "once-per-day", dailyGenerationKey: `${definition.id}-${reportDayKey()}`, aiDisclaimer: DAILY_DISCLAIMER };
}

function htmlEscape(value: any) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
}

function printParagraphsHtml(payload: AnyRecord) {
  const narrative = payload?.narrative || {};
  const paragraphs = String(narrative.executiveSummary || narrative.managementConclusion || "").split(/(?:\n{2,}|\r?\n)/).map((item) => cleanDynamicText(item)).filter(Boolean).slice(0, 5);
  return paragraphs.map((paragraph) => `<p class="pdf-justified">${htmlEscape(paragraph)}</p>`).join("");
}

function normaliseDynamicPrintHtml(html: string) {
  if (typeof window === "undefined") return html;
  const payload = (window as any)[LAST_DYNAMIC_PAYLOAD_KEY];
  const definition = resolveDynamicDefinition(payload?.filters || null, payload || null);
  if (!payload || !definition || !html.includes("Executive Management Brief")) return html;
  const headline = cleanDynamicText(payload.narrative?.title || definition.title);
  const replacement = `<div class="pdf-summary-copy"><span class="pdf-eyebrow">${htmlEscape(definition.title)} AI Dynamic Narrative</span><h2>${htmlEscape(headline)}</h2>${printParagraphsHtml(payload)}<p class="pdf-justified"><strong>AI Dynamic Reporting Notice:</strong> ${htmlEscape(DAILY_DISCLAIMER)}</p></div>`;
  return html.replace(/<div class="pdf-summary-copy">[\s\S]*?<\/div>/, replacement);
}

function installDynamicReportPrintGuard() {
  if (typeof window === "undefined" || typeof Document === "undefined") return;
  const globalWindow = window as any;
  if (globalWindow[PRINT_PATCHED_KEY]) return;
  globalWindow[PRINT_PATCHED_KEY] = true;
  const originalWrite = Document.prototype.write;
  Document.prototype.write = function patchedWrite(...args: string[]) {
    const patchedArgs = args.map((arg) => typeof arg === "string" ? normaliseDynamicPrintHtml(arg) : arg);
    return originalWrite.apply(this, patchedArgs as any);
  };
}

function installDynamicReportFetchNormaliser() {
  if (typeof window === "undefined" || typeof window.fetch !== "function") return;
  const globalWindow = window as any;
  if (globalWindow[FETCH_PATCHED_KEY]) return;
  const originalFetch = window.fetch.bind(window);
  globalWindow[FETCH_PATCHED_KEY] = true;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = requestUrl(input);
    const isReportEndpoint = url.includes("/api/reports/preview") || url.includes("/api/reports/generate");
    let payload = requestBody(input, init);
    const definition = isReportEndpoint ? resolveDynamicDefinition(payload, null) : null;
    let nextInit = init;
    if (definition && payload && typeof init?.body === "string") nextInit = { ...init, body: JSON.stringify(enrichDynamicRequestBody(payload, definition)) };
    const response = await originalFetch(input, nextInit);
    if (!isReportEndpoint || !definition) return response;
    try {
      const json = await response.clone().json();
      const normalised = normaliseDynamicResponseBody(json, payload);
      const headers = new Headers(response.headers);
      headers.set("content-type", "application/json");
      return new Response(JSON.stringify(normalised), { status: response.status, statusText: response.statusText, headers });
    } catch { return response; }
  };
}

installDynamicReportFetchNormaliser();
installDynamicReportPrintGuard();

export default function ReportDynamicWrapper() {
  return <Report />;
}
