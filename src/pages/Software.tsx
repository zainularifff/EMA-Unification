import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Database,
  Download,
  FileText,
  Folder,
  FolderOpen,
  Layers,
  MonitorSmartphone,
  Package,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
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

type ApiSoftwareRecord = Record<string, unknown>;

type DepartmentNode = {
  Object_Rel_Idn?: number;
  Object_Rel_Name?: string;
  Object_Full_Name?: string;
  Object_PR_Idn?: number;
  children?: DepartmentNode[];
  [key: string]: unknown;
};

type TreeNode = {
  id: string;
  label: string;
  type: "org" | "branch" | "dept" | "device" | "category";
  children?: TreeNode[];
  relationId?: number;
  assetId?: string;
  objectDeviceId?: string;
  count?: number;
};

type SoftwareRecord = {
  id: string;
  softwareName: string;
  category: string;
  publisher: string;
  description: string;
  version: string;
  deviceName: string;
  machineType: string;
  ip: string;
  department: string;
  assetId: string;
  objectDeviceId: string;
  lastUpdated: string;
};

type SidebarTab = "branch" | "statistics";
type ActiveView = "all" | "unique" | "installed" | "categories" | "unclassified";
type SortKey = "softwareName" | "category" | "publisher" | "version" | "deviceName" | "machineType" | "ip" | "lastUpdated";
type SortDirection = "asc" | "desc";
type StatView = "installed" | "license" | "exe" | "dll" | "ini";
type StatRow = Record<string, unknown>;

const PAGE_SIZE = 10;
const EMPTY_VALUE = "-";

function resolveApiBaseUrl() {
  const envUrl = ((import.meta.env.VITE_API_BASE_URL as string | undefined) || (import.meta.env.VITE_API_URL as string | undefined) || "").trim();
  return envUrl ? envUrl.replace(/\/$/, "") : "";
}

const API_BASE_URL = resolveApiBaseUrl();

function buildApiUrl(path: string) {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

function safeString(value: unknown, fallback = EMPTY_VALUE) {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function readRecordValue(record: ApiSoftwareRecord, keys: string[], fallback = EMPTY_VALUE) {
  for (const key of keys) {
    const direct = record[key];
    if (direct !== undefined && direct !== null && String(direct).trim()) return String(direct).trim();
    const match = Object.keys(record).find((candidate) => candidate.toLowerCase() === key.toLowerCase());
    if (match) {
      const value = record[match];
      if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
    }
  }
  return fallback;
}

function formatDateTime(value: unknown) {
  const raw = safeString(value, "");
  if (!raw || raw === EMPTY_VALUE) return EMPTY_VALUE;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString("en-MY", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function cleanCategory(value: unknown) {
  const text = safeString(value, "Unclassified");
  return text === EMPTY_VALUE || text.toLowerCase() === "uncategorized" ? "Unclassified" : text;
}

function isGuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

function chooseSoftwareName(record: ApiSoftwareRecord, index: number) {
  const candidates = [
    readRecordValue(record, ["RawSoftwareID"], ""),
    readRecordValue(record, ["SoftwareID"], ""),
    readRecordValue(record, ["SoftwareName"], ""),
    readRecordValue(record, ["RawSoftwareName"], ""),
  ];

  for (const candidate of candidates) {
    if (!candidate || candidate === EMPTY_VALUE || isGuidLike(candidate) || /^\d+$/.test(candidate)) continue;
    return candidate;
  }

  return `Software Record ${index + 1}`;
}

function normalizeSoftwareRecord(record: ApiSoftwareRecord, index: number): SoftwareRecord {
  const assetTag = readRecordValue(record, ["AssetTag", "Object_DeviceID", "AssetID"], `asset-${index}`);
  const deviceName = readRecordValue(record, ["ComputerName", "DeviceName", "Object_DeviceID", "AssetTag", "AssetID"], EMPTY_VALUE);
  const publisher = readRecordValue(record, ["Publisher", "Manufacturer", "Vendor", "Description"]);
  const description = readRecordValue(record, ["Description", "SoftwareDescription"], "");

  return {
    id: `${readRecordValue(record, ["SoftwareID", "RawSoftwareID"], `software-${index}`)}-${assetTag}-${index}`,
    softwareName: chooseSoftwareName(record, index),
    category: cleanCategory(readRecordValue(record, ["CategoryName", "Category", "Classification"], "Unclassified")),
    publisher,
    description,
    version: readRecordValue(record, ["Version", "SoftwareVersion"]),
    deviceName,
    machineType: readRecordValue(record, ["MachineType", "DeviceType", "PlatformType", "OS"], "Unknown"),
    ip: readRecordValue(record, ["IP", "IPAddress", "IpAddress"]),
    department: readRecordValue(record, ["Department", "Object_Rel_Name", "Branch"], "Unassigned"),
    assetId: readRecordValue(record, ["AssetID", "AssetTag", "MDM_Asset_Idn"], assetTag),
    objectDeviceId: readRecordValue(record, ["Object_DeviceID", "AssetTag", "AssetID"], assetTag),
    lastUpdated: formatDateTime(readRecordValue(record, ["LastUpdated", "UpdatedAt", "ModifiedDate", "ScanTime"], "")),
  };
}

function getStoredToken() {
  const directKeys = ["ema-access-token", "accessToken", "token", "jwtToken", "bearerToken"];
  for (const key of directKeys) {
    const value = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (value?.trim()) return value.trim();
  }

  const objectKeys = ["ema-auth", "auth", "user", "ema-user", "currentUser", "authUser", "ema-current-user"];
  for (const key of objectKeys) {
    const value = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (!value) continue;
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      const data = parsed.data as Record<string, unknown> | undefined;
      const token = parsed.accessToken || parsed.token || parsed.jwtToken || parsed.bearerToken || data?.accessToken || data?.token;
      if (typeof token === "string" && token.trim()) return token.trim();
    } catch {
      if (value.startsWith("eyJ")) return value;
    }
  }

  return "";
}

async function readJsonResponse<T>(response: Response, url: string): Promise<T> {
  const text = await response.text();
  const contentType = response.headers.get("content-type") || "";
  const lower = text.trim().toLowerCase();
  if (contentType.toLowerCase().includes("text/html") || lower.startsWith("<!doctype") || lower.startsWith("<html")) {
    throw new Error(`API returned HTML instead of JSON from ${url}.`);
  }

  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`API returned invalid JSON from ${url}.`);
  }

  if (!response.ok) {
    const apiPayload = payload as { message?: string; error?: string; errorMessage?: string } | null;
    throw new Error(apiPayload?.message || apiPayload?.error || apiPayload?.errorMessage || `API request failed with status ${response.status} at ${url}.`);
  }

  return payload as T;
}

async function apiGet<T>(path: string): Promise<T> {
  const token = getStoredToken();
  if (!token) throw new Error("Access token missing. Please login again.");
  const url = buildApiUrl(path);
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  return readJsonResponse<T>(response, url);
}

async function apiPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const token = getStoredToken();
  if (!token) throw new Error("Access token missing. Please login again.");
  const url = buildApiUrl(path);
  const response = await fetch(url, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    credentials: "include",
    body: JSON.stringify(body),
  });
  return readJsonResponse<T>(response, url);
}

function unwrapRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  const data = record.data;
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === "object") {
    const firstArray = Object.values(data).find(Array.isArray);
    if (Array.isArray(firstArray)) return firstArray as Record<string, unknown>[];
    return [data as Record<string, unknown>];
  }
  const firstArray = Object.values(record).find(Array.isArray);
  return Array.isArray(firstArray) ? (firstArray as Record<string, unknown>[]) : [];
}

function departmentName(department: DepartmentNode) {
  return department.Object_Rel_Name || department.Object_Full_Name || `Branch ${department.Object_Rel_Idn ?? ""}`;
}

function departmentCount(department: DepartmentNode) {
  const count = Number(department.TotalDevices ?? department.DeviceCount ?? department.AssetCount ?? department.TotalAssets ?? department.Count ?? department.count ?? 0);
  return Number.isFinite(count) ? count : 0;
}

function getTreeCount(node: TreeNode): number {
  if (typeof node.count === "number" && Number.isFinite(node.count) && node.count > 0) return node.count;
  if (node.type === "device") return 1;
  return (node.children || []).reduce((total, child) => total + getTreeCount(child), 0);
}

function mapDepartmentsToTree(departments: DepartmentNode[], depth = 0): TreeNode[] {
  return departments.map((department) => {
    const children = mapDepartmentsToTree(department.children || [], depth + 1);
    const count = departmentCount(department) || children.reduce((total, child) => total + getTreeCount(child), 0);
    return {
      id: `dept-${department.Object_Rel_Idn ?? departmentName(department)}`,
      label: departmentName(department),
      type: depth <= 0 ? "branch" : "dept",
      relationId: Number(department.Object_Rel_Idn ?? -1),
      count,
      children,
    };
  });
}

function buildTreeFromRecords(records: SoftwareRecord[]): TreeNode[] {
  const branchMap = new Map<string, SoftwareRecord[]>();
  records.forEach((record) => {
    const list = branchMap.get(record.department) || [];
    list.push(record);
    branchMap.set(record.department, list);
  });

  const children = Array.from(branchMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([branch, rows]) => ({
      id: `branch-${branch}`,
      label: branch,
      type: "branch" as const,
      count: rows.length,
      children: Array.from(new Set(rows.map((row) => row.deviceName))).map((device) => ({
        id: `device-${branch}-${device}`,
        label: device,
        type: "device" as const,
        objectDeviceId: rows.find((row) => row.deviceName === device)?.objectDeviceId,
        assetId: rows.find((row) => row.deviceName === device)?.assetId,
        count: rows.filter((row) => row.deviceName === device).length,
      })),
    }));

  return [{ id: "all", label: "All Branches", type: "org", relationId: -1, children, count: records.length }];
}

function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  const term = query.trim().toLowerCase();
  if (!term) return nodes;

  return nodes
    .map((node) => {
      const children = filterTree(node.children || [], query);
      if (node.label.toLowerCase().includes(term) || children.length) return { ...node, children };
      return null;
    })
    .filter(Boolean) as TreeNode[];
}

function buildStatTree(summary: { totalRecords: number; uniqueSoftware: number; categories: number; unclassified: number }) {
  return [
    { id: "stat-installed", label: "Installed Software", type: "category" as const, count: summary.totalRecords },
    { id: "stat-license", label: "License Status", type: "category" as const, count: summary.uniqueSoftware },
    { id: "stat-exe", label: "EXE File Extension", type: "category" as const, count: summary.categories },
    { id: "stat-dll", label: "DLL File Extension", type: "category" as const, count: summary.unclassified },
    { id: "stat-ini", label: "INI File Extension", type: "category" as const, count: summary.totalRecords },
  ];
}

function statEndpoint(stat: StatView) {
  if (stat === "installed") return "/api/software/statistics/installed-software";
  if (stat === "license") return "/api/software/statistics/license-status";
  if (stat === "exe") return "/api/software/statistics/exe-files";
  if (stat === "dll") return "/api/software/statistics/dll-files";
  return "/api/software/statistics/ini-files";
}

function statTitle(stat: StatView | null) {
  if (stat === "installed") return "Installed Software";
  if (stat === "license") return "License Status";
  if (stat === "exe") return "EXE File Extension";
  if (stat === "dll") return "DLL File Extension";
  if (stat === "ini") return "INI File Extension";
  return "Software Registry";
}

function pickStatValue(row: StatRow, keys: string[]) {
  for (const key of keys) {
    const direct = row[key];
    if (direct !== undefined && direct !== null && String(direct).trim()) return String(direct).trim();
    const match = Object.keys(row).find((candidate) => candidate.toLowerCase() === key.toLowerCase());
    if (match) {
      const value = row[match];
      if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
    }
  }
  return EMPTY_VALUE;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
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

function Software() {
  const [records, setRecords] = useState<SoftwareRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("branch");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("softwareName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [activeView, setActiveView] = useState<ActiveView>("all");
  const [selectedNode, setSelectedNode] = useState<TreeNode>({ id: "all", label: "All Branches", type: "org", relationId: -1 });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set(["all", "stat-root"]));
  const [departmentTree, setDepartmentTree] = useState<TreeNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [treeError, setTreeError] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  const [toasts, setToasts] = useState<EmaToastItem[]>([]);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [selectedStat, setSelectedStat] = useState<StatView | null>(null);
  const [statRows, setStatRows] = useState<StatRow[]>([]);
  const [statLoading, setStatLoading] = useState(false);
  const [statError, setStatError] = useState("");

  const showToast = (tone: EmaToastItem["tone"], title: ReactNode, message?: ReactNode) => {
    const id = Date.now();
    setToasts([{ id, tone, title, message }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3200);
  };

  const fetchSoftwareRecords = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await apiGet<unknown>("/api/software-inventory");
      setRecords(unwrapRows(payload).map(normalizeSoftwareRecord));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load software inventory.";
      setError(message);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartmentTree = async () => {
    setTreeLoading(true);
    setTreeError("");
    try {
      const payload = await apiGet<unknown>("/api/departments/tree");
      const departments = unwrapRows(payload) as DepartmentNode[];
      const children = mapDepartmentsToTree(departments);
      setDepartmentTree(children.length ? [{ id: "all", label: "All Branches", type: "org", relationId: -1, children, count: records.length }] : buildTreeFromRecords(records));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load branch tree.";
      setTreeError(message);
      setDepartmentTree(buildTreeFromRecords(records));
    } finally {
      setTreeLoading(false);
    }
  };

  useEffect(() => {
    void fetchSoftwareRecords();
  }, []);

  useEffect(() => {
    void fetchDepartmentTree();
  }, [records.length]);

  const summary = useMemo(() => {
    const uniqueSoftware = new Set(records.map((record) => record.softwareName.toLowerCase())).size;
    const uniqueDevices = new Set(records.map((record) => record.deviceName.toLowerCase())).size;
    const categories = new Set(records.map((record) => record.category.toLowerCase()).filter((category) => category && category !== "unclassified")).size;
    const unclassified = records.filter((record) => record.category.toLowerCase() === "unclassified").length;
    return { totalRecords: records.length, uniqueSoftware, uniqueDevices, categories, unclassified };
  }, [records]);

  const statTree = useMemo(
    () => [{ id: "stat-root", label: "Software Statistics", type: "category" as const, count: summary.totalRecords, children: buildStatTree(summary) }],
    [summary],
  );

  const filteredTree = useMemo(() => filterTree(sidebarTab === "branch" ? departmentTree : statTree, searchTerm), [departmentTree, searchTerm, sidebarTab, statTree]);
  const selectedRelationId = selectedNode.relationId ?? -1;
  const categoryOptions = useMemo(() => [...new Set(records.map((record) => record.category).filter(Boolean))].sort(), [records]);
  const typeOptions = useMemo(() => [...new Set(records.map((record) => record.machineType).filter(Boolean))].sort(), [records]);

  const filteredRecords = useMemo(() => {
    let next = [...records];
    const term = searchTerm.trim().toLowerCase();

    if (selectedNode.type === "device") {
      next = next.filter((record) => record.assetId === selectedNode.assetId || record.objectDeviceId === selectedNode.objectDeviceId || record.deviceName === selectedNode.label);
    } else if (selectedRelationId > 0 || selectedNode.type === "branch" || selectedNode.type === "dept") {
      const label = selectedNode.label.toLowerCase();
      next = next.filter((record) => record.department.toLowerCase().includes(label));
    }

    if (activeView === "unique") {
      const seen = new Set<string>();
      next = next.filter((record) => {
        const key = record.softwareName.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    if (activeView === "installed") {
      const seen = new Set<string>();
      next = next.filter((record) => {
        const key = record.deviceName.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    if (activeView === "categories") next = next.filter((record) => record.category.toLowerCase() !== "unclassified");
    if (activeView === "unclassified") next = next.filter((record) => record.category.toLowerCase() === "unclassified");
    if (categoryFilter !== "all") next = next.filter((record) => record.category === categoryFilter);
    if (typeFilter !== "all") next = next.filter((record) => record.machineType === typeFilter);

    if (term) {
      next = next.filter((record) =>
        [record.softwareName, record.category, record.publisher, record.description, record.version, record.deviceName, record.ip, record.department].some((value) =>
          value.toLowerCase().includes(term),
        ),
      );
    }

    next.sort((a, b) => {
      const left = a[sortKey] || "";
      const right = b[sortKey] || "";
      return sortDirection === "asc" ? left.localeCompare(right, undefined, { numeric: true }) : right.localeCompare(left, undefined, { numeric: true });
    });

    return next;
  }, [activeView, categoryFilter, records, searchTerm, selectedNode, selectedRelationId, sortDirection, sortKey, typeFilter]);

  const totalRows = selectedStat ? statRows.length : filteredRecords.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const currentRows = useMemo(() => filteredRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filteredRecords, page]);
  const currentStatRows = useMemo(() => statRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [statRows, page]);
  const classificationCoverage = summary.totalRecords ? Math.round(((summary.totalRecords - summary.unclassified) / summary.totalRecords) * 100) : 0;

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const handleSort = (key: SortKey) => {
    setSortKey((currentKey) => {
      if (currentKey === key) {
        setSortDirection((currentDirection) => (currentDirection === "asc" ? "desc" : "asc"));
        return currentKey;
      }
      setSortDirection("asc");
      return key;
    });
  };

  const renderSort = (key: SortKey) => (sortKey === key ? (sortDirection === "asc" ? " ↑" : " ↓") : "");

  const activateView = (view: ActiveView) => {
    setSelectedStat(null);
    setActiveView(view);
    setPage(1);
  };

  const loadStatRows = async (stat: StatView) => {
    setSelectedStat(stat);
    setSidebarTab("statistics");
    setPage(1);
    setStatLoading(true);
    setStatError("");
    setStatRows([]);
    try {
      const payload = await apiGet<unknown>(statEndpoint(stat));
      setStatRows(unwrapRows(payload));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load statistic data.";
      setStatError(message);
      setStatRows([]);
    } finally {
      setStatLoading(false);
    }
  };

  const handleNodeSelect = (node: TreeNode) => {
    if (sidebarTab === "statistics") {
      const map: Record<string, StatView> = {
        "stat-installed": "installed",
        "stat-license": "license",
        "stat-exe": "exe",
        "stat-dll": "dll",
        "stat-ini": "ini",
      };
      const stat = map[node.id];
      if (stat) void loadStatRows(stat);
      return;
    }

    setSelectedNode(node);
    setSelectedStat(null);
    setStatRows([]);
    setPage(1);
  };

  const toggleNode = (node: TreeNode) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      return next;
    });
  };

  const handleSoftwareScan = async (scanMode: "all" | "folder" | "device") => {
    setScanLoading(true);
    try {
      await apiPost("/api/software-inventory/scan", {
        scanMode,
        objectRelIdn: scanMode === "folder" ? selectedRelationId : undefined,
        Object_Rel_Idn: scanMode === "folder" ? selectedRelationId : undefined,
        objectDeviceID: scanMode === "device" ? selectedNode.objectDeviceId : undefined,
        Object_DeviceID: scanMode === "device" ? selectedNode.objectDeviceId : undefined,
        assetId: scanMode === "device" ? selectedNode.assetId : undefined,
      });
      showToast("success", "Scan requested", "Software inventory scan has been submitted.");
      await fetchSoftwareRecords();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to start software scan.";
      showToast("error", "Scan failed", message);
    } finally {
      setScanLoading(false);
    }
  };

  const refreshCurrentView = async () => {
    if (selectedStat) await loadStatRows(selectedStat);
    else await fetchSoftwareRecords();
  };

  const exportCurrentView = () => {
    if (selectedStat) {
      const columns = ["Name", "Version", "Publisher", "Reference", "Count"];
      const rows = statRows.map((row) => [
        pickStatValue(row, ["Name", "SoftwareName", "Software", "FileName", "Application", "Item", "column1"]),
        pickStatValue(row, ["Version", "SoftwareVersion", "column2"]),
        pickStatValue(row, ["Publisher", "Manufacturer", "Vendor", "column3"]),
        pickStatValue(row, ["Reference", "Path", "DeviceName", "ComputerName", "column4"]),
        pickStatValue(row, ["Count", "Total", "Cnt", "column5"]),
      ]);
      downloadCsv(`software-${selectedStat}-statistics.csv`, [columns, ...rows]);
      return;
    }

    const columns = ["Software Name", "Category", "Publisher", "Version", "Device", "Type", "IP Address", "Branch", "Last Updated"];
    const rows = filteredRecords.map((record) => [record.softwareName, record.category, record.publisher, record.version, record.deviceName, record.machineType, record.ip, record.department, record.lastUpdated]);
    downloadCsv("software-inventory.csv", [columns, ...rows]);
  };

  const renderTree = (nodes: TreeNode[], depth = 0, mode: SidebarTab = "branch") => (
    <div>
      {nodes.map((node) => {
        const hasChildren = Boolean(node.children?.length);
        const isExpanded = expandedGroups.has(node.id);
        const activeStatId = selectedStat
          ? { installed: "stat-installed", license: "stat-license", exe: "stat-exe", dll: "stat-dll", ini: "stat-ini" }[selectedStat]
          : "";
        const isActive = mode === "statistics" ? node.id === activeStatId : selectedNode.id === node.id;
        const Icon = node.type === "device" ? MonitorSmartphone : node.type === "category" ? Database : hasChildren && isExpanded ? FolderOpen : Folder;

        return (
          <div key={node.id}>
            <EmaSidebarTreeRow active={isActive} depth={depth} onClick={() => (hasChildren ? toggleNode(node) : handleNodeSelect(node))}>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  if (hasChildren) toggleNode(node);
                }}
                aria-label={hasChildren ? (isExpanded ? "Collapse" : "Expand") : "Open"}
              >
                {hasChildren ? isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} /> : null}
              </button>
              <Icon size={16} />
              <span>{node.label}</span>
              {node.type !== "org" && getTreeCount(node) > 0 ? <small>{getTreeCount(node).toLocaleString()}</small> : null}
            </EmaSidebarTreeRow>
            {hasChildren && isExpanded ? <div>{renderTree(node.children || [], depth + 1, mode)}</div> : null}
          </div>
        );
      })}
    </div>
  );

  const softwareColumns: EmaTableColumn<SoftwareRecord>[] = [
    {
      key: "no",
      header: "No",
      width: "4.5rem",
      render: (_row, index) => String((page - 1) * PAGE_SIZE + index + 1).padStart(2, "0"),
    },
    {
      key: "softwareName",
      header: <button type="button" onClick={() => handleSort("softwareName")}>Software Name{renderSort("softwareName")}</button>,
      render: (row) => <strong>{row.softwareName}</strong>,
    },
    {
      key: "category",
      header: <button type="button" onClick={() => handleSort("category")}>Category{renderSort("category")}</button>,
      render: (row) => row.category,
    },
    {
      key: "publisher",
      header: <button type="button" onClick={() => handleSort("publisher")}>Publisher / Description{renderSort("publisher")}</button>,
      render: (row) => (
        <span>
          <strong>{row.publisher}</strong>
          <br />
          <small>{row.description || EMPTY_VALUE}</small>
        </span>
      ),
    },
    {
      key: "version",
      header: <button type="button" onClick={() => handleSort("version")}>Version{renderSort("version")}</button>,
      render: (row) => row.version,
    },
    {
      key: "deviceName",
      header: <button type="button" onClick={() => handleSort("deviceName")}>Device{renderSort("deviceName")}</button>,
      render: (row) => (
        <span>
          <strong>{row.deviceName}</strong>
          <br />
          <small>{row.department}</small>
        </span>
      ),
    },
    {
      key: "machineType",
      header: <button type="button" onClick={() => handleSort("machineType")}>Type{renderSort("machineType")}</button>,
      render: (row) => row.machineType,
    },
    {
      key: "ip",
      header: "IP Address",
      render: (row) => row.ip,
    },
    {
      key: "lastUpdated",
      header: <button type="button" onClick={() => handleSort("lastUpdated")}>Last Updated{renderSort("lastUpdated")}</button>,
      render: (row) => row.lastUpdated,
    },
  ];

  const statColumns: EmaTableColumn<StatRow>[] = [
    { key: "no", header: "No", width: "4.5rem", render: (_row, index) => String((page - 1) * PAGE_SIZE + index + 1).padStart(2, "0") },
    { key: "name", header: "Name", render: (row) => pickStatValue(row, ["Name", "SoftwareName", "Software", "FileName", "Application", "Item", "column1"]) },
    { key: "version", header: "Version", render: (row) => pickStatValue(row, ["Version", "SoftwareVersion", "column2"]) },
    { key: "publisher", header: "Publisher", render: (row) => pickStatValue(row, ["Publisher", "Manufacturer", "Vendor", "column3"]) },
    { key: "reference", header: "Reference", render: (row) => pickStatValue(row, ["Reference", "Path", "DeviceName", "ComputerName", "column4"]) },
    { key: "count", header: "Count", render: (row) => pickStatValue(row, ["Count", "Total", "Cnt", "column5"]) },
  ];

  const sidebar = (
    <EmaSidebarPanel
      eyebrow="Software"
      title="Software Inventory"
      description="Browse software records, devices and statistics."
      tabs={[
        { id: "branch", label: "Branch", icon: <FolderOpen size={16} /> },
        { id: "statistics", label: "Statistics", icon: <Database size={16} /> },
      ]}
      activeTab={sidebarTab}
      onTabChange={(tab) => {
        setSidebarTab(tab as SidebarTab);
        setPage(1);
      }}
      searchValue={searchTerm}
      searchPlaceholder={sidebarTab === "branch" ? "Search branches..." : "Search statistics..."}
      onSearchChange={setSearchTerm}
    >
      {sidebarTab === "branch" ? (
        <>
          {treeLoading ? <EmaSpinner label="Loading branches..." /> : null}
          {!treeLoading && treeError ? <p>{treeError}</p> : null}
          {!treeLoading && renderTree(filteredTree, 0, "branch")}
        </>
      ) : (
        renderTree(filteredTree, 0, "statistics")
      )}
    </EmaSidebarPanel>
  );

  return (
    <>
      <EmaToastViewport items={toasts} onClose={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
      <EmaPageLayout title="Software Inventory" subtitle="Track applications, versions and classification status." sidebar={sidebar}>
        <div className="space-y-3">
          <EmaSection eyebrow="Software" title={selectedStat ? "Software Statistics" : "Software Registry"} description="Live software inventory with package records, classification, device scope and scan controls.">
            <EmaKpiGrid>
              <EmaKpiCard title="Total Records" value={summary.totalRecords} note={`${filteredRecords.length} shown`} icon={<Package size={16} />} active={activeView === "all" && !selectedStat} onClick={() => activateView("all")} />
              <EmaKpiCard title="Unique Software" value={summary.uniqueSoftware} note="unique names" icon={<BarChart3 size={16} />} tone="violet" active={activeView === "unique" && !selectedStat} onClick={() => activateView("unique")} />
              <EmaKpiCard title="Installed Devices" value={summary.uniqueDevices} note="linked devices" icon={<MonitorSmartphone size={16} />} tone="emerald" active={activeView === "installed" && !selectedStat} onClick={() => activateView("installed")} />
              <EmaKpiCard title="Categories" value={summary.categories} note="class types" icon={<Layers size={16} />} tone="amber" active={activeView === "categories" && !selectedStat} onClick={() => activateView("categories")} />
              <EmaKpiCard title="Unclassified" value={summary.unclassified} note="no category" icon={<AlertTriangle size={16} />} tone="rose" active={activeView === "unclassified" && !selectedStat} onClick={() => activateView("unclassified")} />
            </EmaKpiGrid>
          </EmaSection>

          <EmaToolbar
            left={
              <>
                <EmaButton variant="ghost" onClick={() => setShowInsightsModal(true)}><FileText size={15} /> Insights {classificationCoverage}%</EmaButton>
                <EmaButton variant="secondary" onClick={() => void handleSoftwareScan("device")} disabled={selectedNode.type !== "device" || scanLoading}><MonitorSmartphone size={15} /> Scan Device</EmaButton>
                <EmaButton variant="secondary" onClick={() => void handleSoftwareScan("folder")} disabled={selectedRelationId <= 0 || scanLoading}><FolderOpen size={15} /> Scan Folder</EmaButton>
                <EmaButton variant="primary" onClick={() => void handleSoftwareScan("all")} disabled={scanLoading}><RefreshCw size={15} /> Scan All</EmaButton>
              </>
            }
            search={<EmaSearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search software records..." />}
            right={
              <>
                <EmaButton variant="secondary" onClick={() => void refreshCurrentView()}><RefreshCw size={15} /></EmaButton>
                <EmaButton variant="primary" onClick={exportCurrentView} disabled={(selectedStat ? statLoading || statRows.length === 0 : loading || filteredRecords.length === 0)}><Download size={15} /> Export</EmaButton>
              </>
            }
            filters={
              !selectedStat ? (
                <>
                  <EmaFilterField label="Category">
                    <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                      <option value="all">All category</option>
                      {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                  </EmaFilterField>
                  <EmaFilterField label="Device Type">
                    <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                      <option value="all">All type</option>
                      {typeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </EmaFilterField>
                  <EmaButton variant="ghost" onClick={() => { setCategoryFilter("all"); setTypeFilter("all"); setSearchTerm(""); setActiveView("all"); }}><X size={14} /> Reset</EmaButton>
                </>
              ) : null
            }
          />

          <EmaTableShell title={selectedStat ? statTitle(selectedStat) : `${selectedNode.label} scope`} subtitle={selectedStat ? "Statistic result" : undefined}>
            {selectedStat ? (
              statLoading ? <EmaSpinner /> : statError ? <p>{statError}</p> : <EmaTable columns={statColumns} rows={currentStatRows} getRowKey={(_row, index) => `${selectedStat}-${page}-${index}`} emptyText="No statistic data found." />
            ) : loading ? (
              <EmaSpinner />
            ) : error ? (
              <p>{error}</p>
            ) : (
              <EmaTable columns={softwareColumns} rows={currentRows} getRowKey={(row) => row.id} emptyText="No software records found." />
            )}
            <EmaPagination page={page} totalPages={pageCount} totalLabel={`Page ${page} of ${pageCount} • ${totalRows.toLocaleString()} records`} onPageChange={setPage} />
          </EmaTableShell>
        </div>
      </EmaPageLayout>

      <EmaModal
        open={showInsightsModal}
        title="Software Insights"
        description="Classification and package summary."
        onClose={() => setShowInsightsModal(false)}
        footer={<EmaButton variant="primary" onClick={() => setShowInsightsModal(false)}>Done</EmaButton>}
      >
        <p>Classification coverage: <strong>{classificationCoverage}%</strong></p>
        <p>Total records: <strong>{summary.totalRecords}</strong></p>
        <p>Unique software: <strong>{summary.uniqueSoftware}</strong></p>
        <p>Unclassified: <strong>{summary.unclassified}</strong></p>
      </EmaModal>
    </>
  );
}

export default Software;
