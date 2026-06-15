import { Response } from 'express';
import { getPool, sql } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { getPagination, buildResponse } from '../utils/pagination';

declare const fetch: any;

type ReportDefinition = {
  id: string;
  title: string;
  type: string;
  description: string;
  source: string;
  outputs: string[];
  category?: string;
};

type DynamicDefinition = ReportDefinition & {
  focus: string;
  bannedFocus: string;
  kpiTitle: string;
  barTitle: string;
  riskTitle: string;
  tableTitle: string;
};

type ReportRequest = Record<string, any>;
type ReportPayload = Record<string, any>;

const DAILY_DISCLAIMER = 'AI Dynamic Reporting is generated once per day for each selected report title. The content reflects the latest available dataset at generation time and should be reviewed by the report owner before management sign-off.';
const dailyCache = new Map<string, ReportPayload>();

const DYNAMIC_REPORTS: Record<string, DynamicDefinition> = {
  'dynamic-compliance-report': {
    id: 'dynamic-compliance-report',
    title: 'Compliance Report',
    type: 'Compliance',
    category: 'Dynamic Reporting',
    description: 'AI-generated compliance report with posture analysis, evidence summary and governance actions.',
    source: 'Endpoint Inventory + Software Inventory + OS Compliance + Service Desk SLA',
    outputs: ['PDF', 'PowerPoint', 'Excel'],
    focus: 'compliance posture, audit readiness, evidence quality, policy exceptions, OS support posture, software governance and SLA compliance',
    bannedFocus: 'cost saving, budget optimisation, procurement savings or general executive endpoint health summary',
    kpiTitle: 'Compliance Posture KPI',
    barTitle: 'Compliance Gap Breakdown',
    riskTitle: 'Compliance Exceptions & Audit Exposure',
    tableTitle: 'Compliance Evidence Register'
  },
  'dynamic-cost-saving-report': {
    id: 'dynamic-cost-saving-report',
    title: 'Cost Saving Report',
    type: 'Cost Saving',
    category: 'Dynamic Reporting',
    description: 'AI-generated cost saving report for refresh planning, software rationalisation and optimisation opportunities.',
    source: 'Hardware Lifecycle + Software Inventory + Endpoint Utilisation + Resource Planning',
    outputs: ['PDF', 'PowerPoint', 'Excel'],
    focus: 'cost saving opportunities, software rationalisation, duplicate or unused tools, hardware refresh planning, renewal cleanup, avoidable support cost and procurement optimisation',
    bannedFocus: 'compliance sign-off, audit evidence, risk committee wording or generic executive endpoint health summary',
    kpiTitle: 'Cost Saving Opportunity KPI',
    barTitle: 'Savings Opportunity Breakdown',
    riskTitle: 'Cost Leakage & Optimisation Risk',
    tableTitle: 'Cost Saving Evidence Register'
  },
  'dynamic-risk-management-report': {
    id: 'dynamic-risk-management-report',
    title: 'Risk Management Report',
    type: 'Risk',
    category: 'Dynamic Reporting',
    description: 'AI-generated risk management report with exposure analysis, severity view and remediation priorities.',
    source: 'Endpoint Risk + Unsupported OS + Service Desk SLA + Data Quality + Software Risk',
    outputs: ['PDF', 'PowerPoint', 'Excel'],
    focus: 'risk exposure, severity, likelihood, business impact, unsupported OS, SLA pressure, stale telemetry, data quality, exception approval and remediation ownership',
    bannedFocus: 'cost saving proposal, procurement optimisation, audit-only evidence wording or generic executive endpoint health summary',
    kpiTitle: 'Risk Exposure KPI',
    barTitle: 'Severity Breakdown',
    riskTitle: 'Risk Register & Remediation Priority',
    tableTitle: 'Risk Evidence Register'
  }
};

const REPORT_CATALOG = [
  {
    name: 'Featured Reports',
    desc: 'Focused report packs for management, inventory, operations, security and software governance.',
    icon: 'chart',
    items: [
      { id: 'ai-executive-summary', title: 'AI Executive Summary', description: 'Executive KPI summary, key findings and priority recommendations.', type: 'Summary', source: 'Endpoint Inventory + Service Desk + Software Inventory + Jobs + Geolocation', outputs: ['PDF', 'PowerPoint', 'Excel'] },
      { id: 'client-summary-rnr', title: 'Client RNR Report', description: 'Client-facing risk and resource planning pack.', type: 'Summary', source: 'Endpoint Inventory + Subscription + Asset Pricing + Software Inventory + Browser Risk', outputs: ['PDF', 'PowerPoint', 'Excel'] },
      { id: 'hardware-asset-lifecycle', title: 'Hardware Lifecycle', description: 'Asset estate, device age and refresh planning.', type: 'Summary', source: 'Hardware Inventory + Asset Lifecycle + Endpoint Inventory', outputs: ['PDF', 'Excel'] },
      { id: 'operations-health-sla', title: 'Ops Health & SLA', description: 'Endpoint health, service activity and SLA follow-up.', type: 'Summary', source: 'Endpoint Inventory + Jobs + HD_Incidents + SLA Due', outputs: ['PDF', 'PowerPoint', 'Excel'] },
      { id: 'security-compliance-exposure', title: 'Security Exposure', description: 'Endpoint risk, compliance gaps and exception action list.', type: 'Risk', source: 'Device Status + OS Inventory + Software Inventory + Data Quality + Service Desk SLA', outputs: ['PDF', 'Excel'] },
      { id: 'software-application-governance', title: 'Software Governance', description: 'Application inventory, licence review and cleanup actions.', type: 'Compliance', source: 'TSMDM_SW_LIST + TS_SW_CATEGORY + Application Metering + Browser Inventory', outputs: ['PDF', 'Excel'] }
    ]
  },
  {
    name: 'Dynamic Reporting',
    desc: 'Gemini Flash generated report modules for compliance, savings and risk management.',
    icon: 'chart',
    items: Object.values(DYNAMIC_REPORTS)
  }
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function dailyKey(definition: DynamicDefinition, reqBody: ReportRequest) {
  const relation = reqBody.relationID ?? 'all';
  const group = reqBody.deviceGroup || 'all';
  const status = reqBody.status || 'all';
  const range = reqBody.dateRange || 'current-month';
  return `${definition.id}:${todayKey()}:${relation}:${group}:${status}:${range}`;
}

function unwrapCount(result: any, key = 'cnt') {
  return Number(result?.recordset?.[0]?.[key] || 0);
}

async function safeQuery(pool: any, query: string) {
  try {
    return await pool.request().query(query);
  } catch {
    return { recordset: [] };
  }
}

async function collectReportMetrics() {
  const pool = await getPool();
  const [assets, activeAssets, inactiveAssets, software, criticalEvents, patch, network, departments] = await Promise.all([
    safeQuery(pool, 'SELECT COUNT(*) as cnt FROM hardware_assets'),
    safeQuery(pool, "SELECT COUNT(*) as cnt FROM hardware_assets WHERE status IN ('Active','Online')"),
    safeQuery(pool, "SELECT COUNT(*) as cnt FROM hardware_assets WHERE status NOT IN ('Active','Online') OR status IS NULL"),
    safeQuery(pool, 'SELECT COUNT(*) as cnt FROM software_inventory'),
    safeQuery(pool, "SELECT COUNT(*) as cnt FROM event_logs WHERE severity IN ('Critical','High')"),
    safeQuery(pool, "SELECT COUNT(*) as total, SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed FROM patch_records"),
    safeQuery(pool, 'SELECT COUNT(*) as cnt FROM network_devices'),
    safeQuery(pool, 'SELECT department as label, COUNT(*) as value FROM hardware_assets GROUP BY department')
  ]);

  const patchTotal = unwrapCount(patch, 'total');
  const patchCompleted = unwrapCount(patch, 'completed');
  const totalAssets = unwrapCount(assets);
  const onlineAssets = unwrapCount(activeAssets);
  const offlineAssets = unwrapCount(inactiveAssets);
  const softwareCount = unwrapCount(software);
  const criticalCount = unwrapCount(criticalEvents);
  const patchCompliance = patchTotal > 0 ? Math.round((patchCompleted / patchTotal) * 100) : 0;
  const onlineRate = totalAssets > 0 ? Math.round((onlineAssets / totalAssets) * 100) : 0;

  return {
    totalAssets,
    onlineAssets,
    offlineAssets,
    onlineRate,
    softwareCount,
    criticalCount,
    patchTotal,
    patchCompleted,
    patchCompliance,
    networkDevices: unwrapCount(network),
    departments: departments.recordset || []
  };
}

function reportSpecificMetrics(definition: DynamicDefinition, base: any) {
  if (definition.id === 'dynamic-cost-saving-report') {
    const softwareRationalisation = Math.max(0, Math.round(base.softwareCount * 0.12));
    const refreshCandidates = Math.max(0, base.offlineAssets);
    const avoidableSupport = Math.max(0, base.criticalCount + Math.round(base.offlineAssets * 0.25));
    return {
      totalAssets: base.totalAssets,
      softwareCount: base.softwareCount,
      optimisationScore: Math.max(0, 100 - Math.min(70, softwareRationalisation + refreshCandidates + avoidableSupport)),
      softwareRationalisation,
      refreshCandidates,
      avoidableSupport,
      savingsOpportunities: softwareRationalisation + refreshCandidates + avoidableSupport,
      onlineRate: base.onlineRate
    };
  }

  if (definition.id === 'dynamic-risk-management-report') {
    const highRisk = base.criticalCount + base.offlineAssets;
    const mediumRisk = Math.max(0, base.totalAssets - base.onlineAssets);
    return {
      totalAssets: base.totalAssets,
      highRisk,
      mediumRisk,
      riskScore: Math.max(0, 100 - Math.min(90, highRisk + mediumRisk)),
      unsupportedExposure: base.patchCompliance < 85 ? base.patchTotal - base.patchCompleted : 0,
      staleTelemetry: base.offlineAssets,
      softwareRisk: Math.round(base.softwareCount * 0.05),
      onlineRate: base.onlineRate
    };
  }

  const complianceExceptions = Math.max(0, base.patchTotal - base.patchCompleted + base.criticalCount + base.offlineAssets);
  return {
    totalAssets: base.totalAssets,
    complianceScore: Math.max(0, Math.min(100, Math.round((base.patchCompliance + base.onlineRate) / 2) - base.criticalCount)),
    patchCompliance: base.patchCompliance,
    complianceExceptions,
    evidenceRecords: base.softwareCount + base.totalAssets,
    auditGaps: Math.max(0, base.patchTotal - base.patchCompleted),
    slaExposure: base.criticalCount,
    onlineRate: base.onlineRate
  };
}

function buildSections(definition: DynamicDefinition, metrics: any) {
  if (definition.id === 'dynamic-cost-saving-report') {
    return [
      { type: 'kpi', title: definition.kpiTitle, rows: [
        { label: 'Savings Opportunities', value: metrics.savingsOpportunities, note: 'Total optimisation items requiring commercial review.' },
        { label: 'Software Rationalisation', value: metrics.softwareRationalisation, note: 'Potential duplicate, unused or renewal cleanup candidates.' },
        { label: 'Refresh Candidates', value: metrics.refreshCandidates, note: 'Endpoint refresh planning candidates linked to avoidable support cost.' },
        { label: 'Optimisation Score', value: `${metrics.optimisationScore}%`, note: 'Higher score means lower cost leakage exposure.' }
      ]},
      { type: 'bar', title: definition.barTitle, rows: [
        { label: 'Software rationalisation', value: metrics.softwareRationalisation },
        { label: 'Refresh planning', value: metrics.refreshCandidates },
        { label: 'Avoidable support workload', value: metrics.avoidableSupport }
      ]},
      { type: 'risk', title: definition.riskTitle, rows: [
        { area: 'Renewal Cleanup', severity: 'High', finding: `${metrics.softwareRationalisation} software item(s) should be reviewed for rationalisation before renewal.`, action: 'Assign procurement or application owner to validate removal, consolidation or renewal decision.' },
        { area: 'Refresh Planning', severity: 'Medium', finding: `${metrics.refreshCandidates} endpoint(s) should be reviewed for refresh planning and avoidable support cost.`, action: 'Prioritise refresh plan by business impact and support workload.' },
        { area: 'Support Cost', severity: 'Medium', finding: `${metrics.avoidableSupport} support-cost signal(s) may create avoidable operational spend.`, action: 'Track avoidable support workload as a saving opportunity with owner and target date.' }
      ]},
      { type: 'table', title: definition.tableTitle, columns: ['opportunity', 'value', 'owner', 'nextAction'], rows: [
        { opportunity: 'Software rationalisation', value: metrics.softwareRationalisation, owner: 'Application Owner', nextAction: 'Review duplicate, unused and renewal candidates.' },
        { opportunity: 'Endpoint refresh planning', value: metrics.refreshCandidates, owner: 'Asset / Procurement Team', nextAction: 'Create refresh candidate shortlist with estimated value.' },
        { opportunity: 'Avoidable support workload', value: metrics.avoidableSupport, owner: 'Operations Manager', nextAction: 'Quantify recurring effort and convert to saving tracker.' }
      ]}
    ];
  }

  if (definition.id === 'dynamic-risk-management-report') {
    return [
      { type: 'kpi', title: definition.kpiTitle, rows: [
        { label: 'High Risk Items', value: metrics.highRisk, note: 'Endpoint and event exposure requiring urgent review.' },
        { label: 'Medium Risk Items', value: metrics.mediumRisk, note: 'Items requiring owner validation and monitoring.' },
        { label: 'Unsupported Exposure', value: metrics.unsupportedExposure, note: 'Patch or support gap exposure.' },
        { label: 'Risk Score', value: `${metrics.riskScore}%`, note: 'Higher score means lower current exposure.' }
      ]},
      { type: 'bar', title: definition.barTitle, rows: [
        { label: 'High risk', value: metrics.highRisk },
        { label: 'Medium risk', value: metrics.mediumRisk },
        { label: 'Unsupported exposure', value: metrics.unsupportedExposure },
        { label: 'Software risk', value: metrics.softwareRisk }
      ]},
      { type: 'risk', title: definition.riskTitle, rows: [
        { area: 'Endpoint Exposure', severity: 'High', finding: `${metrics.highRisk} high-risk signal(s) require remediation ownership.`, action: 'Assign risk owner, due date and evidence requirement for each high-risk item.' },
        { area: 'Unsupported / Patch Exposure', severity: metrics.unsupportedExposure > 0 ? 'High' : 'Low', finding: `${metrics.unsupportedExposure} unsupported or patch exposure item(s) need validation.`, action: 'Validate support status and create remediation or exception approval.' },
        { area: 'Telemetry Confidence', severity: metrics.staleTelemetry > 0 ? 'Medium' : 'Low', finding: `${metrics.staleTelemetry} stale or offline signal(s) may hide risk exposure.`, action: 'Refresh agent status and confirm ownership before governance review.' }
      ]},
      { type: 'table', title: definition.tableTitle, columns: ['risk', 'severity', 'owner', 'remediation'], rows: [
        { risk: 'High-risk endpoint exposure', severity: 'High', owner: 'Risk Owner', remediation: 'Create remediation plan with target date and evidence.' },
        { risk: 'Unsupported or patch exposure', severity: metrics.unsupportedExposure > 0 ? 'High' : 'Monitor', owner: 'Endpoint Team', remediation: 'Confirm support status and exception approval.' },
        { risk: 'Software risk', severity: 'Medium', owner: 'Application Owner', remediation: 'Validate sensitive or unwanted application exposure.' }
      ]}
    ];
  }

  return [
    { type: 'kpi', title: definition.kpiTitle, rows: [
      { label: 'Compliance Score', value: `${metrics.complianceScore}%`, note: 'Derived from patch, availability and exception evidence.' },
      { label: 'Patch Compliance', value: `${metrics.patchCompliance}%`, note: 'Completed patch records against total patch scope.' },
      { label: 'Compliance Exceptions', value: metrics.complianceExceptions, note: 'Open evidence, patch or operational exceptions requiring owner sign-off.' },
      { label: 'Evidence Records', value: metrics.evidenceRecords, note: 'Inventory and software records available for compliance evidence.' }
    ]},
    { type: 'bar', title: definition.barTitle, rows: [
      { label: 'Audit gaps', value: metrics.auditGaps },
      { label: 'SLA / event exposure', value: metrics.slaExposure },
      { label: 'Evidence records', value: metrics.evidenceRecords },
      { label: 'Compliance exceptions', value: metrics.complianceExceptions }
    ]},
    { type: 'risk', title: definition.riskTitle, rows: [
      { area: 'Audit Evidence', severity: metrics.auditGaps > 0 ? 'High' : 'Low', finding: `${metrics.auditGaps} audit evidence gap(s) require validation.`, action: 'Attach evidence owner, status and target closure date.' },
      { area: 'Policy Exception', severity: metrics.complianceExceptions > 0 ? 'Medium' : 'Low', finding: `${metrics.complianceExceptions} compliance exception(s) need owner sign-off.`, action: 'Convert exception records into a compliance action register.' },
      { area: 'Software Governance', severity: 'Medium', finding: `${metrics.evidenceRecords} evidence record(s) are available for compliance validation.`, action: 'Review software and OS evidence before management sign-off.' }
    ]},
    { type: 'table', title: definition.tableTitle, columns: ['control', 'evidence', 'status', 'nextAction'], rows: [
      { control: 'Patch compliance', evidence: `${metrics.patchCompliance}%`, status: metrics.patchCompliance >= 85 ? 'Controlled' : 'Exception', nextAction: 'Validate patch evidence and close gaps.' },
      { control: 'Audit exception register', evidence: metrics.complianceExceptions, status: metrics.complianceExceptions > 0 ? 'Action Required' : 'Controlled', nextAction: 'Assign owner and target date.' },
      { control: 'Software governance evidence', evidence: metrics.evidenceRecords, status: 'Review', nextAction: 'Confirm evidence quality before sign-off.' }
    ]}
  ];
}

function fallbackNarrative(definition: DynamicDefinition, metrics: any) {
  if (definition.id === 'dynamic-cost-saving-report') {
    return {
      title: 'Cost saving opportunities require tracked financial ownership',
      executiveSummary: `This Cost Saving Report focuses only on optimisation and cost reduction opportunities. The current dataset shows ${metrics.savingsOpportunities} saving opportunity signal(s), including ${metrics.softwareRationalisation} software rationalisation candidate(s), ${metrics.refreshCandidates} refresh planning candidate(s) and ${metrics.avoidableSupport} avoidable support workload signal(s).\n\nManagement should convert these items into a savings tracker with estimated value, owner, decision status and target review date. The report should not be treated as an executive endpoint health summary; its purpose is to support budget discussion, renewal cleanup and procurement planning.`,
      keyFindings: [
        `${metrics.softwareRationalisation} software item(s) should be reviewed for rationalisation or renewal cleanup.`,
        `${metrics.refreshCandidates} endpoint(s) require refresh planning assessment to reduce avoidable support cost.`,
        `${metrics.avoidableSupport} support workload signal(s) should be quantified as possible recurring cost leakage.`
      ],
      managementConclusion: 'Cost saving follow-up should be owned by procurement, operations and application owners with a single savings tracker.',
      recommendations: [
        'Create a cost saving tracker with opportunity value, owner and target date.',
        'Validate unused, duplicate or low-value software before renewal.',
        'Prioritise refresh planning where old or problematic endpoints create avoidable support cost.'
      ]
    };
  }

  if (definition.id === 'dynamic-risk-management-report') {
    return {
      title: 'Risk exposure requires severity-based remediation ownership',
      executiveSummary: `This Risk Management Report focuses only on exposure, severity and remediation accountability. The current dataset shows ${metrics.highRisk} high-risk signal(s), ${metrics.mediumRisk} medium-risk signal(s), ${metrics.unsupportedExposure} unsupported exposure item(s) and ${metrics.softwareRisk} software risk signal(s).\n\nManagement should convert each exposure into a risk register entry with owner, target date, severity, exception status and remediation evidence. The report should not be used as a cost saving or generic executive summary; its purpose is risk treatment and governance escalation.`,
      keyFindings: [
        `${metrics.highRisk} high-risk signal(s) require urgent owner assignment and remediation tracking.`,
        `${metrics.unsupportedExposure} unsupported or patch exposure item(s) require validation or approved exception.`,
        `${metrics.softwareRisk} software risk signal(s) should be reviewed for exposure and remediation evidence.`
      ],
      managementConclusion: 'Risk management follow-up must be severity-led and tracked through a formal risk register.',
      recommendations: [
        'Assign risk owners and target dates for high-risk records.',
        'Validate unsupported OS, patch exposure and stale telemetry before governance review.',
        'Maintain remediation evidence and exception approval status for overdue items.'
      ]
    };
  }

  return {
    title: 'Compliance evidence requires owner validation before sign-off',
    executiveSummary: `This Compliance Report focuses only on audit readiness, control evidence and exception ownership. The current dataset shows a ${metrics.complianceScore}% compliance score, ${metrics.patchCompliance}% patch compliance, ${metrics.complianceExceptions} compliance exception(s) and ${metrics.evidenceRecords} evidence record(s) available for review.\n\nManagement should validate each exception against owner, evidence quality, status and closure date before sign-off. The report should not be treated as a cost saving or generic executive summary; its purpose is compliance readiness and management approval evidence.`,
    keyFindings: [
      `${metrics.complianceExceptions} compliance exception(s) require owner validation and target closure date.`,
      `${metrics.auditGaps} audit gap(s) should be reviewed against supporting evidence.`,
      `${metrics.evidenceRecords} evidence record(s) are available for compliance validation and audit preparation.`
    ],
    managementConclusion: 'Compliance follow-up should produce an evidence register that is ready for management sign-off.',
    recommendations: [
      'Create a compliance action register with owner, evidence and target closure date.',
      'Validate patch and OS support posture before audit sign-off.',
      'Confirm exception acceptance status for any unresolved compliance item.'
    ]
  };
}

function extractJsonObject(text: string) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function generateAiNarrative(definition: DynamicDefinition, metrics: any, sections: any[]) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey || typeof fetch !== 'function') return fallbackNarrative(definition, metrics);

  const prompt = `You are generating an EMA AI Dynamic Reporting document.\nReport title: ${definition.title}\nAllowed topic only: ${definition.focus}\nDo not discuss: ${definition.bannedFocus}\nRules:\n1. Content must be specific to ${definition.title}.\n2. Do not reuse Executive Summary wording.\n3. Do not use headings like "Immediate management attention is required".\n4. Do not mention topics outside the title. For Cost Saving Report, discuss savings only. For Compliance Report, discuss compliance only. For Risk Management Report, discuss risk only.\n5. Include this disclaimer in the conclusion: ${DAILY_DISCLAIMER}\nReturn JSON only with keys: title, executiveSummary, keyFindings, managementConclusion, recommendations.\nMetrics: ${JSON.stringify(metrics)}\nSections: ${JSON.stringify(sections)}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const json = await response.json();
    const text = json?.candidates?.[0]?.content?.parts?.map((part: any) => part.text || '').join('\n') || '';
    const parsed = extractJsonObject(text);
    if (!parsed) return fallbackNarrative(definition, metrics);
    return {
      title: parsed.title || fallbackNarrative(definition, metrics).title,
      executiveSummary: parsed.executiveSummary || fallbackNarrative(definition, metrics).executiveSummary,
      keyFindings: Array.isArray(parsed.keyFindings) ? parsed.keyFindings.slice(0, 7) : fallbackNarrative(definition, metrics).keyFindings,
      managementConclusion: parsed.managementConclusion || fallbackNarrative(definition, metrics).managementConclusion,
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 7) : fallbackNarrative(definition, metrics).recommendations
    };
  } catch {
    return fallbackNarrative(definition, metrics);
  }
}

function resolveDefinition(reqBody: ReportRequest): DynamicDefinition {
  const requestedId = String(reqBody.dynamicReportType || reqBody.reportId || reqBody.report?.id || '').trim();
  return DYNAMIC_REPORTS[requestedId] || DYNAMIC_REPORTS['dynamic-compliance-report'];
}

async function buildDynamicReport(reqBody: ReportRequest, mode: 'preview' | 'generate') {
  const definition = resolveDefinition(reqBody);
  const cacheKey = dailyKey(definition, reqBody);
  if (mode === 'generate' && dailyCache.has(cacheKey)) {
    return dailyCache.get(cacheKey) as ReportPayload;
  }

  const baseMetrics = await collectReportMetrics();
  const metrics = reportSpecificMetrics(definition, baseMetrics);
  const sections = buildSections(definition, metrics);
  const ai = await generateAiNarrative(definition, metrics, sections);
  const generatedAt = new Date().toISOString();
  const recommendations = (ai.recommendations || []).map((action: string, index: number) => ({ priority: index === 0 ? 'High' : index === 1 ? 'Medium' : 'Monitor', action }));

  const payload: ReportPayload = {
    success: true,
    mode: 'dynamic-reporting',
    generatedAt,
    report: definition,
    filters: {
      ...reqBody,
      useAiAnalysis: true,
      aiEngine: 'gemini-flash',
      aiModel: 'gemini-2.5-flash',
      aiReportMode: 'dynamic-reporting',
      dynamicReportType: definition.id,
      dynamicReportTitle: definition.title,
      dynamicReportCategory: 'Dynamic Reporting',
      generationFrequency: 'once-per-day',
      dailyGenerationKey: cacheKey,
      aiDisclaimer: DAILY_DISCLAIMER
    },
    metrics,
    narrative: {
      title: ai.title,
      period: reqBody.dateRange || 'current-month',
      scope: reqBody.relationID ? `Site ${reqBody.relationID}` : 'All Sites',
      executiveSummary: `${ai.executiveSummary}\n\n${DAILY_DISCLAIMER}`,
      keyFindings: ai.keyFindings || [],
      managementConclusion: ai.managementConclusion,
      recommendations: ai.recommendations || [],
      disclaimer: DAILY_DISCLAIMER
    },
    sections: [
      { type: 'notice', title: 'AI Dynamic Reporting Notice', rows: [
        { label: 'Generation Frequency', value: 'Once per day', note: cacheKey },
        { label: 'Disclaimer', value: DAILY_DISCLAIMER, note: definition.title }
      ]},
      ...sections
    ],
    recommendations,
    dataSources: [
      { name: 'Hardware Inventory', table: 'hardware_assets', rows: baseMetrics.totalAssets },
      { name: 'Software Inventory', table: 'software_inventory', rows: baseMetrics.softwareCount },
      { name: 'Patch Records', table: 'patch_records', rows: baseMetrics.patchTotal },
      { name: 'Event Logs', table: 'event_logs', rows: baseMetrics.criticalCount }
    ],
    exportData: {
      metrics: [metrics],
      sections,
      recommendations,
      aiDisclaimer: [{ value: DAILY_DISCLAIMER }]
    }
  };

  if (mode === 'generate') dailyCache.set(cacheKey, payload);
  return payload;
}

export async function getCatalog(_req: AuthRequest, res: Response): Promise<void> {
  res.json({ status: 'success', data: REPORT_CATALOG, message: '' });
}

export async function getOptions(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const pool = await getPool();
    const siteRows = await safeQuery(pool, 'SELECT DISTINCT department as name FROM hardware_assets WHERE department IS NOT NULL');
    const sites = (siteRows.recordset || []).map((row: any, index: number) => ({ id: index + 1, name: row.name || `Site ${index + 1}` }));
    res.json({
      status: 'success',
      data: {
        sites,
        groups: [{ value: 'all', label: 'All Groups' }, { value: 'em', label: 'EM Devices' }, { value: 'mdm', label: 'MDM Devices' }],
        statuses: [{ value: 'all', label: 'All Status' }, { value: 'online', label: 'Online' }, { value: 'offline', label: 'Offline' }, { value: 'stale', label: 'Stale Sync' }, { value: 'locked', label: 'Locked' }],
        dateRanges: [{ value: 'current-month', label: 'Current Month' }, { value: 'last-7-days', label: 'Last 7 Days' }, { value: 'last-30-days', label: 'Last 30 Days' }, { value: 'quarter-to-date', label: 'Quarter to Date' }, { value: 'year-to-date', label: 'Year to Date' }, { value: 'custom', label: 'Custom Range' }],
        outputFormats: [{ value: 'PDF', label: 'PDF' }, { value: 'Excel', label: 'Excel / CSV' }, { value: 'PowerPoint', label: 'PowerPoint' }]
      },
      message: ''
    });
  } catch {
    res.json({ status: 'success', data: { sites: [], groups: [], statuses: [], dateRanges: [], outputFormats: [] }, message: '' });
  }
}

export async function preview(req: AuthRequest, res: Response): Promise<void> {
  try {
    const payload = await buildDynamicReport(req.body || {}, 'preview');
    res.json(payload);
  } catch {
    res.status(500).json({ status: 'error', message: 'Failed to preview dynamic report' });
  }
}

export async function generate(req: AuthRequest, res: Response): Promise<void> {
  try {
    const payload = await buildDynamicReport(req.body || {}, 'generate');
    res.json(payload);
  } catch {
    res.status(500).json({ status: 'error', message: 'Failed to generate dynamic report' });
  }
}

export async function getReport(req: AuthRequest, res: Response): Promise<void> {
  const definition = DYNAMIC_REPORTS[req.params.id];
  if (!definition) {
    res.status(404).json({ status: 'error', message: 'Report not found' });
    return;
  }
  try {
    const payload = await buildDynamicReport({ ...req.query, reportId: definition.id, dynamicReportType: definition.id }, 'preview');
    res.json(payload);
  } catch {
    res.status(500).json({ status: 'error', message: 'Failed to load report' });
  }
}

export async function getAll(req: AuthRequest, res: Response): Promise<void> {
  const { page, limit, offset } = getPagination(req);
  try {
    const pool = await getPool();
    const count = await pool.request().query('SELECT COUNT(*) as total FROM summary_reports');
    const result = await pool.request()
      .input('offset', sql.Int, offset).input('limit', sql.Int, limit)
      .query(`SELECT id, title, category, generated_by as generatedBy, status, created_at as createdAt
        FROM summary_reports ORDER BY created_at DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`);
    res.json({ status: 'success', data: buildResponse(result.recordset, count.recordset[0].total, page, limit), message: '' });
  } catch { res.status(500).json({ status: 'error', message: 'Server error' }); }
}

export async function create(req: AuthRequest, res: Response): Promise<void> {
  const { title, category } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('title', sql.NVarChar, title)
      .input('category', sql.NVarChar, category || 'General')
      .input('generatedBy', sql.NVarChar, req.user?.username || 'system')
      .query(`INSERT INTO summary_reports (title, category, generated_by, status, created_at)
        VALUES (@title, @category, @generatedBy, 'Completed', GETDATE())`);
    res.status(201).json({ status: 'success', data: null, message: 'Report generated' });
  } catch { res.status(500).json({ status: 'error', message: 'Server error' }); }
}
