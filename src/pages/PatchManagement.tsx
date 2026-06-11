import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Boxes,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleDot,
  Clock3,
  Cloud,
  Database,
  ExternalLink,
  FileDown,
  Folder,
  FolderOpen,
  Globe2,
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

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

type PatchMode = 'online' | 'offline';
type PatchTab = 'status' | 'catalog';
type PatchKpiAction = 'coverage' | 'applicable' | 'missing' | 'installed' | 'devices' | 'lastScan';
type ConfirmState =
  | { type: 'scan' }
  | { type: 'install'; row: OnlinePatchRow }
  | null;

type ToastState = {
  type: 'success' | 'error' | 'info';
  message: string;
} | null;

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

const pageSizeOptions = [10];
const severityOptions = ['Critical', 'Important', 'Moderate', 'Low', 'Unspecified'];

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

const getSeverityPillClass = (severity?: string) => {
  const normalized = String(severity || '').toLowerCase();
  if (normalized.includes('critical')) return 'is-red';
  if (normalized.includes('important')) return 'is-yellow';
  if (normalized.includes('moderate')) return 'is-blue';
  if (normalized.includes('low')) return 'is-green';
  return 'is-purple';
};

const getStatusPillClass = (status?: string) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('installed')) return 'is-green';
  if (normalized.includes('missing')) return 'is-yellow';
  return 'is-blue';
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


function PatchManagement() {
  const [mode, setMode] = useState<PatchMode>('online');
  const [activeTab, setActiveTab] = useState<PatchTab>('status');
  const [departments, setDepartments] = useState<DepartmentNode[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [assetsByRelation, setAssetsByRelation] = useState<Record<number, AssetItem[]>>({});
  const [loadingAssets, setLoadingAssets] = useState<Record<number, boolean>>({});
  const [treeLoading, setTreeLoading] = useState(false);
  const [selectedScope, setSelectedScope] = useState<ScopeSelection>({ scope: 'all', label: 'Organization' });

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
  const [toast, setToast] = useState<ToastState>(null);

  const scopeParams = useMemo(() => toScopeParams(selectedScope), [selectedScope]);
  const currentResult = activeTab === 'status' ? statusResult : catalogResult;
  const totalPages = Math.max(1, Math.ceil((currentResult.totalRecords || 0) / limit));

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

  const showToast = useCallback((nextToast: ToastState) => {
    setToast(nextToast);
    window.setTimeout(() => setToast(null), 3800);
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
        showToast({ type: 'error', message: extractErrorMessage(error, 'Failed to load organization hierarchy.') });
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
      showToast({ type: 'error', message: extractErrorMessage(error, 'Failed to load devices for selected department.') });
    } finally {
      setLoadingAssets((current) => ({ ...current, [relationID]: false }));
    }
  }, [assetsByRelation, loadingAssets, showToast]);

  const loadPatchData = useCallback(async () => {
    if (mode !== 'online') return;

    setLoadingData(true);
    try {
      const summaryPromise = getOnlinePatchSummary(scopeParams);

      if (activeTab === 'status') {
        const params: OnlinePatchQueryParams = {
          ...scopeParams,
          search: debouncedSearch,
          severity: severityFilter,
          status: statusFilter,
          page,
          limit,
        };

        const [summaryData, statusData] = await Promise.all([
          summaryPromise,
          getOnlinePatchStatus(params),
        ]);

        setSummary(summaryData || defaultSummary);
        setStatusResult({
          rows: statusData.data || [],
          page: statusData.page || page,
          limit: statusData.limit || limit,
          totalRecords: statusData.totalRecords || 0,
        });
      } else {
        const [summaryData, catalogData] = await Promise.all([
          summaryPromise,
          getOnlinePatchCatalog({ search: debouncedSearch, severity: severityFilter, page, limit }),
        ]);

        setSummary(summaryData || defaultSummary);
        setCatalogResult({
          rows: catalogData.data || [],
          page: catalogData.page || page,
          limit: catalogData.limit || limit,
          totalRecords: catalogData.totalRecords || 0,
        });
      }
    } catch (error) {
      showToast({ type: 'error', message: extractErrorMessage(error, 'Failed to load online patching data.') });
    } finally {
      setLoadingData(false);
    }
  }, [activeTab, debouncedSearch, limit, mode, page, scopeParams, severityFilter, showToast, statusFilter]);

  useEffect(() => {
    loadPatchData();
  }, [loadPatchData]);

  const selectOrganization = () => {
    setSelectedScope({ scope: 'all', label: 'Organization' });
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

    if (willExpand) {
      loadAssetsForRelation(id);
    }
  };

  const selectDepartment = (node: DepartmentNode) => {
    const relationID = Number(node.Object_Rel_Idn || 0);
    const label = node.Object_Full_Name || node.Object_Rel_Name || `Department ${relationID}`;
    setSelectedScope({ scope: 'relation', Object_Rel_Idn: relationID, label });
  };

  const selectDevice = (asset: AssetItem, relationID: number) => {
    const objectRootIdn = getDeviceId(asset);
    if (!objectRootIdn) {
      showToast({ type: 'error', message: 'This device cannot be selected for patch action yet.' });
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
      showToast({ type: 'error', message: extractErrorMessage(error, 'Failed to load patch detail.') });
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
        showToast({ type: 'success', message: 'Patch scan job created successfully.' });
      }

      if (confirmState.type === 'install') {
        const objectRootIdn = Number(confirmState.row.Object_Root_Idn || selectedScope.Object_Root_Idn || 0);
        if (!objectRootIdn) throw new Error('Please select a device or use a device status row before installing a patch.');

        await prepareOnlinePatchInstall({
          Object_Root_Idn: objectRootIdn,
          UpdateID: confirmState.row.UpdateID,
          RevisionNumber: Number(confirmState.row.RevisionNumber),
        });

        showToast({ type: 'success', message: 'Patch install job created successfully.' });
      }

      setConfirmState(null);
      await loadPatchData();
    } catch (error) {
      showToast({ type: 'error', message: extractErrorMessage(error, 'Patch action failed. Please try again.') });
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

    if (action === 'lastScan') {
      void loadPatchData();
    }
  };

  const goToPage = (nextPage: number) => {
    setPage(Math.min(Math.max(nextPage, 1), totalPages));
  };

  return (
    <main className="settings-module-root hardware-module-root patch-module-root ema-settings-pro ema-module-root container-fluid p-3 p-xl-4" data-section="patch-management">
      {toast && <PatchToast toast={toast} onClose={() => setToast(null)} />}

      <div className="settings-layout d-grid gap-3">
        <aside className="settings-menu ema-panel-surface">
          <div className="panel-head">
            <span>Patch Scope</span>
            <strong>Package Library</strong>
            <small>Choose organization, department, or device.</small>
          </div>

          <div className="p-3 pb-2">
            <label className="section-search">
              <Search size={15} />
              <input placeholder="Search scope" readOnly />
            </label>
          </div>

          <div className="settings-menu-list">
            <button className={cx('setting-btn', selectedScope.scope === 'all' && 'active')} onClick={selectOrganization} type="button">
              <span className="setting-icon"><Globe2 /></span>
              <span>
                <strong>Organization</strong>
                <small>Whole company</small>
              </span>
            </button>

            {departments.map((node) => (
              <TreeNode
                key={node.Object_Rel_Idn}
                node={node}
                level={0}
                selectedScope={selectedScope}
                expanded={expanded}
                assetsByRelation={assetsByRelation}
                loadingAssets={loadingAssets}
                onToggle={toggleDepartment}
                onSelectDepartment={selectDepartment}
                onSelectDevice={selectDevice}
              />
            ))}

            {treeLoading && <div className="settings-helper-card"><Loader2 className="me-2" size={14} /> Loading organization...</div>}
            {!treeLoading && departments.length === 0 && <div className="settings-helper-card">No organization scope available.</div>}
          </div>
        </aside>

        <section className="settings-content">
          <section className="settings-hero hardware-hero ema-panel-surface">
            <div>
              <span className="eyebrow">PATCH OPERATIONS</span>
              <h2>Patch Management</h2>
              <p>Review update coverage, scan selected endpoints, and install missing patches from one workspace.</p>
            </div>

            <div className="hardware-hero-score">
              <KpiCard color="is-total" label="Coverage" value={`${patchCoverage}%`} note="Installed rate" icon={<ShieldCheck size={17} />} active={activeKpi === 'coverage'} onClick={() => handleKpiClick('coverage')} />
              <KpiCard color="is-connected" label="Applicable" value={formatNumber(summary.ApplicablePatches)} note="Detected updates" icon={<ListChecks size={17} />} active={activeKpi === 'applicable'} onClick={() => handleKpiClick('applicable')} />
              <KpiCard color="is-stale" attention label="Missing" value={formatNumber(summary.MissingPatches)} note={`${installableMissingCount} action row(s)`} icon={<ShieldAlert size={17} />} active={activeKpi === 'missing' || statusFilter === 'missing'} onClick={() => handleKpiClick('missing')} />
              <KpiCard color="is-online" label="Installed" value={formatNumber(summary.InstalledPatches)} note="Completed updates" icon={<PackageCheck size={17} />} active={activeKpi === 'installed' || statusFilter === 'installed'} onClick={() => handleKpiClick('installed')} />
              <KpiCard color="is-locked" label="Devices" value={formatNumber(summary.DeviceCount)} note="Endpoint scope" icon={<Laptop size={17} />} active={activeKpi === 'devices'} onClick={() => handleKpiClick('devices')} />
            </div>
          </section>

          <main className="content-shell ema-panel-surface content-panel clean">
            <header className="content-head">
              <div>
                <span className="section-tag">Online patching</span>
                <h3>Patch Registry</h3>
                <p>Current scope: <strong>{selectedScope.label}</strong></p>
              </div>

              <div className="content-actions">
                <button className="soft-btn" type="button" onClick={loadPatchData} disabled={loadingData || mode !== 'online'}>
                  {loadingData ? <Loader2 className="me-1" size={15} /> : <RefreshCw size={15} />}
                  Refresh
                </button>
                <button className="primary-btn" type="button" onClick={() => setConfirmState({ type: 'scan' })} disabled={mode !== 'online'}>
                  <Search size={15} />
                  Scan / Rescan
                </button>
              </div>
            </header>

            <div className="user-access-commandbar">
              <label className="section-search user-search-inline">
                <Search size={15} />
                <input value={searchTerm} onChange={(event) => { setActiveKpi(null); setSearchTerm(event.target.value); }} placeholder="Search KB, title, update id" />
              </label>

              <select className="setting-select" value={severityFilter} onChange={(event) => { setActiveKpi(null); setSeverityFilter(event.target.value); }}>
                <option value="">All severity</option>
                {severityOptions.map((severity) => <option key={severity} value={severity}>{severity}</option>)}
              </select>

              <select className="setting-select" value={statusFilter} onChange={(event) => { setActiveKpi(null); setStatusFilter(event.target.value as OnlinePatchStatusFilter); }} disabled={activeTab === 'catalog'}>
                <option value="all">All status</option>
                <option value="missing">Missing</option>
                <option value="installed">Installed</option>
              </select>

              <select className="setting-select" value={activeTab} onChange={(event) => setActiveTab(event.target.value as PatchTab)}>
                <option value="status">Device status</option>
                <option value="catalog">Update catalog</option>
              </select>

              <select className="setting-select" value={limit} onChange={(event) => { setActiveKpi(null); setLimit(Number(event.target.value)); }}>
                {pageSizeOptions.map((size) => <option key={size} value={size}>{size} / page</option>)}
              </select>
            </div>

            <div className="content-body">
              <div className="settings-helper-card mb-3 d-flex align-items-center justify-content-between gap-3 flex-wrap">
                <div className="d-grid gap-1 flex-grow-1" style={{ minWidth: 0 }}>
                  <strong>{mode === 'online' ? 'Online patching' : 'Offline patching'}</strong>
                  <span>{mode === 'online' ? 'Agents scan and report update status for the selected scope.' : 'Offline patching is kept separate from the online scan and install flow.'}</span>
                </div>
                <div className="content-actions d-flex align-items-center justify-content-end gap-2 flex-wrap ms-auto">
                  <button type="button" className={cx('soft-btn text-nowrap', mode === 'online' && 'primary-btn')} onClick={() => setMode('online')}>
                    <Cloud size={15} /> Online
                  </button>
                  <button type="button" className={cx('soft-btn text-nowrap', mode === 'offline' && 'primary-btn')} onClick={() => setMode('offline')}>
                    <Server size={15} /> Offline
                  </button>
                  <button type="button" className="soft-btn text-nowrap" onClick={() => handleKpiClick('devices')}>
                    <Laptop size={15} /> {formatNumber(summary.DeviceCount)} devices
                  </button>
                  <button type="button" className="soft-btn text-nowrap" onClick={() => handleKpiClick('lastScan')}>
                    <Clock3 size={15} /> Last scan: {formatDateTime(summary.LastScanTime)}
                  </button>
                </div>
              </div>

              {mode === 'offline' ? (
                <OfflinePlaceholder />
              ) : loadingData ? (
                <div className="settings-helper-card">
                  <Loader2 className="me-2" size={18} /> Loading patch data...
                </div>
              ) : (
                <PatchTable
                  rows={currentResult.rows}
                  activeTab={activeTab}
                  page={page}
                  limit={limit}
                  onOpenDetails={openDetails}
                  onInstall={(row) => setConfirmState({ type: 'install', row })}
                />
              )}

              <footer className="uam-pagination global-style">
                <span className="uam-page-summary">Page {page} of {totalPages}</span>
                <span className="uam-page-status">{formatNumber(currentResult.totalRecords)} record(s)</span>
                <nav className="uam-pagination-controls global-style" aria-label="Patch pagination">
                  <button className="uam-page-icon" type="button" onClick={() => goToPage(1)} disabled={page <= 1} aria-label="First page"><ChevronsLeft size={14} /></button>
                  <button className="uam-page-icon" type="button" onClick={() => goToPage(page - 1)} disabled={page <= 1} aria-label="Previous page"><ChevronLeft size={14} /></button>
                  <b className="uam-page-current">{page}</b>
                  <button className="uam-page-icon" type="button" onClick={() => goToPage(page + 1)} disabled={page >= totalPages} aria-label="Next page"><ChevronRight size={14} /></button>
                  <button className="uam-page-icon" type="button" onClick={() => goToPage(totalPages)} disabled={page >= totalPages} aria-label="Last page"><ChevronsRight size={14} /></button>
                </nav>
              </footer>
            </div>
          </main>
        </section>
      </div>

      {selectedPatch && (
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
      )}

      {confirmState && (
        <ConfirmModal
          state={confirmState}
          scope={selectedScope}
          loading={actionLoading}
          onCancel={() => setConfirmState(null)}
          onConfirm={runConfirmedAction}
        />
      )}
    </main>
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
  const label = node.Object_Full_Name || node.Object_Rel_Name || `Department ${relationID}`;
  const shortLabel = node.Object_Rel_Name || label;
  const isExpanded = expanded.has(relationID);
  const isSelected = selectedScope.scope === 'relation' && selectedScope.Object_Rel_Idn === relationID;
  const children = node.children || [];
  const devices = assetsByRelation[relationID] || [];
  const isLoading = Boolean(loadingAssets[relationID]);
  const hasLoadedDevices = Object.prototype.hasOwnProperty.call(assetsByRelation, relationID);
  const Icon = isExpanded ? FolderOpen : Folder;
  const indentClass = level > 0 ? `ms-${Math.min(level, 4)}` : '';

  return (
    <div className={cx('d-grid gap-2', indentClass)}>
      <button
        className={cx('setting-btn', isSelected && 'active')}
        type="button"
        onClick={() => {
          onToggle(node);
          onSelectDepartment(node);
        }}
        title={label}
      >
        <span className="setting-icon"><Icon /></span>
        <span>
          <strong>{shortLabel}</strong>
          <small>{isExpanded ? 'Click to collapse scope' : 'Click to expand scope'}</small>
        </span>
      </button>

      {isExpanded && (
        <div className="d-grid gap-2 ms-3">
          {children.map((child) => (
            <TreeNode
              key={child.Object_Rel_Idn}
              node={child}
              level={level + 1}
              selectedScope={selectedScope}
              expanded={expanded}
              assetsByRelation={assetsByRelation}
              loadingAssets={loadingAssets}
              onToggle={onToggle}
              onSelectDepartment={onSelectDepartment}
              onSelectDevice={onSelectDevice}
            />
          ))}

          {isLoading && <div className="settings-helper-card"><Loader2 className="me-2" size={14} /> Loading devices...</div>}
          {!isLoading && hasLoadedDevices && devices.length === 0 && <div className="settings-helper-card">No devices in this scope.</div>}

          {devices.map((asset) => {
            const deviceID = getDeviceId(asset);
            const isDeviceSelected = selectedScope.scope === 'device' && selectedScope.Object_Root_Idn === deviceID;
            return (
              <button
                key={`${relationID}-${deviceID}-${getDeviceName(asset)}`}
                className={cx('setting-btn', isDeviceSelected && 'active')}
                type="button"
                onClick={() => onSelectDevice(asset, relationID)}
              >
                <span className="setting-icon"><Laptop /></span>
                <span>
                  <strong>{getDeviceName(asset)}</strong>
                  <small>{asset.IP || asset.Object_DeviceID || asset.DeviceID || 'Endpoint device'}</small>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  note,
  icon,
  color,
  attention,
  active,
  onClick,
}: {
  label: string;
  value: ReactNode;
  note: ReactNode;
  icon: ReactNode;
  color: string;
  attention?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={cx('hardware-kpi-card', color, active && 'is-active', attention && 'is-attention')}
      type="button"
      onClick={onClick}
      aria-pressed={Boolean(active)}
      title={`${label}: click to filter patch table`}
    >
      <div className="hardware-kpi-content">
        <i className="hardware-kpi-icon">{icon}</i>
        <span className="hardware-kpi-label">{label}</span>
        <strong className="hardware-kpi-value">{value}</strong>
        <small className="hardware-kpi-note">{note}</small>
      </div>
    </button>
  );
}

function PatchTable({ rows, activeTab, page, limit, onOpenDetails, onInstall }: { rows: OnlinePatchRow[]; activeTab: PatchTab; page: number; limit: number; onOpenDetails: (row: OnlinePatchRow) => void; onInstall: (row: OnlinePatchRow) => void }) {
  if (!rows.length) {
    return (
      <div className="settings-helper-card text-center py-4">
        <strong>No online patch data found</strong>
        <span>Try a different scope or run scan again.</span>
      </div>
    );
  }

  return (
    <div className="pricing-table-card table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>No.</th>
            {activeTab === 'status' && <th>Device</th>}
            <th>KB / Update</th>
            <th>Severity</th>
            <th>Release</th>
            {activeTab === 'status' && <th>Status</th>}
            {activeTab === 'status' && <th>Last Scan</th>}
            {activeTab === 'catalog' && <th>Files</th>}
            {activeTab === 'catalog' && <th>Devices</th>}
            <th className="text-end text-nowrap">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const status = getRowStatus(row);
            const canInstall = activeTab === 'status' && status === 'Missing' && Number(row.Object_Root_Idn || 0) > 0;
            const number = (page - 1) * limit + index + 1;

            return (
              <tr key={getPatchRowKey(row, index)}>
                <td><span className="row-index-pill">{number}</span></td>
                {activeTab === 'status' && (
                  <td>
                    <div className="user-name">
                      <span className="user-mini-avatar"><Laptop size={14} /></span>
                      <span>
                        <strong>{row.DeviceName || row.ComputerName || row.Object_Client_Name || '-'}</strong>
                        <small>{row.Department || row.Object_Full_Name || row.IP || '-'}</small>
                      </span>
                    </div>
                  </td>
                )}
                <td>
                  <button className="border-0 bg-transparent p-0 text-start" type="button" onClick={() => onOpenDetails(row)}>
                    <span className="user-pill info mb-1">{getKbText(row)}</span>
                    <strong className="d-block">{row.Title || 'Untitled update'}</strong>
                  </button>
                </td>
                <td><span className={`user-pill ${getSeverityPillClass(row.MsrcSeverity)}`}>{row.MsrcSeverity || 'Unspecified'}</span></td>
                <td>{formatDateOnly(row.ReleaseDate)}</td>
                {activeTab === 'status' && <td><span className={`user-pill ${getStatusPillClass(status)}`}>{status}</span></td>}
                {activeTab === 'status' && <td>{formatDateTime(row.LastScanTime)}</td>}
                {activeTab === 'catalog' && <td>{formatNumber(row.FileCount)} / {formatFileSize(row.TotalFileSize)}</td>}
                {activeTab === 'catalog' && <td>{formatNumber(row.DeviceCount)} devices</td>}
                <td className="text-end text-nowrap">
                  <div className="user-row-action-wrap clean justify-content-end flex-nowrap gap-1">
                    {canInstall && (
                      <button className="primary-btn px-3" type="button" onClick={() => onInstall(row)}>
                        <Play size={13} /> Install
                      </button>
                    )}
                    <button className="mini-btn" type="button" onClick={() => onOpenDetails(row)}>
                      <Info size={13} /> Details
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PatchDetailDrawer({ row, detail, loading, onClose, onInstall }: { row: OnlinePatchRow; detail: OnlinePatchDetail | null; loading: boolean; onClose: () => void; onInstall: (row: OnlinePatchRow) => void }) {
  const patch = detail?.patch || row;
  const status = getRowStatus(row);
  const products = Array.isArray(patch.Products) ? patch.Products : [];
  const classifications = Array.isArray(patch.Classifications) ? patch.Classifications : [];
  const canInstall = status === 'Missing' && Number(row.Object_Root_Idn || 0) > 0;

  return (
    <div className="user-modal-backdrop open">
      <section className="user-modal advanced">
        <div className="user-modal-head">
          <div>
            <span className="section-tag">Patch Detail</span>
            <h3>{getKbText(patch)} - Revision {patch.RevisionNumber || row.RevisionNumber}</h3>
            <p>{patch.Title || row.Title}</p>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <div className="user-modal-body content-body">
          {loading ? (
            <div className="settings-helper-card wide"><Loader2 className="me-2" size={18} /> Loading patch detail...</div>
          ) : (
            <>
              <section className="policy-card wide p-3">
                <div className="policy-top">
                  <div>
                    <h4>Patch Overview</h4>
                    <p>{patch.Description || 'No description available.'}</p>
                  </div>
                  <div className="content-actions">
                    <span className={`user-pill ${getSeverityPillClass(patch.MsrcSeverity)}`}>{patch.MsrcSeverity || 'Unspecified'}</span>
                    <span className={`user-pill ${getStatusPillClass(status)}`}>{status}</span>
                    {canInstall && (
                      <button className="primary-btn" type="button" onClick={() => onInstall(row)}>
                        <Play size={15} /> Install
                      </button>
                    )}
                  </div>
                </div>
              </section>

              <section className="policy-card p-3">
                <h4>Patch metadata</h4>
                <InfoGrid rows={[
                  ['UpdateID:', patch.UpdateID || row.UpdateID],
                  ['Revision:', patch.RevisionNumber || row.RevisionNumber],
                  ['Release Date:', formatDateOnly(patch.ReleaseDate)],
                  ['File Count:', formatNumber(patch.FileCount)],
                  ['Total Size:', formatFileSize(patch.TotalFileSize)],
                  ['Reboot Required:', patch.RebootRequired ? 'Yes' : 'No'],
                ]} />
              </section>

              <section className="policy-card p-3">
                <h4>Device status</h4>
                <InfoGrid rows={[
                  ['Device:', row.DeviceName || row.ComputerName || row.Object_Client_Name || '-'],
                  ['Department:', row.Department || row.Object_Full_Name || '-'],
                  ['Last Scan:', formatDateTime(row.LastScanTime)],
                  ['Last Install:', formatDateTime(row.LastInstallTime)],
                  ['Applicable:', row.IsApplicable ? 'Yes' : 'No'],
                  ['Downloaded:', row.IsDownloaded ? 'Yes' : 'No'],
                ]} />
              </section>

              <section className="policy-card p-3">
                <h4>Products & classifications</h4>
                <TagList values={[...products, ...classifications]} emptyText="No product/category data returned." />
              </section>

              <section className="policy-card p-3">
                <h4>Security references</h4>
                <TagList values={[...(patch.CVEIDs || []), ...(patch.SecurityBulletinIDs || [])]} emptyText="No CVE/security bulletin data returned." />
              </section>

              <section className="policy-card wide p-3">
                <h4>Online source files</h4>
                <div className="pricing-grid">
                  {(detail?.files || []).length ? detail?.files.map((file) => (
                    <div className="settings-helper-card" key={`${file.UpdateID}-${file.RevisionNumber}-${file.FileName}`}>
                      <strong>{file.FileName || 'Unnamed file'}</strong>
                      <span>{file.ShortLanguage || 'neutral'} - {formatFileSize(file.FileSize)}</span>
                      {file.DownloadUrl && <a className="soft-btn mt-2" href={file.DownloadUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Open</a>}
                    </div>
                  )) : <p>No file list returned.</p>}
                </div>
              </section>

              <section className="policy-card wide p-3">
                <h4>Links</h4>
                <div className="pricing-grid">
                  {patch.SupportUrl && <ExternalRow label="Support URL" url={patch.SupportUrl} />}
                  {(patch.KBArticleUrls || []).map((url) => <ExternalRow key={url} label="KB Article" url={url} />)}
                  {!patch.SupportUrl && !(patch.KBArticleUrls || []).length && <p>No support links returned.</p>}
                </div>
              </section>
            </>
          )}
        </div>

        <div className="user-modal-foot">
          <button className="soft-btn" type="button" onClick={onClose}>Close</button>
        </div>
      </section>
    </div>
  );
}

function ConfirmModal({ state, scope, loading, onCancel, onConfirm }: { state: NonNullable<ConfirmState>; scope: ScopeSelection; loading: boolean; onCancel: () => void; onConfirm: () => void }) {
  const isInstall = state.type === 'install';
  const target = isInstall
    ? state.row.DeviceName || state.row.ComputerName || state.row.Object_Client_Name || scope.label
    : scope.label;

  return (
    <div className="user-modal-backdrop open">
      <section className="settings-confirm-modal">
        <h3>{isInstall ? 'Install selected patch?' : 'Create patch scan job?'}</h3>
        <p>{isInstall ? 'This will create an install action for the selected endpoint.' : 'This will create a scan job for the selected scope.'}</p>
        <div className="settings-helper-card my-3">
          <strong>Target: {target}</strong>
          <span>{isInstall ? `${getKbText(state.row)} - ${state.row.Title}` : scope.scope === 'all' ? 'Whole company' : scope.scope === 'relation' ? 'Organization unit' : 'Device'}</span>
        </div>
        <div className="settings-confirm-actions">
          <button className="soft-btn" type="button" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className="primary-btn" type="button" onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="me-1" size={15} />}
            {isInstall ? 'Install Patch' : 'Create Scan Job'}
          </button>
        </div>
      </section>
    </div>
  );
}

function OfflinePlaceholder() {
  return (
    <div className="settings-helper-card text-center py-4">
      <strong>Offline patching is separated</strong>
      <span>Use online patching for scan and install actions from this workspace.</span>
    </div>
  );
}

function PatchToast({ toast, onClose }: { toast: NonNullable<ToastState>; onClose: () => void }) {
  const title = toast.type === 'success' ? 'Success' : toast.type === 'error' ? 'Error' : 'Info';
  const toastClass = toast.type === 'success' ? 'settings-toast-success' : toast.type === 'error' ? 'settings-toast-error' : 'settings-toast-info';
  return (
    <div className="settings-toast-layer">
      <div className={cx('settings-toast', toastClass)}>
        <span className="settings-toast-icon">{toast.type === 'success' ? '✓' : toast.type === 'error' ? '!' : 'i'}</span>
        <div>
          <strong>{title}</strong>
          <span>{toast.message}</span>
        </div>
        <button className="settings-toast-close" type="button" onClick={onClose} aria-label="Close toast"><X size={15} /></button>
      </div>
    </div>
  );
}

function InfoGrid({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <div className="pricing-grid mt-3">
      {rows.map(([label, value]) => (
        <div className="settings-helper-card" key={label}>
          <strong>{label}</strong>
          <span>{value}</span>
        </div>
      ))}
    </div>
  );
}

function TagList({ values, emptyText }: { values: string[]; emptyText: string }) {
  const cleaned = values.filter(Boolean);
  if (!cleaned.length) return <p>{emptyText}</p>;
  return (
    <div className="role-chip-stack mt-2">
      {cleaned.map((value) => <span className="user-pill info" key={value}>{value}</span>)}
    </div>
  );
}

function ExternalRow({ label, url }: { label: string; url: string }) {
  return (
    <a className="settings-helper-card text-decoration-none" href={url} target="_blank" rel="noreferrer">
      <strong>{label}</strong>
      <span>{url}</span>
      <small><ExternalLink size={15} /> Open link</small>
    </a>
  );
}

export default PatchManagement;
