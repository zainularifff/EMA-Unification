import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Clock3,
  Cloud,
  Database,
  ExternalLink,
  Folder,
  FolderOpen,
  FolderPlus,
  Info,
  Laptop,
  ListChecks,
  Loader2,
  PackageCheck,
  Play,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  createOnlinePatchScanJob,
  getAssetsByRelationID,
  getDepartments,
  getOnlinePatchCatalog,
  getOnlinePatchDetail,
  getOnlinePatchStatus,
  getOnlinePatchSummary,
  prepareOnlinePatchInstall,
  type AssetItem,
  type DepartmentNode,
  type OnlinePatchDetail,
  type OnlinePatchQueryParams,
  type OnlinePatchRow,
  type OnlinePatchScopeParams,
  type OnlinePatchStatusFilter,
  type OnlinePatchSummary,
} from '../services/patchService';
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
  EmaToastViewport,
  EmaToolbar,
  type EmaTableColumn,
  type EmaToastItem,
  type EmaToastTone,
} from '../components/ema';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

type PatchMode = 'online' | 'offline';
type PatchTab = 'status' | 'catalog';
type PatchSidebarMode = 'organization' | 'statistics';
type PatchKpiAction = 'coverage' | 'applicable' | 'missing' | 'installed' | 'devices' | 'lastScan';

type ConfirmState = { type: 'scan' } | { type: 'install'; row: OnlinePatchRow } | null;

type ScopeSelection = {
  scope: 'all' | 'relation' | 'device';
  label: string;
  Object_Rel_Idn?: number;
  Object_Root_Idn?: number;
  asset?: AssetItem;
};

type PagedPatchResponse = {
  rows: OnlinePatchRow[];
  page: number;
  limit: number;
  totalRecords: number;
};

const defaultSummary: OnlinePatchSummary = {
  DeviceCount: 0,
  ApplicablePatches: 0,
  MissingPatches: 0,
  InstalledPatches: 0,
  DownloadedPatches: 0,
  FailedInstalls: 0,
  LastScanTime: null,
  LastInstallTime: null,
};

const pageSizeOptions = [10, 25, 50, 100];
const severityOptions = ['Critical', 'Important', 'Moderate', 'Low', 'Unspecified'];
const controlClass = 'h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-100 disabled:text-slate-400';

const formatNumber = (value?: number | string | null) => {
  const numberValue = Number(value || 0);
  if (!Number.isFinite(numberValue)) return '0';
  return numberValue.toLocaleString();
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const formatDateOnly = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString();
};

const formatFileSize = (bytes?: number | string | null) => {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

const getDeviceId = (asset: AssetItem) => Number(asset.Object_Root_Idn || asset._Idn || asset.id || 0);

const getDeviceName = (asset?: AssetItem | null) => {
  if (!asset) return '-';
  return (
    asset.ComputerName ||
    asset.DeviceName ||
    asset.AssetName ||
    asset.Object_Client_Name ||
    asset.Object_DeviceID ||
    asset.DeviceID ||
    `Device ${getDeviceId(asset)}`
  );
};

const getDepartmentLabel = (node: DepartmentNode) => node.Object_Full_Name || node.Object_Rel_Name || `Branch ${Number(node.Object_Rel_Idn || 0)}`;
const getDepartmentShortLabel = (node: DepartmentNode) => node.Object_Rel_Name || getDepartmentLabel(node);

function filterDepartmentNodes(nodes: DepartmentNode[], keyword: string): DepartmentNode[] {
  const text = keyword.trim().toLowerCase();
  if (!text) return nodes;
  return nodes
    .map((node) => {
      const children = filterDepartmentNodes(node.children || [], text);
      const label = `${getDepartmentLabel(node)} ${getDepartmentShortLabel(node)}`.toLowerCase();
      if (label.includes(text) || children.length) return { ...node, children };
      return null;
    })
    .filter(Boolean) as DepartmentNode[];
}

const getKbText = (row?: OnlinePatchRow | null) => {
  if (!row) return '-';
  if (row.KB) return String(row.KB);
  if (Array.isArray(row.KBArticleIDs) && row.KBArticleIDs.length) return row.KBArticleIDs.join(', ');
  return '-';
};

const getRowStatus = (row: OnlinePatchRow) => {
  const installed = row.IsInstalled === true || row.IsInstalled === 1 || String(row.IsInstalled).toLowerCase() === 'true' || String(row.IsInstalled) === '1';
  const downloaded = row.IsDownloaded === true || row.IsDownloaded === 1 || String(row.IsDownloaded).toLowerCase() === 'true' || String(row.IsDownloaded) === '1';
  return installed || downloaded ? 'Installed' : 'Missing';
};

const getPatchRowKey = (row: OnlinePatchRow, fallback: string | number) => {
  return [row.Object_Root_Idn || 'catalog', row.UpdateID || 'update', row.RevisionNumber || 0, fallback].join('-');
};

const extractErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object') {
    const maybeAxios = error as { response?: { data?: { message?: string; error?: string } }; message?: string };
    return maybeAxios.response?.data?.message || maybeAxios.response?.data?.error || maybeAxios.message || fallback;
  }
  return fallback;
};

const toScopeParams = (selection: ScopeSelection): OnlinePatchScopeParams => ({
  scope: selection.scope,
  Object_Rel_Idn: selection.Object_Rel_Idn,
  Object_Root_Idn: selection.Object_Root_Idn,
});

const extractPatchRows = (response: any): OnlinePatchRow[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.rows)) return response.rows;
  return [];
};

function badgeClass(value?: string) {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('critical') || normalized.includes('failed')) return 'border-rose-200 bg-rose-50 text-rose-700';
  if (normalized.includes('missing') || normalized.includes('important')) return 'border-amber-200 bg-amber-50 text-amber-700';
  if (normalized.includes('installed') || normalized.includes('success')) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (normalized.includes('moderate')) return 'border-blue-200 bg-blue-50 text-blue-700';
  if (normalized.includes('low')) return 'border-slate-200 bg-slate-50 text-slate-700';
  return 'border-violet-200 bg-violet-50 text-violet-700';
}

function Badge({ children, className }: { children: ReactNode; className: string }) {
  return <span className={cx('inline-flex rounded-full border px-3 py-1 text-xs font-black', className)}>{children}</span>;
}

export default function PatchManagement() {
  const [mode, setMode] = useState<PatchMode>('online');
  const [activeTab, setActiveTab] = useState<PatchTab>('status');
  const [sidebarMode, setSidebarMode] = useState<PatchSidebarMode>('organization');
  const [scopeSearch, setScopeSearch] = useState('');
  const [departments, setDepartments] = useState<DepartmentNode[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [assetsByRelation, setAssetsByRelation] = useState<Record<number, AssetItem[]>>({});
  const [loadingAssets, setLoadingAssets] = useState<Record<number, boolean>>({});
  const [treeLoading, setTreeLoading] = useState(false);
  const [selectedScope, setSelectedScope] = useState<ScopeSelection>({ scope: 'all', label: 'All Branches' });
  const [summary, setSummary] = useState<OnlinePatchSummary>(defaultSummary);
  const [statusResult, setStatusResult] = useState<PagedPatchResponse>({ rows: [], page: 1, limit: 10, totalRecords: 0 });
  const [catalogResult, setCatalogResult] = useState<PagedPatchResponse>({ rows: [], page: 1, limit: 10, totalRecords: 0 });
  const [loadingData, setLoadingData] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<OnlinePatchStatusFilter>('all');
  const [activeKpi, setActiveKpi] = useState<PatchKpiAction | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedPatch, setSelectedPatch] = useState<OnlinePatchRow | null>(null);
  const [patchDetail, setPatchDetail] = useState<OnlinePatchDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toasts, setToasts] = useState<EmaToastItem[]>([]);
  const toastIdRef = useRef(0);

  const scopeParams = useMemo(() => toScopeParams(selectedScope), [selectedScope]);
  const filteredDepartments = useMemo(() => filterDepartmentNodes(departments, scopeSearch), [departments, scopeSearch]);
  const currentResult = activeTab === 'status' ? statusResult : catalogResult;
  const currentRows = currentResult.rows || [];
  const displayTotalRecords = currentRows.length;
  const totalPages = Math.max(1, Math.ceil(displayTotalRecords / limit));
  const pagedRows = useMemo(() => {
    const safePage = Math.max(page, 1);
    const start = (safePage - 1) * limit;
    return currentRows.slice(start, start + limit);
  }, [currentRows, limit, page]);

  const installableMissingCount = useMemo(() => {
    return statusResult.rows.filter((row) => getRowStatus(row) === 'Missing' && Number(row.Object_Root_Idn || 0) > 0).length;
  }, [statusResult.rows]);

  const patchCoverage = useMemo(() => {
    const installed = Number(summary.InstalledPatches || 0);
    const missing = Number(summary.MissingPatches || 0);
    const total = installed + missing;
    if (!total) return 0;
    return Math.round((installed / total) * 100);
  }, [summary]);

  const showToast = useCallback((tone: EmaToastTone, title: string, message?: string) => {
    toastIdRef.current += 1;
    const toast: EmaToastItem = { id: `${Date.now()}-${toastIdRef.current}`, tone, title, message };
    setToasts((items) => [...items.slice(-2), toast]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== toast.id)), 3600);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, selectedScope, severityFilter, statusFilter, limit]);

  useEffect(() => {
    let mounted = true;
    const loadTree = async () => {
      setTreeLoading(true);
      try {
        const data = await getDepartments();
        if (!mounted) return;
        const nodes = data || [];
        setDepartments(nodes);
        const firstId = nodes[0]?.Object_Rel_Idn;
        if (firstId) setExpanded(new Set([firstId]));
      } catch (error) {
        showToast('error', 'Unable to load branch scope', extractErrorMessage(error, 'Failed to load branch hierarchy.'));
      } finally {
        if (mounted) setTreeLoading(false);
      }
    };
    loadTree();
    return () => {
      mounted = false;
    };
  }, [showToast]);

  const loadAssetsForRelation = useCallback(async (relationID: number) => {
    if (!relationID || assetsByRelation[relationID] || loadingAssets[relationID]) return;
    setLoadingAssets((current) => ({ ...current, [relationID]: true }));
    try {
      const data = await getAssetsByRelationID(relationID);
      setAssetsByRelation((current) => ({ ...current, [relationID]: data || [] }));
    } catch (error) {
      showToast('error', 'Unable to load devices', extractErrorMessage(error, 'Failed to load devices for selected branch.'));
    } finally {
      setLoadingAssets((current) => ({ ...current, [relationID]: false }));
    }
  }, [assetsByRelation, loadingAssets, showToast]);

  const loadPatchData = useCallback(async () => {
    if (mode !== 'online') return;
    setLoadingData(true);
    const requestLimit = 500;
    try {
      if (activeTab === 'status') {
        const params: OnlinePatchQueryParams = {
          ...scopeParams,
          search: debouncedSearch,
          severity: severityFilter,
          status: statusFilter,
          page: 1,
          limit: requestLimit,
        };
        const [summaryResult, statusResultResponse] = await Promise.allSettled([
          getOnlinePatchSummary(scopeParams),
          getOnlinePatchStatus(params),
        ]);
        if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value || defaultSummary);
        if (statusResultResponse.status === 'fulfilled') {
          const rows = extractPatchRows(statusResultResponse.value);
          setStatusResult({ rows, page: 1, limit: requestLimit, totalRecords: rows.length });
          return;
        }
        throw statusResultResponse.reason;
      }

      const [summaryResult, catalogResultResponse] = await Promise.allSettled([
        getOnlinePatchSummary(scopeParams),
        getOnlinePatchCatalog({ search: debouncedSearch, severity: severityFilter, page: 1, limit: requestLimit }),
      ]);
      if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value || defaultSummary);
      if (catalogResultResponse.status === 'fulfilled') {
        const rows = extractPatchRows(catalogResultResponse.value);
        setCatalogResult({ rows, page: 1, limit: requestLimit, totalRecords: rows.length });
        return;
      }
      throw catalogResultResponse.reason;
    } catch (error) {
      showToast('error', 'Unable to load patch data', extractErrorMessage(error, 'Failed to load online patching data.'));
    } finally {
      setLoadingData(false);
    }
  }, [activeTab, debouncedSearch, mode, scopeParams, severityFilter, showToast, statusFilter]);

  useEffect(() => {
    void loadPatchData();
  }, [loadPatchData]);

  const selectOrganization = () => {
    setSelectedScope({ scope: 'all', label: 'All Branches' });
  };

  const toggleDepartment = (node: DepartmentNode) => {
    const id = Number(node.Object_Rel_Idn || 0);
    if (!id) return;
    const willExpand = !expanded.has(id);
    setExpanded((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    if (willExpand) void loadAssetsForRelation(id);
  };

  const selectDepartment = (node: DepartmentNode) => {
    const relationID = Number(node.Object_Rel_Idn || 0);
    const label = node.Object_Full_Name || node.Object_Rel_Name || `Branch ${relationID}`;
    setSelectedScope({ scope: 'relation', Object_Rel_Idn: relationID, label });
    setExpanded((current) => new Set(current).add(relationID));
    void loadAssetsForRelation(relationID);
  };

  const selectDevice = (asset: AssetItem, relationID: number) => {
    const objectRootIdn = getDeviceId(asset);
    if (!objectRootIdn) {
      showToast('error', 'Device cannot be selected', 'This device cannot be selected for patch action yet.');
      return;
    }
    setSelectedScope({
      scope: 'device',
      Object_Root_Idn: objectRootIdn,
      Object_Rel_Idn: relationID,
      label: getDeviceName(asset),
      asset,
    });
  };

  const openDetails = async (row: OnlinePatchRow) => {
    setSelectedPatch(row);
    setPatchDetail(null);
    setDetailLoading(true);
    try {
      const data = await getOnlinePatchDetail(row.UpdateID, Number(row.RevisionNumber));
      setPatchDetail(data);
    } catch (error) {
      showToast('error', 'Unable to load detail', extractErrorMessage(error, 'Failed to load patch detail.'));
    } finally {
      setDetailLoading(false);
    }
  };

  const runConfirmedAction = async () => {
    if (!confirmState) return;
    setActionLoading(true);
    try {
      if (confirmState.type === 'scan') {
        await createOnlinePatchScanJob(scopeParams);
        showToast('success', 'Patch scan created', 'Patch scan job created successfully.');
      }
      if (confirmState.type === 'install') {
        const objectRootIdn = Number(confirmState.row.Object_Root_Idn || selectedScope.Object_Root_Idn || 0);
        if (!objectRootIdn) throw new Error('Please select a device or use a device status row before installing a patch.');
        await prepareOnlinePatchInstall({
          Object_Root_Idn: objectRootIdn,
          UpdateID: confirmState.row.UpdateID,
          RevisionNumber: Number(confirmState.row.RevisionNumber),
        });
        showToast('success', 'Install job created', 'Patch install job created successfully.');
      }
      setConfirmState(null);
      await loadPatchData();
    } catch (error) {
      showToast('error', 'Patch action failed', extractErrorMessage(error, 'Patch action failed. Please try again.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleKpiClick = (action: PatchKpiAction) => {
    setActiveKpi(action);
    setMode('online');
    setActiveTab('status');
    setPage(1);
    if (action === 'missing') {
      setStatusFilter('missing');
      return;
    }
    if (action === 'installed') {
      setStatusFilter('installed');
      return;
    }
    setStatusFilter('all');
    if (action === 'devices') {
      setSearchTerm('');
      setDebouncedSearch('');
      setSeverityFilter('');
      return;
    }
    if (action === 'lastScan') void loadPatchData();
  };

  const goToPage = (nextPage: number) => {
    setPage(Math.min(Math.max(nextPage, 1), totalPages));
  };

  const tableColumns = useMemo<EmaTableColumn<OnlinePatchRow>[]>(() => {
    const columns: EmaTableColumn<OnlinePatchRow>[] = [
      {
        key: 'no',
        header: 'No.',
        width: '72px',
        render: (_row, index) => <span className="font-black text-slate-500">{(page - 1) * limit + index + 1}</span>,
      },
    ];

    if (activeTab === 'status') {
      columns.push({
        key: 'device',
        header: 'Device',
        render: (row) => (
          <div className="flex min-w-[12rem] items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600"><Laptop size={15} /></span>
            <span className="min-w-0">
              <strong className="block truncate text-sm font-black text-slate-900">{row.DeviceName || row.ComputerName || row.Object_Client_Name || '-'}</strong>
              <span className="block truncate text-xs font-semibold text-slate-500">{row.Department || row.Object_Full_Name || row.IP || '-'}</span>
            </span>
          </div>
        ),
      });
    }

    columns.push(
      {
        key: 'update',
        header: 'KB / Update',
        render: (row) => (
          <button type="button" onClick={() => void openDetails(row)} className="max-w-[34rem] text-left">
            <span className="block text-xs font-black uppercase tracking-[0.08em] text-blue-600">{getKbText(row)}</span>
            <strong className="line-clamp-2 text-sm font-black text-slate-900">{row.Title || 'Untitled update'}</strong>
          </button>
        ),
      },
      {
        key: 'severity',
        header: 'Severity',
        render: (row) => <Badge className={badgeClass(row.MsrcSeverity)}>{row.MsrcSeverity || 'Unspecified'}</Badge>,
      },
      {
        key: 'release',
        header: 'Release',
        render: (row) => <span className="font-semibold text-slate-600">{formatDateOnly(row.ReleaseDate)}</span>,
      }
    );

    if (activeTab === 'status') {
      columns.push(
        {
          key: 'status',
          header: 'Status',
          render: (row) => {
            const status = getRowStatus(row);
            return <Badge className={badgeClass(status)}>{status}</Badge>;
          },
        },
        {
          key: 'scan',
          header: 'Last Scan',
          render: (row) => <span className="font-semibold text-slate-600">{formatDateTime(row.LastScanTime)}</span>,
        }
      );
    }

    if (activeTab === 'catalog') {
      columns.push(
        {
          key: 'files',
          header: 'Files',
          render: (row) => <span className="font-semibold text-slate-700">{formatNumber(row.FileCount)} / {formatFileSize(row.TotalFileSize)}</span>,
        },
        {
          key: 'devices',
          header: 'Devices',
          render: (row) => <span className="font-semibold text-slate-700">{formatNumber(row.DeviceCount)} devices</span>,
        }
      );
    }

    columns.push({
      key: 'action',
      header: 'Action',
      align: 'right',
      render: (row) => {
        const status = getRowStatus(row);
        const canInstall = activeTab === 'status' && status === 'Missing' && Number(row.Object_Root_Idn || 0) > 0;
        return (
          <div className="flex justify-end gap-2">
            {canInstall ? (
              <button type="button" onClick={() => setConfirmState({ type: 'install', row })} className="inline-flex h-9 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-black text-blue-700 hover:bg-blue-100">
                <Play size={13} /> Install
              </button>
            ) : null}
            <button type="button" onClick={() => void openDetails(row)} className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50">
              <Info size={13} /> Details
            </button>
          </div>
        );
      },
    });

    return columns;
  }, [activeTab, limit, page]);

  const sidebar = (
    <EmaSidebarPanel
      eyebrow="Patch Management"
      title="Branch Scope"
      description="Select branch or device before patch action."
      tabs={[
        { id: 'organization', label: 'Branch', icon: <FolderOpen size={15} /> },
        { id: 'statistics', label: 'Stats', icon: <Database size={15} /> },
      ]}
      activeTab={sidebarMode}
      onTabChange={(tabId) => {
        setSidebarMode(tabId as PatchSidebarMode);
        if (tabId === 'organization') setScopeSearch('');
      }}
      searchValue={sidebarMode === 'organization' ? scopeSearch : undefined}
      searchPlaceholder="Search branch/device..."
      onSearchChange={sidebarMode === 'organization' ? setScopeSearch : undefined}
      action={sidebarMode === 'organization' ? (
        <EmaSidebarActionButton onClick={() => showToast('info', 'Branch path', 'Branch path creation is managed from organization settings.')}>
          <FolderPlus size={14} /> New Branch Path
        </EmaSidebarActionButton>
      ) : null}
    >
      {sidebarMode === 'organization' ? (
        <>
          <EmaSidebarTreeRow active={selectedScope.scope === 'all'} onClick={selectOrganization}>
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600"><Folder size={15} /></span>
            <span className="min-w-0 flex-1 truncate">All Branches</span>
          </EmaSidebarTreeRow>
          {filteredDepartments.map((node) => (
            <TreeNode
              key={node.Object_Rel_Idn}
              node={node}
              level={1}
              selectedScope={selectedScope}
              expanded={expanded}
              assetsByRelation={assetsByRelation}
              loadingAssets={loadingAssets}
              onToggle={toggleDepartment}
              onSelectDepartment={selectDepartment}
              onSelectDevice={selectDevice}
            />
          ))}
          {treeLoading ? <div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-sm font-bold text-blue-700"><Loader2 size={14} className="animate-spin" /> Loading branch...</div> : null}
          {!treeLoading && filteredDepartments.length === 0 ? <div className="rounded-2xl border border-slate-200 p-4 text-sm font-bold text-slate-500">No branch scope available.</div> : null}
        </>
      ) : (
        <>
          <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <strong className="block truncate text-sm font-black text-slate-900">{selectedScope.label}</strong>
            <span className="mt-1 block text-xs font-semibold text-slate-500">{selectedScope.scope === 'all' ? 'All branches' : selectedScope.scope === 'relation' ? 'Selected branch' : 'Selected device'}</span>
          </div>
          <EmaSidebarTreeRow active={activeKpi === 'coverage'} onClick={() => handleKpiClick('coverage')}><ShieldCheck size={16} /><span className="flex-1">Coverage</span><span className="text-xs text-slate-500">{patchCoverage}%</span></EmaSidebarTreeRow>
          <EmaSidebarTreeRow active={activeKpi === 'applicable'} onClick={() => handleKpiClick('applicable')}><ListChecks size={16} /><span className="flex-1">Applicable</span><span className="text-xs text-slate-500">{formatNumber(summary.ApplicablePatches)}</span></EmaSidebarTreeRow>
          <EmaSidebarTreeRow active={activeKpi === 'missing'} onClick={() => handleKpiClick('missing')}><ShieldAlert size={16} /><span className="flex-1">Missing</span><span className="text-xs text-slate-500">{formatNumber(summary.MissingPatches)}</span></EmaSidebarTreeRow>
          <EmaSidebarTreeRow active={activeKpi === 'installed'} onClick={() => handleKpiClick('installed')}><PackageCheck size={16} /><span className="flex-1">Installed</span><span className="text-xs text-slate-500">{formatNumber(summary.InstalledPatches)}</span></EmaSidebarTreeRow>
        </>
      )}
    </EmaSidebarPanel>
  );

  return (
    <EmaPageLayout sidebar={sidebar}>
      <EmaToastViewport items={toasts} onClose={(id) => setToasts((items) => items.filter((item) => item.id !== id))} />

      <div className="space-y-3" data-section="patch-management">
        <EmaSection>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-blue-600">Patch Operations</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Patch Management</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Review update coverage, scan selected endpoints, and install missing patches.</p>
            </div>
            <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
              <button type="button" onClick={() => setMode('online')} className={cx('inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-black transition', mode === 'online' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-slate-900')}><Cloud size={15} /> Online</button>
              <button type="button" onClick={() => setMode('offline')} className={cx('inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-black transition', mode === 'offline' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-slate-900')}><Server size={15} /> Offline</button>
            </div>
          </div>
          <div className="mt-4">
            <EmaKpiGrid>
              <EmaKpiCard title="Coverage" value={`${patchCoverage}%`} note="Installed rate" icon={<ShieldCheck size={18} />} tone="blue" active={activeKpi === 'coverage'} onClick={() => handleKpiClick('coverage')} />
              <EmaKpiCard title="Applicable" value={formatNumber(summary.ApplicablePatches)} note="Detected updates" icon={<ListChecks size={18} />} tone="violet" active={activeKpi === 'applicable'} onClick={() => handleKpiClick('applicable')} />
              <EmaKpiCard title="Missing" value={formatNumber(summary.MissingPatches)} note={`${installableMissingCount} action row(s)`} icon={<ShieldAlert size={18} />} tone="amber" active={activeKpi === 'missing' || statusFilter === 'missing'} onClick={() => handleKpiClick('missing')} />
              <EmaKpiCard title="Installed" value={formatNumber(summary.InstalledPatches)} note="Completed updates" icon={<PackageCheck size={18} />} tone="emerald" active={activeKpi === 'installed' || statusFilter === 'installed'} onClick={() => handleKpiClick('installed')} />
              <EmaKpiCard title="Devices" value={formatNumber(summary.DeviceCount)} note="Endpoint scope" icon={<Laptop size={18} />} tone="slate" active={activeKpi === 'devices'} onClick={() => handleKpiClick('devices')} />
            </EmaKpiGrid>
          </div>
        </EmaSection>

        <EmaToolbar
          search={<EmaSearchInput value={searchTerm} onChange={(value) => { setActiveKpi(null); setSearchTerm(value); }} placeholder="Search KB, title, update id..." />}
          filters={
            <>
              <EmaFilterField label="Severity">
                <select value={severityFilter} onChange={(event) => { setActiveKpi(null); setSeverityFilter(event.target.value); }} className={controlClass}>
                  <option value="">All severity</option>
                  {severityOptions.map((severity) => <option key={severity} value={severity}>{severity}</option>)}
                </select>
              </EmaFilterField>
              <EmaFilterField label="Status">
                <select value={statusFilter} onChange={(event) => { setActiveKpi(null); setStatusFilter(event.target.value as OnlinePatchStatusFilter); }} disabled={activeTab === 'catalog'} className={controlClass}>
                  <option value="all">All status</option>
                  <option value="missing">Missing</option>
                  <option value="installed">Installed</option>
                </select>
              </EmaFilterField>
              <EmaFilterField label="View">
                <select value={activeTab} onChange={(event) => setActiveTab(event.target.value as PatchTab)} className={controlClass}>
                  <option value="status">Device status</option>
                  <option value="catalog">Update catalog</option>
                </select>
              </EmaFilterField>
              <EmaFilterField label="Page Size">
                <select value={limit} onChange={(event) => { setActiveKpi(null); setLimit(Number(event.target.value)); }} className={controlClass}>
                  {pageSizeOptions.map((size) => <option key={size} value={size}>{size} / page</option>)}
                </select>
              </EmaFilterField>
            </>
          }
          right={
            <>
              <EmaButton onClick={() => void loadPatchData()} disabled={loadingData || mode !== 'online'}>
                {loadingData ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Refresh
              </EmaButton>
              <EmaButton variant="primary" onClick={() => setConfirmState({ type: 'scan' })} disabled={mode !== 'online'}>
                <Search size={15} /> Scan / Rescan
              </EmaButton>
            </>
          }
        />

        <EmaTableShell
          title={mode === 'online' ? 'Online Patch Registry' : 'Offline Patch Registry'}
          subtitle={mode === 'online' ? `Current scope: ${selectedScope.label}` : 'Offline patching is separated from online scan and install.'}
          toolbar={
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => handleKpiClick('devices')} className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50"><Laptop size={14} /> {formatNumber(summary.DeviceCount)} devices</button>
              <button type="button" onClick={() => handleKpiClick('lastScan')} className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50"><Clock3 size={14} /> Last scan: {formatDateTime(summary.LastScanTime)}</button>
            </div>
          }
        >
          {mode === 'offline' ? (
            <OfflinePlaceholder />
          ) : (
            <EmaTable
              columns={tableColumns}
              rows={pagedRows}
              loading={loadingData}
              getRowKey={getPatchRowKey}
              emptyText="No online patch data found. Try a different scope or run scan again."
            />
          )}
          <EmaPagination page={page} totalPages={totalPages} totalLabel={`${formatNumber(displayTotalRecords)} record(s) • Page ${page} of ${totalPages}`} onPageChange={goToPage} />
        </EmaTableShell>
      </div>

      {selectedPatch ? (
        <PatchDetailDrawer
          row={selectedPatch}
          detail={patchDetail}
          loading={detailLoading}
          onClose={() => {
            setSelectedPatch(null);
            setPatchDetail(null);
          }}
          onInstall={(row) => setConfirmState({ type: 'install', row })}
        />
      ) : null}

      {confirmState ? (
        <ConfirmModal
          state={confirmState}
          scope={selectedScope}
          loading={actionLoading}
          onCancel={() => setConfirmState(null)}
          onConfirm={runConfirmedAction}
        />
      ) : null}
    </EmaPageLayout>
  );
}

function TreeNode({
  node,
  level,
  selectedScope,
  expanded,
  assetsByRelation,
  loadingAssets,
  onToggle,
  onSelectDepartment,
  onSelectDevice,
}: {
  node: DepartmentNode;
  level: number;
  selectedScope: ScopeSelection;
  expanded: Set<number>;
  assetsByRelation: Record<number, AssetItem[]>;
  loadingAssets: Record<number, boolean>;
  onToggle: (node: DepartmentNode) => void;
  onSelectDepartment: (node: DepartmentNode) => void;
  onSelectDevice: (asset: AssetItem, relationID: number) => void;
}) {
  const relationID = Number(node.Object_Rel_Idn || 0);
  const label = getDepartmentLabel(node);
  const shortLabel = getDepartmentShortLabel(node);
  const isExpanded = expanded.has(relationID);
  const isSelected = selectedScope.scope === 'relation' && selectedScope.Object_Rel_Idn === relationID;
  const children = node.children || [];
  const devices = assetsByRelation[relationID] || [];
  const isLoading = Boolean(loadingAssets[relationID]);
  const hasLoadedDevices = Object.prototype.hasOwnProperty.call(assetsByRelation, relationID);
  const Icon = isExpanded ? FolderOpen : Folder;

  return (
    <div>
      <div className="flex items-center gap-1">
        <button type="button" onClick={(event) => { event.stopPropagation(); onToggle(node); }} aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${shortLabel}`} className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <EmaSidebarTreeRow active={isSelected} depth={level} onClick={() => { onToggle(node); onSelectDepartment(node); }}>
          <span className={cx('grid size-8 shrink-0 place-items-center rounded-xl', isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500')}><Icon size={15} /></span>
          <span className="min-w-0 flex-1 truncate" title={label}>{shortLabel}</span>
        </EmaSidebarTreeRow>
      </div>

      {isExpanded ? (
        <div className="ml-4 space-y-1 border-l border-slate-100 pl-2">
          {children.map((child) => (
            <TreeNode key={child.Object_Rel_Idn} node={child} level={level + 1} selectedScope={selectedScope} expanded={expanded} assetsByRelation={assetsByRelation} loadingAssets={loadingAssets} onToggle={onToggle} onSelectDepartment={onSelectDepartment} onSelectDevice={onSelectDevice} />
          ))}
          {isLoading ? <div className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-blue-700"><Loader2 size={14} className="animate-spin" /> Loading devices...</div> : null}
          {!isLoading && hasLoadedDevices && devices.length === 0 ? <div className="px-3 py-2 text-xs font-bold text-slate-400">No devices in this scope.</div> : null}
          {devices.map((asset) => {
            const deviceID = getDeviceId(asset);
            const isDeviceSelected = selectedScope.scope === 'device' && selectedScope.Object_Root_Idn === deviceID;
            return (
              <EmaSidebarTreeRow key={`${relationID}-${deviceID}-${getDeviceName(asset)}`} active={isDeviceSelected} depth={level + 1} onClick={() => onSelectDevice(asset, relationID)}>
                <span className={cx('grid size-8 shrink-0 place-items-center rounded-xl', isDeviceSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500')}><Laptop size={14} /></span>
                <span className="min-w-0 flex-1 truncate" title={getDeviceName(asset)}>{getDeviceName(asset)}</span>
              </EmaSidebarTreeRow>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function PatchDetailDrawer({ row, detail, loading, onClose, onInstall }: {
  row: OnlinePatchRow;
  detail: OnlinePatchDetail | null;
  loading: boolean;
  onClose: () => void;
  onInstall: (row: OnlinePatchRow) => void;
}) {
  const patch = detail?.patch || row;
  const status = getRowStatus(row);
  const products = Array.isArray(patch.Products) ? patch.Products : [];
  const classifications = Array.isArray(patch.Classifications) ? patch.Classifications : [];
  const canInstall = status === 'Missing' && Number(row.Object_Root_Idn || 0) > 0;

  return (
    <div className="fixed inset-0 z-[998] flex justify-end bg-slate-950/35 backdrop-blur-sm">
      <section className="flex h-full w-full max-w-3xl flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">Patch Detail</p>
            <h3 className="mt-1 text-lg font-black text-slate-950">{getKbText(patch)} - Revision {patch.RevisionNumber || row.RevisionNumber}</h3>
            <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-500">{patch.Title || row.Title}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-10 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900"><X size={18} /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 p-8 text-sm font-bold text-blue-700"><Loader2 size={18} className="mr-2 animate-spin" /> Loading patch detail...</div>
          ) : (
            <>
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-black text-slate-950">Patch Overview</h4>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">{patch.Description || 'No description available.'}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Badge className={badgeClass(patch.MsrcSeverity)}>{patch.MsrcSeverity || 'Unspecified'}</Badge>
                    <Badge className={badgeClass(status)}>{status}</Badge>
                    {canInstall ? <EmaButton variant="primary" onClick={() => onInstall(row)}><Play size={15} /> Install</EmaButton> : null}
                  </div>
                </div>
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <InfoPanel title="Patch Metadata" rows={[
                  ['Update ID', patch.UpdateID || row.UpdateID],
                  ['Revision', patch.RevisionNumber || row.RevisionNumber],
                  ['Release Date', formatDateOnly(patch.ReleaseDate)],
                  ['File Count', formatNumber(patch.FileCount)],
                  ['Total Size', formatFileSize(patch.TotalFileSize)],
                  ['Reboot Required', patch.RebootRequired ? 'Yes' : 'No'],
                ]} />
                <InfoPanel title="Device Status" rows={[
                  ['Device', row.DeviceName || row.ComputerName || row.Object_Client_Name || '-'],
                  ['Branch', row.Department || row.Object_Full_Name || '-'],
                  ['Last Scan', formatDateTime(row.LastScanTime)],
                  ['Last Install', formatDateTime(row.LastInstallTime)],
                  ['Applicable', row.IsApplicable ? 'Yes' : 'No'],
                  ['Downloaded', row.IsDownloaded ? 'Yes' : 'No'],
                ]} />
              </section>

              <InfoTagPanel title="Products & Classifications" values={[...products, ...classifications]} emptyText="No product/category data returned." />
              <InfoTagPanel title="Security References" values={[...(patch.CVEIDs || []), ...(patch.SecurityBulletinIDs || [])]} emptyText="No CVE/security bulletin data returned." />

              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="text-sm font-black text-slate-950">Online Source Files</h4>
                <div className="mt-3 space-y-2">
                  {(detail?.files || []).length ? detail?.files.map((file: any) => (
                    <div key={`${file.UpdateID}-${file.RevisionNumber}-${file.FileName}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="min-w-0">
                        <strong className="block truncate text-sm font-black text-slate-900">{file.FileName || 'Unnamed file'}</strong>
                        <span className="text-xs font-semibold text-slate-500">{file.ShortLanguage || 'neutral'} - {formatFileSize(file.FileSize)}</span>
                      </div>
                      {file.DownloadUrl ? <a href={file.DownloadUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50"><ExternalLink size={14} /> Open</a> : null}
                    </div>
                  )) : <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm font-bold text-slate-500">No file list returned.</p>}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="text-sm font-black text-slate-950">Links</h4>
                <div className="mt-3 space-y-2">
                  {patch.SupportUrl ? <ExternalRow label="Support URL" url={patch.SupportUrl} /> : null}
                  {(patch.KBArticleUrls || []).map((url: string) => <ExternalRow key={url} label="KB Article" url={url} />)}
                  {!patch.SupportUrl && !(patch.KBArticleUrls || []).length ? <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm font-bold text-slate-500">No support links returned.</p> : null}
                </div>
              </section>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 p-4">
          <EmaButton onClick={onClose}>Close</EmaButton>
        </div>
      </section>
    </div>
  );
}

function ConfirmModal({ state, scope, loading, onCancel, onConfirm }: {
  state: NonNullable<ConfirmState>;
  scope: ScopeSelection;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isInstall = state.type === 'install';
  const target = isInstall ? state.row.DeviceName || state.row.ComputerName || state.row.Object_Client_Name || scope.label : scope.label;

  return (
    <EmaModal
      open
      title={isInstall ? 'Install selected patch?' : 'Create patch scan job?'}
      description={isInstall ? 'This will create an install action for the selected endpoint.' : 'This will create a scan job for the selected scope.'}
      onClose={onCancel}
      footer={
        <>
          <EmaButton onClick={onCancel} disabled={loading}>Cancel</EmaButton>
          <EmaButton variant="primary" onClick={onConfirm} disabled={loading}>{loading ? <Loader2 size={15} className="animate-spin" /> : null}{isInstall ? 'Install Patch' : 'Create Scan Job'}</EmaButton>
        </>
      }
    >
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <strong className="block text-sm font-black text-slate-900">Target: {target}</strong>
        <span className="mt-1 block text-sm font-semibold text-slate-500">{isInstall ? `${getKbText(state.row)} - ${state.row.Title}` : scope.scope === 'all' ? 'Whole company' : scope.scope === 'relation' ? 'Branch' : 'Device'}</span>
      </div>
    </EmaModal>
  );
}

function OfflinePlaceholder() {
  return (
    <div className="m-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
      <strong className="block text-base font-black text-slate-900">Offline patching is separated</strong>
      <span className="mt-1 block text-sm font-semibold text-slate-500">Use online patching for scan and install actions from this workspace.</span>
    </div>
  );
}

function InfoPanel({ title, rows }: { title: string; rows: Array<[string, ReactNode]> }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h4 className="text-sm font-black text-slate-950">{title}</h4>
      <div className="mt-3 divide-y divide-slate-100">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 py-2 text-sm">
            <strong className="font-black text-slate-500">{label}</strong>
            <span className="min-w-0 break-words font-semibold text-slate-800">{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function InfoTagPanel({ title, values, emptyText }: { title: string; values: string[]; emptyText: string }) {
  const cleaned = values.filter(Boolean);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h4 className="text-sm font-black text-slate-950">{title}</h4>
      {cleaned.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {cleaned.map((value) => <span key={value} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">{value}</span>)}
        </div>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed border-slate-200 p-4 text-sm font-bold text-slate-500">{emptyText}</p>
      )}
    </section>
  );
}

function ExternalRow({ label, url }: { label: string; url: string }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-blue-50">
      <span className="min-w-0">
        <strong className="block text-sm font-black text-slate-900">{label}</strong>
        <span className="block truncate text-xs font-semibold text-slate-500">{url}</span>
      </span>
      <small className="inline-flex items-center gap-1 text-xs font-black text-blue-700"><ExternalLink size={14} /> Open link</small>
    </a>
  );
}
