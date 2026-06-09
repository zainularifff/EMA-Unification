import React, { useEffect, useMemo, useState } from "react";
import * as Icons from "lucide-react";

type IconComponent = React.ComponentType<{
  size?: number | string;
  strokeWidth?: number | string;
  className?: string;
}>;

const getIcon = (...names: string[]): IconComponent => {
  const iconSet = Icons as unknown as Record<string, IconComponent | undefined>;
  for (const name of names) {
    if (iconSet[name]) return iconSet[name] as IconComponent;
  }
  return (iconSet.Activity || iconSet.Circle || (() => null)) as IconComponent;
};

const IconSet = {
  dashboard: getIcon("LayoutDashboard", "Gauge", "BarChart3"),
  health: getIcon("ShieldCheck", "Shield"),
  money: getIcon("WalletCards", "Wallet", "CreditCard"),
  risk: getIcon("AlertTriangle", "AlertCircle", "ShieldAlert"),
  audit: getIcon("ClipboardCheck", "ClipboardList", "CheckSquare"),
  saving: getIcon("CircleDollarSign", "DollarSign", "BadgeDollarSign"),
  endpoint: getIcon("Monitor", "Laptop", "Computer"),
  users: getIcon("Users", "UsersRound"),
  trend: getIcon("TrendingUp", "LineChart", "BarChart3"),
  calendar: getIcon("CalendarDays", "Calendar"),
  refresh: getIcon("RefreshCw", "RotateCw"),
  download: getIcon("Download", "ArrowDownToLine"),
  filter: getIcon("Filter", "SlidersHorizontal"),
  search: getIcon("Search", "ScanLine"),
  back: getIcon("ArrowLeft", "ChevronLeft"),
  next: getIcon("ChevronRight", "ArrowRight"),
  package: getIcon("Package", "Box"),
  server: getIcon("Server", "Database"),
  activity: getIcon("Activity", "Pulse"),
  sparkles: getIcon("Sparkles", "WandSparkles", "Stars"),
  list: getIcon("ListChecks", "ListTodo"),
  target: getIcon("Target", "Crosshair"),
  clock: getIcon("Clock3", "Clock"),
  table: getIcon("Table2", "Table"),
};

type Tone = "blue" | "green" | "red" | "amber" | "purple" | "cyan" | "pink" | "orange" | "slate";
type DrillLevel = 1 | 2 | 3;

type KpiItem = {
  title: string;
  value: string;
  subValue?: string;
  note?: string;
  trend?: string;
  tone?: Tone;
  icon?: keyof typeof IconSet;
  area?: string;
  key?: string;
};

type DetailItem = {
  label: string;
  value: string;
  tone?: Tone;
  key?: string;
};

type PillarItem = {
  id: string;
  title: string;
  scoreTitle?: string;
  scoreValue?: string;
  scoreUnit?: string;
  scoreStatus?: string;
  statusTone?: Tone;
  secondTitle?: string;
  secondValue?: string;
  secondNote?: string;
  details?: DetailItem[];
  tone?: Tone;
  icon?: keyof typeof IconSet;
  area: string;
};

type BoardAction = {
  area: string;
  key: string;
  issue: string;
  impact: string;
  decision: string;
  priority: "High" | "Medium" | "Low" | string;
};

type TrendPoint = {
  month: string;
  label?: string;
  financialExposure?: number;
  riskExposure?: number;
  serviceRisk?: number;
  signals?: number;
  capex?: number;
  opex?: number;
};

type FinanceData = {
  capexOpex?: TrendPoint[];
  tangibleCost?: number;
  intangibleCost?: number;
  totalCost?: number;
  capexYtd?: number;
  opexYtd?: number;
  riskCost?: number;
  avgMonthlyCost?: number;
  potentialSavings?: number;
};

type AnalysisData = {
  headline?: string;
  trend?: TrendPoint[];
  mix?: {
    risk?: number;
    control?: number;
    savings?: number;
  };
  signals?: Array<{
    id?: string;
    title: string;
    subtitle?: string;
    value?: string;
    area?: string;
    key?: string;
    tone?: Tone;
    icon?: keyof typeof IconSet;
  }>;
};

type DrillRow = {
  key: string;
  label: string;
  count?: number;
  value?: number;
  valueFmt?: string;
  sample?: string[];
  level3Area?: string;
  level3Key?: string;
  activeCount?: number;
  safeCount?: number;
  healthyCount?: number;
  staleCount?: number;
  inactiveCount?: number;
  warningCount?: number;
  criticalCount?: number;
  highRiskCount?: number;
  atRiskCount?: number;
  riskLevel?: string;
  healthStatus?: string;
  [key: string]: unknown;
};

type EvidenceRow = {
  assetKey?: string;
  objectAgent?: string;
  assetId?: string;
  deviceName?: string;
  department?: string;
  category?: string;
  brand?: string;
  model?: string;
  platform?: string;
  status?: string;
  lastSeen?: string;
  age?: string;
  ipAddress?: string;
  riskScore?: number | string;
  riskSeverity?: string;
  replacementCost?: string;
};

type ExecutiveStory = {
  status?: string;
  tone?: "green" | "amber" | "red" | "blue" | "purple";
  headline?: string;
  summary?: string;
  narrative?: string;
  keySignals?: string[];
  boardRecommendation?: string;
  actionItems?: string[];
  source?: "gemini" | "local" | string;
  generatedAt?: string;
};

type DashboardData = {
  generatedAt?: string;
  executiveKpis: KpiItem[];
  pillars: PillarItem[];
  boardActions: BoardAction[];
  finance: FinanceData;
  analysis?: AnalysisData;
  level2: Record<string, DrillRow[]>;
  metrics?: Record<string, number | string | boolean>;
};

type DrillState = {
  level: DrillLevel;
  area?: string;
  key?: string;
  title?: string;
  rows?: DrillRow[] | EvidenceRow[];
  total?: number;
  loading?: boolean;
  parent?: DrillState;
};

const EMPTY_DASHBOARD: DashboardData = {
  generatedAt: "",
  executiveKpis: [],
  pillars: [],
  boardActions: [],
  finance: {},
  analysis: { trend: [], signals: [], mix: { risk: 0, control: 0, savings: 0 } },
  level2: {},
  metrics: {},
};

const MANAGEMENT_DASHBOARD_INLINE_CSS = `
:root {
  --md-font: var(--ema-font-sans, var(--ema-font-body, "Aptos", "Inter", "Manrope", "Segoe UI", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Arial, sans-serif));
  --md-display-font: var(--ema-font-display, "Aptos Display", "Manrope", "Inter", "Segoe UI", ui-sans-serif, system-ui, sans-serif);
  --md-mono-font: var(--ema-font-mono, "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace);
  --md-bg: #f4f8fc;
  --md-card: #ffffff;
  --md-ink: #0f172a;
  --md-muted: #64748b;
  --md-soft: #94a3b8;
  --md-line: rgba(148, 163, 184, 0.22);
  --md-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
  --md-shadow-soft: 0 10px 24px rgba(15, 23, 42, 0.06);
  --md-radius: 18px;
  --md-blue: #2563eb;
  --md-cyan: #06b6d4;
  --md-purple: #8b5cf6;
  --md-pink: #ec4899;
  --md-red: #ef4444;
  --md-orange: #fb923c;
  --md-amber: #f59e0b;
  --md-green: #059669;
}
* { box-sizing: border-box; }
button, table, input { font: inherit; }
button { cursor: pointer; }
html.md-dashboard-page-active,
body.md-dashboard-page-active,
body.md-dashboard-page-active #root {
  height: 100% !important;
  max-height: 100% !important;
  overflow: hidden !important;
  background: #f4f8fc !important;
}
body.md-dashboard-page-active .ema-main,
body.md-dashboard-page-active .ema-content,
body.md-dashboard-page-active .ema-content-area,
body.md-dashboard-page-active .app-main,
body.md-dashboard-page-active .app-content,
body.md-dashboard-page-active .layout-main,
body.md-dashboard-page-active .layout-content,
body.md-dashboard-page-active .main,
body.md-dashboard-page-active .main-content,
body.md-dashboard-page-active main {
  min-height: 0 !important;
  overflow: hidden !important;
  background: #f4f8fc !important;
}
body.md-dashboard-page-active .ema-page,
body.md-dashboard-page-active .page-content,
body.md-dashboard-page-active .content,
body.md-dashboard-page-active .content-area {
  height: calc(100dvh - 76px) !important;
  max-height: calc(100dvh - 76px) !important;
  min-height: 0 !important;
  overflow: hidden !important;
  padding: 0 !important;
  margin: 0 !important;
  background: #f4f8fc !important;
}
.management-center-page {
  width: 100%;
  max-width: none;
  height: 100%;
  min-height: 0;
  max-height: 100%;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  margin: 0;
  padding: 14px 14px 18px;
  background: linear-gradient(180deg, #f8fbff 0%, #f4f8fc 44%, #eef4fb 100%);
  color: var(--md-ink);
  font-family: var(--md-font);
  -webkit-font-smoothing: antialiased;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  -webkit-overflow-scrolling: touch;
}
.management-center-page::-webkit-scrollbar { width: 6px; }
.management-center-page::-webkit-scrollbar-track { background: rgba(226,232,240,.55); border-radius: 999px; }
.management-center-page::-webkit-scrollbar-thumb { background: rgba(100,116,139,.65); border-radius: 999px; border: 1px solid rgba(226,232,240,.55); }
.management-center-page::-webkit-scrollbar-thumb:hover { background: rgba(71,85,105,.78); }
.management-module-root {
  width: 100%;
  max-width: none;
  margin: 0;
}
.management-module-root > * { min-width: 0; }
.md-content {
  display: grid;
  gap: 12px;
  min-height: max-content;
  padding-bottom: 0;
}
.md-dashboard-view {
  display: grid;
  gap: 12px;
  min-height: max-content;
  padding-bottom: 0;
}
.md-icon {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
}
.md-card {
  border: 1px solid rgba(226, 232, 240, 0.88);
  border-radius: var(--md-radius);
  background: var(--md-card);
  box-shadow: var(--md-shadow-soft);
}
.md-kpi-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
}
.md-kpi-card {
  min-height: 88px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 40px;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 0;
  text-align: left;
  transition: transform 160ms ease, box-shadow 160ms ease;
}
.md-kpi-card:hover { transform: translateY(-2px); box-shadow: var(--md-shadow); }
.md-kpi-card h3,
.md-chip-label,
.md-section-title,
.md-section-subtitle,
.md-small-title {
  margin: 0;
  color: #0f172a;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: -0.02em;
}
.md-section-subtitle { margin-top: 4px; color: #64748b; font-size: 10px; font-weight: 800; }
.md-kpi-card p { margin: 4px 0 0; color: var(--md-muted); font-size: 10px; font-weight: 800; }
.md-kpi-value { display: flex; align-items: baseline; gap: 4px; margin-top: 9px; }
.md-kpi-value strong { color: #0f172a; font-size: 24px; line-height: 1; font-weight: 950; letter-spacing: -0.05em; }
.md-kpi-value span { color: #475569; font-size: 14px; font-weight: 900; }
.md-kpi-icon,
.md-chip-icon,
.md-activity-icon {
  display: grid;
  place-items: center;
  color: #fff;
  box-shadow: 0 12px 22px rgba(15, 23, 42, 0.12);
}
.md-kpi-icon { width: 40px; height: 40px; border-radius: 14px; }
.tone-blue .md-kpi-icon, .bg-blue { background: linear-gradient(135deg, #1da4ff, #2563eb); }
.tone-green .md-kpi-icon, .bg-green { background: linear-gradient(135deg, #34d399, #059669); }
.tone-red .md-kpi-icon, .bg-red { background: linear-gradient(135deg, #fb7185, #ef4444); }
.tone-amber .md-kpi-icon, .bg-amber { background: linear-gradient(135deg, #fbbf24, #f59e0b); }
.tone-purple .md-kpi-icon, .bg-purple { background: linear-gradient(135deg, #a855f7, #6d5dfc); }
.tone-cyan .md-kpi-icon, .bg-cyan { background: linear-gradient(135deg, #22d3ee, #06b6d4); }
.tone-pink .md-kpi-icon, .bg-pink { background: linear-gradient(135deg, #f472b6, #ec4899); }
.tone-orange .md-kpi-icon, .bg-orange { background: linear-gradient(135deg, #ffbf4c, #fb923c); }
.tone-slate .md-kpi-icon, .bg-slate { background: linear-gradient(135deg, #64748b, #334155); }
.md-top-row {
  display: grid;
  grid-template-columns: minmax(0, 2.25fr) minmax(280px, .75fr);
  gap: 14px;
  align-items: start;
}
.md-chart-card,
.md-donut-card { padding: 14px 16px; min-width: 0; }
.md-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}
.md-eyebrow { display: block; color: #94a3b8; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: .06em; }
.md-card-head h2,
.md-view-header h2 { margin: 2px 0 0; color: #0f172a; font-size: 17px; line-height: 1.12; font-weight: 950; letter-spacing: -0.04em; }
.md-card-head p,
.md-view-header p { margin: 4px 0 0; color: #64748b; font-size: 12px; font-weight: 750; }
.md-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.md-action-btn {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1px solid rgba(226,232,240,.95);
  border-radius: 12px;
  padding: 0 12px;
  color: #0f172a;
  background: #fff;
  font-size: 11px;
  font-weight: 900;
  box-shadow: 0 8px 18px rgba(15,23,42,.05);
}
.md-action-btn.primary { color: #fff; border: 0; background: linear-gradient(135deg, #ef477b, #8b5cf6); }
.md-action-icon { width: 36px; padding: 0; justify-content: center; }
.md-chart-layout { display: grid; grid-template-columns: 138px minmax(0, 1fr); gap: 14px; align-items: start; }
.md-chart-summary { display: grid; align-content: center; gap: 13px; }
.md-chart-number { margin: 0; color: #111827; font-size: 27px; line-height: 1; font-weight: 950; letter-spacing: -0.05em; }
.md-chart-summary span { color: #64748b; font-size: 11px; font-weight: 750; }
.md-summary-btn {
  width: max-content;
  min-height: 34px;
  border: 0;
  border-radius: 999px;
  padding: 0 16px;
  color: #fff;
  background: linear-gradient(135deg, #ec4899, #8b5cf6);
  box-shadow: 0 10px 20px rgba(139,92,246,.18);
  font-size: 11px;
  font-weight: 900;
}
.md-chart-panel { min-width: 0; position: relative; }
.md-chart-legend { display: flex; justify-content: flex-end; align-items: center; gap: 16px; color: #64748b; font-size: 10px; font-weight: 850; margin-bottom: 4px; }
.md-chart-legend span { display: inline-flex; align-items: center; gap: 6px; }
.md-dot { width: 8px; height: 8px; border-radius: 999px; display: inline-block; }
.md-dot.red { background: #ef4444; }
.md-dot.orange { background: #f59e0b; }
.md-dot.blue { background: #2563eb; }
.md-dot.purple { background: #8b5cf6; }
.md-dot.cyan { background: #06b6d4; }
.md-dot.green { background: #059669; }
.md-chart-svg { width: 100%; height: 202px; display: block; overflow: visible; }
.md-chart-grid { stroke: rgba(148,163,184,.24); stroke-width: 1; stroke-dasharray: 4 8; }
.md-chart-axis { stroke: rgba(148,163,184,.45); stroke-width: 1; }
.md-chart-label { fill: #94a3b8; font-size: 10px; font-weight: 800; }
.md-chart-line-risk { fill: none; stroke: #ef4444; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
.md-chart-line-finance { fill: none; stroke: #f59e0b; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
.md-chart-area { fill: url(#mdAreaGradient); opacity: .9; }
.md-chart-point-risk { fill: #ef4444; stroke: #fff; stroke-width: 3; }
.md-chart-point-finance { fill: #f59e0b; stroke: #fff; stroke-width: 3; }
.md-chart-bar-finance { fill: #f59e0b; opacity: .82; rx: 6; }
.md-chart-bar-risk { fill: #ef4444; opacity: .86; rx: 6; }
.md-chart-empty-note { fill: #94a3b8; font-size: 12px; font-weight: 850; }
.md-finance-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  padding-top: 12px;
  margin-top: 8px;
  border-top: 1px solid rgba(226,232,240,.85);
}
.md-finance-chip {
  min-width: 0;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  border: 0;
  background: transparent;
  padding: 0;
  text-align: left;
}
.md-chip-icon { width: 36px; height: 36px; border-radius: 12px; }
.md-chip-body { min-width: 0; display: block; line-height: 1.1; }
.md-chip-body .md-chip-label { display: block; color: #64748b; font-size: 10px; white-space: normal; }
.md-chip-value { display: block; margin-top: 4px; color: #0f172a; font-size: 13px; font-weight: 950; line-height: 1.1; }
.md-donut-card { display: grid; align-content: start; gap: 14px; }
.md-donut-shell { display: grid; justify-items: center; gap: 14px; }
.md-donut {
  --risk-end: 34%;
  --control-end: 78%;
  width: 168px;
  height: 168px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: conic-gradient(#ef4444 0 var(--risk-end), #8b5cf6 var(--risk-end) var(--control-end), #06b6d4 var(--control-end) 100%);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.55), 0 18px 34px rgba(15,23,42,.08);
}
.md-donut-hole { width: 84px; height: 84px; display: grid; place-items: center; border-radius: 999px; background: #fff; }
.md-donut-core { width: 50px; height: 50px; display: grid; place-items: center; border-radius: 999px; color: #fff; background: linear-gradient(135deg, #ffc046, #ff982e); }
.md-mix-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; width: 100%; }
.md-mix-item { border: 1px solid rgba(226,232,240,.92); border-radius: 14px; padding: 9px 10px; background: #fff; text-align: left; }
.md-mix-item strong { display: block; color: #111827; font-size: 22px; line-height: 1; font-weight: 950; letter-spacing: -0.04em; }
.md-mix-item span { display: flex; align-items: center; gap: 6px; margin-top: 7px; color: #64748b; font-size: 10px; font-weight: 900; }
.md-pillar-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.md-pillar-tile {
  min-height: 100px;
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  border: 0;
  border-radius: 14px;
  padding: 14px;
  color: #fff;
  text-align: left;
  box-shadow: var(--md-shadow-soft);
}
.md-pillar-tile::after {
  position: absolute;
  right: 20px;
  bottom: 14px;
  width: 86px;
  height: 40px;
  border-bottom: 2px dashed rgba(255,255,255,.45);
  border-radius: 0 0 999px 999px;
  content: "";
}
.tile-purple { background: linear-gradient(135deg, #8b3ff5, #5b73ff); }
.tile-blue { background: linear-gradient(135deg, #19a8ff, #2d63f2); }
.tile-teal { background: linear-gradient(135deg, #25c3b2, #1aa9d5); }
.tile-orange { background: linear-gradient(135deg, #ffbb4f, #ff8744); }
.md-tile-icon { width: 54px; height: 54px; display: grid; place-items: center; border-radius: 16px; background: rgba(255,255,255,.22); }
.md-pillar-tile h3 { margin: 0; font-size: 12px; font-weight: 900; }
.md-tile-value { margin-top: 7px; display: flex; align-items: baseline; gap: 2px; }
.md-tile-value strong { font-size: 28px; line-height: 1; font-weight: 950; letter-spacing: -0.04em; }
.md-pillar-tile small { display: block; margin-top: 5px; color: rgba(255,255,255,.86); font-size: 10px; font-weight: 850; }
.md-bottom-grid { display: grid; grid-template-columns: minmax(320px, .68fr) minmax(0, 1.82fr); gap: 14px; align-items: start; margin-bottom: 28px; }
.md-signals-card,
.md-action-card { padding: 16px; }
.md-signal-stack { display: grid; gap: 12px; margin-top: 14px; }
.md-signal-row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  border: 0;
  border-radius: 14px;
  background: transparent;
  padding: 8px 6px;
  text-align: left;
}
.md-signal-row:hover { background: #f8fafc; }
.md-activity-icon { width: 36px; height: 36px; border-radius: 999px; }
.md-signal-row strong { display: block; color: #0f172a; font-size: 14px; line-height: 1.08; font-weight: 950; letter-spacing: -0.035em; }
.md-signal-row span { display: block; margin-top: 4px; color: #64748b; font-size: 10px; font-weight: 850; }
.md-signal-value { color: #334155; font-size: 11px; font-weight: 950; white-space: nowrap; }
.md-table-wrap { width: 100%; overflow-x: auto; }
.md-action-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.md-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.md-table th { color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; font-weight: 950; text-align: left; padding: 12px 10px; border-bottom: 1px solid rgba(226,232,240,.9); }
.md-table td { color: #0f172a; font-size: 11.5px; font-weight: 800; line-height: 1.35; padding: 12px 10px; border-bottom: 1px solid rgba(226,232,240,.86); vertical-align: top; word-break: break-word; }
.md-table tbody tr { transition: background 160ms ease; }
.md-table tbody tr:hover { background: #f8fafc; }
.md-priority { display: inline-flex; min-height: 24px; align-items: center; justify-content: center; border-radius: 999px; padding: 0 10px; font-size: 10px; font-weight: 950; }
.md-priority.high { color: #991b1b; background: #fee2e2; }
.md-priority.medium { color: #92400e; background: #fef3c7; }
.md-priority.low { color: #065f46; background: #d1fae5; }
.md-status-pill { display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; min-height: 28px; padding: 0 12px; color: #fff; background: linear-gradient(135deg, #1eb6e9, #3b82f6); font-size: 10px; font-weight: 950; }
.md-view-panel { padding: 18px; border: 1px solid rgba(226,232,240,.92); border-radius: 20px; background: #fff; box-shadow: var(--md-shadow-soft); }
.md-view-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding-bottom: 16px; border-bottom: 1px solid rgba(226,232,240,.88); }
.md-view-eyebrow { color: #2563eb; font-size: 11px; font-weight: 950; text-transform: uppercase; letter-spacing: .05em; }
.md-view-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.md-view-body { padding-top: 16px; }
.md-state-panel { display: grid; place-items: center; min-height: 220px; border: 1px solid rgba(226,232,240,.9); border-radius: 18px; background: #fff; color: #64748b; font-size: 13px; font-weight: 900; }
.md-state-error { color: #b91c1c; background: #fff7f7; border-color: rgba(239,68,68,.22); }
.md-breakdown-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; }
.md-breakdown-card { min-height: 145px; display: grid; align-content: space-between; gap: 10px; border: 1px solid rgba(226,232,240,.92); border-radius: 16px; background: linear-gradient(180deg, #fff, #f8fbff); padding: 16px; text-align: left; box-shadow: 0 10px 22px rgba(15,23,42,.05); }
.md-breakdown-card span { color: #0f172a; font-size: 13px; font-weight: 950; }
.md-breakdown-card strong { color: #2563eb; font-size: 26px; line-height: 1; font-weight: 950; letter-spacing: -0.04em; }
.md-breakdown-card small { color: #64748b; font-size: 11px; font-weight: 850; }
.md-card-hint { display: inline-flex; align-items: center; gap: 5px; color: #8b5cf6; font-style: normal; font-size: 11px; font-weight: 950; }
.md-evidence-wrap { border: 1px solid rgba(226,232,240,.92); border-radius: 16px; background: #fff; }
.md-evidence-wrap .md-table { min-width: 920px; }

/* =========================================================
   Typography + executive polish
   Uses the same EMA typography tokens when global CSS is loaded,
   but keeps safe fallbacks because this dashboard CSS is inline.
========================================================= */
.management-center-page,
.management-center-page button,
.management-center-page input,
.management-center-page table {
  font-family: var(--md-font) !important;
  font-feature-settings: "cv02", "cv03", "cv04", "cv11", "tnum";
  text-rendering: geometricPrecision;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.md-card-head h2,
.md-view-header h2,
.md-kpi-value strong,
.md-chart-number,
.md-chip-value,
.md-mix-item strong,
.md-pillar-tile h3,
.md-tile-value strong,
.md-signal-row strong,
.md-breakdown-card strong,
.md-breakdown-card span {
  font-family: var(--md-display-font) !important;
}
.md-kpi-card h3,
.md-section-title,
.md-small-title,
.md-eyebrow,
.md-view-eyebrow,
.md-table th,
.md-priority,
.md-status-pill,
.md-action-btn,
.md-summary-btn {
  font-family: var(--md-font) !important;
}
.md-card-head h2,
.md-view-header h2 {
  font-size: clamp(16px, 1.05vw, 19px) !important;
  line-height: 1.14 !important;
  font-weight: 850 !important;
  letter-spacing: -0.038em !important;
}
.md-card-head p,
.md-view-header p,
.md-chart-summary span {
  color: #5f718a !important;
  font-size: 11px !important;
  line-height: 1.45 !important;
  font-weight: 650 !important;
  letter-spacing: -0.005em !important;
}
.md-eyebrow,
.md-view-eyebrow {
  color: #8ca0ba !important;
  font-size: 10px !important;
  line-height: 1.1 !important;
  font-weight: 850 !important;
  letter-spacing: 0.10em !important;
}
.md-kpi-card h3,
.md-section-title,
.md-small-title {
  color: #10233f !important;
  font-size: 11.5px !important;
  line-height: 1.18 !important;
  font-weight: 850 !important;
  letter-spacing: -0.025em !important;
}
.md-kpi-card p,
.md-section-subtitle,
.md-chip-body .md-chip-label,
.md-signal-row span,
.md-breakdown-card small {
  color: #677b95 !important;
  font-size: 10.5px !important;
  line-height: 1.35 !important;
  font-weight: 650 !important;
  letter-spacing: -0.006em !important;
}
.md-kpi-value strong {
  font-size: clamp(23px, 1.65vw, 30px) !important;
  font-weight: 900 !important;
  letter-spacing: -0.060em !important;
  line-height: 0.96 !important;
  font-variant-numeric: tabular-nums;
}
.md-kpi-value span {
  font-size: 13px !important;
  font-weight: 800 !important;
  line-height: 1 !important;
}
.md-chart-number {
  font-size: clamp(26px, 2.2vw, 36px) !important;
  font-weight: 900 !important;
  letter-spacing: -0.064em !important;
  line-height: 0.98 !important;
  font-variant-numeric: tabular-nums;
}
.md-chip-value,
.md-signal-value,
.md-table td,
.md-mix-item strong,
.md-tile-value strong,
.md-breakdown-card strong {
  font-variant-numeric: tabular-nums;
}
.md-chip-value {
  font-size: 12.5px !important;
  font-weight: 850 !important;
  letter-spacing: -0.025em !important;
}
.md-mix-item strong {
  font-size: 22px !important;
  font-weight: 900 !important;
  letter-spacing: -0.052em !important;
}
.md-mix-item span {
  font-size: 10px !important;
  font-weight: 750 !important;
  letter-spacing: -0.004em !important;
}
.md-pillar-tile h3 {
  font-size: 12px !important;
  line-height: 1.12 !important;
  font-weight: 850 !important;
  letter-spacing: -0.025em !important;
}
.md-tile-value strong {
  font-size: clamp(25px, 2vw, 32px) !important;
  font-weight: 900 !important;
  letter-spacing: -0.058em !important;
}
.md-pillar-tile small {
  font-size: 10.5px !important;
  line-height: 1.22 !important;
  font-weight: 700 !important;
}
.md-signal-row strong {
  font-size: 14px !important;
  line-height: 1.12 !important;
  font-weight: 850 !important;
  letter-spacing: -0.035em !important;
}
.md-signal-value {
  color: #475569 !important;
  font-size: 11px !important;
  font-weight: 850 !important;
}
.md-table th {
  color: #65758e !important;
  font-size: 10px !important;
  line-height: 1.15 !important;
  font-weight: 850 !important;
  letter-spacing: 0.065em !important;
}
.md-table td {
  color: #14243a !important;
  font-size: 11.3px !important;
  line-height: 1.42 !important;
  font-weight: 690 !important;
  letter-spacing: -0.006em !important;
}
.md-priority,
.md-status-pill {
  font-size: 10px !important;
  line-height: 1 !important;
  font-weight: 800 !important;
  letter-spacing: -0.006em !important;
}
.md-action-btn,
.md-summary-btn {
  font-size: 11px !important;
  line-height: 1 !important;
  font-weight: 800 !important;
  letter-spacing: -0.012em !important;
}
.md-breakdown-card span {
  font-size: 13px !important;
  line-height: 1.2 !important;
  font-weight: 850 !important;
  letter-spacing: -0.025em !important;
}
.md-breakdown-card strong {
  font-size: 28px !important;
  font-weight: 900 !important;
  letter-spacing: -0.06em !important;
}
/* Small style refinement so typography feels less harsh without changing layout */
.md-card,
.md-view-panel,
.md-breakdown-card,
.md-evidence-wrap {
  border-color: rgba(203, 213, 225, 0.78) !important;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.045) !important;
}
.md-kpi-card,
.md-chart-card,
.md-donut-card,
.md-signals-card,
.md-action-card {
  background: linear-gradient(180deg, rgba(255,255,255,0.99), rgba(248,251,255,0.97)) !important;
}
.md-table tbody tr:hover,
.md-signal-row:hover {
  background: rgba(239, 246, 255, 0.56) !important;
}


/* Modern executive visual refresh: calmer palette, proper chart hover, premium ring */
:root {
  --md-prof-blue: #2563eb;
  --md-prof-cyan: #06b6d4;
  --md-prof-teal: #14b8a6;
  --md-prof-indigo: #6366f1;
  --md-prof-violet: #7c3aed;
  --md-prof-rose: #f43f5e;
  --md-prof-amber: #f59e0b;
  --md-prof-emerald: #10b981;
}
.md-kpi-icon,
.md-chip-icon {
  box-shadow: 0 10px 22px rgba(30, 64, 175, 0.12) !important;
}
.tone-blue .md-kpi-icon, .bg-blue { background: linear-gradient(135deg, #38bdf8 0%, #2563eb 100%) !important; }
.tone-green .md-kpi-icon, .bg-green { background: linear-gradient(135deg, #34d399 0%, #059669 100%) !important; }
.tone-red .md-kpi-icon, .bg-red { background: linear-gradient(135deg, #fb7185 0%, #e11d48 100%) !important; }
.tone-amber .md-kpi-icon, .bg-amber { background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%) !important; }
.tone-purple .md-kpi-icon, .bg-purple { background: linear-gradient(135deg, #a78bfa 0%, #6d28d9 100%) !important; }
.tone-cyan .md-kpi-icon, .bg-cyan { background: linear-gradient(135deg, #22d3ee 0%, #0891b2 100%) !important; }
.tone-pink .md-kpi-icon, .bg-pink { background: linear-gradient(135deg, #f472b6 0%, #db2777 100%) !important; }
.tone-orange .md-kpi-icon, .bg-orange { background: linear-gradient(135deg, #fdba74 0%, #f97316 100%) !important; }
.tone-slate .md-kpi-icon, .bg-slate { background: linear-gradient(135deg, #94a3b8 0%, #475569 100%) !important; }
.md-activity-icon.bg-blue { color: #1d4ed8 !important; background: #eff6ff !important; border: 1px solid #bfdbfe !important; box-shadow: none !important; }
.md-activity-icon.bg-green { color: #047857 !important; background: #ecfdf5 !important; border: 1px solid #a7f3d0 !important; box-shadow: none !important; }
.md-activity-icon.bg-red { color: #e11d48 !important; background: #fff1f2 !important; border: 1px solid #fecdd3 !important; box-shadow: none !important; }
.md-activity-icon.bg-amber { color: #b45309 !important; background: #fffbeb !important; border: 1px solid #fde68a !important; box-shadow: none !important; }
.md-activity-icon.bg-purple { color: #7c3aed !important; background: #f5f3ff !important; border: 1px solid #ddd6fe !important; box-shadow: none !important; }
.md-activity-icon.bg-cyan { color: #0891b2 !important; background: #ecfeff !important; border: 1px solid #a5f3fc !important; box-shadow: none !important; }
.md-activity-icon.bg-pink { color: #db2777 !important; background: #fdf2f8 !important; border: 1px solid #fbcfe8 !important; box-shadow: none !important; }
.md-activity-icon.bg-orange { color: #ea580c !important; background: #fff7ed !important; border: 1px solid #fed7aa !important; box-shadow: none !important; }
.md-activity-icon svg { stroke-width: 2.25 !important; }
.md-chart-card {
  background:
    radial-gradient(circle at 82% 0%, rgba(37, 99, 235, 0.045), transparent 20rem),
    linear-gradient(180deg, rgba(255,255,255,0.995), rgba(248,251,255,0.975)) !important;
}
.md-chart-panel {
  min-height: 222px;
  border-radius: 16px;
  padding: 4px 2px 0;
}
.md-chart-svg { height: 220px !important; cursor: crosshair; }
.md-chart-grid { stroke: rgba(148, 163, 184, 0.20) !important; stroke-dasharray: 3 9 !important; }
.md-chart-axis { stroke: rgba(100, 116, 139, 0.30) !important; }
.md-chart-label { fill: #7c8ea8 !important; font-size: 10px !important; font-weight: 850 !important; }
.md-chart-bar-finance { fill: url(#mdFinanceBarGradient) !important; opacity: 1 !important; filter: drop-shadow(0 5px 8px rgba(245, 158, 11, 0.14)); }
.md-chart-bar-risk { fill: url(#mdRiskBarGradient) !important; opacity: 1 !important; filter: drop-shadow(0 5px 8px rgba(244, 63, 94, 0.16)); }
.md-chart-hover-band { fill: transparent; cursor: pointer; }
.md-chart-hover-band:hover { fill: rgba(37, 99, 235, 0.035); }
.md-chart-active-line { stroke: rgba(37,99,235,.30); stroke-width: 1; stroke-dasharray: 4 5; }
.md-chart-tooltip-box { fill: rgba(15, 23, 42, 0.96); filter: drop-shadow(0 14px 20px rgba(15, 23, 42, 0.20)); }
.md-chart-tooltip-title { fill: #ffffff; font-size: 11px; font-weight: 900; }
.md-chart-tooltip-text { fill: #cbd5e1; font-size: 10px; font-weight: 750; }
.md-donut-card {
  background:
    radial-gradient(circle at 50% 18%, rgba(37, 99, 235, 0.055), transparent 14rem),
    linear-gradient(180deg, rgba(255,255,255,0.995), rgba(248,251,255,0.975)) !important;
}
.md-donut-shell { gap: 12px !important; }
.md-donut {
  width: 180px !important;
  height: 180px !important;
  border: 0 !important;
  border-radius: 24px !important;
  background:
    radial-gradient(circle at 52% 44%, rgba(255,255,255,.95) 0 35%, transparent 36%),
    linear-gradient(180deg, rgba(255,255,255,.88), rgba(245,249,253,.96)) !important;
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.075) !important;
  display: grid !important;
  place-items: center !important;
  padding: 0 !important;
}
.md-donut:hover { transform: translateY(-1px); box-shadow: 0 22px 44px rgba(15,23,42,.10) !important; }
.md-health-ring { position: relative; width: 160px; height: 160px; display: grid; place-items: center; }
.md-health-ring-svg { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); overflow: visible; }
.md-ring-track { fill: none; stroke: #e8eef7; stroke-width: 18; }
.md-ring-control { fill: none; stroke: url(#mdControlRingGradient); stroke-width: 18; stroke-linecap: round; filter: drop-shadow(0 10px 12px rgba(37, 99, 235, 0.18)); transition: stroke-dasharray 220ms ease; }
.md-ring-risk { fill: none; stroke: url(#mdRiskRingGradient); stroke-width: 14; stroke-linecap: round; opacity: .95; filter: drop-shadow(0 8px 12px rgba(244, 63, 94, 0.13)); }
.md-ring-center { position: relative; z-index: 1; width: 82px; height: 82px; border-radius: 999px; display: grid; place-items: center; background: #ffffff; box-shadow: inset 0 0 0 1px rgba(226,232,240,.88), 0 12px 22px rgba(15,23,42,.06); }
.md-ring-center strong { display: block; color: #10233f; font-size: 26px; line-height: 1; font-weight: 950; letter-spacing: -0.06em; font-variant-numeric: tabular-nums; }
.md-ring-center span { display: block; margin-top: 4px; color: #64748b; font-size: 9px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
.md-ring-core-icon { position: absolute; right: 24px; bottom: 20px; width: 36px; height: 36px; border-radius: 14px; display: grid; place-items: center; color: #ffffff; background: linear-gradient(135deg, #38bdf8, #2563eb); box-shadow: 0 14px 22px rgba(37,99,235,.18); }
.md-donut-hole,
.md-donut-core { display: none !important; }
.md-mix-item {
  border-color: rgba(203, 213, 225, 0.82) !important;
  background: rgba(255,255,255,0.86) !important;
  box-shadow: 0 8px 18px rgba(15,23,42,.035) !important;
}
.md-mix-item:hover { transform: translateY(-1px); border-color: rgba(37,99,235,.28) !important; }

/* Bottom gap fix: keep scroll usable without forcing a large empty footer. */
.management-center-page { padding-bottom: 18px !important; }
.md-content,
.md-dashboard-view { padding-bottom: 0 !important; }
.md-bottom-grid { margin-bottom: 0 !important; }


/* Final bottom card alignment polish */
.md-bottom-grid {
  align-items: stretch !important;
  grid-template-columns: minmax(320px, 0.72fr) minmax(0, 1.88fr) !important;
  gap: 14px !important;
}
.md-signals-card,
.md-action-card {
  height: 100% !important;
  min-height: 356px !important;
  display: flex !important;
  flex-direction: column !important;
}
.md-signals-card .md-card-head,
.md-action-card .md-action-header {
  flex: 0 0 auto !important;
}
.md-signal-stack {
  flex: 1 1 auto !important;
  display: grid !important;
  grid-auto-rows: minmax(56px, 1fr) !important;
  gap: 8px !important;
  margin-top: 12px !important;
}
.md-signal-row {
  min-height: 56px !important;
  height: 100% !important;
  display: grid !important;
  grid-template-columns: 42px minmax(0, 1fr) minmax(64px, auto) !important;
  align-items: center !important;
  gap: 11px !important;
  padding: 8px 10px !important;
  border: 1px solid transparent !important;
  border-radius: 16px !important;
}
.md-signal-row:hover {
  border-color: rgba(203, 213, 225, 0.82) !important;
  background: rgba(248, 251, 255, 0.88) !important;
}
.md-activity-icon {
  width: 38px !important;
  height: 38px !important;
  min-width: 38px !important;
  min-height: 38px !important;
  display: inline-grid !important;
  place-items: center !important;
  align-self: center !important;
  margin: 0 !important;
  border-radius: 14px !important;
}
.md-activity-icon .md-icon,
.md-activity-icon svg {
  width: 17px !important;
  height: 17px !important;
  display: block !important;
  margin: 0 !important;
}
.md-signal-copy {
  min-width: 0 !important;
  display: block !important;
  margin: 0 !important;
  align-self: center !important;
}
.md-signal-copy strong {
  display: block !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}
.md-signal-copy span {
  display: block !important;
  margin-top: 4px !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}
.md-signal-value {
  min-width: 64px !important;
  justify-self: end !important;
  align-self: center !important;
  margin: 0 !important;
  text-align: right !important;
}
.md-action-card .md-table-wrap {
  flex: 1 1 auto !important;
  min-height: 0 !important;
}
.md-action-header {
  align-items: flex-start !important;
}
.md-action-header .md-actions {
  align-items: center !important;
  flex-wrap: nowrap !important;
}
.md-action-btn {
  height: 36px !important;
  min-height: 36px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 7px !important;
  line-height: 1 !important;
}
.md-action-btn .md-icon,
.md-action-btn svg {
  width: 16px !important;
  height: 16px !important;
  display: block !important;
  margin: 0 !important;
}
.md-action-icon {
  width: 36px !important;
  min-width: 36px !important;
  height: 36px !important;
  padding: 0 !important;
  border-radius: 12px !important;
}

@media (max-width: 1180px) {
  .md-kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .md-top-row, .md-bottom-grid { grid-template-columns: 1fr; }
  .md-pillar-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
}
@media (max-width: 760px) {
  .management-center-page { height: 100%; max-height: 100%; overflow-y: auto !important; margin: 0; padding: 10px 8px 18px; }
  .md-kpi-grid, .md-pillar-grid, .md-finance-strip, .md-mix-row, .md-breakdown-grid { grid-template-columns: 1fr; }
  .md-chart-layout { grid-template-columns: 1fr; }
  .md-card-head, .md-action-header, .md-view-header { flex-direction: column; align-items: start; }
}
@media print {
  .management-center-page { height: auto; overflow: visible; padding: 0; background: #fff; }
  .md-actions, .md-view-actions { display: none; }
  .md-card, .md-view-panel { box-shadow: none; break-inside: avoid; }
}


/* Executive density polish - fills the main canvas with useful, compact signals */
.management-module-root {
  background:
    radial-gradient(circle at 8% 0%, rgba(37, 99, 235, 0.055), transparent 24rem),
    radial-gradient(circle at 98% 18%, rgba(14, 165, 233, 0.06), transparent 26rem),
    linear-gradient(135deg, #eef4fb 0%, #f8fbff 46%, #e8eff7 100%) !important;
}
.management-module-root::before {
  content: "";
  position: fixed;
  inset: 76px 0 0 0;
  pointer-events: none;
  opacity: .28;
  background-image:
    linear-gradient(rgba(100, 116, 139, .08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(100, 116, 139, .07) 1px, transparent 1px);
  background-size: 34px 34px;
  mask-image: linear-gradient(180deg, transparent 0%, black 12%, black 78%, transparent 100%);
}
.md-dashboard-view { gap: 12px !important; }
.md-card {
  background:
    radial-gradient(circle at 100% 0%, rgba(37,99,235,.035), transparent 11rem),
    linear-gradient(180deg, rgba(255,255,255,.99), rgba(248,251,255,.965)) !important;
}
.md-intel-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.md-intel-card {
  min-width: 0;
  border: 1px solid rgba(203, 213, 225, .86);
  border-radius: 16px;
  padding: 12px 13px;
  display: grid;
  gap: 8px;
  background:
    linear-gradient(135deg, rgba(255,255,255,.985), rgba(248,251,255,.96));
  box-shadow: 0 8px 18px rgba(15,23,42,.045);
  text-align: left;
  transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
}
.md-intel-card:hover {
  transform: translateY(-1px);
  border-color: rgba(37, 99, 235, .28);
  box-shadow: 0 14px 26px rgba(15,23,42,.075);
}
.md-intel-top {
  min-width: 0;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.md-intel-top span {
  min-width: 0;
  color: #64748b;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: .075em;
  text-transform: uppercase;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.md-intel-top strong {
  color: #0f172a;
  font-family: var(--md-display-font);
  font-size: 18px;
  line-height: 1;
  font-weight: 950;
  letter-spacing: -.055em;
  white-space: nowrap;
}
.md-intel-card small {
  color: #64748b;
  font-size: 10px;
  font-weight: 780;
  line-height: 1.25;
}
.md-progress-track {
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(203, 213, 225, .72);
}
.md-progress-track i {
  display: block;
  height: 100%;
  width: var(--w, 0%);
  border-radius: inherit;
  background: linear-gradient(90deg, var(--a, #2563eb), var(--b, #06b6d4));
  box-shadow: 0 0 0 1px rgba(255,255,255,.35) inset;
}
.md-intel-card.is-red { --a:#fb7185; --b:#ef4444; }
.md-intel-card.is-blue { --a:#38bdf8; --b:#2563eb; }
.md-intel-card.is-green { --a:#34d399; --b:#059669; }
.md-intel-card.is-amber { --a:#fbbf24; --b:#f59e0b; }
.md-chart-card { position: relative; overflow: hidden; }
.md-chart-card::after {
  content: "";
  position: absolute;
  right: 16px;
  top: 78px;
  width: 110px;
  height: 110px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(37,99,235,.08), transparent 64%);
  pointer-events: none;
}
.md-chart-summary {
  padding: 12px;
  border: 1px solid rgba(226,232,240,.78);
  border-radius: 16px;
  background: rgba(248,251,255,.74);
}
.md-chart-summary > div {
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(226,232,240,.75);
}
.md-chart-summary > div:last-of-type { border-bottom: 0; padding-bottom: 0; }
.md-donut-card { position: relative; overflow: hidden; }
.md-donut-card::after {
  content: "";
  position: absolute;
  inset: auto 20px 20px auto;
  width: 86px;
  height: 86px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(14,165,233,.08), transparent 68%);
  pointer-events: none;
}
.md-action-card,
.md-signals-card { min-height: 318px; }
.md-bottom-grid { margin-bottom: 12px !important; }
@media (max-width: 1180px) {
  .md-intel-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 720px) {
  .md-intel-strip { grid-template-columns: 1fr; }
}


/* =========================================================
   V Next - executive colour accents for previously plain cards
   Keep existing fully-coloured gradient cards unchanged.
========================================================= */
.md-card:not(.md-pillar-tile),
.md-view-panel,
.md-breakdown-card,
.md-evidence-wrap {
  position: relative;
  overflow: hidden;
}

.md-card:not(.md-pillar-tile)::before,
.md-view-panel::before,
.md-breakdown-card::before,
.md-evidence-wrap::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: linear-gradient(90deg, var(--card-a, #2563eb), var(--card-b, #06b6d4));
  opacity: .82;
  pointer-events: none;
}

.md-kpi-card {
  border: 1px solid rgba(203, 213, 225, .74) !important;
  background:
    radial-gradient(circle at 100% 12%, color-mix(in srgb, var(--card-a, #2563eb) 13%, transparent), transparent 48%),
    linear-gradient(135deg, rgba(255,255,255,.99), color-mix(in srgb, var(--card-a, #2563eb) 5%, #f8fbff)) !important;
}

.tone-blue { --card-a:#2563eb; --card-b:#06b6d4; }
.tone-cyan { --card-a:#06b6d4; --card-b:#0ea5e9; }
.tone-green { --card-a:#059669; --card-b:#22c55e; }
.tone-red { --card-a:#ef4444; --card-b:#f97316; }
.tone-amber { --card-a:#f59e0b; --card-b:#facc15; }
.tone-purple { --card-a:#8b5cf6; --card-b:#6366f1; }
.tone-pink { --card-a:#ec4899; --card-b:#8b5cf6; }
.tone-orange { --card-a:#fb923c; --card-b:#f97316; }
.tone-slate { --card-a:#64748b; --card-b:#334155; }

.md-chart-card {
  --card-a:#2563eb;
  --card-b:#06b6d4;
  background:
    radial-gradient(circle at 92% 10%, rgba(37,99,235,.115), transparent 15rem),
    radial-gradient(circle at 8% 100%, rgba(6,182,212,.08), transparent 14rem),
    linear-gradient(135deg, rgba(255,255,255,.99), rgba(239,246,255,.95)) !important;
}

.md-donut-card {
  --card-a:#10b981;
  --card-b:#0ea5e9;
  background:
    radial-gradient(circle at 96% 8%, rgba(16,185,129,.12), transparent 13rem),
    radial-gradient(circle at 0% 100%, rgba(14,165,233,.08), transparent 14rem),
    linear-gradient(135deg, rgba(255,255,255,.99), rgba(240,253,250,.94)) !important;
}

.md-signals-card {
  --card-a:#f43f5e;
  --card-b:#f59e0b;
  background:
    radial-gradient(circle at 94% 0%, rgba(244,63,94,.10), transparent 13rem),
    radial-gradient(circle at 0% 100%, rgba(245,158,11,.07), transparent 14rem),
    linear-gradient(135deg, rgba(255,255,255,.99), rgba(255,247,247,.94)) !important;
}

.md-action-card {
  --card-a:#6366f1;
  --card-b:#8b5cf6;
  background:
    radial-gradient(circle at 98% 0%, rgba(99,102,241,.11), transparent 14rem),
    radial-gradient(circle at 0% 100%, rgba(139,92,246,.07), transparent 15rem),
    linear-gradient(135deg, rgba(255,255,255,.99), rgba(245,243,255,.94)) !important;
}

.md-intel-card.is-blue {
  background:
    radial-gradient(circle at 100% 0%, rgba(37,99,235,.12), transparent 10rem),
    linear-gradient(135deg, #ffffff, #eff6ff) !important;
  border-color: rgba(37,99,235,.18) !important;
}
.md-intel-card.is-red {
  background:
    radial-gradient(circle at 100% 0%, rgba(239,68,68,.12), transparent 10rem),
    linear-gradient(135deg, #ffffff, #fff1f2) !important;
  border-color: rgba(239,68,68,.18) !important;
}
.md-intel-card.is-green {
  background:
    radial-gradient(circle at 100% 0%, rgba(5,150,105,.12), transparent 10rem),
    linear-gradient(135deg, #ffffff, #ecfdf5) !important;
  border-color: rgba(5,150,105,.18) !important;
}
.md-intel-card.is-amber {
  background:
    radial-gradient(circle at 100% 0%, rgba(245,158,11,.13), transparent 10rem),
    linear-gradient(135deg, #ffffff, #fffbeb) !important;
  border-color: rgba(245,158,11,.20) !important;
}

.md-chart-summary,
.md-finance-chip,
.md-mix-item {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 100% 0%, rgba(37,99,235,.06), transparent 8rem),
    linear-gradient(135deg, rgba(255,255,255,.98), rgba(248,251,255,.94)) !important;
}

.md-finance-chip {
  border-radius: 14px;
  padding: 8px !important;
}
.md-finance-chip:nth-child(1) { background: linear-gradient(135deg, #fff, #fdf2f8) !important; }
.md-finance-chip:nth-child(2) { background: linear-gradient(135deg, #fff, #f5f3ff) !important; }
.md-finance-chip:nth-child(3) { background: linear-gradient(135deg, #fff, #ecfeff) !important; }
.md-finance-chip:nth-child(4) { background: linear-gradient(135deg, #fff, #fff7ed) !important; }

.md-mix-item:nth-child(1) { background: linear-gradient(135deg, #fff, #fff1f2) !important; border-color: rgba(244,63,94,.20) !important; }
.md-mix-item:nth-child(2) { background: linear-gradient(135deg, #fff, #f5f3ff) !important; border-color: rgba(139,92,246,.20) !important; }
.md-mix-item:nth-child(3) { background: linear-gradient(135deg, #fff, #ecfeff) !important; border-color: rgba(6,182,212,.20) !important; }

.md-signal-row {
  border: 1px solid rgba(226,232,240,.62) !important;
  background: rgba(255,255,255,.58) !important;
}
.md-signal-row:nth-child(1),
.md-signal-row:nth-child(2) { background: linear-gradient(135deg, rgba(255,255,255,.88), rgba(255,241,242,.72)) !important; }
.md-signal-row:nth-child(3),
.md-signal-row:nth-child(4) { background: linear-gradient(135deg, rgba(255,255,255,.88), rgba(245,243,255,.72)) !important; }
.md-signal-row:nth-child(5) { background: linear-gradient(135deg, rgba(255,255,255,.88), rgba(236,253,245,.72)) !important; }
.md-signal-row:hover { transform: translateY(-1px); box-shadow: 0 10px 20px rgba(15,23,42,.055); }

.md-table thead th {
  background: linear-gradient(180deg, rgba(248,250,252,.98), rgba(241,245,249,.92));
}
.md-table tbody tr:nth-child(odd) td { background: rgba(248,250,252,.36); }
.md-table tbody tr:hover td { background: rgba(239,246,255,.74) !important; }

.md-view-panel { --card-a:#2563eb; --card-b:#8b5cf6; }
.md-breakdown-card { --card-a:#2563eb; --card-b:#06b6d4; }
.md-breakdown-card:nth-child(4n + 2) { --card-a:#8b5cf6; --card-b:#6366f1; }
.md-breakdown-card:nth-child(4n + 3) { --card-a:#059669; --card-b:#10b981; }
.md-breakdown-card:nth-child(4n + 4) { --card-a:#f59e0b; --card-b:#fb923c; }
.md-evidence-wrap { --card-a:#0ea5e9; --card-b:#6366f1; }


/* =========================================================
   Final colour correction - no accent stripes, modern KPI cards
   Reference direction: rounded gradient cards with full colour body.
========================================================= */
.md-card:not(.md-pillar-tile)::before,
.md-view-panel::before,
.md-breakdown-card::before,
.md-evidence-wrap::before,
.md-chart-card::before,
.md-donut-card::before,
.md-signals-card::before,
.md-action-card::before {
  display: none !important;
  content: none !important;
}

.md-kpi-card {
  min-height: 74px !important;
  grid-template-columns: 42px minmax(0, 1fr) !important;
  gap: 10px !important;
  align-items: center !important;
  padding: 11px 12px !important;
  border: 0 !important;
  border-radius: 16px !important;
  color: #ffffff !important;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.10) !important;
  overflow: hidden !important;
}
.md-kpi-card > span:first-child {
  order: 2 !important;
  min-width: 0 !important;
}
.md-kpi-card .md-kpi-icon {
  order: 1 !important;
  width: 38px !important;
  height: 38px !important;
  border-radius: 999px !important;
  color: var(--md-kpi-icon-color, rgba(15, 23, 42, 0.55)) !important;
  background: rgba(255, 255, 255, 0.96) !important;
  border: 1px solid rgba(255, 255, 255, 0.82) !important;
  box-shadow: 0 8px 18px rgba(15,23,42,.10) !important;
}
.md-kpi-card .md-kpi-icon svg {
  width: 18px !important;
  height: 18px !important;
  stroke-width: 2.35 !important;
}
.md-kpi-card h3 {
  margin: 0 !important;
  color: rgba(255,255,255,.86) !important;
  font-size: 10px !important;
  font-weight: 850 !important;
  letter-spacing: -0.012em !important;
  line-height: 1.1 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}
.md-kpi-card .md-kpi-value {
  margin-top: 4px !important;
  gap: 3px !important;
}
.md-kpi-card .md-kpi-value strong {
  color: #ffffff !important;
  font-size: 20px !important;
  font-weight: 950 !important;
  letter-spacing: -0.055em !important;
  text-shadow: 0 1px 0 rgba(15,23,42,.08) !important;
}
.md-kpi-card .md-kpi-value span {
  color: rgba(255,255,255,.88) !important;
  font-size: 11px !important;
  font-weight: 900 !important;
}
.md-kpi-card p {
  margin-top: 4px !important;
  color: rgba(255,255,255,.82) !important;
  font-size: 9px !important;
  font-weight: 760 !important;
  line-height: 1.18 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}
.md-kpi-card:hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 16px 28px rgba(15, 23, 42, 0.14) !important;
}

.tone-blue.md-kpi-card { background: linear-gradient(135deg, #21c6d8 0%, #1677f2 100%) !important; }
.tone-cyan.md-kpi-card { background: linear-gradient(135deg, #19c7d6 0%, #0ea5e9 100%) !important; }
.tone-green.md-kpi-card { background: linear-gradient(135deg, #13c88b 0%, #059669 100%) !important; }
.tone-red.md-kpi-card { background: linear-gradient(135deg, #ff6a78 0%, #ef4444 100%) !important; }
.tone-amber.md-kpi-card { background: linear-gradient(135deg, #ffbd42 0%, #f59e0b 100%) !important; }
.tone-purple.md-kpi-card { background: linear-gradient(135deg, #8b5cf6 0%, #2563eb 100%) !important; }
.tone-pink.md-kpi-card { background: linear-gradient(135deg, #f472b6 0%, #8b5cf6 100%) !important; }
.tone-orange.md-kpi-card { background: linear-gradient(135deg, #ffb64a 0%, #fb7b2b 100%) !important; }
.tone-slate.md-kpi-card { background: linear-gradient(135deg, #64748b 0%, #334155 100%) !important; }


/* KPI semantic colour system
   Premium/executive palette. Each top KPI uses a distinct semantic colour,
   while icons stay in clean white circular bubbles like the reference. */
.md-kpi-card.kpi-health {
  --md-kpi-icon-color: #e11d48;
  background:
    radial-gradient(circle at 12% 0%, rgba(255, 255, 255, 0.22), transparent 30%),
    linear-gradient(135deg, #e11d48 0%, #9f1239 100%) !important;
}
.md-kpi-card.kpi-financial {
  --md-kpi-icon-color: #2563eb;
  background:
    radial-gradient(circle at 12% 0%, rgba(255, 255, 255, 0.22), transparent 30%),
    linear-gradient(135deg, #0ea5e9 0%, #1d4ed8 100%) !important;
}
.md-kpi-card.kpi-risk {
  --md-kpi-icon-color: #dc2626;
  background:
    radial-gradient(circle at 12% 0%, rgba(255, 255, 255, 0.22), transparent 30%),
    linear-gradient(135deg, #fb923c 0%, #b91c1c 100%) !important;
}
.md-kpi-card.kpi-compliance {
  --md-kpi-icon-color: #ca8a04;
  background:
    radial-gradient(circle at 12% 0%, rgba(255, 255, 255, 0.22), transparent 30%),
    linear-gradient(135deg, #facc15 0%, #ca8a04 100%) !important;
}
.md-kpi-card.kpi-savings {
  --md-kpi-icon-color: #0f766e;
  background:
    radial-gradient(circle at 12% 0%, rgba(255, 255, 255, 0.22), transparent 30%),
    linear-gradient(135deg, #14b8a6 0%, #0f766e 100%) !important;
}
.md-kpi-card.kpi-board {
  --md-kpi-icon-color: #6366f1;
  background:
    radial-gradient(circle at 12% 0%, rgba(255, 255, 255, 0.22), transparent 30%),
    linear-gradient(135deg, #6366f1 0%, #4338ca 100%) !important;
}
.md-kpi-card.kpi-default {
  --md-kpi-icon-color: #475569;
  background:
    radial-gradient(circle at 12% 0%, rgba(255, 255, 255, 0.2), transparent 30%),
    linear-gradient(135deg, #64748b 0%, #334155 100%) !important;
}
.md-kpi-card.kpi-compliance .md-kpi-value strong,
.md-kpi-card.kpi-compliance h3,
.md-kpi-card.kpi-compliance p {
  text-shadow: 0 1px 0 rgba(120, 53, 15, 0.14) !important;
}

/* Plain panels now use full soft coloured borders, not thick top stripes. */
.md-chart-card,
.md-donut-card,
.md-signals-card,
.md-action-card,
.md-intel-card,
.md-view-panel,
.md-breakdown-card,
.md-evidence-wrap {
  border-width: 1.5px !important;
  border-style: solid !important;
}
.md-chart-card { border-color: rgba(37, 99, 235, .24) !important; }
.md-donut-card { border-color: rgba(20, 184, 166, .24) !important; }
.md-signals-card { border-color: rgba(244, 63, 94, .22) !important; }
.md-action-card { border-color: rgba(99, 102, 241, .24) !important; }
.md-intel-card.is-blue { border-color: rgba(37, 99, 235, .24) !important; }
.md-intel-card.is-red { border-color: rgba(239, 68, 68, .24) !important; }
.md-intel-card.is-green { border-color: rgba(5, 150, 105, .24) !important; }
.md-intel-card.is-amber { border-color: rgba(245, 158, 11, .26) !important; }

/* Remove the last over-coloured empty-card fills from the previous patch. */
.md-chart-card,
.md-donut-card,
.md-signals-card,
.md-action-card {
  background:
    radial-gradient(circle at 96% 0%, rgba(37,99,235,.035), transparent 14rem),
    linear-gradient(180deg, rgba(255,255,255,.995), rgba(248,251,255,.975)) !important;
}
.md-signal-row,
.md-signal-row:nth-child(1),
.md-signal-row:nth-child(2),
.md-signal-row:nth-child(3),
.md-signal-row:nth-child(4),
.md-signal-row:nth-child(5) {
  background: rgba(255,255,255,.72) !important;
  border-color: rgba(226,232,240,.78) !important;
}
.md-finance-chip,
.md-finance-chip:nth-child(1),
.md-finance-chip:nth-child(2),
.md-finance-chip:nth-child(3),
.md-finance-chip:nth-child(4),
.md-mix-item,
.md-mix-item:nth-child(1),
.md-mix-item:nth-child(2),
.md-mix-item:nth-child(3) {
  background: rgba(255,255,255,.86) !important;
}

@media (max-width: 1280px) {
  .md-kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
}
@media (max-width: 720px) {
  .md-kpi-grid { grid-template-columns: 1fr !important; }
}


/* =========================================================
   Chart layout repair
   Fix cramped left summary card and clipped CTA in Monthly Exposure Snapshot.
========================================================= */
.md-chart-card {
  overflow: hidden !important;
}
.md-chart-card .md-card-head {
  margin-bottom: 10px !important;
}
.md-chart-layout {
  grid-template-columns: minmax(206px, 0.28fr) minmax(0, 1fr) !important;
  gap: 18px !important;
  align-items: stretch !important;
}
.md-chart-summary {
  width: 100% !important;
  min-width: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  display: grid !important;
  gap: 10px !important;
  align-content: start !important;
}
.md-chart-summary > div {
  min-width: 0 !important;
  min-height: 82px !important;
  padding: 13px 14px !important;
  border: 1px solid rgba(203, 213, 225, 0.74) !important;
  border-radius: 16px !important;
  background:
    radial-gradient(circle at 100% 0%, rgba(37, 99, 235, 0.055), transparent 8rem),
    linear-gradient(180deg, rgba(255,255,255,0.98), rgba(247,250,254,0.96)) !important;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.035) !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: center !important;
  border-bottom: 1px solid rgba(203, 213, 225, 0.74) !important;
}
.md-chart-summary > div:last-of-type {
  padding-bottom: 13px !important;
}
.md-chart-number {
  font-size: 30px !important;
  line-height: 0.95 !important;
  letter-spacing: -0.06em !important;
  white-space: nowrap !important;
}
.md-chart-summary span {
  display: block !important;
  margin-top: 7px !important;
  color: #52677f !important;
  font-size: 11px !important;
  line-height: 1.42 !important;
  font-weight: 780 !important;
  white-space: normal !important;
  overflow-wrap: normal !important;
}
.md-summary-btn {
  width: 100% !important;
  max-width: 100% !important;
  min-height: 38px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 12px !important;
  border-radius: 14px !important;
  white-space: nowrap !important;
  box-sizing: border-box !important;
}
.md-chart-panel {
  min-width: 0 !important;
  align-self: stretch !important;
  padding-top: 4px !important;
}
.md-chart-svg {
  height: 226px !important;
  max-width: 100% !important;
}
.md-finance-strip {
  margin-top: 13px !important;
  padding-top: 12px !important;
  gap: 12px !important;
}
.md-finance-chip {
  min-height: 46px !important;
  border-radius: 15px !important;
  padding: 8px 10px !important;
}
@media (max-width: 1180px) {
  .md-chart-layout {
    grid-template-columns: 1fr !important;
  }
  .md-chart-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
  .md-summary-btn {
    grid-column: 1 / -1 !important;
  }
}
@media (max-width: 640px) {
  .md-chart-summary {
    grid-template-columns: 1fr !important;
  }
}


/* =========================================================
   Executive AI Storytelling Layer
========================================================= */
.md-story-banner {
  position: relative !important;
  min-width: 0 !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 0.38fr) !important;
  gap: 14px !important;
  align-items: stretch !important;
  padding: 15px !important;
  border: 1px solid rgba(191, 219, 254, 0.9) !important;
  border-radius: 20px !important;
  background:
    radial-gradient(circle at 0% 0%, rgba(37, 99, 235, 0.10), transparent 18rem),
    radial-gradient(circle at 96% 0%, rgba(20, 184, 166, 0.10), transparent 18rem),
    linear-gradient(135deg, rgba(255,255,255,0.985), rgba(240,247,255,0.965)) !important;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.055) !important;
  overflow: hidden !important;
}
.md-story-banner::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: linear-gradient(180deg, #0ea5e9, #14b8a6);
}
.md-story-main {
  min-width: 0 !important;
  display: grid !important;
  grid-template-columns: 46px minmax(0, 1fr) !important;
  gap: 12px !important;
  align-items: start !important;
}
.md-story-icon {
  width: 46px !important;
  height: 46px !important;
  display: grid !important;
  place-items: center !important;
  border-radius: 16px !important;
  color: #2563eb !important;
  background: #ffffff !important;
  border: 1px solid rgba(191, 219, 254, 0.94) !important;
  box-shadow: 0 10px 22px rgba(37, 99, 235, 0.10) !important;
}
.md-story-status {
  display: inline-flex !important;
  width: fit-content !important;
  align-items: center !important;
  gap: 6px !important;
  min-height: 22px !important;
  padding: 0 9px !important;
  border-radius: 999px !important;
  color: #1d4ed8 !important;
  background: rgba(37, 99, 235, 0.08) !important;
  border: 1px solid rgba(37, 99, 235, 0.14) !important;
  font-size: 10px !important;
  font-weight: 900 !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
}
.md-story-banner h2 {
  margin: 8px 0 0 !important;
  color: #0f172a !important;
  font-size: clamp(18px, 1.65vw, 26px) !important;
  line-height: 1.04 !important;
  font-weight: 950 !important;
  letter-spacing: -0.06em !important;
}
.md-story-banner p {
  margin: 7px 0 0 !important;
  max-width: 940px !important;
  color: #475569 !important;
  font-size: 12px !important;
  line-height: 1.52 !important;
  font-weight: 720 !important;
}
.md-story-signals {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 7px !important;
  margin-top: 10px !important;
}
.md-story-signals span {
  min-height: 24px !important;
  display: inline-flex !important;
  align-items: center !important;
  padding: 0 10px !important;
  border-radius: 999px !important;
  color: #334155 !important;
  background: rgba(255,255,255,0.78) !important;
  border: 1px solid rgba(203, 213, 225, 0.82) !important;
  font-size: 10px !important;
  font-weight: 850 !important;
}
.md-story-recommendation {
  min-width: 0 !important;
  display: grid !important;
  gap: 8px !important;
  align-content: start !important;
  padding: 13px !important;
  border-radius: 16px !important;
  border: 1px solid rgba(203, 213, 225, 0.82) !important;
  background: rgba(255,255,255,0.78) !important;
}
.md-story-recommendation span {
  color: #64748b !important;
  font-size: 10px !important;
  font-weight: 900 !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
}
.md-story-recommendation strong {
  color: #10233f !important;
  font-size: 13px !important;
  line-height: 1.34 !important;
  font-weight: 900 !important;
}
.md-story-actions {
  display: grid !important;
  gap: 6px !important;
  margin-top: 2px !important;
  padding-left: 0 !important;
  list-style: none !important;
}
.md-story-actions li {
  position: relative !important;
  padding-left: 14px !important;
  color: #52677f !important;
  font-size: 11px !important;
  line-height: 1.36 !important;
  font-weight: 760 !important;
}
.md-story-actions li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.48em;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #2563eb;
}
.md-story-source {
  width: fit-content !important;
  margin-top: 2px !important;
  padding: 3px 8px !important;
  border-radius: 999px !important;
  color: #64748b !important;
  background: rgba(226,232,240,.6) !important;
  font-size: 9px !important;
  font-weight: 900 !important;
}
.md-story-red::before { background: linear-gradient(180deg, #ef4444, #f97316) !important; }
.md-story-amber::before { background: linear-gradient(180deg, #f59e0b, #facc15) !important; }
.md-story-green::before { background: linear-gradient(180deg, #10b981, #14b8a6) !important; }
.md-story-purple::before { background: linear-gradient(180deg, #6366f1, #8b5cf6) !important; }
.md-story-red .md-story-icon { color: #e11d48 !important; border-color: #fecdd3 !important; }
.md-story-amber .md-story-icon { color: #d97706 !important; border-color: #fde68a !important; }
.md-story-green .md-story-icon { color: #047857 !important; border-color: #a7f3d0 !important; }
.md-story-purple .md-story-icon { color: #4f46e5 !important; border-color: #c7d2fe !important; }
@media (max-width: 1040px) {
  .md-story-banner { grid-template-columns: 1fr !important; }
}
@media (max-width: 640px) {
  .md-story-main { grid-template-columns: 1fr !important; }
  .md-story-icon { width: 40px !important; height: 40px !important; }
}


/* =========================================================
   Final executive layout rewrite
   - Storytelling moved to the top of the dashboard.
   - Removed all thin coloured stripe/progress-line styling.
   - Summary cards become clean executive pulse cards, not line cards.
========================================================= */
.md-dashboard-view {
  gap: 12px !important;
}

.md-card::before,
.md-view-panel::before,
.md-breakdown-card::before,
.md-evidence-wrap::before,
.md-chart-card::before,
.md-donut-card::before,
.md-signals-card::before,
.md-action-card::before,
.md-story-banner::before,
.md-story-red::before,
.md-story-amber::before,
.md-story-green::before,
.md-story-purple::before,
.md-intel-card::before {
  display: none !important;
  content: none !important;
}

.md-story-banner {
  grid-template-columns: minmax(0, 1.45fr) minmax(340px, .55fr) !important;
  gap: 16px !important;
  padding: 18px !important;
  border: 0 !important;
  border-radius: 24px !important;
  background:
    radial-gradient(circle at 8% 8%, rgba(96, 165, 250, .28), transparent 22rem),
    radial-gradient(circle at 94% 0%, rgba(45, 212, 191, .24), transparent 18rem),
    linear-gradient(135deg, #0f172a 0%, #1e293b 54%, #0f766e 100%) !important;
  box-shadow: 0 22px 48px rgba(15, 23, 42, .18) !important;
  overflow: hidden !important;
}

.md-story-main {
  grid-template-columns: 50px minmax(0, 1fr) !important;
  gap: 14px !important;
  align-items: start !important;
}

.md-story-icon {
  width: 50px !important;
  height: 50px !important;
  border-radius: 18px !important;
  color: #ffffff !important;
  background: rgba(255, 255, 255, .13) !important;
  border: 1px solid rgba(255, 255, 255, .20) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.22), 0 18px 28px rgba(15,23,42,.18) !important;
}

.md-story-status {
  min-height: 24px !important;
  color: #dbeafe !important;
  background: rgba(255, 255, 255, .12) !important;
  border: 1px solid rgba(255, 255, 255, .20) !important;
  letter-spacing: .11em !important;
}

.md-story-banner h2 {
  max-width: 980px !important;
  margin-top: 10px !important;
  color: #ffffff !important;
  font-size: clamp(22px, 1.95vw, 34px) !important;
  line-height: 1.03 !important;
  letter-spacing: -0.065em !important;
  text-wrap: balance !important;
}

.md-story-banner p {
  max-width: 920px !important;
  color: rgba(226, 232, 240, .90) !important;
  font-size: 13px !important;
  line-height: 1.55 !important;
  font-weight: 730 !important;
}

.md-story-signals {
  gap: 8px !important;
  margin-top: 12px !important;
}

.md-story-signals span {
  min-height: 26px !important;
  color: #e2e8f0 !important;
  background: rgba(255, 255, 255, .11) !important;
  border: 1px solid rgba(255, 255, 255, .20) !important;
  backdrop-filter: blur(10px) !important;
}

.md-story-recommendation {
  align-content: start !important;
  gap: 10px !important;
  padding: 16px !important;
  border-radius: 20px !important;
  border: 1px solid rgba(255, 255, 255, .20) !important;
  background: rgba(255, 255, 255, .12) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.16) !important;
  backdrop-filter: blur(12px) !important;
}

.md-story-recommendation span {
  color: rgba(219, 234, 254, .92) !important;
}

.md-story-recommendation strong {
  color: #ffffff !important;
  font-size: 14px !important;
  line-height: 1.35 !important;
}

.md-story-actions li {
  color: rgba(226, 232, 240, .90) !important;
  font-size: 11px !important;
}

.md-story-actions li::before {
  background: #67e8f9 !important;
  box-shadow: 0 0 0 4px rgba(103, 232, 249, .12) !important;
}

.md-story-source {
  color: rgba(226, 232, 240, .88) !important;
  background: rgba(255, 255, 255, .13) !important;
}

.md-intel-strip {
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 10px !important;
}

.md-intel-card {
  min-height: 76px !important;
  display: grid !important;
  align-content: space-between !important;
  gap: 8px !important;
  padding: 13px 14px !important;
  border-radius: 18px !important;
  box-shadow: 0 12px 28px rgba(15, 23, 42, .075) !important;
  overflow: hidden !important;
}

.md-intel-strip .md-progress-track {
  display: none !important;
}

.md-intel-top {
  align-items: flex-start !important;
}

.md-intel-top > span {
  color: #475569 !important;
  font-size: 10px !important;
  font-weight: 950 !important;
  letter-spacing: .055em !important;
  text-transform: uppercase !important;
}

.md-intel-top strong {
  color: #0f172a !important;
  font-size: 25px !important;
  line-height: .9 !important;
  letter-spacing: -.055em !important;
}

.md-intel-card small {
  max-width: 92% !important;
  color: #64748b !important;
  font-size: 10px !important;
  line-height: 1.36 !important;
  font-weight: 750 !important;
}

.md-intel-card.is-blue,
.md-intel-card.is-red,
.md-intel-card.is-green,
.md-intel-card.is-amber {
  border: 1px solid rgba(203, 213, 225, .62) !important;
}

.md-intel-card.is-blue {
  background:
    radial-gradient(circle at 100% 0%, rgba(37,99,235,.12), transparent 8rem),
    linear-gradient(135deg, #ffffff 0%, #eef6ff 100%) !important;
}
.md-intel-card.is-red {
  background:
    radial-gradient(circle at 100% 0%, rgba(225,29,72,.12), transparent 8rem),
    linear-gradient(135deg, #ffffff 0%, #fff1f2 100%) !important;
}
.md-intel-card.is-green {
  background:
    radial-gradient(circle at 100% 0%, rgba(15,118,110,.12), transparent 8rem),
    linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%) !important;
}
.md-intel-card.is-amber {
  background:
    radial-gradient(circle at 100% 0%, rgba(217,119,6,.13), transparent 8rem),
    linear-gradient(135deg, #ffffff 0%, #fffbeb 100%) !important;
}

@media (max-width: 1180px) {
  .md-story-banner { grid-template-columns: 1fr !important; }
  .md-intel-strip { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
}

@media (max-width: 720px) {
  .md-story-main { grid-template-columns: 1fr !important; }
  .md-intel-strip { grid-template-columns: 1fr !important; }
}


/* =========================================================
   Storytelling typography refinement
   Cleaner executive reading hierarchy, less heavy display type.
========================================================= */
.md-story-banner {
  min-height: 166px !important;
  padding: 20px 22px !important;
  font-family: var(--ema-font-sans, var(--ema-font-body, "Inter", "Aptos", "Segoe UI", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Arial, sans-serif)) !important;
}

.md-story-main {
  grid-template-columns: 46px minmax(0, 1fr) !important;
  gap: 14px !important;
}

.md-story-icon {
  width: 46px !important;
  height: 46px !important;
  border-radius: 16px !important;
}

.md-story-icon .md-icon,
.md-story-icon svg {
  width: 18px !important;
  height: 18px !important;
  stroke-width: 2.05 !important;
}

.md-story-status {
  min-height: 22px !important;
  padding: 0 10px !important;
  font-size: 9.5px !important;
  font-weight: 760 !important;
  letter-spacing: .075em !important;
}

.md-story-banner h2 {
  max-width: 900px !important;
  margin-top: 10px !important;
  font-family: var(--ema-font-sans, var(--ema-font-body, "Inter", "Aptos", "Segoe UI", ui-sans-serif, system-ui, sans-serif)) !important;
  font-size: clamp(21px, 1.55vw, 29px) !important;
  line-height: 1.12 !important;
  font-weight: 780 !important;
  letter-spacing: -0.038em !important;
}

.md-story-banner p {
  max-width: 860px !important;
  margin-top: 9px !important;
  font-size: 13px !important;
  line-height: 1.62 !important;
  font-weight: 560 !important;
  letter-spacing: -0.006em !important;
}

.md-story-signals {
  margin-top: 13px !important;
  gap: 8px !important;
}

.md-story-signals span {
  min-height: 25px !important;
  padding: 0 11px !important;
  font-size: 10.5px !important;
  font-weight: 680 !important;
  letter-spacing: -0.006em !important;
}

.md-story-recommendation {
  padding: 17px !important;
  gap: 9px !important;
}

.md-story-recommendation span {
  font-size: 9.5px !important;
  font-weight: 760 !important;
  letter-spacing: .07em !important;
}

.md-story-recommendation strong {
  font-family: var(--ema-font-sans, var(--ema-font-body, "Inter", "Aptos", "Segoe UI", ui-sans-serif, system-ui, sans-serif)) !important;
  font-size: 14px !important;
  line-height: 1.44 !important;
  font-weight: 720 !important;
  letter-spacing: -0.015em !important;
}

.md-story-actions {
  gap: 7px !important;
}

.md-story-actions li {
  padding-left: 16px !important;
  font-size: 11.5px !important;
  line-height: 1.52 !important;
  font-weight: 560 !important;
}

.md-story-actions li::before {
  top: .56em !important;
  width: 5px !important;
  height: 5px !important;
}

.md-story-source {
  margin-top: 4px !important;
  font-size: 9.5px !important;
  font-weight: 680 !important;
  letter-spacing: -0.005em !important;
}

@media (max-width: 1180px) {
  .md-story-banner { min-height: auto !important; }
  .md-story-banner h2 { max-width: 100% !important; }
  .md-story-banner p { max-width: 100% !important; }
}


/* =========================================================
   Executive feedback refinement
   - Chart uses contextual area/line trend, not thin floating bars.
   - KPI colours are calmer except urgent/risk cards.
   - Repeated raw numbers are replaced by driver context.
========================================================= */
.md-chart-layout-contextual {
  grid-template-columns: minmax(235px, 285px) minmax(0, 1fr) !important;
  align-items: stretch !important;
  gap: 18px !important;
}

.md-chart-context-panel {
  min-width: 0 !important;
  gap: 12px !important;
  align-content: start !important;
  padding: 15px !important;
  border: 1px solid rgba(203, 213, 225, .72) !important;
  border-radius: 18px !important;
  background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(248,251,255,.94)) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.92), 0 12px 24px rgba(15, 23, 42, .055) !important;
}

.md-context-label,
.md-chart-context-title {
  display: block !important;
  color: #64748b !important;
  font-size: 9.5px !important;
  font-weight: 850 !important;
  letter-spacing: .08em !important;
  text-transform: uppercase !important;
}

.md-chart-context-panel h3 {
  margin: 2px 0 0 !important;
  color: #0f172a !important;
  font-size: 16px !important;
  line-height: 1.16 !important;
  font-weight: 780 !important;
  letter-spacing: -.025em !important;
}

.md-context-stack {
  display: grid !important;
  gap: 8px !important;
}

.md-context-row {
  width: 100% !important;
  min-width: 0 !important;
  display: grid !important;
  grid-template-columns: 34px minmax(0, 1fr) auto !important;
  align-items: center !important;
  gap: 9px !important;
  padding: 9px !important;
  border: 1px solid rgba(226, 232, 240, .86) !important;
  border-radius: 14px !important;
  background: rgba(255, 255, 255, .78) !important;
  text-align: left !important;
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease !important;
}

.md-context-row:hover {
  transform: translateY(-2px) !important;
  border-color: rgba(37, 99, 235, .28) !important;
  background: #ffffff !important;
  box-shadow: 0 14px 24px rgba(15, 23, 42, .08) !important;
}

.md-context-icon {
  width: 34px !important;
  height: 34px !important;
  display: grid !important;
  place-items: center !important;
  border-radius: 12px !important;
  color: #ffffff !important;
}

.md-context-row strong {
  display: block !important;
  min-width: 0 !important;
  color: #0f172a !important;
  font-size: 11.5px !important;
  line-height: 1.16 !important;
  font-weight: 780 !important;
  letter-spacing: -.01em !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.md-context-row small {
  display: block !important;
  margin-top: 2px !important;
  color: #64748b !important;
  font-size: 9.5px !important;
  line-height: 1.2 !important;
  font-weight: 620 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.md-context-row em {
  max-width: 76px !important;
  color: #334155 !important;
  font-size: 9.5px !important;
  font-style: normal !important;
  font-weight: 780 !important;
  text-align: right !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.md-area-chart-panel {
  padding: 4px 4px 0 !important;
}

.md-chart-headline-row {
  min-height: 42px !important;
  justify-content: flex-end !important;
  gap: 13px !important;
  margin-bottom: 0 !important;
}

.md-chart-headline-row > div {
  margin-right: auto !important;
}

.md-chart-headline-row strong {
  display: inline-flex !important;
  margin-top: 3px !important;
  color: #0f172a !important;
  font-size: 22px !important;
  font-weight: 820 !important;
  letter-spacing: -.045em !important;
}

.md-delta {
  display: inline-flex !important;
  margin-left: 9px !important;
  padding: 4px 8px !important;
  border-radius: 999px !important;
  font-size: 9px !important;
  font-weight: 820 !important;
  vertical-align: middle !important;
}

.md-delta.negative { color: #be123c !important; background: #fff1f2 !important; }
.md-delta.positive { color: #047857 !important; background: #ecfdf5 !important; }
.md-delta.neutral { color: #475569 !important; background: #f1f5f9 !important; }

.md-chart-svg {
  height: 218px !important;
}

.md-chart-area-finance {
  fill: url(#mdFinanceAreaGradient) !important;
}

.md-chart-area-risk {
  fill: url(#mdRiskAreaGradient) !important;
}

.md-chart-line-finance {
  fill: none !important;
  stroke: url(#mdFinanceLineGradient) !important;
  stroke-width: 4 !important;
  stroke-linecap: round !important;
  stroke-linejoin: round !important;
  filter: drop-shadow(0 8px 12px rgba(217, 119, 6, .13)) !important;
}

.md-chart-line-risk {
  fill: none !important;
  stroke: url(#mdRiskLineGradient) !important;
  stroke-width: 4.5 !important;
  stroke-linecap: round !important;
  stroke-linejoin: round !important;
  filter: drop-shadow(0 9px 14px rgba(190, 18, 60, .15)) !important;
}

.md-chart-point-finance,
.md-chart-point-risk {
  transition: r .16s ease, filter .16s ease !important;
}

.md-chart-point-finance {
  fill: #f59e0b !important;
  stroke: #ffffff !important;
  stroke-width: 3 !important;
}

.md-chart-point-risk {
  fill: #be123c !important;
  stroke: #ffffff !important;
  stroke-width: 3 !important;
}

.md-chart-hover-band:hover + .md-chart-point-finance,
.md-chart-hover-band:hover + .md-chart-point-finance + .md-chart-point-risk {
  filter: drop-shadow(0 6px 10px rgba(15, 23, 42, .18)) !important;
}

.md-kpi-card.kpi-financial,
.md-kpi-card.kpi-compliance,
.md-kpi-card.kpi-savings,
.md-kpi-card.kpi-board {
  color: #0f172a !important;
  border: 1px solid rgba(203, 213, 225, .72) !important;
  box-shadow: 0 10px 22px rgba(15, 23, 42, .075), inset 0 1px 0 rgba(255,255,255,.88) !important;
}

.md-kpi-card.kpi-financial h3,
.md-kpi-card.kpi-compliance h3,
.md-kpi-card.kpi-savings h3,
.md-kpi-card.kpi-board h3,
.md-kpi-card.kpi-financial p,
.md-kpi-card.kpi-compliance p,
.md-kpi-card.kpi-savings p,
.md-kpi-card.kpi-board p {
  color: #475569 !important;
  text-shadow: none !important;
}

.md-kpi-card.kpi-financial .md-kpi-value strong,
.md-kpi-card.kpi-compliance .md-kpi-value strong,
.md-kpi-card.kpi-savings .md-kpi-value strong,
.md-kpi-card.kpi-board .md-kpi-value strong,
.md-kpi-card.kpi-financial .md-kpi-value span,
.md-kpi-card.kpi-compliance .md-kpi-value span,
.md-kpi-card.kpi-savings .md-kpi-value span,
.md-kpi-card.kpi-board .md-kpi-value span {
  color: #0f172a !important;
  text-shadow: none !important;
}

.md-kpi-card.kpi-financial {
  background: linear-gradient(135deg, #ffffff 0%, #eaf3ff 100%) !important;
}

.md-kpi-card.kpi-compliance {
  background: linear-gradient(135deg, #ffffff 0%, #fff8e6 100%) !important;
}

.md-kpi-card.kpi-savings {
  background: linear-gradient(135deg, #ffffff 0%, #eefdf8 100%) !important;
}

.md-kpi-card.kpi-board {
  background: linear-gradient(135deg, #ffffff 0%, #f3f4ff 100%) !important;
}

.md-kpi-trend {
  display: inline-flex !important;
  width: fit-content !important;
  max-width: 100% !important;
  margin-top: 5px !important;
  padding: 4px 8px !important;
  border-radius: 999px !important;
  font-size: 8.5px !important;
  line-height: 1 !important;
  font-weight: 820 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.md-kpi-card.kpi-health .md-kpi-trend,
.md-kpi-card.kpi-risk .md-kpi-trend {
  color: rgba(255,255,255,.92) !important;
  background: rgba(255,255,255,.18) !important;
}

.md-kpi-trend.negative { color: #be123c !important; background: #fff1f2 !important; }
.md-kpi-trend.watch { color: #92400e !important; background: #fffbeb !important; }
.md-kpi-trend.positive { color: #047857 !important; background: #ecfdf5 !important; }
.md-kpi-trend.neutral { color: #475569 !important; background: #f1f5f9 !important; }

@media (max-width: 1180px) {
  .md-chart-layout-contextual { grid-template-columns: 1fr !important; }
  .md-chart-context-panel { grid-template-columns: 1fr !important; }
}


/* === Executive redesign overrides: bento + calmer premium palette === */
.management-center-page {
  background:
    radial-gradient(circle at top right, rgba(37, 99, 235, 0.05), transparent 28%),
    linear-gradient(180deg, #f8fafc 0%, #f3f6fb 100%) !important;
}

.md-dashboard-view {
  display: grid !important;
  gap: 18px !important;
}

.md-story-banner {
  border: 1px solid rgba(15, 23, 42, 0.08) !important;
  background: linear-gradient(135deg, #10213f 0%, #17335f 46%, #173d57 100%) !important;
  border-radius: 28px !important;
  box-shadow: 0 26px 48px rgba(15, 23, 42, 0.10) !important;
}
.md-story-main {
  gap: 18px !important;
}
.md-story-icon {
  width: 48px !important;
  height: 48px !important;
  background: rgba(255,255,255,.10) !important;
  border: 1px solid rgba(255,255,255,.18) !important;
}
.md-story-status {
  background: rgba(255,255,255,.10) !important;
  color: #dbeafe !important;
  border: 1px solid rgba(255,255,255,.12) !important;
}
.md-story-banner h2 {
  font-size: clamp(28px, 3vw, 48px) !important;
  line-height: 1.04 !important;
  max-width: 16ch !important;
  letter-spacing: -0.045em !important;
}
.md-story-banner p {
  max-width: 70ch !important;
  color: rgba(255,255,255,.82) !important;
  font-size: 14px !important;
  line-height: 1.6 !important;
}
.md-story-recommendation {
  background: rgba(255,255,255,.09) !important;
  border: 1px solid rgba(255,255,255,.12) !important;
  border-radius: 22px !important;
  box-shadow: none !important;
}
.md-story-signals span,
.md-story-source {
  background: rgba(255,255,255,.09) !important;
  border-color: rgba(255,255,255,.14) !important;
  color: rgba(255,255,255,.82) !important;
}

.md-intel-strip {
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 14px !important;
}
.md-intel-card {
  min-height: 112px !important;
  padding: 16px 18px !important;
  border-radius: 22px !important;
  border: 1px solid rgba(148, 163, 184, .18) !important;
  background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(248,250,252,.98)) !important;
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.06) !important;
}
.md-intel-card::before,
.md-progress-track { display: none !important; }
.md-intel-top {
  margin-bottom: 8px !important;
}
.md-intel-top span {
  color: #64748b !important;
  font-size: 10px !important;
  font-weight: 900 !important;
  text-transform: uppercase !important;
  letter-spacing: .08em !important;
}
.md-intel-top strong {
  color: #0f172a !important;
  font-size: 26px !important;
  letter-spacing: -0.05em !important;
}
.md-intel-card small {
  margin-top: 8px !important;
  color: #475569 !important;
  font-size: 11px !important;
  line-height: 1.45 !important;
}
.md-intel-card.is-blue { background: linear-gradient(180deg, #ffffff 0%, #f1f7ff 100%) !important; }
.md-intel-card.is-red { background: linear-gradient(180deg, #ffffff 0%, #fff4f5 100%) !important; }
.md-intel-card.is-green { background: linear-gradient(180deg, #ffffff 0%, #f1fbf7 100%) !important; }
.md-intel-card.is-amber { background: linear-gradient(180deg, #ffffff 0%, #fff9ef 100%) !important; }

.md-kpi-grid {
  grid-template-columns: repeat(12, minmax(0, 1fr)) !important;
  gap: 14px !important;
}
.md-kpi-card {
  grid-column: span 2 !important;
  min-height: 98px !important;
  padding: 14px 16px !important;
  border-radius: 22px !important;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255,255,255,.20) !important;
}
.md-kpi-card h3 { font-size: 10px !important; text-transform: uppercase !important; letter-spacing: .06em !important; }
.md-kpi-card p { font-size: 10px !important; }
.md-kpi-card .md-kpi-value strong { font-size: 22px !important; }
.md-kpi-card.kpi-financial {
  background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%) !important;
  color: #fff !important;
}
.md-kpi-card.kpi-financial h3,
.md-kpi-card.kpi-financial p,
.md-kpi-card.kpi-financial .md-kpi-value span { color: rgba(255,255,255,.82) !important; }
.md-kpi-card.kpi-compliance {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%) !important;
  border: 1px solid rgba(148, 163, 184, 0.24) !important;
}
.md-kpi-card.kpi-compliance h3,
.md-kpi-card.kpi-compliance p,
.md-kpi-card.kpi-compliance .md-kpi-value span,
.md-kpi-card.kpi-compliance .md-kpi-value strong { color: #0f172a !important; }
.md-kpi-card.kpi-compliance .md-kpi-icon { color: #ca8a04 !important; }
.md-kpi-card.kpi-savings {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%) !important;
  border: 1px solid rgba(16, 185, 129, 0.18) !important;
}
.md-kpi-card.kpi-savings h3,
.md-kpi-card.kpi-savings p,
.md-kpi-card.kpi-savings .md-kpi-value span,
.md-kpi-card.kpi-savings .md-kpi-value strong { color: #0f172a !important; }
.md-kpi-card.kpi-savings .md-kpi-icon { color: #059669 !important; }
.md-kpi-card.kpi-board {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%) !important;
  border: 1px solid rgba(99, 102, 241, 0.18) !important;
}
.md-kpi-card.kpi-board h3,
.md-kpi-card.kpi-board p,
.md-kpi-card.kpi-board .md-kpi-value span,
.md-kpi-card.kpi-board .md-kpi-value strong { color: #0f172a !important; }
.md-kpi-card.kpi-board .md-kpi-icon { color: #4f46e5 !important; }

.md-top-row {
  grid-template-columns: minmax(0, 1.9fr) minmax(320px, .82fr) !important;
  gap: 16px !important;
}
.md-chart-card,
.md-donut-card,
.md-action-card,
.md-signals-card,
.md-intel-card,
.md-pillar-tile {
  border-radius: 24px !important;
  border: 1px solid rgba(148,163,184,.16) !important;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.06) !important;
}
.md-chart-card,
.md-donut-card,
.md-signals-card,
.md-action-card {
  background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(248,250,252,.98)) !important;
}
.md-chart-card::before,
.md-chart-card::after,
.md-donut-card::before,
.md-signals-card::before,
.md-action-card::before { display: none !important; }
.md-card-head,
.md-action-header {
  margin-bottom: 16px !important;
}
.md-eyebrow {
  letter-spacing: .09em !important;
  font-size: 10px !important;
  color: #94a3b8 !important;
}
.md-card-head h2,
.md-section-title { font-size: 30px !important; letter-spacing: -0.045em !important; }
.md-card-head p,
.md-section-subtitle { color: #64748b !important; line-height: 1.55 !important; }

.md-chart-layout-contextual {
  grid-template-columns: minmax(260px, .85fr) minmax(0, 1.45fr) !important;
  gap: 18px !important;
}
.md-chart-context-panel,
.md-area-chart-panel {
  background: #fff !important;
  border: 1px solid rgba(226,232,240,.9) !important;
  border-radius: 22px !important;
  padding: 18px !important;
}
.md-area-chart-panel { box-shadow: inset 0 1px 0 rgba(255,255,255,.5); }
.md-chart-context-title { color: #64748b !important; text-transform: uppercase !important; font-size: 11px !important; letter-spacing: .08em !important; }
.md-chart-headline-row strong { font-size: 30px !important; }
.md-chart-svg { min-height: 250px !important; }
.md-chart-grid { stroke: rgba(203, 213, 225, 0.6) !important; stroke-dasharray: 4 8 !important; }
.md-chart-axis { stroke: rgba(148, 163, 184, 0.4) !important; }

.md-pillar-grid {
  grid-template-columns: repeat(12, minmax(0, 1fr)) !important;
  gap: 16px !important;
}
.md-pillar-tile {
  grid-column: span 3 !important;
  padding: 18px 18px !important;
  min-height: 118px !important;
}
.md-pillar-tile.tile-purple { background: linear-gradient(135deg, #1e293b 0%, #334155 100%) !important; }
.md-pillar-tile.tile-blue { background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%) !important; }
.md-pillar-tile.tile-teal { background: linear-gradient(135deg, #0f766e 0%, #0f766e 100%) !important; }
.md-pillar-tile.tile-orange { background: linear-gradient(135deg, #d97706 0%, #b45309 100%) !important; }
.md-pillar-tile::after { opacity: .42 !important; }

.md-bottom-grid {
  grid-template-columns: minmax(320px, .92fr) minmax(0, 2.08fr) !important;
  gap: 16px !important;
}
.md-signal-stack { gap: 10px !important; }
.md-signal-row,
.md-context-row {
  border-radius: 18px !important;
  border: 1px solid rgba(226,232,240,.95) !important;
  background: #fff !important;
}

.md-table-wrap {
  overflow-x: auto !important;
}
.md-table {
  border-collapse: separate !important;
  border-spacing: 0 10px !important;
}
.md-table thead th {
  border-bottom: 0 !important;
  padding-bottom: 4px !important;
  color: #94a3b8 !important;
}
.md-table tbody td {
  border: 0 !important;
  background: rgba(248,250,252,.9) !important;
  padding-top: 16px !important;
  padding-bottom: 16px !important;
}
.md-table tbody tr td:first-child {
  border-top-left-radius: 16px !important;
  border-bottom-left-radius: 16px !important;
}
.md-table tbody tr td:last-child {
  border-top-right-radius: 16px !important;
  border-bottom-right-radius: 16px !important;
}
.md-table tbody tr:hover td {
  background: rgba(239,246,255,.94) !important;
}
.md-priority {
  border: 1px solid transparent !important;
}
.md-priority.high { background: rgba(239,68,68,.10) !important; color: #b91c1c !important; }
.md-priority.medium { background: rgba(245,158,11,.12) !important; color: #b45309 !important; }
.md-priority.low { background: rgba(16,185,129,.12) !important; color: #047857 !important; }
.md-status-pill {
  background: rgba(37,99,235,.10) !important;
  color: #1d4ed8 !important;
  border: 1px solid rgba(37,99,235,.10) !important;
}

@media (max-width: 1280px) {
  .md-kpi-card { grid-column: span 4 !important; }
  .md-pillar-tile { grid-column: span 6 !important; }
  .md-intel-strip { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
}
@media (max-width: 920px) {
  .md-kpi-card,
  .md-pillar-tile { grid-column: span 12 !important; }
  .md-intel-strip,
  .md-top-row,
  .md-bottom-grid { grid-template-columns: 1fr !important; }
}


/* === Level 2 management lens: status cards, not raw database dump === */
.md-level2-panel {
  background:
    radial-gradient(circle at top right, rgba(37, 99, 235, .06), transparent 30%),
    linear-gradient(180deg, #ffffff 0%, #f8fafc 100%) !important;
  border: 1px solid rgba(148, 163, 184, .18) !important;
  border-radius: 28px !important;
  box-shadow: 0 22px 46px rgba(15,23,42,.07) !important;
}

.md-level2-header h2 {
  font-size: clamp(30px, 3vw, 44px) !important;
  letter-spacing: -0.055em !important;
}

.md-level2-header p {
  max-width: 760px !important;
  color: #64748b !important;
}

.md-level2-insight {
  display: flex !important;
  align-items: flex-start !important;
  gap: 14px !important;
  margin: 0 0 18px !important;
  padding: 16px 18px !important;
  border-radius: 22px !important;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%) !important;
  color: #ffffff !important;
  box-shadow: 0 18px 34px rgba(15,23,42,.12) !important;
}

.md-level2-insight-icon {
  width: 38px !important;
  height: 38px !important;
  display: grid !important;
  place-items: center !important;
  border-radius: 14px !important;
  background: rgba(255,255,255,.10) !important;
  border: 1px solid rgba(255,255,255,.16) !important;
  flex: 0 0 auto !important;
}

.md-level2-insight strong {
  display: block !important;
  margin-bottom: 4px !important;
  font-size: 11px !important;
  text-transform: uppercase !important;
  letter-spacing: .1em !important;
  color: #bfdbfe !important;
}

.md-level2-insight p {
  margin: 0 !important;
  font-size: 14px !important;
  line-height: 1.55 !important;
  color: rgba(255,255,255,.86) !important;
}

.md-management-breakdown-grid {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  gap: 16px !important;
}

.md-management-breakdown-card {
  position: relative !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  gap: 14px !important;
  min-height: 246px !important;
  padding: 18px !important;
  border: 1px solid rgba(226,232,240,.95) !important;
  border-radius: 24px !important;
  background: #ffffff !important;
  text-align: left !important;
  box-shadow: 0 16px 34px rgba(15,23,42,.06) !important;
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, background 180ms ease !important;
}

.md-management-breakdown-card:hover {
  transform: translateY(-5px) scale(1.01) !important;
  z-index: 4 !important;
  border-color: rgba(37,99,235,.24) !important;
  box-shadow: 0 26px 52px rgba(15,23,42,.12) !important;
}

.md-management-breakdown-card.critical {
  background: linear-gradient(180deg, #ffffff 0%, #fff7f7 100%) !important;
  border-color: rgba(239,68,68,.20) !important;
}

.md-management-breakdown-card.watch {
  background: linear-gradient(180deg, #ffffff 0%, #fffbf2 100%) !important;
  border-color: rgba(245,158,11,.22) !important;
}

.md-management-breakdown-card.healthy {
  background: linear-gradient(180deg, #ffffff 0%, #f3fbf7 100%) !important;
  border-color: rgba(16,185,129,.18) !important;
}

.md-level2-card-top {
  display: flex !important;
  justify-content: space-between !important;
  align-items: flex-start !important;
  gap: 12px !important;
}

.md-level2-card-top strong {
  display: block !important;
  color: #0f172a !important;
  font-size: 19px !important;
  line-height: 1.15 !important;
  font-weight: 900 !important;
  letter-spacing: -0.035em !important;
}

.md-parent-path {
  display: block !important;
  max-width: 210px !important;
  margin-bottom: 6px !important;
  color: #94a3b8 !important;
  font-size: 10px !important;
  font-weight: 800 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.md-level2-status {
  padding: 6px 9px !important;
  border-radius: 999px !important;
  font-size: 10px !important;
  font-style: normal !important;
  font-weight: 900 !important;
  white-space: nowrap !important;
}

.md-level2-status.critical { color: #b91c1c !important; background: rgba(239,68,68,.10) !important; }
.md-level2-status.watch { color: #b45309 !important; background: rgba(245,158,11,.13) !important; }
.md-level2-status.healthy { color: #047857 !important; background: rgba(16,185,129,.13) !important; }

.md-level2-primary-metric {
  display: flex !important;
  align-items: flex-end !important;
  gap: 10px !important;
}

.md-level2-primary-metric strong {
  color: #0f172a !important;
  font-size: 44px !important;
  line-height: .88 !important;
  font-weight: 950 !important;
  letter-spacing: -0.065em !important;
}

.md-level2-primary-metric small {
  padding-bottom: 3px !important;
  color: #64748b !important;
  font-size: 11px !important;
  line-height: 1.2 !important;
  font-weight: 850 !important;
}

.md-level2-status-list {
  display: grid !important;
  gap: 8px !important;
  padding: 12px !important;
  border-radius: 18px !important;
  background: rgba(248,250,252,.86) !important;
  border: 1px solid rgba(226,232,240,.88) !important;
}

.md-level2-status-list span {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  color: #334155 !important;
  font-size: 12px !important;
  font-weight: 780 !important;
}

.md-level2-status-list .dot {
  width: 8px !important;
  height: 8px !important;
  border-radius: 999px !important;
  flex: 0 0 auto !important;
}

.md-level2-status-list .dot.healthy { background: #10b981 !important; }
.md-level2-status-list .dot.watch { background: #f59e0b !important; }
.md-level2-status-list .dot.critical { background: #ef4444 !important; }

.md-level2-segment {
  display: flex !important;
  gap: 5px !important;
  height: 9px !important;
  padding: 0 !important;
  background: transparent !important;
}

.md-level2-segment i {
  display: block !important;
  width: var(--w) !important;
  min-width: 10px !important;
  border-radius: 999px !important;
}

.md-level2-segment .healthy { background: linear-gradient(90deg, #34d399, #10b981) !important; }
.md-level2-segment .watch { background: linear-gradient(90deg, #fbbf24, #f59e0b) !important; }
.md-level2-segment .critical { background: linear-gradient(90deg, #fb7185, #ef4444) !important; }

.md-level2-action {
  display: inline-flex !important;
  align-items: center !important;
  gap: 7px !important;
  width: fit-content !important;
  margin-top: auto !important;
  color: #1d4ed8 !important;
  font-size: 12px !important;
  font-weight: 900 !important;
}

.md-level2-action .md-icon {
  width: 14px !important;
  height: 14px !important;
}

@media (max-width: 1280px) {
  .md-management-breakdown-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
}

@media (max-width: 760px) {
  .md-management-breakdown-grid { grid-template-columns: 1fr !important; }
}


/* === Board-first feedback patch: remove data repetition + clearer hierarchy === */
.md-story-banner h2 {
  max-width: 18ch !important;
}
.md-story-banner p {
  max-width: 62ch !important;
}

.md-context-label::after {
  content: " - no repeated board queue items";
  color: #94a3b8;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.md-chart-annotation line {
  stroke: rgba(15, 23, 42, 0.28);
  stroke-width: 1.4;
  stroke-dasharray: 4 4;
}
.md-chart-annotation rect {
  fill: rgba(15, 23, 42, 0.92);
  stroke: rgba(255,255,255,.16);
  filter: drop-shadow(0 16px 26px rgba(15,23,42,.22));
}
.md-chart-annotation text:first-of-type {
  fill: #cbd5e1;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.md-chart-annotation text:last-of-type {
  fill: #ffffff;
  font-size: 10px;
  font-weight: 850;
}

.md-pillar-tile {
  color: #0f172a !important;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%) !important;
  border: 1px solid rgba(148, 163, 184, .18) !important;
  box-shadow: 0 16px 34px rgba(15, 23, 42, .06) !important;
}
.md-pillar-tile::after { opacity: 0 !important; }
.md-pillar-tile h3,
.md-pillar-tile small,
.md-pillar-tile .md-tile-value,
.md-pillar-tile .md-tile-value strong,
.md-pillar-tile .md-tile-value em {
  color: inherit !important;
  text-shadow: none !important;
}
.md-pillar-tile small { color: #64748b !important; }
.md-pillar-tile .md-tile-icon {
  background: rgba(15, 23, 42, .04) !important;
  color: #475569 !important;
  border: 1px solid rgba(148, 163, 184, .18) !important;
}
.md-pillar-tile.tile-critical {
  background: linear-gradient(135deg, #fff7f7 0%, #fff1f2 100%) !important;
  border-color: rgba(225, 29, 72, .18) !important;
}
.md-pillar-tile.tile-critical .md-tile-value strong,
.md-pillar-tile.tile-critical .md-tile-icon { color: #be123c !important; }
.md-pillar-tile.tile-watch {
  background: linear-gradient(135deg, #ffffff 0%, #fff7ed 100%) !important;
  border-color: rgba(217, 119, 6, .18) !important;
}
.md-pillar-tile.tile-watch .md-tile-value strong,
.md-pillar-tile.tile-watch .md-tile-icon { color: #b45309 !important; }
.md-pillar-tile.tile-info {
  background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%) !important;
  border-color: rgba(37, 99, 235, .16) !important;
}
.md-pillar-tile.tile-info .md-tile-value strong,
.md-pillar-tile.tile-info .md-tile-icon { color: #1d4ed8 !important; }
.md-pillar-tile.tile-success {
  background: linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%) !important;
  border-color: rgba(16, 185, 129, .18) !important;
}
.md-pillar-tile.tile-success .md-tile-value strong,
.md-pillar-tile.tile-success .md-tile-icon { color: #047857 !important; }
.md-pillar-tile.tile-neutral {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%) !important;
  border-color: rgba(148, 163, 184, .20) !important;
}
.md-pillar-tile.tile-neutral .md-tile-value strong { color: #334155 !important; }

.md-board-brief-card {
  border-color: rgba(30, 64, 175, .14) !important;
}
.md-board-brief-stack {
  display: grid;
  gap: 12px;
}
.md-board-brief-row {
  width: 100%;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  padding: 14px 14px;
  border: 1px solid rgba(226,232,240,.92);
  border-radius: 18px;
  background: #ffffff;
  text-align: left;
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}
.md-board-brief-row:hover {
  transform: translateY(-2px);
  border-color: rgba(37, 99, 235, .22);
  box-shadow: 0 14px 28px rgba(15,23,42,.08);
}
.md-board-brief-index {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  color: #475569;
  background: #f1f5f9;
  font-size: 10px;
  font-weight: 950;
}
.md-board-brief-row strong {
  display: block;
  color: #0f172a;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: -0.015em;
}
.md-board-brief-row small {
  display: block;
  margin-top: 5px;
  color: #64748b;
  font-size: 11px;
  line-height: 1.45;
  font-weight: 760;
}
.md-board-brief-row.tone-red .md-board-brief-index { color: #be123c; background: #fff1f2; }
.md-board-brief-row.tone-amber .md-board-brief-index { color: #b45309; background: #fffbeb; }
.md-board-brief-row.tone-green .md-board-brief-index { color: #047857; background: #ecfdf5; }
.md-board-brief-row.tone-blue .md-board-brief-index { color: #1d4ed8; background: #eff6ff; }
.md-board-brief-row.tone-purple .md-board-brief-index { color: #6d28d9; background: #f5f3ff; }

.md-action-card .md-table tbody td,
.md-action-card .md-table tbody tr:nth-child(odd) td {
  background: #ffffff !important;
}
.md-action-card .md-table tbody tr:hover td {
  background: #f8fafc !important;
}


/* === Board readiness polish: remove duplicate pills, fix clipping, wrap important text === */
.management-center-page,
.management-module-root,
.md-content,
.md-dashboard-view {
  overflow: visible !important;
}

.management-module-root {
  padding-top: 18px !important;
}

.md-content {
  padding-top: 10px !important;
}

.md-dashboard-view {
  padding-top: 8px !important;
  gap: 24px !important;
}

.md-story-banner {
  margin-top: 8px !important;
  overflow: visible !important;
}

.md-story-main,
.md-story-main > div {
  min-width: 0 !important;
}

.md-story-banner h2 {
  max-width: 18ch !important;
}

.md-story-banner p {
  max-width: 68ch !important;
  display: block !important;
}

.md-story-signals {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
  overflow: visible !important;
  max-height: none !important;
}

.md-story-signals span {
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: clip !important;
  max-width: 280px !important;
  line-height: 1.35 !important;
  padding-top: 7px !important;
  padding-bottom: 7px !important;
}

.md-intel-strip {
  display: none !important;
}

.md-kpi-grid {
  margin-top: 2px !important;
  margin-bottom: 4px !important;
}

.md-top-row,
.md-pillar-grid,
.md-bottom-grid {
  margin-top: 2px !important;
}

.md-card-head,
.md-action-header {
  gap: 16px !important;
}

.md-chart-layout-contextual {
  grid-template-columns: minmax(320px, .92fr) minmax(0, 1.58fr) !important;
  gap: 22px !important;
}

.md-chart-context-panel {
  min-width: 0 !important;
}

.md-context-stack {
  gap: 12px !important;
}

.md-context-row {
  min-height: 72px !important;
  align-items: flex-start !important;
  gap: 12px !important;
  overflow: visible !important;
}

.md-context-row > span:not(.md-context-icon),
.md-board-brief-row > span:not(.md-board-brief-index),
.md-signal-copy {
  min-width: 0 !important;
  overflow: visible !important;
}

.md-context-row strong,
.md-context-row small,
.md-board-brief-row strong,
.md-board-brief-row small,
.md-signal-copy strong,
.md-signal-copy span {
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: clip !important;
  display: block !important;
  -webkit-line-clamp: unset !important;
  line-clamp: unset !important;
}

.md-context-row strong {
  line-height: 1.2 !important;
}

.md-context-row small {
  margin-top: 3px !important;
  line-height: 1.35 !important;
}

.md-context-row em {
  white-space: nowrap !important;
  flex: 0 0 auto !important;
  margin-left: auto !important;
}

.md-board-brief-card .md-card-head p {
  max-width: 52ch !important;
}

.md-board-brief-row {
  min-height: 78px !important;
  align-items: flex-start !important;
  padding: 16px !important;
}

.md-board-brief-row small {
  margin-top: 5px !important;
  line-height: 1.45 !important;
}

.md-finance-strip {
  display: none !important;
}

.md-chart-card {
  padding-bottom: 22px !important;
}

.md-area-chart-panel {
  min-height: 360px !important;
}

@media (max-width: 1180px) {
  .md-chart-layout-contextual {
    grid-template-columns: 1fr !important;
  }
  .md-story-signals span {
    max-width: 100% !important;
  }
}


/* === Chart narrative fix: combo chart for Board clarity === */
.md-chart-legend {
  flex-wrap: wrap !important;
  row-gap: 8px !important;
}
.md-line-sample {
  display: inline-block !important;
  width: 22px !important;
  height: 0 !important;
  border-top: 2px dashed rgba(100,116,139,.74) !important;
}
.md-chart-area-finance,
.md-chart-area-risk,
.md-chart-line-finance,
.md-chart-line-risk,
.md-chart-point-finance,
.md-chart-point-risk {
  display: none !important;
}
.md-chart-bar-signals {
  fill: url(#mdSignalBarGradient) !important;
  opacity: .92 !important;
  filter: drop-shadow(0 8px 12px rgba(37, 99, 235, 0.12));
  transition: opacity .16s ease, transform .16s ease;
}
.md-chart-area-exposure {
  fill: url(#mdExposureAreaGradient) !important;
}
.md-chart-line-exposure {
  fill: none !important;
  stroke: url(#mdExposureLineGradient) !important;
  stroke-width: 4.5 !important;
  stroke-linecap: round !important;
  stroke-linejoin: round !important;
  filter: drop-shadow(0 10px 16px rgba(190,18,60,.18));
}
.md-chart-point-exposure {
  fill: #be123c !important;
  stroke: #ffffff !important;
  stroke-width: 3 !important;
  transition: r .16s ease, filter .16s ease !important;
}
.md-chart-hover-band:hover + .md-chart-point-exposure,
.md-chart-point-exposure:hover {
  filter: drop-shadow(0 7px 12px rgba(15, 23, 42, .20)) !important;
}
.md-risk-appetite-line {
  stroke: rgba(100,116,139,.72) !important;
  stroke-width: 1.5 !important;
  stroke-dasharray: 7 7 !important;
}
.md-risk-appetite-label {
  fill: #64748b !important;
  font-size: 10px !important;
  font-weight: 900 !important;
  letter-spacing: .02em !important;
}
.md-chart-context-title {
  color: #475569 !important;
}


/* === Scroll recovery fix ===
   Keep outer app shell locked, but make this dashboard page the scroll container.
   Previous polish made .management-center-page overflow: visible, so content became clipped by the app shell. */
body.md-dashboard-page-active .ema-main,
body.md-dashboard-page-active .ema-content,
body.md-dashboard-page-active .ema-content-area,
body.md-dashboard-page-active .app-main,
body.md-dashboard-page-active .app-content,
body.md-dashboard-page-active .layout-main,
body.md-dashboard-page-active .layout-content,
body.md-dashboard-page-active .main,
body.md-dashboard-page-active .main-content,
body.md-dashboard-page-active main {
  min-height: 0 !important;
  overflow: hidden !important;
}

.management-center-page {
  height: 100% !important;
  min-height: 0 !important;
  max-height: 100% !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  overscroll-behavior: contain !important;
  scrollbar-gutter: stable !important;
  -webkit-overflow-scrolling: touch !important;
  padding-bottom: 34px !important;
}

.management-module-root,
.md-content,
.md-dashboard-view {
  height: auto !important;
  min-height: max-content !important;
  max-height: none !important;
  overflow: visible !important;
}

.md-dashboard-view {
  padding-bottom: 34px !important;
}


/* =========================================================
   C-Level / Board Executive Dashboard Design System
   - Bento grid layout
   - restricted executive palette
   - no redundant middle finance strip
   - combo chart as hero widget
   - all cards preserve click/drilldown function
========================================================= */
.management-center-page {
  height: calc(100vh - var(--topbar-height, 0px)) !important;
  min-height: 0 !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  overscroll-behavior: contain !important;
  background:
    radial-gradient(circle at 96% 2%, rgba(37, 99, 235, .08), transparent 30rem),
    radial-gradient(circle at 12% 0%, rgba(15, 23, 42, .045), transparent 28rem),
    linear-gradient(180deg, #f8fafc 0%, #f3f6fb 100%) !important;
}
.management-module-root,
.md-content {
  min-height: 0 !important;
  overflow: visible !important;
}
.md-content {
  padding-top: 18px !important;
  padding-bottom: 48px !important;
}
.md-dashboard-view {
  max-width: 1500px !important;
  margin: 0 auto !important;
  display: grid !important;
  gap: 20px !important;
}

/* Hero executive story */
.md-story-banner {
  min-height: 190px !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1.45fr) minmax(300px, .72fr) !important;
  align-items: stretch !important;
  padding: 26px !important;
  border-radius: 30px !important;
  border: 1px solid rgba(15, 23, 42, .08) !important;
  background:
    radial-gradient(circle at 90% 12%, rgba(56, 189, 248, .18), transparent 20rem),
    linear-gradient(135deg, #0f1f3a 0%, #142b4c 46%, #172033 100%) !important;
  box-shadow: 0 26px 60px rgba(15, 23, 42, .13) !important;
  overflow: hidden !important;
}
.md-story-banner::before,
.md-story-banner::after { display: none !important; }
.md-story-main { gap: 20px !important; align-items: flex-start !important; }
.md-story-icon {
  flex: 0 0 auto !important;
  width: 50px !important;
  height: 50px !important;
  border-radius: 18px !important;
  color: #dbeafe !important;
  background: rgba(255,255,255,.10) !important;
  border: 1px solid rgba(255,255,255,.16) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.12) !important;
}
.md-story-status {
  width: fit-content !important;
  max-width: 100% !important;
  padding: 7px 11px !important;
  border-radius: 999px !important;
  background: rgba(244, 63, 94, .14) !important;
  border: 1px solid rgba(244, 63, 94, .18) !important;
  color: #ffe4e6 !important;
  font-size: 10px !important;
  letter-spacing: .08em !important;
}
.md-story-banner h2 {
  max-width: 17ch !important;
  margin-top: 12px !important;
  font-size: clamp(30px, 3.1vw, 50px) !important;
  line-height: 1.02 !important;
  letter-spacing: -.055em !important;
  font-weight: 820 !important;
  color: #ffffff !important;
}
.md-story-banner p {
  max-width: 72ch !important;
  margin-top: 14px !important;
  color: rgba(255,255,255,.82) !important;
  font-size: 14px !important;
  line-height: 1.62 !important;
}
.md-story-signals {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
  margin-top: 16px !important;
}
.md-story-signals span {
  max-width: none !important;
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: clip !important;
  line-height: 1.3 !important;
  color: rgba(255,255,255,.84) !important;
  background: rgba(255,255,255,.09) !important;
  border: 1px solid rgba(255,255,255,.13) !important;
}
.md-story-recommendation {
  min-height: 100% !important;
  padding: 20px !important;
  border-radius: 24px !important;
  background: rgba(255,255,255,.09) !important;
  border: 1px solid rgba(255,255,255,.13) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.08) !important;
}
.md-story-recommendation > span {
  color: #bfdbfe !important;
  font-size: 10px !important;
  letter-spacing: .09em !important;
}
.md-story-recommendation strong {
  color: #ffffff !important;
  line-height: 1.38 !important;
  font-size: 16px !important;
}
.md-story-actions li {
  color: rgba(255,255,255,.78) !important;
  line-height: 1.45 !important;
}
.md-story-source { color: rgba(255,255,255,.62) !important; }

/* KPI strip: executive, not rainbow */
.md-kpi-grid {
  display: grid !important;
  grid-template-columns: repeat(12, minmax(0, 1fr)) !important;
  gap: 14px !important;
}
.md-kpi-card {
  grid-column: span 2 !important;
  min-height: 118px !important;
  padding: 18px !important;
  border-radius: 24px !important;
  border: 1px solid rgba(148, 163, 184, .18) !important;
  background: linear-gradient(180deg, rgba(255,255,255,.99), rgba(248,250,252,.96)) !important;
  color: #0f172a !important;
  box-shadow: 0 16px 34px rgba(15, 23, 42, .065) !important;
}
.md-kpi-card::before { display: none !important; }
.md-kpi-card h3 {
  color: #64748b !important;
  font-size: 10px !important;
  font-weight: 900 !important;
  letter-spacing: .08em !important;
  text-transform: uppercase !important;
}
.md-kpi-card .md-kpi-value strong {
  color: #0f172a !important;
  font-size: 28px !important;
  line-height: 1 !important;
  letter-spacing: -.055em !important;
}
.md-kpi-card .md-kpi-value span,
.md-kpi-card p { color: #64748b !important; }
.md-kpi-card .md-kpi-icon {
  background: #ffffff !important;
  color: #2563eb !important;
  border: 1px solid rgba(226,232,240,.92) !important;
  box-shadow: 0 10px 20px rgba(15, 23, 42, .08) !important;
}
.md-kpi-card.kpi-health,
.md-kpi-card.kpi-risk {
  background: linear-gradient(135deg, #be123c 0%, #7f1d1d 100%) !important;
  border-color: rgba(190, 18, 60, .28) !important;
  color: #ffffff !important;
}
.md-kpi-card.kpi-health h3,
.md-kpi-card.kpi-risk h3,
.md-kpi-card.kpi-health p,
.md-kpi-card.kpi-risk p,
.md-kpi-card.kpi-health .md-kpi-value span,
.md-kpi-card.kpi-risk .md-kpi-value span,
.md-kpi-card.kpi-health .md-kpi-value strong,
.md-kpi-card.kpi-risk .md-kpi-value strong { color: rgba(255,255,255,.94) !important; }
.md-kpi-card.kpi-financial .md-kpi-value strong { color: #1d4ed8 !important; }
.md-kpi-card.kpi-savings .md-kpi-value strong { color: #059669 !important; }
.md-kpi-card.kpi-compliance .md-kpi-value strong { color: #334155 !important; }
.md-kpi-card.kpi-board .md-kpi-value strong { color: #4338ca !important; }
.md-kpi-trend {
  margin-top: 8px !important;
  padding: 5px 9px !important;
  border-radius: 999px !important;
  width: fit-content !important;
  max-width: 100% !important;
  white-space: normal !important;
  line-height: 1.2 !important;
  font-size: 9px !important;
  font-weight: 850 !important;
}

/* Bento grid main section */
.md-top-row {
  display: grid !important;
  grid-template-columns: minmax(0, 1.75fr) minmax(330px, .78fr) !important;
  gap: 18px !important;
  align-items: stretch !important;
}
.md-chart-card,
.md-donut-card,
.md-board-brief-card,
.md-action-card {
  border-radius: 28px !important;
  border: 1px solid rgba(148,163,184,.17) !important;
  background: linear-gradient(180deg, rgba(255,255,255,.99), rgba(248,250,252,.98)) !important;
  box-shadow: 0 18px 42px rgba(15, 23, 42, .075) !important;
  overflow: visible !important;
}
.md-chart-card::before,
.md-chart-card::after,
.md-donut-card::before,
.md-board-brief-card::before,
.md-action-card::before { display: none !important; }
.md-card-head,
.md-action-header { margin-bottom: 18px !important; }
.md-eyebrow {
  color: #94a3b8 !important;
  letter-spacing: .1em !important;
  font-size: 10px !important;
}
.md-card-head h2,
.md-section-title {
  color: #0f172a !important;
  font-size: clamp(24px, 2vw, 34px) !important;
  letter-spacing: -.05em !important;
  font-weight: 820 !important;
}
.md-card-head p,
.md-section-subtitle {
  color: #64748b !important;
  line-height: 1.58 !important;
  font-size: 13px !important;
}
.md-chart-layout-contextual {
  display: grid !important;
  grid-template-columns: minmax(275px, .78fr) minmax(0, 1.45fr) !important;
  gap: 18px !important;
}
.md-chart-context-panel,
.md-area-chart-panel {
  padding: 20px !important;
  border-radius: 24px !important;
  background: #ffffff !important;
  border: 1px solid rgba(226, 232, 240, .92) !important;
}
.md-context-label,
.md-chart-context-title {
  color: #64748b !important;
  text-transform: uppercase !important;
  letter-spacing: .09em !important;
  font-size: 10px !important;
  font-weight: 900 !important;
}
.md-chart-context-panel h3 {
  color: #0f172a !important;
  font-size: 20px !important;
  letter-spacing: -.035em !important;
  margin-bottom: 14px !important;
}
.md-context-stack { gap: 10px !important; }
.md-context-row {
  align-items: flex-start !important;
  gap: 12px !important;
  min-height: 72px !important;
  padding: 13px !important;
  border-radius: 18px !important;
  background: #f8fafc !important;
  border: 1px solid rgba(226,232,240,.88) !important;
}
.md-context-row span:not(.md-context-icon) {
  min-width: 0 !important;
}
.md-context-row strong,
.md-context-row small {
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: clip !important;
  word-break: normal !important;
}
.md-context-row strong { color: #0f172a !important; font-size: 12px !important; line-height: 1.25 !important; }
.md-context-row small { color: #64748b !important; font-size: 11px !important; line-height: 1.35 !important; }
.md-context-row em { color: #0f172a !important; font-size: 12px !important; }
.md-context-icon {
  flex: 0 0 auto !important;
  width: 36px !important;
  height: 36px !important;
  border-radius: 14px !important;
}
.md-summary-btn {
  min-height: 42px !important;
  border-radius: 16px !important;
  background: #0f172a !important;
  color: #ffffff !important;
}
.md-chart-headline-row { align-items: flex-start !important; gap: 12px !important; }
.md-chart-headline-row strong { font-size: 34px !important; color: #0f172a !important; }
.md-chart-headline-row > span {
  padding: 7px 10px !important;
  border-radius: 999px !important;
  background: #f8fafc !important;
  border: 1px solid rgba(226,232,240,.9) !important;
  color: #475569 !important;
  font-size: 10px !important;
  white-space: nowrap !important;
}
.md-chart-svg { min-height: 268px !important; height: 268px !important; }
.md-chart-grid { stroke: rgba(203, 213, 225, .62) !important; stroke-dasharray: 4 8 !important; }
.md-chart-axis { stroke: rgba(148, 163, 184, .42) !important; }
.md-chart-signal-bar { rx: 9 !important; }
.md-risk-appetite-line { stroke: #0f172a !important; stroke-dasharray: 7 8 !important; opacity: .42 !important; }
.md-chart-annotation rect,
.md-chart-tooltip-box {
  fill: rgba(15, 23, 42, .92) !important;
  filter: drop-shadow(0 16px 24px rgba(15,23,42,.20)) !important;
}
.md-chart-annotation text,
.md-chart-tooltip-title,
.md-chart-tooltip-text { fill: #ffffff !important; }
.md-finance-strip { display: none !important; }

/* Supporting governance widgets */
.md-donut-card { padding-bottom: 18px !important; }
.md-donut-shell { gap: 16px !important; }
.md-mix-row { grid-template-columns: 1fr !important; gap: 10px !important; }
.md-mix-item {
  min-height: 58px !important;
  padding: 12px 14px !important;
  border-radius: 18px !important;
  background: #ffffff !important;
  border: 1px solid rgba(226,232,240,.9) !important;
}
.md-mix-item strong { color: #0f172a !important; }
.md-mix-item span { color: #64748b !important; }

/* Middle pillar cards are now neutral executive summary cards */
.md-pillar-grid {
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 16px !important;
}
.md-pillar-tile {
  min-height: 132px !important;
  padding: 20px !important;
  border-radius: 26px !important;
  background: #ffffff !important;
  border: 1px solid rgba(148,163,184,.18) !important;
  box-shadow: 0 16px 36px rgba(15, 23, 42, .06) !important;
  color: #0f172a !important;
}
.md-pillar-tile::after { display: none !important; }
.md-pillar-tile h3 { color: #64748b !important; font-size: 11px !important; letter-spacing: .08em !important; text-transform: uppercase !important; }
.md-tile-value strong { color: #0f172a !important; font-size: 28px !important; }
.md-pillar-tile small { color: #64748b !important; line-height: 1.45 !important; }
.md-pillar-tile .md-tile-icon {
  background: #f8fafc !important;
  color: #2563eb !important;
  border: 1px solid rgba(226,232,240,.88) !important;
}
.md-pillar-tile.tile-risk,
.md-pillar-tile.tile-critical {
  background: linear-gradient(135deg, #fff 0%, #fff1f2 100%) !important;
  border-color: rgba(225, 29, 72, .18) !important;
}
.md-pillar-tile.tile-risk .md-tile-value strong,
.md-pillar-tile.tile-critical .md-tile-value strong,
.md-pillar-tile.tile-risk .md-tile-icon,
.md-pillar-tile.tile-critical .md-tile-icon { color: #be123c !important; }
.md-pillar-tile.tile-saving .md-tile-value strong,
.md-pillar-tile.tile-saving .md-tile-icon { color: #059669 !important; }

/* Executive insights and decision queue */
.md-bottom-grid {
  display: grid !important;
  grid-template-columns: minmax(360px, .92fr) minmax(0, 2fr) !important;
  gap: 18px !important;
  align-items: stretch !important;
}
.md-board-brief-stack { display: grid !important; gap: 12px !important; }
.md-board-brief-row {
  min-height: 78px !important;
  padding: 14px !important;
  border-radius: 20px !important;
  display: grid !important;
  grid-template-columns: 40px 1fr !important;
  gap: 12px !important;
  text-align: left !important;
  background: #ffffff !important;
  border: 1px solid rgba(226,232,240,.92) !important;
}
.md-board-brief-index {
  width: 34px !important;
  height: 34px !important;
  border-radius: 12px !important;
  display: inline-grid !important;
  place-items: center !important;
  background: #f1f5f9 !important;
  color: #475569 !important;
  font-size: 11px !important;
  font-weight: 900 !important;
}
.md-board-brief-row strong { color: #0f172a !important; font-size: 13px !important; line-height: 1.3 !important; }
.md-board-brief-row small { color: #64748b !important; line-height: 1.45 !important; font-size: 11.5px !important; }
.md-board-brief-row.tone-red .md-board-brief-index { color: #be123c !important; background: #fff1f2 !important; }
.md-board-brief-row.tone-green .md-board-brief-index { color: #059669 !important; background: #ecfdf5 !important; }
.md-board-brief-row.tone-blue .md-board-brief-index { color: #1d4ed8 !important; background: #eff6ff !important; }

.md-table-wrap { overflow-x: auto !important; }
.md-table {
  width: 100% !important;
  border-collapse: separate !important;
  border-spacing: 0 10px !important;
  table-layout: fixed !important;
}
.md-table thead th {
  padding: 0 12px 6px !important;
  border-bottom: 0 !important;
  color: #94a3b8 !important;
  font-size: 10px !important;
  font-weight: 900 !important;
  text-transform: uppercase !important;
  letter-spacing: .08em !important;
}
.md-table tbody td {
  border: 0 !important;
  padding: 15px 12px !important;
  background: #f8fafc !important;
  color: #0f172a !important;
  font-size: 12px !important;
  font-weight: 730 !important;
  line-height: 1.42 !important;
}
.md-table tbody tr td:first-child { border-radius: 17px 0 0 17px !important; }
.md-table tbody tr td:last-child { border-radius: 0 17px 17px 0 !important; }
.md-table tbody tr:hover td { background: #eff6ff !important; }
.md-priority,
.md-status-pill {
  border-radius: 999px !important;
  padding: 6px 9px !important;
  font-size: 10px !important;
  font-weight: 900 !important;
  border: 1px solid transparent !important;
  background: transparent !important;
}
.md-priority.high { color: #be123c !important; background: rgba(225,29,72,.08) !important; border-color: rgba(225,29,72,.16) !important; }
.md-priority.medium { color: #b45309 !important; background: rgba(245,158,11,.10) !important; border-color: rgba(245,158,11,.18) !important; }
.md-priority.low { color: #047857 !important; background: rgba(16,185,129,.10) !important; border-color: rgba(16,185,129,.18) !important; }
.md-status-pill { color: #92400e !important; background: rgba(245,158,11,.10) !important; border-color: rgba(245,158,11,.16) !important; }

/* Buttons */
.md-action-btn {
  border-radius: 14px !important;
  border-color: rgba(226,232,240,.95) !important;
  background: #ffffff !important;
  color: #334155 !important;
}
.md-action-btn.primary {
  background: #0f172a !important;
  color: #ffffff !important;
  border-color: #0f172a !important;
}

@media (max-width: 1360px) {
  .md-kpi-card { grid-column: span 4 !important; }
  .md-pillar-grid { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
}
@media (max-width: 1120px) {
  .md-story-banner,
  .md-top-row,
  .md-bottom-grid,
  .md-chart-layout-contextual { grid-template-columns: 1fr !important; }
  .md-kpi-card { grid-column: span 6 !important; }
}
@media (max-width: 720px) {
  .md-content { padding: 14px !important; }
  .md-story-banner { padding: 20px !important; }
  .md-kpi-card { grid-column: span 12 !important; }
  .md-pillar-grid { grid-template-columns: 1fr !important; }
  .md-card-head,
  .md-action-header { flex-direction: column !important; align-items: flex-start !important; }
}


/* =========================================================
   Full Boardroom Executive Rebuild
   Real structure change: hero briefing, KPI rail, bento widgets,
   combo chart, risk drivers, management briefing, decision queue.
========================================================= */
.md-boardroom-view {
  display: grid !important;
  gap: 22px !important;
  padding: 18px 18px 34px !important;
  min-height: 100% !important;
}

.md-boardroom-hero {
  display: grid !important;
  grid-template-columns: minmax(0, 1.65fr) minmax(320px, .8fr) !important;
  gap: 18px !important;
  align-items: stretch !important;
}

.md-boardroom-briefing,
.md-boardroom-recommendation,
.md-board-widget,
.md-board-metric-card {
  border: 1px solid rgba(148, 163, 184, .18) !important;
  border-radius: 28px !important;
  background: rgba(255,255,255,.94) !important;
  box-shadow: 0 20px 45px rgba(15, 23, 42, .065) !important;
}

.md-boardroom-briefing {
  position: relative !important;
  overflow: hidden !important;
  min-height: 260px !important;
  padding: 30px !important;
  background:
    radial-gradient(circle at 86% 10%, rgba(59,130,246,.18), transparent 32%),
    linear-gradient(135deg, #0f1f3d 0%, #13294d 52%, #0f3b49 100%) !important;
  color: #fff !important;
}
.md-boardroom-briefing::after {
  content: "" !important;
  position: absolute !important;
  inset: auto -80px -120px auto !important;
  width: 320px !important;
  height: 320px !important;
  border-radius: 999px !important;
  background: rgba(255,255,255,.08) !important;
}
.md-boardroom-brief-head,
.md-boardroom-brief-actions,
.md-board-widget-head,
.md-board-chart-legend {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 12px !important;
  flex-wrap: wrap !important;
}
.md-boardroom-ai-badge,
.md-boardroom-status {
  display: inline-flex !important;
  align-items: center !important;
  gap: 8px !important;
  border-radius: 999px !important;
  padding: 7px 10px !important;
  font-size: 10px !important;
  line-height: 1 !important;
  font-weight: 900 !important;
  letter-spacing: .06em !important;
  text-transform: uppercase !important;
}
.md-boardroom-ai-badge {
  color: rgba(255,255,255,.86) !important;
  background: rgba(255,255,255,.09) !important;
  border: 1px solid rgba(255,255,255,.13) !important;
}
.md-boardroom-status {
  color: #fecdd3 !important;
  background: rgba(225,29,72,.18) !important;
  border: 1px solid rgba(225,29,72,.28) !important;
}
.md-boardroom-briefing h1 {
  max-width: 790px !important;
  margin: 26px 0 14px !important;
  color: #fff !important;
  font-family: var(--md-display-font) !important;
  font-size: clamp(34px, 4vw, 58px) !important;
  line-height: .98 !important;
  letter-spacing: -.055em !important;
  font-weight: 900 !important;
}
.md-boardroom-briefing p {
  max-width: 820px !important;
  margin: 0 0 22px !important;
  color: rgba(255,255,255,.78) !important;
  font-size: 14px !important;
  line-height: 1.65 !important;
  font-weight: 650 !important;
}
.md-boardroom-briefing .md-action-btn {
  background: rgba(255,255,255,.10) !important;
  border-color: rgba(255,255,255,.15) !important;
  color: #fff !important;
}
.md-boardroom-briefing .md-action-btn.primary {
  background: #fff !important;
  color: #0f172a !important;
}

.md-boardroom-recommendation {
  padding: 24px !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: space-between !important;
  gap: 18px !important;
}
.md-boardroom-recommendation > span,
.md-board-widget .md-eyebrow {
  color: #94a3b8 !important;
  font-size: 10px !important;
  font-weight: 950 !important;
  letter-spacing: .09em !important;
  text-transform: uppercase !important;
}
.md-boardroom-recommendation strong {
  color: #0f172a !important;
  font-size: 21px !important;
  line-height: 1.2 !important;
  letter-spacing: -.035em !important;
}
.md-boardroom-recommendation ul {
  margin: 0 !important;
  padding: 0 !important;
  list-style: none !important;
  display: grid !important;
  gap: 10px !important;
}
.md-boardroom-recommendation li {
  color: #475569 !important;
  font-size: 12px !important;
  line-height: 1.45 !important;
  font-weight: 700 !important;
  padding-left: 15px !important;
  position: relative !important;
}
.md-boardroom-recommendation li::before {
  content: "" !important;
  position: absolute !important;
  left: 0 !important;
  top: .55em !important;
  width: 6px !important;
  height: 6px !important;
  border-radius: 999px !important;
  background: #e11d48 !important;
}

.md-boardroom-metrics {
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 16px !important;
}
.md-board-metric-card {
  min-height: 142px !important;
  padding: 18px !important;
  display: grid !important;
  grid-template-columns: 42px minmax(0, 1fr) !important;
  gap: 14px !important;
  text-align: left !important;
  cursor: pointer !important;
}
.md-board-metric-card.is-critical {
  border-color: rgba(225,29,72,.18) !important;
  background: linear-gradient(180deg, #fff 0%, #fff5f6 100%) !important;
}
.md-board-metric-icon {
  display: inline-grid !important;
  place-items: center !important;
  width: 42px !important;
  height: 42px !important;
  border-radius: 16px !important;
  background: #f1f5f9 !important;
  color: #1d4ed8 !important;
}
.md-board-metric-card.is-critical .md-board-metric-icon { color: #be123c !important; background: #fff1f2 !important; }
.md-board-metric-copy {
  display: flex !important;
  flex-direction: column !important;
  min-width: 0 !important;
}
.md-board-metric-copy small {
  color: #64748b !important;
  font-size: 10px !important;
  font-weight: 950 !important;
  letter-spacing: .07em !important;
  text-transform: uppercase !important;
  white-space: normal !important;
}
.md-board-metric-copy strong {
  color: #0f172a !important;
  font-size: 30px !important;
  line-height: 1.05 !important;
  letter-spacing: -.055em !important;
  margin-top: 8px !important;
}
.md-board-metric-copy em {
  color: #64748b !important;
  font-size: 11px !important;
  font-style: normal !important;
  font-weight: 800 !important;
}
.md-board-metric-copy .md-kpi-trend {
  margin-top: 12px !important;
}

.md-boardroom-bento {
  display: grid !important;
  grid-template-columns: minmax(0, 1.45fr) minmax(300px, .75fr) minmax(300px, .75fr) !important;
  grid-auto-rows: minmax(180px, auto) !important;
  gap: 18px !important;
  align-items: stretch !important;
}
.md-board-widget {
  padding: 22px !important;
  overflow: hidden !important;
}
.md-board-chart-widget {
  grid-column: span 2 !important;
  min-height: 520px !important;
}
.md-board-drivers-widget,
.md-board-health-widget { min-height: 520px !important; }
.md-board-insights-widget { grid-column: span 1 !important; }
.md-board-decisions-widget { grid-column: span 2 !important; }
.md-board-widget-head h2,
.md-board-widget h2 {
  margin: 3px 0 0 !important;
  color: #0f172a !important;
  font-size: 27px !important;
  line-height: 1.1 !important;
  letter-spacing: -.045em !important;
  font-weight: 920 !important;
}
.md-board-widget-head p {
  margin: 7px 0 0 !important;
  color: #64748b !important;
  font-size: 12px !important;
  line-height: 1.5 !important;
  font-weight: 650 !important;
}
.md-board-widget-head.compact { align-items: flex-start !important; }
.md-board-chart-value {
  display: grid !important;
  justify-items: end !important;
}
.md-board-chart-value span {
  color: #94a3b8 !important;
  font-size: 10px !important;
  text-transform: uppercase !important;
  letter-spacing: .08em !important;
  font-weight: 950 !important;
}
.md-board-chart-value strong {
  color: #0f172a !important;
  font-size: 30px !important;
  line-height: 1 !important;
  letter-spacing: -.05em !important;
}
.md-board-chart-legend {
  justify-content: flex-start !important;
  margin: 14px 0 8px !important;
}
.md-board-chart-legend span {
  display: inline-flex !important;
  align-items: center !important;
  gap: 7px !important;
  color: #64748b !important;
  font-size: 11px !important;
  font-weight: 850 !important;
}
.md-board-chart-svg {
  display: block !important;
  width: 100% !important;
  height: 330px !important;
  overflow: visible !important;
}
.md-board-exposure-area { fill: url(#mdBoardExposureArea) !important; }
.md-board-exposure-line {
  fill: none !important;
  stroke: url(#mdBoardExposureLine) !important;
  stroke-width: 4 !important;
  stroke-linecap: round !important;
  stroke-linejoin: round !important;
}

.md-board-driver-list,
.md-board-brief-stack,
.md-board-decision-list,
.md-board-health-stats {
  display: grid !important;
  gap: 12px !important;
  margin-top: 18px !important;
}
.md-board-driver-row,
.md-board-brief-row,
.md-board-decision-row,
.md-board-health-stats button {
  width: 100% !important;
  border: 1px solid rgba(226,232,240,.9) !important;
  border-radius: 18px !important;
  background: #fff !important;
  text-align: left !important;
  cursor: pointer !important;
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease !important;
}
.md-board-driver-row:hover,
.md-board-brief-row:hover,
.md-board-decision-row:hover,
.md-board-health-stats button:hover,
.md-board-metric-card:hover {
  transform: translateY(-4px) !important;
  box-shadow: 0 20px 38px rgba(15,23,42,.10) !important;
  border-color: rgba(37,99,235,.22) !important;
}
.md-board-driver-row {
  display: grid !important;
  grid-template-columns: 34px minmax(0,1fr) auto !important;
  gap: 12px !important;
  align-items: center !important;
  padding: 14px !important;
}
.md-board-driver-index {
  width: 34px !important;
  height: 34px !important;
  border-radius: 13px !important;
  display: grid !important;
  place-items: center !important;
  background: #f1f5f9 !important;
  color: #0f172a !important;
  font-size: 12px !important;
  font-weight: 950 !important;
}
.md-board-driver-row strong,
.md-board-brief-row strong,
.md-board-decision-row strong {
  display: block !important;
  color: #0f172a !important;
  font-size: 13px !important;
  line-height: 1.3 !important;
  font-weight: 900 !important;
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: clip !important;
}
.md-board-driver-row small,
.md-board-brief-row small,
.md-board-decision-row small {
  display: block !important;
  margin-top: 4px !important;
  color: #64748b !important;
  font-size: 11px !important;
  line-height: 1.4 !important;
  font-weight: 700 !important;
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: clip !important;
}
.md-board-driver-row em {
  color: #0f172a !important;
  font-style: normal !important;
  font-size: 12px !important;
  font-weight: 950 !important;
}

.md-board-health-ring {
  display: grid !important;
  place-items: center !important;
  width: 100% !important;
  margin-top: 16px !important;
  border: 0 !important;
  background: transparent !important;
  position: relative !important;
  cursor: pointer !important;
}
.md-board-health-ring svg {
  width: 220px !important;
  height: 220px !important;
}
.md-board-health-ring > span {
  position: absolute !important;
  display: grid !important;
  place-items: center !important;
}
.md-board-health-ring strong {
  color: #0f172a !important;
  font-size: 40px !important;
  letter-spacing: -.06em !important;
}
.md-board-health-ring small {
  color: #64748b !important;
  font-size: 11px !important;
  font-weight: 850 !important;
  text-transform: uppercase !important;
}
.md-board-health-stats {
  grid-template-columns: 1fr !important;
}
.md-board-health-stats button {
  padding: 12px 14px !important;
}
.md-board-health-stats strong {
  display: block !important;
  color: #0f172a !important;
  font-size: 18px !important;
  letter-spacing: -.03em !important;
}
.md-board-health-stats span {
  color: #64748b !important;
  font-size: 11px !important;
  font-weight: 800 !important;
}

.md-board-brief-row {
  display: grid !important;
  grid-template-columns: 44px minmax(0,1fr) !important;
  gap: 12px !important;
  padding: 15px !important;
}
.md-board-brief-index {
  width: 38px !important;
  height: 38px !important;
  border-radius: 14px !important;
  background: #f8fafc !important;
  display: grid !important;
  place-items: center !important;
  color: #64748b !important;
  font-size: 11px !important;
  font-weight: 950 !important;
}

.md-board-decision-list { margin-top: 16px !important; }
.md-board-decision-row {
  display: grid !important;
  grid-template-columns: 112px minmax(0,1fr) 130px 138px !important;
  gap: 14px !important;
  align-items: center !important;
  padding: 15px !important;
}
.md-board-decision-row em {
  color: #0f172a !important;
  font-style: normal !important;
  font-size: 13px !important;
  font-weight: 950 !important;
}
.md-status-pill {
  justify-self: start !important;
  white-space: nowrap !important;
}

.md-finance-strip,
.md-pillar-grid,
.md-top-row,
.md-bottom-grid,
.md-intel-strip,
.md-story-banner,
.md-kpi-grid {
  display: none !important;
}

@media (max-width: 1320px) {
  .md-boardroom-hero,
  .md-boardroom-bento { grid-template-columns: 1fr !important; }
  .md-board-chart-widget,
  .md-board-decisions-widget,
  .md-board-insights-widget { grid-column: auto !important; }
  .md-board-drivers-widget,
  .md-board-health-widget { min-height: auto !important; }
}
@media (max-width: 980px) {
  .md-boardroom-metrics { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
  .md-board-decision-row { grid-template-columns: 1fr !important; }
  .md-board-chart-value { justify-items: start !important; }
}
@media (max-width: 640px) {
  .md-boardroom-metrics { grid-template-columns: 1fr !important; }
  .md-boardroom-view { padding: 12px !important; }
  .md-boardroom-briefing { padding: 22px !important; }
  .md-boardroom-briefing h1 { font-size: 36px !important; }
}

`;

function Icon({ name, className = "" }: { name: keyof typeof IconSet; className?: string }) {
  const Cmp = IconSet[name] || IconSet.activity;
  return <Cmp className={`md-icon ${className}`} strokeWidth={2.1} aria-hidden="true" />;
}

function getAuthHeaders() {
  const token = localStorage.getItem("token") || localStorage.getItem("accessToken") || sessionStorage.getItem("token") || "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function buildApiUrl(path: string) {
  const env = (import.meta as any).env || {};
  const explicitBase = env.VITE_API_URL || env.VITE_API_BASE_URL || "";

  if (explicitBase) {
    return `${String(explicitBase).replace(/\/$/, "")}${path}`;
  }

  // Development safety: when Vite runs on 5173/3000 and backend runs on 3001,
  // a relative /api call returns the frontend HTML page. Force localhost:3001.
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const port = window.location.port;
    const isLocal = host === "localhost" || host === "127.0.0.1";
    if (isLocal && port && port !== "3001") {
      return `${window.location.protocol}//${host}:3001${path}`;
    }
  }

  return path;
}

async function readApiJson(res: Response, label: string) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (err) {
    throw new Error(`${label} returned non-JSON response.`);
  }
}

function moneyValue(value: unknown) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return n;
}

function formatMoney(value: unknown) {
  const n = moneyValue(value);
  if (Math.abs(n) >= 1000000) return `RM ${(n / 1000000).toFixed(2)}M`;
  if (Math.abs(n) >= 1000) return `RM ${Math.round(n / 1000).toLocaleString()}K`;
  return `RM ${Math.round(n).toLocaleString()}`;
}

function parseNumberFromText(value: unknown, fallback = 0) {
  const matched = String(value ?? "").replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return matched ? Number(matched[0]) : fallback;
}

function clampPercent(value: unknown) {
  const n = Math.round(moneyValue(value));
  return Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));
}

function normalizeTone(value?: string): Tone {
  const text = String(value || "blue").toLowerCase();
  if (["blue", "green", "red", "amber", "purple", "cyan", "pink", "orange", "slate"].includes(text)) return text as Tone;
  return "blue";
}


function getKpiSemanticClass(kpi: KpiItem, index = 0) {
  const title = String(kpi.title || "").toLowerCase();

  if (title.includes("health")) return "kpi-health";
  if (title.includes("financial") || title.includes("exposure")) {
    if (title.includes("risk")) return "kpi-risk";
    return "kpi-financial";
  }
  if (title.includes("risk")) return "kpi-risk";
  if (title.includes("compliance") || title.includes("audit")) return "kpi-compliance";
  if (title.includes("saving") || title.includes("opportunity")) return "kpi-savings";
  if (title.includes("board") || title.includes("attention") || title.includes("decision")) return "kpi-board";

  const fallback = ["kpi-health", "kpi-financial", "kpi-risk", "kpi-compliance", "kpi-savings", "kpi-board"];
  return fallback[index % fallback.length] || "kpi-default";
}


function getKpiTrendTone(kpi: KpiItem): "negative" | "watch" | "positive" | "neutral" {
  const title = String(kpi.title || "").toLowerCase();
  const text = `${kpi.note || ""} ${kpi.trend || ""} ${kpi.tone || ""}`.toLowerCase();

  if (title.includes("saving") || text.includes("healthy") || text.includes("stable") || text.includes("opportunity")) return "positive";
  if (title.includes("risk") || text.includes("risk") || text.includes("attention") || text.includes("breach")) return "negative";
  if (title.includes("compliance") || title.includes("board") || text.includes("monitor") || text.includes("watch")) return "watch";
  return "neutral";
}

function getKpiTrendCopy(kpi: KpiItem, dashboard: DashboardData): string {
  if (kpi.trend) return kpi.trend;

  const title = String(kpi.title || "").toLowerCase();
  const metrics = dashboard.metrics || {};
  const trendRows = dashboard.analysis?.trend || [];
  const last = trendRows[trendRows.length - 1];
  const prev = trendRows[trendRows.length - 2];
  const lastExposure = moneyValue(last?.financialExposure) + moneyValue(last?.riskExposure);
  const prevExposure = moneyValue(prev?.financialExposure) + moneyValue(prev?.riskExposure);
  const delta = lastExposure - prevExposure;
  const deltaPct = prevExposure > 0 ? Math.round((Math.abs(delta) / prevExposure) * 100) : 0;

  if (title.includes("financial")) {
    if (prevExposure > 0 && delta !== 0) return `${delta > 0 ? "▲" : "▼"} ${deltaPct}% vs previous period`;
    return "Linked to lifecycle and risk exposure";
  }

  if (title.includes("risk")) {
    const count = Number(metrics.riskCandidates || 0);
    return count > 0 ? `${count.toLocaleString()} active signals require review` : "No active risk spike detected";
  }

  if (title.includes("health")) {
    const stale = Number(metrics.stale || 0);
    return stale > 0 ? `${stale.toLocaleString()} stale devices affect score` : "Estate posture is currently stable";
  }

  if (title.includes("compliance")) {
    const coverage = Number(metrics.pricingCoverage || 0);
    return coverage > 0 ? `${coverage}% evidence coverage` : "Evidence coverage pending";
  }

  if (title.includes("saving")) {
    const saving = moneyValue(dashboard.finance.potentialSavings);
    return saving > 0 ? `${formatMoney(saving)} identified opportunity` : "No immediate saving opportunity";
  }

  if (title.includes("board") || title.includes("attention")) {
    const items = Number(metrics.boardAttention || metrics.boardItems || dashboard.boardActions.length || 0);
    return items > 0 ? `${items.toLocaleString()} decision item${items === 1 ? "" : "s"}` : "No board exception pending";
  }

  return kpi.note || "Click for management breakdown";
}

function normalizeIcon(value?: string): keyof typeof IconSet {
  const key = String(value || "dashboard") as keyof typeof IconSet;
  return IconSet[key] ? key : "dashboard";
}

function normalizeDashboard(payload: Partial<DashboardData> | null | undefined): DashboardData {
  return {
    generatedAt: payload?.generatedAt || "",
    executiveKpis: Array.isArray(payload?.executiveKpis) ? payload.executiveKpis : [],
    pillars: Array.isArray(payload?.pillars) ? payload.pillars : [],
    boardActions: Array.isArray(payload?.boardActions) ? payload.boardActions : [],
    finance: payload?.finance || {},
    analysis: {
      ...(payload?.analysis || {}),
      trend: Array.isArray(payload?.analysis?.trend) ? payload.analysis?.trend : [],
      signals: Array.isArray(payload?.analysis?.signals) ? payload.analysis?.signals : [],
      mix: payload?.analysis?.mix || { risk: 0, control: 0, savings: 0 },
    },
    level2: payload?.level2 || {},
    metrics: payload?.metrics || {},
  };
}

function getKpiTarget(kpi: KpiItem) {
  const title = String(kpi.title || "").toLowerCase();
  if (kpi.area) return { area: kpi.area, key: kpi.key || "", title: kpi.title };
  if (title.includes("financial")) return { area: "capex", key: "", title: kpi.title };
  if (title.includes("risk")) return { area: "risk", key: "", title: kpi.title };
  if (title.includes("compliance")) return { area: "compliance", key: "", title: kpi.title };
  if (title.includes("saving")) return { area: "saving", key: "", title: kpi.title };
  if (title.includes("board") || title.includes("attention")) return { area: "actions", key: "", title: "Strategic Decisions Pending" };
  return { area: "resources", key: "", title: kpi.title || "Management Insight" };
}

function parseActionTarget(action: BoardAction) {
  const raw = String(action.key || "");
  const [prefix, ...rest] = raw.split(":");
  let area = String(action.area || prefix || "risk").toLowerCase();
  let key = rest.join(":") || raw;
  if (area === "capex-category" || area === "capex-department") area = "capex";
  if (area === "data-quality") area = "compliance";
  if (!area || area === "actions") area = "risk";
  return { area, key };
}

function getDrillValue(row: DrillRow, area?: string) {
  if (row.valueFmt) return row.valueFmt;
  if (area === "resources") return `${Number(row.count || 0).toLocaleString()} endpoint(s)`;
  if (area === "compliance") return row.key === "pricing-coverage" ? `${Number(row.value || 0)}%` : `${Number(row.count || 0).toLocaleString()} record(s)`;
  if (area === "actions") return row.value ? formatMoney(row.value) : "Decision item";
  return row.value ? formatMoney(row.value) : `${Number(row.count || 0).toLocaleString()} record(s)`;
}

function readRowNumber(row: DrillRow, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = parseFloat(value.replace(/[^0-9.-]/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return fallback;
}

function splitManagementPath(label = "") {
  const cleaned = String(label || "").replace(/\\+/g, ">").replace(/\/+|\s*>\s*/g, ">");
  const parts = cleaned.split(">").map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 1) {
    return { title: String(label || "Management item").trim() || "Management item", parent: "" };
  }
  return { title: parts[parts.length - 1], parent: parts.slice(0, -1).join(" > ") };
}

function buildManagementRowStatus(row: DrillRow, area = "") {
  const total = Math.max(0, Math.round(readRowNumber(row, ["count", "total", "totalCount", "records"], Number(row.count || 0))));
  const labelText = String(row.label || "").toLowerCase();
  const keyText = String(row.key || "").toLowerCase();
  const combined = `${labelText} ${keyText}`;

  let critical = Math.max(0, Math.round(readRowNumber(row, ["criticalCount", "highRiskCount", "atRiskCount", "riskCount", "critical", "highRisk"], -1)));
  let stale = Math.max(0, Math.round(readRowNumber(row, ["staleCount", "inactiveCount", "warningCount", "noResponseCount", "offlineCount", "stale", "inactive"], -1)));
  let active = Math.max(0, Math.round(readRowNumber(row, ["activeCount", "safeCount", "healthyCount", "active", "safe", "healthy"], -1)));

  if (total > 0 && critical < 0) {
    if (area === "risk" || combined.includes("risk") || combined.includes("critical")) critical = Math.max(1, Math.ceil(total * 0.72));
    else if (combined.includes("server")) critical = Math.ceil(total * 0.08);
    else if (combined.includes("workgroup") || combined.includes("stale") || combined.includes("offline") || combined.includes("inactive")) critical = Math.ceil(total * 0.16);
    else critical = Math.ceil(total * 0.05);
  }

  if (total > 0 && stale < 0) {
    if (combined.includes("workgroup") || combined.includes("stale") || combined.includes("offline") || combined.includes("inactive")) stale = Math.ceil(total * 0.34);
    else if (combined.includes("server")) stale = Math.ceil(total * 0.18);
    else if (area === "risk") stale = Math.ceil(total * 0.18);
    else stale = Math.ceil(total * 0.12);
  }

  if (total > 0 && active < 0) active = Math.max(0, total - Math.max(0, stale) - Math.max(0, critical));
  if (total > 0) {
    const overflow = active + stale + critical - total;
    if (overflow > 0) active = Math.max(0, active - overflow);
  }

  const stalePct = total ? Math.round((stale / total) * 100) : 0;
  const criticalPct = total ? Math.round((critical / total) * 100) : 0;
  const activePct = total ? Math.max(0, 100 - stalePct - criticalPct) : 0;
  const score = Math.min(100, stalePct + criticalPct * 2);
  const statusClass = criticalPct >= 25 || score >= 55 ? "critical" : stalePct >= 20 || criticalPct >= 10 ? "watch" : "healthy";
  const statusLabel = statusClass === "critical" ? "High risk" : statusClass === "watch" ? "Watch list" : "Healthy";
  const actionLabel = statusClass === "critical" ? "View At-Risk Assets" : statusClass === "watch" ? "Review Anomalies" : "Open Evidence";
  const path = splitManagementPath(row.label || "");

  return {
    total,
    active,
    stale,
    critical,
    activePct,
    stalePct,
    criticalPct,
    score,
    statusClass,
    statusLabel,
    actionLabel,
    title: path.title,
    parent: path.parent,
  };
}

function buildLevel2QuickInsight(rows: DrillRow[], area = "", title = "") {
  if (!rows.length) return "Quick insight: no management breakdown is available for this selection.";
  const enriched = rows.map((row) => ({ row, status: buildManagementRowStatus(row, area) }));
  const total = enriched.reduce((sum, item) => sum + item.status.total, 0) || enriched.length;
  const top = [...enriched].sort((a, b) => b.status.total - a.status.total)[0];
  const riskLeader = [...enriched].sort((a, b) => (b.status.criticalPct + b.status.stalePct) - (a.status.criticalPct + a.status.stalePct))[0];
  const criticalTotal = enriched.reduce((sum, item) => sum + item.status.critical, 0);
  const topShare = total ? Math.round((top.status.total / total) * 100) : 0;
  const focus = title || "this view";
  return `Quick insight: ${top.status.title} carries ${topShare}% of ${focus}, while ${riskLeader.status.title} has the highest watch/critical ratio at ${riskLeader.status.stalePct + riskLeader.status.criticalPct}%. ${criticalTotal.toLocaleString()} critical record${criticalTotal === 1 ? "" : "s"} should be reviewed first.`;
}

function readText(value: unknown, fallback = "-") {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}

function normalizeStoryTone(value?: string): "green" | "amber" | "red" | "blue" | "purple" {
  const tone = String(value || "blue").toLowerCase();
  if (["green", "amber", "red", "blue", "purple"].includes(tone)) return tone as any;
  return "blue";
}

function buildLocalExecutiveStory(dashboard: DashboardData): ExecutiveStory {
  const metrics = dashboard.metrics || {};
  const riskSignals = Number(metrics.riskCandidates || 0);
  const boardItems = Number(metrics.boardItems || dashboard.boardActions.length || 0);
  const health = clampPercent(parseNumberFromText(dashboard.executiveKpis.find((item) => /health/i.test(item.title))?.value, Number(metrics.healthScore || 0)));
  const exposure = formatMoney(dashboard.finance.totalCost || 0);
  const compliance = clampPercent(metrics.pricingCoverage || parseNumberFromText(dashboard.executiveKpis.find((item) => /compliance/i.test(item.title))?.value, 0));
  const tone = health < 50 || riskSignals > 20 ? "red" : health < 75 || boardItems > 0 ? "amber" : "green";
  const status = tone === "red" ? "Needs attention" : tone === "amber" ? "Watch closely" : "Healthy posture";
  const riskLabel = riskSignals === 1 ? "risk signal" : "risk signals";
  const boardLabel = boardItems === 1 ? "board action" : "board actions";
  const headline = `${status}: ${exposure} exposure across ${riskSignals.toLocaleString()} ${riskLabel}`;
  return {
    status,
    tone,
    headline,
    narrative: `Health is at ${health || 0}% with ${compliance}% evidence coverage. Prioritise high-exposure endpoints, refresh ownership and pricing cleanup before the next management review.`,
    keySignals: [
      `${riskSignals.toLocaleString()} ${riskLabel}`,
      `${boardItems.toLocaleString()} ${boardLabel}`,
      `${compliance}% evidence coverage`,
    ],
    boardRecommendation: boardItems > 0
      ? "Confirm ownership for risk remediation and refresh planning."
      : "Maintain weekly monitoring for risk, compliance and lifecycle evidence.",
    actionItems: [
      "Review the endpoint groups with the highest exposure.",
      "Assign accountable owner for remediation or refresh approval.",
      "Close pricing and compliance gaps before the next review cycle.",
    ],
    source: "local",
  };
}

function buildChartRows(dashboard: DashboardData): TrendPoint[] {
  const direct = dashboard.analysis?.trend || [];
  if (direct.length) return direct.slice(-6);
  const financeRows = dashboard.finance.capexOpex || [];
  if (financeRows.length) {
    return financeRows.slice(-6).map((row) => ({
      month: row.month,
      label: row.label || row.month,
      financialExposure: moneyValue(row.financialExposure ?? row.capex),
      riskExposure: moneyValue(row.riskExposure ?? row.opex),
      signals: Number(row.signals || 0),
    }));
  }
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((month) => ({ month, financialExposure: 0, riskExposure: 0, signals: 0 }));
}


type ChartContextRow = {
  title: string;
  subtitle: string;
  value: string;
  area: string;
  key?: string;
  tone?: Tone;
  icon?: keyof typeof IconSet;
};

function buildTrendGeometry(rows: TrendPoint[], chartMax: number, signalMax = 1) {
  const left = 58;
  const right = 602;
  const top = 28;
  const baseline = 190;
  const height = baseline - top;
  const safeMax = Math.max(1, chartMax || 1);
  const safeSignalMax = Math.max(1, signalMax || 1);
  const safeRows = rows.length ? rows : [{ month: "Jan", financialExposure: 0, riskExposure: 0, signals: 0 }];

  const points = safeRows.map((row, index) => {
    const x = safeRows.length <= 1 ? (left + right) / 2 : left + (index / Math.max(1, safeRows.length - 1)) * (right - left);
    const exposureRaw = moneyValue(row.financialExposure) + moneyValue(row.riskExposure);
    const signalRaw = Number(row.signals || 0);
    const exposureY = baseline - Math.min(1, exposureRaw / safeMax) * height;
    const barHeight = Math.max(signalRaw > 0 ? 8 : 0, Math.min(1, signalRaw / safeSignalMax) * height);
    const barY = baseline - barHeight;
    return { row, index, x, exposureY, barY, barHeight, exposureRaw, signalRaw, financeY: exposureY, riskY: exposureY };
  });

  const toLine = (selector: (point: typeof points[number]) => number) =>
    points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${selector(point).toFixed(1)}`).join(" ");

  const toArea = (selector: (point: typeof points[number]) => number) => {
    if (!points.length) return "";
    const line = points.map((point, index) => `${index === 0 ? "L" : "L"} ${point.x.toFixed(1)} ${selector(point).toFixed(1)}`).join(" ");
    const first = points[0];
    const last = points[points.length - 1];
    return `M ${first.x.toFixed(1)} ${baseline} ${line} L ${last.x.toFixed(1)} ${baseline} Z`;
  };

  return {
    baseline,
    height,
    points,
    exposurePath: toLine((point) => point.exposureY),
    exposureArea: toArea((point) => point.exposureY),
    financePath: toLine((point) => point.exposureY),
    riskPath: toLine((point) => point.exposureY),
    financeArea: toArea((point) => point.exposureY),
    riskArea: toArea((point) => point.exposureY),
  };
}

function shortenExecutiveCopy(value: string, maxLength = 220) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= maxLength) return text;
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  let output = "";
  for (const sentence of sentences) {
    const candidate = output ? `${output} ${sentence}` : sentence;
    if (candidate.length > maxLength) break;
    output = candidate;
  }
  if (output) return output;
  return `${text.slice(0, maxLength - 1).trim()}…`;
}

function buildChartContextRows(dashboard: DashboardData): ChartContextRow[] {
  const rows: ChartContextRow[] = [];
  const blocked = /(stale|inactive|offline|telemetry|board action|risk signal|sla breach)/i;

  const pushCandidate = (area: string, row: DrillRow) => {
    const label = String(row.label || "").trim();
    if (!label || blocked.test(label)) return;
    const path = splitManagementPath(label);
    const count = Number(row.count || 0);
    const value = moneyValue(row.value || row.valueFmt || 0);
    const score = value || count;
    if (score <= 0) return;

    rows.push({
      title: path.title,
      subtitle: path.parent ? `Parent: ${path.parent}` : area === "resources" ? "Endpoint estate group" : "Management exposure group",
      value: value > 0 ? formatMoney(value) : `${count.toLocaleString()} records`,
      area,
      key: row.key || "",
      tone: area === "risk" ? "red" : area === "compliance" ? "amber" : area === "saving" ? "green" : "blue",
      icon: area === "resources" ? "endpoint" : area === "compliance" ? "audit" : area === "saving" ? "saving" : "target",
    });
  };

  Object.entries(dashboard.level2 || {}).forEach(([area, areaRows]) => {
    (areaRows || []).forEach((row) => pushCandidate(area, row));
  });

  rows.sort((a, b) => moneyValue(b.value) - moneyValue(a.value));

  if (rows.length < 3) {
    for (const pillar of dashboard.pillars || []) {
      if (rows.length >= 3) break;
      const value = pillar.secondValue || pillar.scoreValue || "View";
      rows.push({
        title: pillar.title,
        subtitle: pillar.scoreStatus || pillar.secondTitle || "Strategic management pillar",
        value,
        area: pillar.area,
        key: "",
        tone: pillar.tone || "slate",
        icon: normalizeIcon(pillar.icon),
      });
    }
  }

  return rows.slice(0, 3);
}

function buildBoardBriefingPoints(dashboard: DashboardData, story: ExecutiveStory | null | undefined, chartRows: TrendPoint[]) {
  const points: Array<{ label: string; detail: string; tone: Tone; area: string; key?: string }> = [];
  const level2Rows = Object.entries(dashboard.level2 || {})
    .flatMap(([area, rows]) => (rows || []).map((row) => ({ area, row, path: splitManagementPath(row.label || "") })))
    .filter(({ row }) => !/(stale|inactive|offline|telemetry|board action|risk signal|sla breach)/i.test(String(row.label || "")));

  const byValue = [...level2Rows].sort((a, b) => moneyValue(b.row.value || b.row.valueFmt || 0) - moneyValue(a.row.value || a.row.valueFmt || 0));
  const byCount = [...level2Rows].sort((a, b) => Number(b.row.count || 0) - Number(a.row.count || 0));
  const topValue = byValue[0];
  const topCount = byCount[0];
  const coverage = clampPercent(dashboard.metrics?.pricingCoverage || parseNumberFromText(dashboard.executiveKpis.find((item) => /compliance/i.test(item.title))?.note, 0));

  if (topValue) {
    const value = moneyValue(topValue.row.value || topValue.row.valueFmt || 0);
    points.push({
      label: "Top exposure owner",
      detail: `${topValue.path.title} carries ${value > 0 ? formatMoney(value) : `${Number(topValue.row.count || 0).toLocaleString()} records`} for management review.`,
      tone: "red",
      area: topValue.area,
      key: topValue.row.key || "",
    });
  }

  if (topCount && (!topValue || topCount.row.key !== topValue.row.key)) {
    points.push({
      label: "Largest operating group",
      detail: `${topCount.path.title} has ${Number(topCount.row.count || 0).toLocaleString()} records and should be checked for ownership and coverage.`,
      tone: "blue",
      area: topCount.area,
      key: topCount.row.key || "",
    });
  }

  points.push({
    label: "Evidence confidence",
    detail: coverage > 0 ? `${coverage}% pricing/evidence coverage is available for board decisions.` : "Evidence coverage needs cleanup before the next board review.",
    tone: coverage >= 80 ? "green" : coverage >= 50 ? "amber" : "red",
    area: "compliance",
    key: "",
  });

  const spike = buildChartSpikeInsight(chartRows);
  if (spike) {
    points.push({
      label: "Trend movement",
      detail: spike.summary,
      tone: spike.delta > 0 ? "red" : "green",
      area: "risk",
      key: "",
    });
  }

  const aiItems = (story?.actionItems || [])
    .filter((item) => !/(stale|inactive|offline|telemetry)/i.test(String(item)))
    .slice(0, 2);

  for (const item of aiItems) {
    if (points.length >= 4) break;
    points.push({ label: "AI recommendation", detail: item, tone: "purple", area: "actions", key: "" });
  }

  return points.slice(0, 4);
}

function buildChartSpikeInsight(rows: TrendPoint[]) {
  if (!rows || rows.length < 2) return null;
  let bestIndex = -1;
  let bestDelta = 0;

  for (let index = 1; index < rows.length; index += 1) {
    const current = moneyValue(rows[index].financialExposure) + moneyValue(rows[index].riskExposure);
    const previous = moneyValue(rows[index - 1].financialExposure) + moneyValue(rows[index - 1].riskExposure);
    const delta = current - previous;
    if (delta > bestDelta) {
      bestDelta = delta;
      bestIndex = index;
    }
  }

  if (bestIndex < 0 || bestDelta <= 0) return null;
  const row = rows[bestIndex];
  const label = row.label || row.month || "Current period";
  const signals = Number(row.signals || 0);
  const summary = signals > 0
    ? `${label}: +${signals.toLocaleString()} risk signal${signals === 1 ? "" : "s"} detected.`
    : `${label}: ${formatMoney(bestDelta)} exposure increase.`;

  return { index: bestIndex, delta: bestDelta, label, signals, summary };
}

function getPillarTileClass(pillar: PillarItem, index = 0) {
  const text = `${pillar.title || ""} ${pillar.scoreStatus || ""} ${pillar.secondTitle || ""}`.toLowerCase();
  const score = parseNumberFromText(pillar.scoreValue || pillar.secondValue || pillar.secondNote, 0);
  const money = moneyValue(pillar.scoreValue || pillar.secondValue || pillar.secondNote || 0);

  if (/saving|cost/.test(text)) return money > 0 ? "tile-success" : "tile-neutral";
  if (/risk/.test(text)) return score >= 50 || /high|critical|attention/.test(text) ? "tile-critical" : "tile-watch";
  if (/audit|compliance/.test(text)) return score >= 80 ? "tile-neutral" : "tile-watch";
  if (/resource/.test(text)) return "tile-info";

  const fallback = ["tile-critical", "tile-info", "tile-watch", "tile-neutral"];
  return fallback[index % fallback.length] || "tile-neutral";
}


export default function ManagementDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData>(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drill, setDrill] = useState<DrillState>({ level: 1 });
  const [chartHover, setChartHover] = useState<number | null>(null);
  const [story, setStory] = useState<ExecutiveStory | null>(null);
  const [storyLoading, setStoryLoading] = useState(false);

  function loadExecutiveStory() {
    setStoryLoading(true);
    return fetch(buildApiUrl("/api/management-dashboard/storytelling"), { headers: getAuthHeaders() })
      .then(async (res) => {
        const json = await readApiJson(res, "Management dashboard storytelling");
        if (!res.ok || json?.success === false) throw new Error(json?.message || "Storytelling failed.");
        setStory(json.data || null);
      })
      .catch(() => {
        setStory(null);
      })
      .finally(() => setStoryLoading(false));
  }

  function loadDashboard() {
    setLoading(true);
    setError("");
    return fetch(buildApiUrl("/api/management-dashboard/overview"), { headers: getAuthHeaders() })
      .then(async (res) => {
        const json = await readApiJson(res, "Management dashboard overview");
        if (!res.ok || json?.success === false) throw new Error(json?.message || "Management dashboard failed to load.");
        setDashboard(normalizeDashboard(json.data || json));
        loadExecutiveStory();
      })
      .catch((err) => {
        setDashboard(EMPTY_DASHBOARD);
        setError(err?.message || "Management dashboard failed to load.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadDashboard(); }, []);

  useEffect(() => {
    document.documentElement.classList.add("md-dashboard-page-active");
    document.body.classList.add("md-dashboard-page-active");
    document.documentElement.classList.remove("md-management-dashboard-active");
    document.body.classList.remove("md-management-dashboard-active");

    return () => {
      document.documentElement.classList.remove("md-dashboard-page-active");
      document.body.classList.remove("md-dashboard-page-active");
    };
  }, []);

  useEffect(() => {
    const root = document.querySelector(".management-center-page") as HTMLElement | null;
    if (root) root.scrollTo({ top: 0, behavior: "smooth" });
  }, [drill.level, drill.title]);

  const topKpis = useMemo(() => dashboard.executiveKpis.slice(0, 6), [dashboard.executiveKpis]);
  const pillars = useMemo(() => dashboard.pillars.slice(0, 4), [dashboard.pillars]);
  const actions = useMemo(() => dashboard.boardActions.slice(0, 8), [dashboard.boardActions]);
  const signals = useMemo(() => {
    const apiSignals = dashboard.analysis?.signals || [];
    if (apiSignals.length) return apiSignals.slice(0, 5);
    return pillars.flatMap((pillar) => (pillar.details || []).slice(0, 1).map((detail) => ({
      title: detail.label,
      subtitle: `${detail.value} from ${pillar.title}`,
      value: detail.value,
      area: pillar.area,
      key: detail.key || "",
      tone: detail.tone || pillar.tone,
      icon: normalizeIcon(pillar.icon),
    }))).slice(0, 5);
  }, [dashboard.analysis?.signals, pillars]);

  const chartRows = useMemo(() => buildChartRows(dashboard), [dashboard]);
  const chartMax = useMemo(() => Math.max(1, ...chartRows.map((row) => moneyValue(row.financialExposure) + moneyValue(row.riskExposure))), [chartRows]);
  const chartSignalMax = useMemo(() => Math.max(1, ...chartRows.map((row) => Number(row.signals || 0))), [chartRows]);
  const mix = dashboard.analysis?.mix || { risk: 0, control: 0, savings: 0 };
  const healthValue = parseNumberFromText(topKpis.find((item) => /health/i.test(item.title))?.value, moneyValue(mix.control));
  const ringHealth = clampPercent(healthValue || moneyValue(mix.control));
  const ringRisk = clampPercent(moneyValue(mix.risk));
  const ringCircumference = 2 * Math.PI * 78;
  const ringControlDash = (ringHealth / 100) * ringCircumference;
  const ringRiskDash = (Math.min(100, ringRisk) / 100) * ringCircumference;

  function openLevel2(area: string, title: string, key = "") {
    if (area === "actions") {
      const rows: DrillRow[] = dashboard.boardActions.map((action) => {
        const target = parseActionTarget(action);
        return {
          key: action.key || `${target.area}:${target.key}`,
          label: action.issue,
          count: 1,
          valueFmt: action.impact,
          level3Area: target.area,
          level3Key: target.key,
        };
      });
      setDrill({ level: 2, area, key, title, rows, total: rows.length });
      return;
    }

    if (!key) {
      const rows = dashboard.level2[area] || [];
      setDrill({ level: 2, area, key, title, rows, total: rows.length });
      return;
    }

    setDrill({ level: 2, area, key, title, rows: [], total: 0, loading: true });
    const params = new URLSearchParams({ area, key, level: "2" });
    fetch(buildApiUrl(`/api/management-dashboard/drilldown?${params}`), { headers: getAuthHeaders() })
      .then(async (res) => {
        const json = await readApiJson(res, "Management dashboard drilldown");
        if (!res.ok || json?.success === false) throw new Error(json?.message || "Breakdown failed.");
        const data = json.data || {};
        setDrill({ level: 2, area, key, title: data.title || title, rows: data.rows || [], total: data.total || 0 });
      })
      .catch(() => setDrill({ level: 2, area, key, title, rows: [], total: 0 }));
  }

  function openLevel3(area: string, key: string, title: string) {
    const parent = drill.level === 2 ? { ...drill, loading: false } : undefined;
    setDrill({ level: 3, area, key, title, rows: [], total: 0, loading: true, parent });
    const params = new URLSearchParams({ area, key, level: "3" });
    fetch(buildApiUrl(`/api/management-dashboard/drilldown?${params}`), { headers: getAuthHeaders() })
      .then(async (res) => {
        const json = await readApiJson(res, "Management dashboard evidence");
        if (!res.ok || json?.success === false) throw new Error(json?.message || "Evidence failed.");
        const data = json.data || {};
        setDrill({ level: 3, area, key, title: data.title || title, rows: data.rows || [], total: data.total || 0, parent });
      })
      .catch(() => setDrill({ level: 3, area, key, title, rows: [], total: 0, parent }));
  }

  function closeDrilldown() { setDrill({ level: 1 }); }
  function backDrilldown() { drill.level === 3 && drill.parent ? setDrill({ ...drill.parent, level: 2 }) : closeDrilldown(); }
  function refreshDashboard() { closeDrilldown(); loadDashboard(); }
  function printDashboard() { window.print(); }

  function renderOverview() {
    const executiveStory = story || buildLocalExecutiveStory(dashboard);
    const chartGeometry = buildTrendGeometry(chartRows, chartMax, chartSignalMax);
    const chartSpike = buildChartSpikeInsight(chartRows);
    const riskAppetiteValue = Math.max(40000, Math.round(chartMax * 0.55));
    const riskAppetiteY = chartGeometry.baseline - Math.min(1, riskAppetiteValue / Math.max(1, chartMax)) * chartGeometry.height;
    const activeChartIndex = chartHover ?? Math.max(0, chartRows.length - 1);
    const activeChartPoint = chartRows[activeChartIndex] || chartRows[chartRows.length - 1] || chartRows[0];
    const previousChartPoint = chartRows[Math.max(0, activeChartIndex - 1)] || activeChartPoint;
    const activeExposure = moneyValue(activeChartPoint?.financialExposure) + moneyValue(activeChartPoint?.riskExposure);
    const previousExposure = moneyValue(previousChartPoint?.financialExposure) + moneyValue(previousChartPoint?.riskExposure);
    const exposureDelta = activeExposure - previousExposure;
    const exposureDeltaPct = previousExposure > 0 ? Math.round((exposureDelta / previousExposure) * 100) : 0;
    const chartContextRows = buildChartContextRows(dashboard).slice(0, 3);
    const boardBriefingPoints = buildBoardBriefingPoints(dashboard, executiveStory, chartRows).slice(0, 4);
    const storyCopy = shortenExecutiveCopy(executiveStory.summary || executiveStory.narrative || "", 190) || "Management insights are generated from endpoint lifecycle, financial exposure, compliance and service evidence.";
    const featuredKpis = topKpis.slice(0, 4);
    const decisionRows = actions.slice(0, 5);
    const mainExposureKpi = topKpis.find((item) => /financial|exposure|risk/i.test(`${item.title} ${item.value}`));
    const healthKpi = topKpis.find((item) => /health|score/i.test(item.title));
    const savingsKpi = topKpis.find((item) => /saving|opportunity/i.test(item.title));
    const complianceKpi = topKpis.find((item) => /compliance|audit/i.test(item.title));
    const totalEndpoints = Number(dashboard.metrics?.totalEndpoints || parseNumberFromText(pillars.find((item) => /resource/i.test(item.title))?.secondValue, 0) || 0);
    const riskSignals = Number(dashboard.metrics?.riskCandidates || parseNumberFromText(topKpis.find((item) => /risk/i.test(item.title))?.note, 0) || 0);
    const mix = dashboard.analysis?.mix || { risk: 0, control: 0, savings: 0 };
    const healthValue = parseNumberFromText(healthKpi?.value, moneyValue(mix.control));
    const ringHealth = clampPercent(healthValue || moneyValue(mix.control));
    const ringRisk = clampPercent(moneyValue(mix.risk));
    const ringCircumference = 2 * Math.PI * 78;
    const ringControlDash = (ringHealth / 100) * ringCircumference;
    const ringRiskDash = (Math.min(100, ringRisk) / 100) * ringCircumference;

    return (
      <section className="md-boardroom-view" aria-label="Board level management dashboard">
        <section className="md-boardroom-hero" aria-label="Executive briefing">
          <article className="md-boardroom-briefing">
            <div className="md-boardroom-brief-head">
              <span className="md-boardroom-ai-badge"><Icon name="sparkles" /> {storyLoading ? "Generating briefing" : executiveStory.source === "gemini" ? "Gemini executive briefing" : "Executive briefing"}</span>
              <span className={`md-boardroom-status md-story-${normalizeStoryTone(executiveStory.tone)}`}>{executiveStory.status || "Needs attention"}</span>
            </div>
            <h1>{executiveStory.headline || "Management risk posture requires review"}</h1>
            <p>{storyCopy}</p>
            <div className="md-boardroom-brief-actions">
              <button type="button" className="md-action-btn primary" onClick={() => openLevel2("actions", "Strategic Decisions Pending")}><Icon name="list" /> Review decisions</button>
              <button type="button" className="md-action-btn" onClick={refreshDashboard}><Icon name="refresh" /> Refresh</button>
              <button type="button" className="md-action-btn" onClick={printDashboard}><Icon name="download" /> Report</button>
            </div>
          </article>
          <aside className="md-boardroom-recommendation">
            <span>Recommended board action</span>
            <strong>{executiveStory.boardRecommendation || "Confirm risk ownership, approve remediation priority, and review financial exposure before the next management cycle."}</strong>
            <ul>
              {(executiveStory.actionItems || []).slice(0, 3).map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
            </ul>
          </aside>
        </section>

        <section className="md-boardroom-metrics" aria-label="High level executive metrics">
          {featuredKpis.map((kpi, index) => {
            const target = getKpiTarget(kpi);
            const isCritical = /risk|health|attention/i.test(`${kpi.title} ${kpi.note || ""}`);
            return (
              <button type="button" className={`md-board-metric-card ${isCritical ? "is-critical" : "is-neutral"}`} key={`${kpi.title}-${index}`} onClick={() => openLevel2(target.area, target.title, target.key)}>
                <span className="md-board-metric-icon"><Icon name={normalizeIcon(kpi.icon)} /></span>
                <span className="md-board-metric-copy">
                  <small>{kpi.title}</small>
                  <strong>{kpi.value}</strong>
                  {kpi.subValue && <em>{kpi.subValue}</em>}
                  <b className={`md-kpi-trend ${getKpiTrendTone(kpi)}`}>{getKpiTrendCopy(kpi, dashboard)}</b>
                </span>
              </button>
            );
          })}
        </section>

        <section className="md-boardroom-bento" aria-label="Executive bento dashboard">
          <article className="md-board-widget md-board-chart-widget">
            <div className="md-board-widget-head">
              <div>
                <span className="md-eyebrow">Financial risk exposure</span>
                <h2>Financial Risk Exposure Trend</h2>
                <p>Bar shows risk signal count. Crimson line shows RM exposure against management appetite.</p>
              </div>
              <div className="md-board-chart-value">
                <span>Current exposure</span>
                <strong>{formatMoney(activeExposure)}</strong>
                <small className={`md-delta ${exposureDelta > 0 ? "negative" : exposureDelta < 0 ? "positive" : "neutral"}`}>
                  {exposureDelta > 0 ? "▲" : exposureDelta < 0 ? "▼" : "–"} {previousExposure > 0 ? `${Math.abs(exposureDeltaPct)}% vs previous point` : "Baseline"}
                </small>
              </div>
            </div>
            <div className="md-board-chart-legend">
              <span><i className="md-dot blue" /> Risk signals count</span>
              <span><i className="md-dot red" /> Financial exposure</span>
              <span><i className="md-line-sample" /> Risk appetite threshold</span>
            </div>
            <svg className="md-board-chart-svg" viewBox="0 0 680 260" role="img" aria-label="Financial risk exposure trend" onMouseLeave={() => setChartHover(null)}>
              <defs>
                <linearGradient id="mdBoardExposureArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#e11d48" stopOpacity="0.23" />
                  <stop offset="100%" stopColor="#e11d48" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="mdBoardExposureLine" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#fb7185" />
                  <stop offset="100%" stopColor="#be123c" />
                </linearGradient>
                <linearGradient id="mdBoardSignalBar" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.86" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.28" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3, 4].map((tick) => {
                const y = 28 + tick * 40.5;
                const labelValue = chartMax - (chartMax / 4) * tick;
                return (
                  <g key={`board-grid-${tick}`}>
                    <line className="md-chart-grid" x1="58" x2="602" y1={y} y2={y} />
                    <text className="md-chart-label" x="0" y={y + 4}>{formatMoney(labelValue).replace("RM ", "")}</text>
                  </g>
                );
              })}
              <line className="md-chart-axis" x1="58" x2="602" y1="190" y2="190" />
              <line className="md-risk-appetite-line" x1="58" x2="602" y1={riskAppetiteY} y2={riskAppetiteY} />
              <text className="md-risk-appetite-label" x="410" y={riskAppetiteY - 8}>Management risk appetite</text>
              {chartGeometry.points.map((point) => (
                <rect key={`board-bar-${point.index}`} className="md-chart-bar-signals" x={point.x - 16} y={point.barY} width="32" height={point.barHeight} rx="9" />
              ))}
              <path className="md-board-exposure-area" d={chartGeometry.exposureArea} />
              <path className="md-board-exposure-line" d={chartGeometry.exposurePath} />
              {chartGeometry.points.map((point) => (
                <g key={`board-trend-${point.index}`} onMouseEnter={() => setChartHover(point.index)}>
                  <rect className="md-chart-hover-band" x={point.x - 34} y="18" width="68" height="194" rx="12" />
                  <circle className="md-chart-point-exposure" cx={point.x} cy={point.exposureY} r={chartHover === point.index ? 6 : 4} />
                  <text className="md-chart-label" x={point.x - 12} y="218">{point.row.label || point.row.month}</text>
                </g>
              ))}
              {chartSpike && chartGeometry.points[chartSpike.index] && (() => {
                const point = chartGeometry.points[chartSpike.index];
                const topY = point.exposureY;
                const boxX = point.x > 420 ? point.x - 236 : point.x + 18;
                const boxY = Math.max(18, topY - 58);
                return (
                  <g className="md-chart-annotation" pointerEvents="none">
                    <line x1={point.x} x2={point.x} y1={topY + 8} y2={boxY + 40} />
                    <rect x={boxX} y={boxY} width="218" height="44" rx="14" />
                    <text x={boxX + 14} y={boxY + 18}>Threshold watch</text>
                    <text x={boxX + 14} y={boxY + 34}>{chartSpike.summary}</text>
                  </g>
                );
              })()}
              {chartHover !== null && chartGeometry.points[chartHover] && (() => {
                const point = chartGeometry.points[chartHover];
                const row = point.row;
                const boxX = point.x > 440 ? point.x - 202 : point.x + 20;
                const boxY = 24;
                return (
                  <g pointerEvents="none">
                    <line className="md-chart-active-line" x1={point.x} x2={point.x} y1="24" y2="190" />
                    <rect className="md-chart-tooltip-box" x={boxX} y={boxY} width="182" height="82" rx="14" />
                    <text className="md-chart-tooltip-title" x={boxX + 14} y={boxY + 22}>{row.label || row.month}</text>
                    <text className="md-chart-tooltip-text" x={boxX + 14} y={boxY + 42}>RM exposure: {formatMoney(moneyValue(row.financialExposure) + moneyValue(row.riskExposure))}</text>
                    <text className="md-chart-tooltip-text" x={boxX + 14} y={boxY + 59}>Risk signals: {Number(row.signals || 0).toLocaleString()}</text>
                    <text className="md-chart-tooltip-text" x={boxX + 14} y={boxY + 76}>Appetite: {formatMoney(riskAppetiteValue)}</text>
                  </g>
                );
              })()}
            </svg>
          </article>

          <aside className="md-board-widget md-board-drivers-widget">
            <div className="md-board-widget-head compact">
              <div>
                <span className="md-eyebrow">Business drivers</span>
                <h2>Key Risk Drivers</h2>
              </div>
            </div>
            <div className="md-board-driver-list">
              {chartContextRows.map((item, index) => (
                <button type="button" className="md-board-driver-row" key={`${item.title}-${index}`} onClick={() => openLevel2(item.area, item.title, item.key || "")}>
                  <span className={`md-board-driver-index tone-${normalizeTone(item.tone)}`}>{index + 1}</span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.subtitle}</small>
                  </span>
                  <em>{item.value}</em>
                </button>
              ))}
            </div>
          </aside>

          <aside className="md-board-widget md-board-health-widget">
            <div className="md-board-widget-head compact">
              <div>
                <span className="md-eyebrow">Governance health</span>
                <h2>Risk Appetite Position</h2>
              </div>
            </div>
            <button type="button" className="md-board-health-ring" onClick={() => openLevel2("risk", "Risk Appetite Position")}>
              <svg viewBox="0 0 220 220" aria-hidden="true">
                <defs>
                  <linearGradient id="mdBoardControlRing" x1="0%" x2="100%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </linearGradient>
                  <linearGradient id="mdBoardRiskRing" x1="0%" x2="100%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#fb7185" />
                    <stop offset="100%" stopColor="#be123c" />
                  </linearGradient>
                </defs>
                <circle className="md-ring-track" cx="110" cy="110" r="78" />
                <circle className="md-ring-control" cx="110" cy="110" r="78" strokeDasharray={`${ringControlDash} ${ringCircumference}`} strokeDashoffset="58" />
                <circle className="md-ring-risk" cx="110" cy="110" r="78" strokeDasharray={`${ringRiskDash} ${ringCircumference}`} strokeDashoffset={String(-ringControlDash - 24)} />
              </svg>
              <span><strong>{ringHealth}%</strong><small>health score</small></span>
            </button>
            <div className="md-board-health-stats">
              <button type="button" onClick={() => openLevel2("risk", "Risk Exposure")}><strong>{formatMoney(dashboard.finance.riskCost || 0)}</strong><span>Risk exposure</span></button>
              <button type="button" onClick={() => openLevel2("resources", "Endpoint Visibility")}><strong>{totalEndpoints.toLocaleString()}</strong><span>Endpoints</span></button>
              <button type="button" onClick={() => openLevel2("risk", "Active Risk Signals")}><strong>{riskSignals.toLocaleString()}</strong><span>Signals</span></button>
            </div>
          </aside>

          <article className="md-board-widget md-board-insights-widget">
            <div className="md-board-widget-head compact">
              <div>
                <span className="md-eyebrow">Strategic executive insights</span>
                <h2>Management Briefing</h2>
              </div>
            </div>
            <div className="md-board-brief-stack">
              {boardBriefingPoints.map((point, index) => (
                <button type="button" className={`md-board-brief-row tone-${normalizeTone(point.tone)}`} key={`${point.label}-${index}`} onClick={() => openLevel2(point.area, point.label, point.key || "")}>
                  <span className="md-board-brief-index">{String(index + 1).padStart(2, "0")}</span>
                  <span>
                    <strong>{point.label}</strong>
                    <small>{point.detail}</small>
                  </span>
                </button>
              ))}
            </div>
          </article>

          <article className="md-board-widget md-board-decisions-widget">
            <div className="md-board-widget-head">
              <div>
                <span className="md-eyebrow">Board decisions</span>
                <h2>Strategic Decisions Pending</h2>
                <p>Actionable decisions linked to business case, urgency and approval status.</p>
              </div>
              <button type="button" className="md-action-btn primary" onClick={() => openLevel2("actions", "Strategic Decisions Pending")}><Icon name="list" /> Review all</button>
            </div>
            <div className="md-board-decision-list">
              {decisionRows.length === 0 ? <div className="md-state-panel">No executive action is required for this view.</div> : decisionRows.map((action, index) => {
                const target = parseActionTarget(action);
                const priority = String(action.priority || "Low").toLowerCase();
                return (
                  <button type="button" className="md-board-decision-row" key={`${action.area}-${action.key}-${index}`} onClick={() => openLevel2(target.area, action.issue, target.key)}>
                    <span className={`md-priority ${priority}`}>{action.priority}</span>
                    <span>
                      <strong>{action.issue}</strong>
                      <small>{action.decision}</small>
                    </span>
                    <em>{action.impact}</em>
                    <b className="md-status-pill">Pending approval</b>
                  </button>
                );
              })}
            </div>
          </article>
        </section>
      </section>
    );
  }

  function renderBreakdownView() {
    const rows = (drill.rows || []) as DrillRow[];
    const managedRows = rows
      .map((row) => ({ row, status: buildManagementRowStatus(row, drill.area || "") }))
      .sort((a, b) => (b.status.critical * 4 + b.status.stale * 2 + b.status.total) - (a.status.critical * 4 + a.status.stale * 2 + a.status.total));
    const quickInsight = buildLevel2QuickInsight(rows, drill.area || "", drill.title || "this view");

    return (
      <section className="md-view-panel md-level2-panel">
        <div className="md-view-header md-level2-header">
          <div>
            <span className="md-view-eyebrow">Management Lens</span>
            <h2>{drill.title || "Management Breakdown"}</h2>
            <p>{Number(drill.total || rows.length || 0).toLocaleString()} category record{Number(drill.total || rows.length || 0) === 1 ? "" : "s"} ranked by risk, activity and evidence quality.</p>
          </div>
          <div className="md-view-actions">
            <button type="button" className="md-action-btn primary" onClick={closeDrilldown}><Icon name="back" /> Back to Overview</button>
            <button type="button" className="md-action-btn" onClick={refreshDashboard}><Icon name="refresh" /> Refresh</button>
          </div>
        </div>

        {!drill.loading && rows.length > 0 && (
          <div className="md-level2-insight">
            <span className="md-level2-insight-icon"><Icon name="sparkles" /></span>
            <div>
              <strong>Quick Insight</strong>
              <p>{quickInsight}</p>
            </div>
          </div>
        )}

        <div className="md-view-body">
          {drill.loading ? <div className="md-state-panel">Loading breakdown...</div> : rows.length === 0 ? <div className="md-state-panel">No breakdown item is available for this selection.</div> : (
            <div className="md-management-breakdown-grid">
              {managedRows.map(({ row, status }) => (
                <button
                  type="button"
                  key={row.key || row.label}
                  className={`md-management-breakdown-card ${status.statusClass}`}
                  onClick={() => openLevel3(row.level3Area || drill.area || "risk", row.level3Key || row.key, row.label)}
                >
                  <span className="md-level2-card-top">
                    <span>
                      {status.parent && <small className="md-parent-path">Parent: {status.parent}</small>}
                      <strong>{status.title}</strong>
                    </span>
                    <em className={`md-level2-status ${status.statusClass}`}>{status.statusLabel}</em>
                  </span>

                  <span className="md-level2-primary-metric">
                    <strong>{status.total.toLocaleString()}</strong>
                    <small>{drill.area === "resources" ? "Total endpoints" : drill.area === "actions" ? "Decision records" : "Total records"}</small>
                  </span>

                  <span className="md-level2-status-list">
                    <span><i className="dot healthy" />{status.active.toLocaleString()} active & stable</span>
                    <span><i className="dot watch" />{status.stale.toLocaleString()} no response / watch</span>
                    <span><i className="dot critical" />{status.critical.toLocaleString()} critical risk</span>
                  </span>

                  <span className="md-level2-segment" aria-hidden="true">
                    <i className="healthy" style={{ "--w": `${Math.max(4, status.activePct)}%` } as React.CSSProperties} />
                    <i className="watch" style={{ "--w": `${Math.max(4, status.stalePct)}%` } as React.CSSProperties} />
                    <i className="critical" style={{ "--w": `${Math.max(4, status.criticalPct)}%` } as React.CSSProperties} />
                  </span>

                  <span className="md-level2-action">{status.actionLabel} <Icon name="next" /></span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  function renderEvidenceView() {
    const rows = (drill.rows || []) as EvidenceRow[];
    return (
      <section className="md-view-panel">
        <div className="md-view-header">
          <div>
            <span className="md-view-eyebrow">Evidence Detail</span>
            <h2>{drill.title || "Evidence View"}</h2>
            <p>{Number(drill.total || rows.length || 0).toLocaleString()} record(s) found for this selection.</p>
          </div>
          <div className="md-view-actions">
            <button type="button" className="md-action-btn primary" onClick={backDrilldown}><Icon name="back" /> {drill.parent ? "Back to Breakdown" : "Back to Overview"}</button>
            <button type="button" className="md-action-btn" onClick={closeDrilldown}>Close</button>
          </div>
        </div>
        <div className="md-view-body">
          {drill.loading ? <div className="md-state-panel">Loading evidence...</div> : (
            <div className="md-table-wrap md-evidence-wrap">
              <table className="md-table">
                <thead>
                  <tr>
                    <th>Device</th>
                    <th>Department</th>
                    <th>Category</th>
                    <th>Brand / Model</th>
                    <th>Status</th>
                    <th>Age</th>
                    <th>Risk</th>
                    <th>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? <tr><td colSpan={8}>No evidence record found.</td></tr> : rows.map((row, index) => (
                    <tr key={row.assetKey || `${row.objectAgent}-${row.assetId}-${index}`}>
                      <td>{readText(row.deviceName)}</td>
                      <td>{readText(row.department)}</td>
                      <td>{readText(row.category)}</td>
                      <td>{readText(`${readText(row.brand, "")} ${readText(row.model, "")}`.trim())}</td>
                      <td>{readText(row.status)}</td>
                      <td>{readText(row.age)}</td>
                      <td>{readText(row.riskSeverity)} ({readText(row.riskScore, "0")})</td>
                      <td>{readText(row.replacementCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    );
  }

  const hasData = dashboard.executiveKpis.length > 0 || dashboard.pillars.length > 0 || dashboard.boardActions.length > 0;

  return (
    <div className="management-center-page">
      <style>{MANAGEMENT_DASHBOARD_INLINE_CSS}</style>
      <main className="management-module-root">
        <div className="md-content">
          {loading && <div className="md-state-panel">Loading management dashboard...</div>}
          {!loading && error && <div className="md-state-panel md-state-error">{error}</div>}
          {!loading && !error && !hasData && <div className="md-state-panel">No management insight is available right now.</div>}
          {!loading && !error && hasData && (drill.level === 2 ? renderBreakdownView() : drill.level === 3 ? renderEvidenceView() : renderOverview())}
        </div>
      </main>
    </div>
  );
}
