import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { Ban, CheckCircle2, ChevronDown, ChevronRight, Database, Folder, FolderOpen, Laptop, Layers, Loader2, Package, RefreshCw, RotateCcw, Save, ShieldAlert, ShieldCheck, X, Search, Trash2, Info, ListChecks, ArrowLeft, Globe, Link as LinkIcon, Plus } from 'lucide-react';
import restrictionService, { getCurrentLoginId, type RestrictionPackage, type RestrictionPackageFile, type PackageManagerPayload, type RestrictionPolicyDetail, type RestrictionPolicyRow, type RestrictionStatusRow, type RestrictionTarget, type RestrictionTreeNode, type WhitelistSoftware, type WebGroup, type WebGroupUrl } from '../services/restrictionService';
import { EmaButton, EmaFilterField, EmaKpiCard, EmaKpiGrid, EmaPageLayout, EmaPagination, EmaSearchInput, EmaSection, EmaSidebarPanel, EmaSidebarTreeRow, EmaTable, EmaTableShell, EmaToastViewport, EmaToolbar, type EmaTableColumn, type EmaToastItem, type EmaToastTone } from '../components/ema';

type AppModule = 'appBlacklist' | 'appWhitelist';
type SubTab = 'status' | 'settings' | 'policyStatus';
type PackageView = 'all' | 'selected' | 'available';
type LookupRow = RestrictionPackage | WhitelistSoftware;

type FormState = {
  policyId: number;
  inheritPolicy: boolean;
  exception: boolean;
  updateInterval: string;
  weeklyPolicy: boolean;
  useSchedule: boolean;
  schedule1: string;
  schedule2: string;
  schedule3: string;
  schedule4: string;
  appRestrictType: '1' | '2' | '3';
  versionCompare: boolean;
  appNoticeMessage: string;
  processRestrictType: '0' | '1' | '2' | '3';
  processNoticeMessage: string;
  fontRestrictType: '0' | '1' | '2' | '3';
  fontNoticeMessage: string;
  webRestrictType: '1' | '2';
  defaultUrl: string;
};

const MODULES = [
  { id: 'appBlacklist' as const, label: 'App Restriction', shortLabel: 'Restriction', helper: 'Block unauthorized software and executable usage.', icon: ShieldAlert, tone: 'rose' as const },
  { id: 'appWhitelist' as const, label: 'App Whitelist', shortLabel: 'Whitelist', helper: 'Permit approved software and application execution.', icon: ShieldCheck, tone: 'emerald' as const },
];
const TAB_LABELS: Record<SubTab, string> = { status: 'Restriction Status', settings: 'Policy Settings', policyStatus: 'Policy Status' };
const DAY_OPTIONS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const PAGE_SIZE = 10;
const LOOKUP_PAGE_SIZE = 12;

const DEFAULT_FORM: FormState = {
  policyId: 0, inheritPolicy: false, exception: false, updateInterval: '120', weeklyPolicy: false, useSchedule: false,
  schedule1: '', schedule2: '', schedule3: '', schedule4: '',
  appRestrictType: '1', versionCompare: false, appNoticeMessage: '',
  processRestrictType: '0', processNoticeMessage: '', fontRestrictType: '0', fontNoticeMessage: '',
  webRestrictType: '1', defaultUrl: '127.0.0.1'
};

function cn(...values: Array<string | false | null | undefined>) { return values.filter(Boolean).join(' '); }
function today() { return new Date().toISOString().slice(0, 10); }
function daysAgo(days: number) { const date = new Date(); date.setDate(date.getDate() - days); return date.toISOString().slice(0, 10); }
function asArray<T = any>(value: unknown): T[] { if (Array.isArray(value)) return value as T[]; if (value && typeof value === 'object') { const row = value as Record<string, unknown>; if (Array.isArray(row.data)) return row.data as T[]; if (Array.isArray(row.rows)) return row.rows as T[]; if (Array.isArray(row.recordset)) return row.recordset as T[]; } return []; }
function cleanText(value: unknown, fallback = '') { const text = value === undefined || value === null ? '' : String(value).trim(); return text || fallback; }
function keyify(value: string) { return value.toLowerCase().replace(/[\s_\-().]/g, ''); }
function pick(row: Record<string, unknown> | null | undefined, keys: string[], fallback = '-') { if (!row) return fallback; const map = new Map(Object.entries(row).map(([key, value]) => [keyify(key), value])); for (const key of keys) { const direct = row[key]; const mapped = map.get(keyify(key)); const value = direct !== undefined ? direct : mapped; if (value !== undefined && value !== null && String(value).trim() !== '') return String(value); } return fallback; }
function pickNumber(row: Record<string, unknown> | null | undefined, keys: string[]) { const parsed = Number(pick(row, keys, '').replace(/,/g, '')); return Number.isFinite(parsed) ? parsed : 0; }
function getPackageId(item: Partial<LookupRow> | null | undefined) { return cleanText((item as any)?.SW_Pkg_Idn || (item as any)?.SW_Pkg_IDN || (item as any)?.sw_pkg_idn || (item as any)?.PackageID || (item as any)?.packageId || (item as any)?.WLSWIdn || (item as any)?.WLSWIDN || (item as any)?.id || (item as any)?.ID); }
function getPackageName(item: Partial<LookupRow> | null | undefined) { return cleanText((item as any)?.SW_Pkg_Name || (item as any)?.SW_Pkg_NAME || (item as any)?.PackageName || (item as any)?.packageName || (item as any)?.Name || (item as any)?.name || (item as any)?.SW_Name || (item as any)?.softwareName, 'Unnamed package'); }
function getNodeLabel(node: RestrictionTreeNode) { return cleanText(node.label || node.name || node.Object_Rel_Name || node.Object_Full_Name || node.ComputerName || node.Object_DeviceID || node.MDM_DeviceID, 'Unnamed scope'); }
function getNodeId(node: RestrictionTreeNode, index = 0) { return cleanText(node.id || node.ID || node.Object_Rel_Idn || node.Object_Root_Idn || node.target_id || node.Object_DeviceID || node.MDM_DeviceID, `node-${index}`); }
function getChildren(node: RestrictionTreeNode) { return asArray<RestrictionTreeNode>(node.children || node.Children || node.items || node.nodes); }
function getNodeType(node: RestrictionTreeNode): 'root' | 'department' | 'device' { const type = String(node.type || node.Type || '').toLowerCase(); if (type.includes('device') || node.Object_Root_Idn || node.Object_DeviceID || node.MDM_DeviceID) return 'device'; if (type.includes('root') || type.includes('org')) return 'root'; return 'department'; }

function getTarget(node: RestrictionTreeNode, index = 0): RestrictionTarget { 
  const type = getNodeType(node); 
  const label = getNodeLabel(node); 
  if (type === 'root') return { id: 'root', label: 'All Branches', type: 'root', target_type: 1, target_id: '-1', Object_Full_Name: 'Root Policy' }; 
  if (type === 'device') { 
    const rootId = cleanText(node.Object_Root_Idn || node.objectRootIdn || node.MDM_Asset_Idn || node.assetId || node.target_id || node.id || index); 
    return { id: `device-${rootId}`, label, type: 'device', target_type: 3, target_id: rootId, Object_Root_Idn: rootId, Object_DeviceID: node.Object_DeviceID || node.MDM_DeviceID || node.DeviceID || '', Object_Full_Name: node.Object_Full_Name || node.Department || node.Branch || '' }; 
  } 
  const relationId = cleanText(node.Object_Rel_Idn || node.objectRelIdn || node.target_id || node.id || index); 
  return { id: `department-${relationId}`, label, type: 'department', target_type: 2, target_id: relationId, Object_Rel_Idn: relationId, Object_Full_Name: node.Object_Full_Name || node.path || label }; 
}

function countNodes(node: RestrictionTreeNode): number { const count = pickNumber(node as any, ['count', 'badge', 'total', 'deviceCount', 'TotalDevices']); if (count > 0) return count; if (getNodeType(node) === 'device') return 1; return getChildren(node).reduce((total, child) => total + countNodes(child), 0); }
function filterTree(nodes: RestrictionTreeNode[], query: string): RestrictionTreeNode[] { const search = query.trim().toLowerCase(); if (!search) return nodes; return nodes.map((node) => { const children = filterTree(getChildren(node), search); const label = [getNodeLabel(node), node.Object_Full_Name, node.Object_DeviceID, node.MDM_DeviceID].filter(Boolean).join(' ').toLowerCase(); return label.includes(search) || children.length ? { ...node, children } : null; }).filter(Boolean) as RestrictionTreeNode[]; }
function findFirstTarget(nodes: RestrictionTreeNode[]): RestrictionTarget | null { for (let index = 0; index < nodes.length; index += 1) { const node = nodes[index]; const target = getTarget(node, index); if (target) return target; const nested = findFirstTarget(getChildren(node)); if (nested) return nested; } return null; }
function getSetting(policy: RestrictionPolicyDetail | null, key: string, fallback = '') { if (!policy) return fallback; const direct = policy.settings?.[key] ?? policy[key as keyof RestrictionPolicyDetail]; if (direct !== undefined && direct !== null && String(direct).trim() !== '') return String(direct); const found = asArray<any>(policy.settingItems || policy.items || policy.settingsList).find((item) => cleanText(item.policy_key || item.key).toLowerCase() === key.toLowerCase()); return found?.policy_value !== undefined && found?.policy_value !== null ? String(found.policy_value) : fallback; }
function settingValues(policy: RestrictionPolicyDetail | null, key: string) { return asArray<any>(policy?.settingItems || policy?.items || policy?.settingsList).filter((item) => cleanText(item.policy_key || item.key).toLowerCase() === key.toLowerCase()).sort((a, b) => Number(a.seq || 0) - Number(b.seq || 0)).map((item) => cleanText(item.policy_value || item.value)).filter(Boolean); }
function splitDays(value: string) { const upper = value.toUpperCase(); if (!upper) return []; if (upper.includes(',')) return upper.split(',').map((item) => item.trim()).filter(Boolean); return DAY_OPTIONS.filter((day) => upper.includes(day)); }
function selectedPolicyIds(policy: RestrictionPolicyDetail | null, sourceRows: LookupRow[]) { if (!policy) return []; const direct = [...asArray<any>(policy.package_list), ...asArray<any>(policy.packages), ...asArray<any>(policy.selectedPackages), ...asArray<any>(policy.whitelistSoftware)]; const directIds = direct.map((item) => (typeof item === 'object' ? getPackageId(item) : cleanText(item))).filter(Boolean); if (directIds.length) return Array.from(new Set(directIds)); const values = asArray<any>(policy.settingItems || policy.items || policy.settingsList).filter((item) => /package|software|whitelist/i.test(cleanText(item.policy_key || item.key))).map((item) => cleanText(item.policy_value || item.value)).filter(Boolean); if (values.length) return Array.from(new Set(values)); return Array.from(new Set(sourceRows.filter((row: any) => row.Selected || row.selected || row.use_policy).map(getPackageId).filter(Boolean))); }
function badgeClass(value: string) { const text = value.toLowerCase(); if (text.includes('blocked') || text.includes('denied') || text.includes('restrict')) return 'border-rose-200 bg-rose-50 text-rose-700'; if (text.includes('allowed') || text.includes('success') || text.includes('installed')) return 'border-emerald-200 bg-emerald-50 text-emerald-700'; if (text.includes('pending') || text.includes('waiting')) return 'border-amber-200 bg-amber-50 text-amber-700'; return 'border-slate-200 bg-slate-50 text-slate-700'; }
function Badge({ children, className }: { children: ReactNode; className: string }) { return <span className={cn('inline-flex rounded-full border px-3 py-1 text-xs font-black', className)}>{children}</span>; }
function FieldLabel({ children }: { children: ReactNode }) { return <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{children}</label>; }
function pageSlice<T>(rows: T[], page: number, size: number) { const totalPages = Math.max(1, Math.ceil(rows.length / size)); const safePage = Math.min(Math.max(1, page), totalPages); const start = (safePage - 1) * size; return { totalPages, safePage, start, rows: rows.slice(start, start + size) }; }

// --- FALLBACK LOGIC ---
const APP_RESTRICTION_API_BASE_URL = ((import.meta.env.VITE_API_BASE_URL as string | undefined) || (import.meta.env.VITE_API_URL as string | undefined) || '').trim().replace(/\/+$/, '');
const APP_RESTRICTION_TOKEN_KEYS = ['ema-access-token', 'ema-token', 'accessToken', 'token', 'authToken', 'jwtToken', 'bearerToken'];
const APP_RESTRICTION_AUTH_KEYS = ['ema-auth', 'auth', 'user', 'ema-user', 'currentUser', 'authUser', 'ema-current-user'];

function findAppRestrictionTokenInValue(value: unknown, depth = 0): string {
  if (!value || depth > 5) return '';
  if (typeof value === 'string') { const trimmed = value.trim(); if (trimmed.startsWith('eyJ')) return trimmed; try { return findAppRestrictionTokenInValue(JSON.parse(trimmed), depth + 1); } catch { return ''; } }
  if (Array.isArray(value)) { for (const item of value) { const token = findAppRestrictionTokenInValue(item, depth + 1); if (token) return token; } return ''; }
  if (typeof value === 'object') { const record = value as Record<string, unknown>; const data = record.data && typeof record.data === 'object' && !Array.isArray(record.data) ? record.data as Record<string, unknown> : null; const direct = record.token || record.accessToken || record.authToken || record.jwt || record.jwtToken || record.bearerToken || data?.token || data?.accessToken; if (typeof direct === 'string' && direct.trim()) return direct.trim(); for (const nestedValue of Object.values(record)) { const token = findAppRestrictionTokenInValue(nestedValue, depth + 1); if (token) return token; } }
  return '';
}
function getAppRestrictionStoredToken() {
  if (typeof window === 'undefined') return '';
  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (const key of APP_RESTRICTION_TOKEN_KEYS) { const value = storage.getItem(key); if (value?.trim()) return value.trim(); }
    for (const key of APP_RESTRICTION_AUTH_KEYS) { const token = findAppRestrictionTokenInValue(storage.getItem(key)); if (token) return token; }
  }
  return '';
}
async function appRestrictionApiGet<T>(path: string): Promise<T> {
  const headers = new Headers(); headers.set('Accept', 'application/json');
  const token = getAppRestrictionStoredToken(); if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${APP_RESTRICTION_API_BASE_URL}${path}`, { method: 'GET', headers, credentials: 'include' });
  const text = await response.text(); let payload: unknown = null;
  try { payload = text ? JSON.parse(text) : null; } catch { throw new Error('Unable to load data.'); }
  if (!response.ok) { const record = payload as any; throw new Error(String(record?.message || record?.error || 'Unable to load data.')); }
  return payload as T;
}
function unwrapAppRestrictionRows<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const record = payload as any; if (!record) return [];
  if (Array.isArray(record.data)) return record.data;
  if (record.data && !Array.isArray(record.data)) { for (const key of ['departments', 'assets', 'rows', 'recordset', 'data']) { if (Array.isArray(record.data[key])) return record.data[key]; } }
  for (const key of ['departments', 'assets', 'rows', 'recordset', 'result']) { if (Array.isArray(record[key])) return record[key]; }
  return [];
}
function mapAppRestrictionAssetFallback(row: any, index: number, parentName: string): RestrictionTreeNode {
  const objectRootIdn = pickNumber(row, ['Object_Root_Idn', '_Idn', 'MDM_Asset_Idn', 'assetId', 'id']) || (index + 1);
  const objectDeviceId = pick(row, ['Object_DeviceID', 'MDM_DeviceID', 'DeviceID', 'deviceID'], '');
  const label = pick(row, ['ComputerName', 'MDM_DeviceName', 'Object_Client_Name', 'DeviceName', 'name', 'label'], objectDeviceId || `Device ${index + 1}`);
  return { id: `device-${objectRootIdn || objectDeviceId || label}`, label, type: 'device', target_type: 3, target_id: String(objectRootIdn || objectDeviceId || label), Object_Root_Idn: objectRootIdn, Object_DeviceID: objectDeviceId, Object_Full_Name: pick(row, ['Object_Full_Name', 'Department', 'Branch'], parentName), children: [] } as RestrictionTreeNode;
}
async function mapAppRestrictionDepartmentFallback(row: any, index: number, parentName = ''): Promise<RestrictionTreeNode> {
  const relationId = pickNumber(row, ['Object_Rel_Idn', 'relationID', 'relationId', 'id', 'ID']) || (index + 1);
  const label = pick(row, ['Object_Rel_Name', 'RelationName', 'DepartmentName', 'Object_Full_Name', 'name', 'label'], `Branch ${index + 1}`);
  const fullName = pick(row, ['Object_Full_Name', 'FullName', 'path'], parentName ? `${parentName} \\ ${label}` : label);
  const childDepartments = unwrapAppRestrictionRows<any>(row.children || []);
  const nestedDepartments = await Promise.all(childDepartments.map((child, childIndex) => mapAppRestrictionDepartmentFallback(child, childIndex, fullName)));
  let assetRows: any[] = [];
  if (relationId > 0) { try { const assetPayload = await appRestrictionApiGet<unknown>(`/api/assets/${relationId}`); assetRows = unwrapAppRestrictionRows(assetPayload); } catch { assetRows = []; } }
  const deviceNodes = assetRows.map((asset, assetIndex) => mapAppRestrictionAssetFallback(asset, assetIndex, fullName));
  return { id: `department-${relationId || label}`, label, type: 'department', target_type: 2, target_id: String(relationId || label), Object_Rel_Idn: relationId, Object_Full_Name: fullName, children: [...nestedDepartments, ...deviceNodes] } as RestrictionTreeNode;
}
async function buildAppRestrictionFallbackTree(): Promise<RestrictionTreeNode[]> {
  const payload = await appRestrictionApiGet<unknown>('/api/departments');
  const departments = unwrapAppRestrictionRows<any>(payload);
  const departmentNodes = await Promise.all(departments.map((department, index) => mapAppRestrictionDepartmentFallback(department, index)));
  return [{ id: 'organization', label: 'All Branches', type: 'root', target_type: 1, target_id: '-1', Object_Full_Name: 'Root Policy', children: departmentNodes } as RestrictionTreeNode];
}

const createFormFromPolicy = (module: AppModule, policy: RestrictionPolicyDetail | null, selectedTarget: RestrictionTarget | null): FormState => {
  const schedules = module === 'appWhitelist' ? [] : settingValues(policy, 'SoftwareRestrictSchedule');
  const expectedSource = selectedTarget?.type === 'device' ? 'device' : selectedTarget?.type === 'root' ? 'root' : 'department';
  const inheritedFromParent = Boolean(policy?.source && policy.source !== 'none' && selectedTarget && policy.source !== expectedSource);
  return {
    policyId: Number(policy?.policy_id || 0),
    inheritPolicy: inheritedFromParent || getSetting(policy, 'parent_policy', '0') !== '0',
    exception: getSetting(policy, 'use_policy', '1') === '0',
    updateInterval: getSetting(policy, module === 'appWhitelist' ? 'update_log_interval' : 'update_policy_result_interval', '120'),
    weeklyPolicy: getSetting(policy, 'use_weekly_policy', '0') === '1',
    useSchedule: getSetting(policy, 'use_schedule', '0') === '1',
    schedule1: schedules[0] || '', schedule2: schedules[1] || '', schedule3: schedules[2] || '', schedule4: schedules[3] || '',
    appRestrictType: (getSetting(policy, 'SoftwareRestrictType', '1') as FormState['appRestrictType']) || '1',
    versionCompare: getSetting(policy, 'SoftwareRestrictCheckVerson', '0') === '1',
    appNoticeMessage: getSetting(policy, 'SoftwareRestrictMessage', ''),
    processRestrictType: (getSetting(policy, 'process_restrict_type', '0') as FormState['processRestrictType']) || '0',
    processNoticeMessage: getSetting(policy, 'process_restrict_message', ''),
    fontRestrictType: (getSetting(policy, 'font_restrict_type', '0') as FormState['fontRestrictType']) || '0',
    fontNoticeMessage: getSetting(policy, 'font_restrict_message', ''),
    webRestrictType: (getSetting(policy, 'WebRestrictType', '1') as FormState['webRestrictType']) || '1',
    defaultUrl: getSetting(policy, 'WebRestrictMessage', '127.0.0.1'),
  };
};

export default function AppRestriction() {
  const [activeModule, setActiveModule] = useState<AppModule>('appBlacklist');
  const [activeTab, setActiveTab] = useState<SubTab>('status');
  const [treeNodes, setTreeNodes] = useState<RestrictionTreeNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root', 'organization', 'all']));
  const [selectedTarget, setSelectedTarget] = useState<RestrictionTarget | null>(null);
  const [treeSearch, setTreeSearch] = useState('');
  const [statusSearch, setStatusSearch] = useState('');
  const [policySearch, setPolicySearch] = useState('');
  const [packageSearch, setPackageSearch] = useState('');
  const [packagePage, setPackagePage] = useState(1);
  const [statusPage, setStatusPage] = useState(1);
  const [policyPage, setPolicyPage] = useState(1);
  const [packageView, setPackageView] = useState<PackageView>('all');
  const [startDate, setStartDate] = useState(daysAgo(30));
  const [endDate, setEndDate] = useState(today());
  const [includeSub, setIncludeSub] = useState(true);
  
  const [loadingTree, setLoadingTree] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [policyRows, setPolicyRows] = useState<RestrictionPolicyRow[]>([]);
  const [statusRows, setStatusRows] = useState<RestrictionStatusRow[]>([]);
  const [packages, setPackages] = useState<RestrictionPackage[]>([]);
  const [whitelistSoftware, setWhitelistSoftware] = useState<WhitelistSoftware[]>([]);
  
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);
  const [selectedWhitelistIds, setSelectedWhitelistIds] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  
  const [toasts, setToasts] = useState<EmaToastItem[]>([]);
  const toastIdRef = useRef(0);

  // Modal states
  const [showPackageManager, setShowPackageManager] = useState(false);
  const [packageManagerSearch, setPackageManagerSearch] = useState('');
  const [packageManagerRows, setPackageManagerRows] = useState<RestrictionPackage[]>([]);
  const [packageManagerLoading, setPackageManagerLoading] = useState(false);
  const [selectedManagerPackage, setSelectedManagerPackage] = useState<RestrictionPackage | null>(null);
  const [packageFileSearch, setPackageFileSearch] = useState('');
  const [packageInventoryFiles, setPackageInventoryFiles] = useState<RestrictionPackageFile[]>([]);
  const [packageForm, setPackageForm] = useState<PackageManagerPayload>({ SW_Pkg_Name: '', SW_Pkg_Company: '', License_Qnt: 0, Use_Statistices: 1, Cur_Count: 0, SW_Package_EtcInfo: '', SW_Catg: 0, Selected: 1 });

  const [showManageSoftware, setShowManageSoftware] = useState(false);
  const [manageSearchText, setManageSearchText] = useState('');
  const [manageFileTab, setManageFileTab] = useState<'process' | 'font'>('process');

  const moduleConfig = MODULES.find((item) => item.id === activeModule) || MODULES[0];
  const isWhitelist = activeModule === 'appWhitelist';
  const filteredTree = useMemo(() => filterTree(treeNodes, treeSearch), [treeNodes, treeSearch]);
  const lookupRows = isWhitelist ? whitelistSoftware : packages;
  const selectedIds = useMemo(() => Array.from(new Set((isWhitelist ? selectedWhitelistIds : selectedPackageIds).filter(Boolean))), [isWhitelist, selectedPackageIds, selectedWhitelistIds]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedLookupCount = useMemo(() => lookupRows.reduce((total, row) => total + (selectedSet.has(getPackageId(row)) ? 1 : 0), 0), [lookupRows, selectedSet]);
  const availableLookupCount = Math.max(lookupRows.length - selectedLookupCount, 0);
  
  const filteredLookupRows = useMemo(() => { 
    const term = packageSearch.trim().toLowerCase(); 
    return lookupRows.filter((row) => { 
      const id = getPackageId(row); 
      const selected = selectedSet.has(id); 
      if (packageView === 'selected' && !selected) return false; 
      if (packageView === 'available' && selected) return false; 
      const text = [getPackageName(row), id, pick(row, ['SW_Pkg_Company', 'Company', 'vendor'], ''), pick(row, ['SW_Catg', 'category', 'Category'], '')].join(' ').toLowerCase(); 
      return !term || text.includes(term); 
    }); 
  }, [lookupRows, packageSearch, packageView, selectedSet]);

  const filteredStatusRows = useMemo(() => { const term = statusSearch.trim().toLowerCase(); return statusRows.filter((row) => !term || Object.values(row || {}).join(' ').toLowerCase().includes(term)); }, [statusRows, statusSearch]);
  const filteredPolicyRows = useMemo(() => { const term = policySearch.trim().toLowerCase(); return policyRows.filter((row) => !term || Object.values(row || {}).join(' ').toLowerCase().includes(term)); }, [policyRows, policySearch]);
  
  const statusPaged = pageSlice(filteredStatusRows, statusPage, PAGE_SIZE);
  const policyPaged = pageSlice(filteredPolicyRows, policyPage, PAGE_SIZE);
  const lookupPaged = pageSlice(filteredLookupRows, packagePage, LOOKUP_PAGE_SIZE);

  const addToast = useCallback((tone: EmaToastTone, title: string, message?: string) => { toastIdRef.current += 1; const toast: EmaToastItem = { id: `${Date.now()}-${toastIdRef.current}`, tone, title, message }; setToasts((items) => [...items.slice(-2), toast]); window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== toast.id)), 3200); }, []);

  const loadTree = useCallback(async () => { 
    setLoadingTree(true); 
    try { 
      let nodes = await restrictionService.getTree().catch(() => null);
      if (!Array.isArray(nodes) || nodes.length === 0) {
        nodes = await buildAppRestrictionFallbackTree();
      }
      const next = Array.isArray(nodes) ? nodes : []; 
      setTreeNodes(next); 
      setSelectedTarget((current) => current || findFirstTarget(next)); 
      setExpandedNodes((current) => { const merged = new Set(current); next.slice(0, 2).forEach((node, index) => merged.add(getNodeId(node, index))); return merged; }); 
    } catch (error) { 
      try {
        const fallbackTree = await buildAppRestrictionFallbackTree();
        setTreeNodes(fallbackTree);
        setSelectedTarget((current) => current || findFirstTarget(fallbackTree));
      } catch {
        addToast('error', 'Unable to load branch scope', error instanceof Error ? error.message : 'Please check restriction API.');
      }
    } finally { 
      setLoadingTree(false); 
    } 
  }, [addToast]);

  const loadLookups = useCallback(async () => { 
    const [packageRows, whitelistRows] = await Promise.all([restrictionService.getPackages().catch(() => []), restrictionService.getWhitelistSoftware().catch(() => [])]); 
    const nextPackages = Array.isArray(packageRows) ? packageRows : []; 
    const nextWhitelist = Array.isArray(whitelistRows) ? whitelistRows : []; 
    setPackages(nextPackages); 
    setWhitelistSoftware(nextWhitelist); 
    return { packages: nextPackages, whitelistSoftware: nextWhitelist }; 
  }, []);

  const loadPolicyData = useCallback(async () => { 
    if (!selectedTarget) return; 
    setLoadingData(true); 
    try { 
      const [lookups, effectivePolicy, policies, statuses] = await Promise.all([
        loadLookups(), 
        restrictionService.getEffectivePolicy(activeModule, selectedTarget), 
        restrictionService.getPolicyList(activeModule, selectedTarget).catch(() => []), 
        restrictionService.getRestrictionStatus(activeModule, selectedTarget, { search: statusSearch || undefined, startDate, endDate, includeSub: includeSub ? 1 : 0 }).catch(() => [])
      ]); 
      const policy = (effectivePolicy || {}) as RestrictionPolicyDetail; 
      const source = activeModule === 'appWhitelist' ? lookups.whitelistSoftware : lookups.packages; 
      setForm(createFormFromPolicy(activeModule, policy, selectedTarget)); 
      setSelectedDays(splitDays(getSetting(policy, 'day_select', ''))); 
      setPolicyRows(Array.isArray(policies) ? policies : []); 
      setStatusRows(Array.isArray(statuses) ? statuses : []); 
      const selected = selectedPolicyIds(policy, source); 
      if (activeModule === 'appWhitelist') setSelectedWhitelistIds(selected); else setSelectedPackageIds(selected); 
    } catch (error) { 
      addToast('error', 'Unable to load policy', error instanceof Error ? error.message : 'Please check restriction API.'); 
    } finally { 
      setLoadingData(false); 
    } 
  }, [activeModule, addToast, endDate, includeSub, loadLookups, selectedTarget, startDate, statusSearch]);

  useEffect(() => { void loadTree(); }, [loadTree]);
  useEffect(() => { void loadPolicyData(); }, [loadPolicyData]);
  useEffect(() => { setStatusSearch(''); setPolicySearch(''); setPackageSearch(''); setPackageView('all'); setPackagePage(1); setStatusPage(1); setPolicyPage(1); }, [activeModule]);
  useEffect(() => { setPackagePage(1); }, [packageSearch, packageView, activeModule, filteredLookupRows.length]);
  useEffect(() => { setStatusPage(1); }, [statusSearch, filteredStatusRows.length]);
  useEffect(() => { setPolicyPage(1); }, [policySearch, filteredPolicyRows.length]);

  const updateForm = (key: keyof FormState, value: any) => setForm((current) => ({ ...current, [key]: value }));
  const toggleDay = (day: string) => setSelectedDays((current) => (current.includes(day) ? current.filter((item) => item !== day) : [...current, day]));
  const togglePackage = (id: string) => { if (!id) return; const updater = (current: string[]) => { const next = new Set(current.filter(Boolean)); if (next.has(id)) next.delete(id); else next.add(id); return Array.from(next); }; if (isWhitelist) setSelectedWhitelistIds(updater); else setSelectedPackageIds(updater); };
  
  const savePolicy = async () => { 
    if (!selectedTarget) { addToast('warning', 'Select target first', 'Choose a branch or device before saving policy.'); return; } 
    setSaving(true); 
    try { 
      const basePayload = { 
        policy_id: form.policyId || 0, 
        target_type: selectedTarget.target_type ?? (selectedTarget as any).targetType ?? 1, 
        target_id: selectedTarget.target_id ?? (selectedTarget as any).targetId ?? selectedTarget.id ?? '-1', 
        Object_Rel_Idn: selectedTarget.Object_Rel_Idn, 
        Object_Root_Idn: selectedTarget.Object_Root_Idn, 
        Object_DeviceID: selectedTarget.Object_DeviceID, 
        use_parent_policy: isWhitelist ? '0' : form.inheritPolicy ? '1' : '0', 
        use_policy: form.exception ? '0' : '1', 
        update_interval: form.updateInterval || '120', 
        use_weekly_policy: form.weeklyPolicy ? '1' : '0', 
        day_select: selectedDays.join(','), 
        use_schedule: form.useSchedule ? '1' : '0', 
        login_id: getCurrentLoginId(), 
        console_ip: '' 
      }; 
      await restrictionService.savePolicy(activeModule, activeModule === 'appBlacklist' 
        ? { ...basePayload, restrict_type: form.appRestrictType, restrict_message: form.appNoticeMessage, version_compare: form.versionCompare ? '1' : '0', softwareRestrictSchedule1: form.schedule1, softwareRestrictSchedule2: form.schedule2, softwareRestrictSchedule3: form.schedule3, softwareRestrictSchedule4: form.schedule4, package_list: selectedIds } 
        : { ...basePayload, restrict_type: form.processRestrictType, restrict_message: form.processNoticeMessage, font_restrict_type: form.fontRestrictType, font_restrict_message: form.fontNoticeMessage, package_list: selectedIds }); 
      addToast('success', 'Policy saved', `${moduleConfig.label} saved successfully.`); 
      await loadPolicyData(); 
    } catch (error) { 
      addToast('error', 'Policy save failed', error instanceof Error ? error.message : 'Please check restriction API.'); 
    } finally { 
      setSaving(false); 
    } 
  };

  // --- Modal Logic ---
  const loadPackageManager = useCallback(async (search = packageManagerSearch) => {
    try {
      setPackageManagerLoading(true);
      const data = await restrictionService.getPackageManagerPackages(search, true);
      setPackageManagerRows(data);
      if (selectedManagerPackage) {
        const refreshed = data.find((item) => getPackageId(item) === getPackageId(selectedManagerPackage));
        if (refreshed) {
          const detail = await restrictionService.getPackageManagerPackage(getPackageId(refreshed));
          setSelectedManagerPackage(detail);
          setPackageForm({
            SW_Pkg_Name: detail.SW_Pkg_Name || '', SW_Pkg_Company: detail.SW_Pkg_Company || '', License_Qnt: Number(detail.License_Qnt || 0), Use_Statistices: Number(detail.Use_Statistices ?? 1), Cur_Count: Number(detail.Cur_Count || 0), SW_Package_EtcInfo: detail.SW_Package_EtcInfo || '', SW_Catg: Number(detail.SW_Catg || 0), Selected: Number(detail.Selected ?? 1),
          });
        }
      }
    } catch (error) { addToast('error', 'Failed to load', error instanceof Error ? error.message : 'Failed to load application packages.'); } 
    finally { setPackageManagerLoading(false); }
  }, [packageManagerSearch, selectedManagerPackage, addToast]);

  const openPackageManager = async () => { setShowPackageManager(true); await loadPackageManager(''); };
  const resetPackageForm = () => { setSelectedManagerPackage(null); setPackageForm({ SW_Pkg_Name: '', SW_Pkg_Company: '', License_Qnt: 0, Use_Statistices: 1, Cur_Count: 0, SW_Package_EtcInfo: '', SW_Catg: 0, Selected: 1 }); setPackageInventoryFiles([]); setPackageFileSearch(''); };
  
  const selectManagerPackage = async (item: RestrictionPackage) => {
    try {
      setPackageManagerLoading(true);
      const detail = await restrictionService.getPackageManagerPackage(getPackageId(item));
      setSelectedManagerPackage(detail);
      setPackageForm({ SW_Pkg_Name: detail.SW_Pkg_Name || '', SW_Pkg_Company: detail.SW_Pkg_Company || '', License_Qnt: Number(detail.License_Qnt || 0), Use_Statistices: Number(detail.Use_Statistices ?? 1), Cur_Count: Number(detail.Cur_Count || 0), SW_Package_EtcInfo: detail.SW_Package_EtcInfo || '', SW_Catg: Number(detail.SW_Catg || 0), Selected: Number(detail.Selected ?? 1) });
      setPackageInventoryFiles([]); setPackageFileSearch('');
    } catch (error) { addToast('error', 'Failed', error instanceof Error ? error.message : 'Failed to open package.'); } 
    finally { setPackageManagerLoading(false); }
  };

  const saveManagerPackage = async () => {
    if (!packageForm.SW_Pkg_Name.trim()) { addToast('warning', 'Required', 'Package name is required.'); return; }
    try {
      setPackageManagerLoading(true);
      const packageId = selectedManagerPackage ? getPackageId(selectedManagerPackage) : '';
      const result = packageId ? await restrictionService.updatePackageManagerPackage(packageId, packageForm) : await restrictionService.createPackageManagerPackage(packageForm);
      if (result.data) { setSelectedManagerPackage(result.data); }
      addToast('success', 'Saved', packageId ? 'Package updated.' : 'Package created.');
      await loadPackageManager(packageManagerSearch); await loadLookups();
    } catch (error) { addToast('error', 'Failed', error instanceof Error ? error.message : 'Failed to save package.'); } 
    finally { setPackageManagerLoading(false); }
  };

  const deleteManagerPackage = async (item: RestrictionPackage) => {
    const packageId = getPackageId(item); if (!packageId) return;
    if (!window.confirm(`Delete package "${getPackageName(item)}"?`)) return;
    try {
      setPackageManagerLoading(true);
      await restrictionService.deletePackageManagerPackage(packageId);
      addToast('success', 'Deleted', 'Package deleted.');
      if (selectedManagerPackage && getPackageId(selectedManagerPackage) === packageId) resetPackageForm();
      await loadPackageManager(packageManagerSearch); await loadLookups();
    } catch (error) { addToast('error', 'Failed', error instanceof Error ? error.message : 'Failed to delete package.'); } 
    finally { setPackageManagerLoading(false); }
  };

  const searchInventoryFilesForPackage = async () => {
    try {
      setPackageManagerLoading(true);
      const data = await restrictionService.searchPackageManagerFiles(packageFileSearch, 'EXE');
      setPackageInventoryFiles(data);
      addToast('info', 'Search complete', `Found ${data.length} EXE files.`);
    } catch (error) { addToast('error', 'Failed', error instanceof Error ? error.message : 'Failed to search files.'); } 
    finally { setPackageManagerLoading(false); }
  };

  const addInventoryFileToPackage = async (file: RestrictionPackageFile) => {
    const packageId = selectedManagerPackage ? getPackageId(selectedManagerPackage) : '';
    if (!packageId) { addToast('warning', 'Notice', 'Save package first.'); return; }
    try {
      setPackageManagerLoading(true);
      const result = await restrictionService.addPackageManagerFile(packageId, { FileName: file.FileName, FileVersion: file.FileVersion || '', FileVersionSub: '%', FileSize: file.FileSize || 0, bHide: 0 });
      if (result.data) setSelectedManagerPackage(result.data);
      addToast('success', 'Added', 'File added to package.');
      await loadPackageManager(packageManagerSearch); await loadLookups();
    } catch (error) { addToast('error', 'Failed', error instanceof Error ? error.message : 'Failed to add file.'); } 
    finally { setPackageManagerLoading(false); }
  };

  const deletePackageFile = async (file: RestrictionPackageFile) => {
    const packageId = selectedManagerPackage ? getPackageId(selectedManagerPackage) : '';
    if (!packageId || !file.ID) return;
    try {
      setPackageManagerLoading(true);
      const result = await restrictionService.deletePackageManagerFile(packageId, file.ID);
      if (result.data) setSelectedManagerPackage(result.data);
      addToast('success', 'Deleted', 'File removed from package.');
      await loadPackageManager(packageManagerSearch); await loadLookups();
    } catch (error) { addToast('error', 'Failed', error instanceof Error ? error.message : 'Failed to remove file.'); } 
    finally { setPackageManagerLoading(false); }
  };


  function renderTree(nodes: RestrictionTreeNode[], depth = 0): ReactNode { 
    return <div>{nodes.map((node, index) => { 
      const id = getNodeId(node, index); 
      const label = getNodeLabel(node); 
      const children = getChildren(node); 
      const open = expandedNodes.has(id); 
      const target = getTarget(node, index); 
      const active = selectedTarget?.id === target.id; 
      const type = getNodeType(node); 
      const Icon = type === 'device' ? Laptop : children.length && open ? FolderOpen : Folder; 
      return (
        <div key={id}>
          <EmaSidebarTreeRow active={active} depth={depth} onClick={() => { setSelectedTarget(target); if (children.length) setExpandedNodes((current) => new Set(current).add(id)); }}>
            <button type="button" onClick={(event) => { event.stopPropagation(); setExpandedNodes((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }} className="grid size-5 shrink-0 place-items-center text-slate-500">{children.length ? (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}</button>
            {type === 'root' ? <Layers size={16} /> : <Icon size={16} />}
            <span className="min-w-0 flex-1 truncate">{type === 'root' ? 'All Branches' : label}</span>
            {type !== 'device' && countNodes(node) > 0 ? <small className="rounded-full bg-slate-100 px-2 font-bold">{countNodes(node).toLocaleString()}</small> : type === 'device' ? <small>Device</small> : null}
          </EmaSidebarTreeRow>
          {children.length && open ? renderTree(children, depth + 1) : null}
        </div>
      ); 
    })}</div>; 
  }

  const statusColumns: EmaTableColumn<RestrictionStatusRow>[] = [
    { key: 'device', header: 'Device', render: (row) => <span><strong className="block text-slate-950">{pick(row, ['ComputerName', 'Object_DeviceID', 'DeviceID', 'deviceName', 'hostname'])}</strong><small className="font-bold text-slate-500">{pick(row, ['Branch', 'Department', 'Object_Full_Name', 'location'], '')}</small></span> }, 
    { key: 'package', header: isWhitelist ? 'Software' : 'Package', render: (row) => getPackageName(row) }, 
    { key: 'type', header: 'Event', render: (row) => pick(row, ['EVT_TYPE', 'evt_type', 'Type'], '-') },
    { key: 'status', header: 'Status', render: (row) => { const value = pick(row, ['Status', 'status', 'Result', 'result', 'State', 'state', 'EVT_CNT'], 'Unknown'); return <Badge className={badgeClass(value)}>{value}</Badge>; } }, 
    { key: 'updated', header: 'Updated', render: (row) => pick(row, ['UpdatedAt', 'updatedAt', 'LastUpdate', 'lastSeen', 'LastSeen'], '-') }
  ];
  const policyColumns: EmaTableColumn<RestrictionPolicyRow>[] = [
    { key: 'policy', header: 'Policy', render: (row) => pick(row, ['PolicyName', 'policyName', 'name', 'policy_id', 'PolicyID'], '-') }, 
    { key: 'target', header: 'Target', render: (row) => pick(row, ['Object_Full_Name', 'targetName', 'Target', 'Branch'], '-') }, 
    { key: 'status', header: 'Status', render: (row) => { const value = pick(row, ['status', 'Status', 'use_policy', 'enabled'], 'Active'); return <Badge className={badgeClass(value)}>{value}</Badge>; } }, 
    { key: 'updated', header: 'Updated', render: (row) => pick(row, ['UpdatedAt', 'updatedAt', 'ModifiedDate', 'created_at'], '-') }
  ];
  const lookupColumns: EmaTableColumn<LookupRow>[] = [
    { key: 'state', header: 'Status', width: '7rem', render: (row) => selectedSet.has(getPackageId(row)) ? <Badge className={isWhitelist ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}>Selected</Badge> : <Badge className="border-slate-200 bg-slate-50 text-slate-500">Available</Badge> }, 
    { key: 'name', header: isWhitelist ? 'Whitelist Software' : 'Restricted Package', render: (row) => <span><strong className="block text-slate-950">{getPackageName(row)}</strong><small className="font-bold text-slate-500">ID: {getPackageId(row) || '-'}</small></span> }, 
    { key: 'company', header: 'Company', render: (row) => pick(row, ['SW_Pkg_Company', 'Company', 'vendor'], 'No company') }, 
    { key: 'action', header: 'Action', align: 'right', render: (row) => { const id = getPackageId(row); const selected = selectedSet.has(id); return <button type="button" onClick={() => togglePackage(id)} className={cn('inline-flex h-9 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-black transition', selected && isWhitelist && 'border-emerald-200 bg-emerald-50 text-emerald-700', selected && !isWhitelist && 'border-rose-200 bg-rose-50 text-rose-700', !selected && 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700')}>{selected ? <CheckCircle2 size={14} /> : <Package size={14} />}{selected ? 'Selected' : 'Add'}</button>; } }
  ];

  const sidebar = (
    <EmaSidebarPanel 
      eyebrow="App Control" 
      title="Branch Scope" 
      description="Select branch or device before applying policy." 
      tabs={[{ id: 'branch', label: 'Branch', icon: <FolderOpen size={16} /> }, { id: 'policy', label: 'Policy', icon: <Database size={16} /> }]} 
      activeTab="branch" onTabChange={() => undefined} 
      searchValue={treeSearch} searchPlaceholder="Search branches..." onSearchChange={setTreeSearch}>
        {loadingTree ? <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold text-blue-700"><Loader2 size={16} className="animate-spin" /> Loading branches...</div> : filteredTree.length ? renderTree(filteredTree) : <div className="rounded-xl border border-slate-200 p-4 text-sm font-bold text-slate-500">No branch scope found.</div>}
    </EmaSidebarPanel>
  );

  return (
    <>
      <EmaToastViewport items={toasts} onClose={(id) => setToasts((items) => items.filter((item) => item.id !== id))} />
      <EmaPageLayout title="Application Restriction" subtitle="Manage application restriction policies." sidebar={sidebar}>
        <div className="space-y-3" data-section="app-restriction">
          
          <EmaSection 
            eyebrow="Application Governance" 
            title={moduleConfig.label} 
            description={moduleConfig.helper} 
            action={
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                {MODULES.map((item) => { 
                  const Icon = item.icon; 
                  const active = item.id === activeModule; 
                  return <button key={item.id} type="button" onClick={() => setActiveModule(item.id)} className={cn('flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-black transition', active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-950')}><Icon size={16} />{item.shortLabel}</button>; 
                })}
              </div>
            }
          >
            <EmaKpiGrid>
              <EmaKpiCard title="Target" value={selectedTarget?.label || 'All Branches'} note="current scope" icon={<Layers size={16} />} />
              <EmaKpiCard title={isWhitelist ? 'Allowed Software' : 'Blocked Packages'} value={selectedLookupCount} note={`${lookupRows.length} available`} icon={<Package size={16} />} tone={isWhitelist ? 'emerald' : 'rose'} />
              <EmaKpiCard title="Status Rows" value={statusRows.length} note="monitor records" icon={<CheckCircle2 size={16} />} tone="violet" />
              <EmaKpiCard title="Policy Rows" value={policyRows.length} note="registry records" icon={<Ban size={16} />} tone="amber" />
            </EmaKpiGrid>
          </EmaSection>

          <EmaToolbar 
            left={
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                {(Object.keys(TAB_LABELS) as SubTab[]).map((tab) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={cn('rounded-lg px-4 py-2 text-sm font-black transition', activeTab === tab ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-slate-900')}>{TAB_LABELS[tab]}</button>)}
              </div>
            } 
            right={
              <>
                <EmaButton variant="primary" onClick={openPackageManager}><Package size={15}/> Package Manager</EmaButton>
                {isWhitelist && <EmaButton variant="primary" onClick={() => setShowManageSoftware(true)}><ListChecks size={15}/> Register File</EmaButton>}
                <EmaButton variant="secondary" onClick={() => void loadPolicyData()}><RefreshCw size={15} className={loadingData ? 'animate-spin' : ''} /> Refresh</EmaButton>
                <EmaButton variant="ghost" onClick={() => { setStatusSearch(''); setPolicySearch(''); setPackageSearch(''); setPackageView('all'); setStartDate(daysAgo(30)); setEndDate(today()); }}><RotateCcw size={15} /> Reset</EmaButton>
              </>
            } 
          />
          
          {activeTab === 'status' ? (
            <div className="space-y-3">
              <EmaToolbar search={<EmaSearchInput value={statusSearch} onChange={setStatusSearch} placeholder="Search device, package, status..." />} filters={<><EmaFilterField label="Date From"><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="h-10 border rounded-xl px-3 outline-none"/></EmaFilterField><EmaFilterField label="Date To"><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="h-10 border rounded-xl px-3 outline-none"/></EmaFilterField><EmaButton variant={includeSub ? 'primary' : 'secondary'} onClick={() => setIncludeSub((value) => !value)}>Include Sub</EmaButton></>} />
              <EmaTableShell title="Restriction Status" subtitle="Current application restriction status by device.">
                <EmaTable columns={statusColumns} rows={statusPaged.rows} loading={loadingData} emptyText="No restriction status found." getRowKey={(row, index) => `${pick(row, ['id', 'ID', 'Object_DeviceID', 'ComputerName'], 'row')}-${statusPaged.start + index}`} />
                {filteredStatusRows.length > PAGE_SIZE ? <EmaPagination page={statusPaged.safePage} totalPages={statusPaged.totalPages} totalLabel={`${statusPaged.start + 1}-${Math.min(filteredStatusRows.length, statusPaged.start + PAGE_SIZE)} of ${filteredStatusRows.length}`} onPageChange={setStatusPage} /> : null}
              </EmaTableShell>
            </div>
          ) : null}

          {activeTab === 'settings' ? (
            <div className="space-y-3">
              <EmaSection eyebrow="Policy Settings" title="Restriction Rule" description="Update policy behaviour, schedule and package list.">
                <div className="grid gap-3 lg:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><FieldLabel>Update Interval</FieldLabel><input value={form.updateInterval} onChange={(event) => updateForm('updateInterval', event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none" /></div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><FieldLabel>{isWhitelist ? 'Process Restrict Type' : 'App Restrict Type'}</FieldLabel><select value={isWhitelist ? form.processRestrictType : form.appRestrictType} onChange={(event) => updateForm(isWhitelist ? 'processRestrictType' : 'appRestrictType', event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none">{(isWhitelist ? [{ value: '0', label: 'Disabled' }, { value: '1', label: 'Allow Whitelist' }, { value: '2', label: 'Audit Only' }, { value: '3', label: 'Strict Mode' }] : [{ value: '1', label: 'Block Package' }, { value: '2', label: 'Warn User' }, { value: '3', label: 'Audit Only' }]).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><FieldLabel>Weekly Policy</FieldLabel><button type="button" onClick={() => updateForm('weeklyPolicy', !form.weeklyPolicy)} className={cn('h-10 w-full rounded-xl border px-4 text-sm font-black transition', form.weeklyPolicy ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500')}>{form.weeklyPolicy ? 'Enabled' : 'Disabled'}</button></div>
                </div>
              </EmaSection>
              <EmaToolbar left={<div><p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-slate-500">{isWhitelist ? 'Whitelist Software' : 'Restricted Package'}</p><h3 className="text-base font-extrabold text-slate-950">{selectedLookupCount} selected from {lookupRows.length}</h3></div>} search={<EmaSearchInput value={packageSearch} onChange={setPackageSearch} placeholder={isWhitelist ? 'Search whitelist software...' : 'Search package...'} />} filters={<><EmaButton variant={packageView === 'all' ? 'primary' : 'secondary'} onClick={() => setPackageView('all')}>All {lookupRows.length}</EmaButton><EmaButton variant={packageView === 'selected' ? 'primary' : 'secondary'} onClick={() => setPackageView('selected')}>Selected {selectedLookupCount}</EmaButton><EmaButton variant={packageView === 'available' ? 'primary' : 'secondary'} onClick={() => setPackageView('available')}>Available {availableLookupCount}</EmaButton></>} />
              <EmaTableShell title={isWhitelist ? 'Whitelist Software' : 'Restricted Package'} subtitle="Compact package picker using the same table layout as the inventory modules.">
                <EmaTable columns={lookupColumns} rows={lookupPaged.rows} loading={loadingData} emptyText="No package found." getRowKey={(row, index) => `${getPackageId(row) || getPackageName(row)}-${lookupPaged.start + index}`} />
                {filteredLookupRows.length > LOOKUP_PAGE_SIZE ? <EmaPagination page={lookupPaged.safePage} totalPages={lookupPaged.totalPages} totalLabel={`${lookupPaged.start + 1}-${Math.min(filteredLookupRows.length, lookupPaged.start + LOOKUP_PAGE_SIZE)} of ${filteredLookupRows.length}`} onPageChange={setPackagePage} /> : null}
              </EmaTableShell>
              <EmaSection eyebrow="Schedule" title="Notice and Policy Window" description="Set user notice and weekly schedule.">
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><FieldLabel>Notice Message</FieldLabel><textarea value={isWhitelist ? form.processNoticeMessage : form.appNoticeMessage} onChange={(event) => updateForm(isWhitelist ? 'processNoticeMessage' : 'appNoticeMessage', event.target.value)} rows={4} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none" placeholder="Message shown to user when policy is applied." /></div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><FieldLabel>Policy Days</FieldLabel><div className="flex flex-wrap gap-2">{DAY_OPTIONS.map((day) => { const selected = selectedDays.includes(day); return <button key={day} type="button" onClick={() => toggleDay(day)} className={cn('h-9 rounded-xl border px-3 text-xs font-black transition', selected ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500')}>{day}</button>; })}</div><div className="mt-3 grid gap-3 sm:grid-cols-2">{[1, 2, 3, 4].map((slot) => <input key={slot} value={(form as any)[`schedule${slot}`]} onChange={(event) => updateForm(`schedule${slot}` as keyof FormState, event.target.value)} placeholder={`Schedule ${slot}`} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none" />)}</div></div>
                </div>
              </EmaSection>
              <div className="flex justify-end"><EmaButton variant="primary" onClick={() => void savePolicy()} disabled={saving || loadingData}>{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save Policy</EmaButton></div>
            </div>
          ) : null}

          {activeTab === 'policyStatus' ? (
            <div className="space-y-3">
              <EmaToolbar search={<EmaSearchInput value={policySearch} onChange={setPolicySearch} placeholder="Search policy status..." />} />
              <EmaTableShell title="Policy Status" subtitle="Application restriction policy registry.">
                <EmaTable columns={policyColumns} rows={policyPaged.rows} loading={loadingData} emptyText="No policy status found." getRowKey={(row, index) => `${pick(row, ['id', 'ID', 'policy_id', 'PolicyID'], 'policy')}-${policyPaged.start + index}`} />
                {filteredPolicyRows.length > PAGE_SIZE ? <EmaPagination page={policyPaged.safePage} totalPages={policyPaged.totalPages} totalLabel={`${policyPaged.start + 1}-${Math.min(filteredPolicyRows.length, policyPaged.start + PAGE_SIZE)} of ${filteredPolicyRows.length}`} onPageChange={setPolicyPage} /> : null}
              </EmaTableShell>
            </div>
          ) : null}

        </div>
      </EmaPageLayout>

      {/* Legacy Modals Appended Here */}
      {showPackageManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={() => setShowPackageManager(false)}>
          <div className="flex max-h-[92vh] w-[1100px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <div><h3 className="text-base font-black text-slate-900">Package Manager</h3><p className="text-[11px] font-bold text-slate-500">Manage Application Packages and Software Inventory files.</p></div>
              <button type="button" onClick={() => setShowPackageManager(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="flex flex-1 min-h-[500px] overflow-hidden">
               {/* Left Pane - Packages */}
               <div className="w-1/3 border-r bg-slate-50 p-4 flex flex-col">
                  <div className="flex gap-2 mb-4">
                     <input value={packageManagerSearch} onChange={(e) => setPackageManagerSearch(e.target.value)} placeholder="Search Packages" className="flex-1 h-9 rounded-lg border px-3 text-sm outline-none" />
                     <EmaButton variant="primary" onClick={() => loadPackageManager(packageManagerSearch)}><Search size={14}/></EmaButton>
                     <EmaButton variant="secondary" onClick={resetPackageForm}>New</EmaButton>
                  </div>
                  <div className="flex-1 overflow-auto rounded-lg border bg-white">
                     {packageManagerLoading && packageManagerRows.length === 0 ? <div className="p-4 text-center text-sm">Loading...</div> : 
                      packageManagerRows.map(pkg => (
                         <div key={getPackageId(pkg)} onClick={() => selectManagerPackage(pkg)} className={cn("p-3 border-b cursor-pointer hover:bg-blue-50", selectedManagerPackage && getPackageId(selectedManagerPackage) === getPackageId(pkg) ? "bg-blue-50" : "")}>
                           <div className="font-bold text-slate-800 text-sm">{getPackageName(pkg)}</div>
                           <div className="text-xs text-slate-500">{pkg.SW_Pkg_Company || '-'}</div>
                         </div>
                      ))
                     }
                  </div>
               </div>
               {/* Right Pane - Detail */}
               <div className="w-2/3 p-4 overflow-auto flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><FieldLabel>Package Name</FieldLabel><input value={packageForm.SW_Pkg_Name} onChange={(e) => setPackageForm({...packageForm, SW_Pkg_Name: e.target.value})} className="h-10 w-full rounded-lg border px-3 text-sm outline-none" /></div>
                    <div><FieldLabel>Company</FieldLabel><input value={packageForm.SW_Pkg_Company || ''} onChange={(e) => setPackageForm({...packageForm, SW_Pkg_Company: e.target.value})} className="h-10 w-full rounded-lg border px-3 text-sm outline-none" /></div>
                  </div>
                  <div className="flex gap-2">
                     <EmaButton variant="primary" onClick={saveManagerPackage} disabled={packageManagerLoading}><Save size={15}/> {selectedManagerPackage ? 'Save Package' : 'Create Package'}</EmaButton>
                     {selectedManagerPackage && <EmaButton variant="secondary" onClick={() => deleteManagerPackage(selectedManagerPackage!)} disabled={packageManagerLoading}><Trash2 size={15}/> Delete Package</EmaButton>}
                  </div>
                  {selectedManagerPackage && (
                     <div className="mt-4 border rounded-xl p-4 bg-slate-50">
                       <FieldLabel>Files inside package</FieldLabel>
                       <div className="flex gap-2 mb-4">
                          <input value={packageFileSearch} onChange={(e) => setPackageFileSearch(e.target.value)} placeholder="Search inventory file (e.g. chrome)" className="flex-1 h-9 rounded-lg border px-3 text-sm outline-none" />
                          <EmaButton variant="primary" onClick={searchInventoryFilesForPackage}>Search Inventory</EmaButton>
                       </div>
                       {packageInventoryFiles.length > 0 && (
                         <div className="max-h-40 overflow-auto border rounded-lg bg-white mb-4 p-2">
                            {packageInventoryFiles.map(file => (
                               <div key={file.SW_Idn || file.FileName} className="flex justify-between items-center p-2 border-b">
                                 <div><div className="text-sm font-bold">{file.FileName}</div><div className="text-xs text-slate-500">{file.FileVersion || '-'}</div></div>
                                 <EmaButton variant="secondary" onClick={() => addInventoryFileToPackage(file)}>Add</EmaButton>
                               </div>
                            ))}
                         </div>
                       )}
                       <div className="bg-white border rounded-lg overflow-hidden">
                         <table className="w-full text-left text-sm">
                           <thead className="bg-slate-100"><tr><th className="p-2">File Name</th><th className="p-2">Version</th><th className="p-2">Action</th></tr></thead>
                           <tbody>
                             {(selectedManagerPackage.files || []).map(f => (
                               <tr key={f.ID || f.FileName} className="border-t">
                                 <td className="p-2">{f.FileName}</td><td className="p-2">{f.FileVersion || '-'}</td>
                                 <td className="p-2"><button onClick={() => deletePackageFile(f)} className="text-slate-400 hover:text-red-500"><Trash2 size={15}/></button></td>
                               </tr>
                             ))}
                             {!(selectedManagerPackage.files || []).length && <tr><td colSpan={3} className="p-4 text-center text-slate-400">No files</td></tr>}
                           </tbody>
                         </table>
                       </div>
                     </div>
                  )}
               </div>
            </div>
          </div>
        </div>
      )}

      {showManageSoftware && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={() => setShowManageSoftware(false)}>
           <div className="flex max-h-[92vh] w-[900px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-100 p-4">
                 <div><h3 className="text-base font-black text-slate-900">Manage Software List</h3><p className="text-[11px] font-bold text-slate-500">Permitted software rules.</p></div>
                 <button type="button" onClick={() => setShowManageSoftware(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
              </div>
              <div className="p-4">
                 <div className="p-4 bg-slate-50 border rounded-xl mb-4 text-sm text-slate-600">Please use the primary Policy Settings page to manage App Whitelist policies for now. Advanced Hash and Registry File rule assignment is synchronized via backend scheduled tasks.</div>
                 <EmaButton variant="secondary" onClick={() => setShowManageSoftware(false)}>Close</EmaButton>
              </div>
           </div>
        </div>
      )}
    </>
  );
}