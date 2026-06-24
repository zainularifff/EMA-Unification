import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Database,
  Download,
  Folder,
  FolderOpen,
  Gauge,
  Layers3,
  Package,
  Play,
  RefreshCw,
  Search,
  StopCircle,
  UserRound,
  X,
} from "lucide-react";
import appMeteringService from "../services/appMeteringService";
import {
  EmaButton,
  EmaKpiCard,
  EmaKpiGrid,
  EmaModal,
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
} from "../components/ema";

type AnyRecord = Record<string, unknown>;
type ViewMode = "device" | "package";
type UsageStatus = "Productive" | "Review" | "Restricted" | "Unused";
type RiskLevel = "Low" | "Medium" | "High";
type LicenseType = "Free" | "Paid" | "Enterprise" | "Unknown";

type TreeNode = {
  id: string;
  label: string;
  subLabel?: string;
  status?: string;
  type: "folder" | "device" | "package";
  count?: number;
  relationID?: number;
  objectRootIdn?: number;
  objectDeviceID?: string;
  objectAgent?: string;
  mdmAssetIdn?: number;
  packageId?: number;
  raw?: AnyRecord;
  children?: TreeNode[];
};

type PackageRow = {
  id: string;
  SW_Pkg_Idn: number;
  label: string;
  name: string;
  manufacturer: string;
  classification: string;
  raw?: AnyRecord;
};

type PackageFileRow = {
  id: string;
  fileName: string;
  originalFileName: string;
  version: string;
  fileSize: string;
  raw?: AnyRecord;
};

type ApiAsset = {
  _Idn?: number;
  Object_Root_Idn?: number;
  Object_Agent?: string;
  Object_DeviceID?: string;
  ComputerName?: string;
  Object_Client_Name?: string;
  OwnerName?: string;
  DeviceOwner?: string;
  DisplayName?: string;
  UserName?: string;
  LastLoggedInUser?: string;
  Object_Full_Name?: string;
  Object_Rel_Idn?: number;
  MDM_Asset_Idn?: number;
  MDM_DeviceID?: string;
  MDM_DeviceName?: string;
  PlatformType?: string;
  Model?: string;
  ConnectionStatus?: string;
  IP?: string;
  [key: string]: unknown;
};

type UsageRow = {
  id: string;
  application: string;
  publisher: string;
  version: string;
  fileName: string;
  originalFileName: string;
  device: string;
  user: string;
  site: string;
  ip: string;
  filePath: string;
  appStartTime: string;
  appEndTime: string;
  usedTimeHours: number;
  usedTimeSeconds: number;
  launchCount: number;
  lastUsed: string;
  status: UsageStatus;
  risk: RiskLevel;
  licenseType: LicenseType;
  recommendation: string;
  raw?: AnyRecord;
};

type ApiDepartment = {
  Object_Rel_Idn?: number;
  Object_Rel_Name?: string;
  Object_Full_Name?: string;
  Object_PR_Idn?: number;
  children?: ApiDepartment[];
  [key: string]: unknown;
};

type DepartmentPath = {
  key: string;
  relationID: number;
  label: string;
  pathKeys: string[];
  groupPath: string;
};

type AppMeteringStats = {
  totalRecords?: number;
  uniqueApplications?: number;
  totalUsageSeconds?: number;
  rows?: unknown[];
};

type FilterState = {
  status: string;
  license: string;
};

type MeteringActiveRecord = {
  startedAt: string;
  scopeLabel: string;
  scanMode: string;
  packageId: number;
  jobIdn?: number;
  jobCommand?: number;
};

type MeteringActiveMap = Record<string, MeteringActiveRecord>;

const PAGE_SIZE = 10;
const METERING_ACTIVE_STORAGE_KEY = "ema-application-metering-active-scopes";

const restrictedKeywords = ["torrent", "utorrent", "bittorrent", "anydesk", "teamviewer", "remote", "vpn", "cracker", "keygen"];
const paidKeywords = ["visio", "project", "autocad", "adobe", "photoshop", "illustrator", "acrobat", "sap"];
const enterpriseKeywords = ["office", "teams", "outlook", "excel", "word", "powerpoint", "sap"];
const statusOrder: UsageStatus[] = ["Productive", "Review", "Restricted", "Unused"];

const emptyNode: TreeNode = {
  id: "organization",
  label: "Organization",
  type: "folder",
  relationID: -1,
  count: 0,
  children: [],
};

function asRecord(value: unknown): AnyRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as AnyRecord) : null;
}

function getDataArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const envelope = asRecord(payload);
  if (!envelope) return [];
  const dataObject = asRecord(envelope.data);
  if (Array.isArray(envelope.rows)) return envelope.rows as T[];
  if (Array.isArray(envelope.data)) return envelope.data as T[];
  if (Array.isArray(dataObject?.rows)) return dataObject.rows as T[];
  if (Array.isArray(envelope.raw)) return envelope.raw as T[];
  if (Array.isArray(dataObject?.raw)) return dataObject.raw as T[];
  return [];
}

function getTransportPayload(payload: unknown): AnyRecord | unknown {
  const envelope = asRecord(payload);
  const data = asRecord(envelope?.data);
  if (data && (
    Object.prototype.hasOwnProperty.call(data, "success") ||
    Object.prototype.hasOwnProperty.call(data, "raw") ||
    Object.prototype.hasOwnProperty.call(data, "rows") ||
    Object.prototype.hasOwnProperty.call(data, "procedure") ||
    Object.prototype.hasOwnProperty.call(data, "totalRecords")
  )) {
    return data;
  }
  return payload;
}

function getUsageDataArray<T>(payload: unknown): T[] {
  const unwrapped = getTransportPayload(payload);
  if (Array.isArray(unwrapped)) return unwrapped as T[];
  const envelope = asRecord(unwrapped);
  if (!envelope) return [];
  const dataObject = asRecord(envelope.data);
  if (Array.isArray(envelope.raw)) return envelope.raw as T[];
  if (Array.isArray(dataObject?.raw)) return dataObject.raw as T[];
  if (Array.isArray(dataObject?.rows)) return dataObject.rows as T[];
  if (Array.isArray(envelope.rows)) return envelope.rows as T[];
  if (Array.isArray(envelope.data)) return envelope.data as T[];
  return [];
}

function getDataObject(payload: unknown): AnyRecord {
  const envelope = asRecord(payload);
  const data = asRecord(envelope?.data);
  return data || envelope || {};
}

function getEnvelopeData<T>(payload: unknown, fallback: T): T {
  const envelope = asRecord(payload);
  if (!envelope) return fallback;
  return (envelope.data as T) ?? (envelope as T) ?? fallback;
}

function pickValue(record: AnyRecord | null | undefined, keys: string[], fallback = "") {
  if (!record) return fallback;
  const lowerMap = new Map(Object.keys(record).map((key) => [key.toLowerCase(), key]));
  for (const key of keys) {
    const actualKey = lowerMap.get(key.toLowerCase());
    const value = actualKey ? record[actualKey] : undefined;
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value).trim();
  }
  return fallback;
}

function parseNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatDateInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatApiDate(value?: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString("en-MY", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function defaultStartDate() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return formatDateInput(date);
}

function mapDepartmentNode(department: ApiDepartment): TreeNode {
  const relationID = parseNumber(department.Object_Rel_Idn, 0);
  const label = department.Object_Rel_Name || department.Object_Full_Name || `Department ${relationID}`;
  return {
    id: `relation-${relationID}`,
    label,
    type: "folder",
    relationID,
    count: parseNumber(department.TotalDevices ?? department.DeviceCount ?? department.Count, 0),
    raw: department,
    children: department.children?.map(mapDepartmentNode) || [],
  };
}

function buildDepartmentTree(departments: ApiDepartment[]) {
  return [{ ...emptyNode, count: departments.length, children: departments.map(mapDepartmentNode) }];
}

function departmentPathFromNode(node: TreeNode): DepartmentPath {
  return {
    key: node.id,
    relationID: node.relationID ?? -1,
    label: node.label || "Organization",
    pathKeys: [node.id],
    groupPath: node.subLabel || node.label || "Organization",
  };
}

function buildPackageTree(packages: PackageRow[]) {
  const groups = new Map<string, PackageRow[]>();
  for (const item of packages) {
    const groupName = item.classification || "Application";
    groups.set(groupName, [...(groups.get(groupName) || []), item]);
  }
  const children: TreeNode[] = Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([groupName, items]) => ({
      id: `pkg-group-${groupName}`,
      label: groupName,
      type: "folder",
      count: items.length,
      children: items
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((pkg) => ({
          id: `package-${pkg.SW_Pkg_Idn}`,
          label: pkg.name,
          subLabel: pkg.manufacturer,
          type: "package" as const,
          packageId: pkg.SW_Pkg_Idn,
          count: 0,
          raw: pkg.raw,
        })),
    }));
  return [{ id: "all-packages", label: "Application Packages", type: "folder" as const, count: packages.length, children }];
}

function flattenTree(nodes: TreeNode[]): TreeNode[] {
  return nodes.flatMap((node) => [node, ...(node.children ? flattenTree(node.children) : [])]);
}

function secondsToHours(seconds: number) {
  return seconds / 3600;
}

function formatUsageDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(Number.isFinite(seconds) ? seconds : 0));
  if (safeSeconds <= 0) return "0s";
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;
  if (hours > 0) {
    const decimalHours = safeSeconds / 3600;
    return `${decimalHours.toFixed(decimalHours >= 10 ? 0 : 1)}h`;
  }
  if (minutes > 0) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  return `${remainingSeconds}s`;
}

function getStatus(application: string, launchCount: number, usedTimeHours: number, usedTimeSeconds = 0): UsageStatus {
  const app = application.toLowerCase();
  if (restrictedKeywords.some((keyword) => app.includes(keyword))) return "Restricted";
  if (launchCount <= 0 && usedTimeSeconds <= 0) return "Unused";
  if (usedTimeSeconds <= 0) return "Unused";
  if (usedTimeHours < 2 || launchCount < 5) return "Review";
  return "Productive";
}

function getRisk(status: UsageStatus): RiskLevel {
  if (status === "Restricted") return "High";
  if (status === "Review" || status === "Unused") return "Medium";
  return "Low";
}

function getLicenseType(application: string): LicenseType {
  const app = application.toLowerCase();
  if (enterpriseKeywords.some((keyword) => app.includes(keyword))) return "Enterprise";
  if (paidKeywords.some((keyword) => app.includes(keyword))) return "Paid";
  if (["chrome", "firefox", "edge"].some((keyword) => app.includes(keyword))) return "Free";
  return "Unknown";
}

function getRecommendation(status: UsageStatus, risk: RiskLevel, licenseType: LicenseType) {
  if (risk === "High") return "Validate business need immediately or move this application into policy restriction review.";
  if (status === "Unused" && licenseType === "Paid") return "Candidate for license reclaim because no usage was detected in the selected window.";
  if (status === "Review") return "Review usage pattern before renewal or standardization decision.";
  return "Keep monitored. Usage is aligned with normal application metering baseline.";
}

function normalizePackageRow(row: unknown, index = 0): PackageRow {
  const record = asRecord(row) || {};
  const id = parseNumber(pickValue(record, ["SW_Pkg_Idn", "SW_Pkg_ID", "SWPkgIdn", "SW_Idn", "id"], String(index + 1)), index + 1);
  const name = pickValue(record, ["label", "name", "SW_Pkg_Name", "SWPkgName", "PackageName", "ApplicationPackage"], `Package ${index + 1}`);
  return {
    id: String(id),
    SW_Pkg_Idn: id,
    label: name,
    name,
    manufacturer: pickValue(record, ["manufacturer", "Manufacturer", "CompanyName", "Vendor"], "-"),
    classification: pickValue(record, ["classification", "Classification", "CategoryName", "SW_Category"], "Application"),
    raw: record,
  };
}

function normalizePackageFileRow(row: unknown, index = 0): PackageFileRow {
  const record = asRecord(row) || {};
  const fileName = pickValue(record, ["fileName", "FileName", "File_Name", "SW_File_Name", "ProcessName", "EXE_Name"], `File ${index + 1}`);
  return {
    id: String(pickValue(record, ["id", "ID", "SW_File_Idn", "File_Idn", "No"], String(index + 1))),
    fileName,
    originalFileName: pickValue(record, ["originalFileName", "OriginalFileName", "Original_File_Name", "OriginalName"], "-"),
    version: pickValue(record, ["version", "Version", "FileVersion", "SW_Version"], "-"),
    fileSize: pickValue(record, ["FileSize", "File_Size", "Size"], "-"),
    raw: record,
  };
}

function normalizeAssetNode(row: unknown, department: DepartmentPath, index = 0): TreeNode | null {
  const record = asRecord(row) || {};
  const agent = pickValue(record, ["Object_Agent", "Agent", "Source"], "EM").toUpperCase();
  const rawAssetId = parseNumber(pickValue(record, ["_Idn", "Object_Root_Idn", "ObjectRootIdn", "ClientID", "MDM_Asset_Idn"], "0"), 0);
  if (!rawAssetId) return null;

  const deviceIdentifier = pickValue(record, ["Object_DeviceID", "DeviceID", "deviceID", "MDM_DeviceID"], "");
  const deviceName = pickValue(record, ["DeviceName", "DeviceDisplayName", "ComputerName", "MDM_DeviceName", "Name", "Object_DeviceID"], `Device ${index + 1}`);
  const ownerName = pickValue(record, ["DisplayName", "OwnerName", "DeviceOwner", "UserName", "LastLoggedInUser", "Object_Client_Name", "Owner", "LoginUser"], "-");
  const siteName = pickValue(record, ["Object_Full_Name", "Department", "Site", "GroupName"], department.groupPath || department.label);
  const status = pickValue(record, ["ConnectionStatus", "Status"], "-");
  const objectRootIdn = agent === "EM" ? rawAssetId : 0;
  const mdmAssetIdn = agent === "MDM" ? rawAssetId : parseNumber(pickValue(record, ["MDM_Asset_Idn"], "0"), 0);
  const ownerIsUseful = ownerName && ownerName !== "-" && ownerName.toLowerCase() !== deviceName.toLowerCase();
  const subLabel = ownerIsUseful ? ownerName : siteName;

  return {
    id: `device-${agent || "ASSET"}-${rawAssetId}`,
    label: deviceName,
    subLabel,
    status,
    type: "device",
    relationID: department.relationID,
    objectRootIdn,
    objectDeviceID: deviceIdentifier,
    objectAgent: agent,
    mdmAssetIdn,
    count: 0,
    raw: {
      ...record,
      _Idn: rawAssetId,
      Object_Agent: agent,
      Object_Rel_Idn: department.relationID,
      ComputerName: deviceName,
      DeviceName: deviceName,
      OwnerName: ownerName,
      DisplayName: ownerName,
      Object_Full_Name: siteName,
      ConnectionStatus: status,
    },
  };
}

function findTreeNodeById(nodes: TreeNode[], nodeId: string): TreeNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    const childMatch = node.children?.length ? findTreeNodeById(node.children, nodeId) : null;
    if (childMatch) return childMatch;
  }
  return null;
}

function normalizeUsageRow(row: unknown, index = 0): UsageRow {
  const record = asRecord(row) || {};
  const application = pickValue(record, ["application", "Application", "SW_FileName", "SW_File_Name", "FileName", "fileName", "ProcessName", "SW_OrgFileName", "applicationPackage", "ApplicationPackage", "Application Package", "SW_Pkg_Name", "SWPkgName", "PackageName", "Pkg_Name"], "-");
  const fileName = pickValue(record, ["SW_FileName", "SW_File_Name", "fileName", "FileName", "File_Name", "ProcessName", "EXE_Name", "Executable"], application);
  const originalFileName = pickValue(record, ["SW_OrgFileName", "originalFileName", "OriginalFileName", "Original_File_Name", "OriginalName", "OrgFileName"], fileName);
  
  const rawSeconds = parseNumber(pickValue(record, ["ActiveTime", "activeTime", "usedTime", "UsedTime", "Used_Time", "DurationSeconds", "Seconds", "TotalSeconds", "UsageSeconds"], "0"), 0);
  const launchCount = parseNumber(pickValue(record, ["CCount", "cCount", "LaunchCount", "launchCount", "counts", "Counts", "Count", "UseCount", "UsedCount", "RunCount"], "0"), 0);
  
  const usedTimeHours = secondsToHours(rawSeconds);
  const status = getStatus(application, launchCount, usedTimeHours, rawSeconds);
  const risk = getRisk(status);
  const licenseType = getLicenseType(`${application} ${fileName}`);
  
  const lastUsedRaw = pickValue(record, ["App_EndTime", "AppEndTime", "EndTime", "LastUsed", "Last_Used", "date", "MeterDate", "Meter_Date", "Date", "SearchDate", "UseDate", "App_StartTime", "ConnectionTime"], "-");
  const appStartTime = formatApiDate(pickValue(record, ["App_StartTime", "AppStartTime", "StartTime"], ""));
  const appEndTime = formatApiDate(pickValue(record, ["App_EndTime", "AppEndTime", "EndTime"], ""));

  return {
    id: String(pickValue(record, ["IDN", "idn", "id", "ID", "RowNumber", "No"], String(index + 1))),
    application,
    publisher: pickValue(record, ["publisher", "Publisher", "Manufacturer", "CompanyName", "Vendor", "SW_Pkg_Name"], "-"),
    version: pickValue(record, ["SW_VerInfo", "version", "Version", "FileVersion", "SW_Version", "VerInfo"], "-"),
    fileName,
    originalFileName,
    device: pickValue(record, ["ComputerName", "computerName", "device", "DeviceName", "MachineName", "Object_DeviceID", "MDM_DeviceName"], "-"),
    user: pickValue(record, ["Object_Client_Name", "ClientName", "UserName", "user", "User", "LoginUser", "Owner", "OwnerName", "Email"], "-"),
    site: pickValue(record, ["Object_Full_Name", "Object_Rel_Name", "site", "Department", "GroupName", "Location", "Workgroup"], "-"),
    ip: pickValue(record, ["IP", "IPAddress", "DeviceIPAddress", "DeviceLocalIPAddress"], "-"),
    filePath: pickValue(record, ["SW_Path", "Path", "FilePath", "File_Path", "InstallPath"], "-"),
    appStartTime,
    appEndTime,
    usedTimeHours,
    usedTimeSeconds: rawSeconds,
    launchCount,
    lastUsed: formatApiDate(lastUsedRaw),
    status,
    risk,
    licenseType,
    recommendation: getRecommendation(status, risk, licenseType),
    raw: record,
  };
}

function readMeteringActiveMap(): MeteringActiveMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(METERING_ACTIVE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as MeteringActiveMap) : {};
  } catch {
    return {};
  }
}

function writeMeteringActiveMap(value: MeteringActiveMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(METERING_ACTIVE_STORAGE_KEY, JSON.stringify(value));
}

function getMeteringJobIdFromResponse(payload: unknown) {
  const data = getDataObject(payload);
  const direct = pickValue(data, ["Job_Idn", "jobIdn", "JobID", "jobID", "jobIndex"], "0");
  const parsed = Number.parseInt(String(direct || "0"), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getMeteringScanMode(node: TreeNode) {
  if (node.type === "device") return "device";
  if (node.id === "organization") return "all";
  return "folder";
}

function getMeteringScopeKey(node: TreeNode, packageId = 0) {
  const scope = node.type === "device"
    ? `device-${node.objectRootIdn || node.id}`
    : node.id === "organization"
      ? "organization"
      : `folder-${node.relationID ?? node.id}`;
  return `${scope}::package-${packageId || 0}`;
}

function exportCsv(rows: UsageRow[]) {
  const header = ["Application", "Publisher", "Version", "File", "Original File", "Device", "User", "Site", "IP", "Path", "Start Time", "End Time", "Used Hours", "Used Seconds", "Launch Count", "Last Used", "Status", "Risk", "License", "Recommendation"];
  const csv = [
    header.join(","),
    ...rows.map((row) =>
      [
        row.application,
        row.publisher,
        row.version,
        row.fileName,
        row.originalFileName,
        row.device,
        row.user,
        row.site,
        row.ip,
        row.filePath,
        row.appStartTime,
        row.appEndTime,
        row.usedTimeHours.toFixed(4),
        row.usedTimeSeconds,
        row.launchCount,
        row.lastUsed,
        row.status,
        row.risk,
        row.licenseType,
        row.recommendation,
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "application-metering-usage.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

function getTreeCount(node: TreeNode): number {
  if (typeof node.count === "number" && Number.isFinite(node.count) && node.count > 0) return node.count;
  if (node.type === "device" || node.type === "package") return 1;
  return (node.children || []).reduce((total, child) => total + getTreeCount(child), 0);
}

function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return nodes;
  return nodes
    .map((node) => {
      const children = filterTree(node.children || [], query);
      const ownText = [node.label, node.subLabel, node.status, node.type].filter(Boolean).join(" ").toLowerCase();
      if (ownText.includes(keyword) || children.length) return { ...node, children };
      return null;
    })
    .filter(Boolean) as TreeNode[];
}

function getTreeNodeValue(node: TreeNode, keys: string[], fallback = "-") {
  return pickValue(node.raw || {}, keys, fallback);
}

function EmaSpinner({ label = "Loading data..." }: { label?: string }) {
  return (
    <div className="grid min-h-[12rem] place-items-center text-center">
      <div>
        <span className="mx-auto block size-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
        <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: UsageStatus | RiskLevel | LicenseType | string }) {
  const key = String(status).toLowerCase();
  const tone = key.includes("restricted") || key.includes("high") || key.includes("locked") || key.includes("offline")
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : key.includes("review") || key.includes("medium") || key.includes("paid")
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : key.includes("productive") || key.includes("low") || key.includes("free") || key.includes("online") || key.includes("connected") || key.includes("active")
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-slate-50 text-slate-700";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${tone}`}>{status}</span>;
}

function AppMeteringTree({ nodes, selectedId, onSelect, search = "" }: { nodes: TreeNode[]; selectedId: string; onSelect: (node: TreeNode) => void; search?: string }) {
  const [open, setOpen] = useState<Record<string, boolean>>({ organization: true, "all-packages": true });
  const filteredNodes = useMemo(() => filterTree(nodes, search), [nodes, search]);

  const renderNode = (node: TreeNode, depth = 0): ReactNode => {
    const hasChildren = Boolean(node.children?.length);
    const isOpen = search.trim() ? true : open[node.id] ?? depth < 1;
    const isSelected = selectedId === node.id;
    const isRoot = node.id === "organization" || node.id === "all-packages";
    const Icon = node.type === "package" ? Package : node.type === "device" ? UserRound : isOpen ? FolderOpen : Folder;

    const handleToggle = () => {
      if (!hasChildren) return;
      setOpen((prev) => ({ ...prev, [node.id]: !isOpen }));
    };

    const handleSelect = () => {
      if (hasChildren) handleToggle();
      onSelect(node);
    };

    return (
      <div key={node.id}>
        <EmaSidebarTreeRow active={isSelected} depth={depth} onClick={handleSelect}>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleToggle();
            }}
            className="grid size-5 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-white"
            aria-label={hasChildren ? (isOpen ? `Collapse ${node.label}` : `Expand ${node.label}`) : node.label}
          >
            {hasChildren ? isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} /> : <span />}
          </button>
          <Icon size={16} />
          <span className="min-w-0 flex-1 truncate">{node.label}</span>
          {!isRoot && getTreeCount(node) > 0 ? <small className="rounded-full bg-white px-2 py-0.5 text-xs font-black text-slate-500">{getTreeCount(node).toLocaleString()}</small> : null}
        </EmaSidebarTreeRow>
        {hasChildren && isOpen ? <div>{node.children?.map((child) => renderNode(child, depth + 1))}</div> : null}
      </div>
    );
  };

  return <div>{filteredNodes.map((node) => renderNode(node))}</div>;
}

function ControlField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid min-w-0 gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
      <span>{label}</span>
      {children}
    </label>
  );
}

function controlClassName() {
  return "h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-900 outline-none shadow-sm transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50";
}

export default function AppMetering() {
  const [viewMode, setViewMode] = useState<ViewMode>("device");
  const [departmentTree, setDepartmentTree] = useState<TreeNode[]>([emptyNode]);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [packageFiles, setPackageFiles] = useState<PackageFileRow[]>([]);
  const [selectedNode, setSelectedNode] = useState<TreeNode>(emptyNode);
  const [selectedPackageId, setSelectedPackageId] = useState<number>(0);
  const [usageRows, setUsageRows] = useState<UsageRow[]>([]);
  const [stats, setStats] = useState<AppMeteringStats>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [treeSearch, setTreeSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>({ status: "all", license: "all" });
  const [startDate, setStartDate] = useState(defaultStartDate());
  const [endDate, setEndDate] = useState(formatDateInput(new Date()));
  const [oneYearMode, setOneYearMode] = useState(false);
  const [nextPageMode, setNextPageMode] = useState(false);
  const [page, setPage] = useState(1);
  const [detailRow, setDetailRow] = useState<UsageRow | null>(null);
  
  const [showMeteringModal, setShowMeteringModal] = useState(false);
  const [meteringType, setMeteringType] = useState<"all" | "selected">("all");
  const [modalPackageId, setModalPackageId] = useState<number>(0);
  
  const [loading, setLoading] = useState({ hierarchy: false, packages: false, usage: false, action: false, assets: false, packageFiles: false });
  const [error, setError] = useState("");
  const [toasts, setToasts] = useState<EmaToastItem[]>([]);
  
  const [scopeDeviceRows, setScopeDeviceRows] = useState<TreeNode[]>([]);
  const [assetCache, setAssetCache] = useState<Record<string, TreeNode[]>>({});
  const [activeMeteringScopes, setActiveMeteringScopes] = useState<MeteringActiveMap>(() => readMeteringActiveMap());

  const packageTree = useMemo(() => buildPackageTree(packages), [packages]);
  const activeTree = viewMode === "device" ? departmentTree : packageTree;
  const treeNodes = useMemo(() => flattenTree(activeTree), [activeTree]);
  const activePackageId = selectedPackageId || (selectedNode.type === "package" ? selectedNode.packageId || 0 : 0);
  const packageOptions = useMemo(() => packages.slice().sort((a, b) => a.name.localeCompare(b.name)), [packages]);
  
  const activeMeteringKey = useMemo(() => getMeteringScopeKey(selectedNode, activePackageId), [selectedNode, activePackageId]);
  const isSelectedScopeMeteringActive = Boolean(activeMeteringScopes[activeMeteringKey]);
  const companyScopeNode = useMemo(() => findTreeNodeById(departmentTree, "organization") || departmentTree[0] || emptyNode, [departmentTree]);
  
  const isScopeMeteringActive = useCallback((node: TreeNode, pkgId = activePackageId) => {
    return Boolean(activeMeteringScopes[getMeteringScopeKey(node, pkgId)]);
  }, [activeMeteringScopes, activePackageId]);

  const currentMeteringScopeNode = useMemo(() => {
    if (selectedNode.type === "device") return selectedNode;
    if (selectedNode.id === "organization") return companyScopeNode;
    if (selectedNode.type === "folder") return selectedNode;
    return companyScopeNode;
  }, [companyScopeNode, selectedNode]);

  const currentMeteringScopeType = currentMeteringScopeNode.type === "device"
    ? "Individual"
    : currentMeteringScopeNode.id === "organization"
      ? "Company"
      : "Branch";

  const isCurrentMeteringScopeActive = isScopeMeteringActive(currentMeteringScopeNode, activePackageId);
  const currentMeteringButtonLabel = `${isCurrentMeteringScopeActive ? "Stop" : "Metering"} ${currentMeteringScopeType}`;

  const showToast = useCallback((tone: EmaToastItem["tone"], title: ReactNode, message?: ReactNode) => {
    const id = Date.now();
    setToasts([{ id, tone, title, message }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4200);
  }, []);

  const loadHierarchy = useCallback(async () => {
    setLoading((prev) => ({ ...prev, hierarchy: true }));
    try {
      const payload = await appMeteringService.getDepartments();
      const departments = payload as ApiDepartment[];
      const baseTree = buildDepartmentTree(departments);
      setDepartmentTree(baseTree);
      setSelectedNode((prev) => findTreeNodeById(baseTree, prev.id) || baseTree[0] || emptyNode);
      setScopeDeviceRows([]);
      setAssetCache({});
    } catch (err) {
      setError("Organization view is not available right now.");
      setDepartmentTree([emptyNode]);
      setScopeDeviceRows([]);
    } finally {
      setLoading((prev) => ({ ...prev, hierarchy: false }));
    }
  }, []);

  const loadAssetsForScope = useCallback(async (node: TreeNode) => {
    if (viewMode !== "device" || node.type !== "folder") {
      setScopeDeviceRows([]);
      return;
    }
    if (node.id === "organization" || !node.relationID || node.relationID <= 0) {
      setScopeDeviceRows([]);
      return;
    }
    const cacheKey = String(node.relationID);
    const cachedRows = assetCache[cacheKey];
    if (cachedRows) {
      setScopeDeviceRows(cachedRows);
      return;
    }
    setLoading((prev) => ({ ...prev, assets: true }));
    try {
      const response = await appMeteringService.getAssetsByRelationID(node.relationID);
      const department = departmentPathFromNode(node);
      const rows = getDataArray<ApiAsset>(response)
        .map((asset, index) => normalizeAssetNode(asset, department, index))
        .filter((item): item is TreeNode => Boolean(item))
        .sort((a, b) => a.label.localeCompare(b.label));

      setScopeDeviceRows(rows);
      setAssetCache((prev) => ({ ...prev, [cacheKey]: rows }));
    } catch (err) {
      setScopeDeviceRows([]);
      setError("Device list is not available right now.");
    } finally {
      setLoading((prev) => ({ ...prev, assets: false }));
    }
  }, [assetCache, viewMode]);

  const loadPackages = useCallback(async () => {
    setLoading((prev) => ({ ...prev, packages: true }));
    try {
      const payload = await appMeteringService.getPackages();
      const rows = getDataArray<unknown>(payload).map(normalizePackageRow);
      setPackages(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load application packages.");
      setPackages([]);
    } finally {
      setLoading((prev) => ({ ...prev, packages: false }));
    }
  }, []);

  const loadPackageFiles = useCallback(async (packageId: number) => {
    if (!packageId) {
      setPackageFiles([]);
      return;
    }
    setLoading((prev) => ({ ...prev, packageFiles: true }));
    try {
      const payload = await appMeteringService.getPackageFiles(packageId);
      const objectPayload = getDataObject(payload);
      const rows = (Array.isArray(objectPayload.data) ? objectPayload.data : getDataArray<unknown>(payload)).map(normalizePackageFileRow);
      setPackageFiles(rows);
    } catch (err) {
      setPackageFiles([]);
      setError(err instanceof Error ? err.message : "Failed to load application package file group.");
    } finally {
      setLoading((prev) => ({ ...prev, packageFiles: false }));
    }
  }, []);

  const activeFilters = useMemo(() => {
    const params = new URLSearchParams();
    const isDevice = selectedNode.type === "device";
    const packageId = selectedPackageId || (selectedNode.type === "package" ? selectedNode.packageId || 0 : 0);

    if (isDevice && selectedNode.objectRootIdn) {
      params.set("clientID", String(selectedNode.objectRootIdn));
    } else {
      params.set("relationID", String(selectedNode.relationID ?? -1));
    }
    params.set("swPkgId", String(packageId > 0 ? packageId : -1));
    params.set("startDate", startDate);
    params.set("endDate", endDate);
    params.set("page", "1");
    params.set("limit", "500");
    if (oneYearMode) params.set("oneYear", "true");
    if (nextPageMode) params.set("nextpage", "true");

    // Mapping khas untuk layer service baharu fallback
    params.set("Object_Rel_Idn", String(selectedNode.relationID ?? -1));
    params.set("packageId", String(packageId || 0));
    if (selectedNode.objectDeviceID) params.set("Object_DeviceID", selectedNode.objectDeviceID);
    if (selectedNode.objectRootIdn) params.set("objectRootIdn", String(selectedNode.objectRootIdn));

    return params;
  }, [selectedNode, selectedPackageId, startDate, endDate, oneYearMode, nextPageMode]);

  const loadUsage = useCallback(async () => {
    setLoading((prev) => ({ ...prev, usage: true }));
    setError("");
    try {
      const usagePayload = await appMeteringService.getUsage(Object.fromEntries(activeFilters.entries()));
      const normalizedUsage = getUsageDataArray<unknown>(usagePayload).map(normalizeUsageRow);
      setUsageRows(normalizedUsage);

      const statsPayload = await appMeteringService.getStats(Object.fromEntries(activeFilters.entries()));
      const statsData = getEnvelopeData<AppMeteringStats>(statsPayload, {});
      setStats(statsData || {});
    } catch (err) {
      setUsageRows([]);
      setStats({});
      setError(err instanceof Error ? err.message : "Failed to load application metering usage.");
    } finally {
      setLoading((prev) => ({ ...prev, usage: false }));
    }
  }, [activeFilters]);

  useEffect(() => {
    void loadHierarchy();
    void loadPackages();
  }, [loadHierarchy, loadPackages]);

  useEffect(() => {
    if (viewMode !== "device") return;
    setSelectedNode((prev) => findTreeNodeById(departmentTree, prev.id) || prev);
  }, [departmentTree, viewMode]);

  useEffect(() => {
    if (viewMode !== "device") {
      setScopeDeviceRows([]);
      return;
    }
    if (selectedNode.type === "folder") {
      void loadAssetsForScope(selectedNode);
    }
  }, [loadAssetsForScope, selectedNode.id, selectedNode.relationID, selectedNode.type, viewMode]);

  useEffect(() => {
    const packageId = selectedPackageId || (selectedNode.type === "package" ? selectedNode.packageId || 0 : 0);
    void loadPackageFiles(packageId);
  }, [selectedPackageId, selectedNode.packageId, selectedNode.type, loadPackageFiles]);

  useEffect(() => {
    if (!oneYearMode && nextPageMode) setNextPageMode(false);
  }, [oneYearMode, nextPageMode]);

  useEffect(() => {
    void loadUsage();
  }, [loadUsage]);

  useEffect(() => {
    setPage(1);
  }, [filters.license, filters.status, searchTerm, selectedPackageId, startDate, endDate, oneYearMode, selectedNode.id]);

  const handleNodeSelect = (node: TreeNode) => {
    setSelectedNode(node);
    setPage(1);
    if (node.type === "package") setSelectedPackageId(node.packageId || 0);
  };

  const showDeviceRegistry = viewMode === "device" && selectedNode.type !== "device";

  const filteredDeviceRows = useMemo(() => {
    if (!showDeviceRegistry) return [];
    const text = searchTerm.trim().toLowerCase();
    return scopeDeviceRows.filter((device) => {
      const raw = device.raw || {};
      const searchable = [
        device.label,
        device.subLabel || "",
        getTreeNodeValue(device, ["Object_Full_Name", "Department", "Site", "GroupName"], ""),
        getTreeNodeValue(device, ["PlatformType"], ""),
        getTreeNodeValue(device, ["Model"], ""),
        getTreeNodeValue(device, ["IP", "IPAddress", "DeviceIPAddress", "DeviceLocalIPAddress"], ""),
        getTreeNodeValue(device, ["Object_DeviceID", "DeviceID", "MDM_DeviceID"], ""),
        String(raw.Object_Agent || ""),
      ].join(" ").toLowerCase();
      return !text || searchable.includes(text);
    });
  }, [scopeDeviceRows, searchTerm, showDeviceRegistry]);

  const filteredRows = useMemo(() => {
    if (showDeviceRegistry) return [];
    const text = searchTerm.trim().toLowerCase();
    return usageRows.filter((row) => {
      if (filters.status !== "all" && row.status !== filters.status) return false;
      if (filters.license !== "all" && row.licenseType !== filters.license) return false;
      if (!text) return true;
      return [row.application, row.publisher, row.version, row.fileName, row.originalFileName, row.device, row.user, row.site, row.ip, row.filePath, row.status, row.licenseType]
        .join(" ")
        .toLowerCase()
        .includes(text);
    });
  }, [filters, searchTerm, usageRows, showDeviceRegistry]);

  const pageCount = showDeviceRegistry
    ? Math.max(1, Math.ceil(filteredDeviceRows.length / PAGE_SIZE))
    : Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

  const pagedDeviceRows = useMemo(() => {
    return filteredDeviceRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [filteredDeviceRows, page]);

  const pagedRows = useMemo(() => {
    return filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [filteredRows, page]);

  const summary = useMemo(() => {
    const rowTotalSeconds = usageRows.reduce((sum, row) => sum + row.usedTimeSeconds, 0);
    const totalSeconds = typeof stats.totalUsageSeconds === "number" && stats.totalUsageSeconds > 0 ? stats.totalUsageSeconds : rowTotalSeconds;
    const rowUniqueApplications = new Set(usageRows.map((row) => row.application).filter((value) => value && value !== "-")).size;
    const statsUniqueApplications = typeof stats.uniqueApplications === "number" && stats.uniqueApplications > 0 ? stats.uniqueApplications : 0;
    const uniqueApplications = Math.max(statsUniqueApplications, rowUniqueApplications);
    const uniqueDevices = new Set(usageRows.map((row) => row.device).filter((value) => value && value !== "-")).size;
    const review = usageRows.filter((row) => row.status === "Review").length;
    const restricted = usageRows.filter((row) => row.status === "Restricted").length;

    return { uniqueApplications, uniqueDevices, totalSeconds, review, restricted };
  }, [stats, usageRows]);

  const getActionPayload = (commandDescription: string, commandPackageId = 0, targetNode: TreeNode = selectedNode) => {
    const packageId = commandPackageId || modalPackageId || selectedPackageId || (targetNode.type === "package" ? targetNode.packageId || 0 : 0);
    const scanMode = getMeteringScanMode(targetNode);
    const rawTarget = targetNode.raw || {};

    return {
      scanMode,
      Object_Rel_Idn: targetNode.relationID ?? (scanMode === "all" ? -1 : -1),
      relationID: targetNode.relationID ?? (scanMode === "all" ? undefined : -1),
      Object_Root_Idn: targetNode.objectRootIdn ?? 0,
      objectRootIdn: targetNode.objectRootIdn ?? 0,
      Object_DeviceID: targetNode.objectDeviceID || "",
      Object_Agent: targetNode.objectAgent || String(rawTarget.Object_Agent || ""),
      MDM_Asset_Idn: targetNode.mdmAssetIdn || Number(rawTarget.MDM_Asset_Idn || 0) || 0,
      MDM_DeviceID: String(rawTarget.MDM_DeviceID || rawTarget.DeviceID || ""),
      ComputerName: targetNode.label || String(rawTarget.ComputerName || rawTarget.DeviceName || ""),
      DeviceName: String(rawTarget.DeviceName || targetNode.label || ""),
      Object_Full_Name: String(rawTarget.Object_Full_Name || rawTarget.Object_Rel_Name || targetNode.label || ""),
      title: commandDescription,
      packageId: packageId || 0,
      swPkgId: packageId > 0 ? packageId : -1,
      targetNode,
      meteringType: meteringType === "selected" || packageId > 0 ? "selected" : "all",
      swpkg_list: packageId > 0 ? [packageId] : [],
      swpkg_list_details: [],
      startDate,
      endDate,
      oneYear: oneYearMode,
      nextpage: nextPageMode,
      description: commandDescription,
    };
  };

  const updateMeteringScopeState = useCallback((action: "start" | "stop", node: TreeNode, packageId: number, jobIdn = 0, jobCommand = 0) => {
    const key = getMeteringScopeKey(node, packageId);
    setActiveMeteringScopes((prev) => {
      const next: MeteringActiveMap = { ...prev };
      if (action === "start") {
        next[key] = {
          startedAt: new Date().toISOString(),
          scopeLabel: node.label,
          scanMode: getMeteringScanMode(node),
          packageId,
          jobIdn,
          jobCommand,
        };
      } else {
        delete next[key];
      }
      writeMeteringActiveMap(next);
      return next;
    });
  }, []);

  const runMeteringAction = async (action: "start" | "collect" | "stop", packageId = 0, targetNode: TreeNode = selectedNode) => {
    const effectivePackageId = packageId || modalPackageId || selectedPackageId || (targetNode.type === "package" ? targetNode.packageId || 0 : 0);
    const actionNode = targetNode;
    const activeRecord = activeMeteringScopes[getMeteringScopeKey(actionNode, effectivePackageId)];

    setLoading((prev) => ({ ...prev, action: true }));
    try {
      const title = action === "start" ? "Start Application Metering" : action === "collect" ? "Collect Application Metering Result" : "Stop Application Metering";
      const payload = getActionPayload(`${action === "start" ? "Start" : action === "collect" ? "Collect" : "Stop"} Application Metering - ${actionNode.label}`, effectivePackageId, actionNode) as AnyRecord;

      if ((action === "stop" || action === "collect") && activeRecord?.jobIdn) {
        payload.Job_Idn = activeRecord.jobIdn;
        payload.jobIndex = activeRecord.jobIdn;
        payload.activeJobIdn = activeRecord.jobIdn;
      }

      if (action === "stop" && !activeRecord?.jobIdn) {
        throw new Error("No active Job_Idn is stored for this scope. Start metering once with the updated UI before stopping.");
      }

      const response = await appMeteringService.runMeteringAction(action, payload);
      const responseJobIdn = getMeteringJobIdFromResponse(response) || activeRecord?.jobIdn || 0;

      if (action === "start") {
        updateMeteringScopeState("start", actionNode, effectivePackageId, responseJobIdn, 1206);
      } else if (action === "stop") {
        updateMeteringScopeState("stop", actionNode, effectivePackageId);
      }

      showToast("success", `${action === "start" ? "Start" : action === "collect" ? "Collect" : "Stop"} request has been sent.`, String(asRecord(response)?.message || "Job updated successfully."));
      setShowMeteringModal(false);
      setModalPackageId(0);
      await loadUsage();
    } catch (err) {
      showToast("error", "Application metering failed", err instanceof Error ? err.message : "Unable to process application metering request.");
    } finally {
      setLoading((prev) => ({ ...prev, action: false }));
    }
  };

  const handleScopeMeteringToggle = (node: TreeNode = selectedNode) => {
    const packageId = activePackageId || (node.type === "package" ? node.packageId || 0 : 0);
    if (isScopeMeteringActive(node, packageId)) {
      void runMeteringAction("stop", packageId, node);
      return;
    }
    setSelectedNode(node);
    setMeteringType(packageId > 0 ? "selected" : "all");
    setModalPackageId(packageId);
    setShowMeteringModal(true);
  };

  const handleTreeSearch = (value: string) => {
    setTreeSearch(value);
    const match = treeNodes.find((node) => node.label.toLowerCase().includes(value.trim().toLowerCase()));
    if (value.trim() && match) {
      setSelectedNode(match);
      if (match.type === "package") setSelectedPackageId(match.packageId || 0);
    }
  };

  const usageColumns: EmaTableColumn<UsageRow>[] = [
    { key: "no", header: "No", width: "4.5rem", render: (_row, index) => String((page - 1) * PAGE_SIZE + index + 1).padStart(2, "0") },
    {
      key: "application",
      header: "Application",
      render: (row) => (
        <button type="button" onClick={() => setDetailRow(row)} className="min-w-0 text-left bg-transparent border-0 p-0 shadow-none outline-none">
          <strong className="block break-words text-slate-950 hover:underline cursor-pointer">{row.application}</strong>
          <small className="block break-words text-xs font-bold text-slate-500">
            {row.version !== "-" ? `Version ${row.version}` : row.originalFileName}
          </small>
        </button>
      ),
    },
    {
      key: "executable",
      header: "Executable",
      render: (row) => (
        <div className="min-w-0">
          <span className="font-monospace text-xs block truncate">{row.originalFileName || row.fileName}</span>
          <small className="block truncate text-xs font-bold text-slate-500" title={row.filePath}>
            {row.filePath !== "-" ? row.filePath : row.fileName}
          </small>
        </div>
      ),
    },
    {
      key: "device",
      header: "Device / User",
      render: (row) => (
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600"><UserRound size={14} /></span>
          <span className="min-w-0">
            <strong className="block break-words text-slate-950">{row.device}</strong>
            <small className="block break-words text-xs font-bold text-slate-500">
              {row.user !== "-" ? row.user : row.site}{row.ip !== "-" ? ` · ${row.ip}` : ""}
            </small>
          </span>
        </div>
      ),
    },
    { key: "usage", header: "Used Time", render: (row) => <strong>{formatUsageDuration(row.usedTimeSeconds)}</strong> },
    { key: "launch", header: "Launch", align: "center", render: (row) => row.launchCount.toLocaleString() },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    { key: "risk", header: "Risk", render: (row) => <StatusBadge status={row.risk} /> },
    { key: "action", header: "Action", render: (row) => <EmaButton variant="secondary" onClick={() => setDetailRow(row)}>Details</EmaButton> },
  ];

  const deviceColumns: EmaTableColumn<TreeNode>[] = [
    { key: "no", header: "No", width: "4.5rem", render: (_row, index) => String((page - 1) * PAGE_SIZE + index + 1).padStart(2, "0") },
    {
      key: "deviceName",
      header: "Device Name",
      render: (device) => (
        <button type="button" onClick={() => handleNodeSelect(device)} className="flex min-w-0 items-center gap-2 text-left bg-transparent border-0 p-0 shadow-none outline-none">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600"><UserRound size={14} /></span>
          <span className="min-w-0">
            <strong className="block break-words text-slate-950 hover:underline cursor-pointer">{device.label}</strong>
            <small className="block break-words text-xs font-bold text-slate-500">{device.subLabel || getTreeNodeValue(device, ["Object_Full_Name"], "-")}</small>
          </span>
        </button>
      ),
    },
    {
      key: "platform",
      header: "Platform / Model",
      render: (device) => (
        <div className="min-w-0">
          <strong className="block truncate">{getTreeNodeValue(device, ["PlatformType"], "-")}</strong>
          <small className="block truncate text-xs font-bold text-slate-500">{getTreeNodeValue(device, ["Model"], "-")}</small>
        </div>
      ),
    },
    { key: "status", header: "Status", render: (device) => <StatusBadge status={device.status || "-"} /> },
    { key: "lastConnected", header: "Last Connected", render: (device) => formatApiDate(String(device.raw?.ConnectionTime || "")) },
    { key: "groupPath", header: "Group Path", render: (device) => <span className="block truncate max-w-[12rem]">{getTreeNodeValue(device, ["Object_Full_Name", "Department", "Site", "GroupName"], "-")}</span> },
    { key: "deviceId", header: "Device ID", render: (device) => <span className="font-monospace text-xs">{getTreeNodeValue(device, ["Object_DeviceID", "DeviceID", "MDM_DeviceID"], "-")}</span> },
    { key: "ipAddress", header: "IP Address", render: (device) => getTreeNodeValue(device, ["IP", "IPAddress", "DeviceIPAddress", "DeviceLocalIPAddress"], "-") },
  ];

  const sidebar = (
    <EmaSidebarPanel
      eyebrow="App Metering"
      title="Application Metering"
      description="Manage branch targets and package records."
      tabs={[
        { id: "device", label: "Branch", icon: <FolderOpen size={16} /> },
        { id: "package", label: "Packages", icon: <Database size={16} /> },
      ]}
      activeTab={viewMode}
      onTabChange={(tab) => {
        setViewMode(tab as ViewMode);
        setTreeSearch("");
        setPage(1);
      }}
      searchValue={treeSearch}
      searchPlaceholder={viewMode === "device" ? "Search branches..." : "Search packages..."}
      onSearchChange={handleTreeSearch}
    >
      {loading.hierarchy || loading.packages ? (
        <EmaSpinner label={viewMode === "device" ? "Loading branches..." : "Loading packages..."} />
      ) : (
        <AppMeteringTree nodes={activeTree} selectedId={selectedNode.id} onSelect={handleNodeSelect} search={treeSearch} />
      )}
    </EmaSidebarPanel>
  );

  return (
    <>
      <EmaToastViewport items={toasts} onClose={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
      <EmaPageLayout title="Application Metering" subtitle="Track application usage by branch, device and package." sidebar={sidebar}>
        <div className="space-y-3">
          <EmaSection eyebrow="APPLICATION COMMAND CENTER" title="Application Metering" description={`${selectedNode.label} · ${oneYearMode ? "One year window" : `${startDate} to ${endDate}`}`}>
            <EmaKpiGrid>
              <EmaKpiCard title="Apps in Scope" value={summary.uniqueApplications.toLocaleString()} note="Unique metered apps" icon={<Package size={16} />} />
              <EmaKpiCard title="Usage Hours" value={`${(summary.totalSeconds / 3600).toFixed(1)}h`} note="Selected date range" icon={<Gauge size={16} />} tone="emerald" />
              <EmaKpiCard title="Devices" value={summary.uniqueDevices.toLocaleString()} note="Devices in usage" icon={<UserRound size={16} />} tone="violet" />
              <EmaKpiCard title="Review Apps" value={summary.review.toLocaleString()} note="Low or unusual use" icon={<AlertTriangle size={16} />} tone="amber" onClick={() => setFilters((prev) => ({ ...prev, status: "Review" }))} />
              <EmaKpiCard title="Restricted" value={summary.restricted.toLocaleString()} note="Policy review needed" icon={<Layers3 size={16} />} tone="rose" onClick={() => setFilters((prev) => ({ ...prev, status: "Restricted" }))} />
            </EmaKpiGrid>
          </EmaSection>

          <EmaToolbar
            left={
              <>
                <EmaButton variant={isCurrentMeteringScopeActive ? "danger" : "primary"} onClick={() => handleScopeMeteringToggle(currentMeteringScopeNode)} disabled={loading.action}>
                  {isCurrentMeteringScopeActive ? <StopCircle size={15} /> : <Play size={15} />} {currentMeteringButtonLabel}
                </EmaButton>
                <EmaButton variant="secondary" onClick={() => void runMeteringAction("collect", activePackageId, selectedNode)} disabled={loading.action}>
                  <RefreshCw size={15} /> Collect
                </EmaButton>
              </>
            }
            search={<EmaSearchInput value={searchTerm} onChange={(value) => { setSearchTerm(value); setPage(1); }} placeholder={showDeviceRegistry ? "Search devices, IPs, users..." : "Search application, device or user..."} />}
            right={
              <>
                <EmaButton variant="secondary" onClick={() => void loadUsage()} disabled={loading.usage}><RefreshCw size={15} /> Refresh</EmaButton>
                <EmaButton variant="primary" onClick={() => showDeviceRegistry ? showToast("info", "Device list info", "Device registry uses the same relation asset payload cache.") : exportCsv(filteredRows)} disabled={showDeviceRegistry ? !filteredDeviceRows.length : !filteredRows.length}>
                  <Download size={15} /> {showDeviceRegistry ? "Source" : "Export"}
                </EmaButton>
              </>
            }
            filters={
              <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[repeat(6,minmax(0,1fr))]">
                <ControlField label="Start Date">
                  <input className={controlClassName()} type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                </ControlField>
                <ControlField label="End Date">
                  <input className={controlClassName()} type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                </ControlField>
                <ControlField label="Package">
                  <select className={controlClassName()} value={selectedPackageId} onChange={(event) => { setSelectedPackageId(Number(event.target.value)); setPage(1); }}>
                    <option value={0}>All packages</option>
                    {packageOptions.map((pkg) => <option key={pkg.SW_Pkg_Idn} value={pkg.SW_Pkg_Idn}>{pkg.name}</option>)}
                  </select>
                </ControlField>
                <ControlField label="Status">
                  <select className={controlClassName()} value={filters.status} onChange={(event) => { setFilters((prev) => ({ ...prev, status: event.target.value })); setPage(1); }}>
                    <option value="all">All status</option>
                    {statusOrder.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </ControlField>
                <ControlField label="License">
                  <select className={controlClassName()} value={filters.license} onChange={(event) => { setFilters((prev) => ({ ...prev, license: event.target.value })); setPage(1); }}>
                    <option value="all">All license</option>
                    <option value="Free">Free</option>
                    <option value="Paid">Paid</option>
                    <option value="Enterprise">Enterprise</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </ControlField>
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
                  <ControlField label="SP Mode">
                    <select className={controlClassName()} value={oneYearMode ? "oneYear" : "normal"} onChange={(event) => setOneYearMode(event.target.value === "oneYear")}>
                      <option value="normal">Normal</option>
                      <option value="oneYear">One Year</option>
                    </select>
                  </ControlField>
                  <ControlField label="Page Mode">
                    <select className={controlClassName()} value={nextPageMode ? "nextpage" : "first"} onChange={(event) => setNextPageMode(event.target.value === "nextpage")} disabled={!oneYearMode}>
                      <option value="first">First Page</option>
                      <option value="nextpage">Next Page</option>
                    </select>
                  </ControlField>
                  <EmaButton variant="ghost" onClick={() => { setFilters({ status: "all", license: "all" }); setSelectedPackageId(0); setSearchTerm(""); setOneYearMode(false); setNextPageMode(false); setPage(1); }}><X size={14} /> Reset</EmaButton>
                </div>
              </div>
            }
          />

          <EmaTableShell title={showDeviceRegistry ? "Target Device Registry" : "Application Usage Registry"} subtitle={`${showDeviceRegistry ? filteredDeviceRows.length.toLocaleString() : filteredRows.length.toLocaleString()} record(s) shown`}>
            {error ? <div className="border-b border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</div> : null}
            
            {showDeviceRegistry ? (
              loading.assets && !pagedDeviceRows.length ? <EmaSpinner label="Loading devices..." /> : (
                <EmaTable columns={deviceColumns} rows={pagedDeviceRows} loading={loading.assets} getRowKey={(device, index) => `${device.id}-${index}`} emptyText={selectedNode.id === "organization" ? "Company scope selected. Choose a department branch to browse devices." : "No devices found in this folder scope."} />
              )
            ) : (
              loading.usage && !pagedRows.length ? <EmaSpinner label="Loading application usage..." /> : (
                <EmaTable columns={usageColumns} rows={pagedRows} loading={loading.usage} getRowKey={(row, index) => `${row.id}-${index}`} emptyText="No application usage records found." />
              )
            )}
            
            <EmaPagination page={page} totalPages={pageCount} totalLabel={`Page ${page} of ${pageCount} • ${showDeviceRegistry ? filteredDeviceRows.length.toLocaleString() : filteredRows.length.toLocaleString()} records`} onPageChange={setPage} />
          </EmaTableShell>
        </div>
      </EmaPageLayout>

      <EmaModal
        open={showMeteringModal}
        title="Create Metering Job"
        description={`Target Scope: ${selectedNode.label}`}
        onClose={() => setShowMeteringModal(false)}
        footer={
          <>
            <EmaButton variant="secondary" onClick={() => setShowMeteringModal(false)}>Cancel</EmaButton>
            <EmaButton variant="primary" disabled={loading.action} onClick={() => void runMeteringAction("start", modalPackageId, selectedNode)}>
              {loading.action ? "Submitting..." : "Start Metering"}
            </EmaButton>
          </>
        }
      >
        <div className="space-y-3 text-sm font-semibold text-slate-700">
          <label className="form-field block space-y-1">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500 block">Metering Type</span>
            <select className={controlClassName()} value={meteringType} onChange={(event) => setMeteringType(event.target.value as "all" | "selected")}>
              <option value="all">All applications</option>
              <option value="selected">Selected package</option>
            </select>
          </label>
          <label className="form-field block space-y-1">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500 block">Package</span>
            <select className={controlClassName()} value={modalPackageId || selectedPackageId} onChange={(event) => { setModalPackageId(Number(event.target.value)); setMeteringType(Number(event.target.value) > 0 ? "selected" : "all"); }}>
              <option value={0}>All packages</option>
              {packages.map((pkg) => <option key={pkg.SW_Pkg_Idn} value={pkg.SW_Pkg_Idn}>{pkg.name}</option>)}
            </select>
          </label>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Reporting Window</p>
            <p className="text-sm font-black text-slate-950">{startDate} → {endDate}</p>
          </div>
          <div className="space-y-1 text-xs font-medium text-slate-500">
            <label className="flex items-center gap-2"><input type="checkbox" checked readOnly className="rounded border-slate-300" /> <span>Include launch count and active duration</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked readOnly className="rounded border-slate-300" /> <span>Create job destination automatically by scope identifiers.</span></label>
          </div>
        </div>
      </EmaModal>

      <EmaModal
        open={Boolean(detailRow)}
        title={detailRow?.application || "Application Detail"}
        description={detailRow ? `${detailRow.device} • ${detailRow.user}` : undefined}
        onClose={() => setDetailRow(null)}
        footer={
          <>
            <EmaButton variant="secondary" onClick={() => void loadUsage()}><RefreshCw size={14} /> Refresh Meter</EmaButton>
            <EmaButton variant="secondary" onClick={() => { if (detailRow) exportCsv([detailRow]); }}><Download size={14} /> Export Detail</EmaButton>
            <EmaButton variant={isSelectedScopeMeteringActive ? "danger" : "primary"} onClick={() => handleScopeMeteringToggle()}>{isSelectedScopeMeteringActive ? <StopCircle size={14} /> : <Play size={14} />} {isSelectedScopeMeteringActive ? "Stop Metering" : "Start Metering"}</EmaButton>
            <EmaButton variant="primary" onClick={() => showToast("success", "Review updated", "The selected application has been marked for review in the UI.")}><CheckCircle2 size={14} /> Mark Reviewed</EmaButton>
          </>
        }
      >
        {detailRow ? (
          <div className="space-y-4 text-sm font-semibold text-slate-700 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <span className="text-xs font-black uppercase text-slate-500 block">Usage Time</span>
                <strong className="text-lg font-black text-slate-950">{formatUsageDuration(detailRow.usedTimeSeconds)}</strong>
                <small className="block text-xs text-slate-400 mt-0.5">{detailRow.usedTimeSeconds.toLocaleString()} seconds</small>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <span className="text-xs font-black uppercase text-slate-500 block">Launch Count</span>
                <strong className="text-lg font-black text-slate-950">{detailRow.launchCount}</strong>
                <small className="block text-xs text-slate-400 mt-0.5">Execution events</small>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <span className="text-xs font-black uppercase text-slate-500 block">Risk / Status</span>
                <div className="mt-1"><StatusBadge status={detailRow.risk} /></div>
                <small className="block text-xs text-slate-400 mt-1">{detailRow.status}</small>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <span className="text-xs font-black uppercase text-slate-500 block">License Type</span>
                <div className="mt-1"><StatusBadge status={detailRow.licenseType} /></div>
                <small className="block text-xs text-slate-400 mt-1">Classification</small>
              </div>
            </div>

            <div className="space-y-2 border-t pt-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Application Information</h4>
              <p><strong className="text-slate-950">Publisher:</strong> {detailRow.publisher}</p>
              <p><strong className="text-slate-950">Version:</strong> {detailRow.version}</p>
              <p><strong className="text-slate-950">Executable File:</strong> <span className="font-monospace text-xs">{detailRow.fileName}</span></p>
              <p><strong className="text-slate-950">Original File:</strong> <span className="font-monospace text-xs">{detailRow.originalFileName}</span></p>
              <p><strong className="text-slate-950">File Path:</strong> <span className="font-monospace text-xs break-all">{detailRow.filePath}</span></p>
            </div>

            <div className="space-y-2 border-t pt-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Endpoint Context</h4>
              <p><strong className="text-slate-950">Device:</strong> {detailRow.device}</p>
              <p><strong className="text-slate-950">User:</strong> {detailRow.user}</p>
              <p><strong className="text-slate-950">Site Branch:</strong> {detailRow.site}</p>
              <p><strong className="text-slate-950">IP Address:</strong> {detailRow.ip}</p>
              <p><strong className="text-slate-950">Start Time:</strong> {detailRow.appStartTime}</p>
              <p><strong className="text-slate-950">End / Last Used:</strong> {detailRow.appEndTime !== "-" ? detailRow.appEndTime : detailRow.lastUsed}</p>
            </div>

            <div className="space-y-2 border-t pt-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Package File Group</h4>
              {loading.packageFiles ? (
                <p className="text-xs text-slate-400">Loading package file definitions...</p>
              ) : packageFiles.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No package file group definitions loaded for this index context.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-slate-50 p-2 rounded-xl border">
                  {packageFiles.slice(0, 8).map((file) => (
                    <div className="p-2 border bg-white rounded-lg text-xs" key={`${file.id}-${file.fileName}`}>
                      <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full font-bold inline-block mb-1">{file.version || "File Group"}</span>
                      <strong className="block font-monospace truncate text-slate-900">{file.fileName}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 border-t pt-3 bg-amber-50/50 p-3 rounded-xl border border-amber-100">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-800 flex items-center gap-1"><AlertTriangle size={14} /> Recommendation</h4>
              <p className="text-xs text-amber-950 leading-relaxed font-medium">{detailRow.recommendation}</p>
            </div>
          </div>
        ) : null}
      </EmaModal>
    </>
  );
}