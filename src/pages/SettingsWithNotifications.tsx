import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Gauge, Pencil, Plus, RefreshCw, Save, Search, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";

import LegacySettings from "./Settings";
import NotificationChannelsSettings from "../components/settings/NotificationChannelsSettings";
import api, { unwrapArray } from "../services/apiClient";

type SettingsView = "settings" | "management" | "notifications";
type ManagementSection = "incident" | "aging" | "pricing" | "policy" | "softwarePolicy";
type Classification = "Legal" | "Illegal";

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

const MANAGEMENT_ITEMS: Array<{ key: ManagementSection; title: string }> = [
  { key: "incident", title: "Incident Config" },
  { key: "pricing", title: "Device Pricing" },
  { key: "aging", title: "Aging PC Rule" },
  { key: "policy", title: "Management Policy" },
  { key: "softwarePolicy", title: "Software Registry" },
];

const INLINE_CSS = `
.management-control-wrapper.settings-management-shell{height:100%;min-height:0;display:grid!important;grid-template-columns:292px minmax(0,1fr)!important;gap:12px!important;overflow:hidden!important;padding:0!important;background:transparent!important;border:0!important}.management-control-sidebar{height:100%;display:flex;flex-direction:column;overflow:hidden;border:1px solid #dbe7fb;border-radius:20px;background:#fff}.management-control-sidebar-head{padding:16px 18px;border-bottom:1px solid #e5edf8}.management-control-sidebar-head span,.sp-chip{display:block;color:#2563eb;font-size:.64rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.management-control-sidebar-head strong{display:block;margin-top:6px;color:#0f2746;font-size:1.02rem;font-weight:900}.management-control-sidebar-head small{display:block;margin-top:4px;color:#64748b;font-size:.72rem;font-weight:700}.management-control-nav-list{flex:1;display:grid;align-content:start;gap:8px;overflow:auto;padding:14px 12px}.management-control-nav-btn{width:100%;min-height:56px;display:grid;grid-template-columns:38px minmax(0,1fr);align-items:center;gap:12px;padding:10px 13px;border:0;border-radius:16px;background:transparent;color:#0f2746;text-align:left;font-weight:900}.management-control-nav-btn.active{color:#fff;background:linear-gradient(135deg,#2563eb,#087ea4)}.management-control-nav-icon{width:38px;height:38px;display:grid;place-items:center;border-radius:13px;color:#2563eb;background:#eef4ff}.management-control-nav-btn.active .management-control-nav-icon{color:#fff;background:rgba(255,255,255,.2)}.management-control-content,.management-legacy-content{min-height:0;height:100%;overflow:hidden}.management-legacy-content>.settings-module-root{height:100%!important;max-height:100%!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}.management-legacy-content .settings-layout{height:100%!important;grid-template-columns:1fr!important;padding:0!important}.management-legacy-content .settings-menu{display:none!important}.management-legacy-content .settings-content{height:100%!important;min-height:0!important}
.software-policy-module{height:100%;min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr);gap:12px;color:#0f2746;overflow:hidden}.software-policy-module *{box-sizing:border-box}.sp-top,.sp-section{border:1px solid #dbe7fb;border-radius:20px;background:#fff;box-shadow:0 14px 30px rgba(15,23,42,.045)}.sp-top{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 18px}.sp-top h2{margin:3px 0;color:#0f2746;font-weight:950;letter-spacing:-.04em}.sp-top p,.sp-help{margin:0;color:#64748b;font-size:.74rem;font-weight:700;line-height:1.45}.sp-btn,.sp-icon,.sp-danger{min-height:40px;display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:12px;font-size:.76rem;font-weight:900;cursor:pointer}.sp-btn.primary{border:0;color:#fff;background:linear-gradient(135deg,#2563eb,#087ea4);padding:0 16px}.sp-btn.secondary{border:1px solid #d7e3f5;background:#fff;color:#2563eb;padding:0 16px}.sp-icon{width:40px;border:1px solid #d7e3f5;background:#fff;color:#2563eb}.sp-danger{width:40px;border:1px solid #fecaca;background:#fff1f2;color:#dc2626}.sp-btn:disabled,.sp-icon:disabled{opacity:.55;cursor:not-allowed}.sp-work{min-height:0;overflow:auto}.sp-section{overflow:hidden}.sp-section-title{padding:12px 14px;border-bottom:1px solid #eef3fb}.sp-section-title strong{display:block;color:#0f2746;font-size:.84rem;font-weight:900}.sp-section-title small{display:block;margin-top:2px;color:#64748b;font-size:.68rem;font-weight:700}.sp-section-body{padding:14px;min-height:0}.sp-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.sp-field{display:grid;gap:6px}.sp-field.full{grid-column:1/-1}.sp-field span{color:#64748b;font-size:.62rem;font-weight:900;text-transform:uppercase}.sp-field input,.sp-field select,.sp-field textarea,.sp-search input{width:100%;min-height:40px;border:1px solid #d7e3f5;border-radius:12px;background:#fff;color:#0f2746;padding:0 12px;font-size:.78rem;font-weight:750;outline:none}.sp-field textarea{min-height:78px;padding:10px;resize:vertical}.sp-action-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:12px}.sp-alert{padding:10px 14px;border-radius:14px;font-size:.74rem;font-weight:850;margin-bottom:12px}.sp-alert.error{color:#991b1b;background:#fef2f2;border:1px solid #fecaca}.sp-alert.success{color:#166534;background:#f0fdf4;border:1px solid #bbf7d0}.sp-alert.info{color:#1d4ed8;background:#eff6ff;border:1px solid #bfdbfe}.sp-policy-table-screen{min-height:0;overflow:auto}.sp-policy-table-card{height:100%;min-height:0}.sp-policy-table-wrap{display:grid;gap:10px;overflow:auto;padding-bottom:4px}.sp-policy-table-row{width:100%;min-width:1040px;min-height:68px;display:grid;grid-template-columns:minmax(220px,1.45fr) minmax(150px,.85fr) 96px 88px 88px 110px 150px 124px;gap:12px;align-items:center;padding:12px 14px;border:1px solid #e5edf8;border-radius:15px;background:#fff;color:#0f2746;text-align:left}.sp-policy-table-row.head{min-height:42px;background:#f3f7fc;color:#64748b;font-size:.62rem;font-weight:900;text-transform:uppercase}.sp-policy-table-row strong,.sp-policy-table-row small{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sp-policy-table-row small{margin-top:3px;color:#64748b;font-size:.66rem;font-weight:750}.sp-policy-table-row:not(.head):hover{border-color:#bfdbfe;background:#f8fbff}.sp-policy-table-actions{display:flex;justify-content:flex-end;gap:6px}.sp-policy-table-actions .sp-icon,.sp-policy-table-actions .sp-danger{width:34px;min-height:34px;border-radius:10px}.sp-badge{display:inline-flex;justify-content:center;align-items:center;min-height:24px;border-radius:999px;padding:0 8px;font-size:.62rem;font-weight:900}.sp-badge.legal{color:#166534;background:#dcfce7}.sp-badge.illegal{color:#991b1b;background:#fee2e2}.sp-empty{min-height:132px;display:grid;place-items:center;color:#64748b;font-size:.8rem;font-weight:800;text-align:center;padding:18px}.sp-policy-modal-backdrop{position:fixed;inset:0;z-index:3000;display:grid;place-items:center;padding:24px;background:rgba(15,23,42,.46);backdrop-filter:blur(6px)}.sp-policy-modal{width:min(1180px,calc(100vw - 56px));height:min(90vh,920px);display:grid;grid-template-rows:auto minmax(0,1fr);border:1px solid #dbe7fb;border-radius:24px;background:#f8fbff;box-shadow:0 30px 80px rgba(15,23,42,.32);overflow:hidden}.sp-policy-modal-head{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:16px 18px;border-bottom:1px solid #dbe7fb;background:#fff}.sp-policy-modal-head strong{display:block;color:#0f2746;font-size:1rem;font-weight:950}.sp-policy-modal-head small{display:block;margin-top:3px;color:#64748b;font-size:.72rem;font-weight:750}.sp-top-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap}.sp-policy-modal-body{min-height:0;overflow:auto;padding:16px;display:grid;gap:12px}.sp-story{padding:10px 12px;border:1px solid #bfdbfe;border-radius:14px;background:#eff6ff;color:#1d4ed8;font-size:.72rem;font-weight:900}.sp-flow-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.sp-flow-tabs span{min-height:44px;display:flex;align-items:center;gap:8px;border:1px solid #dbe7fb;border-radius:14px;background:#fff;padding:0 12px;color:#64748b;font-size:.7rem;font-weight:900}.sp-flow-tabs b{width:22px;height:22px;display:grid;place-items:center;border-radius:999px;background:#eff6ff;color:#2563eb;font-size:.68rem}.sp-map-panel{margin-top:12px;border:1px solid #dbe7fb;border-radius:16px;background:#f8fbff;overflow:hidden}.sp-map-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:12px;border-bottom:1px solid #e5edf8}.sp-map-panel-head strong{display:block;font-size:.82rem;font-weight:950;color:#0f2746}.sp-map-panel-head small{display:block;margin-top:2px;color:#64748b;font-size:.68rem;font-weight:740}.sp-search{min-height:40px;display:flex;align-items:center;gap:8px;border:1px solid #d7e3f5;border-radius:12px;padding:0 11px;background:#fff;color:#64748b;min-width:260px}.sp-search input{min-height:0;border:0;padding:0}.sp-table{min-height:220px;max-height:330px;overflow:auto;background:#fff}.sp-row{min-height:56px;display:grid;grid-template-columns:42px minmax(240px,1.3fr) minmax(145px,.7fr) 86px;gap:12px;align-items:center;padding:0 14px;border-bottom:1px solid #edf2f7;font-size:.74rem;font-weight:740}.sp-row.head{position:sticky;top:0;z-index:2;min-height:42px;background:#f3f7fc;color:#64748b;font-size:.62rem;font-weight:900;text-transform:uppercase}.sp-row.selected{background:#eff6ff}.sp-row strong,.sp-row small{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis}.sp-row strong{color:#0f2746}.sp-row small{color:#64748b;font-size:.64rem;white-space:nowrap}.sp-selected-box{margin-top:10px;padding:10px 12px;border:1px solid #bfdbfe;border-radius:15px;background:#eff6ff;color:#1d4ed8;font-size:.76rem;font-weight:850}.sp-selected-box.warning{border-color:#fde68a;background:#fffbeb;color:#92400e}.sp-class-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.sp-class-btn{min-height:70px;padding:12px;border:1px solid #d7e3f5;border-radius:16px;background:#fff;color:#0f2746;text-align:left;font-weight:900}.sp-class-btn.active.legal{border-color:#bbf7d0;background:#f0fdf4;color:#166534}.sp-class-btn.active.illegal{border-color:#fecaca;background:#fef2f2;color:#991b1b}.sp-cost-grid{display:grid;grid-template-columns:1fr .42fr 1fr 1fr;gap:10px}.sp-usage-note{margin-top:10px;padding:11px 12px;border-radius:14px;background:#f8fafc;border:1px dashed #cbd5e1;color:#475569;font-size:.72rem;font-weight:800}.sp-register-stack{display:grid;gap:12px}@media(max-width:1280px){.management-control-wrapper.settings-management-shell,.sp-form-grid,.sp-cost-grid,.sp-flow-tabs{grid-template-columns:1fr!important}.sp-row{grid-template-columns:42px 1fr}.sp-row.head{display:none}.sp-map-panel-head{display:grid}.sp-search{min-width:0}}
`;

function readInitialView(): SettingsView {
  if (typeof window === "undefined") return "settings";
  const hash = String(window.location.hash || "").toLowerCase();
  const query = new URLSearchParams(window.location.search);
  const tab = String(query.get("tab") || "").toLowerCase();
  if (hash.includes("notification") || tab.includes("notification")) return "notifications";
  if (hash.includes("management") || tab.includes("management")) return "management";
  return "settings";
}

function readManagementSection(): ManagementSection {
  if (typeof window === "undefined") return "incident";
  const text = `${new URLSearchParams(window.location.search).get("section") || ""} ${window.location.hash || ""}`.toLowerCase();
  if (text.includes("software-registry") || text.includes("software-policy") || text.includes("softwarepolicy")) return "softwarePolicy";
  if (text.includes("pricing")) return "pricing";
  if (text.includes("aging")) return "aging";
  if (text.includes("policy")) return "policy";
  if (text.includes("incident")) return "incident";
  return "incident";
}

function getManagementHash(section: ManagementSection) {
  return section === "softwarePolicy" ? "#management-control-software-registry" : `#management-control-${section}`;
}

function getCategoryName(categories: CategoryRow[], categoryId: string) {
  return categories.find((category) => String(category.CategoryID) === String(categoryId))?.CategoryName || "";
}

function pickErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function normalizeTime(value?: string) {
  return String(value || "").slice(0, 5) || "-";
}

function getSoftwareKey(row: SoftwareRow) {
  return `${row.SWUNI_Idn ?? row.SoftwareID ?? row.SoftwareName}-${row.Publisher || ""}-${row.Version || ""}`;
}

function dateOnly(value?: string) {
  return value ? String(value).slice(0, 10) : "";
}

function formatMoney(value: number, currency = "RM") {
  if (!Number.isFinite(value) || value <= 0) return "-";
  return `${currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
      const payload = await api.get(`${API_ROOT}/publishers`, { params: { categoryId }, forceRefresh: true });
      setPublishers(unwrapArray<PublisherRow>(payload));
    } catch {
      setPublishers([]);
    }
  }, []);

  const loadSoftwareRows = useCallback(async () => {
    const categoryId = ruleForm.categoryId;
    if (!categoryId || categoryId === "__other__") {
      setSoftwareRows([]);
      return;
    }

    setSoftwareLoading(true);
    try {
      const payload = await api.get(`${API_ROOT}/software`, {
        params: {
          categoryId,
          publisher: ruleForm.publisher,
          search: softwareSearch,
        },
        forceRefresh: true,
      });
      setSoftwareRows(unwrapArray<SoftwareRow>(payload));
    } catch (error) {
      setMessage({ type: "error", text: pickErrorMessage(error, "Failed to load software list.") });
      setSoftwareRows([]);
    } finally {
      setSoftwareLoading(false);
    }
  }, [ruleForm.categoryId, ruleForm.publisher, softwareSearch]);

  useEffect(() => { void loadBase(); }, [loadBase]);

  useEffect(() => {
    void loadPublishers(ruleForm.categoryId);
    setSelectedSoftware(null);
    setSoftwareRows([]);
    if (ruleForm.categoryId !== "__other__") setCustomCategoryName("");
  }, [loadPublishers, ruleForm.categoryId]);

  useEffect(() => {
    if (uiMode !== "form") return;
    const timer = window.setTimeout(() => { void loadSoftwareRows(); }, 250);
    return () => window.clearTimeout(timer);
  }, [loadSoftwareRows, uiMode]);

  useEffect(() => {
    if (activePolicyId) void loadPolicyItems(activePolicyId);
    else setPolicyItems([]);
  }, [activePolicyId, loadPolicyItems]);

  const resetForm = () => {
    setRuleForm(EMPTY_RULE);
    setSoftwareForm(EMPTY_SOFTWARE_FORM);
    setSoftwareSearch("");
    setSoftwareRows([]);
    setPolicyItems([]);
    setSelectedSoftware(null);
    setActivePolicyId(null);
    setCustomCategoryName("");
    setSubSoftwareName("");
    setMessage(null);
  };

  const editPolicy = async (policy: PolicyRow) => {
    setActivePolicyId(policy.PolicyID);
    setRuleForm({
      policyName: policy.PolicyName || "",
      description: policy.Description || "",
      categoryId: policy.CategoryID ? String(policy.CategoryID) : "",
      publisher: "",
      workingStartTime: normalizeTime(policy.WorkingStartTime) === "-" ? "09:00" : normalizeTime(policy.WorkingStartTime),
      workingEndTime: normalizeTime(policy.WorkingEndTime) === "-" ? "17:00" : normalizeTime(policy.WorkingEndTime),
      utilizedHours: String(policy.UtilizedHours ?? 2),
      underUtilizedHours: String(policy.UnderUtilizedHours ?? 1),
      notUsedHours: "0",
      openCountThreshold: String(policy.OpenCountThreshold ?? 1),
    });
    setSoftwareForm(EMPTY_SOFTWARE_FORM);
    setSelectedSoftware(null);
    setSubSoftwareName("");
    setUiMode("form");
    setMessage({ type: "info", text: `Editing ${policy.PolicyName}. Existing registered item is shown below after loading.` });
    try {
      const payload = await api.get(`${API_ROOT}/policies/${policy.PolicyID}/items`, { forceRefresh: true });
      const item = unwrapArray<PolicyItem>(payload)[0];
      if (item) {
        setPolicyItems([item]);
        setSelectedSoftware(item);
        setSoftwareForm({
          classification: item.Classification || item.ComplianceStatus || "Legal",
          licenseCount: item.LicenseCount ? String(item.LicenseCount) : "",
          licenseKey: item.LicenseKey || "",
          licenseStartDate: dateOnly(item.LicenseStartDate),
          licenseEndDate: dateOnly(item.LicenseEndDate),
          unitPrice: item.UnitPrice ? String(item.UnitPrice) : "",
          currency: item.Currency || "RM",
        });
      }
    } catch {
      setPolicyItems([]);
    }
  };

  const deletePolicy = async (policy: PolicyRow) => {
    if (!window.confirm(`Delete ${policy.PolicyName}?`)) return;
    setSaving(true);
    try {
      await api.delete(`${API_ROOT}/policies/${policy.PolicyID}`);
      setMessage({ type: "success", text: `${policy.PolicyName} has been deleted.` });
      resetForm();
      await loadPolicies();
    } catch (error) {
      setMessage({ type: "error", text: pickErrorMessage(error, "Failed to delete software registry policy.") });
    } finally {
      setSaving(false);
    }
  };

  const savePolicy = async () => {
    const policyName = ruleForm.policyName.trim();
    if (!policyName) {
      setMessage({ type: "error", text: "Enter policy name first." });
      return;
    }

    if (!currentCategoryName) {
      setMessage({ type: "error", text: "Select or enter software category first." });
      return;
    }

    if (!resolvedRegistrySoftware) {
      setMessage({ type: "error", text: "Select or register software first." });
      return;
    }

    if (softwareForm.classification === "Legal" && (!softwareForm.licenseCount || Number(softwareForm.licenseCount) <= 0)) {
      setMessage({ type: "error", text: "Legal software requires license count." });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        policyId: activePolicyId,
        policyName,
        description: ruleForm.description,
        categoryId: ruleForm.categoryId === "__other__" ? null : Number(ruleForm.categoryId) || null,
        categoryName: currentCategoryName,
        publisher: ruleForm.publisher,
        workingStartTime: ruleForm.workingStartTime,
        workingEndTime: ruleForm.workingEndTime,
        workDays: "Mon,Tue,Wed,Thu,Fri",
        utilizedHours: Number(ruleForm.utilizedHours || 0),
        underUtilizedHours: Number(ruleForm.underUtilizedHours || 0),
        notUsedHours: Number(ruleForm.notUsedHours || 0),
        openCountThreshold: Number(ruleForm.openCountThreshold || 0),
        software: {
          swuniIdn: resolvedRegistrySoftware.SWUNI_Idn ?? null,
          softwareId: resolvedRegistrySoftware.SoftwareID || null,
          softwareName: resolvedRegistrySoftware.SoftwareName,
          categoryId: resolvedRegistrySoftware.CategoryID ?? (ruleForm.categoryId === "__other__" ? null : Number(ruleForm.categoryId) || null),
          categoryName: resolvedRegistrySoftware.CategoryName || currentCategoryName,
          publisher: resolvedRegistrySoftware.Publisher || ruleForm.publisher,
          version: resolvedRegistrySoftware.Version || subSoftwareName.trim() || null,
          classification: softwareForm.classification,
          licenseKey: softwareForm.licenseKey,
          licenseCount: Number(softwareForm.licenseCount || 0),
          licenseStartDate: softwareForm.licenseStartDate || null,
          licenseEndDate: softwareForm.licenseEndDate || null,
          unitPrice: Number(softwareForm.unitPrice || 0),
          currency: softwareForm.currency || "RM",
        },
      };

      const saved = activePolicyId
        ? await api.put(`${API_ROOT}/policies/${activePolicyId}`, payload)
        : await api.post(`${API_ROOT}/policies`, payload);
      const savedRows = unwrapArray<PolicyRow>(saved);
      const savedPolicy = savedRows[0] || (saved as PolicyRow);
      const nextId = Number(savedPolicy?.PolicyID || activePolicyId || 0) || null;
      setMessage({ type: "success", text: `${policyName} has been saved.` });
      await loadPolicies();
      if (nextId) {
        setActivePolicyId(nextId);
        await loadPolicyItems(nextId);
      }
      setUiMode("list");
    } catch (error) {
      setMessage({ type: "error", text: pickErrorMessage(error, "Failed to save software registry policy.") });
    } finally {
      setSaving(false);
    }
  };

  const openNewPolicy = () => {
    resetForm();
    setUiMode("form");
    setMessage({ type: "info", text: "Create software registry rule, then classify the selected software." });
  };

  const registerManualSoftware = () => {
    if (!ruleForm.policyName.trim()) {
      setMessage({ type: "error", text: "Enter software or policy name before registering manually." });
      return;
    }
    setSelectedSoftware(null);
    setSoftwareRows([]);
    setMessage({ type: "info", text: "Manual software registration will use the policy name and optional edition text." });
  };

  const summary = useMemo(() => {
    const legal = policies.reduce((total, row) => total + Number(row.LegalCount || 0), 0);
    const illegal = policies.reduce((total, row) => total + Number(row.IllegalCount || 0), 0);
    const items = policies.reduce((total, row) => total + Number(row.TotalItems || 0), 0);
    return { legal, illegal, items };
  }, [policies]);

  return (
    <section className="software-policy-module">
      <div className="sp-top">
        <div>
          <span className="sp-chip">Software Registry</span>
          <h2>Software Policy Setting</h2>
          <p>Register software, classify Legal or Illegal, setup license and utilization rule.</p>
        </div>
        <div className="sp-top-actions">
          <button type="button" className="sp-btn secondary" onClick={() => void loadBase()} disabled={loading || saving}><RefreshCw size={16} /> Refresh</button>
          <button type="button" className="sp-btn primary" onClick={openNewPolicy}><Plus size={16} /> Add Policy</button>
        </div>
      </div>

      <main className="sp-work">
        {message && <div className={`sp-alert ${message.type}`}>{message.text}</div>}
        {uiMode === "list" ? (
          <section className="sp-section sp-policy-table-card">
            <div className="sp-section-title">
              <strong>Registered Software Policies</strong>
              <small>{loading ? "Loading..." : `${policies.length} policy records · Legal ${summary.legal} · Illegal ${summary.illegal} · Items ${summary.items}`}</small>
            </div>
            <div className="sp-section-body sp-policy-table-screen">
              <div className="sp-policy-table-wrap">
                <div className="sp-policy-table-row head">
                  <span>Policy / Software</span><span>Category</span><span>Legal</span><span>Illegal</span><span>Items</span><span>License</span><span>Working Rule</span><span>Action</span>
                </div>
                {!policies.length && <div className="sp-empty">No software policy record yet. Click Add Policy to register software.</div>}
                {policies.map((policy) => (
                  <button type="button" className="sp-policy-table-row" key={policy.PolicyID} onClick={() => void editPolicy(policy)}>
                    <span><strong>{policy.PolicyName}</strong><small>{policy.Description || "No note"}</small></span>
                    <span><strong>{policy.CategoryName || "-"}</strong><small>Updated {dateOnly(policy.UpdatedAt || policy.CreatedAt) || "-"}</small></span>
                    <span><b className="sp-badge legal">{Number(policy.LegalCount || 0)}</b></span>
                    <span><b className="sp-badge illegal">{Number(policy.IllegalCount || 0)}</b></span>
                    <span>{Number(policy.TotalItems || 0)}</span>
                    <span>{Number(policy.LicenseTotal || 0)}</span>
                    <span><strong>{normalizeTime(policy.WorkingStartTime)} - {normalizeTime(policy.WorkingEndTime)}</strong><small>Utilized ≥ {policy.UtilizedHours ?? 0}h</small></span>
                    <span className="sp-policy-table-actions">
                      <button type="button" className="sp-icon" title="Edit" onClick={(e) => { e.stopPropagation(); void editPolicy(policy); }}><Pencil size={15} /></button>
                      <button type="button" className="sp-danger" title="Delete" onClick={(e) => { e.stopPropagation(); void deletePolicy(policy); }}><Trash2 size={15} /></button>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <div className="sp-policy-modal-backdrop">
            <div className="sp-policy-modal">
              <div className="sp-policy-modal-head">
                <div><strong>{activePolicyId ? "Update Software Policy" : "Add Software Policy"}</strong><small>Complete policy setup, choose software and license classification.</small></div>
                <div className="sp-top-actions"><button type="button" className="sp-btn secondary" onClick={() => setUiMode("list")}>Cancel</button><button type="button" className="sp-btn primary" onClick={() => void savePolicy()} disabled={saving}><Save size={16} /> {saving ? "Saving..." : "Save Policy"}</button></div>
              </div>

              <div className="sp-policy-modal-body">
                <div className="sp-flow-tabs"><span><b>1</b> Policy</span><span><b>2</b> Category</span><span><b>3</b> Software</span><span><b>4</b> License</span></div>
                <div className="sp-story">Register one policy at a time. Legal software requires license count and expiry date. Illegal software can be saved without license value.</div>

                <div className="sp-register-stack">
                  <section className="sp-section">
                    <div className="sp-section-title"><strong>Policy Information</strong><small>Policy name will be used as software registry title.</small></div>
                    <div className="sp-section-body">
                      <div className="sp-form-grid">
                        <label className="sp-field"><span>Policy / Software name</span><input value={ruleForm.policyName} onChange={(e) => setRuleForm((c) => ({ ...c, policyName: e.target.value }))} placeholder="Example: Microsoft Office" /></label>
                        <label className="sp-field"><span>Publisher</span><input value={ruleForm.publisher} onChange={(e) => setRuleForm((c) => ({ ...c, publisher: e.target.value }))} list="sp-publishers" placeholder="Example: Microsoft" /></label>
                        <datalist id="sp-publishers">{publishers.map((item) => <option key={item.Publisher} value={item.Publisher} />)}</datalist>
                        <label className="sp-field"><span>Category</span><select value={ruleForm.categoryId} onChange={(e) => setRuleForm((c) => ({ ...c, categoryId: e.target.value }))}><option value="">Select category</option>{categories.map((category) => <option key={category.CategoryID} value={category.CategoryID}>{category.CategoryName}</option>)}<option value="__other__">Others / Manual Category</option></select></label>
                        {ruleForm.categoryId === "__other__" && <label className="sp-field"><span>Manual category</span><input value={customCategoryName} onChange={(e) => setCustomCategoryName(e.target.value)} placeholder="Enter category name" /></label>}
                        <label className="sp-field"><span>Sub software / edition</span><input value={subSoftwareName} onChange={(e) => setSubSoftwareName(e.target.value)} placeholder="Example: Visio, Project, ProPlus" /></label>
                      </div>

                      <div className="sp-map-panel">
                        <div className="sp-map-panel-head">
                          <div><strong>Map Existing Software</strong><small>Pick from discovered software list or register manual software using policy name.</small></div>
                          <label className="sp-search"><Search size={15} /><input value={softwareSearch} onChange={(e) => setSoftwareSearch(e.target.value)} placeholder="Search software..." /></label>
                        </div>
                        <div className="sp-table">
                          <div className="sp-row head"><span></span><span>Software</span><span>Publisher</span><span>Installed</span></div>
                          {softwareLoading && <div className="sp-empty">Loading software...</div>}
                          {!softwareLoading && !softwareRows.length && <div className="sp-empty">No mapped software found. You can still register manually.</div>}
                          {softwareRows.map((software) => {
                            const key = getSoftwareKey(software);
                            return (
                              <button type="button" className={`sp-row ${selectedSoftwareKey === key ? "selected" : ""}`} key={key} onClick={() => setSelectedSoftware(software)}>
                                <span>{selectedSoftwareKey === key ? <ShieldCheck size={18} /> : <Eye size={18} />}</span>
                                <span><strong>{software.SoftwareName}</strong><small>{software.CategoryName || currentCategoryName || "-"} {software.Version ? `· ${software.Version}` : ""}</small></span>
                                <span>{software.Publisher || "-"}</span>
                                <span>{software.InstalledCount ?? software.InstalledDeviceCount ?? 0}</span>
                              </button>
                            );
                          })}
                        </div>
                        <div className={`sp-selected-box ${resolvedRegistrySoftware ? "" : "warning"}`}>
                          {resolvedRegistrySoftware ? `Selected: ${resolvedRegistrySoftware.SoftwareName} · ${resolvedRegistrySoftware.Publisher || ruleForm.publisher || "No publisher"}` : "No software selected yet. Choose existing software or register manually."}
                        </div>
                        <div className="sp-action-row"><button type="button" className="sp-btn secondary" onClick={registerManualSoftware}><Plus size={15} /> Register Manual Software</button><button type="button" className="sp-btn secondary" onClick={() => void loadSoftwareRows()} disabled={!ruleForm.categoryId || softwareLoading}><RefreshCw size={15} /> Reload Software</button></div>
                      </div>
                    </div>
                  </section>

                  <section className="sp-section">
                    <div className="sp-section-title"><strong>Classification & License</strong><small>Classify selected software and define license cost tracking.</small></div>
                    <div className="sp-section-body">
                      <div className="sp-class-grid">
                        <button type="button" className={`sp-class-btn legal ${softwareForm.classification === "Legal" ? "active" : ""}`} onClick={() => setSoftwareForm((c) => ({ ...c, classification: "Legal" }))}><ShieldCheck size={18} /> Legal Software</button>
                        <button type="button" className={`sp-class-btn illegal ${softwareForm.classification === "Illegal" ? "active" : ""}`} onClick={() => setSoftwareForm((c) => ({ ...c, classification: "Illegal" }))}><ShieldAlert size={18} /> Illegal Software</button>
                      </div>
                      <div className="sp-cost-grid" style={{ marginTop: 12 }}>
                        <label className="sp-field"><span>License count</span><input type="number" min="0" value={softwareForm.licenseCount} onChange={(e) => setSoftwareForm((c) => ({ ...c, licenseCount: e.target.value }))} /></label>
                        <label className="sp-field"><span>Currency</span><input value={softwareForm.currency} onChange={(e) => setSoftwareForm((c) => ({ ...c, currency: e.target.value }))} /></label>
                        <label className="sp-field"><span>Unit price</span><input type="number" min="0" step="0.01" value={softwareForm.unitPrice} onChange={(e) => setSoftwareForm((c) => ({ ...c, unitPrice: e.target.value }))} /></label>
                        <label className="sp-field"><span>Total cost</span><input readOnly value={formatMoney(licenseTotalCost, softwareForm.currency)} /></label>
                        <label className="sp-field"><span>License key</span><input value={softwareForm.licenseKey} onChange={(e) => setSoftwareForm((c) => ({ ...c, licenseKey: e.target.value }))} /></label>
                        <label className="sp-field"><span>Start date</span><input type="date" value={softwareForm.licenseStartDate} onChange={(e) => setSoftwareForm((c) => ({ ...c, licenseStartDate: e.target.value }))} /></label>
                        <label className="sp-field"><span>Expiry date</span><input type="date" value={softwareForm.licenseEndDate} onChange={(e) => setSoftwareForm((c) => ({ ...c, licenseEndDate: e.target.value }))} /></label>
                      </div>
                    </div>
                  </section>

                  <section className="sp-section">
                    <div className="sp-section-title"><strong>Utilization Rule</strong><small>Used by Software ROI dashboard: utilized, underutilized and not used.</small></div>
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

export default function SettingsWithNotifications() {
  const [view, setView] = useState<SettingsView>(readInitialView);
  const [managementSection, setManagementSection] = useState<ManagementSection>(readManagementSection);

  useEffect(() => {
    document.documentElement.classList.add("ema-settings-page-active");
    document.body.classList.add("ema-settings-page-active");
    return () => {
      document.documentElement.classList.remove("ema-settings-page-active");
      document.body.classList.remove("ema-settings-page-active");
    };
  }, []);

  useEffect(() => {
    document.body.dataset.settingsView = view;
    document.documentElement.dataset.settingsView = view;
    return () => {
      if (document.body.dataset.settingsView === view) delete document.body.dataset.settingsView;
      if (document.documentElement.dataset.settingsView === view) delete document.documentElement.dataset.settingsView;
    };
  }, [view]);

  useEffect(() => {
    const onHashChange = () => {
      setView(readInitialView());
      setManagementSection(readManagementSection());
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (view !== "management" || managementSection === "softwarePolicy") return;
    const timer = window.setTimeout(() => {
      const target = document.querySelector<HTMLButtonElement>(`.management-legacy-content .setting-btn[data-section="${managementSection}"]`);
      target?.click();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [view, managementSection]);

  const switchView = (next: SettingsView) => {
    setView(next);
    if (typeof window !== "undefined") {
      const hash = next === "notifications" ? "#notifications" : next === "management" ? getManagementHash(managementSection) : "";
      window.history.replaceState(null, "", `${window.location.pathname}${hash}`);
    }
  };

  const switchManagementSection = (next: ManagementSection) => {
    setView("management");
    setManagementSection(next);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `${window.location.pathname}${getManagementHash(next)}`);
    }
  };

  return (
    <div className={`settings-with-notifications settings-view-${view}`} data-settings-view={view}>
      <style>{INLINE_CSS}</style>
      <div className="settings-notification-page-tabs">
        <button className={`notification-tab ${view === "settings" ? "active" : ""}`} onClick={() => switchView("settings")}>Settings Console</button>
        <button className={`notification-tab ${view === "management" ? "active" : ""}`} onClick={() => switchView("management")}>Management Control</button>
        <button className={`notification-tab ${view === "notifications" ? "active" : ""}`} onClick={() => switchView("notifications")}>Notification Channels</button>
      </div>

      <div className="settings-view-host">
        {view === "notifications" ? (
          <NotificationChannelsSettings />
        ) : view === "management" ? (
          <div className="management-control-wrapper settings-management-shell" data-management-section={managementSection}>
            <aside className="management-control-sidebar">
              <div className="management-control-sidebar-head">
                <span>Settings Center</span>
                <strong>Configuration Area</strong>
                <small>Select system setup domain</small>
              </div>
              <div className="management-control-nav-list">
                {MANAGEMENT_ITEMS.map((item) => (
                  <button key={item.key} type="button" className={`management-control-nav-btn ${managementSection === item.key ? "active" : ""}`} onClick={() => switchManagementSection(item.key)} data-section={item.key}>
                    <span className="management-control-nav-icon"><Gauge size={17} /></span>
                    <span>{item.title}</span>
                  </button>
                ))}
              </div>
            </aside>
            <main className="management-control-content">
              {managementSection === "softwarePolicy" ? <SoftwareRegistryManagement /> : <div className="management-legacy-content"><LegacySettings key={`management-${managementSection}`} /></div>}
            </main>
          </div>
        ) : (
          <LegacySettings />
        )}
      </div>
    </div>
  );
}
