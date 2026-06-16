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

const METERING_REPORTS: Record<string, ReportDefinition> = {
  'software-metering-report': {
    id: 'software-metering-report',
    title: 'Software Metering Report',
    type: 'Metering',
    category: 'Metering Reports',
    description: 'Software installation, licence utilisation, overuse exposure and cleanup planning report.',
    source: 'Software Inventory + Licence Usage + Installation Evidence',
    outputs: ['PDF', 'Excel']
  },
  'application-metering-report': {
    id: 'application-metering-report',
    title: 'Application Metering Report',
    type: 'Metering',
    category: 'Metering Reports',
    description: 'Application usage, active users, usage hours, unused applications and rationalisation report.',
    source: 'Application Metering + Usage Hours + Active Users',
    outputs: ['PDF', 'Excel']
  },
  'internet-metering-report': {
    id: 'internet-metering-report',
    title: 'Internet Metering Report',
    type: 'Metering',
    category: 'Metering Reports',
    description: 'Internet usage, bandwidth trend, department usage, category exposure and governance report.',
    source: 'Internet Metering + Bandwidth Usage + Protocol / Category Evidence',
    outputs: ['PDF', 'Excel']
  }
};

const FEATURED_REPORTS: ReportDefinition[] = [
  { id: 'ai-executive-summary', title: 'AI Executive Summary', description: 'Executive KPI summary, key findings and priority recommendations.', type: 'Summary', source: 'Endpoint Inventory + Service Desk + Software Inventory + Jobs + Geolocation', outputs: ['PDF', 'PowerPoint', 'Excel'] },
  { id: 'client-summary-rnr', title: 'Client RNR Report', description: 'Client-facing risk and resource planning pack.', type: 'Summary', source: 'Endpoint Inventory + Subscription + Asset Pricing + Software Inventory + Browser Risk', outputs: ['PDF', 'PowerPoint', 'Excel'] },
  { id: 'hardware-asset-lifecycle', title: 'Hardware Lifecycle', description: 'Asset estate, device age and refresh planning.', type: 'Summary', source: 'Hardware Inventory + Asset Lifecycle + Endpoint Inventory', outputs: ['PDF', 'Excel'] },
  { id: 'operations-health-sla', title: 'Ops Health & SLA', description: 'Endpoint health, service activity and SLA follow-up.', type: 'Summary', source: 'Endpoint Inventory + Jobs + HD_Incidents + SLA Due', outputs: ['PDF', 'PowerPoint', 'Excel'] },
  { id: 'security-compliance-exposure', title: 'Security Exposure', description: 'Endpoint risk, compliance gaps and exception action list.', type: 'Risk', source: 'Device Status + OS Inventory + Software Inventory + Data Quality + Service Desk SLA', outputs: ['PDF', 'Excel'] },
  { id: 'software-application-governance', title: 'Software Governance', description: 'Application inventory, licence review and cleanup actions.', type: 'Compliance', source: 'TSMDM_SW_LIST + TS_SW_CATEGORY + Application Metering + Browser Inventory', outputs: ['PDF', 'Excel'] }
];

const REPORT_CATALOG = [
  { name: 'Featured Reports', desc: 'Focused report packs for management, inventory, operations, security and software governance.', icon: 'chart', items: FEATURED_REPORTS },
  { name: 'Metering Reports', desc: 'Client-ready metering reports for software, application and internet usage governance.', icon: 'meter', items: Object.values(METERING_REPORTS) },
  { name: 'Dynamic Reporting', desc: 'Gemini Flash generated report modules for compliance, savings and risk management.', icon: 'chart', items: Object.values(DYNAMIC_REPORTS) }
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function reportId(reqBody: ReportRequest) {
  return String(reqBody.dynamicReportType || reqBody.reportId || reqBody.report?.id || '').trim();
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

function num(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function sqlText(value: any) {
  return String(value ?? '').replace(/'/g, "''");
}

function validDate(value: any) {
  const text = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

function datePredicate(column: string, reqBody: ReportRequest) {
  const start = validDate(reqBody.startDate || reqBody.from);
  const end = validDate(reqBody.endDate || reqBody.to);
  if (start && end) return ` AND ${column} >= '${start}' AND ${column} < DATEADD(day, 1, '${end}')`;
  if (start) return ` AND ${column} >= '${start}'`;
  if (end) return ` AND ${column} < DATEADD(day, 1, '${end}')`;
  return '';
}

function reportScope(reqBody: ReportRequest) {
  return reqBody.locationBranch || reqBody.branchName || (reqBody.relationID ? `Site ${reqBody.relationID}` : 'All Sites');
}

async function safeQuery(pool: any, query: string) {
  try {
    return await pool.request().query(query);
  } catch (err) {
    console.warn('[reports] Query skipped:', query.split(/\s+/).slice(0, 12).join(' '), err instanceof Error ? err.message : err);
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
    ]}
  ];
}

function fallbackNarrative(definition: DynamicDefinition, metrics: any) {
  if (definition.id === 'dynamic-cost-saving-report') {
    return {
      title: 'Cost saving opportunities require tracked financial ownership',
      executiveSummary: `This Cost Saving Report focuses only on optimisation and cost reduction opportunities. The current dataset shows ${metrics.savingsOpportunities} saving opportunity signal(s), including ${metrics.softwareRationalisation} software rationalisation candidate(s), ${metrics.refreshCandidates} refresh planning candidate(s) and ${metrics.avoidableSupport} avoidable support workload signal(s).`,
      keyFindings: [`${metrics.softwareRationalisation} software item(s) should be reviewed for rationalisation or renewal cleanup.`, `${metrics.refreshCandidates} endpoint(s) require refresh planning assessment.`, `${metrics.avoidableSupport} support workload signal(s) should be quantified.`],
      managementConclusion: 'Cost saving follow-up should be owned by procurement, operations and application owners.',
      recommendations: ['Create a cost saving tracker with opportunity value, owner and target date.', 'Validate unused, duplicate or low-value software before renewal.', 'Prioritise refresh planning where old endpoints create avoidable support cost.']
    };
  }
  if (definition.id === 'dynamic-risk-management-report') {
    return {
      title: 'Risk exposure requires severity-based remediation ownership',
      executiveSummary: `This Risk Management Report focuses only on exposure, severity and remediation accountability. The current dataset shows ${metrics.highRisk} high-risk signal(s), ${metrics.mediumRisk} medium-risk signal(s), ${metrics.unsupportedExposure} unsupported exposure item(s) and ${metrics.softwareRisk} software risk signal(s).`,
      keyFindings: [`${metrics.highRisk} high-risk signal(s) require urgent owner assignment.`, `${metrics.unsupportedExposure} unsupported or patch exposure item(s) require validation.`, `${metrics.softwareRisk} software risk signal(s) should be reviewed.`],
      managementConclusion: 'Risk management follow-up must be severity-led and tracked through a formal risk register.',
      recommendations: ['Assign risk owners and target dates for high-risk records.', 'Validate unsupported OS, patch exposure and stale telemetry.', 'Maintain remediation evidence and exception approval status.']
    };
  }
  return {
    title: 'Compliance evidence requires owner validation before sign-off',
    executiveSummary: `This Compliance Report focuses only on audit readiness, control evidence and exception ownership. The current dataset shows a ${metrics.complianceScore}% compliance score, ${metrics.patchCompliance}% patch compliance, ${metrics.complianceExceptions} compliance exception(s) and ${metrics.evidenceRecords} evidence record(s).`,
    keyFindings: [`${metrics.complianceExceptions} compliance exception(s) require owner validation.`, `${metrics.auditGaps} audit gap(s) should be reviewed.`, `${metrics.evidenceRecords} evidence record(s) are available for compliance validation.`],
    managementConclusion: 'Compliance follow-up should produce an evidence register ready for management sign-off.',
    recommendations: ['Create a compliance action register.', 'Validate patch and OS support posture.', 'Confirm exception acceptance status.']
  };
}

function extractJsonObject(text: string) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}

async function generateAiNarrative(definition: DynamicDefinition, metrics: any, sections: any[]) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey || typeof fetch !== 'function') return fallbackNarrative(definition, metrics);
  const prompt = `Generate EMA ${definition.title}. Allowed topic: ${definition.focus}. Avoid: ${definition.bannedFocus}. Return JSON only with keys: title, executiveSummary, keyFindings, managementConclusion, recommendations. Metrics: ${JSON.stringify(metrics)} Sections: ${JSON.stringify(sections)}`;
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
    const json = await response.json();
    const raw = json?.candidates?.[0]?.content?.parts?.map((part: any) => part.text || '').join('\n') || '';
    const parsed = extractJsonObject(raw);
    const fallback = fallbackNarrative(definition, metrics);
    if (!parsed) return fallback;
    return {
      title: parsed.title || fallback.title,
      executiveSummary: parsed.executiveSummary || fallback.executiveSummary,
      keyFindings: Array.isArray(parsed.keyFindings) ? parsed.keyFindings.slice(0, 7) : fallback.keyFindings,
      managementConclusion: parsed.managementConclusion || fallback.managementConclusion,
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 7) : fallback.recommendations
    };
  } catch {
    return fallbackNarrative(definition, metrics);
  }
}

function resolveDefinition(reqBody: ReportRequest): DynamicDefinition {
  const requestedId = reportId(reqBody);
  return DYNAMIC_REPORTS[requestedId] || DYNAMIC_REPORTS['dynamic-compliance-report'];
}

async function buildDynamicReport(reqBody: ReportRequest, mode: 'preview' | 'generate') {
  const definition = resolveDefinition(reqBody);
  const cacheKey = dailyKey(definition, reqBody);
  if (mode === 'generate' && dailyCache.has(cacheKey)) return dailyCache.get(cacheKey) as ReportPayload;
  const baseMetrics = await collectReportMetrics();
  const metrics = reportSpecificMetrics(definition, baseMetrics);
  const sections = buildSections(definition, metrics);
  const ai = await generateAiNarrative(definition, metrics, sections);
  const recommendations = (ai.recommendations || []).map((action: string, index: number) => ({ priority: index === 0 ? 'High' : index === 1 ? 'Medium' : 'Monitor', action }));
  const payload: ReportPayload = {
    success: true,
    mode: 'dynamic-reporting',
    generatedAt: new Date().toISOString(),
    report: definition,
    filters: { ...reqBody, useAiAnalysis: true, aiEngine: 'gemini-flash', aiModel: 'gemini-2.5-flash', aiReportMode: 'dynamic-reporting', dynamicReportType: definition.id, dynamicReportTitle: definition.title, dynamicReportCategory: 'Dynamic Reporting', generationFrequency: 'once-per-day', dailyGenerationKey: cacheKey, aiDisclaimer: DAILY_DISCLAIMER },
    metrics,
    narrative: { title: ai.title, period: reqBody.dateRange || 'current-month', scope: reportScope(reqBody), executiveSummary: `${ai.executiveSummary}\n\n${DAILY_DISCLAIMER}`, keyFindings: ai.keyFindings || [], managementConclusion: ai.managementConclusion, recommendations: ai.recommendations || [], disclaimer: DAILY_DISCLAIMER },
    sections: [{ type: 'notice', title: 'AI Dynamic Reporting Notice', rows: [{ label: 'Generation Frequency', value: 'Once per day', note: cacheKey }, { label: 'Disclaimer', value: DAILY_DISCLAIMER, note: definition.title }] }, ...sections],
    recommendations,
    dataSources: [{ name: 'Hardware Inventory', table: 'hardware_assets', rows: baseMetrics.totalAssets }, { name: 'Software Inventory', table: 'software_inventory', rows: baseMetrics.softwareCount }, { name: 'Patch Records', table: 'patch_records', rows: baseMetrics.patchTotal }, { name: 'Event Logs', table: 'event_logs', rows: baseMetrics.criticalCount }],
    exportData: { metrics: [metrics], sections, recommendations, aiDisclaimer: [{ value: DAILY_DISCLAIMER }] }
  };
  if (mode === 'generate') dailyCache.set(cacheKey, payload);
  return payload;
}

function buildMeteringRecommendations(definition: ReportDefinition, metrics: any) {
  if (definition.id === 'software-metering-report') {
    return [
      { priority: metrics.overusedLicenses > 0 ? 'High' : 'Monitor', action: `Validate ${metrics.overusedLicenses} over-used licence signal(s) and assign renewal or remediation owner.`, owner: 'Software Asset Manager', target: 'Next licence review' },
      { priority: metrics.unlicensedSoftware > 0 ? 'High' : 'Monitor', action: `Review ${metrics.unlicensedSoftware} unlicensed software item(s) and confirm compliance status.`, owner: 'Compliance Owner', target: 'Current reporting cycle' },
      { priority: 'Medium', action: `Review ${metrics.unusedLicenses} unused licence seat(s) for possible cost saving or reallocation.`, owner: 'Procurement Team', target: 'Renewal window' }
    ];
  }
  if (definition.id === 'application-metering-report') {
    return [
      { priority: metrics.unusedApplications > 0 ? 'High' : 'Monitor', action: `Review ${metrics.unusedApplications} unused or near-unused application(s) before renewal or redeployment.`, owner: 'Application Owner', target: 'Next review' },
      { priority: 'Medium', action: 'Confirm top usage applications have valid business ownership and support coverage.', owner: 'Operations Team', target: 'Monthly review' },
      { priority: 'Medium', action: 'Create rationalisation shortlist for low-usage tools and duplicate publishers.', owner: 'Software Governance Team', target: 'Quarterly cleanup' }
    ];
  }
  return [
    { priority: metrics.highBandwidthUsers > 0 ? 'High' : 'Monitor', action: `Review ${metrics.highBandwidthUsers} high bandwidth user(s) and validate business usage.`, owner: 'Network Owner', target: 'Current reporting cycle' },
    { priority: 'Medium', action: 'Validate top department usage against approved business requirement and capacity plan.', owner: 'IT Operations', target: 'Monthly review' },
    { priority: 'Medium', action: 'Review category and protocol exposure for non-business or high-risk usage patterns.', owner: 'Security / Network Team', target: 'Next governance review' }
  ];
}

function meteringNarrative(definition: ReportDefinition, metrics: any, reqBody: ReportRequest) {
  if (definition.id === 'software-metering-report') {
    return {
      title: 'Software metering requires licence and cleanup ownership',
      executiveSummary: `The Software Metering Report covers ${metrics.totalSoftware} software record(s), ${metrics.totalInstalls} installation signal(s), ${metrics.licensesUsed} used licence seat(s) and ${metrics.licensesOwned} owned licence seat(s) for ${reportScope(reqBody)}. The report highlights ${metrics.unlicensedSoftware} unlicensed software item(s), ${metrics.overusedLicenses} over-used licence signal(s) and ${metrics.unusedLicenses} unused seat(s) that may support compliance cleanup or cost saving.`,
      keyFindings: [`${metrics.unlicensedSoftware} unlicensed software item(s) require compliance validation.`, `${metrics.overusedLicenses} over-used licence signal(s) should be reviewed before renewal or audit sign-off.`, `${metrics.unusedLicenses} unused licence seat(s) may support cost saving or reallocation.`],
      managementConclusion: 'Software metering should be owned by Software Asset Management with clear entitlement validation, cleanup decision and renewal action tracking.'
    };
  }
  if (definition.id === 'application-metering-report') {
    return {
      title: 'Application usage evidence supports rationalisation decisions',
      executiveSummary: `The Application Metering Report covers ${metrics.totalApplications} tracked application(s), ${metrics.totalActiveUsers} active user signal(s) and ${metrics.totalUsageHours} measured usage hour(s) for ${reportScope(reqBody)}. ${metrics.unusedApplications} application(s) show low or no usage and should be reviewed before renewal, deployment expansion or cleanup decisions.`,
      keyFindings: [`${metrics.totalUsageHours} application usage hour(s) were recorded in the selected period.`, `${metrics.unusedApplications} low or no usage application(s) should be reviewed for rationalisation.`, `${metrics.totalActiveUsers} active user signal(s) are available for ownership and support validation.`],
      managementConclusion: 'Application metering should be used to validate business usage, remove low-value tools and support renewal decisions with evidence.'
    };
  }
  return {
    title: 'Internet usage requires bandwidth and policy governance',
    executiveSummary: `The Internet Metering Report covers ${metrics.usersTracked} user(s), ${metrics.totalRecords} usage record(s) and ${metrics.totalBandwidth} MB total bandwidth for ${reportScope(reqBody)}. Download traffic is ${metrics.totalDownload} MB and upload traffic is ${metrics.totalUpload} MB. ${metrics.highBandwidthUsers} user(s) exceed the current average usage baseline and should be reviewed for business justification or policy alignment.`,
    keyFindings: [`${metrics.totalBandwidth} MB total internet bandwidth was recorded in the selected scope.`, `${metrics.highBandwidthUsers} high-bandwidth user(s) require validation against business requirement.`, `${metrics.usersTracked} distinct user(s) have internet usage evidence available for governance review.`],
    managementConclusion: 'Internet metering should be reviewed by network and security owners to validate capacity, category exposure and policy compliance.'
  };
}

function buildMeteringPayload(definition: ReportDefinition, reqBody: ReportRequest, metrics: any, sections: any[]) {
  const narrative = meteringNarrative(definition, metrics, reqBody);
  const recommendations = buildMeteringRecommendations(definition, metrics);
  const period = reqBody.startDate && reqBody.endDate ? `${reqBody.startDate} to ${reqBody.endDate}` : reqBody.dateRange || 'selected period';
  return {
    success: true,
    mode: 'metering-report',
    generatedAt: new Date().toISOString(),
    report: definition,
    filters: reqBody,
    metrics,
    narrative: { ...narrative, period, scope: reportScope(reqBody), recommendations: recommendations.map((item: any) => item.action) },
    sections,
    recommendations,
    dataSources: [{ name: definition.source, table: definition.source, rows: 0 }],
    exportData: { metrics: [metrics], sections, recommendations }
  };
}

async function buildSoftwareMeteringReport(reqBody: ReportRequest) {
  const pool = await getPool();
  const [stats, categoryRows, topRows, licenceRows] = await Promise.all([
    safeQuery(pool, `SELECT COUNT(*) as totalSoftware, SUM(ISNULL(install_count,0)) as totalInstalls, SUM(ISNULL(licenses_owned,0)) as licensesOwned, SUM(ISNULL(licenses_used,0)) as licensesUsed, SUM(CASE WHEN status = 'Unlicensed' THEN 1 ELSE 0 END) as unlicensedSoftware, SUM(CASE WHEN ISNULL(licenses_used,0) > ISNULL(licenses_owned,0) AND ISNULL(licenses_owned,0) > 0 THEN 1 ELSE 0 END) as overusedLicenses, SUM(CASE WHEN ISNULL(licenses_owned,0) > ISNULL(licenses_used,0) THEN ISNULL(licenses_owned,0) - ISNULL(licenses_used,0) ELSE 0 END) as unusedLicenses FROM software_inventory`),
    safeQuery(pool, `SELECT TOP 10 ISNULL(category,'Uncategorised') as label, SUM(ISNULL(install_count,0)) as value FROM software_inventory GROUP BY ISNULL(category,'Uncategorised') ORDER BY value DESC`),
    safeQuery(pool, `SELECT TOP 30 name, vendor, version, license_type as licenseType, licenses_owned as licensesOwned, licenses_used as licensesUsed, install_count as installCount, category, status, last_detected as lastDetected FROM software_inventory ORDER BY ISNULL(install_count,0) DESC, name`),
    safeQuery(pool, `SELECT TOP 30 name, vendor, license_type as licenseType, licenses_owned as licensesOwned, licenses_used as licensesUsed, status, CASE WHEN ISNULL(licenses_used,0) > ISNULL(licenses_owned,0) AND ISNULL(licenses_owned,0) > 0 THEN 'Over Used' WHEN status = 'Unlicensed' THEN 'Unlicensed' WHEN ISNULL(licenses_owned,0) > ISNULL(licenses_used,0) THEN 'Under Used' ELSE 'Controlled' END as licenceSignal FROM software_inventory WHERE status = 'Unlicensed' OR ISNULL(licenses_used,0) <> ISNULL(licenses_owned,0) ORDER BY licenceSignal DESC, name`)
  ]);
  const row = stats.recordset?.[0] || {};
  const metrics = { totalSoftware: num(row.totalSoftware), totalInstalls: num(row.totalInstalls), licensesOwned: num(row.licensesOwned), licensesUsed: num(row.licensesUsed), unlicensedSoftware: num(row.unlicensedSoftware), overusedLicenses: num(row.overusedLicenses), unusedLicenses: num(row.unusedLicenses) };
  return buildMeteringPayload(METERING_REPORTS['software-metering-report'], reqBody, metrics, [
    { type: 'kpi', title: 'Software Metering KPI', rows: [{ label: 'Software Records', value: metrics.totalSoftware, note: 'Software titles available in inventory scope.' }, { label: 'Total Installs', value: metrics.totalInstalls, note: 'Installation count across inventoried software.' }, { label: 'Licence Seats Used', value: metrics.licensesUsed, note: `${metrics.licensesOwned} owned seat(s) recorded.` }, { label: 'Unused Seats', value: metrics.unusedLicenses, note: 'Potential saving or reallocation opportunity.' }] },
    { type: 'bar', title: 'Install Distribution by Category', rows: categoryRows.recordset || [] },
    { type: 'risk', title: 'Licence & Cleanup Focus', rows: [{ area: 'Unlicensed Software', severity: metrics.unlicensedSoftware > 0 ? 'High' : 'Low', finding: `${metrics.unlicensedSoftware} unlicensed software item(s) require compliance validation.`, action: 'Assign compliance owner to validate entitlement, exception or removal.' }, { area: 'Licence Overuse', severity: metrics.overusedLicenses > 0 ? 'High' : 'Low', finding: `${metrics.overusedLicenses} software item(s) appear to use more licences than owned.`, action: 'Check licence entitlement and procurement requirement before renewal.' }, { area: 'Unused Licence Capacity', severity: metrics.unusedLicenses > 0 ? 'Medium' : 'Low', finding: `${metrics.unusedLicenses} unused licence seat(s) may be available for reallocation or cost saving.`, action: 'Review under-used seats during renewal and reallocation planning.' }] },
    { type: 'table', title: 'Top Installed Software', rows: topRows.recordset || [] },
    { type: 'table', title: 'Licence Evidence Register', rows: licenceRows.recordset || [] }
  ]);
}

async function buildApplicationMeteringReport(reqBody: ReportRequest) {
  const pool = await getPool();
  const where = `WHERE 1=1${datePredicate('last_used', reqBody)}`;
  const [stats, categoryRows, topApps, lowUsage] = await Promise.all([
    safeQuery(pool, `SELECT COUNT(*) as totalApplications, SUM(ISNULL(active_users,0)) as totalActiveUsers, SUM(ISNULL(usage_hours,0)) as totalUsageHours, AVG(CAST(ISNULL(usage_hours,0) AS FLOAT)) as avgUsageHours, SUM(CASE WHEN ISNULL(active_users,0) = 0 OR ISNULL(usage_hours,0) <= 1 THEN 1 ELSE 0 END) as unusedApplications FROM application_metering ${where}`),
    safeQuery(pool, `SELECT TOP 10 ISNULL(category,'Uncategorised') as label, SUM(ISNULL(usage_hours,0)) as value FROM application_metering ${where} GROUP BY ISNULL(category,'Uncategorised') ORDER BY value DESC`),
    safeQuery(pool, `SELECT TOP 30 application_name as applicationName, publisher, version, executable_name as executableName, total_installs as totalInstalls, active_users as activeUsers, usage_hours as usageHours, last_used as lastUsed, category FROM application_metering ${where} ORDER BY ISNULL(usage_hours,0) DESC`),
    safeQuery(pool, `SELECT TOP 30 application_name as applicationName, publisher, version, total_installs as totalInstalls, active_users as activeUsers, usage_hours as usageHours, last_used as lastUsed, category FROM application_metering ${where} AND (ISNULL(active_users,0) = 0 OR ISNULL(usage_hours,0) <= 1) ORDER BY last_used ASC`)
  ]);
  const row = stats.recordset?.[0] || {};
  const metrics = { totalApplications: num(row.totalApplications), totalActiveUsers: num(row.totalActiveUsers), totalUsageHours: Math.round(num(row.totalUsageHours)), avgUsageHours: Math.round(num(row.avgUsageHours)), unusedApplications: num(row.unusedApplications) };
  return buildMeteringPayload(METERING_REPORTS['application-metering-report'], reqBody, metrics, [
    { type: 'kpi', title: 'Application Usage KPI', rows: [{ label: 'Applications Tracked', value: metrics.totalApplications, note: 'Applications available in metering scope.' }, { label: 'Active Users', value: metrics.totalActiveUsers, note: 'Users with recorded application activity.' }, { label: 'Usage Hours', value: metrics.totalUsageHours, note: 'Total measured application usage hours.' }, { label: 'Low / No Usage Apps', value: metrics.unusedApplications, note: 'Applications requiring rationalisation review.' }] },
    { type: 'bar', title: 'Usage Hours by Category', rows: categoryRows.recordset || [] },
    { type: 'risk', title: 'Application Rationalisation Focus', rows: [{ area: 'Low Usage Applications', severity: metrics.unusedApplications > 0 ? 'High' : 'Low', finding: `${metrics.unusedApplications} application(s) show low or no usage.`, action: 'Validate owner, business need and renewal status before cleanup.' }, { area: 'High Usage Applications', severity: 'Medium', finding: `${metrics.totalUsageHours} total usage hour(s) indicate business-critical usage concentration.`, action: 'Confirm high usage applications have support ownership and licence coverage.' }, { area: 'Application Governance', severity: 'Medium', finding: `${metrics.totalApplications} application(s) require category and publisher governance.`, action: 'Review duplicate tools and consolidate where business function overlaps.' }] },
    { type: 'table', title: 'Top Used Applications', rows: topApps.recordset || [] },
    { type: 'table', title: 'Low Usage / Cleanup Candidates', rows: lowUsage.recordset || [] }
  ]);
}

async function buildInternetMeteringReport(reqBody: ReportRequest) {
  const pool = await getPool();
  const branch = String(reqBody.branchName || reqBody.locationBranch || '').trim();
  const branchWhere = branch && !/^all/i.test(branch) ? ` AND department = '${sqlText(branch)}'` : '';
  const where = `WHERE 1=1${branchWhere}${datePredicate('timestamp', reqBody)}`;
  const [stats, trendRows, topUsers, deptRows, categoryRows] = await Promise.all([
    safeQuery(pool, `SELECT COUNT(*) as totalRecords, COUNT(DISTINCT username) as usersTracked, SUM(ISNULL(download_mb,0)) as totalDownload, SUM(ISNULL(upload_mb,0)) as totalUpload, SUM(ISNULL(total_mb,0)) as totalBandwidth, AVG(CAST(ISNULL(total_mb,0) AS FLOAT)) as avgUsageMb FROM internet_metering ${where}`),
    safeQuery(pool, `SELECT TOP 14 CONVERT(VARCHAR(10), timestamp, 120) as label, SUM(ISNULL(total_mb,0)) as value, SUM(ISNULL(download_mb,0)) as download, SUM(ISNULL(upload_mb,0)) as upload FROM internet_metering ${where} GROUP BY CONVERT(VARCHAR(10), timestamp, 120) ORDER BY label DESC`),
    safeQuery(pool, `SELECT TOP 30 username, department, ip_address as ipAddress, SUM(ISNULL(download_mb,0)) as downloadMb, SUM(ISNULL(upload_mb,0)) as uploadMb, SUM(ISNULL(total_mb,0)) as totalMb FROM internet_metering ${where} GROUP BY username, department, ip_address ORDER BY totalMb DESC`),
    safeQuery(pool, `SELECT TOP 10 ISNULL(department,'Unmapped') as label, SUM(ISNULL(total_mb,0)) as value FROM internet_metering ${where} GROUP BY ISNULL(department,'Unmapped') ORDER BY value DESC`),
    safeQuery(pool, `SELECT TOP 10 COALESCE(category, protocol, 'Uncategorised') as label, SUM(ISNULL(total_mb,0)) as value FROM internet_metering ${where} GROUP BY COALESCE(category, protocol, 'Uncategorised') ORDER BY value DESC`)
  ]);
  const row = stats.recordset?.[0] || {};
  const topRows = topUsers.recordset || [];
  const avg = num(row.avgUsageMb);
  const highBandwidthUsers = topRows.filter((item: any) => num(item.totalMb) > avg && avg > 0).length;
  const metrics = { totalRecords: num(row.totalRecords), usersTracked: num(row.usersTracked), totalDownload: Math.round(num(row.totalDownload)), totalUpload: Math.round(num(row.totalUpload)), totalBandwidth: Math.round(num(row.totalBandwidth)), avgUsageMb: Math.round(avg), highBandwidthUsers };
  return buildMeteringPayload(METERING_REPORTS['internet-metering-report'], reqBody, metrics, [
    { type: 'kpi', title: 'Internet Usage KPI', rows: [{ label: 'Users Tracked', value: metrics.usersTracked, note: 'Distinct users in internet usage scope.' }, { label: 'Total Bandwidth MB', value: metrics.totalBandwidth, note: `${metrics.totalDownload} MB download / ${metrics.totalUpload} MB upload.` }, { label: 'Average Usage MB', value: metrics.avgUsageMb, note: 'Average bandwidth per usage record.' }, { label: 'High Bandwidth Users', value: metrics.highBandwidthUsers, note: 'Users above current average usage baseline.' }] },
    { type: 'bar', title: 'Bandwidth Trend', rows: (trendRows.recordset || []).reverse() },
    { type: 'bar', title: 'Usage by Department', rows: deptRows.recordset || [] },
    { type: 'bar', title: 'Usage by Category / Protocol', rows: categoryRows.recordset || [] },
    { type: 'risk', title: 'Internet Governance Focus', rows: [{ area: 'High Bandwidth Usage', severity: metrics.highBandwidthUsers > 0 ? 'High' : 'Low', finding: `${metrics.highBandwidthUsers} user(s) are above the average usage baseline.`, action: 'Validate business justification and monitor recurring high-bandwidth users.' }, { area: 'Department Capacity', severity: 'Medium', finding: `${deptRows.recordset?.length || 0} department usage group(s) are available for review.`, action: 'Compare top department usage with approved capacity and business requirement.' }, { area: 'Category / Protocol Exposure', severity: 'Medium', finding: `${categoryRows.recordset?.length || 0} usage category or protocol group(s) were detected.`, action: 'Review non-business categories and high-risk protocols for policy alignment.' }] },
    { type: 'table', title: 'Top Bandwidth Users', rows: topRows }
  ]);
}

async function buildMeteringReport(reqBody: ReportRequest) {
  const id = reportId(reqBody);
  if (id === 'software-metering-report') return buildSoftwareMeteringReport(reqBody);
  if (id === 'application-metering-report') return buildApplicationMeteringReport(reqBody);
  if (id === 'internet-metering-report') return buildInternetMeteringReport(reqBody);
  return buildSoftwareMeteringReport({ ...reqBody, reportId: 'software-metering-report' });
}

async function buildRequestedReport(reqBody: ReportRequest, mode: 'preview' | 'generate') {
  const id = reportId(reqBody);
  if (METERING_REPORTS[id]) return buildMeteringReport(reqBody);
  return buildDynamicReport(reqBody, mode);
}

export async function getCatalog(_req: AuthRequest, res: Response): Promise<void> {
  res.json({ status: 'success', data: REPORT_CATALOG, message: '' });
}

export async function getOptions(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const pool = await getPool();
    const siteRows = await safeQuery(pool, 'SELECT DISTINCT department as name FROM hardware_assets WHERE department IS NOT NULL');
    const sites = (siteRows.recordset || []).map((row: any, index: number) => ({ id: index + 1, name: row.name || `Site ${index + 1}` }));
    res.json({ status: 'success', data: { sites, groups: [{ value: 'all', label: 'All Groups' }, { value: 'em', label: 'EM Devices' }, { value: 'mdm', label: 'MDM Devices' }], statuses: [{ value: 'all', label: 'All Status' }, { value: 'online', label: 'Online' }, { value: 'offline', label: 'Offline' }, { value: 'stale', label: 'Stale Sync' }, { value: 'locked', label: 'Locked' }], dateRanges: [{ value: 'current-month', label: 'Current Month' }, { value: 'last-7-days', label: 'Last 7 Days' }, { value: 'last-30-days', label: 'Last 30 Days' }, { value: 'quarter-to-date', label: 'Quarter to Date' }, { value: 'year-to-date', label: 'Year to Date' }, { value: 'custom', label: 'Custom Range' }], outputFormats: [{ value: 'PDF', label: 'PDF' }, { value: 'Excel', label: 'Excel / CSV' }, { value: 'PowerPoint', label: 'PowerPoint' }] }, message: '' });
  } catch {
    res.json({ status: 'success', data: { sites: [], groups: [], statuses: [], dateRanges: [], outputFormats: [] }, message: '' });
  }
}

export async function preview(req: AuthRequest, res: Response): Promise<void> {
  try {
    const payload = await buildRequestedReport(req.body || {}, 'preview');
    res.json(payload);
  } catch (err) {
    console.error('[reports] preview failed', err);
    res.status(500).json({ status: 'error', message: 'Failed to preview report' });
  }
}

export async function generate(req: AuthRequest, res: Response): Promise<void> {
  try {
    const payload = await buildRequestedReport(req.body || {}, 'generate');
    res.json(payload);
  } catch (err) {
    console.error('[reports] generate failed', err);
    res.status(500).json({ status: 'error', message: 'Failed to generate report' });
  }
}

export async function getReport(req: AuthRequest, res: Response): Promise<void> {
  const definition = DYNAMIC_REPORTS[req.params.id] || METERING_REPORTS[req.params.id];
  if (!definition) {
    res.status(404).json({ status: 'error', message: 'Report not found' });
    return;
  }
  try {
    const payload = await buildRequestedReport({ ...req.query, reportId: definition.id, dynamicReportType: DYNAMIC_REPORTS[definition.id] ? definition.id : undefined }, 'preview');
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
    const result = await pool.request().input('offset', sql.Int, offset).input('limit', sql.Int, limit).query(`SELECT id, title, category, generated_by as generatedBy, status, created_at as createdAt FROM summary_reports ORDER BY created_at DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`);
    res.json({ status: 'success', data: buildResponse(result.recordset, count.recordset[0].total, page, limit), message: '' });
  } catch { res.status(500).json({ status: 'error', message: 'Server error' }); }
}

export async function create(req: AuthRequest, res: Response): Promise<void> {
  const { title, category } = req.body;
  try {
    const pool = await getPool();
    await pool.request().input('title', sql.NVarChar, title).input('category', sql.NVarChar, category || 'General').input('generatedBy', sql.NVarChar, req.user?.username || 'system').query(`INSERT INTO summary_reports (title, category, generated_by, status, created_at) VALUES (@title, @category, @generatedBy, 'Completed', GETDATE())`);
    res.status(201).json({ status: 'success', data: null, message: 'Report generated' });
  } catch { res.status(500).json({ status: 'error', message: 'Server error' }); }
}
