import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  FileArchive,
  FileText,
  FolderClosed,
  FolderOpen,
  HardDrive,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  Send,
  Server,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import softwareDistributionService from '../services/softwareDistributionService';
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

type PackageStatus = 'Ready' | 'Draft' | 'Deployed' | 'Archived';
type DeliveryMethod = 'onprem' | 'cloud' | 'network';
type SortKey = 'name' | 'version' | 'status' | 'registeredDate' | 'targetCount' | 'owner';
type SortDirection = 'asc' | 'desc';

type PackageRecord = {
  id: string;
  name: string;
  version: string;
  description: string;
  status: PackageStatus;
  owner: string;
  destinationDirectory: string;
  registeredDate: string;
  fileCount: number;
  sizeBeforeCompression: string;
  sizeAfterCompression: string;
  excludeOS: number;
  remoteExecuteFile: number;
  lastDeployment: string;
  targetCount: number;
  versions: string[];
  lastDeliveryMethod: DeliveryMethod | 'mixed' | '-';
};

type TargetDevice = {
  id: string;
  name: string;
  department: string;
  ip: string;
  os: string;
  status: 'Online' | 'Offline';
  objectDeviceId?: string;
  objectAgent?: string;
  assetId?: string | number;
};

type ModalState =
  | { type: 'new' }
  | { type: 'send'; packageIds: string[] }
  | { type: 'delete'; packageIds: string[] }
  | { type: 'deleteVersion'; packageId: string; version: string }
  | null;

type CreatePackagePayload = {
  name: string;
  description: string;
  owner: string;
  destinationDirectory: string;
  osname: string;
  exclude: number;
  keepParentDirectories: number;
  sourcePath: string;
  cmdline: string;
  executionOrder: string;
  fileVersion: string;
  files: File[];
};

const PAGE_SIZE = 10;
const TREE_PAGE_SIZE = 15;

const deliveryMethodLabels: Record<DeliveryMethod | 'mixed' | '-', string> = {
  onprem: 'On-Prem',
  cloud: 'Cloud',
  network: 'Network',
  mixed: 'Mixed',
  '-': '-',
};

const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-100 disabled:text-slate-400';
const labelClass = 'text-[11px] font-black uppercase tracking-[0.14em] text-slate-500';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function formatBytesFromApi(value: unknown) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function normalizeApiDate(value: unknown) {
  if (!value) return '-';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 16).replace('T', ' ');
}

function formatDate(value: string) {
  if (!value || value === '-') return '-';
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-MY', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizePackageRecord(row: any): PackageRecord {
  const name = row.name || row.pkg_Name || row.Pkg_Name || row.PKG_Name || row.packageName || '-';
  const id = String(row.id || row.pkg_Idn || row.Pkg_Idn || row.PKG_Idn || name);
  const versionValue = row.version || row.pkg_Version || row.Pkg_Version || row.PKG_Version || 1;
  const statusValue = row.status || row.Status || (Number(row.pkg_bDeleted || row.Pkg_bDeleted || 0) === 1 ? 'Archived' : 'Ready');
  const status: PackageStatus = ['Ready', 'Draft', 'Deployed', 'Archived'].includes(statusValue) ? statusValue : 'Ready';
  const rawVersions = row.versions || row.pkg_AllVersions || row.Pkg_AllVersions || row.allVersions;
  const versions = Array.isArray(rawVersions)
    ? rawVersions.map((item) => (String(item).startsWith('VER_') ? String(item) : `VER_${item}`))
    : [`VER_${String(versionValue).replace(/^v/i, '')}`];

  return {
    id,
    name,
    version: String(versionValue).startsWith('v') ? String(versionValue) : `v${versionValue}`,
    description: row.description || row.pkg_Description || row.PKG_Info || row.Pkg_Info || 'Software distribution package.',
    status,
    owner: String(row.owner || row.pkg_Owner || row.Pkg_Owner || 'system'),
    destinationDirectory: row.destinationDirectory || row.pkg_File_CTDir || row.Pkg_File_CTDir || row.destination_path || '-',
    registeredDate: normalizeApiDate(row.registeredDate || row.pkg_ChangedDate || row.Pkg_ChangedDate || row.createdAt),
    fileCount: Number(row.fileCount || row.FileCount || row.file_count || 0),
    sizeBeforeCompression: row.sizeBeforeCompression || formatBytesFromApi(row.sizeBefore || row.SizeBefore || row.Pkg_File_OSize),
    sizeAfterCompression: row.sizeAfterCompression || formatBytesFromApi(row.sizeAfter || row.SizeAfter || row.Pkg_File_ZSize),
    excludeOS: Number(row.excludeOS || row.Exclude || row.exclude || 0),
    remoteExecuteFile: Number(row.remoteExecuteFile || row.RemoteExecuteFile || 0),
    lastDeployment: normalizeApiDate(row.lastDeployment || row.LastDeployment),
    targetCount: Number(row.targetCount || row.TargetCount || 0),
    versions,
    lastDeliveryMethod: row.lastDeliveryMethod || '-',
  };
}

function normalizeTargetDevice(row: any): TargetDevice {
  const objectDeviceId = row.objectDeviceId || row.Object_DeviceID || row.DeviceID || row.deviceID || '';
  const id = String(row.id || row._Idn || row.assetId || objectDeviceId || row.ComputerName || Date.now());
  const statusText = String(row.status || row.ConnectionStatus || row.connectionStatus || 'Offline').toLowerCase();

  return {
    id,
    name: row.name || row.ComputerName || row.DeviceName || row.computerName || '-',
    department: row.department || row.Object_Full_Name || row.objectFullName || '-',
    ip: row.ip || row.IP || row.DeviceIPAddress || row.DeviceLocalIPAddress || '-',
    os: row.os || row.PlatformType || row.MachineType || 'Unknown',
    status: statusText === 'online' || statusText === '1' ? 'Online' : 'Offline',
    objectDeviceId,
    objectAgent: row.objectAgent || row.Object_Agent,
    assetId: row.assetId || row._Idn,
  };
}

async function fetchPackagesFromApi() {
  const rows = await softwareDistributionService.getPackages();
  return rows.map(normalizePackageRecord);
}

async function fetchTargetsFromApi() {
  const rows = await softwareDistributionService.getTargets();
  return rows.map(normalizeTargetDevice);
}

async function createPackageViaApi(payload: CreatePackagePayload) {
  const formData = new FormData();
  formData.append('pkg_Name', payload.name);
  formData.append('pkg_Description', payload.description || payload.name);
  formData.append('destination_path', payload.destinationDirectory || 'C:\\');
  formData.append('osname', payload.osname || '');
  formData.append('exclude', String(payload.exclude));
  formData.append('keep_parent_directories', String(payload.keepParentDirectories));
  formData.append('pkg_Owner', String(Number(payload.owner) || 1));

  payload.files.forEach((file) => {
    formData.append('files', file);
    formData.append('source_paths', payload.sourcePath || 'C:\\PackageSource');
    formData.append('cmdlines', payload.cmdline || '');
    formData.append('execution_orders', payload.executionOrder || '0');
    formData.append('pkg_File_Versions', payload.fileVersion || '');
  });

  return softwareDistributionService.createPackage(formData);
}

async function deployPackagesViaApi(packages: PackageRecord[], targets: TargetDevice[], _method: DeliveryMethod, scheduleType: 'now' | 'schedule') {
  const validTargets = targets.filter((device) => Boolean(device.objectDeviceId || device.id));
  if (!validTargets.length) throw new Error('Please select at least one target device.');

  const target = validTargets.map((device) => ({
    type: 2,
    value: String(device.objectDeviceId || device.id),
  }));

  const results = [];
  for (const packageItem of packages) {
    const owner = Number(packageItem.owner);
    const body = {
      Pkg_Name: packageItem.name,
      Pkg_Owner: Number.isFinite(owner) ? owner : 0,
      Job_Style: scheduleType === 'schedule' ? 3 : 0,
      distribution_option: 0,
      Job_StartTime: '',
      Job_EndTime: '',
      Job_ScheduleTime: '',
      Job_Priority: 0,
      Job_Description: `Software Distribution from EMA UI - ${packageItem.name}`,
      target,
    };

    const response = await softwareDistributionService.sendPackage(body);
    results.push({ packageName: packageItem.name, request: body, response });
  }

  return { success: true, totalRecords: results.length, targetRecords: validTargets.length, data: results };
}

async function deletePackageViaApi(packageName: string) {
  return softwareDistributionService.deletePackage(packageName);
}

async function deletePackageVersionViaApi(packageName: string, version: string) {
  const versionNumber = String(version).replace(/^VER_/i, '').replace(/^v/i, '');
  return softwareDistributionService.deletePackageVersion(packageName, versionNumber);
}

function isDeployable(item: PackageRecord) {
  return item.status !== 'Archived';
}

function statusBadgeClass(status: PackageStatus) {
  if (status === 'Ready') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'Deployed') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (status === 'Draft') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function deviceStatusClass(status: TargetDevice['status']) {
  return status === 'Online' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-700';
}

function SortHeader({ label, active, direction, onClick }: { label: string; active: boolean; direction: SortDirection; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-left">
      <span>{label}</span>
      <span className="text-[10px] text-slate-400">{active ? (direction === 'asc' ? '↑' : '↓') : '↕'}</span>
    </button>
  );
}

function ModalShell({ title, description, children, footer, onClose, maxWidth = 'max-w-5xl' }: { title: ReactNode; description?: ReactNode; children: ReactNode; footer?: ReactNode; onClose: () => void; maxWidth?: string }) {
  const node = (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div className={cx('flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl', maxWidth)} onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-slate-950">{title}</h2>
            {description ? <p className="mt-1 text-sm font-semibold text-slate-500">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-950">
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>
        {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 p-4">{footer}</div> : null}
      </div>
    </div>
  );

  if (typeof document === 'undefined') return node;
  return createPortal(node, document.body);
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <div className="mt-1">{children}</div>
      {hint ? <small className="mt-1 block text-xs font-semibold text-slate-500">{hint}</small> : null}
    </label>
  );
}

function NewPackageModal({ onClose, onCreate }: { onClose: () => void; onCreate: (payload: CreatePackagePayload) => void }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    owner: '1',
    destinationDirectory: 'C:\\PackageDestination',
    sourcePath: 'C:\\PackageSource',
    cmdline: '',
    executionOrder: '3',
    fileVersion: '',
    osname: '',
    exclude: -1,
    keepParentDirectories: 0,
  });
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canCreate = form.name.trim().length > 0 && form.destinationDirectory.trim().length > 0 && files.length > 0;

  const create = () => {
    if (!canCreate) return;
    onCreate({
      name: form.name.trim(),
      description: form.description.trim() || form.name.trim(),
      owner: form.owner.trim() || '1',
      destinationDirectory: form.destinationDirectory.trim() || 'C:\\',
      osname: form.osname.trim(),
      exclude: Number(form.exclude),
      keepParentDirectories: Number(form.keepParentDirectories),
      sourcePath: form.sourcePath.trim() || 'C:\\PackageSource',
      cmdline: form.cmdline,
      executionOrder: form.executionOrder || '0',
      fileVersion: form.fileVersion,
      files,
    });
  };

  return (
    <ModalShell
      title="New Package"
      description="Create a new software distribution package."
      onClose={onClose}
      maxWidth="max-w-4xl"
      footer={
        <>
          <EmaButton onClick={onClose}>Cancel</EmaButton>
          <EmaButton variant="primary" disabled={!canCreate} onClick={create}>Create Package</EmaButton>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Package Name">
          <input className={inputClass} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Google Chrome Enterprise" />
        </Field>
        <Field label="Owner Console ID">
          <input className={inputClass} value={form.owner} onChange={(event) => setForm((current) => ({ ...current, owner: event.target.value }))} />
        </Field>
        <div className="lg:col-span-2">
          <Field label="Description">
            <textarea className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Package description" />
          </Field>
        </div>
        <Field label="Destination Directory" hint="Install path on target device.">
          <input className={inputClass} value={form.destinationDirectory} onChange={(event) => setForm((current) => ({ ...current, destinationDirectory: event.target.value }))} placeholder="C:\\PackageDestination" />
        </Field>
        <Field label="Source Path" hint="Applied to all files unless individually mapped.">
          <input className={inputClass} value={form.sourcePath} onChange={(event) => setForm((current) => ({ ...current, sourcePath: event.target.value }))} placeholder="C:\\PackageSource" />
        </Field>
        <Field label="Command Line">
          <input className={inputClass} value={form.cmdline} onChange={(event) => setForm((current) => ({ ...current, cmdline: event.target.value }))} placeholder="/quiet" />
        </Field>
        <Field label="File Version">
          <input className={inputClass} value={form.fileVersion} onChange={(event) => setForm((current) => ({ ...current, fileVersion: event.target.value }))} placeholder="optional" />
        </Field>
        <Field label="Execution Order">
          <select className={inputClass} value={form.executionOrder} onChange={(event) => setForm((current) => ({ ...current, executionOrder: event.target.value }))}>
            <option value="0">0 - No execution</option>
            <option value="1">1 - Execute before distribution</option>
            <option value="3">3 - Execute after distribution</option>
          </select>
        </Field>
        <Field label="Exclude">
          <select className={inputClass} value={form.exclude} onChange={(event) => setForm((current) => ({ ...current, exclude: Number(event.target.value) }))}>
            <option value={-1}>-1 - Default</option>
            <option value={0}>0 - Include</option>
            <option value={1}>1 - Exclude</option>
          </select>
        </Field>
        <Field label="OS Name">
          <input className={inputClass} value={form.osname} onChange={(event) => setForm((current) => ({ ...current, osname: event.target.value }))} placeholder="optional" />
        </Field>
        <Field label="Keep Parent Directories">
          <select className={inputClass} value={form.keepParentDirectories} onChange={(event) => setForm((current) => ({ ...current, keepParentDirectories: Number(event.target.value) }))}>
            <option value={0}>No</option>
            <option value={1}>Yes</option>
          </select>
        </Field>
        <div className="lg:col-span-2">
          <input ref={fileInputRef} type="file" multiple hidden onChange={(event) => setFiles(Array.from(event.target.files || []))} />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="flex w-full items-center justify-center gap-3 rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 p-6 text-center text-blue-700 transition hover:border-blue-300 hover:bg-blue-50">
            <UploadCloud size={24} />
            <span className="text-left">
              <strong className="block text-sm font-black">{files.length ? `${files.length} file(s) selected` : 'Select package files'}</strong>
              <span className="text-xs font-semibold">Click here to choose package files.</span>
            </span>
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function DeployPackageModal({ packages, targetDevices, onClose, onDeploy }: { packages: PackageRecord[]; targetDevices: TargetDevice[]; onClose: () => void; onDeploy: (selectedTargets: TargetDevice[], method: DeliveryMethod, scheduleType: 'now' | 'schedule') => void }) {
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [excludedDevices, setExcludedDevices] = useState<Set<string>>(new Set());
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(new Set());
  const [targetView, setTargetView] = useState<'organization' | 'os'>('organization');
  const [includeLowerDepartment, setIncludeLowerDepartment] = useState(true);
  const [targetSearch, setTargetSearch] = useState('');
  const [targetStatus, setTargetStatus] = useState<'All' | 'Online' | 'Offline'>('All');
  const [targetOs, setTargetOs] = useState('All');
  const [scheduleType, setScheduleType] = useState<'now' | 'schedule'>('now');
  const [scheduleTime, setScheduleTime] = useState('');
  const [page, setPage] = useState(1);
  const method: DeliveryMethod = 'onprem';
  const pageSize = 10;

  const scopeGroups = useMemo(() => {
    const groupMap = new Map<string, TargetDevice[]>();
    targetDevices.forEach((device) => {
      const key = targetView === 'os' ? device.os : device.department;
      const current = groupMap.get(key) || [];
      current.push(device);
      groupMap.set(key, current);
    });

    return Array.from(groupMap.entries()).map(([name, devices]) => ({
      id: `${targetView}:${name}`,
      name,
      type: targetView === 'os' ? 'Operating System' : 'Department',
      count: devices.length,
      devices,
    }));
  }, [targetDevices, targetView]);

  const selectedScopeDevices = useMemo(() => {
    const scopeDeviceIds = new Set<string>();
    const selectedScopeNames = scopeGroups.filter((scope) => selectedScopes.has(scope.id)).map((scope) => scope.name);
    if (selectedScopeNames.length === 0) return scopeDeviceIds;

    if (targetView === 'organization' && includeLowerDepartment) {
      targetDevices.forEach((device) => {
        const isInSelectedScope = selectedScopeNames.some((scopeName) =>
          device.department === scopeName || device.department.startsWith(`${scopeName}\\`) || device.department.startsWith(`${scopeName}/`)
        );
        if (isInSelectedScope) scopeDeviceIds.add(device.id);
      });
      return scopeDeviceIds;
    }

    scopeGroups.forEach((scope) => {
      if (selectedScopes.has(scope.id)) scope.devices.forEach((device) => scopeDeviceIds.add(device.id));
    });
    return scopeDeviceIds;
  }, [scopeGroups, selectedScopes, targetDevices, targetView, includeLowerDepartment]);

  const includedTargetIds = useMemo(() => {
    const ids = new Set<string>();
    selectedScopeDevices.forEach((id) => ids.add(id));
    selectedDevices.forEach((id) => ids.add(id));
    excludedDevices.forEach((id) => ids.delete(id));
    return ids;
  }, [selectedScopeDevices, selectedDevices, excludedDevices]);

  const includedTargetList = useMemo(() => targetDevices.filter((device) => includedTargetIds.has(device.id)), [targetDevices, includedTargetIds]);
  const excludedTargetList = useMemo(() => targetDevices.filter((device) => excludedDevices.has(device.id)), [targetDevices, excludedDevices]);

  const osOptions = useMemo(() => Array.from(new Set(targetDevices.map((device) => device.os).filter(Boolean))), [targetDevices]);
  const filteredTargets = useMemo(() => {
    const keyword = targetSearch.trim().toLowerCase();
    const hasScopeFilter = selectedScopes.size > 0;

    return targetDevices.filter((device) => {
      const text = [device.name, device.department, device.ip, device.os, device.status].join(' ').toLowerCase();
      const matchesScope = !hasScopeFilter || selectedScopeDevices.has(device.id);
      const matchesSearch = !keyword || text.includes(keyword);
      const matchesStatus = targetStatus === 'All' || device.status === targetStatus;
      const matchesOs = targetOs === 'All' || device.os === targetOs;
      return matchesScope && matchesSearch && matchesStatus && matchesOs;
    });
  }, [targetDevices, targetSearch, targetStatus, targetOs, selectedScopes, selectedScopeDevices]);

  const totalPages = Math.max(1, Math.ceil(filteredTargets.length / pageSize));
  const pageRows = filteredTargets.slice((page - 1) * pageSize, page * pageSize);
  const allPageSelected = pageRows.length > 0 && pageRows.every((device) => selectedDevices.has(device.id));

  const finalTargetCount = includedTargetIds.size;
  const selectedScopeCount = selectedScopes.size;
  const manualUserCount = selectedDevices.size;
  const excludedUserCount = excludedDevices.size;

  const packageStatusSummary = useMemo(() => packages.reduce((summary, item) => {
    summary.total += 1;
    if (item.status === 'Ready') summary.ready += 1;
    if (item.status === 'Deployed') summary.deployed += 1;
    if (item.status === 'Draft') summary.draft += 1;
    if (item.status === 'Archived') summary.archived += 1;
    return summary;
  }, { total: 0, ready: 0, deployed: 0, draft: 0, archived: 0 }), [packages]);

  function switchTargetView(view: 'organization' | 'os') {
    setTargetView(view);
    setSelectedScopes(new Set());
    setPage(1);
  }

  function toggleScope(id: string) {
    setSelectedScopes((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setPage(1);
  }

  function toggleManualUser(id: string) {
    setSelectedDevices((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleExcludedUser(id: string) {
    setExcludedDevices((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage() {
    setSelectedDevices((current) => {
      const next = new Set(current);
      if (allPageSelected) pageRows.forEach((device) => next.delete(device.id));
      else pageRows.forEach((device) => next.add(device.id));
      return next;
    });
  }

  return (
    <ModalShell
      title="Deploy Package"
      description={`${packages.length} package(s) selected. Choose target devices before deployment.`}
      onClose={onClose}
      maxWidth="max-w-[1400px]"
      footer={
        <>
          <EmaButton onClick={onClose}>Cancel</EmaButton>
          <EmaButton variant="primary" disabled={!includedTargetList.length} onClick={() => onDeploy(includedTargetList, method, scheduleType)}>
            <Send size={15} />
            Deploy Package
          </EmaButton>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_280px]">
        {/* Left Column */}
        <div className="flex flex-col gap-4 min-h-0">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shrink-0">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Selected Packages</p>
            {packages.length > 1 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {packageStatusSummary.ready > 0 && <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">Ready {packageStatusSummary.ready}</span>}
                {packageStatusSummary.deployed > 0 && <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">Deployed {packageStatusSummary.deployed}</span>}
                {packageStatusSummary.draft > 0 && <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">Draft {packageStatusSummary.draft}</span>}
              </div>
            ) : null}
            <div className="mt-3 space-y-2 max-h-[140px] overflow-y-auto pr-1">
              {packages.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <strong className="block truncate text-sm font-black text-slate-900" title={item.name}>{item.name}</strong>
                  <span className="mt-1 block text-xs font-semibold text-slate-500">{item.version} • {item.status}</span>
                </div>
              ))}
            </div>
            {packages.some((item) => item.status === 'Deployed') && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm font-bold text-blue-700">
                <ShieldCheck size={16} className="shrink-0" />
                <span>Some selected packages are already deployed and will be redeployed.</span>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 flex-1 flex flex-col min-h-0">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Scope Selection</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => switchTargetView('organization')} className={cx('flex-1 rounded-lg border px-2 py-1.5 text-xs font-black transition', targetView === 'organization' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>Organization</button>
              <button type="button" onClick={() => switchTargetView('os')} className={cx('flex-1 rounded-lg border px-2 py-1.5 text-xs font-black transition', targetView === 'os' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>OS</button>
            </div>
            {targetView === 'organization' && (
              <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={includeLowerDepartment} onChange={(e) => { setIncludeLowerDepartment(e.target.checked); setPage(1); }} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <span>Include Lower Dept</span>
              </label>
            )}
            <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1">
              {scopeGroups.length > 0 ? scopeGroups.map((scope) => (
                <label key={scope.id} className="flex items-center gap-2 rounded-xl border border-slate-100 p-2 hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={selectedScopes.has(scope.id)} onChange={() => toggleScope(scope.id)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  <span className="flex-1 min-w-0 text-sm">
                    <strong className="block truncate font-black text-slate-900" title={scope.name}>{scope.name}</strong>
                    <span className="block text-[10px] uppercase font-bold text-slate-500">{scope.type}</span>
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-600">{scope.count}</span>
                </label>
              )) : (
                <div className="text-center text-sm font-bold text-slate-500 py-4">No scope available</div>
              )}
            </div>
          </div>
        </div>

        {/* Middle Column */}
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white flex flex-col min-h-0">
          <div className="border-b border-slate-200 p-3 shrink-0">
            <EmaToolbar
              search={<EmaSearchInput value={targetSearch} onChange={(value) => { setTargetSearch(value); setPage(1); }} placeholder="Search device, IP, branch..." />}
              filters={
                <>
                  <EmaFilterField label="Status">
                    <select className={inputClass} value={targetStatus} onChange={(event) => { setTargetStatus(event.target.value as 'All' | 'Online' | 'Offline'); setPage(1); }}>
                      <option value="All">All status</option>
                      <option value="Online">Online</option>
                      <option value="Offline">Offline</option>
                    </select>
                  </EmaFilterField>
                  <EmaFilterField label="OS">
                    <select className={inputClass} value={targetOs} onChange={(event) => { setTargetOs(event.target.value); setPage(1); }}>
                      <option value="All">All OS</option>
                      {osOptions.map((os) => <option key={os} value={os}>{os}</option>)}
                    </select>
                  </EmaFilterField>
                </>
              }
            />
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <EmaTable
              loading={false}
              rows={pageRows}
              getRowKey={(row) => row.id}
              emptyText="No target device found."
              columns={[
                {
                  key: 'select',
                  header: <input type="checkbox" checked={allPageSelected} onChange={togglePage} className="rounded border-slate-300" />,
                  width: '48px',
                  render: (row) => <input type="checkbox" checked={selectedDevices.has(row.id)} onChange={() => toggleManualUser(row.id)} className="rounded border-slate-300" />,
                },
                {
                  key: 'device',
                  header: 'Device',
                  render: (row) => <div><strong className="block font-black text-slate-900">{row.name}</strong><span className="block text-xs font-semibold text-slate-500">{row.id} • {row.objectAgent || '-'}</span></div>,
                },
                { key: 'branch', header: 'Branch', render: (row) => row.department },
                { key: 'ip', header: 'IP Address', render: (row) => row.ip },
                { key: 'os', header: 'OS', render: (row) => row.os },
                { key: 'status', header: 'Status', render: (row) => <span className={cx('inline-flex rounded-full border px-3 py-1 text-xs font-black', deviceStatusClass(row.status))}>{row.status}</span> },
                {
                  key: 'exclude',
                  header: 'Action',
                  align: 'right',
                  render: (row) => (
                    <button type="button" onClick={() => toggleExcludedUser(row.id)} className={cx('rounded-lg border px-2.5 py-1 text-xs font-black transition', excludedDevices.has(row.id) ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
                      {excludedDevices.has(row.id) ? 'Excluded' : 'Exclude'}
                    </button>
                  ),
                }
              ]}
            />
          </div>
          <EmaPagination page={page} totalPages={totalPages} totalLabel={`${filteredTargets.length} target(s)`} onPageChange={setPage} />
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-4 min-h-0">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shrink-0">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Deployment Option</p>
            <div className="mt-3 grid gap-2">
              <button type="button" onClick={() => setScheduleType('now')} className={cx('rounded-xl border px-3 py-2 text-sm font-black transition', scheduleType === 'now' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>Send Now</button>
              <button type="button" onClick={() => setScheduleType('schedule')} className={cx('rounded-xl border px-3 py-2 text-sm font-black transition', scheduleType === 'schedule' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>Schedule</button>
            </div>
            {scheduleType === 'schedule' ? <input type="datetime-local" className={cx(inputClass, 'mt-3')} value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} /> : null}

            <div className="mt-4 space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer"><input type="checkbox" defaultChecked className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" /> <span>Force installation</span></label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer"><input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" /> <span>Reboot after installation</span></label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer"><input type="checkbox" defaultChecked className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" /> <span>Notify user</span></label>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex-1 flex flex-col min-h-0">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Target Summary</p>
            <div className="mt-3 grid grid-cols-2 gap-2 shrink-0">
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-2 text-center">
                <span className="text-[10px] font-black uppercase text-blue-600">Final</span>
                <strong className="block text-lg font-black text-blue-900">{finalTargetCount}</strong>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-2 text-center">
                <span className="text-[10px] font-black uppercase text-slate-500">Scopes</span>
                <strong className="block text-lg font-black text-slate-900">{selectedScopeCount}</strong>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-2 text-center">
                <span className="text-[10px] font-black uppercase text-slate-500">Manual</span>
                <strong className="block text-lg font-black text-slate-900">{manualUserCount}</strong>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-2 text-center">
                <span className="text-[10px] font-black uppercase text-slate-500">Excluded</span>
                <strong className="block text-lg font-black text-slate-900">{excludedUserCount}</strong>
              </div>
            </div>

            <div className="mt-3 flex-1 overflow-y-auto space-y-4 pr-1">
               <div>
                  <span className="text-[11px] font-black uppercase text-slate-500">Included Preview</span>
                  <p className="text-sm font-semibold text-slate-700 mt-1 leading-snug">
                    {includedTargetList.slice(0, 3).map((device) => device.name).join(', ') || 'No devices selected'}
                    {includedTargetList.length > 3 ? ` +${includedTargetList.length - 3} more` : ''}
                  </p>
               </div>
               <div>
                  <span className="text-[11px] font-black uppercase text-slate-500">Excluded Preview</span>
                  <p className="text-sm font-semibold text-slate-700 mt-1 leading-snug">
                    {excludedTargetList.slice(0, 3).map((device) => device.name).join(', ') || 'No excluded devices'}
                    {excludedTargetList.length > 3 ? ` +${excludedTargetList.length - 3} more` : ''}
                  </p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function DeletePackageModal({ packages, onClose, onDelete }: { packages: PackageRecord[]; onClose: () => void; onDelete: () => void }) {
  const [confirm, setConfirm] = useState('');
  return (
    <EmaModal
      open
      title={packages.length > 1 ? 'Delete Packages' : 'Delete Package'}
      description={packages.length > 1 ? `${packages.length} packages selected` : packages[0]?.name}
      onClose={onClose}
      footer={
        <>
          <EmaButton onClick={onClose}>Cancel</EmaButton>
          <EmaButton variant="danger" disabled={confirm.toLowerCase() !== 'delete'} onClick={onDelete}>
            Delete {packages.length > 1 ? 'Packages' : 'Package'}
          </EmaButton>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          <Trash2 size={18} />
          <div>
            <strong className="block text-sm font-black">Confirm delete action</strong>
            <span className="text-sm font-semibold">This removes the selected item from Software Distribution.</span>
          </div>
        </div>
        <div className="max-h-44 space-y-2 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
          {packages.map((item) => (
            <div key={item.id} className="rounded-xl bg-white p-3">
              <strong className="block text-sm font-black text-slate-900">{item.name}</strong>
              <span className="text-xs font-semibold text-slate-500">{item.version} • {item.status}</span>
            </div>
          ))}
        </div>
        <Field label="Type delete to confirm">
          <input className={inputClass} value={confirm} onChange={(event) => setConfirm(event.target.value)} />
        </Field>
      </div>
    </EmaModal>
  );
}

export default function SoftwareDistribution() {
  const [packages, setPackages] = useState<PackageRecord[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PackageStatus>('all');
  const [sortKey, setSortKey] = useState<SortKey>('registeredDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [treeVisibleCount, setTreeVisibleCount] = useState(TREE_PAGE_SIZE);
  const [modal, setModal] = useState<ModalState>(null);
  const [targetDevices, setTargetDevices] = useState<TargetDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<EmaToastItem[]>([]);
  const toastIdRef = useRef(0);

  function addToast(tone: EmaToastTone, title: ReactNode, message?: ReactNode) {
    toastIdRef.current += 1;
    const toast: EmaToastItem = { id: `${Date.now()}-${toastIdRef.current}`, tone, title, message };
    setToasts((items) => [...items.slice(-2), toast]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== toast.id)), 3200);
  }

  async function loadSoftwareDistributionData() {
    setIsLoading(true);
    try {
      const [apiPackages, apiTargets] = await Promise.all([fetchPackagesFromApi(), fetchTargetsFromApi()]);
      setPackages(apiPackages);
      setTargetDevices(apiTargets);
      setApiError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load Software Distribution data.';
      setPackages([]);
      setTargetDevices([]);
      setApiError(message);
      addToast('error', 'Connection failed', message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadSoftwareDistributionData();
  }, []);

  useEffect(() => {
    setTreeVisibleCount(TREE_PAGE_SIZE);
  }, [searchTerm, statusFilter, sortKey, sortDirection, packages.length]);

  const selectedPackage = packages.find((item) => item.id === selectedPackageId) || null;
  const selectedPackages = packages.filter((item) => selectedIds.has(item.id));
  const summary = useMemo(() => ({
    total: packages.length,
    ready: packages.filter((item) => item.status === 'Ready').length,
    deployed: packages.filter((item) => item.status === 'Deployed').length,
    draft: packages.filter((item) => item.status === 'Draft').length,
    targets: packages.reduce((sum, item) => sum + item.targetCount, 0),
  }), [packages]);

  const filteredPackages = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    const rows = packages.filter((item) => {
      const searchable = [item.name, item.version, item.description, item.status, item.owner, item.destinationDirectory, item.registeredDate, deliveryMethodLabels[item.lastDeliveryMethod]].join(' ').toLowerCase();
      const matchesSearch = !keyword || searchable.includes(keyword);
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    rows.sort((a, b) => {
      const first = String(a[sortKey]).toLowerCase();
      const second = String(b[sortKey]).toLowerCase();
      if (first < second) return sortDirection === 'asc' ? -1 : 1;
      if (first > second) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return rows;
  }, [packages, searchTerm, statusFilter, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredPackages.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const pageRows = filteredPackages.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const treeRows = filteredPackages.slice(0, treeVisibleCount);
  const hasMoreTreeRows = treeVisibleCount < filteredPackages.length;
  const deployablePageRows = pageRows.filter(isDeployable);
  const allPageSelected = deployablePageRows.length > 0 && deployablePageRows.every((item) => selectedIds.has(item.id));
  const somePageSelected = deployablePageRows.some((item) => selectedIds.has(item.id));

  function resetFilters() {
    setSearchTerm('');
    setStatusFilter('all');
    setSortKey('registeredDate');
    setSortDirection('desc');
    setPage(1);
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDirection('asc');
  }

  function toggleExpand(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectPage() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allPageSelected) deployablePageRows.forEach((item) => next.delete(item.id));
      else deployablePageRows.forEach((item) => next.add(item.id));
      return next;
    });
  }

  async function createPackage(payload: CreatePackagePayload) {
    try {
      await createPackageViaApi(payload);
      await loadSoftwareDistributionData();
      setModal(null);
      addToast('success', 'Package created', 'Package created successfully.');
    } catch (error) {
      addToast('error', 'Create failed', error instanceof Error ? error.message : 'Unable to create package.');
    }
  }

  async function deployPackages(selectedTargets: TargetDevice[], method: DeliveryMethod, scheduleType: 'now' | 'schedule') {
    const packageIds = modal?.type === 'send' ? modal.packageIds : [];
    const selectedPackageRows = packages.filter((item) => packageIds.includes(item.id));
    try {
      await deployPackagesViaApi(selectedPackageRows, selectedTargets, method, scheduleType);
      await loadSoftwareDistributionData();
      setSelectedIds(new Set());
      setModal(null);
      addToast('success', 'Deployment queued', `${packageIds.length} package(s) queued to ${selectedTargets.length} target(s).`);
    } catch (error) {
      addToast('error', 'Deploy failed', error instanceof Error ? error.message : 'Unable to deploy package.');
    }
  }

  async function deletePackages() {
    if (modal?.type !== 'delete') return;
    const packageIds = modal.packageIds;
    const rowsToDelete = packages.filter((item) => packageIds.includes(item.id));
    if (!rowsToDelete.length) {
      setModal(null);
      return;
    }

    try {
      const deletedNames = new Set(rowsToDelete.map((item) => item.name.toLowerCase()));
      await Promise.all(rowsToDelete.map((item) => deletePackageViaApi(item.name)));
      await loadSoftwareDistributionData();
      setPackages((current) => current.filter((item) => !packageIds.includes(item.id) && !deletedNames.has(item.name.toLowerCase())));
      setExpandedIds((current) => {
        const next = new Set(current);
        packageIds.forEach((id) => next.delete(id));
        return next;
      });
      if (selectedPackageId && packageIds.includes(selectedPackageId)) setSelectedPackageId(null);
      setSelectedIds(new Set());
      setModal(null);
      addToast('success', 'Package deleted', rowsToDelete.length > 1 ? 'Packages deleted successfully.' : 'Package deleted successfully.');
    } catch (error) {
      addToast('error', 'Delete failed', error instanceof Error ? error.message : 'Unable to delete package.');
    }
  }

  async function deletePackageVersion() {
    if (modal?.type !== 'deleteVersion') return;
    const row = packages.find((item) => item.id === modal.packageId);
    if (!row) return;

    try {
      await deletePackageVersionViaApi(row.name, modal.version);
      await loadSoftwareDistributionData();
      setExpandedIds((current) => {
        const next = new Set(current);
        if (row.versions.length <= 1) next.delete(row.id);
        return next;
      });
      if (selectedPackageId === row.id) setSelectedPackageId(null);
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(row.id);
        return next;
      });
      setModal(null);
      addToast('success', 'Version deleted', 'Version deleted successfully.');
    } catch (error) {
      addToast('error', 'Delete failed', error instanceof Error ? error.message : 'Unable to delete version.');
    }
  }

  function exportCsv() {
    const headers = ['Package Name', 'Version', 'Status', 'Delivery Method', 'Destination Directory', 'Owner', 'Registered Date', 'Files', 'Size Before', 'Size After', 'Targets'];
    const rows = filteredPackages.map((item) => [item.name, item.version, item.status, deliveryMethodLabels[item.lastDeliveryMethod], item.destinationDirectory, item.owner, item.registeredDate, item.fileCount, item.sizeBeforeCompression, item.sizeAfterCompression, item.targetCount]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `software-distribution-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const packageColumns: EmaTableColumn<PackageRecord>[] = [
    {
      key: 'select',
      header: <input type="checkbox" checked={allPageSelected} ref={(input) => { if (input) input.indeterminate = !allPageSelected && somePageSelected; }} onChange={toggleSelectPage} disabled={!deployablePageRows.length} className="rounded border-slate-300" />,
      width: '48px',
      render: (item) => (
        <input type="checkbox" checked={selectedIds.has(item.id)} disabled={!isDeployable(item)} title={isDeployable(item) ? 'Select package' : 'Archived packages cannot be selected'} onChange={() => toggleSelected(item.id)} onClick={(event) => event.stopPropagation()} className="rounded border-slate-300" />
      ),
    },
    { key: 'no', header: '#', width: '56px', render: (_item, index) => (safePage - 1) * PAGE_SIZE + index + 1 },
    {
      key: 'name',
      header: <SortHeader label="Package Name" active={sortKey === 'name'} direction={sortDirection} onClick={() => handleSort('name')} />,
      render: (item) => (
        <button type="button" onClick={() => setSelectedPackageId(item.id)} className="flex min-w-0 items-center gap-3 text-left">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100"><Package size={15} /></span>
          <span className="min-w-0">
            <strong className="block truncate font-black text-slate-900">{item.name}</strong>
            <span className="block truncate text-xs font-semibold text-slate-500">{item.description}</span>
          </span>
        </button>
      ),
    },
    { key: 'version', header: <SortHeader label="Version" active={sortKey === 'version'} direction={sortDirection} onClick={() => handleSort('version')} />, render: (item) => item.version },
    { key: 'status', header: <SortHeader label="Status" active={sortKey === 'status'} direction={sortDirection} onClick={() => handleSort('status')} />, render: (item) => <span className={cx('inline-flex rounded-full border px-3 py-1 text-xs font-black', statusBadgeClass(item.status))}>{item.status}</span> },
    { key: 'targets', header: <SortHeader label="Targets" active={sortKey === 'targetCount'} direction={sortDirection} onClick={() => handleSort('targetCount')} />, align: 'right', render: (item) => item.targetCount.toLocaleString() },
    { key: 'owner', header: <SortHeader label="Owner" active={sortKey === 'owner'} direction={sortDirection} onClick={() => handleSort('owner')} />, render: (item) => item.owner },
    {
      key: 'action',
      header: 'Action',
      align: 'right',
      render: (item) => (
        <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
          <button type="button" disabled={!isDeployable(item)} onClick={() => { setSelectedIds(new Set()); setModal({ type: 'send', packageIds: [item.id] }); }} className="inline-flex h-9 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-black text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50">
            <Send size={13} />
            Deploy
          </button>
        </div>
      ),
    },
  ];

  const sidebar = (
    <EmaSidebarPanel
      eyebrow="Software Distribution"
      title="Package Library"
      description="Browse packages and available versions."
      searchValue={searchTerm}
      searchPlaceholder="Search package..."
      onSearchChange={(value) => { setSearchTerm(value); setPage(1); }}
      action={<EmaSidebarActionButton onClick={() => setModal({ type: 'new' })}><Plus size={14} />New Package</EmaSidebarActionButton>}
    >
      {isLoading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold text-blue-700"><Loader2 size={16} className="animate-spin" />Loading packages...</div>
      ) : treeRows.length ? (
        treeRows.map((item) => {
          const isExpanded = expandedIds.has(item.id);
          const isActive = selectedPackageId === item.id;
          return (
            <div key={item.id}>
              <EmaSidebarTreeRow
                active={isActive}
                onClick={() => {
                  setSelectedPackageId(item.id);
                  toggleExpand(item.id);
                }}
              >
                <span className={cx('grid size-8 shrink-0 place-items-center rounded-xl', isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-white')}>
                  {isExpanded ? <FolderOpen size={15} /> : <FolderClosed size={15} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black">{item.name}</span>
                  <span className="block truncate text-[11px] font-bold text-slate-400">{item.versions.length} version(s)</span>
                </span>
                {isExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
              </EmaSidebarTreeRow>
              {isExpanded ? (
                <div className="ml-5 mt-1 space-y-1 border-l border-slate-100 pl-3">
                  {item.versions.map((version) => (
                    <EmaSidebarTreeRow key={version} depth={1} onClick={() => setSelectedPackageId(item.id)}>
                      <FileText size={13} className="shrink-0 text-slate-400" />
                      <span className="min-w-0 flex-1 truncate text-xs font-black text-slate-600">{version}</span>
                      <button type="button" onClick={(event) => { event.stopPropagation(); setModal({ type: 'deleteVersion', packageId: item.id, version }); }} className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                        <Trash2 size={13} />
                      </button>
                    </EmaSidebarTreeRow>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-sm font-bold text-slate-500">No package found.</div>
      )}
      {hasMoreTreeRows ? (
        <button type="button" onClick={() => setTreeVisibleCount((current) => Math.min(current + TREE_PAGE_SIZE, filteredPackages.length))} className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-600 transition hover:bg-slate-50">
          Load more packages
        </button>
      ) : null}
    </EmaSidebarPanel>
  );

  return (
    <EmaPageLayout sidebar={sidebar} showHeader={false}>
      <EmaToastViewport items={toasts} onClose={(id) => setToasts((items) => items.filter((item) => item.id !== id))} />
      <div className="space-y-3">
        <EmaSection eyebrow="Software Distribution" title="Package Registry" description="Prepare, organise and deploy software packages to selected target devices.">
          <EmaKpiGrid>
            <EmaKpiCard title="Total Packages" value={summary.total} note="All registered packages" icon={<FileArchive size={18} />} tone="blue" active={statusFilter === 'all'} onClick={resetFilters} />
            <EmaKpiCard title="Ready" value={summary.ready} note="Available for deployment" icon={<CheckCircle2 size={18} />} tone="emerald" active={statusFilter === 'Ready'} onClick={() => { setStatusFilter('Ready'); setPage(1); }} />
            <EmaKpiCard title="Deployed" value={summary.deployed} note="Already delivered" icon={<ShieldCheck size={18} />} tone="violet" active={statusFilter === 'Deployed'} onClick={() => { setStatusFilter('Deployed'); setPage(1); }} />
            <EmaKpiCard title="Draft" value={summary.draft} note="Pending completion" icon={<FileText size={18} />} tone="amber" active={statusFilter === 'Draft'} onClick={() => { setStatusFilter('Draft'); setPage(1); }} />
            <EmaKpiCard title="Targets" value={summary.targets.toLocaleString()} note="Assigned devices" icon={<HardDrive size={18} />} tone="slate" />
          </EmaKpiGrid>
        </EmaSection>

        <EmaToolbar
          search={<EmaSearchInput value={searchTerm} onChange={(value) => { setSearchTerm(value); setPage(1); }} placeholder="Search package or owner..." />}
          filters={
            <EmaFilterField label="Status">
              <select className={inputClass} value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as 'all' | PackageStatus); setPage(1); }}>
                <option value="all">All status</option>
                <option value="Ready">Ready</option>
                <option value="Draft">Draft</option>
                <option value="Deployed">Deployed</option>
                <option value="Archived">Archived</option>
              </select>
            </EmaFilterField>
          }
          right={
            <>
              <EmaButton onClick={() => void loadSoftwareDistributionData()} disabled={isLoading}><RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />Refresh</EmaButton>
              <EmaButton onClick={exportCsv}><Download size={15} />Export</EmaButton>
              <EmaButton variant="primary" onClick={() => setModal({ type: 'new' })}><Plus size={15} />New Package</EmaButton>
            </>
          }
        />

        {apiError ? (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
            <Server size={18} />
            <div>
              <strong className="block text-sm font-black">Data unavailable</strong>
              <span className="text-sm font-semibold">Please refresh the page or try again later.</span>
            </div>
          </div>
        ) : null}

        {selectedPackages.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-700">
            <div>
              <strong className="block text-sm font-black">{selectedPackages.length} package(s) selected</strong>
              <span className="text-sm font-semibold">Bulk deployment uses one target scope and one schedule.</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <EmaButton onClick={() => setSelectedIds(new Set())}>Clear</EmaButton>
              <EmaButton variant="primary" onClick={() => setModal({ type: 'send', packageIds: selectedPackages.map((item) => item.id) })}><Send size={15} />Deploy Selected</EmaButton>
              <EmaButton variant="danger" onClick={() => setModal({ type: 'delete', packageIds: selectedPackages.map((item) => item.id) })}><Trash2 size={15} />Delete Selected</EmaButton>
            </div>
          </div>
        ) : null}

        <EmaTableShell title="Package Registry" subtitle={`Showing ${filteredPackages.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}-${Math.min(safePage * PAGE_SIZE, filteredPackages.length)} of ${filteredPackages.length}`}>
          <EmaTable columns={packageColumns} rows={pageRows} loading={isLoading} emptyText="No package found." getRowKey={(row) => row.id} />
          <EmaPagination page={safePage} totalPages={totalPages} totalLabel={`${filteredPackages.length} package(s)`} onPageChange={setPage} />
        </EmaTableShell>
      </div>

      {selectedPackage ? (
        <div className="fixed inset-0 z-[998] flex justify-end bg-slate-950/20" onMouseDown={() => setSelectedPackageId(null)}>
          <aside className="flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100"><Package size={18} /></span>
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-black text-slate-950">{selectedPackage.name}</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{selectedPackage.version} • {selectedPackage.status} • {selectedPackage.owner}</p>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedPackageId(null)} className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-950"><X size={18} /></button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-auto p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailMetric label="Status" value={selectedPackage.status} note="Current package state" />
                <DetailMetric label="Delivery Method" value={deliveryMethodLabels[selectedPackage.lastDeliveryMethod]} note="Last selected channel" />
                <DetailMetric label="Targets" value={selectedPackage.targetCount} note="Total assigned devices" />
                <DetailMetric label="Package Size" value={selectedPackage.sizeAfterCompression} note="After compression" />
              </div>
              <DetailSection title="Basic Information" description="Package identity and ownership details">
                <InfoRow label="Package Name" value={selectedPackage.name} />
                <InfoRow label="Version" value={selectedPackage.version} />
                <InfoRow label="Owner" value={selectedPackage.owner} />
                <InfoRow label="Registered Date" value={formatDate(selectedPackage.registeredDate)} />
                <InfoRow label="Destination Directory" value={selectedPackage.destinationDirectory} />
                <InfoRow label="Description" value={selectedPackage.description} />
              </DetailSection>
              <DetailSection title="Package Details" description="Files, compression and execution scope">
                <InfoRow label="Files" value={selectedPackage.fileCount} />
                <InfoRow label="Versions" value={selectedPackage.versions.join(', ')} />
                <InfoRow label="Before Compression" value={selectedPackage.sizeBeforeCompression} />
                <InfoRow label="After Compression" value={selectedPackage.sizeAfterCompression} />
                <InfoRow label="Remote Execute File" value={selectedPackage.remoteExecuteFile} />
                <InfoRow label="Exclude OS" value={selectedPackage.excludeOS} />
              </DetailSection>
              <DetailSection title="Last Deployment" description="Read-only deployment reference">
                <InfoRow label="Last Method" value={deliveryMethodLabels[selectedPackage.lastDeliveryMethod]} />
                <InfoRow label="Last Deployment" value={formatDate(selectedPackage.lastDeployment)} />
              </DetailSection>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 p-4">
              <EmaButton onClick={() => setSelectedPackageId(null)}>Close</EmaButton>
              <EmaButton variant="primary" disabled={!isDeployable(selectedPackage)} onClick={() => { const packageId = selectedPackage.id; setSelectedPackageId(null); setModal({ type: 'send', packageIds: [packageId] }); }}><Send size={14} />Deploy Package</EmaButton>
            </div>
          </aside>
        </div>
      ) : null}

      {modal?.type === 'new' ? <NewPackageModal onClose={() => setModal(null)} onCreate={createPackage} /> : null}
      {modal?.type === 'send' ? <DeployPackageModal packages={packages.filter((item) => modal.packageIds.includes(item.id))} targetDevices={targetDevices} onClose={() => setModal(null)} onDeploy={deployPackages} /> : null}
      {modal?.type === 'delete' ? <DeletePackageModal packages={packages.filter((item) => modal.packageIds.includes(item.id))} onClose={() => setModal(null)} onDelete={deletePackages} /> : null}
      {modal?.type === 'deleteVersion' ? (
        <DeletePackageModal
          packages={packages.filter((item) => item.id === modal.packageId).map((item) => ({ ...item, version: modal.version, versions: [modal.version] }))}
          onClose={() => setModal(null)}
          onDelete={deletePackageVersion}
        />
      ) : null}
    </EmaPageLayout>
  );
}

function DetailMetric({ label, value, note }: { label: string; value: ReactNode; note: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <strong className="mt-1 block text-lg font-black text-slate-950">{value}</strong>
      <small className="mt-1 block text-xs font-semibold text-slate-500">{note}</small>
    </div>
  );
}

function DetailSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3">
        <h4 className="text-base font-black text-slate-950">{title}</h4>
        <p className="text-sm font-semibold text-slate-500">{description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <strong className="mt-1 block break-words text-sm font-black text-slate-900">{value}</strong>
    </div>
  );
}