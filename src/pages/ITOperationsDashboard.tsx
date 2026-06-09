import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { getItOperationsDashboard, getItOperationsModule, getItOperationsDrilldown, getItOperationsRecordDetail } from '../services/itOperationService';
import {
  AlertTriangle,
  ChevronRight,
  Database,
  Download,
  Filter,
  Laptop,
  MapPin,
  Network,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Ticket,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';

type Tone = 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'cyan' | 'slate';
type AnyRecord = Record<string, any>;
type ModuleId =
  | 'hardware'
  | 'software'
  | 'network'
  | 'geolocation'
  | 'tasks'
  | 'serviceDesk'
  | 'patch'
  | 'risk'
  | 'departments'
  | 'alerts';

type ModuleConfig = {
  id: ModuleId;
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  tone: Tone;
  metric: (data: AnyRecord) => string;
  caption: (data: AnyRecord) => string;
  health: (data: AnyRecord) => number;
  metrics: (data: AnyRecord) => Array<{ label: string; value: string; helper?: string; tone?: Tone }>;
  rows: (data: AnyRecord) => AnyRecord[];
  rowTitle: string;
  actions: string[];
  viewId?: string;
  apiId?: ModuleId;
  usesLocalRows?: boolean;
};

const styles = `
.itopsx-shell{min-height:100%;padding:18px;background:radial-gradient(circle at 7% 0%,rgba(37,99,235,.10),transparent 28%),radial-gradient(circle at 96% 0%,rgba(6,182,212,.13),transparent 30%),linear-gradient(135deg,#f6f9fd 0%,#eef5ff 48%,#f9fbff 100%);color:#102450;font-family:'Plus Jakarta Sans',Inter,'Segoe UI',Arial,sans-serif}.itopsx-top{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:14px}.itopsx-eyebrow{margin:0 0 6px;color:#2563eb;font-size:10px;font-weight:950;letter-spacing:.16em;text-transform:uppercase}.itopsx-top h1{margin:0;font-size:30px;line-height:1.05;font-weight:950;letter-spacing:-.05em}.itopsx-top p{margin:7px 0 0;color:#667b9f;font-size:13px;font-weight:750}.itopsx-actions{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:9px}.itopsx-btn{min-height:40px;border:1px solid #dbe6f5;border-radius:14px;background:rgba(255,255,255,.9);color:#365174;padding:0 13px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font:inherit;font-size:12px;font-weight:850;box-shadow:0 10px 24px rgba(17,39,82,.06);cursor:pointer}.itopsx-btn.primary{border-color:transparent;color:#fff;background:linear-gradient(135deg,#2563eb,#1f5edb);box-shadow:0 14px 28px rgba(37,99,235,.22)}.itopsx-btn:disabled{opacity:.65;cursor:not-allowed}.itopsx-warning{margin:0 0 12px;padding:11px 13px;border:1px dashed #fecaca;border-radius:14px;background:#fff7f7;color:#b91c1c;font-size:12px;font-weight:850}.itopsx-banner{display:grid;grid-template-columns:minmax(0,1fr) minmax(360px,.72fr);gap:14px;margin-bottom:12px;padding:18px;border-radius:26px;border:1px solid rgba(219,230,245,.98);background:radial-gradient(circle at 95% 0%,rgba(255,255,255,.38),transparent 28%),linear-gradient(135deg,#fff 0%,#f6faff 100%);box-shadow:0 18px 40px rgba(17,39,82,.08)}.itopsx-banner.red{border-left:5px solid #ef4444}.itopsx-banner.amber{border-left:5px solid #f59e0b}.itopsx-banner.green{border-left:5px solid #16a34a}.itopsx-status{display:flex;align-items:center;gap:9px;margin-bottom:10px}.itopsx-pill{min-height:24px;display:inline-flex;align-items:center;justify-content:center;padding:0 9px;border-radius:999px;font-size:10.5px;line-height:1;font-weight:950;white-space:nowrap}.itopsx-pill.green{color:#15803d;background:#dcfce7}.itopsx-pill.amber{color:#b45309;background:#ffedd5}.itopsx-pill.red{color:#dc2626;background:#fee2e2}.itopsx-pill.blue{color:#2563eb;background:#dbeafe}.itopsx-pill.purple{color:#7c3aed;background:#ede9fe}.itopsx-pill.slate{color:#64748b;background:#f1f5f9}.itopsx-status span:last-child{color:#667b9f;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.12em}.itopsx-banner h2{margin:0;font-size:24px;line-height:1.06;font-weight:950;letter-spacing:-.045em}.itopsx-banner p{max-width:780px;margin:8px 0 0;color:#667b9f;font-size:13px;line-height:1.45;font-weight:750}.itopsx-mini-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.itopsx-card,.itopsx-panel,.itopsx-tile,.itopsx-modal-card{min-width:0;border:1px solid #dbe6f5;background:rgba(255,255,255,.94);box-shadow:0 18px 40px rgba(17,39,82,.08)}.itopsx-tile{padding:9px 10px;border-radius:15px;background:#fbfdff;box-shadow:none}.itopsx-tile span,.itopsx-card-label{display:block;color:#667b9f;font-size:10px;line-height:1.1;font-weight:950;letter-spacing:.08em;text-transform:uppercase}.itopsx-tile strong{display:block;margin-top:5px;color:#102450;font-size:14px;line-height:1.05;font-weight:950;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.itopsx-tile small{display:block;margin-top:5px;color:#667b9f;font-size:10.5px;font-weight:750}.itopsx-kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:14px}.itopsx-card{position:relative;min-height:178px;padding:15px;border-radius:22px;overflow:hidden;cursor:pointer;text-align:left;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease}.itopsx-card:before{content:'';position:absolute;inset:0 0 auto;height:4px;background:var(--tone)}.itopsx-card:after{content:'';position:absolute;width:130px;height:130px;right:-48px;top:-50px;border-radius:999px;background:var(--tone);opacity:.12}.itopsx-card:hover,.itopsx-panel:hover{transform:translateY(-2px);border-color:#9fc1ff;box-shadow:0 24px 56px rgba(17,39,82,.12)}.itopsx-card-top{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px}.itopsx-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:15px;color:var(--tone);background:color-mix(in srgb,var(--tone) 12%,white);border:1px solid color-mix(in srgb,var(--tone) 24%,white)}.itopsx-card-value{position:relative;z-index:1;display:block;margin-top:7px;font-size:31px;line-height:1;font-weight:950;letter-spacing:-.055em}.itopsx-card p{position:relative;z-index:1;margin:8px 0 0;color:#405879;font-size:12px;line-height:1.3;font-weight:850}.itopsx-card small{position:relative;z-index:1;display:block;margin-top:8px;color:#667b9f;font-size:11px;line-height:1.3;font-weight:750}.itopsx-card-metrics{position:relative;z-index:1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}.itopsx-module-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-bottom:14px}.itopsx-module-card{min-height:176px}.itopsx-panel-grid{display:grid;grid-template-columns:1.15fr 1fr 1.05fr;gap:12px}.itopsx-panel{padding:15px;border-radius:22px;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease;cursor:pointer}.itopsx-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}.itopsx-panel h2{margin:0;font-size:15px;font-weight:950;letter-spacing:-.025em}.itopsx-panel h3{margin:0 0 10px;font-size:13px;font-weight:950}.itopsx-panel p{margin:4px 0 0;color:#667b9f;font-size:12px;line-height:1.35;font-weight:700}.itopsx-panel select,.itopsx-search{min-height:38px;border:1px solid #dbe6f5;border-radius:14px;background:#fff;color:#365174;padding:0 11px;font:inherit;font-size:12px;font-weight:850}.itopsx-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.itopsx-summary.two{grid-template-columns:repeat(2,minmax(0,1fr))}.itopsx-chart{min-height:206px;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:10px;align-items:end;padding:8px 0 0}.itopsx-chart-col{min-width:0;display:grid;grid-template-rows:162px 20px;gap:6px;align-items:end;justify-items:center}.itopsx-chart-bars{width:100%;height:162px;display:flex;align-items:end;justify-content:center;gap:4px;padding:8px 6px;border-radius:14px;background:#f5f8fd;border:1px solid #edf2fa}.itopsx-chart-bars i{width:8px;min-height:8px;border-radius:999px 999px 4px 4px}.itopsx-chart-bars .new{background:#2563eb}.itopsx-chart-bars .resolved{background:#16a34a}.itopsx-chart-bars .open{background:#7c3aed}.itopsx-chart-col span{color:#667b9f;font-size:10px;font-weight:850}.itopsx-legend{display:flex;align-items:center;gap:14px;margin-bottom:8px;color:#667b9f;font-size:11px;font-weight:850}.itopsx-legend span{display:inline-flex;align-items:center;gap:6px}.itopsx-legend i{width:8px;height:8px;border-radius:50%}.itopsx-donut-layout{display:grid;grid-template-columns:154px minmax(0,1fr);gap:14px;align-items:center;min-height:246px}.itopsx-donut{width:145px;height:145px;display:grid;place-items:center;border-radius:50%;background:conic-gradient(#2563eb 0 var(--score),#eaf0f7 var(--score) 100%);box-shadow:0 16px 36px rgba(37,99,235,.14)}.itopsx-donut>div{width:86px;height:86px;display:grid;place-items:center;align-content:center;border-radius:50%;background:#fff;border:1px solid #dbe6f5;text-align:center}.itopsx-donut strong{font-size:27px;line-height:1;font-weight:950;letter-spacing:-.06em}.itopsx-donut span{color:#667b9f;font-size:10px;font-weight:900}.itopsx-list{display:grid;gap:8px}.itopsx-row{min-width:0;border:1px solid #dbe6f5;border-radius:15px;background:#fbfdff}.itopsx-domain-row{min-height:38px;display:grid;grid-template-columns:10px minmax(0,1fr) auto;align-items:center;gap:9px;padding:0 10px}.itopsx-domain-row i{width:8px;height:8px;border-radius:50%}.itopsx-domain-row span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:850}.itopsx-domain-row strong{font-size:12px;font-weight:950}.itopsx-bar-row{min-height:38px;display:grid;grid-template-columns:minmax(110px,1fr) minmax(80px,1.2fr) 64px;align-items:center;gap:10px;padding:8px 10px}.itopsx-bar-row>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#273f63;font-size:11.5px;font-weight:850}.itopsx-bar-row strong{justify-self:end;font-size:11.5px;font-weight:950}.itopsx-bar-track{height:8px;overflow:hidden;border-radius:999px;background:#eaf0f7}.itopsx-bar-track i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#2563eb,#06b6d4)}.itopsx-table-wrap{width:100%;overflow:auto;border:1px solid #dbe6f5;border-radius:16px;background:#fff}.itopsx-table{width:100%;border-collapse:collapse}.itopsx-table th,.itopsx-table td{padding:11px 12px;border-bottom:1px solid #dbe6f5;text-align:left;font-size:12px;white-space:nowrap}.itopsx-table th{color:#667b9f;background:#f8fbff;font-size:10px;font-weight:950;letter-spacing:.06em;text-transform:uppercase}.itopsx-table td:first-child{font-weight:850}.itopsx-table tr:last-child td{border-bottom:0}.itopsx-attention-row{min-height:52px;width:100%;display:grid;grid-template-columns:76px minmax(0,1fr) auto;align-items:center;gap:10px;padding:9px 10px;text-align:left;cursor:pointer}.itopsx-attention-row>span:first-child{color:#667b9f;font-size:9px;font-weight:950;letter-spacing:.08em;text-transform:uppercase}.itopsx-attention-row strong{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:950}.itopsx-attention-row small{display:block;margin-top:2px;color:#667b9f;font-size:10px;font-weight:750}.itopsx-risk-row{min-height:42px;display:grid;grid-template-columns:42px minmax(0,1fr) 48px;align-items:center;gap:9px;padding:8px 10px}.itopsx-risk-row span{color:#f59e0b;font-size:11px;font-weight:950}.itopsx-risk-row strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}.itopsx-risk-row b{justify-self:end;color:#ef4444;font-size:14px;font-weight:950}.itopsx-empty{display:grid;place-items:center;padding:12px;border:1px dashed #cfe0f8;border-radius:14px;background:#f8fbff;color:#667b9f;font-size:11px;line-height:1.35;font-weight:850;text-align:center}.itopsx-link{min-height:34px;display:inline-flex;align-items:center;gap:4px;margin-top:12px;padding:0;border:0;background:transparent;color:#2563eb;font:inherit;font-size:12px;font-weight:900;cursor:pointer}.itopsx-backdrop{position:fixed;inset:0;z-index:1500;display:grid;place-items:center;padding:22px;background:rgba(16,37,77,.48);backdrop-filter:blur(14px)}.itopsx-modal{width:min(1180px,calc(100vw - 44px));max-height:min(84dvh,840px);display:flex;flex-direction:column;overflow:hidden;border:1px solid #cfe0f8;border-radius:28px;background:#fff;box-shadow:0 30px 80px rgba(5,20,48,.26);animation:itopsxPop .18s ease both}.itopsx-modal-head{position:relative;flex:0 0 auto;display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:17px 18px 15px;border-bottom:1px solid #dbe6f5;background:radial-gradient(circle at 96% 0%,rgba(37,99,235,.12),transparent 34%),#fff}.itopsx-modal-accent{position:absolute;inset:0 0 auto;height:4px;background:var(--tone)}.itopsx-modal-title{display:flex;align-items:flex-start;gap:12px}.itopsx-modal-title h2{margin:0;font-size:22px;line-height:1.06;font-weight:950;letter-spacing:-.04em}.itopsx-modal-title p{margin:6px 0 0;color:#667b9f;font-size:12.5px;font-weight:750}.itopsx-close{flex:0 0 auto;min-height:40px;border:1px solid #dbe6f5;border-radius:14px;background:#fff;display:inline-flex;align-items:center;gap:8px;padding:0 13px;font:inherit;font-size:12px;font-weight:850;cursor:pointer}.itopsx-modal-body{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 292px;gap:14px;padding:16px 18px 18px;overflow:auto}.itopsx-modal-content{min-width:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-content:start;gap:12px}.itopsx-modal-story,.itopsx-modal-metrics,.itopsx-modal-card.full{grid-column:1/-1}.itopsx-modal-story{display:grid;grid-template-columns:minmax(250px,.78fr) minmax(0,1.22fr);gap:14px;padding:15px;border-radius:22px;border-left:5px solid var(--tone);box-shadow:0 10px 24px rgba(17,39,82,.06)}.itopsx-modal-story h3{margin:2px 0 6px;font-size:17px;line-height:1.12;font-weight:950;letter-spacing:-.035em}.itopsx-modal-story span{color:#667b9f;font-size:12px;line-height:1.4;font-weight:750}.itopsx-modal-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.itopsx-modal-card{padding:13px;border-radius:20px;box-shadow:0 10px 24px rgba(17,39,82,.06)}.itopsx-searchbox{min-height:38px;border:1px solid #dbe6f5;border-radius:14px;background:#fff;padding:0 11px;display:flex;align-items:center;gap:8px;color:#667b9f}.itopsx-searchbox input{border:0;outline:0;background:transparent;width:150px;color:#102450;font:inherit;font-size:12px}.itopsx-level3{position:sticky;top:0;align-self:start;padding:15px;border-radius:22px;border:1px solid #dbe6f5;background:radial-gradient(circle at 100% 0%,rgba(37,99,235,.11),transparent 36%),#fff;box-shadow:0 10px 24px rgba(17,39,82,.06)}.itopsx-level3 h3{margin:2px 0 7px;font-size:16px;line-height:1.12;font-weight:950;letter-spacing:-.03em}.itopsx-level3>span{display:block;color:#667b9f;font-size:12px;line-height:1.42;font-weight:750}.itopsx-action{display:flex;gap:10px;border:1px solid #dbe6f5;border-radius:17px;padding:11px;margin-top:9px;background:#fbfdff}.itopsx-action strong{font-size:12px}.itopsx-action p{margin:4px 0 0;color:#667b9f;font-size:11px;font-weight:750;line-height:1.35}.tone-blue{--tone:#2563eb}.tone-green{--tone:#16a34a}.tone-amber{--tone:#f59e0b}.tone-red{--tone:#ef4444}.tone-purple{--tone:#7c3aed}.tone-cyan{--tone:#06b6d4}.tone-slate{--tone:#64748b}@keyframes itopsxPop{from{opacity:0;transform:translateY(12px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}@media(max-width:1500px){.itopsx-module-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.itopsx-panel-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:1180px){.itopsx-banner,.itopsx-modal-body{grid-template-columns:1fr}.itopsx-level3{position:relative}.itopsx-modal-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:920px){.itopsx-shell{padding:12px}.itopsx-top{flex-direction:column}.itopsx-actions{justify-content:flex-start}.itopsx-kpi-grid,.itopsx-module-grid,.itopsx-panel-grid,.itopsx-mini-grid,.itopsx-summary,.itopsx-summary.two,.itopsx-donut-layout,.itopsx-modal-content,.itopsx-modal-story,.itopsx-modal-metrics{grid-template-columns:1fr}.itopsx-bar-row,.itopsx-attention-row{grid-template-columns:1fr}}
.itopsx-drill-row{width:100%;text-align:left;cursor:pointer}.itopsx-drill-row.active{border-color:#9fc1ff;background:#f3f8ff;box-shadow:0 8px 18px rgba(37,99,235,.10)}.itopsx-level3-title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}.itopsx-level3-title h3{margin:0}.itopsx-level3-title small{color:#667b9f;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}.itopsx-detail-block{margin-top:12px;padding:12px;border:1px solid #dbe6f5;border-radius:16px;background:#fbfdff}.itopsx-detail-block h4{margin:0 0 9px;font-size:12px;font-weight:950;letter-spacing:-.01em}.itopsx-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.itopsx-detail-item{min-width:0;padding:9px;border:1px solid #e4edf8;border-radius:13px;background:#fff}.itopsx-detail-item span{display:block;color:#667b9f;font-size:9.5px;font-weight:950;text-transform:uppercase;letter-spacing:.06em}.itopsx-detail-item strong{display:block;margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#102450;font-size:12px;font-weight:900}.itopsx-detail-note{margin:8px 0 0;color:#667b9f;font-size:11.5px;line-height:1.4;font-weight:750}.itopsx-action-btn{width:100%;min-height:38px;display:inline-flex;align-items:center;justify-content:center;gap:8px;margin-top:8px;border:1px solid #dbe6f5;border-radius:13px;background:#fff;color:#365174;font:inherit;font-size:12px;font-weight:900;cursor:pointer}.itopsx-action-btn.primary{border-color:transparent;color:#fff;background:linear-gradient(135deg,#2563eb,#1f5edb)}.itopsx-action-btn:disabled{opacity:.6;cursor:not-allowed}.itopsx-action-result{margin-top:10px;padding:9px 10px;border-radius:13px;background:#eff6ff;color:#1d4ed8;font-size:11.5px;font-weight:850;line-height:1.35}.itopsx-record-hint{display:flex;align-items:center;gap:8px;margin-top:10px;padding:9px 10px;border:1px dashed #cfe0f8;border-radius:14px;color:#667b9f;font-size:11.5px;font-weight:800;background:#f8fbff}.itopsx-pagination{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:11px;padding:9px 10px;border:1px solid #dbe6f5;border-radius:14px;background:#f8fbff}.itopsx-pagination span{color:#667b9f;font-size:11.5px;font-weight:850}.itopsx-pagination strong{color:#102450}.itopsx-pagination-actions{display:flex;align-items:center;gap:8px}.itopsx-page-btn{min-height:32px;border:1px solid #dbe6f5;border-radius:11px;background:#fff;color:#365174;padding:0 10px;font:inherit;font-size:11.5px;font-weight:900;cursor:pointer}.itopsx-page-btn:disabled{opacity:.45;cursor:not-allowed}
@media(max-width:760px){.itopsx-backdrop{padding:10px;place-items:stretch}.itopsx-modal{width:100%;max-height:calc(100dvh - 20px)}.itopsx-modal-head{flex-direction:column}.itopsx-close{width:100%;justify-content:center}}
`;

const num = (value: unknown, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const fmt = (value: unknown) => num(value).toLocaleString('en-US');
const safe = (value: unknown, fallback = '-') => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
};
const pct = (value: unknown) => Math.max(0, Math.min(100, num(value)));
const average = (values: number[]) => {
  const valid = values.filter((value) => Number.isFinite(value));
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0;
};
const toneClass = (tone: Tone) => `tone-${tone}`;
const cssVar = (name: string, value: string): CSSProperties => ({ [name]: value } as CSSProperties);

function getPath(source: AnyRecord, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as AnyRecord)[key];
  }, source);
}

function firstArray(data: AnyRecord, paths: string[]) {
  for (const path of paths) {
    const value = getPath(data, path);
    if (Array.isArray(value)) return value;
  }
  return [];
}

function badgeTone(value: unknown): Tone {
  const text = safe(value, '').toLowerCase();
  if (text.includes('critical') || text.includes('overdue') || text.includes('failed') || text.includes('red') || text.includes('high risk')) return 'red';
  if (text.includes('high') || text.includes('medium') || text.includes('warning') || text.includes('stale') || text.includes('amber')) return 'amber';
  if (text.includes('healthy') || text.includes('success') || text.includes('completed') || text.includes('green')) return 'green';
  if (text.includes('purple')) return 'purple';
  return 'blue';
}

function makeRows(items: unknown[], label = 'Item') {
  return (items || []).map((item, index) => {
    const row = (item && typeof item === 'object' ? item : { value: item }) as AnyRecord;
    const name = row.name || row.title || row.department || row.device || row.system || row.alert || row.label || `${label} ${index + 1}`;
    const detail = row.detail || row.description || row.status || row.owner || row.category || row.platform || row.location || row.subtitle || 'Live API record';
    const value = row.value ?? row.percent ?? row.score ?? row.count ?? row.assets ?? row.healthScore ?? row.severity ?? '';
    return { ...row, name, detail, value };
  });
}

function normalizeTrend(data: AnyRecord) {
  const trend = firstArray(data, ['incidentTrend', 'serviceDesk.incidentTrend', 'trend', 'incidentsTrend']);
  if (trend.length) return trend.slice(0, 7).map((item: AnyRecord, index: number) => ({
    day: safe(item.day || item.date || item.label, `Day ${index + 1}`),
    newIncidents: num(item.newIncidents ?? item.new ?? item.created),
    resolved: num(item.resolved ?? item.closed),
    open: num(item.open ?? item.backlog ?? item.pending),
  }));

  const open = num(data.serviceDesk?.openTickets || data.serviceDesk?.pendingTickets);
  const overdue = num(data.serviceDesk?.overdueTickets);
  return Array.from({ length: 7 }, (_, index) => ({
    day: `${index + 1} Jun`,
    newIncidents: Math.max(0, Math.round(open / 7) + (index % 2)),
    resolved: Math.max(0, Math.round((open - overdue) / 7)),
    open: Math.max(0, overdue + index),
  }));
}

function normalizeDomains(data: AnyRecord, modules: ModuleConfig[]) {
  const raw = firstArray(data, ['domainHealth', 'infrastructureHealth']);
  if (raw.length) {
    return raw.map((item: AnyRecord) => ({
      name: safe(item.name || item.label),
      percent: pct(item.percent ?? item.value ?? item.health),
      color: safe(item.color, '#2563eb'),
    }));
  }
  return modules.slice(0, 5).map((module) => ({ name: module.title, percent: module.health(data), color: toneColor(module.tone) }));
}

function toneColor(tone: Tone) {
  return {
    blue: '#2563eb',
    green: '#16a34a',
    amber: '#f59e0b',
    red: '#ef4444',
    purple: '#7c3aed',
    cyan: '#06b6d4',
    slate: '#64748b',
  }[tone];
}


const modalRedesignStyles = `
.itopsx-modal{width:min(1320px,calc(100vw - 44px));max-height:min(88dvh,900px)}
.itopsx-modal-body{grid-template-columns:minmax(0,1fr) 360px;gap:14px;background:linear-gradient(135deg,#f7fbff 0%,#eef5ff 100%)}
.itopsx-modal-content{display:grid;grid-template-columns:1fr;align-content:start;gap:12px}.itopsx-modal-card.full{grid-column:1/-1}
.itopsx-l2-brief{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(280px,.8fr);gap:14px;padding:16px;border-left:5px solid var(--tone);border-radius:22px;background:linear-gradient(135deg,#fff 0%,#fbfdff 100%)}
.itopsx-l2-brief h3{margin:0;font-size:19px;line-height:1.15;font-weight:950;letter-spacing:-.035em}.itopsx-l2-brief p{margin:8px 0 0;color:#667b9f;font-size:12.5px;line-height:1.45;font-weight:760}.itopsx-l2-context{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:13px}.itopsx-l2-context div{padding:10px;border:1px solid #dbe6f5;border-radius:15px;background:#fbfdff}.itopsx-l2-context span{display:block;color:#667b9f;font-size:9.5px;font-weight:950;letter-spacing:.08em;text-transform:uppercase}.itopsx-l2-context strong{display:block;margin-top:6px;font-size:14px;font-weight:950;color:#102450}.itopsx-l2-context small{display:block;margin-top:4px;color:#667b9f;font-size:10.5px;font-weight:750;line-height:1.35}
.itopsx-l2-side{display:grid;gap:10px}.itopsx-explain{padding:12px;border:1px solid #dbe6f5;border-radius:18px;background:#f8fbff}.itopsx-explain strong{display:block;font-size:13px;font-weight:950}.itopsx-explain span{display:block;margin-top:6px;color:#667b9f;font-size:11.5px;line-height:1.42;font-weight:750}
.itopsx-metric-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.itopsx-visual-layout{display:grid;grid-template-columns:1.05fr .95fr;gap:12px}.itopsx-visual-card{padding:14px;border-radius:20px}.itopsx-visual-card h3{margin:0;font-size:15px;font-weight:950;letter-spacing:-.02em}.itopsx-visual-card p{margin:5px 0 0;color:#667b9f;font-size:12px;line-height:1.4;font-weight:750}
.itopsx-segment{height:14px;display:flex;overflow:hidden;border-radius:999px;border:1px solid #dfe8f5;background:#eaf0f7}.itopsx-segment span{height:100%;display:block}.itopsx-segment-legend{display:grid;gap:8px;margin-top:10px}.itopsx-segment-row{display:grid;grid-template-columns:10px minmax(0,1fr) auto;align-items:center;gap:8px}.itopsx-segment-row i{width:10px;height:10px;border-radius:50%}.itopsx-segment-row span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#273f63;font-size:11.5px;font-weight:850}.itopsx-segment-row strong{font-size:11.5px;font-weight:950}
.itopsx-stack-chart{display:grid;gap:10px;margin-top:13px}.itopsx-stack-row{display:grid;grid-template-columns:minmax(100px,.7fr) minmax(0,1.3fr) auto;gap:10px;align-items:center;padding:10px;border:1px solid #dbe6f5;border-radius:15px;background:#fbfdff}.itopsx-stack-row span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#273f63;font-size:12px;font-weight:850}.itopsx-stack-row strong{font-size:12px;font-weight:950}.itopsx-stack-track{height:10px;border-radius:999px;background:#eaf0f7;overflow:hidden}.itopsx-stack-track i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--tone),#06b6d4)}
.itopsx-focus-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}.itopsx-focus-module-card{min-width:0;text-align:left;border:1px solid #dbe6f5;border-radius:18px;background:#fbfdff;padding:12px;cursor:pointer;transition:all .16s ease}.itopsx-focus-module-card:hover,.itopsx-focus-module-card.active{border-color:#9fc1ff;background:#f3f8ff;transform:translateY(-1px);box-shadow:0 12px 28px rgba(37,99,235,.10)}.itopsx-focus-module-card span{display:block;color:#667b9f;font-size:9.5px;font-weight:950;letter-spacing:.08em;text-transform:uppercase}.itopsx-focus-module-card h4{margin:7px 0 5px;font-size:13.5px;font-weight:950;line-height:1.2}.itopsx-focus-module-card p{margin:0;color:#667b9f;font-size:11.2px;font-weight:750;line-height:1.35}.itopsx-card-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px}.itopsx-chip-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.itopsx-chip{display:inline-flex;align-items:center;min-height:23px;padding:0 8px;border:1px solid #dbe6f5;border-radius:999px;background:#fff;color:#365174;font-size:10.5px;font-weight:850;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.itopsx-record-board{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.itopsx-record-visual{width:100%;min-width:0;text-align:left;border:1px solid #dbe6f5;border-radius:18px;background:linear-gradient(180deg,#fff 0%,#fbfdff 100%);padding:14px;cursor:pointer;transition:all .16s ease;box-shadow:0 10px 24px rgba(17,39,82,.05)}.itopsx-record-visual:hover,.itopsx-record-visual.active{border-color:#9fc1ff;background:#f8fbff;transform:translateY(-2px);box-shadow:0 18px 34px rgba(17,39,82,.10)}.itopsx-record-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.itopsx-record-head small{display:block;color:#667b9f;font-size:9.5px;font-weight:950;letter-spacing:.08em;text-transform:uppercase}.itopsx-record-head h4{margin:5px 0 0;font-size:15px;font-weight:950;line-height:1.18}.itopsx-record-visual p{margin:8px 0 0;color:#667b9f;font-size:11.5px;line-height:1.38;font-weight:750}.itopsx-record-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:11px}.itopsx-fact{min-width:0;padding:9px;border:1px solid #e4edf8;border-radius:13px;background:#fff}.itopsx-fact span{display:block;color:#667b9f;font-size:9px;font-weight:950;letter-spacing:.06em;text-transform:uppercase}.itopsx-fact strong{display:block;margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#102450;font-size:11.5px;font-weight:900}.itopsx-record-action{display:flex;align-items:center;justify-content:space-between;margin-top:12px;color:#2563eb;font-size:11.5px;font-weight:900}
.itopsx-sla-lanes{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px}.itopsx-lane{padding:12px;border:1px solid #dbe6f5;border-radius:16px;background:#fbfdff;min-height:108px}.itopsx-lane span{display:block;color:#667b9f;font-size:10px;font-weight:950;letter-spacing:.08em;text-transform:uppercase}.itopsx-lane strong{display:block;margin-top:8px;font-size:24px;font-weight:950}.itopsx-lane small{display:block;margin-top:6px;color:#667b9f;font-size:10.5px;font-weight:750;line-height:1.35}
.itopsx-map-list{display:grid;gap:8px;margin-top:12px}.itopsx-map-row{display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:10px;align-items:center;padding:9px 10px;border:1px solid #dbe6f5;border-radius:15px;background:#fbfdff}.itopsx-map-pin{width:34px;height:34px;border-radius:13px;display:grid;place-items:center;color:var(--tone);background:color-mix(in srgb,var(--tone) 12%,white);border:1px solid color-mix(in srgb,var(--tone) 24%,white)}.itopsx-map-row strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}.itopsx-map-row small{display:block;margin-top:2px;color:#667b9f;font-size:10.5px;font-weight:750}.itopsx-pipeline{display:flex;align-items:center;gap:8px;margin-top:16px;overflow:auto;padding-bottom:4px}.itopsx-pipe-node{min-width:132px;padding:12px;border:1px solid #dbe6f5;border-radius:16px;background:#fbfdff}.itopsx-pipe-node span{display:block;color:#667b9f;font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.08em}.itopsx-pipe-node strong{display:block;margin-top:8px;font-size:24px;font-weight:950}.itopsx-pipe-arrow{color:#9bb1cf;font-weight:950}.itopsx-heat-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px}.itopsx-heat-cell{min-height:70px;padding:10px;border-radius:15px;border:1px solid #dbe6f5;background:#fbfdff}.itopsx-heat-cell span{display:block;color:#667b9f;font-size:10px;font-weight:950;letter-spacing:.08em;text-transform:uppercase}.itopsx-heat-cell strong{display:block;margin-top:8px;font-size:20px;font-weight:950}.itopsx-heat-cell small{display:block;margin-top:4px;color:#667b9f;font-size:10px;font-weight:750}
.itopsx-level3{padding:14px 14px 16px;background:linear-gradient(180deg,#fefeff 0%,#f8fbff 100%)}.itopsx-detail-hero{padding:14px;border:1px solid #dbe6f5;border-radius:20px;background:radial-gradient(circle at 100% 0%,rgba(37,99,235,.08),transparent 34%),#fff}.itopsx-detail-hero small{display:block;color:#667b9f;font-size:9.5px;font-weight:950;letter-spacing:.08em;text-transform:uppercase}.itopsx-detail-hero h3{margin:6px 0 0;font-size:18px;line-height:1.2;font-weight:950}.itopsx-detail-hero p{margin:8px 0 0;color:#667b9f;font-size:11.8px;line-height:1.45;font-weight:750}.itopsx-detail-status{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:13px}.itopsx-detail-status-card{flex:1;min-width:0;padding:10px;border:1px solid #dbe6f5;border-radius:15px;background:#fbfdff}.itopsx-detail-status-card span{display:block;color:#667b9f;font-size:9px;font-weight:950;letter-spacing:.06em;text-transform:uppercase}.itopsx-detail-status-card strong{display:block;margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:900}.itopsx-evidence-grid{display:grid;gap:10px;margin-top:12px}.itopsx-evidence-card{padding:12px;border:1px solid #dbe6f5;border-radius:18px;background:#fff}.itopsx-evidence-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px}.itopsx-evidence-card h4{margin:0;font-size:12.5px;font-weight:950;letter-spacing:-.01em}.itopsx-evidence-card p{margin:7px 0 0;color:#667b9f;font-size:11.2px;line-height:1.4;font-weight:750}.itopsx-data-cloud{display:flex;flex-wrap:wrap;gap:8px}.itopsx-data-badge{min-width:0;flex:1 1 44%;padding:9px 10px;border:1px solid #e4edf8;border-radius:14px;background:#fbfdff}.itopsx-data-badge span{display:block;color:#667b9f;font-size:9px;font-weight:950;letter-spacing:.06em;text-transform:uppercase}.itopsx-data-badge strong{display:block;margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#102450;font-size:11.5px;font-weight:900}.itopsx-drawer-actions{display:grid;gap:8px}.itopsx-drawer-actions .itopsx-action-btn{margin-top:0}.itopsx-action-btn{width:100%;min-height:38px;display:inline-flex;align-items:center;justify-content:center;gap:8px;margin-top:8px;border:1px solid #dbe6f5;border-radius:13px;background:#fff;color:#365174;font:inherit;font-size:12px;font-weight:900;cursor:pointer}.itopsx-action-btn.primary{border-color:transparent;color:#fff;background:linear-gradient(135deg,#2563eb,#1f5edb)}.itopsx-action-btn:disabled{opacity:.6;cursor:not-allowed}.itopsx-action-result{margin-top:10px;padding:9px 10px;border-radius:13px;background:#eff6ff;color:#1d4ed8;font-size:11.5px;font-weight:850;line-height:1.35}.itopsx-record-hint{display:flex;align-items:center;gap:8px;margin-top:10px;padding:9px 10px;border:1px dashed #cfe0f8;border-radius:14px;color:#667b9f;font-size:11.5px;font-weight:800;background:#f8fbff}.itopsx-empty-visual{display:grid;place-items:center;min-height:180px;padding:16px;border:1px dashed #cfe0f8;border-radius:18px;background:#f8fbff;color:#667b9f;font-size:12px;font-weight:850;text-align:center}.itopsx-pagination{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:11px;padding:9px 10px;border:1px solid #dbe6f5;border-radius:14px;background:#f8fbff}.itopsx-pagination span{color:#667b9f;font-size:11.5px;font-weight:850}.itopsx-pagination strong{color:#102450}.itopsx-pagination-actions{display:flex;align-items:center;gap:8px}.itopsx-page-btn{min-height:32px;border:1px solid #dbe6f5;border-radius:11px;background:#fff;color:#365174;padding:0 10px;font:inherit;font-size:11.5px;font-weight:900;cursor:pointer}.itopsx-page-btn:disabled{opacity:.45;cursor:not-allowed}
@media(max-width:1280px){.itopsx-modal-body,.itopsx-l2-brief,.itopsx-visual-layout{grid-template-columns:1fr}.itopsx-level3{position:relative}.itopsx-record-board{grid-template-columns:1fr}.itopsx-focus-grid{grid-template-columns:1fr}.itopsx-sla-lanes,.itopsx-heat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:820px){.itopsx-l2-context,.itopsx-metric-strip,.itopsx-record-facts,.itopsx-sla-lanes,.itopsx-heat-grid{grid-template-columns:1fr}.itopsx-record-board{grid-template-columns:1fr}.itopsx-modal-body{padding:12px}.itopsx-modal{width:calc(100vw - 20px)}}
`;

const TONE_HEX: Record<Tone, string> = { blue: "#2563eb", green: "#16a34a", amber: "#f59e0b", red: "#ef4444", purple: "#7c3aed", cyan: "#06b6d4", slate: "#64748b" };

const modules: ModuleConfig[] = [
  {
    id: 'hardware', title: 'Hardware Inventory', subtitle: 'Endpoint availability and sync', description: 'Devices, online/offline coverage, stale check-ins, and hardware source visibility.', icon: Laptop, tone: 'blue',
    metric: d => fmt(d.hardware?.totalDevices), caption: d => `${fmt(d.hardware?.onlineDevices)} online / ${fmt(d.hardware?.offlineDevices)} offline`, health: d => pct(num(d.hardware?.onlineDevices) / Math.max(num(d.hardware?.totalDevices), 1) * 100),
    metrics: d => [{ label: 'Total Devices', value: fmt(d.hardware?.totalDevices) }, { label: 'Online', value: fmt(d.hardware?.onlineDevices), tone: 'green' }, { label: 'Offline', value: fmt(d.hardware?.offlineDevices), tone: 'red' }, { label: 'Stale Sync', value: fmt(d.hardware?.staleSync), tone: 'amber' }],
    rows: d => makeRows(firstArray(d, ['hardware.platformBreakdown', 'hardware.topModels', 'hardware.devices']), 'Hardware'), rowTitle: 'Hardware records', actions: [],
  },
  {
    id: 'software', title: 'Software Inventory', subtitle: 'Installed app visibility', description: 'Unique software, install volume, category coverage, and unclassified applications.', icon: Database, tone: 'green',
    metric: d => fmt(d.software?.uniqueSoftware), caption: d => `${fmt(d.software?.unclassifiedSoftware)} unclassified row(s)`, health: d => 100 - pct(num(d.software?.unclassifiedSoftware) / Math.max(num(d.software?.uniqueSoftware), 1) * 100),
    metrics: d => [{ label: 'Unique Software', value: fmt(d.software?.uniqueSoftware) }, { label: 'Installations', value: fmt(d.software?.totalInstallations) }, { label: 'Devices', value: fmt(d.software?.devicesWithSoftware) }, { label: 'Unclassified', value: fmt(d.software?.unclassifiedSoftware), tone: 'amber' }],
    rows: d => makeRows(firstArray(d, ['software.topCategories', 'software.topSoftware', 'software.categories']), 'Software'), rowTitle: 'Software groups', actions: [],
  },
  {
    id: 'network', title: 'Network Inventory', subtitle: 'IP scan and registration', description: 'Known IP records, registered devices, unregistered IPs, and subnet coverage.', icon: Network, tone: 'cyan',
    metric: d => fmt(d.network?.knownIps ?? d.network?.knownIpRecords ?? d.network?.activeIps), caption: d => `${fmt(d.network?.unregisteredIps)} unregistered IP(s)`, health: d => 100 - pct(num(d.network?.unregisteredIps) / Math.max(num(d.network?.knownIps ?? d.network?.knownIpRecords ?? d.network?.activeIps), 1) * 100),
    metrics: d => [{ label: 'Known IP', value: fmt(d.network?.knownIps ?? d.network?.knownIpRecords ?? d.network?.activeIps) }, { label: 'Registered', value: fmt(d.network?.registeredDevices ?? d.network?.registeredIps), tone: 'green' }, { label: 'Unregistered', value: fmt(d.network?.unregisteredIps), tone: 'amber' }, { label: 'Subnets', value: fmt(d.network?.subnetCount ?? d.network?.subnets) }],
    rows: d => makeRows(firstArray(d, ['network.workgroups', 'network.subnets', 'network.topSubnets']), 'Network'), rowTitle: 'Network coverage records', actions: [],
  },
  {
    id: 'geolocation', title: 'Geolocation', subtitle: 'Live location tracking', description: 'MDM live location tracking status and latest location coverage.', icon: MapPin, tone: 'purple',
    metric: d => fmt(d.geolocation?.liveLocationActiveDevices ?? d.geolocation?.activeLiveLocations ?? 0), caption: d => `${fmt(d.geolocation?.liveLocationInactiveDevices ?? d.geolocation?.inactiveLiveLocations ?? 0)} inactive live location`, health: d => pct(num(d.geolocation?.liveLocationActiveDevices ?? d.geolocation?.activeLiveLocations) / Math.max(num(d.geolocation?.liveLocationActiveDevices ?? d.geolocation?.activeLiveLocations) + num(d.geolocation?.liveLocationInactiveDevices ?? d.geolocation?.inactiveLiveLocations), 1) * 100),
    metrics: d => [{ label: 'Live Active', value: fmt(d.geolocation?.liveLocationActiveDevices ?? d.geolocation?.activeLiveLocations), tone: 'green' }, { label: 'Live Inactive', value: fmt(d.geolocation?.liveLocationInactiveDevices ?? d.geolocation?.inactiveLiveLocations), tone: 'red' }, { label: 'Tracked', value: fmt(d.geolocation?.trackedDevices), tone: 'purple' }, { label: 'Latest', value: safe(d.geolocation?.latestLocationTime) }],
    rows: d => makeRows(firstArray(d, ['geolocation.topLocations', 'geolocation.locations']), 'Location'), rowTitle: 'Location coverage', actions: [],
  },
  {
    id: 'tasks', title: 'Task List', subtitle: 'Automation job queue', description: 'Running, completed, failed, stopped, and cancelled operational tasks.', icon: Wrench, tone: 'amber',
    metric: d => fmt(d.tasks?.runningTasks), caption: d => `${fmt(d.tasks?.failedTasks)} failed / ${fmt(d.tasks?.completedTasks)} completed`, health: d => 100 - pct(num(d.tasks?.failedTasks) / Math.max(num(d.tasks?.totalTasks), 1) * 100),
    metrics: d => [{ label: 'Running', value: fmt(d.tasks?.runningTasks) }, { label: 'Completed', value: fmt(d.tasks?.completedTasks), tone: 'green' }, { label: 'Failed', value: fmt(d.tasks?.failedTasks), tone: 'red' }, { label: 'Latest', value: safe(d.tasks?.latestTaskTime) }],
    rows: d => makeRows(firstArray(d, ['tasks.recentTasks', 'tasks.topTasks', 'tasks.failedJobs']), 'Task'), rowTitle: 'Task queue records', actions: [],
  },
  {
    id: 'serviceDesk', title: 'Service Desk', subtitle: 'Incident and SLA pressure', description: 'Open incidents, overdue tickets, SLA health, and priority mix.', icon: Ticket, tone: 'amber',
    metric: d => fmt(d.serviceDesk?.openTickets ?? d.serviceDesk?.pendingTickets), caption: d => `${fmt(d.serviceDesk?.overdueTickets)} overdue ticket(s)`, health: d => 100 - pct(num(d.serviceDesk?.overdueTickets) / Math.max(num(d.serviceDesk?.openTickets ?? d.serviceDesk?.pendingTickets), 1) * 100),
    metrics: d => [{ label: 'Open', value: fmt(d.serviceDesk?.openTickets ?? d.serviceDesk?.pendingTickets) }, { label: 'Pending', value: fmt(d.serviceDesk?.pendingTickets) }, { label: 'Overdue', value: fmt(d.serviceDesk?.overdueTickets), tone: 'red' }, { label: 'Critical', value: fmt(d.serviceDesk?.criticalTickets) }],
    rows: d => makeRows(firstArray(d, ['serviceDesk.priorityBreakdown', 'serviceDesk.recentTickets', 'serviceDesk.slaBreakdown']), 'Ticket'), rowTitle: 'Service desk records', actions: [],
  },
  {
    id: 'patch', title: 'Patch Compliance', subtitle: 'Department compliance and vulnerability pressure', description: 'Compliance rate, critical missing patches, and department readiness.', icon: ShieldCheck, tone: 'green',
    metric: d => `${pct(d.patch?.compliancePercent ?? d.patch?.overallCompliance).toFixed(1)}%`, caption: d => `${fmt(d.patch?.missingCriticalPatches ?? d.patch?.criticalMissing)} missing patches`, health: d => pct(d.patch?.compliancePercent ?? d.patch?.overallCompliance),
    metrics: d => [{ label: 'Compliance', value: `${pct(d.patch?.compliancePercent ?? d.patch?.overallCompliance).toFixed(1)}%`, tone: 'green' }, { label: 'Missing Critical', value: fmt(d.patch?.missingCriticalPatches ?? d.patch?.criticalMissing), tone: 'red' }, { label: 'Departments', value: fmt((d.patchDepartments || []).length) }, { label: 'Measured', value: fmt(d.patch?.measuredDepartments) }],
    rows: d => makeRows(d.patchDepartments || [], 'Department'), rowTitle: 'Patch compliance by department', actions: [],
  },
  {
    id: 'risk', title: 'Risk Center', subtitle: 'Critical findings and exposure', description: 'Risk score, high risk signals, critical vulnerabilities, and problematic devices.', icon: ShieldAlert, tone: 'red',
    metric: d => fmt(d.risk?.criticalRiskSignals ?? d.risk?.criticalFindings), caption: d => `${fmt(d.risk?.highRiskSignals)} high risk(s) / score ${fmt(d.risk?.score)}`, health: d => 100 - pct(d.risk?.score),
    metrics: d => [{ label: 'Risk Score', value: fmt(d.risk?.score), tone: 'red' }, { label: 'Critical', value: fmt(d.risk?.criticalRiskSignals ?? d.risk?.criticalFindings), tone: 'red' }, { label: 'High Risk', value: fmt(d.risk?.highRiskSignals), tone: 'amber' }, { label: 'Signals', value: fmt(d.risk?.totalSignals) }],
    rows: d => makeRows([...(d.problematicSystems || []), ...(d.risk?.topFindings || [])], 'Risk'), rowTitle: 'Risk and problematic devices', actions: [],
  },
  {
    id: 'departments', title: 'Department Health', subtitle: 'Assets, patch, incidents by department', description: 'Department scorecard with asset volume, patch readiness, incidents, and health score.', icon: Users, tone: 'blue',
    metric: d => fmt((d.departmentRows || d.departmentHealth || []).length), caption: d => `${fmt((d.departmentRows || d.departmentHealth || []).reduce((sum: number, row: AnyRecord) => sum + num(row.openIncidents), 0))} open incident(s)`, health: d => average((d.departmentRows || d.departmentHealth || []).map((row: AnyRecord) => pct(row.healthScore))),
    metrics: d => [{ label: 'Departments', value: fmt((d.departmentRows || d.departmentHealth || []).length) }, { label: 'Avg Health', value: `${average((d.departmentRows || d.departmentHealth || []).map((row: AnyRecord) => pct(row.healthScore))).toFixed(1)}%` }, { label: 'Open Incidents', value: fmt((d.departmentRows || d.departmentHealth || []).reduce((sum: number, row: AnyRecord) => sum + num(row.openIncidents), 0)) }, { label: 'Assets', value: fmt((d.departmentRows || d.departmentHealth || []).reduce((sum: number, row: AnyRecord) => sum + num(row.assets), 0)) }],
    rows: d => makeRows(d.departmentRows || d.departmentHealth || [], 'Department'), rowTitle: 'Department scorecard', actions: [],
  },
  {
    id: 'alerts', title: 'Alerts & Attention', subtitle: 'Follow-up queue and active alerts', description: 'Active alerts, attention queue, and problematic systems needing follow-up.', icon: AlertTriangle, tone: 'red',
    metric: d => fmt((d.activeAlerts || []).length), caption: d => `${fmt((d.attentionQueue || []).length)} attention item(s)`, health: d => 100 - Math.min(100, (d.activeAlerts || []).length * 10),
    metrics: d => [{ label: 'Active Alerts', value: fmt((d.activeAlerts || []).length), tone: 'red' }, { label: 'Attention Items', value: fmt((d.attentionQueue || []).length) }, { label: 'Problem Systems', value: fmt((d.problematicSystems || []).length) }, { label: 'Critical', value: fmt((d.activeAlerts || []).filter((row: AnyRecord) => safe(row.severity).toLowerCase() === 'critical').length), tone: 'red' }],
    rows: d => makeRows([...(d.activeAlerts || []), ...(d.attentionQueue || []), ...(d.problematicSystems || [])], 'Alert'), rowTitle: 'Active follow-up queue', actions: [],
  },
];

function MetricTile({ label, value, helper, tone = 'slate' }: { label: string; value: string; helper?: string; tone?: Tone }) {
  return <div className={`itopsx-tile tone-${tone}`}><span>{label}</span><strong>{value}</strong>{helper && <small>{helper}</small>}</div>;
}

function EmptyState({ text = 'No live API records returned for this section.' }: { text?: string }) {
  return <div className="itopsx-empty">{text}</div>;
}

function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`itopsx-pill ${tone}`}>{children}</span>;
}

function ExecutiveCard({ module, data, onOpen }: { module: ModuleConfig; data: AnyRecord; onOpen: (module: ModuleConfig) => void }) {
  const Icon = module.icon;
  const health = module.health(data);
  const traffic: Tone = health < 50 ? 'red' : health < 80 ? 'amber' : 'green';
  return (
    <button type="button" className={`itopsx-card ${toneClass(module.tone)}`} onClick={() => onOpen(module)}>
      <div className="itopsx-card-top">
        <span className="itopsx-icon"><Icon size={21} /></span>
        <Pill tone={traffic}>{traffic === 'red' ? 'Critical' : traffic === 'amber' ? 'Watch' : 'Healthy'}</Pill>
      </div>
      <span className="itopsx-card-label">{module.title}</span>
      <strong className="itopsx-card-value">{module.metric(data)}</strong>
      <p>{module.caption(data)}</p>
      <small>{module.subtitle}</small>
    </button>
  );
}

function ModuleCard({ module, data, onOpen }: { module: ModuleConfig; data: AnyRecord; onOpen: (module: ModuleConfig) => void }) {
  const Icon = module.icon;
  const metrics = module.metrics(data).slice(0, 3);
  return (
    <button type="button" className={`itopsx-card itopsx-module-card ${toneClass(module.tone)}`} onClick={() => onOpen(module)}>
      <div className="itopsx-card-top"><span className="itopsx-icon"><Icon size={21} /></span><ChevronRight size={16} /></div>
      <span className="itopsx-card-label">{module.title}</span>
      <strong className="itopsx-card-value">{module.metric(data)}</strong>
      <p>{module.caption(data)}</p>
      <div className="itopsx-card-metrics">
        {metrics.map((metric) => <MetricTile key={metric.label} label={metric.label} value={metric.value} tone={metric.tone || 'slate'} />)}
      </div>
    </button>
  );
}

function BarList({ items, emptyLabel = 'No data available yet.' }: { items: AnyRecord[]; emptyLabel?: string }) {
  if (!items.length) return <EmptyState text={emptyLabel} />;
  const max = Math.max(...items.map((item) => num(item.percent ?? item.value)), 1);
  return (
    <div className="itopsx-list">
      {items.slice(0, 7).map((item, index) => {
        const raw = num(item.percent ?? item.value);
        const percent = item.percent !== undefined ? pct(item.percent) : Math.min(100, (raw / max) * 100);
        return <div className="itopsx-row itopsx-bar-row" key={`${safe(item.name || item.label)}-${index}`}><span>{safe(item.name || item.label)}</span><div className="itopsx-bar-track"><i style={{ width: `${percent}%` }} /></div><strong>{item.percent !== undefined ? `${percent.toFixed(1)}%` : fmt(raw)}</strong></div>;
      })}
    </div>
  );
}

function DataRows({ rows, emptyText, onSelect, selectedKey }: { rows: AnyRecord[]; emptyText?: string; onSelect?: (row: AnyRecord, index: number) => void; selectedKey?: string }) {
  if (!rows.length) return <EmptyState text={emptyText} />;
  return (
    <div className="itopsx-list">
      {rows.slice(0, 9).map((row, index) => {
        const tone = badgeTone(row.severity || row.tone || row.status || row.value || row.detail);
        const key = getRecordId(row, index);
        const rowBody = <><span>{safe(row.module || row.category || row.severity || row.source || 'Item')}</span><div><strong>{safe(row.name)}</strong><small>{safe(row.detail)}</small></div><Pill tone={tone}>{row.value !== '' ? safe(row.value) : 'View'}</Pill></>;
        if (!onSelect) return <div className="itopsx-row itopsx-attention-row" key={`${key}-${index}`}>{rowBody}</div>;
        return <button type="button" className={`itopsx-row itopsx-attention-row itopsx-drill-row ${selectedKey === key ? 'active' : ''}`} key={`${key}-${index}`} onClick={() => onSelect(row, index)}>{rowBody}</button>;
      })}
    </div>
  );
}

function IncidentTrendChart({ points }: { points: ReturnType<typeof normalizeTrend> }) {
  const max = Math.max(...points.flatMap((item) => [item.newIncidents, item.resolved, item.open]), 1);
  return (
    <div className="itopsx-chart">
      {points.map((item) => <div className="itopsx-chart-col" key={item.day}><div className="itopsx-chart-bars"><i className="new" style={{ height: `${Math.max(5, (item.newIncidents / max) * 100)}%` }} /><i className="resolved" style={{ height: `${Math.max(5, (item.resolved / max) * 100)}%` }} /><i className="open" style={{ height: `${Math.max(5, (item.open / max) * 100)}%` }} /></div><span>{item.day}</span></div>)}
    </div>
  );
}

function DonutScore({ percent }: { percent: number }) {
  return <div className="itopsx-donut" style={cssVar('--score', `${pct(percent)}%`)}><div><strong>{Math.round(pct(percent))}%</strong><span>Health</span></div></div>;
}

function Panel({ title, description, children, onOpen }: { title: string; description?: string; children: ReactNode; onOpen?: () => void }) {
  return <article className="itopsx-panel" role={onOpen ? 'button' : undefined} tabIndex={onOpen ? 0 : undefined} onClick={onOpen}><div className="itopsx-panel-head"><div><h2>{title}</h2>{description && <p>{description}</p>}</div></div>{children}</article>;
}


function getRecordId(row: AnyRecord, index = 0) {
  return safe(row.id ?? row.IncidentID ?? row.incidentId ?? row.assetId ?? row.deviceId ?? row.DeviceID ?? row.ipAddress ?? row.name ?? `row-${index}`);
}

function detailPairsFrom(value: unknown, limit = 8) {
  if (!value || typeof value !== 'object') return [] as Array<{ label: string; value: string }>;
  return Object.entries(value as AnyRecord)
    .filter(([, item]) => item !== undefined && item !== null && typeof item !== 'object' && String(item).trim() !== '')
    .slice(0, limit)
    .map(([label, item]) => ({ label, value: safe(item) }));
}


function inferRecordTone(row: AnyRecord): Tone {
  return badgeTone(row.severity || row.priority || row.status || row.value || row.detail || row.health || row.connectionStatus);
}

function recordImportance(row: AnyRecord) {
  const text = `${safe(row.severity, '')} ${safe(row.priority, '')} ${safe(row.status, '')} ${safe(row.value, '')} ${safe(row.detail, '')}`.toLowerCase();
  if (/critical|overdue|failed|offline|high risk|missing critical/.test(text)) return 4;
  if (/high|stale|unregistered|awaiting|warning|medium/.test(text)) return 3;
  if (/pending|progress|unknown|watch/.test(text)) return 2;
  return 1;
}

function summarizedPairs(row: AnyRecord, limit = 4) {
  const blacklist = new Set(['name', 'title', 'detail', 'description', 'value', 'severity', 'status', 'priority']);
  return detailPairsFrom(row, 18)
    .filter((item) => !blacklist.has(String(item.label)))
    .slice(0, limit);
}

function recordChips(row: AnyRecord, limit = 4) {
  const fields = ['status', 'priority', 'owner', 'assignedTo', 'department', 'source', 'category', 'subcategory', 'platform', 'model', 'location', 'subnet', 'requester', 'slaStatus'];
  const chips: string[] = [];
  fields.forEach((key) => {
    const value = safe(row[key], '').trim();
    if (value && value !== '-' && !chips.includes(value)) chips.push(value);
  });
  return chips.slice(0, limit);
}

function collectCounts(rows: AnyRecord[], keys: string[]) {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    for (const key of keys) {
      const label = safe(row[key], '').trim();
      if (label && label !== '-') {
        counts.set(label, (counts.get(label) || 0) + 1);
        return;
      }
    }
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value, tone: badgeTone(label) }));
}

function groupsToChart(groups: AnyRecord[], rows: AnyRecord[], fallbackKeys: string[]) {
  if (groups.length) {
    return groups
      .map((row) => ({
        label: safe(row.name || row.label || row.category || row.department || row.status || row.priority || 'Group'),
        value: num(row.value ?? row.total ?? row.assets ?? row.count ?? row.percent),
        percent: row.percent,
        tone: badgeTone(row.name || row.label || row.category || row.department || row.status || row.priority),
      }))
      .filter((item) => item.value > 0 || item.percent !== undefined)
      .slice(0, 8);
  }
  return collectCounts(rows, fallbackKeys).slice(0, 8);
}

function realPercentValue(value: unknown) {
  const numeric = num(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, numeric));
}

function statusText(row: AnyRecord) {
  return safe(row.status || row.priority || row.severity || row.value || row.connectionStatus || 'View');
}

function ModuleSegment({ items, emptyLabel }: { items: Array<{ label: string; value: number; percent?: unknown; tone?: Tone }>; emptyLabel: string }) {
  if (!items.length) return <EmptyState text={emptyLabel} />;
  const total = items.reduce((sum, item) => sum + Math.max(0, num(item.value)), 0) || 1;
  return (
    <div>
      <div className="itopsx-segment">
        {items.map((item) => {
          const width = item.percent !== undefined ? realPercentValue(item.percent) : (Math.max(0, num(item.value)) / total) * 100;
          const tone = item.tone || badgeTone(item.label);
          return <span key={item.label} title={`${item.label}: ${fmt(item.value)}`} style={{ width: `${Math.max(width, 4)}%`, background: TONE_HEX[tone] }} />;
        })}
      </div>
      <div className="itopsx-segment-legend">
        {items.map((item) => {
          const tone = item.tone || badgeTone(item.label);
          const labelValue = item.percent !== undefined ? `${realPercentValue(item.percent).toFixed(1)}%` : fmt(item.value);
          return <div className="itopsx-segment-row" key={item.label}><i style={{ background: TONE_HEX[tone] }} /><span>{item.label}</span><strong>{labelValue}</strong></div>;
        })}
      </div>
    </div>
  );
}

function BarComparison({ items, valueIsPercent = false, emptyLabel = 'No breakdown data returned.' }: { items: Array<{ label: string; value: number; percent?: unknown; tone?: Tone }>; valueIsPercent?: boolean; emptyLabel?: string }) {
  if (!items.length) return <EmptyState text={emptyLabel} />;
  const max = Math.max(...items.map((item) => valueIsPercent ? 100 : Math.max(1, num(item.value))), 1);
  return (
    <div className="itopsx-stack-chart">
      {items.slice(0, 8).map((item) => {
        const raw = item.percent !== undefined ? realPercentValue(item.percent) : num(item.value);
        const width = valueIsPercent || item.percent !== undefined ? realPercentValue(raw) : Math.min(100, (raw / max) * 100);
        const tone = item.tone || badgeTone(item.label);
        return <div className={`itopsx-stack-row ${toneClass(tone)}`} key={item.label}><span>{item.label}</span><div className="itopsx-stack-track"><i style={{ width: `${width}%` }} /></div><strong>{valueIsPercent || item.percent !== undefined ? `${realPercentValue(raw).toFixed(1)}%` : fmt(raw)}</strong></div>;
      })}
    </div>
  );
}

function LaneCard({ label, value, helper, tone = 'slate' }: { label: string; value: string; helper?: string; tone?: Tone }) {
  return <div className={`itopsx-lane ${toneClass(tone)}`}><span>{label}</span><strong>{value}</strong>{helper && <small>{helper}</small>}</div>;
}

function Pipeline({ items }: { items: Array<{ label: string; value: string; tone?: Tone }> }) {
  return <div className="itopsx-pipeline">{items.map((item, index) => <><div className={`itopsx-pipe-node ${toneClass(item.tone || 'slate')}`} key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>{index < items.length - 1 && <span className="itopsx-pipe-arrow" key={`${item.label}-arrow`}>→</span>}</>)}</div>;
}

function HeatGrid({ items }: { items: Array<{ label: string; value: string; helper?: string; tone?: Tone }> }) {
  return <div className="itopsx-heat-grid">{items.map((item) => <div className={`itopsx-heat-cell ${toneClass(item.tone || 'slate')}`} key={item.label}><span>{item.label}</span><strong>{item.value}</strong>{item.helper && <small>{item.helper}</small>}</div>)}</div>;
}

function MapList({ rows, onSelect, selectedKey }: { rows: AnyRecord[]; onSelect: (row: AnyRecord, index: number) => void; selectedKey: string }) {
  if (!rows.length) return <EmptyState text="No location/IP records returned." />;
  return <div className="itopsx-map-list">{rows.slice(0, 6).map((row, index) => {
    const key = getRecordId(row, index);
    return <button type="button" className={`itopsx-map-row itopsx-drill-row ${selectedKey === key ? 'active' : ''}`} key={`${key}-${index}`} onClick={() => onSelect(row, index)}><span className="itopsx-map-pin"><MapPin size={16} /></span><div><strong>{safe(row.name)}</strong><small>{safe(row.detail)}</small></div><Pill tone={inferRecordTone(row)}>{statusText(row)}</Pill></button>;
  })}</div>;
}

function FocusCard({ row, index, onSelect, active }: { row: AnyRecord; index: number; onSelect: (row: AnyRecord, index: number) => void; active: boolean }) {
  const tone = inferRecordTone(row);
  return (
    <button type="button" className={`itopsx-focus-module-card ${active ? 'active' : ''}`} onClick={() => onSelect(row, index)}>
      <span>{safe(row.module || row.category || row.source || row.severity || row.priority || 'Item')}</span>
      <h4>{safe(row.name)}</h4>
      <p>{safe(row.detail)}</p>
      <div className="itopsx-chip-row">{recordChips(row, 3).map((chip) => <span className="itopsx-chip" key={chip}>{chip}</span>)}</div>
      <div className="itopsx-card-foot"><Pill tone={tone}>{statusText(row)}</Pill><ChevronRight size={15} /></div>
    </button>
  );
}

function RecordVisualCard({ row, index, onSelect, active, moduleId }: { row: AnyRecord; index: number; onSelect: (row: AnyRecord, index: number) => void; active: boolean; moduleId: ModuleId }) {
  const tone = inferRecordTone(row);
  const meta = summarizedPairs(row, moduleId === 'serviceDesk' ? 6 : 4);
  return (
    <button type="button" className={`itopsx-record-visual ${active ? 'active' : ''}`} onClick={() => onSelect(row, index)}>
      <div className="itopsx-record-head">
        <div><small>{safe(row.module || row.category || row.source || row.severity || moduleId)}</small><h4>{safe(row.name)}</h4></div>
        <Pill tone={tone}>{statusText(row)}</Pill>
      </div>
      <p>{safe(row.detail)}</p>
      <div className="itopsx-record-facts">
        {meta.length ? meta.map((item) => <div className="itopsx-fact" key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>) : <div className="itopsx-fact"><span>Record</span><strong>{safe(row.name)}</strong></div>}
      </div>
      {!!recordChips(row).length && <div className="itopsx-chip-row">{recordChips(row).map((chip) => <span className="itopsx-chip" key={chip}>{chip}</span>)}</div>}
    </button>
  );
}

function buildModuleChart(selected: ModuleConfig, rows: AnyRecord[], groups: AnyRecord[], data: AnyRecord, summary: AnyRecord, onSelect: (row: AnyRecord, index: number) => void, selectedKey: string) {
  const statusItems = collectCounts(rows, ['status', 'connectionStatus', 'priority', 'severity']);
  const groupItems = groupsToChart(groups, rows, ['platform', 'category', 'department', 'source', 'status']);
  const variant = selected.viewId;

  if (variant === 'incidentTrend') {
    const trend = normalizeTrend(data);
    const trendCards = [...trend].sort((a, b) => (b.open + b.newIncidents) - (a.open + a.newIncidents)).slice(0, 4).map((item) => ({ label: item.day, value: `${fmt(item.open)} backlog`, helper: `${fmt(item.newIncidents)} new / ${fmt(item.resolved)} resolved`, tone: item.open > item.resolved ? 'amber' as Tone : 'green' as Tone }));
    return <><div className="itopsx-visual-card itopsx-modal-card"><h3>7-Day Incident Flow</h3><div className="itopsx-legend"><span><i style={{ background: '#2563eb' }} />New</span><span><i style={{ background: '#16a34a' }} />Resolved</span><span><i style={{ background: '#7c3aed' }} />Backlog</span></div><IncidentTrendChart points={trend} /></div><div className="itopsx-visual-card itopsx-modal-card"><h3>Peak Pressure Windows</h3><HeatGrid items={trendCards} /></div></>;
  }

  if (variant === 'infraHealth') {
    const domainRows = rows.map((row) => ({ label: safe(row.name), value: num(row.percent ?? row.value), percent: row.percent ?? row.value, tone: badgeTone(row.status) || 'blue' as Tone }));
    return <><div className="itopsx-visual-card itopsx-modal-card"><h3>Domain Health Distribution</h3><BarComparison items={domainRows} valueIsPercent /></div><div className="itopsx-visual-card itopsx-modal-card"><h3>Domain Focus Cards</h3><div className="itopsx-focus-grid">{rows.slice(0, 5).map((row, index) => <FocusCard key={`${getRecordId(row, index)}-${index}`} row={row} index={index} onSelect={onSelect} active={selectedKey === getRecordId(row, index)} />)}</div></div></>;
  }

  if (variant === 'patchAnalytics') {
    const departmentItems = rows.map((row) => ({ label: safe(row.name), value: num(row.percent ?? row.value), percent: row.percent ?? row.value, tone: num(row.percent ?? row.value) >= 95 ? 'green' as Tone : num(row.percent ?? row.value) >= 80 ? 'amber' as Tone : 'red' as Tone }));
    const compliant = departmentItems.filter((item) => num(item.percent) >= 95).length;
    const watch = departmentItems.filter((item) => num(item.percent) >= 80 && num(item.percent) < 95).length;
    const critical = departmentItems.filter((item) => num(item.percent) < 80).length;
    return <><div className="itopsx-visual-card itopsx-modal-card"><h3>Department Compliance Bands</h3><HeatGrid items={[{ label: 'Healthy ≥95%', value: fmt(compliant), tone: 'green' }, { label: 'Watch 80-94%', value: fmt(watch), tone: 'amber' }, { label: 'Below 80%', value: fmt(critical), tone: 'red' }, { label: 'Missing Critical', value: fmt(data.patch?.missingCriticalPatches ?? data.patch?.criticalMissing), tone: 'red' }]} /></div><div className="itopsx-visual-card itopsx-modal-card"><h3>Department Compliance Comparison</h3><BarComparison items={departmentItems} valueIsPercent /></div></>;
  }

  if (variant === 'networkCoverage') {
    const known = num(data.network?.knownIps ?? data.network?.knownIpRecords ?? data.network?.activeIps);
    const registered = num(data.network?.registeredDevices ?? data.network?.registeredIps);
    const unregistered = num(data.network?.unregisteredIps);
    const tracked = num(data.geolocation?.trackedDevices);
    const activeLive = num(data.geolocation?.liveLocationActiveDevices ?? data.geolocation?.activeLiveLocations);
    const inactiveLive = num(data.geolocation?.liveLocationInactiveDevices ?? data.geolocation?.inactiveLiveLocations);
    return <><div className="itopsx-visual-card itopsx-modal-card"><h3>Coverage Composition</h3><div className="itopsx-l2-context" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}><div><span>Registration Coverage</span><strong>{known ? ((registered / known) * 100).toFixed(1) : '0.0'}%</strong><small>{fmt(registered)} registered / {fmt(unregistered)} unregistered</small></div><div><span>Live Location</span><strong>{activeLive + inactiveLive ? ((activeLive / Math.max(activeLive + inactiveLive, 1)) * 100).toFixed(1) : '0.0'}%</strong><small>{fmt(activeLive)} active / {fmt(inactiveLive)} inactive</small></div></div><div style={{ marginTop: 14 }}><ModuleSegment items={[{ label: 'Registered', value: registered, tone: 'green' }, { label: 'Unregistered', value: unregistered, tone: 'amber' }, { label: 'Live Active', value: num(data.geolocation?.liveLocationActiveDevices ?? data.geolocation?.activeLiveLocations), tone: 'green' }, { label: 'Live Inactive', value: num(data.geolocation?.liveLocationInactiveDevices ?? data.geolocation?.inactiveLiveLocations), tone: 'red' }]} emptyLabel="No coverage counts returned." /></div></div><div className="itopsx-visual-card itopsx-modal-card"><h3>Coverage Focus Areas</h3><div className="itopsx-focus-grid">{rows.slice(0, 6).map((row, index) => <FocusCard key={`${getRecordId(row, index)}-${index}`} row={row} index={index} onSelect={onSelect} active={selectedKey === getRecordId(row, index)} />)}</div></div></>;
  }

  if (variant === 'attentionQueue') {
    const severityCounts = { critical: rows.filter((row) => safe(row.severity || row.priority).toLowerCase().includes('critical')).length, high: rows.filter((row) => safe(row.severity || row.priority).toLowerCase().includes('high')).length, medium: rows.filter((row) => safe(row.severity || row.priority).toLowerCase().includes('medium')).length };
    return <><div className="itopsx-visual-card itopsx-modal-card"><h3>Attention Severity Radar</h3><HeatGrid items={[{ label: 'Critical', value: fmt(severityCounts.critical), tone: 'red' }, { label: 'High', value: fmt(severityCounts.high), tone: 'amber' }, { label: 'Medium', value: fmt(severityCounts.medium), tone: 'blue' }, { label: 'Open Items', value: fmt(rows.length), tone: 'purple' }]} /></div><div className="itopsx-visual-card itopsx-modal-card"><h3>Attention Source Breakdown</h3><BarComparison items={groupItems.length ? groupItems : statusItems} /></div></>;
  }

  if (variant === 'serviceDeskSla') {
    const breakdown = makeRows(data.serviceDesk?.priorityBreakdown || [], 'Priority').map((row) => ({ label: safe(row.name), value: num(row.value ?? row.count ?? row.percent), percent: row.percent, tone: badgeTone(row.name) }));
    return <><div className="itopsx-visual-card itopsx-modal-card"><h3>SLA Queue Shape</h3><div className="itopsx-sla-lanes"><LaneCard label="Pending" value={fmt(data.serviceDesk?.pendingTickets)} tone="blue" /><LaneCard label="Overdue" value={fmt(data.serviceDesk?.overdueTickets)} tone="red" /><LaneCard label="Critical" value={fmt(data.serviceDesk?.criticalTickets)} tone="amber" /><LaneCard label="Open" value={fmt(data.serviceDesk?.openTickets ?? data.serviceDesk?.pendingTickets)} tone="purple" /></div></div><div className="itopsx-visual-card itopsx-modal-card"><h3>Priority Mix</h3><BarComparison items={breakdown.length ? breakdown : statusItems} /></div></>;
  }

  if (selected.id === 'hardware') {
    const online = num(summary.online ?? data.hardware?.onlineDevices);
    const offline = num(summary.offline ?? data.hardware?.offlineDevices);
    const stale = num(summary.stale ?? data.hardware?.staleSync);
    return <><div className="itopsx-visual-card itopsx-modal-card"><h3>Availability Split</h3><ModuleSegment items={[{ label: 'Online', value: online, tone: 'green' }, { label: 'Offline', value: offline, tone: 'red' }, { label: 'Stale Sync', value: stale, tone: 'amber' }].filter(item => item.value > 0)} emptyLabel="No availability counts returned." /></div><div className="itopsx-visual-card itopsx-modal-card"><h3>Platform / Model Spread</h3><BarComparison items={groupItems} /></div></>;
  }

  if (selected.id === 'serviceDesk') {
    return <><div className="itopsx-visual-card itopsx-modal-card"><h3>SLA Pressure Lanes</h3><div className="itopsx-sla-lanes"><LaneCard label="Open" value={fmt(summary.open ?? data.serviceDesk?.openTickets ?? data.serviceDesk?.pendingTickets)} tone="blue" /><LaneCard label="Pending" value={fmt(summary.pending ?? data.serviceDesk?.pendingTickets)} tone="amber" /><LaneCard label="Overdue" value={fmt(summary.overdue ?? data.serviceDesk?.overdueTickets)} tone="red" /><LaneCard label="Critical" value={fmt(summary.critical ?? data.serviceDesk?.criticalTickets)} tone="red" /></div></div><div className="itopsx-visual-card itopsx-modal-card"><h3>Priority / Status Mix</h3><ModuleSegment items={statusItems} emptyLabel="No priority or status distribution returned." /></div></>;
  }

  if (selected.id === 'patch') {
    const compliance = realPercentValue(summary.compliance ?? data.patch?.compliancePercent ?? data.patch?.overallCompliance);
    return <><div className="itopsx-visual-card itopsx-modal-card"><h3>Compliance Gauge</h3><DonutScore percent={compliance} /><div className="itopsx-l2-context" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}><div><span>Compliance</span><strong>{compliance.toFixed(1)}%</strong></div><div><span>Missing Critical</span><strong>{fmt(summary.missingCritical ?? data.patch?.missingCriticalPatches ?? data.patch?.criticalMissing)}</strong></div></div></div><div className="itopsx-visual-card itopsx-modal-card"><h3>Department Compliance</h3><BarComparison items={groupItems} valueIsPercent /></div></>;
  }

  if (selected.id === 'tasks') {
    return <><div className="itopsx-visual-card itopsx-modal-card"><h3>Execution Pipeline</h3><Pipeline items={[{ label: 'Running', value: fmt(summary.running ?? data.tasks?.runningTasks), tone: 'blue' }, { label: 'Completed', value: fmt(summary.completed ?? data.tasks?.completedTasks), tone: 'green' }, { label: 'Failed', value: fmt(summary.failed ?? data.tasks?.failedTasks), tone: 'red' }, { label: 'Cancelled', value: fmt(summary.cancelled ?? data.tasks?.cancelledTasks), tone: 'amber' }]} /></div><div className="itopsx-visual-card itopsx-modal-card"><h3>Job Status Mix</h3><ModuleSegment items={statusItems} emptyLabel="No job status mix returned." /></div></>;
  }

  if (selected.id === 'network') {
    const known = num(summary.knownIps ?? data.network?.knownIps ?? data.network?.knownIpRecords ?? data.network?.activeIps);
    const registered = num(summary.registered ?? data.network?.registeredDevices ?? data.network?.registeredIps);
    const unregistered = num(summary.unregistered ?? data.network?.unregisteredIps);
    return <><div className="itopsx-visual-card itopsx-modal-card"><h3>Registration Coverage</h3><ModuleSegment items={[{ label: 'Registered', value: registered, tone: 'green' }, { label: 'Unregistered', value: unregistered, tone: 'amber' }, { label: 'Known IP Records', value: Math.max(known - registered - unregistered, 0), tone: 'blue' }].filter(item => item.value > 0)} emptyLabel="No registration counts returned." /></div><div className="itopsx-visual-card itopsx-modal-card"><h3>Subnet / Workgroup Spread</h3><BarComparison items={groupItems} /></div></>;
  }

  if (selected.id === 'geolocation') {
    const active = num(summary.liveLocationActiveDevices ?? summary.activeLiveLocations ?? data.geolocation?.liveLocationActiveDevices ?? data.geolocation?.activeLiveLocations);
    const inactive = num(summary.liveLocationInactiveDevices ?? summary.inactiveLiveLocations ?? data.geolocation?.liveLocationInactiveDevices ?? data.geolocation?.inactiveLiveLocations);
    const tracked = num(summary.tracked ?? data.geolocation?.trackedDevices);
    return <><div className="itopsx-visual-card itopsx-modal-card"><h3>Live Location Status</h3><ModuleSegment items={[{ label: 'Live Active', value: active, tone: 'green' }, { label: 'Live Inactive', value: inactive, tone: 'red' }, { label: 'Tracked Records', value: tracked, tone: 'purple' }].filter(item => item.value > 0)} emptyLabel="No live location status returned." /></div><div className="itopsx-visual-card itopsx-modal-card"><h3>Latest Location Distribution</h3><BarComparison items={groupItems} /></div></>;
  }

  if (selected.id === 'software') {
    return <><div className="itopsx-visual-card itopsx-modal-card"><h3>Classification Coverage</h3><ModuleSegment items={groupItems.length ? groupItems : statusItems} emptyLabel="No software category data returned." /></div><div className="itopsx-visual-card itopsx-modal-card"><h3>Inventory Volume</h3><BarComparison items={groupItems} /></div></>;
  }

  if (selected.id === 'risk' || selected.id === 'alerts') {
    return <><div className="itopsx-visual-card itopsx-modal-card"><h3>{selected.id === 'risk' ? 'Exposure Heat' : 'Alert Severity Grid'}</h3><HeatGrid items={[{ label: 'Critical', value: fmt(rows.filter(row => safe(row.severity || row.priority || row.status).toLowerCase().includes('critical')).length || summary.criticalRows), tone: 'red' }, { label: 'High', value: fmt(rows.filter(row => safe(row.severity || row.priority).toLowerCase().includes('high')).length), tone: 'amber' }, { label: 'Medium', value: fmt(rows.filter(row => safe(row.severity || row.priority).toLowerCase().includes('medium')).length), tone: 'amber' }, { label: 'Open Items', value: fmt(rows.length), tone: 'blue' }]} /></div><div className="itopsx-visual-card itopsx-modal-card"><h3>Affected Area Breakdown</h3><BarComparison items={groupItems} /></div></>;
  }

  return <><div className="itopsx-visual-card itopsx-modal-card"><h3>Department Scorecard</h3><BarComparison items={groupItems.length ? groupItems : rows.map(row => ({ label: safe(row.name), value: num(row.assets || row.healthScore || row.value), percent: row.healthScore, tone: badgeTone(row.healthScore) }))} /></div><div className="itopsx-visual-card itopsx-modal-card"><h3>Operational Mix</h3><ModuleSegment items={statusItems.length ? statusItems : groupItems} emptyLabel="No department distribution returned." /></div></>;
}


function buildLocalLevel3(selected: ModuleConfig, row: AnyRecord, data: AnyRecord) {
  const metricText = row.percent !== undefined ? `${realPercentValue(row.percent).toFixed(1)}%` : fmt(row.value);
  if (selected.viewId === 'infraHealth') {
    return {
      title: safe(row.name),
      overview: { ...row, status: row.status || (realPercentValue(row.percent) >= 80 ? 'Healthy' : realPercentValue(row.percent) >= 50 ? 'Watch' : 'Critical') },
      sections: [
        { title: 'Health Snapshot', data: { Domain: safe(row.name), Health: metricText, Source: safe(row.source, 'Dashboard aggregation'), Updated: safe(data.generatedAt || data.latestLocationTime || '-') } },
      ],
      actions: [],
    };
  }
  if (selected.viewId === 'networkCoverage') {
    return {
      title: safe(row.name),
      overview: { ...row, status: row.status || row.state || 'Coverage' },
      sections: [
        { title: 'Coverage Snapshot', data: { Area: safe(row.name), Value: metricText, State: safe(row.state || row.status), Type: safe(row.type || row.module), Records: fmt(row.count || row.value || 0) } },
      ],
      actions: [],
    };
  }
  return {
    title: safe(row.name),
    overview: row,
    sections: [{ title: 'Record Snapshot', data: row }],
    actions: [],
  };
}

function renderLevel3Visual(selected: ModuleConfig, overview: AnyRecord, data: AnyRecord) {
  if (!selected.viewId) return null;
  if (selected.viewId === 'incidentTrend') {
    const backlog = num(overview.backlog ?? overview.open ?? data.serviceDesk?.openTickets ?? data.serviceDesk?.pendingTickets);
    const resolved = num(overview.resolved ?? data.serviceDesk?.resolvedTickets);
    const incoming = num(overview.newIncidents ?? overview.created ?? 0);
    return <div className="itopsx-evidence-card"><div className="itopsx-evidence-head"><div><h4>Trend Snapshot</h4></div><Pill tone="blue">Visual Detail</Pill></div><HeatGrid items={[{ label: 'New', value: fmt(incoming), tone: 'blue' }, { label: 'Resolved', value: fmt(resolved), tone: 'green' }, { label: 'Backlog', value: fmt(backlog), tone: 'purple' }, { label: 'Overdue', value: fmt(data.serviceDesk?.overdueTickets), tone: 'red' }]} /></div>;
  }
  if (selected.viewId === 'infraHealth') {
    const percent = realPercentValue(overview.percent ?? overview.health ?? overview.value);
    return <div className="itopsx-evidence-card"><div className="itopsx-evidence-head"><div><h4>Domain Health Gauge</h4></div><Pill tone={percent >= 80 ? 'green' : percent >= 50 ? 'amber' : 'red'}>{percent.toFixed(1)}%</Pill></div><div style={{ display: 'grid', placeItems: 'center', padding: '6px 0 2px' }}><DonutScore percent={percent} /></div></div>;
  }
  if (selected.viewId === 'patchAnalytics') {
    const percent = realPercentValue(overview.percent ?? overview.compliance ?? overview.patchCompliance ?? overview.value);
    return <div className="itopsx-evidence-card"><div className="itopsx-evidence-head"><div><h4>Department Compliance</h4></div><Pill tone={percent >= 95 ? 'green' : percent >= 80 ? 'amber' : 'red'}>{percent.toFixed(1)}%</Pill></div><div style={{ display: 'grid', placeItems: 'center', padding: '6px 0 2px' }}><DonutScore percent={percent} /></div></div>;
  }
  if (selected.viewId === 'networkCoverage') {
    const coverage = realPercentValue(overview.percent ?? overview.coverage ?? overview.value);
    return <div className="itopsx-evidence-card"><div className="itopsx-evidence-head"><div><h4>Coverage Snapshot</h4></div><Pill tone={coverage >= 80 ? 'green' : coverage >= 50 ? 'amber' : 'red'}>{coverage.toFixed(1)}%</Pill></div><HeatGrid items={[{ label: 'Coverage', value: `${coverage.toFixed(1)}%`, tone: 'cyan' }, { label: 'State', value: safe(overview.state || overview.status), tone: badgeTone(overview.state || overview.status) }, { label: 'Type', value: safe(overview.type || overview.module), tone: 'blue' }, { label: 'Records', value: fmt(overview.count || overview.value || 0), tone: 'purple' }]} /></div>;
  }
  if (selected.viewId === 'attentionQueue') {
    return <div className="itopsx-evidence-card"><div className="itopsx-evidence-head"><div><h4>Triage Snapshot</h4></div><Pill tone={inferRecordTone(overview)}>{statusText(overview)}</Pill></div><HeatGrid items={[{ label: 'Severity', value: safe(overview.severity || overview.priority), tone: inferRecordTone(overview) }, { label: 'Module', value: safe(overview.module || overview.source), tone: 'blue' }, { label: 'Owner', value: safe(overview.owner || overview.assignedTo), tone: 'purple' }, { label: 'State', value: safe(overview.status), tone: badgeTone(overview.status) }]} /></div>;
  }
  if (selected.viewId === 'serviceDeskSla') {
    return <div className="itopsx-evidence-card"><div className="itopsx-evidence-head"><div><h4>SLA & Queue Signal</h4></div><Pill tone={inferRecordTone(overview)}>{statusText(overview)}</Pill></div><Pipeline items={[{ label: 'Priority', value: safe(overview.priority, '-') , tone: badgeTone(overview.priority) }, { label: 'Status', value: safe(overview.status, '-'), tone: badgeTone(overview.status) }, { label: 'Owner', value: safe(overview.owner || overview.assignedTo, '-'), tone: 'blue' }]} /></div>;
  }
  return null;
}

function DrilldownModal({ selected, data, onClose }: { selected: ModuleConfig; data: AnyRecord; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [detail, setDetail] = useState<AnyRecord | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<AnyRecord | null>(null);
  const [level3, setLevel3] = useState<AnyRecord | null>(null);
  const [loadingLevel3, setLoadingLevel3] = useState(false);
  const [level3Error, setLevel3Error] = useState('');
  const Icon = selected.icon;
  const apiId = selected.apiId || selected.id;
  const viewId = selected.viewId || selected.id;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => { setPage(1); setSearch(''); }, [viewId]);

  useEffect(() => {
    let cancelled = false;
    async function loadDrilldown() {
      try {
        setLoadingDetail(true);
        setDetailError('');
        setSelectedRecord(null);
        setLevel3(null);
        if (selected.usesLocalRows) {
          setDetail(null);
          return;
        }
        const payload = await getItOperationsDrilldown(apiId, { page, limit: pageSize });
        if (!cancelled) setDetail(payload as AnyRecord);
      } catch (err) {
        if (!cancelled) {
          setDetailError(err instanceof Error ? err.message : 'Failed to load drilldown data.');
          setDetail(null);
        }
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    }
    void loadDrilldown();
    return () => { cancelled = true; };
  }, [apiId, page, selected.usesLocalRows]);

  const rawRows = (selected.usesLocalRows ? selected.rows(data) : ((detail?.rows as AnyRecord[] | undefined) || [])).filter(Boolean);
  const rows = rawRows.filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase()));
  const groups = ((detail?.groups as AnyRecord[] | undefined) || []).filter(Boolean);
  const summary = (detail?.summary || {}) as AnyRecord;
  const pagination = (detail?.pagination || {}) as AnyRecord;
  const totalRecords = num(pagination.totalRecords ?? summary.totalRecords ?? rawRows.length);
  const totalPages = Math.max(num(pagination.totalPages ?? Math.ceil(totalRecords / pageSize), 1), 1);
  const hasPreviousPage = Boolean(pagination.hasPreviousPage ?? page > 1);
  const hasNextPage = Boolean(pagination.hasNextPage ?? page < totalPages);
  const recordStart = totalRecords && rawRows.length ? (page - 1) * pageSize + 1 : 0;
  const recordEnd = totalRecords && rawRows.length ? Math.min((page - 1) * pageSize + rawRows.length, totalRecords) : 0;
  const selectedKey = selectedRecord ? getRecordId(selectedRecord) : '';
  const metrics = [
    { label: 'Records', value: fmt(totalRecords || rawRows.length), tone: 'blue' as Tone },
    { label: selected.id === 'serviceDesk' ? 'Overdue / Critical' : 'Critical / High', value: fmt(summary.criticalRows ?? rawRows.filter(row => recordImportance(row) >= 3).length), tone: 'red' as Tone },
    { label: 'Groups Returned', value: fmt(summary.groups ?? groups.length), tone: 'purple' as Tone },
    ...selected.metrics(data).slice(0, 3),
  ];

  async function openLevel3(row: AnyRecord, index = 0) {
    const recordId = getRecordId(row, index);
    setSelectedRecord(row);
    setLevel3(null);
    setLevel3Error('');
    try {
      setLoadingLevel3(true);
      if (selected.usesLocalRows) {
        setLevel3(buildLocalLevel3(selected, row, data));
        return;
      }
      const payload = await getItOperationsRecordDetail(apiId, recordId, { source: row.source, name: row.name, assetId: row.assetId, deviceId: row.deviceId || row.deviceID, ipAddress: row.ipAddress });
      setLevel3(payload as AnyRecord);
    } catch (err) {
      setLevel3Error(err instanceof Error ? err.message : 'Failed to load detail data.');
    } finally {
      setLoadingLevel3(false);
    }
  }

  const detailTitle = safe(level3?.title || selectedRecord?.name || 'Select a Drilldown record');
  const overview = (level3?.overview || selectedRecord || {}) as AnyRecord;
  const sections = Array.isArray(level3?.sections) ? level3.sections as AnyRecord[] : [];
  const overviewPairs = summarizedPairs(overview, selected.id === 'serviceDesk' ? 8 : 6);
  const overviewChips = recordChips(overview, 6);

  return (
    <div className="itopsx-backdrop" onMouseDown={onClose}>
      <section className={`itopsx-modal ${toneClass(selected.tone)}`} role="dialog" aria-modal="true" aria-label={`${selected.title} drilldown`} onMouseDown={(event) => event.stopPropagation()}>
        <div className="itopsx-modal-head">
          <span className="itopsx-modal-accent" />
          <div className="itopsx-modal-title"><span className="itopsx-icon"><Icon size={24} /></span><div><p className="itopsx-eyebrow">Operational Drilldown</p><h2>{selected.title}</h2></div></div>
          <button type="button" className="itopsx-close" onClick={onClose}><X size={17} /> Close</button>
        </div>
        <div className="itopsx-modal-body">
          <div className="itopsx-modal-content">
            <div className="itopsx-l2-brief itopsx-modal-card">
              <div>
                <p className="itopsx-eyebrow">Operational Scope</p>
                {loadingDetail && <p className="itopsx-eyebrow" style={{ marginTop: 12 }}>Loading live records...</p>}
                {detailError && <p style={{ color: '#b91c1c', fontWeight: 850, marginTop: 10 }}>{detailError}</p>}
                <div className="itopsx-l2-context">
                  <div><span>Range</span><strong>{recordStart ? `${fmt(recordStart)}-${fmt(recordEnd)}` : '-'}</strong></div>
                  <div><span>Records</span><strong>{fmt(totalRecords || rawRows.length)}</strong></div>
                  <div><span>Mode</span><strong>{selected.id === 'patch' ? 'Compliance' : 'Operations'}</strong></div>
                </div>
              </div>
            </div>

            <div className="itopsx-metric-strip">{metrics.map((metric, index) => <MetricTile key={`${metric.label}-${index}`} {...metric} />)}</div>

            <div className="itopsx-visual-layout full">
              {buildModuleChart(selected, rows, groups, data, summary, openLevel3, selectedKey)}
            </div>

            <div className="itopsx-modal-card full itopsx-visual-card">
              <div className="itopsx-panel-head"><div><h3>{selected.rowTitle}</h3><p>{fmt(recordStart)}-{fmt(recordEnd)} / {fmt(totalRecords || rows.length)}</p></div><label className="itopsx-searchbox"><Search size={15} /><input value={search} onChange={(event) => { setSearch(event.target.value); }} placeholder="Search records..." /></label></div>
              {rows.length ? <div className="itopsx-record-board">{rows.map((row, index) => <RecordVisualCard key={`${getRecordId(row, index)}-${index}`} row={row} index={index} onSelect={openLevel3} active={selectedKey === getRecordId(row, index)} moduleId={selected.id} />)}</div> : <div className="itopsx-empty-visual">No records match this search on the current page.</div>}
              <div className="itopsx-pagination">
                <span>Showing <strong>{fmt(recordStart)}</strong>-<strong>{fmt(recordEnd)}</strong> of <strong>{fmt(totalRecords || rows.length)}</strong> records</span>
                <div className="itopsx-pagination-actions">
                  <button type="button" className="itopsx-page-btn" disabled={loadingDetail || !hasPreviousPage} onClick={() => setPage((current) => Math.max(current - 1, 1))}>Previous 10</button>
                  <button type="button" className="itopsx-page-btn" disabled={loadingDetail || !hasNextPage} onClick={() => setPage((current) => current + 1)}>Next 10</button>
                </div>
              </div>
            </div>
          </div>
          <aside className="itopsx-level3">
            {!selectedRecord && <div className="itopsx-empty-visual" style={{ minHeight: 320 }}><div><strong style={{ display: 'block', marginBottom: 8 }}>Detail Panel</strong>No record selected.</div></div>}
            {selectedRecord && <>
              <div className="itopsx-detail-hero">
                <small>{selected.id === 'serviceDesk' ? 'Incident intelligence' : selected.id === 'hardware' ? 'Device intelligence' : selected.id === 'patch' ? 'Patch evidence' : 'Record intelligence'}</small>
                <h3>{detailTitle}</h3>
                
                {loadingLevel3 && <div className="itopsx-record-hint"><RefreshCw size={16} /> Loading detail...</div>}
                {level3Error && <div className="itopsx-action-result" style={{ color: '#b91c1c', background: '#fff7f7' }}>{level3Error}</div>}
                {!loadingLevel3 && <div className="itopsx-detail-status"><div className="itopsx-detail-status-card"><span>Current State</span><strong>{statusText(overview)}</strong></div><div className="itopsx-detail-status-card"><span>Module</span><strong>{selected.title}</strong></div></div>}
                {!!overviewChips.length && <div className="itopsx-chip-row">{overviewChips.map((chip) => <span className="itopsx-chip" key={chip}>{chip}</span>)}</div>}
              </div>

              {renderLevel3Visual(selected, overview, data)}
              <div className="itopsx-evidence-grid">
                <div className="itopsx-evidence-card">
                  <div className="itopsx-evidence-head"><div><h4>{selected.id === 'serviceDesk' ? 'Ticket Profile' : selected.id === 'hardware' ? 'Device Profile' : 'Record Profile'}</h4></div><Pill tone={inferRecordTone(overview)}>{statusText(overview)}</Pill></div>
                  <div className="itopsx-data-cloud">{overviewPairs.length ? overviewPairs.map((item) => <div className="itopsx-data-badge" key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>) : <div className="itopsx-data-badge"><span>Record</span><strong>Live detail selected</strong></div>}</div>
                </div>

                {sections.slice(0, 4).map((section) => {
                  const sectionPairs = detailPairsFrom(section.data, 6);
                  return <div className="itopsx-evidence-card" key={safe(section.title)}><div className="itopsx-evidence-head"><div><h4>{safe(section.title)}</h4></div><Pill tone={badgeTone(section.title || section.note)}>{fmt(sectionPairs.length)} fields</Pill></div><div className="itopsx-data-cloud">{sectionPairs.map((item) => <div className="itopsx-data-badge" key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}</div>{section.note && <p>{safe(section.note)}</p>}</div>;
                })}
              </div>
            </>}
          </aside>
        </div>
      </section>
    </div>
  );
}


export default function ITOperationsDashboard() {
  const [data, setData] = useState<AnyRecord>({});
  const [loading, setLoading] = useState(true);
  const [hasLoadedDashboard, setHasLoadedDashboard] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<ModuleConfig | null>(null);
  const [departmentSearch, setDepartmentSearch] = useState('');

  async function load() {
    try {
      setLoading(true);
      setError('');

      // Load the dashboard in the same sequence as the UI:
      // 1) fast Level 1 overview first, 2) heavier module summaries one-by-one.
      const overview = await getItOperationsDashboard('fast');
      setData(overview as AnyRecord);
      setHasLoadedDashboard(true);
      setLoading(false);

      const moduleSequence: ModuleId[] = ['software', 'network', 'geolocation', 'risk'];

      for (const moduleId of moduleSequence) {
        try {
          const modulePayload = await getItOperationsModule(moduleId);
          setData((current) => ({
            ...current,
            ...(modulePayload as AnyRecord),
            generatedAt: (modulePayload as AnyRecord).generatedAt || current.generatedAt,
            loadedModules: [...new Set([...(current.loadedModules || []), moduleId])],
          }));
        } catch (moduleError) {
          console.warn(`IT Operations ${moduleId} module skipped:`, moduleError);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load IT Operations Dashboard.');
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const trend = useMemo(() => normalizeTrend(data), [data]);
  const domains = useMemo(() => normalizeDomains(data, modules), [data]);
  const overallHealth = useMemo(() => average(modules.slice(0, 8).map((module) => module.health(data))), [data]);
  const traffic: Tone = overallHealth < 50 ? 'red' : overallHealth < 80 ? 'amber' : 'green';
  const generatedAt = data.generatedAt ? new Date(data.generatedAt).toLocaleString('en-MY') : '-';
  const attentionRows = makeRows([...(data.activeAlerts || []), ...(data.attentionQueue || [])], 'Attention');
  const departmentRows = makeRows(data.departmentRows || data.departmentHealth || [], 'Department').filter((row) => JSON.stringify(row).toLowerCase().includes(departmentSearch.toLowerCase()));
  const patchDepartments = makeRows(data.patchDepartments || [], 'Department');
  const trendSummary = trend.reduce((acc, item) => ({ newIncidents: acc.newIncidents + item.newIncidents, resolved: acc.resolved + item.resolved, open: acc.open + item.open }), { newIncidents: 0, resolved: 0, open: 0 });

  if (!hasLoadedDashboard) {
    return (
      <div className="itopsx-shell">
        <style>{styles + modalRedesignStyles}</style>
        <header className="itopsx-top">
          <div><p className="itopsx-eyebrow">EMA Operations Center</p><h1>IT Operations Dashboard</h1></div>
          <div className="itopsx-actions"><button type="button" className="itopsx-btn primary" disabled><RefreshCw size={16} /> Loading</button></div>
        </header>
        {error ? <div className="itopsx-warning">Dashboard API failed. {error}</div> : <div className="itopsx-warning">Loading dashboard from database...</div>}
      </div>
    );
  }

  return (
    <div className="itopsx-shell">
      <style>{styles + modalRedesignStyles}</style>
      <header className="itopsx-top">
        <div><p className="itopsx-eyebrow">EMA Operations Center</p><h1>IT Operations Dashboard</h1></div>
        <div className="itopsx-actions"><button type="button" className="itopsx-btn"><Filter size={16} /> {safe(data.rangeLabel, 'Last 7 Days')}</button><button type="button" className="itopsx-btn"><Download size={16} /> Export Pack</button><button type="button" className="itopsx-btn primary" onClick={load} disabled={loading}><RefreshCw size={16} /> {loading ? 'Loading' : 'Refresh'}</button></div>
      </header>

      {error && <div className="itopsx-warning">Dashboard API failed. {error}</div>}

      <section className={`itopsx-banner ${traffic}`}>
        <div>
          <div className="itopsx-status"><Pill tone={traffic}>{traffic === 'red' ? 'Critical' : traffic === 'amber' ? 'Watch' : 'Healthy'}</Pill><span>5-second operations view</span></div>
          <h2>Operational health</h2>
          
        </div>
        <div className="itopsx-mini-grid">
          <MetricTile label="Overall Health" value={`${overallHealth.toFixed(1)}%`} tone={traffic} />
          <MetricTile label="Critical Alerts" value={fmt((data.activeAlerts || []).filter((row: AnyRecord) => safe(row.severity).toLowerCase() === 'critical').length)} tone="red" />
          <MetricTile label="Attention Items" value={fmt((data.attentionQueue || []).length)} tone="purple" />
        </div>
      </section>

      <section className="itopsx-kpi-grid" aria-label="Level 1 operational cards">
        {[
          modules[0], // Hardware Inventory
          modules[5], // Service Desk / Open Incidents
          modules[6], // Patch Compliance
          modules[7], // Critical Risk Score
          modules[1], // Software Inventory
          modules[2], // Network Inventory
          modules[3], // Geolocation
          modules[4], // Running Tasks
        ].map((module) => <ExecutiveCard key={module.id} module={module} data={data} onOpen={setSelected} />)}
      </section>

      <section className="itopsx-panel-grid">
        <Panel title="Incident Trend" onOpen={() => setSelected({ ...modules[5], title: 'Incident Trend', subtitle: 'Daily incident flow', description: 'Chart-driven drilldown for incoming demand, resolution pace, and backlog pressure.', rowTitle: 'Incident records behind the trend', viewId: 'incidentTrend', apiId: 'serviceDesk' })}>
          <div className="itopsx-legend"><span><i style={{ background: '#2563eb' }} />New</span><span><i style={{ background: '#16a34a' }} />Resolved</span><span><i style={{ background: '#7c3aed' }} />Backlog</span></div>
          <IncidentTrendChart points={trend} />
          <div className="itopsx-summary"><MetricTile label="New" value={fmt(trendSummary.newIncidents)} /><MetricTile label="Resolved" value={fmt(trendSummary.resolved)} tone="green" /><MetricTile label="Backlog" value={fmt(trendSummary.open)} tone="purple" /></div>
        </Panel>

        <Panel title="Infrastructure Health" onOpen={() => setSelected({ ...modules[8], title: 'Infrastructure Health', subtitle: 'Domain posture and resilience', description: 'Domain health across endpoints, software, network, geolocation, and task execution.', icon: ShieldCheck, tone: 'blue', rowTitle: 'Operational domains', viewId: 'infraHealth', usesLocalRows: true, metrics: () => [{ label: 'Domains', value: fmt(domains.length) }, { label: 'Strongest', value: safe([...domains].sort((a, b) => b.percent - a.percent)[0]?.name) }, { label: 'Weakest', value: safe([...domains].sort((a, b) => a.percent - b.percent)[0]?.name), tone: 'amber' }, { label: 'Avg Health', value: `${overallHealth.toFixed(1)}%`, tone: traffic }], rows: () => domains.map((domain) => ({ name: domain.name, percent: domain.percent, value: domain.percent, detail: `${domain.percent.toFixed(1)}% current health for ${domain.name}`, status: domain.percent >= 80 ? 'Healthy' : domain.percent >= 50 ? 'Watch' : 'Critical', source: 'Infrastructure Health' })) })}>
          <div className="itopsx-donut-layout"><DonutScore percent={overallHealth} /><div className="itopsx-list">{domains.slice(0, 5).map((domain) => <div className="itopsx-row itopsx-domain-row" key={domain.name}><i style={{ background: domain.color }} /><span>{domain.name}</span><strong>{domain.percent.toFixed(1)}%</strong></div>)}</div></div>
        </Panel>

        <Panel title="Patch Compliance" onOpen={() => setSelected({ ...modules[6], title: 'Patch Compliance Analytics', subtitle: 'Department readiness and vulnerability pressure', description: 'Department compliance, missing critical patches, and readiness bands.', rowTitle: 'Department compliance lanes', viewId: 'patchAnalytics', apiId: 'patch' })}>
          <BarList items={patchDepartments.map((row) => ({ name: row.name, value: row.value, percent: row.percent ?? row.value }))} emptyLabel="No patch department data yet." />
        </Panel>

        <Panel title="Network & Location Coverage" onOpen={() => setSelected({ ...modules[2], title: 'Network & Location Coverage', subtitle: 'Registration and location freshness', description: 'IP registration coverage with live location tracking status.', rowTitle: 'Coverage focus records', viewId: 'networkCoverage', usesLocalRows: true, metrics: () => [{ label: 'Known IPs', value: fmt(data.network?.knownIps ?? data.network?.knownIpRecords ?? data.network?.activeIps) }, { label: 'Live Active', value: fmt(data.geolocation?.liveLocationActiveDevices ?? data.geolocation?.activeLiveLocations), tone: 'green' }, { label: 'Live Inactive', value: fmt(data.geolocation?.liveLocationInactiveDevices ?? data.geolocation?.inactiveLiveLocations), tone: 'red' }, { label: 'Unregistered', value: fmt(data.network?.unregisteredIps), tone: 'amber' }], rows: () => ([...(makeRows(data.geolocation?.topLocations || [], 'Location').slice(0, 4).map((row) => ({ ...row, type: 'Location', module: 'Geolocation', percent: 100, status: 'Tracked', count: row.value || 0, state: 'Fresh coverage' }))), { name: 'Unregistered IP Pool', detail: 'Known IP records without registered device mapping', value: num(data.network?.unregisteredIps), percent: num(data.network?.knownIps ?? data.network?.knownIpRecords ?? data.network?.activeIps) ? (num(data.network?.unregisteredIps) / Math.max(num(data.network?.knownIps ?? data.network?.knownIpRecords ?? data.network?.activeIps), 1)) * 100 : 0, status: 'Gap', type: 'Network', module: 'Network Inventory', count: num(data.network?.unregisteredIps), state: 'Registration gap' }, { name: 'Stale Location Pool', detail: 'Tracked devices with outdated location information', value: num(data.geolocation?.staleLocations), percent: num(data.geolocation?.trackedDevices) ? (num(data.geolocation?.staleLocations) / Math.max(num(data.geolocation?.trackedDevices), 1)) * 100 : 0, status: 'Gap', type: 'Geolocation', module: 'Geolocation', count: num(data.geolocation?.staleLocations), state: 'Freshness gap' }]) })}>
          <div className="itopsx-summary two"><MetricTile label="Live Active" value={fmt(data.geolocation?.liveLocationActiveDevices ?? data.geolocation?.activeLiveLocations)} tone="green" /><MetricTile label="Live Inactive" value={fmt(data.geolocation?.liveLocationInactiveDevices ?? data.geolocation?.inactiveLiveLocations)} tone="red" /></div>
          <BarList items={makeRows(data.geolocation?.topLocations || [], 'Location')} emptyLabel="No location cluster data yet." />
        </Panel>

        <Panel title="Operations Attention Queue" onOpen={() => setSelected({ ...modules[9], title: 'Operations Attention Queue', subtitle: 'Cross-module follow-up queue', description: 'Active alerts, severity clusters, and ownership distribution.', rowTitle: 'Attention queue items', viewId: 'attentionQueue', apiId: 'alerts' })}>
          <DataRows rows={attentionRows} />
        </Panel>

        <Panel title="Service Desk Queue & SLA" onOpen={() => setSelected({ ...modules[5], title: 'Service Desk Queue & SLA', subtitle: 'Queue health and SLA pressure', description: 'Pending workload, overdue exposure, and priority mix.', rowTitle: 'Queue and SLA records', viewId: 'serviceDeskSla', apiId: 'serviceDesk' })}>
          <div className="itopsx-summary two"><MetricTile label="Pending" value={fmt(data.serviceDesk?.pendingTickets)} /><MetricTile label="Overdue" value={fmt(data.serviceDesk?.overdueTickets)} tone="red" /></div>
          <BarList items={makeRows(data.serviceDesk?.priorityBreakdown || [], 'Priority')} emptyLabel="No service desk priority data yet." />
        </Panel>

        <Panel title="Security & Compliance" description="Risk, protection, backup, and policy indicators." onOpen={() => setSelected(modules[7])}>
          <div className="itopsx-summary"><MetricTile label="Critical Vulnerabilities" value={fmt(data.security?.criticalVulnerabilities)} tone="red" /><MetricTile label="Anti-Virus" value={safe(data.security?.antiVirusStatus)} tone="green" /><MetricTile label="Failed Backups" value={fmt(data.security?.failedBackups)} tone="amber" /></div>
        </Panel>

        <Panel title="Department Health" onOpen={() => setSelected(modules[8])}>
          <div className="itopsx-panel-head"><label className="itopsx-searchbox" onClick={(event) => event.stopPropagation()}><Search size={14} /><input placeholder="Search department" value={departmentSearch} onChange={(event) => setDepartmentSearch(event.target.value)} /></label></div>
          <div className="itopsx-table-wrap"><table className="itopsx-table"><thead><tr><th>Department</th><th>Assets</th><th>Patch</th><th>Open Incidents</th><th>Health</th></tr></thead><tbody>{departmentRows.slice(0, 6).map((row, index) => <tr key={`${safe(row.name)}-${index}`}><td><Users size={14} /> {safe(row.name)}</td><td>{fmt(row.assets)}</td><td>{row.patchCompliance !== undefined ? `${pct(row.patchCompliance).toFixed(1)}%` : safe(row.patch)}</td><td>{fmt(row.openIncidents)}</td><td>{fmt(row.healthScore)}</td></tr>)}</tbody></table>{!departmentRows.length && <EmptyState />}</div>
        </Panel>
      </section>

      {selected && <DrilldownModal selected={selected} data={data} onClose={() => setSelected(null)} />}
    </div>
  );
}
