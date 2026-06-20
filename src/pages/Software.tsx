import { useEffect, useMemo, useState } from "react";
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
  ShieldCheck,
  X,
} from "lucide-react";

type ApiSoftwareRecord = {
  SoftwareID?: number | string | null;
  SoftwareName?: string | null;
  CategoryName?: string | null;
  Publisher?: string | null;
  Version?: string | null;
  Username?: string | null;
  LastUpdated?: string | null;
  AssetID?: string | null;
  AssetTag?: string | null;
  MachineType?: string | null;
  OS?: string | null;
  ComputerName?: string | null;
  IP?: string | null;
  Department?: string | null;
  AgentStatus?: string | number | null;
  Description?: string | null;
  Object_Agent?: string | null;
  Object_DeviceID?: string | null;
  RawSoftwareID?: string | number | null;
  RawSoftwareName?: string | number | null;
};

type DepartmentNode = {
  Object_Rel_Idn: number;
  Object_Rel_Name?: string;
  Object_Full_Name?: string;
  Object_PR_Idn?: number;
  children?: DepartmentNode[];
};

type TreeNode = {
  id: string;
  label: string;
  type: "org" | "branch" | "dept" | "device" | "category" | "sub";
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
  username: string;
  lastUpdated: string;
  assetId: string;
  assetTag: string;
  deviceName: string;
  machineType: string;
  os: string;
  ip: string;
  department: string;
  agentStatus: string;
  objectAgent: string;
  objectDeviceId: string;
  raw: ApiSoftwareRecord;
};

type SidebarTab = "branch" | "statistics";
type ActiveView = "all" | "unique" | "installed" | "categories" | "unclassified";
type SortKey = "softwareName" | "category" | "deviceName" | "version" | "machineType" | "lastUpdated";
type SortDirection = "asc" | "desc";
type StatView = "installed" | "license" | "exe" | "dll" | "ini";
type StatRow = Record<string, unknown>;
type ToastState = {
  type: "success" | "error" | "info";
  title: string;
  message: string;
} | null;

const PAGE_SIZE = 10;
const EMPTY_VALUE = "-";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

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

function isGuidLike(value: unknown) {
  const text = safeString(value, "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text);
}

function isNumericOnly(value: unknown) {
  const text = safeString(value, "").trim();
  return /^\d+$/.test(text);
}

function chooseSoftwareName(record: ApiSoftwareRecord, index: number) {
  const candidates = [record.RawSoftwareID, record.SoftwareID, record.SoftwareName, record.RawSoftwareName];
  for (const candidate of candidates) {
    const text = safeString(candidate, "");
    if (!text) continue;
    if (isGuidLike(text)) continue;
    if (isNumericOnly(text)) continue;
    return text;
  }

  const fallback = safeString(record.SoftwareName || record.RawSoftwareName || record.SoftwareID, "");
  return fallback || `Software Record ${index + 1}`;
}

function cleanCategory(value: unknown) {
  const text = safeString(value, "Unclassified");
  if (text === EMPTY_VALUE) return "Unclassified";
  if (text.toLowerCase() === "uncategorized") return "Unclassified";
  return text;
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

function getStoredToken() {
  const directKeys = ["ema-access-token", "accessToken", "token", "jwtToken", "bearerToken"];
  for (const key of directKeys) {
    const value = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (value && value.trim()) return value.trim();
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

function normalizeSoftwareRecord(record: ApiSoftwareRecord, index: number): SoftwareRecord {
  const assetTag = safeString(record.AssetTag || record.Object_DeviceID || record.AssetID);
  const deviceName = safeString(record.ComputerName || record.Object_DeviceID || record.AssetTag || record.AssetID);
  const description = safeString(record.Description, "");
  const publisher = safeString(record.Publisher || record.Description);

  return {
    id: `${safeString(record.SoftwareID || record.RawSoftwareID, `software-${index}`)}-${assetTag}-${index}`,
    softwareName: chooseSoftwareName(record, index),
    category: cleanCategory(record.CategoryName),
    publisher,
    description,
    version: safeString(record.Version),
    username: safeString(record.Username),
    lastUpdated: formatDateTime(record.LastUpdated),
    assetId: safeString(record.AssetID),
    assetTag,
    deviceName,
    machineType: safeString(record.MachineType, "Unknown"),
    os: safeString(record.OS || record.MachineType),
    ip: safeString(record.IP),
    department: safeString(record.Department, "Unassigned"),
    agentStatus: safeString(record.AgentStatus),
    objectAgent: safeString(record.Object_Agent, "MDM"),
    objectDeviceId: safeString(record.Object_DeviceID || record.AssetTag),
    raw: record,
  };
}

function unwrapRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown[] | Record<string, unknown> }).data;
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === "object") {
    const firstArray = Object.values(data).find(Array.isArray);
    if (Array.isArray(firstArray)) return firstArray as Record<string, unknown>[];
    return [data as Record<string, unknown>];
  }
  return [];
}

function getDepartmentName(department: DepartmentNode) {
  return department.Object_Rel_Name || department.Object_Full_Name || `Department ${department.Object_Rel_Idn}`;
}

function getDepartmentCount(department: DepartmentNode) {
  const record = department as DepartmentNode & Record<string, unknown>;
  const count = Number(record.TotalDevices ?? record.DeviceCount ?? record.AssetCount ?? record.TotalAssets ?? record.Count ?? record.count ?? 0);
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
    const explicitCount = getDepartmentCount(department);
    return {
      id: `dept-${department.Object_Rel_Idn}`,
      label: getDepartmentName(department),
      type: depth <= 0 ? "branch" : "dept",
      relationId: department.Object_Rel_Idn,
      count: explicitCount || children.reduce((total, child) => total + getTreeCount(child), 0),
      children,
    };
  });
}

function buildTreeFromRecords(records: SoftwareRecord[]): TreeNode[] {
  const branchMap = new Map<string, SoftwareRecord[]>();
  records.forEach((record) => {
    const key = record.department || "Unassigned";
    const list = branchMap.get(key) || [];
    list.push(record);
    branchMap.set(key, list);
  });

  const children = Array.from(branchMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([department, rows]) => {
      const deviceMap = new Map<string, SoftwareRecord[]>();
      rows.forEach((record) => {
        const key = record.objectDeviceId || record.assetId || record.deviceName;
        const list = deviceMap.get(key) || [];
        list.push(record);
        deviceMap.set(key, list);
      });

      return {
        id: `dept-fallback-${department}`,
        label: department,
        type: "branch" as const,
        count: rows.length,
        children: Array.from(deviceMap.entries()).map(([deviceKey, deviceRows]) => ({
          id: `device-${deviceKey}`,
          label: deviceRows[0]?.deviceName || deviceKey,
          type: "device" as const,
          assetId: deviceRows[0]?.assetId,
          objectDeviceId: deviceRows[0]?.objectDeviceId,
          count: deviceRows.length,
        })),
      };
    });

  return [{ id: "all", label: "All Branches", type: "org", relationId: -1, children, count: records.length }];
}

function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  const term = query.trim().toLowerCase();
  if (!term) return nodes;

  return nodes
    .map((node) => {
      const filteredChildren = filterTree(node.children || [], query);
      if (node.label.toLowerCase().includes(term) || filteredChildren.length) return { ...node, children: filteredChildren };
      return null;
    })
    .filter(Boolean) as TreeNode[];
}

function buildStatTree(summary: { totalRecords: number; categories: number; uniqueSoftware: number; unclassified: number }) {
  return [
    { id: "stat-installed", label: "Installed Software", type: "category" as const, count: summary.totalRecords },
    { id: "stat-license", label: "License Status", type: "category" as const, count: summary.uniqueSoftware },
    { id: "stat-exe", label: "EXE File Extension", type: "category" as const, count: summary.categories },
    { id: "stat-dll", label: "DLL File Extension", type: "category" as const, count: summary.unclassified },
    { id: "stat-ini", label: "INI File Extension", type: "category" as const, count: summary.totalRecords },
  ];
}

function pickStatValue(row: StatRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
    const found = Object.keys(row).find((candidate) => candidate.toLowerCase() === key.toLowerCase());
    if (found) {
      const nextValue = row[found];
      if (nextValue !== undefined && nextValue !== null && String(nextValue).trim()) return String(nextValue).trim();
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
  return "";
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
  const [toast, setToast] = useState<ToastState>(null);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [selectedStat, setSelectedStat] = useState<StatView | null>(null);
  const [statRows, setStatRows] = useState<StatRow[]>([]);
  const [statLoading, setStatLoading] = useState(false);
  const [statError, setStatError] = useState("");

  const showToast = (nextToast: Exclude<ToastState, null>) => {
    setToast(nextToast);
    window.setTimeout(() => setToast(null), 3200);
  };

  const fetchSoftwareRecords = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await apiGet<ApiSoftwareRecord[] | { data?: ApiSoftwareRecord[] }>("/api/software-inventory");
      const rows = Array.isArray(payload) ? payload : payload?.data || [];
      setRecords(rows.map(normalizeSoftwareRecord));
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
      const payload = await apiGet<DepartmentNode[] | { data?: DepartmentNode[] }>("/api/departments/tree");
      const departments = Array.isArray(payload) ? payload : payload?.data || [];
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

  const statTree = useMemo(() => [{ id: "stat-root", label: "Software Statistics", type: "category" as const, count: summary.totalRecords, children: buildStatTree(summary) }], [summary]);
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
      const selectedLabel = selectedNode.label.toLowerCase();
      next = next.filter((record) => record.department.toLowerCase().includes(selectedLabel));
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
      next = next.filter((record) => [record.softwareName, record.category, record.publisher, record.description, record.version, record.deviceName, record.assetTag, record.ip, record.department].some((value) => value.toLowerCase().includes(term)));
    }

    next.sort((a, b) => {
      const left = a[sortKey] || "";
      const right = b[sortKey] || "";
      return sortDirection === "asc" ? left.localeCompare(right, undefined, { numeric: true }) : right.localeCompare(left, undefined, { numeric: true });
    });

    return next;
  }, [activeView, categoryFilter, records, searchTerm, selectedNode, selectedRelationId, sortDirection, sortKey, typeFilter]);

  const pageCount = Math.max(1, Math.ceil((selectedStat ? statRows.length : filteredRecords.length) / PAGE_SIZE));
  const currentRows = useMemo(() => filteredRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filteredRecords, page]);
  const currentStatRows = useMemo(() => statRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [statRows, page]);
  const classificationCoverage = summary.totalRecords ? Math.round(((summary.totalRecords - summary.unclassified) / summary.totalRecords) * 100) : 0;
  const currentStatTitle = statTitle(selectedStat);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const activateView = (view: ActiveView) => {
    setSelectedStat(null);
    setActiveView(view);
    setPage(1);
  };

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
      showToast({ type: "success", title: "Scan requested", message: "Software inventory scan has been submitted." });
      await fetchSoftwareRecords();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to start software scan.";
      showToast({ type: "error", title: "Scan failed", message });
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
      const columns = Array.from(new Set(statRows.flatMap((row) => Object.keys(row)))).slice(0, 12);
      const safeColumns = columns.length ? columns : ["Name", "Version", "Publisher", "Count"];
      downloadCsv(`software-${selectedStat}-statistics.csv`, [safeColumns, ...statRows.map((row) => safeColumns.map((column) => safeString(row[column], "")))]);
      return;
    }

    const columns = ["Software Name", "Category", "Publisher", "Version", "Device", "Type", "IP Address", "Branch", "Last Updated"];
    const rows = filteredRecords.map((record) => [record.softwareName, record.category, record.publisher, record.version, record.deviceName, record.machineType, record.ip, record.department, record.lastUpdated]);
    downloadCsv("software-inventory.csv", [columns, ...rows]);
  };

  const renderTree = (nodes: TreeNode[], depth = 0, mode: SidebarTab = "branch") => (
    <div className={depth > 0 ? "grid gap-1 border-l border-slate-200 pl-3 ml-4" : "grid gap-1"}>
      {nodes.map((node) => {
        const hasChildren = Boolean(node.children?.length);
        const isExpanded = expandedGroups.has(node.id);
        const isDevice = node.type === "device";
        const isStat = mode === "statistics";
        const activeStatId = selectedStat
          ? {
              installed: "stat-installed",
              license: "stat-license",
              exe: "stat-exe",
              dll: "stat-dll",
              ini: "stat-ini",
            }[selectedStat]
          : "";
        const isActive = isStat ? node.id === activeStatId : selectedNode.id === node.id;

        return (
          <div key={node.id} className="relative">
            <div
              className={cx(
                "grid grid-cols-[1.35rem_minmax(0,1fr)] items-center rounded-xl border border-transparent",
                isActive && "border-blue-300 bg-blue-50 shadow-[inset_3px_0_0_#2563eb]",
                !isActive && "hover:border-slate-200 hover:bg-slate-50"
              )}
            >
              <button
                type="button"
                className="flex h-9 w-7 items-center justify-center text-slate-500"
                onClick={() => (hasChildren ? toggleNode(node) : handleNodeSelect(node))}
                aria-label={hasChildren ? (isExpanded ? "Collapse" : "Expand") : "Open"}
              >
                {hasChildren ? (isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />) : <span aria-hidden="true" />}
              </button>

              <button type="button" className="flex min-w-0 items-center gap-2 py-2 pr-2 text-left" onClick={() => handleNodeSelect(node)}>
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  {isDevice ? <MonitorSmartphone size={13} /> : isStat ? <Database size={13} /> : hasChildren && isExpanded ? <FolderOpen size={15} /> : <Folder size={15} />}
                </span>
                <span className="min-w-0 flex-1 truncate text-[0.82rem] font-black text-slate-900">{node.label}</span>
                {node.type !== "org" && getTreeCount(node) > 0 && <span className="text-[0.78rem] font-black text-slate-500">{getTreeCount(node).toLocaleString()}</span>}
              </button>
            </div>

            {hasChildren && isExpanded && <div className="mt-1">{renderTree(node.children || [], depth + 1, mode)}</div>}
          </div>
        );
      })}
    </div>
  );

  return (
    <main className="settings-module-root ema-settings-pro ema-module-root ema-page container-fluid p-3 p-xl-4" data-section="software">
      {toast && (
        <div className="fixed right-6 top-[86px] z-[2147483647] max-w-[26rem] rounded-2xl border border-blue-200 bg-white p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className={cx("flex h-10 w-10 flex-none items-center justify-center rounded-xl border", toast.type === "error" ? "border-red-200 bg-red-50 text-red-600" : "border-blue-200 bg-blue-50 text-blue-600")}>
              {toast.type === "error" ? <AlertTriangle size={18} /> : <ShieldCheck size={18} />}
            </div>
            <div className="min-w-0 flex-1">
              <strong className="block text-sm font-black text-slate-900">{toast.title}</strong>
              <span className="mt-1 block text-xs font-semibold text-slate-600">{toast.message}</span>
            </div>
            <button type="button" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={() => setToast(null)} aria-label="Close notification">
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      <div className="settings-layout grid min-w-0 gap-3">
        <aside className="settings-menu ema-panel-surface rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 grid gap-0.5">
            <span className="text-[0.65rem] font-black uppercase tracking-[0.08em] text-slate-500">SOFTWARE</span>
            <strong className="text-[0.92rem] font-black text-slate-950">Software Inventory</strong>
            <small className="text-[0.75rem] font-semibold leading-5 text-slate-600">Browse software records, devices and statistics.</small>
          </div>

          <nav className="ema-module-sidebar-nav" role="tablist" aria-label="Software navigation">
            <button type="button" className={cx(sidebarTab === "branch" && "is-active")} aria-selected={sidebarTab === "branch"} onClick={() => setSidebarTab("branch")}>
              <FolderOpen size={16} />
              <strong>Branch</strong>
            </button>
            <button type="button" className={cx(sidebarTab === "statistics" && "is-active")} aria-selected={sidebarTab === "statistics"} onClick={() => setSidebarTab("statistics")}>
              <Database size={16} />
              <strong>Statistics</strong>
            </button>
          </nav>

          <div className="ema-sidebar-field mb-3 flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-500">
            <Search size={15} />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={sidebarTab === "branch" ? "Search branches..." : "Search statistics..."}
              className="min-w-0 flex-1 border-0 bg-transparent text-[0.78rem] font-semibold text-slate-900 outline-none placeholder:text-slate-400"
            />
            {searchTerm && (
              <button type="button" className="rounded-md p-1 hover:bg-slate-100" onClick={() => setSearchTerm("")} aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="ema-sidebar-content">
            <div className="ema-sidebar-tree pr-1">
              {sidebarTab === "branch" ? (
                <>
                  {treeLoading && (
                    <div className="grid min-h-[9rem] place-items-center text-center">
                      <div>
                        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-500" />
                        <div className="mt-3 text-[0.72rem] font-black uppercase tracking-[0.12em] text-slate-400">Loading Data...</div>
                      </div>
                    </div>
                  )}
                  {!treeLoading && treeError && <div className="ema-sidebar-empty is-error">{treeError}</div>}
                  {!treeLoading && renderTree(filteredTree, 0, "branch")}
                </>
              ) : (
                renderTree(filteredTree, 0, "statistics")
              )}
            </div>
          </div>
        </aside>

        <section className="grid min-w-0 gap-3">
          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-3">
              <span className="text-[0.65rem] font-black uppercase tracking-[0.08em] text-slate-500">SOFTWARE</span>
              <h2 className="mt-1 text-lg font-black leading-tight text-slate-950">{selectedStat ? "Software Statistics" : "Software Registry"}</h2>
              <p className="mt-1 text-[0.82rem] font-semibold text-slate-600">Live software inventory with package records, classification, device scope and scan controls.</p>
            </div>

            <div className="grid gap-2 md:grid-cols-5">
              {[
                { key: "all" as ActiveView, title: "Total Records", value: summary.totalRecords, subtitle: `${filteredRecords.length} shown`, icon: <Package size={16} /> },
                { key: "unique" as ActiveView, title: "Unique Software", value: summary.uniqueSoftware, subtitle: "unique names", icon: <BarChart3 size={16} /> },
                { key: "installed" as ActiveView, title: "Installed Devices", value: summary.uniqueDevices, subtitle: "linked devices", icon: <MonitorSmartphone size={16} /> },
                { key: "categories" as ActiveView, title: "Categories", value: summary.categories, subtitle: "class types", icon: <Layers size={16} /> },
                { key: "unclassified" as ActiveView, title: "Unclassified", value: summary.unclassified, subtitle: "no category", icon: <AlertTriangle size={16} /> },
              ].map((card) => (
                <button
                  key={card.key}
                  type="button"
                  className={cx("rounded-xl border bg-white p-3 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50/40", activeView === card.key && !selectedStat ? "border-blue-400 ring-1 ring-blue-200" : "border-slate-200")}
                  onClick={() => activateView(card.key)}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-blue-50 text-blue-600">{card.icon}</span>
                    <div className="min-w-0">
                      <span className="block text-[0.68rem] font-black uppercase tracking-[0.05em] text-slate-500">{card.title}</span>
                      <strong className="mt-0.5 block text-lg font-black leading-none text-slate-950">{card.value}</strong>
                      <small className="mt-1 block text-[0.68rem] font-bold text-slate-500">{card.subtitle}</small>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="flex min-h-[28rem] min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-3 p-3">
              <div className="grid items-center gap-2 xl:grid-cols-[max-content_max-content_max-content_max-content_minmax(260px,1fr)_2.5rem_max-content]">
                <button type="button" className="flex h-10 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 text-[0.78rem] font-black text-slate-950 shadow-sm hover:bg-blue-50" onClick={() => setShowInsightsModal(true)}>
                  <FileText size={15} />
                  Insights <span className="font-black text-blue-600">{classificationCoverage}%</span>
                </button>
                <button type="button" className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[0.78rem] font-black text-slate-500 shadow-sm hover:bg-slate-50 disabled:opacity-50" onClick={() => void handleSoftwareScan("device")} disabled={selectedNode.type !== "device" || scanLoading}>
                  <MonitorSmartphone size={15} className={scanLoading ? "animate-spin" : ""} />
                  Scan Device
                </button>
                <button type="button" className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[0.78rem] font-black text-slate-500 shadow-sm hover:bg-slate-50 disabled:opacity-50" onClick={() => void handleSoftwareScan("folder")} disabled={selectedRelationId <= 0 || scanLoading}>
                  <FolderOpen size={15} className={scanLoading ? "animate-spin" : ""} />
                  Scan Folder
                </button>
                <button type="button" className="flex h-10 items-center justify-center gap-2 rounded-xl border border-blue-300 bg-white px-4 text-[0.78rem] font-black text-blue-600 shadow-sm hover:bg-blue-50 disabled:opacity-50" onClick={() => void handleSoftwareScan("all")} disabled={scanLoading}>
                  <RefreshCw size={15} className={scanLoading ? "animate-spin" : ""} />
                  Scan All
                </button>
                <div className="flex h-10 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-500">
                  <Search size={15} />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search software records..."
                    className="min-w-0 flex-1 border-0 bg-transparent text-[0.8rem] font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                  />
                  {searchTerm && (
                    <button type="button" className="rounded-md p-1 hover:bg-slate-100" onClick={() => setSearchTerm("")} aria-label="Clear search">
                      <X size={14} />
                    </button>
                  )}
                </div>
                <button type="button" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50" onClick={() => void refreshCurrentView()} title="Refresh" aria-label="Refresh software records">
                  <RefreshCw size={15} />
                </button>
                <button type="button" className="flex h-10 items-center justify-center gap-2 rounded-xl border border-blue-600 bg-blue-600 px-4 text-[0.78rem] font-black text-white shadow-sm hover:bg-blue-700 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400" onClick={exportCurrentView} disabled={(selectedStat ? statLoading || statRows.length === 0 : loading || filteredRecords.length === 0)}>
                  <Download size={15} />
                  Export
                </button>
              </div>

              {!selectedStat && (
                <div className="grid justify-end gap-3 md:grid-cols-[minmax(210px,230px)_minmax(210px,230px)_max-content]">
                  <label className="grid gap-1">
                    <span className="text-[0.66rem] font-black uppercase tracking-[0.06em] text-slate-500">Category</span>
                    <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[0.8rem] font-bold text-slate-900 outline-none focus:border-blue-300" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                      <option value="all">All category</option>
                      {categoryOptions.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[0.66rem] font-black uppercase tracking-[0.06em] text-slate-500">Device Type</span>
                    <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[0.8rem] font-bold text-slate-900 outline-none focus:border-blue-300" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                      <option value="all">All type</option>
                      {typeOptions.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </label>
                  <button type="button" className="mt-auto flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[0.78rem] font-black text-slate-600 hover:bg-slate-50" onClick={() => { setCategoryFilter("all"); setTypeFilter("all"); setSearchTerm(""); setActiveView("all"); }}>
                    Reset
                  </button>
                </div>
              )}
            </div>

            <div className="min-h-[22rem] flex-1 overflow-auto border-t border-slate-100">
              {selectedStat ? (
                <>
                  <div className="sticky top-0 z-10 grid min-w-[900px] grid-cols-[4rem_2fr_1fr_1.2fr_1.5fr_1fr] bg-slate-100 text-[0.68rem] font-black uppercase tracking-[0.06em] text-slate-600">
                    {["No", "Name", "Version", "Publisher", "Reference", "Count"].map((header) => <div key={header} className="px-3 py-3">{header}</div>)}
                  </div>
                  {statLoading && <div className="grid min-h-[18rem] place-items-center text-[0.78rem] font-black uppercase tracking-[0.1em] text-slate-400">Loading Data...</div>}
                  {!statLoading && statError && <div className="grid min-h-[18rem] place-items-center p-6 text-center text-sm font-bold text-red-600">{statError}</div>}
                  {!statLoading && !statError && currentStatRows.length === 0 && <div className="grid min-h-[18rem] place-items-center text-[0.78rem] font-black uppercase tracking-[0.1em] text-slate-400">No data found</div>}
                  {!statLoading && !statError && currentStatRows.map((row, index) => (
                    <div key={`${selectedStat}-${index}`} className="grid min-w-[900px] grid-cols-[4rem_2fr_1fr_1.2fr_1.5fr_1fr] border-t border-slate-100 text-[0.78rem] font-bold text-slate-700 hover:bg-slate-50">
                      <div className="px-3 py-3">{(page - 1) * PAGE_SIZE + index + 1}</div>
                      <div className="px-3 py-3 font-black text-slate-950">{pickStatValue(row, ["Name", "SoftwareName", "Software", "FileName", "Application", "Item", "column1"])}</div>
                      <div className="px-3 py-3">{pickStatValue(row, ["Version", "SoftwareVersion", "column2"])}</div>
                      <div className="px-3 py-3">{pickStatValue(row, ["Publisher", "Manufacturer", "Vendor", "column3"])}</div>
                      <div className="px-3 py-3">{pickStatValue(row, ["Reference", "Path", "DeviceName", "ComputerName", "column4"])}</div>
                      <div className="px-3 py-3">{pickStatValue(row, ["Count", "Total", "Cnt", "column5"])}</div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="sticky top-0 z-10 grid min-w-[1160px] grid-cols-[2fr_1.1fr_1.6fr_1fr_1.35fr_1fr_1fr_1.2fr] bg-slate-100 text-[0.68rem] font-black uppercase tracking-[0.06em] text-slate-600">
                    {[
                      ["Software Name", "softwareName" as SortKey],
                      ["Category", "category" as SortKey],
                      ["Publisher / Description", "softwareName" as SortKey],
                      ["Version", "version" as SortKey],
                      ["Device", "deviceName" as SortKey],
                      ["Type", "machineType" as SortKey],
                      ["IP Address", "deviceName" as SortKey],
                      ["Last Updated", "lastUpdated" as SortKey],
                    ].map(([label, key]) => (
                      <button key={String(label)} type="button" className="px-3 py-3 text-left" onClick={() => handleSort(key as SortKey)}>{label}{renderSort(key as SortKey)}</button>
                    ))}
                  </div>
                  {loading && <div className="grid min-h-[18rem] place-items-center text-[0.78rem] font-black uppercase tracking-[0.1em] text-slate-400">Loading Data...</div>}
                  {!loading && error && <div className="grid min-h-[18rem] place-items-center p-6 text-center text-sm font-bold text-red-600">{error}</div>}
                  {!loading && !error && currentRows.length === 0 && <div className="grid min-h-[18rem] place-items-center text-[0.78rem] font-black uppercase tracking-[0.1em] text-slate-400">No data found</div>}
                  {!loading && !error && currentRows.map((record) => (
                    <div key={record.id} className="grid min-w-[1160px] grid-cols-[2fr_1.1fr_1.6fr_1fr_1.35fr_1fr_1fr_1.2fr] border-t border-slate-100 text-[0.78rem] font-bold text-slate-700 hover:bg-slate-50">
                      <div className="px-3 py-3 font-black text-slate-950">{record.softwareName}</div>
                      <div className="px-3 py-3">{record.category}</div>
                      <div className="px-3 py-3"><span className="block text-slate-900">{record.publisher}</span><small className="text-slate-500">{record.description || EMPTY_VALUE}</small></div>
                      <div className="px-3 py-3">{record.version}</div>
                      <div className="px-3 py-3"><span className="block text-slate-900">{record.deviceName}</span><small className="text-slate-500">{record.department}</small></div>
                      <div className="px-3 py-3">{record.machineType}</div>
                      <div className="px-3 py-3 font-mono">{record.ip}</div>
                      <div className="px-3 py-3">{record.lastUpdated}</div>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-3 py-3 text-[0.78rem] font-bold text-slate-500">
              <span>
                Showing page {page} of {pageCount} • {(selectedStat ? statRows.length : filteredRecords.length).toLocaleString()} records
              </span>
              <div className="flex items-center gap-2">
                <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40" onClick={() => setPage(1)} disabled={page <= 1}>First</button>
                <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>Prev</button>
                <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page >= pageCount}>Next</button>
                <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40" onClick={() => setPage(pageCount)} disabled={page >= pageCount}>Last</button>
              </div>
            </div>
          </section>
        </section>
      </div>

      {showInsightsModal && (
        <div className="fixed inset-0 z-[2147483000] grid place-items-center bg-slate-950/40 p-4" onClick={() => setShowInsightsModal(false)}>
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-blue-600">Software Insights</span>
                <h3 className="mt-1 text-lg font-black text-slate-950">Classification Coverage</h3>
                <p className="mt-1 text-sm font-semibold text-slate-600">{classificationCoverage}% of software records are categorized.</p>
              </div>
              <button type="button" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" onClick={() => setShowInsightsModal(false)} aria-label="Close insights">
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4"><span className="text-xs font-black uppercase text-slate-500">Unclassified</span><strong className="mt-2 block text-2xl font-black text-slate-950">{summary.unclassified}</strong></div>
              <div className="rounded-xl border border-slate-200 p-4"><span className="text-xs font-black uppercase text-slate-500">Categories</span><strong className="mt-2 block text-2xl font-black text-slate-950">{summary.categories}</strong></div>
              <div className="rounded-xl border border-slate-200 p-4"><span className="text-xs font-black uppercase text-slate-500">Unique Software</span><strong className="mt-2 block text-2xl font-black text-slate-950">{summary.uniqueSoftware}</strong></div>
              <div className="rounded-xl border border-slate-200 p-4"><span className="text-xs font-black uppercase text-slate-500">Linked Devices</span><strong className="mt-2 block text-2xl font-black text-slate-950">{summary.uniqueDevices}</strong></div>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white" onClick={() => setShowInsightsModal(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Software;
