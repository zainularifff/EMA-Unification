import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Globe,
  Layers,
  Link as LinkIcon,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import restrictionService, {
  getCurrentLoginId,
  type RestrictionModule,
  type RestrictionPolicyDetail,
  type RestrictionPolicyRow,
  type RestrictionTarget,
  type RestrictionTreeNode,
  type WebGroup,
  type WebGroupUrl,
} from '../services/restrictionService';
import {
  EmaButton,
  EmaFilterField,
  EmaKpiCard,
  EmaKpiGrid,
  EmaPageLayout,
  EmaPagination,
  EmaSearchInput,
  EmaSection,
  EmaSidebarPanel,
  EmaSidebarTreeRow,
  EmaTable,
  EmaTableShell,
  EmaToastViewport,
  EmaToolbar,
  type EmaTableColumn,
  type EmaToastItem,
  type EmaToastTone,
} from '../components/ema';

type SubTab = 'settings' | 'policyStatus';

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
  webRestrictType: '1' | '2';
  defaultUrl: string;
};

const WEB_MODULE: RestrictionModule = 'webRestriction';
const DAY_OPTIONS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const PAGE_SIZE = 10;
const TAB_LABELS: Record<SubTab, string> = {
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
  webRestrictType: '1',
  defaultUrl: '127.0.0.1',
};
const inputClass = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

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

function cleanText(value: unknown, fallback = '') {
  const text = value === undefined || value === null ? '' : String(value).trim();
  return text || fallback;
}

function keyify(value: string) {
  return value.toLowerCase().replace(/[\s_\-().]/g, '');
}

function asArray<T = any>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') {
    const row = value as Record<string, unknown>;
    if (Array.isArray(row.data)) return row.data as T[];
    if (Array.isArray(row.rows)) return row.rows as T[];
    if (Array.isArray(row.recordset)) return row.recordset as T[];
  }
  return [];
}

function pick(row: Record<string, unknown> | null | undefined, keys: string[], fallback = '-') {
  if (!row) return fallback;
  const map = new Map(Object.entries(row).map(([key, value]) => [keyify(key), value]));

  for (const key of keys) {
    const direct = row[key];
    const mapped = map.get(keyify(key));
    const value = direct !== undefined ? direct : mapped;
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value);
  }

  return fallback;
}

function pickNumber(row: Record<string, unknown> | null | undefined, keys: string[]) {
  const parsed = Number(pick(row, keys, '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getChildren(node: RestrictionTreeNode) {
  return asArray<RestrictionTreeNode>(node.children || node.Children || node.items || node.nodes);
}

function getNodeLabel(node: RestrictionTreeNode) {
  return cleanText(node.label || node.name || node.Object_Rel_Name || node.Object_Full_Name || node.ComputerName || node.Object_DeviceID || node.MDM_DeviceID, 'Unnamed scope');
}

function getNodeId(node: RestrictionTreeNode, index = 0) {
  return cleanText(node.id || node.ID || node.Object_Rel_Idn || node.Object_Root_Idn || node.target_id || node.Object_DeviceID || node.MDM_DeviceID, `node-${index}`);
}

function getNodeType(node: RestrictionTreeNode): 'root' | 'department' | 'device' {
  const type = String(node.type || node.Type || '').toLowerCase();
  if (type.includes('device') || node.Object_Root_Idn || node.Object_DeviceID || node.MDM_DeviceID) return 'device';
  if (type.includes('root') || type.includes('org')) return 'root';
  return 'department';
}

function countNodes(node: RestrictionTreeNode): number {
  const count = pickNumber(node, ['count', 'badge', 'total', 'deviceCount', 'TotalDevices']);
  if (count > 0) return count;
  if (getNodeType(node) === 'device') return 1;
  return getChildren(node).reduce((total, child) => total + countNodes(child), 0);
}

function getTarget(node: RestrictionTreeNode, index = 0): RestrictionTarget {
  const type = getNodeType(node);
  const label = getNodeLabel(node);

  if (type === 'root') {
    return { id: 'root', label: 'All Branches', type: 'root', target_type: 1, target_id: '-1', Object_Full_Name: 'Root Policy' };
  }

  if (type === 'device') {
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
  return {
    id: `department-${relationId}`,
    label,
    type: 'department',
    target_type: 2,
    target_id: relationId,
    Object_Rel_Idn: relationId,
    Object_Full_Name: node.Object_Full_Name || node.path || label,
  };
}

function filterTree(nodes: RestrictionTreeNode[], query: string): RestrictionTreeNode[] {
  const search = query.trim().toLowerCase();
  if (!search) return nodes;

  return nodes
    .map((node) => {
      const children = filterTree(getChildren(node), search);
      const label = [getNodeLabel(node), node.Object_Full_Name, node.Object_DeviceID, node.MDM_DeviceID].filter(Boolean).join(' ').toLowerCase();
      return label.includes(search) || children.length ? { ...node, children } : null;
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

function getSetting(policy: RestrictionPolicyDetail | null, key: string, fallback = '') {
  if (!policy) return fallback;

  const direct = policy.settings?.[key] ?? policy[key];
  if (direct !== undefined && direct !== null && String(direct).trim() !== '') return String(direct);

  const found = asArray<any>(policy.settingItems || policy.items || policy.settingsList).find((item) => cleanText(item.policy_key || item.key).toLowerCase() === key.toLowerCase());
  return found?.policy_value !== undefined && found?.policy_value !== null ? String(found.policy_value) : fallback;
}

function settingValues(policy: RestrictionPolicyDetail | null, key: string) {
  return asArray<any>(policy?.settingItems || policy?.items || policy?.settingsList)
    .filter((item) => cleanText(item.policy_key || item.key).toLowerCase() === key.toLowerCase())
    .sort((a, b) => Number(a.seq || 0) - Number(b.seq || 0))
    .map((item) => cleanText(item.policy_value || item.value))
    .filter(Boolean);
}

function splitDays(value: string) {
  const upper = value.toUpperCase();
  if (!upper) return [];
  if (upper.includes(',')) return upper.split(',').map((item) => item.trim()).filter(Boolean);
  return DAY_OPTIONS.filter((day) => upper.includes(day));
}

function formFromPolicy(policy: RestrictionPolicyDetail | null): FormState {
  const schedules = settingValues(policy, 'WebRestrictSchedule');
  return {
    policyId: Number(policy?.policy_id || policy?.PolicyID || policy?.id || 0),
    inheritPolicy: getSetting(policy, 'parent_policy', '0') !== '0' || getSetting(policy, 'use_parent_policy', '0') === '1',
    exception: getSetting(policy, 'use_policy', '1') === '0',
    updateInterval: getSetting(policy, 'update_policy_result_interval', '120'),
    weeklyPolicy: getSetting(policy, 'use_weekly_policy', '0') === '1',
    useSchedule: getSetting(policy, 'use_schedule', '0') === '1',
    schedule1: schedules[0] || '',
    schedule2: schedules[1] || '',
    schedule3: schedules[2] || '',
    schedule4: schedules[3] || '',
    webRestrictType: (getSetting(policy, 'WebRestrictType', '1') as FormState['webRestrictType']) || '1',
    defaultUrl: getSetting(policy, 'WebRestrictMessage', '127.0.0.1'),
  };
}

function normalizeDomain(value: string) {
  return value.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').split(/[\s,]+/)[0].split('/')[0].toLowerCase();
}

function uniqueDomains(values: string[]) {
  return Array.from(new Set(values.map(normalizeDomain).filter(Boolean)));
}

function getWebGroupId(group: WebGroup | null | undefined) {
  return Number(pick(group, ['idx', 'IDX', 'id', 'ID', 'groupId', 'GroupId'], '0')) || 0;
}

function getWebGroupName(group: WebGroup | null | undefined) {
  return pick(group, ['name', 'Name', 'groupName', 'GroupName', 'URLMain_Name'], 'Unnamed group');
}

function getWebGroupDescription(group: WebGroup | null | undefined) {
  return pick(group, ['description', 'Description', 'remark', 'Remark'], '');
}

function getWebGroupUrlValue(row: unknown) {
  if (typeof row === 'string') return row.trim();
  if (!row || typeof row !== 'object') return '';
  const record = row as Record<string, unknown>;
  return cleanText(record.url ?? record.URL ?? record.Url ?? record.DomainName ?? record.domainName ?? record.WebUrl ?? record.webUrl);
}

function normalizeWebGroupRows(rows: unknown, groupId = 0): WebGroupUrl[] {
  return asArray<any>(rows)
    .map((row, index) => {
      const record = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
      const url = getWebGroupUrlValue(row);
      if (!url) return null;
      return {
        ...record,
        idx: Number(record.idx ?? record.IDX ?? record.groupId ?? record.GroupId ?? groupId) || groupId,
        seq: Number(record.seq ?? record.Seq ?? record.SEQ ?? record.sequence ?? record.Sequence ?? index + 1) || index + 1,
        url: normalizeDomain(url),
      } as WebGroupUrl;
    })
    .filter(Boolean) as WebGroupUrl[];
}

function getUrlSeq(row: WebGroupUrl, index: number) {
  return Number(row.seq ?? row.Seq ?? row.SEQ ?? row.sequence ?? index + 1) || index + 1;
}

function pageSlice<T>(rows: T[], page: number, size = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(rows.length / size));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * size;
  return { totalPages, safePage, start, rows: rows.slice(start, start + size) };
}

function Badge({ children, className }: { children: ReactNode; className: string }) {
  return <span className={cn('inline-flex rounded-full border px-3 py-1 text-xs font-black', className)}>{children}</span>;
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{children}</label>;
}

export default function WebRestriction() {
  const [activeTab, setActiveTab] = useState<SubTab>('settings');
  const [treeNodes, setTreeNodes] = useState<RestrictionTreeNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root', 'organization', 'all']));
  const [selectedTarget, setSelectedTarget] = useState<RestrictionTarget | null>(null);
  const [treeSearch, setTreeSearch] = useState('');
  const [policySearch, setPolicySearch] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [policyUrlSearch, setPolicyUrlSearch] = useState('');
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [policyDetail, setPolicyDetail] = useState<RestrictionPolicyDetail | null>(null);
  const [policyRows, setPolicyRows] = useState<RestrictionPolicyRow[]>([]);
  const [webGroups, setWebGroups] = useState<WebGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [webGroupUrls, setWebGroupUrls] = useState<WebGroupUrl[]>([]);
  const [webUrls, setWebUrls] = useState<string[]>([]);
  const [newPolicyUrl, setNewPolicyUrl] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupUrlInput, setGroupUrlInput] = useState('');
  const [startDate, setStartDate] = useState(daysAgo(30));
  const [endDate, setEndDate] = useState(today());
  const [includeSub, setIncludeSub] = useState(true);
  const [loadingTree, setLoadingTree] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingGroupUrls, setLoadingGroupUrls] = useState(false);
  const [saving, setSaving] = useState(false);
  const [policyUrlPage, setPolicyUrlPage] = useState(1);
  const [groupUrlPage, setGroupUrlPage] = useState(1);
  const [groupPage, setGroupPage] = useState(1);
  const [policyPage, setPolicyPage] = useState(1);
  const [toasts, setToasts] = useState<EmaToastItem[]>([]);
  const toastRef = useRef(0);

  const filteredTree = useMemo(() => filterTree(treeNodes, treeSearch), [treeNodes, treeSearch]);
  const selectedGroup = useMemo(() => webGroups.find((group) => getWebGroupId(group) === selectedGroupId) || null, [webGroups, selectedGroupId]);
  const filteredGroups = useMemo(() => {
    const search = groupSearch.trim().toLowerCase();
    return webGroups.filter((group) => !search || [getWebGroupName(group), getWebGroupDescription(group), getWebGroupId(group)].join(' ').toLowerCase().includes(search));
  }, [webGroups, groupSearch]);
  const filteredPolicyUrls = useMemo(() => webUrls.filter((url) => !policyUrlSearch.trim() || url.toLowerCase().includes(policyUrlSearch.trim().toLowerCase())), [webUrls, policyUrlSearch]);
  const filteredPolicyRows = useMemo(() => policyRows.filter((row) => !policySearch.trim() || Object.values(row || {}).join(' ').toLowerCase().includes(policySearch.trim().toLowerCase())), [policyRows, policySearch]);
  const groupPageData = pageSlice(filteredGroups, groupPage, PAGE_SIZE);
  const policyUrlPageData = pageSlice(filteredPolicyUrls, policyUrlPage, PAGE_SIZE);
  const groupUrlPageData = pageSlice(webGroupUrls, groupUrlPage, PAGE_SIZE);
  const policyPageData = pageSlice(filteredPolicyRows, policyPage, PAGE_SIZE);
  const policySource = policyDetail?.source === 'none' ? 'No policy' : cleanText(policyDetail?.source, 'No policy');

  const addToast = useCallback((tone: EmaToastTone, title: string, message?: ReactNode) => {
    toastRef.current += 1;
    const toast: EmaToastItem = { id: `${Date.now()}-${toastRef.current}`, tone, title, message };
    setToasts((items) => [...items.slice(-2), toast]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== toast.id)), 3200);
  }, []);

  const loadTree = useCallback(async () => {
    setLoadingTree(true);
    try {
      const rows = await restrictionService.getTree();
      setTreeNodes(rows);
      setSelectedTarget((current) => current || findFirstTarget(rows) || { id: 'root', label: 'All Branches', type: 'root', target_type: 1, target_id: '-1', Object_Full_Name: 'Root Policy' });
      setExpandedNodes((current) => {
        const next = new Set(current);
        rows.slice(0, 2).forEach((node, index) => next.add(getNodeId(node, index)));
        return next;
      });
    } catch (error) {
      addToast('error', 'Unable to load branch scope', error instanceof Error ? error.message : 'Please check restriction API.');
    } finally {
      setLoadingTree(false);
    }
  }, [addToast]);

  const loadGroups = useCallback(async () => {
    const groups = await restrictionService.getWebGroups().catch(() => [] as WebGroup[]);
    setWebGroups(groups);
    setSelectedGroupId((current) => current || getWebGroupId(groups[0]) || null);
    return groups;
  }, []);

  const loadGroupUrls = useCallback(async (groupId?: number | null) => {
    const id = groupId ?? selectedGroupId;
    if (!id) {
      setWebGroupUrls([]);
      return [] as WebGroupUrl[];
    }

    setLoadingGroupUrls(true);
    try {
      const rows = normalizeWebGroupRows(await restrictionService.getWebGroupUrls(id), id);
      setWebGroupUrls(rows);
      return rows;
    } catch (error) {
      addToast('error', 'Unable to load group URLs', error instanceof Error ? error.message : 'Please check web restriction API.');
      return [] as WebGroupUrl[];
    } finally {
      setLoadingGroupUrls(false);
    }
  }, [addToast, selectedGroupId]);

  const loadPolicyData = useCallback(async () => {
    const target = selectedTarget || { id: 'root', label: 'All Branches', type: 'root', target_type: 1, target_id: '-1', Object_Full_Name: 'Root Policy' };
    setLoadingData(true);
    try {
      const [detail, policies] = await Promise.all([
        restrictionService.getEffectivePolicy(WEB_MODULE, target),
        restrictionService.getPolicyList(WEB_MODULE, target).catch(() => [] as RestrictionPolicyRow[]),
      ]);
      setPolicyDetail(detail);
      setPolicyRows(policies);
      setForm(formFromPolicy(detail));
      setSelectedDays(splitDays(getSetting(detail, 'work_weekly', getSetting(detail, 'day_select', ''))));
      setWebUrls(uniqueDomains(asArray<string>(detail.urls).length ? asArray<string>(detail.urls) : settingValues(detail, 'WebRestrictUrl')));
    } catch (error) {
      addToast('error', 'Unable to load policy', error instanceof Error ? error.message : 'Please check web restriction API.');
    } finally {
      setLoadingData(false);
    }
  }, [addToast, selectedTarget]);

  useEffect(() => { void loadTree(); }, [loadTree]);
  useEffect(() => { void loadGroups(); }, [loadGroups]);
  useEffect(() => { void loadPolicyData(); }, [loadPolicyData]);
  useEffect(() => { void loadGroupUrls(selectedGroupId); }, [loadGroupUrls, selectedGroupId]);
  useEffect(() => { setGroupPage(1); }, [groupSearch, filteredGroups.length]);
  useEffect(() => { setPolicyUrlPage(1); }, [policyUrlSearch, filteredPolicyUrls.length]);
  useEffect(() => { setPolicyPage(1); }, [policySearch, filteredPolicyRows.length]);
  useEffect(() => { setGroupUrlPage(1); }, [selectedGroupId, webGroupUrls.length]);
  useEffect(() => {
    if (!selectedGroup) return;
    setGroupName(getWebGroupName(selectedGroup));
    setGroupDescription(getWebGroupDescription(selectedGroup));
  }, [selectedGroup]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleDay(day: string) {
    setSelectedDays((current) => (current.includes(day) ? current.filter((item) => item !== day) : [...current, day]));
  }

  function addPolicyUrl() {
    const urls = uniqueDomains(newPolicyUrl.split(/[\s,\n]+/));
    if (!urls.length) {
      addToast('warning', 'Enter URL first', 'Add a website URL or domain before adding it to the policy.');
      return;
    }
    setWebUrls((current) => uniqueDomains([...current, ...urls]));
    setNewPolicyUrl('');
    addToast('success', 'URL added', `${urls.length} website${urls.length === 1 ? '' : 's'} added to policy.`);
  }

  function removePolicyUrl(url: string) {
    setWebUrls((current) => current.filter((item) => item !== url));
    addToast('delete', 'URL removed', url);
  }

  function addGroupUrlsToPolicy() {
    const urls = uniqueDomains(webGroupUrls.map((row) => getWebGroupUrlValue(row)));
    if (!urls.length) {
      addToast('warning', 'No group URL', 'Selected website group has no URL.');
      return;
    }
    setWebUrls((current) => uniqueDomains([...current, ...urls]));
    addToast('success', 'Group added', `${urls.length} URL${urls.length === 1 ? '' : 's'} added to policy.`);
  }

  async function saveGroup() {
    const name = groupName.trim();
    if (!name) {
      addToast('warning', 'Group name required', 'Enter website group name first.');
      return null;
    }

    const urls = uniqueDomains(groupUrlInput.split(/[\s,\n]+/));
    setLoadingGroupUrls(true);
    try {
      let nextGroupId = selectedGroupId || 0;
      if (selectedGroupId) {
        await restrictionService.updateWebGroup(selectedGroupId, name, groupDescription.trim());
        addToast('success', 'Group updated', name);
      } else {
        const result = await restrictionService.createWebGroup(name, urls, groupDescription.trim());
        nextGroupId = getWebGroupId(result as WebGroup);
        addToast('success', 'Group created', name);
      }

      const groups = await loadGroups();
      const matched = groups.find((item) => getWebGroupName(item).toLowerCase() === name.toLowerCase());
      const resolvedId = nextGroupId || getWebGroupId(matched) || null;
      setSelectedGroupId(resolvedId);
      setGroupUrlInput('');
      if (resolvedId) await loadGroupUrls(resolvedId);
      return resolvedId;
    } catch (error) {
      addToast('error', 'Group save failed', error instanceof Error ? error.message : 'Please check web restriction API.');
      return null;
    } finally {
      setLoadingGroupUrls(false);
    }
  }

  async function createNewGroup() {
    setSelectedGroupId(null);
    setGroupName('');
    setGroupDescription('');
    setWebGroupUrls([]);
    setGroupUrlInput('');
  }

  async function deleteGroup() {
    if (!selectedGroupId || !selectedGroup) return;
    if (!window.confirm(`Delete website group "${getWebGroupName(selectedGroup)}"?`)) return;
    setLoadingGroupUrls(true);
    try {
      await restrictionService.deleteWebGroup(selectedGroupId);
      addToast('delete', 'Group deleted', getWebGroupName(selectedGroup));
      setSelectedGroupId(null);
      setGroupName('');
      setGroupDescription('');
      setWebGroupUrls([]);
      await loadGroups();
    } catch (error) {
      addToast('error', 'Delete failed', error instanceof Error ? error.message : 'Please check web restriction API.');
    } finally {
      setLoadingGroupUrls(false);
    }
  }

  async function addGroupUrl() {
    const urls = uniqueDomains(groupUrlInput.split(/[\s,\n]+/));
    if (!urls.length) {
      addToast('warning', 'Enter URL first', 'Add a domain before saving to the group.');
      return;
    }

    setLoadingGroupUrls(true);
    try {
      let groupId = selectedGroupId;
      if (!groupId) {
        const name = groupName.trim();
        if (!name) {
          addToast('warning', 'Group name required', 'Enter group name before adding URL.');
          return;
        }
        const result = await restrictionService.createWebGroup(name, [], groupDescription.trim());
        groupId = getWebGroupId(result as WebGroup);
        if (!groupId) {
          const groups = await loadGroups();
          const matched = groups.find((item) => getWebGroupName(item).toLowerCase() === name.toLowerCase());
          groupId = getWebGroupId(matched) || null;
        }
        if (!groupId) throw new Error('Website group was created but group ID was not returned.');
        setSelectedGroupId(groupId);
        addToast('success', 'Group created', name);
      }

      for (const url of urls) await restrictionService.addWebGroupUrl(groupId, url);
      setGroupUrlInput('');
      await loadGroups();
      await loadGroupUrls(groupId);
      addToast('success', 'Group URL added', `${urls.length} URL${urls.length === 1 ? '' : 's'} added.`);
    } catch (error) {
      addToast('error', 'Group URL failed', error instanceof Error ? error.message : 'Please check web restriction API.');
    } finally {
      setLoadingGroupUrls(false);
    }
  }

  async function deleteGroupUrl(row: WebGroupUrl, index: number) {
    if (!selectedGroupId) return;
    const seq = getUrlSeq(row, index);
    setLoadingGroupUrls(true);
    try {
      await restrictionService.deleteWebGroupUrl(selectedGroupId, seq);
      await loadGroupUrls(selectedGroupId);
      addToast('delete', 'Group URL removed', getWebGroupUrlValue(row));
    } catch (error) {
      addToast('error', 'Remove URL failed', error instanceof Error ? error.message : 'Please check web restriction API.');
    } finally {
      setLoadingGroupUrls(false);
    }
  }

  async function savePolicy() {
    const target = selectedTarget || { id: 'root', label: 'All Branches', type: 'root', target_type: 1, target_id: '-1', Object_Full_Name: 'Root Policy' };
    setSaving(true);
    try {
      const currentSource = cleanText(policyDetail?.source, 'none');
      const targetSource = target.type === 'device' ? 'device' : target.type === 'root' ? 'root' : 'department';
      const policyBelongsToTarget = currentSource !== 'none' && currentSource === targetSource && String(policyDetail?.target_type || '') === String(target.target_type) && String(policyDetail?.target_id || '') === String(target.target_id);
      await restrictionService.savePolicy(WEB_MODULE, {
        policy_id: policyBelongsToTarget ? form.policyId : 0,
        target_type: target.target_type ?? 1,
        target_id: target.target_id ?? '-1',
        Object_Rel_Idn: target.Object_Rel_Idn,
        Object_Root_Idn: target.Object_Root_Idn,
        Object_DeviceID: target.Object_DeviceID,
        use_parent_policy: form.inheritPolicy ? '1' : '0',
        use_policy: form.exception ? '0' : '1',
        update_interval: form.updateInterval || '120',
        use_weekly_policy: form.weeklyPolicy ? '1' : '0',
        day_select: selectedDays.join(','),
        use_schedule: form.useSchedule ? '1' : '0',
        login_id: getCurrentLoginId(),
        console_ip: '',
        web_restrict_type: form.webRestrictType,
        default_url: form.defaultUrl || '127.0.0.1',
        RestrictSchedule1: form.schedule1,
        RestrictSchedule2: form.schedule2,
        RestrictSchedule3: form.schedule3,
        RestrictSchedule4: form.schedule4,
        web_list: webUrls,
      });
      addToast('success', 'Policy saved', 'Web restriction policy saved successfully.');
      await loadPolicyData();
    } catch (error) {
      addToast('error', 'Policy save failed', error instanceof Error ? error.message : 'Please check web restriction API.');
    } finally {
      setSaving(false);
    }
  }

  function renderTree(nodes: RestrictionTreeNode[], depth = 0) {
    return (
      <div>
        {nodes.map((node, index) => {
          const id = getNodeId(node, index);
          const children = getChildren(node);
          const open = expandedNodes.has(id);
          const target = getTarget(node, index);
          const active = selectedTarget?.id === target.id;
          const type = getNodeType(node);
          const Icon = type === 'root' ? Layers : open ? FolderOpen : Folder;
          const label = type === 'root' ? 'All Branches' : getNodeLabel(node);
          const total = countNodes(node);

          return (
            <div key={id}>
              <EmaSidebarTreeRow active={active} depth={depth} onClick={() => { setSelectedTarget(target); if (children.length) setExpandedNodes((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; }); }}>
                <span className="grid size-5 place-items-center text-slate-500">{children.length ? (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}</span>
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200"><Icon size={15} /></span>
                <span className="min-w-0 flex-1"><span className="block truncate">{label}</span><span className="block truncate text-[11px] font-bold text-slate-400">{type === 'device' ? 'Device' : `${total} device(s)`}</span></span>
              </EmaSidebarTreeRow>
              {children.length && open ? renderTree(children, depth + 1) : null}
            </div>
          );
        })}
      </div>
    );
  }

  const policyUrlColumns: EmaTableColumn<string>[] = [
    { key: 'url', header: 'Website / Domain', render: (url) => <span className="font-extrabold text-slate-900">{url}</span> },
    { key: 'action', header: 'Action', align: 'right', width: '120px', render: (url) => <EmaButton variant="danger" onClick={() => removePolicyUrl(url)}><Trash2 size={15} />Remove</EmaButton> },
  ];

  const groupUrlColumns: EmaTableColumn<WebGroupUrl>[] = [
    { key: 'url', header: 'Group URL', render: (row) => <span className="font-extrabold text-slate-900">{getWebGroupUrlValue(row)}</span> },
    { key: 'seq', header: 'Seq', width: '80px', render: (row, index) => getUrlSeq(row, index) },
    { key: 'action', header: 'Action', align: 'right', width: '120px', render: (row, index) => <EmaButton variant="danger" onClick={() => void deleteGroupUrl(row, index)}><Trash2 size={15} />Remove</EmaButton> },
  ];

  const policyColumns: EmaTableColumn<RestrictionPolicyRow>[] = [
    { key: 'target', header: 'Target', render: (row) => <div><strong className="block font-extrabold text-slate-950">{pick(row, ['Object_Full_Name', 'targetName', 'Target', 'Branch'], '-')}</strong><span className="text-xs font-semibold text-slate-500">{pick(row, ['Object_DeviceID', 'source', 'target_type'], '')}</span></div> },
    { key: 'policy', header: 'Policy', render: (row) => pick(row, ['PolicyName', 'policyName', 'name', 'policy_id', 'PolicyID'], '-') },
    { key: 'status', header: 'Status', render: (row) => <Badge className="border-blue-200 bg-blue-50 text-blue-700">{pick(row, ['Status', 'status', 'use_policy', 'enabled'], 'Active')}</Badge> },
    { key: 'updated', header: 'Updated', render: (row) => pick(row, ['UpdatedAt', 'updatedAt', 'ModifiedDate', 'created_at', 'CreateDate'], '-') },
  ];

  const sidebar = (
    <EmaSidebarPanel eyebrow="Web Control" title="Branch Scope" description="Select branch or device before applying policy." searchValue={treeSearch} searchPlaceholder="Search branch/device..." onSearchChange={setTreeSearch}>
      {loadingTree ? <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm font-bold text-blue-700"><Loader2 size={16} className="animate-spin" /> Loading scope...</div> : filteredTree.length ? renderTree(filteredTree) : <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-500">No branch scope found.</div>}
    </EmaSidebarPanel>
  );

  return (
    <EmaPageLayout sidebar={sidebar} showHeader={false}>
      <div className="space-y-3">
        <EmaSection eyebrow="Website Governance" title="Web Restriction" description="Manage website restriction policy and URL groups.">
          <EmaKpiGrid>
            <EmaKpiCard title="Target" value={selectedTarget?.label || 'All Branches'} note="Selected scope" icon={<Layers size={19} />} tone="blue" />
            <EmaKpiCard title="Website URLs" value={webUrls.length} note="Policy URL list" icon={<LinkIcon size={19} />} tone="blue" />
            <EmaKpiCard title="Restriction Type" value={form.webRestrictType === '1' ? 'Block list' : 'Allow only'} note={form.exception ? 'Disabled' : 'Enabled'} icon={<Ban size={19} />} tone="slate" />
            <EmaKpiCard title="Web Groups" value={webGroups.length} note="Configured groups" icon={<Globe size={19} />} tone="violet" />
            <EmaKpiCard title="Policy Source" value={policySource} note={pick(policyDetail, ['version', 'Version'], '-')} icon={<CheckCircle2 size={19} />} tone="emerald" />
          </EmaKpiGrid>
        </EmaSection>

        <EmaToolbar
          left={<div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">{(Object.keys(TAB_LABELS) as SubTab[]).map((tab) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={cn('rounded-lg px-4 py-2 text-sm font-black transition', activeTab === tab ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-950')}>{TAB_LABELS[tab]}</button>)}</div>}
          right={<><EmaButton onClick={() => void loadPolicyData()} disabled={loadingData}><RefreshCw size={16} className={loadingData ? 'animate-spin' : ''} />Refresh</EmaButton><EmaButton onClick={() => { setPolicySearch(''); setPolicyUrlSearch(''); setGroupSearch(''); setStartDate(daysAgo(30)); setEndDate(today()); }}><RotateCcw size={16} />Reset</EmaButton></>}
        />

        {activeTab === 'settings' ? (
          <div className="space-y-3">
            <EmaSection eyebrow="Policy" title="Policy Settings" description="Web restriction rule, schedule and policy status.">
              <div className="grid gap-3 lg:grid-cols-3">
                <div><FieldLabel>Update Interval</FieldLabel><input value={form.updateInterval} onChange={(event) => updateForm('updateInterval', event.target.value)} className={inputClass} /></div>
                <div><FieldLabel>Web Restrict Type</FieldLabel><select value={form.webRestrictType} onChange={(event) => updateForm('webRestrictType', event.target.value as FormState['webRestrictType'])} className={inputClass}><option value="1">Block List</option><option value="2">Allow Only</option></select></div>
                <div><FieldLabel>Default URL</FieldLabel><input value={form.defaultUrl} onChange={(event) => updateForm('defaultUrl', event.target.value)} className={inputClass} placeholder="127.0.0.1" /></div>
                <button type="button" onClick={() => updateForm('exception', !form.exception)} className={cn('h-10 rounded-xl border px-4 text-sm font-black transition', form.exception ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>{form.exception ? 'Policy Disabled' : 'Policy Enabled'}</button>
                <button type="button" onClick={() => updateForm('inheritPolicy', !form.inheritPolicy)} className={cn('h-10 rounded-xl border px-4 text-sm font-black transition', form.inheritPolicy ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600')}>{form.inheritPolicy ? 'Use Parent Policy' : 'Local Policy'}</button>
                <button type="button" onClick={() => updateForm('useSchedule', !form.useSchedule)} className={cn('h-10 rounded-xl border px-4 text-sm font-black transition', form.useSchedule ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600')}>{form.useSchedule ? 'Schedule Enabled' : 'Schedule Disabled'}</button>
              </div>
            </EmaSection>

            <EmaSection eyebrow="Website Groups" title="Group Manager" description="Manage reusable website groups and add selected group URLs to the policy.">
              <div className="grid gap-4 xl:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
                <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <EmaSearchInput value={groupSearch} onChange={setGroupSearch} placeholder="Search website group..." />
                  <div className="mt-3 space-y-2">
                    {groupPageData.rows.length ? groupPageData.rows.map((group) => {
                      const id = getWebGroupId(group);
                      const active = selectedGroupId === id;
                      return (
                        <button key={id || getWebGroupName(group)} type="button" onClick={() => setSelectedGroupId(id)} className={cn('flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition', active ? 'border-blue-300 bg-white text-blue-700 shadow-sm' : 'border-slate-200 bg-white text-slate-800 hover:border-blue-200')}>
                          <span className="min-w-0"><span className="block truncate text-sm font-black">{getWebGroupName(group)}</span><span className="block truncate text-xs font-semibold text-slate-500">ID: {id || '-'}</span></span><Globe size={16} />
                        </button>
                      );
                    }) : <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center text-sm font-bold text-slate-500">No website group found.</div>}
                  </div>
                  {filteredGroups.length > PAGE_SIZE ? <EmaPagination page={groupPageData.safePage} totalPages={groupPageData.totalPages} totalLabel={`${filteredGroups.length} group(s)`} onPageChange={setGroupPage} /> : null}
                </div>

                <div className="min-w-0 space-y-3">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <div><FieldLabel>Group Name</FieldLabel><input value={groupName} onChange={(event) => setGroupName(event.target.value)} className={inputClass} placeholder="Website group name" /></div>
                    <div><FieldLabel>Description</FieldLabel><input value={groupDescription} onChange={(event) => setGroupDescription(event.target.value)} className={inputClass} placeholder="Optional description" /></div>
                    <div className="flex items-end gap-2"><EmaButton onClick={() => void saveGroup()} disabled={loadingGroupUrls}><Save size={16} />Save</EmaButton><EmaButton onClick={() => void createNewGroup()}><Plus size={16} />New</EmaButton>{selectedGroupId ? <EmaButton variant="danger" onClick={() => void deleteGroup()}><Trash2 size={16} />Delete</EmaButton> : null}</div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
                    <input value={groupUrlInput} onChange={(event) => setGroupUrlInput(event.target.value)} className={inputClass} placeholder={selectedGroupId ? 'Add URL/domain to selected group...' : 'Enter group name, then add URL/domain...'} onKeyDown={(event) => { if (event.key === 'Enter') void addGroupUrl(); }} />
                    <EmaButton onClick={() => void addGroupUrl()} disabled={loadingGroupUrls}><Plus size={16} />{selectedGroupId ? 'Add URL' : 'Create + Add URL'}</EmaButton>
                    <EmaButton variant="primary" onClick={addGroupUrlsToPolicy} disabled={!webGroupUrls.length}><LinkIcon size={16} />Add Group To Policy</EmaButton>
                  </div>

                  <EmaTableShell title="Selected Group URLs" subtitle={selectedGroup ? getWebGroupName(selectedGroup) : 'Create or select a website group.'}>
                    <EmaTable columns={groupUrlColumns} rows={groupUrlPageData.rows} loading={loadingGroupUrls} getRowKey={(row, index) => `${selectedGroupId || 'group'}-${getUrlSeq(row, index)}-${getWebGroupUrlValue(row)}`} emptyText="No URL found in this group." />
                    {webGroupUrls.length > PAGE_SIZE ? <EmaPagination page={groupUrlPageData.safePage} totalPages={groupUrlPageData.totalPages} totalLabel={`${webGroupUrls.length} URL(s)`} onPageChange={setGroupUrlPage} /> : null}
                  </EmaTableShell>
                </div>
              </div>
            </EmaSection>

            <EmaSection eyebrow="Policy URLs" title="Restricted Website List" description="Compact URL picker for web restriction policy.">
              <div className="space-y-3">
                <EmaToolbar search={<EmaSearchInput value={policyUrlSearch} onChange={setPolicyUrlSearch} placeholder="Search policy URL..." />} right={<><input value={newPolicyUrl} onChange={(event) => setNewPolicyUrl(event.target.value)} className={cn(inputClass, 'min-w-[18rem]')} placeholder="example.com" onKeyDown={(event) => { if (event.key === 'Enter') addPolicyUrl(); }} /><EmaButton variant="primary" onClick={addPolicyUrl}><Plus size={16} />Add URL</EmaButton></>} />
                <EmaTableShell title="Policy Website URLs" subtitle={`${webUrls.length} selected from ${filteredPolicyUrls.length} shown`}>
                  <EmaTable columns={policyUrlColumns} rows={policyUrlPageData.rows} loading={loadingData} getRowKey={(url) => url} emptyText="No website URL selected." />
                  {filteredPolicyUrls.length > PAGE_SIZE ? <EmaPagination page={policyUrlPageData.safePage} totalPages={policyUrlPageData.totalPages} totalLabel={`${filteredPolicyUrls.length} URL(s)`} onPageChange={setPolicyUrlPage} /> : null}
                </EmaTableShell>
              </div>
            </EmaSection>

            <EmaSection eyebrow="Schedule" title="Policy Window" description="Day selection and up to 4 restriction schedules.">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">{DAY_OPTIONS.map((day) => { const selected = selectedDays.includes(day); return <button key={day} type="button" onClick={() => toggleDay(day)} className={cn('h-10 rounded-xl border px-3 text-xs font-black transition', selected ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200')}>{day}</button>; })}</div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{(['schedule1', 'schedule2', 'schedule3', 'schedule4'] as const).map((key, index) => <div key={key}><FieldLabel>Schedule {index + 1}</FieldLabel><input value={form[key]} onChange={(event) => updateForm(key, event.target.value)} className={inputClass} placeholder="09:00-18:00" /></div>)}</div>
                <div className="flex justify-end"><EmaButton variant="primary" onClick={() => void savePolicy()} disabled={saving || loadingData}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}Save Policy</EmaButton></div>
              </div>
            </EmaSection>
          </div>
        ) : null}

        {activeTab === 'policyStatus' ? (
          <div className="space-y-3">
            <EmaToolbar search={<EmaSearchInput value={policySearch} onChange={setPolicySearch} placeholder="Search policy status..." />} filters={<><EmaFilterField label="From"><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={inputClass} /></EmaFilterField><EmaFilterField label="To"><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className={inputClass} /></EmaFilterField><button type="button" onClick={() => setIncludeSub((value) => !value)} className={cn('h-10 rounded-xl border px-4 text-sm font-black transition', includeSub ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500')}>Include Sub</button></>} />
            <EmaTableShell title="Policy Status" subtitle={`${filteredPolicyRows.length} policy record(s)`}>
              <EmaTable columns={policyColumns} rows={policyPageData.rows} loading={loadingData} getRowKey={(row, index) => `${pick(row, ['policy_id', 'PolicyID', 'id'], 'policy')}-${index}`} emptyText="No policy status found." />
              {filteredPolicyRows.length > PAGE_SIZE ? <EmaPagination page={policyPageData.safePage} totalPages={policyPageData.totalPages} totalLabel={`${filteredPolicyRows.length} record(s)`} onPageChange={setPolicyPage} /> : null}
            </EmaTableShell>
          </div>
        ) : null}
      </div>
      <EmaToastViewport items={toasts} onClose={(id) => setToasts((items) => items.filter((item) => item.id !== id))} />
    </EmaPageLayout>
  );
}
