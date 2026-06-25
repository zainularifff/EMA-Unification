import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EmaButton,
  EmaFilterField,
  EmaKpiCard,
  EmaKpiGrid,
  EmaModal,
  EmaPageLayout,
  EmaPagination,
  EmaSearchInput,
  EmaSection,
  EmaSidebarActionButton,
  EmaSidebarPanel,
  EmaSidebarTreeRow,
  EmaTable,
  EmaTableShell,
  EmaToolbar,
  EmaToastViewport,
  type EmaTableColumn,
} from "../components/ema";
import {
  Activity,
  Database,
  Download,
  FolderTree,
  Globe2,
  Link2,
  ListTree,
  MousePointerClick,
  Plus,
  RefreshCw,
  Timer,
  MoreVertical,
  Eye,
  Laptop
} from "lucide-react";
import clsx from "clsx";
import internetMeteringService from "../services/internetMeteringService";

// --- TYPES FROM OLD LOGIC ---
type NodeKind = "all" | "folder" | "device" | "url-folder" | "url";

type TreeNodeType = {
  id: string;
  label: string;
  type: NodeKind;
  children?: TreeNodeType[];
  childrenLoaded?: boolean;
  objectRelIdn?: number;
  objectRootIdn?: number;
  objectDeviceID?: string;
  urlMainIdn?: number;
  url?: string;
  restrict?: number;
  count?: number;
  raw?: unknown;
};

type InternetUsageRow = {
  id: number;
  domainName: string;
  urlMainIdn: number;
  usedTime: number;
  counts: number;
  device: string;
  date: string;
  raw?: unknown;
};

type InternetStats = {
  totalRecords: number;
  totalDomains: number;
  totalUsageSeconds: number;
  totalCounts: number;
  rows?: unknown[];
};

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  error?: string;
  totalRecords?: number;
  data?: T;
  raw?: unknown;
};

type UrlRuleAction = 'restrict' | 'manage' | 'remove';
type PendingUrlAction = { action: UrlRuleAction; node: TreeNodeType };
type MeteringAction = 'start' | 'collect' | 'stop';
type PendingMeteringAction = { action: MeteringAction; node: TreeNodeType };

// --- CONSTANTS & UTILS FROM OLD LOGIC ---
const WEB_METERING_JOB_TYPE = 10300;
const WEB_METERING_START_COMMAND = 1404;
const WEB_METERING_COLLECT_COMMAND = 1407;
const WEB_METERING_STOP_COMMAND = 1409;
const URL_RULE_PAGE_SIZE = 10;
const INTERNET_METERING_CACHE_TTL = 5 * 60 * 1000;

const todayIso = () => new Date().toISOString().slice(0, 10);
const daysAgoIso = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

const numberFrom = (row: any, keys: string[], fallback = 0) => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== '') {
      const parsed = Number.parseInt(String(value).replace(/,/g, ""), 10);
      return Number.isNaN(parsed) ? fallback : parsed;
    }
  }
  const rowKeys = Object.keys(row || {});
  for (const wanted of keys) {
    const match = rowKeys.find((key) => key.toLowerCase() === wanted.toLowerCase());
    const value = match ? row[match] : undefined;
    if (value !== undefined && value !== null && value !== '') {
      const parsed = Number.parseInt(String(value).replace(/,/g, ""), 10);
      return Number.isNaN(parsed) ? fallback : parsed;
    }
  }
  return fallback;
};

const textFrom = (row: any, keys: string[], fallback = '') => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
  }
  const rowKeys = Object.keys(row || {});
  for (const wanted of keys) {
    const match = rowKeys.find((key) => key.toLowerCase() === wanted.toLowerCase());
    const value = match ? row[match] : undefined;
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
  }
  return fallback;
};

const extractArray = <T,>(payload: any): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload?.data)) return payload.data as T[];
  if (Array.isArray(payload?.data?.data)) return payload.data.data as T[];
  if (Array.isArray(payload?.result)) return payload.result as T[];
  if (Array.isArray(payload?.recordset)) return payload.recordset as T[];
  if (Array.isArray(payload?.rows)) return payload.rows as T[];
  return [];
};

const formatDuration = (seconds: number) => {
  const safeSeconds = Math.max(Number(seconds) || 0, 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
};

const formatNumber = (value: number) => new Intl.NumberFormat('en-MY').format(Number(value) || 0);

function readInternetMeteringCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt?: number; value?: T };
    if (!parsed.savedAt || Date.now() - parsed.savedAt > INTERNET_METERING_CACHE_TTL) return null;
    return parsed.value ?? null;
  } catch {
    return null;
  }
}

function writeInternetMeteringCache<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value }));
  } catch {
    // Ignore storage quota/privacy errors.
  }
}

const extractDepartmentRows = (payload: any): any[] => {
  if (Array.isArray(payload?.data?.departments)) return payload.data.departments;
  if (Array.isArray(payload?.departments)) return payload.departments;
  return extractArray<any>(payload);
};

const extractAssetRows = (payload: any): any[] => {
  if (Array.isArray(payload?.data?.assets)) return payload.data.assets;
  if (Array.isArray(payload?.assets)) return payload.assets;
  return extractArray<any>(payload);
};

function mapDepartment(row: any, index: number): TreeNodeType {
  const objectRelIdn = numberFrom(row, ['Object_Rel_Idn', 'relationID', 'relationId', 'id', 'ID'], index + 1);
  const label = textFrom(row, ['Object_Rel_Name', 'RelationName', 'DepartmentName', 'department', 'name', 'label'], `Department ${index + 1}`);
  const nestedDepartments = extractArray<any>(row?.children).map((child, childIndex) => mapDepartment(child, childIndex));
  const explicitCount = numberFrom(row, ['TotalDevices', 'DeviceCount', 'deviceCount', 'AssetCount', 'assetCount', 'TotalAssets', 'count', 'Count', 'Total'], 0);

  return {
    id: `folder-${objectRelIdn || label}`,
    label,
    type: 'folder',
    objectRelIdn,
    count: explicitCount || undefined,
    children: nestedDepartments,
    childrenLoaded: false,
    raw: row,
  };
}

function mapAsset(row: any, index: number): TreeNodeType {
  const objectRootIdn = numberFrom(row, ['Object_Root_Idn', '_Idn', 'assetId', 'id', 'ID'], index + 1);
  const objectDeviceID = textFrom(row, ['Object_DeviceID', 'DeviceID', 'deviceID', 'deviceId'], '');
  const label = textFrom(row, ['ComputerName', 'Object_Client_Name', 'DeviceName', 'name', 'label'], objectDeviceID || `Device ${index + 1}`);
  return {
    id: `device-${objectRootIdn || objectDeviceID || label}`,
    label,
    type: 'device',
    objectRootIdn,
    objectRelIdn: numberFrom(row, ['Object_Rel_Idn', 'relationID', 'relationId'], 0),
    objectDeviceID,
    childrenLoaded: true,
    raw: row,
  };
}

function mapUsageRow(row: any, index: number): InternetUsageRow {
  return {
    id: numberFrom(row, ['id', 'ID', 'RowNumber', 'No', 'URLMain_Idn'], index + 1),
    domainName: textFrom(row, ['domainName', 'DomainName', 'URLMain', 'URL_Main', 'URL', 'url', 'Website', 'Host'], '-'),
    urlMainIdn: numberFrom(row, ['urlMainIdn', 'URLMain_Idn', 'URLMainID', 'URL_Idn', 'url_id'], 0),
    usedTime: numberFrom(row, ['usedTime', 'UsedTime', 'Used_Time', 'Duration', 'DurationSeconds', 'Seconds', 'TotalSeconds'], 0),
    counts: numberFrom(row, ['counts', 'Counts', 'Count', 'UseCount', 'UsedCount', 'HitCount', 'AccessCount'], 0),
    device: textFrom(row, ['device', 'ComputerName', 'Object_Client_Name', 'DeviceName', 'UserName', 'User'], '-'),
    date: textFrom(row, ['date', 'MeterDate', 'Meter_Date', 'Date', 'SearchDate', 'UseDate'], '').slice(0, 10),
    raw: row.raw || row,
  };
}

function mapUrlNode(row: any, index: number, parentRestrict = -1): TreeNodeType {
  const hasChildren = extractArray<any>(row?.children).length > 0;
  const type = row?.type === 'url' || (!hasChildren && numberFrom(row, ['URLMain_Idn', 'urlMainIdn', 'URLMainID', 'URL_Idn'], 0) > 0) ? 'url' : 'url-folder';
  const urlMainIdn = numberFrom(row, ['URLMain_Idn', 'urlMainIdn', 'URLMainID', 'URL_Idn', 'id'], 0);
  const label = textFrom(row, ['label', 'url', 'URLMain', 'URL_Main', 'DomainName', 'URLParent'], `URL ${index + 1}`);
  const restrict = numberFrom(row, ['restrict', 'nRestrict', 'Restrict', 'restrict_id'], parentRestrict);
  const safeId = String(row?.id || `${type}-${restrict}-${urlMainIdn || label}-${index}`);

  return {
    id: safeId,
    label,
    type,
    urlMainIdn,
    url: textFrom(row, ['url', 'URLMain', 'URL_Main', 'DomainName'], label),
    restrict,
    childrenLoaded: true,
    children: extractArray<any>(row?.children).map((child, childIndex) => mapUrlNode(child, childIndex, restrict)),
    raw: row?.raw || row,
  };
}

function flattenUrlNodes(node: TreeNodeType): TreeNodeType[] {
  const children = node.children || [];
  return [
    ...(node.type === 'url' ? [node] : []),
    ...children.flatMap((child) => flattenUrlNodes(child)),
  ];
}

function updateNode(node: TreeNodeType, nodeId: string, updater: (node: TreeNodeType) => TreeNodeType): TreeNodeType {
  if (node.id === nodeId) return updater(node);
  return {
    ...node,
    children: node.children?.map((child) => updateNode(child, nodeId, updater)),
  };
}

function treeDisplayCount(node: TreeNodeType): number {
  if (typeof node.count === 'number' && Number.isFinite(node.count) && node.count > 0) return node.count;
  if (node.type === 'device' || node.type === 'url') return 1;
  if (!node.children?.length) return 0;
  return node.children.reduce((sum, child) => sum + treeDisplayCount(child), 0);
}

function filterTreeNode(node: TreeNodeType, query: string): TreeNodeType | null {
  const search = query.trim().toLowerCase();
  if (!search) return node;
  const filteredChildren = (node.children || [])
    .map((child) => filterTreeNode(child, search))
    .filter(Boolean) as TreeNodeType[];
  const matches = node.label.toLowerCase().includes(search) || String(node.url || '').toLowerCase().includes(search);
  if (!matches && filteredChildren.length === 0) return null;
  return { ...node, children: filteredChildren, childrenLoaded: true };
}

function getScopeStorageKey(node: TreeNodeType): string {
  if (node.type === 'device') return `device:${node.objectRootIdn || node.objectDeviceID || node.id}`;
  if (node.type === 'folder') return `folder:${node.objectRelIdn || node.id}`;
  return 'all:company';
}

function makeResultTarget(selectedUrl: TreeNodeType, restrictFilter: number, selectedUrlLabel: string): TreeNodeType {
  if (selectedUrl.type === 'url') return selectedUrl;
  return {
    id: `results-${restrictFilter}`,
    label: selectedUrlLabel,
    type: 'url-folder',
    restrict: restrictFilter,
    childrenLoaded: true,
  };
}

function getUsageTargetKey(node: TreeNodeType): string {
  if (node.type === 'url') return `url:${node.urlMainIdn || node.url || node.id}`;
  return `folder:${node.restrict ?? 'all'}:${node.id}`;
}

function queryParamsFromSearch(params: URLSearchParams): Record<string, string> {
  const record: Record<string, string> = {};
  params.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

// --- CUSTOM LAZY TREE NODE COMPONENT FOR SIDEBAR ---
function SidebarTreeNode({
  node,
  selectedId,
  onSelect,
  onLoadChildren,
  onContextMenu,
  depth = 0,
  defaultOpen = false,
  rootDisplayLabel,
}: {
  node: TreeNodeType;
  selectedId: string;
  onSelect: (node: TreeNodeType) => void;
  onLoadChildren?: (node: TreeNodeType) => Promise<void>;
  onContextMenu?: (node: TreeNodeType, position: { x: number; y: number }) => void;
  depth?: number;
  defaultOpen?: boolean;
  rootDisplayLabel?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const canExpand = node.type === 'all' || node.type === 'folder' || node.type === 'url-folder' || Boolean(node.children?.length);
  const isSelected = selectedId === node.id;
  const displayLabel = rootDisplayLabel && depth === 0 ? rootDisplayLabel : node.label;
  
  const icon = node.type === 'device' ? <Laptop size={14} /> : node.type === 'url' ? <Link2 size={14} /> : depth === 0 ? <Globe2 size={14} /> : <FolderTree size={14} />;

  const handleSelect = async () => {
    onSelect(node);
    if (!canExpand) return;
    if (!node.childrenLoaded && onLoadChildren) await onLoadChildren(node);
    setOpen((value) => !value);
  };

  const handleContext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onContextMenu) {
      onContextMenu(node, { x: e.clientX, y: e.clientY });
    }
  };

  return (
    <div>
      <EmaSidebarTreeRow active={isSelected} depth={depth} onClick={handleSelect} onContextMenu={handleContext}>
        <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-white/70 text-slate-500">{icon}</span>
        <span className="min-w-0 flex-1 truncate">{displayLabel}</span>
        {typeof node.count === "number" && node.count > 0 ? (
          <span className="rounded-full bg-white px-2 py-0.5 text-[0.68rem] font-black text-slate-500">{node.count}</span>
        ) : null}
        {onContextMenu && (
           <button 
            type="button" 
            onClick={handleContext}
            className="ml-auto text-slate-400 hover:text-slate-600 focus:outline-none"
           >
             <MoreVertical size={14} />
           </button>
        )}
      </EmaSidebarTreeRow>

      {open && Boolean(node.children?.length) && (
        <div>
          {node.children?.map((child) => (
            <SidebarTreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              onLoadChildren={onLoadChildren}
              onContextMenu={onContextMenu}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// --- MAIN COMPONENT ---
export default function InternetMetering() {
  // --- STATE DARI OLD LOGIC ---
  const [orgRoot, setOrgRoot] = useState<TreeNodeType>({ id: 'all-devices', label: 'All Devices', type: 'all', children: [], childrenLoaded: false });
  const [selectedScope, setSelectedScope] = useState<TreeNodeType>({ id: 'all-devices', label: 'All Devices', type: 'all', children: [], childrenLoaded: false });
  const [urlRoot, setUrlRoot] = useState<TreeNodeType>({ id: 'url-root', label: 'Domain Rules', type: 'url-folder', children: [], childrenLoaded: true });
  const [selectedUrl, setSelectedUrl] = useState<TreeNodeType>({ id: 'url-root', label: 'All domains', type: 'url-folder', childrenLoaded: true });

  const [sidebarTab, setSidebarTab] = useState<'branches' | 'urls'>('branches');
  const [sidebarSearch, setSidebarSearch] = useState('');

  const [usageRows, setUsageRows] = useState<InternetUsageRow[]>([]);
  const [stats, setStats] = useState<InternetStats>({ totalRecords: 0, totalDomains: 0, totalUsageSeconds: 0, totalCounts: 0 });
  const [totalRecords, setTotalRecords] = useState(0);
  const [query, setQuery] = useState('');
  const [fromDate, setFromDate] = useState(daysAgoIso(30));
  const [toDate, setToDate] = useState(todayIso());
  const [restrictFilter, setRestrictFilter] = useState(-1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  
  const [loading, setLoading] = useState(false);
  const [treeLoading, setTreeLoading] = useState(false);
  const [urlLoading, setUrlLoading] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  
  const [detailRow, setDetailRow] = useState<InternetUsageRow | null>(null);
  const [showAddUrlModal, setShowAddUrlModal] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [urlEntryType, setUrlEntryType] = useState<0 | 1>(0);
  const [urlPage, setUrlPage] = useState(1);
  const [urlHasNextPage, setUrlHasNextPage] = useState(false);
  const [urlTotalRecords, setUrlTotalRecords] = useState(0);
  
  const [actionMenuId, setActionMenuId] = useState<{ node: TreeNodeType; x: number; y: number } | null>(null);
  const [pendingUrlAction, setPendingUrlAction] = useState<PendingUrlAction | null>(null);
  const [usagePanelUrl, setUsagePanelUrl] = useState<TreeNodeType | null>(null);
  const [scopeMenu, setScopeMenu] = useState<{ node: TreeNodeType; x: number; y: number } | null>(null);
  const [pendingMeteringAction, setPendingMeteringAction] = useState<PendingMeteringAction | null>(null);
  const [meteringBusy, setMeteringBusy] = useState(false);
  
  const urlLoadSeq = useRef(0);
  const meterLoadSeq = useRef(0);
  const orgLoadSeq = useRef(0);
  const [activeMeteringScopes, setActiveMeteringScopes] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('internetMeteringActiveScopes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // --- API / DATA LOADING LOGIC (OLD LOGIC) ---
  const loadOrgChildren = useCallback(async (node: TreeNodeType) => {
    const requestId = ++orgLoadSeq.current;
    const cacheKey = `internet-metering:org-children:${node.type}:${node.objectRelIdn || node.id}`;
    const cachedChildren = readInternetMeteringCache<TreeNodeType[]>(cacheKey);

    if (cachedChildren?.length) {
      setOrgRoot((current) => updateNode(current, node.id, (target) => ({ ...target, children: cachedChildren, childrenLoaded: true })));
      setSelectedScope((current) => (current.id === node.id ? { ...current, children: cachedChildren, childrenLoaded: true } : current));
    }

    try {
      setTreeLoading(true);
      let departments: TreeNodeType[] = [];
      let assets: TreeNodeType[] = [];

      if (node.type === 'all') {
        const payload = await internetMeteringService.getDepartments();
        const departmentRows = extractDepartmentRows(payload);
        departments = departmentRows.map((row, index) => mapDepartment(row, index));
      } else if (node.type === 'folder' && node.objectRelIdn) {
        const folderPayload = await internetMeteringService.getDepartmentChildren(node.objectRelIdn).catch(() => ({ departments: [], assets: [] }));
        const departmentRows = extractDepartmentRows(folderPayload);
        let assetRows = extractAssetRows(folderPayload);

        if (assetRows.length === 0) {
          const assetPayload = await internetMeteringService.getAssetsByRelationID(node.objectRelIdn).catch(() => []);
          assetRows = extractAssetRows(assetPayload);
        }

        departments = departmentRows.map((row, index) => mapDepartment(row, index));
        assets = assetRows.map(mapAsset);
      }

      if (requestId !== orgLoadSeq.current) return;

      const children = [...departments, ...assets];
      const nextCount = typeof node.count === 'number' && node.count > 0 ? node.count : children.reduce((sum, item) => sum + treeDisplayCount(item), 0);
      writeInternetMeteringCache(cacheKey, children);
      setOrgRoot((current) => updateNode(current, node.id, (target) => ({ ...target, count: nextCount || target.count, children, childrenLoaded: true })));
      setSelectedScope((current) => (current.id === node.id ? { ...current, count: nextCount || current.count, children, childrenLoaded: true } : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (requestId === orgLoadSeq.current) setTreeLoading(false);
    }
  }, []);

  const loadRootDeviceCount = useCallback(async () => {
    const cacheKey = 'internet-metering:root-device-count:v1';
    const cachedCount = readInternetMeteringCache<number>(cacheKey);

    if (cachedCount && cachedCount > 0) {
      setOrgRoot((current) => ({ ...current, count: cachedCount }));
      setSelectedScope((current) => (current.id === 'all-devices' ? { ...current, count: cachedCount } : current));
    }

    try {
      const assetPayload = await internetMeteringService.getAssets();
      const assetRows = extractAssetRows(assetPayload);
      const nextCount = assetRows.length;
      if (nextCount > 0) {
        writeInternetMeteringCache(cacheKey, nextCount);
        setOrgRoot((current) => ({ ...current, count: nextCount }));
        setSelectedScope((current) => (current.id === 'all-devices' ? { ...current, count: nextCount } : current));
      }
    } catch {}
  }, []);

  const loadUrlTree = useCallback(async () => {
    const requestId = ++urlLoadSeq.current;
    const activeRestrict = restrictFilter === 1 ? 1 : restrictFilter === 0 ? 0 : -1;
    const cacheKey = `internet-metering:url-tree:${activeRestrict}:${urlPage}`;
    const cachedRoot = readInternetMeteringCache<TreeNodeType>(cacheKey);

    if (cachedRoot) {
      const loadedRows = flattenUrlNodes(cachedRoot);
      setUrlHasNextPage(loadedRows.length >= URL_RULE_PAGE_SIZE);
      setUrlTotalRecords(0);
      setUrlRoot(cachedRoot);
      setSelectedUrl((current) => {
        if (current.type === 'url' && loadedRows.some((node) => node.url === current.url)) return current;
        return { id: 'url-root', label: cachedRoot.label, type: 'url-folder', restrict: activeRestrict, childrenLoaded: true };
      });
    }

    try {
      setUrlLoading(true);
      setError('');

      const params = new URLSearchParams({ restrictID: String(activeRestrict), page: String(urlPage), limit: String(URL_RULE_PAGE_SIZE) });
      const payload = await internetMeteringService.getUrlTreePayload(queryParamsFromSearch(params)) as ApiResponse<unknown[]>;
      
      if (requestId !== urlLoadSeq.current) return;

      const children = extractArray<any>(payload).map((row, index) => mapUrlNode(row, index, activeRestrict));
      const nextUrlTotalRecords = numberFrom(payload as any, ['totalRecords', 'TotalRecords', 'total', 'count'], 0) || numberFrom((payload as any)?.data, ['totalRecords', 'TotalRecords', 'total', 'count'], 0);
      const rootLabel = activeRestrict === -1 ? 'All Domains' : activeRestrict === 1 ? 'Restricted' : 'Managed';
      const nextRoot: TreeNodeType = { id: 'url-root', label: rootLabel, type: 'url-folder', restrict: activeRestrict, children, childrenLoaded: true };

      const loadedRows = flattenUrlNodes(nextRoot);
      setUrlHasNextPage(loadedRows.length >= URL_RULE_PAGE_SIZE);
      setUrlTotalRecords(nextUrlTotalRecords);
      setUrlRoot(nextRoot);
      writeInternetMeteringCache(cacheKey, nextRoot);
      setSelectedUrl((current) => {
        if (current.type === 'url' && loadedRows.some((node) => node.url === current.url)) return current;
        return { id: 'url-root', label: rootLabel, type: 'url-folder', restrict: activeRestrict, childrenLoaded: true };
      });
    } catch (err) {
      if (requestId !== urlLoadSeq.current) return;
      setError(err instanceof Error ? err.message : String(err));
      setUrlHasNextPage(false);
      setUrlTotalRecords(0);
    } finally {
      if (requestId === urlLoadSeq.current) setUrlLoading(false);
    }
  }, [restrictFilter, urlPage]);

  const activeUsageUrl = usagePanelUrl || selectedUrl;

  const buildUsageParams = useCallback(() => {
    const params = new URLSearchParams({ startDate: fromDate, endDate: toDate, page: String(page), limit: String(limit) });

    if (selectedScope.type === 'device' && selectedScope.objectRootIdn) {
      params.set('clientID', String(selectedScope.objectRootIdn));
    } else if (selectedScope.type === 'folder' && selectedScope.objectRelIdn) {
      params.set('relationID', String(selectedScope.objectRelIdn));
    } else {
      params.set('relationID', '-1');
    }

    const usageUrl = activeUsageUrl;
    params.set('urlID', usageUrl.type === 'url' && usageUrl.urlMainIdn ? String(usageUrl.urlMainIdn) : '-1');
    if (usageUrl.restrict === 0 || usageUrl.restrict === 1) params.set('restrict', String(usageUrl.restrict));
    return params;
  }, [activeUsageUrl, fromDate, limit, page, selectedScope, toDate]);

  const loadMetering = useCallback(async (options?: { force?: boolean }) => {
    const requestId = ++meterLoadSeq.current;
    const params = buildUsageParams();
    const cacheKey = `internet-metering:usage:${params.toString()}`;
    const cached = options?.force ? null : readInternetMeteringCache<{ rows: InternetUsageRow[]; stats: InternetStats; totalRecords: number }>(cacheKey);

    if (cached) {
      setUsageRows(cached.rows);
      setStats(cached.stats);
      setTotalRecords(cached.totalRecords);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      setError('');
      const usagePayload = await internetMeteringService.getUsagePayload(queryParamsFromSearch(params)) as ApiResponse<unknown[]>;
      if (requestId !== meterLoadSeq.current) return;

      const normalizedRows = extractArray<any>(usagePayload).map(mapUsageRow);
      const derivedStats = {
        totalRecords: normalizedRows.length,
        totalDomains: new Set(normalizedRows.map((row) => row.domainName)).size,
        totalUsageSeconds: normalizedRows.reduce((sum, row) => sum + row.usedTime, 0),
        totalCounts: normalizedRows.reduce((sum, row) => sum + row.counts, 0),
      };
      const nextTotalRecords = Number(usagePayload.totalRecords || normalizedRows.length || 0);
      const snapshot = { rows: normalizedRows, stats: derivedStats, totalRecords: nextTotalRecords };

      setUsageRows(snapshot.rows);
      setStats(snapshot.stats);
      setTotalRecords(snapshot.totalRecords);
      writeInternetMeteringCache(cacheKey, snapshot);
      setLoading(false);

      (internetMeteringService.getStatsPayload(queryParamsFromSearch(params)) as Promise<ApiResponse<InternetStats>>)
        .then((statsPayload) => {
          if (requestId !== meterLoadSeq.current) return;
          const statsData = statsPayload.data;
          if (!statsData) return;
          const nextStats = {
            totalRecords: Number(statsData.totalRecords || derivedStats.totalRecords || 0),
            totalDomains: Number(statsData.totalDomains || derivedStats.totalDomains || 0),
            totalUsageSeconds: Number(statsData.totalUsageSeconds || derivedStats.totalUsageSeconds || 0),
            totalCounts: Number(statsData.totalCounts || derivedStats.totalCounts || 0),
            rows: statsData.rows,
          };
          setStats(nextStats);
          writeInternetMeteringCache(cacheKey, { ...snapshot, stats: nextStats });
        })
        .catch(() => {});
    } catch (err) {
      if (requestId !== meterLoadSeq.current) return;
      setError(err instanceof Error ? err.message : String(err));
      if (!cached) {
        setUsageRows([]);
        setStats({ totalRecords: 0, totalDomains: 0, totalUsageSeconds: 0, totalCounts: 0 });
        setTotalRecords(0);
      }
      setLoading(false);
    }
  }, [buildUsageParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => loadRootDeviceCount(), 250);
    return () => window.clearTimeout(timer);
  }, [loadRootDeviceCount]);

  useEffect(() => {
    void loadOrgChildren({ id: 'all-devices', label: 'All Devices', type: 'all', children: [], childrenLoaded: false });
  }, [loadOrgChildren]);

  useEffect(() => { loadUrlTree(); }, [loadUrlTree]);

  useEffect(() => {
    if (!usagePanelUrl) return;
    loadMetering();
  }, [usagePanelUrl, loadMetering]);

  // --- ACTIONS & HANDLERS (OLD LOGIC) ---
  const handleSelectScopeNode = useCallback((node: TreeNodeType) => {
    setSelectedScope(node);
    setPage(1);
    setUsagePanelUrl((current) => current || makeResultTarget(selectedUrl, restrictFilter, selectedUrlLabel));
  }, [restrictFilter, selectedUrl]);

  const handleSelectUrlNode = (node: TreeNodeType) => {
    setActionMenuId(null);
    if (node.id === 'url-sidebar-root') {
      setUsagePanelUrl(null);
      setRestrictFilter(-1);
      setUrlPage(1);
      setSelectedUrl({ id: 'url-root', label: 'All domains', type: 'url-folder', restrict: -1, childrenLoaded: true });
      return;
    }
    if (node.type === 'url-folder' && (node.restrict === 0 || node.restrict === 1)) {
      setUsagePanelUrl(null);
      setRestrictFilter(node.restrict);
      setUrlEntryType(node.restrict);
      setUrlPage(1);
      setSelectedUrl({ id: node.id, label: node.label, type: 'url-folder', restrict: node.restrict, childrenLoaded: true });
      return;
    }
    setSelectedUrl(node);
  };

  const getScopeTypeLabel = (node: TreeNodeType) => {
    if (node.type === 'device') return 'Individual device';
    if (node.type === 'folder') return 'Organization';
    return 'Whole company';
  };

  const isScopeRunning = useCallback((node: TreeNodeType) => Boolean(activeMeteringScopes[getScopeStorageKey(node)]), [activeMeteringScopes]);

  const setScopeRunning = useCallback((node: TreeNodeType, running: boolean) => {
    const key = getScopeStorageKey(node);
    setActiveMeteringScopes((current) => {
      const next = { ...current };
      if (running) next[key] = true; else delete next[key];
      localStorage.setItem('internetMeteringActiveScopes', JSON.stringify(next));
      return next;
    });
  }, []);

  const buildMeteringPayload = (node: TreeNodeType, commandID: number, description: string) => {
    const payload: Record<string, unknown> = { Job_Type: WEB_METERING_JOB_TYPE, Job_Command: commandID, commandID, Job_Description: description };
    if (node.type === 'device') {
      payload.scanMode = 'device'; payload.Object_Root_Idn = node.objectRootIdn; payload.Object_DeviceID = node.objectDeviceID;
    } else if (node.type === 'folder') {
      payload.scanMode = 'folder'; payload.Object_Rel_Idn = node.objectRelIdn;
    } else {
      payload.scanMode = 'all';
    }
    return payload;
  };

  const runMeteringAction = async (action: MeteringAction, node: TreeNodeType) => {
    const commandID = action === 'start' ? WEB_METERING_START_COMMAND : action === 'stop' ? WEB_METERING_STOP_COMMAND : WEB_METERING_COLLECT_COMMAND;
    const label = action === 'start' ? 'Metering started' : action === 'stop' ? 'Metering stopped' : 'Collection sent';

    const result = await internetMeteringService.runMeteringAction(
      action,
      buildMeteringPayload(node, commandID, `${label} - ${getScopeTypeLabel(node)}`),
    ) as ApiResponse<any> | any;

    if (action === 'start') setScopeRunning(node, true);
    if (action === 'stop') setScopeRunning(node, false);

    const resultData = result?.data ?? result;
    const jobId = resultData?.Job_Idn ? `Job #${resultData.Job_Idn}` : label;
    const targetCount = resultData?.targetCount !== undefined ? ` · ${resultData.targetCount} targets` : '';
    setToast(`${jobId}${targetCount}`);
  };

  const confirmMeteringAction = async () => {
    if (!pendingMeteringAction) return;
    try {
      setMeteringBusy(true); setError('');
      await runMeteringAction(pendingMeteringAction.action, pendingMeteringAction.node);
      if (pendingMeteringAction.action === 'collect') {
        setSelectedScope(pendingMeteringAction.node); setPage(1);
        setUsagePanelUrl((current) => current || makeResultTarget(selectedUrl, restrictFilter, selectedUrlLabel));
      }
      setPendingMeteringAction(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setMeteringBusy(false); }
  };

  const collectResult = async () => {
    try {
      setCollecting(true); setError('');
      await runMeteringAction('collect', selectedScope);
      if (!usagePanelUrl) setUsagePanelUrl(makeResultTarget(selectedUrl, restrictFilter, selectedUrlLabel));
      else await loadMetering({ force: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setCollecting(false); }
  };

  const saveUrl = async () => {
    const cleanUrl = newUrl.trim();
    if (!cleanUrl) return;
    try {
      setUrlLoading(true);
      await internetMeteringService.createUrl({ urlMain: cleanUrl, restrictID: urlEntryType });
      setNewUrl(''); setShowAddUrlModal(false);
      setToast(`${urlEntryType === 1 ? 'Restricted' : 'Managed'}: ${cleanUrl}`);
      await loadUrlTree();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setUrlLoading(false); }
  };

  const applyUrlAction = async () => {
    if (!pendingUrlAction?.node.url) return;
    const { action, node } = pendingUrlAction;
    const targetUrl = node.url;
    try {
      setUrlLoading(true); setPendingUrlAction(null); setActionMenuId(null);
      if (action === 'remove') {
        await internetMeteringService.deleteUrl({ urlMain: targetUrl });
        setToast(`Removed: ${targetUrl}`);
      } else {
        const restrictID = action === 'restrict' ? 1 : 0;
        await internetMeteringService.createUrl({ urlMain: targetUrl, restrictID });
        setToast(`${restrictID === 1 ? 'Restricted' : 'Managed'}: ${targetUrl}`);
      }
      setSelectedUrl({ id: 'url-root', label: 'All domains', type: 'url-folder', childrenLoaded: true });
      await loadUrlTree();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setUrlLoading(false); }
  };

  const openResultsLog = (node = makeResultTarget(selectedUrl, restrictFilter, selectedUrlLabel)) => {
    if (node.type === 'url') setSelectedUrl(node);
    const isSameTarget = usagePanelUrl && getUsageTargetKey(usagePanelUrl) === getUsageTargetKey(node);
    if (!isSameTarget) {
      setUsageRows([]); setTotalRecords(0); setStats({ totalRecords: 0, totalDomains: 0, totalUsageSeconds: 0, totalCounts: 0 });
      setPage(1); setUsagePanelUrl(node);
    }
    setActionMenuId(null);
  };

  // --- DATA TRANSFORMS ---
  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return usageRows;
    return usageRows.filter((row) => [row.domainName, row.device, row.date, String(row.urlMainIdn)].some((value) => value.toLowerCase().includes(search)));
  }, [query, usageRows]);

  const selectedScopeLabel = selectedScope.type === 'device' ? `Device · ${selectedScope.label}` : selectedScope.type === 'folder' ? `Folder · ${selectedScope.label}` : 'All Devices';
  const selectedUrlLabel = selectedUrl.type === 'url' ? selectedUrl.label : restrictFilter === -1 ? 'All Domains' : restrictFilter === 0 ? 'Managed' : 'Restricted';

  const sidebarUrlRoot = useMemo<TreeNodeType>(() => ({
    id: 'url-sidebar-root', label: 'All Domains', type: 'url-folder', restrict: -1, childrenLoaded: true,
    children: [
      { id: 'url-sidebar-managed', label: 'Managed', type: 'url-folder', restrict: 0, childrenLoaded: true, children: [] },
      { id: 'url-sidebar-restricted', label: 'Restricted', type: 'url-folder', restrict: 1, childrenLoaded: true, children: [] },
    ],
  }), []);

  const sidebarSelectedUrlId = restrictFilter === 0 ? 'url-sidebar-managed' : restrictFilter === 1 ? 'url-sidebar-restricted' : 'url-sidebar-root';
  const sidebarOrgTree = useMemo(() => filterTreeNode(orgRoot, sidebarSearch) || { ...orgRoot, children: [] }, [orgRoot, sidebarSearch]);
  const sidebarDomainTree = useMemo(() => filterTreeNode(sidebarUrlRoot, sidebarSearch) || { ...sidebarUrlRoot, children: [] }, [sidebarUrlRoot, sidebarSearch]);

  const urlRows = useMemo(() => flattenUrlNodes(urlRoot), [urlRoot]);
  const managedUrlRows = useMemo(() => urlRows.filter((node) => node.restrict === 0), [urlRows]);
  const restrictedUrlRows = useMemo(() => urlRows.filter((node) => node.restrict === 1), [urlRows]);
  const visibleUrlRows = useMemo(() => {
    if (restrictFilter === 0) return managedUrlRows;
    if (restrictFilter === 1) return restrictedUrlRows;
    return urlRows;
  }, [managedUrlRows, restrictFilter, restrictedUrlRows, urlRows]);

  const pagedUrlRows = useMemo(() => visibleUrlRows.slice(0, URL_RULE_PAGE_SIZE), [visibleUrlRows]);
  const urlTotalPages = Math.max(1, urlTotalRecords > 0 ? Math.ceil(urlTotalRecords / URL_RULE_PAGE_SIZE) : (urlHasNextPage ? urlPage + 1 : urlPage));
  const resultsTotalPages = Math.max(1, Math.ceil((totalRecords || filteredRows.length || 0) / Math.max(limit, 1)));

  useEffect(() => { if (urlPage > urlTotalPages) setUrlPage(urlTotalPages); }, [urlPage, urlTotalPages]);
  useEffect(() => { setUrlPage(1); }, [restrictFilter]);

  const exportCsv = () => {
    const headers = ['Domain', 'URL Main ID', 'Device/User', 'Used Time Seconds', 'Used Time', 'Access Count', 'Meter Date'];
    const csv = [headers.join(','), ...filteredRows.map((row) => [row.domainName, row.urlMainIdn, row.device, row.usedTime, formatDuration(row.usedTime), row.counts, row.date].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `internet-metering-${todayIso()}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  // --- TABLES DEFINITION (NEW UI TABLE) ---
  const usageColumns: EmaTableColumn<InternetUsageRow>[] = [
    { key: "no", header: "No", width: "5rem", render: (_row, index) => <span className="font-black text-slate-500">{String((page - 1) * limit + index + 1).padStart(2, "0")}</span> },
    { key: "domain", header: "Domain", render: (row) => (<div className="min-w-0"><strong className="block break-words font-black text-slate-950">{row.domainName}</strong><span className="text-xs font-bold text-slate-500">URL ID: {row.urlMainIdn || "-"}</span></div>) },
    { key: "duration", header: "Used Time", render: (row) => <span className="font-extrabold text-slate-800">{formatDuration(row.usedTime)}</span> },
    { key: "counts", header: "Counts", align: "right", render: (row) => <span className="font-black text-slate-900">{formatNumber(row.counts)}</span> },
    { key: "device", header: "Device", render: (row) => <span className="font-bold text-slate-700">{row.device || "-"}</span> },
    { key: "date", header: "Date", render: (row) => <span className="text-xs font-bold text-slate-500">{row.date || "-"}</span> },
    { key: "action", header: "Action", align: "right", render: (row) => <EmaButton variant="secondary" onClick={() => setDetailRow(row)}><Eye size={13}/> Detail</EmaButton> }
  ];

  const urlColumns: EmaTableColumn<TreeNodeType>[] = [
    { key: "no", header: "No", width: "5rem", render: (_row, index) => <span className="font-black text-slate-500">{String((urlPage - 1) * URL_RULE_PAGE_SIZE + index + 1).padStart(2, "0")}</span> },
    { key: "domain", header: "URL / Domain", render: (node) => <strong className="font-black text-slate-950">{node.label}</strong> },
    { key: "status", header: "Status", render: (node) => <span className={clsx("rounded-full px-2 py-1 text-xs font-bold", node.restrict === 1 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700")}>{node.restrict === 1 ? 'Restricted' : 'Managed'}</span> },
    { key: "id", header: "Rule ID", align: "right", render: (node) => <span className="text-slate-600">{node.urlMainIdn || '-'}</span> },
    { key: "action", header: "Action", align: "right", render: (node) => (
      <EmaButton variant="ghost" onClick={(e) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setActionMenuId({ node, x: rect.right - 220, y: rect.bottom + 8 });
      }}>
        <MoreVertical size={14} />
      </EmaButton>
    )}
  ];

  const toastItems = [
    ...(toast ? [{ id: "msg", tone: "success" as const, title: "Success", message: toast }] : []),
    ...(error ? [{ id: "err", tone: "error" as const, title: "Error", message: error }] : []),
  ];

  // --- RENDER SIDEBAR ---
  const sidebar = (
    <EmaSidebarPanel
      eyebrow="Internet Metering"
      title="Metering Control"
      description="Scope selection, usage results and URL rules."
      tabs={[
        { id: "branches", label: "Scope", icon: <ListTree size={14} /> },
        { id: "urls", label: "Rules", icon: <Globe2 size={14} /> },
      ]}
      activeTab={sidebarTab}
      onTabChange={(tab) => setSidebarTab(tab as 'branches' | 'urls')}
      searchValue={sidebarSearch}
      searchPlaceholder={sidebarTab === 'urls' ? 'Search rules...' : 'Search device/scope...'}
      onSearchChange={setSidebarSearch}
      action={
        <EmaSidebarActionButton onClick={sidebarTab === 'branches' ? () => loadOrgChildren(orgRoot) : loadUrlTree} disabled={treeLoading || urlLoading}>
          <RefreshCw size={14} /> {treeLoading || urlLoading ? "Loading..." : "Refresh"}
        </EmaSidebarActionButton>
      }
    >
      {sidebarTab === 'branches' && (
        <SidebarTreeNode
          node={sidebarOrgTree}
          selectedId={selectedScope.id}
          onSelect={handleSelectScopeNode}
          onLoadChildren={loadOrgChildren}
          onContextMenu={(node, pos) => setScopeMenu({ node, ...pos })}
          rootDisplayLabel="All Devices"
          defaultOpen
        />
      )}
      {sidebarTab === 'urls' && (
        <SidebarTreeNode
          node={sidebarDomainTree}
          selectedId={sidebarSelectedUrlId}
          onSelect={handleSelectUrlNode}
          rootDisplayLabel="All Domains"
          defaultOpen
        />
      )}
    </EmaSidebarPanel>
  );

  return (
    <>
      <EmaToastViewport items={toastItems} onClose={(id) => { if (id === "msg") setToast(""); if (id === "err") setError(""); }} />

      <EmaPageLayout title={usagePanelUrl ? 'Metering Results' : 'Internet Metering'} subtitle={`Scope: ${selectedScopeLabel} · Domain: ${selectedUrlLabel}`} sidebar={sidebar}>
        <div className="space-y-3 relative">
          <EmaSection eyebrow="URL MANAGEMENT" title="Internet Control Overview" description="Monitor metrics based on current scope and filters.">
            <EmaKpiGrid>
              <EmaKpiCard title="Records" value={formatNumber(stats.totalRecords || totalRecords || filteredRows.length)} note="Usage rows" icon={<Database size={16} />} active={!loading} />
              <EmaKpiCard title="Domains" value={formatNumber(stats.totalDomains || visibleUrlRows.length)} note="Monitored rules" icon={<Globe2 size={16} />} tone="violet" />
              <EmaKpiCard title="Usage Time" value={formatDuration(stats.totalUsageSeconds)} note="Total duration" icon={<Timer size={16} />} tone="emerald" />
              <EmaKpiCard title="Access Count" value={formatNumber(stats.totalCounts)} note="Total hits" icon={<MousePointerClick size={16} />} tone="amber" />
            </EmaKpiGrid>
          </EmaSection>

          <EmaToolbar
            left={
              <>
                <EmaButton variant="primary" onClick={() => setShowAddUrlModal(true)}><Plus size={15} /> Add URL</EmaButton>
                <EmaButton variant="secondary" onClick={collectResult} disabled={collecting || meteringBusy}><Activity size={15} /> {collecting ? 'Collecting...' : 'Collect'}</EmaButton>
              </>
            }
            search={<EmaSearchInput value={query} onChange={setQuery} placeholder="Search domain, device, user..." />}
            right={
              <>
                <EmaButton variant="secondary" onClick={usagePanelUrl ? () => loadMetering({ force: true }) : loadUrlTree} disabled={usagePanelUrl ? loading : urlLoading}>
                  <RefreshCw size={15} />
                </EmaButton>
                <EmaButton variant="primary" onClick={exportCsv} disabled={filteredRows.length === 0}><Download size={15} /> Export</EmaButton>
              </>
            }
            filters={
              <>
                <EmaFilterField label="Start Date">
                  <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-700 outline-none" />
                </EmaFilterField>
                <EmaFilterField label="End Date">
                  <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-700 outline-none" />
                </EmaFilterField>
                {usagePanelUrl ? (
                  <EmaFilterField label="Limit">
                    <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-700 outline-none">
                      <option value="50">50 rows</option><option value="100">100 rows</option><option value="250">250 rows</option>
                    </select>
                  </EmaFilterField>
                ) : (
                  <EmaFilterField label="Rule Filter">
                    <select value={restrictFilter} onChange={(e) => { setRestrictFilter(Number(e.target.value)); setUrlPage(1); }} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-700 outline-none">
                      <option value="-1">All rules</option><option value="0">Managed</option><option value="1">Restricted</option>
                    </select>
                  </EmaFilterField>
                )}
              </>
            }
          />

          {usagePanelUrl ? (
            <EmaTableShell title="Metering Results" subtitle={`${selectedScopeLabel} · ${usagePanelUrl.label}`}>
              {loading ? (
                <div className="flex justify-center py-10"><RefreshCw className="animate-spin text-slate-400" /></div>
              ) : (
                <EmaTable columns={usageColumns} rows={filteredRows.slice((page - 1) * limit, page * limit)} getRowKey={(row) => `${row.id}-${row.domainName}`} emptyText="No metering records found. Use Start Metering or Collect Result." />
              )}
              <EmaPagination page={page} totalPages={resultsTotalPages} totalLabel={`Page ${page} of ${resultsTotalPages}`} onPageChange={setPage} />
            </EmaTableShell>
          ) : (
            <EmaTableShell title="URL List" subtitle={`${urlTotalRecords > 0 ? formatNumber(urlTotalRecords) : formatNumber(visibleUrlRows.length)} rules available`}>
               {urlLoading ? (
                <div className="flex justify-center py-10"><RefreshCw className="animate-spin text-slate-400" /></div>
              ) : (
                <EmaTable columns={urlColumns} rows={pagedUrlRows} getRowKey={(node) => node.id} emptyText="No URL rule found." onRowClick={(node) => { handleSelectUrlNode(node); openResultsLog(node); }} />
              )}
              <EmaPagination page={urlPage} totalPages={urlTotalPages} totalLabel={`Page ${urlPage} of ${urlTotalPages}`} onPageChange={setUrlPage} />
            </EmaTableShell>
          )}

          {/* Absolute floating menus mapping back old logic */}
          {actionMenuId && (
            <div className="fixed inset-0 z-50" onClick={() => setActionMenuId(null)}>
              <div className="absolute rounded-xl bg-white p-2 shadow-xl border border-slate-200 w-56 flex flex-col gap-1" style={{ left: actionMenuId.x, top: actionMenuId.y }} onClick={(e) => e.stopPropagation()}>
                <strong className="px-2 pt-1 pb-2 text-sm text-slate-800 border-b mb-1">URL Actions</strong>
                <EmaButton variant="ghost" onClick={() => { openResultsLog(actionMenuId.node); setActionMenuId(null); }}>View Results</EmaButton>
                {actionMenuId.node.restrict === 1 ? (
                  <EmaButton variant="ghost" onClick={() => { setPendingUrlAction({ action: 'manage', node: actionMenuId.node }); setActionMenuId(null); }}>Set as Managed</EmaButton>
                ) : (
                  <EmaButton variant="ghost" onClick={() => { setPendingUrlAction({ action: 'restrict', node: actionMenuId.node }); setActionMenuId(null); }} className="text-red-600 hover:text-red-700">Set as Restricted</EmaButton>
                )}
                <EmaButton variant="ghost" onClick={() => { setPendingUrlAction({ action: 'remove', node: actionMenuId.node }); setActionMenuId(null); }} className="text-red-600 hover:text-red-700">Remove</EmaButton>
              </div>
            </div>
          )}

          {scopeMenu && (
            <div className="fixed inset-0 z-50" onClick={() => setScopeMenu(null)}>
              <div className="absolute rounded-xl bg-white p-2 shadow-xl border border-slate-200 w-64 flex flex-col gap-1" style={{ left: scopeMenu.x, top: scopeMenu.y }} onClick={(e) => e.stopPropagation()}>
                <strong className="px-2 pt-1 text-sm text-slate-800">{scopeMenu.node.label}</strong>
                <span className="px-2 pb-2 text-xs text-slate-500 border-b mb-1">{getScopeTypeLabel(scopeMenu.node)}</span>
                <EmaButton variant="primary" onClick={() => { setPendingMeteringAction({ action: 'start', node: scopeMenu.node }); setScopeMenu(null); }} disabled={isScopeRunning(scopeMenu.node)}>Start Metering</EmaButton>
                <EmaButton variant="secondary" onClick={() => { setPendingMeteringAction({ action: 'collect', node: scopeMenu.node }); setScopeMenu(null); }}>Collect Result</EmaButton>
                <EmaButton variant="ghost" onClick={() => { setPendingMeteringAction({ action: 'stop', node: scopeMenu.node }); setScopeMenu(null); }} disabled={!isScopeRunning(scopeMenu.node)} className="text-red-600">Stop Metering</EmaButton>
              </div>
            </div>
          )}
        </div>
      </EmaPageLayout>

      {/* --- MODALS --- */}
      <EmaModal
        open={showAddUrlModal}
        title="Add URL Rule"
        description="Create a new URL or domain rule for internet metering."
        onClose={() => setShowAddUrlModal(false)}
        footer={
          <>
            <EmaButton variant="secondary" onClick={() => setShowAddUrlModal(false)}>Cancel</EmaButton>
            <EmaButton variant="primary" onClick={saveUrl} disabled={!newUrl.trim() || urlLoading}><Plus size={15} /> Add URL</EmaButton>
          </>
        }
      >
        <div className="grid gap-3">
          <EmaFilterField label="Rule Type">
            <select value={urlEntryType} onChange={(e) => setUrlEntryType(Number(e.target.value) as 0 | 1)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-700 outline-none">
              <option value={0}>Managed</option><option value={1}>Restricted</option>
            </select>
          </EmaFilterField>
          <EmaFilterField label="New URL / Domain">
            <input autoFocus value={newUrl} onChange={(e) => setNewUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveUrl(); }} placeholder="example.com" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-700 outline-none" />
          </EmaFilterField>
        </div>
      </EmaModal>

      <EmaModal
        open={Boolean(pendingMeteringAction)}
        title="Confirm Action"
        description={`Are you sure you want to ${pendingMeteringAction?.action} metering for ${pendingMeteringAction?.node.label}?`}
        onClose={() => setPendingMeteringAction(null)}
        footer={
          <>
            <EmaButton variant="secondary" onClick={() => setPendingMeteringAction(null)} disabled={meteringBusy}>Cancel</EmaButton>
            <EmaButton variant="primary" onClick={confirmMeteringAction} disabled={meteringBusy}>{meteringBusy ? 'Processing...' : 'Confirm'}</EmaButton>
          </>
        }
      ><div /></EmaModal>

      <EmaModal
        open={Boolean(pendingUrlAction)}
        title="Confirm URL Action"
        description={`Apply action to ${pendingUrlAction?.node.url}?`}
        onClose={() => setPendingUrlAction(null)}
        footer={
          <>
            <EmaButton variant="secondary" onClick={() => setPendingUrlAction(null)} disabled={urlLoading}>Cancel</EmaButton>
            <EmaButton variant="primary" onClick={applyUrlAction} disabled={urlLoading}>Confirm</EmaButton>
          </>
        }
      ><div /></EmaModal>

      <EmaModal
        open={Boolean(detailRow)}
        title="Internet Usage Detail"
        description={detailRow?.domainName || ''}
        onClose={() => setDetailRow(null)}
        footer={<EmaButton variant="secondary" onClick={() => setDetailRow(null)}>Close</EmaButton>}
      >
        <div className="grid gap-2 text-sm text-slate-700">
          <p><strong>URL Main ID:</strong> {detailRow?.urlMainIdn}</p>
          <p><strong>Device/User:</strong> {detailRow?.device}</p>
          <p><strong>Used Time:</strong> {detailRow && formatDuration(detailRow.usedTime)}</p>
          <p><strong>Access Count:</strong> {detailRow && formatNumber(detailRow.counts)}</p>
          <p><strong>Meter Date:</strong> {detailRow?.date}</p>
          <div className="mt-4 p-3 bg-slate-50 rounded border text-xs overflow-auto">
            <pre>{JSON.stringify(detailRow?.raw ?? detailRow, null, 2)}</pre>
          </div>
        </div>
      </EmaModal>
    </>
  );
}