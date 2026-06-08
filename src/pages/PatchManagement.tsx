import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowUpRight,
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
  useEffect(() => {
    document.documentElement.classList.add('ema-settings-page-active', 'ema-layout-lock');
    document.body.classList.add('ema-settings-page-active', 'ema-layout-lock');
    return () => {
      document.documentElement.classList.remove('ema-settings-page-active', 'ema-layout-lock');
      document.body.classList.remove('ema-settings-page-active', 'ema-layout-lock');
    };
  }, []);
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

    setExpanded((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

    loadAssetsForRelation(id);
  };

  const selectDepartment = (node: DepartmentNode) => {
    const relationID = Number(node.Object_Rel_Idn || 0);
    const label = node.Object_Full_Name || node.Object_Rel_Name || `Department ${relationID}`;
    setSelectedScope({ scope: 'relation', Object_Rel_Idn: relationID, label });
    setExpanded((current) => new Set(current).add(relationID));
    loadAssetsForRelation(relationID);
  };

  const selectDevice = (asset: AssetItem, relationID: number) => {
    const objectRootIdn = getDeviceId(asset);
    if (!objectRootIdn) {
      showToast({ type: 'error', message: 'This device does not have Object_Root_Idn, so patching action cannot be created.' });
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
        showToast({ type: 'success', message: 'Scan / Rescan Patches job created successfully.' });
      }

      if (confirmState.type === 'install') {
        const objectRootIdn = Number(confirmState.row.Object_Root_Idn || selectedScope.Object_Root_Idn || 0);
        if (!objectRootIdn) throw new Error('Object_Root_Idn is required before installing patch. Select a device or use a device status row.');

        await prepareOnlinePatchInstall({
          Object_Root_Idn: objectRootIdn,
          UpdateID: confirmState.row.UpdateID,
          RevisionNumber: Number(confirmState.row.RevisionNumber),
        });

        showToast({ type: 'success', message: 'Install Patch Online job created successfully.' });
      }

      setConfirmState(null);
      await loadPatchData();
    } catch (error) {
      showToast({ type: 'error', message: extractErrorMessage(error, 'Patch action failed. Please check backend/job tables.') });
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
    <main className="settings-module-root ema-settings-pro ema-module-root" data-section="patch-management">
      {toast && <PatchToast toast={toast} onClose={() => setToast(null)} />}

      <div className="settings-layout">
        <aside className="settings-menu ema-panel-surface">
        <div className="panel-head">
          <span>PATCH SCOPE</span>
          <strong>Patch Management</strong>
          <small>Organization, department and endpoint.</small>
        </div>

        <label className="section-search ema-sidebar-field">
          <Search size={15} />
          <input placeholder="Search tree is API-driven" readOnly />
        </label>

        <div className="settings-menu-list">
          <button className={cx('setting-btn', selectedScope.scope === 'all' && 'active')} onClick={selectOrganization} type="button">
            <span className="setting-icon"><Globe2 /></span>
            <span className="settings-menu-list-content">
              <strong>Organization</strong>
              <small>Whole company</small>
            </span>
            <span className="user-pill">ALL</span>
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

          {treeLoading && <div className="settings-helper-card"><Loader2 className="patch-spin" size={14} /> Loading hierarchy...</div>}
          {!treeLoading && departments.length === 0 && <div className="settings-helper-card">No hierarchy data returned from /departments.</div>}
        </div>

        <div className="settings-helper-card">
          <span>Selected</span>
          <strong>{selectedScope.label}</strong>
        </div>
      </aside>

        <section className="settings-content">
          <section className="settings-hero ema-panel-surface">
            <div>
              <span className="eyebrow">PATCH OPERATIONS</span>
              <h2>Patch Management</h2>
              <p>Scan, review and install endpoint patches by organization scope.</p>
            </div>
            <div className="settings-score users-hero-score">
        <KpiCard
          label="Coverage"
          value={`${patchCoverage}%`}
          note="Click: all status"
          icon={<ShieldCheck />}
          tone="green"
          active={activeKpi === 'coverage'}
          onClick={() => handleKpiClick('coverage')}
        />
        <KpiCard
          label="Applicable"
          value={formatNumber(summary.ApplicablePatches)}
          note="Click: applicable rows"
          icon={<ListChecks />}
          tone="blue"
          active={activeKpi === 'applicable'}
          onClick={() => handleKpiClick('applicable')}
        />
        <KpiCard
          label="Missing"
          value={formatNumber(summary.MissingPatches)}
          note={`${installableMissingCount} visible actions`}
          icon={<ShieldAlert />}
          tone="orange"
          active={activeKpi === 'missing' || statusFilter === 'missing'}
          onClick={() => handleKpiClick('missing')}
        />
        <KpiCard
          label="Installed"
          value={formatNumber(summary.InstalledPatches)}
          note="Click: installed only"
          icon={<PackageCheck />}
          tone="green"
          active={activeKpi === 'installed' || statusFilter === 'installed'}
          onClick={() => handleKpiClick('installed')}
        />
        <KpiCard
          label="Devices"
          value={formatNumber(summary.DeviceCount)}
          note="Click: clear filters"
          icon={<Laptop />}
          tone="purple"
          active={activeKpi === 'devices'}
          onClick={() => handleKpiClick('devices')}
        />
        <KpiCard
          label="Last Scan"
          value={formatDateTime(summary.LastScanTime)}
          note="Click: refresh data"
          icon={<Clock3 />}
          tone="cyan"
          compact
          active={activeKpi === 'lastScan'}
          onClick={() => handleKpiClick('lastScan')}
        />
            </div>
          </section>

          <section className="content-shell ema-panel-surface content-panel clean">
        <header className="content-head">
          <div>
            <span className="ema-eyebrow">EMA Online Patching</span>
            <h1>Patch Management</h1>
            <p>Mapped to TS_UPDATE_ONLINE_MASTER, FILES, STATUS, REPLACE and INSTALL_JOB flow.</p>
          </div>

          <div className="content-actions">
            <button className="soft-btn" type="button" onClick={loadPatchData} disabled={loadingData || mode !== 'online'}>
              {loadingData ? <Loader2 className="patch-spin" size={15} /> : <RefreshCw size={15} />}
              Refresh
            </button>
            <button className="primary-btn" type="button" onClick={() => setConfirmState({ type: 'scan' })} disabled={mode !== 'online'}>
              <Search size={15} />
              Scan / Rescan Patches
            </button>
          </div>
        </header>

        <section className="patch-mode-strip">
          <button type="button" className={cx('settings-helper-card', mode === 'online' && 'is-active')} onClick={() => setMode('online')}>
            <span><Cloud size={18} /></span>
            <strong>Online Patching</strong>
            <small>Agent downloads from online URLs, installs locally, then reports status.</small>
          </button>
          <button type="button" className={cx('settings-helper-card', mode === 'offline' && 'is-active')} onClick={() => setMode('offline')}>
            <span><Server size={18} /></span>
            <strong>Offline Patching</strong>
            <small>Kept separate from online scan/install flow.</small>
          </button>
          <div className="patch-scope-summary">
            <span>Current scope</span>
            <strong>{selectedScope.label}</strong>
          </div>
          <div className="patch-scope-summary">
            <span>Scope mode</span>
            <strong>{selectedScope.scope === 'all' ? 'Whole company' : selectedScope.scope === 'relation' ? 'Organization unit' : 'Individual device'}</strong>
          </div>
          <div className="patch-scope-summary">
            <span>Install rule</span>
            <strong>Missing only - no server package transfer</strong>
          </div>
        </section>

        {mode === 'offline' ? (
          <OfflinePlaceholder />
        ) : (
          <>
            <div className="patch-tabs" role="tablist" aria-label="Patch Management Views">
              <button type="button" className={activeTab === 'status' ? 'soft-btn active' : 'soft-btn'} onClick={() => setActiveTab('status')}>
                <Laptop size={15} /> Device Patch Status
              </button>
              <button type="button" className={activeTab === 'catalog' ? 'soft-btn active' : 'soft-btn'} onClick={() => setActiveTab('catalog')}>
                <Database size={15} /> Online Update Catalog
              </button>
            </div>

            <div className="content-toolbar">
              <label className="section-search">
                <Search size={15} />
                <input value={searchTerm} onChange={(event) => { setActiveKpi(null); setSearchTerm(event.target.value); }} placeholder="Search KB / title / update id" />
              </label>

              <select value={severityFilter} onChange={(event) => { setActiveKpi(null); setSeverityFilter(event.target.value); }}>
                <option value="">All severity</option>
                {severityOptions.map((severity) => <option key={severity} value={severity}>{severity}</option>)}
              </select>

              <select value={statusFilter} onChange={(event) => { setActiveKpi(null); setStatusFilter(event.target.value as OnlinePatchStatusFilter); }} disabled={activeTab === 'catalog'}>
                <option value="all">All status</option>
                <option value="missing">Missing</option>
                <option value="installed">Installed</option>
              </select>

              <select value={limit} onChange={(event) => { setActiveKpi(null); setLimit(Number(event.target.value)); }}>
                {pageSizeOptions.map((size) => <option key={size} value={size}>{size} / page</option>)}
              </select>
            </div>

            {loadingData ? (
              <div className="settings-helper-card">
                <div className="patch-loading-state"><Loader2 className="patch-spin" size={22} /> Loading patch data...</div>
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
              <div className="uam-page-summary">
                <span>Page {page} of {totalPages}</span>
              </div>

              <nav className="uam-pagination-controls global-style" aria-label="Pagination">
                <button type="button" onClick={() => goToPage(1)} disabled={page <= 1} aria-label="First page"><ChevronsLeft size={14} /></button>
                <button type="button" onClick={() => goToPage(page - 1)} disabled={page <= 1} aria-label="Previous page"><ChevronLeft size={14} /></button>
                <b>{page}</b>
                <button type="button" onClick={() => goToPage(page + 1)} disabled={page >= totalPages} aria-label="Next page"><ChevronRight size={14} /></button>
                <button type="button" onClick={() => goToPage(totalPages)} disabled={page >= totalPages} aria-label="Last page"><ChevronsRight size={14} /></button>
              </nav>
            </footer>
          </>
        )}
          </section>
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
  const isExpanded = expanded.has(relationID);
  const isSelected = selectedScope.scope === 'relation' && selectedScope.Object_Rel_Idn === relationID;
  const children = node.children || [];
  const devices = assetsByRelation[relationID] || [];
  const isLoading = Boolean(loadingAssets[relationID]);
  const hasLoadedDevices = Object.prototype.hasOwnProperty.call(assetsByRelation, relationID);
  const hasExpandableContent = children.length > 0 || !hasLoadedDevices || devices.length > 0 || isLoading;
  const Icon = isExpanded ? FolderOpen : Folder;

  return (
    <div className="patch-tree-group">
      <button
        className={cx('setting-btn', isSelected && 'active')}
        style={{ paddingLeft: level * 14 + 10 }}
        type="button"
        onClick={() => onSelectDepartment(node)}
      >
        <span className="setting-icon"><Icon /></span>
        <span className="settings-menu-list-content">
          <strong>{label}</strong>
          <small>{isLoading ? 'Loading devices...' : `${children.length} branches / ${devices.length} devices`}</small>
        </span>
        <span
          className="user-pill patch-tree-toggle"
          onClick={(event) => {
            event.stopPropagation();
            onToggle(node);
          }}
        >
          {hasExpandableContent ? (isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />) : <CircleDot size={10} />}
        </span>
      </button>

      {isExpanded && (
        <div className="patch-tree-children">
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

          {isLoading && <div className="settings-helper-card" style={{ paddingLeft: (level + 1) * 14 + 18 }}><Loader2 className="patch-spin" size={13} /> Loading devices...</div>}

          {devices.map((asset) => {
            const deviceID = getDeviceId(asset);
            const selected = selectedScope.scope === 'device' && selectedScope.Object_Root_Idn === deviceID;
            const deviceName = getDeviceName(asset);
            const isOnline = String(asset.ConnectionStatus || '').toLowerCase() === 'online';

            return (
              <button
                key={`${relationID}-${deviceID}-${deviceName}`}
                className={cx('setting-btn', selected && 'active')}
                style={{ paddingLeft: (level + 1) * 14 + 20 }}
                type="button"
                onClick={() => onSelectDevice(asset, relationID)}
              >
                <span className="setting-icon"><Laptop /></span>
                <span className="settings-menu-list-content">
                  <strong>{deviceName}</strong>
                  <small>{asset.IP || asset.Object_DeviceID || '-'}</small>
                </span>
                <span className={cx('ema-status-dot', isOnline ? 'is-online' : 'is-offline')} />
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
  tone,
  compact,
  active,
  onClick,
}: {
  label: string;
  value: ReactNode;
  note: ReactNode;
  icon: ReactNode;
  tone: 'blue' | 'green' | 'orange' | 'purple' | 'cyan';
  compact?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={cx('ema-kpi-card', `is-${tone}`, 'patch-kpi-action', active && 'is-active')}
      type="button"
      onClick={onClick}
      aria-pressed={Boolean(active)}
      title={`${label}: click to filter patch table`}
    >
      <div className="ema-kpi-content">
        <span className="ema-kpi-icon">{icon}</span>
        <span className="ema-kpi-label">{label}</span>
        <strong className={cx('ema-kpi-value', compact && 'patch-kpi-compact')}>{value}</strong>
        <small className="ema-kpi-note">{note}</small>
      </div>
    </button>
  );
}

function PatchTable({ rows, activeTab, page, limit, onOpenDetails, onInstall }: { rows: OnlinePatchRow[]; activeTab: PatchTab; page: number; limit: number; onOpenDetails: (row: OnlinePatchRow) => void; onInstall: (row: OnlinePatchRow) => void }) {
  if (!rows.length) {
    return (
      <div className="settings-helper-card">
        <div className="settings-helper-card">
          <Boxes size={40} />
          <div>
            <h3>No online patch data found</h3>
            <p>Try a different scope/filter, or run Scan / Rescan Patches so the agent can update TS_UPDATE_ONLINE_STATUS.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pricing-table-card table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th className="patch-col-no">No.</th>
            {activeTab === 'status' && <th>Device</th>}
            <th>KB / Update</th>
            <th className="patch-col-pill">Severity</th>
            <th className="patch-col-date">Release</th>
            {activeTab === 'status' && <th className="patch-col-pill">Status</th>}
            {activeTab === 'status' && <th className="patch-col-date">Last Scan</th>}
            {activeTab === 'catalog' && <th className="patch-col-date">Files</th>}
            {activeTab === 'catalog' && <th className="patch-col-date">Devices</th>}
            <th className="patch-col-actions">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const status = getRowStatus(row);
            const canInstall = activeTab === 'status' && status === 'Missing' && Number(row.Object_Root_Idn || 0) > 0;
            const number = (page - 1) * limit + index + 1;

            return (
              <tr key={getPatchRowKey(row, index)}>
                <td className="patch-col-no"><span className="row-index-pill">{number}</span></td>
                {activeTab === 'status' && (
                  <td>
                    <strong className="patch-primary-text">{row.DeviceName || row.ComputerName || row.Object_Client_Name || '-'}</strong>
                    <small className="patch-muted-text">{row.Department || row.Object_Full_Name || row.IP || '-'}</small>
                  </td>
                )}
                <td>
                  <button className="patch-table-link" type="button" onClick={() => onOpenDetails(row)}>
                    <span>{getKbText(row)}</span>
                    <strong>{row.Title || 'Untitled update'}</strong>
                  </button>
                </td>
                <td><span className={`user-pill ${getSeverityPillClass(row.MsrcSeverity)}`}>{row.MsrcSeverity || 'Unspecified'}</span></td>
                <td>{formatDateOnly(row.ReleaseDate)}</td>
                {activeTab === 'status' && <td><span className={`user-pill ${getStatusPillClass(status)}`}>{status}</span></td>}
                {activeTab === 'status' && <td>{formatDateTime(row.LastScanTime)}</td>}
                {activeTab === 'catalog' && <td>{formatNumber(row.FileCount)} / {formatFileSize(row.TotalFileSize)}</td>}
                {activeTab === 'catalog' && <td>{formatNumber(row.DeviceCount)} devices</td>}
                <td>
                  <div className="ema-row-actions patch-row-actions">
                    {canInstall && (
                      <button className="primary-btn" type="button" onClick={() => onInstall(row)}>
                        <Play size={13} /> Install
                      </button>
                    )}
                    <button className="soft-btn" type="button" onClick={() => onOpenDetails(row)}>
                      <Info size={13} /> Details
                    </button>
                    {Array.isArray(row.KBArticleUrls) && row.KBArticleUrls[0] && (
                      <a className="soft-btn" href={row.KBArticleUrls[0]} target="_blank" rel="noreferrer">
                        <ArrowUpRight size={13} /> KB
                      </a>
                    )}
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
      <section className="user-modal advanced patch-detail-drawer">
        <div className="user-modal-head">
          <div>
            <span>Patch Detail</span>
            <h2>{getKbText(patch)} - Revision {patch.RevisionNumber || row.RevisionNumber}</h2>
            <p>{patch.Title || row.Title}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <div className="user-modal-body">
          {loading ? (
            <div className="patch-loading-state"><Loader2 className="patch-spin" size={22} /> Loading patch detail...</div>
          ) : (
            <>
              <section className="policy-card">
                <div className="patch-detail-title-row">
                  <div className="patch-pill-row">
                    <span className={`user-pill ${getSeverityPillClass(patch.MsrcSeverity)}`}>{patch.MsrcSeverity || 'Unspecified'}</span>
                    <span className={`user-pill ${getStatusPillClass(status)}`}>{status}</span>
                  </div>
                  {canInstall && (
                    <button className="primary-btn" type="button" onClick={() => onInstall(row)}>
                      <Play size={15} /> Install Missing Patch
                    </button>
                  )}
                </div>
                <p className="patch-description">{patch.Description || 'No description returned from patch catalog.'}</p>
              </section>

              <section className="policy-card">
                <h3>Patch metadata</h3>
                <InfoGrid rows={[
                  ['UpdateID', patch.UpdateID || row.UpdateID],
                  ['Revision', patch.RevisionNumber || row.RevisionNumber],
                  ['Release Date', formatDateOnly(patch.ReleaseDate)],
                  ['File Count', formatNumber(patch.FileCount)],
                  ['Total Size', formatFileSize(patch.TotalFileSize)],
                  ['Reboot Required', patch.RebootRequired ? 'Yes' : 'No'],
                ]} />
              </section>

              <section className="policy-card">
                <h3>Device status</h3>
                <InfoGrid rows={[
                  ['Device', row.DeviceName || row.ComputerName || row.Object_Client_Name || '-'],
                  ['Department', row.Department || row.Object_Full_Name || '-'],
                  ['Last Scan', formatDateTime(row.LastScanTime)],
                  ['Last Install', formatDateTime(row.LastInstallTime)],
                  ['Applicable', row.IsApplicable ? 'Yes' : 'No'],
                  ['Downloaded', row.IsDownloaded ? 'Yes' : 'No'],
                ]} />
              </section>

              <section className="policy-card">
                <h3>Products & classifications</h3>
                <TagList values={[...products, ...classifications]} emptyText="No product/category data returned." />
              </section>

              <section className="policy-card">
                <h3>Security references</h3>
                <TagList values={[...(patch.CVEIDs || []), ...(patch.SecurityBulletinIDs || [])]} emptyText="No CVE/security bulletin data returned." />
              </section>

              <section className="policy-card">
                <h3>Online source files</h3>
                <div className="patch-file-list">
                  {(detail?.files || []).length ? detail?.files.map((file) => (
                    <div key={`${file.UpdateID}-${file.RevisionNumber}-${file.FileName}`}>
                      <FileDown size={16} />
                      <span>
                        <strong>{file.FileName || 'Unnamed file'}</strong>
                        <small>{file.ShortLanguage || 'neutral'} - {formatFileSize(file.FileSize)}</small>
                      </span>
                      {file.DownloadUrl && <a href={file.DownloadUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} /></a>}
                    </div>
                  )) : <p>No file list returned. Check TS_UPDATE_ONLINE_FILES for this UpdateID/RevisionNumber.</p>}
                </div>
              </section>

              <section className="policy-card">
                <h3>Links</h3>
                <div className="patch-link-list">
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
    <div className="settings-confirm-backdrop open">
      <section className="settings-confirm-modal is-info">
        <button className="modal-close" type="button" onClick={onCancel} aria-label="Close"><X size={17} /></button>
        <div className="pricing-confirm-icon">{isInstall ? <Play size={28} /> : <RefreshCw size={28} />}</div>
        <span className="eyebrow">Patch Job</span>
        <h2>{isInstall ? 'Create Install Patch Online job?' : 'Create Scan / Rescan Patches job?'}</h2>
        <p>{isInstall ? 'The backend will create Job_Type 10700, Job_Command 1640 and selectedUpdates for the agent.' : 'The backend will create Job_Type 10700, Job_Command 1630 for the selected scope.'}</p>
        <div className="settings-helper-card">
          <strong>Target:</strong> {target}
          {isInstall ? <><br /><strong>Patch:</strong> {getKbText(state.row)} - {state.row.Title}</> : <><br /><strong>Scope:</strong> {scope.scope === 'all' ? 'Whole company' : scope.scope === 'relation' ? 'Organization unit' : 'Device'}</>}
        </div>
        <div className="settings-confirm-actions">
          <button className="soft-btn" type="button" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className="primary-btn" type="button" onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="patch-spin" size={15} />}
            {isInstall ? 'Install Patch' : 'Create Scan Job'}
          </button>
        </div>
      </section>
    </div>
  );
}

function OfflinePlaceholder() {
  return (
    <div className="settings-helper-card">
      <div className="settings-helper-card patch-offline-state">
        <Server size={42} />
        <div>
          <h3>Offline patching is separated from online flow</h3>
          <p>This UI keeps offline patching isolated so online scan/install does not mix with legacy package-transfer flow.</p>
        </div>
      </div>
    </div>
  );
}

function PatchToast({ toast, onClose }: { toast: NonNullable<ToastState>; onClose: () => void }) {
  const title = toast.type === 'success' ? 'Success' : toast.type === 'error' ? 'Error' : 'Info';
  return (
    <div className={`settings-toast settings-toast-${toast.type}`}>
      <i>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '!' : 'i'}</i>
      <div>
        <strong>{title}</strong>
        <span>{toast.message}</span>
      </div>
      <button type="button" onClick={onClose} aria-label="Close toast"><X size={15} /></button>
    </div>
  );
}

function InfoGrid({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <div className="form-grid">
      {rows.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function TagList({ values, emptyText }: { values: string[]; emptyText: string }) {
  const cleaned = values.filter(Boolean);
  if (!cleaned.length) return <p className="patch-description">{emptyText}</p>;
  return (
    <div className="role-chip-stack">
      {cleaned.map((value) => <span className="user-pill is-blue" key={value}>{value}</span>)}
    </div>
  );
}

function ExternalRow({ label, url }: { label: string; url: string }) {
  return (
    <a className="settings-helper-card" href={url} target="_blank" rel="noreferrer">
      <span>
        <strong>{label}</strong>
        <small>{url}</small>
      </span>
      <ExternalLink size={15} />
    </a>
  );
}

export default PatchManagement;
