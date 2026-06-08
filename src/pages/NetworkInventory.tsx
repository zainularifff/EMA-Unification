import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, MouseEvent } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Database,
  Edit3,
  Eye,
  Folder,
  FolderOpen,
  Loader2,
  Monitor,
  Network,
  Play,
  Plus,
  RefreshCw,
  Router,
  Search,
  ShieldCheck,
  Trash2,
  X,
  Zap,
} from "lucide-react";

type CountKey = "registered" | "notRegistered" | "notInstalled" | "otherDevice";
type DeviceStatusTab = "device" | "network";
type NetworkTreeMode = "organization" | "statistics";
type ManualDeviceStatus = "Active" | "Inactive" | "Maintenance";
type ScanMode = "all" | "subnet" | "ip";
type CommandType = "push" | "schedule";

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  page?: number;
  limit?: number;
  totalRecords?: number;
  totalPages?: number;
  [key: string]: unknown;
};

type NetworkCounts = Record<CountKey, number>;

type DeviceDetail = {
  id?: number | string;
  username?: string;
  department?: string;
  ipAddress?: string;
  email?: string;
  phoneNumber?: string;
  lastConnection?: string;
  macAddress?: string;
  computerName?: string;
  workgroup?: string;
  power?: string;
  clientAgent?: string;
  snmp?: string;
  createdTime?: string;
  recentSearchTime?: string;
  responseTime?: string;
  raw?: Record<string, unknown>;
};

type NetworkHierarchyNode = {
  id: string;
  label: string;
  type?: "folder" | "ip" | string;
  counts?: Partial<NetworkCounts>;
  deviceDetails?: Partial<Record<CountKey, DeviceDetail[]>>;
  details?: Array<{ label: string; value: string }>;
  children?: NetworkHierarchyNode[];
};

type ManualNetworkDevice = {
  id: number | string;
  deviceName: string;
  deviceBrand: string;
  deviceStatus: ManualDeviceStatus;
  deviceVersion: string;
  location: string;
  purpose: string;
  patchDate: string;
  remarks: string;
};

type WorkgroupStat = {
  name: string;
  total: number;
  registered: number;
  notRegistered: number;
  notInstalled: number;
  otherDevice: number;
};

type StatusDetailState = {
  type: CountKey;
  title: string;
  rows: DeviceDetail[];
  allRows?: DeviceDetail[];
  page: number;
  totalPages: number;
  totalRecords: number;
  source: string;
  loading: boolean;
  serverPaginated?: boolean;
} | null;

type RecordDetailState = {
  title: string;
  rows: Array<[string, string]>;
  source: string;
} | null;

type IpDetailState = {
  ip: string;
  loading: boolean;
  rows: Array<[string, string]>;
  source: string;
} | null;

type ScanDialogState = {
  mode: ScanMode;
  node?: NetworkHierarchyNode | null;
  ipAddress?: string;
} | null;

type AddFolderDialogState = {
  parentId: string;
  parentLabel: string;
} | null;

const emptyCounts: NetworkCounts = {
  registered: 0,
  notRegistered: 0,
  notInstalled: 0,
  otherDevice: 0,
};

const pageSize = 8;
const statusDetailPageSize = 10;

const API_BASE_URL = String((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL || "").replace(/\/$/, "");
const tokenKeys = ["token", "access_token", "accessToken", "authToken", "emaToken", "ema_access_token", "jwt"];

function cx(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(" ");
}

function readAuthToken() {
  for (const key of tokenKeys) {
    const value = window.localStorage.getItem(key);
    if (value) return value;
  }

  const userJson = window.localStorage.getItem("user") || window.localStorage.getItem("emaUser");
  if (!userJson) return "";

  try {
    const user = JSON.parse(userJson) as Record<string, unknown>;
    return String(user.token || user.accessToken || user.access_token || "");
  } catch {
    return "";
  }
}

async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  const token = readAuthToken();

  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  let payload: ApiResponse<T>;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    payload = { success: response.ok } as ApiResponse<T>;
  }

  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || `Request failed: ${response.status}`);
  }

  return payload;
}

function toQuery(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") search.set(key, String(value));
  });
  const value = search.toString();
  return value ? `?${value}` : "";
}

function getString(value: unknown, fallback = "-") {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function pick(row: Record<string, unknown> | undefined, keys: string[], fallback = "-") {
  if (!row) return fallback;

  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value);
  }

  const existingKeys = Object.keys(row);
  for (const wantedKey of keys) {
    const found = existingKeys.find((key) => key.toLowerCase() === wantedKey.toLowerCase());
    if (found) {
      const value = row[found];
      if (value !== undefined && value !== null && String(value).trim() !== "") return String(value);
    }
  }

  return fallback;
}

function normalizeCounts(counts?: Partial<NetworkCounts>): NetworkCounts {
  return {
    registered: Number(counts?.registered || 0),
    notRegistered: Number(counts?.notRegistered || 0),
    notInstalled: Number(counts?.notInstalled || 0),
    otherDevice: Number(counts?.otherDevice || 0),
  };
}

function countTotal(counts: Partial<NetworkCounts> | undefined) {
  const safe = normalizeCounts(counts);
  return safe.registered + safe.notRegistered + safe.notInstalled + safe.otherDevice;
}

function normalizeManualStatus(value: unknown): ManualDeviceStatus {
  const text = getString(value, "Active").toLowerCase();
  if (text.includes("inactive") || text.includes("offline")) return "Inactive";
  if (text.includes("maintenance") || text.includes("review")) return "Maintenance";
  return "Active";
}

function normalizeManualDevice(row: Record<string, unknown>, index = 0): ManualNetworkDevice {
  return {
    id: row.id !== undefined ? (row.id as number | string) : row.ID !== undefined ? (row.ID as number | string) : index + 1,
    deviceName: pick(row, ["deviceName", "DeviceName", "name", "Device Name"], "-"),
    deviceBrand: pick(row, ["deviceBrand", "brand", "DeviceBrand", "Device Brand"], "-"),
    deviceStatus: normalizeManualStatus(pick(row, ["deviceStatus", "status", "DeviceStatus", "Device Status"], "Active")),
    deviceVersion: pick(row, ["deviceVersion", "version", "DeviceVersion", "Version"], "-"),
    location: pick(row, ["location", "Location", "workgroup", "Workgroup"], "-"),
    purpose: pick(row, ["purpose", "Purpose", "type", "DeviceType"], "-"),
    patchDate: pick(row, ["patchDate", "PatchDate", "Patch Date", "updatedAt"], "-"),
    remarks: pick(row, ["remarks", "Remarks", "description", "Description"], "-"),
  };
}

function isIpAddress(value?: string) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(String(value || "").trim());
}

function isIpSegment(value?: string) {
  const text = String(value || "").trim();
  return /^\d{1,3}(\.\d{1,3}){0,3}$/.test(text);
}

function displayCountTitle(type: CountKey) {
  const labels: Record<CountKey, string> = {
    registered: "Registered Agent",
    notRegistered: "Not Registered",
    notInstalled: "Not Installed",
    otherDevice: "Other Device",
  };
  return labels[type];
}

function statusTone(status: ManualDeviceStatus) {
  if (status === "Active") return "active";
  if (status === "Maintenance") return "maintenance";
  return "inactive";
}

function findNode(node: NetworkHierarchyNode | null, id: string | null): NetworkHierarchyNode | null {
  if (!node || !id) return null;
  if (node.id === id) return node;
  for (const child of node.children || []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

function createLocalFolderNode(label: string): NetworkHierarchyNode {
  return {
    id: `local-folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label,
    type: "folder",
    counts: { ...emptyCounts },
    deviceDetails: {
      registered: [],
      notRegistered: [],
      notInstalled: [],
      otherDevice: [],
    },
    children: [],
  };
}

function insertFolderNode(root: NetworkHierarchyNode, parentId: string, folder: NetworkHierarchyNode): NetworkHierarchyNode {
  if (root.id === parentId) {
    return {
      ...root,
      children: [...(root.children || []), folder],
    };
  }

  return {
    ...root,
    children: (root.children || []).map((child) => insertFolderNode(child, parentId, folder)),
  };
}

function filterHierarchy(node: NetworkHierarchyNode, keyword: string): NetworkHierarchyNode | null {
  const text = keyword.trim().toLowerCase();
  if (!text) return node;

  const childMatches = (node.children || [])
    .map((child) => filterHierarchy(child, text))
    .filter(Boolean) as NetworkHierarchyNode[];

  const ownMatch = node.label.toLowerCase().includes(text);
  if (!ownMatch && childMatches.length === 0) return null;

  return { ...node, children: childMatches };
}

function countIpSegments(node: NetworkHierarchyNode | null, depth = 0) {
  if (!node) return 0;
  let total = depth > 0 && isIpSegment(node.label) && !isIpAddress(node.label) ? 1 : 0;
  for (const child of node.children || []) total += countIpSegments(child, depth + 1);
  return total;
}

function flattenDeviceDetails(root: NetworkHierarchyNode | null) {
  const details: DeviceDetail[] = [];
  if (!root?.deviceDetails) return details;
  (Object.keys(emptyCounts) as CountKey[]).forEach((key) => {
    details.push(...(root.deviceDetails?.[key] || []));
  });
  return details;
}

function deriveWorkgroupStats(root: NetworkHierarchyNode | null, apiRows: Record<string, unknown>[]) {
  const fromDetails = new Map<string, WorkgroupStat>();
  const ensure = (name: string) => {
    const safeName = name && name !== "-" ? name : "Unknown";
    if (!fromDetails.has(safeName)) {
      fromDetails.set(safeName, {
        name: safeName,
        total: 0,
        registered: 0,
        notRegistered: 0,
        notInstalled: 0,
        otherDevice: 0,
      });
    }
    return fromDetails.get(safeName)!;
  };

  if (root?.deviceDetails) {
    (Object.keys(emptyCounts) as CountKey[]).forEach((type) => {
      (root.deviceDetails?.[type] || []).forEach((detail) => {
        const stat = ensure(getString(detail.workgroup || detail.department, "Unknown"));
        stat.total += 1;
        stat[type] += 1;
      });
    });
  }

  apiRows.forEach((row, index) => {
    const name = pick(row, ["WorkGroup", "Workgroup", "Work Group", "Name", "Department"], `Workgroup ${index + 1}`);
    const stat = ensure(name);
    const apiTotal = Number(pick(row, ["Total", "Count", "Cnt", "DeviceCount"], "0"));
    if (apiTotal > stat.total) stat.total = apiTotal;
  });

  return Array.from(fromDetails.values()).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

function collectIpTargets(node?: NetworkHierarchyNode | null): string[] {
  if (!node) return [];
  const ips: string[] = [];

  if (isIpAddress(node.label)) ips.push(node.label);

  (Object.keys(emptyCounts) as CountKey[]).forEach((key) => {
    (node.deviceDetails?.[key] || []).forEach((detail) => {
      if (detail.ipAddress && isIpAddress(detail.ipAddress)) ips.push(detail.ipAddress);
    });
  });

  for (const child of node.children || []) ips.push(...collectIpTargets(child));
  return Array.from(new Set(ips));
}

function rowsFromObject(row: Record<string, unknown> | undefined) {
  if (!row) return [];
  return Object.entries(row).map(([key, value]) => [key, getString(value, "-")] as [string, string]);
}

function getNodeDetailFallback(node: NetworkHierarchyNode | null, label: string) {
  return node?.details?.find((item) => item.label.toLowerCase() === label.toLowerCase())?.value || "-";
}

function buildIpDetailRows(
  ip: string,
  node: NetworkHierarchyNode | null,
  agentRow?: Record<string, unknown>,
  objectRow?: Record<string, unknown>
): Array<[string, string]> {
  const merged = { ...(objectRow || {}), ...(agentRow || {}) };
  return [
    ["Department", pick(merged, ["Department", "Object_Full_Name", "ObjectFullName"], getNodeDetailFallback(node, "Department"))],
    ["Computer Name", pick(merged, ["ComputerName", "Computer Name", "DeviceName", "HostName"], getNodeDetailFallback(node, "Computer Name"))],
    ["Workgroup", pick(merged, ["Workgroup", "WorkGroup", "Work Group"], getNodeDetailFallback(node, "Workgroup"))],
    ["IP Address", ip],
    ["MAC Address", pick(merged, ["MACAddress", "MacAddress", "MAC", "MAC Address"], getNodeDetailFallback(node, "MAC Address"))],
    ["Power", pick(merged, ["Power", "PowerStatus"], getNodeDetailFallback(node, "Power"))],
    ["nPoints Client Agent", pick(merged, ["ClientAgent", "nPoints Client Agent", "Agent", "AgentStatus"], getNodeDetailFallback(node, "nPoints Client Agent"))],
    ["SNMP", pick(merged, ["SNMP", "SNMPStatus"], getNodeDetailFallback(node, "SNMP"))],
    ["Recent Search Time", pick(merged, ["RecentSearchTime", "Recent Search Time", "SearchDate", "Search Date"], getNodeDetailFallback(node, "Recent Search Time"))],
    ["Created Time", pick(merged, ["CreatedTime", "Created Time", "CreationDate"], getNodeDetailFallback(node, "Created Time"))],
    ["Response Time", pick(merged, ["ResponseTime", "Response Time"], getNodeDetailFallback(node, "Response Time"))],
  ];
}

function normalizeStatusRows(data: unknown): DeviceDetail[] {
  if (!Array.isArray(data)) return [];
  return data.map((item, index) => {
    const row = (item || {}) as Record<string, unknown>;
    return {
      id: row.id !== undefined ? (row.id as string | number) : index + 1,
      username: pick(row, ["username", "UserName", "Username", "User", "ComputerName", "DeviceName"], "-"),
      department: pick(row, ["department", "Department", "Object_Full_Name", "ObjectFullName"], "-"),
      ipAddress: pick(row, ["ipAddress", "IPAddress", "IP_Address", "IP", "ClientIP"], "-"),
      email: pick(row, ["email", "Email", "EmailAddress"], "-"),
      phoneNumber: pick(row, ["phoneNumber", "Phone", "PhoneNo", "PhoneNumber"], "-"),
      lastConnection: pick(row, ["lastConnection", "LastConnection", "ConnectionTime", "Last Connection"], "-"),
      macAddress: pick(row, ["macAddress", "MACAddress", "MacAddress", "MAC"], "-"),
      computerName: pick(row, ["computerName", "ComputerName", "Computer Name", "DeviceName", "HostName"], "-"),
      workgroup: pick(row, ["workgroup", "Workgroup", "WorkGroup", "Work Group"], "-"),
      power: pick(row, ["power", "Power", "PowerStatus"], "-"),
      clientAgent: pick(row, ["clientAgent", "ClientAgent", "nPoints Client Agent", "Agent", "AgentStatus"], "-"),
      snmp: pick(row, ["snmp", "SNMP", "SNMPStatus"], "-"),
      createdTime: pick(row, ["createdTime", "CreatedTime", "Created Time", "CreationDate"], "-"),
      recentSearchTime: pick(row, ["recentSearchTime", "RecentSearchTime", "Recent Search Time", "SearchDate", "Search Date"], "-"),
      responseTime: pick(row, ["responseTime", "ResponseTime", "Response Time"], "-"),
      raw: row.raw && typeof row.raw === "object" ? (row.raw as Record<string, unknown>) : row,
    };
  });
}

function formatScheduleTime(value: string) {
  if (!value) return "";
  const normalized = value.replace("T", " ");
  return normalized.length === 16 ? `${normalized}:00` : normalized;
}

export default function NetworkInventory() {
  useEffect(() => {
    document.documentElement.classList.add('ema-settings-page-active', 'ema-layout-lock');
    document.body.classList.add('ema-settings-page-active', 'ema-layout-lock');
    return () => {
      document.documentElement.classList.remove('ema-settings-page-active', 'ema-layout-lock');
      document.body.classList.remove('ema-settings-page-active', 'ema-layout-lock');
    };
  }, []);
  const [activeTab, setActiveTab] = useState<DeviceStatusTab>("device");
  const [treeMode, setTreeMode] = useState<NetworkTreeMode>("organization");
  const [hierarchy, setHierarchy] = useState<NetworkHierarchyNode | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [treeSearch, setTreeSearch] = useState("");
  const [expandedTreeIds, setExpandedTreeIds] = useState<Set<string>>(() => new Set());
  const [lastSearchDate, setLastSearchDate] = useState("-");
  const [workgroupApiRows, setWorkgroupApiRows] = useState<Record<string, unknown>[]>([]);
  const [selectedWorkgroup, setSelectedWorkgroup] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [manualRows, setManualRows] = useState<ManualNetworkDevice[]>([]);
  const [manualSearch, setManualSearch] = useState("");
  const [manualStatusFilter, setManualStatusFilter] = useState<"All" | ManualDeviceStatus>("All");
  const [manualPage, setManualPage] = useState(1);
  const [manualLoading, setManualLoading] = useState(false);
  const [editingDevice, setEditingDevice] = useState<ManualNetworkDevice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManualNetworkDevice | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [statusDetail, setStatusDetail] = useState<StatusDetailState>(null);
  const [recordDetail, setRecordDetail] = useState<RecordDetailState>(null);
  const [ipDetail, setIpDetail] = useState<IpDetailState>(null);
  const [scanDialog, setScanDialog] = useState<ScanDialogState>(null);
  const [addFolderDialog, setAddFolderDialog] = useState<AddFolderDialogState>(null);
  const [busy, setBusy] = useState(false);

  const selectedNode = useMemo(() => findNode(hierarchy, selectedNodeId) || hierarchy, [hierarchy, selectedNodeId]);
  const selectedCounts = useMemo(() => normalizeCounts(selectedNode?.counts), [selectedNode]);
  const rootCounts = useMemo(() => normalizeCounts(hierarchy?.counts), [hierarchy]);
  const totalNetworkRecords = countTotal(rootCounts);
  const subnetCount = useMemo(() => countIpSegments(hierarchy), [hierarchy]);
  const filteredHierarchy = useMemo(() => (hierarchy ? filterHierarchy(hierarchy, treeSearch) : null), [hierarchy, treeSearch]);
  const workgroupStats = useMemo(() => deriveWorkgroupStats(hierarchy, workgroupApiRows), [hierarchy, workgroupApiRows]);
  const selectedIps = useMemo(() => collectIpTargets(selectedNode), [selectedNode]);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 4200);
  }, []);

  const loadManualDevices = useCallback(async () => {
    setManualLoading(true);
    try {
      const response = await apiRequest<Record<string, unknown>[]>(
        `/api/network/network-device-status${toQuery({ page: 1, limit: 500, search: manualSearch })}`
      );
      setManualRows((Array.isArray(response.data) ? response.data : []).map(normalizeManualDevice));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load network device status.");
    } finally {
      setManualLoading(false);
    }
  }, [manualSearch]);

  const loadInventory = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [hierarchyResult, dateResult, workgroupResult] = await Promise.allSettled([
        apiRequest<NetworkHierarchyNode>("/api/network/hierarchy"),
        apiRequest<{ LastSearchDateStr?: string }>("/api/network/search-date"),
        apiRequest<Record<string, unknown>[]>("/api/network/workgroup-count"),
      ]);

      if (hierarchyResult.status === "fulfilled" && hierarchyResult.value.data) {
        const nextHierarchy = hierarchyResult.value.data;
        setHierarchy(nextHierarchy);
        setSelectedNodeId(nextHierarchy.id || null);
        setExpandedTreeIds(new Set<string>());
        setTreeSearch("");
      } else if (hierarchyResult.status === "rejected") {
        throw hierarchyResult.reason;
      }

      if (dateResult.status === "fulfilled") {
        setLastSearchDate(getString(dateResult.value.data?.LastSearchDateStr, "-"));
      }

      if (workgroupResult.status === "fulfilled") {
        setWorkgroupApiRows(Array.isArray(workgroupResult.value.data) ? workgroupResult.value.data : []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load network inventory.");
      setHierarchy(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadInventory(false);
    void loadManualDevices();
  }, [loadInventory, loadManualDevices]);

  useEffect(() => {
    setManualPage(1);
  }, [manualSearch, manualStatusFilter]);

  const loadIpDetail = useCallback(async (node: NetworkHierarchyNode) => {
    const ip = node.label;
    if (!isIpAddress(ip)) {
      setIpDetail(null);
      return;
    }

    setIpDetail({ ip, loading: true, rows: buildIpDetailRows(ip, node), source: "local hierarchy" });

    try {
      const [agentResponse, objectResponse] = await Promise.allSettled([
        apiRequest<Record<string, unknown>[]>(`/api/network/ip/${encodeURIComponent(ip)}/agent`),
        apiRequest<Record<string, unknown>[]>(`/api/network/ip/${encodeURIComponent(ip)}/object`),
      ]);

      const agentRow = agentResponse.status === "fulfilled" && Array.isArray(agentResponse.value.data) ? agentResponse.value.data[0] : undefined;
      const objectRow = objectResponse.status === "fulfilled" && Array.isArray(objectResponse.value.data) ? objectResponse.value.data[0] : undefined;

      setIpDetail({
        ip,
        loading: false,
        rows: buildIpDetailRows(ip, node, agentRow, objectRow),
        source: agentRow || objectRow ? "spGetSubnetAgent / spGetSubnetObject" : "local hierarchy",
      });
    } catch {
      setIpDetail({ ip, loading: false, rows: buildIpDetailRows(ip, node), source: "local hierarchy" });
    }
  }, []);

  const handleSelectNode = (node: NetworkHierarchyNode) => {
    setSelectedNodeId(node.id);
    setStatusDetail(null);
    setSelectedWorkgroup("");
    if (isIpAddress(node.label)) void loadIpDetail(node);
    else setIpDetail(null);
  };

  const handleToggleTreeNode = (node: NetworkHierarchyNode) => {
    if (!node.children?.length) return;
    setExpandedTreeIds((current) => {
      const next = new Set(current);
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      return next;
    });
    handleSelectNode(node);
  };


  const openAddFolderDialog = () => {
    if (!hierarchy) return;
    const target = selectedNode && !isIpAddress(selectedNode.label) ? selectedNode : hierarchy;
    setAddFolderDialog({ parentId: target.id, parentLabel: target.label });
  };

  const handleAddFolder = (folderName: string) => {
    const cleanName = folderName.trim();
    if (!cleanName) {
      setError("Folder name is required.");
      return;
    }
    if (!hierarchy || !addFolderDialog) return;

    const folder = createLocalFolderNode(cleanName);
    setHierarchy((current) => current ? insertFolderNode(current, addFolderDialog.parentId, folder) : current);
    setExpandedTreeIds((current) => {
      const next = new Set(current);
      next.add(addFolderDialog.parentId);
      return next;
    });
    setSelectedNodeId(folder.id);
    setAddFolderDialog(null);
    showNotice(`Folder "${cleanName}" added under ${addFolderDialog.parentLabel}.`);
  };

  const handleSelectWorkgroup = (name: string) => {
    setSelectedWorkgroup(name);
    setTreeMode("statistics");
    setStatusDetail(null);
    setIpDetail(null);
  };

  const openStatusDetails = async (type: CountKey, nextPage = 1) => {
    const title = `${displayCountTitle(type)}${selectedNode?.label ? ` • ${selectedNode.label}` : ""}`;
    setStatusDetail({ type, title, rows: [], page: nextPage, totalPages: 1, totalRecords: 0, source: "loading", loading: true });
    setIpDetail(null);

    const canCallSubnetApi = selectedNode?.label && isIpSegment(selectedNode.label) && selectedNode.label.toLowerCase() !== "organization";

    try {
      if (canCallSubnetApi) {
        const response = await apiRequest<DeviceDetail[]>(
          `/api/network/subnet/${encodeURIComponent(selectedNode.label)}/details${toQuery({ type, page: nextPage, limit: statusDetailPageSize })}`
        );
        setStatusDetail({
          type,
          title,
          rows: normalizeStatusRows(response.data),
          page: Number(response.page || nextPage),
          totalPages: Number(response.totalPages || 1),
          totalRecords: Number(response.totalRecords || 0),
          source: "subnet detail API",
          loading: false,
          serverPaginated: true,
        });
        return;
      }

      const localRows = normalizeStatusRows(selectedNode?.deviceDetails?.[type] || []);
      setStatusDetail({
        type,
        title,
        rows: localRows,
        allRows: localRows,
        page: nextPage,
        totalPages: Math.max(1, Math.ceil(localRows.length / statusDetailPageSize)),
        totalRecords: localRows.length,
        source: "hierarchy detail cache",
        loading: false,
        serverPaginated: false,
      });
    } catch (err) {
      setStatusDetail({ type, title, rows: [], page: nextPage, totalPages: 1, totalRecords: 0, source: "error", loading: false });
      setError(err instanceof Error ? err.message : "Failed to load subnet detail.");
    }
  };

  const openBackendRecord = async (detail: DeviceDetail) => {
    const raw = detail.raw || {};
    const clientId = Number(pick(raw, ["Object_Root_Idn", "ObjectRootIdn", "ClientID", "clientID"], "0"));
    const inventoryId = Number(pick(raw, ["InventoryID", "Inventory_Idn", "Object_Inventory_Idn", "id", "ID"], "0"));

    setBusy(true);
    try {
      if (clientId > 0) {
        const response = await apiRequest<Record<string, unknown>[]>(`/api/network/client/${clientId}`);
        const row = Array.isArray(response.data) ? response.data[0] : undefined;
        setRecordDetail({ title: `Registered Network Client • ${clientId}`, rows: rowsFromObject(row), source: "spGetNIClient" });
      } else if (inventoryId > 0) {
        const response = await apiRequest<Record<string, unknown>[]>(`/api/network/object/${inventoryId}`);
        const row = Array.isArray(response.data) ? response.data[0] : undefined;
        setRecordDetail({ title: `Network Object • ${inventoryId}`, rows: rowsFromObject(row), source: "spGetNIObject" });
      } else {
        setRecordDetail({ title: detail.computerName || detail.ipAddress || "Network Record", rows: rowsFromObject(raw), source: "current row" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open backend detail.");
    } finally {
      setBusy(false);
    }
  };

  const manualFilteredRows = useMemo(() => {
    const keyword = manualSearch.trim().toLowerCase();
    return manualRows.filter((row) => {
      const matchesStatus = manualStatusFilter === "All" || row.deviceStatus === manualStatusFilter;
      const searchable = Object.values(row).join(" ").toLowerCase();
      const matchesKeyword = !keyword || searchable.includes(keyword);
      return matchesStatus && matchesKeyword;
    });
  }, [manualRows, manualSearch, manualStatusFilter]);

  const manualTotalPages = Math.max(1, Math.ceil(manualFilteredRows.length / pageSize));
  const manualPageRows = manualFilteredRows.slice((manualPage - 1) * pageSize, manualPage * pageSize);

  const resetAll = () => {
    setTreeMode("organization");
    setManualSearch("");
    setManualStatusFilter("All");
    setTreeSearch("");
    setExpandedTreeIds(new Set<string>());
    setStatusDetail(null);
    setIpDetail(null);
    setSelectedWorkgroup("");
    if (hierarchy) setSelectedNodeId(hierarchy.id);
  };

  const handleSaveDevice = async (payload: Omit<ManualNetworkDevice, "id">) => {
    setBusy(true);
    try {
      if (editingDevice) {
        await apiRequest(`/api/network/network-device-status/${editingDevice.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        showNotice("Network device updated.");
      } else {
        await apiRequest("/api/network/network-device-status", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        showNotice("Network device added.");
      }

      setIsFormOpen(false);
      setEditingDevice(null);
      await loadManualDevices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save network device.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteDevice = async (device: ManualNetworkDevice) => {
    setBusy(true);
    try {
      await apiRequest(`/api/network/network-device-status/${device.id}`, { method: "DELETE" });
      showNotice("Network device removed.");
      setDeleteTarget(null);
      await loadManualDevices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove network device.");
    } finally {
      setBusy(false);
    }
  };

  const openAddDevice = () => {
    setEditingDevice(null);
    setIsFormOpen(true);
    setActiveTab("network");
  };

  const openEditDevice = (device: ManualNetworkDevice) => {
    setEditingDevice(device);
    setIsFormOpen(true);
    setActiveTab("network");
  };

  const openScanDialog = (mode: ScanMode, node: NetworkHierarchyNode | null = selectedNode) => {
    const ipAddress = mode === "ip" && node?.label && isIpAddress(node.label) ? node.label : undefined;
    setScanDialog({ mode, node, ipAddress });
  };

  const submitScan = async (commandType: CommandType, scheduleTime: string, description: string) => {
    if (!scanDialog) return;

    const mode = scanDialog.mode;
    const node = scanDialog.node;
    const ips = mode === "all" ? [] : collectIpTargets(node);
    const ipAddress = mode === "ip" ? scanDialog.ipAddress || node?.label || ips[0] || "" : "";
    const subnet = mode === "subnet" ? node?.label || "" : "";

    const body = {
      scanMode: mode,
      subnet,
      ipAddress,
      ips: mode === "ip" && ipAddress ? [ipAddress] : ips,
      commandType,
      scheduleTime: commandType === "schedule" ? formatScheduleTime(scheduleTime) : "",
      description: description || `[Network Inventory] Scan - ${mode === "all" ? "All Network IPs" : mode === "subnet" ? subnet || "Selected subnet" : ipAddress}`,
    };

    setBusy(true);
    try {
      const response = await apiRequest<{ Job_Idn?: number; targetCount?: number }>("/api/network/scan", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setScanDialog(null);
      showNotice(`Scan job created${response.data?.Job_Idn ? `: #${response.data.Job_Idn}` : ""}. Target count: ${response.data?.targetCount ?? body.ips.length}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create scan job.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="settings-module-root ema-settings-pro ema-module-root" data-section="network-metering">
      {notice && (
        <div className="settings-toast settings-toast-success" role="status" aria-live="polite">
          <i><CheckCircle2 size={18} /></i>
          <div>
            <strong>Success</strong>
            <span>{notice}</span>
          </div>
          <button type="button" onClick={() => setNotice(null)} aria-label="Close notification">
            <X size={14} />
          </button>
        </div>
      )}

      {error && (
        <div className="settings-toast settings-toast-error" role="alert">
          <i><AlertCircle size={18} /></i>
          <div>
            <strong>Error</strong>
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} aria-label="Close error">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="settings-layout">
        <aside className="settings-menu ema-panel-surface">
          <div className="panel-head" title={`${subnetCount} subnet path(s) • ${totalNetworkRecords} IPs`}>
            <span>NETWORK METERING</span>
            <strong>Network Metering</strong>
            <small>IP/subnet hierarchy and synchronized device records.</small>
          </div>

          <nav className="settings-menu-list" aria-label="Network metering navigation">
            <button type="button" className={treeMode === "organization" ? "setting-btn active" : "setting-btn"} onClick={() => { setTreeMode("organization"); setTreeSearch(""); setExpandedTreeIds(new Set<string>()); }}>
              <Network size={15} />
              Organization
            </button>
            <button type="button" className={treeMode === "statistics" ? "setting-btn active" : "setting-btn"} onClick={() => setTreeMode("statistics")}>
              <ShieldCheck size={15} />
              Statistics
            </button>
          </nav>

          <div className="ema-sidebar-content"><div className="ema-sidebar-subpanel">
          <label className="section-search ema-sidebar-field">
            <Search size={16} />
            <input
              placeholder={treeMode === "organization" ? "Search IP / subnet..." : "Search workgroup..."}
              value={treeSearch}
              onChange={(event) => setTreeSearch(event.target.value)}
            />
            {treeSearch && (
              <button type="button" onClick={() => setTreeSearch("")}> 
                <X size={13} />
              </button>
            )}
          </label>

          <div className="ema-sidebar-action">
            <button type="button" className="soft-btn" onClick={openAddFolderDialog} disabled={!hierarchy || treeMode !== "organization" || busy}>
              <Plus size={14} />
              Add Folder
            </button>
          </div>

          <div className="ema-sidebar-tree">
            {loading ? (
              <EmptyState icon="loading" title="Loading network hierarchy" subtitle="Reading /api/network/hierarchy." />
            ) : treeMode === "organization" ? (
              filteredHierarchy ? (
                <NetworkTree
                  key={treeSearch.trim() ? `search-${treeSearch.trim()}` : hierarchy?.id || "network-tree"}
                  node={filteredHierarchy}
                  selectedNodeId={selectedNode?.id || null}
                  expandedIds={expandedTreeIds}
                  onToggle={handleToggleTreeNode}
                  onSelect={handleSelectNode}
                  forceOpen={Boolean(treeSearch.trim())}
                />
              ) : (
                <EmptyState title="No IP segment found" subtitle="Try another search keyword." />
              )
            ) : (
              <WorkgroupStatisticList
                rows={workgroupStats.filter((row) => row.name.toLowerCase().includes(treeSearch.toLowerCase()))}
                selected={selectedWorkgroup}
                onSelect={handleSelectWorkgroup}
              />
            )}
          </div>
          </div></div>
        </aside>

        <section className="settings-content">
          <section className="settings-hero ema-panel-surface">
            <div>
              <span className="eyebrow">NETWORK OPERATIONS</span>
              <h2>{activeTab === "device" ? "Network Metering" : "Network Device Registry"}</h2>
              <p>Monitor network IP/subnet status and maintain synchronized device records.</p>
            </div>
            <div className="settings-score users-hero-score">
              <div className="score-box"><span>Total IPs</span><strong>{totalNetworkRecords}</strong><small>network records</small></div>
              <div className="score-box"><span>Subnets</span><strong>{subnetCount}</strong><small>network paths</small></div>
              <div className="score-box"><span>Workgroups</span><strong>{workgroupStats.length}</strong><small>grouped segments</small></div>
              <div className="score-box"><span>Selected Targets</span><strong>{selectedIps.length}</strong><small>active scope</small></div>
            </div>
          </section>

          <section className="content-shell ema-panel-surface content-panel clean">
            <div className="content-toolbar">
              <button type="button" className={activeTab === "device" ? "soft-btn active" : "soft-btn"} onClick={() => setActiveTab("device")}>
                Device Status
              </button>
              <button type="button" className={activeTab === "network" ? "soft-btn active" : "soft-btn"} onClick={() => setActiveTab("network")}>
                Network Device Status
              </button>
            </div>

            {activeTab === "device" ? (
              <div className="ni-work-body">
                <div className="content-head">
                  <div>
                    <h2>Device Status{selectedNode?.label ? ` : ${selectedNode.label}` : ""}</h2>
                    <p>Registered, not registered, not installed, and other network object counts.</p>
                  </div>
                  <div className="content-actions">
                    <strong>Reference Date - {lastSearchDate}</strong>
                    <button type="button" className="soft-btn" onClick={() => void loadInventory(true)} disabled={refreshing || busy}>
                      {refreshing ? <Loader2 size={15} className="ni-spin" /> : <RefreshCw size={15} />}
                      Refresh
                    </button>
                    <button
                      type="button"
                      className="primary-btn"
                      onClick={() => openScanDialog(selectedNode?.id === hierarchy?.id ? "all" : isIpAddress(selectedNode?.label) ? "ip" : "subnet", selectedNode)}
                      disabled={!selectedNode || busy}
                    >
                      <Zap size={15} />
                      Scan Scope
                    </button>
                  </div>
                </div>

                {ipDetail ? (
                  <NetworkPathDetail detail={ipDetail} onScan={() => openScanDialog("ip", selectedNode)} />
                ) : (
                  <>
                    <DeviceStatusOverview
                      counts={selectedCounts}
                      total={countTotal(selectedCounts)}
                      selectedLabel={selectedNode?.label || "Organization"}
                      targetCount={selectedIps.length}
                      onOpenStatus={(type) => void openStatusDetails(type)}
                    />
                  </>
                )}
              </div>
            ) : (
              <div className="ni-work-body registry-mode">
                <div className="content-head">
                  <div>
                    <h2>Network Device Registry</h2>
                    <p>
                      Showing {manualFilteredRows.length === 0 ? 0 : (manualPage - 1) * pageSize + 1}-
                      {Math.min(manualPage * pageSize, manualFilteredRows.length)} of {manualFilteredRows.length} devices
                    </p>
                  </div>

                  <div className="content-actions">
                    <label className="section-search">
                      <Search size={16} />
                      <input
                        placeholder="Search device, brand, location..."
                        value={manualSearch}
                        onChange={(event) => setManualSearch(event.target.value)}
                      />
                      {manualSearch && (
                        <button type="button" onClick={() => setManualSearch("")}> 
                          <X size={13} />
                        </button>
                      )}
                    </label>

                    <select className="setting-select" value={manualStatusFilter} onChange={(event) => setManualStatusFilter(event.target.value as "All" | ManualDeviceStatus)}>
                      <option value="All">All status</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Maintenance">Maintenance</option>
                    </select>

                    <button type="button" className="soft-btn" onClick={() => void loadManualDevices()} disabled={manualLoading || busy}>
                      {manualLoading ? <Loader2 size={15} className="ni-spin" /> : <RefreshCw size={15} />}
                      Refresh
                    </button>

                    <button type="button" className="primary-btn" onClick={openAddDevice} disabled={busy}>
                      <Plus size={16} />
                      Add New
                    </button>
                  </div>
                </div>

                <DeviceRegistryTable
                  rows={manualPageRows}
                  page={manualPage}
                  selectedId={editingDevice?.id || null}
                  loading={manualLoading}
                  onEdit={openEditDevice}
                  onDelete={(device) => setDeleteTarget(device)}
                />

                <Pagination page={manualPage} totalPages={manualTotalPages} totalRows={manualFilteredRows.length} pageSize={pageSize} itemLabel="devices" onChange={setManualPage} />
              </div>
            )}
          </section>
        </section>
      </div>

      {(isFormOpen || editingDevice) && (
        <DeviceFormModal
          mode={editingDevice ? "edit" : "add"}
          device={editingDevice}
          busy={busy}
          onClose={() => {
            setIsFormOpen(false);
            setEditingDevice(null);
          }}
          onSave={(payload) => void handleSaveDevice(payload)}
        />
      )}

      {deleteTarget && (
        <DeleteDeviceConfirmModal
          device={deleteTarget}
          busy={busy}
          onCancel={() => {
            if (!busy) setDeleteTarget(null);
          }}
          onConfirm={() => void handleDeleteDevice(deleteTarget)}
        />
      )}

      {addFolderDialog && (
        <AddFolderModal
          parentLabel={addFolderDialog.parentLabel}
          busy={busy}
          onClose={() => setAddFolderDialog(null)}
          onSave={handleAddFolder}
        />
      )}

      {statusDetail && (
        <StatusDetailModal
          detail={statusDetail}
          onClose={() => setStatusDetail(null)}
          onPage={(nextPage) => void openStatusDetails(statusDetail.type, nextPage)}
          onOpenRecord={(row) => void openBackendRecord(row)}
        />
      )}
      {recordDetail && <RecordDetailModal detail={recordDetail} onClose={() => setRecordDetail(null)} />}
      {scanDialog && <ScanJobModal dialog={scanDialog} busy={busy} targetCount={scanDialog.mode === "all" ? totalNetworkRecords : collectIpTargets(scanDialog.node).length} onClose={() => setScanDialog(null)} onSubmit={(commandType, scheduleTime, description) => void submitScan(commandType, scheduleTime, description)} />}
      {busy && <div className="settings-toast settings-toast-info"><Loader2 size={14} className="ni-spin" /> Processing...</div>}
    </main>
  );
}

function DeleteDeviceConfirmModal({
  device,
  busy,
  onCancel,
  onConfirm,
}: {
  device: ManualNetworkDevice;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="settings-confirm-backdrop open" onMouseDown={busy ? undefined : onCancel}>
      <section className="settings-confirm-modal is-danger" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="delete-device-title">
        <button type="button" className="modal-close" onClick={onCancel} disabled={busy} aria-label="Close delete confirmation">
          <X size={16} />
        </button>

        <div className="pricing-confirm-icon">
          <Trash2 size={22} />
        </div>
        <span className="eyebrow">Please confirm</span>
        <h2 id="delete-device-title">Remove network device?</h2>
        <p>This action will remove the selected device from Network Device Registry.</p>

        <div className="settings-helper-card">
          <strong>{device.deviceName}</strong>
          <span>{device.deviceBrand || "-"} • {device.location || "-"} • {device.deviceStatus || "-"}</span>
        </div>

        <div className="settings-confirm-actions">
          <button type="button" className="soft-btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="danger-btn" onClick={onConfirm} disabled={busy}>
            {busy ? <Loader2 size={15} className="ni-spin" /> : <Trash2 size={15} />}
            Remove
          </button>
        </div>
      </section>
    </div>
  );
}

function NetworkTree({
  node,
  level = 0,
  selectedNodeId,
  expandedIds,
  onToggle,
  onSelect,
  forceOpen = false,
}: {
  node: NetworkHierarchyNode;
  level?: number;
  selectedNodeId: string | null;
  expandedIds: Set<string>;
  onToggle: (node: NetworkHierarchyNode) => void;
  onSelect: (node: NetworkHierarchyNode) => void;
  forceOpen?: boolean;
}) {
  const hasChildren = Boolean(node.children?.length);
  const isOpen = forceOpen || expandedIds.has(node.id);
  const total = countTotal(node.counts);
  const isLeafIp = isIpAddress(node.label);

  const selectOnly = () => {
    onSelect(node);
  };

  const toggleOnly = (event: MouseEvent) => {
    event.stopPropagation();
    if (hasChildren) onToggle(node);
    else onSelect(node);
  };

  return (
    <div className="ema-sidebar-tree-branch">
      <button
        type="button"
        className={cx("ni-tree-row", level === 0 && "root", isLeafIp && "device-leaf", selectedNodeId === node.id && "selected")}
        style={{ paddingLeft: `${14 + level * 18}px` }}
        onClick={selectOnly}
        title={node.label}
      >
        <span className={cx("ni-tree-toggle", !hasChildren && "leaf")} onClick={toggleOnly}>
          {hasChildren ? isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} /> : <ChevronRight size={13} />}
        </span>
        <span className="ema-sidebar-tree-icon" onClick={toggleOnly}>
          {isLeafIp ? <Monitor size={15} className="ni-tree-icon device" /> : isOpen ? <FolderOpen size={15} className="ni-tree-icon" /> : <Folder size={15} className="ni-tree-icon" />}
        </span>
        <strong>{node.label}</strong>
        <span className="ema-sidebar-tree-count">{total}</span>
      </button>

      {hasChildren && isOpen && (
        <div className="ema-sidebar-tree-children">
          {(node.children || []).map((child) => (
            <NetworkTree
              key={child.id}
              node={child}
              level={level + 1}
              selectedNodeId={selectedNodeId}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
              forceOpen={forceOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkgroupStatisticList({ rows, selected, onSelect }: { rows: WorkgroupStat[]; selected: string; onSelect: (name: string) => void }) {
  if (!rows.length) return <EmptyState title="No statistics found" subtitle="Workgroup count API returned no rows yet." />;

  return (
    <div className="policy-list">
      {rows.map((row) => (
        <button key={row.name} type="button" className={cx("ni-stat-card", selected === row.name && "selected")} onClick={() => onSelect(row.name)}>
          <div>
            <strong>{row.name}</strong>
            <span>{row.registered} registered • {row.notRegistered} not registered</span>
          </div>
          <em>{row.total}</em>
        </button>
      ))}
    </div>
  );
}

function DeviceStatusOverview({
  counts,
  total,
  selectedLabel,
  targetCount,
  onOpenStatus,
}: {
  counts: NetworkCounts;
  total: number;
  selectedLabel: string;
  targetCount: number;
  onOpenStatus: (type: CountKey) => void;
}) {
  const rows: Array<{ type: CountKey; label: string; description: string; count: number; tone: string; actionLabel: string; icon: typeof CheckCircle2 }> = [
    { type: "registered", label: "Registered Agent", description: "nPoints client agent exists and is registered for this IP scope.", count: counts.registered, tone: "success", actionLabel: "View registered devices", icon: CheckCircle2 },
    { type: "notRegistered", label: "Not Registered", description: "Client agent exists but registration status is not completed.", count: counts.notRegistered, tone: "danger", actionLabel: "View not registered devices", icon: AlertCircle },
    { type: "notInstalled", label: "Not Installed", description: "Detected network object without nPoints agent installed.", count: counts.notInstalled, tone: "warning", actionLabel: "View not installed devices", icon: Activity },
    { type: "otherDevice", label: "Other Device", description: "Router, switch, printer, SNMP or other discovered network device.", count: counts.otherDevice, tone: "info", actionLabel: "View other devices", icon: Router },
  ];

  return (
    <div className="content-body">
      <div className="settings-score users-hero-score">
        <div>
          <span>Selected Scope</span>
          <strong>{total}</strong>
          <small>{selectedLabel} • {targetCount} scan target(s)</small>
        </div>
      </div>

      <div className="pricing-table-card table-responsive">
        <table className="ni-table ni-status-table table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>Status</th>
              <th>Description</th>
              <th>Count</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const Icon = row.icon;
              return (
                <tr key={row.type}>
                  <td>
                    <div className={cx("ni-status-name", row.tone)}>
                      <span>
                        <Icon size={16} />
                      </span>
                      <strong>{row.label}</strong>
                    </div>
                  </td>
                  <td>{row.description}</td>
                  <td>
                    <strong className={cx("ni-count-badge", row.tone)}>{row.count}</strong>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="ni-inline-action ni-icon-action soft-btn"
                      onClick={() => onOpenStatus(row.type)}
                      aria-label={row.actionLabel}
                      title={row.actionLabel}
                    >
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusDetailModal({
  detail,
  onClose,
  onPage,
  onOpenRecord,
}: {
  detail: NonNullable<StatusDetailState>;
  onClose: () => void;
  onPage: (page: number) => void;
  onOpenRecord: (row: DeviceDetail) => void;
}) {
  return (
    <div className="user-modal-backdrop open" onMouseDown={onClose}>
      <section className="user-modal advanced" onMouseDown={(event) => event.stopPropagation()}>
        <div className="user-modal-head">
          <div>
            <span>{detail.source}</span>
            <h2>{detail.title}</h2>
            <p>{detail.totalRecords} record(s) • paginated detail list.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close status detail">
            <X size={18} />
          </button>
        </div>
        <div className="user-modal-body">
          <StatusDetailTable detail={detail} onPage={onPage} onOpenRecord={onOpenRecord} />
        </div>
      </section>
    </div>
  );
}

function StatusDetailTable({
  detail,
  onPage,
  onOpenRecord,
}: {
  detail: StatusDetailState;
  onPage: (page: number) => void;
  onOpenRecord: (row: DeviceDetail) => void;
}) {
  const [searchText, setSearchText] = useState("");
  const [agentFilter, setAgentFilter] = useState("All");
  const [workgroupFilter, setWorkgroupFilter] = useState("All");
  const [clientPage, setClientPage] = useState(1);

  const baseRows = useMemo(() => detail?.allRows || detail?.rows || [], [detail?.allRows, detail?.rows]);
  const agentOptions = useMemo(() => buildDetailOptions(baseRows, (row) => row.clientAgent), [baseRows]);
  const workgroupOptions = useMemo(() => buildDetailOptions(baseRows, (row) => row.workgroup), [baseRows]);

  const isFiltering = Boolean(searchText.trim()) || agentFilter !== "All" || workgroupFilter !== "All";
  const filteredRows = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return baseRows.filter((row) => {
      const searchable = [
        row.computerName,
        row.username,
        row.ipAddress,
        row.department,
        row.workgroup,
        row.clientAgent,
        row.recentSearchTime,
        row.lastConnection,
      ].join(" ").toLowerCase();
      const matchesKeyword = !keyword || searchable.includes(keyword);
      const matchesAgent = agentFilter === "All" || normalizeDetailFilterValue(row.clientAgent) === agentFilter;
      const matchesWorkgroup = workgroupFilter === "All" || normalizeDetailFilterValue(row.workgroup) === workgroupFilter;
      return matchesKeyword && matchesAgent && matchesWorkgroup;
    });
  }, [agentFilter, baseRows, searchText, workgroupFilter]);

  useEffect(() => {
    setClientPage(1);
  }, [agentFilter, detail?.title, detail?.type, searchText, workgroupFilter]);

  useEffect(() => {
    if (!detail?.serverPaginated) setClientPage(detail?.page || 1);
  }, [detail?.page, detail?.serverPaginated, detail?.title, detail?.type]);

  if (!detail) return null;

  const usesServerPaging = Boolean(detail.serverPaginated && !isFiltering);
  const visibleTotalRows = usesServerPaging ? detail.totalRecords : filteredRows.length;
  const visibleTotalPages = usesServerPaging
    ? detail.totalPages
    : Math.max(1, Math.ceil(filteredRows.length / statusDetailPageSize));
  const activePage = usesServerPaging
    ? detail.page
    : Math.min(Math.max(1, clientPage), visibleTotalPages);
  const visibleRows = usesServerPaging
    ? filteredRows
    : filteredRows.slice((activePage - 1) * statusDetailPageSize, activePage * statusDetailPageSize);

  const handlePageChange = (nextPage: number) => {
    const boundedPage = Math.min(Math.max(1, nextPage), visibleTotalPages);
    if (usesServerPaging) {
      onPage(boundedPage);
      return;
    }
    setClientPage(boundedPage);
  };

  const clearFilters = () => {
    setSearchText("");
    setAgentFilter("All");
    setWorkgroupFilter("All");
    setClientPage(1);
  };

  return (
    <div className="content-body">
      <div className="content-head">
        <div>
          <h3>{detail.title}</h3>
          <span>{detail.totalRecords} record(s) • source: {detail.source}</span>
        </div>
        {detail.loading && <Loader2 size={17} className="ni-spin" />}
      </div>

      <div className="content-toolbar">
        <label className="ni-search-box ni-detail-search section-search">
          <Search size={16} />
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search computer, user, IP, department..."
          />
          {searchText && (
            <button type="button" onClick={() => setSearchText("")} aria-label="Clear detail search">
              <X size={14} />
            </button>
          )}
        </label>

        <select className="ni-detail-select setting-select" value={agentFilter} onChange={(event) => setAgentFilter(event.target.value)}>
          <option value="All">All agents</option>
          {agentOptions.map((option) => (
            <option value={option} key={option}>Agent {option}</option>
          ))}
        </select>

        <select className="ni-detail-select setting-select" value={workgroupFilter} onChange={(event) => setWorkgroupFilter(event.target.value)}>
          <option value="All">All workgroups</option>
          {workgroupOptions.map((option) => (
            <option value={option} key={option}>{option}</option>
          ))}
        </select>

        {isFiltering && (
          <button type="button" className="ni-detail-clear soft-btn" onClick={clearFilters}>
            Clear
          </button>
        )}

        <span className="ni-detail-result-pill">
          {visibleTotalRows} shown
        </span>
      </div>

      <div className="pricing-table-card table-responsive">
        <table className="ni-table ni-detail-list-table table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>#</th>
              <th>Computer / User</th>
              <th>IP Address</th>
              <th>Department</th>
              <th>Workgroup</th>
              <th>Agent</th>
              <th>Last Seen</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => (
              <tr key={`${row.ipAddress || row.computerName || "row"}-${activePage}-${index}`}>
                <td>{String((activePage - 1) * statusDetailPageSize + index + 1).padStart(2, "0")}</td>
                <td>
                  <div className="ni-device-name">
                    <span className={cx("ni-dot", detail.type === "registered" ? "" : detail.type === "notInstalled" ? "maintenance" : "inactive")} />
                    <div>
                      <strong>{row.computerName || row.username || "-"}</strong>
                      <small>{row.username || row.email || "-"}</small>
                    </div>
                  </div>
                </td>
                <td>{row.ipAddress || "-"}</td>
                <td>{row.department || "-"}</td>
                <td>{row.workgroup || "-"}</td>
                <td>{row.clientAgent || "-"}</td>
                <td>{row.recentSearchTime || row.lastConnection || "-"}</td>
                <td>
                  <button type="button" className="ni-inline-action soft-btn" onClick={() => onOpenRecord(row)}>
                    <Eye size={13} />
                    Detail
                  </button>
                </td>
              </tr>
            ))}

            {!detail.loading && !visibleRows.length && (
              <tr>
                <td colSpan={8}>
                  <EmptyState title="No detail record" subtitle="No record matches the current search/filter." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={activePage} totalPages={visibleTotalPages} totalRows={visibleTotalRows} pageSize={statusDetailPageSize} itemLabel="records" onChange={handlePageChange} />
    </div>
  );
}

function normalizeDetailFilterValue(value?: string) {
  const normalized = String(value || "-").trim();
  return normalized && normalized !== "-" ? normalized.toUpperCase() : "-";
}

function buildDetailOptions(rows: DeviceDetail[], pickValue: (row: DeviceDetail) => string | undefined) {
  return Array.from(new Set(rows.map((row) => normalizeDetailFilterValue(pickValue(row))).filter((item) => item !== "-"))).sort();
}

function NetworkPathDetail({ detail, onScan }: { detail: IpDetailState; onScan: () => void }) {
  if (!detail) return null;

  return (
    <div className="content-body">
      <div className="content-head">
        <div>
          <h2>DEVICE STATUS : {detail.ip}</h2>
          <span>{detail.loading ? "Loading fresh IP detail..." : `Source: ${detail.source}`}</span>
        </div>
        <button type="button" className="primary-btn" onClick={onScan}>
          <Play size={15} />
          Scan IP
        </button>
      </div>

      <div className="pricing-table-card table-responsive">
        <table className="ni-path-detail-table table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>nPoints Agent</th>
              <th>Content</th>
            </tr>
          </thead>
          <tbody>
            {detail.rows.map(([label, value]) => (
              <tr key={label}>
                <td>{label}</td>
                <td>{value || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DeviceRegistryTable({
  rows,
  page,
  selectedId,
  loading,
  onEdit,
  onDelete,
}: {
  rows: ManualNetworkDevice[];
  page: number;
  selectedId: number | string | null;
  loading: boolean;
  onEdit: (device: ManualNetworkDevice) => void;
  onDelete: (device: ManualNetworkDevice) => void;
}) {
  return (
    <div className="pricing-table-card table-responsive">
      <table className="ni-table ni-registry-table table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>#</th>
            <th>Device Name</th>
            <th>Device Brand</th>
            <th>Status</th>
            <th>Version</th>
            <th>Location</th>
            <th>Purpose</th>
            <th>Patch Date</th>
            <th>Remarks</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((device, index) => (
            <tr key={device.id} className={selectedId === device.id ? "selected" : ""}>
              <td>{String((page - 1) * pageSize + index + 1).padStart(2, "0")}</td>
              <td>
                <div className="ni-device-name">
                  <span className={cx("ni-dot", statusTone(device.deviceStatus))} />
                  <div>
                    <strong>{device.deviceName}</strong>
                    <small>{device.location}</small>
                  </div>
                </div>
              </td>
              <td>{device.deviceBrand}</td>
              <td>
                <span className={cx("ni-status-pill mini", statusTone(device.deviceStatus))}>{device.deviceStatus}</span>
              </td>
              <td>{device.deviceVersion}</td>
              <td>{device.location}</td>
              <td>{device.purpose}</td>
              <td>{device.patchDate}</td>
              <td>{device.remarks || "-"}</td>
              <td>
                <div className="ni-row-actions">
                  <button type="button" className="ni-icon-action soft-btn" title="Edit device" aria-label={`Edit ${device.deviceName}`} onClick={() => onEdit(device)}>
                    <Edit3 size={15} aria-hidden="true" />
                  </button>
                  <button type="button" className="ni-icon-action danger danger-btn" title="Remove device" aria-label={`Remove ${device.deviceName}`} onClick={() => onDelete(device)}>
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              </td>
            </tr>
          ))}

          {!loading && !rows.length && (
            <tr>
              <td colSpan={10}>
                <EmptyState title="No network device found" subtitle="Try another keyword, status, or add a new network device." />
              </td>
            </tr>
          )}

          {loading && (
            <tr>
              <td colSpan={10}>
                <EmptyState icon="loading" title="Loading network devices" subtitle="Reading /api/network/network-device-status." />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  totalRows,
  pageSize,
  itemLabel = "records",
  onChange,
}: {
  page: number;
  totalPages: number;
  totalRows: number;
  pageSize?: number;
  itemLabel?: string;
  onChange: (page: number) => void;
}) {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safePage = Math.min(Math.max(1, page || 1), safeTotalPages);
  const from = totalRows === 0 || !pageSize ? 0 : (safePage - 1) * pageSize + 1;
  const to = totalRows === 0 || !pageSize ? 0 : Math.min(safePage * pageSize, totalRows);
  const pageText = pageSize ? `${from}-${to} of ${totalRows} ${itemLabel}` : `Page ${safePage} of ${safeTotalPages} · ${totalRows} ${itemLabel}`;

  return (
    <div className="uam-pagination global-style">
      <div className="ni-pagination-meta ema-pagination-meta uam-page-summary-final">
        <span>{pageText}</span>
      </div>
      <div className="uam-pagination-controls global-style" aria-label="Network inventory pagination">
        <button type="button" disabled={safePage <= 1} onClick={() => onChange(1)} aria-label="First page">
          <ChevronsLeft size={15} />
        </button>
        <button type="button" disabled={safePage <= 1} onClick={() => onChange(Math.max(1, safePage - 1))} aria-label="Previous page">
          <ChevronLeft size={15} />
        </button>
        <b>{safePage}</b>
        <button type="button" disabled={safePage >= safeTotalPages} onClick={() => onChange(Math.min(safeTotalPages, safePage + 1))} aria-label="Next page">
          <ChevronRight size={15} />
        </button>
        <button type="button" disabled={safePage >= safeTotalPages} onClick={() => onChange(safeTotalPages)} aria-label="Last page">
          <ChevronsRight size={15} />
        </button>
      </div>
    </div>
  );
}

function AddFolderModal({
  parentLabel,
  busy,
  onClose,
  onSave,
}: {
  parentLabel: string;
  busy: boolean;
  onClose: () => void;
  onSave: (folderName: string) => void;
}) {
  const [folderName, setFolderName] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave(folderName);
  };

  return (
    <div className="user-modal-backdrop open" onMouseDown={onClose}>
      <form className="ni-modal ni-folder-modal user-modal advanced ema-kb-form" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="user-modal-head">
          <div>
            <span>Organization Tree</span>
            <h2>Add Folder</h2>
            <p>Add a folder under {parentLabel}. This keeps the hierarchy action separate from network scan jobs.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close add folder">
            <X size={18} />
          </button>
        </div>

        <div className="user-modal-body">
          <label className="ni-field ni-field-wide ema-form-field-wide">
            <span>Folder Name</span>
            <input required value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="Example: Data Centre / Server Room / Branch A" autoFocus />
          </label>
          <div className="ni-inline-note">
            <strong>Parent:</strong>
            <span>{parentLabel}</span>
          </div>
        </div>

        <div className="user-modal-foot">
          <button type="button" className="soft-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="primary-btn" disabled={busy}>
            {busy ? <Loader2 size={16} className="ni-spin" /> : <Plus size={16} />}
            Add Folder
          </button>
        </div>
      </form>
    </div>
  );
}

function DeviceFormModal({
  mode,
  device,
  busy,
  onClose,
  onSave,
}: {
  mode: "add" | "edit";
  device?: ManualNetworkDevice | null;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: Omit<ManualNetworkDevice, "id">) => void;
}) {
  const [form, setForm] = useState<Omit<ManualNetworkDevice, "id">>({
    deviceName: device?.deviceName || "",
    deviceBrand: device?.deviceBrand || "",
    deviceStatus: device?.deviceStatus || "Active",
    deviceVersion: device?.deviceVersion || "",
    location: device?.location || "",
    purpose: device?.purpose || "",
    patchDate: device?.patchDate && device.patchDate !== "-" ? device.patchDate : "",
    remarks: device?.remarks || "-",
  });

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave(form);
  };

  return (
    <div className="user-modal-backdrop open" onMouseDown={onClose}>
      <form className="ni-modal user-modal advanced ema-kb-form" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="user-modal-head">
          <div>
            <span>{mode === "edit" ? "Edit Network Device" : "Register Network Device"}</span>
            <h2>{mode === "edit" ? device?.deviceName || "Edit Device" : "Add New Device"}</h2>
            <p>{mode === "edit" ? "Update manual device status through the CRUD API." : "Register a router, switch, access point, firewall or other network device."}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close form">
            <X size={18} />
          </button>
        </div>

        <div className="user-modal-body">
          <label className="ni-field ni-field-wide ema-form-field-wide">
            <span>Device Name</span>
            <input required value={form.deviceName} onChange={(event) => update("deviceName", event.target.value)} placeholder="Core Router 01" />
          </label>

          <div className="ni-form-grid form-grid">
            <label className="ni-field">
              <span>Device Brand</span>
              <input value={form.deviceBrand} onChange={(event) => update("deviceBrand", event.target.value)} placeholder="Cisco / ASUS / Fortinet" />
            </label>
            <label className="ni-field">
              <span>Device Status</span>
              <select value={form.deviceStatus} onChange={(event) => update("deviceStatus", event.target.value)}>
                <option>Active</option>
                <option>Inactive</option>
                <option>Maintenance</option>
              </select>
            </label>
          </div>

          <div className="ni-form-grid form-grid">
            <label className="ni-field">
              <span>Version</span>
              <input value={form.deviceVersion} onChange={(event) => update("deviceVersion", event.target.value)} placeholder="V2.0" />
            </label>
            <label className="ni-field">
              <span>Patch Date</span>
              <input value={form.patchDate} onChange={(event) => update("patchDate", event.target.value)} type="date" />
            </label>
          </div>

          <div className="ni-form-grid form-grid">
            <label className="ni-field">
              <span>Location</span>
              <input value={form.location} onChange={(event) => update("location", event.target.value)} placeholder="Server Room / HQ" />
            </label>
            <label className="ni-field">
              <span>Purpose</span>
              <input value={form.purpose} onChange={(event) => update("purpose", event.target.value)} placeholder="Router / Switch / Firewall" />
            </label>
          </div>

          <label className="ni-field ni-field-wide ema-form-field-wide">
            <span>Remarks</span>
            <textarea value={form.remarks} onChange={(event) => update("remarks", event.target.value)} rows={3} placeholder="Operational note or device description" />
          </label>
        </div>

        <div className="user-modal-foot">
          <button type="button" className="soft-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="primary-btn" disabled={busy}>
            {busy ? <Loader2 size={16} className="ni-spin" /> : mode === "edit" ? <Edit3 size={16} /> : <Plus size={16} />}
            {mode === "edit" ? "Save Changes" : "Add Device"}
          </button>
        </div>
      </form>
    </div>
  );
}

function RecordDetailModal({ detail, onClose }: { detail: NonNullable<RecordDetailState>; onClose: () => void }) {
  return (
    <div className="user-modal-backdrop open" onMouseDown={onClose}>
      <section className="user-modal advanced" onMouseDown={(event) => event.stopPropagation()}>
        <div className="user-modal-head">
          <div>
            <span>{detail.source}</span>
            <h2>{detail.title}</h2>
            <p>Backend raw detail from Network Inventory API.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close detail">
            <X size={18} />
          </button>
        </div>
        <div className="user-modal-body">
          <table className="ni-record-table">
            <tbody>
              {detail.rows.map(([key, value]) => (
                <tr key={key}>
                  <th>{key}</th>
                  <td>{value}</td>
                </tr>
              ))}
              {!detail.rows.length && (
                <tr>
                  <td colSpan={2}>No backend detail returned.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ScanJobModal({
  dialog,
  busy,
  targetCount,
  onClose,
  onSubmit,
}: {
  dialog: NonNullable<ScanDialogState>;
  busy: boolean;
  targetCount: number;
  onClose: () => void;
  onSubmit: (commandType: CommandType, scheduleTime: string, description: string) => void;
}) {
  const [commandType, setCommandType] = useState<CommandType>("push");
  const [scheduleTime, setScheduleTime] = useState("");
  const defaultDescription = `[Network Inventory] Scan - ${dialog.mode === "all" ? "All Network IPs" : dialog.mode === "subnet" ? dialog.node?.label || "Selected subnet" : dialog.ipAddress || dialog.node?.label || "Selected IP"}`;
  const [description, setDescription] = useState(defaultDescription);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(commandType, scheduleTime, description);
  };

  return (
    <div className="user-modal-backdrop open" onMouseDown={onClose}>
      <form className="ni-modal ni-scan-modal user-modal advanced ema-kb-form" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="user-modal-head">
          <div>
            <span>Network Inventory Scan Job</span>
            <h2>{dialog.mode === "all" ? "Scan All Network IPs" : dialog.mode === "subnet" ? `Scan Subnet ${dialog.node?.label || ""}` : `Scan IP ${dialog.ipAddress || dialog.node?.label || ""}`}</h2>
            <p>Creates Job_Type 10600 / Job_Command 1800 for the endpoint agent pickup flow.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close scan modal">
            <X size={18} />
          </button>
        </div>

        <div className="user-modal-body">
          <div className="ni-scan-summary-grid">
            <div>
              <span>Scan Mode</span>
              <strong>{dialog.mode.toUpperCase()}</strong>
            </div>
            <div>
              <span>Target Count</span>
              <strong>{targetCount}</strong>
            </div>
            <div>
              <span>Selected Scope</span>
              <strong>{dialog.node?.label || "All Network"}</strong>
            </div>
          </div>

          <div className="ni-form-grid form-grid">
            <label className="ni-field">
              <span>Command Type</span>
              <select value={commandType} onChange={(event) => setCommandType(event.target.value as CommandType)}>
                <option value="push">Push Now</option>
                <option value="schedule">Schedule</option>
              </select>
            </label>

            <label className="ni-field">
              <span>Schedule Time</span>
              <input type="datetime-local" value={scheduleTime} onChange={(event) => setScheduleTime(event.target.value)} disabled={commandType !== "schedule"} required={commandType === "schedule"} />
            </label>
          </div>

          <label className="ni-field ni-field-wide ema-form-field-wide">
            <span>Description</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
          </label>
        </div>

        <div className="user-modal-foot">
          <button type="button" className="soft-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="primary-btn" disabled={busy}>
            {busy ? <Loader2 size={16} className="ni-spin" /> : <Play size={16} />}
            Create Scan Job
          </button>
        </div>
      </form>
    </div>
  );
}

function EmptyState({ icon, title, subtitle }: { icon?: "loading"; title: string; subtitle: string }) {
  return (
    <div className="ni-empty-table table table-hover align-middle mb-0-empty-panel">
      {icon === "loading" ? <Loader2 size={28} className="ni-spin" /> : <Database size={28} />}
      <strong>{title}</strong>
      <span>{subtitle}</span>
    </div>
  );
}
