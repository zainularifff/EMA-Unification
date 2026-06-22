import api, { unwrapArray, unwrapData } from "./apiClient";

export type SoftwarePolicy = {
  PolicyID?: number;
  PolicyName: string;
  Category?: string;
  LicenseKey?: string;
  TotalLicenses: number;
  StartDate?: string | null;
  EndDate?: string | null;
  LocationType?: "Cloud" | "OnPrem" | "Hybrid" | string;
  UsagePolicy?: unknown;
  IsActive?: boolean | number;
  CreatedAt?: string | null;
  CreatedBy?: string | null;
  UpdatedAt?: string | null;
  UpdatedBy?: string | null;
  Remarks?: string;
};

export type SoftwarePolicyAssignment = {
  AssignmentID?: number;
  PolicyID?: number;
  TargetType: number;
  TargetID: string;
  TargetName?: string;
  AssignedAt?: string;
  AssignedBy?: string;
  IsActive?: boolean | number;
};

export type SoftwarePolicyUsage = {
  UsageID?: number;
  PolicyID?: number;
  PeriodStart?: string;
  PeriodEnd?: string;
  TotalUsageHours?: number | string;
  TotalLaunches?: number | string;
  UniqueDevices?: number | string;
  AvgDailyUsageHours?: number | string;
  UtilizationRate?: number | string;
  ROI_Status?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
};

export type SoftwarePolicyCompliance = {
  ComplianceID?: number;
  PolicyID?: number;
  DeviceID?: string | null;
  IssueType?: string;
  Severity?: string;
  Description?: string;
  DetectedAt?: string;
  ResolvedAt?: string | null;
  ResolvedBy?: string | null;
  IsResolved?: boolean | number;
};

export type SoftwarePolicyPurchase = {
  PurchaseID?: number;
  PolicyID?: number;
  PurchaseDate: string;
  Quantity: number;
  UnitPrice: number;
  TotalCost?: number;
  Vendor?: string;
  InvoiceNumber?: string;
  Remarks?: string;
};

export type SoftwarePolicyRoi = {
  policy?: { PolicyID?: number; PolicyName?: string };
  purchaseVsUtilization?: {
    totalLicenses?: number;
    totalPurchased?: number;
    uniqueDevices?: number;
    costPerLicense?: string | number;
    totalCost?: string | number;
    utilizationRate?: string | number;
    roiStatus?: string;
    status?: string;
  };
  latestUsagePeriod?: string | null;
};

export type SoftwarePolicyBundle = {
  policies: SoftwarePolicy[];
  categories: string[];
  locationTypes: string[];
};

function normalizeArray<T>(payload: unknown): T[] {
  return unwrapArray<T>(payload);
}

function cleanPolicyPayload(policy: Partial<SoftwarePolicy>) {
  return {
    PolicyName: String(policy.PolicyName || "").trim(),
    Category: String(policy.Category || "").trim() || null,
    LicenseKey: String(policy.LicenseKey || "").trim() || null,
    TotalLicenses: Number(policy.TotalLicenses || 0),
    StartDate: policy.StartDate || null,
    EndDate: policy.EndDate || null,
    LocationType: policy.LocationType || "OnPrem",
    UsagePolicy: policy.UsagePolicy || null,
    Remarks: String(policy.Remarks || "").trim() || null,
    IsActive: policy.IsActive === false || policy.IsActive === 0 ? 0 : 1,
  };
}

export async function getSoftwarePolicyBundle(search = "", category = "", isActive: string | boolean = "") : Promise<SoftwarePolicyBundle> {
  const [policiesPayload, categoriesPayload, locationTypesPayload] = await Promise.all([
    api.get("/api/software-policies", { params: { search, category, isActive }, forceRefresh: true }),
    api.get("/api/software-policies/categories", { forceRefresh: true }).catch(() => ({ data: [] })),
    api.get("/api/software-policies/location-types", { forceRefresh: true }).catch(() => ({ data: ["Cloud", "OnPrem", "Hybrid"] })),
  ]);

  const policies = normalizeArray<SoftwarePolicy>(policiesPayload);
  const categories = normalizeArray<string>(categoriesPayload).filter(Boolean);
  const locationTypes = normalizeArray<string>(locationTypesPayload).filter(Boolean);

  return {
    policies,
    categories,
    locationTypes: locationTypes.length ? locationTypes : ["Cloud", "OnPrem", "Hybrid"],
  };
}

export async function createSoftwarePolicy(policy: Partial<SoftwarePolicy>) {
  return unwrapData<SoftwarePolicy>(await api.post("/api/software-policies", cleanPolicyPayload(policy)));
}

export async function updateSoftwarePolicy(policyId: number, policy: Partial<SoftwarePolicy>) {
  return unwrapData<SoftwarePolicy>(await api.put(`/api/software-policies/${policyId}`, cleanPolicyPayload(policy)));
}

export async function deleteSoftwarePolicy(policyId: number, force = false) {
  return api.delete(`/api/software-policies/${policyId}`, { params: { force } });
}

export async function getSoftwarePolicyAssignments(policyId: number) {
  return normalizeArray<SoftwarePolicyAssignment>(await api.get(`/api/software-policies/${policyId}/assignments`, { forceRefresh: true }));
}

export async function assignSoftwarePolicy(policyId: number, targets: Array<{ targetType: number; targetId: string }>) {
  return normalizeArray<SoftwarePolicyAssignment>(await api.post(`/api/software-policies/${policyId}/assign`, { targets }));
}

export async function updateSoftwarePolicyUsage(policyId: number, periodStart?: string, periodEnd?: string) {
  return unwrapData<SoftwarePolicyUsage>(await api.post(`/api/software-policies/${policyId}/usage`, { periodStart, periodEnd }));
}

export async function getSoftwarePolicyUsage(policyId: number) {
  return normalizeArray<SoftwarePolicyUsage>(await api.get(`/api/software-policies/${policyId}/usage`, { forceRefresh: true }));
}

export async function getSoftwarePolicyCompliance(policyId: number, resolved = "") {
  return normalizeArray<SoftwarePolicyCompliance>(await api.get(`/api/software-policies/${policyId}/compliance`, { params: { resolved }, forceRefresh: true }));
}

export async function resolveSoftwarePolicyCompliance(complianceId: number) {
  return unwrapData<SoftwarePolicyCompliance>(await api.put(`/api/software-policies/compliance/${complianceId}/resolve`, {}));
}

export async function createSoftwarePolicyPurchase(policyId: number, purchase: SoftwarePolicyPurchase) {
  return unwrapData<SoftwarePolicyPurchase>(await api.post(`/api/software-policies/${policyId}/purchase`, purchase));
}

export async function getSoftwarePolicyPurchases(policyId: number) {
  return normalizeArray<SoftwarePolicyPurchase>(await api.get(`/api/software-policies/${policyId}/purchases`, { forceRefresh: true }));
}

export async function getSoftwarePolicyRoi(policyId: number) {
  return unwrapData<SoftwarePolicyRoi>(await api.get(`/api/software-policies/${policyId}/roi`, { forceRefresh: true }), {} as SoftwarePolicyRoi);
}
