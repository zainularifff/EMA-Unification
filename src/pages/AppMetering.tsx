import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Database,
  Download,
  Filter,
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
  EmaFilterField,
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
  packageId: number;
  name: string;
  manufacturer: string;
  classification: string;
  raw?: AnyRecord;
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

type FilterState = {
  status: string;
  license: string;
};

const PAGE_SIZE = 10;
const statusOrder: UsageStatus[] = ["Productive", "Review", "Restricted", "Unused"];
const restrictedKeywords = ["torrent", "utorrent", "bittorrent", "anydesk", "teamviewer", "remote", "vpn", "cracker", "keygen"];
const paidKeywords = ["visio", "project", "autocad", "adobe", "photoshop", "illustrator", "acrobat", "sap"];
const enterpriseKeywords = ["office", "teams", "outlook", "excel", "word", "powerpoint", "sap"];

const emptyNode: TreeNode = {
  id: "organization",
  label: "All Branches",
  type: "folder",
  relationID: -1,
  count: 0,
  children: [],
};

function asRecord(value: unknown): AnyRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as AnyRecord) : null;
}

function unwrapRows<T = AnyRecord>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const record = asRecord(payload);
  if (!record) return [];
  const data = asRecord(record.data);
  if (Array.isArray(record.raw)) return record.raw as T[];
  if (Array.isArray(data?.raw)) return data.raw as T[];
  if (Array.isArray(record.rows)) return record.rows as T[];
  if (Array.isArray(record.data)) return record.data as T[];
  if (Array.isArray(data?.rows)) return data.rows as T[];
  const firstArray = Object.values(record).find(Array.isArray);
  return Array.isArray(firstArray) ? (firstArray as T[]) : [];
}

function pickValue(record: AnyRecord | null | undefined, keys: string[], fallback = "-") {
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

function defaultStartDate() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return formatDateInput(date);
}

function formatDateTime(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw || raw === "-") return "-";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleString("en-MY", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatUsageDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(Number.isFinite(seconds) ? seconds : 0));
  if (safeSeconds <= 0) return "0s";
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;
  if (hours > 0) return `${(safeSeconds / 3600).toFixed(hours >= 10 ? 0 : 1)}h`;
  if (minutes > 0) return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  return `${remainingSeconds}s`;
}

function getStatus(application: string, launchCount: number, usedTimeSeconds: number): UsageStatus {
  const app = application.toLowerCase();
  if (restrictedKeywords.some((keyword) => app.includes(keyword))) return "Restricted";
  if (launchCount <= 0 && usedTimeSeconds <= 0) return "Unused";
  if (usedTimeSeconds <= 0) return "Unused";
  if (usedTimeSeconds / 3600 < 2 || launchCount < 5) return "Review";
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

function mapDepartmentNode(department: ApiDepartment): TreeNode {
  const relationID = parseNumber(department.Object_Rel_Idn, 0);
  const label = department.Object_Rel_Name || department.Object_Full_Name || `Branch ${relationID}`;
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
  const children = departments.map(mapDepartmentNode);
  return [{ ...emptyNode, count: children.reduce((total, child) => total + getTreeCount(child), 0), children }];
}

function normalizePackageRow(row: unknown, index = 0): PackageRow {
  const record = asRecord(row) || {};
  const packageId = parseNumber(pickValue(record, ["SW_Pkg_Idn", "SW_Pkg_ID", "SWPkgIdn", "SW_Idn", "id"], String(index + 1)), index + 1);
  const name = pickValue(record, ["label", "name", "SW_Pkg_Name", "SWPkgName", "PackageName", "ApplicationPackage"], `Package ${index + 1}`);
  return {
    id: String(packageId),
    packageId,
    name,
    manufacturer: pickValue(record, ["manufacturer", "Manufacturer", "CompanyName", "Vendor"], "-"),
    classification: pickValue(record, ["classification", "Classification", "CategoryName", "SW_Category"], "Application"),
    raw: record,
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
          id: `package-${pkg.packageId}`,
          label: pkg.name,
          subLabel: pkg.manufacturer,
          type: "package" as const,
          packageId: pkg.packageId,
          count: 0,
          raw: pkg.raw,
        })),
    }));
  return [{ id: "all-packages", label: "Application Packages", type: "folder" as const, count: packages.length, children }];
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
  const application = pickValue(record, ["application", "Application", "SW_FileName", "SW_File_Name", "FileName", "fileName", "ProcessName"], `Application ${index + 1}`);
  const launchCount = parseNumber(pickValue(record, ["launchCount", "LaunchCount", "CCount", "Count", "RunCount"], "0"), 0);
  const usedTimeSeconds = parseNumber(pickValue(record, ["usedTimeSeconds", "UsedTimeSeconds", "ActiveTime", "UsedSeconds", "DurationSeconds"], "0"), 0);
  const status = getStatus(application, launchCount, usedTimeSeconds);
  const risk = getRisk(status);
  const licenseType = getLicenseType(application);
  return {
    id: String(pickValue(record, ["id", "ID", "SW_File_Idn", "File_Idn", "No"], `${application}-${index}`)),
    application,
    publisher: pickValue(record, ["publisher", "Publisher", "CompanyName", "Manufacturer", "Vendor"], "-"),
    version: pickValue(record, ["version", "Version", "FileVersion", "SW_Version"], "-"),
    fileName: pickValue(record, ["SW_FileName", "FileName", "fileName", "ProcessName"], application),
    originalFileName: pickValue(record, ["OriginalFileName", "Original_File_Name", "OriginalName"], "-"),
    device: pickValue(record, ["ComputerName", "DeviceName", "Object_DeviceID", "AssetTag"], "-"),
    user: pickValue(record, ["UserName", "Username", "OwnerName", "DisplayName", "LoginUser"], "-"),
    site: pickValue(record, ["Object_Full_Name", "Department", "Branch", "Site", "GroupName"], "-"),
    ip: pickValue(record, ["IP", "IPAddress", "IpAddress"], "-"),
    filePath: pickValue(record, ["FilePath", "Path", "SW_FilePath", "OriginalPath"], "-"),
    appStartTime: formatDateTime(pickValue(record, ["App_StartTime", "StartTime", "appStartTime"], "")),
    appEndTime: formatDateTime(pickValue(record, ["App_EndTime", "EndTime", "appEndTime"], "")),
    usedTimeSeconds,
    launchCount,
    lastUsed: formatDateTime(pickValue(record, ["LastUsed", "LastRun", "App_EndTime", "EndTime"], "")),
    status,
    risk,
    licenseType,
    recommendation: getRecommendation(status, risk, licenseType),
    raw: record,
  };
}

function normalizeAssetNode(row: unknown, index = 0): TreeNode | null {
  const record = asRecord(row) || {};
  const rawAssetId = parseNumber(pickValue(record, ["_Idn", "Object_Root_Idn", "ObjectRootIdn", "ClientID", "MDM_Asset_Idn"], "0"), 0);
  if (!rawAssetId) return null;
  const deviceName = pickValue(record, ["DeviceName", "ComputerName", "MDM_DeviceName", "Name", "Object_DeviceID"], `Device ${index + 1}`);
  const ownerName = pickValue(record, ["DisplayName", "OwnerName", "DeviceOwner", "UserName", "LastLoggedInUser", "Object_Client_Name"], "-");
  return {
    id: `device-${rawAssetId}`,
    label: deviceName,
    subLabel: ownerName,
    status: pickValue(record, ["ConnectionStatus", "Status"], "-"),
    type: "device",
    objectRootIdn: rawAssetId,
    objectDeviceID: pickValue(record, ["Object_DeviceID", "DeviceID", "MDM_DeviceID"], ""),
    objectAgent: pickValue(record, ["Object_Agent", "Agent", "Source"], "EM"),
    mdmAssetIdn: parseNumber(pickValue(record, ["MDM_Asset_Idn"], "0"), 0),
    raw: record,
  };
}

function exportCsv(rows: UsageRow[]) {
  const header = ["Application", "Publisher", "Version", "File", "Device", "User", "Branch", "IP", "Start Time", "End Time", "Used Time", "Launch Count", "Status", "Risk", "License", "Recommendation"];
  const csv = [
    header.join(","),
    ...rows.map((row) =>
      [
        row.application,
        row.publisher,
        row.version,
        row.fileName,
        row.device,
        row.user,
        row.site,
        row.ip,
        row.appStartTime,
        row.appEndTime,
        formatUsageDuration(row.usedTimeSeconds),
        row.launchCount,
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
  const tone = key.includes("restricted") || key.includes("high")
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : key.includes("review") || key.includes("medium") || key.includes("paid")
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : key.includes("productive") || key.includes("low") || key.includes("free")
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

export default function AppMetering() {
  const [viewMode, setViewMode] = useState<ViewMode>("device");
  const [departmentTree, setDepartmentTree] = useState<TreeNode[]>([emptyNode]);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [selectedNode, setSelectedNode] = useState<TreeNode>(emptyNode);
  const [selectedPackageId, setSelectedPackageId] = useState<number>(0);
  const [usageRows, setUsageRows] = useState<UsageRow[]>([]);
  const [deviceRows, setDeviceRows] = useState<TreeNode[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [treeSearch, setTreeSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>({ status: "all", license: "all" });
  const [startDate, setStartDate] = useState(defaultStartDate());
  const [endDate, setEndDate] = useState(formatDateInput(new Date()));
  const [oneYearMode, setOneYearMode] = useState(false);
  const [page, setPage] = useState(1);
  const [drawerRow, setDrawerRow] = useState<UsageRow | null>(null);
  const [showMeteringModal, setShowMeteringModal] = useState(false);
  const [loading, setLoading] = useState({ hierarchy: false, packages: false, usage: false, action: false, assets: false });
  const [error, setError] = useState("");
  const [toasts, setToasts] = useState<EmaToastItem[]>([]);

  const packageTree = useMemo(() => buildPackageTree(packages), [packages]);
  const activeTree = viewMode === "device" ? departmentTree : packageTree;
  const activePackageId = selectedPackageId || (selectedNode.type === "package" ? selectedNode.packageId || 0 : 0);

  const showToast = useCallback((tone: EmaToastItem["tone"], title: ReactNode, message?: ReactNode) => {
    const id = Date.now();
    setToasts([{ id, tone, title, message }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3600);
  }, []);

  const loadHierarchy = useCallback(async () => {
    setLoading((prev) => ({ ...prev, hierarchy: true }));
    try {
      const payload = await appMeteringService.getDepartments();
      const departments = unwrapRows<ApiDepartment>(payload);
      const tree = buildDepartmentTree(departments);
      setDepartmentTree(tree);
      setSelectedNode((current) => findTreeNodeById(tree, current.id) || tree[0] || emptyNode);
    } catch (err) {
      setError("Branch view is not available right now.");
      setDepartmentTree([emptyNode]);
    } finally {
      setLoading((prev) => ({ ...prev, hierarchy: false }));
    }
  }, []);

  const loadPackages = useCallback(async () => {
    setLoading((prev) => ({ ...prev, packages: true }));
    try {
      const payload = await appMeteringService.getPackages();
      setPackages(unwrapRows(payload).map(normalizePackageRow));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load application packages.");
    } finally {
      setLoading((prev) => ({ ...prev, packages: false }));
    }
  }, []);

  const loadAssetsForScope = useCallback(async (node: TreeNode) => {
    if (node.type !== "folder" || !node.relationID || node.relationID <= 0) {
      setDeviceRows([]);
      return;
    }
    setLoading((prev) => ({ ...prev, assets: true }));
    try {
      const payload = await appMeteringService.getAssetsByRelationID(node.relationID);
      setDeviceRows(unwrapRows(payload).map(normalizeAssetNode).filter((item): item is TreeNode => Boolean(item)));
    } catch {
      setDeviceRows([]);
      showToast("error", "Device list unavailable", "Unable to load devices for this branch.");
    } finally {
      setLoading((prev) => ({ ...prev, assets: false }));
    }
  }, [showToast]);

  const loadUsage = useCallback(async () => {
    setLoading((prev) => ({ ...prev, usage: true }));
    setError("");
    try {
      const relationID = selectedNode.type === "folder" && selectedNode.relationID && selectedNode.relationID > 0 ? selectedNode.relationID : undefined;
      const payload = await appMeteringService.getUsage({
        startDate,
        endDate,
        relationID,
        Object_Rel_Idn: relationID,
        swPkgId: activePackageId || -1,
        packageId: activePackageId || undefined,
        oneYear: oneYearMode ? 1 : undefined,
      });
      setUsageRows(unwrapRows(payload).map(normalizeUsageRow));
      setPage(1);
    } catch (err) {
      setUsageRows([]);
      setError(err instanceof Error ? err.message : "Failed to load application usage.");
    } finally {
      setLoading((prev) => ({ ...prev, usage: false }));
    }
  }, [activePackageId, endDate, oneYearMode, selectedNode, startDate]);

  useEffect(() => {
    void loadHierarchy();
    void loadPackages();
  }, [loadHierarchy, loadPackages]);

  useEffect(() => {
    if (selectedNode.type === "folder") void loadAssetsForScope(selectedNode);
  }, [loadAssetsForScope, selectedNode]);

  useEffect(() => {
    void loadUsage();
  }, [loadUsage]);

  const handleNodeSelect = (node: TreeNode) => {
    setSelectedNode(node);
    if (node.type === "package") setSelectedPackageId(node.packageId || 0);
    setPage(1);
  };

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return usageRows.filter((row) => {
      const matchesTerm = !term || [row.application, row.publisher, row.fileName, row.device, row.user, row.site, row.ip].join(" ").toLowerCase().includes(term);
      const matchesStatus = filters.status === "all" || row.status === filters.status;
      const matchesLicense = filters.license === "all" || row.licenseType === filters.license;
      return matchesTerm && matchesStatus && matchesLicense;
    });
  }, [filters.license, filters.status, searchTerm, usageRows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const summary = useMemo(() => {
    const uniqueApplications = new Set(usageRows.map((row) => row.application.toLowerCase())).size;
    const totalSeconds = usageRows.reduce((total, row) => total + row.usedTimeSeconds, 0);
    const review = usageRows.filter((row) => row.status === "Review").length;
    const restricted = usageRows.filter((row) => row.status === "Restricted").length;
    return { uniqueApplications, totalSeconds, review, restricted };
  }, [usageRows]);

  const runMeteringAction = async (action: "start" | "collect" | "stop") => {
    const relationID = selectedNode.type === "folder" && selectedNode.relationID && selectedNode.relationID > 0 ? selectedNode.relationID : undefined;
    setLoading((prev) => ({ ...prev, action: true }));
    try {
      await appMeteringService.runMeteringAction(action, {
        title: `${action === "start" ? "Start" : action === "collect" ? "Collect" : "Stop"} Application Metering - ${selectedNode.label}`,
        scanMode: selectedNode.type === "device" ? "device" : relationID ? "folder" : "all",
        packageId: activePackageId || 0,
        swPkgId: activePackageId || -1,
        Object_Rel_Idn: relationID,
        relationID,
        objectRootIdn: selectedNode.objectRootIdn,
        Object_DeviceID: selectedNode.objectDeviceID,
      });
      showToast("success", "Application metering submitted", `${action} request has been sent.`);
      setShowMeteringModal(false);
      await loadUsage();
    } catch (err) {
      showToast("error", "Application metering failed", err instanceof Error ? err.message : "Unable to process application metering request.");
    } finally {
      setLoading((prev) => ({ ...prev, action: false }));
    }
  };

  const usageColumns: EmaTableColumn<UsageRow>[] = [
    { key: "no", header: "No", width: "4.5rem", render: (_row, index) => String((page - 1) * PAGE_SIZE + index + 1).padStart(2, "0") },
    {
      key: "application",
      header: "Application",
      render: (row) => (
        <div className="min-w-0">
          <strong className="block break-words text-slate-950">{row.application}</strong>
          <small className="block break-words text-xs font-bold text-slate-500">{row.publisher}</small>
        </div>
      ),
    },
    { key: "version", header: "Version", render: (row) => row.version },
    {
      key: "device",
      header: "Device / User",
      render: (row) => (
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600"><UserRound size={14} /></span>
          <span className="min-w-0">
            <strong className="block break-words text-slate-950">{row.device}</strong>
            <small className="block break-words text-xs font-bold text-slate-500">{row.user}</small>
          </span>
        </div>
      ),
    },
    { key: "site", header: "Branch", render: (row) => row.site },
    { key: "usage", header: "Used Time", render: (row) => <strong>{formatUsageDuration(row.usedTimeSeconds)}</strong> },
    { key: "launch", header: "Launch", align: "center", render: (row) => row.launchCount.toLocaleString() },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    { key: "risk", header: "Risk", render: (row) => <StatusBadge status={row.risk} /> },
    { key: "lastUsed", header: "Last Used", render: (row) => row.lastUsed },
  ];

  const deviceColumns: EmaTableColumn<TreeNode>[] = [
    { key: "no", header: "No", width: "4.5rem", render: (_row, index) => String((page - 1) * PAGE_SIZE + index + 1).padStart(2, "0") },
    {
      key: "device",
      header: "Device Name",
      render: (row) => (
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600"><UserRound size={14} /></span>
          <span className="min-w-0"><strong className="block break-words text-slate-950">{row.label}</strong><small className="block break-words text-xs font-bold text-slate-500">{row.subLabel || "-"}</small></span>
        </div>
      ),
    },
    { key: "platform", header: "Platform", render: (row) => pickValue(row.raw, ["PlatformType"], "-") },
    { key: "status", header: "Status", render: (row) => row.status || "-" },
    { key: "ip", header: "IP Address", render: (row) => pickValue(row.raw, ["IP", "IPAddress", "IpAddress"], "-") },
  ];

  const packageOptions = useMemo(() => packages.slice().sort((a, b) => a.name.localeCompare(b.name)), [packages]);
  const showDeviceRegistry = viewMode === "device" && selectedNode.type === "folder" && selectedNode.relationID && selectedNode.relationID > 0;
  const shownRows = showDeviceRegistry ? deviceRows : pagedRows;
  const shownTotal = showDeviceRegistry ? deviceRows.length : filteredRows.length;
  const shownPages = showDeviceRegistry ? Math.max(1, Math.ceil(deviceRows.length / PAGE_SIZE)) : totalPages;
  const shownPageRows = showDeviceRegistry ? deviceRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : pagedRows;

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
      onSearchChange={setTreeSearch}
    >
      {loading.hierarchy || loading.packages ? <EmaSpinner label={viewMode === "device" ? "Loading branches..." : "Loading packages..."} /> : <AppMeteringTree nodes={activeTree} selectedId={selectedNode.id} onSelect={handleNodeSelect} search={treeSearch} />}
    </EmaSidebarPanel>
  );

  return (
    <>
      <EmaToastViewport items={toasts} onClose={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
      <EmaPageLayout title="Application Metering" subtitle="Track application usage by branch, device and package." sidebar={sidebar}>
        <div className="space-y-3">
          <EmaSection eyebrow="Application Command Center" title="Application Metering" description={`${selectedNode.label} · ${startDate} to ${endDate}`}>
            <EmaKpiGrid>
              <EmaKpiCard title="Apps in Scope" value={summary.uniqueApplications.toLocaleString()} note="Unique metered apps" icon={<Package size={16} />} />
              <EmaKpiCard title="Usage Hours" value={`${(summary.totalSeconds / 3600).toFixed(1)}h`} note="Selected date range" icon={<Gauge size={16} />} tone="emerald" />
              <EmaKpiCard title="Review Apps" value={summary.review.toLocaleString()} note="Low or unusual use" icon={<AlertTriangle size={16} />} tone="amber" onClick={() => setFilters((prev) => ({ ...prev, status: "Review" }))} />
              <EmaKpiCard title="Restricted" value={summary.restricted.toLocaleString()} note="Policy review needed" icon={<Layers3 size={16} />} tone="rose" onClick={() => setFilters((prev) => ({ ...prev, status: "Restricted" }))} />
            </EmaKpiGrid>
          </EmaSection>

          <EmaToolbar
            left={
              <>
                <EmaButton variant="primary" onClick={() => setShowMeteringModal(true)} disabled={loading.action}><Play size={15} /> Metering Scope</EmaButton>
                <EmaButton variant="secondary" onClick={() => void runMeteringAction("collect")} disabled={loading.action}><RefreshCw size={15} /> Collect</EmaButton>
              </>
            }
            search={<EmaSearchInput value={searchTerm} onChange={(value) => { setSearchTerm(value); setPage(1); }} placeholder={showDeviceRegistry ? "Search devices, IPs, users..." : "Search application, device or user..."} />}
            right={
              <>
                <EmaButton variant="secondary" onClick={() => void loadUsage()} disabled={loading.usage}><RefreshCw size={15} /> Refresh</EmaButton>
                <EmaButton variant="primary" onClick={() => exportCsv(filteredRows)} disabled={!filteredRows.length}><Download size={15} /> Export</EmaButton>
              </>
            }
            filters={
              <>
                <EmaFilterField label="Start Date"><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></EmaFilterField>
                <EmaFilterField label="End Date"><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></EmaFilterField>
                <EmaFilterField label="Package">
                  <select value={selectedPackageId} onChange={(event) => { setSelectedPackageId(Number(event.target.value)); setPage(1); }}>
                    <option value={0}>All packages</option>
                    {packageOptions.map((pkg) => <option key={pkg.packageId} value={pkg.packageId}>{pkg.name}</option>)}
                  </select>
                </EmaFilterField>
                <EmaFilterField label="Status">
                  <select value={filters.status} onChange={(event) => { setFilters((prev) => ({ ...prev, status: event.target.value })); setPage(1); }}>
                    <option value="all">All status</option>
                    {statusOrder.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </EmaFilterField>
                <EmaFilterField label="License">
                  <select value={filters.license} onChange={(event) => { setFilters((prev) => ({ ...prev, license: event.target.value })); setPage(1); }}>
                    <option value="all">All license</option>
                    <option value="Free">Free</option>
                    <option value="Paid">Paid</option>
                    <option value="Enterprise">Enterprise</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </EmaFilterField>
                <EmaFilterField label="SP Mode">
                  <select value={oneYearMode ? "oneYear" : "normal"} onChange={(event) => setOneYearMode(event.target.value === "oneYear")}>
                    <option value="normal">Normal</option>
                    <option value="oneYear">One Year</option>
                  </select>
                </EmaFilterField>
                <EmaButton variant="ghost" onClick={() => { setFilters({ status: "all", license: "all" }); setSelectedPackageId(0); setSearchTerm(""); setOneYearMode(false); setPage(1); }}><X size={14} /> Reset</EmaButton>
              </>
            }
          />

          <EmaTableShell title={showDeviceRegistry ? "Target Device Registry" : "Application Usage Registry"} subtitle={`${shownTotal.toLocaleString()} record(s) shown`}>
            {error ? <div className="border-b border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</div> : null}
            {showDeviceRegistry ? (
              <EmaTable columns={deviceColumns} rows={shownPageRows as TreeNode[]} loading={loading.assets} getRowKey={(row) => row.id} emptyText="No devices found for this branch." />
            ) : (
              <EmaTable columns={usageColumns} rows={pagedRows} loading={loading.usage} getRowKey={(row, index) => `${row.id}-${index}`} emptyText="No application usage records found." />
            )}
            <EmaPagination page={page} totalPages={shownPages} totalLabel={`Page ${page} of ${shownPages} • ${shownTotal.toLocaleString()} records`} onPageChange={setPage} />
          </EmaTableShell>
        </div>
      </EmaPageLayout>

      <EmaModal
        open={showMeteringModal}
        title="Application Metering"
        description={`Target: ${selectedNode.label}`}
        onClose={() => setShowMeteringModal(false)}
        footer={
          <>
            <EmaButton variant="secondary" onClick={() => setShowMeteringModal(false)}>Cancel</EmaButton>
            <EmaButton variant="danger" onClick={() => void runMeteringAction("stop")} disabled={loading.action}><StopCircle size={15} /> Stop</EmaButton>
            <EmaButton variant="primary" onClick={() => void runMeteringAction("start")} disabled={loading.action}><Play size={15} /> Start</EmaButton>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Scope</p>
            <p className="mt-1 text-sm font-black text-slate-950">{selectedNode.label}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">Package: {activePackageId ? packageOptions.find((pkg) => pkg.packageId === activePackageId)?.name || activePackageId : "All packages"}</p>
          </div>
          <p className="text-sm font-semibold text-slate-600">Start, stop, or collect application metering for the selected scope using the same backend action flow.</p>
        </div>
      </EmaModal>

      <EmaModal
        open={Boolean(drawerRow)}
        title={drawerRow?.application || "Application Detail"}
        description={drawerRow ? `${drawerRow.device} • ${drawerRow.user}` : undefined}
        onClose={() => setDrawerRow(null)}
        footer={<EmaButton variant="primary" onClick={() => setDrawerRow(null)}>Done</EmaButton>}
      >
        {drawerRow ? (
          <div className="grid gap-3 text-sm font-semibold text-slate-700">
            <p><strong className="text-slate-950">Publisher:</strong> {drawerRow.publisher}</p>
            <p><strong className="text-slate-950">File:</strong> {drawerRow.fileName}</p>
            <p><strong className="text-slate-950">Path:</strong> {drawerRow.filePath}</p>
            <p><strong className="text-slate-950">Usage:</strong> {formatUsageDuration(drawerRow.usedTimeSeconds)} · {drawerRow.launchCount} launch(es)</p>
            <p><strong className="text-slate-950">Recommendation:</strong> {drawerRow.recommendation}</p>
          </div>
        ) : null}
      </EmaModal>
    </>
  );
}
