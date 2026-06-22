import { useEffect, useMemo, useState } from "react";
import {
  assignSoftwarePolicy,
  createSoftwarePolicy,
  createSoftwarePolicyPurchase,
  deleteSoftwarePolicy,
  getSoftwarePolicyAssignments,
  getSoftwarePolicyBundle,
  getSoftwarePolicyCompliance,
  getSoftwarePolicyPurchases,
  getSoftwarePolicyRoi,
  getSoftwarePolicyUsage,
  resolveSoftwarePolicyCompliance,
  updateSoftwarePolicy,
  updateSoftwarePolicyUsage,
  type SoftwarePolicy,
  type SoftwarePolicyAssignment,
  type SoftwarePolicyCompliance,
  type SoftwarePolicyPurchase,
  type SoftwarePolicyRoi,
  type SoftwarePolicyUsage,
} from "../../services/softwarePolicyService";

type TabKey = "policies" | "roi" | "compliance" | "assignments";
type NoticeTone = "success" | "error" | "info";

type Notice = {
  tone: NoticeTone;
  text: string;
} | null;

const EMPTY_POLICY: SoftwarePolicy = {
  PolicyName: "",
  Category: "",
  LicenseKey: "",
  TotalLicenses: 0,
  StartDate: "",
  EndDate: "",
  LocationType: "OnPrem",
  Remarks: "",
  IsActive: 1,
};

const EMPTY_PURCHASE: SoftwarePolicyPurchase = {
  PurchaseDate: new Date().toISOString().slice(0, 10),
  Quantity: 1,
  UnitPrice: 0,
  Vendor: "",
  InvoiceNumber: "",
  Remarks: "",
};

const TARGET_TYPES = [
  { value: 1, label: "Department" },
  { value: 2, label: "Device" },
  { value: 3, label: "User" },
];

function boolValue(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return ["true", "1", "yes", "on", "active"].includes(value.toLowerCase());
  return fallback;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  return parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown) {
  return `RM ${numberValue(value).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusText(policy: SoftwarePolicy) {
  return boolValue(policy.IsActive, true) ? "Active" : "Inactive";
}

function targetLabel(type?: number) {
  return TARGET_TYPES.find((row) => row.value === Number(type))?.label || "Target";
}

function readError(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error || "Request failed");
}

function cleanPolicy(row: SoftwarePolicy): SoftwarePolicy {
  return {
    ...row,
    PolicyID: row.PolicyID ? Number(row.PolicyID) : undefined,
    PolicyName: String(row.PolicyName || "").trim(),
    Category: String(row.Category || "").trim(),
    LicenseKey: String(row.LicenseKey || "").trim(),
    TotalLicenses: Number(row.TotalLicenses || 0),
    StartDate: row.StartDate ? String(row.StartDate).slice(0, 10) : "",
    EndDate: row.EndDate ? String(row.EndDate).slice(0, 10) : "",
    LocationType: row.LocationType || "OnPrem",
    Remarks: String(row.Remarks || "").trim(),
    IsActive: boolValue(row.IsActive, true) ? 1 : 0,
  };
}

function Select({ value, options, onChange, label }: { value: string; options: string[]; onChange: (value: string) => void; label: string }) {
  return (
    <label className="software-policy-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function TextInput({ label, value, placeholder, type = "text", onChange }: { label: string; value: string | number; placeholder?: string; type?: string; onChange: (value: string) => void }) {
  return (
    <label className="software-policy-field">
      <span>{label}</span>
      <input type={type} value={value ?? ""} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export default function SoftwarePolicyManagement() {
  const [tab, setTab] = useState<TabKey>("policies");
  const [policies, setPolicies] = useState<SoftwarePolicy[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [locationTypes, setLocationTypes] = useState<string[]>(["Cloud", "OnPrem", "Hybrid"]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<SoftwarePolicy>(EMPTY_POLICY);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("true");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const [usageRows, setUsageRows] = useState<SoftwarePolicyUsage[]>([]);
  const [complianceRows, setComplianceRows] = useState<SoftwarePolicyCompliance[]>([]);
  const [assignmentRows, setAssignmentRows] = useState<SoftwarePolicyAssignment[]>([]);
  const [purchaseRows, setPurchaseRows] = useState<SoftwarePolicyPurchase[]>([]);
  const [roi, setRoi] = useState<SoftwarePolicyRoi | null>(null);
  const [purchaseDraft, setPurchaseDraft] = useState<SoftwarePolicyPurchase>(EMPTY_PURCHASE);
  const [assignType, setAssignType] = useState(1);
  const [assignTargetId, setAssignTargetId] = useState("");
  const [usageStart, setUsageStart] = useState("");
  const [usageEnd, setUsageEnd] = useState("");

  const selectedPolicy = useMemo(() => policies.find((policy) => Number(policy.PolicyID) === selectedId) || null, [policies, selectedId]);
  const activePolicies = useMemo(() => policies.filter((policy) => boolValue(policy.IsActive, true)).length, [policies]);
  const totalLicenses = useMemo(() => policies.reduce((sum, policy) => sum + numberValue(policy.TotalLicenses), 0), [policies]);
  const openCompliance = useMemo(() => complianceRows.filter((row) => !boolValue(row.IsResolved, false)).length, [complianceRows]);

  const setDraftField = (patch: Partial<SoftwarePolicy>) => setDraft((current) => ({ ...current, ...patch }));

  const loadPolicies = async () => {
    setLoading(true);
    setNotice(null);
    try {
      const bundle = await getSoftwarePolicyBundle(search, categoryFilter, statusFilter);
      setPolicies(bundle.policies);
      setCategories(bundle.categories);
      setLocationTypes(bundle.locationTypes);
      const nextSelected = selectedId && bundle.policies.some((policy) => Number(policy.PolicyID) === selectedId)
        ? selectedId
        : Number(bundle.policies[0]?.PolicyID || 0) || null;
      setSelectedId(nextSelected);
      if (nextSelected) {
        const selected = bundle.policies.find((policy) => Number(policy.PolicyID) === nextSelected);
        if (selected) setDraft(cleanPolicy(selected));
      } else {
        setDraft(EMPTY_POLICY);
      }
    } catch (error) {
      setNotice({ tone: "error", text: readError(error) });
    } finally {
      setLoading(false);
    }
  };

  const loadDetails = async (policyId: number) => {
    try {
      const [usage, compliance, assignments, purchases, roiData] = await Promise.all([
        getSoftwarePolicyUsage(policyId).catch(() => []),
        getSoftwarePolicyCompliance(policyId).catch(() => []),
        getSoftwarePolicyAssignments(policyId).catch(() => []),
        getSoftwarePolicyPurchases(policyId).catch(() => []),
        getSoftwarePolicyRoi(policyId).catch(() => null),
      ]);
      setUsageRows(usage);
      setComplianceRows(compliance);
      setAssignmentRows(assignments);
      setPurchaseRows(purchases);
      setRoi(roiData);
    } catch {
      // Individual requests already fallback so this should be rare.
    }
  };

  useEffect(() => { void loadPolicies(); }, []);

  useEffect(() => {
    if (!selectedId) return;
    void loadDetails(selectedId);
  }, [selectedId]);

  const selectPolicy = (policy: SoftwarePolicy) => {
    const id = Number(policy.PolicyID || 0);
    setSelectedId(id || null);
    setDraft(cleanPolicy(policy));
  };

  const startNewPolicy = () => {
    setSelectedId(null);
    setDraft(EMPTY_POLICY);
    setTab("policies");
    setNotice({ tone: "info", text: "New policy draft ready." });
  };

  const savePolicy = async () => {
    if (!String(draft.PolicyName || "").trim()) {
      setNotice({ tone: "error", text: "Policy name is required." });
      return;
    }
    setSaving(true);
    try {
      const saved = selectedId ? await updateSoftwarePolicy(selectedId, draft) : await createSoftwarePolicy(draft);
      setNotice({ tone: "success", text: selectedId ? "Software policy updated." : "Software policy created." });
      setSelectedId(Number(saved.PolicyID || selectedId || 0) || null);
      await loadPolicies();
    } catch (error) {
      setNotice({ tone: "error", text: readError(error) });
    } finally {
      setSaving(false);
    }
  };

  const deactivatePolicy = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await deleteSoftwarePolicy(selectedId, false);
      setNotice({ tone: "success", text: "Software policy deactivated." });
      await loadPolicies();
    } catch (error) {
      setNotice({ tone: "error", text: readError(error) });
    } finally {
      setSaving(false);
    }
  };

  const runUsage = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await updateSoftwarePolicyUsage(selectedId, usageStart || undefined, usageEnd || undefined);
      setNotice({ tone: "success", text: "Usage and compliance refreshed." });
      await loadDetails(selectedId);
    } catch (error) {
      setNotice({ tone: "error", text: readError(error) });
    } finally {
      setSaving(false);
    }
  };

  const savePurchase = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await createSoftwarePolicyPurchase(selectedId, purchaseDraft);
      setPurchaseDraft(EMPTY_PURCHASE);
      setNotice({ tone: "success", text: "Purchase record saved." });
      await loadDetails(selectedId);
    } catch (error) {
      setNotice({ tone: "error", text: readError(error) });
    } finally {
      setSaving(false);
    }
  };

  const assignTarget = async () => {
    if (!selectedId || !assignTargetId.trim()) return;
    setSaving(true);
    try {
      await assignSoftwarePolicy(selectedId, [{ targetType: assignType, targetId: assignTargetId.trim() }]);
      setAssignTargetId("");
      setNotice({ tone: "success", text: "Policy assignment saved." });
      await loadDetails(selectedId);
    } catch (error) {
      setNotice({ tone: "error", text: readError(error) });
    } finally {
      setSaving(false);
    }
  };

  const resolveCompliance = async (row: SoftwarePolicyCompliance) => {
    const id = Number(row.ComplianceID || 0);
    if (!id || !selectedId) return;
    setSaving(true);
    try {
      await resolveSoftwarePolicyCompliance(id);
      setNotice({ tone: "success", text: "Compliance issue resolved." });
      await loadDetails(selectedId);
    } catch (error) {
      setNotice({ tone: "error", text: readError(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="software-policy-shell">
      <aside className="software-policy-menu">
        <div className="software-policy-menu-head">
          <span>Settings Center</span>
          <h3>Management Control</h3>
          <p>Select management setup domain</p>
        </div>
        <div className="software-policy-menu-list">
          <button type="button" onClick={() => { window.location.hash = "management-control-incident"; }}><span>▦</span>Incident Config</button>
          <button type="button" onClick={() => { window.location.hash = "management-control-pricing"; }}><span>$</span>Device Pricing</button>
          <button type="button" onClick={() => { window.location.hash = "management-control-aging"; }}><span>◴</span>Aging PC Rule</button>
          <button type="button" onClick={() => { window.location.hash = "management-control-policy"; }}><span>△</span>Management Policy</button>
          <button type="button" className="is-active"><span>☰</span>Software Policy</button>
        </div>
      </aside>

      <main className="software-policy-content">
        <section className="software-policy-hero">
          <div>
            <span className="software-policy-eyebrow">Software Governance</span>
            <h2>Software Policy</h2>
            <p>Manage software license rules, assignment scope, usage, compliance and purchase tracking.</p>
          </div>
          <div className="software-policy-score-grid">
            <div><span>Total Policies</span><strong>{policies.length}</strong><small>Policy records</small></div>
            <div><span>Active Policies</span><strong>{activePolicies}</strong><small>Enabled rules</small></div>
            <div><span>Total Licenses</span><strong>{totalLicenses}</strong><small>License allocation</small></div>
            <div><span>Open Issues</span><strong>{openCompliance}</strong><small>Current policy</small></div>
          </div>
        </section>

        <section className="software-policy-card software-policy-toolbar-card">
          <div className="software-policy-toolbar">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search software policy, category or license..." />
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="">All categories</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="true">Active only</option>
              <option value="false">Inactive only</option>
              <option value="">All status</option>
            </select>
            <button type="button" className="software-policy-btn" onClick={loadPolicies} disabled={loading}>{loading ? "Loading..." : "Refresh"}</button>
            <button type="button" className="software-policy-btn software-policy-btn-primary" onClick={startNewPolicy}>+ New Policy</button>
          </div>
          <div className="software-policy-tabs">
            <button className={tab === "policies" ? "is-active" : ""} onClick={() => setTab("policies")} type="button">Policy Registry</button>
            <button className={tab === "roi" ? "is-active" : ""} onClick={() => setTab("roi")} type="button">License & ROI</button>
            <button className={tab === "compliance" ? "is-active" : ""} onClick={() => setTab("compliance")} type="button">Compliance</button>
            <button className={tab === "assignments" ? "is-active" : ""} onClick={() => setTab("assignments")} type="button">Assignments</button>
          </div>
        </section>

        {notice ? <div className={`software-policy-notice ${notice.tone}`}>{notice.text}</div> : null}

        <section className="software-policy-workbench">
          <div className="software-policy-card software-policy-list-panel">
            <div className="software-policy-panel-head">
              <div><span>Policy List</span><h3>Software Policies</h3></div>
              <b>{policies.length} rows</b>
            </div>
            <div className="software-policy-list">
              {policies.length === 0 ? <div className="software-policy-empty">No software policy found.</div> : policies.map((policy) => (
                <button key={policy.PolicyID || policy.PolicyName} type="button" className={Number(policy.PolicyID) === selectedId ? "is-selected" : ""} onClick={() => selectPolicy(policy)}>
                  <span><strong>{policy.PolicyName}</strong><small>{policy.Category || "Uncategorised"} · {policy.LocationType || "OnPrem"}</small></span>
                  <b className={statusText(policy).toLowerCase()}>{statusText(policy)}</b>
                </button>
              ))}
            </div>
          </div>

          <div className="software-policy-card software-policy-detail-panel">
            {tab === "policies" ? (
              <>
                <div className="software-policy-panel-head">
                  <div><span>Policy Profile</span><h3>{selectedId ? "Edit Software Policy" : "Create Software Policy"}</h3></div>
                  <div className="software-policy-head-actions">
                    <button type="button" className="software-policy-btn" disabled={!selectedId || saving} onClick={deactivatePolicy}>Deactivate</button>
                    <button type="button" className="software-policy-btn software-policy-btn-primary" onClick={savePolicy} disabled={saving}>{saving ? "Saving..." : "Save Policy"}</button>
                  </div>
                </div>
                <div className="software-policy-form-grid">
                  <TextInput label="Policy Name" value={draft.PolicyName} placeholder="Microsoft 365 Business" onChange={(value) => setDraftField({ PolicyName: value })} />
                  <TextInput label="Category" value={draft.Category || ""} placeholder="Business Software" onChange={(value) => setDraftField({ Category: value })} />
                  <TextInput label="License Key" value={draft.LicenseKey || ""} placeholder="Optional license key" onChange={(value) => setDraftField({ LicenseKey: value })} />
                  <TextInput label="Total Licenses" value={draft.TotalLicenses || 0} type="number" onChange={(value) => setDraftField({ TotalLicenses: Number(value || 0) })} />
                  <TextInput label="Start Date" value={String(draft.StartDate || "").slice(0, 10)} type="date" onChange={(value) => setDraftField({ StartDate: value })} />
                  <TextInput label="End Date" value={String(draft.EndDate || "").slice(0, 10)} type="date" onChange={(value) => setDraftField({ EndDate: value })} />
                  <Select label="Location Type" value={String(draft.LocationType || "OnPrem")} options={locationTypes} onChange={(value) => setDraftField({ LocationType: value })} />
                  <Select label="Status" value={boolValue(draft.IsActive, true) ? "Active" : "Inactive"} options={["Active", "Inactive"]} onChange={(value) => setDraftField({ IsActive: value === "Active" ? 1 : 0 })} />
                  <label className="software-policy-field wide"><span>Remarks</span><textarea value={draft.Remarks || ""} placeholder="Internal notes for this policy" onChange={(event) => setDraftField({ Remarks: event.target.value })} /></label>
                </div>
              </>
            ) : tab === "roi" ? (
              <>
                <div className="software-policy-panel-head">
                  <div><span>License & ROI</span><h3>{selectedPolicy?.PolicyName || "Select a policy"}</h3></div>
                  <button type="button" className="software-policy-btn software-policy-btn-primary" onClick={runUsage} disabled={!selectedId || saving}>Update Usage</button>
                </div>
                <div className="software-policy-roi-grid">
                  <div className="software-policy-roi-card"><span>Total Purchased</span><strong>{roi?.purchaseVsUtilization?.totalPurchased ?? 0}</strong></div>
                  <div className="software-policy-roi-card"><span>Unique Devices</span><strong>{roi?.purchaseVsUtilization?.uniqueDevices ?? 0}</strong></div>
                  <div className="software-policy-roi-card"><span>Utilization</span><strong>{roi?.purchaseVsUtilization?.utilizationRate ?? "0.00"}%</strong></div>
                  <div className="software-policy-roi-card"><span>Total Cost</span><strong>{money(roi?.purchaseVsUtilization?.totalCost)}</strong></div>
                </div>
                <div className="software-policy-inline-form">
                  <TextInput label="Period Start" type="date" value={usageStart} onChange={setUsageStart} />
                  <TextInput label="Period End" type="date" value={usageEnd} onChange={setUsageEnd} />
                  <TextInput label="Purchase Date" type="date" value={purchaseDraft.PurchaseDate} onChange={(value) => setPurchaseDraft((row) => ({ ...row, PurchaseDate: value }))} />
                  <TextInput label="Quantity" type="number" value={purchaseDraft.Quantity} onChange={(value) => setPurchaseDraft((row) => ({ ...row, Quantity: Number(value || 0) }))} />
                  <TextInput label="Unit Price" type="number" value={purchaseDraft.UnitPrice} onChange={(value) => setPurchaseDraft((row) => ({ ...row, UnitPrice: Number(value || 0) }))} />
                  <TextInput label="Vendor" value={purchaseDraft.Vendor || ""} onChange={(value) => setPurchaseDraft((row) => ({ ...row, Vendor: value }))} />
                  <TextInput label="Invoice No" value={purchaseDraft.InvoiceNumber || ""} onChange={(value) => setPurchaseDraft((row) => ({ ...row, InvoiceNumber: value }))} />
                  <button type="button" className="software-policy-btn software-policy-btn-primary" onClick={savePurchase} disabled={!selectedId || saving}>Add Purchase</button>
                </div>
                <div className="software-policy-table-wrap">
                  <table><thead><tr><th>Period</th><th>Hours</th><th>Launches</th><th>Devices</th><th>Utilization</th><th>ROI</th></tr></thead><tbody>{usageRows.length === 0 ? <tr><td colSpan={6}>No usage history.</td></tr> : usageRows.map((row) => <tr key={row.UsageID || `${row.PeriodStart}-${row.PeriodEnd}`}><td>{formatDate(row.PeriodStart)} - {formatDate(row.PeriodEnd)}</td><td>{numberValue(row.TotalUsageHours).toFixed(2)}</td><td>{numberValue(row.TotalLaunches)}</td><td>{numberValue(row.UniqueDevices)}</td><td>{numberValue(row.UtilizationRate).toFixed(2)}%</td><td>{row.ROI_Status || "-"}</td></tr>)}</tbody></table>
                </div>
              </>
            ) : tab === "compliance" ? (
              <>
                <div className="software-policy-panel-head"><div><span>Compliance</span><h3>Policy Issues</h3></div><button type="button" className="software-policy-btn" onClick={() => selectedId && loadDetails(selectedId)} disabled={!selectedId}>Refresh</button></div>
                <div className="software-policy-table-wrap">
                  <table><thead><tr><th>Severity</th><th>Issue</th><th>Device</th><th>Description</th><th>Detected</th><th>Status</th><th>Action</th></tr></thead><tbody>{complianceRows.length === 0 ? <tr><td colSpan={7}>No compliance issues.</td></tr> : complianceRows.map((row) => <tr key={row.ComplianceID}><td><b className={`software-policy-severity ${(row.Severity || "").toLowerCase()}`}>{row.Severity || "-"}</b></td><td>{row.IssueType || "-"}</td><td>{row.DeviceID || "All"}</td><td>{row.Description || "-"}</td><td>{formatDate(row.DetectedAt)}</td><td>{boolValue(row.IsResolved, false) ? "Resolved" : "Open"}</td><td><button className="software-policy-btn small" type="button" disabled={boolValue(row.IsResolved, false)} onClick={() => resolveCompliance(row)}>Resolve</button></td></tr>)}</tbody></table>
                </div>
              </>
            ) : (
              <>
                <div className="software-policy-panel-head"><div><span>Assignments</span><h3>Policy Target Scope</h3></div></div>
                <div className="software-policy-inline-form assignment">
                  <label className="software-policy-field"><span>Target Type</span><select value={assignType} onChange={(event) => setAssignType(Number(event.target.value))}>{TARGET_TYPES.map((row) => <option key={row.value} value={row.value}>{row.label}</option>)}</select></label>
                  <TextInput label="Target ID" value={assignTargetId} placeholder="Department, Device or User ID" onChange={setAssignTargetId} />
                  <button type="button" className="software-policy-btn software-policy-btn-primary" onClick={assignTarget} disabled={!selectedId || saving}>Add Assignment</button>
                </div>
                <div className="software-policy-table-wrap">
                  <table><thead><tr><th>Type</th><th>Target</th><th>Target ID</th><th>Assigned By</th><th>Assigned At</th></tr></thead><tbody>{assignmentRows.length === 0 ? <tr><td colSpan={5}>No assignments saved.</td></tr> : assignmentRows.map((row) => <tr key={row.AssignmentID || `${row.TargetType}-${row.TargetID}`}><td>{targetLabel(row.TargetType)}</td><td>{row.TargetName || "-"}</td><td>{row.TargetID}</td><td>{row.AssignedBy || "-"}</td><td>{formatDate(row.AssignedAt)}</td></tr>)}</tbody></table>
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
