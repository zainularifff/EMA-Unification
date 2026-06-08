import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Filter,
  Folder,
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
import "../../styles/ema-layout.css";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type ViewMode = "device" | "package";
type UsageStatus = "Productive" | "Review" | "Restricted" | "Unused";
type RiskLevel = "Low" | "Medium" | "High";
type LicenseType = "Free" | "Paid" | "Enterprise" | "Unknown";
type ToastType = "success" | "error" | "info";

type ToastState = {
  type: ToastType;
  title: string;
  message: string;
} | null;

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
  raw?: Record<string, unknown>;
  children?: TreeNode[];
};

type PackageRow = {
  id: string;
  SW_Pkg_Idn: number;
  label: string;
  name: string;
  manufacturer: string;
  classification: string;
  raw?: Record<string, unknown>;
};

type PackageFileRow = {
  id: string;
  fileName: string;
  originalFileName: string;
  version: string;
  fileSize: string;
  raw?: Record<string, unknown>;
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
  usedTimeHours: number;
  usedTimeSeconds: number;
  launchCount: number;
  lastUsed: string;
  status: UsageStatus;
  risk: RiskLevel;
  licenseType: LicenseType;
  recommendation: string;
  raw?: Record<string, unknown>;
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  raw?: unknown;
  totalRecords?: number;
  procedure?: string;
  [key: string]: unknown;
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

const API_BASE_URL = ((import.meta.env.VITE_API_BASE_URL as string | undefined) || "http://localhost:3001").replace(/\/$/, "");
const TOKEN_STORAGE_KEYS = ["ema-access-token", "ema-token", "accessToken", "token", "authToken"];
const AUTH_PAYLOAD_KEYS = ["ema-auth", "auth", "user", "ema-user", "currentUser", "authUser", "ema-current-user"];
const PAGE_SIZE = 10;
const METERING_ACTIVE_STORAGE_KEY = "ema-application-metering-active-scopes";

const emptyNode: TreeNode = {
  id: "organization",
  label: "Organization",
  type: "folder",
  relationID: -1,
  count: 0,
  children: [],
};

const emptyUsageRow: UsageRow = {
  id: "empty",
  application: "No application selected",
  publisher: "-",
  version: "-",
  fileName: "-",
  originalFileName: "-",
  device: "-",
  user: "-",
  site: "-",
  usedTimeHours: 0,
  usedTimeSeconds: 0,
  launchCount: 0,
  lastUsed: "-",
  status: "Unused",
  risk: "Low",
  licenseType: "Unknown",
  recommendation: "Select an application usage row to review operational recommendation.",
};

const statusOrder: UsageStatus[] = ["Productive", "Review", "Restricted", "Unused"];
const restrictedKeywords = ["torrent", "utorrent", "bittorrent", "anydesk", "teamviewer", "remote", "vpn", "cracker", "keygen"];
const paidKeywords = ["visio", "project", "autocad", "adobe", "photoshop", "illustrator", "acrobat", "sap"];
const enterpriseKeywords = ["office", "teams", "outlook", "excel", "word", "powerpoint", "sap"];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function getDataArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const envelope = asRecord(payload);
  if (!envelope) return [];
  if (Array.isArray(envelope.data)) return envelope.data as T[];
  if (Array.isArray(envelope.raw)) return envelope.raw as T[];
  return [];
}

function getDataObject(payload: unknown): Record<string, unknown> {
  const envelope = asRecord(payload);
  const data = asRecord(envelope?.data);
  return data || envelope || {};
}

function getEnvelopeData<T>(payload: unknown, fallback: T): T {
  const envelope = asRecord(payload);
  if (!envelope) return fallback;
  return (envelope.data as T) ?? fallback;
}

function pickValue(record: Record<string, unknown> | null | undefined, keys: string[], fallback = "") {
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

function findTokenInValue(value: unknown, depth = 0): string {
  if (!value || depth > 5) return "";

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("eyJ")) return trimmed;

    try {
      return findTokenInValue(JSON.parse(trimmed), depth + 1);
    } catch {
      return "";
    }
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const token = findTokenInValue(item, depth + 1);
      if (token) return token;
    }
    return "";
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const nestedData = asRecord(record.data);
    const directToken =
      record.token ||
      record.accessToken ||
      record.authToken ||
      record.jwt ||
      record.jwtToken ||
      record.bearerToken ||
      nestedData?.token ||
      nestedData?.accessToken;

    if (typeof directToken === "string" && directToken.trim()) return directToken.trim();

    for (const item of Object.values(record)) {
      const token = findTokenInValue(item, depth + 1);
      if (token) return token;
    }
  }

  return "";
}

function getStoredAccessToken() {
  const storages = [window.localStorage, window.sessionStorage];

  for (const storage of storages) {
    for (const key of TOKEN_STORAGE_KEYS) {
      const directValue = storage.getItem(key);
      if (directValue?.trim()) return directValue.trim();
    }

    for (const key of AUTH_PAYLOAD_KEYS) {
      const token = findTokenInValue(storage.getItem(key));
      if (token) return token;
    }

    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key) continue;
      const token = findTokenInValue(storage.getItem(key));
      if (token) return token;
    }
  }

  return "";
}

async function apiRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredAccessToken();
  if (!token) throw new Error("Access token missing. Please login again.");

  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const rawBody = await response.text();
  let payload: ApiEnvelope<T> | T;

  try {
    payload = rawBody ? JSON.parse(rawBody) : ({ success: response.ok } as ApiEnvelope<T>);
  } catch {
    throw new Error(`Invalid API response from ${path}`);
  }

  const envelope = asRecord(payload);
  if (!response.ok || envelope?.success === false) {
    const messageParts = [
      envelope?.message,
      envelope?.stage ? `Stage: ${envelope.stage}` : "",
      envelope?.error ? `Error: ${envelope.error}` : "",
      envelope?.detail ? `Detail: ${envelope.detail}` : "",
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    const apiError = new Error(messageParts.join(" · ") || `API request failed: ${response.status}`);
    (apiError as Error & { payload?: unknown }).payload = payload;
    throw apiError;
  }

  return payload as T;
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

function collectDepartmentPaths(nodes: TreeNode[], parentKeys: string[] = [], parentLabels: string[] = []): DepartmentPath[] {
  return nodes.flatMap((node) => {
    const currentKeys = [...parentKeys, node.id];
    const currentLabels = [...parentLabels, node.label];
    const relationID = Number(node.relationID ?? Number.NaN);
    const currentPath: DepartmentPath[] = Number.isFinite(relationID) && relationID > 0
      ? [
          {
            key: node.id,
            relationID,
            label: node.label,
            pathKeys: currentKeys,
            groupPath: currentLabels.join(" \\ "),
          },
        ]
      : [];

    return [...currentPath, ...(node.children ? collectDepartmentPaths(node.children, currentKeys, currentLabels) : [])];
  });
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
  return Math.round((seconds / 3600) * 10) / 10;
}

function getStatus(application: string, launchCount: number, usedTimeHours: number): UsageStatus {
  const app = application.toLowerCase();
  if (restrictedKeywords.some((keyword) => app.includes(keyword))) return "Restricted";
  if (launchCount <= 0 || usedTimeHours <= 0) return "Unused";
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
  const fileName = pickValue(record, [
    "fileName",
    "FileName",
    "File_Name",
    "SW_File_Name",
    "ProcessName",
    "EXE_Name",
  ], `File ${index + 1}`);

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
  const deviceName = pickValue(record, [
    "DeviceName",
    "DeviceDisplayName",
    "ComputerName",
    "MDM_DeviceName",
    "Name",
    "Object_DeviceID",
  ], `Device ${index + 1}`);

  const ownerName = pickValue(record, [
    "DisplayName",
    "OwnerName",
    "DeviceOwner",
    "UserName",
    "LastLoggedInUser",
    "Object_Client_Name",
    "Owner",
    "LoginUser",
  ], "-");

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

function collectFolderRelationIds(node: TreeNode | null): Set<number> {
  const ids = new Set<number>();
  const walk = (item: TreeNode | null | undefined) => {
    if (!item) return;
    if (item.type === "folder" && typeof item.relationID === "number" && item.relationID > 0) ids.add(item.relationID);
    item.children?.forEach((child) => {
      if (child.type === "folder") walk(child);
    });
  };
  walk(node);
  return ids;
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

function getTreeNodeValue(node: TreeNode, keys: string[], fallback = "-") {
  return pickValue(node.raw || {}, keys, fallback);
}


function collectRelationIds(nodes: TreeNode[], ids = new Set<number>()): Set<number> {
  for (const node of nodes) {
    if (node.type === "folder" && typeof node.relationID === "number") ids.add(node.relationID);
    if (node.children?.length) collectRelationIds(node.children, ids);
  }
  return ids;
}

function attachDeviceInventoryToTree(nodes: TreeNode[], deviceNodes: TreeNode[]): TreeNode[] {
  const knownRelationIds = collectRelationIds(nodes);
  const devicesByRelation = new Map<number, TreeNode[]>();
  const rootOnlyDevices: TreeNode[] = [];

  for (const device of deviceNodes) {
    const relationID = device.relationID || 0;
    if (relationID && knownRelationIds.has(relationID)) {
      devicesByRelation.set(relationID, [...(devicesByRelation.get(relationID) || []), device]);
    } else {
      rootOnlyDevices.push(device);
    }
  }

  const sortDevices = (items: TreeNode[]) => items.slice().sort((a, b) => a.label.localeCompare(b.label));

  const walk = (node: TreeNode, isRoot = false): TreeNode => {
    const folderChildren = (node.children || [])
      .filter((child) => child.type !== "device")
      .map((child) => walk(child, false));

    const directDevices = node.type === "folder" && node.relationID
      ? sortDevices(devicesByRelation.get(node.relationID) || [])
      : [];

    const orphanDevices = isRoot ? sortDevices(rootOnlyDevices) : [];
    const totalDeviceCount = directDevices.length
      + orphanDevices.length
      + folderChildren.reduce((sum, child) => sum + (child.count || 0), 0);

    return {
      ...node,
      count: totalDeviceCount,
      children: [...folderChildren, ...directDevices, ...orphanDevices],
    };
  };

  return nodes.map((node, index) => walk(node, index === 0 && node.id === "organization"));
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
  const application = pickValue(record, ["applicationPackage", "ApplicationPackage", "Application Package", "SW_Pkg_Name", "SWPkgName", "PackageName", "Pkg_Name"], "-");
  const rawSeconds = parseNumber(pickValue(record, ["usedTime", "UsedTime", "Used_Time", "DurationSeconds", "Seconds", "TotalSeconds"], "0"), 0);
  const launchCount = parseNumber(pickValue(record, ["counts", "Counts", "Count", "UseCount", "UsedCount", "RunCount"], "0"), 0);
  const usedTimeHours = secondsToHours(rawSeconds);
  const status = getStatus(application, launchCount, usedTimeHours);
  const risk = getRisk(status);
  const licenseType = getLicenseType(application);

  return {
    id: String(pickValue(record, ["id", "ID", "RowNumber", "No"], String(index + 1))),
    application,
    publisher: pickValue(record, ["publisher", "Publisher", "Manufacturer", "CompanyName", "Vendor"], "-"),
    version: pickValue(record, ["version", "Version", "FileVersion", "SW_Version"], "-"),
    fileName: pickValue(record, ["fileName", "FileName", "File_Name", "SW_File_Name", "ProcessName"], "-"),
    originalFileName: pickValue(record, ["originalFileName", "OriginalFileName", "Original_File_Name", "OriginalName"], "-"),
    device: pickValue(record, ["device", "ComputerName", "Object_Client_Name", "DeviceName", "MachineName"], "-"),
    user: pickValue(record, ["user", "UserName", "User", "LoginUser", "Owner"], "-"),
    site: pickValue(record, ["site", "Object_Full_Name", "Department", "GroupName", "Location"], "-"),
    usedTimeHours,
    usedTimeSeconds: rawSeconds,
    launchCount,
    lastUsed: pickValue(record, ["date", "MeterDate", "Meter_Date", "Date", "SearchDate", "UseDate", "LastUsed"], "-").slice(0, 19) || "-",
    status,
    risk,
    licenseType,
    recommendation: getRecommendation(status, risk, licenseType),
    raw: record,
  };
}

function statusClass(status: UsageStatus) {
  return status.toLowerCase();
}

function riskClass(risk: RiskLevel) {
  return risk.toLowerCase();
}

function getTreeStatusClass(status = "") {
  const value = status.trim().toLowerCase();
  if (value === "online" || value === "connected") return "online";
  if (value === "offline" || value === "disconnected") return "offline";
  return "unknown";
}

function getSelectedDeviceOwner(node: TreeNode) {
  const raw = node.raw || {};
  return pickValue(raw, ["DisplayName", "OwnerName", "DeviceOwner", "UserName", "LastLoggedInUser", "Object_Client_Name"], node.subLabel || "-");
}

function getSelectedDeviceName(node: TreeNode) {
  const raw = node.raw || {};
  return pickValue(raw, ["DeviceName", "ComputerName", "DeviceDisplayName", "MDM_DeviceName", "Object_DeviceID"], node.label || "-");
}

function readMeteringActiveMap(): MeteringActiveMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(METERING_ACTIVE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as MeteringActiveMap : {};
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

function formatMeteringStartedAt(value = "") {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function exportCsv(rows: UsageRow[]) {
  const header = ["Application", "Publisher", "Version", "File", "Original File", "Device", "User", "Site", "Used Hours", "Launch Count", "Last Used", "Status", "Risk", "License", "Recommendation"];
  const csv = [
    header.join(","),
    ...rows.map((row) => [
      row.application,
      row.publisher,
      row.version,
      row.fileName,
      row.originalFileName,
      row.device,
      row.user,
      row.site,
      row.usedTimeHours,
      row.launchCount,
      row.lastUsed,
      row.status,
      row.risk,
      row.licenseType,
      row.recommendation,
    ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "application-metering-usage.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

function AppMeteringTree({ nodes, selectedId, onSelect }: { nodes: TreeNode[]; selectedId: string; onSelect: (node: TreeNode) => void }) {
  const [open, setOpen] = useState<Record<string, boolean>>({ organization: true, "all-packages": true });

  const renderNode = (node: TreeNode, depth = 0) => {
    const hasChildren = Boolean(node.children?.length);
    const isOpen = open[node.id] ?? depth < 1;
    const Icon = node.type === "package" ? Package : node.type === "device" ? UserRound : Folder;
    const showStatus = node.type === "device";

    return (
      <div key={node.id} className="appm-tree-node-wrap">
        <div
          className={cx("appm-tree-node", showStatus && "is-device", selectedId === node.id && "is-selected")}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          <button className="appm-tree-node-main" type="button" onClick={() => onSelect(node)}>
            {hasChildren ? (
              <span
                className="appm-tree-chevron"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpen((prev) => ({ ...prev, [node.id]: !isOpen }));
                }}
              >
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            ) : (
              <span className="appm-tree-chevron appm-tree-chevron-empty" />
            )}
            <Icon size={15} />
            <span className="appm-tree-text">
              <span className="appm-tree-label">{node.label}</span>
              {node.subLabel ? <span className="appm-tree-sub-label">{node.subLabel}</span> : null}
            </span>
          </button>
          {showStatus ? (
            <span className={cx("appm-tree-status", `is-${getTreeStatusClass(node.status)}`)}>{node.status || "-"}</span>
          ) : (
            <span className="appm-tree-count">{node.count ?? 0}</span>
          )}
        </div>
        {hasChildren && isOpen ? node.children?.map((child) => renderNode(child, depth + 1)) : null}
      </div>
    );
  };

  return <div className="appm-tree">{nodes.map((node) => renderNode(node))}</div>;
}

export default function ApplicationMetering() {
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
  const [selectedRowId, setSelectedRowId] = useState("");
  const [drawerRow, setDrawerRow] = useState<UsageRow | null>(null);
  const [showMeteringModal, setShowMeteringModal] = useState(false);
  const [meteringType, setMeteringType] = useState<"all" | "selected">("all");
  const [modalPackageId, setModalPackageId] = useState<number>(0);
  const [toast, setToast] = useState<ToastState>(null);
  const [loading, setLoading] = useState({ hierarchy: false, packages: false, usage: false, action: false, assets: false, packageFiles: false });
  const [error, setError] = useState("");
  const [appMeteringDevices, setAppMeteringDevices] = useState<TreeNode[]>([]);
  const [scopeDeviceRows, setScopeDeviceRows] = useState<TreeNode[]>([]);
  const [assetCache, setAssetCache] = useState<Record<string, TreeNode[]>>({});
  const [activeMeteringScopes, setActiveMeteringScopes] = useState<MeteringActiveMap>(() => readMeteringActiveMap());

  const packageTree = useMemo(() => buildPackageTree(packages), [packages]);
  const activeTree = viewMode === "device" ? departmentTree : packageTree;
  const treeNodes = useMemo(() => flattenTree(activeTree), [activeTree]);
  const activePackageId = selectedPackageId || (selectedNode.type === "package" ? selectedNode.packageId || 0 : 0);
  const activeMeteringKey = useMemo(() => getMeteringScopeKey(selectedNode, activePackageId), [selectedNode, activePackageId]);
  const selectedScopeMetering = activeMeteringScopes[activeMeteringKey];
  const isSelectedScopeMeteringActive = Boolean(selectedScopeMetering);
  const companyScopeNode = useMemo(() => findTreeNodeById(departmentTree, "organization") || departmentTree[0] || emptyNode, [departmentTree]);
  const isScopeMeteringActive = useCallback((node: TreeNode, packageId = activePackageId) => {
    return Boolean(activeMeteringScopes[getMeteringScopeKey(node, packageId)]);
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
      : "Organization";

  const isCurrentMeteringScopeActive = isScopeMeteringActive(currentMeteringScopeNode, activePackageId);
  const currentMeteringButtonLabel = `${isCurrentMeteringScopeActive ? "Stop" : "Metering"} ${currentMeteringScopeType}`;
  const currentMeteringButtonTitle = currentMeteringScopeType === "Company"
    ? "Create one application metering job for the whole company."
    : currentMeteringScopeType === "Organization"
      ? "Create one application metering job for the selected organization folder only."
      : "Create one application metering job for the selected individual device.";

  const showToast = useCallback((type: ToastType, title: string, message: string) => {
    setToast({ type, title, message });
    window.setTimeout(() => setToast(null), 4200);
  }, []);

  const loadHierarchy = useCallback(async () => {
    setLoading((prev) => ({ ...prev, hierarchy: true }));
    try {
      const payload = await apiRequest<unknown>("/api/departments");
      const departments = getDataArray<ApiDepartment>(payload);
      const baseTree = buildDepartmentTree(departments);

      // Do not load every /api/assets/:relationID record during initial render.
      // Device targets are loaded on demand when a folder is selected so the page stays fast.
      setDepartmentTree(baseTree);
      setSelectedNode((prev) => findTreeNodeById(baseTree, prev.id) || baseTree[0] || emptyNode);
      setAppMeteringDevices([]);
      setScopeDeviceRows([]);
      setAssetCache({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load department hierarchy.");
      setAppMeteringDevices([]);
      setScopeDeviceRows([]);
    } finally {
      setLoading((prev) => ({ ...prev, hierarchy: false, assets: false }));
    }
  }, []);


  const loadAssetsForScope = useCallback(async (node: TreeNode) => {
    if (viewMode !== "device" || node.type !== "folder") {
      setScopeDeviceRows([]);
      return;
    }

    if (node.id === "organization" || !node.relationID || node.relationID <= 0) {
      setScopeDeviceRows([]);
      setLoading((prev) => ({ ...prev, assets: false }));
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
      const response = await apiRequest<unknown>(`/api/assets/${node.relationID}`);
      const department = departmentPathFromNode(node);
      const rows = getDataArray<ApiAsset>(response)
        .map((asset, index) => normalizeAssetNode(asset, department, index))
        .filter((item): item is TreeNode => Boolean(item))
        .sort((a, b) => a.label.localeCompare(b.label));

      setScopeDeviceRows(rows);
      setAppMeteringDevices(rows);
      setAssetCache((prev) => ({ ...prev, [cacheKey]: rows }));
    } catch (err) {
      setScopeDeviceRows([]);
      setError(err instanceof Error ? err.message : "Failed to load device targets for the selected folder.");
    } finally {
      setLoading((prev) => ({ ...prev, assets: false }));
    }
  }, [assetCache, viewMode]);

  const loadPackages = useCallback(async () => {
    setLoading((prev) => ({ ...prev, packages: true }));
    try {
      const payload = await apiRequest<unknown>("/api/application-metering/packages");
      const rows = getDataArray<unknown>(payload).map(normalizePackageRow);
      setPackages(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load application packages.");
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
      const payload = await apiRequest<unknown>(`/api/application-metering/packages/${packageId}/files`);
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

    if (packageId) params.set("swPkgId", String(packageId));
    params.set("startDate", startDate);
    params.set("endDate", endDate);
    params.set("page", "1");
    params.set("limit", "500");
    if (oneYearMode) params.set("oneYear", "true");
    if (nextPageMode) params.set("nextpage", "true");

    return params;
  }, [selectedNode, selectedPackageId, startDate, endDate, oneYearMode, nextPageMode]);

  const loadUsage = useCallback(async () => {
    setLoading((prev) => ({ ...prev, usage: true }));
    setError("");

    try {
      const usagePayload = await apiRequest<unknown>(`/api/application-metering/usage?${activeFilters.toString()}`);
      const normalizedUsage = getDataArray<unknown>(usagePayload).map(normalizeUsageRow);
      setUsageRows(normalizedUsage);
      setSelectedRowId((prev) => (normalizedUsage.some((row) => row.id === prev) ? prev : normalizedUsage[0]?.id || ""));

      const statsPayload = await apiRequest<unknown>(`/api/application-metering/stats?${activeFilters.toString()}`);
      const statsData = getEnvelopeData<AppMeteringStats>(statsPayload, {});
      setStats(statsData || {});
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load application metering usage.";
      setError(message);
      setUsageRows([]);
      setStats({});
    } finally {
      setLoading((prev) => ({ ...prev, usage: false }));
    }
  }, [activeFilters]);

  useEffect(() => {
    loadHierarchy();
    loadPackages();
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
      loadAssetsForScope(selectedNode);
    }
  }, [loadAssetsForScope, selectedNode.id, selectedNode.relationID, selectedNode.type, viewMode]);

  useEffect(() => {
    const packageId = selectedPackageId || (selectedNode.type === "package" ? selectedNode.packageId || 0 : 0);
    loadPackageFiles(packageId);
  }, [selectedPackageId, selectedNode.packageId, selectedNode.type, loadPackageFiles]);

  useEffect(() => {
    if (!oneYearMode && nextPageMode) setNextPageMode(false);
  }, [oneYearMode, nextPageMode]);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  const filteredRows = useMemo(() => {
    const text = searchTerm.trim().toLowerCase();

    return usageRows.filter((row) => {
      const matchesText = !text || [row.application, row.publisher, row.fileName, row.device, row.user, row.site]
        .some((value) => value.toLowerCase().includes(text));
      const matchesStatus = filters.status === "all" || row.status === filters.status;
      const matchesLicense = filters.license === "all" || row.licenseType === filters.license;
      return matchesText && matchesStatus && matchesLicense;
    });
  }, [usageRows, searchTerm, filters]);

  const usagePageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const selectedRow = filteredRows.find((row) => row.id === selectedRowId) ?? filteredRows[0] ?? emptyUsageRow;
  const showDeviceRegistry = viewMode === "device" && selectedNode.type !== "device";
  const selectedFolderNode = showDeviceRegistry ? findTreeNodeById(departmentTree, selectedNode.id) || selectedNode : null;
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
  const devicePageCount = Math.max(1, Math.ceil(filteredDeviceRows.length / PAGE_SIZE));
  const pageCount = showDeviceRegistry ? devicePageCount : usagePageCount;
  const safePage = Math.min(Math.max(1, page), pageCount);
  const pagedRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const pagedDeviceRows = filteredDeviceRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, filters, selectedNode.id, selectedPackageId]);

  useEffect(() => {
    setPage((prev) => Math.min(Math.max(1, prev), pageCount));
  }, [pageCount]);

  const summary = useMemo(() => {
    const totalSeconds = typeof stats.totalUsageSeconds === "number" ? stats.totalUsageSeconds : usageRows.reduce((sum, row) => sum + row.usedTimeSeconds, 0);
    const uniqueApplications = typeof stats.uniqueApplications === "number" ? stats.uniqueApplications : new Set(usageRows.map((row) => row.application).filter(Boolean)).size;
    const launchCount = usageRows.reduce((sum, row) => sum + row.launchCount, 0);
    const restricted = usageRows.filter((row) => row.status === "Restricted").length;
    const unused = usageRows.filter((row) => row.status === "Unused").length;
    const review = usageRows.filter((row) => row.status === "Review").length;

    return {
      uniqueApplications,
      totalHours: secondsToHours(totalSeconds),
      launchCount,
      restricted,
      unused,
      review,
    };
  }, [stats, usageRows]);

  const statusCounts = statusOrder.map((status) => ({ status, count: usageRows.filter((row) => row.status === status).length }));
  const kpiScopeType = selectedNode.type === "package" ? "Package" : selectedNode.type === "device" ? "Device" : "Scope";
  const kpiScopeLabel = selectedNode.label || "Organization";
  const kpiPeriodLabel = oneYearMode ? `One year window${nextPageMode ? " · next page" : ""}` : `${startDate} to ${endDate}`;
  const kpiFilterLabel = `${filters.status === "all" ? "All status" : filters.status} · ${filters.license === "all" ? "All licenses" : filters.license}`;

  const handleTreeSearch = (value: string) => {
    setTreeSearch(value);
    const match = treeNodes.find((node) => node.label.toLowerCase().includes(value.trim().toLowerCase()));
    if (value.trim() && match) {
      setSelectedNode(match);
      if (match.type === "package") setSelectedPackageId(match.packageId || 0);
    }
  };

  const handleNodeSelect = (node: TreeNode) => {
    setSelectedNode(node);
    if (node.type === "package") {
      setSelectedPackageId(node.packageId || 0);
      setViewMode("package");
    }
  };

  const getActionPayload = (commandDescription: string, commandPackageId = 0, targetNode: TreeNode = selectedNode) => {
    const packageId = commandPackageId || modalPackageId || selectedPackageId || (targetNode.type === "package" ? targetNode.packageId || 0 : 0);
    const scanMode = getMeteringScanMode(targetNode);
    const rawTarget = targetNode.raw || {};

    return {
      scanMode,
      Object_Rel_Idn: targetNode.relationID ?? (scanMode === "all" ? -1 : -1),
      Object_Root_Idn: targetNode.objectRootIdn ?? 0,
      Object_DeviceID: targetNode.objectDeviceID || "",
      Object_Agent: targetNode.objectAgent || String(rawTarget.Object_Agent || ""),
      MDM_Asset_Idn: targetNode.mdmAssetIdn || Number(rawTarget.MDM_Asset_Idn || 0) || 0,
      MDM_DeviceID: String(rawTarget.MDM_DeviceID || rawTarget.DeviceID || ""),
      ComputerName: targetNode.label || String(rawTarget.ComputerName || rawTarget.DeviceName || ""),
      DeviceName: String(rawTarget.DeviceName || targetNode.label || ""),
      Object_Full_Name: String(rawTarget.Object_Full_Name || rawTarget.Object_Rel_Name || targetNode.label || ""),
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

    // Do not block Hardware Inventory rows on the frontend.
    // Some Windows rows arrive as MDM records but can still be resolved by the backend
    // through TSMDM_TS_OBJECT_MAPPING or ComputerName -> TS_OBJECT_ROOT matching.

    setLoading((prev) => ({ ...prev, action: true }));
    try {
      const title = action === "start" ? "Start Application Metering" : action === "collect" ? "Collect Application Metering Result" : "Stop Application Metering";
      const payload = getActionPayload(`${title} - ${actionNode.label}`, effectivePackageId, actionNode) as Record<string, unknown>;

      if ((action === "stop" || action === "collect") && activeRecord?.jobIdn) {
        payload.Job_Idn = activeRecord.jobIdn;
        payload.jobIndex = activeRecord.jobIdn;
        payload.activeJobIdn = activeRecord.jobIdn;
      }

      if (action === "stop" && !activeRecord?.jobIdn) {
        throw new Error("No active Job_Idn is stored for this scope. Start metering once with the updated UI before stopping, so Stop Metering can update the same Task List job.");
      }

      const response = await apiRequest<ApiEnvelope<unknown>>(`/api/application-metering/${action}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const responseJobIdn = getMeteringJobIdFromResponse(response) || activeRecord?.jobIdn || 0;

      if (action === "start") {
        updateMeteringScopeState("start", actionNode, effectivePackageId, responseJobIdn, 1206);
      } else if (action === "stop") {
        updateMeteringScopeState("stop", actionNode, effectivePackageId);
      }

      showToast("success", `${title} submitted`, String(asRecord(response)?.message || "Job updated successfully."));
      setShowMeteringModal(false);
      setModalPackageId(0);
      await loadUsage();
    } catch (err) {
      showToast("error", "Application metering failed", err instanceof Error ? err.message : "Unable to create application metering job.");
    } finally {
      setLoading((prev) => ({ ...prev, action: false }));
    }
  };

  const handleScopeMeteringToggle = (node: TreeNode = selectedNode) => {
    const packageId = activePackageId || (node.type === "package" ? node.packageId || 0 : 0);
    if (isScopeMeteringActive(node, packageId)) {
      runMeteringAction("stop", packageId, node);
      return;
    }

    setSelectedNode(node);
    setMeteringType(packageId > 0 ? "selected" : "all");
    setModalPackageId(packageId);
    setShowMeteringModal(true);
  };

  const submitScopeMetering = (node: TreeNode) => {
    const packageId = modalPackageId || activePackageId || (node.type === "package" ? node.packageId || 0 : 0);
    runMeteringAction("start", packageId, node);
  };

  useEffect(() => {
    document.documentElement.classList.add("ema-settings-page-active");
    document.body.classList.add("ema-settings-page-active");

    return () => {
      document.documentElement.classList.remove("ema-settings-page-active");
      document.body.classList.remove("ema-settings-page-active");
    };
  }, []);

  return (
    <main className="settings-module-root ema-settings-pro appmetering-module container-fluid p-3 p-xl-4" data-section="application-metering">
      <input aria-hidden="true" id="globalSearch" type="hidden" />
      <button hidden id="themeBtn" type="button">
        <span id="themeLabel">Dark Mode</span>
      </button>

      <div className="settings-layout appm-settings-layout d-grid gap-3">
        <aside className="settings-menu appm-settings-menu ema-panel-surface">
          <div className="panel-head">
            <span>APPLICATION METERING</span>
            <strong>Metering Scope</strong>
            <small>Browse organization, endpoint and package target.</small>
          </div>

          <div className="appm-sidebar-mode-row" role="tablist" aria-label="Application metering view mode">
            <button type="button" className={cx("setting-btn appm-mode-btn", viewMode === "device" && "active")} onClick={() => setViewMode("device")}>
              <span className="setting-icon"><UserRound size={18} /></span>
              <span><strong>Devices</strong><small>Folder and endpoint scope</small></span>
            </button>
            <button type="button" className={cx("setting-btn appm-mode-btn", viewMode === "package" && "active")} onClick={() => setViewMode("package")}>
              <span className="setting-icon"><Layers3 size={18} /></span>
              <span><strong>Packages</strong><small>Software package list</small></span>
            </button>
          </div>

          <label className="section-search appm-sidebar-search" htmlFor="appmSidebarSearch">
            <Search size={15} />
            <input id="appmSidebarSearch" value={treeSearch} onChange={(event) => handleTreeSearch(event.target.value)} placeholder="Search folders, devices or packages..." />
          </label>

          <div className="settings-menu-list appm-tree-scroll" id="appmeteringMenu" role="tree" aria-label="Application metering target tree">
            {loading.hierarchy || loading.packages ? (
              <div className="appm-loading-state"><RefreshCw size={15} className="appm-spin" /> Loading hierarchy...</div>
            ) : (
              <AppMeteringTree nodes={activeTree} selectedId={selectedNode.id} onSelect={handleNodeSelect} />
            )}
          </div>
        </aside>

        <section className="settings-content appm-settings-content d-grid gap-3">
          <div className="settings-hero appm-hero ema-panel-surface">
            <div>
              <span className="eyebrow">APPLICATION COMMAND CENTER</span>
              <h2>Application Metering</h2>
              <p>{kpiScopeType}: {kpiScopeLabel} · {kpiPeriodLabel} · {kpiFilterLabel}</p>
            </div>
            <div className="settings-score appm-hero-score">
              <button className="score-box appm-score-box" type="button" onClick={loadUsage}>
                <span>Apps in Scope</span>
                <strong>{summary.uniqueApplications}</strong>
                <small>Unique metered apps</small>
              </button>
              <button className="score-box appm-score-box" type="button" onClick={loadUsage}>
                <span>Usage Hours</span>
                <strong>{summary.totalHours.toFixed(1)}h</strong>
                <small>Selected date range</small>
              </button>
              <button className="score-box appm-score-box" type="button" onClick={() => setFilters((prev) => ({ ...prev, status: "Review" }))}>
                <span>Review Apps</span>
                <strong>{summary.review}</strong>
                <small>Low or unusual use</small>
              </button>
              <button className="score-box appm-score-box" type="button" onClick={() => setFilters((prev) => ({ ...prev, status: "Restricted" }))}>
                <span>Restricted</span>
                <strong>{summary.restricted}</strong>
                <small>Policy review needed</small>
              </button>
              <button className="score-box appm-score-box" type="button" onClick={loadUsage}>
                <span>Launch Events</span>
                <strong>{summary.launchCount}</strong>
                <small>{statusCounts.find((item) => item.status === "Productive")?.count ?? 0} productive</small>
              </button>
            </div>
          </div>

          <div className="content-shell ema-panel-surface appm-content-shell">
            <div className="content-head appm-content-head">
              <div>
                <span className="section-tag">{showDeviceRegistry ? "TARGET REGISTRY" : "USAGE REGISTRY"}</span>
                <h3>{showDeviceRegistry ? "Target Device Registry" : "Application Usage Registry"}</h3>
                <p>{showDeviceRegistry ? `${selectedNode.label} scope · ${filteredDeviceRows.length} device${filteredDeviceRows.length === 1 ? "" : "s"}` : `${selectedNode.label} · ${startDate} to ${endDate}`}</p>
              </div>
              <div className="content-actions appm-head-actions">
                <button className="soft-btn icon-only" type="button" onClick={loadUsage} title="Refresh usage">
                  <RefreshCw size={16} className={cx(loading.usage && "appm-spin")} />
                </button>
                <button className="soft-btn icon-only" type="button" onClick={() => showDeviceRegistry ? showToast("info", "Device list", "Device registry uses the same /api/assets/:relationID data as Hardware Inventory.") : exportCsv(filteredRows)} title={showDeviceRegistry ? "Device source info" : "Export CSV"}>
                  <Download size={16} />
                </button>
              </div>
            </div>

            <div className="content-toolbar appm-content-toolbar">
              <label className="section-search appm-registry-search" htmlFor="appmRegistrySearch">
                <Search size={15} />
                <input id="appmRegistrySearch" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={showDeviceRegistry ? "Search devices, IPs, users..." : "Search application, device or user..."} />
                {searchTerm ? <button className="appm-search-clear" type="button" onClick={() => setSearchTerm("")}><X size={14} /></button> : null}
              </label>

              <div className="appm-toolbar-actions">
                <button className="soft-btn appm-clear-filters-btn" type="button" onClick={() => { setFilters({ status: "all", license: "all" }); setSelectedPackageId(0); setSearchTerm(""); setOneYearMode(false); setNextPageMode(false); }}>
                  <Filter size={14} /> Clear
                </button>
                <button
                  className={cx("primary-btn appm-scope-action-btn", isCurrentMeteringScopeActive && "danger-btn appm-danger-action")}
                  type="button"
                  onClick={() => handleScopeMeteringToggle(currentMeteringScopeNode)}
                  disabled={loading.action}
                  title={currentMeteringButtonTitle}
                >
                  {isCurrentMeteringScopeActive ? <StopCircle size={14} /> : <Play size={14} />}
                  <span>{currentMeteringButtonLabel}</span>
                </button>
                <button className="soft-btn appm-collect-result-btn" type="button" onClick={() => runMeteringAction("collect", activePackageId, selectedNode)} disabled={loading.action}>
                  <RefreshCw size={14} /> Collect
                </button>
              </div>
            </div>

            <div className="appm-filter-panel" aria-label="Application metering filters">
              <div className="appm-filter-strip">
                <label className="appm-filter-control">
                  <span>Start Date</span>
                  <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                </label>
                <label className="appm-filter-control">
                  <span>End Date</span>
                  <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                </label>
                <label className="appm-filter-control appm-filter-control-wide">
                  <span>Package</span>
                  <select value={selectedPackageId} onChange={(event) => setSelectedPackageId(Number(event.target.value))}>
                    <option value={0}>All packages</option>
                    {packages.map((pkg) => <option key={pkg.SW_Pkg_Idn} value={pkg.SW_Pkg_Idn}>{pkg.name}</option>)}
                  </select>
                </label>
                <label className="appm-filter-control">
                  <span>Status</span>
                  <select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}>
                    <option value="all">All Status</option>
                    {statusOrder.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
                <label className="appm-filter-control">
                  <span>License</span>
                  <select value={filters.license} onChange={(event) => setFilters((prev) => ({ ...prev, license: event.target.value }))}>
                    <option value="all">All License</option>
                    <option value="Free">Free</option>
                    <option value="Paid">Paid</option>
                    <option value="Enterprise">Enterprise</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </label>
                <label className="appm-filter-control">
                  <span>SP Mode</span>
                  <select value={oneYearMode ? "oneYear" : "normal"} onChange={(event) => setOneYearMode(event.target.value === "oneYear")}>
                    <option value="normal">Normal</option>
                    <option value="oneYear">One Year</option>
                  </select>
                </label>
                <label className="appm-filter-control">
                  <span>Page Mode</span>
                  <select value={nextPageMode ? "nextpage" : "first"} onChange={(event) => setNextPageMode(event.target.value === "nextpage")} disabled={!oneYearMode}>
                    <option value="first">First Page</option>
                    <option value="nextpage">Next Page</option>
                  </select>
                </label>
              </div>
            </div>

            {error ? <div className="appm-api-error"><AlertCircle size={15} /> {error}</div> : null}

            <div className="content-body appm-content-body">
              <div className="appm-table-frame">
                {showDeviceRegistry ? (
                  <table className="appm-table">
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Device Name</th>
                        <th>Platform / Model</th>
                        <th>Status</th>
                        <th>Last Connected</th>
                        <th>Group Path</th>
                        <th>Device ID</th>
                        <th>IP Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading.assets ? (
                        <tr><td colSpan={8}><div className="appm-empty-state"><RefreshCw size={15} className="appm-spin" /> Loading devices from /api/assets/{selectedNode.relationID}...</div></td></tr>
                      ) : pagedDeviceRows.length === 0 ? (
                        <tr><td colSpan={8}><div className="appm-empty-state">{selectedNode.id === "organization" ? "Company scope selected. Choose a department to browse device targets, or run Metering Company directly." : "No devices found in this folder scope."}</div></td></tr>
                      ) : pagedDeviceRows.map((device, index) => {
                        const raw = device.raw || {};
                        const isSelected = selectedNode.id === device.id;
                        return (
                          <tr key={device.id} className={cx(isSelected && "is-selected")} onClick={() => handleNodeSelect(device)}>
                            <td><span className="appm-row-number">{String((safePage - 1) * PAGE_SIZE + index + 1).padStart(2, "0")}</span></td>
                            <td>
                              <div className="appm-user-cell">
                                <strong>{device.label}</strong>
                                <small>{device.subLabel || getTreeNodeValue(device, ["Object_Full_Name"], "-")}</small>
                              </div>
                            </td>
                            <td><strong>{getTreeNodeValue(device, ["PlatformType"], "-")}</strong><small>{getTreeNodeValue(device, ["Model"], "-")}</small></td>
                            <td><span className={cx("appm-tree-status", `is-${getTreeStatusClass(device.status)}`)}>{device.status || "-"}</span></td>
                            <td>{formatApiDate(String(raw.ConnectionTime || ""))}</td>
                            <td>{getTreeNodeValue(device, ["Object_Full_Name", "Department", "Site", "GroupName"], "-")}</td>
                            <td><span className="appm-mono">{getTreeNodeValue(device, ["Object_DeviceID", "DeviceID", "MDM_DeviceID"], "-")}</span></td>
                            <td>{getTreeNodeValue(device, ["IP", "IPAddress", "DeviceIPAddress", "DeviceLocalIPAddress"], "-")}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <table className="appm-table">
                    <thead>
                      <tr>
                        <th>Application</th>
                        <th>Executable</th>
                        <th>Device / Name</th>
                        <th>Usage</th>
                        <th>Launch</th>
                        <th>Last Used</th>
                        <th>Status</th>
                        <th>Risk</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading.usage ? (
                        <tr><td colSpan={9}><div className="appm-empty-state"><RefreshCw size={15} className="appm-spin" /> Loading usage records...</div></td></tr>
                      ) : pagedRows.length === 0 ? (
                        <tr><td colSpan={9}><div className="appm-empty-state">No application metering records found for current filter.</div></td></tr>
                      ) : pagedRows.map((row) => (
                        <tr key={`${row.id}-${row.application}-${row.device}`} className={cx(row.id === selectedRow.id && "is-selected")} onClick={() => setSelectedRowId(row.id)}>
                          <td><div className="appm-app-cell"><button type="button" className="appm-app-link" onClick={(event) => { event.stopPropagation(); setDrawerRow(row); }}>{row.application}</button><small>{row.publisher} · {row.licenseType}</small></div></td>
                          <td><span className="appm-mono">{row.fileName}</span><small>{row.version}</small></td>
                          <td><div className="appm-user-cell"><strong>{row.device}</strong><small>Name: {row.user || "-"}</small></div></td>
                          <td>{row.usedTimeHours.toFixed(1)}h</td>
                          <td>{row.launchCount}</td>
                          <td>{row.lastUsed}</td>
                          <td><span className={cx("appm-status-pill", `is-${statusClass(row.status)}`)}>{row.status}</span></td>
                          <td><span className={cx("appm-risk-pill", `is-${riskClass(row.risk)}`)}>{row.risk}</span></td>
                          <td><button type="button" className="soft-btn appm-row-action" onClick={(event) => { event.stopPropagation(); setDrawerRow(row); }}>Details</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="appm-pagination" aria-label="Application metering pagination">
                <div className="appm-pagination-info">
                  <span>Showing {showDeviceRegistry ? pagedDeviceRows.length : pagedRows.length} of {showDeviceRegistry ? filteredDeviceRows.length : filteredRows.length}</span>
                  <strong>Page {safePage} of {pageCount}</strong>
                </div>
                <div className="appm-pagination-actions" aria-label="Pagination controls">
                  <button type="button" aria-label="First page" title="First page" disabled={safePage <= 1} onClick={() => setPage(1)}><ChevronsLeft size={14} /></button>
                  <button type="button" aria-label="Previous page" title="Previous page" disabled={safePage <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}><ChevronLeft size={14} /></button>
                  <b aria-current="page">{safePage}</b>
                  <button type="button" aria-label="Next page" title="Next page" disabled={safePage >= pageCount} onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}><ChevronRight size={14} /></button>
                  <button type="button" aria-label="Last page" title="Last page" disabled={safePage >= pageCount} onClick={() => setPage(pageCount)}><ChevronsRight size={14} /></button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {drawerRow ? (
        <div className="appm-detail-drawer-overlay" onClick={() => setDrawerRow(null)}>
          <section className="appm-detail-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="appm-detail-drawer-header">
              <div className="appm-detail-title-wrap">
                <div className="appm-detail-device-icon"><BarChart3 size={24} /></div>
                <div>
                  <div className="appm-detail-eyebrow">Application Usage Detail</div>
                  <h2>{drawerRow.application}</h2>
                  <p>{drawerRow.publisher} · {drawerRow.fileName}</p>
                </div>
              </div>
              <div className="appm-detail-header-actions">
                <span className={cx("appm-status-pill appm-detail-status", `is-${statusClass(drawerRow.status)}`)}>{drawerRow.status}</span>
                <button type="button" className="appm-detail-close" onClick={() => setDrawerRow(null)}><X size={16} /></button>
              </div>
            </div>

            <div className="appm-detail-action-bar">
              <button type="button" onClick={loadUsage}><RefreshCw size={14} /> Refresh Meter</button>
              <button type="button" onClick={() => exportCsv([drawerRow])}><Download size={14} /> Export Detail</button>
              <button type="button" className={isSelectedScopeMeteringActive ? "is-danger" : "is-primary"} onClick={() => handleScopeMeteringToggle()} disabled={loading.action}>{isSelectedScopeMeteringActive ? <StopCircle size={14} /> : <Play size={14} />} {isSelectedScopeMeteringActive ? "Stop Metering" : "Start Metering"}</button>
              <button type="button" className="is-success" onClick={() => showToast("success", "Review updated", "The selected application has been marked for review in the UI.")}><CheckCircle2 size={14} /> Mark Reviewed</button>
            </div>

            <div className="appm-detail-summary-grid">
              <div><span>Usage Hours</span><strong>{drawerRow.usedTimeHours.toFixed(1)}h</strong></div>
              <div><span>Launch Count</span><strong>{drawerRow.launchCount}</strong></div>
              <div><span>Risk Level</span><strong>{drawerRow.risk}</strong></div>
              <div><span>License Type</span><strong>{drawerRow.licenseType}</strong></div>
            </div>

            <div className="appm-detail-body">
              <div className="appm-detail-section-grid">
                <div className="appm-detail-card">
                  <h3>Application Information</h3>
                  <div className="appm-detail-item"><span>Application</span><strong>{drawerRow.application}</strong></div>
                  <div className="appm-detail-item"><span>Publisher</span><strong>{drawerRow.publisher}</strong></div>
                  <div className="appm-detail-item"><span>Version</span><strong>{drawerRow.version}</strong></div>
                  <div className="appm-detail-item"><span>Executable</span><strong className="is-mono">{drawerRow.fileName}</strong></div>
                  <div className="appm-detail-item"><span>Original File</span><strong className="is-mono">{drawerRow.originalFileName}</strong></div>
                </div>
                <div className="appm-detail-card">
                  <h3>Endpoint Context</h3>
                  <div className="appm-detail-item"><span>Device</span><strong>{drawerRow.device}</strong></div>
                  <div className="appm-detail-item"><span>User</span><strong>{drawerRow.user}</strong></div>
                  <div className="appm-detail-item"><span>Site</span><strong>{drawerRow.site}</strong></div>
                  <div className="appm-detail-item"><span>Last Used</span><strong>{drawerRow.lastUsed}</strong></div>
                </div>
                <div className="appm-detail-card appm-detail-card-wide">
                  <h3>Package File Group</h3>
                  {packageFiles.length === 0 ? (
                    <div className="appm-empty-state">No package file group loaded. Choose a package filter to call /api/application-metering/packages/:packageId/files.</div>
                  ) : (
                    <div className="appm-package-file-grid">
                      {packageFiles.slice(0, 8).map((file) => (
                        <div className="appm-detail-item" key={`${file.id}-${file.fileName}`}>
                          <span>{file.version || "Version"}</span>
                          <strong className="is-mono">{file.fileName}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="appm-detail-card appm-detail-card-wide">
                  <h3>Recommended Action</h3>
                  <div className="appm-recommendation-box">
                    <AlertTriangle size={18} />
                    <p>{drawerRow.recommendation}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {showMeteringModal ? (
        <div className="ema-modal-overlay appm-modal-overlay" onClick={() => setShowMeteringModal(false)}>
          <section className="ema-modal-card appm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="appm-modal-header blue">
              <div className="appm-modal-title">
                <Play size={18} />
                <div>
                  <strong>START APPLICATION METERING</strong>
                  <span>Create a metering job for the selected folder, device or package scope</span>
                </div>
              </div>
              <button type="button" className="appm-modal-close inverse" onClick={() => setShowMeteringModal(false)}><X size={16} /></button>
            </div>
            <div className="appm-modal-body">
              <div className="appm-form-grid two">
                <div className="appm-form-group">
                  <label>Target Scope</label>
                  <input value={selectedNode.label} readOnly />
                </div>
                <div className="appm-form-group">
                  <label>Metering Type</label>
                  <select value={meteringType} onChange={(event) => setMeteringType(event.target.value as "all" | "selected")}>
                    <option value="all">All applications</option>
                    <option value="selected">Selected package</option>
                  </select>
                </div>
                <div className="appm-form-group">
                  <label>Package</label>
                  <select value={modalPackageId || selectedPackageId} onChange={(event) => { setModalPackageId(Number(event.target.value)); setMeteringType(Number(event.target.value) > 0 ? "selected" : "all"); }}>
                    <option value={0}>All packages</option>
                    {packages.map((pkg) => <option key={pkg.SW_Pkg_Idn} value={pkg.SW_Pkg_Idn}>{pkg.name}</option>)}
                  </select>
                </div>
                <div className="appm-form-group">
                  <label>Reporting Window</label>
                  <input value={`${startDate} → ${endDate}`} readOnly />
                </div>
              </div>
              <div className="appm-option-card">
                <input type="checkbox" checked readOnly />
                <div>
                  <strong>Include launch count and active duration</strong>
                  <span>Maps to the Application Metering job command and stores the command options in the job file.</span>
                </div>
              </div>
              <div className="appm-option-card">
                <input type="checkbox" checked readOnly />
                <div>
                  <strong>Create job destination automatically</strong>
                  <span>Folder and device targets are resolved by Object_Rel_Idn, Object_Root_Idn or Object_DeviceID.</span>
                </div>
              </div>
            </div>
            <div className="appm-modal-footer">
              <button type="button" className="soft-btn appm-btn link" onClick={() => setShowMeteringModal(false)}>Cancel</button>
              <button type="button" className="primary-btn appm-btn primary" disabled={loading.action} onClick={() => submitScopeMetering(selectedNode)}>
                {loading.action ? "Submitting..." : "Start Metering"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {toast ? (
        <div className={cx("appm-toast", `appm-toast-${toast.type}`)}>
          <div className="appm-toast-icon">{toast.type === "success" ? <CheckCircle size={20} /> : toast.type === "error" ? <AlertCircle size={20} /> : <Gauge size={20} />}</div>
          <div><strong>{toast.title}</strong><span>{toast.message}</span></div>
          <button type="button" onClick={() => setToast(null)}><X size={14} /></button>
        </div>
      ) : null}
    </main>
  );
}
