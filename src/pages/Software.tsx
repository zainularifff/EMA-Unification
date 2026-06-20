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
    .filter((relationID) => Number.isFinite(relationID) && relationID > 0);
}

function attachDeviceNodes(nodes: TreeNode[], devices: TreeNode[]) {
  const devicesByRelation = new Map<number, TreeNode[]>();
  devices.forEach((device) => {
    if (!device.relationId) return;
    const list = devicesByRelation.get(device.relationId) || [];
    list.push(device);
    devicesByRelation.set(device.relationId, list);
  });

  const attach = (node: TreeNode): TreeNode => {
    const children = (node.children || []).map(attach);
    const directDevices = node.relationId ? devicesByRelation.get(node.relationId) || [] : [];
    return { ...node, children: [...children, ...directDevices], count: node.count || children.reduce((total, child) => total + getTreeCount(child), 0) + directDevices.length };
  };

  return nodes.map(attach);
}

function uniqueValues(records: SoftwareRecord[], key: keyof SoftwareRecord) {
  return Array.from(new Set(records.map((record) => String(record[key] || "").trim()).filter((value) => value && value !== EMPTY_VALUE))).sort((a, b) => a.localeCompare(b));
}

function countBy(records: SoftwareRecord[], key: keyof SoftwareRecord) {
  const map = new Map<string, number>();
  records.forEach((record) => {
    const label = safeString(record[key], "Unknown");
    map.set(label, (map.get(label) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function dedupeBy<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getKey(item).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeForCompare(value: string) {
  return value === EMPTY_VALUE ? "" : value.toLowerCase();
}

function exportRowsToCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const csvRows = [
    headers,
    ...rows.map((row) => row.map((cell) => String(cell ?? ""))),
  ];

  const csv = csvRows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function pick(row: StatRow, keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") return String(row[key]);
  }
  return EMPTY_VALUE;
}

const branchRoot: TreeNode = {
  id: "org-root",
  label: "All Branches",
  type: "org",
  relationId: -1,
  count: 0,
  children: [],
};

const statTree: TreeNode[] = [
  { id: "stat-installed", label: "Installed Software", type: "category", count: 0 },
  { id: "stat-license", label: "License Status", type: "category", count: 0 },
  {
    id: "stat-extension",
    label: "File Extension",
    type: "category",
    children: [
      { id: "stat-exe", label: "EXE", type: "sub" },
      { id: "stat-dll", label: "DLL", type: "sub" },
      { id: "stat-ini", label: "INI", type: "sub" },
    ],
  },
];

export default function Software() {
  const [records, setRecords] = useState<SoftwareRecord[]>([]);
  const [categoriesFromApi, setCategoriesFromApi] = useState<string[]>([]);
  const [deviceTree, setDeviceTree] = useState<TreeNode[]>([branchRoot]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["org-root"]));
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("branch");
  const [selectedNode, setSelectedNode] = useState<TreeNode>(branchRoot);
  const [activeView, setActiveView] = useState<ActiveView>("all");
  const [selectedStat, setSelectedStat] = useState<StatView | null>(null);
  const [statRows, setStatRows] = useState<StatRow[]>([]);
  const [statLoading, setStatLoading] = useState(false);
  const [statError, setStatError] = useState("");

  const [loading, setLoading] = useState(true);
  const [treeLoading, setTreeLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [osFilter, setOsFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("softwareName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<ToastState>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [showInsightsModal, setShowInsightsModal] = useState(false);

  const showToast = (nextToast: ToastState) => {
    setToast(nextToast);
    if (nextToast) {
      window.setTimeout(() => setToast(null), 3600);
    }
  };

  const loadSoftwareInventory = async () => {
    setLoading(true);
    setApiError("");

    void apiGet<string[] | { data?: string[] }>("/api/software/categories")
      .then((categoriesResponse) => {
        const categoryPayload = Array.isArray(categoriesResponse) ? categoriesResponse : Array.isArray(categoriesResponse.data) ? categoriesResponse.data : [];
        setCategoriesFromApi(categoryPayload.map((item) => cleanCategory(item)).filter(Boolean));
      })
      .catch(() => setCategoriesFromApi([]));

    try {
      const softwareResponse = await apiGet<ApiSoftwareRecord[] | { data?: ApiSoftwareRecord[] }>("/api/software");
      const softwarePayload = Array.isArray(softwareResponse) ? softwareResponse : Array.isArray(softwareResponse.data) ? softwareResponse.data : [];
      setRecords(softwarePayload.map(normalizeSoftwareRecord));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load software data.";
      setApiError(message);
      setRecords([]);
      showToast({ type: "error", title: "Software API failed", message });
    } finally {
      setLoading(false);
    }
  };

  const loadDepartmentTree = async () => {
    setTreeLoading(true);
    try {
      const response = await apiGet<DepartmentNode[] | { data?: DepartmentNode[] }>("/api/departments");
      const departments = Array.isArray(response) ? response : Array.isArray(response.data) ? response.data : [];
      const branchTree = [{ ...branchRoot, children: mapDepartmentsToTree(departments) }];
      const relationIds = collectDepartmentRelationIds(departments);
      const assetResults = await Promise.allSettled(
        relationIds.map(async (relationId) => {
          const assetResponse = await apiGet<AssetItem[] | { data?: AssetItem[] }>(`/api/assets/${relationId}`);
          const assets = Array.isArray(assetResponse) ? assetResponse : Array.isArray(assetResponse.data) ? assetResponse.data : [];
          return assets.map((asset) => mapAssetToDeviceNode(asset, relationId));
        })
      );
      const deviceNodes = assetResults.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
      const nextTree = attachDeviceNodes(branchTree, deviceNodes);
      setDeviceTree(nextTree);
      setExpandedGroups((current) => new Set([...Array.from(current), "org-root"]));
    } catch {
      setDeviceTree([branchRoot]);
    } finally {
      setTreeLoading(false);
    }
  };

  useEffect(() => {
    void loadSoftwareInventory();
    void loadDepartmentTree();
  }, []);

  const categoryOptions = useMemo(() => {
    const fromRecords = uniqueValues(records, "category");
    return Array.from(new Set([...categoriesFromApi, ...fromRecords])).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [records, categoriesFromApi]);

  const osOptions = useMemo(() => uniqueValues(records, "os"), [records]);

  const selectedBranchLabel = selectedNode?.label || "All Branches";
  const selectedRelationId = selectedNode?.relationId ?? -1;

  const filteredRecords = useMemo(() => {
    const lowerSearch = searchTerm.trim().toLowerCase();

    let rows = records.filter((record) => {
      const searchable = [
        record.softwareName,
        record.category,
        record.publisher,
        record.description,
        record.version,
        record.assetTag,
        record.deviceName,
        record.machineType,
        record.os,
        record.username,
        record.ip,
        record.department,
      ].join(" ").toLowerCase();

      const matchesSearch = !lowerSearch || searchable.includes(lowerSearch);
      const matchesCategory = categoryFilter === "all" || record.category === categoryFilter;
      const matchesOs = osFilter === "all" || record.os === osFilter;
      const matchesBranch =
        selectedNode.type === "org" ||
        selectedRelationId === -1 ||
        record.department === selectedBranchLabel ||
        record.department.includes(selectedBranchLabel) ||
        selectedBranchLabel.includes(record.department);
      const matchesDevice =
        selectedNode.type !== "device" ||
        record.deviceName === selectedNode.label ||
        record.assetTag === selectedNode.objectDeviceId ||
        record.objectDeviceId === selectedNode.objectDeviceId;

      return matchesSearch && matchesCategory && matchesOs && matchesBranch && matchesDevice;
    });

    if (activeView === "unique") rows = dedupeBy(rows, (record) => record.softwareName);
    if (activeView === "installed") rows = rows.filter((record) => record.deviceName && record.deviceName !== EMPTY_VALUE);
    if (activeView === "unclassified") rows = rows.filter((record) => record.category.toLowerCase() === "unclassified");

    rows = [...rows].sort((a, b) => {
      const first = normalizeForCompare(String(a[sortKey] || ""));
      const second = normalizeForCompare(String(b[sortKey] || ""));
      if (first < second) return sortDirection === "asc" ? -1 : 1;
      if (first > second) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return rows;
  }, [records, searchTerm, categoryFilter, osFilter, activeView, sortKey, sortDirection, selectedNode, selectedBranchLabel, selectedRelationId]);

  const summary = useMemo(() => {
    const uniqueSoftware = new Set(records.map((record) => record.softwareName).filter(Boolean)).size;
    const uniqueDevices = new Set(records.map((record) => record.assetTag || record.objectDeviceId || record.deviceName).filter(Boolean)).size;
    const unclassified = records.filter((record) => record.category.toLowerCase() === "unclassified").length;
    return { totalRecords: records.length, uniqueSoftware, uniqueDevices, categories: categoryOptions.length, unclassified };
  }, [records, categoryOptions.length]);

  const classificationCoverage = summary.totalRecords ? Math.round(((summary.totalRecords - summary.unclassified) / summary.totalRecords) * 100) : 0;
  const categoryCounts = useMemo(() => countBy(records, "category"), [records]);
  const typeCounts = useMemo(() => countBy(records, "machineType"), [records]);
  const topSoftware = useMemo(() => countBy(records, "softwareName").slice(0, 8), [records]);

  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const pageRows = filteredRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, categoryFilter, osFilter, activeView, selectedNode.id]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  const renderSortIndicator = (key: SortKey) => {
    const active = sortKey === key;
    return <span className={cx("text-[0.65rem]", active ? "text-blue-600" : "text-slate-400")}>↕</span>;
  };

  const activateView = (view: ActiveView) => {
    setActiveView(view);
    setSelectedStat(null);
    setStatRows([]);
    setPage(1);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setOsFilter("all");
    setActiveView("all");
    setSelectedNode(branchRoot);
    setSelectedStat(null);
    setStatRows([]);
    setPage(1);
  };

  const refreshCurrentView = async () => {
    if (selectedStat) {
      await loadStatistic(selectedStat);
      return;
    }
    await loadSoftwareInventory();
  };

  const exportCurrentView = () => {
    if (selectedStat) {
      const headers = ["Name", "Count", "Category", "Detail", "Updated"];
      const rows = statRows.map((row) => [
        pick(row, ["SoftwareName", "Name", "ApplicationPackage", "FileName", "Original Software Name", "SWUNI_Name"]),
        pick(row, ["Used", "Count", "Total", "Cnt", "UsedCount"]),
        pick(row, ["Classification", "CategoryName", "Category"]),
        pick(row, ["Manufacturer", "Publisher", "Description", "Detail", "Remark"]),
        pick(row, ["LastUpdated", "SearchDate", "ExpiryDate"]),
      ]);
      exportRowsToCsv(`software-${selectedStat}`, headers, rows);
      return;
    }

    exportRowsToCsv(
      "software-inventory",
      ["Software Name", "Category", "Device", "Version", "Type", "Last Updated"],
      filteredRecords.map((record) => [record.softwareName, record.category, record.deviceName, record.version, record.machineType, formatDateTime(record.lastUpdated)])
    );
  };

  const handleSoftwareScan = async (mode: "all" | "folder" | "device") => {
    setScanLoading(true);
    try {
      await apiPost("/api/software/scan", {
        scanMode: mode,
        relationID: mode === "folder" ? selectedRelationId : undefined,
        assetId: mode === "device" ? selectedNode.assetId : undefined,
        objectAgent: mode === "device" ? selectedNode.objectAgent : undefined,
        objectDeviceID: mode === "device" ? selectedNode.objectDeviceId : undefined,
      });
      showToast({ type: "success", title: "Scan started", message: `Software scan started for ${mode}.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Software scan request failed.";
      showToast({ type: "error", title: "Scan failed", message });
    } finally {
      setScanLoading(false);
    }
  };

  const loadStatistic = async (view: StatView) => {
    setSelectedStat(view);
    setActiveView("all");
    setStatLoading(true);
    setStatError("");
    setStatRows([]);
    setSidebarTab("statistics");

    const relationId = selectedRelationId > 0 ? selectedRelationId : -1;
    const relationPath = relationId > 0 ? relationId : -1;

    try {
      let path = `/api/software/relation/${relationPath}/installed?mode=summary1`;
      if (view === "license") path = `/api/software/relation/${relationPath}/packages?mode=stat1`;
      if (view === "exe") path = `/api/software/relation/${relationPath}/files?extension=EXE`;
      if (view === "dll") path = `/api/software/relation/${relationPath}/files?extension=DLL`;
      if (view === "ini") path = `/api/software/relation/${relationPath}/files?extension=INI`;

      const payload = await apiGet<unknown>(path);
      setStatRows(unwrapRows(payload));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load statistic data.";
      setStatError(message);
      showToast({ type: "error", title: "Statistic failed", message });
    } finally {
      setStatLoading(false);
    }
  };

  const handleNodeSelect = (node: TreeNode) => {
    if (node.type === "category" || node.type === "sub") {
      const map: Record<string, StatView> = {
        "stat-installed": "installed",
        "stat-license": "license",
        "stat-exe": "exe",
        "stat-dll": "dll",
        "stat-ini": "ini",
      };
      const view = map[node.id];
      if (view) void loadStatistic(view);
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
    <main className="settings-module-root ema-settings-pro ema-module-root software-inventory-module" data-section="software">
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

      <div className="grid min-w-0 gap-2 lg:grid-cols-[16.25rem_minmax(0,1fr)]">
        <aside className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
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

        <section className="grid min-w-0 gap-2">
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
                  <button type="button" className="mt-5 flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[0.78rem] font-black text-slate-500 shadow-sm hover:bg-slate-50" onClick={resetFilters}>
                    <X size={14} />
                    Reset
                  </button>
                </div>
              )}
            </div>

            {apiError && !selectedStat && (
              <div className="mx-3 mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
                <AlertTriangle size={16} />
                <div><strong className="block text-sm font-black">Software API failed</strong><span className="text-xs font-semibold">{apiError}</span></div>
              </div>
            )}

            {statError && selectedStat && (
              <div className="mx-3 mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
                <AlertTriangle size={16} />
                <div><strong className="block text-sm font-black">Statistic failed</strong><span className="text-xs font-semibold">{statError}</span></div>
              </div>
            )}

            <div className="mx-3 mb-2 text-[0.78rem] font-black text-slate-600">
              {selectedStat ? `${statTitle} • ${selectedBranchLabel} scope` : `${selectedBranchLabel} scope${searchTerm ? ` • Search: ${searchTerm}` : ""}${loading ? " • Loading software data..." : ""}`}
            </div>

            <div className="mx-3 min-h-[16rem] flex-1 overflow-auto rounded-xl border border-slate-200">
              {!selectedStat ? (
                <>
                  <div className="sticky top-0 z-10 grid min-w-[1050px] grid-cols-[4rem_2fr_1.2fr_1.5fr_0.9fr_1fr_1.2fr] bg-slate-100 text-[0.68rem] font-black uppercase tracking-[0.06em] text-slate-600">
                    <button type="button" className="px-4 py-4 text-left">#</button>
                    <button type="button" className="px-4 py-4 text-left" onClick={() => handleSort("softwareName")}>Software Name {renderSortIndicator("softwareName")}</button>
                    <button type="button" className="px-4 py-4 text-left" onClick={() => handleSort("category")}>Category {renderSortIndicator("category")}</button>
                    <button type="button" className="px-4 py-4 text-left" onClick={() => handleSort("deviceName")}>Device {renderSortIndicator("deviceName")}</button>
                    <button type="button" className="px-4 py-4 text-left" onClick={() => handleSort("version")}>Version {renderSortIndicator("version")}</button>
                    <button type="button" className="px-4 py-4 text-left" onClick={() => handleSort("machineType")}>Type {renderSortIndicator("machineType")}</button>
                    <button type="button" className="px-4 py-4 text-left" onClick={() => handleSort("lastUpdated")}>Last Updated {renderSortIndicator("lastUpdated")}</button>
                  </div>

                  {loading ? (
                    <div className="grid min-h-[16rem] place-items-center">
                      <div className="text-center">
                        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-500" />
                        <div className="mt-3 text-[0.72rem] font-black uppercase tracking-[0.12em] text-slate-400">Loading Data...</div>
                      </div>
                    </div>
                  ) : pageRows.length ? (
                    pageRows.map((record, index) => (
                      <div key={record.id} className="grid min-w-[1050px] grid-cols-[4rem_2fr_1.2fr_1.5fr_0.9fr_1fr_1.2fr] border-t border-slate-100 bg-white text-[0.76rem] text-slate-700 hover:bg-blue-50/40">
                        <div className="flex items-center px-4 py-3">
                          <span className="rounded-lg bg-slate-100 px-2 py-1 text-[0.68rem] font-black text-slate-500">{String((page - 1) * PAGE_SIZE + index + 1).padStart(2, "0")}</span>
                        </div>
                        <div className="min-w-0 px-4 py-3">
                          <strong className="block truncate font-black text-slate-950" title={record.softwareName}>{record.softwareName}</strong>
                          <small className="mt-0.5 block truncate text-[0.68rem] font-bold text-slate-500" title={record.publisher || record.assetTag}>{record.publisher || record.assetTag || "-"}</small>
                        </div>
                        <div className="min-w-0 px-4 py-3">
                          <strong className="block truncate font-black text-slate-950" title={record.category}>{record.category}</strong>
                          <small className="mt-0.5 block truncate text-[0.68rem] font-bold text-slate-500">{record.publisher || "Software category"}</small>
                        </div>
                        <div className="min-w-0 px-4 py-3">
                          <strong className="block truncate font-black text-slate-950" title={record.deviceName}>{record.deviceName}</strong>
                          <small className="mt-0.5 block truncate text-[0.68rem] font-bold text-slate-500">{record.ip || record.assetTag || "-"}</small>
                        </div>
                        <div className="min-w-0 px-4 py-3 font-black text-slate-700">{record.version}</div>
                        <div className="min-w-0 px-4 py-3">
                          <strong className="block truncate font-black text-slate-950">{record.machineType || "-"}</strong>
                          <small className="mt-0.5 block truncate text-[0.68rem] font-bold text-slate-500">{record.os || "-"}</small>
                        </div>
                        <div className="min-w-0 px-4 py-3 font-bold text-slate-600">{formatDateTime(record.lastUpdated)}</div>
                      </div>
                    ))
                  ) : (
                    <div className="grid min-h-[16rem] place-items-center">
                      <div className="text-center text-slate-400">
                        <Package size={24} className="mx-auto mb-2" />
                        <strong className="block text-sm font-black text-slate-600">No software records found</strong>
                        <span className="text-xs font-semibold">No records match the current filter/search.</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="sticky top-0 z-10 grid min-w-[900px] grid-cols-[4rem_2fr_1fr_1.2fr_1.5fr_1fr] bg-slate-100 text-[0.68rem] font-black uppercase tracking-[0.06em] text-slate-600">
                    {["#", "Name", "Count", "Category", "Detail", "Updated"].map((header) => (
                      <div key={header} className="px-4 py-4">{header}</div>
                    ))}
                  </div>

                  {statLoading ? (
                    <div className="grid min-h-[16rem] place-items-center">
                      <div className="text-center">
                        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-500" />
                        <div className="mt-3 text-[0.72rem] font-black uppercase tracking-[0.12em] text-slate-400">Loading Data...</div>
                      </div>
                    </div>
                  ) : statRows.length ? (
                    statRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((row, index) => (
                      <div key={`${selectedStat}-${index}`} className="grid min-w-[900px] grid-cols-[4rem_2fr_1fr_1.2fr_1.5fr_1fr] border-t border-slate-100 bg-white text-[0.76rem] text-slate-700 hover:bg-blue-50/40">
                        <div className="px-4 py-3"><span className="rounded-lg bg-slate-100 px-2 py-1 text-[0.68rem] font-black text-slate-500">{String((page - 1) * PAGE_SIZE + index + 1).padStart(2, "0")}</span></div>
                        <div className="truncate px-4 py-3 font-black text-slate-950">{pick(row, ["SoftwareName", "Name", "ApplicationPackage", "FileName", "Original Software Name", "SWUNI_Name"])}</div>
                        <div className="truncate px-4 py-3 font-bold">{pick(row, ["Used", "Count", "Total", "Cnt", "UsedCount"])}</div>
                        <div className="truncate px-4 py-3 font-bold">{pick(row, ["Classification", "CategoryName", "Category"])}</div>
                        <div className="truncate px-4 py-3 font-bold">{pick(row, ["Manufacturer", "Publisher", "Description", "Detail", "Remark"])}</div>
                        <div className="truncate px-4 py-3 font-bold">{pick(row, ["LastUpdated", "SearchDate", "ExpiryDate"])}</div>
                      </div>
                    ))
                  ) : (
                    <div className="grid min-h-[16rem] place-items-center">
                      <div className="text-center text-slate-400">
                        <Database size={24} className="mx-auto mb-2" />
                        <strong className="block text-sm font-black text-slate-600">No software records loaded</strong>
                        <span className="text-xs font-semibold">Choose a branch, device or statistic view to load data.</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 p-3">
              <div className="text-[0.78rem] font-black text-slate-600">Page {page} of {selectedStat ? Math.max(1, Math.ceil(statRows.length / PAGE_SIZE)) : pageCount}</div>
              <div className="flex items-center gap-1">
                <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-50" type="button" onClick={() => setPage(1)} disabled={page <= 1} aria-label="First page">«</button>
                <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-50" type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} aria-label="Previous page">‹</button>
                <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-slate-950 px-2 text-sm font-black text-white">{page}</span>
                <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-50" type="button" onClick={() => setPage((current) => Math.min(selectedStat ? Math.max(1, Math.ceil(statRows.length / PAGE_SIZE)) : pageCount, current + 1))} disabled={page >= (selectedStat ? Math.max(1, Math.ceil(statRows.length / PAGE_SIZE)) : pageCount)} aria-label="Next page">›</button>
                <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-50" type="button" onClick={() => setPage(selectedStat ? Math.max(1, Math.ceil(statRows.length / PAGE_SIZE)) : pageCount)} disabled={page >= (selectedStat ? Math.max(1, Math.ceil(statRows.length / PAGE_SIZE)) : pageCount)} aria-label="Last page">»</button>
              </div>
            </div>
          </section>
        </section>
      </div>

      {showInsightsModal && (
        <div className="fixed inset-0 z-[9999] grid place-items-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" onClick={() => setShowInsightsModal(false)}>
          <section className="w-[min(58rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><FileText size={22} /></div>
                <div>
                  <span className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-slate-500">Software Insights</span>
                  <h2 className="mt-1 text-xl font-black text-slate-950">Inventory Overview</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-600">Computed from current inventory data.</p>
                </div>
              </div>
              <button type="button" className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600" onClick={() => setShowInsightsModal(false)} aria-label="Close software insights">
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 p-5">
              <div className="grid gap-3 md:grid-cols-3">
                <button type="button" className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-left" onClick={() => { activateView("all"); setShowInsightsModal(false); }}><span className="text-xs font-black uppercase text-blue-600">Inventory Health</span><strong className="mt-2 block text-2xl font-black text-slate-950">{summary.totalRecords}</strong><small className="font-bold text-slate-500">{filteredRecords.length} visible records</small></button>
                <button type="button" className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-left" onClick={() => { activateView("categories"); setShowInsightsModal(false); }}><span className="text-xs font-black uppercase text-emerald-600">Classified Coverage</span><strong className="mt-2 block text-2xl font-black text-slate-950">{classificationCoverage}%</strong><small className="font-bold text-slate-500">{summary.categories} class types</small></button>
                <button type="button" className="rounded-xl border border-red-100 bg-red-50 p-4 text-left" onClick={() => { activateView("unclassified"); setShowInsightsModal(false); }}><span className="text-xs font-black uppercase text-red-600">Needs Attention</span><strong className="mt-2 block text-2xl font-black text-slate-950">{summary.unclassified}</strong><small className="font-bold text-slate-500">records without category</small></button>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center gap-2"><Package size={15} /><strong className="text-sm font-black">Top Software</strong></div>
                  <div className="grid gap-2">
                    {topSoftware.map((item) => <button type="button" key={item.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-left text-xs font-bold" onClick={() => { setSearchTerm(item.label); setShowInsightsModal(false); }}><span className="truncate">{item.label}</span><strong>{item.count}</strong></button>)}
                    {!topSoftware.length && <div className="text-xs font-semibold text-slate-400">No software data yet.</div>}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center gap-2"><HardDrive size={15} /><strong className="text-sm font-black">Device Mix</strong></div>
                  <div className="grid gap-2">
                    {typeCounts.slice(0, 6).map((item) => <button type="button" key={item.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-left text-xs font-bold" onClick={() => { setSearchTerm(item.label); setShowInsightsModal(false); }}><span className="truncate">{item.label}</span><strong>{item.count}</strong></button>)}
                    {!typeCounts.length && <div className="text-xs font-semibold text-slate-400">No device data yet.</div>}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center gap-2"><Layers size={15} /><strong className="text-sm font-black">Categories</strong></div>
                  <div className="grid gap-2">
                    {categoryCounts.slice(0, 6).map((item) => <button type="button" key={item.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-left text-xs font-bold" onClick={() => { setCategoryFilter(item.label); setShowInsightsModal(false); }}><span className="truncate">{item.label}</span><strong>{item.count}</strong></button>)}
                    {!categoryCounts.length && <div className="text-xs font-semibold text-slate-400">No category data yet.</div>}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
              <button type="button" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50" onClick={() => { resetFilters(); setShowInsightsModal(false); }}>Reset Filters</button>
              <button type="button" className="rounded-xl border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700" onClick={() => void handleSoftwareScan("all")} disabled={scanLoading}>Scan All</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
