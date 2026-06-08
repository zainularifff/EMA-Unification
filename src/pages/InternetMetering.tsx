import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Eye,
  FileText,
  Folder,
  FolderOpen,
  Globe,
  Laptop,
  Loader2,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Send,
  Wifi,
  X,
} from 'lucide-react';
import clsx from 'clsx';

type NodeKind = 'all' | 'folder' | 'device' | 'url-folder' | 'url';

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

const WEB_METERING_JOB_TYPE = 10300;
const WEB_METERING_START_COMMAND = 1404;
const WEB_METERING_COLLECT_COMMAND = 1407;
const WEB_METERING_STOP_COMMAND = 1409;
const CREATE_METHOD = ['P', 'O', 'S', 'T'].join('');
const REMOVE_METHOD = ['D', 'E', 'L', 'E', 'T', 'E'].join('');

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
      const parsed = Number.parseInt(String(value), 10);
      return Number.isNaN(parsed) ? fallback : parsed;
    }
  }
  const rowKeys = Object.keys(row || {});
  for (const wanted of keys) {
    const match = rowKeys.find((key) => key.toLowerCase() === wanted.toLowerCase());
    const value = match ? row[match] : undefined;
    if (value !== undefined && value !== null && value !== '') {
      const parsed = Number.parseInt(String(value), 10);
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
const formatRowNumber = (value: number) => String(Math.max(Number(value) || 0, 0)).padStart(2, '0');
const URL_RULE_PAGE_SIZE = 10;

const INTERNET_METERING_CACHE_TTL = 5 * 60 * 1000;

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

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  localStorage.getItem('apiBaseUrl') ||
  'http://localhost:3001'
).replace(/\/+$/, '');

function buildApiUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
  return `${API_BASE_URL}${normalizedUrl}`;
}

function getAuthHeaders(): Record<string, string> {
  const token =
    localStorage.getItem('token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('jwt');

  return token ? { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` } : {};
}

async function apiRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  const finalUrl = buildApiUrl(url);
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...getAuthHeaders(),
    ...(init.headers as Record<string, string> | undefined),
  };

  const response = await fetch(finalUrl, { ...init, headers, credentials: 'include' });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok || (payload && typeof payload === 'object' && payload.success === false)) {
    const message =
      typeof payload === 'object'
        ? payload.message || payload.error || payload.errorMessage
        : payload;

    throw new Error(`${finalUrl} - ${message || `Request failed: ${response.status}`}`);
  }

  return payload as T;
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
  const explicitCount = numberFrom(row, [
    'TotalDevices',
    'DeviceCount',
    'deviceCount',
    'AssetCount',
    'assetCount',
    'TotalAssets',
    'totalAssets',
    'count',
    'Count',
    'Total',
  ], 0);

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

async function preloadDepartmentNode(row: any, index: number, visited = new Set<number>()): Promise<TreeNodeType> {
  const baseNode = mapDepartment(row, index);

  if (!baseNode.objectRelIdn || visited.has(baseNode.objectRelIdn)) {
    return { ...baseNode, childrenLoaded: true };
  }

  const nextVisited = new Set(visited);
  nextVisited.add(baseNode.objectRelIdn);

  let departmentRows = extractArray<any>(row?.children);
  let assetRows: any[] = [];

  try {
    const folderPayload = await apiRequest<unknown>(`/api/departments/${baseNode.objectRelIdn}`);
    const endpointDepartments = extractDepartmentRows(folderPayload);
    const endpointAssets = extractAssetRows(folderPayload);

    if (endpointDepartments.length > 0) departmentRows = endpointDepartments;
    if (endpointAssets.length > 0) assetRows = endpointAssets;
  } catch {
    // Keep using recursive children from /api/departments if the per-folder endpoint is unavailable.
  }

  if (assetRows.length === 0) {
    try {
      const assetPayload = await apiRequest<unknown>(`/api/assets/${baseNode.objectRelIdn}`);
      assetRows = extractAssetRows(assetPayload);
    } catch {
      assetRows = [];
    }
  }

  const departments = await Promise.all(
    departmentRows.map((childRow, childIndex) => preloadDepartmentNode(childRow, childIndex, nextVisited))
  );
  const assets = assetRows.map(mapAsset);

  return {
    ...baseNode,
    children: [...departments, ...assets],
    childrenLoaded: true,
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

type CompactPaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  label: string;
  className?: string;
};

function CompactPagination({ currentPage, totalPages, onPageChange, label, className }: CompactPaginationProps) {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safeCurrentPage = Math.min(Math.max(1, currentPage || 1), safeTotalPages);

  const goToPage = (nextPage: number) => {
    const boundedPage = Math.min(Math.max(1, nextPage), safeTotalPages);
    if (boundedPage === safeCurrentPage) return;
    onPageChange(boundedPage);
  };

  return (
    <div className={clsx('uam-pagination global-style im-compact-pagination', className)}>
      <div className="uam-page-summary im-page-summary">
        <span>Page {formatNumber(safeCurrentPage)} of {formatNumber(safeTotalPages)}</span>
      </div>

      <div className="uam-pagination-controls global-style im-icon-pager-nav" aria-label={label}>
        <button type="button" onClick={() => goToPage(1)} disabled={safeCurrentPage <= 1} aria-label="First page">
          <ChevronsLeft className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => goToPage(safeCurrentPage - 1)} disabled={safeCurrentPage <= 1} aria-label="Previous page">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <b>{formatNumber(safeCurrentPage)}</b>
        <button type="button" onClick={() => goToPage(safeCurrentPage + 1)} disabled={safeCurrentPage >= safeTotalPages} aria-label="Next page">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => goToPage(safeTotalPages)} disabled={safeCurrentPage >= safeTotalPages} aria-label="Last page">
          <ChevronsRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}


type ImSelectOption = {
  value: string;
  label: string;
};

function ImCustomSelect({
  value,
  options,
  onChange,
  className,
  icon,
  ariaLabel,
}: {
  value: string;
  options: ImSelectOption[];
  onChange: (value: string) => void;
  className?: string;
  icon?: ReactNode;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={clsx('im-select-custom', className, open && 'is-open')}>
      <button
        type="button"
        className="im-select-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {icon && <span className="im-select-leading">{icon}</span>}
        <span className="im-select-value">{selected?.label || '-'}</span>
        <ChevronDown className="im-select-arrow" />
      </button>
      {open && (
        <div className="im-select-menu" role="listbox">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={clsx('im-select-option', option.value === value && 'is-selected')}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <span>{option.label}</span>
              {option.value === value && <i>✓</i>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TreeNode({
  node,
  selectedId,
  onSelect,
  onLoadChildren,
  onOpenNodeMenu,
  level = 0,
  defaultOpen = false,
  showCounts = false,
  showActions = false,
  rootDisplayLabel,
}: {
  node: TreeNodeType;
  selectedId: string;
  onSelect: (node: TreeNodeType) => void;
  onLoadChildren?: (node: TreeNodeType) => Promise<void>;
  onOpenNodeMenu?: (node: TreeNodeType, position: { x: number; y: number }) => void;
  level?: number;
  defaultOpen?: boolean;
  showCounts?: boolean;
  showActions?: boolean;
  rootDisplayLabel?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const canExpand = node.type === 'all' || node.type === 'folder' || node.type === 'url-folder' || Boolean(node.children?.length);
  const isRootNode = node.type === 'all' || node.id === 'url-sidebar-root';
  const selected = selectedId === node.id && !isRootNode;
  const displayLabel = rootDisplayLabel && level === 0 ? rootDisplayLabel : node.label;
  const Icon = node.type === 'device' ? Laptop : node.type === 'url' ? Globe : open ? FolderOpen : Folder;
  const count = treeDisplayCount(node);
  const showCount = showCounts && node.type !== 'url-folder' && node.type !== 'url' && count > 0;
  const showNodeActions = showActions && Boolean(onOpenNodeMenu) && (node.type === 'all' || node.type === 'folder' || node.type === 'device');

  const toggleOpen = async (event: MouseEvent) => {
    event.stopPropagation();
    if (!canExpand) return;
    if (!node.childrenLoaded && onLoadChildren) await onLoadChildren(node);
    setOpen((value) => !value);
  };

  return (
    <div className="ema-sidebar-tree-branch">
      <button
        type="button"
        onClick={() => onSelect(node)}
        onContextMenu={(event) => {
          if (!showNodeActions || !onOpenNodeMenu) return;
          event.preventDefault();
          onOpenNodeMenu(node, { x: event.clientX, y: event.clientY });
        }}
        className={clsx('ema-sidebar-tree-node', selected && 'is-selected')}
        style={{ paddingLeft: 12 + level * 16 }}
      >
        <span className="ema-sidebar-tree-toggle" onClick={toggleOpen}>
          {canExpand ? (open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />) : <span className="ema-sidebar-tree-toggle" />}
        </span>
        <span className="ema-sidebar-tree-icon"><Icon className="h-3.5 w-3.5" /></span>
        <span className="ema-sidebar-tree-label">{displayLabel}</span>
        <span className="ema-sidebar-tree-count">{showCount ? count : ''}</span>
        <span
          className="ema-sidebar-tree-menu-btn"
          role={showNodeActions ? 'button' : undefined}
          tabIndex={showNodeActions ? 0 : undefined}
          aria-label={showNodeActions ? `Open actions for ${node.label}` : undefined}
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
            if (showNodeActions && onOpenNodeMenu) {
              const rect = event.currentTarget.getBoundingClientRect();
              onOpenNodeMenu(node, { x: Math.min(rect.right + 8, window.innerWidth - 250), y: rect.top });
            }
          }}
          onKeyDown={(event) => {
            if (!showNodeActions || !onOpenNodeMenu) return;
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.stopPropagation();
              const rect = event.currentTarget.getBoundingClientRect();
              onOpenNodeMenu(node, { x: rect.left, y: rect.bottom });
            }
          }}
        >
          {showNodeActions ? <MoreVertical className="h-3.5 w-3.5" /> : null}
        </span>
      </button>
      {open && Boolean(node.children?.length) && (
        <div className="ema-sidebar-tree-children">
          {node.children?.map((child) => (
            <TreeNode key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} onLoadChildren={onLoadChildren} onOpenNodeMenu={onOpenNodeMenu} level={level + 1} showCounts={showCounts} showActions={showActions} />
          ))}
        </div>
      )}
    </div>
  );
}

function DetailModal({ row, onClose }: { row: InternetUsageRow; onClose: () => void }) {
  const fields = [
    ['Domain', row.domainName],
    ['URL Main ID', row.urlMainIdn ? String(row.urlMainIdn) : '-'],
    ['Device / User', row.device],
    ['Used Time', formatDuration(row.usedTime)],
    ['Access Count', formatNumber(row.counts)],
    ['Meter Date', row.date || '-'],
  ];

  return (
    <div className="user-modal-backdrop open">
      <div className="user-modal advanced">
        <div className="user-modal-head">
          <div>
            <h2 className="text-lg font-black text-slate-900">Internet Usage Detail</h2>
            <p className="text-xs font-bold text-slate-500">{row.domainName}</p>
          </div>
          <button type="button" onClick={onClose} className="modal-close"><X className="h-5 w-5" /></button>
        </div>
        <div className="form-grid">
          {fields.map(([label, value]) => (
            <div key={label} className="settings-helper-card">
              <div className="form-field-label">{label}</div>
              <div className="user-pill">{value}</div>
            </div>
          ))}
        </div>
        <div className="settings-helper-card wide">
          <div className="form-field-label">Full Record</div>
          <pre className="setting-textarea">{JSON.stringify(row.raw ?? row, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}


export default function InternetMetering() {
  useEffect(() => {
    document.documentElement.classList.add('ema-settings-page-active', 'ema-layout-lock');
    document.body.classList.add('ema-settings-page-active', 'ema-layout-lock');
    return () => {
      document.documentElement.classList.remove('ema-settings-page-active', 'ema-layout-lock');
      document.body.classList.remove('ema-settings-page-active', 'ema-layout-lock');
    };
  }, []);
  const [orgRoot, setOrgRoot] = useState<TreeNodeType>({ id: 'all-devices', label: 'All Devices', type: 'all', children: [], childrenLoaded: false });
  const [selectedScope, setSelectedScope] = useState<TreeNodeType>({ id: 'all-devices', label: 'All Devices', type: 'all', children: [], childrenLoaded: false });
  const [urlRoot, setUrlRoot] = useState<TreeNodeType>({ id: 'url-root', label: 'Domain Rules', type: 'url-folder', children: [], childrenLoaded: true });
  const [selectedUrl, setSelectedUrl] = useState<TreeNodeType>({ id: 'url-root', label: 'All domains', type: 'url-folder', childrenLoaded: true });

  const [sidebarTab, setSidebarTab] = useState<'organization' | 'statistic' | 'filters'>('organization');
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
        const payload = await apiRequest<unknown>('/api/departments');
        const departmentRows = extractDepartmentRows(payload);
        departments = departmentRows.map((row, index) => mapDepartment(row, index));
      } else if (node.type === 'folder' && node.objectRelIdn) {
        const folderPayload = await apiRequest<unknown>(`/api/departments/${node.objectRelIdn}`).catch(() => ({ data: { departments: [], assets: [] } }));
        const departmentRows = extractDepartmentRows(folderPayload);
        let assetRows = extractAssetRows(folderPayload);

        if (assetRows.length === 0) {
          const assetPayload = await apiRequest<unknown>(`/api/assets/${node.objectRelIdn}`).catch(() => ({ data: [] }));
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
      const assetPayload = await apiRequest<unknown>('/api/assets');
      const assetRows = extractAssetRows(assetPayload);
      const nextCount = assetRows.length;
      if (nextCount > 0) {
        writeInternetMeteringCache(cacheKey, nextCount);
        setOrgRoot((current) => ({ ...current, count: nextCount }));
        setSelectedScope((current) => (current.id === 'all-devices' ? { ...current, count: nextCount } : current));
      }
    } catch {
      // Count is only decorative; do not block the module if this lookup is slow/unavailable.
    }
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

      const params = new URLSearchParams({
        restrictID: String(activeRestrict),
        page: String(urlPage),
        limit: String(URL_RULE_PAGE_SIZE),
      });

      const payload = await apiRequest<ApiResponse<unknown[]>>(`/api/internet-metering/urls/tree?${params.toString()}`);
      if (requestId !== urlLoadSeq.current) return;

      const children = extractArray<any>(payload).map((row, index) => mapUrlNode(row, index, activeRestrict));
      const nextUrlTotalRecords = numberFrom(payload as any, ['totalRecords', 'TotalRecords', 'total', 'count'], 0) || numberFrom((payload as any)?.data, ['totalRecords', 'TotalRecords', 'total', 'count'], 0);
      const rootLabel = activeRestrict === -1 ? 'All Domains' : activeRestrict === 1 ? 'Restricted' : 'Managed';
      const nextRoot: TreeNodeType = {
        id: 'url-root',
        label: rootLabel,
        type: 'url-folder',
        restrict: activeRestrict,
        children,
        childrenLoaded: true,
      };

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
    const params = new URLSearchParams({
      startDate: fromDate,
      endDate: toDate,
      page: String(page),
      limit: String(limit),
    });

    if (selectedScope.type === 'device' && selectedScope.objectRootIdn) {
      params.set('clientID', String(selectedScope.objectRootIdn));
    } else if (selectedScope.type === 'folder' && selectedScope.objectRelIdn) {
      params.set('relationID', String(selectedScope.objectRelIdn));
    } else {
      params.set('relationID', '-1');
    }

    const usageUrl = activeUsageUrl;
    if (usageUrl.type === 'url' && usageUrl.urlMainIdn) params.set('urlID', String(usageUrl.urlMainIdn));
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
      const usagePayload = await apiRequest<ApiResponse<unknown[]>>(`/api/internet-metering/usage?${params.toString()}`);
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

      apiRequest<ApiResponse<InternetStats>>(`/api/internet-metering/stats?${params.toString()}`)
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
        .catch(() => {
          // The usage table is already usable; keep derived KPI stats if the heavier stats query is slow/unavailable.
        });
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
    const timer = window.setTimeout(() => {
      loadRootDeviceCount();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [loadRootDeviceCount]);

  useEffect(() => {
    void loadOrgChildren({ id: 'all-devices', label: 'All Devices', type: 'all', children: [], childrenLoaded: false });
  }, [loadOrgChildren]);

  useEffect(() => {
    loadUrlTree();
  }, [loadUrlTree]);


  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!usagePanelUrl) return;
    loadMetering();
  }, [usagePanelUrl, loadMetering]);

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return usageRows;
    return usageRows.filter((row) => [row.domainName, row.device, row.date, String(row.urlMainIdn)].some((value) => value.toLowerCase().includes(search)));
  }, [query, usageRows]);

  const selectedScopeLabel = selectedScope.type === 'device'
    ? `Device · ${selectedScope.label}`
    : selectedScope.type === 'folder'
      ? `Folder · ${selectedScope.label}`
      : 'All Devices';

  const selectedUrlLabel = selectedUrl.type === 'url' ? selectedUrl.label : restrictFilter === -1 ? 'All Domains' : restrictFilter === 0 ? 'Managed' : 'Restricted';

  const handleSelectScopeNode = useCallback((node: TreeNodeType) => {
    setSelectedScope(node);
    setPage(1);

    // Sidebar selection should feel like a filter, not just a silent highlight.
    // Open the result panel on first click and reload it when the selected scope changes.
    setUsagePanelUrl((current) => current || makeResultTarget(selectedUrl, restrictFilter, selectedUrlLabel));
  }, [restrictFilter, selectedUrl, selectedUrlLabel]);

  const selectedScopeKey = useMemo(() => getScopeStorageKey(selectedScope), [selectedScope]);
  const selectedScopeRunning = Boolean(activeMeteringScopes[selectedScopeKey]);

  const isScopeRunning = useCallback((node: TreeNodeType) => Boolean(activeMeteringScopes[getScopeStorageKey(node)]), [activeMeteringScopes]);

  const setScopeRunning = useCallback((node: TreeNodeType, running: boolean) => {
    const key = getScopeStorageKey(node);
    setActiveMeteringScopes((current) => {
      const next = { ...current };
      if (running) next[key] = true;
      else delete next[key];
      localStorage.setItem('internetMeteringActiveScopes', JSON.stringify(next));
      return next;
    });
  }, []);

  const sidebarUrlRoot = useMemo<TreeNodeType>(() => ({
    id: 'url-sidebar-root',
    label: 'All Domains',
    type: 'url-folder',
    restrict: -1,
    childrenLoaded: true,
    children: [
      { id: 'url-sidebar-managed', label: 'Managed', type: 'url-folder', restrict: 0, childrenLoaded: true, children: [] },
      { id: 'url-sidebar-restricted', label: 'Restricted', type: 'url-folder', restrict: 1, childrenLoaded: true, children: [] },
    ],
  }), []);

  const sidebarSelectedUrlId = restrictFilter === 0 ? 'url-sidebar-managed' : restrictFilter === 1 ? 'url-sidebar-restricted' : 'url-sidebar-root';

  const sidebarOrgTree = useMemo(() => filterTreeNode(orgRoot, sidebarSearch) || { ...orgRoot, children: [] }, [orgRoot, sidebarSearch]);
  const sidebarDomainTree = useMemo(() => filterTreeNode(sidebarUrlRoot, sidebarSearch) || { ...sidebarUrlRoot, children: [] }, [sidebarUrlRoot, sidebarSearch]);
  const sidebarStats = useMemo(() => [
    { id: 'stat-total-records', label: 'Total Records', value: stats.totalRecords },
    { id: 'stat-total-domains', label: 'Total Domains', value: stats.totalDomains },
    { id: 'stat-total-usage', label: 'Usage Time', value: formatDuration(stats.totalUsageSeconds) },
    { id: 'stat-access-count', label: 'Access Count', value: stats.totalCounts },
  ], [stats]);

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

  useEffect(() => {
    if (urlPage > urlTotalPages) setUrlPage(urlTotalPages);
  }, [urlPage, urlTotalPages]);

  useEffect(() => {
    setUrlPage(1);
  }, [restrictFilter]);

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

  const buildMeteringPayload = (node: TreeNodeType, commandID: number, description: string) => {
    const payload: Record<string, unknown> = {
      Job_Type: WEB_METERING_JOB_TYPE,
      Job_Command: commandID,
      commandID,
      Job_Description: description,
    };

    if (node.type === 'device') {
      payload.scanMode = 'device';
      payload.Object_Root_Idn = node.objectRootIdn;
      payload.Object_DeviceID = node.objectDeviceID;
    } else if (node.type === 'folder') {
      payload.scanMode = 'folder';
      payload.Object_Rel_Idn = node.objectRelIdn;
    } else {
      payload.scanMode = 'all';
    }

    return payload;
  };

  const runMeteringAction = async (action: MeteringAction, node: TreeNodeType) => {
    const commandID = action === 'start' ? WEB_METERING_START_COMMAND : action === 'stop' ? WEB_METERING_STOP_COMMAND : WEB_METERING_COLLECT_COMMAND;
    const endpoint = action === 'start' ? '/api/internet-metering/start' : action === 'stop' ? '/api/internet-metering/stop' : '/api/internet-metering/collect';
    const label = action === 'start' ? 'Metering started' : action === 'stop' ? 'Metering stopped' : 'Collection sent';

    const result = await apiRequest<ApiResponse<any>>(endpoint, {
      method: CREATE_METHOD,
      body: JSON.stringify(buildMeteringPayload(node, commandID, `${label} - ${getScopeTypeLabel(node)}`)),
    });

    if (action === 'start') setScopeRunning(node, true);
    if (action === 'stop') setScopeRunning(node, false);

    const jobId = result.data?.Job_Idn ? `Job #${result.data.Job_Idn}` : label;
    const targetCount = result.data?.targetCount !== undefined ? ` · ${result.data.targetCount} targets` : '';
    setToast(`${jobId}${targetCount}`);
  };

  const confirmMeteringAction = async () => {
    if (!pendingMeteringAction) return;

    try {
      setMeteringBusy(true);
      setError('');
      await runMeteringAction(pendingMeteringAction.action, pendingMeteringAction.node);
      if (pendingMeteringAction.action === 'collect') {
        setSelectedScope(pendingMeteringAction.node);
        setPage(1);
        setUsagePanelUrl((current) => current || makeResultTarget(selectedUrl, restrictFilter, selectedUrlLabel));
      }
      setPendingMeteringAction(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setMeteringBusy(false);
    }
  };

  const collectResult = async () => {
    try {
      setCollecting(true);
      setError('');
      await runMeteringAction('collect', selectedScope);
      if (!usagePanelUrl) {
        setUsagePanelUrl(makeResultTarget(selectedUrl, restrictFilter, selectedUrlLabel));
      } else {
        await loadMetering({ force: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCollecting(false);
    }
  };

  const saveUrl = async () => {
    const cleanUrl = newUrl.trim();
    if (!cleanUrl) return;

    try {
      setUrlLoading(true);
      await apiRequest('/api/internet-metering/urls', {
        method: CREATE_METHOD,
        body: JSON.stringify({ urlMain: cleanUrl, restrictID: urlEntryType }),
      });
      setNewUrl('');
      setToast(`${urlEntryType === 1 ? 'Restricted' : 'Managed'}: ${cleanUrl}`);
      await loadUrlTree();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUrlLoading(false);
    }
  };

  const applyUrlAction = async () => {
    if (!pendingUrlAction?.node.url) return;

    const { action, node } = pendingUrlAction;
    const targetUrl = node.url;

    try {
      setUrlLoading(true);
      setPendingUrlAction(null);
      setActionMenuId(null);

      if (action === 'remove') {
        await apiRequest('/api/internet-metering/urls', {
          method: REMOVE_METHOD,
          body: JSON.stringify({ urlMain: targetUrl }),
        });
        setToast(`Removed: ${targetUrl}`);
      } else {
        const restrictID = action === 'restrict' ? 1 : 0;
        await apiRequest('/api/internet-metering/urls', {
          method: CREATE_METHOD,
          body: JSON.stringify({ urlMain: targetUrl, restrictID }),
        });
        setToast(`${restrictID === 1 ? 'Restricted' : 'Managed'}: ${targetUrl}`);
      }

      setSelectedUrl({ id: 'url-root', label: 'All domains', type: 'url-folder', childrenLoaded: true });
      await loadUrlTree();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUrlLoading(false);
    }
  };

  const openResultsLog = (node = makeResultTarget(selectedUrl, restrictFilter, selectedUrlLabel)) => {
    if (node.type === 'url') setSelectedUrl(node);

    const isSameTarget = usagePanelUrl && getUsageTargetKey(usagePanelUrl) === getUsageTargetKey(node);
    if (!isSameTarget) {
      setUsageRows([]);
      setTotalRecords(0);
      setStats({ totalRecords: 0, totalDomains: 0, totalUsageSeconds: 0, totalCounts: 0 });
      setPage(1);
      setUsagePanelUrl(node);
    }

    setActionMenuId(null);
  };

  const exportCsv = () => {
    const headers = ['Domain', 'URL Main ID', 'Device/User', 'Used Time Seconds', 'Used Time', 'Access Count', 'Meter Date'];
    const csv = [
      headers.join(','),
      ...filteredRows.map((row) => [row.domainName, row.urlMainIdn, row.device, row.usedTime, formatDuration(row.usedTime), row.counts, row.date].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `internet-metering-${todayIso()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="settings-module-root ema-settings-pro ema-module-root" data-section="internet-metering">
      {toast && (
        <div className="settings-toast settings-toast-success">
          <i>✓</i>
          <div>
            <strong>Success</strong>
            <span>{toast}</span>
          </div>
          <button type="button" onClick={() => setToast('')} aria-label="Dismiss toast"><X className="h-4 w-4" /></button>
        </div>
      )}
      <div className="settings-layout">
        <aside className="settings-menu ema-panel-surface">
          <div className="panel-head">
            <span>INTERNET METERING</span>
            <strong>Internet Metering</strong>
            <small>Web usage, device scope and URL controls.</small>
          </div>

          <nav className="settings-menu-list" aria-label="Internet metering navigation">
            <button type="button" className={clsx('setting-btn', sidebarTab === 'organization' && 'active')} onClick={() => setSidebarTab('organization')}>Scope</button>
            <button type="button" className={clsx('setting-btn', sidebarTab === 'statistic' && 'active')} onClick={() => setSidebarTab('statistic')}>Usage</button>
            <button type="button" className={clsx('setting-btn', sidebarTab === 'filters' && 'active')} onClick={() => setSidebarTab('filters')}>Rules</button>
          </nav>

          <div className="section-search ema-sidebar-field">
            <Search className="h-3.5 w-3.5" />
            <input
              value={sidebarSearch}
              onChange={(event) => setSidebarSearch(event.target.value)}
              placeholder={sidebarTab === 'filters' ? 'Search rules...' : sidebarTab === 'statistic' ? 'Search usage...' : 'Search device / scope...'}
            />
            {sidebarSearch && (
              <button type="button" onClick={() => setSidebarSearch('')} aria-label="Clear sidebar search">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="ema-sidebar-content"><div className="ema-sidebar-subpanel"><div className="ema-sidebar-tree">
            {sidebarTab === 'organization' && (
              <div className="settings-helper-card">
                <div className="ema-sidebar-section-title"><FolderOpen className="h-3.5 w-3.5" /> Device Scope {treeLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}</div>
                <TreeNode
                  node={sidebarOrgTree}
                  selectedId={selectedScope.id}
                  onSelect={handleSelectScopeNode}
                  onLoadChildren={loadOrgChildren}
                  onOpenNodeMenu={(node, position) => setScopeMenu({ node, ...position })}
                  rootDisplayLabel="All Devices"
                  defaultOpen
                />
                {sidebarSearch && !sidebarOrgTree.children?.length && sidebarOrgTree.id === orgRoot.id && (
                  <div className="settings-helper-card">No matching scope.</div>
                )}
              </div>
            )}

            {sidebarTab === 'statistic' && (
              <div className="settings-helper-card">
                <div className="ema-sidebar-section-title"><FileText className="h-3.5 w-3.5" /> Usage Summary</div>
                <div className="im-stat-list">
                  {sidebarStats.map((item) => (
                    <button type="button" key={item.id} className="setting-btn" onClick={() => openResultsLog()}>
                      <span>{item.label}</span>
                      <strong>{typeof item.value === 'number' ? formatNumber(item.value) : item.value}</strong>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sidebarTab === 'filters' && (
              <div className="settings-helper-card">
                <div className="ema-sidebar-section-title"><Globe className="h-3.5 w-3.5" /> URL Rules {urlLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}</div>
                <TreeNode node={sidebarDomainTree} selectedId={sidebarSelectedUrlId} onSelect={handleSelectUrlNode} rootDisplayLabel="All Domains" defaultOpen />
                {sidebarSearch && !sidebarDomainTree.children?.length && (
                  <div className="settings-helper-card">No matching domain filter.</div>
                )}
              </div>
            )}
          </div></div></div>
        </aside>

        <section className="settings-content">
          <section className="settings-hero ema-panel-surface">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400"><Globe className="h-3.5 w-3.5" /> {usagePanelUrl ? 'Usage Results' : 'URL Management'}</div>
                <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950">{usagePanelUrl ? 'Metering Results' : 'Internet Metering'}</h1>
                <p className="mt-1 text-xs font-semibold text-slate-500">Scope: <span className="text-slate-800">{selectedScopeLabel}</span> · Domain: <span className="text-slate-800">{selectedUrlLabel}</span></p>
              </div>

              <div className="settings-score users-hero-score">
                <div className="score-box"><span>Total Records</span><strong>{formatNumber(stats.totalRecords)}</strong><small>metering rows</small></div>
                <div className="score-box"><span>Domains</span><strong>{formatNumber(stats.totalDomains)}</strong><small>unique domains</small></div>
                <div className="score-box"><span>Used Time</span><strong>{formatDuration(stats.totalUsageSeconds)}</strong><small>browsing duration</small></div>
                <div className="score-box"><span>Access Count</span><strong>{formatNumber(stats.totalCounts)}</strong><small>total hits</small></div>
              </div>

              <div className="content-actions">
                <button type="button" onClick={() => setPendingMeteringAction({ action: 'start', node: selectedScope })} disabled={meteringBusy || selectedScopeRunning} className="primary-btn im-action-btn">
                  {meteringBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />} Start Metering
                </button>
                <button type="button" onClick={() => setPendingMeteringAction({ action: 'stop', node: selectedScope })} disabled={meteringBusy || !selectedScopeRunning} className="danger-btn im-action-btn">
                  {meteringBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Stop Metering
                </button>
                <button type="button" onClick={collectResult} disabled={collecting || meteringBusy} className="soft-btn im-action-btn">
                  {collecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Collect Result
                </button>
                <button type="button" onClick={() => usagePanelUrl ? setUsagePanelUrl(null) : openResultsLog()} className="soft-btn im-action-btn"><FileText className="h-4 w-4" /> {usagePanelUrl ? 'URL List' : 'Results'}</button>
                <button type="button" onClick={loadUrlTree} disabled={urlLoading} className="soft-btn im-action-btn"><RefreshCw className={clsx('h-4 w-4', urlLoading && 'animate-spin')} /> Refresh</button>
                <button type="button" onClick={exportCsv} disabled={filteredRows.length === 0} className="soft-btn im-action-btn"><Download className="h-4 w-4" /> Export</button>
              </div>
            </div>
          </section>

          <section className="content-shell ema-panel-surface content-panel clean">
          <section className="content-toolbar im-filter-bar">
            <div className="im-filter-layout">
              <label className="section-search im-search-field">
                <Search className="h-4 w-4" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search domain, device/user, Rule ID or date..." className="im-search-input" />
              </label>
              <div className="content-actions">
                <div className="section-search im-date-range"><CalendarDays className="h-4 w-4 text-slate-400" /><input type="date" value={fromDate} onChange={(event) => { setPage(1); setFromDate(event.target.value); }} className="text-xs font-bold outline-none" /><span className="text-slate-300">-</span><input type="date" value={toDate} onChange={(event) => { setPage(1); setToDate(event.target.value); }} className="text-xs font-bold outline-none" /></div>

              </div>
            </div>
          </section>

          <div className="content-body">
            {error && (
              <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                <div className="settings-inline-alert"><AlertCircle className="h-4 w-4" />{error}</div>
                <button type="button" onClick={() => setError('')}><X className="h-4 w-4" /></button>
              </div>
            )}

            {usagePanelUrl ? (
            <section className="content-panel clean im-results-inline-card">
              <div className="content-head">
                <div className="im-results-title">
                  <p>Internet Metering</p>
                  <h2>Metering Results</h2>
                  <span>{selectedScopeLabel} · {usagePanelUrl.label}</span>
                </div>
                <div className="content-actions">
                  <button type="button" onClick={() => loadMetering({ force: true })} disabled={loading} className="soft-btn im-action-btn"><RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} /> Refresh</button>
                  <button type="button" onClick={exportCsv} disabled={filteredRows.length === 0} className="soft-btn im-action-btn"><Download className="h-4 w-4" /> Export</button>
                  <button type="button" onClick={() => { setUsagePanelUrl(null); setUsageRows([]); }} className="soft-btn im-action-btn"><Globe className="h-4 w-4" /> URL List</button>
                </div>
              </div>

              <div className="content-toolbar im-results-filter">
                <div className="im-results-filter-layout">
                  <div className="section-search im-date-range"><CalendarDays className="h-4 w-4 text-slate-400" /><input type="date" value={fromDate} onChange={(event) => { setPage(1); setFromDate(event.target.value); }} /><span>-</span><input type="date" value={toDate} onChange={(event) => { setPage(1); setToDate(event.target.value); }} /></div>
                  <ImCustomSelect
                    value={String(limit)}
                    onChange={(value) => { setPage(1); setLimit(Number(value)); }}
                    options={[{ value: '50', label: '50 rows' }, { value: '100', label: '100 rows' }, { value: '250', label: '250 rows' }, { value: '500', label: '500 rows' }]}
                    className="im-limit-select"
                    ariaLabel="Rows per page"
                  />
                </div>
              </div>

              <div className="pricing-table-card table-responsive im-results-table-wrap">
                <table className="table table-hover align-middle mb-0">
                  <thead className="im-table-head">
                    <tr>
                      <th className="px-5 py-3 im-number-th">NO</th>
                      <th className="px-5 py-3">Domain</th>
                      <th className="px-5 py-3">Device / User</th>
                      <th className="px-5 py-3">Rule ID</th>
                      <th className="px-5 py-3">Used Time</th>
                      <th className="px-5 py-3">Access Count</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading && (
                      <tr><td colSpan={8} className="px-5 py-16 text-center text-sm font-bold text-slate-400"><Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />Loading</td></tr>
                    )}
                    {!loading && filteredRows.map((row, index) => (
                      <tr key={`${row.id}-${row.domainName}-${row.device}-${row.date}`} className="hover:bg-blue-50/40">
                        <td className="px-5 py-3 im-number-cell"><span className="row-index-pill im-row-number">{formatRowNumber((page - 1) * limit + index + 1)}</span></td>
                        <td className="px-5 py-3 font-black text-slate-900">{row.domainName}</td>
                        <td className="px-5 py-3 font-extrabold text-slate-800">{row.device || '-'}</td>
                        <td className="px-5 py-3 font-mono font-bold text-slate-500">{row.urlMainIdn || '-'}</td>
                        <td className="px-5 py-3 font-mono font-bold text-slate-700">{formatDuration(row.usedTime)}</td>
                        <td className="px-5 py-3 font-black text-slate-900">{formatNumber(row.counts)}</td>
                        <td className="px-5 py-3 font-bold text-slate-500">{row.date || '-'}</td>
                        <td className="px-5 py-3 text-right"><button type="button" onClick={() => setDetailRow(row)} className="mini-btn"><Eye className="h-3.5 w-3.5" /> Detail</button></td>
                      </tr>
                    ))}
                    {!loading && filteredRows.length === 0 && (
                      <tr>
                        <td colSpan={8}>
                          <div className="settings-helper-card">
                            <FileText className="h-7 w-7" />
                            <strong>No metering records found</strong>
                            <span>This table is now filtered by the selected sidebar scope. Use Start Metering or Collect Result, then Refresh after the job completes.</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <CompactPagination
                currentPage={page}
                totalPages={resultsTotalPages}
                onPageChange={setPage}
                label="Metering results pagination"
                className="im-results-pagination"
              />
            </section>
            ) : (
            <section className="content-panel clean">
              <div className="content-head">
                <h2>URL List</h2>
                <span>{urlTotalRecords > 0 ? `${formatNumber(urlTotalRecords)} rules` : `${formatNumber(visibleUrlRows.length)} loaded`}</span>
              </div>

              <div className="content-toolbar im-url-toolbar">
                <ImCustomSelect
                  value={String(urlEntryType)}
                  onChange={(value) => setUrlEntryType(Number(value) as 0 | 1)}
                  options={[{ value: '0', label: 'Managed' }, { value: '1', label: 'Restricted' }]}
                  className="im-url-type-select"
                  ariaLabel="URL rule type"
                />
                <input value={newUrl} onChange={(event) => setNewUrl(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') saveUrl(); }} placeholder="example.com" className="setting-input im-url-input" />
                <button type="button" onClick={saveUrl} disabled={urlLoading || !newUrl.trim()} className="primary-btn im-add-url-btn"><Plus className="h-4 w-4" /> Add</button>
              </div>

              <div className="pricing-table-card table-responsive im-url-table-wrap">
                <table className="table table-hover align-middle mb-0">
                  <thead className="im-table-head">
                    <tr>
                      <th className="px-5 py-3 im-number-th">NO</th>
                      <th className="px-5 py-3">URL / Domain</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Rule ID</th>
                      <th className="px-5 py-3 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="im-table-body">
                    {pagedUrlRows.map((node, index) => (
                      <tr key={node.id} onClick={() => { handleSelectUrlNode(node); openResultsLog(node); }} className={clsx('relative cursor-pointer hover:bg-blue-50/50', selectedUrl.id === node.id && 'bg-blue-50')}>
                        <td className="px-5 py-3 im-number-cell"><span className="row-index-pill im-row-number">{formatRowNumber((urlPage - 1) * URL_RULE_PAGE_SIZE + index + 1)}</span></td>
                        <td className="px-5 py-3 font-black text-slate-800">{node.label}</td>
                        <td className="px-5 py-3">
                          <span className={clsx('rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest', node.restrict === 1 ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700')}>
                            {node.restrict === 1 ? 'Restricted' : 'Managed'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-mono font-bold text-slate-500">{node.urlMainIdn || '-'}</td>
                        <td className="relative px-5 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              const rect = event.currentTarget.getBoundingClientRect();
                              const menuWidth = 196;
                              const menuHeight = 154;
                              const x = Math.min(Math.max(12, rect.right - menuWidth), window.innerWidth - menuWidth - 12);
                              const y = Math.min(Math.max(12, rect.bottom + 8), window.innerHeight - menuHeight - 12);
                              setActionMenuId((value) => value?.node.id === node.id ? null : { node, x, y });
                            }}
                            className="mini-btn icon-only"
                            aria-label="Open URL actions"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {pagedUrlRows.length === 0 && (
                      <tr><td colSpan={5} className="px-5 py-10 text-center text-xs font-bold text-slate-400">No data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <CompactPagination
                currentPage={urlPage}
                totalPages={urlTotalPages}
                onPageChange={setUrlPage}
                label="URL list pagination"
                className="im-url-pagination"
              />
            </section>
            )}

          </div>
          </section>
        </section>
      </div>


      {actionMenuId && (
        <div className="im-context-layer" onClick={() => setActionMenuId(null)}>
          <div
            className="user-modal settings-helper-card"
            style={{ left: actionMenuId.x, top: actionMenuId.y }}
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" onClick={() => { openResultsLog(actionMenuId.node); setActionMenuId(null); }}>View Results</button>
            {actionMenuId.node.restrict === 1 ? (
              <button type="button" onClick={() => { setPendingUrlAction({ action: 'manage', node: actionMenuId.node }); setActionMenuId(null); }}>Set as Managed</button>
            ) : (
              <button type="button" onClick={() => { setPendingUrlAction({ action: 'restrict', node: actionMenuId.node }); setActionMenuId(null); }} className="is-danger">Set as Restricted</button>
            )}
            <button type="button" onClick={() => { setPendingUrlAction({ action: 'remove', node: actionMenuId.node }); setActionMenuId(null); }} className="is-danger">Remove</button>
          </div>
        </div>
      )}

      {scopeMenu && (
        <div className="im-context-layer" onClick={() => setScopeMenu(null)}>
          <div
            className="user-modal settings-helper-card"
            style={{
              left: Math.min(Math.max(12, scopeMenu.x), window.innerWidth - 250),
              top: Math.min(Math.max(12, scopeMenu.y), window.innerHeight - 210),
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="content-head">
              <strong>{scopeMenu.node.label}</strong>
              <span>{getScopeTypeLabel(scopeMenu.node)}</span>
            </div>
            <button type="button" onClick={() => { setPendingMeteringAction({ action: 'start', node: scopeMenu.node }); setScopeMenu(null); }} disabled={isScopeRunning(scopeMenu.node)}>Start Metering</button>
            <button type="button" onClick={() => { setPendingMeteringAction({ action: 'collect', node: scopeMenu.node }); setScopeMenu(null); }}>Collect Result</button>
            <button type="button" onClick={() => { setPendingMeteringAction({ action: 'stop', node: scopeMenu.node }); setScopeMenu(null); }} disabled={!isScopeRunning(scopeMenu.node)} className="is-danger">Stop Metering</button>
          </div>
        </div>
      )}

      {pendingMeteringAction && (
        <div className="settings-confirm-backdrop open">
          <div className="settings-confirm-modal">
            <h2 className="text-lg font-black text-slate-900">Confirm</h2>
            <p className="mt-2 text-sm font-bold text-slate-600">
              {pendingMeteringAction.action === 'start' ? 'Start metering for' : pendingMeteringAction.action === 'stop' ? 'Stop metering for' : 'Collect result for'} <span className="font-black text-slate-900">{pendingMeteringAction.node.label}</span>
            </p>
            <div className="mt-1 text-xs font-bold text-slate-400">{getScopeTypeLabel(pendingMeteringAction.node)}</div>
            <div className="settings-confirm-actions">
              <button type="button" onClick={() => setPendingMeteringAction(null)} disabled={meteringBusy} className="soft-btn">No</button>
              <button type="button" onClick={confirmMeteringAction} disabled={meteringBusy} className={clsx(pendingMeteringAction.action === 'stop' ? 'danger-btn' : 'primary-btn')}>
                {meteringBusy && <Loader2 className="h-4 w-4 animate-spin" />} Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingUrlAction && (
        <div className="settings-confirm-backdrop open">
          <div className="settings-confirm-modal">
            <h2 className="text-lg font-black text-slate-900">Confirm</h2>
            <p className="mt-2 break-words text-sm font-bold text-slate-600">{pendingUrlAction.node.url}</p>
            <div className="settings-confirm-actions">
              <button type="button" onClick={() => setPendingUrlAction(null)} className="soft-btn">No</button>
              <button type="button" onClick={applyUrlAction} className={clsx(pendingUrlAction.action === 'remove' || pendingUrlAction.action === 'restrict' ? 'danger-btn' : 'primary-btn')}>Yes</button>
            </div>
          </div>
        </div>
      )}

      {detailRow && <DetailModal row={detailRow} onClose={() => setDetailRow(null)} />}
    </main>
  );
}
