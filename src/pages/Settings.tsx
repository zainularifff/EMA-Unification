import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Eye, Pencil, Plus, RefreshCw, Save, Search, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import NotificationChannelsSettings from "../components/settings/NotificationChannelsSettings";
import { useAuth } from "../context/AuthContext";
import api, { unwrapArray } from "../services/apiClient";
import {
  accessControls as settingsAccessControls,
  auditLogs as settingsAuditLogs,
  devicePricing as settingsDevicePricing,
  incidentSettings as settingsIncidentConfig,
  moduleAccess as settingsModuleAccess,
  pcAgingRule as settingsPcAgingRule,
  resourcePlanning as settingsResourcePlanning,
  settingsRoles,
  settingsUsers,
} from "../services/settingsService";

type SectionKey = "roles" | "users" | "modules" | "access" | "incident" | "notification" | "softwarePolicy" | "audit" | "pricing" | "aging" | "policy" | "risk" | "resources";
type RoleStatus = "Active" | "Review" | "Locked" | "Inactive";
type ModalMode = "add" | "edit" | "delete";
type ToastTone = "success" | "info" | "warning" | "error";

type SettingsToastState = {
  id: number;
  tone: ToastTone;
  title: string;
  message: string;
} | null;


type ResourceEngineer = {
  id?: number | string;
  userID?: number | string;
  UserID?: number | string;
  userId?: number | string;
  UserId?: number | string;
  name?: string;
  username?: string;
  email?: string;
  role?: string;
  roleName?: string;
  RoleName?: string;
  roles?: string[];
  supportLevel?: string;
  department?: string;
  Department?: string;
  isOnLeave?: boolean;
  currentStatus?: string;
};

type ResourceSchedule = {
  Id?: number;
  id?: number;
  UserID?: number;
  UserId?: number;
  userID?: number;
  EngineerName?: string;
  engineerName?: string;
  name?: string;
  EngineerRole?: string;
  role?: string;
  Department?: string;
  department?: string;
  StartDate?: string;
  EndDate?: string;
  Status?: string;
  status?: string;
  Remarks?: string;
  remarks?: string;
  CreatedAt?: string | null;
  createdAt?: string | null;
  UpdatedAt?: string | null;
  updatedAt?: string | null;
  IsActive?: boolean;
  isActive?: boolean;
};

type ResourceScheduleForm = {
  UserID: string;
  StartDate: string;
  EndDate: string;
  Status: string;
  Remarks: string;
};

const RESOURCE_EMPTY_FORM: ResourceScheduleForm = {
  UserID: "",
  StartDate: "",
  EndDate: "",
  Status: "On Leave",
  Remarks: "",
};

function getResourceScheduleId(row: ResourceSchedule) {
  return Number(row.Id ?? row.id ?? 0);
}

function getResourceScheduleUserId(row: ResourceSchedule) {
  return String(row.UserID ?? row.UserId ?? row.userID ?? "");
}

function getResourceEngineerUserId(row: ResourceEngineer) {
  return String(row.userID ?? row.UserID ?? row.userId ?? row.UserId ?? row.id ?? "");
}

function getResourceEngineerName(row: ResourceEngineer) {
  return String(row.name || row.username || row.email || "").trim();
}

function getResourceEngineerRole(row: ResourceEngineer) {
  const roles = Array.isArray(row.roles) ? row.roles : [];
  return String(row.supportLevel || row.roleName || row.RoleName || row.role || roles[0] || "Support").trim();
}

function getResourceEngineerDepartment(row: ResourceEngineer) {
  return String(row.department || row.Department || "").trim();
}

function getResourceScheduleName(row: ResourceSchedule) {
  return String(row.EngineerName || row.engineerName || row.name || "").trim();
}

function getResourceScheduleRole(row: ResourceSchedule) {
  return String(row.EngineerRole || row.role || "").trim();
}

function getResourceScheduleDepartment(row: ResourceSchedule) {
  return String(row.Department || row.department || "").trim();
}

function getResourceScheduleStatus(row: ResourceSchedule) {
  return String(row.Status || row.status || "On Leave").trim();
}

function getResourceScheduleRemarks(row: ResourceSchedule) {
  return String(row.Remarks || row.remarks || "").trim();
}

function isResourceSupportEngineer(row: ResourceEngineer) {
  const roleText = [
    row.roleName,
    row.RoleName,
    row.role,
    row.supportLevel,
    ...(Array.isArray(row.roles) ? row.roles : []),
  ].join(" ").toLowerCase();

  return roleText.includes("support");
}


type SectionItem = {
  key: SectionKey;
  title: string;
  desc: string;
  tag: string;
  icon: IconName;
  count: number;
  scoreOne: string;
  scoreTwo: string;
  subtitle: string;
};

type IconName = "role" | "matrix" | "access" | "audit" | "price" | "aging" | "risk" | "user" | "incident" | "notification" | "software" | "policy" | "resource";

type UserAccess = {
  id?: number | string;
  userID?: number | string;
  username?: string;
  name: string;
  fullName?: string;
  email: string;
  role: string;
  roles?: string[];
  roleName?: string;
  status: RoleStatus;
  scope: string;
  accessScope?: string;
  department?: string;
  position?: string;
  phoneNo?: string;
  isActive?: boolean;
  requireMFA?: boolean;
  mfa?: boolean;
  accountLocked?: boolean;
  lockReason?: string;
  accessStartDate?: string | null;
  accessEndDate?: string | null;
  lastLoginAt?: string | null;
  passwordChangedAt?: string | null;
  password?: string;
  confirmPassword?: string;
  loginFailCount?: number;
  remarks?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type UserApiRow = Partial<UserAccess> & {
  id?: number | string;
  userID?: number | string;
  UserID?: number | string;
  Username?: string;
  FullName?: string;
  Email?: string;
  RoleName?: string;
  AccessScope?: string;
  Status?: string;
  Department?: string;
  Position?: string;
  PhoneNo?: string;
  RequireMFA?: boolean | number;
  AccountLocked?: boolean | number;
  LockReason?: string;
  AccessStartDate?: string | null;
  AccessEndDate?: string | null;
  LastLoginAt?: string | null;
  PasswordChangedAt?: string | null;
  LoginFailCount?: number;
  Remarks?: string;
  CreatedAt?: string | null;
  UpdatedAt?: string | null;
};

type UsersApiResponse = {
  success?: boolean;
  message?: string;
  data?: UserApiRow[];
};

type AccessRole = {
  id?: number | string;
  roleID?: number | string;
  roleKey: string;
  name: string;
  description: string;
  type: string;
  defaultAccess: string;
  approvalRequired: boolean;
  status: RoleStatus;
  isSystemRole?: boolean;
  assignedUsers?: number;
  permissions?: Record<string, unknown>;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type RoleApiRow = Partial<AccessRole> & {
  RoleID?: number | string;
  RoleKey?: string;
  RoleName?: string;
  Name?: string;
  Description?: string;
  RoleType?: string;
  DefaultAccess?: string;
  ApprovalRequired?: boolean | number;
  Status?: string;
  IsSystemRole?: boolean | number;
  AssignedUsers?: number;
  Permissions?: Record<string, unknown> | string;
  CreatedAt?: string | null;
  UpdatedAt?: string | null;
};

type RolesApiResponse = {
  success?: boolean;
  message?: string;
  data?: RoleApiRow[] | RoleApiRow;
};

type ModuleRole = {
  key: string;
  name: string;
  type: string;
  desc: string;
  defaultAccess: string;
  approval: string;
};

type ModuleAccess = {
  module: string;
  access: number[];
};

type ModuleControlModule = {
  id?: number | string;
  moduleID?: number | string;
  parentModuleID?: number | string | null;
  moduleKey: string;
  moduleName: string;
  description: string;
  category?: string;
  routePath?: string;
  isActive?: boolean;
  sortOrder?: number;
};

type ModulePermission = {
  roleID: number | string;
  moduleID: number | string;
  canView: boolean;
};

type ModuleAccessApiResponse = {
  success?: boolean;
  message?: string;
  data?: {
    roles?: RoleApiRow[];
    modules?: Record<string, unknown>[];
    permissions?: Record<string, unknown>[];
  };
};


type AccessPolicy = {
  id?: number | string;
  controlID?: number | string;
  policyKey: string;
  name: string;
  description: string;
  scope: string;
  enforcement: string;
  reviewCycle: string;
  status: "Active" | "Inactive";
  isSystemPolicy?: boolean;
  sortOrder?: number;
  updatedAt?: string | null;
};

type AccessPolicyApiRow = Partial<AccessPolicy> & {
  ControlID?: number | string;
  PolicyKey?: string;
  PolicyName?: string;
  Description?: string;
  Scope?: string;
  Enforcement?: string;
  ReviewCycle?: string;
  Status?: string;
  IsSystemPolicy?: boolean | number;
  SortOrder?: number;
  UpdatedAt?: string | null;
};

type AccessPoliciesApiResponse = {
  success?: boolean;
  message?: string;
  data?: AccessPolicyApiRow[] | AccessPolicyApiRow;
};

type AuditDateFilter = "all" | "today" | "7d" | "30d";

type AuditLog = {
  id?: number | string;
  timestamp: string;
  user: string;
  module: string;
  action: string;
  severity: string;
  details?: string;
};

type AuditLogApiRow = Partial<AuditLog> & {
  LogID?: number | string;
  CreatedAt?: string;
  UserName?: string;
  Module?: string;
  Action?: string;
  Severity?: string;
  Details?: string;
};

type AuditLogsApiResponse = {
  success?: boolean;
  message?: string;
  data?: AuditLogApiRow[];
  totalRecords?: number;
  totalPages?: number;
  page?: number;
  limit?: number;
};

type PricingRow = {
  id: string;
  PricingID?: number | null;
  Category: string;
  Brand: string;
  Model: string;
  Price: number;
  IsExcluded: boolean;
};

type PricingPayloadRow = {
  PricingID?: number | null;
  Category?: string;
  category?: string;
  Brand?: string;
  brand?: string;
  Model?: string;
  model?: string;
  Price?: number | string;
  price?: number | string;
  IsExcluded?: boolean | number;
  isExcluded?: boolean | number;
};

type PricingContentProps = {
  search: string;
  rows: PricingRow[];
  categoryOptions: string[];
  brandOptionsByCategory: Record<string, string[]>;
  modelOptionsByKey: Record<string, string[]>;
  loading: boolean;
  saving: boolean;
  savingRowId: string;
  error: string;
  onAdd: () => void;
  onChange: (id: string, patch: Partial<PricingRow>) => void;
  onSaveRow: (id: string) => void;
  onRequestDelete: (row: PricingRow) => void;
};


type PcAgingRule = {
  enabled: boolean;
  ageSource: string;
  healthyMaxYears: number;
  monitorMaxYears: number;
  agingMinYears: number;
  includeUnknownAge: boolean;
  replacementWindowMonths: number;
  notes: string;
};

type PcAgingApiResponse = {
  success?: boolean;
  message?: string;
  data?: {
    settingKey?: string;
    rule?: Partial<PcAgingRule>;
    updatedAt?: string | null;
  };
};

type SlaConfigRow = {
  id: number | string;
  priority: "P1" | "P2" | "P3" | "P4" | string;
  label: string;
  responseTimeMin: number;
  resolutionTimeHrs: number;
  escalationPolicy: string;
  isActive?: boolean;
};

type WorkingHourRow = {
  id: string;
  day: string;
  enabled: boolean;
  start: string;
  end: string;
  isRestDay?: boolean;
  sortOrder?: number;
};


type IncidentDetailSetupRow = {
  id: number | string;
  name: string;
  sortOrder?: number;
  isActive?: boolean;
};

type IncidentSubcategorySetupRow = {
  id: number | string;
  name: string;
  sortOrder?: number;
  isActive?: boolean;
  details: IncidentDetailSetupRow[];
};

type IncidentCategorySetupRow = {
  id: number | string;
  name: string;
  sortOrder?: number;
  isActive?: boolean;
  subcategories: IncidentSubcategorySetupRow[];
};

type IncidentConfigDeleteTarget =
  | { kind: "category"; category: IncidentCategorySetupRow }
  | { kind: "subcategory"; categoryId: number | string; subcategory: IncidentSubcategorySetupRow }
  | { kind: "detail"; categoryId: number | string; subcategoryId: number | string; detail: IncidentDetailSetupRow };

type ResourceDeleteTarget = { row: ResourceSchedule; scheduleId: number; engineerName: string };

type IncidentConfigMeta = {
  eyebrow: string;
  title: string;
  description: string;
  scoreOneLabel: string;
  scoreOne: string;
  scoreOneCaption: string;
  scoreTwoLabel: string;
  scoreTwo: string;
  scoreTwoCaption: string;
  commandTitle: string;
  commandDescription: string;
  saveLabel: string;
};

type IncidentConfigTab = "sla" | "workingHours" | "categories";

type IncidentConfigContentProps = {
  activeTab: IncidentConfigTab;
  meta: IncidentConfigMeta;
  slaRows: SlaConfigRow[];
  workingHours: WorkingHourRow[];
  categories: IncidentCategorySetupRow[];
  selectedCategoryId: string;
  selectedSubcategoryId: string;
  newCategoryName: string;
  newSubcategoryName: string;
  newDetailName: string;
  categorySavingKey: string;
  loading: boolean;
  saving: boolean;
  error: string;
  onTabChange: (tab: IncidentConfigTab) => void;
  onReload: () => void;
  onSlaChange: (id: number | string, patch: Partial<SlaConfigRow>) => void;
  onWorkingHourChange: (id: string, patch: Partial<WorkingHourRow>) => void;
  onSelectCategory: (id: string) => void;
  onSelectSubcategory: (id: string) => void;
  onNewCategoryNameChange: (value: string) => void;
  onNewSubcategoryNameChange: (value: string) => void;
  onNewDetailNameChange: (value: string) => void;
  onCategoryNameChange: (id: number | string, value: string) => void;
  onSubcategoryNameChange: (categoryId: number | string, subcategoryId: number | string, value: string) => void;
  onDetailNameChange: (categoryId: number | string, subcategoryId: number | string, detailId: number | string, value: string) => void;
  onAddCategory: () => void;
  onUpdateCategory: (category: IncidentCategorySetupRow) => void;
  onDeactivateCategory: (category: IncidentCategorySetupRow) => void;
  onDeleteCategory: (category: IncidentCategorySetupRow) => void;
  onAddSubcategory: () => void;
  onUpdateSubcategory: (categoryId: number | string, subcategory: IncidentSubcategorySetupRow) => void;
  onDeactivateSubcategory: (categoryId: number | string, subcategory: IncidentSubcategorySetupRow) => void;
  onDeleteSubcategory: (categoryId: number | string, subcategory: IncidentSubcategorySetupRow) => void;
  onAddDetail: () => void;
  onUpdateDetail: (categoryId: number | string, subcategoryId: number | string, detail: IncidentDetailSetupRow) => void;
  onDeactivateDetail: (categoryId: number | string, subcategoryId: number | string, detail: IncidentDetailSetupRow) => void;
  onDeleteDetail: (categoryId: number | string, subcategoryId: number | string, detail: IncidentDetailSetupRow) => void;
  onSave: () => void;
};

type AgingContentProps = {
  rule: PcAgingRule;
  loading: boolean;
  saving: boolean;
  error: string;
  onChange: (patch: Partial<PcAgingRule>) => void;
  onReload: () => void;
  onSave: () => void;
  onReset: () => void;
};

type ManagementPolicyValues = Record<string, number>;

type ManagementPolicyProfile = {
  profileID?: number | string;
  profileKey?: string;
  profileName?: string;
  scopeType?: string;
  scopeKey?: string;
  isDefault?: boolean;
  isActive?: boolean;
  updatedAt?: string | null;
};

type ManagementPolicyApiResponse = {
  success?: boolean;
  message?: string;
  data?: {
    profile?: ManagementPolicyProfile;
    values?: ManagementPolicyValues;
    updatedAt?: string | null;
  };
};

type ManagementPolicyField = {
  key: string;
  group: string;
  label: string;
  description: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  displayScale?: number;
};

type ManagementPolicyContentProps = {
  values: ManagementPolicyValues;
  profile: ManagementPolicyProfile | null;
  loading: boolean;
  saving: boolean;
  error: string;
  onChange: (key: string, value: number) => void;
  onReload: () => void;
  onReset: () => void;
  onSave: () => void;
};


const DEFAULT_SLA_CONFIGS: SlaConfigRow[] = [
  { id: 1, priority: "P1", label: "Critical", responseTimeMin: 15, resolutionTimeHrs: 4, escalationPolicy: "Immediate escalation to L2/L3 support and IT manager." },
  { id: 2, priority: "P2", label: "High", responseTimeMin: 30, resolutionTimeHrs: 8, escalationPolicy: "Escalate to L2 support if no progress within response target." },
  { id: 3, priority: "P3", label: "Medium", responseTimeMin: 60, resolutionTimeHrs: 24, escalationPolicy: "Review during operational follow-up and escalate when required." },
  { id: 4, priority: "P4", label: "Low", responseTimeMin: 120, resolutionTimeHrs: 48, escalationPolicy: "Handle during normal support queue review." },
];

const DEFAULT_WORKING_HOURS: WorkingHourRow[] = [
  { id: "Monday", day: "Monday", enabled: true, start: "09:00", end: "18:00", sortOrder: 1 },
  { id: "Tuesday", day: "Tuesday", enabled: true, start: "09:00", end: "18:00", sortOrder: 2 },
  { id: "Wednesday", day: "Wednesday", enabled: true, start: "09:00", end: "18:00", sortOrder: 3 },
  { id: "Thursday", day: "Thursday", enabled: true, start: "09:00", end: "18:00", sortOrder: 4 },
  { id: "Friday", day: "Friday", enabled: true, start: "09:00", end: "18:00", sortOrder: 5 },
  { id: "Saturday", day: "Saturday", enabled: false, start: "09:00", end: "18:00", sortOrder: 6 },
  { id: "Sunday", day: "Sunday", enabled: false, start: "09:00", end: "18:00", sortOrder: 7 },
];

const sections: Record<SectionKey, SectionItem> = {
  roles: {
    key: "roles",
    title: "Role Based Control",
    desc: "Manage standard permission groups for management, operation, support and audit users.",
    tag: "Access Governance",
    icon: "role",
    count: 5,
    scoreOne: "5",
    scoreTwo: "32",
    subtitle: "Permission groups",
  },
  users: {
    key: "users",
    title: "User Access Management",
    desc: "Add new users, update existing user access, delete access and control account status.",
    tag: "User Access CRUD",
    icon: "user",
    count: 6,
    scoreOne: "6",
    scoreTwo: "3",
    subtitle: "User accounts",
  },
  modules: {
    key: "modules",
    title: "Module Control by Role",
    desc: "Control module access for each role across dashboard, EMA, service desk, report and setting areas.",
    tag: "Module Governance",
    icon: "matrix",
    count: 8,
    scoreOne: "8",
    scoreTwo: "5",
    subtitle: "Modules",
  },
  access: {
    key: "access",
    title: "Access Control",
    desc: "Define login policy, MFA, session timeout, IP restrictions and approval workflow.",
    tag: "Security Control",
    icon: "access",
    count: 6,
    scoreOne: "6",
    scoreTwo: "2FA",
    subtitle: "Policies",
  },
  incident: {
    key: "incident",
    title: "Incident Config",
    desc: "Configure Service Desk SLA rules and working hours used to calculate incident due dates.",
    tag: "Service Desk Config",
    icon: "incident",
    count: 2,
    scoreOne: "4",
    scoreTwo: "7",
    subtitle: "SLA rules",
  },
  notification: {
    key: "notification",
    title: "Notification Channels",
    desc: "Configure WhatsApp, email, templates and alert rules used by EMA notification workflow.",
    tag: "Notification Config",
    icon: "notification",
    count: 3,
    scoreOne: "WA",
    scoreTwo: "Email",
    subtitle: "Channels",
  },
  softwarePolicy: {
    key: "softwarePolicy",
    title: "Software Registry",
    desc: "Register software classification, license quantity, expiry date, cost and utilization rules for dashboard governance.",
    tag: "Software Policy",
    icon: "software",
    count: 4,
    scoreOne: "Legal",
    scoreTwo: "ROI",
    subtitle: "Registry",
  },
  audit: {
    key: "audit",
    title: "Audit Log",
    desc: "Track role changes, login activities, setting changes, report generation and admin actions.",
    tag: "Audit Trail",
    icon: "audit",
    count: 128,
    scoreOne: "128",
    scoreTwo: "12",
    subtitle: "Events",
  },
  pricing: {
    key: "pricing",
    title: "Device Pricing",
    desc: "Set device pricing assumptions used for cost impact, asset replacement and risk-driven costing.",
    tag: "Cost Configuration",
    icon: "price",
    count: 4,
    scoreOne: "MYR",
    scoreTwo: "4",
    subtitle: "Pricing groups",
  },
  aging: {
    key: "aging",
    title: "Aging PC Rule",
    desc: "Define how many years before a device is classified as standard, aging, critical or replacement candidate.",
    tag: "Lifecycle Rule",
    icon: "aging",
    count: 5,
    scoreOne: "5",
    scoreTwo: "7",
    subtitle: "Years threshold",
  },
  policy: {
    key: "policy",
    title: "Management Policy",
    desc: "Configure dashboard risk, exposure, saving and evidence assumptions by policy instead of hardcoded backend values.",
    tag: "Dashboard Policy",
    icon: "policy",
    count: 24,
    scoreOne: "24",
    scoreTwo: "Global",
    subtitle: "Policy rules",
  },
  risk: {
    key: "risk",
    title: "Risk Identifier & Level",
    desc: "Configure risk identifiers, scoring rules and level boundaries for dashboard and report output.",
    tag: "Risk Engine",
    icon: "risk",
    count: 6,
    scoreOne: "6",
    scoreTwo: "80+",
    subtitle: "Risk rules",
  },
  resources: {
    key: "resources",
    title: "Resource Planning",
    desc: "Plan engineer leave and keep Service Desk assignment transparent by using EMA user roles only.",
    tag: "Engineer Planning",
    icon: "resource",
    count: 3,
    scoreOne: "0",
    scoreTwo: "0",
    subtitle: "Leave schedules",
  },
};

const sectionOrder: SectionKey[] = ["roles", "users", "modules", "access", "incident", "notification", "softwarePolicy", "audit", "pricing", "aging", "policy", "resources"];


const SETTINGS_SECTION_MODULE_KEYS: Record<SectionKey, string> = {
  roles: "settings.rbac",
  users: "settings.user_access",
  modules: "settings.module_control",
  access: "settings.access_control",
  incident: "settings.incident_config",
  notification: "settings.notification_channels",
  softwarePolicy: "settings.software_policy",
  audit: "settings.audit_log",
  pricing: "settings.device_pricing",
  aging: "settings.aging_pc_rule",
  policy: "settings.management_policy",
  risk: "settings.risk_identifier",
  resources: "settings.resource_planning",
};

type SettingsPermissionRow = {
  moduleKey: string;
  moduleName: string;
  routePath: string;
  canView: boolean;
};

type SettingsAccessInfo = {
  rows: SettingsPermissionRow[];
  hasRows: boolean;
  hasSpecificSettingsRows: boolean;
};

function normalizeRbacText(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeRbacRoute(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const withSlash = text.startsWith("/") ? text : `/${text}`;
  return withSlash.replace(/\/+$/, "").toLowerCase() || "/";
}

function readStoredRbacJson(key: string) {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readRbacBoolean(value: unknown, fallback = true) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const text = normalizeRbacText(value);
  if (["true", "1", "yes", "y", "on", "allow", "allowed", "view"].includes(text)) return true;
  if (["false", "0", "no", "n", "off", "deny", "denied", "blocked"].includes(text)) return false;
  return fallback;
}

function rowLooksLikePermission(row: Record<string, unknown>) {
  return (
    row.moduleKey !== undefined ||
    row.ModuleKey !== undefined ||
    row.moduleName !== undefined ||
    row.ModuleName !== undefined ||
    row.routePath !== undefined ||
    row.RoutePath !== undefined ||
    row.canView !== undefined ||
    row.CanView !== undefined ||
    row.isAllowed !== undefined ||
    row.IsAllowed !== undefined ||
    row.allowed !== undefined ||
    row.Allowed !== undefined
  );
}

function makeSettingsPermissionRow(row: Record<string, unknown>): SettingsPermissionRow | null {
  const moduleKey = normalizeRbacText(row.moduleKey ?? row.ModuleKey ?? row.key ?? row.Key);
  const moduleName = normalizeRbacText(row.moduleName ?? row.ModuleName ?? row.name ?? row.Name);
  const routePath = normalizeRbacRoute(row.routePath ?? row.RoutePath ?? row.path ?? row.Path);

  if (!moduleKey && !moduleName && !routePath) return null;

  return {
    moduleKey,
    moduleName,
    routePath,
    canView: readRbacBoolean(
      row.canView ??
        row.CanView ??
        row.isAllowed ??
        row.IsAllowed ??
        row.allowed ??
        row.Allowed ??
        row.hasAccess ??
        row.HasAccess,
      true
    ),
  };
}

function collectSettingsPermissionRows(input: unknown, output: SettingsPermissionRow[] = [], seen = new WeakSet<object>()) {
  if (!input) return output;

  if (Array.isArray(input)) {
    input.forEach((item) => collectSettingsPermissionRows(item, output, seen));
    return output;
  }

  if (typeof input !== "object") return output;
  const objectInput = input as Record<string, unknown>;
  if (seen.has(objectInput)) return output;
  seen.add(objectInput);

  // Support object-map permission shape: { "settings.rbac": true, "hardware": { canView: true } }
  Object.entries(objectInput).forEach(([key, value]) => {
    const normalizedKey = normalizeRbacText(key);
    if (!normalizedKey) return;

    const keyLooksLikeModule =
      normalizedKey === "settings" ||
      normalizedKey.startsWith("settings.") ||
      normalizedKey.startsWith("/") ||
      normalizedKey.includes("dashboard") ||
      normalizedKey.includes("hardware") ||
      normalizedKey.includes("software") ||
      normalizedKey.includes("service");

    if (!keyLooksLikeModule) return;

    if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
      output.push({ moduleKey: normalizedKey.startsWith("/") ? "" : normalizedKey, moduleName: "", routePath: normalizedKey.startsWith("/") ? normalizeRbacRoute(normalizedKey) : "", canView: readRbacBoolean(value, false) });
      return;
    }

    if (value && typeof value === "object") {
      const valueObject = value as Record<string, unknown>;
      output.push({
        moduleKey: normalizedKey.startsWith("/") ? normalizeRbacText(valueObject.moduleKey ?? valueObject.ModuleKey) : normalizedKey,
        moduleName: normalizeRbacText(valueObject.moduleName ?? valueObject.ModuleName ?? valueObject.name ?? valueObject.Name),
        routePath: normalizedKey.startsWith("/") ? normalizeRbacRoute(normalizedKey) : normalizeRbacRoute(valueObject.routePath ?? valueObject.RoutePath),
        canView: readRbacBoolean(valueObject.canView ?? valueObject.CanView ?? valueObject.isAllowed ?? valueObject.IsAllowed ?? valueObject.allowed ?? valueObject.Allowed, true),
      });
    }
  });

  if (rowLooksLikePermission(objectInput)) {
    const row = makeSettingsPermissionRow(objectInput);
    if (row) output.push(row);
  }

  [
    objectInput.permissions,
    objectInput.Permissions,
    objectInput.modulePermissions,
    objectInput.ModulePermissions,
    objectInput.rolePermissions,
    objectInput.RolePermissions,
    objectInput.menuPermissions,
    objectInput.MenuPermissions,
    objectInput.modules,
    objectInput.Modules,
    objectInput.access,
    objectInput.Access,
    objectInput.routes,
    objectInput.Routes,
    objectInput.user,
    objectInput.User,
    objectInput.data,
    objectInput.Data,
  ].forEach((child) => collectSettingsPermissionRows(child, output, seen));

  return output;
}

function getSettingsAccessInfo(auth: unknown): SettingsAccessInfo {
  const sources = [
    auth,
    readStoredRbacJson("ema-auth"),
    readStoredRbacJson("ema-user"),
    readStoredRbacJson("accessUser"),
    readStoredRbacJson("user"),
    readStoredRbacJson("auth"),
  ];

  const dedup = new Map<string, SettingsPermissionRow>();
  collectSettingsPermissionRows(sources).forEach((row) => {
    const key = `${row.moduleKey}|${row.moduleName}|${row.routePath}`;
    if (!key.replace(/\|/g, "")) return;
    dedup.set(key, row);
  });

  const rows = Array.from(dedup.values());
  const hasSpecificSettingsRows = rows.some((row) => row.moduleKey.startsWith("settings."));

  return { rows, hasRows: rows.length > 0, hasSpecificSettingsRows };
}

function canViewSettingsSection(_sectionKey: SectionKey, access: SettingsAccessInfo) {
  // If login payload has no RBAC rows yet, fail open.
  if (!access.hasRows) return true;

  // Settings is enable/disable as a whole module — if any settings-related row
  // grants access (by key prefix, name, or /settings route), show all sections.
  return access.rows.some((row) => {
    if (!row.canView) return false;
    return (
      row.moduleKey === "settings" ||
      row.moduleKey.startsWith("settings") ||
      row.moduleName === "settings" ||
      row.moduleName.startsWith("settings") ||
      row.routePath === "/settings"
    );
  });
}

const defaultAccessRoles: AccessRole[] = [
  { roleKey: "system_administrator", name: "System Administrator", description: "Full configuration access including roles, settings, pricing and risk rules.", type: "Administrator", defaultAccess: "Full Access", approvalRequired: true, status: "Active", assignedUsers: 0 },
  { roleKey: "it_manager", name: "IT Manager", description: "Management dashboard, report approval and operational oversight.", type: "Management", defaultAccess: "Management Access", approvalRequired: true, status: "Active", assignedUsers: 0 },
  { roleKey: "it_operations", name: "IT Operations", description: "Endpoint monitoring, device registry and action queue operation.", type: "Operation", defaultAccess: "Operational Access", approvalRequired: false, status: "Active", assignedUsers: 0 },
  { roleKey: "service_desk", name: "Service Desk", description: "Ticket handling, remote session support and operational worklist.", type: "Support", defaultAccess: "Operational Access", approvalRequired: false, status: "Review", assignedUsers: 0 },
  { roleKey: "auditor_viewer", name: "Auditor / Viewer", description: "Read-only access for reports, audit log and compliance review.", type: "Audit / Viewer", defaultAccess: "Read Only", approvalRequired: true, status: "Active", assignedUsers: 0 },
];

const USER_ROLE_OPTIONS = defaultAccessRoles.map((role) => role.name);

function splitUserRoles(value?: string | string[] | null): string[] {
  if (Array.isArray(value)) {
    return value.map((role) => String(role).trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/[,|;]/)
    .map((role) => role.trim())
    .filter(Boolean);
}

function normalizeUserRoles(value?: string | string[] | null): string[] {
  return Array.from(new Set(splitUserRoles(value)));
}

function joinUserRoles(roles?: string[] | string | null): string {
  return normalizeUserRoles(roles).join(", ");
}

function hasUserRole(user: UserAccess, role: string): boolean {
  return normalizeUserRoles(user.roles || user.role || user.roleName).includes(role);
}

function boolFromRoleApi(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return ["true", "1", "yes", "y", "on"].includes(value.toLowerCase());
  return fallback;
}

function normalizeRoleStatus(value: unknown): RoleStatus {
  const text = String(value || "Active").trim().toLowerCase();
  return text === "inactive" ? "Inactive" : "Active";
}

function normalizeAccessRole(row: RoleApiRow): AccessRole {
  const name = String(row.name ?? row.RoleName ?? row.Name ?? "New Role").trim() || "New Role";
  const permissions = typeof row.permissions === "string" || typeof row.Permissions === "string"
    ? {}
    : (row.permissions ?? row.Permissions ?? {}) as Record<string, unknown>;

  return {
    id: row.id ?? row.RoleID ?? row.roleID,
    roleID: row.roleID ?? row.RoleID ?? row.id,
    roleKey: String(row.roleKey ?? row.RoleKey ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")).trim(),
    name,
    description: String(row.description ?? row.Description ?? "").trim(),
    type: String(row.type ?? row.RoleType ?? "Custom").trim() || "Custom",
    defaultAccess: String(row.defaultAccess ?? row.DefaultAccess ?? "Read Only").trim() || "Read Only",
    approvalRequired: boolFromRoleApi(row.approvalRequired ?? row.ApprovalRequired, false),
    status: normalizeRoleStatus(row.status ?? row.Status),
    isSystemRole: boolFromRoleApi(row.isSystemRole ?? row.IsSystemRole, false),
    assignedUsers: Number(row.assignedUsers ?? row.AssignedUsers ?? 0) || 0,
    permissions,
    createdAt: row.createdAt ?? row.CreatedAt ?? null,
    updatedAt: row.updatedAt ?? row.UpdatedAt ?? null,
  };
}

function normalizeRoleIdentity(role: Partial<AccessRole> | null | undefined): string {
  return `${role?.roleKey || ""} ${role?.name || ""}`.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function isProtectedSuperAdminRole(role: Partial<AccessRole> | null | undefined): boolean {
  const identity = normalizeRoleIdentity(role);
  return identity.includes("super_admin") || identity === "superadmin" || String(role?.name || "").trim().toLowerCase() === "super admin";
}

function getRoleSortPriority(role: AccessRole): number {
  if (isProtectedSuperAdminRole(role)) return 0;
  return 1;
}

function sortAccessRoles(roles: AccessRole[]): AccessRole[] {
  const order: Record<RoleStatus, number> = { Active: 0, Review: 1, Locked: 2, Inactive: 3 };
  return [...roles].sort((a, b) => {
    const protectedDiff = getRoleSortPriority(a) - getRoleSortPriority(b);
    if (protectedDiff !== 0) return protectedDiff;
    const statusDiff = order[a.status] - order[b.status];
    if (statusDiff !== 0) return statusDiff;
    return a.name.localeCompare(b.name);
  });
}

function normalizeModuleRow(row: Record<string, unknown> = {}): ModuleControlModule {
  const moduleName = String(row.moduleName ?? row.ModuleName ?? row.name ?? row.Name ?? "Untitled Module").trim() || "Untitled Module";
  return {
    id: row.id as number | string | undefined ?? row.moduleID as number | string | undefined ?? row.ModuleID as number | string | undefined,
    moduleID: row.moduleID as number | string | undefined ?? row.ModuleID as number | string | undefined ?? row.id as number | string | undefined,
    moduleKey: String(row.moduleKey ?? row.ModuleKey ?? moduleName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")).trim(),
    moduleName,
    description: String(row.description ?? row.Description ?? "").trim(),
    category: String(row.category ?? row.Category ?? row.moduleGroup ?? row.ModuleGroup ?? "").trim(),
    routePath: String(row.routePath ?? row.RoutePath ?? "").trim(),
    parentModuleID: row.parentModuleID as number | string | null | undefined ?? row.ParentModuleID as number | string | null | undefined ?? null,
    isActive: boolFromApi(row.isActive ?? row.IsActive, true),
    sortOrder: Number(row.sortOrder ?? row.SortOrder ?? 0) || 0,
  };
}

function normalizeModulePermission(row: Record<string, unknown> = {}): ModulePermission {
  return {
    roleID: row.roleID as number | string ?? row.RoleID as number | string ?? "",
    moduleID: row.moduleID as number | string ?? row.ModuleID as number | string ?? "",
    canView: boolFromApi(row.canView ?? row.CanView, false),
  };
}

function normalizeAccessPolicy(row: AccessPolicyApiRow = {}): AccessPolicy {
  const name = String(row.name ?? row.PolicyName ?? "Access Policy").trim() || "Access Policy";
  return {
    id: row.id ?? row.controlID ?? row.ControlID,
    controlID: row.controlID ?? row.ControlID ?? row.id,
    policyKey: String(row.policyKey ?? row.PolicyKey ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")).trim(),
    name,
    description: String(row.description ?? row.Description ?? "").trim(),
    scope: String(row.scope ?? row.Scope ?? "All Users").trim() || "All Users",
    enforcement: String(row.enforcement ?? row.Enforcement ?? "Mandatory").trim() || "Mandatory",
    reviewCycle: String(row.reviewCycle ?? row.ReviewCycle ?? "Quarterly").trim() || "Quarterly",
    status: String(row.status ?? row.Status ?? "Active").trim().toLowerCase() === "inactive" ? "Inactive" : "Active",
    isSystemPolicy: boolFromRoleApi(row.isSystemPolicy ?? row.IsSystemPolicy, false),
    sortOrder: Number(row.sortOrder ?? row.SortOrder ?? 0) || 0,
    updatedAt: row.updatedAt ?? row.UpdatedAt ?? null,
  };
}

function normalizeSlaConfigRow(row: Partial<SlaConfigRow> & Record<string, unknown> = {}, index = 0): SlaConfigRow {
  const fallback = DEFAULT_SLA_CONFIGS[index] || DEFAULT_SLA_CONFIGS[0];
  const priority = String(row.priority ?? row.Priority ?? fallback.priority).trim() || fallback.priority;

  return {
    id: (row.id as number | string | undefined) ?? (row.SlaConfigID as number | string | undefined) ?? (row.ConfigID as number | string | undefined) ?? fallback.id ?? priority,
    priority,
    label: String(row.label ?? row.Label ?? fallback.label).trim() || fallback.label,
    responseTimeMin: Number(row.responseTimeMin ?? row.ResponseTimeMin ?? fallback.responseTimeMin) || 0,
    resolutionTimeHrs: Number(row.resolutionTimeHrs ?? row.ResolutionTimeHrs ?? fallback.resolutionTimeHrs) || 0,
    escalationPolicy: String(row.escalationPolicy ?? row.EscalationPolicy ?? fallback.escalationPolicy ?? "").trim(),
    isActive: boolFromApi(row.isActive ?? row.IsActive, true),
  };
}

function normalizeWorkingHourRow(row: Partial<WorkingHourRow> & Record<string, unknown> = {}, index = 0): WorkingHourRow {
  const fallback = DEFAULT_WORKING_HOURS[index] || DEFAULT_WORKING_HOURS[0];
  const day = String(row.day ?? row.DayOfWeek ?? row.id ?? fallback.day).trim() || fallback.day;
  const isRestDay = boolFromApi(row.isRestDay ?? row.IsRestDay, !fallback.enabled);
  const enabled = row.enabled !== undefined || row.Enabled !== undefined
    ? boolFromApi(row.enabled ?? row.Enabled, fallback.enabled)
    : !isRestDay;

  return {
    id: String(row.id ?? row.DayOfWeek ?? day),
    day,
    enabled,
    start: String(row.start ?? row.StartTime ?? fallback.start ?? "09:00").slice(0, 5),
    end: String(row.end ?? row.EndTime ?? fallback.end ?? "18:00").slice(0, 5),
    isRestDay: !enabled,
    sortOrder: Number(row.sortOrder ?? row.SortOrder ?? fallback.sortOrder ?? index + 1) || index + 1,
  };
}

function sortSlaConfigs(rows: SlaConfigRow[]): SlaConfigRow[] {
  const order = ["P1", "P2", "P3", "P4"];
  return [...rows].sort((a, b) => order.indexOf(String(a.priority)) - order.indexOf(String(b.priority)));
}

function sortWorkingHours(rows: WorkingHourRow[]): WorkingHourRow[] {
  return [...rows].sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
}


function getIncidentSetupId(row: Record<string, unknown>, fallback: string): string {
  return String(row.id ?? row.categoryID ?? row.CategoryID ?? row.subcategoryID ?? row.SubcategoryID ?? row.detailID ?? row.DetailID ?? fallback);
}

function normalizeIncidentDetailRow(row: Record<string, unknown> = {}, index = 0): IncidentDetailSetupRow {
  const name = String(row.name ?? row.Name ?? row.detailName ?? row.DetailName ?? row.incidentDetail ?? row.IncidentDetail ?? `Incident Detail ${index + 1}`).trim();
  return {
    id: getIncidentSetupId(row, `detail-${index}-${name || Date.now()}`),
    name: name || `Incident Detail ${index + 1}`,
    sortOrder: Number(row.sortOrder ?? row.SortOrder ?? index + 1) || index + 1,
    isActive: boolFromApi(row.isActive ?? row.IsActive, true),
  };
}

function normalizeIncidentSubcategoryRow(row: Record<string, unknown> = {}, index = 0): IncidentSubcategorySetupRow {
  const name = String(row.name ?? row.Name ?? row.subcategoryName ?? row.SubcategoryName ?? `Subcategory ${index + 1}`).trim();
  const detailsSource = Array.isArray(row.details) ? row.details : Array.isArray(row.Details) ? row.Details : Array.isArray(row.incidentDetails) ? row.incidentDetails : Array.isArray(row.IncidentDetails) ? row.IncidentDetails : [];
  return {
    id: getIncidentSetupId(row, `subcategory-${index}-${name || Date.now()}`),
    name: name || `Subcategory ${index + 1}`,
    sortOrder: Number(row.sortOrder ?? row.SortOrder ?? index + 1) || index + 1,
    isActive: boolFromApi(row.isActive ?? row.IsActive, true),
    details: detailsSource.map((detail, detailIndex) => normalizeIncidentDetailRow((detail || {}) as Record<string, unknown>, detailIndex)).sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)),
  };
}

function normalizeIncidentCategoryRow(row: Record<string, unknown> = {}, index = 0): IncidentCategorySetupRow {
  const name = String(row.name ?? row.Name ?? row.categoryName ?? row.CategoryName ?? `Category ${index + 1}`).trim();
  const subcategoriesSource = Array.isArray(row.subcategories) ? row.subcategories : Array.isArray(row.Subcategories) ? row.Subcategories : Array.isArray(row.children) ? row.children : [];
  return {
    id: getIncidentSetupId(row, `category-${index}-${name || Date.now()}`),
    name: name || `Category ${index + 1}`,
    sortOrder: Number(row.sortOrder ?? row.SortOrder ?? index + 1) || index + 1,
    isActive: boolFromApi(row.isActive ?? row.IsActive, true),
    subcategories: subcategoriesSource.map((subcategory, subcategoryIndex) => normalizeIncidentSubcategoryRow((subcategory || {}) as Record<string, unknown>, subcategoryIndex)).sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)),
  };
}

function normalizeIncidentCategories(rows: unknown[]): IncidentCategorySetupRow[] {
  return rows
    .map((row, index) => normalizeIncidentCategoryRow((row || {}) as Record<string, unknown>, index))
    .filter((category) => category.isActive !== false)
    .sort((a, b) => (Number(a.sortOrder || 0) - Number(b.sortOrder || 0)) || a.name.localeCompare(b.name));
}

function getIncidentCategoryCounts(categories: IncidentCategorySetupRow[]) {
  const subcategoryCount = categories.reduce((total, category) => total + category.subcategories.filter((item) => item.isActive !== false).length, 0);
  const detailCount = categories.reduce((total, category) => total + category.subcategories.reduce((subTotal, subcategory) => subTotal + subcategory.details.filter((item) => item.isActive !== false).length, 0), 0);
  return { categoryCount: categories.length, subcategoryCount, detailCount };
}

function getIncidentConfigMeta(activeTab: IncidentConfigTab, slaRows: SlaConfigRow[], workingHours: WorkingHourRow[], categories: IncidentCategorySetupRow[]): IncidentConfigMeta {
  const workingDayCount = workingHours.filter((day) => day.enabled).length;
  const restDayCount = workingHours.filter((day) => !day.enabled).length;
  const categoryCounts = getIncidentCategoryCounts(categories);

  if (activeTab === "workingHours") {
    return {
      eyebrow: "INCIDENT CONFIG",
      title: "Working Hours Setup",
      description: "Configure the working days and time windows used by Service Desk when calculating SLA due dates.",
      scoreOneLabel: "WORKING DAYS",
      scoreOne: String(workingDayCount),
      scoreOneCaption: "Enabled days",
      scoreTwoLabel: "REST DAYS",
      scoreTwo: String(restDayCount),
      scoreTwoCaption: "Excluded from SLA",
      commandTitle: "Working Hours",
      commandDescription: "These values control when the SLA timer is counted for incident due date calculation.",
      saveLabel: "Save Working Hours",
    };
  }

  if (activeTab === "categories") {
    return {
      eyebrow: "INCIDENT CONFIG",
      title: "Category Setup",
      description: "Configure the incident category, subcategory and detail options used in the Service Desk form and filters.",
      scoreOneLabel: "CATEGORIES",
      scoreOne: String(categoryCounts.categoryCount),
      scoreOneCaption: "Main groups",
      scoreTwoLabel: "DETAILS",
      scoreTwo: String(categoryCounts.detailCount),
      scoreTwoCaption: `${categoryCounts.subcategoryCount} subcategories`,
      commandTitle: "Category Setup",
      commandDescription: "These values populate the Category, Subcategory and Incident Detail dropdowns in Service Desk.",
      saveLabel: "Saved per item",
    };
  }

  return {
    eyebrow: "INCIDENT CONFIG",
    title: "SLA Rules Setup",
    description: "Configure priority-based response and resolution targets used by Service Desk to calculate SLA due dates.",
    scoreOneLabel: "SLA RULES",
    scoreOne: String(slaRows.length),
    scoreOneCaption: "Priority rules",
    scoreTwoLabel: "RESOLUTION HRS",
    scoreTwo: String(slaRows.reduce((total, row) => total + Number(row.resolutionTimeHrs || 0), 0)),
    scoreTwoCaption: "Total target hours",
    commandTitle: "SLA Rules",
    commandDescription: "These values define Service Desk SLA priority labels, response time, resolution time and escalation notes.",
    saveLabel: "Save SLA Rules",
  };
}

function getAccessPolicyId(policy: AccessPolicy) {
  return policy.controlID ?? policy.id ?? policy.policyKey;
}

function sortAccessPolicies(policies: AccessPolicy[]): AccessPolicy[] {
  return [...policies].sort((a, b) => (Number(a.sortOrder || 0) - Number(b.sortOrder || 0)) || a.name.localeCompare(b.name));
}

function getModuleId(module: ModuleControlModule) {
  return module.moduleID ?? module.id ?? module.moduleKey;
}

function getAccessRoleId(role: AccessRole) {
  return role.roleID ?? role.id ?? role.roleKey;
}

function hasModulePermission(permissions: ModulePermission[], module: ModuleControlModule, role: AccessRole) {
  const moduleId = String(getModuleId(module));
  const roleId = String(getAccessRoleId(role));
  return permissions.some((item) => String(item.moduleID) === moduleId && String(item.roleID) === roleId && item.canView);
}

const defaultUsers: UserAccess[] = [
  { name: "Zainul Ariffin", email: "zainul.ariffin@company.com", role: "System Administrator", status: "Active", scope: "All Modules" },
  { name: "Daniel", email: "daniel@company.com", role: "IT Manager", status: "Active", scope: "Dashboard + Reports" },
  { name: "Wani", email: "wani@company.com", role: "IT Operations", status: "Active", scope: "EMA + Dashboard" },
  { name: "Nabil", email: "nabil@company.com", role: "Service Desk", status: "Review", scope: "Service Desk + Remote" },
  { name: "Auditor User", email: "auditor@company.com", role: "Auditor / Viewer", status: "Active", scope: "Read Only" },
  { name: "Temporary Access", email: "temp.access@company.com", role: "Service Desk", status: "Locked", scope: "Service Desk + Remote" },
];

const defaultModuleRoles: ModuleRole[] = [
  { key: "admin", name: "Admin", type: "Administrator", desc: "Full system access", defaultAccess: "Full Access", approval: "Yes" },
  { key: "manager", name: "Manager", type: "Management", desc: "Management dashboard and report access", defaultAccess: "Management Access", approval: "Yes" },
  { key: "ops", name: "Ops", type: "Operation", desc: "Operational monitoring and device action", defaultAccess: "Operational Access", approval: "No" },
  { key: "service", name: "Service", type: "Support", desc: "Service desk and remote support access", defaultAccess: "Operational Access", approval: "No" },
  { key: "audit", name: "Audit", type: "Audit / Viewer", desc: "Read-only audit and report access", defaultAccess: "Read Only", approval: "Yes" },
];

const defaultModuleAccess: ModuleAccess[] = [
  { module: "Dashboard", access: [1, 1, 1, 0, 1] },
  { module: "EMA Operations", access: [1, 1, 1, 0, 0] },
  { module: "Service Desk", access: [1, 1, 0, 1, 0] },
  { module: "Report Center", access: [1, 1, 1, 0, 1] },
  { module: "Settings", access: [1, 0, 0, 0, 0] },
  { module: "Remote Control", access: [1, 0, 1, 1, 0] },
  { module: "Geolocation", access: [1, 1, 1, 0, 1] },
  { module: "Audit Log", access: [1, 1, 0, 0, 1] },
];

const policies = [
  ["Multi-Factor Authentication", "Require second factor for admin, manager and security-sensitive actions.", "Enabled", "policy-on"],
  ["Session Timeout", "Automatically end inactive sessions after defined period.", "Enabled", "policy-on"],
  ["IP / VPN Restriction", "Limit system access to approved network, VPN or company IP range.", "Review", "policy-off"],
  ["Approval for Critical Action", "Require reason and approval for lock, wipe, unlock and risk override.", "Enabled", "policy-on"],
  ["Password Rotation", "Force periodic password change or SSO policy alignment.", "Disabled", "policy-off"],
  ["Role Change Approval", "Role updates require approval and audit comment.", "Enabled", "policy-on"],
] as const;



const risks = [
  ["Low", "Informational or minor operational issue.", "0 - 39", "20%", "#2563eb"],
  ["Medium", "Requires operational review or follow-up.", "40 - 59", "48%", "#f59e0b"],
  ["High", "Requires management attention and action.", "60 - 79", "72%", "#fb7185"],
  ["Critical", "Immediate risk, compliance or security concern.", "80 - 100", "92%", "#e11d48"],
] as const;

function initials(name: string) {
  return (name || "UA")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function normalizeRoleKey(name: string) {
  return `${(name || "role").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")}_${Date.now().toString().slice(-4)}`;
}

function addAccessForRole(defaultAccess: string) {
  return defaultAccess === "Full Access" || defaultAccess === "Management Access" ? 1 : 0;
}

function readArrayPayload<T = unknown>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const objectPayload = payload as { data?: unknown; rows?: unknown; pricing?: unknown };
    if (Array.isArray(objectPayload.data)) return objectPayload.data as T[];
    if (Array.isArray(objectPayload.rows)) return objectPayload.rows as T[];
    if (Array.isArray(objectPayload.pricing)) return objectPayload.pricing as T[];
  }
  return [];
}

function normalizeUserStatus(value: unknown): RoleStatus {
  const status = String(value || "Active").trim();
  if (status === "Review" || status === "Locked" || status === "Inactive") return status;
  return "Active";
}

function boolFromApi(value: unknown, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const text = String(value).toLowerCase().trim();
  if (["true", "1", "yes", "y", "on"].includes(text)) return true;
  if (["false", "0", "no", "n", "off"].includes(text)) return false;
  return fallback;
}

function mapUserApiRow(row: UserApiRow = {}): UserAccess {
  const id = row.id ?? row.userID ?? row.UserID;
  const username = String(row.username ?? row.Username ?? "").trim();
  const fullName = String(row.fullName ?? row.name ?? row.FullName ?? username).trim();
  const status = normalizeUserStatus(row.status ?? row.Status);
  const requireMFA = boolFromApi(row.requireMFA ?? row.mfa ?? row.RequireMFA, false);
  const accountLocked = boolFromApi(row.accountLocked ?? row.AccountLocked, status === "Locked");

  const roles = normalizeUserRoles(row.roles || row.role || row.roleName || row.RoleName || "IT Operations");
  const roleName = joinUserRoles(roles);

  return {
    id,
    userID: row.userID ?? row.UserID ?? id,
    username,
    name: fullName || username || "Unnamed User",
    fullName: fullName || username || "Unnamed User",
    email: String(row.email ?? row.Email ?? "").trim(),
    role: roleName,
    roles,
    roleName,
    status: accountLocked ? "Locked" : status,
    scope: String(row.scope ?? row.accessScope ?? row.AccessScope ?? "EMA + Dashboard").trim() || "EMA + Dashboard",
    accessScope: String(row.accessScope ?? row.scope ?? row.AccessScope ?? "EMA + Dashboard").trim() || "EMA + Dashboard",
    department: String(row.department ?? row.Department ?? "").trim(),
    position: String(row.position ?? row.Position ?? "").trim(),
    phoneNo: String(row.phoneNo ?? row.PhoneNo ?? "").trim(),
    isActive: boolFromApi(row.isActive, status !== "Inactive"),
    requireMFA,
    mfa: requireMFA,
    accountLocked,
    lockReason: String(row.lockReason ?? row.LockReason ?? "").trim(),
    accessStartDate: row.accessStartDate ?? row.AccessStartDate ?? null,
    accessEndDate: row.accessEndDate ?? row.AccessEndDate ?? null,
    lastLoginAt: row.lastLoginAt ?? row.LastLoginAt ?? null,
    passwordChangedAt: row.passwordChangedAt ?? row.PasswordChangedAt ?? null,
    loginFailCount: Number(row.loginFailCount ?? row.LoginFailCount ?? 0) || 0,
    remarks: String(row.remarks ?? row.Remarks ?? "").trim(),
    createdAt: row.createdAt ?? row.CreatedAt ?? null,
    updatedAt: row.updatedAt ?? row.UpdatedAt ?? row.createdAt ?? row.CreatedAt ?? null,
  };
}

function formatUserUpdatedAt(value?: string | null) {
  if (!value) return "Not updated yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getUserCreatedTime(user: UserAccess) {
  const value = user.createdAt || user.updatedAt || null;
  if (value) {
    const time = new Date(value).getTime();
    if (!Number.isNaN(time)) return time;
  }
  const numericId = Number(user.id || user.userID || 0);
  return Number.isFinite(numericId) ? numericId : 0;
}

function sortUsersByCreatedDate(users: UserAccess[]) {
  return [...users].sort((a, b) => getUserCreatedTime(b) - getUserCreatedTime(a));
}

function formatUserDate(value?: string | null, fallback = "Never") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapAuditLogApiRow(row: AuditLogApiRow = {}): AuditLog {
  const timestamp = String(row.timestamp ?? row.CreatedAt ?? "").trim();
  return {
    id: row.id ?? row.LogID ?? `${timestamp}-${row.UserName || row.user || "system"}-${row.Action || row.action || "audit"}`,
    timestamp,
    user: String(row.user ?? row.UserName ?? "system").trim() || "system",
    module: String(row.module ?? row.Module ?? "Settings").trim() || "Settings",
    action: String(row.action ?? row.Action ?? "Audit event").trim() || "Audit event",
    severity: String(row.severity ?? row.Severity ?? "Info").trim() || "Info",
    details: String(row.details ?? row.Details ?? "").trim(),
  };
}

function getAuditTimestampMs(row: AuditLog) {
  const time = new Date(row.timestamp).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatAuditTimestamp(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const AUDIT_API_BASE = (((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL)
  || ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_API_URL)
  || "http://localhost:3001").replace(/\/$/, "");

function getStoredAuditToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("emaToken") ||
    ""
  );
}

async function auditApiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredAuditToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${AUDIT_API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const text = await response.text();
  let payload: any = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (parseError) {
      const isHtml = text.trim().toLowerCase().startsWith("<!doctype") || text.trim().toLowerCase().startsWith("<html");
      const hint = isHtml
        ? "Backend returned an HTML page instead of JSON. The API route is missing, the backend was not restarted, or the request is hitting the frontend dev server."
        : "Backend returned a non-JSON response.";
      throw new Error(`${hint} [${response.status} ${response.statusText}] ${AUDIT_API_BASE}${path}`);
    }
  }

  if (!response.ok) {
    const message = payload?.message || payload?.error || payload?.errorMessage || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}


async function managementPolicyApiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return auditApiRequest<T>(path, options);
}

function normalizeAuditSeverity(value: string) {
  const text = String(value || "Info").trim();
  const lower = text.toLowerCase();
  if (["success", "updated", "created", "exported", "info"].includes(lower)) return lower === "info" ? "Info" : text;
  if (["warning", "review", "locked"].includes(lower)) return text;
  if (["error", "failed", "critical", "danger"].includes(lower)) return text;
  return text || "Info";
}

function getAuditSeverityClass(value: string) {
  const key = String(value || "").toLowerCase();
  if (["success", "updated", "created", "exported"].some((item) => key.includes(item))) return "active";
  if (["warning", "review", "locked"].some((item) => key.includes(item))) return "review";
  if (["error", "failed", "critical", "danger"].some((item) => key.includes(item))) return "locked";
  return "info";
}

function filterAuditLogs(logs: AuditLog[], search: string, moduleFilter: string, severityFilter: string, dateFilter: AuditDateFilter) {
  const term = search.trim().toLowerCase();
  const moduleValue = moduleFilter.toLowerCase();
  const severityValue = severityFilter.toLowerCase();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

  return logs.filter((log) => {
    const haystack = `${log.timestamp} ${log.user} ${log.module} ${log.action} ${log.severity} ${log.details || ""}`.toLowerCase();
    if (term && !haystack.includes(term)) return false;
    if (moduleValue !== "all" && log.module.toLowerCase() !== moduleValue) return false;
    if (severityValue !== "all" && log.severity.toLowerCase() !== severityValue) return false;

    if (dateFilter !== "all") {
      const time = getAuditTimestampMs(log);
      if (!time) return false;
      if (dateFilter === "today" && time < startOfToday) return false;
      if (dateFilter === "7d" && time < sevenDaysAgo) return false;
      if (dateFilter === "30d" && time < thirtyDaysAgo) return false;
    }

    return true;
  });
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function makePricingRow(row?: PricingPayloadRow, index = 0): PricingRow {
  const pricingId = row?.PricingID ?? null;
  return {
    id: pricingId ? `pricing-${pricingId}` : `pricing-new-${Date.now()}-${index}`,
    PricingID: pricingId,
    Category: String(row?.Category ?? row?.category ?? "").trim(),
    Brand: String(row?.Brand ?? row?.brand ?? "").trim(),
    Model: String(row?.Model ?? row?.model ?? "").trim(),
    Price: Number(row?.Price ?? row?.price ?? 0) || 0,
    IsExcluded: Boolean(row?.IsExcluded ?? row?.isExcluded ?? false),
  };
}

function pricingModelKey(category: string, brand: string) {
  return `${category || "_"}::${brand || "_"}`;
}


const DEFAULT_PC_AGING_RULE: PcAgingRule = {
  enabled: true,
  ageSource: "RegDate",
  healthyMaxYears: 3,
  monitorMaxYears: 5,
  agingMinYears: 7,
  includeUnknownAge: false,
  replacementWindowMonths: 6,
  notes: "PC aging rule used for dashboard and replacement planning.",
};

const DEFAULT_MANAGEMENT_POLICY_VALUES: ManagementPolicyValues = {
  "risk.software.itemExposure": 150,
  "risk.network.itemExposure": 300,
  "risk.geo.itemExposure": 200,
  "saving.reuse.percent": 0.25,
  "saving.staleRecovery.perDevice": 250,
  "saving.pricingCleanup.perAsset": 250,
  "saving.identityCleanup.perAsset": 150,
  "saving.slaProductivity.perBreach": 500,
  "score.penalty.aging": 38,
  "score.penalty.monitor": 18,
  "score.penalty.offline": 22,
  "score.penalty.stale": 22,
  "score.penalty.missingIdentity": 12,
  "score.penalty.unpriced": 6,
  "score.risk.endpointThreshold": 35,
  "score.risk.mediumThreshold": 40,
  "score.risk.highThreshold": 70,
  "score.software.sensitive": 55,
  "score.software.unclassified": 30,
  "score.software.stale": 18,
  "score.network.unregistered": 42,
  "score.network.inactive": 16,
  "score.network.missingIp": 20,
  "score.geo.unknown": 35,
  "score.geo.stale": 32,
  "score.geo.missingCoordinate": 15,
  "telemetry.endpoint.staleDays": 14,
  "telemetry.software.staleDays": 45,
  "telemetry.geo.staleDays": 7,
};

const MANAGEMENT_POLICY_FIELDS: ManagementPolicyField[] = [
  { key: "risk.software.itemExposure", group: "Cost & Saving Assumptions", label: "Software risk exposure", description: "Estimated exposure for each risky software signal.", unit: "RM", min: 0, max: 100000, step: 10 },
  { key: "risk.network.itemExposure", group: "Cost & Saving Assumptions", label: "Network risk exposure", description: "Estimated exposure for each unmanaged or duplicate network signal.", unit: "RM", min: 0, max: 100000, step: 10 },
  { key: "risk.geo.itemExposure", group: "Cost & Saving Assumptions", label: "Geo risk exposure", description: "Estimated exposure for each stale, missing or unknown geolocation signal.", unit: "RM", min: 0, max: 100000, step: 10 },
  { key: "saving.reuse.percent", group: "Cost & Saving Assumptions", label: "Reuse saving percentage", description: "Percent of monitor-stage device value counted as avoidable spend.", unit: "%", min: 0, max: 100, step: 1, displayScale: 100 },
  { key: "saving.staleRecovery.perDevice", group: "Cost & Saving Assumptions", label: "Stale recovery estimate", description: "Estimated recovery opportunity for each stale endpoint record.", unit: "RM", min: 0, max: 100000, step: 10 },
  { key: "saving.pricingCleanup.perAsset", group: "Cost & Saving Assumptions", label: "Pricing cleanup estimate", description: "Estimated value for each asset missing pricing evidence.", unit: "RM", min: 0, max: 100000, step: 10 },
  { key: "saving.identityCleanup.perAsset", group: "Cost & Saving Assumptions", label: "Identity cleanup estimate", description: "Estimated value for each endpoint missing ownership/model/IP evidence.", unit: "RM", min: 0, max: 100000, step: 10 },
  { key: "saving.slaProductivity.perBreach", group: "Cost & Saving Assumptions", label: "SLA productivity cost", description: "Estimated service productivity loss per SLA breach candidate.", unit: "RM", min: 0, max: 100000, step: 10 },

  { key: "score.penalty.aging", group: "Endpoint Risk Scoring", label: "Aging device penalty", description: "Risk points added when a device crosses the aging threshold.", unit: "pts", min: 0, max: 100, step: 1 },
  { key: "score.penalty.monitor", group: "Endpoint Risk Scoring", label: "Monitor-stage penalty", description: "Risk points added when a device is in refresh watch / monitor stage.", unit: "pts", min: 0, max: 100, step: 1 },
  { key: "score.penalty.offline", group: "Endpoint Risk Scoring", label: "Offline penalty", description: "Risk points added when a device is currently offline.", unit: "pts", min: 0, max: 100, step: 1 },
  { key: "score.penalty.stale", group: "Endpoint Risk Scoring", label: "Stale telemetry penalty", description: "Risk points added when endpoint telemetry is older than policy freshness.", unit: "pts", min: 0, max: 100, step: 1 },
  { key: "score.penalty.missingIdentity", group: "Endpoint Risk Scoring", label: "Missing identity penalty", description: "Risk points added when name, owner, model or IP evidence is incomplete.", unit: "pts", min: 0, max: 100, step: 1 },
  { key: "score.penalty.unpriced", group: "Endpoint Risk Scoring", label: "Unpriced asset penalty", description: "Risk points added when no device pricing rule is available.", unit: "pts", min: 0, max: 100, step: 1 },
  { key: "score.risk.endpointThreshold", group: "Endpoint Risk Scoring", label: "Endpoint risk threshold", description: "Minimum endpoint score counted as management risk.", unit: "pts", min: 1, max: 100, step: 1 },
  { key: "score.risk.mediumThreshold", group: "Endpoint Risk Scoring", label: "Medium severity threshold", description: "Endpoint risk score where severity becomes medium.", unit: "pts", min: 1, max: 100, step: 1 },
  { key: "score.risk.highThreshold", group: "Endpoint Risk Scoring", label: "High severity threshold", description: "Endpoint risk score where severity becomes high.", unit: "pts", min: 1, max: 100, step: 1 },

  { key: "score.software.sensitive", group: "Domain Risk Scoring", label: "Sensitive software penalty", description: "Risk points for risky software names/categories such as remote admin or unauthorized tools.", unit: "pts", min: 0, max: 100, step: 1 },
  { key: "score.software.unclassified", group: "Domain Risk Scoring", label: "Unclassified software penalty", description: "Risk points for software without usable category evidence.", unit: "pts", min: 0, max: 100, step: 1 },
  { key: "score.software.stale", group: "Domain Risk Scoring", label: "Stale software penalty", description: "Risk points for old software inventory evidence.", unit: "pts", min: 0, max: 100, step: 1 },
  { key: "score.network.unregistered", group: "Domain Risk Scoring", label: "Unregistered network penalty", description: "Risk points for active network evidence not mapped to managed asset ownership.", unit: "pts", min: 0, max: 100, step: 1 },
  { key: "score.network.inactive", group: "Domain Risk Scoring", label: "Inactive network penalty", description: "Risk points for registered but inactive network evidence.", unit: "pts", min: 0, max: 100, step: 1 },
  { key: "score.network.missingIp", group: "Domain Risk Scoring", label: "Missing IP penalty", description: "Risk points when network row has weak IP evidence.", unit: "pts", min: 0, max: 100, step: 1 },
  { key: "score.geo.unknown", group: "Domain Risk Scoring", label: "Unknown location penalty", description: "Risk points for unknown or unable-to-fetch location evidence.", unit: "pts", min: 0, max: 100, step: 1 },
  { key: "score.geo.stale", group: "Domain Risk Scoring", label: "Stale location penalty", description: "Risk points for old geolocation evidence.", unit: "pts", min: 0, max: 100, step: 1 },
  { key: "score.geo.missingCoordinate", group: "Domain Risk Scoring", label: "Missing coordinate penalty", description: "Risk points when location exists but coordinates are missing.", unit: "pts", min: 0, max: 100, step: 1 },

  { key: "telemetry.endpoint.staleDays", group: "Evidence Freshness Policy", label: "Endpoint stale after", description: "Days before endpoint last connection is considered stale.", unit: "days", min: 1, max: 365, step: 1 },
  { key: "telemetry.software.staleDays", group: "Evidence Freshness Policy", label: "Software inventory stale after", description: "Days before software inventory evidence is considered stale.", unit: "days", min: 1, max: 365, step: 1 },
  { key: "telemetry.geo.staleDays", group: "Evidence Freshness Policy", label: "Geolocation stale after", description: "Days before geolocation evidence is considered stale.", unit: "days", min: 1, max: 365, step: 1 },
];

const MANAGEMENT_POLICY_GROUPS = Array.from(new Set(MANAGEMENT_POLICY_FIELDS.map((field) => field.group)));

function clampManagementPolicyValue(value: unknown, field: ManagementPolicyField) {
  const parsed = Number(value);
  const fallback = DEFAULT_MANAGEMENT_POLICY_VALUES[field.key] ?? 0;
  const normalized = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(field.max / (field.displayScale || 1), Math.max(field.min / (field.displayScale || 1), normalized));
}

function normalizeManagementPolicyValues(values: Partial<ManagementPolicyValues> = {}): ManagementPolicyValues {
  const normalized: ManagementPolicyValues = { ...DEFAULT_MANAGEMENT_POLICY_VALUES };
  for (const field of MANAGEMENT_POLICY_FIELDS) {
    normalized[field.key] = clampManagementPolicyValue(values[field.key], field);
  }
  return normalized;
}

function managementPolicyInputValue(values: ManagementPolicyValues, field: ManagementPolicyField) {
  const value = values[field.key] ?? DEFAULT_MANAGEMENT_POLICY_VALUES[field.key] ?? 0;
  const scaled = value * (field.displayScale || 1);
  return Number.isFinite(scaled) ? String(Number(scaled.toFixed(2)).toString()) : "0";
}

function formatManagementPolicyValue(values: ManagementPolicyValues, field: ManagementPolicyField) {
  const value = values[field.key] ?? DEFAULT_MANAGEMENT_POLICY_VALUES[field.key] ?? 0;
  const scaled = value * (field.displayScale || 1);
  const display = field.unit === "RM" ? Math.round(scaled).toLocaleString() : Number(scaled.toFixed(2)).toLocaleString();
  return field.unit === "RM" ? `RM ${display}` : `${display} ${field.unit}`;
}

const AGE_SOURCE_OPTIONS = [
  { value: "RegDate", label: "Registration Date" },
  { value: "HIUpdateTime", label: "Hardware Update Date" },
  { value: "ConnectionTime", label: "Last Connection Date" },
];

function clampPcAgingNumber(value: unknown, fallback: number, min = 1, max = 20) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function normalizePcAgingRule(rule: Partial<PcAgingRule> = {}): PcAgingRule {
  const allowedSources = new Set(AGE_SOURCE_OPTIONS.map((item) => item.value));
  const ageSource = allowedSources.has(String(rule.ageSource || "")) ? String(rule.ageSource) : DEFAULT_PC_AGING_RULE.ageSource;

  const healthyMaxYears = clampPcAgingNumber(rule.healthyMaxYears, DEFAULT_PC_AGING_RULE.healthyMaxYears);
  const monitorMaxYears = clampPcAgingNumber(rule.monitorMaxYears, DEFAULT_PC_AGING_RULE.monitorMaxYears);
  const agingMinYears = clampPcAgingNumber(rule.agingMinYears, DEFAULT_PC_AGING_RULE.agingMinYears);

  return {
    enabled: Boolean(rule.enabled ?? DEFAULT_PC_AGING_RULE.enabled),
    ageSource,
    healthyMaxYears,
    monitorMaxYears: Math.max(monitorMaxYears, healthyMaxYears),
    agingMinYears: Math.max(agingMinYears, monitorMaxYears),
    includeUnknownAge: Boolean(rule.includeUnknownAge ?? DEFAULT_PC_AGING_RULE.includeUnknownAge),
    replacementWindowMonths: clampPcAgingNumber(rule.replacementWindowMonths, DEFAULT_PC_AGING_RULE.replacementWindowMonths, 0, 36),
    notes: String(rule.notes ?? DEFAULT_PC_AGING_RULE.notes).trim(),
  };
}


// Software Registry merged from SettingsWithNotifications into the main Settings sidebar.
type Classification = "Legal"

type CategoryRow = { CategoryID: number; CategoryName: string };
type PublisherRow = { Publisher: string; SoftwareCount?: number; InstalledCount?: number };
type SoftwareRow = {
  SWUNI_Idn?: number | null;
  SoftwareID?: string;
  SoftwareName: string;
  CategoryID?: number | null;
  CategoryName?: string;
  Publisher?: string;
  Version?: string;
  InstalledCount?: number;
  InstalledDeviceCount?: number;
};
type PolicyRow = {
  PolicyID: number;
  PolicyName: string;
  Description?: string;
  CategoryID?: number | null;
  CategoryName?: string;
  WorkingStartTime?: string;
  WorkingEndTime?: string;
  WorkDays?: string;
  UtilizedHours?: number;
  UnderUtilizedHours?: number;
  OpenCountThreshold?: number;
  LegalCount?: number;
  IllegalCount?: number;
  TotalItems?: number;
  LicenseTotal?: number;
  UpdatedAt?: string;
  CreatedAt?: string;
};
type PolicyItem = SoftwareRow & {
  PolicyItemID: number;
  PolicyID: number;
  Classification: Classification;
  ComplianceStatus?: Classification;
  WorkingStartTime?: string;
  WorkingEndTime?: string;
  WorkDays?: string;
  UtilizedHours?: number;
  UnderUtilizedHours?: number;
  NotUsedHours?: number;
  OpenCountThreshold?: number;
  LicenseKey?: string;
  LicenseCount?: number;
  LicenseStartDate?: string;
  LicenseEndDate?: string;
  UnitPrice?: number;
  Currency?: string;
  Notes?: string;
};

type RuleForm = {
  policyName: string;
  description: string;
  categoryId: string;
  publisher: string;
  workingStartTime: string;
  workingEndTime: string;
  utilizedHours: string;
  underUtilizedHours: string;
  notUsedHours: string;
  openCountThreshold: string;
};

type SoftwareForm = {
  classification: Classification;
  licenseCount: string;
  licenseKey: string;
  licenseStartDate: string;
  licenseEndDate: string;
  unitPrice: string;
  currency: string;
};

const API_ROOT = "/api/settings/software-policy";

const EMPTY_RULE: RuleForm = {
  policyName: "",
  description: "",
  categoryId: "",
  publisher: "",
  workingStartTime: "09:00",
  workingEndTime: "17:00",
  utilizedHours: "2",
  underUtilizedHours: "1",
  notUsedHours: "0",
  openCountThreshold: "1",
};

const EMPTY_SOFTWARE_FORM: SoftwareForm = {
  classification: "Legal",
  licenseCount: "",
  licenseKey: "",
  licenseStartDate: "",
  licenseEndDate: "",
  unitPrice: "",
  currency: "RM",
};

const SETTINGS_SOFTWARE_POLICY_INLINE_CSS = `
.management-control-wrapper.settings-management-shell{height:100%;min-height:0;display:grid!important;grid-template-columns:292px minmax(0,1fr)!important;gap:12px!important;overflow:hidden!important;padding:0!important;background:transparent!important;border:0!important}.management-control-sidebar{height:100%;display:flex;flex-direction:column;overflow:hidden;border:1px solid #dbe7fb;border-radius:20px;background:#fff}.management-control-sidebar-head{padding:16px 18px;border-bottom:1px solid #e5edf8}.management-control-sidebar-head span,.sp-chip{display:block;color:#2563eb;font-size:.64rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.management-control-sidebar-head strong{display:block;margin-top:6px;color:#0f2746;font-size:1.02rem;font-weight:900}.management-control-sidebar-head small{display:block;margin-top:4px;color:#64748b;font-size:.72rem;font-weight:700}.management-control-nav-list{flex:1;display:grid;align-content:start;gap:8px;overflow:auto;padding:14px 12px}.management-control-nav-btn{width:100%;min-height:56px;display:grid;grid-template-columns:38px minmax(0,1fr);align-items:center;gap:12px;padding:10px 13px;border:0;border-radius:16px;background:transparent;color:#0f2746;text-align:left;font-weight:900}.management-control-nav-btn.active{color:#fff;background:linear-gradient(135deg,#2563eb,#087ea4)}.management-control-nav-icon{width:38px;height:38px;display:grid;place-items:center;border-radius:13px;color:#2563eb;background:#eef4ff}.management-control-nav-btn.active .management-control-nav-icon{color:#fff;background:rgba(255,255,255,.2)}.management-control-content,.management-legacy-content{min-height:0;height:100%;overflow:hidden}.management-legacy-content>.settings-module-root{height:100%!important;max-height:100%!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}.management-legacy-content .settings-layout{height:100%!important;grid-template-columns:1fr!important;padding:0!important}.management-legacy-content .settings-menu{display:none!important}.management-legacy-content .settings-content{height:100%!important;min-height:0!important}
.software-policy-module{height:100%;min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr);gap:12px;color:#0f2746;overflow:hidden}.software-policy-module *{box-sizing:border-box}.sp-top,.sp-section{border:1px solid #dbe7fb;border-radius:20px;background:#fff;box-shadow:0 14px 30px rgba(15,23,42,.045)}.sp-top{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 18px}.sp-top h2{margin:3px 0;color:#0f2746;font-weight:950;letter-spacing:-.04em}.sp-top p,.sp-help{margin:0;color:#64748b;font-size:.74rem;font-weight:700;line-height:1.45}.sp-btn,.sp-icon,.sp-danger{min-height:40px;display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:12px;font-size:.76rem;font-weight:900;cursor:pointer}.sp-btn.primary{border:0;color:#fff;background:linear-gradient(135deg,#2563eb,#087ea4);padding:0 16px}.sp-btn.secondary{border:1px solid #d7e3f5;background:#fff;color:#2563eb;padding:0 16px}.sp-icon{width:40px;border:1px solid #d7e3f5;background:#fff;color:#2563eb}.sp-danger{width:40px;border:1px solid #fecaca;background:#fff1f2;color:#dc2626}.sp-btn:disabled,.sp-icon:disabled{opacity:.55;cursor:not-allowed}.sp-work{min-height:0;overflow:auto}.sp-section{overflow:hidden}.sp-section-title{padding:12px 14px;border-bottom:1px solid #eef3fb}.sp-section-title strong{display:block;color:#0f2746;font-size:.84rem;font-weight:900}.sp-section-title small{display:block;margin-top:2px;color:#64748b;font-size:.68rem;font-weight:700}.sp-section-body{padding:14px;min-height:0}.sp-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.sp-field{display:grid;gap:6px}.sp-field.full{grid-column:1/-1}.sp-field span{color:#64748b;font-size:.62rem;font-weight:900;text-transform:uppercase}.sp-field input,.sp-field select,.sp-field textarea,.sp-search input{width:100%;min-height:40px;border:1px solid #d7e3f5;border-radius:12px;background:#fff;color:#0f2746;padding:0 12px;font-size:.78rem;font-weight:750;outline:none}.sp-field textarea{min-height:78px;padding:10px;resize:vertical}.sp-action-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:12px}.sp-alert{padding:10px 14px;border-radius:14px;font-size:.74rem;font-weight:850;margin-bottom:12px}.sp-alert.error{color:#991b1b;background:#fef2f2;border:1px solid #fecaca}.sp-alert.success{color:#166534;background:#f0fdf4;border:1px solid #bbf7d0}.sp-alert.info{color:#1d4ed8;background:#eff6ff;border:1px solid #bfdbfe}.sp-policy-table-screen{min-height:0;overflow:auto}.sp-policy-table-card{height:100%;min-height:0}.sp-policy-table-wrap{display:grid;gap:10px;overflow:auto;padding-bottom:4px}.sp-policy-table-row{width:100%;min-width:800px;min-height:68px;display:grid;grid-template-columns:minmax(220px,1.45fr) minmax(150px,.85fr) 96px 110px 150px 124px;gap:12px;align-items:center;padding:12px 14px;border:1px solid #e5edf8;border-radius:15px;background:#fff;color:#0f2746;text-align:left}.sp-policy-table-row.head{min-height:42px;background:#f3f7fc;color:#64748b;font-size:.62rem;font-weight:900;text-transform:uppercase}.sp-policy-table-row strong,.sp-policy-table-row small{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sp-policy-table-row small{margin-top:3px;color:#64748b;font-size:.66rem;font-weight:750}.sp-policy-table-row:not(.head):hover{border-color:#bfdbfe;background:#f8fbff}.sp-policy-table-actions{display:flex;justify-content:flex-end;gap:6px}.sp-policy-table-actions .sp-icon,.sp-policy-table-actions .sp-danger{width:34px;min-height:34px;border-radius:10px}.sp-badge{display:inline-flex;justify-content:center;align-items:center;min-height:24px;border-radius:999px;padding:0 8px;font-size:.62rem;font-weight:900}.sp-badge.legal{color:#166534;background:#dcfce7}.sp-badge.illegal{color:#991b1b;background:#fee2e2}.sp-empty{min-height:132px;display:grid;place-items:center;color:#64748b;font-size:.8rem;font-weight:800;text-align:center;padding:18px}.sp-policy-modal-backdrop{position:fixed;inset:0;z-index:3000;display:grid;place-items:center;padding:24px;background:rgba(15,23,42,.46);backdrop-filter:blur(6px)}.sp-policy-modal{width:min(1180px,calc(100vw - 56px));height:min(90vh,920px);display:grid;grid-template-rows:auto minmax(0,1fr);border:1px solid #dbe7fb;border-radius:24px;background:#f8fbff;box-shadow:0 30px 80px rgba(15,23,42,.32);overflow:hidden}.sp-policy-modal-head{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:16px 18px;border-bottom:1px solid #dbe7fb;background:#fff}.sp-policy-modal-head strong{display:block;color:#0f2746;font-size:1rem;font-weight:950}.sp-policy-modal-head small{display:block;margin-top:3px;color:#64748b;font-size:.72rem;font-weight:750}.sp-top-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap}.sp-policy-modal-body{min-height:0;overflow:auto;padding:16px;display:grid;gap:12px}.sp-story{padding:10px 12px;border:1px solid #bfdbfe;border-radius:14px;background:#eff6ff;color:#1d4ed8;font-size:.72rem;font-weight:900}.sp-flow-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.sp-flow-tabs span{min-height:44px;display:flex;align-items:center;gap:8px;border:1px solid #dbe7fb;border-radius:14px;background:#fff;padding:0 12px;color:#64748b;font-size:.7rem;font-weight:900}.sp-flow-tabs b{width:22px;height:22px;display:grid;place-items:center;border-radius:999px;background:#eff6ff;color:#2563eb;font-size:.68rem}.sp-map-panel{margin-top:12px;border:1px solid #dbe7fb;border-radius:16px;background:#f8fbff;overflow:hidden}.sp-map-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:12px;border-bottom:1px solid #e5edf8}.sp-map-panel-head strong{display:block;font-size:.82rem;font-weight:950;color:#0f2746}.sp-map-panel-head small{display:block;margin-top:2px;color:#64748b;font-size:.68rem;font-weight:740}.sp-search{min-height:40px;display:flex;align-items:center;gap:8px;border:1px solid #d7e3f5;border-radius:12px;padding:0 11px;background:#fff;color:#64748b;min-width:260px}.sp-search input{min-height:0;border:0;padding:0}.sp-table{min-height:220px;max-height:330px;overflow:auto;background:#fff}.sp-row{min-height:56px;display:grid;grid-template-columns:42px minmax(240px,1.3fr) minmax(145px,.7fr) 86px;gap:12px;align-items:center;padding:0 14px;border-bottom:1px solid #edf2f7;font-size:.74rem;font-weight:740}.sp-row.head{position:sticky;top:0;z-index:2;min-height:42px;background:#f3f7fc;color:#64748b;font-size:.62rem;font-weight:900;text-transform:uppercase}.sp-row.selected{background:#eff6ff}.sp-row strong,.sp-row small{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis}.sp-row strong{color:#0f2746}.sp-row small{color:#64748b;font-size:.64rem;white-space:nowrap}.sp-selected-box{margin-top:10px;padding:10px 12px;border:1px solid #bfdbfe;border-radius:15px;background:#eff6ff;color:#1d4ed8;font-size:.76rem;font-weight:850}.sp-selected-box.warning{border-color:#fde68a;background:#fffbeb;color:#92400e}.sp-class-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.sp-class-btn{min-height:70px;padding:12px;border:1px solid #d7e3f5;border-radius:16px;background:#fff;color:#0f2746;text-align:left;font-weight:900}.sp-class-btn.active.legal{border-color:#bbf7d0;background:#f0fdf4;color:#166534}.sp-class-btn.active.illegal{border-color:#fecaca;background:#fef2f2;color:#991b1b}.sp-cost-grid{display:grid;grid-template-columns:1fr .42fr 1fr 1fr;gap:10px}.sp-usage-note{margin-top:10px;padding:11px 12px;border-radius:14px;background:#f8fafc;border:1px dashed #cbd5e1;color:#475569;font-size:.72rem;font-weight:800}.sp-register-stack{display:grid;gap:12px}@media(max-width:1280px){.management-control-wrapper.settings-management-shell,.sp-form-grid,.sp-cost-grid,.sp-flow-tabs{grid-template-columns:1fr!important}.sp-row{grid-template-columns:42px 1fr}.sp-row.head{display:none}.sp-map-panel-head{display:grid}.sp-search{min-width:0}}

.settings-inline-module{height:100%;min-height:0;overflow:auto}.settings-notification-inline{padding:0}.software-policy-content-shell .content-body,.notification-content-shell .content-body{height:100%;min-height:0;overflow:hidden}.software-policy-content-shell,.notification-content-shell{min-height:0;overflow:hidden}.settings-menu-list{padding-bottom:12px}.settings-menu{min-height:0;overflow-y:auto}.settings-content{min-height:0}

/* Scroll-lock: settings sidebar stays fixed, content body scrolls independently */
body.ema-settings-page-active .ema-main{min-height:0!important;overflow:hidden!important}

/* User modal grid layout */
.user-modal-body.advanced{display:grid;grid-template-columns:1fr 1fr;gap:12px 16px;overflow-y:auto;flex:1;min-height:0;align-content:start}
.user-modal-body.advanced .form-field.wide,.user-modal-body.advanced .modal-section-title,.user-modal-body.advanced small.form-helper-text{grid-column:1/-1}
.user-modal-body.advanced .form-field{margin:0}

/* ── Clean panel wrapper ── */
.uam-panel.clean{display:flex;flex-direction:column;background:var(--ema-card-bg);border:1px solid var(--ema-border);border-radius:16px;overflow:hidden}

/* ── Table container ── */
.user-access-table.advanced.clean-table{display:flex;flex-direction:column;overflow-x:auto;min-width:0}

/* ── Rows ── */
.user-row.advanced.clean-table-row{display:grid;align-items:center;min-height:52px;padding:0 14px;border-bottom:1px solid var(--ema-border);gap:12px;font-size:.8rem;color:var(--ema-slate-900)}
.user-row.head.advanced.clean-table-row{min-height:40px;background:var(--ema-slate-100);font-size:.65rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--ema-slate-500);position:sticky;top:0;z-index:2}
.user-row.advanced.clean-table-row:not(.head):last-child{border-bottom:none}
.user-row.advanced.clean-table-row:not(.head):hover{background:var(--ema-blue-50)}

/* ── Column grid templates ── */
.role-standard-row{grid-template-columns:40px 1fr 110px 90px 72px}
.access-standard-row{grid-template-columns:40px 1fr 100px 120px 100px 110px}
.module-control-row{grid-template-columns:40px minmax(160px,1fr) repeat(var(--module-role-count,1),minmax(80px,100px))}
.audit-standard-row{grid-template-columns:40px 140px 140px 120px 1fr 90px}
.user-access-table.clean-table:not(.role-standard-table):not(.module-control-table):not(.audit-standard-table) .user-row.clean-table-row{grid-template-columns:40px 1fr 160px 72px 90px 130px 72px}

/* ── Cells ── */
.user-cell{min-width:0;overflow:hidden;display:flex;align-items:center}
.user-cell.row-number{justify-content:center}

/* ── Row index pill ── */
.row-index-pill{display:inline-flex;align-items:center;justify-content:center;min-width:26px;height:22px;border-radius:6px;background:var(--ema-slate-100);border:1px solid var(--ema-border);font-size:.68rem;font-weight:800;color:var(--ema-slate-500);padding:0 4px}

/* ── Role / module info cell ── */
.role-info-cell{display:flex;flex-direction:column;gap:2px;min-width:0}
.role-info-cell strong{font-size:.8rem;font-weight:800;color:var(--ema-slate-900);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.role-info-cell small{font-size:.7rem;color:var(--ema-slate-500);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.submodule-info{padding-left:14px}

/* ── User name cell ── */
.user-name{display:flex;align-items:center;gap:10px;min-width:0}
.user-name>div{min-width:0;display:flex;flex-direction:column;gap:2px}
.user-name strong,.user-name small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.user-name strong{font-size:.8rem;font-weight:800;color:var(--ema-slate-900)}
.user-name small{font-size:.7rem;color:var(--ema-slate-500)}
.user-mini-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--ema-blue-600),#0891b2);color:#fff;font-size:.68rem;font-weight:800;display:inline-flex;align-items:center;justify-content:center;flex:none;font-style:normal}

/* ── Muted cell text ── */
.muted-cell{font-size:.76rem;color:var(--ema-slate-500);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}

/* ── Status pills (active/inactive/locked/review variants) ── */
.user-pill.active{background:#dcfce7;border-color:#bbf7d0;color:#15803d}
.user-pill.inactive{background:var(--ema-slate-100);border-color:var(--ema-border);color:var(--ema-slate-500)}
.user-pill.locked{background:#fef2f2;border-color:#fecaca;color:#dc2626}
.user-pill.review{background:#fffbeb;border-color:#fde68a;color:#b45309}

/* ── Access control status dropdown ── */
.access-status-select{appearance:none;-webkit-appearance:none;padding:4px 10px;border-radius:999px;font-size:.7rem;font-weight:800;border:1px solid transparent;cursor:pointer;outline:none;min-width:82px;text-align:center}
.access-status-select.active{background:#dcfce7;border-color:#bbf7d0;color:#15803d}
.access-status-select.inactive{background:#fff7ed;border-color:#fed7aa;color:#c2410c}
.access-status-select:hover{opacity:.85}

/* ── Red delete (trash) button ── */
.mini-btn.icon-only.delete{color:#dc2626;border-color:#fecaca;background:#fef2f2}
.mini-btn.icon-only.delete:hover:not(:disabled){background:#fee2e2;border-color:#fca5a5;color:#b91c1c}

/* ── Approval chip ── */
.approval-chip{display:inline-flex;align-items:center;justify-content:center;padding:3px 10px;border-radius:999px;font-size:.7rem;font-weight:800;border:1px solid transparent}
.approval-chip.required{color:#b45309;background:#fffbeb;border-color:#fde68a}
.approval-chip.standard{color:var(--ema-blue-600);background:var(--ema-blue-50);border-color:var(--ema-blue-100)}

/* ── MFA pill ── */
.mfa-pill{display:inline-flex;align-items:center;justify-content:center;padding:3px 10px;border-radius:999px;font-size:.7rem;font-weight:800;border:1px solid transparent}
.mfa-pill.on{color:#15803d;background:#dcfce7;border-color:#bbf7d0}
.mfa-pill.off{color:var(--ema-slate-500);background:var(--ema-slate-100);border-color:var(--ema-border)}

/* ── Role chips ── */
.role-chip-stack{display:flex;flex-wrap:wrap;gap:4px;align-items:center;min-width:0}
.role-soft-chip{display:inline-flex;align-items:center;padding:2px 8px;border-radius:6px;background:var(--ema-blue-50);border:1px solid var(--ema-blue-100);color:var(--ema-blue-700);font-size:.68rem;font-weight:800;white-space:nowrap}
.role-more-chip{display:inline-flex;align-items:center;padding:2px 8px;border-radius:6px;background:var(--ema-slate-100);border:1px solid var(--ema-border);color:var(--ema-slate-500);font-size:.68rem;font-weight:800}

/* ── Toggle switch ── */
.toggle{width:36px;height:20px;border-radius:10px;border:2px solid var(--ema-border);background:var(--ema-slate-200);cursor:pointer;position:relative;transition:background .15s,border-color .15s;padding:0;outline:none;flex:none}
.toggle::after{content:"";position:absolute;left:2px;top:50%;transform:translateY(-50%);width:12px;height:12px;border-radius:50%;background:var(--ema-slate-400);transition:left .15s,background .15s}
.toggle.on{background:var(--ema-blue-600);border-color:var(--ema-blue-600)}
.toggle.on::after{left:calc(100% - 14px);background:#fff}
.toggle:disabled{opacity:.5;cursor:not-allowed}

/* ── Module control ── */
.module-control-group-row.compact{display:flex;align-items:center;padding:6px 14px;background:var(--ema-slate-100);border-bottom:1px solid var(--ema-border);font-size:.65rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:var(--ema-slate-500)}
.module-toggle-cell{justify-content:center}
.submodule-row .role-info-cell{padding-left:16px}
.module-control-panel .settings-helper-card{border-radius:0;border:none;border-bottom:1px solid var(--ema-border)}

/* ── Action buttons ── */
.row-actions,.user-row-action-wrap.clean{display:flex;align-items:center;gap:6px}
.mini-btn.icon-only.edit{color:var(--ema-blue-600);border-color:var(--ema-blue-100);background:var(--ema-blue-50)}
.mini-btn.icon-only.edit:hover:not(:disabled){background:var(--ema-blue-100);border-color:var(--ema-blue-200)}
.mini-btn svg,.icon-delete-btn svg{width:15px;height:15px;flex-shrink:0}

/* ── Filter dropdown trigger ── */
.uam-filter-dropdown{position:relative}
.uam-filter-trigger{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;border:1px solid var(--ema-border);background:var(--ema-card-bg);border-radius:8px;padding:8px 10px;font-size:.8rem;color:var(--ema-slate-700);cursor:pointer;min-width:110px;white-space:nowrap}
.uam-filter-trigger:hover{border-color:var(--ema-blue-100);background:var(--ema-blue-50)}
.uam-filter-trigger[aria-expanded="true"]{border-color:var(--ema-blue-600)}
.uam-filter-check{margin-left:auto;color:var(--ema-blue-600);font-size:.8rem;flex-shrink:0}
.uam-filter-menu-portal{overflow-y:auto}

/* ── Commandbar filter grid ── */
.uam-filter-grid.clean.compact{display:flex;align-items:center;gap:8px;flex-wrap:nowrap;flex:0 0 auto}

/* ── Right-side action group in commandbar ── */
.uam-actions-right{display:flex;align-items:center;gap:8px;margin-left:auto;flex-shrink:0}

/* ── Content toolbar ── */
.content-toolbar{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--ema-border);flex-wrap:wrap}
.content-toolbar .section-search{flex:1;min-width:200px;margin-bottom:0}
.toolbar-actions{display:flex;align-items:center;gap:8px;flex-shrink:0}
.settings-toolbar-right{display:flex;align-items:center;gap:8px;margin-left:auto;flex-wrap:nowrap}
.settings-primary-actions{display:flex;align-items:center;gap:8px}

/* ── Empty state ── */
.settings-empty-state{display:flex;align-items:center;justify-content:center;min-height:120px;padding:24px;font-size:.82rem;color:var(--ema-slate-500);font-weight:700;text-align:center}
.settings-empty-state.compact{min-height:64px;font-size:.78rem}

/* ── Compact helper card ── */
.settings-helper-card.compact{padding:8px 14px}
.settings-helper-card.compact strong{font-size:.76rem}
.settings-helper-card.compact span{font-size:.72rem}

/* ── Audit log panel ── */
.audit-log-panel{display:flex;flex-direction:column;background:var(--ema-card-bg);border:1px solid var(--ema-border);border-radius:16px;overflow:hidden}
.audit-commandbar{display:flex;align-items:flex-end;gap:10px;padding:12px 14px;border-bottom:1px solid var(--ema-border);flex-wrap:wrap}
.audit-filter-grid{display:grid;grid-template-columns:repeat(3,minmax(130px,1fr));gap:10px;flex:1}
.audit-filter-grid .form-field{margin:0;gap:4px}
.audit-command-actions{display:flex;align-items:flex-end;gap:8px;flex-shrink:0}
.audit-log-panel .audit-kpi-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-bottom:1px solid var(--ema-border)}
.audit-log-panel .audit-kpi-strip>div{display:flex;flex-direction:column;gap:2px;padding:10px 16px;border-right:1px solid var(--ema-border);border-radius:0;background:transparent;border-top:none;border-left:none;border-bottom:none}
.audit-log-panel .audit-kpi-strip>div:last-child{border-right:none}
.audit-log-panel .audit-kpi-strip>div>span{font-size:.62rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--ema-slate-500)}
.audit-log-panel .audit-kpi-strip>div>strong{font-size:1.05rem;font-weight:900;color:var(--ema-slate-900)}
.audit-time-cell{flex-direction:column;align-items:flex-start;gap:2px}
.audit-time-cell strong{font-size:.76rem;font-weight:700;color:var(--ema-slate-900)}
.audit-action-cell{flex-direction:column;align-items:flex-start;gap:2px;overflow:hidden}
.audit-action-cell strong,.audit-action-cell small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.audit-action-cell strong{font-size:.78rem;font-weight:700;color:var(--ema-slate-900)}
.audit-action-cell small{font-size:.68rem;color:var(--ema-slate-500)}
.audit-module-chip{font-size:.72rem}
.audit-user-chip{font-size:.74rem}
.audit-pagination{justify-content:space-between}
.uam-pagination-info{font-size:.76rem;color:var(--ema-slate-500);font-weight:600}

/* ── Dark mode ── */
html.ema-dark .uam-panel.clean,html.ema-dark .audit-log-panel{background:var(--ema-card-bg);border-color:var(--ema-border)}
html.ema-dark .user-row.head.advanced.clean-table-row{background:var(--ema-slate-100)}
html.ema-dark .user-row.advanced.clean-table-row:not(.head):hover{background:rgba(59,130,246,.07)}
html.ema-dark .module-control-group-row.compact{background:var(--ema-slate-100);border-color:var(--ema-border)}
html.ema-dark .user-pill.active{background:rgba(34,197,94,.15);border-color:rgba(34,197,94,.3);color:#4ade80}
html.ema-dark .user-pill.inactive{background:var(--ema-slate-100);border-color:var(--ema-border);color:var(--ema-slate-500)}
html.ema-dark .user-pill.locked{background:rgba(239,68,68,.15);border-color:rgba(239,68,68,.3);color:#f87171}
html.ema-dark .user-pill.review{background:rgba(245,158,11,.15);border-color:rgba(245,158,11,.3);color:#fbbf24}
html.ema-dark .approval-chip.required{color:#fbbf24;background:rgba(245,158,11,.15);border-color:rgba(245,158,11,.3)}
html.ema-dark .approval-chip.standard{color:#93c5fd;background:rgba(59,130,246,.1);border-color:rgba(59,130,246,.2)}
html.ema-dark .mfa-pill.on{background:rgba(34,197,94,.15);border-color:rgba(34,197,94,.3);color:#4ade80}
html.ema-dark .mfa-pill.off{background:var(--ema-slate-100);border-color:var(--ema-border);color:var(--ema-slate-500)}
html.ema-dark .role-soft-chip{background:rgba(59,130,246,.1);border-color:rgba(59,130,246,.2);color:#93c5fd}
html.ema-dark .role-more-chip,html.ema-dark .audit-module-chip{background:var(--ema-slate-100);border-color:var(--ema-border);color:var(--ema-slate-500)}
html.ema-dark .toggle{background:var(--ema-slate-200);border-color:var(--ema-border)}
html.ema-dark .toggle::after{background:var(--ema-slate-400)}
html.ema-dark .toggle.on{background:var(--ema-blue-600);border-color:var(--ema-blue-600)}
html.ema-dark .toggle.on::after{background:#fff}
html.ema-dark .uam-filter-trigger{background:var(--ema-card-bg);border-color:var(--ema-border);color:var(--ema-slate-900)}
html.ema-dark .uam-filter-trigger:hover{background:var(--ema-slate-100);border-color:var(--ema-blue-100)}
html.ema-dark .mini-btn.icon-only.edit{color:#60a5fa;border-color:rgba(59,130,246,.25);background:rgba(59,130,246,.1)}
html.ema-dark .audit-log-panel .audit-kpi-strip>div{border-color:var(--ema-border)}
html.ema-dark .row-index-pill{background:var(--ema-slate-200);border-color:var(--ema-border);color:var(--ema-slate-500)}

/* ── Pricing editor ── */
.pricing-editor{display:flex;flex-direction:column;gap:14px;padding:2px}
.pricing-top-insights{display:grid;grid-template-columns:1fr 1fr 1.4fr;gap:12px}
.pricing-info-card{display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border:1px solid var(--ema-border);border-radius:12px;background:var(--ema-card-bg)}
.pricing-info-card.blue{border-color:var(--ema-blue-100);background:var(--ema-blue-50)}
.pricing-info-card.green{border-color:#bbf7d0;background:#f0fdf4}
.pricing-info-icon{width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:var(--ema-blue-600);color:#fff;font-size:.62rem;font-weight:900;flex:none;letter-spacing:-.02em}
.pricing-info-card.green .pricing-info-icon{background:#16a34a}
.pricing-info-card strong{display:block;font-size:.8rem;font-weight:800;color:var(--ema-slate-900);margin-bottom:4px}
.pricing-info-card p{margin:0;font-size:.72rem;color:var(--ema-slate-500);line-height:1.45}
.pricing-disclaimer-card{padding:12px 14px;border:1px dashed var(--ema-border);border-radius:12px;background:var(--ema-slate-100)}
.pricing-disclaimer-card strong{display:block;font-size:.76rem;font-weight:800;color:var(--ema-slate-700);margin-bottom:4px}
.pricing-disclaimer-card p{margin:0;font-size:.7rem;color:var(--ema-slate-500);line-height:1.45}
.pricing-table-card.pricing-modern-table{border:1px solid var(--ema-border);border-radius:12px;overflow:hidden}
.pricing-row{display:grid;grid-template-columns:1fr 1fr 1fr 140px 100px 100px;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--ema-border)}
.pricing-head-row{background:var(--ema-slate-100);font-size:.65rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--ema-slate-500);min-height:38px}
.pricing-data-row{min-height:52px}
.pricing-data-row:last-child{border-bottom:none}
.pricing-data-row:hover{background:var(--ema-blue-50)}
.pricing-field-label{display:none}
.price-input-shell{display:flex;align-items:center;border:1px solid var(--ema-border);border-radius:8px;background:var(--ema-card-bg);overflow:hidden}
.price-input-shell>span{padding:0 8px;font-size:.76rem;font-weight:700;color:var(--ema-slate-500);border-right:1px solid var(--ema-border);background:var(--ema-slate-100);height:100%;display:flex;align-items:center;min-height:36px}
.price-input-shell .setting-input,.pricing-price-input{border:0;border-radius:0;min-height:36px;padding:0 8px;flex:1}
.pricing-row-actions{display:flex;align-items:center;gap:6px}
.pricing-save-btn{display:inline-flex;align-items:center;justify-content:center;padding:0 12px;height:34px;border-radius:8px;border:1px solid var(--ema-blue-100);background:var(--ema-blue-50);color:var(--ema-blue-600);font-size:.76rem;font-weight:800;cursor:pointer;white-space:nowrap}
.pricing-save-btn:hover:not(:disabled){background:var(--ema-blue-100)}
.pricing-save-btn:disabled{opacity:.5;cursor:not-allowed}
.icon-delete-btn{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:8px;border:1px solid #fecaca;background:#fef2f2;color:#dc2626;cursor:pointer;flex:none}
.icon-delete-btn:hover:not(:disabled){background:#fee2e2}
.icon-delete-btn:disabled{opacity:.5;cursor:not-allowed}
.pricing-empty-row{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:32px;color:var(--ema-slate-500);font-size:.82rem;text-align:center}

/* ── Management policy editor ── */
.management-policy-editor{display:flex;flex-direction:column;gap:12px;padding:2px}
.management-policy-command{flex-direction:row!important;align-items:center;justify-content:space-between;gap:12px}
.management-policy-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
.management-policy-meta span{display:inline-flex;align-items:center;padding:2px 8px;border-radius:6px;background:var(--ema-slate-100);border:1px solid var(--ema-border);font-size:.7rem;font-weight:700;color:var(--ema-slate-600)}
.management-policy-actions{flex-shrink:0}
.management-policy-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.management-policy-field-list{display:flex;flex-direction:column;gap:0}
.management-policy-field{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--ema-border)}
.management-policy-field:last-child{border-bottom:none}
.management-policy-field>span{min-width:0}
.management-policy-field strong{display:block;font-size:.78rem;font-weight:800;color:var(--ema-slate-900)}
.management-policy-field small{display:block;font-size:.68rem;color:var(--ema-slate-500)}
.management-policy-input-wrap{display:flex;align-items:center;gap:4px;width:80px}
.management-policy-input-wrap .setting-input{width:60px;min-height:32px;padding:0 6px;text-align:right;font-size:.78rem}
.management-policy-input-wrap em{font-size:.7rem;color:var(--ema-slate-500);font-style:normal;white-space:nowrap}
.management-policy-field>b{font-size:.76rem;font-weight:700;color:var(--ema-blue-600);text-align:right;min-width:60px}

/* ── PC Aging editor ── */
.pc-aging-revamp{display:flex;flex-direction:column;gap:12px;padding:2px}
.pc-aging-command-card{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 16px;border:1px solid var(--ema-border);border-radius:14px;background:var(--ema-card-bg)}
.pc-aging-command-copy h3{margin:4px 0;font-size:.95rem;font-weight:800;color:var(--ema-slate-900)}
.pc-aging-command-copy p{margin:0;font-size:.76rem;color:var(--ema-slate-500)}
.pc-aging-command-actions{display:flex;align-items:center;gap:8px;flex-shrink:0}
.pc-aging-kicker{display:block;font-size:.62rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:var(--ema-blue-600);margin-bottom:4px}
.pc-aging-overview-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.pc-aging-overview-card{padding:12px 14px;border:1px solid var(--ema-border);border-radius:12px;background:var(--ema-card-bg)}
.pc-aging-overview-card h4{margin:4px 0;font-size:1.15rem;font-weight:900;color:var(--ema-slate-900)}
.pc-aging-overview-card p{margin:0;font-size:.72rem;color:var(--ema-slate-500);line-height:1.4}
.pc-aging-status-card{grid-column:span 1}
.pc-aging-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.pc-aging-status-strip{display:flex;align-items:center;justify-content:space-between;margin-top:8px;padding-top:8px;border-top:1px solid var(--ema-border);font-size:.74rem;color:var(--ema-slate-600);font-weight:700}
.pc-aging-main-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.pc-aging-panel{padding:14px 16px;border:1px solid var(--ema-border);border-radius:14px;background:var(--ema-card-bg);display:flex;flex-direction:column;gap:10px}
.pc-aging-panel-head h4{margin:4px 0;font-size:.88rem;font-weight:800;color:var(--ema-slate-900)}
.pc-aging-panel-head p{margin:0;font-size:.72rem;color:var(--ema-slate-500)}
.pc-aging-threshold-stack{display:flex;flex-direction:column;gap:10px}
.threshold-line.aging-threshold-line{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--ema-border)}
.threshold-line.aging-threshold-line:last-child{border-bottom:none}
.threshold-label-block span{display:block;font-size:.78rem;font-weight:800;color:var(--ema-slate-900)}
.threshold-label-block small{display:block;font-size:.68rem;color:var(--ema-slate-500)}
.threshold-line input[type="range"]{width:100%;max-width:120px;accent-color:var(--ema-blue-600)}
.threshold-number-wrap{display:flex;align-items:center;gap:6px}
.threshold-number-wrap input{width:48px;min-height:32px;border:1px solid var(--ema-border);border-radius:7px;background:var(--ema-card-bg);color:var(--ema-slate-900);text-align:center;font-size:.8rem;font-weight:800;padding:0 4px}
.threshold-number-wrap b{font-size:.7rem;color:var(--ema-slate-600);white-space:nowrap;font-weight:700;min-width:56px}
.aging-action-list.pc-aging-action-list{display:flex;flex-direction:column;gap:6px;flex:1}
.aging-action-row{display:grid;grid-template-columns:80px 1fr auto;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;background:var(--ema-slate-100);border:1px solid var(--ema-border)}
.aging-action-row span{font-size:.76rem;font-weight:800;color:var(--ema-slate-900)}
.aging-action-row small{font-size:.7rem;color:var(--ema-slate-500)}
.aging-action-row b{font-size:.7rem;font-weight:800;padding:2px 8px;border-radius:6px}
.aging-action-blue .aging-action-row,.aging-action-row.aging-action-blue{border-color:var(--ema-blue-100);background:var(--ema-blue-50)}
.aging-action-blue .aging-action-row b,.aging-action-row.aging-action-blue b{color:var(--ema-blue-700);background:var(--ema-blue-100)}
.aging-action-amber .aging-action-row,.aging-action-row.aging-action-amber{border-color:#fde68a;background:#fffbeb}
.aging-action-amber .aging-action-row b,.aging-action-row.aging-action-amber b{color:#b45309;background:#fde68a}
.aging-action-red .aging-action-row,.aging-action-row.aging-action-red{border-color:#fecaca;background:#fef2f2}
.aging-action-red .aging-action-row b,.aging-action-row.aging-action-red b{color:#dc2626;background:#fecaca}
.pc-aging-secondary-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.pc-aging-form-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.pc-aging-form-grid .form-field{margin:0;gap:4px}

/* ── Risk content ── */
.risk-simple-layout{display:grid;grid-template-columns:1fr 280px;gap:14px}
.risk-simple-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;align-content:start}
.risk-simple-card{padding:14px;border:1px solid var(--ema-border);border-radius:14px;background:var(--ema-card-bg);display:flex;flex-direction:column;gap:10px}
.risk-simple-head{display:flex;align-items:flex-start;gap:10px}
.risk-simple-head>div{flex:1;min-width:0}
.risk-simple-head h4{margin:0 0 4px;font-size:.84rem;font-weight:800;color:var(--ema-slate-900)}
.risk-simple-head p{margin:0;font-size:.72rem;color:var(--ema-slate-500)}
.risk-color-dot{width:10px;height:10px;border-radius:50%;background:var(--risk-color,var(--ema-slate-400));flex:none;margin-top:5px}
.risk-level-pill{display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;font-size:.68rem;font-weight:800;background:var(--risk-color,var(--ema-slate-400));color:#fff;flex:none}
.risk-mini-meter{height:6px;border-radius:3px;background:var(--ema-slate-200);overflow:hidden}
.risk-mini-meter i{display:block;height:100%;width:var(--w,50%);background:var(--risk-color,var(--ema-blue-600));border-radius:3px}
.risk-simple-controls{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.risk-simple-controls .form-field{margin:0;gap:3px}
.risk-rule-panel{padding:14px 16px;border:1px solid var(--ema-border);border-radius:14px;background:var(--ema-card-bg);display:flex;flex-direction:column;gap:10px;height:fit-content}
.risk-rule-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.risk-rule-head h4{margin:0 0 4px;font-size:.84rem;font-weight:800;color:var(--ema-slate-900)}
.risk-rule-head p{margin:0;font-size:.72rem;color:var(--ema-slate-500)}
.risk-rule-list{display:flex;flex-direction:column;gap:0}
.summary-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--ema-border);font-size:.78rem}
.summary-row:last-child{border-bottom:none}
.summary-row span{color:var(--ema-slate-700);font-weight:600}
.summary-row b{color:var(--ema-slate-900);font-weight:800}

/* ── Dark mode additions ── */
html.ema-dark .pricing-info-card.blue{border-color:var(--ema-blue-100);background:var(--ema-blue-50)}
html.ema-dark .pricing-info-card.green{border-color:rgba(34,197,94,.25);background:rgba(34,197,94,.08)}
html.ema-dark .pricing-disclaimer-card{background:var(--ema-slate-100);border-color:var(--ema-border)}
html.ema-dark .pricing-table-card.pricing-modern-table{border-color:var(--ema-border)}
html.ema-dark .pricing-head-row{background:var(--ema-slate-100)}
html.ema-dark .pricing-data-row:hover{background:rgba(59,130,246,.07)}
html.ema-dark .pc-aging-command-card,html.ema-dark .pc-aging-overview-card,html.ema-dark .pc-aging-panel{background:var(--ema-card-bg);border-color:var(--ema-border)}
html.ema-dark .aging-action-row{background:var(--ema-slate-100);border-color:var(--ema-border)}
html.ema-dark .aging-action-blue,html.ema-dark .aging-action-row.aging-action-blue{border-color:var(--ema-blue-100);background:var(--ema-blue-50)}
html.ema-dark .risk-simple-card,html.ema-dark .risk-rule-panel{background:var(--ema-card-bg);border-color:var(--ema-border)}
html.ema-dark .risk-mini-meter{background:var(--ema-slate-200)}
html.ema-dark .summary-row{border-color:var(--ema-border)}

/* ── Resource planning ── */
.resource-planning-module{display:flex;flex-direction:column;gap:12px;padding:2px}
.resource-command-card{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 16px;border:1px solid var(--ema-border);border-radius:14px;background:var(--ema-card-bg)}
.resource-command-card h3{margin:4px 0;font-size:.95rem;font-weight:800;color:var(--ema-slate-900)}
.resource-command-card p{margin:0;font-size:.76rem;color:var(--ema-slate-500)}
.resource-command-actions{display:flex;align-items:center;gap:8px;flex-shrink:0}
.resource-workbench{display:grid;grid-template-columns:340px 1fr;gap:12px;align-items:start}
.resource-form-card,.resource-table-card{padding:14px 16px;border:1px solid var(--ema-border);border-radius:14px;background:var(--ema-card-bg);display:flex;flex-direction:column;gap:10px}
.resource-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.resource-card-head h4{margin:4px 0;font-size:.88rem;font-weight:800;color:var(--ema-slate-900)}
.resource-card-head p{margin:0;font-size:.72rem;color:var(--ema-slate-500)}
.resource-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.resource-form-grid .form-field{margin:0;gap:4px}
.resource-wide{grid-column:1/-1}
.resource-textarea{min-height:60px;resize:vertical}
.resource-form-actions{margin-top:4px;padding-top:10px;border-top:1px solid var(--ema-border)}
.resource-selected-engineer{display:flex;flex-direction:column;gap:2px;padding:8px 10px;border-radius:8px;background:var(--ema-blue-50);border:1px solid var(--ema-blue-100)}
.resource-selected-engineer strong{font-size:.8rem;font-weight:800;color:var(--ema-blue-700)}
.resource-selected-engineer span{font-size:.72rem;color:var(--ema-slate-500)}
.resource-table-head{margin-bottom:2px}
.resource-table-filters{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.resource-table-wrap{overflow-x:auto;min-width:0}
.resource-table{width:100%;border-collapse:collapse;font-size:.8rem}
.resource-table thead tr{border-bottom:2px solid var(--ema-border)}
.resource-table th{text-align:left;padding:8px 10px;font-size:.65rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--ema-slate-500);background:var(--ema-slate-100)}
.resource-table td{padding:10px;border-bottom:1px solid var(--ema-border);color:var(--ema-slate-900);vertical-align:middle}
.resource-table td strong{display:block;font-weight:800}
.resource-table td small{display:block;font-size:.7rem;color:var(--ema-slate-500)}
.resource-table tbody tr:last-child td{border-bottom:none}
.resource-table tbody tr:hover td{background:var(--ema-blue-50)}
.resource-sort-button{display:inline-flex;align-items:center;gap:4px;background:none;border:none;cursor:pointer;font-size:.65rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--ema-slate-500);padding:0}
.resource-sort-button:hover{color:var(--ema-blue-600)}
.resource-sort-button span{opacity:.5}
.resource-status-pill{display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;font-size:.7rem;font-weight:800;background:var(--ema-slate-100);border:1px solid var(--ema-border);color:var(--ema-slate-600)}
.resource-row-actions{display:flex;align-items:center;gap:6px}

/* ── Status pill (working hours table) ── */
.status-pill{display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;font-size:.7rem;font-weight:800;border:1px solid transparent}
.status-pill.active{background:#dcfce7;border-color:#bbf7d0;color:#15803d}
.status-pill.locked{background:#fef2f2;border-color:#fecaca;color:#dc2626}

/* ── Danger button ── */
.danger-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:8px 14px;border-radius:10px;border:1px solid #fecaca;background:#fef2f2;color:#dc2626;font-size:.78rem;font-weight:800;cursor:pointer;white-space:nowrap}
.danger-btn:hover:not(:disabled){background:#fee2e2;border-color:#fca5a5}
.danger-btn:disabled{opacity:.5;cursor:not-allowed}

/* ── Incident category management ── */
.content-panel{display:flex;flex-direction:column;gap:0;background:var(--ema-card-bg);border:1px solid var(--ema-border);border-radius:16px;overflow:hidden}
.incident-category-head,.resource-card-head.incident-category-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid var(--ema-border)}
.incident-category-head h4{margin:4px 0;font-size:.9rem;font-weight:800;color:var(--ema-slate-900)}
.incident-category-head p{margin:0;font-size:.74rem;color:var(--ema-slate-500)}
.incident-category-stats{display:flex;gap:12px;flex-shrink:0}
.incident-category-stats span{font-size:.76rem;color:var(--ema-slate-600)}
.incident-category-stats strong{font-weight:800;color:var(--ema-slate-900)}
.incident-category-layout{display:grid;grid-template-columns:240px 1fr;min-height:0;overflow:hidden}
.incident-category-sidebar{display:flex;flex-direction:column;gap:0;border-right:1px solid var(--ema-border);overflow:hidden}
.incident-category-add-row{display:flex;gap:8px;padding:10px 12px;border-bottom:1px solid var(--ema-border)}
.incident-category-add-row .setting-input{flex:1;min-height:36px;padding:0 10px}
.incident-category-add-row .primary-btn{flex-shrink:0}
.incident-category-list{flex:1;overflow-y:auto;padding:6px}
.incident-category-list-item{width:100%;display:flex;flex-direction:column;gap:2px;padding:8px 10px;border-radius:8px;border:1px solid transparent;background:transparent;text-align:left;cursor:pointer;transition:background .12s,border-color .12s}
.incident-category-list-item span{font-size:.8rem;font-weight:700;color:var(--ema-slate-900)}
.incident-category-list-item small{font-size:.68rem;color:var(--ema-slate-500)}
.incident-category-list-item:hover{background:var(--ema-slate-100);border-color:var(--ema-border)}
.incident-category-list-item.active{background:var(--ema-blue-50);border-color:var(--ema-blue-100)}
.incident-category-list-item.active span{color:var(--ema-blue-700)}
.incident-category-editor{display:flex;flex-direction:column;gap:10px;padding:12px;overflow-y:auto}
.incident-editor-card{padding:12px 14px;border:1px solid var(--ema-border);border-radius:12px;display:flex;flex-direction:column;gap:8px}
.incident-editor-title{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.incident-editor-title h5{margin:4px 0;font-size:.82rem;font-weight:800;color:var(--ema-slate-900)}
.incident-editor-actions{display:flex;align-items:center;gap:6px;flex-shrink:0;flex-wrap:wrap}
.incident-add-inline{display:flex;gap:8px}
.incident-add-inline .setting-input{flex:1}
.incident-subcategory-list,.incident-detail-list{display:flex;flex-direction:column;gap:6px}
.incident-subcategory-row{display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid var(--ema-border);border-radius:8px}
.incident-subcategory-row.active{border-color:var(--ema-blue-100);background:var(--ema-blue-50)}
.incident-subcategory-select{flex:0 0 140px;display:flex;flex-direction:column;gap:1px;text-align:left;background:transparent;border:none;cursor:pointer;padding:0}
.incident-subcategory-select strong{font-size:.76rem;font-weight:800;color:var(--ema-slate-900)}
.incident-subcategory-select small{font-size:.66rem;color:var(--ema-slate-500)}
.incident-subcategory-row .setting-input{flex:1;min-height:32px}
.incident-row-actions{display:flex;align-items:center;gap:6px;flex-shrink:0}
.incident-detail-row{display:flex;align-items:center;gap:8px}
.incident-detail-row .setting-input{flex:1;min-height:32px}
.incident-empty-state{padding:14px;text-align:center;font-size:.78rem;color:var(--ema-slate-500)}
.incident-empty-state.large{padding:32px}

/* ── Dark mode: resource and incident ── */
html.ema-dark .resource-command-card,html.ema-dark .resource-form-card,html.ema-dark .resource-table-card{background:var(--ema-card-bg);border-color:var(--ema-border)}
html.ema-dark .resource-selected-engineer{background:var(--ema-blue-50);border-color:var(--ema-blue-100)}
html.ema-dark .resource-table th{background:var(--ema-slate-100);color:var(--ema-slate-500)}
html.ema-dark .resource-table td{border-color:var(--ema-border);color:var(--ema-slate-900)}
html.ema-dark .resource-table tbody tr:hover td{background:rgba(59,130,246,.07)}
html.ema-dark .content-panel{background:var(--ema-card-bg);border-color:var(--ema-border)}
html.ema-dark .incident-editor-card{background:transparent;border-color:var(--ema-border)}
html.ema-dark .incident-subcategory-row{border-color:var(--ema-border)}
html.ema-dark .incident-subcategory-row.active{border-color:var(--ema-blue-100);background:rgba(59,130,246,.08)}
html.ema-dark .incident-category-list-item.active{background:rgba(59,130,246,.1);border-color:var(--ema-blue-100)}
html.ema-dark .danger-btn{border-color:rgba(239,68,68,.35);background:rgba(239,68,68,.1);color:#f87171}
html.ema-dark .danger-btn:hover:not(:disabled){background:rgba(239,68,68,.18)}
html.ema-dark .status-pill.active{background:rgba(34,197,94,.15);border-color:rgba(34,197,94,.3);color:#4ade80}
html.ema-dark .status-pill.locked{background:rgba(239,68,68,.15);border-color:rgba(239,68,68,.3);color:#f87171}

/* ── SVG icon size fix (SearchSvg / ChevronDownSvg have no width/height) ── */
.section-search svg,.user-search-inline svg,.content-toolbar svg{width:16px;height:16px;flex-shrink:0}
.uam-filter-trigger svg,.setting-select-trigger svg{width:14px;height:14px;flex-shrink:0}

/* ── Role modal (AccessPolicyModal, RoleModal) ── */
.role-modal-backdrop{position:fixed;inset:0;z-index:4000;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(15,23,42,.5);backdrop-filter:blur(4px);opacity:0;pointer-events:none;transition:opacity .15s}
.role-modal-backdrop.open{opacity:1;pointer-events:auto}
.role-modal{width:min(560px,calc(100vw - 48px));max-height:90vh;display:flex;flex-direction:column;background:var(--ema-card-bg);border:1px solid var(--ema-border);border-radius:16px;box-shadow:0 20px 60px rgba(15,23,42,.3);overflow:hidden}
.role-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:16px 18px;border-bottom:1px solid var(--ema-border);flex-shrink:0}
.role-modal-head h3{margin:4px 0 0;font-size:.95rem;font-weight:800;color:var(--ema-slate-900)}
.role-modal-head p{margin:4px 0 0;font-size:.76rem;color:var(--ema-slate-500)}
.role-modal-body{flex:1;min-height:0;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px}
.role-modal-body.simple-role-modal-body{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-content:start}
.role-modal-body.simple-role-modal-body .form-field.wide{grid-column:1/-1}
.role-modal-foot{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:12px 16px;border-top:1px solid var(--ema-border);flex-shrink:0}
.role-delete-warning{margin:0;padding:10px 16px;font-size:.76rem;color:#b45309;background:#fffbeb;border-top:1px solid #fde68a;display:none}
.role-delete-warning.show{display:block}
html.ema-dark .role-modal{background:var(--ema-card-bg);border-color:var(--ema-border)}
html.ema-dark .role-modal-head{border-color:var(--ema-border)}
html.ema-dark .role-modal-foot{border-color:var(--ema-border)}
html.ema-dark .role-delete-warning{background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.3);color:#fbbf24}

/* ── Delete confirm modal (AccessPolicyDeleteConfirmModal, UserDeleteConfirmModal) ── */
.user-delete-backdrop{position:fixed;inset:0;z-index:4000;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(15,23,42,.5);backdrop-filter:blur(4px);opacity:0;pointer-events:none;transition:opacity .15s}
.user-delete-backdrop.open{opacity:1;pointer-events:auto}
.user-delete-modal{width:min(400px,calc(100vw - 48px));background:var(--ema-card-bg);border:1px solid var(--ema-border);border-radius:16px;box-shadow:0 20px 60px rgba(15,23,42,.3);padding:24px;display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center}
.user-delete-icon{width:48px;height:48px;border-radius:50%;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;font-size:1.4rem;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.user-delete-copy h3{margin:4px 0;font-size:.95rem;font-weight:800;color:var(--ema-slate-900)}
.user-delete-copy p{margin:0;font-size:.78rem;color:var(--ema-slate-500);line-height:1.5}
.user-delete-actions{display:flex;align-items:center;justify-content:center;gap:8px;width:100%}
html.ema-dark .user-delete-modal{background:var(--ema-card-bg);border-color:var(--ema-border)}
html.ema-dark .user-delete-icon{background:rgba(239,68,68,.15);border-color:rgba(239,68,68,.3);color:#f87171}

/* ── Notification channels component ── */
.settings-notification-shell{display:flex;flex-direction:column;height:100%;min-height:0;overflow:hidden}
.notification-topbar{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 18px;border-bottom:1px solid var(--ema-border);flex-shrink:0;flex-wrap:wrap}
.notification-topbar h2{margin:0 0 2px;font-size:1rem;font-weight:800;color:var(--ema-slate-900)}
.notification-topbar p{margin:0;font-size:.76rem;color:var(--ema-slate-500)}
.notification-tabs{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.notification-tab{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:8px;border:1px solid var(--ema-border);background:transparent;color:var(--ema-slate-600);font-size:.78rem;font-weight:700;cursor:pointer;white-space:nowrap}
.notification-tab:hover{background:var(--ema-slate-100);border-color:var(--ema-blue-100);color:var(--ema-blue-600)}
.notification-tab.active{background:var(--ema-blue-50);border-color:var(--ema-blue-100);color:var(--ema-blue-700)}
.notification-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:8px;border:1px solid var(--ema-border);background:var(--ema-card-bg);color:var(--ema-slate-700);font-size:.78rem;font-weight:700;cursor:pointer;white-space:nowrap}
.notification-btn:hover:not(:disabled){background:var(--ema-slate-100);border-color:var(--ema-blue-100);color:var(--ema-blue-600)}
.notification-btn:disabled{opacity:.55;cursor:not-allowed}
.notification-btn.primary{background:linear-gradient(135deg,var(--ema-blue-600),var(--ema-blue-700));border-color:transparent;color:#fff}
.notification-btn.primary:hover:not(:disabled){background:var(--ema-blue-700)}
.notification-btn.success{background:linear-gradient(135deg,#16a34a,#15803d);border-color:transparent;color:#fff}
.notification-btn.success:hover:not(:disabled){background:#15803d}
.notification-btn.danger{background:#fef2f2;border-color:#fecaca;color:#dc2626}
.notification-btn.danger:hover:not(:disabled){background:#fee2e2}
.notification-body{flex:1;min-height:0;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:14px}
.notification-alert{padding:10px 14px;border-radius:10px;font-size:.8rem;font-weight:600;border:1px solid}
.notification-alert.success{background:#f0fdf4;border-color:#bbf7d0;color:#166534}
.notification-alert.error{background:#fef2f2;border-color:#fecaca;color:#991b1b}
.notification-alert.info{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}
.notification-grid{display:grid;grid-template-columns:1fr 300px;gap:14px;align-items:start}
.notification-whatsapp-grid,.notification-receiver-grid{grid-template-columns:1fr 320px}
.notification-panel{background:var(--ema-card-bg);border:1px solid var(--ema-border);border-radius:12px;overflow:hidden;display:flex;flex-direction:column}
.notification-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid var(--ema-border)}
.notification-panel-head.compact{padding:10px 14px}
.notification-panel-head h3{margin:0 0 2px;font-size:.9rem;font-weight:800;color:var(--ema-slate-900)}
.notification-panel-head p{margin:0;font-size:.74rem;color:var(--ema-slate-500)}
.notification-provider-tabs{display:flex;align-items:center;gap:4px;flex-wrap:wrap;flex-shrink:0}
.notification-provider-tab{padding:5px 10px;border-radius:6px;border:1px solid var(--ema-border);background:transparent;color:var(--ema-slate-600);font-size:.74rem;font-weight:700;cursor:pointer}
.notification-provider-tab:hover{background:var(--ema-blue-50);border-color:var(--ema-blue-100);color:var(--ema-blue-600)}
.notification-provider-tab.active{background:var(--ema-blue-600);border-color:var(--ema-blue-600);color:#fff}
.notification-form{padding:14px 16px;display:flex;flex-direction:column;gap:12px}
.notification-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.notification-recipient-form-grid{grid-template-columns:1fr 1fr}
.notification-field{display:flex;flex-direction:column;gap:4px;font-size:.78rem;font-weight:700;color:var(--ema-slate-700)}
.notification-field input{border:1px solid var(--ema-border);border-radius:8px;padding:8px 10px;font-size:.8rem;color:var(--ema-slate-900);background:var(--ema-card-bg);font-family:inherit;width:100%;outline:none}
.notification-field input:focus{border-color:var(--ema-blue-500)}
.notification-field-hint{display:block;font-size:.69rem;font-weight:600;color:var(--ema-slate-400);margin-top:1px}
.notification-toggle{display:inline-flex;align-items:center;gap:8px;padding:7px 12px;border-radius:8px;border:1px solid var(--ema-border);background:var(--ema-slate-100);color:var(--ema-slate-600);font-size:.78rem;font-weight:700;cursor:pointer}
.notification-toggle input{accent-color:var(--ema-blue-600)}
.notification-toggle.on{background:var(--ema-blue-50);border-color:var(--ema-blue-100);color:var(--ema-blue-700)}
.notification-toggle.whatsapp.on{background:#f0fdf4;border-color:#bbf7d0;color:#16a34a}
.notification-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}
.notification-actions.split{justify-content:space-between}
.notification-status-pill{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;border:1px solid var(--ema-border);background:var(--ema-slate-100);color:var(--ema-slate-500);font-size:.72rem;font-weight:800}
.notification-status-pill.enabled{background:#dcfce7;border-color:#bbf7d0;color:#15803d}
.notification-card{background:var(--ema-card-bg);border:1px solid var(--ema-border);border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:10px;align-items:flex-start}
.notification-usage-head{display:flex;align-items:flex-start;gap:10px;width:100%}
.notification-usage-head>div{flex:1;min-width:0}
.notification-usage-head h4{margin:0 0 2px;font-size:.82rem;font-weight:800;color:var(--ema-slate-900)}
.notification-usage-head p{margin:0;font-size:.71rem;color:var(--ema-slate-500)}
.notification-usage-meter{width:100%;height:8px;border-radius:4px;background:var(--ema-slate-200);overflow:hidden}
.notification-usage-meter>i{display:block;height:100%;background:linear-gradient(90deg,var(--ema-blue-600),#0891b2);border-radius:4px}
.notification-usage{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:100%}
.notification-usage>div{display:flex;flex-direction:column;gap:2px}
.notification-usage>div>span{font-size:.64rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--ema-slate-500)}
.notification-usage>div>strong{font-size:.88rem;font-weight:800;color:var(--ema-slate-900)}
.notification-recipient-list-panel{min-height:200px}
.notification-recipient-list{flex:1;overflow-y:auto;padding:8px}
.notification-empty{padding:24px;text-align:center;font-size:.78rem;color:var(--ema-slate-500)}
.notification-recipient-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border:1px solid var(--ema-border);border-radius:8px;margin-bottom:6px}
.notification-recipient-row:last-child{margin-bottom:0}
.notification-recipient-row>div:first-child{min-width:0;flex:1}
.notification-recipient-row strong{display:block;font-size:.8rem;font-weight:800;color:var(--ema-slate-900);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.notification-recipient-row span{display:block;font-size:.72rem;color:var(--ema-slate-500)}
.notification-recipient-row small{display:block;font-size:.68rem;color:var(--ema-slate-400)}
.notification-recipient-actions{display:flex;align-items:center;gap:6px;flex-shrink:0}
.notification-recipient-options{display:flex;flex-wrap:wrap;gap:8px}
.notification-rule-list{display:flex;flex-direction:column;gap:8px}
.notification-rule-card{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border:1px solid var(--ema-border);border-radius:10px}
.notification-rule-card:hover{border-color:var(--ema-blue-100);background:var(--ema-blue-50)}
.notification-rule-title{font-size:.82rem;font-weight:800;color:var(--ema-slate-900);margin-bottom:2px}
.notification-rule-desc{font-size:.72rem;color:var(--ema-slate-500)}
.notification-template-sid{font-size:.68rem;color:var(--ema-slate-400);margin-top:2px}
.notification-toggle-group{display:flex;align-items:center;gap:8px;flex-shrink:0}
.notification-status-card{font-size:.76rem;color:var(--ema-slate-600);min-height:60px}
html.ema-dark .notification-panel,.ema-dark .notification-card{background:var(--ema-card-bg);border-color:var(--ema-border)}
html.ema-dark .notification-panel-head{border-color:var(--ema-border)}
html.ema-dark .notification-rule-card:hover{background:rgba(59,130,246,.07)}
html.ema-dark .notification-toggle{background:var(--ema-slate-100);border-color:var(--ema-border)}
html.ema-dark .notification-btn{background:var(--ema-card-bg);border-color:var(--ema-border);color:var(--ema-slate-900)}
html.ema-dark .notification-field input{background:var(--ema-card-bg);border-color:var(--ema-border);color:var(--ema-slate-900)}
html.ema-dark .notification-usage-meter{background:var(--ema-slate-200)}
html.ema-dark .notification-recipient-row{border-color:var(--ema-border)}

/* ── Toast (shared by notification and other portal toasts) ── */
.settings-toast-layer{position:fixed;bottom:24px;right:24px;z-index:9000;pointer-events:none}
.settings-toast{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:12px;background:var(--ema-card-bg);border:1px solid var(--ema-border);box-shadow:0 8px 24px rgba(15,23,42,.2);max-width:360px;min-width:240px;pointer-events:auto}
.settings-toast-success{border-color:#bbf7d0;background:#f0fdf4}
.settings-toast-error{border-color:#fecaca;background:#fef2f2}
.settings-toast-info{border-color:#bfdbfe;background:#eff6ff}
.settings-toast-icon{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:900;flex-shrink:0;background:var(--ema-slate-100)}
.settings-toast-success .settings-toast-icon{background:#dcfce7;color:#15803d}
.settings-toast-error .settings-toast-icon{background:#fee2e2;color:#dc2626}
.settings-toast-info .settings-toast-icon{background:#dbeafe;color:#1d4ed8}
.settings-toast>div strong{display:block;font-size:.78rem;font-weight:800;color:var(--ema-slate-900);margin-bottom:2px}
.settings-toast>div span{display:block;font-size:.72rem;color:var(--ema-slate-600)}
.settings-toast-close{margin-left:auto;flex-shrink:0;background:none;border:none;cursor:pointer;font-size:1.1rem;color:var(--ema-slate-400);line-height:1;padding:0}
.settings-toast-close:hover{color:var(--ema-slate-700)}
html.ema-dark .settings-toast{background:var(--ema-card-bg);border-color:var(--ema-border)}
html.ema-dark .settings-toast-success{border-color:rgba(34,197,94,.3);background:rgba(34,197,94,.08)}
html.ema-dark .settings-toast-error{border-color:rgba(239,68,68,.3);background:rgba(239,68,68,.08)}
`;


function getCategoryName(categories: CategoryRow[], categoryId: string) {
  return categories.find((category) => String(category.CategoryID) === String(categoryId))?.CategoryName || "";
}

function pickErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function normalizeTime(value?: string) {
  return String(value || "").slice(0, 5) || "";
}

function getSoftwareKey(row: SoftwareRow) {
  return [row.SWUNI_Idn || row.SoftwareID || row.SoftwareName, row.Publisher || "", row.Version || ""].join("||");
}

function dateOnly(value?: string) {
  return value ? String(value).slice(0, 10) : "";
}

function formatMoney(value: string, currency: string) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return `${currency || "RM"} 0.00`;
  return `${currency || "RM"} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}


function SoftwareRegistryManagement() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [publishers, setPublishers] = useState<PublisherRow[]>([]);
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [activePolicyId, setActivePolicyId] = useState<number | null>(null);
  const [ruleForm, setRuleForm] = useState<RuleForm>(EMPTY_RULE);
  const [softwareForm, setSoftwareForm] = useState<SoftwareForm>(EMPTY_SOFTWARE_FORM);
  const [softwareSearch, setSoftwareSearch] = useState("");
  const [softwareRows, setSoftwareRows] = useState<SoftwareRow[]>([]);
  const [policyItems, setPolicyItems] = useState<PolicyItem[]>([]);
  const [selectedSoftware, setSelectedSoftware] = useState<SoftwareRow | null>(null);
  const [uiMode, setUiMode] = useState<"list" | "form">("list");
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [subSoftwareName, setSubSoftwareName] = useState("");
  const [loading, setLoading] = useState(false);
  const [softwareLoading, setSoftwareLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const activePolicy = useMemo(() => policies.find((policy) => policy.PolicyID === activePolicyId) || null, [activePolicyId, policies]);
  const selectedSoftwareKey = selectedSoftware ? getSoftwareKey(selectedSoftware) : "";
  const licenseTotalCost = useMemo(() => {
    const license = Number(softwareForm.licenseCount || 0);
    const unitPrice = Number(softwareForm.unitPrice || 0);
    if (!Number.isFinite(license) || !Number.isFinite(unitPrice)) return 0;
    return license * unitPrice;
  }, [softwareForm.licenseCount, softwareForm.unitPrice]);

  const currentCategoryName = ruleForm.categoryId === "__other__" ? customCategoryName.trim() : getCategoryName(categories, ruleForm.categoryId);
  const resolvedRegistrySoftware: SoftwareRow | null = useMemo(() => {
    const policyName = ruleForm.policyName.trim();
    if (!policyName) return null;
    if (selectedSoftware) return selectedSoftware;
    const edition = subSoftwareName.trim();
    return {
      SWUNI_Idn: null,
      SoftwareID: `manual-${policyName}-${ruleForm.publisher || "publisher"}`,
      SoftwareName: edition || policyName,
      CategoryID: ruleForm.categoryId === "__other__" ? null : Number(ruleForm.categoryId) || null,
      CategoryName: currentCategoryName,
      Publisher: ruleForm.publisher,
      Version: edition || undefined,
      InstalledCount: 0,
      InstalledDeviceCount: 0,
    };
  }, [currentCategoryName, ruleForm.categoryId, ruleForm.policyName, ruleForm.publisher, selectedSoftware, subSoftwareName]);

  const loadPolicies = useCallback(async () => {
    const payload = await api.get(`${API_ROOT}/policies`, { forceRefresh: true });
    const rows = unwrapArray<PolicyRow>(payload).sort((a, b) => String(b.UpdatedAt || b.CreatedAt || "").localeCompare(String(a.UpdatedAt || a.CreatedAt || "")));
    setPolicies(rows);
    setActivePolicyId((current) => (rows.some((row) => row.PolicyID === current) ? current : null));
  }, []);

  const loadBase = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [categoryPayload] = await Promise.all([
        api.get(`${API_ROOT}/categories`, { forceRefresh: true }),
        loadPolicies(),
      ]);
      setCategories(unwrapArray<CategoryRow>(categoryPayload));
    } catch (error) {
      setMessage({ type: "error", text: pickErrorMessage(error, "Failed to load software registry setup.") });
    } finally {
      setLoading(false);
    }
  }, [loadPolicies]);

  const loadPolicyItems = useCallback(async (policyId: number) => {
    const payload = await api.get(`${API_ROOT}/policies/${policyId}/items`, { forceRefresh: true });
    setPolicyItems(unwrapArray<PolicyItem>(payload).slice(0, 1));
  }, []);

  const loadPublishers = useCallback(async (categoryId: string) => {
    if (!categoryId || categoryId === "__other__") {
      setPublishers([]);
      return;
    }
    try {
      const payload = await api.get(`${API_ROOT}/publishers?categoryId=${encodeURIComponent(categoryId)}`, { forceRefresh: true });
      setPublishers(unwrapArray<PublisherRow>(payload));
    } catch (error) {
      setPublishers([]);
      setMessage({ type: "error", text: pickErrorMessage(error, "Failed to load publisher list.") });
    }
  }, []);

  const loadSoftwareRows = useCallback(async () => {
    if (uiMode !== "form" || !ruleForm.categoryId || ruleForm.categoryId === "__other__" || !ruleForm.publisher) {
      setSoftwareRows([]);
      return;
    }
    setSoftwareLoading(true);
    try {
      const query = new URLSearchParams({
        categoryId: ruleForm.categoryId,
        publisher: ruleForm.publisher,
        search: softwareSearch,
        limit: "200",
      });
      const payload = await api.get(`${API_ROOT}/software?${query.toString()}`, { forceRefresh: true });
      setSoftwareRows(unwrapArray<SoftwareRow>(payload));
    } catch (error) {
      setSoftwareRows([]);
      setMessage({ type: "error", text: pickErrorMessage(error, "Failed to load software list.") });
    } finally {
      setSoftwareLoading(false);
    }
  }, [uiMode, ruleForm.categoryId, ruleForm.publisher, softwareSearch]);

  useEffect(() => { void loadBase(); }, [loadBase]);

  useEffect(() => {
    if (uiMode !== "form" || !activePolicy) return;
    const nextCategoryId = activePolicy.CategoryID ? String(activePolicy.CategoryID) : "";
    setRuleForm({
      ...EMPTY_RULE,
      policyName: activePolicy.PolicyName || "",
      description: activePolicy.Description || "",
      categoryId: nextCategoryId,
      workingStartTime: normalizeTime(activePolicy.WorkingStartTime) || "09:00",
      workingEndTime: normalizeTime(activePolicy.WorkingEndTime) || "17:00",
      utilizedHours: String(activePolicy.UtilizedHours ?? 2),
      underUtilizedHours: String(activePolicy.UnderUtilizedHours ?? 1),
      openCountThreshold: String(activePolicy.OpenCountThreshold ?? 1),
    });
    setCustomCategoryName(activePolicy.CategoryID ? "" : activePolicy.CategoryName || "");
    setSubSoftwareName("");
    setSelectedSoftware(null);
    void loadPublishers(nextCategoryId);
    void loadPolicyItems(activePolicy.PolicyID);
  }, [uiMode, activePolicy, loadPolicyItems, loadPublishers]);

  useEffect(() => {
    if (uiMode !== "form") return;
    const item = policyItems[0];
    if (!item) return;
    setSelectedSoftware({
      SWUNI_Idn: item.SWUNI_Idn,
      SoftwareID: item.SoftwareID,
      SoftwareName: item.SoftwareName,
      CategoryID: item.CategoryID,
      CategoryName: item.CategoryName,
      Publisher: item.Publisher,
      Version: item.Version,
      InstalledCount: item.InstalledCount,
      InstalledDeviceCount: item.InstalledDeviceCount,
    });
    setSoftwareForm({
      classification: item.ComplianceStatus || item.Classification || "Legal",
      licenseCount: String(item.LicenseCount ?? ""),
      licenseKey: item.LicenseKey || "",
      licenseStartDate: dateOnly(item.LicenseStartDate),
      licenseEndDate: dateOnly(item.LicenseEndDate),
      unitPrice: String(item.UnitPrice ?? ""),
      currency: item.Currency || "RM",
    });
    setRuleForm((current) => ({
      ...current,
      categoryId: item.CategoryID ? String(item.CategoryID) : current.categoryId,
      publisher: item.Publisher || current.publisher,
      workingStartTime: normalizeTime(item.WorkingStartTime) || current.workingStartTime,
      workingEndTime: normalizeTime(item.WorkingEndTime) || current.workingEndTime,
      utilizedHours: String(item.UtilizedHours ?? current.utilizedHours),
      underUtilizedHours: String(item.UnderUtilizedHours ?? current.underUtilizedHours),
      notUsedHours: String(item.NotUsedHours ?? current.notUsedHours),
      openCountThreshold: String(item.OpenCountThreshold ?? current.openCountThreshold),
      description: item.Notes || current.description,
    }));
  }, [uiMode, policyItems]);

  useEffect(() => {
    if (uiMode !== "form") return;
    const timer = window.setTimeout(() => { void loadSoftwareRows(); }, 250);
    return () => window.clearTimeout(timer);
  }, [uiMode, loadSoftwareRows]);

  const startNewRegistry = () => {
    setActivePolicyId(null);
    setRuleForm(EMPTY_RULE);
    setSoftwareForm(EMPTY_SOFTWARE_FORM);
    setPolicyItems([]);
    setSelectedSoftware(null);
    setSoftwareRows([]);
    setPublishers([]);
    setCustomCategoryName("");
    setSubSoftwareName("");
    setSoftwareSearch("");
    setUiMode("form");
    setMessage({ type: "info", text: "Register purchased software. Inventory child selection is optional when no child software exists." });
  };

  const openRegistry = (policyId: number) => {
    setActivePolicyId(policyId);
    setPolicyItems([]);
    setSelectedSoftware(null);
    setUiMode("form");
  };

  const buildRulePayload = () => ({
    PolicyName: ruleForm.policyName.trim(),
    Description: ruleForm.description.trim(),
    CategoryID: ruleForm.categoryId === "__other__" ? null : Number(ruleForm.categoryId) || null,
    CategoryName: ruleForm.categoryId === "__other__" ? customCategoryName.trim() : getCategoryName(categories, ruleForm.categoryId),
    WorkingStartTime: ruleForm.workingStartTime || "09:00",
    WorkingEndTime: ruleForm.workingEndTime || "17:00",
    WorkDays: "Mon-Fri",
    UtilizedHours: Number(ruleForm.utilizedHours) || 2,
    UnderUtilizedHours: Number(ruleForm.underUtilizedHours) || 1,
    OpenCountThreshold: Number(ruleForm.openCountThreshold) || 1,
  });

  const validateRegistry = () => {
    if (!ruleForm.policyName.trim()) return "Software name is required.";
    if (!ruleForm.categoryId) return "Software category is required.";
    if (ruleForm.categoryId === "__other__" && !customCategoryName.trim()) return "Custom category name is required.";
    if (!ruleForm.publisher) return "Publisher is required.";
    return "";
  };

  const saveRule = async () => {
    const policyId = activePolicy?.PolicyID;
    setSaving(true);
    try {
      const payload = buildRulePayload();
      if (policyId) {
        await api.put(`${API_ROOT}/policies/${policyId}`, payload);
        await loadPolicies();
        return policyId;
      }
      const createdPayload = await api.post(`${API_ROOT}/policies`, payload);
      const created = unwrapArray<PolicyRow>(createdPayload)[0] || (createdPayload as { data?: PolicyRow })?.data;
      await loadPolicies();
      if (created?.PolicyID) setActivePolicyId(created.PolicyID);
      return created?.PolicyID || null;
    } catch (error) {
      setMessage({ type: "error", text: pickErrorMessage(error, "Failed to save software registry.") });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setRuleForm((current) => ({ ...current, categoryId, publisher: "" }));
    setSelectedSoftware(null);
    setSoftwareRows([]);
    if (categoryId === "__other__") {
      setPublishers([]);
      return;
    }
    void loadPublishers(categoryId);
  };

  const handlePublisherChange = (publisher: string) => {
    setRuleForm((current) => ({ ...current, publisher }));
    setSelectedSoftware(null);
    setSoftwareRows([]);
  };

  const saveRegistry = async () => {
    const validation = validateRegistry();
    if (validation) {
      setMessage({ type: "error", text: validation });
      return;
    }

    const effectiveSoftware = resolvedRegistrySoftware;
    if (!effectiveSoftware) {
      setMessage({ type: "error", text: "Software name is required." });
      return;
    }

    const policyId = await saveRule();
    if (!policyId) return;

    setSaving(true);
    try {
      await api.post(`${API_ROOT}/policies/${policyId}/items`, {
        items: [{
          SWUNI_Idn: effectiveSoftware.SWUNI_Idn || null,
          SoftwareName: effectiveSoftware.SoftwareName || ruleForm.policyName.trim(),
          CategoryID: effectiveSoftware.CategoryID || (ruleForm.categoryId === "__other__" ? null : Number(ruleForm.categoryId) || null),
          CategoryName: effectiveSoftware.CategoryName || currentCategoryName,
          Publisher: effectiveSoftware.Publisher || ruleForm.publisher,
          Version: effectiveSoftware.Version || subSoftwareName.trim(),
          Classification: "Legal",
          ComplianceStatus: "Legal",
          WorkingStartTime: ruleForm.workingStartTime || "09:00",
          WorkingEndTime: ruleForm.workingEndTime || "17:00",
          WorkDays: "Mon-Fri",
          UtilizedHours: Number(ruleForm.utilizedHours) || 2,
          UnderUtilizedHours: Number(ruleForm.underUtilizedHours) || 1,
          NotUsedHours: Number(ruleForm.notUsedHours) || 0,
          OpenCountThreshold: Number(ruleForm.openCountThreshold) || 1,
          LicenseCount: Number(softwareForm.licenseCount) || 0,
          LicenseKey: softwareForm.licenseKey,
          LicenseStartDate: softwareForm.licenseStartDate || null,
          LicenseEndDate: softwareForm.licenseEndDate || null,
          UnitPrice: Number(softwareForm.unitPrice) || 0,
          Currency: softwareForm.currency || "RM",
          Notes: ruleForm.description,
        }],
      });
      await loadPolicyItems(policyId);
      await loadPolicies();
      setUiMode("list");
      setMessage({ type: "success", text: "Software registry saved." });
    } catch (error) {
      setMessage({ type: "error", text: pickErrorMessage(error, "Failed to save software registry item.") });
    } finally {
      setSaving(false);
    }
  };

  const deleteRegistryPolicy = async (policy: PolicyRow) => {
    if (!window.confirm(`Delete ${policy.PolicyName}?`)) return;
    try {
      await api.delete(`${API_ROOT}/policies/${policy.PolicyID}`);
      if (activePolicyId === policy.PolicyID) setActivePolicyId(null);
      await loadPolicies();
      setUiMode("list");
      setMessage({ type: "success", text: "Software registry deleted." });
    } catch (error) {
      setMessage({ type: "error", text: pickErrorMessage(error, "Failed to delete software registry.") });
    }
  };

  return (
    <section className="software-policy-module">
      <header className="sp-top">
        <div>
          <span className="sp-chip">Settings</span>
          <h2>Software Registry</h2>
          <p>Register purchased software, classify legal status, license cost and usage rules.</p>
        </div>
        {uiMode === "list" ? <button className="sp-btn primary" type="button" onClick={startNewRegistry}><Plus size={16} /> Register Software</button> : null}
      </header>

      <main className="sp-work">
        {uiMode === "list" ? (
          <div className="sp-policy-table-screen">
            {message && <div className={`sp-alert ${message.type}`}>{message.text}</div>}
            <section className="sp-section sp-policy-table-card">
              <div className="sp-section-title">
                <strong>Software Registry</strong>
                <small>Each registration can apply to a parent software or one inventory child software.</small>
              </div>
              <div className="sp-section-body">
                <div className="sp-action-row" style={{ marginTop: 0, marginBottom: 12, justifyContent: "space-between" }}>
                  <span className="sp-help">{loading ? "Loading entries..." : `${policies.length} registry entrie(s) configured`}</span>
                  <button className="sp-icon" type="button" onClick={loadBase} disabled={loading} title="Refresh"><RefreshCw size={15} /></button>
                </div>
                <div className="sp-policy-table-wrap">
                  <div className="sp-policy-table-row head"><span>Registry Name</span><span>Category</span><span>Software</span><span>License</span><span>Work hours</span><span>Action</span></div>
                  {policies.length === 0 ? <div className="sp-empty">No software registry found. Click Register Software to create the first entry.</div> : policies.map((policy) => (
                    <div key={policy.PolicyID} className="sp-policy-table-row">
                      <span><strong>{policy.PolicyName}</strong><small>{policy.Description || "No note"}</small></span>
                      <span>{policy.CategoryName || "No category"}</span>
                      <span>{policy.TotalItems || 0}</span>
                      <span>{policy.LicenseTotal || 0}</span>
                      <span>{normalizeTime(policy.WorkingStartTime) || "09:00"} - {normalizeTime(policy.WorkingEndTime) || "17:00"}</span>
                      <span className="sp-policy-table-actions">
                        <button className="sp-icon" type="button" title="View" aria-label="View registry" onClick={() => openRegistry(policy.PolicyID)}><Eye size={14} /></button>
                        <button className="sp-icon" type="button" title="Edit" aria-label="Edit registry" onClick={() => openRegistry(policy.PolicyID)}><Pencil size={14} /></button>
                        <button className="sp-danger" type="button" title="Delete" aria-label="Delete registry" onClick={() => deleteRegistryPolicy(policy)}><Trash2 size={14} /></button>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="sp-policy-modal-backdrop">
            <div className="sp-policy-modal">
              <div className="sp-policy-modal-head">
                <div><strong>{activePolicy ? "Edit Software Registry" : "Register Software"}</strong><small>Inventory child selection is optional.</small></div>
                <div className="sp-top-actions"><button className="sp-btn secondary" type="button" onClick={() => setUiMode("list")}>Back to List</button><button className="sp-btn primary" type="button" onClick={saveRegistry} disabled={saving}><Save size={15} /> Save Registry</button></div>
              </div>
              <div className="sp-policy-modal-body">
                {message && <div className={`sp-alert ${message.type}`}>{message.text}</div>}
                <div className="sp-story">Flow: key in software name → choose category → choose publisher → choose inventory child only when available → set license, price and usage rules.</div>
                <div className="sp-flow-tabs"><span><b>1</b> Software name</span><span><b>2</b> Category & publisher</span><span><b>3</b> Optional inventory child</span><span><b>4</b> License & usage</span></div>

                <div className="sp-register-stack">
                  <section className="sp-section">
                    <div className="sp-section-title"><strong>1. Software registration</strong><small>Start with purchased software name, then choose category and publisher.</small></div>
                    <div className="sp-section-body">
                      <div className="sp-form-grid">
                        <label className="sp-field full"><span>Software name</span><input value={ruleForm.policyName} onChange={(e) => setRuleForm((c) => ({ ...c, policyName: e.target.value }))} placeholder="Example: Microsoft Office" /></label>
                        <label className="sp-field"><span>Software category</span><select value={ruleForm.categoryId} onChange={(e) => handleCategoryChange(e.target.value)}><option value="">Select category</option>{categories.map((row) => <option key={row.CategoryID} value={row.CategoryID}>{row.CategoryName}</option>)}<option value="__other__">Other / create custom category</option></select></label>
                        {ruleForm.categoryId === "__other__" && <label className="sp-field"><span>Custom category name</span><input value={customCategoryName} onChange={(e) => setCustomCategoryName(e.target.value)} placeholder="Example: Design Tool" /></label>}
                        <label className="sp-field"><span>Sub software / edition</span><input value={subSoftwareName} onChange={(e) => setSubSoftwareName(e.target.value)} placeholder="Optional, example: Pro / Enterprise / Add-on" /></label>
                        <label className="sp-field"><span>Publisher</span><select value={ruleForm.publisher} onChange={(e) => handlePublisherChange(e.target.value)} disabled={!ruleForm.categoryId || ruleForm.categoryId === "__other__"}><option value="">Select publisher after category</option>{publishers.map((row) => <option key={row.Publisher} value={row.Publisher}>{row.Publisher}</option>)}</select></label>
                      </div>

                      <div className="sp-map-panel">
                        <div className="sp-map-panel-head">
                          <div><strong>Inventory software list</strong><small>If this publisher has child software, select one. If not, save as parent software only.</small></div>
                          <label className="sp-search"><Search size={15} /><input value={softwareSearch} onChange={(e) => setSoftwareSearch(e.target.value)} placeholder="Search software..." disabled={!ruleForm.publisher} /></label>
                        </div>
                        <div className="sp-table">
                          <div className="sp-row head"><span></span><span>Software</span><span>Publisher</span><span>Installed</span></div>
                          {!ruleForm.categoryId ? <div className="sp-empty">Select software category first.</div> : !ruleForm.publisher ? <div className="sp-empty">Select publisher to display available child software.</div> : softwareLoading ? <div className="sp-empty">Loading software...</div> : softwareRows.length === 0 ? <div className="sp-empty">No child software found for this category and publisher. This registry can still be saved as parent software.</div> : softwareRows.map((row) => { const key = getSoftwareKey(row); const selected = selectedSoftwareKey === key; return (
                            <label key={key} className={`sp-row ${selected ? "selected" : ""}`}><span><input type="radio" name="software-registry-map" checked={selected} onChange={() => setSelectedSoftware(row)} /></span><span><strong>{row.SoftwareName}</strong><small>{row.Version || "No version"}</small></span><span>{row.Publisher || "Unknown"}</span><span>{row.InstalledCount ?? row.InstalledDeviceCount ?? 0}</span></label>
                          ); })}
                        </div>
                        <div className={`sp-selected-box ${!selectedSoftware ? "warning" : ""}`}>{selectedSoftware ? `Selected child software: ${selectedSoftware.SoftwareName}` : `No child selected. Registry will apply to parent software: ${subSoftwareName.trim() || ruleForm.policyName.trim() || "software name above"}`}</div>
                      </div>
                    </div>
                  </section>

                  <section className="sp-section">
                    <div className="sp-section-title"><strong>2. Classification, license & cost</strong><small>Classify the software and enter license cost for ROI calculation.</small></div>
                    <div className="sp-section-body">
                      <div className="sp-selected-box">This registry applies to: {resolvedRegistrySoftware?.SoftwareName || "software name above"}</div>
                      <div className="sp-cost-grid">
                        <label className="sp-field"><span>Total license</span><input type="number" min="0" value={softwareForm.licenseCount} onChange={(e) => setSoftwareForm((c) => ({ ...c, licenseCount: e.target.value }))} /></label>
                        <label className="sp-field"><span>Currency</span><select value={softwareForm.currency} onChange={(e) => setSoftwareForm((c) => ({ ...c, currency: e.target.value }))}><option value="RM">RM</option><option value="USD">USD</option><option value="SGD">SGD</option></select></label>
                        <label className="sp-field"><span>Price per license</span><input type="number" min="0" step="0.01" value={softwareForm.unitPrice} onChange={(e) => setSoftwareForm((c) => ({ ...c, unitPrice: e.target.value }))} placeholder="0.00" /></label>
                        <label className="sp-field"><span>Total cost</span><input value={formatMoney(String(licenseTotalCost), softwareForm.currency)} readOnly /></label>
                        <label className="sp-field"><span>License key/ref</span><input value={softwareForm.licenseKey} onChange={(e) => setSoftwareForm((c) => ({ ...c, licenseKey: e.target.value }))} /></label>
                        <label className="sp-field"><span>Start date</span><input type="date" value={softwareForm.licenseStartDate} onChange={(e) => setSoftwareForm((c) => ({ ...c, licenseStartDate: e.target.value }))} /></label>
                        <label className="sp-field"><span>Expiry date</span><input type="date" value={softwareForm.licenseEndDate} onChange={(e) => setSoftwareForm((c) => ({ ...c, licenseEndDate: e.target.value }))} /></label>
                      </div>
                    </div>
                  </section>

                  <section className="sp-section">
                    <div className="sp-section-title"><strong>3. Usage rule</strong><small>Set working hours and usage thresholds for utilization analysis.</small></div>
                    <div className="sp-section-body">
                      <div className="sp-form-grid">
                        <label className="sp-field"><span>Work start</span><input type="time" value={ruleForm.workingStartTime} onChange={(e) => setRuleForm((c) => ({ ...c, workingStartTime: e.target.value }))} /></label>
                        <label className="sp-field"><span>Work end</span><input type="time" value={ruleForm.workingEndTime} onChange={(e) => setRuleForm((c) => ({ ...c, workingEndTime: e.target.value }))} /></label>
                        <label className="sp-field"><span>Utilized if at least hour/day</span><input type="number" min="0" step="0.25" value={ruleForm.utilizedHours} onChange={(e) => setRuleForm((c) => ({ ...c, utilizedHours: e.target.value }))} /></label>
                        <label className="sp-field"><span>Underutilized if below hour/day</span><input type="number" min="0" step="0.25" value={ruleForm.underUtilizedHours} onChange={(e) => setRuleForm((c) => ({ ...c, underUtilizedHours: e.target.value }))} /></label>
                        <label className="sp-field"><span>Not used if hour/day</span><input type="number" min="0" step="0.25" value={ruleForm.notUsedHours} onChange={(e) => setRuleForm((c) => ({ ...c, notUsedHours: e.target.value }))} /></label>
                        <label className="sp-field"><span>Open count/day</span><input type="number" min="0" value={ruleForm.openCountThreshold} onChange={(e) => setRuleForm((c) => ({ ...c, openCountThreshold: e.target.value }))} /></label>
                        <label className="sp-field full"><span>Note</span><textarea value={ruleForm.description} onChange={(e) => setRuleForm((c) => ({ ...c, description: e.target.value }))} placeholder="Optional note" /></label>
                      </div>
                      <div className="sp-usage-note">Monday to Friday. ≥ {ruleForm.utilizedHours || 2} hour/day = utilized. Below {ruleForm.underUtilizedHours || 1} hour/day = underutilized. ≤ {ruleForm.notUsedHours || 0} hour/day = not used.</div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </section>
  );
}


function formatAgeSourceLabel(value: string) {
  return AGE_SOURCE_OPTIONS.find((item) => item.value === value)?.label || value || "Registration Date";
}

export default function Settings() {
  const auth = useAuth() as any;
  const [activeSection, setActiveSection] = useState<SectionKey>("roles");
  const [sectionSearch, setSectionSearch] = useState("");
  const [users, setUsers] = useState<UserAccess[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [accessRoles, setAccessRoles] = useState<AccessRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState("");
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [accessRoleModalOpen, setAccessRoleModalOpen] = useState(false);
  const [editingAccessRoleIndex, setEditingAccessRoleIndex] = useState<number | null>(null);
  const emptyAccessRoleForm: AccessRole = { roleKey: "", name: "", description: "", type: "", defaultAccess: "", approvalRequired: false, status: "Active", assignedUsers: 0 };
  const [accessRoleForm, setAccessRoleForm] = useState<AccessRole>(emptyAccessRoleForm);
  const [roleDeleteTarget, setRoleDeleteTarget] = useState<{ role: AccessRole; index: number } | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUserIndex, setEditingUserIndex] = useState<number | null>(null);
  const emptyUserForm: UserAccess = { name: "", username: "", email: "", role: "", roles: [], status: "Active", scope: "Role Based", department: "", position: "", phoneNo: "", requireMFA: false, mfa: false, accountLocked: false, lockReason: "", accessStartDate: "", accessEndDate: "", remarks: "", password: "", confirmPassword: "" };
  const [userForm, setUserForm] = useState<UserAccess>(emptyUserForm);

  const [moduleCatalog, setModuleCatalog] = useState<ModuleControlModule[]>([]);
  const [modulePermissions, setModulePermissions] = useState<ModulePermission[]>([]);
  const [moduleLoading, setModuleLoading] = useState(false);
  const [moduleError, setModuleError] = useState("");
  const [moduleLoaded, setModuleLoaded] = useState(false);
  const [moduleSavingKey, setModuleSavingKey] = useState("");
  const [accessPolicies, setAccessPolicies] = useState<AccessPolicy[]>([]);
  const [accessPoliciesLoading, setAccessPoliciesLoading] = useState(false);
  const [accessPoliciesError, setAccessPoliciesError] = useState("");
  const [accessPoliciesLoaded, setAccessPoliciesLoaded] = useState(false);
  const [accessPolicyModalOpen, setAccessPolicyModalOpen] = useState(false);
  const [editingAccessPolicyIndex, setEditingAccessPolicyIndex] = useState<number | null>(null);
  const emptyAccessPolicyForm: AccessPolicy = { policyKey: "", name: "", description: "", scope: "All Users", enforcement: "Mandatory", reviewCycle: "Quarterly", status: "Active", sortOrder: 0 };
  const [accessPolicyForm, setAccessPolicyForm] = useState<AccessPolicy>(emptyAccessPolicyForm);
  const [accessPolicyDeleteTarget, setAccessPolicyDeleteTarget] = useState<{ policy: AccessPolicy; index: number } | null>(null);
  const usersLoadInFlightRef = useRef(false);
  const rolesLoadInFlightRef = useRef(false);
  const moduleLoadInFlightRef = useRef(false);
  const accessPoliciesLoadInFlightRef = useRef(false);
  const auditLoadInFlightRef = useRef(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditExporting, setAuditExporting] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [auditLoaded, setAuditLoaded] = useState(false);
  const [auditModuleFilter, setAuditModuleFilter] = useState("all");
  const [auditSeverityFilter, setAuditSeverityFilter] = useState("all");
  const [auditDateFilter, setAuditDateFilter] = useState<AuditDateFilter>("30d");
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalRecords, setAuditTotalRecords] = useState(0);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const auditLimit = 10;

  const [pcAgingRule, setPcAgingRule] = useState<PcAgingRule>(DEFAULT_PC_AGING_RULE);
  const [pcAgingLoaded, setPcAgingLoaded] = useState(false);
  const [pcAgingLoading, setPcAgingLoading] = useState(false);
  const [pcAgingSaving, setPcAgingSaving] = useState(false);
  const [pcAgingError, setPcAgingError] = useState("");
  const [managementPolicyValues, setManagementPolicyValues] = useState<ManagementPolicyValues>(DEFAULT_MANAGEMENT_POLICY_VALUES);
  const [managementPolicyProfile, setManagementPolicyProfile] = useState<ManagementPolicyProfile | null>(null);
  const [managementPolicyLoaded, setManagementPolicyLoaded] = useState(false);
  const [managementPolicyLoading, setManagementPolicyLoading] = useState(false);
  const [managementPolicySaving, setManagementPolicySaving] = useState(false);
  const [managementPolicyError, setManagementPolicyError] = useState("");
  const [pricingRows, setPricingRows] = useState<PricingRow[]>([]);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingRowSavingId, setPricingRowSavingId] = useState("");
  const [pricingError, setPricingError] = useState("");
  const [pricingDeleteTarget, setPricingDeleteTarget] = useState<PricingRow | null>(null);
  const [resourceEngineers, setResourceEngineers] = useState<ResourceEngineer[]>([]);
  const [resourceSchedules, setResourceSchedules] = useState<ResourceSchedule[]>([]);
  const [resourceForm, setResourceForm] = useState<ResourceScheduleForm>(RESOURCE_EMPTY_FORM);
  const [resourceEditingId, setResourceEditingId] = useState<number | null>(null);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [resourceSaving, setResourceSaving] = useState(false);
  const [resourceError, setResourceError] = useState("");
  const [resourceLoaded, setResourceLoaded] = useState(false);
  const [incidentConfigTab, setIncidentConfigTab] = useState<IncidentConfigTab>("sla");
  const [slaConfigs, setSlaConfigs] = useState<SlaConfigRow[]>(DEFAULT_SLA_CONFIGS);
  const [workingHours, setWorkingHours] = useState<WorkingHourRow[]>(DEFAULT_WORKING_HOURS);
  const [incidentConfigLoading, setIncidentConfigLoading] = useState(false);
  const [incidentConfigSaving, setIncidentConfigSaving] = useState(false);
  const [incidentConfigError, setIncidentConfigError] = useState("");
  const [incidentConfigLoaded, setIncidentConfigLoaded] = useState(false);
  const [incidentCategories, setIncidentCategories] = useState<IncidentCategorySetupRow[]>([]);
  const [selectedIncidentCategoryId, setSelectedIncidentCategoryId] = useState("");
  const [selectedIncidentSubcategoryId, setSelectedIncidentSubcategoryId] = useState("");
  const [newIncidentCategoryName, setNewIncidentCategoryName] = useState("");
  const [newIncidentSubcategoryName, setNewIncidentSubcategoryName] = useState("");
  const [newIncidentDetailName, setNewIncidentDetailName] = useState("");
  const [categorySavingKey, setCategorySavingKey] = useState("");
  const [incidentDeleteTarget, setIncidentDeleteTarget] = useState<IncidentConfigDeleteTarget | null>(null);
  const [resourceDeleteTarget, setResourceDeleteTarget] = useState<ResourceDeleteTarget | null>(null);
  const [userDeleteTarget, setUserDeleteTarget] = useState<{ user: UserAccess; index: number } | null>(null);
  const [settingsToast, setSettingsToast] = useState<SettingsToastState>(null);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [brandOptionsByCategory, setBrandOptionsByCategory] = useState<Record<string, string[]>>({});
  const [modelOptionsByKey, setModelOptionsByKey] = useState<Record<string, string[]>>({});
  const settingsAccessInfo = useMemo(() => getSettingsAccessInfo(auth), [auth]);
  const allowedSectionOrder = useMemo(
    () => sectionOrder.filter((key) => canViewSettingsSection(key, settingsAccessInfo)),
    [settingsAccessInfo]
  );
  const canViewActiveSettingsSection = canViewSettingsSection(activeSection, settingsAccessInfo);

  useEffect(() => {
    if (allowedSectionOrder.length === 0) return;
    if (canViewSettingsSection(activeSection, settingsAccessInfo)) return;
    setActiveSection(allowedSectionOrder[0]);
    setSectionSearch("");
  }, [activeSection, allowedSectionOrder, settingsAccessInfo]);

  const active = sections[canViewActiveSettingsSection ? activeSection : (allowedSectionOrder[0] || activeSection)];
  const usersTotalCount = users.length;
  const usersActiveCount = users.filter((user) => user.status === "Active" && user.isActive !== false).length;
  const usersLockedCount = users.filter((user) => user.accountLocked || user.status === "Locked").length;
  const usersMfaCount = users.filter((user) => user.requireMFA || user.mfa).length;
  const rolesTotalCount = accessRoles.length;
  const rolesActiveCount = accessRoles.filter((role) => role.status === "Active").length;
  const moduleTotalCount = moduleCatalog.length;
  const moduleActiveRoleCount = accessRoles.filter((role) => role.status === "Active").length;
  const accessPolicyTotalCount = accessPolicies.length;
  const accessPolicyActiveCount = accessPolicies.filter((policy) => policy.status === "Active").length;
  const incidentConfigMeta = getIncidentConfigMeta(incidentConfigTab, slaConfigs, workingHours, incidentCategories);
  const activeHeroTitle = activeSection === "incident" ? incidentConfigMeta.title : active.title;
  const activeHeroDesc = activeSection === "incident" ? incidentConfigMeta.description : active.desc;
  const auditTodayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();
  const auditTotalCount = auditTotalRecords || auditLogs.length;
  const auditTodayCount = auditLogs.filter((log) => getAuditTimestampMs(log) >= auditTodayStart).length;
  const roleOptionsForUsers = accessRoles.filter((role) => role.status !== "Inactive").map((role) => role.name);
  const filteredContentTerm = sectionSearch.trim().toLowerCase();

  // Server-side pagination is used for Audit Log, so do not filter the current page again on the client.
  const auditBaseModuleOptions = [
    "User Access Management",
    "Role Based Control",
    "Module Control by Role",
    "Access Control",
    "Device Pricing",
    "PC Aging Rule",
    "Audit Logs",
    "Settings",
    "Notification Channels",
    "Security & Auth",
  ];
  const auditModuleOptions = Array.from(new Set([...auditBaseModuleOptions, ...auditLogs.map((log) => log.module).filter(Boolean)])).sort((a, b) => a.localeCompare(b));
  const auditSeverityOptions = ["Success", "Info", "Warning", "Error"];
  const filteredAuditLogs = auditLogs;
  const heroScoreOne = activeSection === "users" ? String(usersTotalCount) : activeSection === "roles" ? String(rolesTotalCount) : activeSection === "modules" ? String(moduleTotalCount) : activeSection === "access" ? String(accessPolicyTotalCount) : activeSection === "audit" ? String(auditTotalCount) : activeSection === "incident" ? incidentConfigMeta.scoreOne : activeSection === "aging" ? String(pcAgingRule.monitorMaxYears) : activeSection === "policy" ? String(MANAGEMENT_POLICY_FIELDS.length) : activeSection === "resources" ? String(resourceSchedules.length) : active.scoreOne;
  const heroScoreTwo = activeSection === "users" ? String(usersLockedCount) : activeSection === "roles" ? String(rolesActiveCount) : activeSection === "modules" ? String(moduleActiveRoleCount) : activeSection === "access" ? String(accessPolicyActiveCount) : activeSection === "audit" ? String(auditTodayCount) : activeSection === "incident" ? incidentConfigMeta.scoreTwo : activeSection === "aging" ? String(pcAgingRule.agingMinYears) : activeSection === "policy" ? (managementPolicyProfile?.profileName || "Global") : activeSection === "resources" ? String(resourceEngineers.length) : active.scoreTwo;

  const showToast = (tone: ToastTone, title: string, message: string) => {
    const toastId = Date.now();
    setSettingsToast({ id: toastId, tone, title, message });
    window.setTimeout(() => {
      setSettingsToast((current) => (current?.id === toastId ? null : current));
    }, 3600);
  };

  const loadUsers = async () => {
    if (usersLoadInFlightRef.current) return;
    usersLoadInFlightRef.current = true;
    setUsersLoading(true);
    setUsersError("");

    try {
      const rows = await settingsUsers.getAll() as UserApiRow[];
      const activeRows = rows
        .map(mapUserApiRow)
        .filter((user) => user.isActive !== false && user.status !== "Inactive");
      setUsers(sortUsersByCreatedDate(activeRows));
      setUsersLoaded(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load user access records.";
      setUsersError(message);
      showToast("error", "User access load failed", message);
    } finally {
      usersLoadInFlightRef.current = false;
      setUsersLoading(false);
    }
  };


  const loadAccessRoles = async () => {
    if (rolesLoadInFlightRef.current) return;
    rolesLoadInFlightRef.current = true;
    setRolesLoading(true);
    setRolesError("");

    try {
      const rows = await settingsRoles.getAll() as RoleApiRow[];
      setAccessRoles(sortAccessRoles(rows.map(normalizeAccessRole)));
      setRolesLoaded(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load role based control records.";
      setRolesError(message);
      showToast("error", "Role load failed", message);
    } finally {
      rolesLoadInFlightRef.current = false;
      setRolesLoading(false);
    }
  };


  const loadModuleAccess = async () => {
    if (moduleLoadInFlightRef.current) return;
    moduleLoadInFlightRef.current = true;
    setModuleLoading(true);
    setModuleError("");

    try {
      const payload = await settingsModuleAccess.get() as NonNullable<ModuleAccessApiResponse["data"]>;
      const modules = (payload.modules || []).map((row) => normalizeModuleRow(row));
      const permissions = (payload.permissions || []).map((row) => normalizeModulePermission(row));
      const roles = payload.roles;

      setModuleCatalog([...modules].sort((a, b) => (Number(a.sortOrder || 0) - Number(b.sortOrder || 0)) || a.moduleName.localeCompare(b.moduleName)));
      setModulePermissions(permissions);
      if (Array.isArray(roles) && roles.length) {
        setAccessRoles(sortAccessRoles(roles.map(normalizeAccessRole)));
        setRolesLoaded(true);
      }
      setModuleLoaded(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load module role access.";
      setModuleError(message);
      showToast("error", "Module access load failed", message);
    } finally {
      moduleLoadInFlightRef.current = false;
      setModuleLoading(false);
    }
  };

  const loadAccessPolicies = async () => {
    if (accessPoliciesLoadInFlightRef.current) return;
    accessPoliciesLoadInFlightRef.current = true;
    setAccessPoliciesLoading(true);
    setAccessPoliciesError("");

    try {
      const rows = await settingsAccessControls.getAll() as AccessPolicyApiRow[];
      setAccessPolicies(sortAccessPolicies(rows.map(normalizeAccessPolicy)));
      setAccessPoliciesLoaded(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load access control records.";
      setAccessPoliciesError(message);
      showToast("error", "Access control load failed", message);
    } finally {
      accessPoliciesLoadInFlightRef.current = false;
      setAccessPoliciesLoading(false);
    }
  };

  const buildAuditQueryString = (page = auditPage, limit = auditLimit) => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));

    if (filteredContentTerm) params.set("search", filteredContentTerm);
    if (auditModuleFilter !== "all") params.set("module", auditModuleFilter);
    if (auditSeverityFilter !== "all") params.set("severity", auditSeverityFilter);
    if (auditDateFilter !== "all") params.set("dateRange", auditDateFilter);

    return params.toString();
  };

  const loadAuditLogs = async (page = auditPage) => {
    if (auditLoadInFlightRef.current) return;
    auditLoadInFlightRef.current = true;
    setAuditLoading(true);
    setAuditError("");

    try {
      const payload = await auditApiRequest<AuditLogsApiResponse>(`/api/settings/audit-logs?${buildAuditQueryString(page)}`);
      const rows = Array.isArray(payload.data) ? payload.data : [];
      setAuditLogs(rows.map(mapAuditLogApiRow).sort((a, b) => getAuditTimestampMs(b) - getAuditTimestampMs(a)));
      setAuditTotalRecords(Number(payload.totalRecords || rows.length || 0));
      setAuditTotalPages(Math.max(1, Number(payload.totalPages || 1)));
      setAuditPage(Math.max(1, Number(payload.page || page || 1)));
      setAuditLoaded(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load audit logs.";
      setAuditError(message);
      showToast("error", "Audit log load failed", message);
    } finally {
      auditLoadInFlightRef.current = false;
      setAuditLoading(false);
    }
  };

  const logIncidentConfigAudit = async (action: string, details: string, entityType = "", entityID: number | string = "") => {
    try {
      await settingsAuditLogs.create({
        module: "Incident Config",
        action,
        severity: "Success",
        details,
        entityType,
        entityID: String(entityID || ""),
      });
      setAuditLoaded(false);
    } catch (error) {
      console.warn("Incident Config audit logging skipped:", error);
    }
  };

  const exportAuditLogs = async () => {
    if (auditExporting) return;

    setAuditExporting(true);

    try {
      const exportPageSize = 500;
      const maxExportRecords = 50000;
      let currentPage = 1;
      let totalPagesToRead = 1;
      const exportRows: AuditLog[] = [];

      do {
        const payload = await auditApiRequest<AuditLogsApiResponse>(`/api/settings/audit-logs?${buildAuditQueryString(currentPage, exportPageSize)}`);
        const rows = Array.isArray(payload.data) ? payload.data : [];
        exportRows.push(...rows.map(mapAuditLogApiRow));
        totalPagesToRead = Math.max(1, Number(payload.totalPages || 1));
        currentPage += 1;
      } while (currentPage <= totalPagesToRead && exportRows.length < maxExportRecords);

      const rows = exportRows
        .slice(0, maxExportRecords)
        .sort((a, b) => getAuditTimestampMs(b) - getAuditTimestampMs(a));

      if (rows.length === 0) {
        showToast("warning", "No audit records", "There are no audit logs to export with the current filters.");
        return;
      }

      const header = ["Time", "User", "Module", "Action", "Severity", "Details"];
      const csvRows = [header, ...rows.map((row) => [formatAuditTimestamp(row.timestamp), row.user, row.module, row.action, row.severity, row.details || ""])];
      const csv = csvRows.map((row) => row.map(csvCell).join(",")).join("\n");
      const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      const filterName = [
        auditModuleFilter !== "all" ? auditModuleFilter : "all-modules",
        auditSeverityFilter !== "all" ? auditSeverityFilter : "all-statuses",
        auditDateFilter,
      ]
        .join("-")
        .replace(/[^a-z0-9-]+/gi, "-")
        .toLowerCase();

      link.href = url;
      link.download = `ema-audit-log-${filterName}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      try {
        await auditApiRequest("/api/settings/audit-logs/export-event", {
          method: "POST",
          body: JSON.stringify({
            recordCount: rows.length,
            filters: {
              search: filteredContentTerm,
              module: auditModuleFilter,
              severity: auditSeverityFilter,
              dateRange: auditDateFilter,
              exportMode: "all-filtered-records",
              maxExportRecords,
            },
          }),
        });
      } catch (error) {
        console.warn("Audit export event logging skipped:", error);
      }

      showToast("success", "Audit exported", `${rows.length} filtered audit log record${rows.length === 1 ? "" : "s"} exported to CSV.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to export audit logs.";
      showToast("error", "Audit export failed", message);
    } finally {
      setAuditExporting(false);
    }
  };

  const openAccessPolicyModal = (index: number | null = null) => {
    setEditingAccessPolicyIndex(index);
    setAccessPolicyForm(index === null ? emptyAccessPolicyForm : accessPolicies[index]);
    setAccessPolicyModalOpen(true);
  };

  const saveAccessPolicy = async () => {
    const name = accessPolicyForm.name.trim();
    if (!name) {
      showToast("warning", "Policy name required", "Please enter an access control policy name.");
      return;
    }

    const payload = {
      policyName: name,
      description: accessPolicyForm.description || "",
      scope: accessPolicyForm.scope || "All Users",
      enforcement: accessPolicyForm.enforcement || "Mandatory",
      reviewCycle: accessPolicyForm.reviewCycle || "Quarterly",
      status: accessPolicyForm.status === "Inactive" ? "Inactive" : "Active",
      sortOrder: Number(accessPolicyForm.sortOrder || 0) || 0,
    };

    try {
      if (editingAccessPolicyIndex === null) {
        const created = await settingsAccessControls.create(payload) as AccessPolicyApiRow;
        setAccessPolicies((current) => sortAccessPolicies([...current, normalizeAccessPolicy(created || payload)]));
        showToast("success", "Access control added", `${name} has been added.`);
      } else {
        const policyId = getAccessPolicyId(accessPolicyForm);
        const updated = await settingsAccessControls.update(policyId, payload) as AccessPolicyApiRow;
        setAccessPolicies((current) => sortAccessPolicies(current.map((item, index) => index === editingAccessPolicyIndex ? normalizeAccessPolicy(updated || { ...item, ...payload }) : item)));
        showToast("success", "Access control updated", `${name} has been updated.`);
      }
      setAccessPolicyModalOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save access control policy.";
      showToast("error", "Access control save failed", message);
    }
  };

  const requestDeleteAccessPolicy = (index: number) => {
    setAccessPolicyDeleteTarget({ policy: accessPolicies[index], index });
  };

  const confirmDeleteAccessPolicy = async () => {
    if (!accessPolicyDeleteTarget) return;
    const { policy, index } = accessPolicyDeleteTarget;

    try {
      await settingsAccessControls.remove(getAccessPolicyId(policy));
      setAccessPolicies((current) => current.filter((_, itemIndex) => itemIndex !== index));
      setAccessPolicyDeleteTarget(null);
      showToast("success", "Access control deleted", `${policy.name} has been deleted.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete access control policy.";
      showToast("error", "Access control delete failed", message);
    }
  };

  const toggleAccessPolicyStatus = async (index: number, newStatus: "Active" | "Inactive") => {
    const policy = accessPolicies[index];
    const policyId = getAccessPolicyId(policy);
    const payload = {
      policyName: policy.name,
      description: policy.description || "",
      scope: policy.scope || "All Users",
      enforcement: policy.enforcement || "Mandatory",
      reviewCycle: policy.reviewCycle || "Quarterly",
      status: newStatus,
      sortOrder: Number((policy as any).sortOrder || 0) || 0,
    };
    try {
      const updated = await settingsAccessControls.update(policyId, payload) as AccessPolicyApiRow;
      setAccessPolicies((current) => current.map((item, i) => i === index ? normalizeAccessPolicy(updated || { ...item, ...payload }) : item));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update status.";
      showToast("error", "Status update failed", message);
    }
  };

  const toggleRoleModuleAccess = async (module: ModuleControlModule, role: AccessRole) => {
    const moduleId = getModuleId(module);
    const roleId = getAccessRoleId(role);
    if (!moduleId || !roleId) {
      showToast("error", "Module access not saved", "Missing module or role ID. Reload Module Control and try again.");
      return;
    }

    const key = `${moduleId}:${roleId}`;
    const nextCanView = !hasModulePermission(modulePermissions, module, role);
    setModuleSavingKey(key);

    setModulePermissions((current) => {
      const existing = current.some((item) => String(item.moduleID) === String(moduleId) && String(item.roleID) === String(roleId));
      if (existing) {
        return current.map((item) => String(item.moduleID) === String(moduleId) && String(item.roleID) === String(roleId) ? { ...item, canView: nextCanView } : item);
      }
      return [...current, { moduleID: moduleId, roleID: roleId, canView: nextCanView }];
    });

    try {
      await settingsModuleAccess.save({ moduleId, roleId, canView: nextCanView });
      showToast("success", "Module access updated", `${role.name} ${nextCanView ? "can access" : "cannot access"} ${module.moduleName}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save module access.";
      showToast("error", "Module access save failed", message);
      void loadModuleAccess();
    } finally {
      setModuleSavingKey("");
    }
  };

  const openAccessRoleModal = (index: number | null = null) => {
    setEditingAccessRoleIndex(index);
    if (index === null) {
      setAccessRoleForm(emptyAccessRoleForm);
    } else {
      setAccessRoleForm(accessRoles[index]);
    }
    setAccessRoleModalOpen(true);
  };

  const saveAccessRole = async () => {
    const roleName = accessRoleForm.name.trim();
    if (!roleName) {
      showToast("warning", "Role name required", "Please enter a role name before saving.");
      return;
    }

    const payload = {
      name: roleName,
      roleName,
      description: accessRoleForm.description || "",
      approvalRequired: Boolean(accessRoleForm.approvalRequired),
      status: accessRoleForm.status === "Inactive" ? "Inactive" : "Active",
    };

    try {
      if (editingAccessRoleIndex === null) {
        await settingsRoles.create(payload);
        showToast("success", "Role created", `${roleName} has been added to Role Based Control.`);
      } else {
        const roleId = accessRoleForm.id || accessRoleForm.roleID;
        if (!roleId) throw new Error("Role ID is missing. Please reload the role list.");
        await settingsRoles.update(roleId, payload);
        showToast("success", "Role updated", `${roleName} has been updated.`);
      }

      setAccessRoleModalOpen(false);
      setEditingAccessRoleIndex(null);
      await loadAccessRoles();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save role.";
      showToast("error", "Role save failed", message);
    }
  };

  const requestDeleteAccessRole = (index: number) => {
    const role = accessRoles[index];
    if (!role) return;
    if (isProtectedSuperAdminRole(role)) {
      showToast("warning", "Role locked", "Super Admin is a protected system role and cannot be deleted.");
      return;
    }
    setRoleDeleteTarget({ role, index });
  };

  const confirmDeleteAccessRole = async () => {
    if (!roleDeleteTarget) return;
    const roleId = roleDeleteTarget.role.id || roleDeleteTarget.role.roleID;

    try {
      if (isProtectedSuperAdminRole(roleDeleteTarget.role)) throw new Error("Super Admin is a protected system role and cannot be deleted.");
      if (!roleId) throw new Error("Role ID is missing. Please reload the role list.");
      await settingsRoles.remove(roleId);
      setRoleDeleteTarget(null);
      showToast("success", "Role deleted", `${roleDeleteTarget.role.name} has been deleted.`);
      await loadAccessRoles();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete role.";
      showToast("error", "Role delete failed", message);
    }
  };


  const loadPcAgingRule = async () => {
    setPcAgingLoading(true);
    setPcAgingError("");

    try {
      const payload = await settingsPcAgingRule.get() as any;
      const rawRule = payload?.rule ?? payload?.data?.rule ?? {};
      setPcAgingRule(normalizePcAgingRule(rawRule));
      setPcAgingLoaded(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load PC aging rule.";
      setPcAgingError(message);
      showToast("error", "Aging rule load failed", message);
    } finally {
      setPcAgingLoading(false);
    }
  };

  const savePcAgingRule = async () => {
    const normalizedRule = normalizePcAgingRule(pcAgingRule);
    setPcAgingRule(normalizedRule);
    setPcAgingSaving(true);
    setPcAgingError("");

    try {
      await settingsPcAgingRule.save(normalizedRule);
      setPcAgingLoaded(true);
      addActivity("Saved PC aging rule", `Aging threshold set to ${normalizedRule.monitorMaxYears} years · just now`);
      showToast("success", "Aging rule saved", "PC aging rule has been applied successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save PC aging rule.";
      setPcAgingError(message);
      showToast("error", "Aging rule save failed", message);
    } finally {
      setPcAgingSaving(false);
    }
  };

  const pricingPayload = (rows: PricingRow[]) =>
    rows.map((row) => ({
      PricingID: row.PricingID,
      Category: row.Category,
      Brand: row.Brand,
      Model: row.Model,
      Price: Number(row.Price) || 0,
      IsExcluded: row.IsExcluded,
    }));

  const validatePricingRow = (row: PricingRow) => {
    if (!row.Category) return "Please select a device category before saving.";
    if (Number(row.Price) < 0) return "Market price cannot be negative.";
    return "";
  };

  const loadPricingCategories = async () => {
    try {
      const options = (await settingsDevicePricing.getCategories()).filter(Boolean);
      setCategoryOptions(options.length ? options : ["Others"]);
    } catch (error) {
      console.error("Failed to load pricing categories:", error);
      setCategoryOptions((current) => (current.length ? current : ["Others"]));
    }
  };

  const loadBrandsForCategory = async (category: string) => {
    const cleanCategory = category.trim();
    if (!cleanCategory || brandOptionsByCategory[cleanCategory]) return;

    try {
      const options = (await settingsDevicePricing.getBrands(cleanCategory)).filter(Boolean);
      setBrandOptionsByCategory((current) => ({ ...current, [cleanCategory]: options }));
    } catch (error) {
      console.error("Failed to load pricing brands:", error);
      setBrandOptionsByCategory((current) => ({ ...current, [cleanCategory]: [] }));
    }
  };

  const loadModelsForCategoryBrand = async (category: string, brand: string) => {
    const cleanCategory = category.trim();
    const cleanBrand = brand.trim();
    const key = pricingModelKey(cleanCategory, cleanBrand);
    if (!cleanCategory || !cleanBrand || modelOptionsByKey[key]) return;

    try {
      const options = (await settingsDevicePricing.getModels(cleanCategory, cleanBrand)).filter(Boolean);
      setModelOptionsByKey((current) => ({ ...current, [key]: options }));
    } catch (error) {
      console.error("Failed to load pricing models:", error);
      setModelOptionsByKey((current) => ({ ...current, [key]: [] }));
    }
  };

  const loadDevicePricing = async () => {
    setPricingLoading(true);
    setPricingError("");

    try {
      const rows = (await settingsDevicePricing.getAll() as PricingPayloadRow[]).map((row, index) => makePricingRow(row, index));
      setPricingRows(rows);
      rows.forEach((row) => {
        if (row.Category) void loadBrandsForCategory(row.Category);
        if (row.Category && row.Brand) void loadModelsForCategoryBrand(row.Category, row.Brand);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load device pricing.";
      setPricingError(message);
    } finally {
      setPricingLoading(false);
    }
  };

  const addPricingRow = () => {
    const category = categoryOptions[0] || "Others";
    const row = makePricingRow({ Category: category, Brand: "", Model: "", Price: 0, IsExcluded: false });
    setPricingRows((current) => [...current, row]);
    setPricingError("");
    showToast("info", "Pricing row added", "Complete the row details, then click Save on that row.");
    if (category) void loadBrandsForCategory(category);
  };

  const updatePricingRow = (id: string, patch: Partial<PricingRow>) => {
    setPricingRows((current) =>
      current.map((row) => {
        if (row.id !== id) return row;

        const next = { ...row, ...patch };

        if (patch.Category !== undefined) {
          next.Brand = "";
          next.Model = "";
          if (next.Category) void loadBrandsForCategory(next.Category);
        }

        if (patch.Brand !== undefined) {
          next.Model = "";
          if (next.Category && next.Brand) void loadModelsForCategoryBrand(next.Category, next.Brand);
        }

        return next;
      })
    );
  };

  const savePricingRow = async (id: string) => {
    const row = pricingRows.find((item) => item.id === id);
    if (!row) return;

    const validationMessage = validatePricingRow(row);
    if (validationMessage) {
      setPricingError(validationMessage);
      showToast("warning", "Pricing not saved", validationMessage);
      return;
    }

    setPricingRowSavingId(id);
    setPricingError("");

    try {
      const payload = await settingsDevicePricing.saveRow(row) as PricingPayloadRow;

      const savedRow = payload ? makePricingRow(payload) : row;
      setPricingRows((current) => current.map((item) => (item.id === id ? { ...savedRow, id: savedRow.PricingID ? `pricing-${savedRow.PricingID}` : item.id } : item)));
      showToast("success", "Pricing saved", `${row.Category}${row.Brand ? ` • ${row.Brand}` : ""}${row.Model ? ` • ${row.Model}` : ""} has been saved.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save pricing row.";
      setPricingError(message);
      showToast("error", "Save failed", message);
    } finally {
      setPricingRowSavingId("");
    }
  };

  const requestDeletePricingRow = (row: PricingRow) => {
    setPricingDeleteTarget(row);
  };

  const confirmDeletePricingRow = async () => {
    if (!pricingDeleteTarget) return;

    const row = pricingDeleteTarget;
    setPricingRowSavingId(row.id);
    setPricingError("");

    try {
      if (row.PricingID) {
        await settingsDevicePricing.remove(row.PricingID);
      }

      setPricingRows((current) => current.filter((item) => item.id !== row.id));
      setPricingDeleteTarget(null);
      showToast("success", "Pricing deleted", `${row.Category || "Pricing row"}${row.Brand ? ` • ${row.Brand}` : ""}${row.Model ? ` • ${row.Model}` : ""} has been removed.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete pricing row.";
      setPricingError(message);
      showToast("error", "Delete failed", message);
    } finally {
      setPricingRowSavingId("");
    }
  };

  const saveDevicePricing = async () => {
    const invalidRow = pricingRows.find((row) => validatePricingRow(row));

    if (invalidRow) {
      const message = validatePricingRow(invalidRow) || "Every pricing row needs a valid setup.";
      setPricingError(message);
      showToast("warning", "Pricing not saved", message);
      return;
    }

    setPricingSaving(true);
    setPricingError("");

    try {
      await settingsDevicePricing.saveAll({
        pricing: pricingPayload(pricingRows),
      });

      await loadDevicePricing();
      showToast("success", "Pricing saved", "All device pricing rows have been saved.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save device pricing.";
      setPricingError(message);
      showToast("error", "Save failed", message);
    } finally {
      setPricingSaving(false);
    }
  };


  const loadManagementPolicy = async () => {
    setManagementPolicyLoading(true);
    setManagementPolicyError("");

    try {
      const payload = await managementPolicyApiRequest<ManagementPolicyApiResponse>("/api/settings/management-policy");
      const values = normalizeManagementPolicyValues(payload.data?.values || DEFAULT_MANAGEMENT_POLICY_VALUES);
      setManagementPolicyValues(values);
      setManagementPolicyProfile(payload.data?.profile || null);
      setManagementPolicyLoaded(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load management policy.";
      setManagementPolicyError(message);
      showToast("error", "Management policy load failed", message);
    } finally {
      setManagementPolicyLoading(false);
    }
  };

  const saveManagementPolicy = async () => {
    const normalizedValues = normalizeManagementPolicyValues(managementPolicyValues);
    setManagementPolicyValues(normalizedValues);
    setManagementPolicySaving(true);
    setManagementPolicyError("");

    try {
      const payload = await managementPolicyApiRequest<ManagementPolicyApiResponse>("/api/settings/management-policy", {
        method: "PUT",
        body: JSON.stringify({ values: normalizedValues }),
      });
      setManagementPolicyValues(normalizeManagementPolicyValues(payload.data?.values || normalizedValues));
      setManagementPolicyProfile(payload.data?.profile || managementPolicyProfile);
      setManagementPolicyLoaded(true);
      addActivity("Saved management policy", `${MANAGEMENT_POLICY_FIELDS.length} dashboard assumption value(s) updated · just now`);
      showToast("success", "Management policy saved", "Dashboard risk, exposure and saving assumptions have been updated.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save management policy.";
      setManagementPolicyError(message);
      showToast("error", "Management policy save failed", message);
    } finally {
      setManagementPolicySaving(false);
    }
  };

  const loadIncidentConfig = async () => {
    if (incidentConfigLoading) return;

    setIncidentConfigLoading(true);
    setIncidentConfigError("");

    try {
      const [slaPayload, workingPayload, categoryPayload] = await Promise.all([
        settingsIncidentConfig.getSla(),
        settingsIncidentConfig.getWorkingHours(),
        settingsIncidentConfig.getCategories(),
      ]);

      const slaRows = readArrayPayload<Record<string, unknown>>(slaPayload).map(normalizeSlaConfigRow);
      const workingRows = readArrayPayload<Record<string, unknown>>(workingPayload).map(normalizeWorkingHourRow);
      const categoryRows = normalizeIncidentCategories(readArrayPayload<Record<string, unknown>>(categoryPayload));

      setSlaConfigs(sortSlaConfigs(slaRows.length ? slaRows : DEFAULT_SLA_CONFIGS));
      setWorkingHours(sortWorkingHours(workingRows.length ? workingRows : DEFAULT_WORKING_HOURS));
      setIncidentCategories(categoryRows);
      setSelectedIncidentCategoryId((current) => current && categoryRows.some((category) => String(category.id) === current) ? current : String(categoryRows[0]?.id ?? ""));
      setSelectedIncidentSubcategoryId((current) => {
        const baseCategory = categoryRows.find((category) => String(category.id) === selectedIncidentCategoryId) || categoryRows[0];
        return current && baseCategory?.subcategories.some((subcategory) => String(subcategory.id) === current) ? current : String(baseCategory?.subcategories[0]?.id ?? "");
      });
      setIncidentConfigLoaded(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load incident configuration.";
      setIncidentConfigError(message);
      showToast("error", "Incident config load failed", message);
    } finally {
      setIncidentConfigLoading(false);
    }
  };

  const updateSlaConfig = (id: number | string, patch: Partial<SlaConfigRow>) => {
    setSlaConfigs((current) => current.map((row) => (String(row.id) === String(id) ? { ...row, ...patch } : row)));
  };

  const updateWorkingHour = (id: string, patch: Partial<WorkingHourRow>) => {
    setWorkingHours((current) => current.map((row) => (String(row.id) === String(id) ? { ...row, ...patch, isRestDay: patch.enabled === undefined ? row.isRestDay : !patch.enabled } : row)));
  };

  const updateCategoryNameLocal = (id: number | string, value: string) => {
    setIncidentCategories((rows) => rows.map((category) => String(category.id) === String(id) ? { ...category, name: value } : category));
  };

  const updateSubcategoryNameLocal = (categoryId: number | string, subcategoryId: number | string, value: string) => {
    setIncidentCategories((rows) => rows.map((category) => String(category.id) === String(categoryId)
      ? { ...category, subcategories: category.subcategories.map((subcategory) => String(subcategory.id) === String(subcategoryId) ? { ...subcategory, name: value } : subcategory) }
      : category));
  };

  const updateDetailNameLocal = (categoryId: number | string, subcategoryId: number | string, detailId: number | string, value: string) => {
    setIncidentCategories((rows) => rows.map((category) => String(category.id) === String(categoryId)
      ? {
          ...category,
          subcategories: category.subcategories.map((subcategory) => String(subcategory.id) === String(subcategoryId)
            ? { ...subcategory, details: subcategory.details.map((detail) => String(detail.id) === String(detailId) ? { ...detail, name: value } : detail) }
            : subcategory),
        }
      : category));
  };

  const saveIncidentConfig = async () => {
    if (incidentConfigTab === "categories") {
      showToast("info", "Category setup", "Category, subcategory and detail changes are saved per item.");
      return;
    }

    const invalidSla = slaConfigs.find((row) => !row.priority || !row.label || Number(row.responseTimeMin) < 0 || Number(row.resolutionTimeHrs) <= 0);
    if (invalidSla) {
      const message = "Every SLA rule needs a priority, label, response time and resolution time greater than zero.";
      setIncidentConfigError(message);
      showToast("warning", "SLA config not saved", message);
      return;
    }

    const invalidWorkingHour = workingHours.find((row) => row.enabled && (!row.start || !row.end || row.end <= row.start));
    if (invalidWorkingHour) {
      const message = `${invalidWorkingHour.day} working hours are invalid. End time must be later than start time.`;
      setIncidentConfigError(message);
      showToast("warning", "Working hours not saved", message);
      return;
    }

    setIncidentConfigSaving(true);
    setIncidentConfigError("");

    try {
      await Promise.all([
        settingsIncidentConfig.saveSla(slaConfigs),
        settingsIncidentConfig.saveWorkingHours(workingHours),
      ]);

      const auditAction = incidentConfigTab === "sla"
        ? "Updated SLA rules"
        : incidentConfigTab === "workingHours"
          ? "Updated working hours"
          : "Updated category setup";
      const auditDetails = incidentConfigTab === "sla"
        ? `Saved ${slaConfigs.length} SLA rule configuration(s).`
        : incidentConfigTab === "workingHours"
          ? `Saved ${workingHours.length} working hour configuration(s).`
          : `Saved category setup containing ${incidentCategories.length} categor${incidentCategories.length === 1 ? "y" : "ies"}.`;
      await logIncidentConfigAudit(auditAction, auditDetails, "IncidentConfig", incidentConfigTab);
      showToast("success", "Incident config saved", "SLA rules and working hours have been updated.");
      await loadIncidentConfig();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save incident configuration.";
      setIncidentConfigError(message);
      showToast("error", "Incident config save failed", message);
    } finally {
      setIncidentConfigSaving(false);
    }
  };


  const reloadIncidentCategories = async () => {
    const payload = await settingsIncidentConfig.getCategories();
    const rows = normalizeIncidentCategories(readArrayPayload<Record<string, unknown>>(payload));
    setIncidentCategories(rows);
    setSelectedIncidentCategoryId((current) => current && rows.some((category) => String(category.id) === current) ? current : String(rows[0]?.id ?? ""));
    setSelectedIncidentSubcategoryId((current) => {
      const nextCategory = rows.find((category) => String(category.id) === selectedIncidentCategoryId) || rows[0];
      return current && nextCategory?.subcategories.some((subcategory) => String(subcategory.id) === current) ? current : String(nextCategory?.subcategories[0]?.id ?? "");
    });
  };

  const runCategoryAction = async (
    key: string,
    action: () => Promise<void>,
    successTitle: string,
    successMessage: string,
    auditAction = successTitle,
    entityType = "IncidentCategorySetup",
    entityID: number | string = ""
  ) => {
    setCategorySavingKey(key);
    setIncidentConfigError("");
    try {
      await action();
      await logIncidentConfigAudit(auditAction, successMessage, entityType, entityID);
      await reloadIncidentCategories();
      showToast("success", successTitle, successMessage);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update category setup.";
      setIncidentConfigError(message);
      showToast("error", "Category setup failed", message);
    } finally {
      setCategorySavingKey("");
    }
  };

  const addIncidentCategory = () => {
    const name = newIncidentCategoryName.trim();
    if (!name) {
      showToast("warning", "Category name required", "Enter a category name before adding it.");
      return;
    }
    void runCategoryAction("category:add", async () => {
      await settingsIncidentConfig.createCategory({ name });
      setNewIncidentCategoryName("");
    }, "Category added", `${name} has been added.`, "Added incident category", "HD_IncidentCategories");
  };

  const updateIncidentCategory = (category: IncidentCategorySetupRow) => {
    const name = category.name.trim();
    if (!name) {
      showToast("warning", "Category name required", "Category name cannot be empty.");
      return;
    }
    void runCategoryAction(`category:${category.id}:save`, async () => {
      await settingsIncidentConfig.updateCategory(category.id, { name, isActive: category.isActive !== false } as never);
    }, "Category saved", `${name} has been saved.`, "Updated incident category", "EMA_IncidentCategories", category.id);
  };

  const deactivateIncidentCategory = (category: IncidentCategorySetupRow) => {
    const name = category.name.trim();
    if (!name) {
      showToast("warning", "Category name required", "Category name cannot be empty.");
      return;
    }
    void runCategoryAction(`category:${category.id}:deactivate`, async () => {
      await settingsIncidentConfig.updateCategory(category.id, { name, isActive: false } as never);
    }, "Category deactivated", `${name} has been hidden from new Service Desk tickets. Old tickets will keep their saved category.`, "Deactivated incident category", "EMA_IncidentCategories", category.id);
  };

  const requestDeleteIncidentCategory = (category: IncidentCategorySetupRow) => {
    setIncidentDeleteTarget({ kind: "category", category });
  };

  const confirmDeleteIncidentCategory = (category: IncidentCategorySetupRow) => {
    void runCategoryAction(`category:${category.id}:delete`, async () => {
      await settingsIncidentConfig.deleteCategory(category.id);
      setIncidentDeleteTarget(null);
    }, "Category deleted", `${category.name} has been removed.`, "Deleted incident category", "HD_IncidentCategories", category.id);
  };

  const addIncidentSubcategory = () => {
    const categoryId = selectedIncidentCategoryId;
    const name = newIncidentSubcategoryName.trim();
    if (!categoryId || !name) {
      showToast("warning", "Subcategory required", "Select a category and enter a subcategory name.");
      return;
    }
    void runCategoryAction(`category:${categoryId}:subcategory:add`, async () => {
      await settingsIncidentConfig.createSubcategory(categoryId, { name });
      setNewIncidentSubcategoryName("");
    }, "Subcategory added", `${name} has been added.`, "Added incident subcategory", "HD_IncidentSubcategories", categoryId);
  };

  const updateIncidentSubcategory = (_categoryId: number | string, subcategory: IncidentSubcategorySetupRow) => {
    const name = subcategory.name.trim();
    if (!name) {
      showToast("warning", "Subcategory name required", "Subcategory name cannot be empty.");
      return;
    }
    void runCategoryAction(`subcategory:${subcategory.id}:save`, async () => {
      await settingsIncidentConfig.updateSubcategory(subcategory.id, { name, isActive: subcategory.isActive !== false } as never);
    }, "Subcategory saved", `${name} has been saved.`, "Updated incident subcategory", "EMA_IncidentSubcategories", subcategory.id);
  };

  const deactivateIncidentSubcategory = (_categoryId: number | string, subcategory: IncidentSubcategorySetupRow) => {
    const name = subcategory.name.trim();
    if (!name) {
      showToast("warning", "Subcategory name required", "Subcategory name cannot be empty.");
      return;
    }
    void runCategoryAction(`subcategory:${subcategory.id}:deactivate`, async () => {
      await settingsIncidentConfig.updateSubcategory(subcategory.id, { name, isActive: false } as never);
    }, "Subcategory deactivated", `${name} has been hidden from new Service Desk tickets. Old tickets will keep their saved subcategory.`, "Deactivated incident subcategory", "EMA_IncidentSubcategories", subcategory.id);
  };

  const requestDeleteIncidentSubcategory = (categoryId: number | string, subcategory: IncidentSubcategorySetupRow) => {
    setIncidentDeleteTarget({ kind: "subcategory", categoryId, subcategory });
  };

  const confirmDeleteIncidentSubcategory = (categoryId: number | string, subcategory: IncidentSubcategorySetupRow) => {
    void runCategoryAction(`subcategory:${subcategory.id}:delete`, async () => {
      await settingsIncidentConfig.deleteSubcategory(subcategory.id);
      setIncidentDeleteTarget(null);
    }, "Subcategory deleted", `${subcategory.name} has been removed.`, "Deleted incident subcategory", "HD_IncidentSubcategories", subcategory.id);
  };

  const addIncidentDetail = () => {
    const subcategoryId = selectedIncidentSubcategoryId;
    const name = newIncidentDetailName.trim();
    if (!subcategoryId || !name) {
      showToast("warning", "Incident detail required", "Select a subcategory and enter an incident detail name.");
      return;
    }
    void runCategoryAction(`subcategory:${subcategoryId}:detail:add`, async () => {
      await settingsIncidentConfig.createDetail(subcategoryId, { name });
      setNewIncidentDetailName("");
    }, "Incident detail added", `${name} has been added.`, "Added incident detail", "HD_IncidentDetails", subcategoryId);
  };

  const updateIncidentDetail = (_categoryId: number | string, _subcategoryId: number | string, detail: IncidentDetailSetupRow) => {
    const name = detail.name.trim();
    if (!name) {
      showToast("warning", "Incident detail required", "Incident detail name cannot be empty.");
      return;
    }
    void runCategoryAction(`detail:${detail.id}:save`, async () => {
      await settingsIncidentConfig.updateDetail(detail.id, { name, isActive: detail.isActive !== false } as never);
    }, "Incident detail saved", `${name} has been saved.`, "Updated incident detail", "EMA_IncidentDetails", detail.id);
  };

  const deactivateIncidentDetail = (_categoryId: number | string, _subcategoryId: number | string, detail: IncidentDetailSetupRow) => {
    const name = detail.name.trim();
    if (!name) {
      showToast("warning", "Incident detail required", "Incident detail name cannot be empty.");
      return;
    }
    void runCategoryAction(`detail:${detail.id}:deactivate`, async () => {
      await settingsIncidentConfig.updateDetail(detail.id, { name, isActive: false } as never);
    }, "Incident detail deactivated", `${name} has been hidden from new Service Desk tickets. Old tickets will keep their saved problem detail.`, "Deactivated incident detail", "EMA_IncidentDetails", detail.id);
  };

  const requestDeleteIncidentDetail = (categoryId: number | string, subcategoryId: number | string, detail: IncidentDetailSetupRow) => {
    setIncidentDeleteTarget({ kind: "detail", categoryId, subcategoryId, detail });
  };

  const confirmDeleteIncidentDetail = (categoryId: number | string, subcategoryId: number | string, detail: IncidentDetailSetupRow) => {
    void runCategoryAction(`detail:${detail.id}:delete`, async () => {
      await settingsIncidentConfig.deleteDetail(detail.id);
      setIncidentDeleteTarget(null);
    }, "Incident detail deleted", `${detail.name} has been removed.`, "Deleted incident detail", "HD_IncidentDetails", detail.id);
  };

  const loadResourcePlanning = async () => {
    if (resourceLoading) return;

    setResourceLoading(true);
    setResourceError("");

    try {
      const [schedules, engineerPayload] = await Promise.all([
        settingsResourcePlanning.getSchedules() as Promise<ResourceSchedule[]>,
        settingsResourcePlanning.getEngineers() as Promise<ResourceEngineer[]>,
      ]);

      const engineers = engineerPayload.filter(isResourceSupportEngineer);

      setResourceSchedules(schedules);
      setResourceEngineers(engineers);
      setResourceLoaded(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load resource planning.";
      setResourceError(message);
      showToast("error", "Resource planning failed", message);
    } finally {
      setResourceLoading(false);
    }
  };

  const resetResourcePlanningForm = () => {
    setResourceForm(RESOURCE_EMPTY_FORM);
    setResourceEditingId(null);
    setResourceError("");
  };

  const editResourceSchedule = (row: ResourceSchedule) => {
    setResourceEditingId(getResourceScheduleId(row));
    setResourceForm({
      UserID: getResourceScheduleUserId(row),
      StartDate: String(row.StartDate || "").slice(0, 10),
      EndDate: String(row.EndDate || "").slice(0, 10),
      Status: getResourceScheduleStatus(row) || "On Leave",
      Remarks: getResourceScheduleRemarks(row),
    });
  };

  const saveResourceSchedule = async () => {
    if (!resourceForm.UserID) {
      showToast("warning", "Engineer required", "Please select an engineer before saving leave schedule.");
      return;
    }

    if (!resourceForm.StartDate || !resourceForm.EndDate) {
      showToast("warning", "Date required", "Please choose start date and end date.");
      return;
    }

    if (resourceForm.EndDate < resourceForm.StartDate) {
      showToast("warning", "Invalid date range", "End date cannot be earlier than start date.");
      return;
    }

    setResourceSaving(true);

    try {
      if (resourceEditingId) {
        await settingsResourcePlanning.update(resourceEditingId, resourceForm);
      } else {
        await settingsResourcePlanning.create(resourceForm);
      }

      showToast("success", "Resource planning saved", resourceEditingId ? "Engineer leave schedule updated." : "Engineer leave schedule created.");
      resetResourcePlanningForm();
      await loadResourcePlanning();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save engineer leave schedule.";
      showToast("error", "Save failed", message);
    } finally {
      setResourceSaving(false);
    }
  };

  const requestDeleteResourceSchedule = (row: ResourceSchedule) => {
    const scheduleId = getResourceScheduleId(row);
    if (!scheduleId) return;
    setResourceDeleteTarget({ row, scheduleId, engineerName: getResourceScheduleName(row) || "this engineer" });
  };

  const confirmDeleteResourceSchedule = async () => {
    if (!resourceDeleteTarget) return;

    const { scheduleId } = resourceDeleteTarget;
    setResourceSaving(true);

    try {
      await settingsResourcePlanning.remove(scheduleId);

      showToast("success", "Leave removed", "Engineer leave schedule removed.");
      setResourceDeleteTarget(null);
      if (resourceEditingId === scheduleId) resetResourcePlanningForm();
      await loadResourcePlanning();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove engineer leave schedule.";
      showToast("error", "Remove failed", message);
    } finally {
      setResourceSaving(false);
    }
  };

  useEffect(() => {
    // Load user and role records immediately when Settings opens so sidebar badges and
    // KPI values do not show stale/static config numbers.
    if (!usersLoaded && !usersLoading) void loadUsers();
    if (!rolesLoaded && !rolesLoading) void loadAccessRoles();
  }, [usersLoaded, usersLoading, rolesLoaded, rolesLoading]);

  useEffect(() => {
    if (activeSection !== "pricing") return;
    void loadPricingCategories();
    void loadDevicePricing();
  }, [activeSection]);


  useEffect(() => {
    if (activeSection !== "modules" || moduleLoaded || moduleLoading) return;
    void loadModuleAccess();
  }, [activeSection, moduleLoaded, moduleLoading]);

  useEffect(() => {
    if (activeSection !== "access" || accessPoliciesLoaded || accessPoliciesLoading) return;
    void loadAccessPolicies();
  }, [activeSection, accessPoliciesLoaded, accessPoliciesLoading]);

  useEffect(() => {
    if (activeSection !== "audit") return;
    setAuditPage(1);
  }, [activeSection, filteredContentTerm, auditModuleFilter, auditSeverityFilter, auditDateFilter]);

  useEffect(() => {
    if (activeSection !== "audit") return;

    const timer = window.setTimeout(() => {
      void loadAuditLogs(auditPage);
    }, filteredContentTerm ? 250 : 0);

    return () => window.clearTimeout(timer);
  }, [activeSection, auditPage, filteredContentTerm, auditModuleFilter, auditSeverityFilter, auditDateFilter]);

  useEffect(() => {
    if (activeSection !== "aging" || pcAgingLoaded || pcAgingLoading) return;
    void loadPcAgingRule();
  }, [activeSection, pcAgingLoaded, pcAgingLoading]);

  useEffect(() => {
    if (activeSection !== "policy" || managementPolicyLoaded || managementPolicyLoading) return;
    void loadManagementPolicy();
  }, [activeSection, managementPolicyLoaded, managementPolicyLoading]);

  useEffect(() => {
    if (activeSection !== "incident" || incidentConfigLoaded || incidentConfigLoading) return;
    void loadIncidentConfig();
  }, [activeSection, incidentConfigLoaded, incidentConfigLoading]);

  useEffect(() => {
    if (activeSection !== "resources" || resourceLoaded || resourceLoading) return;
    void loadResourcePlanning();
  }, [activeSection, resourceLoaded, resourceLoading]);

  const addActivity = (_title: string, _desc: string) => {
    // Right-side audit snapshot panel was removed from the Settings screen.
    // Keep this no-op so existing save/user/role handlers remain stable.
  };

  useEffect(() => {
    if (activeSection !== "incident") return;
    const selectedCategory = incidentCategories.find((category) => String(category.id) === selectedIncidentCategoryId);
    if (!selectedCategory) return;
    if (selectedIncidentSubcategoryId && selectedCategory.subcategories.some((subcategory) => String(subcategory.id) === selectedIncidentSubcategoryId)) return;
    setSelectedIncidentSubcategoryId(String(selectedCategory.subcategories[0]?.id ?? ""));
  }, [activeSection, incidentCategories, selectedIncidentCategoryId, selectedIncidentSubcategoryId]);

  const resetSection = () => {
    setSectionSearch("");

    if (activeSection === "users") {
      void loadUsers();
      return;
    }

    if (activeSection === "modules") {
      void loadModuleAccess();
      return;
    }

    if (activeSection === "access") {
      void loadAccessPolicies();
      return;
    }

    if (activeSection === "audit") {
      setAuditModuleFilter("all");
      setAuditSeverityFilter("all");
      setAuditDateFilter("30d");
      setAuditPage(1);
      void loadAuditLogs(1);
      return;
    }

    if (activeSection === "pricing") {
      void loadDevicePricing();
      return;
    }

    if (activeSection === "incident") {
      void loadIncidentConfig();
      return;
    }

    if (activeSection === "aging") {
      setPcAgingRule(DEFAULT_PC_AGING_RULE);
      setPcAgingError("");
      showToast("info", "Aging rule reset", "Default PC aging rule is ready. Click Save Changes to store it.");
      return;
    }

    if (activeSection === "policy") {
      setManagementPolicyValues(DEFAULT_MANAGEMENT_POLICY_VALUES);
      setManagementPolicyError("");
      showToast("info", "Management policy reset", "Default EMA management policy is ready. Click Save Policy to store it.");
      return;
    }

    if (activeSection === "resources") {
      resetResourcePlanningForm();
      void loadResourcePlanning();
      return;
    }
  };

  const saveSection = () => {
    if (activeSection === "audit") {
      void exportAuditLogs();
      return;
    }

    if (activeSection === "pricing") {
      void saveDevicePricing();
      return;
    }

    if (activeSection === "incident") {
      void saveIncidentConfig();
      return;
    }

    if (activeSection === "aging") {
      void savePcAgingRule();
      return;
    }

    if (activeSection === "policy") {
      void saveManagementPolicy();
      return;
    }

    if (activeSection === "resources") {
      void saveResourceSchedule();
      return;
    }

    addActivity(`Saved ${active.title}`, "Configuration saved to prototype audit log · just now");
  };

  const openUserModal = (index: number | null = null) => {
    setEditingUserIndex(index);
    if (index === null) {
      setUserForm(emptyUserForm);
    } else {
      setUserForm({ ...users[index], password: "", confirmPassword: "" });
    }
    setUserModalOpen(true);
  };

  const saveUserAccess = async () => {
    const selectedRoles = normalizeUserRoles(userForm.roles || userForm.role);
    const selectedRoleName = joinUserRoles(selectedRoles);

    if (selectedRoles.length === 0) {
      showToast("warning", "Role required", "Please assign at least one active role to this user.");
      return;
    }

    const passwordValue = String(userForm.password || "");
    const confirmPasswordValue = String(userForm.confirmPassword || "");
    const passwordProvided = passwordValue.trim().length > 0 || confirmPasswordValue.trim().length > 0;

    if (editingUserIndex === null && passwordValue.trim().length === 0) {
      showToast("warning", "Password required", "Create an initial password so this user can log in from EMA_Users.");
      return;
    }

    if (passwordProvided && passwordValue.length < 8) {
      showToast("warning", "Password too short", "Password must be at least 8 characters.");
      return;
    }

    if (passwordProvided && passwordValue !== confirmPasswordValue) {
      showToast("warning", "Password mismatch", "Password and confirm password must match.");
      return;
    }

    const nextUser: UserAccess = {
      ...userForm,
      name: userForm.name.trim() || "New User",
      fullName: userForm.name.trim() || userForm.fullName || "New User",
      username: String(userForm.username || "").trim(),
      email: userForm.email.trim(),
      role: selectedRoleName,
      roles: selectedRoles,
      roleName: selectedRoleName,
      status: userForm.accountLocked ? "Locked" : userForm.status,
      scope: userForm.scope,
      accessScope: userForm.scope,
      requireMFA: Boolean(userForm.requireMFA || userForm.mfa),
      mfa: Boolean(userForm.requireMFA || userForm.mfa),
      accountLocked: Boolean(userForm.accountLocked),
      department: userForm.department || "",
      position: userForm.position || "",
      phoneNo: userForm.phoneNo || "",
      lockReason: userForm.lockReason || "",
      accessStartDate: userForm.accessStartDate || null,
      accessEndDate: userForm.accessEndDate || null,
      remarks: userForm.remarks || "",
    };

    const payload = {
      username: nextUser.username,
      name: nextUser.name,
      fullName: nextUser.fullName || nextUser.name,
      email: nextUser.email,
      role: nextUser.role,
      roleName: nextUser.role,
      roles: selectedRoles,
      roleNames: selectedRoles,
      status: nextUser.status,
      scope: nextUser.scope,
      accessScope: nextUser.scope,
      department: nextUser.department || "",
      position: nextUser.position || "",
      phoneNo: nextUser.phoneNo || "",
      requireMFA: Boolean(nextUser.requireMFA || nextUser.mfa),
      mfa: Boolean(nextUser.requireMFA || nextUser.mfa),
      accountLocked: Boolean(nextUser.accountLocked),
      lockReason: nextUser.lockReason || "",
      accessStartDate: nextUser.accessStartDate || null,
      accessEndDate: nextUser.accessEndDate || null,
      remarks: nextUser.remarks || "",
      password: passwordProvided ? passwordValue : undefined,
    };

    try {
      if (editingUserIndex === null) {
        const response = await settingsUsers.create(payload) as UserApiRow;
        const createdUser = mapUserApiRow(response || payload);
        setUsers((current) => sortUsersByCreatedDate([createdUser, ...current]));
        addActivity("Added user access", `${createdUser.name} · ${createdUser.role} · just now`);
        showToast("success", "User access added", `${createdUser.name} has been added.`);
      } else {
        const existingUser = users[editingUserIndex];
        const userId = existingUser?.id || existingUser?.userID;
        if (!userId) throw new Error("User ID is missing. Please reload the user list.");

        const { password, ...updatePayload } = payload;
        const response = await settingsUsers.update(userId, updatePayload) as UserApiRow;
        let updatedUser = mapUserApiRow(response || { ...existingUser, ...updatePayload });
        if (passwordProvided) {
          const resetResponse = await settingsUsers.resetPassword(userId, { password: passwordValue }) as UserApiRow;
          updatedUser = mapUserApiRow(resetResponse || updatedUser);
        }
        setUsers((current) => sortUsersByCreatedDate(current.map((user, index) => (index === editingUserIndex ? updatedUser : user))));
        addActivity("Updated user access", `${updatedUser.name} · ${updatedUser.role} · just now`);
        showToast("success", passwordProvided ? "User access and password updated" : "User access updated", passwordProvided ? `${updatedUser.name} has been updated and password has been reset.` : `${updatedUser.name} has been updated.`);
      }

      setUserModalOpen(false);
      setEditingUserIndex(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save user access.";
      showToast("error", "User access save failed", message);
    }
  };

  const requestDeleteUser = (index: number) => {
    const user = users[index];
    if (!user) return;
    setUserDeleteTarget({ user, index });
  };

  const confirmDeleteUser = async () => {
    if (!userDeleteTarget) return;
    const { user, index } = userDeleteTarget;

    try {
      const userId = user.id || user.userID;
      if (!userId) throw new Error("User ID is missing. Please reload the user list.");

      await settingsUsers.remove(userId);
      setUsers((current) => current.filter((item, itemIndex) => {
        const itemId = item.id || item.userID;
        if (itemId && userId) return String(itemId) !== String(userId);
        return itemIndex !== index;
      }));
      setUserDeleteTarget(null);
      addActivity("Deleted user access", `${user.name} permanently deleted from EMA_Users · just now`);
      showToast("success", "User deleted", `${user.name} has been deleted from EMA_Users.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete user access.";
      showToast("error", "User access delete failed", message);
    }
  };

  // Module Control by Role uses EMA_Roles from Role Based Control.
  // Roles are created in Role Based Control, then access is toggled here per module.


  useEffect(() => {
    document.documentElement.classList.add("ema-settings-page-active");
    document.body.classList.add("ema-settings-page-active");

    return () => {
      document.documentElement.classList.remove("ema-settings-page-active");
      document.body.classList.remove("ema-settings-page-active");
    };
  }, []);

  const visibleUsers = users.filter((user) => !filteredContentTerm || `${user.name} ${user.username || ""} ${user.email} ${user.role} ${user.status}`.toLowerCase().includes(filteredContentTerm));

  return (
    <main className="settings-module-root ema-settings-pro container-fluid p-3 p-xl-4" data-section={activeSection}>
      <style>{SETTINGS_SOFTWARE_POLICY_INLINE_CSS}</style>
      <style>{`
        /* SETTINGS_INCIDENT_TABLE_NATIVE_FORCE_START */
        /* Settings > Incident Config only.
           Current file uses native tables:
           .incident-sla-panel table.settings-table.role-table
           .incident-working-panel table.settings-table.role-table */

        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-sla-panel .table-shell.role-table-wrap,
        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-working-panel .table-shell.role-table-wrap {
          display: block !important;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          overflow-x: auto !important;
          overflow-y: visible !important;
          padding: 0 !important;
          margin: 0 !important;
          border: 1px solid rgba(203, 213, 225, 0.9) !important;
          border-radius: 18px !important;
          background: #ffffff !important;
        }

        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-sla-panel table.settings-table.role-table,
        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-working-panel table.settings-table.role-table {
          display: table !important;
          width: 100% !important;
          min-width: 980px !important;
          max-width: none !important;
          table-layout: fixed !important;
          border-collapse: collapse !important;
          border-spacing: 0 !important;
          margin: 0 !important;
        }

        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-sla-panel table.settings-table.role-table thead,
        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-working-panel table.settings-table.role-table thead {
          display: table-header-group !important;
        }

        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-sla-panel table.settings-table.role-table tbody,
        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-working-panel table.settings-table.role-table tbody {
          display: table-row-group !important;
        }

        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-sla-panel table.settings-table.role-table tr,
        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-working-panel table.settings-table.role-table tr {
          display: table-row !important;
          width: auto !important;
          max-width: none !important;
          height: auto !important;
          min-height: 0 !important;
          float: none !important;
          position: static !important;
        }

        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-sla-panel table.settings-table.role-table th,
        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-sla-panel table.settings-table.role-table td,
        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-working-panel table.settings-table.role-table th,
        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-working-panel table.settings-table.role-table td {
          display: table-cell !important;
          float: none !important;
          position: static !important;
          vertical-align: middle !important;
          width: auto !important;
          max-width: none !important;
          height: auto !important;
          min-height: 0 !important;
          padding: 0.7rem 0.82rem !important;
          font-size: 0.74rem !important;
          line-height: 1.3 !important;
          text-align: left !important;
          white-space: normal !important;
          word-break: normal !important;
          overflow-wrap: normal !important;
          writing-mode: horizontal-tb !important;
          text-orientation: mixed !important;
          border-bottom: 1px solid rgba(226, 232, 240, 0.95) !important;
        }

        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-sla-panel table.settings-table.role-table th,
        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-working-panel table.settings-table.role-table th {
          background: #f3f6fb !important;
          color: #2563eb !important;
          font-size: 0.68rem !important;
          font-weight: 900 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.045em !important;
          white-space: nowrap !important;
        }

        /* SLA Rules columns */
        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-sla-panel table.settings-table.role-table th:nth-child(1),
        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-sla-panel table.settings-table.role-table td:nth-child(1) {
          width: 125px !important;
          min-width: 125px !important;
          max-width: 125px !important;
        }

        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-sla-panel table.settings-table.role-table th:nth-child(2),
        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-sla-panel table.settings-table.role-table td:nth-child(2) {
          width: 180px !important;
          min-width: 180px !important;
          max-width: 180px !important;
        }

        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-sla-panel table.settings-table.role-table th:nth-child(3),
        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-sla-panel table.settings-table.role-table td:nth-child(3) {
          width: 170px !important;
          min-width: 170px !important;
          max-width: 170px !important;
        }

        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-sla-panel table.settings-table.role-table th:nth-child(4),
        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-sla-panel table.settings-table.role-table td:nth-child(4) {
          width: 180px !important;
          min-width: 180px !important;
          max-width: 180px !important;
        }

        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-sla-panel table.settings-table.role-table th:nth-child(5),
        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-sla-panel table.settings-table.role-table td:nth-child(5) {
          width: auto !important;
          min-width: 320px !important;
        }

        /* Working Hours columns */
        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-working-panel table.settings-table.role-table th:nth-child(1),
        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-working-panel table.settings-table.role-table td:nth-child(1) {
          width: 145px !important;
          min-width: 145px !important;
          max-width: 145px !important;
        }

        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-working-panel table.settings-table.role-table th:nth-child(2),
        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-working-panel table.settings-table.role-table td:nth-child(2) {
          width: 220px !important;
          min-width: 220px !important;
          max-width: 220px !important;
        }

        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-working-panel table.settings-table.role-table th:nth-child(3),
        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-working-panel table.settings-table.role-table td:nth-child(3),
        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-working-panel table.settings-table.role-table th:nth-child(4),
        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-working-panel table.settings-table.role-table td:nth-child(4) {
          width: 170px !important;
          min-width: 170px !important;
          max-width: 170px !important;
        }

        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-working-panel table.settings-table.role-table th:nth-child(5),
        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-working-panel table.settings-table.role-table td:nth-child(5) {
          width: auto !important;
          min-width: 210px !important;
        }

        /* Inputs / textarea / custom select inside Incident Config tables */
        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-sla-panel table.settings-table.role-table .setting-input,
        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-working-panel table.settings-table.role-table .setting-input,
        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-working-panel table.settings-table.role-table .setting-select-dropdown,
        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-working-panel table.settings-table.role-table .setting-select-trigger {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          writing-mode: horizontal-tb !important;
          text-orientation: mixed !important;
        }

        html body main.settings-module-root[data-section="incident"] .incident-config-module table.settings-table.role-table .setting-input {
          display: block !important;
          height: 36px !important;
          padding: 0.46rem 0.65rem !important;
          border: 1px solid rgba(203, 213, 225, 0.95) !important;
          border-radius: 12px !important;
          background: #ffffff !important;
          color: #0f2748 !important;
          font-size: 0.74rem !important;
          font-weight: 800 !important;
          line-height: 1.25 !important;
        }

        html body main.settings-module-root[data-section="incident"] .incident-config-module table.settings-table.role-table textarea.setting-input,
        html body main.settings-module-root[data-section="incident"] .incident-config-module table.settings-table.role-table .resource-textarea {
          height: 44px !important;
          min-height: 44px !important;
          max-height: 96px !important;
          resize: vertical !important;
          overflow: auto !important;
          line-height: 1.35 !important;
        }

        html body main.settings-module-root[data-section="incident"] .incident-config-module .incident-working-panel table.settings-table.role-table .setting-select-trigger {
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          justify-content: space-between !important;
          height: 36px !important;
          min-height: 36px !important;
          padding: 0.46rem 0.65rem !important;
          border: 1px solid rgba(203, 213, 225, 0.95) !important;
          border-radius: 12px !important;
          background: #ffffff !important;
          color: #0f2748 !important;
          font-size: 0.74rem !important;
          font-weight: 800 !important;
          white-space: nowrap !important;
        }

        html body main.settings-module-root[data-section="incident"] .incident-config-module table.settings-table.role-table strong,
        html body main.settings-module-root[data-section="incident"] .incident-config-module table.settings-table.role-table span,
        html body main.settings-module-root[data-section="incident"] .incident-config-module table.settings-table.role-table small,
        html body main.settings-module-root[data-section="incident"] .incident-config-module table.settings-table.role-table .status-pill {
          display: inline-flex !important;
          align-items: center !important;
          width: auto !important;
          max-width: 100% !important;
          white-space: nowrap !important;
          word-break: normal !important;
          overflow-wrap: normal !important;
          writing-mode: horizontal-tb !important;
          text-orientation: mixed !important;
          text-indent: 0 !important;
          letter-spacing: normal !important;
        }

        html body main.settings-module-root[data-section="incident"] .incident-config-module table.settings-table.role-table tbody tr:hover td {
          background: #f8fbff !important;
        }
        /* SETTINGS_INCIDENT_TABLE_NATIVE_FORCE_END */
`}</style>

      <input aria-hidden="true" id="globalSearch" type="hidden" />
      <button hidden id="themeBtn" type="button">
        <span id="themeLabel">Dark Mode</span>
      </button>

      <div className="settings-layout d-grid gap-3">
        <aside className="settings-menu ema-panel-surface">
          <div className="panel-head">
            <span>SETTINGS CENTER</span>
            <strong>Configuration Area</strong>
            <small>Select system setup domain</small>
          </div>

          <div className="settings-menu-list" id="settingsMenu" role="tablist" aria-label="Settings navigation">
            {allowedSectionOrder.length === 0 && (
              <div className="settings-empty-state compact">No Settings module assigned to this role.</div>
            )}
            {allowedSectionOrder.map((key) => {
              const item = sections[key];
              return (
                <button
                  key={key}
                  className={`setting-btn ${key === activeSection ? "active" : ""}`}
                  type="button"
                  data-section={key}
                  onClick={() => {
                    setActiveSection(key);
                    setSectionSearch("");
                  }}
                >
                  <span className="setting-icon"><Icon name={item.icon} /></span>
                  <span><strong>{item.title}</strong><small>{item.desc}</small></span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="settings-content d-grid gap-3">
          <div className={`settings-hero ema-panel-surface ${active.key === "users" ? "users-hero" : ""}`}>
            <div>
              <span className="eyebrow">ADMINISTRATION CONTROL</span>
              <h2 id="heroTitle">{activeHeroTitle}</h2>
              <p id="heroDesc">{activeHeroDesc}</p>
            </div>
            <div className={`settings-score ${active.key === "users" ? "users-hero-score" : ""}`}>
              {active.key === "users" ? (
                <>
                  <div className="score-box">
                    <span>Total Users</span>
                    <strong>{usersTotalCount}</strong>
                    <small>Users records</small>
                  </div>
                  <div className="score-box">
                    <span>Active Users</span>
                    <strong>{usersActiveCount}</strong>
                    <small>Can access system</small>
                  </div>
                  <div className="score-box">
                    <span>Locked Users</span>
                    <strong>{usersLockedCount}</strong>
                    <small>Blocked accounts</small>
                  </div>
                  <div className="score-box">
                    <span>MFA Enabled</span>
                    <strong>{usersMfaCount}</strong>
                    <small>Second Factor Required</small>
                  </div>
                </>
              ) : active.key === "roles" ? (
                <>
                  <div className="score-box">
                    <span>Total Roles</span>
                    <strong>{rolesTotalCount}</strong>
                    <small>Roles Records</small>
                  </div>
                  <div className="score-box">
                    <span>Active Roles</span>
                    <strong>{rolesActiveCount}</strong>
                    <small>Assigned To Users</small>
                  </div>
                </>
              ) : active.key === "modules" ? (
                <>
                  <div className="score-box">
                    <span>Total Modules</span>
                    <strong>{moduleTotalCount}</strong>
                    <small>Modules Records</small>
                  </div>
                  <div className="score-box">
                    <span>Active Roles</span>
                    <strong>{moduleActiveRoleCount}</strong>
                    <small>Controlled by RBAC</small>
                  </div>
                </>
              ) : active.key === "access" ? (
                <>
                  <div className="score-box">
                    <span>Total Controls</span>
                    <strong>{accessPolicyTotalCount}</strong>
                    <small>Access Controls Records</small>
                  </div>
                  <div className="score-box">
                    <span>Active Controls</span>
                    <strong>{accessPolicyActiveCount}</strong>
                    <small>Security Rules Enabled</small>
                  </div>
                </>
              ) : active.key === "incident" ? (
                <>
                  <div className="score-box">
                    <span>{incidentConfigMeta.scoreOneLabel}</span>
                    <strong id="scoreOne">{heroScoreOne}</strong>
                    <small>{incidentConfigMeta.scoreOneCaption}</small>
                  </div>
                  <div className="score-box">
                    <span>{incidentConfigMeta.scoreTwoLabel}</span>
                    <strong id="scoreTwo">{heroScoreTwo}</strong>
                    <small>{incidentConfigMeta.scoreTwoCaption}</small>
                  </div>
                </>
              ) : (
                <>
                  <div className="score-box">
                    <span>{active.subtitle}</span>
                    <strong id="scoreOne">{heroScoreOne}</strong>
                    <small>{active.subtitle}</small>
                  </div>
                  <div className="score-box">
                    <span>Reference</span>
                    <strong id="scoreTwo">{heroScoreTwo}</strong>
                    <small>Control Value</small>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className={`content-shell ema-panel-surface ${activeSection === "users" ? "users-content-shell" : activeSection === "roles" ? "roles-content-shell" : activeSection === "modules" ? "modules-content-shell" : activeSection === "access" ? "access-content-shell" : activeSection === "audit" ? "audit-content-shell" : activeSection === "incident" ? "incident-content-shell" : activeSection === "notification" ? "notification-content-shell" : activeSection === "softwarePolicy" ? "software-policy-content-shell" : activeSection === "policy" ? "policy-content-shell" : ""}`}>
            {false && (
              <div className={`content-head ${activeSection === "audit" ? "audit-export-only-head" : ""}`}>
                {activeSection !== "audit" && (
                  <div>
                    <span className="section-tag" id="sectionTag">{active.tag}</span>
                    <h3 id="sectionTitle">{active.title}</h3>
                    <p id="sectionDesc">{active.desc}</p>
                  </div>
                )}
                <div className="content-actions">
                  {activeSection === "roles" ? (
                    <>
                      <button className="soft-btn" type="button" onClick={loadAccessRoles} disabled={rolesLoading}>{rolesLoading ? "Loading..." : "Refresh"}</button>
                      <button className="primary-btn" type="button" onClick={() => openAccessRoleModal(null)}>Add Role</button>
                    </>
                  ) : activeSection === "audit" ? (
                    <button className="primary-btn" type="button" onClick={exportAuditLogs} disabled={auditLoading || filteredAuditLogs.length === 0}>Export CSV</button>
                  ) : (
                    <>
                      <button className="soft-btn" id="resetBtn" type="button" onClick={resetSection} disabled={(activeSection === "pricing" && pricingSaving) || (activeSection === "aging" && pcAgingSaving) || (activeSection === "policy" && managementPolicySaving) || (activeSection === "incident" && incidentConfigSaving)}>Reset</button>
                      {activeSection === "pricing" && (
                        <button className="soft-btn" type="button" onClick={addPricingRow}>+ Add Custom Pricing</button>
                      )}
                      <button className="primary-btn" id="saveBtn" type="button" onClick={saveSection} disabled={(activeSection === "pricing" && pricingSaving) || (activeSection === "aging" && pcAgingSaving) || (activeSection === "policy" && managementPolicySaving) || (activeSection === "incident" && incidentConfigSaving)}>
                        {activeSection === "pricing" ? (pricingSaving ? "Saving..." : "Save Pricing") : activeSection === "aging" ? (pcAgingSaving ? "Saving..." : "Save Changes") : activeSection === "incident" ? (incidentConfigSaving ? "Saving..." : "Save Incident Config") : activeSection === "policy" ? (managementPolicySaving ? "Saving..." : "Save Policy") : "Save Changes"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeSection !== "users" && activeSection !== "access" && activeSection !== "audit" && activeSection !== "incident" && activeSection !== "notification" && activeSection !== "softwarePolicy" && activeSection !== "aging" && activeSection !== "policy" && activeSection !== "resources" && (
              <div className={`content-toolbar ${activeSection === "users" ? "users-toolbar" : activeSection === "roles" ? "roles-toolbar" : activeSection === "modules" ? "modules-toolbar" : ""}`}>
                <label className="section-search">
                  <SearchSvg />
                  <input
                    id="sectionSearch"
                    placeholder={activeSection === "users" ? "Search users by name, email or role..." : activeSection === "roles" ? "Search roles by name or description..." : activeSection === "modules" ? "Search modules by name or description..." : activeSection === "resources" ? "Search engineer, role, date or remarks..." : activeSection === "audit" ? "Search audit logs by user, module or action..." : "Search current settings..."}
                    value={sectionSearch}
                    onChange={(event) => setSectionSearch(event.target.value)}
                  />
                </label>
                {activeSection === "roles" && (
                  <div className="content-actions toolbar-actions">
                    <button className="soft-btn" type="button" onClick={loadAccessRoles} disabled={rolesLoading}>{rolesLoading ? "Loading..." : "Refresh"}</button>
                    <button className="primary-btn" type="button" onClick={() => openAccessRoleModal(null)}>Add Role</button>
                  </div>
                )}
                {activeSection === "modules" && (
                  <div className="content-actions toolbar-actions">
                    <button className="soft-btn" type="button" onClick={loadModuleAccess} disabled={moduleLoading}>{moduleLoading ? "Loading..." : "Refresh"}</button>
                  </div>
                )}
                {activeSection !== "users" && activeSection !== "roles" && activeSection !== "modules" && activeSection !== "audit" && activeSection !== "incident" && activeSection !== "resources" && (
                  <div className="settings-toolbar-right">
                    <SettingSelect
                      className="section-filter-select"
                      value="all"
                      options={[
                        { value: "all", label: "All Status" },
                        { value: "active", label: "Active" },
                        { value: "review", label: "Review" },
                        { value: "locked", label: "Locked" },
                      ]}
                      onChange={() => undefined}
                      ariaLabel="Section filter"
                    />

                    {(activeSection === "pricing" || activeSection === "aging" || activeSection === "policy") && (
                      <div className="content-actions toolbar-actions settings-primary-actions">
                        <button className="soft-btn" id="resetBtn" type="button" onClick={resetSection} disabled={(activeSection === "pricing" && pricingSaving) || (activeSection === "aging" && pcAgingSaving) || (activeSection === "policy" && managementPolicySaving) || (activeSection === "incident" && incidentConfigSaving)}>Reset</button>
                        {activeSection === "pricing" && (
                          <button className="soft-btn" type="button" onClick={addPricingRow}>+ Add Custom Pricing</button>
                        )}
                        <button className="primary-btn" id="saveBtn" type="button" onClick={saveSection} disabled={(activeSection === "pricing" && pricingSaving) || (activeSection === "aging" && pcAgingSaving) || (activeSection === "policy" && managementPolicySaving) || (activeSection === "incident" && incidentConfigSaving)}>
                          {activeSection === "pricing" ? (pricingSaving ? "Saving..." : "Save Pricing") : activeSection === "aging" ? (pcAgingSaving ? "Saving..." : "Save Changes") : activeSection === "incident" ? (incidentConfigSaving ? "Saving..." : "Save Incident Config") : activeSection === "policy" ? (managementPolicySaving ? "Saving..." : "Save Policy") : "Save Changes"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="content-body" id="contentBody">
              {!canViewActiveSettingsSection ? (
                <div className="settings-empty-state">
                  No access to this Settings section. Enable the matching settings.* module for this role in Module Control.
                </div>
              ) : (
                <>
              {activeSection === "roles" && <RoleContent roles={accessRoles} loading={rolesLoading} error={rolesError} search={filteredContentTerm} onEdit={openAccessRoleModal} onDelete={requestDeleteAccessRole} />}
              {activeSection === "users" && <UserAccessContent users={visibleUsers} sourceUsers={users} loading={usersLoading} error={usersError} search={sectionSearch} onSearchChange={setSectionSearch} onReload={loadUsers} onAdd={() => openUserModal(null)} onEdit={openUserModal} onDelete={requestDeleteUser} />}
              {activeSection === "modules" && <ModuleMatrixContent roles={accessRoles.filter((role) => role.status === "Active")} modules={moduleCatalog} permissions={modulePermissions} loading={moduleLoading} error={moduleError} search={filteredContentTerm} savingKey={moduleSavingKey} onReload={loadModuleAccess} onToggle={toggleRoleModuleAccess} />}
              {activeSection === "access" && <AccessControlContent policies={accessPolicies} loading={accessPoliciesLoading} error={accessPoliciesError} onReload={loadAccessPolicies} onAdd={() => openAccessPolicyModal(null)} onEdit={openAccessPolicyModal} onToggleStatus={toggleAccessPolicyStatus} />}
              {activeSection === "audit" && (
                <AuditContent
                  logs={filteredAuditLogs}
                  allLogs={auditLogs}
                  loading={auditLoading}
                  error={auditError}
                  moduleOptions={auditModuleOptions}
                  severityOptions={auditSeverityOptions}
                  moduleFilter={auditModuleFilter}
                  severityFilter={auditSeverityFilter}
                  dateFilter={auditDateFilter}
                  page={auditPage}
                  limit={auditLimit}
                  totalRecords={auditTotalRecords}
                  totalPages={auditTotalPages}
                  onModuleFilterChange={setAuditModuleFilter}
                  onSeverityFilterChange={setAuditSeverityFilter}
                  onDateFilterChange={setAuditDateFilter}
                  onPageChange={setAuditPage}
                  onReload={() => loadAuditLogs(auditPage)}
                  onExport={exportAuditLogs}
                  exporting={auditExporting}
                  exportDisabled={auditLoading || auditExporting || auditTotalRecords === 0}
                />
              )}
              {activeSection === "incident" && (
                <IncidentConfigContent
                  activeTab={incidentConfigTab}
                  meta={incidentConfigMeta}
                  slaRows={slaConfigs}
                  workingHours={workingHours}
                  categories={incidentCategories}
                  selectedCategoryId={selectedIncidentCategoryId}
                  selectedSubcategoryId={selectedIncidentSubcategoryId}
                  newCategoryName={newIncidentCategoryName}
                  newSubcategoryName={newIncidentSubcategoryName}
                  newDetailName={newIncidentDetailName}
                  categorySavingKey={categorySavingKey}
                  loading={incidentConfigLoading}
                  saving={incidentConfigSaving}
                  error={incidentConfigError}
                  onTabChange={setIncidentConfigTab}
                  onReload={loadIncidentConfig}
                  onSlaChange={updateSlaConfig}
                  onWorkingHourChange={updateWorkingHour}
                  onSelectCategory={(id) => {
                    setSelectedIncidentCategoryId(id);
                    const nextCategory = incidentCategories.find((category) => String(category.id) === id);
                    setSelectedIncidentSubcategoryId(String(nextCategory?.subcategories[0]?.id ?? ""));
                  }}
                  onSelectSubcategory={setSelectedIncidentSubcategoryId}
                  onNewCategoryNameChange={setNewIncidentCategoryName}
                  onNewSubcategoryNameChange={setNewIncidentSubcategoryName}
                  onNewDetailNameChange={setNewIncidentDetailName}
                  onCategoryNameChange={updateCategoryNameLocal}
                  onSubcategoryNameChange={updateSubcategoryNameLocal}
                  onDetailNameChange={updateDetailNameLocal}
                  onAddCategory={addIncidentCategory}
                  onUpdateCategory={updateIncidentCategory}
                  onDeactivateCategory={deactivateIncidentCategory}
                  onDeleteCategory={requestDeleteIncidentCategory}
                  onAddSubcategory={addIncidentSubcategory}
                  onUpdateSubcategory={updateIncidentSubcategory}
                  onDeactivateSubcategory={deactivateIncidentSubcategory}
                  onDeleteSubcategory={requestDeleteIncidentSubcategory}
                  onAddDetail={addIncidentDetail}
                  onUpdateDetail={updateIncidentDetail}
                  onDeactivateDetail={deactivateIncidentDetail}
                  onDeleteDetail={requestDeleteIncidentDetail}
                  onSave={saveIncidentConfig}
                />
              )}
              {activeSection === "notification" && (
                <div className="settings-inline-module settings-notification-inline">
                  <NotificationChannelsSettings />
                </div>
              )}
              {activeSection === "softwarePolicy" && <SoftwareRegistryManagement />}
              {activeSection === "pricing" && <PricingContent search={filteredContentTerm} rows={pricingRows} categoryOptions={categoryOptions} brandOptionsByCategory={brandOptionsByCategory} modelOptionsByKey={modelOptionsByKey} loading={pricingLoading} saving={pricingSaving} savingRowId={pricingRowSavingId} error={pricingError} onAdd={addPricingRow} onChange={updatePricingRow} onSaveRow={savePricingRow} onRequestDelete={requestDeletePricingRow} />}
              {activeSection === "aging" && (
                <AgingContent
                  rule={pcAgingRule}
                  loading={pcAgingLoading}
                  saving={pcAgingSaving}
                  error={pcAgingError}
                  onChange={(patch) => setPcAgingRule((current) => normalizePcAgingRule({ ...current, ...patch }))}
                  onReload={loadPcAgingRule}
                  onSave={savePcAgingRule}
                  onReset={resetSection}
                />
              )}
              {activeSection === "policy" && (
                <ManagementPolicyContent
                  values={managementPolicyValues}
                  profile={managementPolicyProfile}
                  loading={managementPolicyLoading}
                  saving={managementPolicySaving}
                  error={managementPolicyError}
                  onChange={(key, value) => setManagementPolicyValues((current) => normalizeManagementPolicyValues({ ...current, [key]: value }))}
                  onReload={loadManagementPolicy}
                  onReset={resetSection}
                  onSave={saveManagementPolicy}
                />
              )}
              {activeSection === "risk" && <RiskContent search={filteredContentTerm} />}
              {activeSection === "resources" && (
                <ResourcePlanningContent
                  search={filteredContentTerm}
                  engineers={resourceEngineers}
                  schedules={resourceSchedules}
                  form={resourceForm}
                  editingId={resourceEditingId}
                  loading={resourceLoading}
                  saving={resourceSaving}
                  error={resourceError}
                  onFormChange={(patch) => setResourceForm((current) => ({ ...current, ...patch }))}
                  onSave={saveResourceSchedule}
                  onEdit={editResourceSchedule}
                  onDelete={requestDeleteResourceSchedule}
                  onReset={resetResourcePlanningForm}
                  onReload={loadResourcePlanning}
                />
              )}
                </>
              )}
            </div>
          </div>
        </section>

      </div>

      <UserModal
        open={userModalOpen}
        mode={editingUserIndex === null ? "ADD NEW USER ACCESS" : "UPDATE USER ACCESS"}
        title={editingUserIndex === null ? "Add New User" : "Update User Access"}
        form={userForm}
        setForm={setUserForm}
        onClose={() => setUserModalOpen(false)}
        onSave={saveUserAccess}
        roleOptions={roleOptionsForUsers}
      />

      <AccessRoleModal
        open={accessRoleModalOpen}
        mode={editingAccessRoleIndex === null ? "ADD ROLE" : "UPDATE ROLE"}
        form={accessRoleForm}
        setForm={setAccessRoleForm}
        onClose={() => setAccessRoleModalOpen(false)}
        onSave={saveAccessRole}
      />

      <ConfirmDeleteRoleModal
        role={roleDeleteTarget?.role || null}
        onClose={() => setRoleDeleteTarget(null)}
        onConfirm={confirmDeleteAccessRole}
      />

      <AccessPolicyModal
        open={accessPolicyModalOpen}
        mode={editingAccessPolicyIndex === null ? "ADD ACCESS CONTROL" : "UPDATE ACCESS CONTROL"}
        title={editingAccessPolicyIndex === null ? "Add Access Control" : "Update Access Control"}
        form={accessPolicyForm}
        setForm={setAccessPolicyForm}
        onClose={() => setAccessPolicyModalOpen(false)}
        onSave={saveAccessPolicy}
      />

      <AccessPolicyDeleteConfirmModal
        target={accessPolicyDeleteTarget}
        onCancel={() => setAccessPolicyDeleteTarget(null)}
        onConfirm={confirmDeleteAccessPolicy}
      />

      <UserDeleteModal
        target={userDeleteTarget}
        onClose={() => setUserDeleteTarget(null)}
        onConfirm={confirmDeleteUser}
      />
      <PricingDeleteModal
        row={pricingDeleteTarget}
        loading={Boolean(pricingRowSavingId && pricingDeleteTarget?.id === pricingRowSavingId)}
        onClose={() => setPricingDeleteTarget(null)}
        onConfirm={confirmDeletePricingRow}
      />
      <IncidentConfigDeleteModal
        target={incidentDeleteTarget}
        loading={Boolean(categorySavingKey)}
        onClose={() => setIncidentDeleteTarget(null)}
        onConfirm={() => {
          if (!incidentDeleteTarget) return;
          if (incidentDeleteTarget.kind === "category") confirmDeleteIncidentCategory(incidentDeleteTarget.category);
          if (incidentDeleteTarget.kind === "subcategory") confirmDeleteIncidentSubcategory(incidentDeleteTarget.categoryId, incidentDeleteTarget.subcategory);
          if (incidentDeleteTarget.kind === "detail") confirmDeleteIncidentDetail(incidentDeleteTarget.categoryId, incidentDeleteTarget.subcategoryId, incidentDeleteTarget.detail);
        }}
      />
      <ResourceDeleteModal
        target={resourceDeleteTarget}
        loading={resourceSaving}
        onClose={() => setResourceDeleteTarget(null)}
        onConfirm={confirmDeleteResourceSchedule}
      />

      <SettingsToast toast={settingsToast} onClose={() => setSettingsToast(null)} />
    </main>
  );
}


function IncidentConfigContent({
  activeTab,
  meta,
  slaRows,
  workingHours,
  categories,
  selectedCategoryId,
  selectedSubcategoryId,
  newCategoryName,
  newSubcategoryName,
  newDetailName,
  categorySavingKey,
  loading,
  saving,
  error,
  onTabChange,
  onReload,
  onSlaChange,
  onWorkingHourChange,
  onSelectCategory,
  onSelectSubcategory,
  onNewCategoryNameChange,
  onNewSubcategoryNameChange,
  onNewDetailNameChange,
  onCategoryNameChange,
  onSubcategoryNameChange,
  onDetailNameChange,
  onAddCategory,
  onUpdateCategory,
  onDeactivateCategory,
  onDeleteCategory,
  onAddSubcategory,
  onUpdateSubcategory,
  onDeactivateSubcategory,
  onDeleteSubcategory,
  onAddDetail,
  onUpdateDetail,
  onDeactivateDetail,
  onDeleteDetail,
  onSave,
}: IncidentConfigContentProps) {
  const selectedCategory = categories.find((category) => String(category.id) === selectedCategoryId) || categories[0];
  const selectedSubcategory = selectedCategory?.subcategories.find((subcategory) => String(subcategory.id) === selectedSubcategoryId) || selectedCategory?.subcategories[0];
  const categoryCounts = getIncidentCategoryCounts(categories);
  const categoriesDisabled = loading || Boolean(categorySavingKey);

  return (
    <div className="incident-config-module">
      {error && (
        <div className="settings-inline-alert error">
          <strong>Incident Config load error</strong>
          <span>{error}</span>
        </div>
      )}

      <section className="resource-command-card incident-command-card">
        <div>
          <span className="section-tag">{meta.eyebrow}</span>
          <h3>{meta.commandTitle}</h3>
          <p>{meta.commandDescription}</p>
        </div>
        <div className="resource-command-actions">
          <button className="soft-btn" type="button" onClick={onReload} disabled={loading || saving || Boolean(categorySavingKey)}>
            {loading ? "Loading..." : "Refresh"}
          </button>
          <button className="primary-btn" type="button" onClick={onSave} disabled={loading || saving || Boolean(categorySavingKey)}>
            {saving ? "Saving..." : meta.saveLabel}
          </button>
        </div>
      </section>

      <div className="incident-config-tabs resource-command-actions">
        <button className={activeTab === "sla" ? "primary-btn" : "soft-btn"} type="button" onClick={() => onTabChange("sla")}>
          SLA Rules
        </button>
        <button className={activeTab === "workingHours" ? "primary-btn" : "soft-btn"} type="button" onClick={() => onTabChange("workingHours")}>
          Working Hours
        </button>
        <button className={activeTab === "categories" ? "primary-btn" : "soft-btn"} type="button" onClick={() => onTabChange("categories")}>
          Category Setup
        </button>
      </div>

      {activeTab === "sla" && (
        <section className="content-panel incident-sla-panel">
          <div className="resource-card-head">
            <div>
              <span className="section-tag">SLA CONFIGURATION</span>
              <h4>Priority-based SLA Rules</h4>
              <p>Resolution time is the main SLA due date source. Response time is stored for future first-response tracking.</p>
            </div>
          </div>

          <div className="table-shell role-table-wrap">
            <table className="settings-table role-table">
              <thead>
                <tr>
                  <th>Priority Code</th>
                  <th>Label</th>
                  <th>Response Time (Min)</th>
                  <th>Resolution Time (Hrs)</th>
                  <th>Escalation Policy / Note</th>
                </tr>
              </thead>
              <tbody>
                {slaRows.map((row) => (
                  <tr key={String(row.id)}>
                    <td><strong>{row.priority}</strong></td>
                    <td><span>{row.label}</span></td>
                    <td><input className="setting-input" type="number" min="0" value={row.responseTimeMin} onChange={(event) => onSlaChange(row.id, { responseTimeMin: Number(event.target.value) })} /></td>
                    <td><input className="setting-input" type="number" min="1" value={row.resolutionTimeHrs} onChange={(event) => onSlaChange(row.id, { resolutionTimeHrs: Number(event.target.value) })} /></td>
                    <td><textarea className="setting-input resource-textarea" value={row.escalationPolicy} onChange={(event) => onSlaChange(row.id, { escalationPolicy: event.target.value })} placeholder="Escalation note for this SLA priority" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === "workingHours" && (
        <section className="content-panel incident-working-panel">
          <div className="resource-card-head">
            <div>
              <span className="section-tag">WORKING HOURS</span>
              <h4>SLA Counting Window</h4>
              <p>SLA timer should only count inside enabled working days and configured time range.</p>
            </div>
          </div>

          <div className="table-shell role-table-wrap">
            <table className="settings-table role-table">
              <thead>
                <tr><th>Day</th><th>Enabled</th><th>Start Time</th><th>End Time</th><th>Status</th></tr>
              </thead>
              <tbody>
                {workingHours.map((row) => (
                  <tr key={row.id}>
                    <td><strong>{row.day}</strong></td>
                    <td>
                      <SettingSelect value={row.enabled ? "enabled" : "rest"} options={[{ value: "enabled", label: "Enabled" }, { value: "rest", label: "Rest Day" }]} onChange={(value) => onWorkingHourChange(row.id, { enabled: value === "enabled" })} ariaLabel={`${row.day} working status`} />
                    </td>
                    <td><input className="setting-input" type="time" value={row.start} disabled={!row.enabled} onChange={(event) => onWorkingHourChange(row.id, { start: event.target.value })} /></td>
                    <td><input className="setting-input" type="time" value={row.end} disabled={!row.enabled} onChange={(event) => onWorkingHourChange(row.id, { end: event.target.value })} /></td>
                    <td><span className={`status-pill ${row.enabled ? "active" : "locked"}`}>{row.enabled ? "Working Day" : "Rest Day"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === "categories" && (
        <section className="content-panel incident-category-panel">
          <div className="resource-card-head incident-category-head">
            <div>
              <span className="section-tag">CATEGORY SETUP</span>
              <h4>Incident Category Hierarchy</h4>
              <p>Maintain editable Category → Subcategory → Incident Detail options used by the Service Desk form and filter.</p>
            </div>
            <div className="incident-category-stats">
              <span><strong>{categoryCounts.categoryCount}</strong> Categories</span>
              <span><strong>{categoryCounts.subcategoryCount}</strong> Subcategories</span>
              <span><strong>{categoryCounts.detailCount}</strong> Details</span>
            </div>
          </div>

          <div className="incident-category-layout">
            <aside className="incident-category-sidebar">
              <div className="incident-category-add-row">
                <input className="setting-input" value={newCategoryName} onChange={(event) => onNewCategoryNameChange(event.target.value)} placeholder="New category name" disabled={categoriesDisabled} />
                <button className="primary-btn" type="button" onClick={onAddCategory} disabled={categoriesDisabled || !newCategoryName.trim()}>{categorySavingKey === "category:add" ? "Adding..." : "+ Add"}</button>
              </div>

              <div className="incident-category-list">
                {categories.length === 0 ? <div className="incident-empty-state">No category yet. Add the first incident category.</div> : categories.map((category) => (
                  <button key={String(category.id)} className={`incident-category-list-item ${String(category.id) === String(selectedCategory?.id) ? "active" : ""}`} type="button" onClick={() => onSelectCategory(String(category.id))}>
                    <span>{category.name || "Untitled Category"}</span>
                    <small>{category.subcategories.length} subcategories</small>
                  </button>
                ))}
              </div>
            </aside>

            <div className="incident-category-editor">
              {selectedCategory ? (
                <>
                  <section className="incident-editor-card">
                    <div className="incident-editor-title">
                      <div><span className="section-tag">CATEGORY</span><h5>Edit Selected Category</h5></div>
                      <div className="incident-editor-actions">
                        <button className="soft-btn" type="button" onClick={() => onUpdateCategory(selectedCategory)} disabled={categoriesDisabled || !selectedCategory.name.trim()}>{categorySavingKey === `category:${selectedCategory.id}:save` ? "Saving..." : "Save"}</button>
                        <button className="soft-btn" type="button" onClick={() => onDeactivateCategory(selectedCategory)} disabled={categoriesDisabled || !selectedCategory.name.trim()}>{categorySavingKey === `category:${selectedCategory.id}:deactivate` ? "Deactivating..." : "Deactivate"}</button>
                        <button className="danger-btn" type="button" onClick={() => onDeleteCategory(selectedCategory)} disabled={categoriesDisabled}>{categorySavingKey === `category:${selectedCategory.id}:delete` ? "Deleting..." : "Delete"}</button>
                      </div>
                    </div>
                    <input className="setting-input" value={selectedCategory.name} onChange={(event) => onCategoryNameChange(selectedCategory.id, event.target.value)} placeholder="Category name" disabled={categoriesDisabled} />
                  </section>

                  <section className="incident-editor-card">
                    <div className="incident-editor-title"><div><span className="section-tag">SUBCATEGORY</span><h5>Subcategories under {selectedCategory.name || "selected category"}</h5></div></div>
                    <div className="incident-add-inline">
                      <input className="setting-input" value={newSubcategoryName} onChange={(event) => onNewSubcategoryNameChange(event.target.value)} placeholder="New subcategory name" disabled={categoriesDisabled} />
                      <button className="primary-btn" type="button" onClick={onAddSubcategory} disabled={categoriesDisabled || !newSubcategoryName.trim()}>{categorySavingKey === `category:${selectedCategory.id}:subcategory:add` ? "Adding..." : "+ Add Subcategory"}</button>
                    </div>
                    <div className="incident-subcategory-list">
                      {selectedCategory.subcategories.length === 0 ? <div className="incident-empty-state">No subcategory yet for this category.</div> : selectedCategory.subcategories.map((subcategory) => (
                        <div key={String(subcategory.id)} className={`incident-subcategory-row ${String(subcategory.id) === String(selectedSubcategory?.id) ? "active" : ""}`}>
                          <button type="button" className="incident-subcategory-select" onClick={() => onSelectSubcategory(String(subcategory.id))}><strong>{subcategory.name || "Untitled Subcategory"}</strong><small>{subcategory.details.length} details</small></button>
                          <input className="setting-input" value={subcategory.name} onChange={(event) => onSubcategoryNameChange(selectedCategory.id, subcategory.id, event.target.value)} disabled={categoriesDisabled} />
                          <div className="incident-row-actions">
                            <button className="soft-btn" type="button" onClick={() => onUpdateSubcategory(selectedCategory.id, subcategory)} disabled={categoriesDisabled || !subcategory.name.trim()}>{categorySavingKey === `subcategory:${subcategory.id}:save` ? "Saving..." : "Save"}</button>
                            <button className="soft-btn" type="button" onClick={() => onDeactivateSubcategory(selectedCategory.id, subcategory)} disabled={categoriesDisabled || !subcategory.name.trim()}>{categorySavingKey === `subcategory:${subcategory.id}:deactivate` ? "Deactivating..." : "Deactivate"}</button>
                            <button className="danger-btn" type="button" onClick={() => onDeleteSubcategory(selectedCategory.id, subcategory)} disabled={categoriesDisabled}>{categorySavingKey === `subcategory:${subcategory.id}:delete` ? "Deleting..." : "Delete"}</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="incident-editor-card">
                    <div className="incident-editor-title"><div><span className="section-tag">INCIDENT DETAIL</span><h5>{selectedSubcategory ? `Details under ${selectedSubcategory.name}` : "Select a subcategory"}</h5></div></div>
                    {selectedSubcategory ? (
                      <>
                        <div className="incident-add-inline">
                          <input className="setting-input" value={newDetailName} onChange={(event) => onNewDetailNameChange(event.target.value)} placeholder="New incident detail" disabled={categoriesDisabled} />
                          <button className="primary-btn" type="button" onClick={onAddDetail} disabled={categoriesDisabled || !newDetailName.trim()}>{categorySavingKey === `subcategory:${selectedSubcategory.id}:detail:add` ? "Adding..." : "+ Add Detail"}</button>
                        </div>
                        <div className="incident-detail-list">
                          {selectedSubcategory.details.length === 0 ? <div className="incident-empty-state">No incident detail yet for this subcategory.</div> : selectedSubcategory.details.map((detail) => (
                            <div key={String(detail.id)} className="incident-detail-row">
                              <input className="setting-input" value={detail.name} onChange={(event) => onDetailNameChange(selectedCategory.id, selectedSubcategory.id, detail.id, event.target.value)} disabled={categoriesDisabled} />
                              <div className="incident-row-actions">
                                <button className="soft-btn" type="button" onClick={() => onUpdateDetail(selectedCategory.id, selectedSubcategory.id, detail)} disabled={categoriesDisabled || !detail.name.trim()}>{categorySavingKey === `detail:${detail.id}:save` ? "Saving..." : "Save"}</button>
                                <button className="soft-btn" type="button" onClick={() => onDeactivateDetail(selectedCategory.id, selectedSubcategory.id, detail)} disabled={categoriesDisabled || !detail.name.trim()}>{categorySavingKey === `detail:${detail.id}:deactivate` ? "Deactivating..." : "Deactivate"}</button>
                                <button className="danger-btn" type="button" onClick={() => onDeleteDetail(selectedCategory.id, selectedSubcategory.id, detail)} disabled={categoriesDisabled}>{categorySavingKey === `detail:${detail.id}:delete` ? "Deleting..." : "Delete"}</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : <div className="incident-empty-state">Select or add a subcategory before adding incident details.</div>}
                  </section>
                </>
              ) : <div className="incident-empty-state large">Add a category first to start configuring Service Desk category setup.</div>}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}


function ResourcePlanningContent({
  search,
  engineers,
  schedules,
  form,
  editingId,
  loading,
  saving,
  error,
  onFormChange,
  onSave,
  onEdit,
  onDelete,
  onReset,
  onReload,
}: {
  search: string;
  engineers: ResourceEngineer[];
  schedules: ResourceSchedule[];
  form: ResourceScheduleForm;
  editingId: number | null;
  loading: boolean;
  saving: boolean;
  error: string;
  onFormChange: (patch: Partial<ResourceScheduleForm>) => void;
  onSave: () => void;
  onEdit: (row: ResourceSchedule) => void;
  onDelete: (row: ResourceSchedule) => void;
  onReset: () => void;
  onReload: () => void;
}) {
  type ResourceSortKey = "created" | "engineer" | "role" | "period" | "status";
  type ResourceSortDirection = "asc" | "desc";

  const pageSize = 5;
  const query = search.trim().toLowerCase();

  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortKey, setSortKey] = useState<ResourceSortKey>("created");
  const [sortDirection, setSortDirection] = useState<ResourceSortDirection>("desc");

  const supportEngineers = engineers.filter(isResourceSupportEngineer);
  const selectedEngineer = supportEngineers.find((engineer) => getResourceEngineerUserId(engineer) === form.UserID);

  const getCreatedSortValue = (row: ResourceSchedule) => {
    const createdValue = String(row.CreatedAt ?? row.createdAt ?? row.UpdatedAt ?? row.updatedAt ?? row.StartDate ?? row.EndDate ?? "").trim();
    const createdTime = createdValue ? new Date(createdValue).getTime() : Number.NaN;

    if (Number.isFinite(createdTime)) return createdTime;

    const fallbackId = getResourceScheduleId(row);
    return Number.isFinite(fallbackId) ? fallbackId : 0;
  };

  const getPeriodSortValue = (row: ResourceSchedule) => {
    const startValue = String(row.StartDate || "").trim();
    const startTime = startValue ? new Date(startValue).getTime() : Number.NaN;
    return Number.isFinite(startTime) ? startTime : 0;
  };

  const roleOptions: DropdownOption[] = [
    { value: "all", label: "All Roles" },
    ...Array.from(new Set(schedules.map((row) => getResourceScheduleRole(row) || "Support").filter(Boolean)))
      .sort((a, b) => a.localeCompare(b))
      .map((role) => ({ value: role, label: role })),
  ];

  const statusOptions: DropdownOption[] = [
    { value: "all", label: "All Statuses" },
    ...Array.from(new Set(schedules.map((row) => getResourceScheduleStatus(row) || "On Leave").filter(Boolean)))
      .sort((a, b) => a.localeCompare(b))
      .map((status) => ({ value: status, label: status })),
  ];

  const filteredSchedules = schedules.filter((row) => {
    const rowStatus = getResourceScheduleStatus(row) || "On Leave";
    const rowRole = getResourceScheduleRole(row) || "Support";

    if (statusFilter !== "all" && rowStatus !== statusFilter) return false;
    if (roleFilter !== "all" && rowRole !== roleFilter) return false;

    if (!query) return true;

    return [
      getResourceScheduleName(row),
      rowRole,
      getResourceScheduleDepartment(row),
      rowStatus,
      getResourceScheduleRemarks(row),
      row.StartDate,
      row.EndDate,
      row.CreatedAt,
      row.createdAt,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  const sortedSchedules = [...filteredSchedules].sort((left, right) => {
    const direction = sortDirection === "asc" ? 1 : -1;

    if (sortKey === "created") {
      return (getCreatedSortValue(left) - getCreatedSortValue(right)) * direction;
    }

    if (sortKey === "period") {
      return (getPeriodSortValue(left) - getPeriodSortValue(right)) * direction;
    }

    const leftValue =
      sortKey === "engineer"
        ? getResourceScheduleName(left)
        : sortKey === "role"
          ? getResourceScheduleRole(left)
          : getResourceScheduleStatus(left);

    const rightValue =
      sortKey === "engineer"
        ? getResourceScheduleName(right)
        : sortKey === "role"
          ? getResourceScheduleRole(right)
          : getResourceScheduleStatus(right);

    return leftValue.localeCompare(rightValue) * direction;
  });

  const totalPages = Math.max(1, Math.ceil(sortedSchedules.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedSchedules = sortedSchedules.slice(pageStartIndex, pageStartIndex + pageSize);
  const showingFrom = sortedSchedules.length === 0 ? 0 : pageStartIndex + 1;
  const showingTo = Math.min(pageStartIndex + pageSize, sortedSchedules.length);
  const selectedRole = selectedEngineer ? getResourceEngineerRole(selectedEngineer) : "";
  const filterActive = statusFilter !== "all" || roleFilter !== "all";

  useEffect(() => {
    setCurrentPage(1);
  }, [query, statusFilter, roleFilter, sortKey, sortDirection, schedules.length]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const updateSort = (nextSortKey: ResourceSortKey) => {
    if (sortKey === nextSortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection(nextSortKey === "created" || nextSortKey === "period" ? "desc" : "asc");
  };

  const sortIndicator = (targetKey: ResourceSortKey) => {
    if (sortKey !== targetKey) return "↕";
    return sortDirection === "asc" ? "↑" : "↓";
  };

  const resetTableFilters = () => {
    setStatusFilter("all");
    setRoleFilter("all");
    setSortKey("created");
    setSortDirection("desc");
    setCurrentPage(1);
  };

  return (
    <div className="resource-planning-module">
      {error && (
        <div className="settings-inline-alert error">
          <strong>Resource Planning load error</strong>
          <span>{error}</span>
        </div>
      )}

      <section className="resource-command-card">
        <div>
          <span className="section-tag">RESOURCE PLANNING</span>
          <h3>Engineer Leave & Assignment Visibility</h3>
          <p>
            Manage engineer leave using EMA users only. Service Desk assignment will still allow selection,
            but will warn users when an engineer is on leave.
          </p>
        </div>

        <div className="resource-command-actions">
          <button className="soft-btn" type="button" onClick={onReload} disabled={loading || saving}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </section>

      <section className="resource-workbench">
        <article className="resource-form-card">
          <div className="resource-card-head">
            <div>
              <span className="section-tag">{editingId ? "UPDATE SCHEDULE" : "NEW SCHEDULE"}</span>
              <h4>{editingId ? "Edit Engineer Leave" : "Add Engineer Leave"}</h4>
              <p>Leave only creates a warning. It does not block ticket assignment.</p>
            </div>
          </div>

          <div className="resource-form-grid">
            <label className="form-field">
              Engineer
              <SettingSelect
                value={form.UserID}
                placeholder="Select support engineer"
                ariaLabel="Resource planning engineer"
                className="resource-setting-select"
                onChange={(value) => onFormChange({ UserID: value })}
                options={[
                  { value: "", label: "Select support engineer" },
                  ...supportEngineers.map((engineer) => {
                    const userId = getResourceEngineerUserId(engineer);
                    const engineerRole = getResourceEngineerRole(engineer);
                    const department = getResourceEngineerDepartment(engineer);
                    const label = `${getResourceEngineerName(engineer)} · ${engineerRole}${department ? ` · ${department}` : ""}`;

                    return {
                      value: userId,
                      label,
                    };
                  }),
                ]}
              />
            </label>

            <label className="form-field">
              Leave Status
              <SettingSelect
                value={form.Status}
                placeholder="Select leave status"
                ariaLabel="Resource planning leave status"
                className="resource-setting-select"
                onChange={(value) => onFormChange({ Status: value })}
                options={[
                  { value: "On Leave", label: "On Leave" },
                  { value: "Training", label: "Training" },
                  { value: "On Site", label: "On Site" },
                  { value: "Unavailable", label: "Unavailable" },
                ]}
              />
            </label>

            <label className="form-field">
              Start Date
              <input
                className="setting-input"
                type="date"
                value={form.StartDate}
                onChange={(event) => onFormChange({ StartDate: event.target.value })}
              />
            </label>

            <label className="form-field">
              End Date
              <input
                className="setting-input"
                type="date"
                value={form.EndDate}
                onChange={(event) => onFormChange({ EndDate: event.target.value })}
              />
            </label>

            <label className="form-field resource-wide">
              Remarks
              <textarea
                className="setting-input resource-textarea"
                value={form.Remarks}
                onChange={(event) => onFormChange({ Remarks: event.target.value })}
                placeholder="Example: Annual leave / site visit / training day"
              />
            </label>
          </div>

          <div className="resource-form-actions resource-command-actions">
            <button className="soft-btn" type="button" onClick={onReset} disabled={saving}>
              Clear
            </button>
            <button className="primary-btn" type="button" onClick={onSave} disabled={saving || loading}>
              {saving ? "Saving..." : editingId ? "Update Leave" : "Add Leave"}
            </button>
          </div>

          {selectedEngineer && (
            <div className="resource-selected-engineer">
              <strong>{getResourceEngineerName(selectedEngineer)}</strong>
              <span>{selectedRole || "Support"}{getResourceEngineerDepartment(selectedEngineer) ? ` · ${getResourceEngineerDepartment(selectedEngineer)}` : ""}</span>
            </div>
          )}
        </article>

        <article className="resource-table-card">
          <div className="resource-card-head resource-table-head">
            <div>
              <span className="section-tag">SCHEDULES</span>
              <h4>Active & Upcoming Leave</h4>
              <p>Latest leave schedules are shown first. Click a table title to sort.</p>
            </div>

            <div className="resource-table-filters">
              <SettingSelect
                value={statusFilter}
                placeholder="All Statuses"
                ariaLabel="Filter leave status"
                className="resource-filter-select"
                onChange={setStatusFilter}
                options={statusOptions}
              />
              <SettingSelect
                value={roleFilter}
                placeholder="All Roles"
                ariaLabel="Filter support role"
                className="resource-filter-select"
                onChange={setRoleFilter}
                options={roleOptions}
              />
              {filterActive && (
                <button className="soft-btn" type="button" onClick={resetTableFilters}>
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="resource-table-wrap">
            <table className="resource-table">
              <thead>
                <tr>
                  <th>
                    <button className="resource-sort-button" type="button" onClick={() => updateSort("engineer")}>
                      Engineer <span>{sortIndicator("engineer")}</span>
                    </button>
                  </th>
                  <th>
                    <button className="resource-sort-button" type="button" onClick={() => updateSort("role")}>
                      Role <span>{sortIndicator("role")}</span>
                    </button>
                  </th>
                  <th>
                    <button className="resource-sort-button" type="button" onClick={() => updateSort("period")}>
                      Period <span>{sortIndicator("period")}</span>
                    </button>
                  </th>
                  <th>
                    <button className="resource-sort-button" type="button" onClick={() => updateSort("status")}>
                      Status <span>{sortIndicator("status")}</span>
                    </button>
                  </th>
                  <th>Remarks</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedSchedules.length === 0 && (
                  <tr>
                    <td colSpan={6}>No engineer leave schedule found.</td>
                  </tr>
                )}

                {paginatedSchedules.map((row) => {
                  const scheduleId = getResourceScheduleId(row);

                  return (
                    <tr key={scheduleId || `${getResourceScheduleName(row)}-${row.StartDate}-${row.EndDate}`}>
                      <td>
                        <strong>{getResourceScheduleName(row) || "Unknown engineer"}</strong>
                        <small>{getResourceScheduleDepartment(row) || "No department"}</small>
                      </td>
                      <td>{getResourceScheduleRole(row) || "Support"}</td>
                      <td>
                        <strong>{String(row.StartDate || "").slice(0, 10)}</strong>
                        <small>to {String(row.EndDate || "").slice(0, 10)}</small>
                      </td>
                      <td><span className="resource-status-pill">{getResourceScheduleStatus(row)}</span></td>
                      <td>{getResourceScheduleRemarks(row) || "-"}</td>
                      <td>
                        <div className="resource-row-actions">
                          <button className="soft-btn" type="button" onClick={() => onEdit(row)}>Edit</button>
                          <button className="danger-btn" type="button" onClick={() => onDelete(row)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {sortedSchedules.length > 0 && (
            <div className="uam-pagination global-style resource-pagination">
              <div className="uam-page-summary">Page {safeCurrentPage} / {totalPages}</div>
              <div className="uam-pagination-info">Showing {showingFrom}-{showingTo} of {sortedSchedules.length} leave records</div>
              <div className="uam-pagination-controls global-style" aria-label="Resource planning pagination">
                <button className="uam-page-icon" type="button" onClick={() => setCurrentPage(1)} disabled={safeCurrentPage === 1} aria-label="First page">«</button>
                <button className="uam-page-icon" type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safeCurrentPage === 1} aria-label="Previous page">‹</button>
                <span className="uam-page-current">{safeCurrentPage}</span>
                <button className="uam-page-icon" type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safeCurrentPage === totalPages} aria-label="Next page">›</button>
                <button className="uam-page-icon" type="button" onClick={() => setCurrentPage(totalPages)} disabled={safeCurrentPage === totalPages} aria-label="Last page">»</button>
              </div>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}

function RoleContent({ roles, loading, error, search, onEdit, onDelete }: { roles: AccessRole[]; loading: boolean; error: string; search: string; onEdit: (index: number) => void; onDelete: (index: number) => void }) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredRoles = roles.filter((role) => !search || `${role.name} ${role.description} ${role.status} ${role.approvalRequired ? "approval required" : "standard"}`.toLowerCase().includes(search));
  const totalPages = Math.max(1, Math.ceil(filteredRoles.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedRoles = filteredRoles.slice(pageStartIndex, pageStartIndex + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roles.length]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const getActualIndex = (role: AccessRole) => {
    const roleId = role.id || role.roleID;
    if (roleId !== undefined && roleId !== null) {
      const byId = roles.findIndex((item) => String(item.id || item.roleID) === String(roleId));
      if (byId >= 0) return byId;
    }
    return roles.indexOf(role);
  };

  return (
    <div className="uam-panel clean">
      {error && (
        <div className="settings-inline-alert error">
          <strong>Role load error</strong>
          <span>{error}</span>
        </div>
      )}

      <div className="user-access-table advanced clean-table role-standard-table">
        <div className="user-row head advanced clean-table-row role-standard-row">
          <div className="user-cell">No</div>
          <div className="user-cell">Role</div>
          <div className="user-cell">Approval</div>
          <div className="user-cell">Status</div>
          <div className="user-cell">Action</div>
        </div>

        {filteredRoles.length === 0 && <div className="settings-empty-state">No data available.</div>}

        {paginatedRoles.map((role, index) => {
          const actualIndex = getActualIndex(role);
          return (
            <div className="user-row advanced clean-table-row role-standard-row" key={`${role.id || role.roleKey}-${actualIndex}`}>
              <div className="user-cell row-number"><span className="row-index-pill">{String(pageStartIndex + index + 1).padStart(2, "0")}</span></div>
              <div className="user-cell">
                <div className="role-info-cell">
                  <strong>{role.name}</strong>
                  <small>{role.description || "No description set"}</small>
                </div>
              </div>
              <div className="user-cell"><span className={`approval-chip ${role.approvalRequired ? "required" : "standard"}`}>{role.approvalRequired ? "Required" : "Standard"}</span></div>
              <div className="user-cell"><span className={`user-pill ${role.status === "Active" ? "active" : role.status === "Inactive" ? "inactive" : "review"}`}>{role.status === "Inactive" ? "Inactive" : "Active"}</span></div>
              <div className="user-cell">
                <div className="row-actions user-row-action-wrap clean">
                  {!isProtectedSuperAdminRole(role) && (
                    <>
                      <button className="mini-btn icon-only edit" type="button" title="Edit role" aria-label="Edit role" onClick={() => onEdit(actualIndex)}>
                        <PencilSvg />
                      </button>
                      <button className="mini-btn icon-only delete" type="button" title="Delete role" aria-label="Delete role" onClick={() => onDelete(actualIndex)}>
                        <TrashSvg />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredRoles.length > 0 && (
        <div className="uam-pagination global-style">
          <div className="uam-page-summary">Page {safeCurrentPage} of {totalPages}</div>
          <div className="uam-pagination-controls global-style" aria-label="Role based control pagination">
            <button className="uam-page-icon" type="button" onClick={() => setCurrentPage(1)} disabled={safeCurrentPage === 1} aria-label="First page">«</button>
            <button className="uam-page-icon" type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safeCurrentPage === 1} aria-label="Previous page">‹</button>
            <span className="uam-page-current">{safeCurrentPage}</span>
            <button className="uam-page-icon" type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safeCurrentPage === totalPages} aria-label="Next page">›</button>
            <button className="uam-page-icon" type="button" onClick={() => setCurrentPage(totalPages)} disabled={safeCurrentPage === totalPages} aria-label="Last page">»</button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterDropdown({ label, value, options, open, onToggle, onSelect, onClose }: { label: string; value: string; options: string[]; open: boolean; onToggle: () => void; onSelect: (value: string) => void; onClose: () => void }) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  const updateMenuPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const menuWidth = Math.max(rect.width, 220);
    const safeGap = 12;
    const viewportPadding = 16;
    const optionHeight = 44;
    const estimatedMenuHeight = Math.min(360, Math.max(56, options.length * optionHeight + 12));
    const availableBelow = window.innerHeight - rect.bottom - viewportPadding;
    const availableAbove = rect.top - viewportPadding;
    const shouldOpenAbove = availableBelow < estimatedMenuHeight && availableAbove > availableBelow;
    const availableSpace = shouldOpenAbove ? availableAbove : availableBelow;
    const finalMenuHeight = Math.max(120, Math.min(estimatedMenuHeight, availableSpace));
    const left = Math.min(rect.left, window.innerWidth - menuWidth - viewportPadding);
    const top = shouldOpenAbove
      ? Math.max(viewportPadding, rect.top - finalMenuHeight - safeGap)
      : Math.min(rect.bottom + safeGap, window.innerHeight - finalMenuHeight - viewportPadding);

    setMenuStyle({
      position: "fixed",
      left: Math.max(viewportPadding, left),
      top,
      width: menuWidth,
      maxHeight: finalMenuHeight,
      zIndex: 2147483600
    });
  };

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();

    const handleReposition = () => updateMenuPosition();
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, value, options.length]);

  const menuNode = open && typeof document !== "undefined" ? createPortal(
    <div ref={menuRef} className="uam-filter-menu uam-filter-menu-portal" style={menuStyle} role="listbox" aria-label={`${label} filter`}>
      {options.map((option) => (
        <button
          key={option}
          className={`uam-filter-option ${option === value ? "selected" : ""}`}
          type="button"
          onClick={() => onSelect(option)}
        >
          <span>{option}</span>
          {option === value && <span className="uam-filter-check">✓</span>}
        </button>
      ))}
    </div>,
    document.body
  ) : null;

  return (
    <div className={`uam-filter-dropdown ${open ? "open" : ""}`}>
      <button ref={triggerRef} className="uam-filter-trigger" type="button" onClick={onToggle} aria-expanded={open}>
        <span>{value}</span>
        <ChevronDownSvg />
      </button>
      {menuNode}
    </div>
  );
}


type DropdownOption = string | { value: string; label: string };

function dropdownOptionValue(option: DropdownOption) {
  return typeof option === "string" ? option : option.value;
}

function dropdownOptionLabel(option: DropdownOption) {
  return typeof option === "string" ? option : option.label;
}

function SettingSelect({
  value,
  options,
  onChange,
  disabled = false,
  placeholder = "Select option",
  className = "",
  ariaLabel,
}: {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  const selected = options.find((option) => dropdownOptionValue(option) === value);
  const selectedLabel = selected ? dropdownOptionLabel(selected) : placeholder;

  const updateMenuPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 16;
    const gap = 8;
    const menuWidth = Math.max(rect.width, 210);
    const optionHeight = 36;
    const estimatedHeight = Math.min(288, Math.max(44, options.length * optionHeight + 10));
    const availableBelow = window.innerHeight - rect.bottom - viewportPadding;
    const availableAbove = rect.top - viewportPadding;
    const openAbove = availableBelow < estimatedHeight && availableAbove > availableBelow;
    const maxHeight = Math.max(96, Math.min(estimatedHeight, openAbove ? availableAbove : availableBelow));
    const left = Math.min(Math.max(viewportPadding, rect.left), window.innerWidth - menuWidth - viewportPadding);
    const top = openAbove
      ? Math.max(viewportPadding, rect.top - maxHeight - gap)
      : Math.min(rect.bottom + gap, window.innerHeight - maxHeight - viewportPadding);

    setMenuStyle({
      position: "fixed",
      left,
      top,
      width: menuWidth,
      maxHeight,
      zIndex: 2147483600,
    });
  };

  useEffect(() => {
    if (!open) return;

    updateMenuPosition();

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    const handleResize = () => updateMenuPosition();

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [open, value, options.length]);

  const menuNode = open && typeof document !== "undefined" ? createPortal(
    <div ref={menuRef} className="uam-filter-menu uam-filter-menu-portal setting-select-menu" style={menuStyle} role="listbox" aria-label={ariaLabel || placeholder}>
      {options.map((option) => {
        const optionValue = dropdownOptionValue(option);
        const optionLabel = dropdownOptionLabel(option);
        const selectedOption = optionValue === value;

        return (
          <button
            key={`${optionValue}-${optionLabel}`}
            className={`uam-filter-option ${selectedOption ? "selected" : ""}`}
            type="button"
            role="option"
            aria-selected={selectedOption}
            onClick={() => {
              onChange(optionValue);
              setOpen(false);
            }}
          >
            <span>{optionLabel}</span>
            {selectedOption && <span className="uam-filter-check">✓</span>}
          </button>
        );
      })}
    </div>,
    document.body
  ) : null;

  return (
    <div className={`uam-filter-dropdown setting-select-dropdown ${open ? "open" : ""} ${disabled ? "disabled" : ""} ${className}`}>
      <button
        ref={triggerRef}
        className="uam-filter-trigger setting-select-trigger"
        type="button"
        onClick={() => {
          if (!disabled) setOpen((current) => !current);
        }}
        disabled={disabled}
        aria-expanded={open}
        aria-label={ariaLabel || placeholder}
      >
        <span>{selectedLabel}</span>
        <ChevronDownSvg />
      </button>
      {menuNode}
    </div>
  );
}


function UserAccessContent({ users, sourceUsers, loading, error, search, onSearchChange, onReload, onAdd, onEdit, onDelete }: { users: UserAccess[]; sourceUsers: UserAccess[]; loading: boolean; error: string; search: string; onSearchChange: (value: string) => void; onReload: () => void; onAdd: () => void; onEdit: (index: number) => void; onDelete: (index: number) => void }) {
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [openFilter, setOpenFilter] = useState<"status" | "role" | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const roleOptions = Array.from(new Set(sourceUsers.flatMap((user) => normalizeUserRoles(user.roles || user.role || user.roleName)))).sort();
  const filteredUsers = users.filter((user) => {
    const matchesStatus = statusFilter === "All Status" || user.status === statusFilter;
    const matchesRole = roleFilter === "All Roles" || hasUserRole(user, roleFilter);
    return matchesStatus && matchesRole;
  });
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedUsers = filteredUsers.slice(pageStartIndex, pageStartIndex + pageSize);
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, roleFilter, users.length]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const getActualIndex = (user: UserAccess) => {
    const userId = user.id || user.userID;
    if (userId !== undefined && userId !== null) {
      const byId = sourceUsers.findIndex((item) => String(item.id || item.userID) === String(userId));
      if (byId >= 0) return byId;
    }
    return sourceUsers.indexOf(user);
  };

  return (
    <div className="uam-panel clean">
      <div className="user-access-commandbar">
        <label className="section-search user-search-inline">
          <SearchSvg />
          <input
            placeholder="Search users by name, email or role..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>

        <div className="uam-filter-grid clean compact">
          <FilterDropdown
            label="Status"
            value={statusFilter}
            options={["All Status", "Active", "Review", "Locked", "Inactive"]}
            open={openFilter === "status"}
            onToggle={() => setOpenFilter((current) => current === "status" ? null : "status")}
            onSelect={(value) => { setStatusFilter(value); setOpenFilter(null); }}
            onClose={() => setOpenFilter(null)}
          />
          <FilterDropdown
            label="Role"
            value={roleFilter}
            options={["All Roles", ...roleOptions]}
            open={openFilter === "role"}
            onToggle={() => setOpenFilter((current) => current === "role" ? null : "role")}
            onSelect={(value) => { setRoleFilter(value); setOpenFilter(null); }}
            onClose={() => setOpenFilter(null)}
          />
        </div>

        <div className="uam-actions-right">
          <button className="soft-btn" type="button" onClick={onReload} disabled={loading}>{loading ? "Loading..." : "Refresh"}</button>
          <button className="primary-btn" type="button" onClick={onAdd}>Add New User</button>
        </div>
      </div>

      {error && (
        <div className="settings-inline-alert error">
          <strong>User access load error</strong>
          <span>{error}</span>
        </div>
      )}

      <div className="user-access-table advanced clean-table">
        <div className="user-row head advanced clean-table-row">
          <div className="user-cell">No</div>
          <div className="user-cell">User</div>
          <div className="user-cell">Roles</div>
          <div className="user-cell">MFA</div>
          <div className="user-cell">Status</div>
          <div className="user-cell">Last Login</div>
          <div className="user-cell">Action</div>
        </div>

        {filteredUsers.length === 0 && (
          <div className="settings-empty-state">No data available.</div>
        )}

        {paginatedUsers.map((user, index) => {
          const actualIndex = getActualIndex(user);
          const isMfa = Boolean(user.requireMFA || user.mfa);
          const roles = normalizeUserRoles(user.roles || user.role || user.roleName);
          const visibleRoles = roles.slice(0, 2);
          const hiddenRoleCount = Math.max(roles.length - visibleRoles.length, 0);
          return (
            <div className="user-row advanced clean-table-row" data-user-index={actualIndex} key={`${user.id || user.email}-${actualIndex}`}>
              <div className="user-cell row-number"><span className="row-index-pill">{String(pageStartIndex + index + 1).padStart(2, "0")}</span></div>
              <div className="user-cell">
                <div className="user-name"><i className="user-mini-avatar">{initials(user.name)}</i><div><strong>{user.name}</strong><small>{user.email || user.username || "No email set"}</small></div></div>
              </div>
              <div className="user-cell">
                <div className="role-chip-stack">
                  {visibleRoles.map((role) => <span className="role-soft-chip" key={role}>{role}</span>)}
                  {hiddenRoleCount > 0 && <span className="role-more-chip">+{hiddenRoleCount}</span>}
                </div>
              </div>
              <div className="user-cell"><span className={`mfa-pill ${isMfa ? "on" : "off"}`}>{isMfa ? "On" : "Off"}</span></div>
              <div className="user-cell"><span className={`user-pill ${user.status === "Active" ? "active" : user.status === "Locked" ? "locked" : user.status === "Inactive" ? "inactive" : "review"}`}>{user.status}</span></div>
              <div className="user-cell"><span className="muted-cell">{formatUserDate(user.lastLoginAt)}</span></div>
              <div className="user-cell">
                <div className="row-actions user-row-action-wrap clean">
                  <button className="mini-btn icon-only edit" type="button" onClick={() => onEdit(actualIndex)} aria-label="Edit user access" title="Edit">
                    <PencilSvg />
                  </button>
                  <button className="mini-btn icon-only delete" type="button" onClick={() => onDelete(actualIndex)} aria-label="Delete user access" title="Delete">
                    <TrashSvg />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredUsers.length > 0 && (
        <div className="uam-pagination global-style">
          <div className="uam-page-summary">Page {safeCurrentPage} of {totalPages}</div>
          <div className="uam-pagination-controls global-style" aria-label="User access pagination">
            <button className="uam-page-icon" type="button" onClick={() => setCurrentPage(1)} disabled={safeCurrentPage === 1} aria-label="First page">«</button>
            <button className="uam-page-icon" type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safeCurrentPage === 1} aria-label="Previous page">‹</button>
            <span className="uam-page-current">{safeCurrentPage}</span>
            <button className="uam-page-icon" type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safeCurrentPage === totalPages} aria-label="Next page">›</button>
            <button className="uam-page-icon" type="button" onClick={() => setCurrentPage(totalPages)} disabled={safeCurrentPage === totalPages} aria-label="Last page">»</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ModuleMatrixContent({ roles, modules, permissions, loading, error, search, savingKey, onReload, onToggle }: { roles: AccessRole[]; modules: ModuleControlModule[]; permissions: ModulePermission[]; loading: boolean; error: string; search: string; savingKey: string; onReload: () => void; onToggle: (module: ModuleControlModule, role: AccessRole) => void }) {
  const term = search.trim().toLowerCase();

  const sortedModules = [...modules].sort((a, b) => {
    const aOrder = Number(a.sortOrder || 0);
    const bOrder = Number(b.sortOrder || 0);
    return aOrder - bOrder || a.moduleName.localeCompare(b.moduleName);
  });

  const moduleById = new Map(sortedModules.map((module) => [String(getModuleId(module)), module]));
  const childrenByParent = new Map<string, ModuleControlModule[]>();

  sortedModules.forEach((module) => {
    const parentId = module.parentModuleID == null ? "" : String(module.parentModuleID);
    if (parentId && parentId !== "0" && moduleById.has(parentId)) {
      const list = childrenByParent.get(parentId) || [];
      list.push(module);
      childrenByParent.set(parentId, list);
    }
  });

  const moduleMatches = (module: ModuleControlModule) => {
    const parent = moduleById.get(String(module.parentModuleID ?? ""));
    const haystack = `${module.moduleName} ${module.description} ${module.category || ""} ${module.routePath || ""} ${parent?.moduleName || ""}`.toLowerCase();
    return !term || haystack.includes(term);
  };

  const getGroupName = (module: ModuleControlModule) => {
    const parentId = module.parentModuleID == null ? "" : String(module.parentModuleID);
    const parent = parentId && parentId !== "0" ? moduleById.get(parentId) : null;
    if (parent) return parent.moduleName;
    const moduleId = String(getModuleId(module));
    if (childrenByParent.has(moduleId)) return module.moduleName;
    return module.category || "Other Modules";
  };

  const getGroupOrder = (module: ModuleControlModule) => {
    const parentId = module.parentModuleID == null ? "" : String(module.parentModuleID);
    const parent = parentId && parentId !== "0" ? moduleById.get(parentId) : null;
    return Number(parent?.sortOrder ?? module.sortOrder ?? 0) || 0;
  };

  const grouped = new Map<string, { groupName: string; order: number; modules: ModuleControlModule[] }>();

  sortedModules.forEach((module) => {
    const groupName = getGroupName(module);
    const key = groupName.toLowerCase();
    const current = grouped.get(key) || { groupName, order: getGroupOrder(module), modules: [] };
    current.order = Math.min(current.order, getGroupOrder(module));
    current.modules.push(module);
    grouped.set(key, current);
  });

  const groupedRows = Array.from(grouped.values())
    .sort((a, b) => a.order - b.order || a.groupName.localeCompare(b.groupName))
    .flatMap((group) => {
      const groupMatches = !term || group.groupName.toLowerCase().includes(term);
      const visibleModules = group.modules.filter((module) => groupMatches || moduleMatches(module));
      if (visibleModules.length === 0) return [] as Array<{ type: "group"; groupName: string } | { type: "module"; module: ModuleControlModule; isSubmodule: boolean }>;
      return [
        { type: "group", groupName: group.groupName },
        ...visibleModules.map((module) => ({
          type: "module" as const,
          module,
          isSubmodule: Boolean(module.parentModuleID && String(module.parentModuleID) !== "0" && moduleById.has(String(module.parentModuleID))) || group.groupName !== module.moduleName,
        })),
      ];
    });

  const visibleModuleCount = groupedRows.filter((row) => row.type === "module").length;
  let displayIndex = 0;

  return (
    <div className="uam-panel clean module-control-panel">
      {error && (
        <div className="settings-inline-alert error">
          <strong>Module access load error</strong>
          <span>{error}</span>
        </div>
      )}

      <div className="settings-helper-card compact">
        <strong>Role permissions are managed from Role Based Control.</strong>
        <span>Use this page to turn module and submodule access on or off for each active role.</span>
      </div>

      <div className="user-access-table advanced clean-table module-control-table" style={{ "--module-role-count": Math.max(roles.length, 1) } as CSSProperties}>
        <div className="user-row head advanced clean-table-row module-control-row">
          <div className="user-cell">No</div>
          <div className="user-cell">Module</div>
          {roles.length > 0 ? roles.map((role) => (
            <div className="user-cell module-role-head" key={String(getAccessRoleId(role))}>{role.name}</div>
          )) : <div className="user-cell module-role-head">Roles</div>}
        </div>

        {loading && <div className="settings-empty-state">Loading module access from EMA_Modules...</div>}
        {!loading && visibleModuleCount === 0 && <div className="settings-empty-state">No data available.</div>}
        {!loading && roles.length === 0 && visibleModuleCount > 0 && <div className="settings-empty-state">No active roles found. Create active roles in Role Based Control first.</div>}

        {!loading && roles.length > 0 && groupedRows.map((row) => {
          if (row.type === "group") {
            return (
              <div className="module-control-group-row compact" key={`group-${row.groupName}`}>
                <span>{row.groupName}</span>
              </div>
            );
          }

          displayIndex += 1;
          const module = row.module;
          return (
            <div className={`user-row advanced clean-table-row module-control-row ${row.isSubmodule ? "submodule-row" : "parent-module-row"}`} key={String(getModuleId(module))}>
              <div className="user-cell row-number"><span className="row-index-pill">{String(displayIndex).padStart(2, "0")}</span></div>
              <div className="user-cell">
                <div className={`role-info-cell module-info-cell ${row.isSubmodule ? "submodule-info" : ""}`}>
                  <strong>{module.moduleName}</strong>
                  <small>{module.description || module.routePath || (row.isSubmodule ? "Submodule" : "Main module")}</small>
                </div>
              </div>
              {roles.map((role) => {
                const moduleId = String(getModuleId(module));
                const roleId = String(getAccessRoleId(role));
                const key = `${moduleId}:${roleId}`;
                const enabled = hasModulePermission(permissions, module, role);
                return (
                  <div className="user-cell module-toggle-cell" key={key}>
                    <button
                      className={`toggle ${enabled ? "on" : ""}`}
                      type="button"
                      disabled={savingKey === key}
                      title={`${enabled ? "Disable" : "Enable"} ${module.moduleName} for ${role.name}`}
                      aria-label={`${enabled ? "Disable" : "Enable"} ${module.moduleName} for ${role.name}`}
                      onClick={() => onToggle(module, role)}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AccessControlContent({ policies, loading, error, onReload, onAdd, onEdit, onToggleStatus }: { policies: AccessPolicy[]; loading: boolean; error: string; onReload: () => void; onAdd: () => void; onEdit: (index: number) => void; onToggleStatus: (index: number, newStatus: "Active" | "Inactive") => void }) {
  const filteredPolicies = policies;

  return (
    <div className="uam-panel clean access-control-panel">
      {error && (
        <div className="settings-inline-alert error">
          <strong>Access control load error</strong>
          <span>{error}</span>
        </div>
      )}

      <div className="settings-helper-card compact">
        <strong>Access controls define login and security enforcement.</strong>
        <span>Manage MFA, session, IP/VPN and approval rules from EMA_AccessControls.</span>
      </div>

      <div className="user-access-table advanced clean-table role-standard-table access-standard-table">
        <div className="user-row head advanced clean-table-row role-standard-row access-standard-row">
          <div className="user-cell">No</div>
          <div className="user-cell">Control</div>
          <div className="user-cell">Scope</div>
          <div className="user-cell">Enforcement</div>
          <div className="user-cell">Review</div>
          <div className="user-cell">Status</div>
        </div>

        {loading && <div className="settings-empty-state">Loading access controls from EMA_AccessControls...</div>}
        {!loading && filteredPolicies.length === 0 && <div className="settings-empty-state">No data available.</div>}

        {!loading && filteredPolicies.map((policy, index) => {
          const actualIndex = policies.findIndex((item) => String(getAccessPolicyId(item)) === String(getAccessPolicyId(policy)));
          return (
            <div className="user-row advanced clean-table-row role-standard-row access-standard-row" key={String(getAccessPolicyId(policy))}>
              <div className="user-cell row-number"><span className="row-index-pill">{String(index + 1).padStart(2, "0")}</span></div>
              <div className="user-cell"><div className="role-info-cell"><strong>{policy.name}</strong><small>{policy.description || "Access control policy"}</small></div></div>
              <div className="user-cell"><span className="muted-cell">{policy.scope}</span></div>
              <div className="user-cell"><span className="approval-chip standard">{policy.enforcement}</span></div>
              <div className="user-cell"><span className="muted-cell">{policy.reviewCycle}</span></div>
              <div className="user-cell">
                <select
                  className={`access-status-select ${policy.status === "Active" ? "active" : "inactive"}`}
                  value={policy.status === "Active" ? "Active" : "Inactive"}
                  onChange={(event) => onToggleStatus(actualIndex, event.target.value as "Active" | "Inactive")}
                  aria-label="Policy status"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AuditContent({
  logs,
  allLogs,
  loading,
  error,
  moduleOptions,
  severityOptions,
  moduleFilter,
  severityFilter,
  dateFilter,
  page,
  limit,
  totalRecords,
  totalPages,
  onModuleFilterChange,
  onSeverityFilterChange,
  onDateFilterChange,
  onPageChange,
  onReload,
  onExport,
  exporting,
  exportDisabled,
}: {
  logs: AuditLog[];
  allLogs: AuditLog[];
  loading: boolean;
  error: string;
  moduleOptions: string[];
  severityOptions: string[];
  moduleFilter: string;
  severityFilter: string;
  dateFilter: AuditDateFilter;
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
  onModuleFilterChange: (value: string) => void;
  onSeverityFilterChange: (value: string) => void;
  onDateFilterChange: (value: AuditDateFilter) => void;
  onPageChange: (page: number) => void;
  onReload: () => void;
  onExport: () => void | Promise<void>;
  exporting: boolean;
  exportDisabled: boolean;
}) {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safePage = Math.min(Math.max(1, page || 1), safeTotalPages);
  const startIndex = (safePage - 1) * limit;
  const pageRows = logs;
  const shownStart = totalRecords > 0 && pageRows.length ? startIndex + 1 : 0;
  const shownEnd = totalRecords > 0 ? Math.min(startIndex + pageRows.length, totalRecords) : 0;

  return (
    <div className="audit-log-panel">
      {error && (
        <div className="settings-inline-alert error">
          <strong>Audit log load error</strong>
          <span>{error}</span>
        </div>
      )}

      <div className="audit-commandbar">
        <div className="audit-filter-grid">
          <label className="form-field">
            Main Module
            <SettingSelect
              value={moduleFilter}
              options={[{ value: "all", label: "All modules" }, ...moduleOptions.map((moduleName) => ({ value: moduleName, label: moduleName }))]}
              onChange={onModuleFilterChange}
              ariaLabel="Audit module filter"
            />
          </label>
          <label className="form-field">
            Severity / Status
            <SettingSelect
              value={severityFilter}
              options={[{ value: "all", label: "All statuses" }, ...severityOptions.map((severity) => ({ value: severity, label: severity }))]}
              onChange={onSeverityFilterChange}
              ariaLabel="Audit status filter"
            />
          </label>
          <label className="form-field">
            Date Range
            <SettingSelect
              value={dateFilter}
              options={[
                { value: "30d", label: "Last 30 days" },
                { value: "7d", label: "Last 7 days" },
                { value: "today", label: "Today" },
                { value: "all", label: "All time" },
              ]}
              onChange={(value) => onDateFilterChange(value as AuditDateFilter)}
              ariaLabel="Audit date range filter"
            />
          </label>
        </div>

        <div className="audit-command-actions">
          <button className="soft-btn" type="button" onClick={onReload} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
          <button className="primary-btn audit-export-btn" type="button" onClick={() => void onExport()} disabled={exportDisabled || loading || exporting}>
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </div>

      <div className="audit-kpi-strip">
        <div><span>Total Matching Logs</span><strong>{totalRecords}</strong></div>
        <div><span>This Page</span><strong>{pageRows.length}</strong></div>
        <div><span>Modules</span><strong>{moduleOptions.length}</strong></div>
        <div><span>Latest</span><strong>{allLogs[0] ? formatAuditTimestamp(allLogs[0].timestamp).split(",")[0] : "-"}</strong></div>
      </div>

      <div className="user-access-table advanced clean-table audit-standard-table">
        <div className="user-row head advanced clean-table-row audit-standard-row">
          <div className="user-cell">No</div>
          <div className="user-cell">Time</div>
          <div className="user-cell">User</div>
          <div className="user-cell">Module</div>
          <div className="user-cell">Activity</div>
          <div className="user-cell">Status</div>
        </div>

        {loading && <div className="settings-empty-state">Loading audit logs from EMA_AuditLogs...</div>}
        {!loading && pageRows.length === 0 && <div className="settings-empty-state">No audit log records found.</div>}

        {!loading && pageRows.map((row, index) => (
          <div className="user-row advanced clean-table-row audit-standard-row" key={String(row.id || `${row.timestamp}-${row.user}-${row.action}-${index}`)}>
            <div className="user-cell row-number"><span className="row-index-pill">{String(startIndex + index + 1).padStart(2, "0")}</span></div>
            <div className="user-cell audit-time-cell">
              <strong>{formatAuditTimestamp(row.timestamp)}</strong>
            </div>
            <div className="user-cell"><span className="muted-cell audit-user-chip">{row.user}</span></div>
            <div className="user-cell"><span className="role-soft-chip audit-module-chip">{row.module}</span></div>
            <div className="user-cell audit-action-cell">
              <strong>{row.action}</strong>
              {row.details && <small>{(() => { try { const parsed = JSON.parse(row.details); return Object.entries(parsed).map(([k, v]) => `${k}: ${v}`).join(" · "); } catch { return row.details; } })()}</small>}
            </div>
            <div className="user-cell"><span className={`user-pill ${getAuditSeverityClass(row.severity)}`}>{row.severity}</span></div>
          </div>
        ))}
      </div>

      <div className="uam-pagination global-style audit-pagination">
        <div className="uam-page-summary">Page {safePage} / {safeTotalPages}</div>
        <div className="uam-pagination-info">
          Showing <strong>{shownStart}-{shownEnd}</strong> of <strong>{totalRecords}</strong> matching records
        </div>
        <div className="uam-pagination-controls global-style">
          <button className="uam-page-icon" type="button" disabled={safePage <= 1 || loading} onClick={() => onPageChange(1)}>«</button>
          <button className="uam-page-icon" type="button" disabled={safePage <= 1 || loading} onClick={() => onPageChange(Math.max(1, safePage - 1))}>‹</button>
          <span className="uam-page-current">{safePage}</span>
          <button className="uam-page-icon" type="button" disabled={safePage >= safeTotalPages || loading} onClick={() => onPageChange(Math.min(safeTotalPages, safePage + 1))}>›</button>
          <button className="uam-page-icon" type="button" disabled={safePage >= safeTotalPages || loading} onClick={() => onPageChange(safeTotalPages)}>»</button>
        </div>
      </div>
    </div>
  );
}

function PricingContent({
  search,
  rows,
  categoryOptions,
  brandOptionsByCategory,
  modelOptionsByKey,
  loading,
  saving,
  savingRowId,
  error,
  onAdd,
  onChange,
  onSaveRow,
  onRequestDelete,
}: PricingContentProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const term = search.trim().toLowerCase();
  const visibleRows = rows.filter((row) => {
    const haystack = `${row.Category} ${row.Brand} ${row.Model} ${row.Price} ${row.IsExcluded ? "excluded" : "capex"}`.toLowerCase();
    return !term || haystack.includes(term);
  });

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedRows = visibleRows.slice(pageStartIndex, pageStartIndex + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, rows.length]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  return (
    <div className="pricing-editor">
      {error && <div className="settings-inline-alert">{error}</div>}

      <div className="pricing-top-insights">
        <article className="pricing-info-card blue">
          <span className="pricing-info-icon">BM</span>
          <div>
            <strong>Brand and Model Pricing</strong>
            <p>Set pricing by device category, brand and exact model. The system prioritises the most specific match when estimating replacement cost.</p>
          </div>
        </article>

        <article className="pricing-info-card green">
          <span className="pricing-info-icon">CX</span>
          <div>
            <strong>CAPEX Exposure Control</strong>
            <p>Exclude selected rows from CAPEX replacement exposure while keeping them available as asset reference data.</p>
          </div>
        </article>

        <article className="pricing-disclaimer-card">
          <strong>Planning disclaimer</strong>
          <p>Market price and replacement-cost values are estimates based on current pricing, asset age and lifecycle assumptions. Use them for planning guidance and confirm final procurement values with Finance or Procurement before approval.</p>
        </article>
      </div>

      <div className="pricing-table-card pricing-modern-table">
        <div className="pricing-row pricing-head-row">
          <div>Device Category</div>
          <div>Brand</div>
          <div>Model Optional</div>
          <div>Market Price (RM)</div>
          <div>Exclude from CAPEX</div>
          <div>Actions</div>
        </div>

        {loading && <div className="pricing-empty-row">Loading device pricing...</div>}

        {!loading && visibleRows.length === 0 && (
          <div className="pricing-empty-row">
            <strong>No pricing rules yet.</strong>
            <span>Add a custom pricing row, select category, brand and model, then save pricing.</span>
            <button className="primary-btn" type="button" onClick={onAdd}>+ Add Custom Pricing</button>
          </div>
        )}

        {!loading && paginatedRows.map((row) => {
          const brandOptions = brandOptionsByCategory[row.Category] || [];
          const modelOptions = modelOptionsByKey[pricingModelKey(row.Category, row.Brand)] || [];

          return (
            <div className="pricing-row pricing-data-row" key={row.id}>
              <label className="pricing-field-label">Device Category</label>
              <SettingSelect
                className="pricing-select"
                value={row.Category}
                placeholder="Select category"
                options={[
                  ...(!row.Category ? [{ value: "", label: "Select category" }] : []),
                  ...categoryOptions.map((category) => ({ value: category, label: category })),
                  ...(!categoryOptions.includes("Others") ? [{ value: "Others", label: "Others" }] : []),
                ]}
                onChange={(value) => onChange(row.id, { Category: value })}
                ariaLabel="Device category"
              />

              <label className="pricing-field-label">Brand</label>
              <SettingSelect
                className="pricing-select"
                value={row.Brand}
                placeholder="General / All Brands"
                disabled={!row.Category}
                options={[
                  { value: "", label: "General / All Brands" },
                  ...brandOptions.map((brand) => ({ value: brand, label: brand })),
                ]}
                onChange={(value) => onChange(row.id, { Brand: value })}
                ariaLabel="Device brand"
              />

              <label className="pricing-field-label">Model Optional</label>
              <SettingSelect
                className="pricing-select"
                value={row.Model}
                placeholder="General / All Models"
                disabled={!row.Category || !row.Brand}
                options={[
                  { value: "", label: "General / All Models" },
                  ...modelOptions.map((model) => ({ value: model, label: model })),
                ]}
                onChange={(value) => onChange(row.id, { Model: value })}
                ariaLabel="Device model"
              />

              <label className="pricing-field-label">Market Price</label>
              <div className="price-input-shell">
                <span>RM</span>
                <input
                  className="setting-input pricing-price-input"
                  min={0}
                  step="0.01"
                  type="number"
                  value={row.Price}
                  onChange={(event) => onChange(row.id, { Price: Number(event.target.value) || 0 })}
                />
              </div>

              <label className="pricing-field-label">Exclude CAPEX</label>
              <button
                className={`toggle pricing-toggle ${row.IsExcluded ? "on danger" : ""}`}
                type="button"
                aria-label="Toggle exclude from CAPEX"
                onClick={() => onChange(row.id, { IsExcluded: !row.IsExcluded })}
              />

              <label className="pricing-field-label">Actions</label>
              <div className="pricing-row-actions">
                <button
                  className="pricing-save-btn"
                  type="button"
                  onClick={() => onSaveRow(row.id)}
                  disabled={saving || savingRowId === row.id}
                >
                  {savingRowId === row.id ? "Saving..." : "Save"}
                </button>
                <button className="icon-delete-btn" type="button" title="Delete pricing row" onClick={() => onRequestDelete(row)} disabled={saving || savingRowId === row.id}>
                  <TrashSvg />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && visibleRows.length > 0 && (
        <div className="uam-pagination global-style pricing-pagination">
          <div className="uam-page-summary">Page {safeCurrentPage} of {totalPages}</div>
          <div className="uam-page-status">Showing {visibleRows.length === 0 ? 0 : pageStartIndex + 1}-{Math.min(pageStartIndex + pageSize, visibleRows.length)} of {visibleRows.length} pricing records</div>
          <div className="uam-pagination-controls global-style" aria-label="Device pricing pagination">
            <button className="uam-page-icon" type="button" onClick={() => setCurrentPage(1)} disabled={safeCurrentPage === 1} aria-label="First page">«</button>
            <button className="uam-page-icon" type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safeCurrentPage === 1} aria-label="Previous page">‹</button>
            <span className="uam-page-current">{safeCurrentPage}</span>
            <button className="uam-page-icon" type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safeCurrentPage === totalPages} aria-label="Next page">›</button>
            <button className="uam-page-icon" type="button" onClick={() => setCurrentPage(totalPages)} disabled={safeCurrentPage === totalPages} aria-label="Last page">»</button>
          </div>
        </div>
      )}


    </div>
  );
}

function ManagementPolicyContent({ values, profile, loading, saving, error, onChange, onReload, onReset, onSave }: ManagementPolicyContentProps) {
  const normalizedValues = normalizeManagementPolicyValues(values);
  const updatedAt = profile?.updatedAt ? new Date(profile.updatedAt).toLocaleString() : "Not saved yet";
  const groupedFields = MANAGEMENT_POLICY_GROUPS.map((group) => ({
    group,
    fields: MANAGEMENT_POLICY_FIELDS.filter((field) => field.group === group),
  }));

  return (
    <section className="management-policy-editor">
      <article className="policy-card management-policy-command">
        <div>
          <span className="section-tag">Policy profile</span>
          <h4>{profile?.profileName || "Default EMA Management Policy"}</h4>
          <p>
            These assumptions feed the Management Dashboard calculation engine. Change them here instead of editing hardcoded numbers in the backend.
          </p>
          <div className="management-policy-meta">
            <span>{profile?.scopeType || "GLOBAL"}</span>
            <span>{MANAGEMENT_POLICY_FIELDS.length} rule value(s)</span>
            <span>Updated: {updatedAt}</span>
          </div>
        </div>
        <div className="content-actions management-policy-actions">
          <button className="soft-btn" type="button" onClick={onReload} disabled={loading || saving}>{loading ? "Loading..." : "Reload"}</button>
          <button className="soft-btn" type="button" onClick={onReset} disabled={loading || saving}>Reset defaults</button>
          <button className="primary-btn" type="button" onClick={onSave} disabled={loading || saving}>{saving ? "Saving..." : "Save Policy"}</button>
        </div>
      </article>

      {error && <div className="settings-inline-alert">{error}</div>}

      <div className="management-policy-grid">
        {groupedFields.map(({ group, fields }) => (
          <article className="policy-card management-policy-group" key={group}>
            <div className="policy-top">
              <div>
                <h4>{group}</h4>
                <p>{group === "Cost & Saving Assumptions" ? "Money values used to estimate exposure and opportunity." : group === "Evidence Freshness Policy" ? "Freshness limits used to mark endpoint and inventory evidence as stale." : "Risk score weights and thresholds used by dashboard evidence rows."}</p>
              </div>
              <span className="role-soft-chip">{fields.length} rules</span>
            </div>

            <div className="management-policy-field-list">
              {fields.map((field) => {
                const inputValue = managementPolicyInputValue(normalizedValues, field);
                return (
                  <label className="management-policy-field" key={field.key}>
                    <span>
                      <strong>{field.label}</strong>
                      <small>{field.description}</small>
                    </span>
                    <div className="management-policy-input-wrap">
                      <input
                        className="setting-input"
                        type="number"
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        value={inputValue}
                        onChange={(event) => {
                          const parsed = Number(event.target.value);
                          const scaled = Number.isFinite(parsed) ? parsed / (field.displayScale || 1) : DEFAULT_MANAGEMENT_POLICY_VALUES[field.key] || 0;
                          onChange(field.key, scaled);
                        }}
                      />
                      <em>{field.unit}</em>
                    </div>
                    <b>{formatManagementPolicyValue(normalizedValues, field)}</b>
                  </label>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}


function AgingContent({
  rule,
  loading,
  saving,
  error,
  onChange,
  onReload,
  onSave,
  onReset,
}: AgingContentProps) {
  return (
    <div className="pc-aging-revamp">
      {loading && (
        <div className="settings-inline-alert aging-info-alert">
          Loading PC aging rule from AssetSettings...
        </div>
      )}
      {error && <div className="settings-inline-alert">{error}</div>}

      <section className="pc-aging-command-card">
        <div className="pc-aging-command-copy">
          <span className="section-tag">LIFECYCLE CONTROL</span>
          <h3>PC Aging Configuration</h3>
          <p>
            Configure endpoint lifecycle thresholds, replacement planning and calculation basis.
            These settings are saved as the master rule for future hardware aging and refresh reporting.
          </p>
        </div>

        <div className="pc-aging-command-actions">
          <button className="soft-btn" type="button" onClick={onReload} disabled={loading || saving}>
            Reload
          </button>
          <button className="soft-btn" type="button" onClick={onReset} disabled={saving}>
            Reset
          </button>
          <button className="primary-btn" type="button" onClick={onSave} disabled={saving || loading}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </section>

      <section className="pc-aging-overview-grid">
        <article className="pc-aging-overview-card pc-aging-status-card">
          <div className="pc-aging-card-head">
            <div>
              <span className="pc-aging-kicker">Rule Status</span>
              <h4>{rule.enabled ? "Enabled" : "Disabled"}</h4>
              <p>Turn lifecycle calculation on or off without deleting the saved configuration.</p>
            </div>

            <button
              className={`toggle aging-toggle ${rule.enabled ? "on" : ""}`}
              aria-label="Toggle PC aging rule"
              type="button"
              onClick={() => onChange({ enabled: !rule.enabled })}
            />
          </div>

          <div className="pc-aging-status-strip">
            <span>{rule.enabled ? "Active lifecycle rule" : "Lifecycle rule paused"}</span>
            <b>{formatAgeSourceLabel(rule.ageSource)}</b>
          </div>
        </article>

        <article className="pc-aging-overview-card">
          <span className="pc-aging-kicker">Review Threshold</span>
          <h4>{rule.monitorMaxYears} years</h4>
          <p>Devices at or above this age are marked for lifecycle review.</p>
        </article>

        <article className="pc-aging-overview-card">
          <span className="pc-aging-kicker">Critical Reference</span>
          <h4>{rule.agingMinYears} years</h4>
          <p>Devices at or above this age become replacement candidates.</p>
        </article>

        <article className="pc-aging-overview-card">
          <span className="pc-aging-kicker">Refresh Window</span>
          <h4>{rule.replacementWindowMonths} months</h4>
          <p>Planning window used for refresh forecast and CAPEX preparation.</p>
        </article>
      </section>

      <section className="pc-aging-main-grid">
        <article className="pc-aging-panel pc-aging-threshold-panel">
          <div className="pc-aging-panel-head">
            <div>
              <span className="section-tag">THRESHOLD BUILDER</span>
              <h4>Lifecycle Age Bands</h4>
              <p>Set the year thresholds used to classify every endpoint into standard, aging and critical groups.</p>
            </div>
          </div>

          <div className="pc-aging-threshold-stack">
            <AgingThresholdLine
              label="Standard Device"
              help="Healthy lifecycle window before review is required."
              value={rule.healthyMaxYears}
              display={`< ${rule.healthyMaxYears} years`}
              onChange={(value) => onChange({ healthyMaxYears: value })}
            />

            <AgingThresholdLine
              label="Aging Device"
              help="Device should be reviewed and considered for refresh planning."
              value={rule.monitorMaxYears}
              display={`≥ ${rule.monitorMaxYears} years`}
              onChange={(value) => onChange({ monitorMaxYears: value })}
            />

            <AgingThresholdLine
              label="Critical Aging"
              help="Device is a high-priority replacement candidate."
              value={rule.agingMinYears}
              display={`≥ ${rule.agingMinYears} years`}
              onChange={(value) => onChange({ agingMinYears: value })}
            />
          </div>
        </article>

        <aside className="pc-aging-panel pc-aging-decision-panel">
          <div className="pc-aging-panel-head">
            <div>
              <span className="section-tag">DECISION GUIDE</span>
              <h4>Lifecycle Actions</h4>
              <p>Operational action generated from the current threshold rule.</p>
            </div>
          </div>

          <div className="aging-action-list pc-aging-action-list">
            <AgingActionRow
              status="Standard"
              condition={`< ${rule.healthyMaxYears} years`}
              action="Monitor"
              tone="blue"
            />
            <AgingActionRow
              status="Aging"
              condition={`≥ ${rule.monitorMaxYears} years`}
              action="Review"
              tone="amber"
            />
            <AgingActionRow
              status="Critical"
              condition={`≥ ${rule.agingMinYears} years`}
              action="Replace"
              tone="red"
            />
          </div>
        </aside>
      </section>

      <section className="pc-aging-secondary-grid">
        <article className="pc-aging-panel">
          <div className="pc-aging-panel-head">
            <div>
              <span className="section-tag">CALCULATION BASIS</span>
              <h4>Aging Reference</h4>
              <p>Choose how the system determines device age when generating lifecycle results.</p>
            </div>
          </div>

          <div className="pc-aging-form-grid">
            <label className="form-field">
              Primary Date
              <SettingSelect
                value={rule.ageSource}
                options={AGE_SOURCE_OPTIONS}
                onChange={(value) => onChange({ ageSource: value })}
                ariaLabel="PC aging primary date source"
              />
            </label>

            <label className="form-field">
              Missing Date
              <SettingSelect
                value={rule.includeUnknownAge ? "include" : "exclude"}
                options={[
                  { value: "exclude", label: "Flag as data gap" },
                  { value: "include", label: "Include in aging report" },
                ]}
                onChange={(value) => onChange({ includeUnknownAge: value === "include" })}
                ariaLabel="PC aging missing date handling"
              />
            </label>

            <label className="form-field">
              Replacement Window
              <input
                className="setting-input"
                type="number"
                min="0"
                max="36"
                value={rule.replacementWindowMonths}
                onChange={(event) => onChange({ replacementWindowMonths: Number(event.target.value) })}
              />
            </label>
          </div>

          <div className="aging-basis-note pc-aging-basis-note">
            <strong>{formatAgeSourceLabel(rule.ageSource)}</strong>
            <span>is currently used as the main lifecycle reference date.</span>
          </div>
        </article>

        <article className="pc-aging-panel pc-aging-notes-panel">
          <div className="pc-aging-panel-head">
            <div>
              <span className="section-tag">ADMIN NOTE</span>
              <h4>Operational Note</h4>
              <p>Store an internal note with this lifecycle configuration.</p>
            </div>
          </div>

          <textarea
            className="aging-notes-input"
            value={rule.notes}
            onChange={(event) => onChange({ notes: event.target.value })}
            placeholder="Example: This lifecycle rule is used for annual endpoint refresh planning."
          />
        </article>
      </section>
    </div>
  );
}


function AgingThresholdLine({ label, help, value, display, onChange }: { label: string; help: string; value: number; display: string; onChange: (value: number) => void }) {
  return (
    <div className="threshold-line aging-threshold-line">
      <div className="threshold-label-block">
        <span>{label}</span>
        <small>{help}</small>
      </div>
      <input type="range" min="1" max="15" value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <div className="threshold-number-wrap">
        <input type="number" min="1" max="15" value={value} onChange={(event) => onChange(Number(event.target.value))} />
        <b>{display}</b>
      </div>
    </div>
  );
}

function AgingActionRow({ status, condition, action, tone }: { status: string; condition: string; action: string; tone: "blue" | "amber" | "red" }) {
  return (
    <div className={`aging-action-row aging-action-${tone}`}>
      <span>{status}</span>
      <small>{condition}</small>
      <b>{action}</b>
    </div>
  );
}

function RiskContent({ search }: { search: string }) {
  const rows = risks.filter((risk) => !search || risk.join(" ").toLowerCase().includes(search));

  return (
    <div className="risk-simple-layout">
      <div className="risk-simple-grid">
        {rows.map((risk) => (
          <article className="risk-simple-card" key={risk[0]} style={{ "--risk-color": risk[4] } as CSSProperties}>
            <div className="risk-simple-head">
              <span className="risk-color-dot" />
              <div>
                <h4>{risk[0]} Risk</h4>
                <p>{risk[1]}</p>
              </div>
              <span className="risk-level-pill">{risk[2]}</span>
            </div>

            <div className="risk-mini-meter">
              <i style={{ "--w": risk[3] } as CSSProperties} />
            </div>

            <div className="risk-simple-controls">
              <FormSelect label="Action" options={["Monitor", "Review", "Escalate", "Block"]} />
              <FormSelect label="Owner" options={["IT Ops", "Security", "Management"]} />
              <FormSelect label="SLA" options={["7 days", "3 days", "24 hours"]} />
            </div>
          </article>
        ))}
      </div>

      <article className="risk-rule-panel">
        <div className="risk-rule-head">
          <div>
            <h4>Risk Scoring Signals</h4>
            <p>Signals used to calculate endpoint risk score.</p>
          </div>
          <button className="soft-btn" type="button">Add Rule</button>
        </div>

        <div className="risk-rule-list">
          <SummaryRow label="Unsupported OS" value="+30" />
          <SummaryRow label="Stale Sync > 30 days" value="+20" />
          <SummaryRow label="Locked Device" value="+25" />
          <SummaryRow label="Duplicate IP" value="+15" />
          <SummaryRow label="Aging > 5 years" value="+15" />
        </div>
      </article>
    </div>
  );
}


function UserDeleteModal({ target, onClose, onConfirm }: { target: { user: UserAccess; index: number } | null; onClose: () => void; onConfirm: () => void }) {
  if (!target) return null;
  const user = target.user;
  const label = user.name || user.username || user.email || "this user";

  return createPortal(
    <div className="user-delete-backdrop open" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="user-delete-modal" role="dialog" aria-modal="true" aria-labelledby="userDeleteTitle">
        <div className="user-delete-icon">!</div>
        <div className="user-delete-copy">
          <span className="eyebrow">CONFIRM DELETE</span>
          <h3 id="userDeleteTitle">Delete user access?</h3>
          <p>Are you sure you want to delete <b>{label}</b>? This will permanently delete this user from EMA_Users.</p>
        </div>
        <div className="user-delete-actions">
          <button className="soft-btn" type="button" onClick={onClose}>Cancel</button>
          <button className="danger-btn" type="button" onClick={onConfirm}>Delete User</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function PricingDeleteModal({ row, loading, onClose, onConfirm }: { row: PricingRow | null; loading: boolean; onClose: () => void; onConfirm: () => void }) {
  if (!row) return null;

  const label = [row.Category, row.Brand || "All Brands", row.Model || "All Models"].filter(Boolean).join(" • ");

  return (
    <div className="pricing-confirm-backdrop open" onClick={(event) => { if (event.target === event.currentTarget && !loading) onClose(); }}>
      <div className="pricing-confirm-modal">
        <div className="pricing-confirm-icon">!</div>
        <div>
          <span className="eyebrow">DELETE PRICING RULE</span>
          <h3>Confirm delete?</h3>
          <p>This will remove the pricing rule for <b>{label}</b>. This action cannot be reversed after confirmation.</p>
        </div>
        <div className="pricing-confirm-actions">
          <button className="soft-btn" type="button" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="danger-btn" type="button" onClick={onConfirm} disabled={loading}>{loading ? "Deleting..." : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

function IncidentConfigDeleteModal({ target, loading, onClose, onConfirm }: { target: IncidentConfigDeleteTarget | null; loading: boolean; onClose: () => void; onConfirm: () => void }) {
  if (!target) return null;

  const label = target.kind === "category"
    ? target.category.name
    : target.kind === "subcategory"
      ? target.subcategory.name
      : target.detail.name;
  const title = target.kind === "category"
    ? "Delete category?"
    : target.kind === "subcategory"
      ? "Delete subcategory?"
      : "Delete incident detail?";
  const message = target.kind === "category"
    ? "This will permanently remove the category only if it has never been used in Service Desk tickets. If it is already used, the system will block deletion and you can deactivate it instead."
    : target.kind === "subcategory"
      ? "This will permanently remove the subcategory only if it has never been used in Service Desk tickets. If it is already used, the system will block deletion and you can deactivate it instead."
      : "This will permanently remove the incident detail only if it has never been used in Service Desk tickets. If it is already used, the system will block deletion and you can deactivate it instead.";
  const buttonLabel = target.kind === "category"
    ? "Delete Category"
    : target.kind === "subcategory"
      ? "Delete Subcategory"
      : "Delete Detail";

  return (
    <div className="user-delete-backdrop open" onClick={(event) => { if (event.target === event.currentTarget && !loading) onClose(); }}>
      <div className="user-delete-modal" role="dialog" aria-modal="true" aria-labelledby="incidentConfigDeleteTitle">
        <div className="user-delete-icon">!</div>
        <div className="user-delete-copy">
          <h3 id="incidentConfigDeleteTitle">{title}</h3>
          <p>Are you sure you want to delete <b>{label}</b>? {message}</p>
        </div>
        <div className="user-delete-actions">
          <button className="soft-btn" type="button" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="danger-btn" type="button" onClick={onConfirm} disabled={loading}>{loading ? "Deleting..." : buttonLabel}</button>
        </div>
      </div>
    </div>
  );
}

function ResourceDeleteModal({ target, loading, onClose, onConfirm }: { target: ResourceDeleteTarget | null; loading: boolean; onClose: () => void; onConfirm: () => void }) {
  if (!target) return null;

  return (
    <div className="user-delete-backdrop open" onClick={(event) => { if (event.target === event.currentTarget && !loading) onClose(); }}>
      <div className="user-delete-modal" role="dialog" aria-modal="true" aria-labelledby="resourceDeleteTitle">
        <div className="user-delete-icon">!</div>
        <div className="user-delete-copy">
          <h3 id="resourceDeleteTitle">Remove leave schedule?</h3>
          <p>Are you sure you want to remove the leave schedule for <b>{target.engineerName}</b>? Service Desk assignment will stop showing this leave warning after removal.</p>
        </div>
        <div className="user-delete-actions">
          <button className="soft-btn" type="button" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="danger-btn" type="button" onClick={onConfirm} disabled={loading}>{loading ? "Removing..." : "Remove Leave"}</button>
        </div>
      </div>
    </div>
  );
}




function SettingsToast({ toast, onClose }: { toast: SettingsToastState; onClose: () => void }) {
  if (!toast) return null;

  const tone = toast.tone || "info";
  const icon = tone === "success" ? "OK" : tone === "info" ? "i" : "!";

  const node = (
    <div className={"ema-notice-card is-" + tone} role="status" aria-live="polite">
      <div className="ema-notice-icon" aria-hidden="true">{icon}</div>
      <div className="ema-notice-body">
        <strong className="ema-notice-title">{toast.title}</strong>
        <span className="ema-notice-message">{toast.message}</span>
      </div>
      <button
        type="button"
        className="ema-notice-close"
        onClick={onClose}
        aria-label="Close notification"
      >
        x
      </button>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(node, document.body) : node;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="summary-row"><span>{label}</span><b>{value}</b></div>;
}

function FormSelect({ label, options }: { label: string; options: string[] }) {
  const [value, setValue] = useState(options[0] || "");
  return <label className="form-field">{label}<SettingSelect value={value} options={options} onChange={setValue} ariaLabel={label} /></label>;
}


function UserModal({ open, mode, title, form, setForm, onClose, onSave, roleOptions }: { open: boolean; mode: string; title: string; form: UserAccess; setForm: (form: UserAccess) => void; onClose: () => void; onSave: () => void; roleOptions: string[] }) {
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [roleSearchTerm, setRoleSearchTerm] = useState("");

  useEffect(() => {
    if (!open) {
      setRolePickerOpen(false);
      setRoleSearchTerm("");
    }
  }, [open]);

  if (!open) return null;

  const selectedRoles = normalizeUserRoles(form.roles || form.role || form.roleName);
  const unassignedRoles = roleOptions.filter((role) => !selectedRoles.includes(role));
  const filteredRoleOptions = unassignedRoles.filter((role) =>
    role.toLowerCase().includes(roleSearchTerm.trim().toLowerCase())
  );
  const isCreateMode = mode.toLowerCase().includes("add");

  const updateSelectedRoles = (nextRoles: string[]) => {
    const cleanRoles = Array.from(new Set(nextRoles.filter(Boolean)));
    const joinedRoles = joinUserRoles(cleanRoles);
    setForm({ ...form, roles: cleanRoles, role: joinedRoles, roleName: joinedRoles });
  };

  const addSelectedRole = (role: string) => {
    updateSelectedRoles([...selectedRoles, role]);
    setRoleSearchTerm("");
    setRolePickerOpen(false);
  };

  const removeSelectedRole = (role: string) => {
    updateSelectedRoles(selectedRoles.filter((item) => item !== role));
  };

  const modalNode = (
    <div className={`user-modal-backdrop ${open ? "open" : ""}`} id="userModalBackdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="user-modal advanced">
        <div className="user-modal-head">
          <div>
            <span className="eyebrow" id="userModalMode">{mode}</span>
            <h3 id="userModalTitle">{title}</h3>
            <p>Configure identity profile and assign one or more RBAC roles from EMA_Roles.</p>
          </div>
          <button className="modal-close" id="closeUserModal" type="button" onClick={onClose}>×</button>
        </div>

        <div className="user-modal-body advanced">
          <div className="modal-section-title">Profile</div>
          <label className="form-field">Full Name<input className="setting-input" id="userFullName" placeholder="Example: Ahmad Fauzi" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label className="form-field">Username<input className="setting-input" id="userUsername" placeholder="Example: ahmad.fauzi" value={form.username || ""} onChange={(event) => setForm({ ...form, username: event.target.value })} /></label>
          <label className="form-field">Email<input className="setting-input" id="userEmail" placeholder="user@company.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label className="form-field">Phone No<input className="setting-input" id="userPhoneNo" placeholder="Optional" value={form.phoneNo || ""} onChange={(event) => setForm({ ...form, phoneNo: event.target.value })} /></label>

          <div className="modal-section-title">Access</div>
          <div className="form-field wide">
            <div className="role-assignment-head">
              <span className="form-field-label">Assigned Roles</span>
              <button
                className="role-picker-trigger"
                type="button"
                onClick={() => setRolePickerOpen((current) => !current)}
                disabled={roleOptions.length === 0}
              >
                + Assign Role
              </button>
            </div>

            <div className="selected-role-box">
              {selectedRoles.length === 0 && (
                <div className="selected-role-empty">No role assigned yet</div>
              )}

              {selectedRoles.map((role) => (
                <span className="selected-role-chip" key={role}>
                  {role}
                  <button type="button" onClick={() => removeSelectedRole(role)} aria-label={`Remove ${role}`}>×</button>
                </span>
              ))}
            </div>

            {rolePickerOpen && (
              <div className="role-picker-panel">
                <div className="role-picker-search-wrap">
                  <SearchSvg />
                  <input
                    className="role-picker-search"
                    value={roleSearchTerm}
                    onChange={(event) => setRoleSearchTerm(event.target.value)}
                    placeholder="Search role by name..."
                    autoFocus
                  />
                </div>

                <div className="role-picker-list">
                  {roleOptions.length === 0 && (
                    <div className="role-picker-empty">No active roles available. Create a role in Role Based Control first.</div>
                  )}

                  {roleOptions.length > 0 && filteredRoleOptions.length === 0 && (
                    <div className="role-picker-empty">No matching unassigned roles.</div>
                  )}

                  {filteredRoleOptions.map((role) => (
                    <button className="role-picker-option" type="button" key={role} onClick={() => addSelectedRole(role)}>
                      <span>{role}</span>
                      <b>Assign</b>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <small className="form-helper-text">Assign one or more roles. Module access will follow the combined RBAC permissions.</small>
          </div>
          <label className="form-field">Department<input className="setting-input" id="userDepartment" placeholder="Example: IT Operation" value={form.department || ""} onChange={(event) => setForm({ ...form, department: event.target.value })} /></label>
          <label className="form-field">Position<input className="setting-input" id="userPosition" placeholder="Example: Support Engineer" value={form.position || ""} onChange={(event) => setForm({ ...form, position: event.target.value })} /></label>
          <label className="form-field">Status
            <SettingSelect
              value={form.status}
              options={["Active", "Review", "Locked", "Inactive"]}
              onChange={(value) => setForm({ ...form, status: value as RoleStatus, accountLocked: value === "Locked" })}
              ariaLabel="User status"
            />
          </label>

          <div className="modal-section-title">Password</div>
          <label className="form-field">{isCreateMode ? "Initial Password" : "New Password"}<input className="setting-input" type="password" id="userPassword" placeholder={isCreateMode ? "Create login password" : "Leave blank to keep current password"} value={form.password || ""} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
          <label className="form-field">Confirm Password<input className="setting-input" type="password" id="userConfirmPassword" placeholder="Re-enter password" value={form.confirmPassword || ""} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} /></label>
          <small className="form-helper-text wide password-helper-text">{isCreateMode ? "This password is saved to EMA_Users and can be used to test login immediately." : "Fill this only when you want to reset the user password."}</small>

          <div className="modal-section-title">Security</div>
          <label className="form-field inline-check"><input type="checkbox" checked={Boolean(form.requireMFA || form.mfa)} onChange={(event) => setForm({ ...form, requireMFA: event.target.checked, mfa: event.target.checked })} /><span>Require MFA</span></label>
          <label className="form-field inline-check"><input type="checkbox" checked={Boolean(form.accountLocked)} onChange={(event) => setForm({ ...form, accountLocked: event.target.checked, status: event.target.checked ? "Locked" : form.status === "Locked" ? "Active" : form.status })} /><span>Account Locked</span></label>
          <label className="form-field wide">Lock Reason<input className="setting-input" id="userLockReason" placeholder="Optional reason shown in audit" value={form.lockReason || ""} onChange={(event) => setForm({ ...form, lockReason: event.target.value })} /></label>
          <label className="form-field">Access Start<input className="setting-input" type="date" id="userAccessStart" value={toDateInputValue(form.accessStartDate)} onChange={(event) => setForm({ ...form, accessStartDate: event.target.value })} /></label>
          <label className="form-field">Access End<input className="setting-input" type="date" id="userAccessEnd" value={toDateInputValue(form.accessEndDate)} onChange={(event) => setForm({ ...form, accessEndDate: event.target.value })} /></label>
          <label className="form-field wide">Remarks<textarea className="setting-textarea" id="userRemarks" placeholder="Optional access notes" value={form.remarks || ""} onChange={(event) => setForm({ ...form, remarks: event.target.value })} /></label>
        </div>

        <div className="user-modal-foot">
          <button className="soft-btn" id="cancelUserModal" type="button" onClick={onClose}>Cancel</button>
          <button className="primary-btn" id="saveUserAccess" type="button" onClick={onSave}>Save User</button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalNode, document.body) : modalNode;
}

function AccessRoleModal({ open, mode, form, setForm, onClose, onSave }: { open: boolean; mode: string; form: AccessRole; setForm: (form: AccessRole) => void; onClose: () => void; onSave: () => void }) {
  if (!open) return null;

  const modalNode = (
    <div className="role-modal-backdrop open" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="role-modal access-role-modal simple-role-modal">
        <div className="role-modal-head">
          <div>
            <span className="eyebrow">{mode}</span>
            <h3>{mode === "ADD ROLE" ? "Add New Role" : "Update Role"}</h3>
            <p>Create or update a role name, status and approval requirement for EMA_Roles.</p>
          </div>
          <button className="modal-close" type="button" onClick={onClose}>×</button>
        </div>

        <div className="role-modal-body access-role-modal-body simple-role-modal-body">
          <label className="form-field">Role Name<input className="setting-input" placeholder="Example: L1 Support" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label className="form-field">Status
            <SettingSelect
              value={form.status === "Inactive" ? "Inactive" : "Active"}
              options={["Active", "Inactive"]}
              onChange={(value) => setForm({ ...form, status: value as RoleStatus })}
              ariaLabel="Role status"
            />
          </label>
          <label className="form-field wide">Description<input className="setting-input" placeholder="Describe this role" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label className="form-field inline-check wide"><input type="checkbox" checked={Boolean(form.approvalRequired)} onChange={(event) => setForm({ ...form, approvalRequired: event.target.checked })} /><span>Require approval for sensitive actions</span></label>
        </div>

        <div className="role-modal-foot">
          <button className="soft-btn" type="button" onClick={onClose}>Cancel</button>
          <button className="primary-btn" type="button" onClick={onSave}>Save Role</button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalNode, document.body) : modalNode;
}

function ConfirmDeleteRoleModal({ role, onClose, onConfirm }: { role: AccessRole | null; onClose: () => void; onConfirm: () => void }) {
  if (!role) return null;

  const modalNode = (
    <div className="user-delete-backdrop open" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="user-delete-modal" role="dialog" aria-modal="true" aria-labelledby="roleDeleteTitle">
        <div className="user-delete-icon">!</div>
        <div className="user-delete-copy">
          <span className="eyebrow">CONFIRM DELETE</span>
          <h3 id="roleDeleteTitle">Delete role access?</h3>
          <p>Are you sure you want to delete <b>{role.name}</b>? This will permanently delete this role from EMA_Roles.</p>
        </div>
        <div className="user-delete-actions">
          <button className="soft-btn" type="button" onClick={onClose}>Cancel</button>
          <button className="danger-btn" type="button" onClick={onConfirm}>Delete Role</button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalNode, document.body) : modalNode;
}

function AccessPolicyModal({ open, mode, title, form, setForm, onClose, onSave }: { open: boolean; mode: string; title: string; form: AccessPolicy; setForm: (form: AccessPolicy) => void; onClose: () => void; onSave: () => void }) {
  if (!open) return null;

  const modalNode = (
    <div className="role-modal-backdrop open" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="role-modal access-role-modal simple-role-modal">
        <div className="role-modal-head">
          <div>
            <span className="eyebrow">{mode}</span>
            <h3>{title}</h3>
            <p>Configure login, session and security access control behaviour.</p>
          </div>
          <button className="modal-close" type="button" onClick={onClose}>×</button>
        </div>

        <div className="role-modal-body access-role-modal-body simple-role-modal-body">
          <label className="form-field">Control Name<input className="setting-input" placeholder="Example: Multi-Factor Authentication" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label className="form-field">Status
            <SettingSelect
              value={form.status}
              options={["Active", "Inactive"]}
              onChange={(value) => setForm({ ...form, status: value === "Inactive" ? "Inactive" : "Active" })}
              ariaLabel="Access control status"
            />
          </label>
          <label className="form-field wide">Description<input className="setting-input" placeholder="Describe this control" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label className="form-field">Scope
            <SettingSelect
              value={form.scope}
              options={["All Users", "Admin Only", "Selected Role", "Service Desk"]}
              onChange={(value) => setForm({ ...form, scope: value })}
              ariaLabel="Access control scope"
            />
          </label>
          <label className="form-field">Enforcement
            <SettingSelect
              value={form.enforcement}
              options={["Mandatory", "Optional", "Approval Based", "Disabled"]}
              onChange={(value) => setForm({ ...form, enforcement: value })}
              ariaLabel="Access control enforcement"
            />
          </label>
          <label className="form-field">Review Cycle
            <SettingSelect
              value={form.reviewCycle}
              options={["Monthly", "Quarterly", "Yearly", "Ad Hoc"]}
              onChange={(value) => setForm({ ...form, reviewCycle: value })}
              ariaLabel="Access control review cycle"
            />
          </label>
        </div>

        <div className="role-modal-foot">
          <button className="soft-btn" type="button" onClick={onClose}>Cancel</button>
          <button className="primary-btn" type="button" onClick={onSave}>Save Control</button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalNode, document.body) : modalNode;
}

function AccessPolicyDeleteConfirmModal({ target, onCancel, onConfirm }: { target: { policy: AccessPolicy; index: number } | null; onCancel: () => void; onConfirm: () => void }) {
  if (!target) return null;

  const modalNode = (
    <div className="user-delete-backdrop open" role="dialog" aria-modal="true" onClick={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <div className="user-delete-modal">
        <div className="user-delete-icon">!</div>
        <div className="user-delete-copy">
          <span className="eyebrow">CONFIRM DELETE</span>
          <h3>Delete access control?</h3>
          <p>Are you sure you want to delete <b>{target.policy.name}</b>? This will remove the control from EMA_AccessControls.</p>
        </div>
        <div className="user-delete-actions">
          <button className="soft-btn" type="button" onClick={onCancel}>Cancel</button>
          <button className="danger-btn" type="button" onClick={onConfirm}>Delete Control</button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalNode, document.body) : modalNode;
}

function RoleModal({ open, mode, form, setForm, onClose, onSave, onDelete }: { open: boolean; mode: ModalMode; form: ModuleRole; setForm: (form: ModuleRole) => void; onClose: () => void; onSave: () => void; onDelete: () => void }) {
  const isDelete = mode === "delete";
  const title = mode === "add" ? "Add Module Role" : mode === "edit" ? "Update Module Role" : "Delete Module Role";
  const modeText = mode === "add" ? "ADD NEW ROLE" : mode === "edit" ? "UPDATE ROLE" : "DELETE ROLE";
  return <div className={`role-modal-backdrop ${open ? "open" : ""}`} id="roleModalBackdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="role-modal"><div className="role-modal-head"><div><span className="eyebrow" id="roleModalMode">{modeText}</span><h3 id="roleModalTitle">{title}</h3><p>Create, update or delete roles used in the Module Control matrix.</p></div><button className="modal-close" id="closeRoleModal" type="button" onClick={onClose}>×</button></div><div className="role-modal-body"><label className="form-field">Role Name<input className="setting-input" id="moduleRoleName" placeholder="Example: Security Reviewer" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label className="form-field">Role Type<SettingSelect value={form.type} options={["Administrator", "Management", "Operation", "Support", "Audit / Viewer", "Custom"]} onChange={(value) => setForm({ ...form, type: value })} ariaLabel="Module role type" /></label><label className="form-field wide">Description<input className="setting-input" id="moduleRoleDesc" placeholder="Describe access purpose for this role" value={form.desc} onChange={(event) => setForm({ ...form, desc: event.target.value })} /></label><label className="form-field">Default Access<SettingSelect value={form.defaultAccess} options={["Read Only", "Operational Access", "Management Access", "Full Access", "No Access"]} onChange={(value) => setForm({ ...form, defaultAccess: value })} ariaLabel="Default access" /></label><label className="form-field">Approval Required<SettingSelect value={form.approval} options={["Yes", "No"]} onChange={(value) => setForm({ ...form, approval: value })} ariaLabel="Approval required" /></label></div><p className={`role-delete-warning ${isDelete ? "show" : ""}`} id="roleDeleteWarning">Delete role will remove this role column from the module access matrix. Existing users assigned to this role should be reviewed before deletion.</p><div className="role-modal-foot"><button className="soft-btn" id="cancelRoleModal" type="button" onClick={onClose}>Cancel</button>{isDelete && <button className="danger-btn" id="deleteRoleConfirm" type="button" onClick={onDelete}>Delete Role</button>}{!isDelete && <button className="primary-btn" id="saveModuleRole" type="button" onClick={onSave}>Save Role</button>}</div></div></div>;
}

function Icon({ name }: { name: IconName }) {
  if (name === "role") return <svg viewBox="0 0 24 24" fill="none"><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (name === "user") return <svg viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "matrix") return <svg viewBox="0 0 24 24" fill="none"><path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" stroke="currentColor" strokeWidth="1.9" /></svg>;
  if (name === "access") return <svg viewBox="0 0 24 24" fill="none"><path d="M7 10V8a5 5 0 0 1 10 0v2M6 10h12v11H6V10Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" /></svg>;
  if (name === "incident") return <svg viewBox="0 0 24 24" fill="none"><path d="M3 18v-6a9 9 0 0 1 18 0v6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /><path d="M21 18.5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v3ZM3 18.5a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v3Z" stroke="currentColor" strokeWidth="1.9" /></svg>;
  if (name === "notification") return <svg viewBox="0 0 24 24" fill="none"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "software") return <svg viewBox="0 0 24 24" fill="none"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" /><path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></svg>;
  if (name === "audit") return <svg viewBox="0 0 24 24" fill="none"><path d="M7 3h7l4 4v14H7V3Zm7 0v5h5M9 13h6M9 17h6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "price") return <svg viewBox="0 0 24 24" fill="none"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (name === "aging") return <svg viewBox="0 0 24 24" fill="none"><path d="M12 8v5l3 2M21 12a9 9 0 1 1-3-6.7M21 4v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "policy") return <svg viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "resource") return <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" /><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>;
  return <svg viewBox="0 0 24 24" fill="none"><path d="M12 3 21 20H3L12 3Zm0 6v5m0 3h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function PencilSvg() {
  return <svg fill="none" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4.2L18.7 9.5a2.1 2.1 0 0 0 0-3l-1.2-1.2a2.1 2.1 0 0 0-3 0L4 15.8V20Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /><path d="m13.6 6.4 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /></svg>;
}

function TrashSvg() {
  return <svg fill="none" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
}

function SearchSvg() {
  return <svg fill="none" viewBox="0 0 24 24"><path d="m21 21-4.3-4.3M10.8 18.2a7.4 7.4 0 1 1 0-14.8 7.4 7.4 0 0 1 0 14.8Z" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /></svg>;
}

function ChevronDownSvg() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 7.5l4.5 4.5 4.5-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
