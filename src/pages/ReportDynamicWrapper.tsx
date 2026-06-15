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
  ui: {
    heading: string;
    intro: string;
    bullets: string[];
  };
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
    ],
    ui: {
      heading: "Compliance Report analysis",
      intro: "AI-generated compliance analysis focused on audit readiness, evidence quality, policy exceptions, OS support posture and governance sign-off.",
      bullets: [
        "Compliance content will focus only on audit evidence, exception ownership, OS compliance, software governance and SLA compliance.",
        "Charts and tables will show compliance posture, control gaps, evidence register and owner-based follow-up actions.",
        "AI Dynamic Reporting is generated once per day for this report title and must be reviewed before management sign-off."
      ]
    }
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
    ],
    ui: {
      heading: "Cost Saving Report analysis",
      intro: "AI-generated cost saving analysis focused on savings opportunities, software rationalisation, renewal cleanup, refresh planning and avoidable support workload.",
      bullets: [
        "Cost saving content will focus only on optimisation, duplicate or unused software, renewal cleanup, procurement decisions and refresh planning.",
        "Charts and tables will show saving opportunities, cost leakage signals, estimated optimisation areas and owner-based saving actions.",
        "AI Dynamic Reporting is generated once per day for this report title and must be reviewed before management sign-off."
      ]
    }
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
    ],
    ui: {
      heading: "Risk Management Report analysis",
      intro: "AI-generated risk management analysis focused on exposure, severity, unsupported OS, SLA pressure, stale telemetry and remediation ownership.",
      bullets: [
        "Risk content will focus only on exposure signals, severity, likelihood, impact, exception approval and remediation ownership.",
        "Charts and tables will show severity breakdown, risk register evidence and priority remediation actions.",
        "AI Dynamic Reporting is generated once per day for this report title and must be reviewed before management sign-off."
      ]
    }
  }
};

const DYNAMIC_REPORT_IDS = Object.keys(DYNAMIC_REPORTS);
const LAST_DYNAMIC_PAYLOAD_KEY = "__emaLastDynamicReportPayload";
const LAST_DYNAMIC_DEFINITION_KEY = "__emaLastDynamicReportDefinition";
const FETCH_PATCHED_KEY = "__emaDynamicReportFetchNormalisedV5";
const PRINT_PATCHED_KEY = "__emaDynamicReportPrintGuardInstalledV5";
const UI_PATCHED_KEY = "__emaDynamicReportUiGuardInstalledV5";
const DAILY_CACHE_PREFIX = "__emaDynamicReportDailyCache:v5:";
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

function reportDayKey() {
  return new Date().toISOString().slice(0, 10);
}

function dailyCacheKey(definition: DynamicReportDefinition, requestPayload: AnyRecord = {}) {
  const relation = requestPayload.relationID ?? requestPayload.filters?.relationID ?? "all";
  const group = requestPayload.deviceGroup || requestPayload.filters?.deviceGroup || "all";
  const status = requestPayload.status || requestPayload.filters?.status || "all";
  const range = requestPayload.dateRange || requestPayload.filters?.dateRange || "current-month";
  return `${DAILY_CACHE_PREFIX}${definition.id}:${reportDayKey()}:${relation}:${group}:${status}:${range}`;
}

function cleanDynamicText(value: any, fallback = "") {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  return text
    .replace(/AI Executive Summary/gi, "AI Dynamic Report")
    .replace(/Executive Management Brief/gi, "AI Dynamic Narrative")
    .replace(/Executive Summary/gi, "Dynamic Report")
    .replace(/executive summary/g, "dynamic report");
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
    "reporting cycle",
    "offline or not online",
    "stale or missing last-seen telemetry",
    "gemini flash executive analysis"
  ];
  return markers.some((marker) => text.includes(marker));
}

function dynamicAiInstruction(definition: DynamicReportDefinition) {
  return [
    `Generate a fresh ${definition.title} using Gemini Flash narrative.`,
    `Focus only on ${definition.promptFocus}.`,
    `Do not reuse Executive Summary wording and do not use the heading Immediate management attention is required.`,
    `Every paragraph, finding, table insight and recommendation must directly support ${definition.title}.`,
    "Do not copy the same paragraph structure across dynamic report titles.",
    `For ${definition.title}, avoid unrelated topics even when the source data contains endpoint, software or service desk metrics.`,
    `Include this disclaimer once: ${DAILY_DISCLAIMER}`
  ].join(" ");
}

function fallbackNarrative(definition: DynamicReportDefinition) {
  const byId: Record<string, { title: string; paragraphs: string[]; findings: string[] }> = {
    "dynamic-compliance-report": {
      title: "Compliance evidence requires owner validation before sign-off",
      paragraphs: [
        "This Compliance Report is an AI-assisted governance review for audit readiness, control evidence and exception ownership. The analysis focuses on whether inventory, OS, software and service records can support compliance sign-off.",
        "Management should confirm each compliance gap has a named owner, supporting evidence, target closure date and approved acceptance status before it is presented as closed.",
        "The recommended response is to validate compliance exceptions, confirm unsupported or unverified assets, and prepare a traceable evidence register before approval."
      ],
      findings: [
        "Compliance output must be reviewed against evidence quality.",
        "Exception ownership should be confirmed before sign-off.",
        "Audit-ready records should include owner, status and closure date."
      ]
    },
    "dynamic-cost-saving-report": {
      title: "Cost saving opportunities require tracked financial ownership",
      paragraphs: [
        "This Cost Saving Report is an AI-assisted optimisation review for recurring cost, renewal exposure and avoidable support workload. The analysis focuses on savings opportunities, not general endpoint health commentary.",
        "Management should separate quick-win savings from planned procurement decisions so each opportunity has an estimated value, owner, dependency and target review date.",
        "The recommended response is to create a savings tracker covering unused software, overlapping applications, refresh candidates and procurement decisions that can reduce recurring cost."
      ],
      findings: [
        "Savings items need owner and estimated value.",
        "Software rationalisation should be reviewed before renewal.",
        "Refresh planning should prioritise avoidable support cost."
      ]
    },
    "dynamic-risk-management-report": {
      title: "Risk exposure requires severity-based remediation ownership",
      paragraphs: [
        "This Risk Management Report is an AI-assisted exposure review for severity, remediation accountability and governance escalation. The analysis converts operational signals into a risk treatment plan.",
        "Management should review each risk signal by business impact, likelihood, owner and target date so unresolved operational gaps become accountable remediation actions.",
        "The recommended response is to maintain a risk register with severity, exception approval status, remediation evidence and escalation path for overdue items."
      ],
      findings: [
        "Risk items need severity and owner validation.",
        "Unsupported or stale assets should be treated as exposure signals.",
        "Remediation evidence should be tracked before governance review."
      ]
    }
  };
  return byId[definition.id];
}

function safeDynamicField(value: any, definition: DynamicReportDefinition, fallback: string) {
  const cleaned = cleanDynamicText(value);
  if (!cleaned || isStaticExecutiveTemplate(cleaned)) return fallback;
  return cleaned;
}

function sanitiseDynamicRow(row: any, definition: DynamicReportDefinition, index: number) {
  if (!row || typeof row !== "object") return row;
  const fallback = fallbackNarrative(definition);
  const insight = fallback.findings[index % fallback.findings.length] || definition.summaryLabel;
  const result: AnyRecord = { ...row };
  Object.keys(result).forEach((key) => {
    if (typeof result[key] !== "string") return;
    result[key] = safeDynamicField(result[key], definition, insight);
  });
  return result;
}

function normaliseDynamicSections(sections: any[], definition: DynamicReportDefinition) {
  const sourceSections = Array.isArray(sections) ? sections : [];
  const mapped = sourceSections.map((section, index) => {
    const type = String(section?.type || "table");
    const rows = Array.isArray(section?.rows) ? section.rows.map((row: any, rowIndex: number) => sanitiseDynamicRow(row, definition, rowIndex)) : [];
    return { ...section, title: definition.sectionTitles[type] || `${definition.title} Section ${index + 1}`, rows };
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

function normaliseRecommendations(rawPayload: AnyRecord, definition: DynamicReportDefinition) {
  const source = Array.isArray(rawPayload.recommendations) ? rawPayload.recommendations : [];
  const cleaned = source.map((item: any) => {
    if (typeof item === "string") {
      const action = safeDynamicField(item, definition, "");
      return action ? { priority: "AI", action } : null;
    }
    const action = safeDynamicField(item?.action || item?.recommendation || item?.description || "", definition, "");
    if (!action) return null;
    return { ...item, priority: item?.priority || item?.severity || "AI", action };
  }).filter(Boolean);
  return cleaned.length ? cleaned : definition.fallbackRecommendations;
}

function hasUsableAiNarrative(payload: AnyRecord, definition: DynamicReportDefinition) {
  const narrative = payload?.narrative || {};
  const summary = cleanDynamicText(narrative.executiveSummary || narrative.summary || "");
  const title = cleanDynamicText(narrative.title || "");
  return Boolean(
    payload?.report?.id === definition.id &&
    summary &&
    title &&
    !isStaticExecutiveTemplate(summary) &&
    !isStaticExecutiveTemplate(title)
  );
}

function readDailyCache(definition: DynamicReportDefinition, requestPayload: AnyRecord = {}) {
  if (typeof window === "undefined") return null;
  const cached = safeJsonParse(window.localStorage?.getItem(dailyCacheKey(definition, requestPayload)) || "");
  if (!cached || !hasUsableAiNarrative(cached, definition)) return null;
  return cached;
}

function writeDailyCache(definition: DynamicReportDefinition, payload: AnyRecord, requestPayload: AnyRecord = {}) {
  if (typeof window === "undefined" || !hasUsableAiNarrative(payload, definition)) return;
  try {
    window.localStorage.setItem(dailyCacheKey(definition, requestPayload), JSON.stringify(payload));
  } catch {
    // Storage can fail in private mode; live payload still renders.
  }
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
  const aiFindings = (Array.isArray(rawNarrative.keyFindings) ? rawNarrative.keyFindings : [])
    .map((item: any) => cleanDynamicText(item))
    .filter((item: string) => item && !isStaticExecutiveTemplate(item));
  const recommendations = normaliseRecommendations(rawPayload, definition);

  const normalised = {
    ...rawPayload,
    success: rawPayload.success !== false,
    mode: "dynamic-reporting",
    generatedAt: rawPayload.generatedAt || new Date().toISOString(),
    report: {
      ...existingReport,
      id: definition.id,
      title: definition.title,
      type: definition.type,
      description: definition.description,
      source: definition.source,
      category: "Dynamic Reporting",
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
      aiPrompt: requestPayload.aiPrompt || dynamicAiInstruction(definition),
      forceAiNarrative: true,
      disableStaticNarrative: true,
      dynamicReportType: definition.id,
      dynamicReportTitle: definition.title,
      dynamicReportCategory: "Dynamic Reporting",
      generationFrequency: "once-per-day",
      dailyGenerationKey: dailyCacheKey(definition, requestPayload),
      aiDisclaimer: DAILY_DISCLAIMER
    },
    narrative: {
      ...rawNarrative,
      title: useRawTitle ? rawTitle : fallback.title,
      executiveSummary: `${useRawSummary ? rawSummary : fallback.paragraphs.join("\n\n")}\n\n${DAILY_DISCLAIMER}`,
      keyFindings: (aiFindings.length ? aiFindings : fallback.findings).slice(0, 7),
      managementConclusion: useRawConclusion ? rawConclusion : `${definition.title} requires owner-led follow-up based on AI findings, available evidence and management priority.`,
      disclaimer: DAILY_DISCLAIMER,
      recommendations: recommendations.map((item: any) => item.action)
    },
    sections: normaliseDynamicSections(rawPayload.sections, definition),
    recommendations,
    dataSources: Array.isArray(rawPayload.dataSources) ? rawPayload.dataSources : [],
    exportData: { ...(rawPayload.exportData || {}), aiDisclaimer: DAILY_DISCLAIMER, generationFrequency: "once-per-day" }
  };

  if (typeof window !== "undefined") {
    (window as any)[LAST_DYNAMIC_PAYLOAD_KEY] = normalised;
    (window as any)[LAST_DYNAMIC_DEFINITION_KEY] = definition;
    document.documentElement.setAttribute("data-ema-dynamic-report", definition.id);
  }
  writeDailyCache(definition, normalised, requestPayload);
  scheduleDynamicUiPatch();
  return normalised;
}

function resolveDynamicDefinition(requestPayload: AnyRecord | null, payload: AnyRecord | null): DynamicReportDefinition | null {
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
  if (nestedDefinition) return { ...body, data: normaliseDynamicPayload(nestedPayload, requestPayload || {}, nestedDefinition) };
  return body;
}

function enrichDynamicRequestBody(payload: AnyRecord | null, definition: DynamicReportDefinition | null) {
  if (!payload || !definition) return payload;
  if (typeof window !== "undefined") {
    (window as any)[LAST_DYNAMIC_DEFINITION_KEY] = definition;
    document.documentElement.setAttribute("data-ema-dynamic-report", definition.id);
  }
  scheduleDynamicUiPatch();
  return {
    ...payload,
    useAiAnalysis: true,
    aiProvider: "google",
    aiEngine: "gemini-flash",
    aiModel: payload.aiModel || "gemini-2.5-flash",
    aiReportMode: "dynamic-reporting",
    dynamicReportType: definition.id,
    dynamicReportTitle: definition.title,
    dynamicReportCategory: "Dynamic Reporting",
    aiPrompt: payload.aiPrompt || dynamicAiInstruction(definition),
    aiInstruction: payload.aiInstruction || dynamicAiInstruction(definition),
    forceAiNarrative: true,
    disableStaticNarrative: true,
    aiTemperature: payload.aiTemperature ?? 0.85,
    aiUniquenessSeed: `${definition.id}-${reportDayKey()}`,
    generationFrequency: "once-per-day",
    dailyGenerationKey: dailyCacheKey(definition, payload),
    aiDisclaimer: DAILY_DISCLAIMER
  };
}

function htmlEscape(value: any) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function printParagraphsHtml(payload: AnyRecord) {
  const narrative = payload?.narrative || {};
  const paragraphs = String(narrative.executiveSummary || narrative.managementConclusion || "")
    .split(/(?:\n{2,}|\r?\n)/)
    .map((item) => cleanDynamicText(item))
    .filter(Boolean)
    .slice(0, 5);
  return paragraphs.map((paragraph) => `<p class="pdf-justified">${htmlEscape(paragraph)}</p>`).join("");
}

function normaliseDynamicPrintHtml(html: string) {
  if (typeof window === "undefined") return html;
  const payload = (window as any)[LAST_DYNAMIC_PAYLOAD_KEY];
  const definition = resolveDynamicDefinition(payload?.filters || null, payload || null) || (window as any)[LAST_DYNAMIC_DEFINITION_KEY];
  if (!payload || !definition) return html;

  let patched = html
    .replace(/Executive Management Brief/g, `${definition.title} AI Dynamic Narrative`)
    .replace(/Immediate management attention is required/g, cleanDynamicText(payload.narrative?.title || definition.title))
    .replace(/Gemini Flash executive analysis/g, definition.ui.heading)
    .replace(/AI report analysis/g, definition.ui.heading);

  const headline = cleanDynamicText(payload.narrative?.title || definition.title);
  const replacement = `<div class="pdf-summary-copy"><span class="pdf-eyebrow">${htmlEscape(definition.title)} AI Dynamic Narrative</span><h2>${htmlEscape(headline)}</h2>${printParagraphsHtml(payload)}<p class="pdf-justified"><strong>AI Dynamic Reporting Notice:</strong> ${htmlEscape(DAILY_DISCLAIMER)}</p></div>`;

  if (patched.includes("pdf-summary-copy")) {
    patched = patched.replace(/<div class="pdf-summary-copy">[\s\S]*?<\/div>/, replacement);
  }
  return patched;
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

function responseFromPayload(payload: AnyRecord, response?: Response) {
  const headers = new Headers(response?.headers || undefined);
  headers.set("content-type", "application/json");
  return new Response(JSON.stringify(payload), {
    status: response?.status || 200,
    statusText: response?.statusText || "OK",
    headers
  });
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
    if (!isReportEndpoint || !definition) return originalFetch(input, init);

    const cached = readDailyCache(definition, payload || {});
    if (cached) {
      (window as any)[LAST_DYNAMIC_PAYLOAD_KEY] = cached;
      (window as any)[LAST_DYNAMIC_DEFINITION_KEY] = definition;
      document.documentElement.setAttribute("data-ema-dynamic-report", definition.id);
      scheduleDynamicUiPatch();
      return responseFromPayload(cached);
    }

    let nextInit = init;
    if (payload && typeof init?.body === "string") {
      const enriched = enrichDynamicRequestBody(payload, definition);
      payload = enriched;
      nextInit = { ...init, body: JSON.stringify(enriched) };
    }

    const response = await originalFetch(input, nextInit);
    try {
      const json = await response.clone().json();
      const normalised = normaliseDynamicResponseBody(json, payload);
      return responseFromPayload(normalised, response);
    } catch {
      const fallback = normaliseDynamicPayload({ success: true }, payload || {}, definition);
      return responseFromPayload(fallback, response);
    }
  };
}

function activeDynamicDefinition(): DynamicReportDefinition | null {
  if (typeof window === "undefined") return null;
  const payload = (window as any)[LAST_DYNAMIC_PAYLOAD_KEY];
  const storedDefinition = (window as any)[LAST_DYNAMIC_DEFINITION_KEY] as DynamicReportDefinition | undefined;
  return resolveDynamicDefinition(payload?.filters || null, payload || null) || storedDefinition || null;
}

function applyDynamicReportLayout(definition: DynamicReportDefinition) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-ema-dynamic-report", definition.id);
  if (document.getElementById("ema-dynamic-report-ui-polish")) return;
  const style = document.createElement("style");
  style.id = "ema-dynamic-report-ui-polish";
  style.textContent = `
    :root[data-ema-dynamic-report] .ema-report-module-root { --dynamic-report-accent:${definition.color}; --dynamic-report-soft:rgba(16,185,129,.12); }
    :root[data-ema-dynamic-report=\"dynamic-compliance-report\"] .ema-report-module-root { --dynamic-report-accent:#f59e0b; --dynamic-report-soft:rgba(245,158,11,.13); }
    :root[data-ema-dynamic-report=\"dynamic-cost-saving-report\"] .ema-report-module-root { --dynamic-report-accent:#10b981; --dynamic-report-soft:rgba(16,185,129,.13); }
    :root[data-ema-dynamic-report=\"dynamic-risk-management-report\"] .ema-report-module-root { --dynamic-report-accent:#ef4444; --dynamic-report-soft:rgba(239,68,68,.13); }
    :root[data-ema-dynamic-report] .ema-report-module-root .settings-layout.report-settings-layout{gap:14px!important;align-items:stretch!important;min-height:calc(100vh - 86px)!important;}
    :root[data-ema-dynamic-report] .ema-report-module-root .settings-sidebar{width:292px!important;flex:0 0 292px!important;border-radius:22px!important;overflow:hidden!important;}
    :root[data-ema-dynamic-report] .ema-report-module-root .settings-content.report-main-content{min-width:0!important;overflow:hidden!important;}
    :root[data-ema-dynamic-report] .ema-report-module-root .report-workspace-shell{border-radius:24px!important;overflow:hidden!important;box-shadow:0 18px 44px rgba(15,35,71,.08)!important;}
    :root[data-ema-dynamic-report] .ema-report-module-root .report-workspace-body{padding:18px!important;overflow:auto!important;}
    :root[data-ema-dynamic-report] .ema-report-module-root .featured-report-layout{display:grid!important;grid-template-columns:minmax(0,1fr) 420px!important;gap:18px!important;align-items:start!important;width:100%!important;max-width:100%!important;}
    :root[data-ema-dynamic-report] .ema-report-module-root .featured-report-main-panel{min-width:0!important;gap:12px!important;}
    :root[data-ema-dynamic-report] .ema-report-module-root .report-config-panel{width:420px!important;max-width:420px!important;position:sticky!important;top:14px!important;align-self:start!important;}
    :root[data-ema-dynamic-report] .ema-report-module-root .report-config-panel .config-card{border-radius:20px!important;padding:16px!important;border:1px solid rgba(148,163,184,.28)!important;box-shadow:0 14px 34px rgba(15,35,71,.08)!important;}
    :root[data-ema-dynamic-report] .ema-report-module-root .config-form{display:grid!important;grid-template-columns:1fr 1fr!important;gap:10px!important;}
    :root[data-ema-dynamic-report] .ema-report-module-root .check-grid,:root[data-ema-dynamic-report] .ema-report-module-root .config-actions{grid-column:1/-1!important;}
    :root[data-ema-dynamic-report] .ema-report-module-root .report-pack-command-card,:root[data-ema-dynamic-report] .ema-report-module-root .selected-report-only-panel,:root[data-ema-dynamic-report] .ema-report-module-root .hardware-report-selector-card,:root[data-ema-dynamic-report] .ema-report-module-root .report-card{border-radius:18px!important;border-color:rgba(148,163,184,.28)!important;}
    :root[data-ema-dynamic-report] .ema-report-module-root .report-pack-command-card{background:linear-gradient(135deg,#fff 0%,var(--dynamic-report-soft) 100%)!important;border-color:rgba(16,185,129,.34)!important;}
    :root[data-ema-dynamic-report] .ema-report-module-root .report-pack-command-card h3,:root[data-ema-dynamic-report] .ema-report-module-root .report-card h3,:root[data-ema-dynamic-report] .ema-report-module-root .section-head h2{letter-spacing:-.02em!important;}
    :root[data-ema-dynamic-report] .ema-report-module-root .report-pack-command-card p,:root[data-ema-dynamic-report] .ema-report-module-root .report-card p,:root[data-ema-dynamic-report] .ema-report-module-root .report-card li{line-height:1.5!important;}
    @media (max-width:1320px){:root[data-ema-dynamic-report] .ema-report-module-root .featured-report-layout{grid-template-columns:1fr!important}:root[data-ema-dynamic-report] .ema-report-module-root .report-config-panel{width:100%!important;max-width:none!important;position:static!important}}
  `;
  document.head.appendChild(style);
}

function rewriteDynamicText(definition: DynamicReportDefinition) {
  if (typeof document === "undefined") return;
  const replacements = [
    { from: "AI report analysis", to: definition.ui.heading },
    { from: "Gemini Flash executive analysis", to: definition.ui.heading },
    { from: `${definition.title} can be generated as PDF / PowerPoint / Excel.`, to: definition.ui.bullets[0] },
    { from: "The PDF layout will include summary narrative, chart/graph, detail table, recommendation.", to: definition.ui.bullets[1] }
  ];

  document.querySelectorAll("h1,h2,h3,h4,p,li,span,strong,b,small").forEach((element) => {
    const text = element.textContent?.replace(/\s+/g, " ").trim();
    if (!text) return;
    const exact = replacements.find((item) => text === item.from);
    if (exact && element.textContent !== exact.to) {
      element.textContent = exact.to;
      return;
    }
    if (text.includes("Current scope:") && !text.includes("Once-per-day AI dynamic output")) {
      element.textContent = `${text} Once-per-day AI dynamic output.`;
      return;
    }
    if (text.startsWith("AI-generated") && text.toLowerCase().includes("report for") && text !== definition.ui.intro) {
      element.textContent = definition.ui.intro;
    }
  });
}

function patchDynamicReportUi() {
  const definition = activeDynamicDefinition();
  if (!definition) return;
  applyDynamicReportLayout(definition);
  rewriteDynamicText(definition);
}

function scheduleDynamicUiPatch() {
  if (typeof window === "undefined") return;
  window.requestAnimationFrame(() => patchDynamicReportUi());
  window.setTimeout(() => patchDynamicReportUi(), 120);
}

function installDynamicReportUiGuard() {
  if (typeof window === "undefined" || typeof MutationObserver === "undefined") return;
  const globalWindow = window as any;
  if (globalWindow[UI_PATCHED_KEY]) return;
  globalWindow[UI_PATCHED_KEY] = true;
  const observer = new MutationObserver(() => scheduleDynamicUiPatch());
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  scheduleDynamicUiPatch();
}

installDynamicReportFetchNormaliser();
installDynamicReportPrintGuard();
installDynamicReportUiGuard();

export default function ReportDynamicWrapper() {
  return <Report />;
}
