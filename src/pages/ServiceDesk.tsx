import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowRightLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Eye,
  Filter,
  Loader2,
  Monitor,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  Ticket,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { incidents as incidentsService, incidentCategories as incidentCategoriesService } from "../services/IncidentService";
import { users as usersService, roles as rolesService } from "../services/UserService";
import { assets as assetsService } from "../services/AssetService";
import { knowledgeBase as knowledgeBaseService } from "../services/KnowledgeBaseService";
import { EmaToastViewport, type EmaToastItem, type EmaToastTone } from "../components/ema/EmaToast";

type AnyRow = Record<string, any>;
type QueueKey = "all" | "my" | "sla-risk" | "unassigned" | "awaiting" | "in-progress" | "pending-user" | "pending-vendor" | "on-site" | "resolved" | "knowledge";
type ToastState = { id?: string | number; type: EmaToastTone; message: string } | null;
type SelectOption = { value: string; label: string; disabled?: boolean };
type SortConfig = { key: string; direction: "asc" | "desc" };

const STATUS_OPTIONS = ["Awaiting", "In Progress", "Pending Approval", "Pending User", "Pending Vendor", "On Site", "Resolved", "Rejected"];
const PRIORITY_OPTIONS = ["Critical", "High", "Medium", "Low"];
const SUPPORT_LEVELS = ["L1 Support", "L2 Support", "L3 Support"];
const DEVICE_TYPES = ["Desktop", "Laptop", "Tablet", "Mobile", "Server", "Network Device", "Printer", "Other"];
const PAGE_SIZE = 10;

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function valueOf(row: AnyRow | null | undefined, keys: string[], fallback = "") {
  if (!row) return fallback;
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value).trim();
  }
  return fallback;
}

function unique(values: string[]) {
  const seen = new Set<string>();
  return values
    .map((value) => String(value || "").trim())
    .filter((value) => {
      const key = value.toLowerCase();
      if (!value || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeText(value: any) {
  return String(value || "").trim().toLowerCase();
}

function getIncidentId(row: AnyRow | null | undefined) {
  return valueOf(row, ["id", "ID", "IncidentID", "incidentID", "incidentId", "ticketId", "TicketID"]);
}

function getUserName(row: AnyRow | null | undefined) {
  return valueOf(row, ["name", "Name", "fullName", "FullName", "displayName", "DisplayName", "username", "Username", "userName", "UserName", "email", "Email"]);
}

function getUserId(row: AnyRow | null | undefined) {
  return valueOf(row, ["id", "ID", "userID", "UserID", "userId", "UserId", "email", "Email"], getUserName(row));
}

function normalizeSupportLevelName(value: any) {
  const text = String(value || "").trim();
  const match = text.match(/\bl\s*([123])\s*support\b/i) || text.match(/\bl([123])support\b/i) || text.match(/support\s*level\s*([123])/i) || text.match(/level\s*([123])/i);
  if (match?.[1]) return `L${match[1]} Support`;
  return text;
}

function getRoleDisplayName(role: any) {
  return String(role?.RoleName || role?.roleName || role?.name || role?.Name || role?.role || role?.Role || role?.label || role?.Label || role || "").trim();
}

function getUserRoleNames(user: AnyRow | null | undefined) {
  if (!user) return [];
  const roleSources: any[] = [];
  if (Array.isArray(user.roles)) roleSources.push(...user.roles);
  if (Array.isArray(user.Roles)) roleSources.push(...user.Roles);
  if (Array.isArray(user.userRoles)) roleSources.push(...user.userRoles);
  roleSources.push(user.roleName, user.RoleName, user.role, user.Role, user.role?.name, user.role?.RoleName, user.supportLevel, user.SupportLevel, user.designation, user.Designation, user.department, user.Department);
  return roleSources
    .flatMap((role) => String(getRoleDisplayName(role) || "").split(/[,|;]/))
    .map((role) => normalizeSupportLevelName(role))
    .filter(Boolean);
}

function isSupportRoleName(roleName: any) {
  const text = normalizeText(roleName);
  return /\bl\s*[123]\s*support\b/i.test(text) || /\bl[123]support\b/i.test(text) || text.includes("support");
}

function userMatchesSupportLevel(user: AnyRow, supportLevel: string) {
  const selected = normalizeText(normalizeSupportLevelName(supportLevel));
  if (!selected) return false;
  return getUserRoleNames(user).some((role) => normalizeText(normalizeSupportLevelName(role)) === selected);
}

function getCategoryName(row: AnyRow | null | undefined) {
  return valueOf(row, ["name", "Name", "label", "Label", "title", "Title", "categoryTitle", "CategoryTitle", "categoryName", "CategoryName", "subcategoryName", "SubCategoryName", "subCategoryName", "detailName", "DetailName"]);
}

function getCategoryId(row: AnyRow | null | undefined) {
  return valueOf(row, ["id", "ID", "categoryID", "CategoryID", "incidentCategoryID", "IncidentCategoryID", "subcategoryID", "SubCategoryID", "detailID", "DetailID", "value", "Value"], getCategoryName(row));
}

function getCategoryType(row: AnyRow | null | undefined) {
  return normalizeText(valueOf(row, ["type", "Type", "level", "Level", "kind", "Kind", "categoryType", "CategoryType"]));
}

function getParentCategoryKey(row: AnyRow | null | undefined) {
  return valueOf(row, ["parentId", "ParentID", "parentID", "ParentId", "parentCategoryId", "ParentCategoryID", "parentCategory", "ParentCategory", "parentName", "ParentName", "categoryParent", "CategoryParent"]);
}

function getArray(row: AnyRow | null | undefined, keys: string[]) {
  if (!row) return [];
  for (const key of keys) {
    if (Array.isArray(row[key])) return row[key];
  }
  return [];
}

function buildCategoryCatalog(rows: AnyRow[], incidents: AnyRow[]) {
  const categoryNames: string[] = [];
  const subByCategory = new Map<string, string[]>();
  const detailsByCategorySub = new Map<string, string[]>();
  const idNameMap = new Map<string, string>();

  const keyOf = (value: any) => normalizeText(value);
  const addCategory = (category: string) => {
    const text = String(category || "").trim();
    if (!text) return;
    categoryNames.push(text);
    if (!subByCategory.has(keyOf(text))) subByCategory.set(keyOf(text), []);
  };
  const addSubcategory = (category: string, subcategory: string) => {
    const cat = String(category || "").trim();
    const sub = String(subcategory || "").trim();
    if (!cat || !sub) return;
    addCategory(cat);
    const key = keyOf(cat);
    subByCategory.set(key, [...(subByCategory.get(key) || []), sub]);
  };
  const addDetail = (category: string, subcategory: string, detail: string) => {
    const cat = String(category || "").trim();
    const sub = String(subcategory || "").trim();
    const det = String(detail || "").trim();
    if (!cat || !det) return;
    addCategory(cat);
    if (sub) addSubcategory(cat, sub);
    const key = `${keyOf(cat)}::${keyOf(sub || "__direct__")}`;
    detailsByCategorySub.set(key, [...(detailsByCategorySub.get(key) || []), det]);
  };

  rows.forEach((row) => {
    const name = getCategoryName(row);
    const id = getCategoryId(row);
    if (id && name) idNameMap.set(keyOf(id), name);
    if (name) idNameMap.set(keyOf(name), name);
  });

  rows.forEach((row) => {
    const rowName = getCategoryName(row);
    const rowId = getCategoryId(row);
    const type = getCategoryType(row);
    const parent = getParentCategoryKey(row);
    const categoryValue = valueOf(row, ["category", "Category", "categoryName", "CategoryName", "mainCategory", "MainCategory"]);
    const subValue = valueOf(row, ["subcategory", "Subcategory", "subCategory", "SubCategory", "subCategoryName", "SubCategoryName", "subcategoryName", "SubcategoryName"]);
    const detailValue = valueOf(row, ["detail", "Detail", "incidentDetail", "IncidentDetail", "detailName", "DetailName"]);

    if (categoryValue) addCategory(categoryValue);
    if (categoryValue && subValue) addSubcategory(categoryValue, subValue);
    if (categoryValue && detailValue) addDetail(categoryValue, subValue, detailValue);

    const isRootCategory = rowName && !subValue && !detailValue && (!parent || (type.includes("category") && !type.includes("sub") && !type.includes("detail")));
    const rootName = categoryValue || (isRootCategory ? rowName : "");
    if (rootName) {
      addCategory(rootName);
      const childRows = getArray(row, ["subcategories", "Subcategories", "SubCategories", "subCategories", "children", "Children", "items", "Items"]);
      childRows.forEach((child: AnyRow) => {
        const childName = getCategoryName(child) || valueOf(child, ["subcategory", "Subcategory", "subCategory", "SubCategory"]);
        if (!childName) return;
        addSubcategory(rootName, childName);
        getArray(child, ["details", "Details", "incidentDetails", "IncidentDetails", "children", "Children", "items", "Items"]).forEach((detailRow: AnyRow) => {
          addDetail(rootName, childName, getCategoryName(detailRow) || valueOf(detailRow, ["detail", "Detail", "incidentDetail", "IncidentDetail"]));
        });
      });
      getArray(row, ["details", "Details", "incidentDetails", "IncidentDetails"]).forEach((detailRow: AnyRow) => {
        addDetail(rootName, "", getCategoryName(detailRow) || valueOf(detailRow, ["detail", "Detail", "incidentDetail", "IncidentDetail"]));
      });
    }

    if (parent && rowName) {
      const parentName = idNameMap.get(keyOf(parent)) || parent;
      const parentIsCategory = categoryNames.some((cat) => keyOf(cat) === keyOf(parentName));
      if (parentIsCategory && !type.includes("detail")) addSubcategory(parentName, rowName);
      subByCategory.forEach((subs, catKey) => {
        const matchedSub = subs.find((sub) => keyOf(sub) === keyOf(parentName));
        if (matchedSub) {
          const category = categoryNames.find((cat) => keyOf(cat) === catKey) || "";
          addDetail(category, matchedSub, rowName);
        }
      });
    }

    if (rowId && rowName) idNameMap.set(keyOf(rowId), rowName);
  });

  incidents.forEach((row) => {
    const category = valueOf(row, ["category", "Category"]);
    const subcategory = valueOf(row, ["subcategory", "Subcategory", "subCategory", "SubCategory"]);
    const detail = valueOf(row, ["incidentDetail", "IncidentDetail", "detail", "Detail"]);
    if (category) addCategory(category);
    if (category && subcategory) addSubcategory(category, subcategory);
    if (category && detail) addDetail(category, subcategory, detail);
  });

  const getSubcategories = (category: string) => unique(subByCategory.get(keyOf(category)) || []);
  const getDetails = (category: string, subcategory: string) => {
    const directKey = `${keyOf(category)}::${keyOf("__direct__")}`;
    const subKey = `${keyOf(category)}::${keyOf(subcategory)}`;
    return unique([...(detailsByCategorySub.get(subKey) || []), ...(!subcategory ? detailsByCategorySub.get(directKey) || [] : [])]);
  };

  return {
    categories: unique(categoryNames),
    getSubcategories,
    getDetails,
  };
}

function getStatus(row: AnyRow | null | undefined) {
  const status = valueOf(row, ["status", "Status"], "Awaiting");
  return status.toLowerCase() === "solved" ? "Resolved" : status;
}

function getPriority(row: AnyRow | null | undefined) {
  return valueOf(row, ["priority", "Priority", "urgency", "Urgency"], "Medium");
}

function getTitle(row: AnyRow | null | undefined) {
  return valueOf(row, ["title", "Title", "incidentTitle", "IncidentTitle", "problemDescription", "ProblemDescription"], "Untitled incident");
}

function getDescription(row: AnyRow | null | undefined) {
  return valueOf(row, ["description", "Description", "details", "Details", "incidentDescription", "IncidentDescription"], "");
}

function getRequester(row: AnyRow | null | undefined) {
  return valueOf(row, ["requesterName", "RequesterName", "customerName", "CustomerName", "reporterId", "ReporterID", "requesterId", "RequesterID"], "N/A");
}

function getAsset(row: AnyRow | null | undefined) {
  return valueOf(row, ["assetId", "AssetID", "assetTag", "AssetTag", "deviceName", "DeviceName", "computerName", "ComputerName", "Object_DeviceID", "DeviceID", "name", "Name"], "—");
}

function getAssigned(row: AnyRow | null | undefined) {
  return valueOf(row, ["assignedTo", "AssignedTo", "engineerName", "EngineerName", "assignee", "Assignee"], "Unassigned");
}

function getAssetValue(asset: AnyRow | null | undefined) {
  return valueOf(asset, ["assetTag", "AssetTag", "assetId", "AssetID", "name", "Name", "computerName", "ComputerName", "DeviceName", "deviceName", "Object_DeviceID", "DeviceID", "id", "ID"]);
}

function getAssetOwner(asset: AnyRow | null | undefined) {
  return valueOf(asset, ["owner", "Owner", "assignedUser", "AssignedUser", "userName", "UserName", "username", "Username", "requesterName", "RequesterName", "customerName", "CustomerName", "customer", "Customer", "employeeName", "EmployeeName"]);
}

function getAssetOwnerId(asset: AnyRow | null | undefined) {
  return valueOf(asset, ["ownerId", "OwnerID", "userID", "UserID", "userId", "UserId", "requesterId", "RequesterID", "customerId", "CustomerID", "email", "Email"], getAssetOwner(asset));
}

function inferAssetBrand(...values: any[]) {
  const text = values.map((value) => String(value || "")).join(" ").toLowerCase();
  if (text.includes("dell") || text.includes("latitude") || text.includes("optiplex")) return "Dell";
  if (text.includes("hewlett") || text.includes("hp ") || text.startsWith("hp") || text.includes("probook") || text.includes("elitebook")) return "HP";
  if (text.includes("lenovo") || text.includes("thinkpad") || text.includes("thinkcentre")) return "Lenovo";
  if (text.includes("apple") || text.includes("macbook") || text.includes("imac")) return "Apple";
  if (text.includes("microsoft") || text.includes("surface")) return "Microsoft";
  if (text.includes("acer")) return "Acer";
  if (text.includes("asus")) return "ASUS";
  return "";
}

function getAssetBrand(asset: AnyRow | null | undefined) {
  return valueOf(asset, ["brand", "Brand", "manufacturer", "Manufacturer", "vendor", "Vendor"], inferAssetBrand(getAssetModel(asset), getAssetValue(asset)));
}

function getAssetModel(asset: AnyRow | null | undefined) {
  return valueOf(asset, ["model", "Model", "DeviceModelName", "deviceModelName", "machineType", "MachineType", "productName", "ProductName"]);
}

function getAssetOS(asset: AnyRow | null | undefined) {
  return valueOf(asset, ["osName", "OSName", "os", "OS", "operatingSystem", "OperatingSystem", "PlatformType", "platform", "Platform"]);
}

function getAssetDeviceType(asset: AnyRow | null | undefined) {
  return valueOf(asset, ["deviceType", "DeviceType", "type", "Type", "assetType", "AssetType"], getAssetOS(asset));
}

function parseDate(value: any) {
  if (!value) return null;
  const date = new Date(String(value).trim().includes(" ") ? String(value).trim().replace(" ", "T") : String(value).trim());
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: any) {
  const date = parseDate(value);
  if (!date) return value ? String(value) : "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatDateTime(value: any) {
  const date = parseDate(value);
  if (!date) return value ? String(value) : "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(date).replace(",", "");
}

function initialText(value: string) {
  const text = String(value || "").trim();
  if (!text) return "NA";
  return text.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("");
}

function makeIncidentId() {
  return `INC-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
}

function readCurrentUser() {
  if (typeof window === "undefined") return { name: "Current User", role: "Admin" };
  const keys = ["user", "authUser", "currentUser", "emaUser", "ema-user", "userData", "auth", "ema-auth", "authData", "loginUser"];
  for (const key of keys) {
    try {
      const raw = window.localStorage.getItem(key) || window.sessionStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const user = parsed?.user || parsed?.data?.user || parsed?.data || parsed?.profile || parsed;
      const name = getUserName(user);
      if (name) return { ...user, id: getUserId(user), name, role: valueOf(user, ["role", "Role", "roleName", "RoleName"], "Admin") };
    } catch {
      // ignore storage value
    }
  }
  return { name: "Current User", role: "Admin" };
}

function emptyForm(currentUser: AnyRow) {
  const requesterName = getUserName(currentUser) || "Current User";
  const requesterId = getUserId(currentUser) || requesterName;
  return {
    id: "",
    title: "",
    description: "",
    priority: "Medium",
    status: "Awaiting",
    category: "",
    subcategory: "",
    incidentDetail: "",
    assetId: "",
    assetBrand: "",
    assetModel: "",
    assetOS: "",
    requesterId,
    requesterName,
    reporterId: requesterId,
    deviceType: "",
    assignedLevel: "",
    assignedTo: "",
    rootCause: "",
    actionPlan: "",
    additionalMemo: "",
    remarks: "",
    createdAt: new Date().toISOString(),
  };
}

function getSlaMeta(row: AnyRow, now: Date) {
  const status = normalizeText(getStatus(row));
  if (status === "resolved" || status === "rejected") return { label: "Resolved", detail: formatDateTime(row.resolvedAt || row.ResolvedAt) };
  const due = parseDate(row.slaDue || row.SlaDue || row.SLADue);
  if (!due) return { label: "No SLA", detail: "Not calculated" };
  const minutes = Math.floor((due.getTime() - now.getTime()) / 60000);
  if (minutes < 0) return { label: "Overdue", detail: formatDateTime(due) };
  if (minutes <= 1440) return { label: "Near Due", detail: formatDateTime(due) };
  return { label: "On Time", detail: formatDateTime(due) };
}

function statusTone(status: string) {
  const key = normalizeText(status);
  if (key.includes("resolved")) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (key.includes("progress")) return "bg-blue-50 text-blue-700 ring-blue-200";
  if (key.includes("pending")) return "bg-amber-50 text-amber-700 ring-amber-200";
  if (key.includes("reject")) return "bg-rose-50 text-rose-700 ring-rose-200";
  if (key.includes("site")) return "bg-violet-50 text-violet-700 ring-violet-200";
  return "bg-slate-50 text-slate-700 ring-slate-200";
}

function priorityTone(priority: string) {
  const key = normalizeText(priority);
  if (key.includes("critical")) return "bg-rose-50 text-rose-700 ring-rose-200";
  if (key.includes("high")) return "bg-orange-50 text-orange-700 ring-orange-200";
  if (key.includes("medium")) return "bg-blue-50 text-blue-700 ring-blue-200";
  return "bg-slate-50 text-slate-700 ring-slate-200";
}

function inputClass() {
  return "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100";
}

function textareaClass() {
  return "min-h-[7rem] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100";
}

function labelClass() {
  return "grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500";
}

function ServiceDeskSelect({ value, options, placeholder = "Select", disabled, onChange }: { value: string; options: SelectOption[]; placeholder?: string; disabled?: boolean; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={cx(
          "flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-extrabold text-slate-800 shadow-sm outline-none transition hover:border-blue-300 hover:bg-blue-50/40 focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-blue-300 ring-4 ring-blue-100"
        )}
        aria-expanded={open}
      >
        <span className="min-w-0 truncate">{selected?.label || placeholder}</span>
        <ChevronDown size={15} className={cx("shrink-0 text-slate-500 transition", open && "rotate-180 text-blue-600")} />
      </button>
      {open && !disabled && (
        <div className="absolute left-0 top-[calc(100%+0.45rem)] z-[100] max-h-72 w-full min-w-[13rem] overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-2xl">
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={`${option.value}-${option.label}`}
                type="button"
                disabled={option.disabled}
                onClick={() => {
                  if (option.disabled) return;
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cx(
                  "flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-3 text-left text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50",
                  active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50 hover:text-blue-700"
                )}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {active ? <span className="text-blue-600">✓</span> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ServiceDesk() {
  const [currentUser] = useState<AnyRow>(() => readCurrentUser());
  const [incidents, setIncidents] = useState<AnyRow[]>([]);
  const [users, setUsers] = useState<AnyRow[]>([]);
  const [roles, setRoles] = useState<AnyRow[]>([]);
  const [assets, setAssets] = useState<AnyRow[]>([]);
  const [categories, setCategories] = useState<AnyRow[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<AnyRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLookupLoading, setIsLookupLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [activeQueue, setActiveQueue] = useState<QueueKey>("all");
  const [viewMode, setViewMode] = useState<"list" | "form" | "knowledge">("list");
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formData, setFormData] = useState<AnyRow>(() => emptyForm(currentUser));
  const [selectedIncidentId, setSelectedIncidentId] = useState("");
  const [selectedKb, setSelectedKb] = useState<AnyRow | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterAssignedTo, setFilterAssignedTo] = useState("All");
  const [filterSla, setFilterSla] = useState("All");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "createdAt", direction: "desc" });
  const [page, setPage] = useState(1);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    void loadIncidents();
    void loadLookups();
    const timer = window.setInterval(() => setNow(new Date()), 120000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    setPage(1);
  }, [activeQueue, searchTerm, filterStatus, filterPriority, filterAssignedTo, filterSla, dateFrom, dateTo]);

  async function loadIncidents(silent = false) {
    if (!silent) setIsLoading(true);
    try {
      const data = await incidentsService.getAll();
      setIncidents(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Service Desk incidents failed", error);
      setToast({ type: "error", message: error?.message || "Failed to load Service Desk incidents." });
      setIncidents([]);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }

  async function loadLookups() {
    setIsLookupLoading(true);
    try {
      const [userRows, roleRows, categoryRows, assetRows, kbRows] = await Promise.allSettled([
        usersService.getAll(),
        rolesService.getAll(),
        incidentCategoriesService.getAll(),
        assetsService.getAll(),
        knowledgeBaseService.getAll(),
      ]);
      if (userRows.status === "fulfilled") setUsers(Array.isArray(userRows.value) ? userRows.value : []);
      if (roleRows.status === "fulfilled") setRoles(Array.isArray(roleRows.value) ? roleRows.value : []);
      if (categoryRows.status === "fulfilled") setCategories(Array.isArray(categoryRows.value) ? categoryRows.value : []);
      if (assetRows.status === "fulfilled") setAssets(Array.isArray(assetRows.value) ? assetRows.value : []);
      if (kbRows.status === "fulfilled") setKnowledgeBase(Array.isArray(kbRows.value) ? kbRows.value : []);
    } catch (error) {
      console.warn("Service Desk lookup load failed", error);
    } finally {
      setIsLookupLoading(false);
    }
  }

  async function refreshPage() {
    setIsRefreshing(true);
    try {
      await Promise.all([loadIncidents(true), loadLookups()]);
      setToast({ type: "success", message: "Service Desk refreshed." });
    } finally {
      setIsRefreshing(false);
    }
  }

  function selectAsset(assetKey: string) {
    const asset = assets.find((row) => getAssetValue(row) === assetKey || getAsset(row) === assetKey);
    if (!assetKey || !asset) {
      setFormData((prev) => ({ ...prev, assetId: "", assetBrand: "", assetModel: "", assetOS: "", deviceType: "" }));
      return;
    }
    const owner = getAssetOwner(asset);
    const ownerId = getAssetOwnerId(asset);
    const deviceType = getAssetDeviceType(asset);
    setFormData((prev) => ({
      ...prev,
      assetId: getAssetValue(asset),
      assetBrand: getAssetBrand(asset),
      assetModel: getAssetModel(asset),
      assetOS: getAssetOS(asset),
      deviceType: deviceType || prev.deviceType,
      requesterName: owner || prev.requesterName,
      requesterId: ownerId || prev.requesterId,
    }));
  }

  function startCreate() {
    setFormMode("create");
    setFormData(emptyForm(currentUser));
    setSelectedIncidentId("");
    setViewMode("form");
  }

  function startEdit(row: AnyRow) {
    setFormMode("edit");
    setFormData({
      ...emptyForm(currentUser),
      ...row,
      id: getIncidentId(row),
      title: getTitle(row),
      description: getDescription(row),
      priority: getPriority(row),
      status: getStatus(row),
      requesterName: getRequester(row),
      assetId: getAsset(row) === "—" ? "" : getAsset(row),
      assetBrand: valueOf(row, ["assetBrand", "AssetBrand", "brand", "Brand"]),
      assetModel: valueOf(row, ["assetModel", "AssetModel", "model", "Model"]),
      assetOS: valueOf(row, ["assetOS", "AssetOS", "os", "OS"]),
      deviceType: valueOf(row, ["deviceType", "DeviceType"]),
      category: valueOf(row, ["category", "Category"]),
      subcategory: valueOf(row, ["subcategory", "Subcategory", "subCategory", "SubCategory"]),
      incidentDetail: valueOf(row, ["incidentDetail", "IncidentDetail", "detail", "Detail"]),
      assignedLevel: valueOf(row, ["assignedLevel", "AssignedLevel", "supportLevel", "SupportLevel"]),
      assignedTo: getAssigned(row) === "Unassigned" ? "" : getAssigned(row),
    });
    setSelectedIncidentId(getIncidentId(row));
    setViewMode("form");
  }

  async function saveIncident(event: FormEvent) {
    event.preventDefault();
    const title = String(formData.title || "").trim();
    const description = String(formData.description || "").trim();
    if (!title) {
      setToast({ type: "error", message: "Incident title is required." });
      return;
    }
    if (!description) {
      setToast({ type: "error", message: "Incident description is required." });
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        id: formMode === "edit" ? getIncidentId(formData) : formData.id || makeIncidentId(),
        title,
        description,
        status: formMode === "create" ? "Awaiting" : formData.status || "Awaiting",
        priority: formData.priority || "Medium",
        requesterName: formData.requesterName || getUserName(currentUser) || "Current User",
        requesterId: formData.requesterId || getUserId(currentUser),
        reporterId: formData.reporterId || getUserId(currentUser),
        createdAt: formData.createdAt || new Date().toISOString(),
      };
      if (formMode === "create") await incidentsService.create(payload);
      else await incidentsService.update(payload);
      setToast({ type: "success", message: formMode === "create" ? "Ticket created successfully." : "Ticket updated successfully." });
      setViewMode("list");
      await loadIncidents(true);
    } catch (error: any) {
      console.error("Service Desk save failed", error);
      setToast({ type: "error", message: error?.message || "Failed to save ticket." });
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteIncident(row: AnyRow) {
    const id = getIncidentId(row);
    if (!id) return;
    const ok = window.confirm(`Delete ticket ${id}?`);
    if (!ok) return;
    try {
      await incidentsService.delete(id);
      setToast({ type: "success", message: `Ticket ${id} deleted.` });
      setSelectedIncidentId("");
      await loadIncidents(true);
    } catch (error: any) {
      console.error("Delete failed", error);
      setToast({ type: "error", message: error?.message || "Failed to delete ticket." });
    }
  }

  function resetFilters() {
    setSearchTerm("");
    setFilterStatus("All");
    setFilterPriority("All");
    setFilterAssignedTo("All");
    setFilterSla("All");
    setDateFrom("");
    setDateTo("");
    setShowAdvanced(false);
  }

  function requestSort(key: string) {
    setSortConfig((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
  }

  const queueCounts = useMemo(() => {
    const counts = { all: incidents.length, open: 0, my: 0, slaRisk: 0, unassigned: 0, awaiting: 0, inProgress: 0, pendingUser: 0, pendingVendor: 0, onSite: 0, resolved: 0, kb: knowledgeBase.length };
    incidents.forEach((row) => {
      const status = normalizeText(getStatus(row));
      const assigned = getAssigned(row);
      const sla = getSlaMeta(row, now).label;
      if (!status.includes("resolved") && !status.includes("rejected")) counts.open += 1;
      if (normalizeText(assigned) === normalizeText(getUserName(currentUser))) counts.my += 1;
      if (assigned === "Unassigned" || normalizeText(assigned) === "unassigned") counts.unassigned += 1;
      if (status.includes("awaiting")) counts.awaiting += 1;
      if (status.includes("progress")) counts.inProgress += 1;
      if (status.includes("pending user")) counts.pendingUser += 1;
      if (status.includes("pending vendor")) counts.pendingVendor += 1;
      if (status.includes("site")) counts.onSite += 1;
      if (status.includes("resolved")) counts.resolved += 1;
      if (sla === "Near Due" || sla === "Overdue") counts.slaRisk += 1;
    });
    return counts;
  }, [incidents, knowledgeBase.length, now, currentUser]);

  const queueItems = [
    { key: "all" as QueueKey, label: "All Tickets", sub: "Complete service queue", count: queueCounts.all, icon: Ticket },
    { key: "my" as QueueKey, label: "My Assigned", sub: "Owned by current agent", count: queueCounts.my, icon: User },
    { key: "sla-risk" as QueueKey, label: "SLA Risk", sub: "Near due or breached", count: queueCounts.slaRisk, icon: ShieldAlert },
    { key: "unassigned" as QueueKey, label: "Unassigned", sub: "Needs ownership", count: queueCounts.unassigned, icon: Users },
    { key: "awaiting" as QueueKey, label: "Awaiting", sub: "New requests", count: queueCounts.awaiting, icon: Clock },
    { key: "in-progress" as QueueKey, label: "In Progress", sub: "Active work", count: queueCounts.inProgress, icon: ArrowRightLeft },
    { key: "pending-user" as QueueKey, label: "Pending User", sub: "Waiting requester", count: queueCounts.pendingUser, icon: User },
    { key: "pending-vendor" as QueueKey, label: "Pending Vendor", sub: "External action", count: queueCounts.pendingVendor, icon: Settings },
    { key: "on-site" as QueueKey, label: "On Site", sub: "Field support", count: queueCounts.onSite, icon: Monitor },
    { key: "resolved" as QueueKey, label: "Resolved", sub: "Completed tickets", count: queueCounts.resolved, icon: CheckCircle2 },
    { key: "knowledge" as QueueKey, label: "Knowledge Base", sub: "Resolution articles", count: queueCounts.kb, icon: BookOpen },
  ];

  const filteredIncidents = useMemo(() => {
    const search = normalizeText(searchTerm);
    return incidents.filter((row) => {
      const status = getStatus(row);
      const priority = getPriority(row);
      const assigned = getAssigned(row);
      const sla = getSlaMeta(row, now).label;
      const created = parseDate(row.createdAt || row.CreatedAt || row.submittedAt || row.SubmittedAt);
      if (activeQueue === "my" && normalizeText(assigned) !== normalizeText(getUserName(currentUser))) return false;
      if (activeQueue === "sla-risk" && !(sla === "Near Due" || sla === "Overdue")) return false;
      if (activeQueue === "unassigned" && normalizeText(assigned) !== "unassigned") return false;
      if (activeQueue === "awaiting" && !normalizeText(status).includes("awaiting")) return false;
      if (activeQueue === "in-progress" && !normalizeText(status).includes("progress")) return false;
      if (activeQueue === "pending-user" && !normalizeText(status).includes("pending user")) return false;
      if (activeQueue === "pending-vendor" && !normalizeText(status).includes("pending vendor")) return false;
      if (activeQueue === "on-site" && !normalizeText(status).includes("site")) return false;
      if (activeQueue === "resolved" && !normalizeText(status).includes("resolved")) return false;
      if (filterStatus !== "All" && status !== filterStatus) return false;
      if (filterPriority !== "All" && priority !== filterPriority) return false;
      if (filterAssignedTo !== "All" && assigned !== filterAssignedTo) return false;
      if (filterSla !== "All" && sla !== filterSla) return false;
      if (dateFrom && created && created < new Date(`${dateFrom}T00:00:00`)) return false;
      if (dateTo && created && created > new Date(`${dateTo}T23:59:59`)) return false;
      if (!search) return true;
      const haystack = [getIncidentId(row), getRequester(row), getAsset(row), getTitle(row), getDescription(row), getStatus(row), getPriority(row), getAssigned(row), row.category, row.subcategory, row.incidentDetail].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(search);
    });
  }, [incidents, activeQueue, searchTerm, filterStatus, filterPriority, filterAssignedTo, filterSla, dateFrom, dateTo, now, currentUser]);

  const sortedIncidents = useMemo(() => {
    const list = [...filteredIncidents];
    list.sort((a, b) => {
      const dir = sortConfig.direction === "asc" ? 1 : -1;
      const read = (row: AnyRow) => {
        if (sortConfig.key === "id") return getIncidentId(row);
        if (sortConfig.key === "createdAt") return parseDate(row.createdAt || row.CreatedAt)?.getTime() || 0;
        if (sortConfig.key === "requester") return getRequester(row);
        if (sortConfig.key === "title") return getTitle(row);
        if (sortConfig.key === "priority") return PRIORITY_OPTIONS.indexOf(getPriority(row));
        if (sortConfig.key === "assigned") return getAssigned(row);
        if (sortConfig.key === "status") return getStatus(row);
        return valueOf(row, [sortConfig.key]);
      };
      return String(read(a)).localeCompare(String(read(b)), undefined, { numeric: true }) * dir;
    });
    return list;
  }, [filteredIncidents, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedIncidents.length / PAGE_SIZE));
  const pageRows = sortedIncidents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedIncident = useMemo(() => incidents.find((row) => getIncidentId(row) === selectedIncidentId) || null, [incidents, selectedIncidentId]);
  const categoryCatalog = useMemo(() => buildCategoryCatalog(categories, incidents), [categories, incidents]);
  const categoryOptions = categoryCatalog.categories;
  const subcategoryOptions = useMemo(() => categoryCatalog.getSubcategories(formData.category || ""), [categoryCatalog, formData.category]);
  const detailOptions = useMemo(() => categoryCatalog.getDetails(formData.category || "", formData.subcategory || ""), [categoryCatalog, formData.category, formData.subcategory]);

  const supportLevelOptions = useMemo(() => {
    const fromRoles = roles.map((role) => normalizeSupportLevelName(getRoleDisplayName(role))).filter(isSupportRoleName);
    return unique([...SUPPORT_LEVELS, ...fromRoles]);
  }, [roles]);
  const engineers = useMemo(() => users.filter((user) => getUserRoleNames(user).some(isSupportRoleName)), [users]);
  const engineerOptions = useMemo(() => {
    const source = formData.assignedLevel ? engineers.filter((user) => userMatchesSupportLevel(user, formData.assignedLevel)) : engineers;
    return source.map((user) => getUserName(user)).filter(Boolean);
  }, [engineers, formData.assignedLevel]);
  const filterAssigneeOptions = useMemo(() => unique(engineers.map((user) => getUserName(user)).filter(Boolean)), [engineers]);
  const assetOptions = useMemo(() => assets.map((asset) => getAssetValue(asset)).filter(Boolean), [assets]);
  const selectedAsset = useMemo(() => assets.find((asset) => getAssetValue(asset) === formData.assetId || getAsset(asset) === formData.assetId) || null, [assets, formData.assetId]);
  const activeQueueLabel = queueItems.find((item) => item.key === activeQueue)?.label || "All Tickets";
  const toastItems: EmaToastItem[] = toast ? [{ id: toast.id || `${toast.type}-${toast.message}`, tone: toast.type, title: toast.type === "success" ? "Success" : toast.type === "error" ? "Action failed" : toast.type === "warning" ? "Attention" : "Information", message: toast.message }] : [];

  function exportCsv() {
    const headers = ["No", "Req No", "Submitted", "Requester", "Asset", "Incident", "Urgency", "Assigner", "SLA", "Status"];
    const rows = sortedIncidents.map((row, index) => {
      const sla = getSlaMeta(row, now);
      return [index + 1, getIncidentId(row), formatDate(row.createdAt || row.CreatedAt), getRequester(row), getAsset(row), getTitle(row), getPriority(row), getAssigned(row), sla.label, getStatus(row)];
    });
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `service-desk-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function printTable() {
    window.print();
  }

  return (
    <main data-section="service-desk" className="min-h-screen bg-slate-50 p-4 text-slate-950">
      <EmaToastViewport items={toastItems} onClose={() => setToast(null)} />

      <div className="grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
            <span className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-500">Service Center</span>
            <strong className="mt-1 block text-lg font-black text-slate-950">Service Desk</strong>
            <small className="mt-1 block text-xs font-semibold text-slate-500">Ticket queue and support operation</small>
          </div>
          <nav className="grid gap-2" aria-label="Service Desk queue">
            {queueItems.map((item) => {
              const Icon = item.icon;
              const active = activeQueue === item.key;
              return (
                <button key={item.key} type="button" onClick={() => { setActiveQueue(item.key); setViewMode(item.key === "knowledge" ? "knowledge" : "list"); setSelectedIncidentId(""); }} className={cx("grid min-h-[3.4rem] grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border px-3 py-2 text-left transition", active ? "border-blue-200 bg-blue-50 text-blue-700 shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/60")}>
                  <i className={cx("grid h-9 w-9 place-items-center rounded-xl", active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500")}><Icon size={16} /></i>
                  <span className="min-w-0"><strong className="block truncate text-sm font-black">{item.label}</strong><small className="block truncate text-xs font-semibold text-slate-500">{item.sub}</small></span>
                  <b className={cx("rounded-full px-2 py-1 text-xs font-black", active ? "bg-white text-blue-700" : "bg-slate-100 text-slate-600")}>{isLoading && item.key !== "knowledge" ? "…" : item.count}</b>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:grid-cols-[minmax(0,1fr)_minmax(32rem,0.95fr)]">
            <div>
              <span className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-500">Incident Command Center</span>
              <h2 className="mt-1 text-2xl font-black text-slate-950">Service Desk</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Manage tickets, assignments, SLA risk and support activity.</p>
              {(isLoading || isLookupLoading) && <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700"><Loader2 size={14} className="animate-spin" /> Loading data in content area</div>}
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[{ label: "Open Tickets", value: queueCounts.open, note: "support workload" }, { label: "SLA Risk", value: queueCounts.slaRisk, note: "near due / breached" }, { label: "Awaiting", value: queueCounts.awaiting, note: "new requests" }, { label: "In Progress", value: queueCounts.inProgress, note: "active handling" }].map((kpi) => <div key={kpi.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><span className="text-[0.68rem] font-black uppercase tracking-[0.08em] text-slate-500">{kpi.label}</span><strong className="mt-1 block text-2xl font-black text-slate-950">{isLoading ? "…" : kpi.value}</strong><small className="mt-1 block text-xs font-bold text-slate-500">{kpi.note}</small></div>)}
            </div>
          </div>

          {viewMode === "knowledge" ? (
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4"><div><span className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-500">Knowledge Base</span><h3 className="mt-1 text-lg font-black text-slate-950">Resolution Articles</h3></div><button type="button" onClick={() => setViewMode("list")} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50"><Ticket size={15} /> Ticket List</button></div>
              <div className="p-4">
                {isLookupLoading ? <div className="grid min-h-[16rem] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center"><div><Loader2 className="mx-auto mb-3 animate-spin text-blue-600" size={28} /><strong className="block text-sm font-black text-slate-900">Loading knowledge base...</strong></div></div> : knowledgeBase.length === 0 ? <div className="grid min-h-[16rem] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center"><div><BookOpen className="mx-auto mb-3 text-slate-400" size={28} /><strong className="block text-sm font-black text-slate-900">No knowledge article found.</strong></div></div> : <div className="overflow-hidden rounded-2xl border border-slate-200"><table className="w-full min-w-[48rem] text-left text-sm"><thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.08em] text-slate-500"><tr><th className="px-4 py-3">No</th><th className="px-4 py-3">Article</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-200">{knowledgeBase.map((row, index) => <tr key={valueOf(row, ["id", "KnowledgeID", "title"], String(index))} className="hover:bg-slate-50"><td className="px-4 py-3 font-black text-slate-500">{String(index + 1).padStart(2, "0")}</td><td className="px-4 py-3"><strong className="font-black text-slate-900">{valueOf(row, ["title", "Title"], "Untitled article")}</strong></td><td className="px-4 py-3 text-right"><button type="button" onClick={() => setSelectedKb(row)} className="inline-grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700"><Eye size={14} /></button></td></tr>)}</tbody></table></div>}
              </div>
            </section>
          ) : viewMode === "form" ? (
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <form onSubmit={saveIncident}>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4"><div><span className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-500">{formMode === "create" ? "Create Ticket" : "Update Ticket"}</span><h3 className="mt-1 text-lg font-black text-slate-950">{formMode === "create" ? "New Incident Request" : getIncidentId(formData)}</h3></div><button type="button" onClick={() => setViewMode("list")} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50"><X size={15} /> Cancel</button></div>
                <div className="grid gap-4 p-4 lg:grid-cols-2">
                  <label className={cx(labelClass(), "lg:col-span-2")}>Incident Title<input value={formData.title || ""} onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))} className={inputClass()} placeholder="Example: Laptop cannot connect to network" /></label>
                  <label className={cx(labelClass(), "lg:col-span-2")}>Description<textarea value={formData.description || ""} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} className={textareaClass()} placeholder="Describe the issue, impact and required support." /></label>
                  <label className={labelClass()}>Requester<input value={formData.requesterName || ""} onChange={(e) => setFormData((prev) => ({ ...prev, requesterName: e.target.value }))} className={inputClass()} /></label>
                  <label className={labelClass()}>Asset<ServiceDeskSelect value={formData.assetId || ""} onChange={selectAsset} placeholder="No asset selected" options={[{ value: "", label: "No asset selected" }, ...assetOptions.map((asset) => ({ value: asset, label: asset }))]} /></label>
                  {selectedAsset && <div className="lg:col-span-2 grid gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-3 md:grid-cols-4"><div><span className="text-[0.65rem] font-black uppercase tracking-[0.08em] text-blue-500">Owner</span><strong className="mt-1 block text-sm font-black text-slate-900">{getAssetOwner(selectedAsset) || formData.requesterName || "-"}</strong></div><div><span className="text-[0.65rem] font-black uppercase tracking-[0.08em] text-blue-500">Brand</span><strong className="mt-1 block text-sm font-black text-slate-900">{formData.assetBrand || "-"}</strong></div><div><span className="text-[0.65rem] font-black uppercase tracking-[0.08em] text-blue-500">Model</span><strong className="mt-1 block text-sm font-black text-slate-900">{formData.assetModel || "-"}</strong></div><div><span className="text-[0.65rem] font-black uppercase tracking-[0.08em] text-blue-500">OS / Type</span><strong className="mt-1 block text-sm font-black text-slate-900">{formData.assetOS || formData.deviceType || "-"}</strong></div></div>}
                  <label className={labelClass()}>Urgency<ServiceDeskSelect value={formData.priority || "Medium"} onChange={(value) => setFormData((prev) => ({ ...prev, priority: value }))} options={PRIORITY_OPTIONS.map((item) => ({ value: item, label: item }))} /></label>
                  <label className={labelClass()}>Status<ServiceDeskSelect value={formData.status || "Awaiting"} onChange={(value) => setFormData((prev) => ({ ...prev, status: value }))} disabled={formMode === "create"} options={STATUS_OPTIONS.map((item) => ({ value: item, label: item }))} /></label>
                  <label className={labelClass()}>Category<ServiceDeskSelect value={formData.category || ""} onChange={(value) => setFormData((prev) => ({ ...prev, category: value, subcategory: "", incidentDetail: "" }))} placeholder={isLookupLoading ? "Loading category..." : "No category"} options={[{ value: "", label: isLookupLoading ? "Loading category..." : "No category" }, ...categoryOptions.map((item) => ({ value: item, label: item }))]} /></label>
                  <label className={labelClass()}>Sub Category<ServiceDeskSelect value={formData.subcategory || ""} onChange={(value) => setFormData((prev) => ({ ...prev, subcategory: value, incidentDetail: "" }))} disabled={!formData.category || subcategoryOptions.length === 0} placeholder={subcategoryOptions.length ? "No sub category" : "No sub category mapped"} options={[{ value: "", label: subcategoryOptions.length ? "No sub category" : "No sub category mapped" }, ...subcategoryOptions.map((item) => ({ value: item, label: item }))]} /></label>
                  <label className={labelClass()}>Detail<ServiceDeskSelect value={formData.incidentDetail || ""} onChange={(value) => setFormData((prev) => ({ ...prev, incidentDetail: value }))} disabled={!formData.category || (subcategoryOptions.length > 0 && !formData.subcategory) || detailOptions.length === 0} placeholder={detailOptions.length ? "No detail" : "No detail mapped"} options={[{ value: "", label: detailOptions.length ? "No detail" : "No detail mapped" }, ...detailOptions.map((item) => ({ value: item, label: item }))]} /></label>
                  <label className={labelClass()}>Device Type<ServiceDeskSelect value={formData.deviceType || ""} onChange={(value) => setFormData((prev) => ({ ...prev, deviceType: value }))} placeholder="Select device type" options={[{ value: "", label: formData.deviceType || "Select device type" }, ...unique([formData.deviceType, ...DEVICE_TYPES]).filter(Boolean).map((item) => ({ value: item, label: item }))]} /></label>
                  <label className={labelClass()}>Assigner Level<ServiceDeskSelect value={formData.assignedLevel || ""} onChange={(value) => setFormData((prev) => ({ ...prev, assignedLevel: value, assignedTo: "" }))} placeholder="Not assigned" options={[{ value: "", label: "Not assigned" }, ...supportLevelOptions.map((level) => ({ value: level, label: level }))]} /></label>
                  <label className={labelClass()}>Assigned Engineer<ServiceDeskSelect value={formData.assignedTo || ""} onChange={(value) => setFormData((prev) => ({ ...prev, assignedTo: value }))} disabled={Boolean(formData.assignedLevel) && engineerOptions.length === 0} placeholder={formData.assignedLevel ? "Select engineer" : "Choose level first"} options={[{ value: "", label: formData.assignedLevel ? "Unassigned" : "Choose level first" }, ...engineerOptions.map((name) => ({ value: name, label: name }))]} /></label>
                  {formData.assignedLevel && <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-600"><strong className="font-black text-slate-900">{engineerOptions.length}</strong> engineer(s) matched for <strong className="font-black text-slate-900">{formData.assignedLevel}</strong> based on user roles.</div>}
                  <label className={cx(labelClass(), "lg:col-span-2")}>Action Plan<textarea value={formData.actionPlan || ""} onChange={(e) => setFormData((prev) => ({ ...prev, actionPlan: e.target.value }))} className={textareaClass()} placeholder="Resolution steps or next action." /></label>
                </div>
                <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 bg-slate-50 p-4"><button type="button" onClick={() => setViewMode("list")} className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50">Cancel</button><button type="submit" disabled={isSaving} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-blue-600 bg-blue-600 px-5 text-sm font-black text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}{isSaving ? "Saving..." : formMode === "create" ? "Create Ticket" : "Update Ticket"}</button></div>
              </form>
            </section>
          ) : (
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="space-y-3 border-b border-slate-200 p-3">
                <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={startCreate} className="inline-flex h-11 items-center gap-2 rounded-xl border border-blue-600 bg-blue-600 px-4 text-sm font-black text-white shadow-sm hover:bg-blue-700"><Plus size={15} /> Create Ticket</button><div className="flex h-11 min-w-[18rem] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm"><Search size={16} className="text-slate-400" /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search request no, requester, asset, incident..." className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400" /></div><button type="button" disabled={!searchTerm && filterStatus === "All" && filterPriority === "All" && filterAssignedTo === "All" && filterSla === "All" && !dateFrom && !dateTo} onClick={resetFilters} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50"><X size={14} /> Reset</button><button type="button" disabled={isRefreshing} onClick={refreshPage} className="inline-grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-blue-600 shadow-sm hover:bg-blue-50 disabled:opacity-50" aria-label="Refresh"><RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} /></button><button type="button" onClick={() => setShowAdvanced((value) => !value)} className="inline-grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50" aria-label="Advanced filters"><Filter size={16} /></button><button type="button" onClick={exportCsv} className="inline-grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50" aria-label="Export"><Download size={16} /></button><button type="button" onClick={printTable} className="inline-grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50" aria-label="Print"><Printer size={16} /></button></div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><label className={labelClass()}>Status<ServiceDeskSelect value={filterStatus} onChange={setFilterStatus} options={[{ value: "All", label: "All status" }, ...STATUS_OPTIONS.map((item) => ({ value: item, label: item }))]} /></label><label className={labelClass()}>Urgency<ServiceDeskSelect value={filterPriority} onChange={setFilterPriority} options={[{ value: "All", label: "All urgency" }, ...PRIORITY_OPTIONS.map((item) => ({ value: item, label: item }))]} /></label><label className={labelClass()}>Assigner<ServiceDeskSelect value={filterAssignedTo} onChange={setFilterAssignedTo} options={[{ value: "All", label: "All assigner" }, { value: "Unassigned", label: "Unassigned" }, ...filterAssigneeOptions.map((name) => ({ value: name, label: name }))]} /></label><label className={labelClass()}>SLA<ServiceDeskSelect value={filterSla} onChange={setFilterSla} options={[{ value: "All", label: "All SLA" }, ...["On Time", "Near Due", "Overdue", "Resolved", "No SLA"].map((item) => ({ value: item, label: item }))]} /></label></div>
                {showAdvanced && <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-2 xl:grid-cols-4"><label className={labelClass()}>Date From<input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputClass()} /></label><label className={labelClass()}>Date To<input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputClass()} /></label><div className="flex items-end text-sm font-semibold text-slate-500 xl:col-span-2">Advanced filters are applied directly to the table without hiding the UI.</div></div>}
              </div>
              <div className="p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><strong className="text-sm font-black text-slate-900">{activeQueueLabel}</strong><span className="ml-2 text-sm font-semibold text-slate-500">{isLoading ? "Loading tickets..." : `${sortedIncidents.length.toLocaleString()} record(s)`}</span></div>{isLookupLoading && <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700"><Loader2 size={13} className="animate-spin" /> Loading filters</span>}</div>
                <div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full min-w-[82rem] text-left text-sm"><thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.08em] text-slate-500"><tr><th className="w-14 px-4 py-3">No</th><th className="px-4 py-3"><button type="button" onClick={() => requestSort("id")} className="font-black">Req No</button></th><th className="px-4 py-3"><button type="button" onClick={() => requestSort("createdAt")} className="font-black">Submitted</button></th><th className="px-4 py-3"><button type="button" onClick={() => requestSort("requester")} className="font-black">Requester</button></th><th className="px-4 py-3">Asset</th><th className="px-4 py-3"><button type="button" onClick={() => requestSort("title")} className="font-black">Incident</button></th><th className="px-4 py-3"><button type="button" onClick={() => requestSort("priority")} className="font-black">Urgency</button></th><th className="px-4 py-3"><button type="button" onClick={() => requestSort("assigned")} className="font-black">Assigner</button></th><th className="px-4 py-3">SLA</th><th className="px-4 py-3"><button type="button" onClick={() => requestSort("status")} className="font-black">Status</button></th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-200 bg-white">{isLoading ? <tr><td colSpan={11} className="px-4 py-16 text-center"><Loader2 className="mx-auto mb-3 animate-spin text-blue-600" size={30} /><strong className="block text-sm font-black text-slate-900">Loading ticket data...</strong><span className="mt-1 block text-sm font-semibold text-slate-500">Table UI is ready. Incident records are loading here only.</span></td></tr> : pageRows.length === 0 ? <tr><td colSpan={11} className="px-4 py-16 text-center"><Ticket className="mx-auto mb-3 text-slate-400" size={30} /><strong className="block text-sm font-black text-slate-900">No incident found</strong><span className="mt-1 block text-sm font-semibold text-slate-500">Try reset filter or create a new request.</span></td></tr> : pageRows.map((row, index) => { const id = getIncidentId(row); const sla = getSlaMeta(row, now); return <tr key={id || index} onClick={() => setSelectedIncidentId(id)} className={cx("cursor-pointer align-top transition hover:bg-blue-50/40", selectedIncidentId === id && "bg-blue-50")}><td className="px-4 py-4"><span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-black text-slate-600">{String((page - 1) * PAGE_SIZE + index + 1).padStart(2, "0")}</span></td><td className="px-4 py-4"><strong className="font-black text-slate-900">{id || "—"}</strong></td><td className="px-4 py-4 font-semibold text-slate-600">{formatDate(row.createdAt || row.CreatedAt || row.submittedAt || row.SubmittedAt)}</td><td className="px-4 py-4"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-blue-50 text-xs font-black text-blue-700">{initialText(getRequester(row))}</span><strong className="font-black text-slate-800">{getRequester(row)}</strong></div></td><td className="px-4 py-4"><span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-700"><Monitor size={12} />{getAsset(row)}</span></td><td className="max-w-[22rem] px-4 py-4"><strong className="block font-black text-slate-900">{getTitle(row)}</strong><small className="mt-1 block line-clamp-2 font-semibold text-slate-500">{[row.category, row.subcategory, row.incidentDetail].filter(Boolean).join(" / ") || getDescription(row) || "No classification"}</small></td><td className="px-4 py-4"><span className={cx("rounded-full px-2 py-1 text-xs font-black ring-1", priorityTone(getPriority(row)))}>{getPriority(row)}</span></td><td className="px-4 py-4"><strong className="block font-black text-slate-800">{getAssigned(row)}</strong><small className="font-semibold text-slate-500">{valueOf(row, ["assignedLevel", "AssignedLevel", "supportLevel", "SupportLevel"], "No level")}</small></td><td className="px-4 py-4"><strong className="block font-black text-slate-800">{sla.label}</strong><small className="font-semibold text-slate-500">{sla.detail}</small></td><td className="px-4 py-4"><span className={cx("rounded-full px-2 py-1 text-xs font-black ring-1", statusTone(getStatus(row)))}>{getStatus(row)}</span></td><td className="px-4 py-4 text-right" onClick={(event) => event.stopPropagation()}><div className="inline-flex gap-2"><button type="button" onClick={() => startEdit(row)} className="inline-grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100" title="Edit"><Pencil size={14} /></button><button type="button" onClick={() => deleteIncident(row)} className="inline-grid h-9 w-9 place-items-center rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100" title="Delete"><Trash2 size={14} /></button></div></td></tr>; })}</tbody></table></div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="text-sm font-semibold text-slate-500">Page {page} of {totalPages} • {sortedIncidents.length.toLocaleString()} record(s)</span><div className="flex items-center gap-2"><button type="button" disabled={page === 1} onClick={() => setPage(1)} className="h-9 rounded-xl border border-slate-200 bg-white px-3 font-black text-slate-600 disabled:opacity-40">«</button><button type="button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="h-9 rounded-xl border border-slate-200 bg-white px-3 font-black text-slate-600 disabled:opacity-40">‹</button><span className="grid h-9 min-w-9 place-items-center rounded-xl bg-blue-600 px-3 text-sm font-black text-white">{page}</span><button type="button" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="h-9 rounded-xl border border-slate-200 bg-white px-3 font-black text-slate-600 disabled:opacity-40">›</button><button type="button" disabled={page === totalPages} onClick={() => setPage(totalPages)} className="h-9 rounded-xl border border-slate-200 bg-white px-3 font-black text-slate-600 disabled:opacity-40">»</button></div></div>
              </div>
            </section>
          )}
        </section>
      </div>

      {selectedIncident && viewMode === "list" && <aside className="fixed bottom-4 right-4 top-4 z-40 w-[min(24rem,calc(100vw-2rem))] overflow-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"><div className="mb-4 flex items-start justify-between gap-3"><div><span className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-500">Ticket Detail</span><h3 className="mt-1 text-lg font-black text-slate-950">{getIncidentId(selectedIncident)}</h3></div><button type="button" onClick={() => setSelectedIncidentId("")} className="inline-grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"><X size={15} /></button></div><div className="space-y-3"><div className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><span className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Incident</span><strong className="mt-1 block text-sm font-black text-slate-950">{getTitle(selectedIncident)}</strong><p className="mt-2 text-sm font-semibold text-slate-600">{getDescription(selectedIncident) || "No description"}</p></div>{[["Requester", getRequester(selectedIncident)], ["Asset", getAsset(selectedIncident)], ["Urgency", getPriority(selectedIncident)], ["Assigner", getAssigned(selectedIncident)], ["Status", getStatus(selectedIncident)]].map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2"><span className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">{label}</span><strong className="text-right text-sm font-black text-slate-800">{value}</strong></div>)}<div className="flex gap-2 pt-2"><button type="button" onClick={() => startEdit(selectedIncident)} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-black text-white"><Pencil size={14} /> Edit</button><button type="button" onClick={() => deleteIncident(selectedIncident)} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-rose-50 px-3 text-sm font-black text-rose-700"><Trash2 size={14} /> Delete</button></div></div></aside>}
      {selectedKb && <aside className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4" onClick={() => setSelectedKb(null)}><section className="w-[min(44rem,100%)] rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4"><div><span className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-500">Knowledge Article</span><h3 className="mt-1 text-lg font-black text-slate-950">{valueOf(selectedKb, ["title", "Title"], "Untitled article")}</h3></div><button type="button" onClick={() => setSelectedKb(null)} className="inline-grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-600"><X size={15} /></button></div><div className="grid gap-3 p-4"><div><span className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Incident Details</span><p className="mt-1 text-sm font-semibold text-slate-700">{valueOf(selectedKb, ["incidentDetails", "IncidentDetails", "description", "Description"], "-")}</p></div><div><span className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Resolution</span><p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-slate-700">{valueOf(selectedKb, ["resolution", "Resolution", "solution", "Solution"], "-")}</p></div></div></section></aside>}
    </main>
  );
}
