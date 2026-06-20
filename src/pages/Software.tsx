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
  FolderPlus,
  HardDrive,
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

type AssetItem = Record<string, unknown> & {
  _Idn?: number;
  id?: number;
  MDM_Asset_Idn?: number;
  Object_Root_Idn?: number;
  Object_Agent?: string;
  objectAgent?: string;
  ComputerName?: string;
  DeviceName?: string;
  AssetName?: string;
  Object_DeviceID?: string;
  DeviceID?: string;
  PlatformType?: string;
  ConnectionStatus?: string;
  IP?: string;
};

type TreeNode = {
  id: string;
  label: string;
  type: "org" | "branch" | "dept" | "device" | "category" | "sub";
  children?: TreeNode[];
  relationId?: number;
  assetId?: number;
  objectAgent?: string;
  objectDeviceId?: string;
  platformType?: string;
  connectionStatus?: string;
  ip?: string;
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

type ToastState = {
  type: "success" | "error" | "info";
  title: string;
  message: string;
} | null;

type StatRow = Record<string, unknown>;

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
    const value = localStorage.getItem(key);
    if (value && value.trim()) return value.trim();
  }

  const objectKeys = ["ema-auth", "auth", "user", "ema-user"];
  for (const key of objectKeys) {
    const value = localStorage.getItem(key);
    if (!value) continue;

    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      const data = parsed.data as Record<string, unknown> | undefined;
      const token = parsed.accessToken || parsed.token || parsed.jwtToken || parsed.bearerToken || data?.accessToken || data?.token;
      if (typeof token === "string" && token.trim()) return token.trim();
    } catch {
      // Ignore malformed storage values.
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
    const apiPayload = payload as { message?: string; error?: string } | null;
    throw new Error(apiPayload?.message || apiPayload?.error || `API request failed with status ${response.status} at ${url}.`);
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
    lastUpdated: safeString(record.LastUpdated),
    assetId: safeString(record.AssetID),
    assetTag,
    deviceName,
    machineType: safeString(record.MachineType, "Unknown"),
    os: safeString(record.OS || record.MachineType),
    ip: safeString(record.IP),
    department: safeString(record.Department),
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

function mapAssetToDeviceNode(asset: AssetItem, relationId?: number): TreeNode {
  const assetId = Number(asset._Idn ?? asset.MDM_Asset_Idn ?? asset.Object_Root_Idn ?? asset.id ?? 0);
  const objectAgent = safeString(asset.Object_Agent || asset.objectAgent, "EM");
  const label = safeString(asset.ComputerName || asset.DeviceName || asset.AssetName || asset.Object_DeviceID || asset.DeviceID || asset.IP, `Device ${assetId}`);

  return {
    id: `device-${objectAgent}-${assetId}`,
    label,
    type: "device",
    assetId,
    objectAgent,
    objectDeviceId: safeString(asset.Object_DeviceID || asset.DeviceID, ""),
    platformType: safeString(asset.PlatformType, ""),
    connectionStatus: safeString(asset.ConnectionStatus, ""),
    ip: safeString(asset.IP, ""),
    relationId,
    count: 1,
  };
}

function collectDepartmentRelationIds(departments: DepartmentNode[]): number[] {
  return departments
    .flatMap((department) => [department.Object_Rel_Idn, ...collectDepartmentRelationIds(department.children || [])])
    .filter((id) => Number.isFinite(id) && id > 0);
}

function createDefaultBranchTree(departments: DepartmentNode[], assets: AssetItem[]): TreeNode[] {
  const departmentNodes = mapDepartmentsToTree(departments);
  if (departmentNodes.length > 0) {
    return [{ id: "all", label: "All Branches", type: "org", count: departmentNodes.reduce((sum, node) => sum + getTreeCount(node), 0), children: departmentNodes }];
  }

  const deviceNodes = assets.map((asset) => mapAssetToDeviceNode(asset));
  return [{ id: "all", label: "All Branches", type: "org", count: deviceNodes.length, children: deviceNodes }];
}

function flattenTree(nodes: TreeNode[]): TreeNode[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children || [])]);
}

function makeStatTree(): TreeNode[] {
  return [
    {
      id: "software-statistics",
      label: "Software Statistics",
      type: "category",
      children: [
        { id: "stat-installed", label: "Installed Software", type: "sub" },
        { id: "stat-license", label: "License Status", type: "sub" },
        { id: "stat-exe", label: "EXE File Extension", type: "sub" },
        { id: "stat-dll", label: "DLL File Extension", type: "sub" },
        { id: "stat-ini", label: "INI File Extension", type: "sub" },
      ],
    },
  ];
}

function sortRecords(records: SoftwareRecord[], sortKey: SortKey, direction: SortDirection) {
  return [...records].sort((a, b) => {
    const av = safeString(a[sortKey], "").toLowerCase();
    const bv = safeString(b[sortKey], "").toLowerCase();
    const compare = av.localeCompare(bv, undefined, { numeric: true, sensitivity: "base" });
    return direction === "asc" ? compare : -compare;
  });
}

function exportCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const escape = (value: string | number) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(","), ...rows.map((row) => row.map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function Software() {
  const [records, setRecords] = useState<SoftwareRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [treeLoading, setTreeLoading] = useState(true);
  const [treeError, setTreeError] = useState("");
  const [deviceTree, setDeviceTree] = useState<TreeNode[]>([{ id: "all", label: "All Branches", type: "org", children: [] }]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => new Set(["all", "software-statistics"]));
  const [selectedNode, setSelectedNode] = useState<TreeNode>({ id: "all", label: "All Branches", type: "org" });
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("branch");
  const [activeView, setActiveView] = useState<ActiveView>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [osFilter, setOsFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("softwareName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const [scanLoading, setScanLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [selectedStat, setSelectedStat] = useState<StatView | null>(null);
  const [statRows, setStatRows] = useState<StatRow[]>([]);
  const [statLoading, setStatLoading] = useState(false);
  const [statError, setStatError] = useState("");

  const statTree = useMemo(() => makeStatTree(), []);

  const showToast = (next: ToastState) => {
    setToast(next);
    if (next) window.setTimeout(() => setToast(null), 4200);
  };

  const fetchTree = async () => {
    setTreeLoading(true);
    setTreeError("");

    try {
      const [departmentPayload, assetPayload] = await Promise.allSettled([
        apiGet<unknown>("/api/departments/tree"),
        apiGet<unknown>("/api/hardware/assets"),
      ]);

      const departments = departmentPayload.status === "fulfilled" ? (unwrapRows(departmentPayload.value) as DepartmentNode[]) : [];
      const assets = assetPayload.status === "fulfilled" ? (unwrapRows(assetPayload.value) as AssetItem[]) : [];
      const tree = createDefaultBranchTree(departments, assets);
      setDeviceTree(tree);
      setExpandedNodes((current) => new Set([...Array.from(current), "all"]));
    } catch (err) {
      setTreeError(err instanceof Error ? err.message : "Failed to load branches.");
    } finally {
      setTreeLoading(false);
    }
  };

  const fetchSoftware = async () => {
    setLoading(true);
    setError("");

    try {
      const payload = await apiGet<unknown>("/api/software-inventory");
      const rows = unwrapRows(payload) as ApiSoftwareRecord[];
      setRecords(rows.map(normalizeSoftwareRecord));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load software inventory.");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTree();
    void fetchSoftware();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, categoryFilter, osFilter, activeView, selectedNode.id, selectedStat]);

  const treeNodesFlat = useMemo(() => flattenTree(deviceTree), [deviceTree]);

  const selectedRelationId = useMemo(() => {
    if (selectedNode.relationId && selectedNode.relationId > 0) return selectedNode.relationId;
    return -1;
  }, [selectedNode]);

  const selectedAsset = useMemo(() => {
    if (selectedNode.type !== "device") return null;
    return selectedNode;
  }, [selectedNode]);

  const selectedScopeRecords = useMemo(() => {
    if (selectedNode.id === "all" || selectedNode.type === "org") return records;
    if (selectedNode.type === "device" && selectedNode.assetId) {
      const selectedAssetKeys = [String(selectedNode.assetId), selectedNode.objectDeviceId, selectedNode.label].filter(Boolean).map((value) => String(value).toLowerCase());
      return records.filter((record) =>
        selectedAssetKeys.some((key) =>
          [record.assetId, record.assetTag, record.objectDeviceId, record.deviceName].some((value) => String(value || "").toLowerCase() === key)
        )
      );
    }

    if (selectedNode.relationId && selectedNode.relationId > 0) {
      const descendants = flattenTree(selectedNode.children || []);
      const names = new Set([selectedNode.label, ...descendants.map((node) => node.label)].map((value) => value.toLowerCase()));
      return records.filter((record) => names.has(record.department.toLowerCase()));
    }

    return records;
  }, [records, selectedNode]);

  const filteredRecords = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    let next = selectedScopeRecords;

    if (activeView === "unique") {
      const seen = new Set<string>();
      next = next.filter((record) => {
        const key = record.softwareName.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    } else if (activeView === "categories") {
      next = next.filter((record) => record.category !== "Unclassified");
    } else if (activeView === "unclassified") {
      next = next.filter((record) => record.category === "Unclassified");
    }

    if (categoryFilter !== "all") next = next.filter((record) => record.category === categoryFilter);
    if (osFilter !== "all") next = next.filter((record) => record.os === osFilter || record.machineType === osFilter);

    if (query) {
      next = next.filter((record) =>
        [
          record.softwareName,
          record.category,
          record.publisher,
          record.version,
          record.username,
          record.deviceName,
          record.assetTag,
          record.os,
          record.ip,
          record.department,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }

    return sortRecords(next, sortKey, sortDirection);
  }, [activeView, categoryFilter, osFilter, searchTerm, selectedScopeRecords, sortDirection, sortKey]);

  const summary = useMemo(() => {
    const uniqueSoftware = new Set(records.map((record) => record.softwareName.toLowerCase())).size;
    const uniqueDevices = new Set(records.map((record) => record.deviceName.toLowerCase())).size;
    const categories = new Set(records.map((record) => record.category).filter((category) => category !== "Unclassified")).size;
    const unclassified = records.filter((record) => record.category === "Unclassified").length;

    return {
      totalRecords: records.length,
      uniqueSoftware,
      uniqueDevices,
      categories,
      unclassified,
    };
  }, [records]);

  const categoryOptions = useMemo(() => [...new Set(records.map((record) => record.category))].filter(Boolean).sort(), [records]);
  const osOptions = useMemo(() => [...new Set(records.map((record) => record.os || record.machineType))].filter((value) => value && value !== EMPTY_VALUE).sort(), [records]);
  const classificationCoverage = summary.totalRecords ? Math.round(((summary.totalRecords - summary.unclassified) / summary.totalRecords) * 100) : 0;

  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagedRecords = filteredRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleNode = (node: TreeNode) => {
    setExpandedNodes((current) => {
      const next = new Set(current);
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      return next;
    });
  };

  const handleNodeSelect = (node: TreeNode) => {
    if (node.type === "category") {
      toggleNode(node);
      return;
    }

    if (node.id === "stat-installed") setSelectedStat("installed");
    else if (node.id === "stat-license") setSelectedStat("license");
    else if (node.id === "stat-exe") setSelectedStat("exe");
    else if (node.id === "stat-dll") setSelectedStat("dll");
    else if (node.id === "stat-ini") setSelectedStat("ini");
    else {
      setSelectedStat(null);
      setSelectedNode(node);
      if (node.type !== "org") setActiveView("all");
    }
  };

  const activateView = (view: ActiveView) => {
    setSelectedStat(null);
    setActiveView(view);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const renderSort = (key: SortKey) => (sortKey === key ? (sortDirection === "asc" ? "↑" : "↓") : "↕");

  const refreshCurrentView = async () => {
    if (selectedStat) {
      await fetchStatistic(selectedStat);
      return;
    }

    await Promise.all([fetchTree(), fetchSoftware()]);
  };

  const handleSoftwareScan = async (mode: "all" | "folder" | "device") => {
    setScanLoading(true);

    try {
      const payload: Record<string, unknown> = { scanMode: mode };
      if (mode === "folder") payload.objectRelIdn = selectedRelationId;
      if (mode === "device" && selectedAsset) {
        payload.objectAgent = selectedAsset.objectAgent;
        payload.objectRootIdn = selectedAsset.assetId;
        payload.objectDeviceID = selectedAsset.objectDeviceId;
        payload.deviceName = selectedAsset.label;
      }

      await apiPost<unknown>("/api/software-inventory/scan", payload);
      showToast({ type: "success", title: "Scan queued", message: mode === "all" ? "Software scan started for all devices." : "Software scan request has been queued." });
    } catch (err) {
      showToast({ type: "error", title: "Scan failed", message: err instanceof Error ? err.message : "Unable to start software scan." });
    } finally {
      setScanLoading(false);
    }
  };

  const fetchStatistic = async (view: StatView) => {
    setSelectedStat(view);
    setStatLoading(true);
    setStatError("");

    const endpointMap: Record<StatView, string> = {
      installed: "/api/software/statistics/installed",
      license: "/api/software/statistics/license-status",
      exe: "/api/software/statistics/files/exe",
      dll: "/api/software/statistics/files/dll",
      ini: "/api/software/statistics/files/ini",
    };

    try {
      const rows = unwrapRows(await apiGet<unknown>(endpointMap[view]));
      setStatRows(rows);
    } catch (err) {
      setStatRows([]);
      setStatError(err instanceof Error ? err.message : "Failed to load statistic.");
    } finally {
      setStatLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStat) void fetchStatistic(selectedStat);
  }, [selectedStat]);

  const exportCurrentView = () => {
    if (selectedStat) {
      const keys = Object.keys(statRows[0] || {});
      exportCsv(`software-${selectedStat}.csv`, keys, statRows.map((row) => keys.map((key) => safeString(row[key]))));
      return;
    }

    exportCsv(
      "software-inventory.csv",
      ["Software Name", "Category", "Device", "Version", "OS", "Last Updated"],
      filteredRecords.map((record) => [record.softwareName, record.category, record.deviceName, record.version, record.os, record.lastUpdated])
    );
  };

  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setOsFilter("all");
    setActiveView("all");
  };

  const renderTree = (nodes: TreeNode[], depth = 0, mode: SidebarTab = "branch") => (
    <div className="grid gap-1" style={{ marginLeft: depth ? 12 : 0 }}>
      {nodes
        .filter((node) => {
          const query = searchTerm.trim().toLowerCase();
          if (!query || mode !== sidebarTab) return true;
          return node.label.toLowerCase().includes(query) || (node.children || []).some((child) => child.label.toLowerCase().includes(query));
        })
        .map((node) => {
        const hasChildren = Boolean(node.children?.length);
        const isExpanded = expandedNodes.has(node.id);
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

  const statTitle = selectedStat
    ? {
        installed: "Installed Software",
        license: "License Status",
        exe: "EXE File Extension",
        dll: "DLL File Extension",
        ini: "INI File Extension",
      }[selectedStat]
    : "";

  return (
    <main className="settings-module-root ema-settings-pro ema-module-root software-inventory-module container-fluid p-3 p-xl-4" data-section="software">
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

      <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(300px,322px)_minmax(0,1fr)]">
        <aside className="settings-menu ema-panel-surface min-w-[300px] max-w-[322px] rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 grid gap-0.5">
            <span className="text-[0.65rem] font-black uppercase tracking-[0.08em] text-slate-500">SOFTWARE</span>
            <strong className="text-[0.92rem] font-black text-slate-950">Software Inventory</strong>
            <small className="text-[0.75rem] font-semibold leading-5 text-slate-600">Browse software records, devices and statistics.</small>
          </div>

          <nav className="mb-3 grid grid-cols-2 rounded-2xl border border-blue-100 bg-slate-50 p-1" role="tablist" aria-label="Software navigation">
            <button
              type="button"
              className={cx("flex h-10 items-center justify-center gap-2 rounded-xl text-[0.82rem] font-black", sidebarTab === "branch" ? "bg-white text-blue-600 shadow-sm" : "text-slate-700 hover:bg-white/70")}
              onClick={() => setSidebarTab("branch")}
            >
              <FolderOpen size={16} />
              Branch
            </button>
            <button
              type="button"
              className={cx("flex h-10 items-center justify-center gap-2 rounded-xl text-[0.82rem] font-black", sidebarTab === "statistics" ? "bg-white text-blue-600 shadow-sm" : "text-slate-700 hover:bg-white/70")}
              onClick={() => setSidebarTab("statistics")}
            >
              <Database size={16} />
              Statistics
            </button>
          </nav>

          <div className="mb-3 flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-500">
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

          {sidebarTab === "branch" && (
            <button
              type="button"
              className="mb-3 flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white text-[0.78rem] font-black text-slate-950 shadow-sm hover:bg-blue-50"
              onClick={() => showToast({ type: "info", title: "Branch management", message: "Use the branch tree to browse software by location." })}
            >
              <FolderPlus size={13} />
              New Branch Path
            </button>
          )}

          <div className="max-h-[calc(100vh-18rem)] overflow-auto pr-1">
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
                {!treeLoading && renderTree(deviceTree, 0, "branch")}
              </>
            ) : (
              renderTree(statTree, 0, "statistics")
            )}
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
                    <span className="text-[0.66rem] font-black uppercase tracking-[0.06em] text-slate-500">Operating System</span>
                    <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[0.8rem] font-bold text-slate-900 outline-none focus:border-blue-300" value={osFilter} onChange={(event) => setOsFilter(event.target.value)}>
                      <option value="all">All OS</option>
                      {osOptions.map((os) => (
                        <option key={os} value={os}>{os}</option>
                      ))}
                    </select>
                  </label>
                  <button type="button" className="mt-auto flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[0.78rem] font-black text-slate-500 shadow-sm hover:bg-slate-50" onClick={clearFilters}>
                    <X size={14} />
                    Reset
                  </button>
                </div>
              )}
            </div>

            <div className="px-3 pb-2 text-[0.78rem] font-black text-slate-600">
              {selectedStat ? statTitle : `${selectedNode.label} scope${loading ? " • Loading software data..." : ""}${error ? " • Note: Some records could not be refreshed." : ""}`}
            </div>

            <div className="mx-3 flex min-h-[22rem] flex-1 flex-col overflow-hidden rounded-xl border border-slate-200">
              {selectedStat ? (
                <div className="flex min-h-[22rem] flex-1 flex-col overflow-auto">
                  {statLoading ? (
                    <div className="grid flex-1 place-items-center text-center">
                      <div>
                        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-500" />
                        <div className="mt-3 text-[0.72rem] font-black uppercase tracking-[0.12em] text-slate-400">Loading Data...</div>
                      </div>
                    </div>
                  ) : statError ? (
                    <div className="grid flex-1 place-items-center text-center text-red-600">
                      <div>
                        <AlertTriangle className="mx-auto" size={30} />
                        <strong className="mt-3 block text-[0.76rem] uppercase tracking-[0.12em]">Failed to load statistic</strong>
                        <span className="mt-2 block text-xs text-slate-500">{statError}</span>
                      </div>
                    </div>
                  ) : statRows.length === 0 ? (
                    <div className="grid flex-1 place-items-center text-center text-slate-400">
                      <div>
                        <Database className="mx-auto" size={30} />
                        <strong className="mt-3 block text-[0.76rem] uppercase tracking-[0.12em]">No Data</strong>
                      </div>
                    </div>
                  ) : (
                    <table className="min-w-full text-left text-[0.78rem]">
                      <thead className="bg-slate-100 text-[0.68rem] uppercase tracking-[0.08em] text-slate-600">
                        <tr>
                          {Object.keys(statRows[0] || {}).map((key) => <th key={key} className="px-4 py-3 font-black">{key}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {statRows.map((row, index) => (
                          <tr key={index} className="border-t border-slate-100 hover:bg-slate-50">
                            {Object.keys(statRows[0] || {}).map((key) => <td key={key} className="px-4 py-3 font-bold text-slate-700">{safeString(row[key])}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid min-w-[980px] grid-cols-[54px_minmax(220px,1.5fr)_minmax(150px,1fr)_minmax(160px,0.9fr)_minmax(120px,0.75fr)_minmax(120px,0.75fr)_minmax(150px,0.9fr)] bg-slate-100 text-[0.68rem] font-black uppercase tracking-[0.06em] text-slate-600">
                    <div className="px-4 py-3">#</div>
                    <button type="button" className="px-4 py-3 text-left font-black" onClick={() => handleSort("softwareName")}>Software Name {renderSort("softwareName")}</button>
                    <button type="button" className="px-4 py-3 text-left font-black" onClick={() => handleSort("category")}>Category {renderSort("category")}</button>
                    <button type="button" className="px-4 py-3 text-left font-black" onClick={() => handleSort("deviceName")}>Device {renderSort("deviceName")}</button>
                    <button type="button" className="px-4 py-3 text-left font-black" onClick={() => handleSort("version")}>Version {renderSort("version")}</button>
                    <button type="button" className="px-4 py-3 text-left font-black" onClick={() => handleSort("machineType")}>Type {renderSort("machineType")}</button>
                    <button type="button" className="px-4 py-3 text-left font-black" onClick={() => handleSort("lastUpdated")}>Last Updated {renderSort("lastUpdated")}</button>
                  </div>

                  <div className="flex-1 overflow-auto">
                    {loading ? (
                      <div className="grid min-h-[20rem] place-items-center text-center">
                        <div>
                          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-500" />
                          <div className="mt-3 text-[0.72rem] font-black uppercase tracking-[0.12em] text-slate-400">Loading Data...</div>
                        </div>
                      </div>
                    ) : error ? (
                      <div className="grid min-h-[20rem] place-items-center text-center text-red-600">
                        <div>
                          <AlertTriangle className="mx-auto" size={30} />
                          <strong className="mt-3 block text-[0.76rem] uppercase tracking-[0.12em]">Failed to load software</strong>
                          <span className="mt-2 block text-xs text-slate-500">{error}</span>
                        </div>
                      </div>
                    ) : pagedRecords.length === 0 ? (
                      <div className="grid min-h-[20rem] place-items-center text-center text-slate-400">
                        <div>
                          <Package className="mx-auto" size={30} />
                          <strong className="mt-3 block text-[0.76rem] uppercase tracking-[0.12em]">No Software Found</strong>
                        </div>
                      </div>
                    ) : (
                      pagedRecords.map((record, index) => (
                        <div key={record.id} className="grid min-w-[980px] grid-cols-[54px_minmax(220px,1.5fr)_minmax(150px,1fr)_minmax(160px,0.9fr)_minmax(120px,0.75fr)_minmax(120px,0.75fr)_minmax(150px,0.9fr)] items-center border-t border-slate-100 text-[0.78rem] font-bold text-slate-700 hover:bg-slate-50">
                          <div className="px-4 py-3 text-slate-500">{String((currentPage - 1) * PAGE_SIZE + index + 1).padStart(2, "0")}</div>
                          <div className="min-w-0 px-4 py-3">
                            <strong className="block truncate text-slate-950">{record.softwareName}</strong>
                            <small className="block truncate text-[0.68rem] text-slate-500">{record.publisher !== EMPTY_VALUE ? record.publisher : record.description}</small>
                          </div>
                          <div className="px-4 py-3">{record.category}</div>
                          <div className="min-w-0 px-4 py-3">
                            <strong className="block truncate text-slate-950">{record.deviceName}</strong>
                            <small className="block truncate text-[0.68rem] text-slate-500">{record.assetTag}</small>
                          </div>
                          <div className="px-4 py-3">{record.version}</div>
                          <div className="px-4 py-3">{record.machineType}</div>
                          <div className="px-4 py-3">{formatDateTime(record.lastUpdated)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {!selectedStat && (
              <div className="flex items-center justify-between px-3 py-3 text-[0.78rem] font-black text-slate-600">
                <div>Page {currentPage} of {pageCount}</div>
                <div className="flex items-center gap-1">
                  <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white disabled:opacity-50" onClick={() => setPage(1)} disabled={currentPage === 1}>«</button>
                  <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white disabled:opacity-50" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1}>‹</button>
                  <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-slate-950 px-2 text-white">{currentPage}</span>
                  <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white disabled:opacity-50" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={currentPage === pageCount}>›</button>
                  <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white disabled:opacity-50" onClick={() => setPage(pageCount)} disabled={currentPage === pageCount}>»</button>
                </div>
              </div>
            )}
          </section>
        </section>
      </div>

      {showInsightsModal && (
        <div className="fixed inset-0 z-[2000] grid place-items-center bg-slate-900/50 p-4" onClick={() => setShowInsightsModal(false)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <h3 className="text-lg font-black text-slate-950">Software Insights</h3>
                <p className="mt-1 text-sm font-semibold text-slate-600">Classification and governance summary.</p>
              </div>
              <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={() => setShowInsightsModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 p-4">
                <span className="text-xs font-black uppercase text-slate-500">Coverage</span>
                <strong className="mt-2 block text-2xl font-black text-blue-600">{classificationCoverage}%</strong>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <span className="text-xs font-black uppercase text-slate-500">Unclassified</span>
                <strong className="mt-2 block text-2xl font-black text-slate-950">{summary.unclassified}</strong>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <span className="text-xs font-black uppercase text-slate-500">Categories</span>
                <strong className="mt-2 block text-2xl font-black text-slate-950">{summary.categories}</strong>
              </div>
            </div>
            <div className="flex justify-end border-t border-slate-200 p-4">
              <button type="button" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white" onClick={() => setShowInsightsModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
