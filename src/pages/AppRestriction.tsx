import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Laptop,
  Layers,
  Loader2,
  Package,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import restrictionService, {
  getCurrentLoginId,
  type RestrictionPackage,
  type RestrictionPolicyDetail,
  type RestrictionPolicyRow,
  type RestrictionStatusRow,
  type RestrictionTarget,
  type RestrictionTreeNode,
  type WhitelistSoftware,
} from '../services/restrictionService';
import { EmaToastViewport, type EmaToastItem, type EmaToastTone } from '../components/ema/EmaToast';

type AppModule = 'appBlacklist' | 'appWhitelist';
type SubTab = 'status' | 'settings' | 'policyStatus';
type PackageView = 'all' | 'selected' | 'available';

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
};

const MODULES: Array<{ id: AppModule; label: string; shortLabel: string; helper: string; icon: typeof ShieldAlert; tone: 'rose' | 'emerald' }> = [
  { id: 'appBlacklist', label: 'App Restriction', shortLabel: 'Restriction', helper: 'Block unauthorized software and executable usage.', icon: ShieldAlert, tone: 'rose' },
  { id: 'appWhitelist', label: 'App Whitelist', shortLabel: 'Whitelist', helper: 'Permit approved software and application execution.', icon: ShieldCheck, tone: 'emerald' },
];

const TAB_LABELS: Record<SubTab, string> = {
  status: 'Restriction Status',
  settings: 'Policy Settings',
  policyStatus: 'Policy Status',
};

const DEFAULT_FORM: FormState = {
  policyId: 0,
  inheritPolicy: false,
  exception: false,
  updateInterval: '120',
  weeklyPolicy: false,
  useSchedule: false,
  schedule1: '',
  schedule2: '',
  schedule3: '',
  schedule4: '',
  appRestrictType: '1',
  versionCompare: false,
  appNoticeMessage: '',
  processRestrictType: '0',
  processNoticeMessage: '',
  fontRestrictType: '0',
  fontNoticeMessage: '',
};

const DAY_OPTIONS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const TABLE_PAGE_SIZE = 10;
const LOOKUP_PAGE_SIZE = 12;

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function asArray<T = any>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.data)) return record.data as T[];
    if (Array.isArray(record.rows)) return record.rows as T[];
    if (Array.isArray(record.recordset)) return record.recordset as T[];
  }
  return [];
}

function cleanText(value: unknown, fallback = '') {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function pick(row: Record<string, unknown> | null | undefined, keys: string[], fallback = '-') {
  if (!row) return fallback;

  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value);
  }

  const normalized = Object.entries(row).map(([key, value]) => [key.toLowerCase().replace(/[\s_\-().]/g, ''), value]);
  const map = Object.fromEntries(normalized);

  for (const key of keys) {
    const value = map[key.toLowerCase().replace(/[\s_\-().]/g, '')];
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value);
  }

  return fallback;
}

function pickNumber(row: Record<string, unknown> | null | undefined, keys: string[], fallback = 0) {
  const value = pick(row, keys, '');
  const parsed = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getNodeLabel(node: RestrictionTreeNode) {
  return cleanText(node.label || node.name || node.Object_Rel_Name || node.Object_Full_Name || node.ComputerName || node.Object_DeviceID || node.MDM_DeviceID, 'Unnamed scope');
}

function getNodeId(node: RestrictionTreeNode, index = 0) {
  return cleanText(node.id || node.ID || node.Object_Rel_Idn || node.Object_Root_Idn || node.target_id || node.Object_DeviceID || node.MDM_DeviceID, `node-${index}`);
}

function getNodeType(node: RestrictionTreeNode): 'root' | 'department' | 'device' {
  const rawType = String(node.type || node.Type || '').toLowerCase();
  if (rawType.includes('device') || node.Object_Root_Idn || node.Object_DeviceID || node.MDM_DeviceID) return 'device';
  if (rawType.includes('root') || rawType.includes('org')) return 'root';
  return 'department';
}

function getChildren(node: RestrictionTreeNode): RestrictionTreeNode[] {
  return asArray<RestrictionTreeNode>(node.children || node.Children || node.items || node.nodes);
}

function getTarget(node: RestrictionTreeNode, index = 0): RestrictionTarget {
  const nodeType = getNodeType(node);
  const label = getNodeLabel(node);

  if (nodeType === 'root') {
    return { id: 'root', label: 'All Branches', type: 'root', target_type: 1, target_id: '-1', Object_Full_Name: 'Root Policy' };
  }

  if (nodeType === 'device') {
    const rootId = cleanText(node.Object_Root_Idn || node.objectRootIdn || node.MDM_Asset_Idn || node.assetId || node.target_id || node.id || index);
    return {
      id: `device-${rootId}`,
      label,
      type: 'device',
      target_type: 3,
      target_id: rootId,
      Object_Root_Idn: rootId,
      Object_DeviceID: node.Object_DeviceID || node.MDM_DeviceID || node.DeviceID || '',
      Object_Full_Name: node.Object_Full_Name || node.Department || node.Branch || '',
    };
  }

  const relationId = cleanText(node.Object_Rel_Idn || node.objectRelIdn || node.target_id || node.id || index);
  return { id: `department-${relationId}`, label, type: 'department', target_type: 2, target_id: relationId, Object_Rel_Idn: relationId, Object_Full_Name: node.Object_Full_Name || node.path || label };
}

function countDevices(node: RestrictionTreeNode): number {
  const directCount = pickNumber(node as Record<string, unknown>, ['count', 'badge', 'total', 'deviceCount', 'TotalDevices'], 0);
  if (directCount > 0) return directCount;
  if (getNodeType(node) === 'device') return 1;
  return getChildren(node).reduce((total, child) => total + countDevices(child), 0);
}

function filterTree(nodes: RestrictionTreeNode[], query: string): RestrictionTreeNode[] {
  const search = query.trim().toLowerCase();
  if (!search) return nodes;

  return nodes
    .map((node) => {
      const label = [getNodeLabel(node), node.Object_Full_Name, node.Object_DeviceID, node.MDM_DeviceID, node.type].filter(Boolean).join(' ').toLowerCase();
      const children = filterTree(getChildren(node), search);
      if (label.includes(search) || children.length) return { ...node, children };
      return null;
    })
    .filter(Boolean) as RestrictionTreeNode[];
}

function findFirstTarget(nodes: RestrictionTreeNode[]): RestrictionTarget | null {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    const target = getTarget(node, index);
    if (target) return target;
    const nested = findFirstTarget(getChildren(node));
    if (nested) return nested;
  }
  return null;
}

function getPackageId(item: Partial<RestrictionPackage | WhitelistSoftware> | null | undefined): string {
  if (!item) return '';
  return cleanText((item as any).SW_Pkg_Idn || (item as any).SW_Pkg_IDN || (item as any).sw_pkg_idn || (item as any).PackageID || (item as any).packageId || (item as any).WLSWIdn || (item as any).WLSWIDN || (item as any).id || (item as any).ID);
}

function getPackageName(item: Partial<RestrictionPackage | WhitelistSoftware> | null | undefined): string {
  if (!item) return 'Unnamed package';
  return cleanText((item as any).SW_Pkg_Name || (item as any).SW_Pkg_NAME || (item as any).PackageName || (item as any).packageName || (item as any).Name || (item as any).name || (item as any).SW_Name || (item as any).softwareName, 'Unnamed package');
}

function getPolicySetting(policy: RestrictionPolicyDetail | null, key: string, fallback = '') {
  if (!policy) return fallback;
  const direct = policy.settings?.[key] ?? policy[key];
  if (direct !== undefined && direct !== null && String(direct).trim() !== '') return String(direct);
  const settingItems = asArray<any>(policy.settingItems || policy.items || policy.settingsList);
  const found = settingItems.find((item) => cleanText(item.policy_key || item.key).toLowerCase() === key.toLowerCase());
  if (found?.policy_value !== undefined && found?.policy_value !== null) return String(found.policy_value);
  return fallback;
}

function getPolicySettingValues(policy: RestrictionPolicyDetail | null, key: string): string[] {
  if (!policy) return [];
  const settingItems = asArray<any>(policy.settingItems || policy.items || policy.settingsList);
  return settingItems
    .filter((item) => cleanText(item.policy_key || item.key).toLowerCase() === key.toLowerCase())
    .sort((a, b) => Number(a.seq || 0) - Number(b.seq || 0))
    .map((item) => cleanText(item.policy_value || item.value))
    .filter(Boolean);
}

function splitDays(value: string) {
  if (!value) return [];
  const upper = value.toUpperCase();
  if (upper.includes(',')) return upper.split(',').map((item) => item.trim()).filter(Boolean);
  return DAY_OPTIONS.filter((day) => upper.includes(day));
}

function createFormFromPolicy(module: AppModule, policy: RestrictionPolicyDetail | null): FormState {
  const schedules = getPolicySettingValues(policy, 'SoftwareRestrictSchedule');
  return {
    policyId: Number(policy?.policy_id || policy?.PolicyID || policy?.id || 0),
    inheritPolicy: getPolicySetting(policy, 'parent_policy', '0') !== '0' || getPolicySetting(policy, 'use_parent_policy', '0') === '1',
    exception: getPolicySetting(policy, 'use_policy', '1') === '0',
    updateInterval: getPolicySetting(policy, module === 'appWhitelist' ? 'update_log_interval' : 'update_policy_result_interval', '120'),
    weeklyPolicy: getPolicySetting(policy, 'use_weekly_policy', '0') === '1',
    useSchedule: getPolicySetting(policy, 'use_schedule', '0') === '1',
    schedule1: schedules[0] || '',
    schedule2: schedules[1] || '',
    schedule3: schedules[2] || '',
    schedule4: schedules[3] || '',
    appRestrictType: (getPolicySetting(policy, 'SoftwareRestrictType', '1') as FormState['appRestrictType']) || '1',
    versionCompare: getPolicySetting(policy, 'SoftwareRestrictCheckVerson', '0') === '1',
    appNoticeMessage: getPolicySetting(policy, 'SoftwareRestrictMessage', ''),
    processRestrictType: (getPolicySetting(policy, 'process_restrict_type', '0') as FormState['processRestrictType']) || '0',
    processNoticeMessage: getPolicySetting(policy, 'process_restrict_message', ''),
    fontRestrictType: (getPolicySetting(policy, 'font_restrict_type', '0') as FormState['fontRestrictType']) || '0',
    fontNoticeMessage: getPolicySetting(policy, 'font_restrict_message', ''),
  };
}

function extractSelectedPolicyIds(policy: RestrictionPolicyDetail | null, sourceRows: Array<RestrictionPackage | WhitelistSoftware>) {
  if (!policy) return [];
  const direct = [...asArray<any>(policy.package_list), ...asArray<any>(policy.packages), ...asArray<any>(policy.selectedPackages), ...asArray<any>(policy.whitelistSoftware)];
  const directIds = direct.map((item) => (typeof item === 'object' ? getPackageId(item) : cleanText(item))).filter(Boolean);
  if (directIds.length) return Array.from(new Set(directIds));
  const settingItems = asArray<any>(policy.settingItems || policy.items || policy.settingsList);
  const values = settingItems.filter((item) => /package|software|whitelist/i.test(cleanText(item.policy_key || item.key))).map((item) => cleanText(item.policy_value || item.value)).filter(Boolean);
  if (values.length) return Array.from(new Set(values));
  return Array.from(new Set(sourceRows.filter((row: any) => row.Selected || row.selected || row.use_policy).map(getPackageId).filter(Boolean)));
}

function getStatusColor(value: string) {
  const text = value.toLowerCase();
  if (text.includes('blocked') || text.includes('denied') || text.includes('restrict')) return 'border-rose-200 bg-rose-50 text-rose-700';
  if (text.includes('allowed') || text.includes('success') || text.includes('installed')) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (text.includes('pending') || text.includes('waiting')) return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function PaginationFooter({ page, totalPages, totalItems, start, pageSize, onPageChange }: { page: number; totalPages: number; totalItems: number; start: number; pageSize: number; onPageChange: (page: number) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
      <span className="text-sm font-bold text-slate-500">{totalItems === 0 ? 0 : start + 1}-{Math.min(totalItems, start + pageSize)} of {totalItems}</span>
      <div className="flex items-center gap-2">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-600 disabled:opacity-40">Prev</button>
        <span className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-black text-white">{page}</span>
        <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">of {totalPages}</span>
        <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-600 disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}

function Table({ columns, rows, loading, emptyText = 'No records found.' }: { columns: Array<{ key: string; label: string; render?: (row: any, index: number) => ReactNode }>; rows: any[]; loading?: boolean; emptyText?: string }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / TABLE_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * TABLE_PAGE_SIZE;
  const pageRows = rows.slice(start, start + TABLE_PAGE_SIZE);
  useEffect(() => setPage(1), [rows.length]);

  return (
    <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white">
      <div className="overflow-auto">
        <table className="min-w-full border-separate border-spacing-0 text-left">
          <thead>
            <tr className="bg-slate-50">
              {columns.map((column) => <th key={column.key} className="whitespace-nowrap border-b border-slate-200 px-5 py-4 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{column.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} className="px-5 py-14 text-center"><div className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700"><Loader2 size={16} className="animate-spin" />Loading records...</div></td></tr>
            ) : pageRows.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-5 py-14 text-center text-sm font-bold text-slate-500">{emptyText}</td></tr>
            ) : pageRows.map((row, index) => (
              <tr key={`${pick(row, ['id', 'ID', 'Object_DeviceID', 'ComputerName'], 'row')}-${start + index}`} className="transition hover:bg-slate-50">
                {columns.map((column) => <td key={column.key} className="border-b border-slate-100 px-5 py-4 align-top text-sm font-semibold text-slate-700">{column.render ? column.render(row, start + index) : pick(row, [column.key])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > TABLE_PAGE_SIZE ? <PaginationFooter page={safePage} totalPages={totalPages} totalItems={rows.length} start={start} pageSize={TABLE_PAGE_SIZE} onPageChange={setPage} /> : null}
    </div>
  );
}

function Select({ value, options, onChange, disabled }: { value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <div className="relative">
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-100 disabled:text-slate-400">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{children}</label>;
}

export default function AppRestriction() {
  const [activeModule, setActiveModule] = useState<AppModule>('appBlacklist');
  const [activeTab, setActiveTab] = useState<SubTab>('status');
  const [treeNodes, setTreeNodes] = useState<RestrictionTreeNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root', 'organization']));
  const [selectedTarget, setSelectedTarget] = useState<RestrictionTarget | null>(null);
  const [treeSearch, setTreeSearch] = useState('');
  const [statusSearch, setStatusSearch] = useState('');
  const [policySearch, setPolicySearch] = useState('');
  const [packageSearch, setPackageSearch] = useState('');
  const [packagePage, setPackagePage] = useState(1);
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

  const moduleConfig = MODULES.find((item) => item.id === activeModule) || MODULES[0];
  const isWhitelist = activeModule === 'appWhitelist';
  const filteredTree = useMemo(() => filterTree(treeNodes, treeSearch), [treeNodes, treeSearch]);
  const selectedLookupRows = isWhitelist ? whitelistSoftware : packages;
  const rawSelectedIds = isWhitelist ? selectedWhitelistIds : selectedPackageIds;
  const selectedIds = useMemo(() => Array.from(new Set(rawSelectedIds.filter(Boolean))), [rawSelectedIds]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedLookupCount = useMemo(
    () => selectedLookupRows.reduce((total, row) => total + (selectedIdSet.has(getPackageId(row)) ? 1 : 0), 0),
    [selectedLookupRows, selectedIdSet]
  );
  const availableLookupCount = Math.max(selectedLookupRows.length - selectedLookupCount, 0);

  const filteredLookupRows = useMemo(() => {
    const search = packageSearch.trim().toLowerCase();
    return selectedLookupRows.filter((row) => {
      const id = getPackageId(row);
      const selected = selectedIdSet.has(id);
      if (packageView === 'selected' && !selected) return false;
      if (packageView === 'available' && selected) return false;
      const text = [getPackageName(row), id, pick(row, ['SW_Pkg_Company', 'Company', 'vendor'], ''), pick(row, ['SW_Catg', 'category', 'Category'], '')].join(' ').toLowerCase();
      return !search || text.includes(search);
    });
  }, [selectedLookupRows, packageSearch, packageView, selectedIdSet]);

  const lookupTotalPages = Math.max(1, Math.ceil(filteredLookupRows.length / LOOKUP_PAGE_SIZE));
  const safeLookupPage = Math.min(packagePage, lookupTotalPages);
  const lookupStart = (safeLookupPage - 1) * LOOKUP_PAGE_SIZE;
  const pagedLookupRows = filteredLookupRows.slice(lookupStart, lookupStart + LOOKUP_PAGE_SIZE);

  const filteredStatusRows = useMemo(() => {
    const search = statusSearch.trim().toLowerCase();
    return statusRows.filter((row) => !search || Object.values(row || {}).join(' ').toLowerCase().includes(search));
  }, [statusRows, statusSearch]);

  const filteredPolicyRows = useMemo(() => {
    const search = policySearch.trim().toLowerCase();
    return policyRows.filter((row) => !search || Object.values(row || {}).join(' ').toLowerCase().includes(search));
  }, [policyRows, policySearch]);

  const summaryCards = useMemo(() => [
    { label: 'Target', value: selectedTarget?.label || 'All Branches', icon: Layers, tone: 'border-blue-200 text-blue-700 bg-blue-50' },
    { label: isWhitelist ? 'Allowed Software' : 'Blocked Packages', value: selectedLookupCount, icon: Package, tone: isWhitelist ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-rose-200 text-rose-700 bg-rose-50' },
    { label: 'Status Rows', value: statusRows.length, icon: CheckCircle2, tone: 'border-indigo-200 text-indigo-700 bg-indigo-50' },
    { label: 'Policy Rows', value: policyRows.length, icon: Ban, tone: 'border-amber-200 text-amber-700 bg-amber-50' },
  ], [isWhitelist, policyRows.length, selectedLookupCount, selectedTarget?.label, statusRows.length]);

  const addToast = useCallback((tone: EmaToastTone, title: string, message?: string) => {
    toastIdRef.current += 1;
    const toast: EmaToastItem = { id: `${Date.now()}-${toastIdRef.current}`, tone, title, message };
    setToasts((items) => [...items.slice(-2), toast]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== toast.id)), 3200);
  }, []);

  const loadTree = useCallback(async () => {
    setLoadingTree(true);
    try {
      const data = await restrictionService.getTree();
      const nodes = Array.isArray(data) ? data : [];
      setTreeNodes(nodes);
      setSelectedTarget((current) => current || findFirstTarget(nodes));
      setExpandedNodes((current) => {
        const next = new Set(current);
        nodes.slice(0, 2).forEach((node, index) => next.add(getNodeId(node, index)));
        return next;
      });
    } catch (error) {
      addToast('error', 'Unable to load branch scope', error instanceof Error ? error.message : 'Please check restriction API.');
    } finally {
      setLoadingTree(false);
    }
  }, [addToast]);

  const loadLookups = useCallback(async () => {
    const [packageRows, whitelistRows] = await Promise.all([restrictionService.getPackages().catch(() => []), restrictionService.getWhitelistSoftware().catch(() => [])]);
    setPackages(Array.isArray(packageRows) ? packageRows : []);
    setWhitelistSoftware(Array.isArray(whitelistRows) ? whitelistRows : []);
    return { packages: Array.isArray(packageRows) ? packageRows : [], whitelistSoftware: Array.isArray(whitelistRows) ? whitelistRows : [] };
  }, []);

  const loadPolicyData = useCallback(async () => {
    if (!selectedTarget) return;
    setLoadingData(true);
    try {
      const [lookups, effectivePolicy, policies, statuses] = await Promise.all([
        loadLookups(),
        restrictionService.getEffectivePolicy(activeModule, selectedTarget),
        restrictionService.getPolicyList(activeModule, selectedTarget).catch(() => []),
        restrictionService.getRestrictionStatus(activeModule, selectedTarget, { search: statusSearch || undefined, startDate, endDate, includeSub: includeSub ? 1 : 0 }).catch(() => []),
      ]);
      const nextPolicy = (effectivePolicy || {}) as RestrictionPolicyDetail;
      const sourceRows = activeModule === 'appWhitelist' ? lookups.whitelistSoftware : lookups.packages;
      setForm(createFormFromPolicy(activeModule, nextPolicy));
      setSelectedDays(splitDays(getPolicySetting(nextPolicy, 'day_select', '')));
      setPolicyRows(Array.isArray(policies) ? policies : []);
      setStatusRows(Array.isArray(statuses) ? statuses : []);
      const selected = extractSelectedPolicyIds(nextPolicy, sourceRows);
      if (activeModule === 'appWhitelist') setSelectedWhitelistIds(selected);
      else setSelectedPackageIds(selected);
    } catch (error) {
      addToast('error', 'Unable to load policy', error instanceof Error ? error.message : 'Please check restriction API.');
    } finally {
      setLoadingData(false);
    }
  }, [activeModule, addToast, endDate, includeSub, loadLookups, selectedTarget, startDate, statusSearch]);

  useEffect(() => { void loadTree(); }, [loadTree]);
  useEffect(() => { void loadPolicyData(); }, [loadPolicyData]);
  useEffect(() => { setStatusSearch(''); setPolicySearch(''); setPackageSearch(''); setPackageView('all'); setPackagePage(1); }, [activeModule]);
  useEffect(() => { setPackagePage(1); }, [packageSearch, packageView, activeModule, filteredLookupRows.length]);

  function updateForm(key: keyof FormState, value: any) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleDay(day: string) {
    setSelectedDays((current) => (current.includes(day) ? current.filter((item) => item !== day) : [...current, day]));
  }

  function togglePackage(id: string) {
    if (!id) return;
    const updater = (current: string[]) => {
      const next = new Set(current.filter(Boolean));
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return Array.from(next);
    };
    if (isWhitelist) setSelectedWhitelistIds(updater);
    else setSelectedPackageIds(updater);
  }

  async function savePolicy() {
    if (!selectedTarget) {
      addToast('warning', 'Select target first', 'Choose a branch or device before saving policy.');
      return;
    }
    setSaving(true);
    try {
      const targetType = selectedTarget.target_type ?? selectedTarget.targetType ?? 1;
      const targetId = selectedTarget.target_id ?? selectedTarget.targetId ?? selectedTarget.id ?? '-1';
      const basePayload = {
        policy_id: form.policyId || 0,
        target_type: targetType,
        target_id: targetId,
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
        console_ip: '',
      };
      if (activeModule === 'appBlacklist') {
        await restrictionService.savePolicy(activeModule, { ...basePayload, restrict_type: form.appRestrictType, restrict_message: form.appNoticeMessage, version_compare: form.versionCompare ? '1' : '0', softwareRestrictSchedule1: form.schedule1, softwareRestrictSchedule2: form.schedule2, softwareRestrictSchedule3: form.schedule3, softwareRestrictSchedule4: form.schedule4, package_list: selectedIds });
      } else {
        await restrictionService.savePolicy(activeModule, { ...basePayload, restrict_type: form.processRestrictType, restrict_message: form.processNoticeMessage, font_restrict_type: form.fontRestrictType, font_restrict_message: form.fontNoticeMessage, package_list: selectedIds });
      }
      addToast('success', 'Policy saved', `${moduleConfig.label} saved successfully.`);
      await loadPolicyData();
    } catch (error) {
      addToast('error', 'Policy save failed', error instanceof Error ? error.message : 'Please check restriction API.');
    } finally {
      setSaving(false);
    }
  }

  function renderTree(nodes: RestrictionTreeNode[], depth = 0) {
    return (
      <div className={depth ? 'ml-3 space-y-1 border-l border-slate-100 pl-3' : 'space-y-1'}>
        {nodes.map((node, index) => {
          const id = getNodeId(node, index);
          const label = getNodeLabel(node);
          const children = getChildren(node);
          const isOpen = expandedNodes.has(id);
          const target = getTarget(node, index);
          const isSelected = selectedTarget?.id === target.id;
          const nodeType = getNodeType(node);
          const Icon = nodeType === 'device' ? Laptop : isOpen ? FolderOpen : Folder;
          const total = countDevices(node);
          return (
            <div key={id}>
              <div className="flex items-center gap-1">
                <button type="button" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" onClick={() => setExpandedNodes((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })}>
                  {children.length ? (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span className="h-3 w-3" />}
                </button>
                <button type="button" title={cleanText(node.Object_Full_Name || label)} onClick={() => { setSelectedTarget(target); if (children.length) setExpandedNodes((current) => new Set(current).add(id)); }} className={cn('group flex min-w-0 flex-1 items-center gap-2 rounded-2xl border px-3 py-2 text-left transition', isSelected ? 'border-blue-300 bg-blue-50 text-blue-700 shadow-sm' : 'border-transparent bg-white text-slate-700 hover:border-slate-200 hover:bg-slate-50')}>
                  <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-xl', isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-white')}>{nodeType === 'root' ? <Layers size={15} /> : <Icon size={15} />}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-black">{nodeType === 'root' ? 'All Branches' : label}</span><span className="block truncate text-[11px] font-bold text-slate-400">{nodeType === 'device' ? 'Device' : `${total} device(s)`}</span></span>
                </button>
              </div>
              {children.length && isOpen ? renderTree(children, depth + 1) : null}
            </div>
          );
        })}
      </div>
    );
  }

  const statusColumns = [
    { key: 'device', label: 'Device', render: (row: any) => <div><div className="font-black text-slate-900">{pick(row, ['ComputerName', 'Object_DeviceID', 'DeviceID', 'deviceName', 'hostname'])}</div><div className="text-xs font-bold text-slate-400">{pick(row, ['Branch', 'Department', 'Object_Full_Name', 'location'], '')}</div></div> },
    { key: 'package', label: isWhitelist ? 'Software' : 'Package', render: (row: any) => getPackageName(row) },
    { key: 'status', label: 'Status', render: (row: any) => { const value = pick(row, ['Status', 'status', 'Result', 'result', 'State', 'state'], 'Unknown'); return <span className={cn('inline-flex rounded-full border px-3 py-1 text-xs font-black', getStatusColor(value))}>{value}</span>; } },
    { key: 'updated', label: 'Updated', render: (row: any) => pick(row, ['UpdatedAt', 'updatedAt', 'LastUpdate', 'lastSeen', 'LastSeen'], '-') },
  ];

  const policyColumns = [
    { key: 'policy', label: 'Policy', render: (row: any) => pick(row, ['PolicyName', 'policyName', 'name', 'policy_id', 'PolicyID'], '-') },
    { key: 'target', label: 'Target', render: (row: any) => pick(row, ['Object_Full_Name', 'targetName', 'Target', 'Branch'], '-') },
    { key: 'status', label: 'Status', render: (row: any) => { const value = pick(row, ['status', 'Status', 'use_policy', 'enabled'], 'Active'); return <span className={cn('inline-flex rounded-full border px-3 py-1 text-xs font-black', getStatusColor(value))}>{value}</span>; } },
    { key: 'updated', label: 'Updated', render: (row: any) => pick(row, ['UpdatedAt', 'updatedAt', 'ModifiedDate', 'created_at'], '-') },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-5 text-slate-950" data-section="app-restriction">
      <div className="grid min-h-[calc(100vh-7rem)] grid-cols-1 gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">App Control</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">Branch Scope</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">Select branch or device before applying policy.</p>
          </div>
          <div className="relative mb-4">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={treeSearch} onChange={(event) => setTreeSearch(event.target.value)} placeholder="Search branch/device..." className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-bold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50" />
          </div>
          <div className="max-h-[calc(100vh-260px)] overflow-auto pr-1">
            {loadingTree ? <div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold text-blue-700"><Loader2 size={16} className="animate-spin" /> Loading scope...</div> : filteredTree.length ? renderTree(filteredTree) : <div className="rounded-2xl border border-slate-200 p-4 text-sm font-bold text-slate-500">No branch scope found.</div>}
          </div>
        </aside>

        <section className="min-w-0 space-y-5 overflow-hidden">
          <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-xl">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">Application Governance</p>
                <h1 className="mt-1 text-2xl font-black text-slate-950">{moduleConfig.label}</h1>
                <p className="mt-1 text-sm font-semibold text-slate-500">{moduleConfig.helper}</p>
              </div>
              <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                {MODULES.map((item) => { const Icon = item.icon; const active = item.id === activeModule; return <button key={item.id} type="button" onClick={() => setActiveModule(item.id)} className={cn('flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition', active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-slate-900')}><Icon size={16} />{item.shortLabel}</button>; })}
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => { const Icon = card.icon; return <div key={card.label} className={cn('rounded-2xl border p-4', card.tone)}><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/75"><Icon size={20} /></span><div className="min-w-0"><p className="truncate text-[11px] font-black uppercase tracking-[0.16em] opacity-80">{card.label}</p><p className="truncate text-xl font-black">{card.value}</p></div></div></div>; })}
            </div>
          </div>

          <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                {(Object.keys(TAB_LABELS) as SubTab[]).map((tab) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={cn('rounded-xl px-4 py-2 text-sm font-black transition', activeTab === tab ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-slate-900')}>{TAB_LABELS[tab]}</button>)}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => void loadPolicyData()} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"><RefreshCw size={16} className={loadingData ? 'animate-spin' : ''} /> Refresh</button>
                <button type="button" onClick={() => { setStatusSearch(''); setPolicySearch(''); setPackageSearch(''); setPackageView('all'); setStartDate(daysAgo(30)); setEndDate(today()); }} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"><RotateCcw size={16} /> Reset</button>
              </div>
            </div>

            {activeTab === 'status' ? (
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_160px_auto]">
                  <div className="relative"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input value={statusSearch} onChange={(event) => setStatusSearch(event.target.value)} placeholder="Search device, package, status..." className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-bold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50" /></div>
                  <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none" />
                  <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none" />
                  <button type="button" onClick={() => setIncludeSub((value) => !value)} className={cn('h-12 rounded-2xl border px-4 text-sm font-black transition', includeSub ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500')}>Include Sub</button>
                </div>
                <Table columns={statusColumns} rows={filteredStatusRows} loading={loadingData} emptyText="No restriction status found." />
              </div>
            ) : null}

            {activeTab === 'settings' ? (
              <div className="mt-4 space-y-5">
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4"><FieldLabel>Update Interval</FieldLabel><input value={form.updateInterval} onChange={(event) => updateForm('updateInterval', event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50" /></div>
                  <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4"><FieldLabel>{isWhitelist ? 'Process Restrict Type' : 'App Restrict Type'}</FieldLabel>{isWhitelist ? <Select value={form.processRestrictType} onChange={(value) => updateForm('processRestrictType', value)} options={[{ value: '0', label: 'Disabled' }, { value: '1', label: 'Allow Whitelist' }, { value: '2', label: 'Audit Only' }, { value: '3', label: 'Strict Mode' }]} /> : <Select value={form.appRestrictType} onChange={(value) => updateForm('appRestrictType', value)} options={[{ value: '1', label: 'Block Package' }, { value: '2', label: 'Warn User' }, { value: '3', label: 'Audit Only' }]} />}</div>
                  <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4"><FieldLabel>Weekly Policy</FieldLabel><button type="button" onClick={() => updateForm('weeklyPolicy', !form.weeklyPolicy)} className={cn('h-12 w-full rounded-2xl border px-4 text-sm font-black transition', form.weeklyPolicy ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500')}>{form.weeklyPolicy ? 'Enabled' : 'Disabled'}</button></div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">{isWhitelist ? 'Whitelist Software' : 'Restricted Package'}</p><h3 className="mt-1 text-xl font-black text-slate-950">{selectedLookupCount} selected from {selectedLookupRows.length}</h3></div>
                    <div className="relative min-w-[260px] max-w-md flex-1"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input value={packageSearch} onChange={(event) => setPackageSearch(event.target.value)} placeholder={isWhitelist ? 'Search whitelist software...' : 'Search package...'} className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-bold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50" /></div>
                  </div>

                  <div className="mt-4 grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Package Summary</p>
                      <div className="mt-4 grid grid-cols-1 gap-3">
                        <button type="button" onClick={() => setPackageView('all')} className={cn('flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition', packageView === 'all' ? 'border-blue-300 bg-white text-blue-700 shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200')}><span className="text-sm font-black">All Software</span><span className="text-lg font-black">{selectedLookupRows.length}</span></button>
                        <button type="button" onClick={() => setPackageView('selected')} className={cn('flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition', packageView === 'selected' && isWhitelist && 'border-emerald-300 bg-emerald-50 text-emerald-700', packageView === 'selected' && !isWhitelist && 'border-rose-300 bg-rose-50 text-rose-700', packageView !== 'selected' && 'border-slate-200 bg-white text-slate-700 hover:border-blue-200')}><span className="text-sm font-black">Selected</span><span className="text-lg font-black">{selectedLookupCount}</span></button>
                        <button type="button" onClick={() => setPackageView('available')} className={cn('flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition', packageView === 'available' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200')}><span className="text-sm font-black">Available</span><span className="text-lg font-black">{availableLookupCount}</span></button>
                      </div>
                      <p className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold leading-relaxed text-slate-500">Use search and filter to manage package list. Only selected package will be applied to this policy.</p>
                    </div>

                    <div className="min-w-0 overflow-hidden rounded-[22px] border border-slate-200 bg-white">
                      <div className="overflow-auto">
                        <div className="min-w-[720px]">
                          <div className="grid grid-cols-[48px_minmax(0,1fr)_180px_110px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500"><span>Status</span><span>Software / Package</span><span>Company</span><span className="text-right">Action</span></div>
                          <div className="divide-y divide-slate-100">
                            {loadingData ? <div className="flex items-center justify-center p-8 text-sm font-bold text-blue-700"><Loader2 size={18} className="mr-2 animate-spin" /> Loading packages...</div> : pagedLookupRows.length === 0 ? <div className="p-8 text-center text-sm font-bold text-slate-500">No package found.</div> : pagedLookupRows.map((row, index) => {
                              const id = getPackageId(row) || `${getPackageName(row)}-${lookupStart + index}`;
                              const selected = selectedIdSet.has(id);
                              const company = pick(row, ['SW_Pkg_Company', 'Company', 'vendor'], 'No company');
                              return (
                                <button key={id} type="button" onClick={() => togglePackage(id)} className="grid w-full grid-cols-[48px_minmax(0,1fr)_180px_110px] items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50">
                                  <span className={cn('grid h-9 w-9 place-items-center rounded-xl', selected && isWhitelist && 'bg-emerald-600 text-white', selected && !isWhitelist && 'bg-rose-600 text-white', !selected && 'bg-slate-100 text-slate-500')}>{selected ? <CheckCircle2 size={16} /> : <Package size={16} />}</span>
                                  <span className="min-w-0"><span className="block truncate text-sm font-black text-slate-900">{getPackageName(row)}</span><span className="block truncate text-xs font-bold text-slate-500">ID: {id || '-'}</span></span>
                                  <span className="truncate text-sm font-bold text-slate-600">{company}</span>
                                  <span className="text-right"><span className={cn('inline-flex rounded-full border px-3 py-1 text-xs font-black', selected && isWhitelist && 'border-emerald-200 bg-emerald-50 text-emerald-700', selected && !isWhitelist && 'border-rose-200 bg-rose-50 text-rose-700', !selected && 'border-slate-200 bg-slate-50 text-slate-500')}>{selected ? 'Selected' : 'Add'}</span></span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      {filteredLookupRows.length > LOOKUP_PAGE_SIZE ? <PaginationFooter page={safeLookupPage} totalPages={lookupTotalPages} totalItems={filteredLookupRows.length} start={lookupStart} pageSize={LOOKUP_PAGE_SIZE} onPageChange={setPackagePage} /> : null}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2"><div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4"><FieldLabel>Notice Message</FieldLabel><textarea value={isWhitelist ? form.processNoticeMessage : form.appNoticeMessage} onChange={(event) => updateForm(isWhitelist ? 'processNoticeMessage' : 'appNoticeMessage', event.target.value)} rows={4} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50" placeholder="Message shown to user when policy is applied." /></div><div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4"><FieldLabel>Policy Days</FieldLabel><div className="flex flex-wrap gap-2">{DAY_OPTIONS.map((day) => { const selected = selectedDays.includes(day); return <button key={day} type="button" onClick={() => toggleDay(day)} className={cn('h-10 rounded-xl border px-3 text-xs font-black transition', selected ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500')}>{day}</button>; })}</div><div className="mt-4 grid gap-3 sm:grid-cols-2">{[1, 2, 3, 4].map((slot) => <input key={slot} value={(form as any)[`schedule${slot}`]} onChange={(event) => updateForm(`schedule${slot}` as keyof FormState, event.target.value)} placeholder={`Schedule ${slot}`} className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50" />)}</div></div></div>
                <div className="flex justify-end"><button type="button" onClick={() => void savePolicy()} disabled={saving || loadingData} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-blue-600 px-6 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}Save Policy</button></div>
              </div>
            ) : null}

            {activeTab === 'policyStatus' ? <div className="mt-4 space-y-4"><div className="relative max-w-lg"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input value={policySearch} onChange={(event) => setPolicySearch(event.target.value)} placeholder="Search policy status..." className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-bold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50" /></div><Table columns={policyColumns} rows={filteredPolicyRows} loading={loadingData} emptyText="No policy status found." /></div> : null}
          </div>
        </section>
      </div>
      <EmaToastViewport items={toasts} onClose={(id) => setToasts((items) => items.filter((item) => item.id !== id))} />
    </main>
  );
}
